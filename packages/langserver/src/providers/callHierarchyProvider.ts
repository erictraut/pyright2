/*
 * callHierarchyProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that provides a list of callers or callees associated with
 * a position.
 */

import { CancellationToken, SymbolKind } from 'vscode-languageserver';
import {
    CallHierarchyIncomingCall,
    CallHierarchyItem,
    CallHierarchyOutgoingCall,
    Range,
} from 'vscode-languageserver-types';

import { appendArray } from 'commonUtils/collectionUtils.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { DocumentSymbolCollector } from 'langserver/providers/documentSymbolCollector.js';
import { IParseProvider } from 'langserver/providers/parseProvider.js';
import { ReferenceUseCase } from 'langserver/providers/providerTypes.js';
import { ReferencesProvider, ReferencesResult } from 'langserver/providers/referencesProvider.js';
import { getSymbolKind } from 'langserver/server/lspUtils.js';
import { Declaration, DeclarationType } from 'typeserver/binder/declaration.js';
import {
    areDeclarationsSame,
    getNameFromDeclaration,
    hasTypeForDeclaration,
} from 'typeserver/binder/declarationUtils.js';
import { getExecutionScopeNode } from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetsToRange } from 'typeserver/common/positionUtils.js';
import { Position, rangesAreEqual } from 'typeserver/common/textRange.js';
import { ClassType, isClassInstance, isFunction, isInstantiableClass } from 'typeserver/evaluator/types.js';
import {
    MemberAccessFlags,
    doForEachSubtype,
    lookUpClassMember,
    lookUpObjectMember,
} from 'typeserver/evaluator/typeUtils.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { CallNode, MemberAccessNode, NameNode, ParseNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { ParseTreeWalker } from 'typeserver/parser/parseTreeWalker.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export class CallHierarchyProvider {
    constructor(
        private _typeServer: ITypeServer,
        private _parseProvider: IParseProvider,
        private _fileUri: Uri,
        private _parseResults: ParseFileResults,
        private _position: Position,
        private _token: CancellationToken
    ) {}

    onPrepare(): CallHierarchyItem[] | null {
        throwIfCancellationRequested(this._token);
        const referencesResult = this._getDeclaration();
        if (!referencesResult || referencesResult.declarations.length === 0) {
            return null;
        }

        const { targetDecl, callItemUri, symbolName } = this._getTargetDeclaration(referencesResult);
        if (
            targetDecl.type !== DeclarationType.Function &&
            targetDecl.type !== DeclarationType.Class &&
            targetDecl.type !== DeclarationType.Alias
        ) {
            return null;
        }

        // make sure the alias is resolved to class or function
        if (targetDecl.type === DeclarationType.Alias) {
            const resolvedDecl = this._typeServer.evaluator.resolveAliasDeclaration(
                targetDecl,
                /* resolveLocalNames */ true
            );
            if (!resolvedDecl) {
                return null;
            }

            if (resolvedDecl.type !== DeclarationType.Function && resolvedDecl.type !== DeclarationType.Class) {
                return null;
            }
        }

        const realUri = this._typeServer.convertToRealUri(callItemUri);

        if (!realUri) {
            return null;
        }

        const callItem: CallHierarchyItem = {
            name: symbolName,
            kind: getSymbolKind(this._typeServer, targetDecl, symbolName) ?? SymbolKind.Module,
            uri: realUri.toString(),
            range: targetDecl.range,
            selectionRange: targetDecl.range,
        };

        return [callItem];
    }

    getIncomingCalls(): CallHierarchyIncomingCall[] | null {
        throwIfCancellationRequested(this._token);
        const referencesResult = this._getDeclaration();
        if (!referencesResult || referencesResult.declarations.length === 0) {
            return null;
        }

        const { targetDecl, symbolName } = this._getTargetDeclaration(referencesResult);

        const items: CallHierarchyIncomingCall[] = [];
        const sourceFiles =
            targetDecl.type === DeclarationType.Alias
                ? [this._typeServer.getSourceFile(this._fileUri)!]
                : this._typeServer.getSourceFiles();
        for (const curSourceFileInfo of sourceFiles) {
            if (curSourceFileInfo.inProject || curSourceFileInfo.clientVersion !== undefined) {
                const filePath = curSourceFileInfo.uri;
                const itemsToAdd = this._getIncomingCallsForDeclaration(filePath, symbolName, targetDecl);

                if (itemsToAdd) {
                    appendArray(items, itemsToAdd);
                }
            }
        }

        if (items.length === 0) {
            return null;
        }

        return items;
    }

    getOutgoingCalls(): CallHierarchyOutgoingCall[] | null {
        throwIfCancellationRequested(this._token);
        const referencesResult = this._getDeclaration();
        if (!referencesResult || referencesResult.declarations.length === 0) {
            return null;
        }

        const { targetDecl } = this._getTargetDeclaration(referencesResult);

        // Find the parse node root corresponding to the function or class.
        let parseRoot: ParseNode | undefined;
        const resolvedDecl = this._typeServer.evaluator.resolveAliasDeclaration(
            targetDecl,
            /* resolveLocalNames */ true
        );
        if (!resolvedDecl) {
            return null;
        }

        if (resolvedDecl.type === DeclarationType.Function) {
            parseRoot = resolvedDecl.node;
        } else if (resolvedDecl.type === DeclarationType.Class) {
            // Look up the __init__ method for this class.
            const classType = this._typeServer.evaluator.getTypeForDeclaration(resolvedDecl)?.type;

            if (classType && isInstantiableClass(classType)) {
                // Don't perform a recursive search of parent classes in this
                // case because we don't want to find an inherited __init__
                // method defined in a different module.
                const initMethodMember = lookUpClassMember(
                    classType,
                    '__init__',
                    MemberAccessFlags.SkipInstanceMembers |
                        MemberAccessFlags.SkipObjectBaseClass |
                        MemberAccessFlags.SkipBaseClasses
                );

                if (initMethodMember) {
                    const initMethodType = this._typeServer.evaluator.getTypeOfMember(initMethodMember);
                    if (initMethodType && isFunction(initMethodType)) {
                        const initDecls = initMethodMember.symbol.getDeclarations();
                        if (initDecls && initDecls.length > 0) {
                            const primaryInitDecl = initDecls[0];
                            if (primaryInitDecl.type === DeclarationType.Function) {
                                parseRoot = primaryInitDecl.node;
                            }
                        }
                    }
                }
            }
        }

        if (!parseRoot) {
            return null;
        }

        const callFinder = new FindOutgoingCallTreeWalker(this._typeServer, parseRoot, this._parseResults, this._token);
        const outgoingCalls = callFinder.findCalls();
        if (outgoingCalls.length === 0) {
            return null;
        }

        return outgoingCalls;
    }

    private _getTargetDeclaration(referencesResult: ReferencesResult): {
        targetDecl: Declaration;
        callItemUri: Uri;
        symbolName: string;
    } {
        // If there's more than one declaration, pick the target one.
        // We'll always prefer one with a declared type, and we'll always
        // prefer later declarations.
        const declarations = referencesResult.declarations;
        const node = referencesResult.nodeAtOffset;
        let targetDecl = declarations[0];

        for (const decl of declarations) {
            if (hasTypeForDeclaration(decl) || !hasTypeForDeclaration(targetDecl)) {
                if (decl.type === DeclarationType.Function || decl.type === DeclarationType.Class) {
                    targetDecl = decl;

                    // If the specified node is an exact match, use this declaration
                    // as the primary even if it's not the last.
                    if (decl.node === node) {
                        break;
                    }
                }
            }
        }

        let symbolName;

        // Although the LSP specification requires a URI, we are using a file path
        // here because it is converted to the proper URI by the caller.
        // This simplifies our code and ensures compatibility with the LSP specification.
        let callItemUri: Uri;
        if (targetDecl.type === DeclarationType.Alias) {
            symbolName = (referencesResult.nodeAtOffset as NameNode).d.value;
            callItemUri = this._fileUri;
        } else {
            symbolName = getNameFromDeclaration(targetDecl) || referencesResult.symbolNames[0];
            callItemUri = targetDecl.uri;
        }

        return { targetDecl, callItemUri, symbolName };
    }

    private _getIncomingCallsForDeclaration(
        fileUri: Uri,
        symbolName: string,
        declaration: Declaration
    ): CallHierarchyIncomingCall[] | undefined {
        throwIfCancellationRequested(this._token);

        const parseResults = this._parseProvider.parseFile(fileUri);
        if (!parseResults) {
            return undefined;
        }

        const callFinder = new FindIncomingCallTreeWalker(
            this._typeServer,
            fileUri,
            parseResults,
            this._parseProvider,
            symbolName,
            declaration,
            this._token
        );

        const incomingCalls = callFinder.findCalls();
        return incomingCalls.length > 0 ? incomingCalls : undefined;
    }

    private _getDeclaration(): ReferencesResult | undefined {
        return ReferencesProvider.getDeclarationForPosition(
            this._typeServer,
            this._parseProvider,
            this._fileUri,
            this._position,
            /* reporter */ undefined,
            ReferenceUseCase.References,
            this._token
        );
    }
}

