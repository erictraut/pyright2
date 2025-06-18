/*
 * hoverProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that maps a position within a Python program file into
 * markdown text that is displayed when the user hovers over that
 * position within a smart editor.
 */

import { CancellationToken, Hover, MarkupKind } from 'vscode-languageserver';

import { assertNever, fail } from 'commonUtils/debug.js';
import { extractParameterDocumentation } from 'commonUtils/docStringUtils.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { IParseProvider } from 'langserver/providers/parseProvider.js';
import { ProviderSourceMapper } from 'langserver/providers/providerSourceMapper.js';
import { findNodeByPosition, getDocumentationPartsForTypeAndDecl } from 'langserver/providers/providerUtils.js';
import { getClassAndConstructorTypes } from 'langserver/providers/tooltipUtils.js';
import { convertDocStringToMarkdown, convertDocStringToPlainText } from 'langserver/server/docStringConversion.js';
import { SignatureDisplayType } from 'langserver/server/languageServerInterface.js';
import { findNodeByOffset, getDocString, getEnclosingFunction } from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetToPosition, convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { Position, Range, TextRange } from 'typeserver/common/textRange.js';
// import { PrintTypeOptions } from 'typeserver/evaluator/typeEvaluatorTypes.js';
// import {
//     getTypeAliasInfo,
//     isAnyOrUnknown,
//     isFunctionOrOverloaded,
//     isModule,
//     isParamSpec,
//     isTypeVar,
//     Type,
//     TypeCategory,
// } from 'typeserver/evaluator/types.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { ExpressionNode, isExpressionNode, NameNode, ParseNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import {
    Decl,
    DeclCategory,
    ITypeServer,
    PrintTypeOptions,
    Type,
    VariableDecl,
} from 'typeserver/protocol/typeServerProtocol.js';

export interface HoverTextPart {
    python?: boolean;
    text: string;
}

export interface HoverResults {
    parts: HoverTextPart[];
    range: Range;
}

export interface HoverOptions {
    readonly functionSignatureDisplay: SignatureDisplayType;
}

export class HoverProvider {
    private readonly _sourceMapper: ProviderSourceMapper;

    constructor(
        private readonly _typeServer: ITypeServer,
        private readonly _parseProvider: IParseProvider,
        private readonly _fileUri: Uri,
        private readonly _parseResults: ParseFileResults,
        private readonly _position: Position,
        private readonly _options: HoverOptions,
        private readonly _format: MarkupKind,
        private readonly _token: CancellationToken
    ) {
        this._sourceMapper = new ProviderSourceMapper(
            this._typeServer,
            this._parseProvider,
            this._fileUri,
            /* preferStubs */ false,
            this._token
        );
    }

    getHover(): Hover | null {
        return _convertHoverResults(this._getHoverResult(), this._format);
    }

    private _getHoverResult(): HoverResults | null {
        throwIfCancellationRequested(this._token);

        const offset = convertPositionToOffset(this._position, this._parseResults.tokenizerOutput.lines);
        if (offset === undefined) {
            return null;
        }

        const node = findNodeByOffset(this._parseResults.parserOutput.parseTree, offset);
        if (node === undefined) {
            return null;
        }

        const start = convertOffsetToPosition(node.start, this._parseResults.tokenizerOutput.lines);
        const end = convertOffsetToPosition(TextRange.getEnd(node), this._parseResults.tokenizerOutput.lines);

        const results: HoverResults = {
            parts: [],
            range: { start, end },
        };

        if (node.nodeType === ParseNodeType.Name) {
            const declInfo = this._typeServer.getDeclsForPosition(this._fileUri, start);
            const decls = declInfo?.decls;

            if (decls && decls.length > 0) {
                const primaryDeclaration = _getPrimaryDeclaration(decls);
                this._addResultsForDeclaration(results.parts, primaryDeclaration, node);
                // TODO - handle synthesized types in the evaluator
                // } else if (declInfo && declInfo.synthesizedTypes.length > 0) {
                //     const nameNode = node;
                //     declInfo?.synthesizedTypes.forEach((type) => {
                //         this._addResultsForSynthesizedType(results.parts, type, nameNode);
                //     });
                //     this._addDocumentationPart(results.parts, node, /* resolvedDecl */ undefined);
            } else if (!node.parent || node.parent.nodeType !== ParseNodeType.ModuleName) {
                // If we had no declaration, see if we can provide a minimal tooltip. We'll skip
                // this if it's part of a module name, since a module name part with no declaration
                // is a directory (a namespace package), and we don't want to provide any hover
                // information in that case.
                if (results.parts.length === 0) {
                    const type = this._getType(node);
                    // TODO - need to reimplement somehow
                    // if (isModule(type)) {
                    //     // Handle modules specially because submodules aren't associated with
                    //     // declarations, but we want them to be presented in the same way as
                    //     // the top-level module, which does have a declaration.
                    //     typeText = '(module) ' + node.d.value;
                    // } else {
                    const label = 'function';
                    const isProperty = false;

                    // TODO - add back in
                    // if (isMaybeDescriptorInstance(type, /* requireSetter */ false)) {
                    //     isProperty = true;
                    //     label = 'property';
                    // }

                    const typeText = _getToolTipForType(
                        this._typeServer,
                        type,
                        label,
                        node.d.value,
                        isProperty,
                        this._options.functionSignatureDisplay
                    );
                    // }

                    this._addResultsPart(results.parts, typeText, /* python */ true);
                    this._addDocumentationPart(results.parts, node, /* resolvedDecl */ undefined);
                }
            }
        } else if (node.nodeType === ParseNodeType.String) {
            // const type = this._typeServer.evaluator.getExpectedType(node)?.type;
            // if (type !== undefined) {
            // TODO - add back in
            // this._tryAddPartsForTypedDictKey(node, type, results.parts);
            // }
        }

        return results.parts.length > 0 ? results : null;
    }

