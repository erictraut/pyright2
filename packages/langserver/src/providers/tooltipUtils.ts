/*
 * tooltipUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Helper functions for formatting text that can appear in hover text,
 * completion suggestions, etc.
 */

import { isDefined } from 'commonUtils/valueTypeUtils.js';
import { ProviderSourceMapper } from 'langserver/providers/providerSourceMapper.js';
import {
    getClassDocString,
    getFunctionDocStringInherited,
    getModuleDocString,
    getModuleDocStringFromUris,
    getOverloadedDocStringsInherited,
    getPropertyDocStringInherited,
    getVariableDocString,
} from 'langserver/providers/typeDocStringUtils.js';
import { SignatureDisplayType } from 'langserver/server/languageServerInterface.js';
import { Declaration, DeclarationType, VariableDeclaration } from 'typeserver/binder/declaration.js';
import { Symbol } from 'typeserver/binder/symbol.js';
import { getCallForName, getEnclosingClass } from 'typeserver/common/parseTreeUtils.js';
import { getBoundCallMethod } from 'typeserver/evaluator/constructors.js';
import {
    ClassType,
    FunctionType,
    OverloadedType,
    Type,
    TypeBase,
    TypeCategory,
    UnknownType,
    isClassInstance,
    isFunction,
    isFunctionOrOverloaded,
    isInstantiableClass,
    isModule,
    isOverloaded,
} from 'typeserver/evaluator/types.js';
import { MemberAccessFlags, lookUpClassMember } from 'typeserver/evaluator/typeUtils.js';
import { ExpressionNode, NameNode, ParseNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

// The number of spaces to indent each parameter, after moving to a newline in tooltips.
const functionParamIndentOffset = 4;

export function getToolTipForType(
    typeServer: ITypeServer,
    type: Type,
    label: string,
    name: string,
    isProperty: boolean,
    functionSignatureDisplay: SignatureDisplayType,
    typeNode?: ExpressionNode
): string {
    // Support __call__ method for class instances to show the signature of the method
    if (type.category === TypeCategory.Class && isClassInstance(type) && typeNode) {
        const callMethodResult = getBoundCallMethod(typeServer.evaluator, typeNode, type);
        if (
            callMethodResult?.type.category === TypeCategory.Function ||
            callMethodResult?.type.category === TypeCategory.Overloaded
        ) {
            // Eliminate overloads that are not applicable.
            const methodType = limitOverloadBasedOnCall(typeServer, callMethodResult.type, typeNode);
            if (methodType) {
                type = methodType;
            }
        }
    }
    let signatureString = '';
    if (isOverloaded(type)) {
        signatureString = label.length > 0 ? `(${label})\n` : '';
        signatureString += `${getOverloadedTooltip(typeServer, type, functionSignatureDisplay)}`;
    } else if (isFunction(type)) {
        signatureString = `${getFunctionTooltip(typeServer, label, name, type, isProperty, functionSignatureDisplay)}`;
    } else {
        signatureString = label.length > 0 ? `(${label}) ` : '';
        signatureString += `${name}: ${typeServer.evaluator.printType(type)}`;
    }

    return signatureString;
}

// 70 is vscode's default hover width size.
export function getOverloadedTooltip(
    typeServer: ITypeServer,
    type: OverloadedType,
    functionSignatureDisplay: SignatureDisplayType,
    columnThreshold = 70
) {
    let content = '';
    const overloads = OverloadedType.getOverloads(type).map((o) =>
        getFunctionTooltip(
            typeServer,
            /* label */ '',
            o.shared.name,
            o,
            /* isProperty */ false,
            functionSignatureDisplay
        )
    );

    for (let i = 0; i < overloads.length; i++) {
        if (i !== 0 && overloads[i].length > columnThreshold && overloads[i - 1].length <= columnThreshold) {
            content += '\n';
        }

        content += overloads[i] + `: ...`;

        if (i < overloads.length - 1) {
            content += '\n';
            if (overloads[i].length > columnThreshold) {
                content += '\n';
            }
        }
    }

    return content;
}

export function getFunctionTooltip(
    typeServer: ITypeServer,
    label: string,
    functionName: string,
    type: FunctionType,
    isProperty = false,
    functionSignatureDisplay: SignatureDisplayType
) {
    const labelFormatted = label.length === 0 ? '' : `(${label}) `;
    const indentStr =
        functionSignatureDisplay === SignatureDisplayType.Formatted ? '\n' + ' '.repeat(functionParamIndentOffset) : '';
    const funcParts = typeServer.evaluator.printFunctionParts(type);
    const paramSignature = `${formatSignature(funcParts, indentStr, functionSignatureDisplay)} -> ${funcParts[1]}`;

    if (TypeBase.isInstantiable(type)) {
        return `${labelFormatted}${functionName}: type[${paramSignature}]`;
    }

    const sep = isProperty ? ': ' : '';
    let defKeyword = '';
    if (!isProperty) {
        defKeyword = 'def ';

        if (FunctionType.isAsync(type)) {
            defKeyword = 'async ' + defKeyword;
        }
    }

    return `${labelFormatted}${defKeyword}${functionName}${sep}${paramSignature}`;
}

export function getConstructorTooltip(
    typeServer: ITypeServer,
    constructorName: string,
    type: Type,
    functionSignatureDisplay: SignatureDisplayType
) {
    const classText = `class `;
    let signature = '';

    if (isOverloaded(type)) {
        const overloads = OverloadedType.getOverloads(type).map((overload) =>
            getConstructorTooltip(typeServer, constructorName, overload, functionSignatureDisplay)
        );
        overloads.forEach((overload, index) => {
            signature += overload + ': ...' + '\n\n';
        });
    } else if (isFunction(type)) {
        const indentStr =
            functionSignatureDisplay === SignatureDisplayType.Formatted
                ? '\n' + ' '.repeat(functionParamIndentOffset)
                : ' ';
        const funcParts = typeServer.evaluator.printFunctionParts(type);
        const paramSignature = formatSignature(funcParts, indentStr, functionSignatureDisplay);
        signature += `${classText}${constructorName}${paramSignature}`;
    }
    return signature;
}

// Only formats signature if there is more than one parameter
function formatSignature(
    funcParts: [string[], string],
    indentStr: string,
    functionSignatureDisplay: SignatureDisplayType
) {
    return functionSignatureDisplay === SignatureDisplayType.Formatted &&
        funcParts.length > 0 &&
        funcParts[0].length > 1
        ? `(${indentStr}${funcParts[0].join(',' + indentStr)}\n)`
        : `(${funcParts[0].join(', ')})`;
}

export function getFunctionDocStringFromType(
    typeServer: ITypeServer,
    type: FunctionType,
    sourceMapper: ProviderSourceMapper
) {
    const decl = type.shared.declaration;
    const enclosingClass = decl ? getEnclosingClass(decl.node) : undefined;
    const classResults = enclosingClass ? typeServer.evaluator.getTypeOfClass(enclosingClass) : undefined;

    return getFunctionDocStringInherited(type, decl, sourceMapper, classResults?.classType);
}

export function getOverloadedDocStringsFromType(
    typeServer: ITypeServer,
    type: OverloadedType,
    sourceMapper: ProviderSourceMapper
) {
    const overloads = OverloadedType.getOverloads(type);
    if (overloads.length === 0) {
        return [];
    }

    const decl = overloads[0].shared.declaration;
    const enclosingClass = decl ? getEnclosingClass(decl.node) : undefined;
    const classResults = enclosingClass ? typeServer.evaluator.getTypeOfClass(enclosingClass) : undefined;

    return getOverloadedDocStringsInherited(
        typeServer,
        type,
        overloads.map((o) => o.shared.declaration).filter(isDefined),
        sourceMapper,

        classResults?.classType
    );
}

function getDocumentationPartForTypeAlias(
    typeServer: ITypeServer,
    sourceMapper: ProviderSourceMapper,
    resolvedDecl: Declaration | undefined,
    symbol?: Symbol
) {
    if (!resolvedDecl) {
        return undefined;
    }

    if (resolvedDecl.type === DeclarationType.TypeAlias) {
        return resolvedDecl.docString;
    }

    if (resolvedDecl.type === DeclarationType.Variable) {
        if (resolvedDecl.typeAliasName && resolvedDecl.docString) {
            return resolvedDecl.docString;
        }

        const decl = (symbol?.getDeclarations().find((d) => d.type === DeclarationType.Variable && !!d.docString) ??
            resolvedDecl) as VariableDeclaration;
        const doc = getVariableDocString(decl, sourceMapper);
        if (doc) {
            return doc;
        }
    }

    if (resolvedDecl.type === DeclarationType.Function) {
        // @property functions
        const doc = getPropertyDocStringInherited(typeServer, resolvedDecl, sourceMapper);
        if (doc) {
            return doc;
        }
    }

    return undefined;
}

function getDocumentationPartForType(
    typeServer: ITypeServer,
    sourceMapper: ProviderSourceMapper,
    type: Type,
    resolvedDecl: Declaration | undefined,
    boundObjectOrClass?: ClassType | undefined
) {
    if (isModule(type)) {
        const doc = getModuleDocString(type, resolvedDecl, sourceMapper);
        if (doc) {
            return doc;
        }
    } else if (isInstantiableClass(type)) {
        const doc = getClassDocString(type, resolvedDecl, sourceMapper);
        if (doc) {
            return doc;
        }
    } else if (isFunction(type)) {
        const functionType = boundObjectOrClass
            ? typeServer.evaluator.bindFunctionToClassOrObject(boundObjectOrClass, type)
            : type;
        if (functionType && isFunction(functionType)) {
            const doc = getFunctionDocStringFromType(typeServer, functionType, sourceMapper);
            if (doc) {
                return doc;
            }
        }
    } else if (isOverloaded(type)) {
        const functionType = boundObjectOrClass
            ? typeServer.evaluator.bindFunctionToClassOrObject(boundObjectOrClass, type)
            : type;
        if (functionType && isOverloaded(functionType)) {
            const doc = getOverloadedDocStringsFromType(typeServer, functionType, sourceMapper).find((d) => d);

            if (doc) {
                return doc;
            }
        }
    }
    return undefined;
}

export function getDocumentationPartsForTypeAndDecl(
    typeServer: ITypeServer,
    sourceMapper: ProviderSourceMapper,
    type: Type | undefined,
    resolvedDecl: Declaration | undefined,
    optional?: {
        name?: string;
        symbol?: Symbol;
        boundObjectOrClass?: ClassType | undefined;
    }
): string | undefined {
    // Get the alias first
    const aliasDoc = getDocumentationPartForTypeAlias(typeServer, sourceMapper, resolvedDecl, optional?.symbol);

    // Combine this with the type doc
    let typeDoc: string | undefined;
    if (resolvedDecl?.type === DeclarationType.Alias) {
        // Handle another alias decl special case.
        // ex) import X.Y
        //     [X].Y
        // Asking decl for X gives us "X.Y" rather than "X" since "X" is not actually a symbol.
        // We need to get corresponding module name to use special code in type eval for this case.
        if (
            resolvedDecl.type === DeclarationType.Alias &&
            resolvedDecl.node &&
            resolvedDecl.node.nodeType === ParseNodeType.ImportAs &&
            !!optional?.name &&
            !resolvedDecl.node.d.alias
        ) {
            const name = resolvedDecl.node.d.module.d.nameParts.find((n) => n.d.value === optional.name);
            if (name) {
                const aliasDecls = typeServer.evaluator.getDeclInfoForNameNode(name)?.decls ?? [resolvedDecl];
                resolvedDecl = aliasDecls.length > 0 ? aliasDecls[0] : resolvedDecl;
            }
        }

        typeDoc = getModuleDocStringFromUris([resolvedDecl.uri], sourceMapper);
    }

    typeDoc =
        typeDoc ??
        (type
            ? getDocumentationPartForType(typeServer, sourceMapper, type, resolvedDecl, optional?.boundObjectOrClass)
            : undefined);

    // Combine with a new line if they both exist
    return aliasDoc && typeDoc && aliasDoc !== typeDoc ? `${aliasDoc}\n\n${typeDoc}` : aliasDoc || typeDoc;
}

export function getAutoImportText(name: string, from?: string, alias?: string): string {
    let text: string | undefined;
    if (!from) {
        text = `import ${name}`;
    } else {
        text = `from ${from} import ${name}`;
    }

    if (alias) {
        text = `${text} as ${alias}`;
    }

    return text;
}

export function getClassAndConstructorTypes(typeServer: ITypeServer, node: NameNode) {
    // If the class is used as part of a call (i.e. it is being
    // instantiated), include the constructor arguments within the
    // hover text.
    let callLeftNode: ParseNode | undefined = node;

    // Allow the left to be a member access chain (e.g. a.b.c) if the
    // node in question is the last item in the chain.
    if (callLeftNode?.parent?.nodeType === ParseNodeType.MemberAccess && node === callLeftNode.parent.d.member) {
        callLeftNode = node.parent;
        // Allow the left to be a generic class constructor (e.g. foo[int]())
    } else if (callLeftNode?.parent?.nodeType === ParseNodeType.Index) {
        callLeftNode = node.parent;
    }

    if (
        !callLeftNode ||
        !callLeftNode.parent ||
        callLeftNode.parent.nodeType !== ParseNodeType.Call ||
        callLeftNode.parent.d.leftExpr !== callLeftNode
    ) {
        return;
    }

    // Get the init method for this class.
    const classType = getTypeForToolTip(typeServer, node);
    if (!isInstantiableClass(classType)) {
        return;
    }

    const instanceType = getTypeForToolTip(typeServer, callLeftNode.parent);
    if (!isClassInstance(instanceType)) {
        return;
    }

    let methodType: Type | undefined;

    // Try to get the `__init__` method first because it typically has more type information than `__new__`.
    // Don't exclude `object.__init__` since in the plain case we want to show Foo().
    const initMember = lookUpClassMember(classType, '__init__', MemberAccessFlags.SkipInstanceMembers);

    if (initMember) {
        const functionType = typeServer.evaluator.getTypeOfMember(initMember);

        if (isFunctionOrOverloaded(functionType)) {
            methodType = bindFunctionToClassOrObjectToolTip(typeServer, node, instanceType, functionType);
        }
    }

    // If there was no `__init__`, excluding `object` class `__init__`, or if `__init__` only had default params (*args: Any, **kwargs: Any) or no params (),
    // see if we can find a better `__new__` method.
    if (
        !methodType ||
        (methodType &&
            isFunction(methodType) &&
            (FunctionType.hasDefaultParams(methodType) || methodType.shared.parameters.length === 0))
    ) {
        const newMember = lookUpClassMember(
            classType,
            '__new__',
            MemberAccessFlags.SkipObjectBaseClass | MemberAccessFlags.SkipInstanceMembers
        );

        if (newMember) {
            const newMemberType = typeServer.evaluator.getTypeOfMember(newMember);

            // Prefer `__new__` if it doesn't have default params (*args: Any, **kwargs: Any) or no params ().
            if (isFunctionOrOverloaded(newMemberType)) {
                // Set `treatConstructorAsClassMethod` to true to exclude `cls` as a parameter.
                methodType = bindFunctionToClassOrObjectToolTip(
                    typeServer,
                    node,
                    instanceType,
                    newMemberType,
                    /* treatConstructorAsClassMethod */ true
                );
            }
        }
    }

    return { methodType, classType };
}

export function bindFunctionToClassOrObjectToolTip(
    typeServer: ITypeServer,
    node: ExpressionNode,
    baseType: ClassType | undefined,
    memberType: FunctionType | OverloadedType,
    treatConstructorAsClassMethod?: boolean
): FunctionType | OverloadedType | undefined {
    const methodType = typeServer.evaluator.bindFunctionToClassOrObject(
        baseType,
        memberType,
        /* memberClass */ undefined,
        treatConstructorAsClassMethod
    );

    if (!methodType) {
        return undefined;
    }

    return limitOverloadBasedOnCall(typeServer, methodType, node);
}

export function limitOverloadBasedOnCall<T extends Type>(
    typeServer: ITypeServer,
    type: T,
    node: ExpressionNode
): T | FunctionType | OverloadedType {
    // If it's an overloaded function, see if it's part of a call expression.
    // If so, we may be able to eliminate some of the overloads based on
    // the overload resolution.
    if (!isOverloaded(type) || node.nodeType !== ParseNodeType.Name) {
        return type;
    }

    const callNode = getCallForName(node);
    if (!callNode) {
        return type;
    }

    const callTypeResult = typeServer.evaluator.getTypeResult(callNode);
    if (!callTypeResult || !callTypeResult.overloadsUsedForCall || callTypeResult.overloadsUsedForCall.length === 0) {
        return type;
    }

    if (callTypeResult.overloadsUsedForCall.length === 1) {
        return callTypeResult.overloadsUsedForCall[0];
    }

    return OverloadedType.create(callTypeResult.overloadsUsedForCall);
}

export function getTypeForToolTip(typeServer: ITypeServer, node: ExpressionNode): Type {
    // It does common work necessary for hover for a type we got
    // from raw type evaluator.
    const type = typeServer.evaluator.getType(node) ?? UnknownType.create();
    return limitOverloadBasedOnCall(typeServer, type, node);
}