class FindOutgoingCallTreeWalker extends ParseTreeWalker {
    private _outgoingCalls: CallHierarchyOutgoingCall[] = [];

    constructor(
        private _typeServer: ITypeServer,
        private _parseRoot: ParseNode,
        private _parseResults: ParseFileResults,
        private _cancellationToken: CancellationToken
    ) {
        super();
    }

    findCalls(): CallHierarchyOutgoingCall[] {
        this.walk(this._parseRoot);
        return this._outgoingCalls;
    }

    override visitCall(node: CallNode): boolean {
        throwIfCancellationRequested(this._cancellationToken);

        let nameNode: NameNode | undefined;

        if (node.d.leftExpr.nodeType === ParseNodeType.Name) {
            nameNode = node.d.leftExpr;
        } else if (node.d.leftExpr.nodeType === ParseNodeType.MemberAccess) {
            nameNode = node.d.leftExpr.d.member;
        }

        if (nameNode) {
            const declarations = this._typeServer.evaluator.getDeclInfoForNameNode(nameNode)?.decls;

            if (declarations) {
                // TODO - it would be better if we could match the call to the
                // specific declaration (e.g. a specific overload of a property
                // setter vs getter). For now, add callees for all declarations.
                declarations.forEach((decl) => {
                    this._addOutgoingCallForDeclaration(nameNode!, decl);
                });
            }
        }

        return true;
    }