    private _addResultsForDeclaration(parts: HoverTextPart[], decl: Decl, node: NameNode): void {
        const resolvedDecl =
            decl.category === DeclCategory.Import
                ? this._typeServer.resolveImportDecl(decl, /* resolveLocalNames */ true)
                : decl;
        if (!resolvedDecl || (resolvedDecl.category === DeclCategory.Import && resolvedDecl.uri.isEmpty())) {
            this._addResultsPart(parts, `(import) ` + node.d.value + this._getTypeText(node), /* python */ true);
            return;
        }

        switch (resolvedDecl.category) {
            // TODO - handle intrinsic types
            // case DeclarationType.Intrinsic: {
            //     this._addResultsPart(parts, node.d.value + this._getTypeText(node), /* python */ true);
            //     this._addDocumentationPart(parts, node, resolvedDecl);
            //     break;
            // }

            case DeclCategory.Variable: {
                // If the named node is an aliased import symbol, we can't call
                // getType on the original name because it's not in the symbol
                // table. Instead, use the node from the resolved alias.
                let typeNode: ExpressionNode = node;
                if (decl.category === DeclCategory.Import && decl.aliasPosition) {
                    const aliasNode = findNodeByPosition(decl.aliasPosition, this._parseResults);
                    if (aliasNode && isExpressionNode(aliasNode)) {
                        typeNode = aliasNode;
                    }
                } else if (node.parent?.nodeType === ParseNodeType.Argument && node.parent.d.name === node) {
                    // If this is a named argument, we would normally have received a Parameter declaration
                    // rather than a variable declaration, but we can get here in the case of a dataclass.
                    // Replace the typeNode with the node of the variable declaration.
                    const varNode = findNodeByPosition(decl.range.start, this._parseResults);
                    if (varNode && isExpressionNode(varNode)) {
                        typeNode = varNode;
                    }
                }

                // Determine if this identifier is a type alias. If so, expand
                // the type alias when printing the type information.
                const type = this._getType(typeNode);
                const typeText = _getVariableTypeText(
                    this._typeServer,
                    resolvedDecl,
                    node.d.value,
                    type,
                    typeNode,
                    this._options.functionSignatureDisplay
                );

                this._addResultsPart(parts, typeText, /* python */ true);
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            case DeclCategory.Parameter: {
                this._addResultsPart(parts, '(parameter) ' + node.d.value + this._getTypeText(node), /* python */ true);
                const resolvedParse = this._parseProvider.parseFile(resolvedDecl.uri);
                const resolvedDeclNode = resolvedParse
                    ? findNodeByPosition(resolvedDecl.range.start, resolvedParse)
                    : undefined;
                _addParameterResultsPart(node, resolvedDeclNode, parts);
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            case DeclCategory.TypeParameter: {
                // If the user is hovering over a type parameter name in a class type parameter
                // list, display the computed variance of the type param.
                // const typeParamListNode = getParentNodeOfType(node, ParseNodeType.TypeParameterList);
                // const nodeType = typeParamListNode?.parent?.nodeType;
                // const printTypeVariance = nodeType === ParseNodeType.Class || nodeType === ParseNodeType.TypeAlias

                const options: PrintTypeOptions = {
                    // TODO - need to reimplement
                    //printTypeVariance
                };
                this._addResultsPart(
                    parts,
                    '(type parameter) ' + node.d.value + this._getTypeText(node, options),
                    /* python */ true
                );
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            case DeclCategory.Class: {
                if (this._addInitOrNewMethodInsteadIfCallNode(node, parts, resolvedDecl)) {
                    return;
                }

                const resolvedParseResults = this._parseProvider.parseFile(resolvedDecl.uri);
                const nameNode = resolvedParseResults
                    ? findNodeByPosition(resolvedDecl.range.start, resolvedParseResults)
                    : undefined;
                const name = nameNode?.nodeType === ParseNodeType.Name ? nameNode.d.value : node.d.value;
                this._addResultsPart(parts, '(class) ' + name, /* python */ true);
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            case DeclCategory.Function: {
                let label = 'function';
                const isProperty = false;
                if (resolvedDecl.method) {
                    // TODO - add back in
                    // const declaredType = this._typeServer.getTypeForDecl(resolvedDecl);
                    // isProperty = !!declaredType && isMaybeDescriptorInstance(declaredType, /* requireSetter */ false);
                    label = isProperty ? 'property' : 'method';
                }

                const type = this._getType(node);
                // if (isAnyOrUnknown(type)) {
                // If the type is Any or Unknown, try to get the type from the
                // resolved declaration.
                // TODO - add back in
                // type = this._getType(resolvedDecl.node.d.name);
                // }

                const signatureString = _getToolTipForType(
                    this._typeServer,
                    type,
                    label,
                    node.d.value,
                    isProperty,
                    this._options.functionSignatureDisplay
                );

                this._addResultsPart(parts, signatureString, /* python */ true);
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            case DeclCategory.Import: {
                // First the 'module' header.
                this._addResultsPart(parts, '(module) ' + node.d.value, /* python */ true);
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            case DeclCategory.TypeAlias: {
                // TODO - need to fix
                //const type = convertToInstance(this._getType(node));
                const type = this._getType(node);
                const typeText = type ? this._typeServer.printType(type, { expandTypeAlias: true }) : 'Unknown';
                this._addResultsPart(parts, `(type) ${node.d.value} = ${typeText}`, /* python */ true);
                this._addDocumentationPart(parts, node, resolvedDecl);
                break;
            }

            default:
                assertNever(resolvedDecl);
        }
    }

    // private _addResultsForSynthesizedType(parts: HoverTextPart[], typeInfo: SynthesizedTypeInfo, hoverNode: NameNode) {
    //     let typeText: string | undefined;

    //     if (isModule(typeInfo.type)) {
    //         typeText = '(module) ' + hoverNode.d.value;
    //     } else {
    //         const node = typeInfo.node ?? hoverNode;

    //         const type = this._getType(node);
    //         typeText = _getVariableTypeText(
    //             this._typeServer,
    //             /* declaration */ undefined,
    //             node.d.value,
    //             type,
    //             node,
    //             this._options.functionSignatureDisplay
    //         );
    //     }

    //     if (typeText) {
    //         this._addResultsPart(parts, typeText, /* python */ true);
    //     }
    // }

    // private _tryAddPartsForTypedDictKey(node: StringNode, type: Type, parts: HoverTextPart[]) {
    //     // If the expected type is a TypedDict and the current node is a key entry then we can provide a tooltip
    //     // with the type of the TypedDict key and its docstring, if available.
    //     doForEachSubtype(type, (subtype) => {
    //         if (isClassInstance(subtype) && ClassType.isTypedDictClass(subtype)) {
    //             const entry = subtype.shared.typedDictEntries?.knownItems.get(node.d.value);
    //             if (entry) {
    //                 // If we have already added parts for another declaration (e.g. for a union of TypedDicts that share the same key)
    //                 // then we need to add a separator to prevent a visual bug.
    //                 if (parts.length > 0) {
    //                     parts.push({ text: '\n\n---\n' });
    //                 }

    //                 // e.g. (key) name: str
    //                 const text = '(key) ' + node.d.value + ': ' + this._typeServer.evaluator.printType(entry.valueType);
    //                 this._addResultsPart(parts, text, /* python */ true);

    //                 const declarations = ClassType.getSymbolTable(subtype).get(node.d.value)?.getDeclarations();
    //                 if (declarations !== undefined && declarations?.length !== 0) {
    //                     // As we are just interested in the docString we don't have to worry about
    //                     // anything other than the first declaration. There also shouldn't be more
    //                     // than one declaration for a TypedDict key variable.
    //                     const declaration = declarations[0];
    //                     if (declaration.type === DeclarationType.Variable && declaration.docString !== undefined) {
    //                         this._addDocumentationPartForType(parts, subtype, declaration);
    //                     }
    //                 }
    //             }
    //         }
    //     });
    // }

    private _addInitOrNewMethodInsteadIfCallNode(node: NameNode, parts: HoverTextPart[], declaration: Decl) {
        const result = getClassAndConstructorTypes(this._typeServer, node);
        if (!result) {
            return false;
        }

        // TODO - need to reimplement somehow
        // if (result.methodType && isFunctionOrOverloaded(result.methodType)) {
        //     this._addResultsPart(
        //         parts,
        //         getConstructorTooltip(
        //             this._typeServer,
        //             node.d.value,
        //             result.methodType,
        //             this._options.functionSignatureDisplay
        //         ),
        //         /* python */ true
        //     );

        //     const addedDoc = this._addDocumentationPartForType(parts, result.methodType, declaration);

        //     if (!addedDoc) {
        //         this._addDocumentationPartForType(parts, result.classType, declaration);
        //     }

        //     return true;
        // }

        return false;
    }

    private _getType(node: ExpressionNode): Type | undefined {
        const position = convertOffsetToPosition(node.start, this._parseResults.tokenizerOutput.lines);
        return _getTypeForToolTip(this._typeServer, this._fileUri, position, node);
    }

    private _getTypeText(node: ExpressionNode, options?: PrintTypeOptions): string {
        const type = this._getType(node);
        return ': ' + (type ? this._typeServer.printType(type, options) : 'Unknown');
    }

    private _addDocumentationPart(parts: HoverTextPart[], node: NameNode, resolvedDecl: Decl | undefined) {
        const type = this._getType(node);
        this._addDocumentationPartForType(parts, type, resolvedDecl, node.d.value);
    }

    private _addDocumentationPartForType(
        parts: HoverTextPart[],
        type: Type | undefined,
        resolvedDecl: Decl | undefined,
        name?: string
    ): boolean {
        const docString = getDocumentationPartsForTypeAndDecl(
            this._typeServer,
            this._sourceMapper,
            type,
            resolvedDecl,
            {
                name,
            }
        );

        _addDocumentationResultsPart(docString, this._format, parts);
        return !!docString;
    }

    private _addResultsPart(parts: HoverTextPart[], text: string, python = false) {
        parts.push({
            python,
            text,
        });
    }
}

function _getVariableTypeText(
    typeServer: ITypeServer,
    declaration: VariableDecl | undefined,
    name: string,
    type: Type | undefined,
    typeNode: ExpressionNode,
    functionSignatureDisplay: SignatureDisplayType
) {
    let label = 'variable';
    if (declaration) {
        label = declaration.constant || declaration.final ? 'constant' : 'variable';
    }

    // let typeVarName: string | undefined;

    // TODO - need to reimplement somehow
    // if (type.props?.typeAliasInfo && typeNode.nodeType === ParseNodeType.Name) {
    //     const typeAliasInfo = getTypeAliasInfo(type);
    //     if (typeAliasInfo?.shared.name === typeNode.d.value) {
    //         if (isTypeVar(type)) {
    //             label = isParamSpec(type) ? 'param spec' : 'type variable';
    //             typeVarName = type.shared.name;
    //         } else {
    //             // Handle type aliases specially.
    //             const type = getTypeForToolTip(typeServer, typeNode);
    //             // TODO - need to fix
    //             // type = convertToInstance(type);
    //             const typeText = typeServer.evaluator.printType(type, { expandTypeAlias: true });

    //             return `(type) ${name} = ` + typeText;
    //         }
    //     }
    // }

    // if (
    //     type.category === TypeCategory.Function ||
    //     type.category === TypeCategory.Overloaded ||
    //     typeNode.parent?.nodeType === ParseNodeType.Call
    // ) {
    //     return getToolTipForType(
    //         typeServer,
    //         type,
    //         label,
    //         name,
    //         /* isProperty */ false,
    //         functionSignatureDisplay,
    //         typeNode
    //     );
    // }

    // const typeText =
    //     typeVarName ?? name + ': ' + typeServer.evaluator.printType(_getTypeForToolTip(typeServer, typeNode));

    // return `(${label}) ` + typeText;

    return _getToolTipForType(
        typeServer,
        type,
        label,
        name,
        /* isProperty */ false,
        functionSignatureDisplay,
        typeNode
    );
}

function _getTypeForToolTip(
    typeServer: ITypeServer,
    fileUri: Uri,
    position: Position,
    node: ExpressionNode
): Type | undefined {
    return typeServer.getType(fileUri, position);
}

function _getToolTipForType(
    typeServer: ITypeServer,
    type: Type | undefined,
    label: string,
    name: string,
    isProperty: boolean,
    functionSignatureDisplay: SignatureDisplayType,
    typeNode?: ExpressionNode
): string {
    const typeString = type ? typeServer.printType(type) : 'Unknown';
    return `(${label}) ${name}: ${typeString}`;

    // // Support __call__ method for class instances to show the signature of the method
    // if (type.category === TypeCategory.Class && isClassInstance(type) && typeNode) {
    //     const callMethodResult = getBoundCallMethod(typeServer.evaluator, typeNode, type);
    //     if (
    //         callMethodResult?.type.category === TypeCategory.Function ||
    //         callMethodResult?.type.category === TypeCategory.Overloaded
    //     ) {
    //         // Eliminate overloads that are not applicable.
    //         const methodType = limitOverloadBasedOnCall(typeServer, callMethodResult.type, typeNode);
    //         if (methodType) {
    //             type = methodType;
    //         }
    //     }
    // }
    // let signatureString = '';
    // if (isOverloaded(type)) {
    //     signatureString = label.length > 0 ? `(${label})\n` : '';
    //     signatureString += `${getOverloadedTooltip(typeServer, type, functionSignatureDisplay)}`;
    // } else if (isFunction(type)) {
    //     signatureString = `${getFunctionTooltip(typeServer, label, name, type, isProperty, functionSignatureDisplay)}`;
    // } else {
    //     signatureString = label.length > 0 ? `(${label}) ` : '';
    //     signatureString += `${name}: ${typeServer.evaluator.printType(type)}`;
    // }

    // return signatureString;
}

function _convertHoverResults(hoverResults: HoverResults | null, format: MarkupKind): Hover | null {
    if (!hoverResults) {
        return null;
    }

    const markupString = hoverResults.parts
        .map((part) => {
            if (part.python) {
                if (format === MarkupKind.Markdown) {
                    return '```python\n' + part.text + '\n```\n';
                } else if (format === MarkupKind.PlainText) {
                    return part.text + '\n\n';
                } else {
                    fail(`Unsupported markup type: ${format}`);
                }
            }
            return part.text;
        })
        .join('')
        .trimEnd();

    return {
        contents: {
            kind: format,
            value: markupString,
        },
        range: hoverResults.range,
    };
}

function _addParameterResultsPart(
    paramNameNode: NameNode,
    resolvedDeclNode: ParseNode | undefined,
    parts: HoverTextPart[]
) {
    // See if we have a docstring for the parent function.
    let docString: string | undefined = undefined;
    const funcNode = getEnclosingFunction(resolvedDeclNode ?? paramNameNode);
    if (funcNode) {
        docString = getDocString(funcNode?.d.suite?.d.statements ?? []);
        if (docString) {
            // Compute the docstring now.
            docString = extractParameterDocumentation(docString, paramNameNode.d.value);
        }
    }
    if (!docString) {
        return;
    }

    parts.push({
        python: false,
        text: docString,
    });
}

function _addDocumentationResultsPart(docString: string | undefined, format: MarkupKind, parts: HoverTextPart[]) {
    if (!docString) {
        return;
    }

    if (format === MarkupKind.Markdown) {
        const markDown = convertDocStringToMarkdown(docString);

        if (parts.length > 0 && markDown.length > 0) {
            parts.push({ text: '---\n' });
        }

        parts.push({ text: markDown, python: false });
        return;
    }

    if (format === MarkupKind.PlainText) {
        parts.push({ text: convertDocStringToPlainText(docString), python: false });
        return;
    }

    fail(`Unsupported markup type: ${format}`);
}

function _getPrimaryDeclaration(declarations: Decl[]) {
    // In most cases, it's best to treat the first declaration as the
    // "primary". This works well for properties that have setters
    // which often have doc strings on the getter but not the setter.
    // The one case where using the first declaration doesn't work as
    // well is the case where an import statement within an __init__.py
    // file uses the form "from .A import A". In this case, if we use
    // the first declaration, it will show up as a module rather than
    // the imported symbol type.
    const primaryDeclaration = declarations[0];
    if (primaryDeclaration.category === DeclCategory.Import && declarations.length > 1) {
        return declarations[1];
    }

    if (primaryDeclaration.category === DeclCategory.Variable && declarations.length > 1 && primaryDeclaration.slots) {
        // Slots cannot have docstrings, so pick the secondary.
        return declarations[1];
    }

    return primaryDeclaration;
}
