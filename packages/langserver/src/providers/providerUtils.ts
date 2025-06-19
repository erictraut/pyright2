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
import { ClassNode, FunctionNode, ParseNode } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { isStubFile } from 'typeserver/program/sourceMapper.js';
import {
    ClassDecl,
    Decl,
    DeclCategory,
    FunctionDecl,
    ITypeServer,
    Position,
    Symbol,
    Type,
    TypeFlags,
    VariableDecl,
} from 'typeserver/protocol/typeServerProtocol.js';

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
        boundObjectOrClass?: Type | undefined;
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

    if (!typeDoc && type) {
        // if (optional?.boundObjectOrClass && isFunctionOrOverloaded(type)) {
        //     type = typeServer.evaluator.bindFunctionToClassOrObject(optional.boundObjectOrClass, type);
        // }

        if (type) {
            typeDoc = getDocumentationPartForType(
                typeServer,
                sourceMapper,
                type,
                resolvedDecl,
                optional?.boundObjectOrClass
            );
        }
    }

    // Combine with a new line if they both exist
    return aliasDoc && typeDoc && aliasDoc !== typeDoc ? `${aliasDoc}\n\n${typeDoc}` : aliasDoc || typeDoc;
}

export function isMaybeDescriptorInstance(typeServer: ITypeServer, type: Type, requireSetter: boolean): boolean {
    const getAccess = typeServer.getAttributeAccess(type, '__get__');

    if (!getAccess) {
        return false;
    }

    if (!requireSetter) {
        return true;
    }

    const setAccess = typeServer.getAttributeAccess(type, '__set__');
    return !!setAccess;
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
    boundObjectOrClass?: Type | undefined
): string | undefined {
    if (type.flags & TypeFlags.Module) {
        return getModuleDocString(type, resolvedDecl, sourceMapper);
    }

    if (type.flags & TypeFlags.Class) {
        return getClassDocString(type, resolvedDecl, sourceMapper);
    }

    if (type.flags & TypeFlags.Callable) {
        return type.docString;
        // TODO - need to implement
        // const functionType = boundObjectOrClass ? typeServer.bindTypeToObject(boundObjectOrClass, type) : type;
        // if (functionType && functionType & TypeFlags.Callable) {
        //     const doc =
        //         functionType & TypeFlags.Overloaded
        //             ? getOverloadedDocStringsFromType(typeServer, functionType, sourceMapper)
        //             : getFunctionDocStringFromType(typeServer, functionType, sourceMapper);
        // if (doc) {
        //     return doc;
        // }
        // }
    }

    return undefined;
}

export function getModuleDocString(type: Type, resolvedDecl: Decl | undefined, sourceMapper: ProviderSourceMapper) {
    let docString = type.docString;
    if (!docString) {
        const uri = resolvedDecl?.uri ?? type.moduleUri;
        if (uri) {
            docString = getModuleDocStringFromUris([uri], sourceMapper);
        }
    }

    return docString;
}

export function getClassDocString(classType: Type, resolvedDecl: Decl | undefined, sourceMapper: ProviderSourceMapper) {
    let docString = classType.docString;
    if (!docString && resolvedDecl && resolvedDecl.category === DeclCategory.Class) {
        docString = _getFunctionOrClassDeclsDocString([resolvedDecl]);
        if (!docString && resolvedDecl && isStubFile(resolvedDecl.uri)) {
            for (const implDecl of sourceMapper.findDeclarations(resolvedDecl)) {
                if (implDecl.category === DeclCategory.Variable) {
                    docString = getVariableDeclDocString(implDecl);
                    break;
                }

                if (implDecl.category === DeclCategory.Class || implDecl.category === DeclCategory.Function) {
                    docString = getFunctionOrClassDeclDocString(implDecl);
                    break;
                }
            }
        }
    }

    if (!docString && resolvedDecl) {
        const implDecls = sourceMapper.findDeclarationsByType(resolvedDecl.uri, classType);
        if (implDecls) {
            const classDecls = implDecls.filter((d) => d.category === DeclCategory.Class).map((d) => d);
            docString = _getFunctionOrClassDeclsDocString(classDecls);
        }
    }

    return docString;
}

function _getFunctionOrClassDeclsDocString(decls: FunctionDecl[] | ClassDecl[]): string | undefined {
    for (const decl of decls) {
        const docString = getFunctionOrClassDeclDocString(decl);
        if (docString) {
            return docString;
        }
    }

    return undefined;
}

export function getVariableDeclDocString(decl: VariableDecl): string | undefined {
    // TODO - need to implement
    return undefined;
}

export function getFunctionOrClassDeclDocString(decl: FunctionDecl | ClassDecl): string | undefined {
    // TODO - need to implement
    return undefined;
}