    override visitMemberAccess(node: MemberAccessNode): boolean {
        throwIfCancellationRequested(this._cancellationToken);

        // Determine whether the member corresponds to a property.
        // If so, we'll treat it as a function call for purposes of
        // finding outgoing calls.
        const leftHandType = this._typeServer.evaluator.getType(node.d.leftExpr);
        if (leftHandType) {
            doForEachSubtype(leftHandType, (subtype) => {
                let baseType = subtype;

                // This could be a bound TypeVar (e.g. used for "self" and "cls").
                baseType = this._typeServer.evaluator.makeTopLevelTypeVarsConcrete(baseType);

                if (!isClassInstance(baseType)) {
                    return;
                }

                const memberInfo = lookUpObjectMember(baseType, node.d.member.d.value);
                if (!memberInfo) {
                    return;
                }

                const memberType = this._typeServer.evaluator.getTypeOfMember(memberInfo);
                const propertyDecls = memberInfo.symbol.getDeclarations();

                if (!memberType) {
                    return;
                }

                if (isClassInstance(memberType) && ClassType.isPropertyClass(memberType)) {
                    propertyDecls.forEach((decl) => {
                        this._addOutgoingCallForDeclaration(node.d.member, decl);
                    });
                }
            });
        }

        return true;
    }

