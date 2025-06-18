/*
 * providerUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Common utility functions used by language server providers.
 */

import { ProviderSourceMapper } from 'langserver/providers/providerSourceMapper.js';
import { getModuleDocStringFromUris } from 'langserver/providers/typeDocStringUtils.js';
import { findNodeByOffset, getEnclosingClass, getEnclosingFunction } from 'typeserver/common/parseTreeUtils.js';
import { convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { ClassType, Type } from 'typeserver/evaluator/types.js';
import { ClassNode, FunctionNode, ParseNode } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { Decl, DeclCategory, ITypeServer, Position, Symbol } from 'typeserver/protocol/typeServerProtocol.js';

// Returns the class node that contains the specified position, or undefined if no class is found.
export function getClassForPosition(pos: Position, parseResults: ParseFileResults): ClassNode | undefined {
    const classOffset = convertPositionToOffset(pos, parseResults.tokenizerOutput.lines);
    if (!classOffset) {
        return undefined;
    }

    const targetNode = findNodeByOffset(parseResults.parserOutput.parseTree, classOffset);
    if (!targetNode) {
        return undefined;
    }

    return getEnclosingClass(targetNode, /* stopAtFunction */ true);
}

// Returns the function node that contains the specified position, or undefined if no class is found.
export function getFunctionForPosition(pos: Position, parseResults: ParseFileResults): FunctionNode | undefined {
    const functionOffset = convertPositionToOffset(pos, parseResults.tokenizerOutput.lines);
    if (!functionOffset) {
        return undefined;
    }

    const targetNode = findNodeByOffset(parseResults.parserOutput.parseTree, functionOffset);
    if (!targetNode) {
        return undefined;
    }

    return getEnclosingFunction(targetNode);
}

export function findNodeByPosition(pos: Position, parseResults: ParseFileResults): ParseNode | undefined {
    const offset = convertPositionToOffset(pos, parseResults.tokenizerOutput.lines);
    if (offset === undefined) {
        return undefined;
    }

    return findNodeByOffset(parseResults.parserOutput.parseTree, offset);
}

export function getDocumentationPartsForTypeAndDecl(
    typeServer: ITypeServer,
    sourceMapper: ProviderSourceMapper,
    type: Type | undefined,
    resolvedDecl: Decl | undefined,
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
    if (resolvedDecl?.category === DeclCategory.Import) {
        // Handle another alias decl special case.
        // ex) import X.Y
        //     [X].Y
        // Asking decl for X gives us "X.Y" rather than "X" since "X" is not actually a symbol.
        // We need to get corresponding module name to use special code in type eval for this case.
        // TODO - need to handle this case
        // if (
        //     resolvedDecl.type === DeclarationType.Alias &&
        //     resolvedDecl.node &&
        //     resolvedDecl.node.nodeType === ParseNodeType.ImportAs &&
        //     !!optional?.name &&
        //     !resolvedDecl.node.d.alias
        // ) {
        //     const name = resolvedDecl.node.d.module.d.nameParts.find((n) => n.d.value === optional.name);
        //     if (name) {
        //         const aliasDecls = typeServer.evaluator.getDeclInfoForNameNode(name)?.decls ?? [resolvedDecl];
        //         resolvedDecl = aliasDecls.length > 0 ? aliasDecls[0] : resolvedDecl;
        //     }
        // }

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

function getDocumentationPartForTypeAlias(
    typeServer: ITypeServer,
    sourceMapper: ProviderSourceMapper,
    resolvedDecl: Decl | undefined,
    symbol?: Symbol
) {
    if (!resolvedDecl) {
        return undefined;
    }

    // TODO - add back in
    // if (resolvedDecl.category === DeclCategory.TypeAlias) {
    //     return resolvedDecl.docString;
    // }

    // if (resolvedDecl.category === DeclCategory.Variable) {
    //     if (resolvedDecl.typeAliasName && resolvedDecl.docString) {
    //         return resolvedDecl.docString;
    //     }

    //     const decl = symbol?.decls.find((d) => d.category === DeclCategory.Variable && !!d.docString) ?? resolvedDecl;
    //     const doc = getVariableDocString(decl, sourceMapper);
    //     if (doc) {
    //         return doc;
    //     }
    // }

    // if (resolvedDecl.category === DeclCategory.Function) {
    //     // @property functions
    //     const doc = getPropertyDocStringInherited(typeServer, resolvedDecl, sourceMapper);
    //     if (doc) {
    //         return doc;
    //     }
    // }

    return undefined;
}

function getDocumentationPartForType(
    typeServer: ITypeServer,
    sourceMapper: ProviderSourceMapper,
    type: Type,
    resolvedDecl: Decl | undefined,
    boundObjectOrClass?: ClassType | undefined
) {
    // if (isModule(type)) {
    //     const doc = getModuleDocString(type, resolvedDecl, sourceMapper);
    //     if (doc) {
    //         return doc;
    //     }
    // } else if (isInstantiableClass(type)) {
    //     const doc = getClassDocString(type, resolvedDecl, sourceMapper);
    //     if (doc) {
    //         return doc;
    //     }
    // } else if (isFunction(type)) {
    //     const functionType = boundObjectOrClass
    //         ? typeServer.evaluator.bindFunctionToClassOrObject(boundObjectOrClass, type)
    //         : type;
    //     if (functionType && isFunction(functionType)) {
    //         const doc = getFunctionDocStringFromType(typeServer, functionType, sourceMapper);
    //         if (doc) {
    //             return doc;
    //         }
    //     }
    // } else if (isOverloaded(type)) {
    //     const functionType = boundObjectOrClass
    //         ? typeServer.evaluator.bindFunctionToClassOrObject(boundObjectOrClass, type)
    //         : type;
    //     if (functionType && isOverloaded(functionType)) {
    //         const doc = getOverloadedDocStringsFromType(typeServer, functionType, sourceMapper).find((d) => d);

    //         if (doc) {
    //             return doc;
    //         }
    //     }
    // }

    // TODO - add back in

    return undefined;
}