    private _addOutgoingCallForDeclaration(nameNode: NameNode, declaration: Declaration) {
        const resolvedDecl = this._typeServer.evaluator.resolveAliasDeclaration(
            declaration,
            /* resolveLocalNames */ true
        );
        if (!resolvedDecl) {
            return;
        }

        if (resolvedDecl.type !== DeclarationType.Function && resolvedDecl.type !== DeclarationType.Class) {
            return;
        }

        const realUri = this._typeServer.convertToRealUri(resolvedDecl.uri);
        if (!realUri) {
            return;
        }

        const callDest: CallHierarchyItem = {
            name: nameNode.d.value,
            kind: getSymbolKind(this._typeServer, resolvedDecl, nameNode.d.value) ?? SymbolKind.Module,
            uri: realUri.toString(),
            range: resolvedDecl.range,
            selectionRange: resolvedDecl.range,
        };

        // Is there already a call recorded for this destination? If so,
        // we'll simply add a new range. Otherwise, we'll create a new entry.
        let outgoingCall: CallHierarchyOutgoingCall | undefined = this._outgoingCalls.find(
            (outgoing) => outgoing.to.uri === callDest.uri && rangesAreEqual(outgoing.to.range, callDest.range)
        );

        if (!outgoingCall) {
            outgoingCall = {
                to: callDest,
                fromRanges: [],
            };
            this._outgoingCalls.push(outgoingCall);
        }

        if (outgoingCall && outgoingCall.to.name !== nameNode.d.value) {
            // If both the function and its alias are called in the same function,
            // the name of the call item will be the resolved declaration name, not the alias.
            outgoingCall.to.name = getNameFromDeclaration(resolvedDecl) ?? nameNode.d.value;
        }

        const fromRange: Range = convertOffsetsToRange(
            nameNode.start,
            nameNode.start + nameNode.length,
            this._parseResults.tokenizerOutput.lines
        );
        outgoingCall.fromRanges.push(fromRange);
    }
}

class FindIncomingCallTreeWalker extends ParseTreeWalker {
    private readonly _incomingCalls: CallHierarchyIncomingCall[] = [];
    private readonly _declarations: Declaration[] = [];

    constructor(
        private readonly _typeServer: ITypeServer,
        private readonly _fileUri: Uri,
        private readonly _parseResults: ParseFileResults,
        private readonly _parseProvider: IParseProvider,
        private readonly _symbolName: string,
        private readonly _targetDeclaration: Declaration,
        private readonly _cancellationToken: CancellationToken
    ) {
        super();

        this._declarations.push(this._targetDeclaration);
    }

    findCalls(): CallHierarchyIncomingCall[] {
        this.walk(this._parseResults.parserOutput.parseTree);
        return this._incomingCalls;
    }

    override visitCall(node: CallNode): boolean {
        throwIfCancellationRequested(this._cancellationToken);

        let nameNode: NameNode | undefined;
        if (node.d.leftExpr.nodeType === ParseNodeType.Name) {
            nameNode = node.d.leftExpr;
        } else if (node.d.leftExpr.nodeType === ParseNodeType.MemberAccess) {
            nameNode = node.d.leftExpr.d.member;
        }

        // Don't bother doing any more work if the name doesn't match.
        if (nameNode && nameNode.d.value === this._symbolName) {
            const declarations = this._getDeclarations(nameNode);
            if (declarations) {
                if (this._targetDeclaration.type === DeclarationType.Alias) {
                    const resolvedCurDecls = this._typeServer.evaluator.resolveAliasDeclaration(
                        this._targetDeclaration,
                        /* resolveLocalNames */ true
                    );
                    if (resolvedCurDecls && declarations.some((decl) => areDeclarationsSame(decl!, resolvedCurDecls))) {
                        this._addIncomingCallForDeclaration(nameNode!);
                    }
                } else if (declarations.some((decl) => this._declarations.some((t) => areDeclarationsSame(decl, t)))) {
                    this._addIncomingCallForDeclaration(nameNode!);
                }
            }
        }

        return true;
    }

    override visitMemberAccess(node: MemberAccessNode): boolean {
        throwIfCancellationRequested(this._cancellationToken);

        if (node.d.member.d.value === this._symbolName) {
            // Determine whether the member corresponds to a property.
            // If so, we'll treat it as a function call for purposes of
            // finding outgoing calls.
            const leftHandType = this._typeServer.evaluator.getType(node.d.leftExpr);
            if (leftHandType) {
                doForEachSubtype(leftHandType, (subtype) => {
                    let baseType = subtype;

                    // This could be a bound TypeVar (e.g. used for "self" and "cls").
                    baseType = this._typeServer.evaluator.makeTopLevelTypeVarsConcrete(baseType);

                    if (!isClassInstance(baseType)) {
                        return;
                    }

                    const memberInfo = lookUpObjectMember(baseType, node.d.member.d.value);
                    if (!memberInfo) {
                        return;
                    }

                    const memberType = this._typeServer.evaluator.getTypeOfMember(memberInfo);
                    const propertyDecls = memberInfo.symbol.getDeclarations();

                    if (!memberType) {
                        return;
                    }

                    if (propertyDecls.some((decl) => areDeclarationsSame(decl!, this._targetDeclaration))) {
                        this._addIncomingCallForDeclaration(node.d.member);
                    }
                });
            }
        }

        return true;
    }

    private _getDeclarations(node: NameNode) {
        const declarations = DocumentSymbolCollector.getDeclarationsForNode(
            this._typeServer,
            this._parseProvider,
            node,
            /* resolveLocalName */ true,
            this._cancellationToken
        );

        const results = [...declarations];
        return results;
    }

    private _addIncomingCallForDeclaration(nameNode: NameNode) {
        let executionNode = getExecutionScopeNode(nameNode);
        while (executionNode && executionNode.nodeType === ParseNodeType.TypeParameterList) {
            executionNode = getExecutionScopeNode(executionNode);
        }

        if (!executionNode) {
            return;
        }

        let callSource: CallHierarchyItem;
        const realUri = this._typeServer.convertToRealUri(this._fileUri);
        if (!realUri) {
            return;
        }

        if (executionNode.nodeType === ParseNodeType.Module) {
            const moduleRange = convertOffsetsToRange(0, 0, this._parseResults.tokenizerOutput.lines);

            callSource = {
                name: `(module) ${realUri.fileName}`,
                kind: SymbolKind.Module,
                uri: realUri.toString(),
                range: moduleRange,
                selectionRange: moduleRange,
            };
        } else if (executionNode.nodeType === ParseNodeType.Lambda) {
            const lambdaRange = convertOffsetsToRange(
                executionNode.start,
                executionNode.start + executionNode.length,
                this._parseResults.tokenizerOutput.lines
            );

            callSource = {
                name: '(lambda)',
                kind: SymbolKind.Function,
                uri: realUri.toString(),
                range: lambdaRange,
                selectionRange: lambdaRange,
            };
        } else {
            const functionRange = convertOffsetsToRange(
                executionNode.d.name.start,
                executionNode.d.name.start + executionNode.d.name.length,
                this._parseResults.tokenizerOutput.lines
            );

            callSource = {
                name: executionNode.d.name.d.value,
                kind: SymbolKind.Function,
                uri: realUri.toString(),
                range: functionRange,
                selectionRange: functionRange,
            };
        }

        // Is there already a call recorded for this caller? If so,
        // we'll simply add a new range. Otherwise, we'll create a new entry.
        let incomingCall: CallHierarchyIncomingCall | undefined = this._incomingCalls.find(
            (incoming) => incoming.from.uri === callSource.uri && rangesAreEqual(incoming.from.range, callSource.range)
        );

        if (!incomingCall) {
            incomingCall = {
                from: callSource,
                fromRanges: [],
            };
            this._incomingCalls.push(incomingCall);
        }

        const fromRange: Range = convertOffsetsToRange(
            nameNode.start,
            nameNode.start + nameNode.length,
            this._parseResults.tokenizerOutput.lines
        );
        incomingCall.fromRanges.push(fromRange);
    }
}
