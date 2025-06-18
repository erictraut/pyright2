/*
 * providerSourceMapper.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Encapsulates a type server and arguments needed to call it for various
 * operations that involve mapping a stub file to a source file.
 */

import { CancellationToken } from 'vscode-languageserver';

import { IParseProvider } from 'langserver/providers/parseProvider.js';
import { findNodeByPosition, getClassForPosition, getFunctionForPosition } from 'langserver/providers/providerUtils.js';
import { Declaration } from 'typeserver/binder/declaration.js';
import { getEnclosingClass, getEnclosingFunction } from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetToPosition } from 'typeserver/common/positionUtils.js';
import { ClassType } from 'typeserver/evaluator/types.js';
import { ClassNode, ModuleNode, ParseNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { buildImportTree } from 'typeserver/program/sourceMapperUtils.js';
import {
    ClassDecl,
    Decl,
    DeclBase,
    DeclCategory,
    FunctionDecl,
    ITypeServer,
    ParameterDecl,
    VariableDecl,
} from 'typeserver/protocol/typeServerProtocol.js';
import { appendArray } from 'typeserver/utils/collectionUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { isDefined } from 'typeserver/utils/valueTypeUtils.js';

type ClassOrFunctionOrVariableDecl = ClassDecl | FunctionDecl | VariableDecl;

export class ProviderSourceMapper {
    // TODO - need to remove this
    private _sourceMapper: SourceMapper;

    constructor(
        private _typeServer: ITypeServer,
        private _parseProvider: IParseProvider,
        private _fileUri: Uri,
        private _preferStubs: boolean,
        private _cancelToken: CancellationToken
    ) {
        this._sourceMapper = _typeServer.getSourceMapper(_fileUri, _preferStubs, _cancelToken);
    }

    // If the specified fileUri is a stub file and _preferStubs is false,
    // this returns a list of Uris for the source file(s) that this stub maps to.
    getStubImplementations(fileUri: Uri): Uri[] {
        const uriList = this._isStubThatShouldBeMappedToImplementation(fileUri)
            ? this._getSourcePathsFromStub(fileUri, this._fileUri) ?? []
            : [fileUri];

        return uriList;
    }

    getStubImplementationModules(fileUri: Uri): ModuleNode[] {
        const uriList = this.getStubImplementations(fileUri);
        return uriList.map((uri) => this.getModuleNode(uri)).filter(isDefined);
    }

    // Returns the top-level parse node for the specified file.
    getModuleNode(fileUri: Uri): ModuleNode | undefined {
        const parsedFile = this._parseProvider.parseFile(fileUri);
        return parsedFile?.parserOutput.parseTree;
    }

    // TODO - this should be removed once we eliminate the need for sourceMapper
    // eslint-disable-next-line @typescript-eslint/naming-convention
    findDeclarations_old(stubDecl: Declaration): Declaration[] {
        // Used to find corresponding declarations for a stub declaration
        return this._sourceMapper.findDeclarations(stubDecl);
    }

    // TODO - this should be removed once we eliminate the need for sourceMapper
    // eslint-disable-next-line @typescript-eslint/naming-convention
    findDeclarationsByType_old(originatedPath: Uri, type: ClassType): Declaration[] {
        // Used to implement "Go to Type Definition" for a type
        return this._sourceMapper.findDeclarationsByType(originatedPath, type);
    }

    // Returns all of the declarations that correspond to a given declaration
    // in the stub file. This includes all corresponding declarations in
    // implementation files.
    findDeclarations(stubDecl: Decl): Decl[] {
        if (stubDecl.category === DeclCategory.Class && !stubDecl.specialForm) {
            return this._findClassOrTypeAliasDeclarations(stubDecl);
        }

        if (stubDecl.category === DeclCategory.Function) {
            return this._findFunctionOrTypeAliasDeclarations(stubDecl);
        }

        if (stubDecl.category === DeclCategory.Variable) {
            return this._findVariableDeclarations(stubDecl);
        }

        if (stubDecl.category === DeclCategory.Parameter) {
            return this._findParamDeclarations(stubDecl);
        }

        return [];
    }

    findDeclarationsByType(originatedPath: Uri, type: ClassType): Decl[] {
        const result: ClassOrFunctionOrVariableDecl[] = [];
        this._addClassTypeDeclarations(originatedPath, type, result, new Set<string>());
        return result;
    }

    private _getSourcePathsFromStub(stubFileUri: Uri, fromFile: Uri | undefined): Uri[] {
        // Attempt our stubFileUri to see if we can resolve it as a source file path.
        let results = this._typeServer.getStubImplementation(stubFileUri, fromFile);
        if (results && results.length > 0) {
            return results.map((file) => file.uri);
        }

        // If that didn't work, try looking through the graph up to our fromFile.
        // One of them should be able to resolve to an actual file.
        const stubFileImportTree = this._getStubFileImportTree(stubFileUri, fromFile);

        // Go through the items in this tree until we find at least one path.
        for (let i = 0; i < stubFileImportTree.length; i++) {
            results = this._typeServer.getStubImplementation(stubFileImportTree[i]);
            if (results && results.length > 0) {
                return results.map((file) => file.uri);
            }
        }

        return [];
    }

    private _getStubFileImportTree(stubFileUri: Uri, fromFile: Uri | undefined): Uri[] {
        if (!fromFile || !this._isStubThatShouldBeMappedToImplementation(stubFileUri)) {
            // No path to search, just return the starting point.
            return [stubFileUri];
        } else {
            // Otherwise recurse through the importedBy list up to our 'fromFile'.
            return buildImportTree(
                fromFile,
                stubFileUri,
                (p) => {
                    const boundSourceInfo = this._typeServer.getSourceFile(p);
                    return boundSourceInfo ? boundSourceInfo.getImportedBy().map((info) => info.uri) : [];
                },
                this._cancelToken
            ).filter((p) => this._isStubThatShouldBeMappedToImplementation(p));
        }
    }

    private _isStubThatShouldBeMappedToImplementation(fileUri: Uri): boolean {
        if (this._preferStubs) {
            return false;
        }

        const stub = isStubFile(fileUri);
        if (!stub) {
            return false;
        }

        const implFiles = this._typeServer.getStubImplementation(fileUri, this._fileUri);
        if (!implFiles || implFiles.length === 0) {
            return false;
        }

        return true;
    }

    private _findClassOrTypeAliasDeclarations(stubDecl: ClassDecl, recursiveDeclCache = new Set<string>()): Decl[] {
        const parseResults = this._parseProvider.parseFile(stubDecl.uri);
        if (!parseResults) {
            return [];
        }
        const classNode = getClassForPosition(stubDecl.range.start, parseResults);
        if (!classNode) {
            return [];
        }
        const className = this._getFullClassName(classNode);
        const sourceFiles = this._typeServer.getStubImplementation(stubDecl.uri) ?? [];

        return sourceFiles.flatMap((sourceFile) =>
            this._findClassDeclarationsByName(sourceFile.uri, className, recursiveDeclCache)
        );
    }

    private _findFunctionOrTypeAliasDeclarations(
        stubDecl: FunctionDecl,
        recursiveDeclCache = new Set<string>()
    ): ClassOrFunctionOrVariableDecl[] {
        const parseResults = this._parseProvider.parseFile(stubDecl.uri);
        if (!parseResults) {
            return [];
        }
        const functionNode = getFunctionForPosition(stubDecl.range.start, parseResults);
        if (!functionNode) {
            return [];
        }

        const functionName = functionNode.d.name.d.value;
        const sourceFiles = this._typeServer.getStubImplementation(stubDecl.uri) ?? [];

        if (stubDecl.method) {
            if (!functionNode.parent) {
                return [];
            }

            const classNode = getEnclosingClass(functionNode.parent, /* stopeAtFunction */ true);
            if (classNode === undefined) {
                return [];
            }

            const className = this._getFullClassName(classNode);
            return sourceFiles.flatMap((sourceFile) =>
                this._findMethodDeclarationsByName(sourceFile.uri, className, functionName, recursiveDeclCache)
            );
        }

        return sourceFiles.flatMap((sourceFile) =>
            this._findFunctionDeclarationsByName(sourceFile.uri, functionName, recursiveDeclCache)
        );
    }

    private _findFunctionDeclarationsByName(
        sourceFile: Uri,
        functionName: string,
        recursiveDeclCache: Set<string>
    ): ClassOrFunctionOrVariableDecl[] {
        const result: ClassOrFunctionOrVariableDecl[] = [];

        const uniqueId = `@${sourceFile}/f/${functionName}`;
        if (recursiveDeclCache.has(uniqueId)) {
            return result;
        }

        recursiveDeclCache.add(uniqueId);

        const moduleNode = this.getModuleNode(sourceFile);
        if (!moduleNode) {
            // Don't bother deleting from the cache; we'll never get any info from this
            // file if it has no tree.
            return result;
        }

        const decls = this._lookUpSymbolDeclarations(sourceFile, moduleNode, functionName);
        if (decls.length === 0) {
            this._addDeclarationsFollowingWildcardImports(sourceFile, functionName, result, recursiveDeclCache);
        } else {
            for (const decl of decls) {
                this._addClassOrFunctionDeclarations(decl, result, recursiveDeclCache);
            }
        }

        recursiveDeclCache.delete(uniqueId);
        return result;
    }

    private _findVariableDeclarations(
        stubDecl: VariableDecl,
        recursiveDeclCache = new Set<string>()
    ): ClassOrFunctionOrVariableDecl[] {
        const parseResults = this._parseProvider.parseFile(stubDecl.uri);
        if (!parseResults) {
            return [];
        }
        const varNode = findNodeByPosition(stubDecl.range.start, parseResults);
        if (!varNode || varNode.nodeType !== ParseNodeType.Name) {
            return [];
        }

        const variableName = varNode.d.value;
        const sourceFiles = this._typeServer.getStubImplementation(stubDecl.uri);
        if (!sourceFiles) {
            return [];
        }

        const classNode = getEnclosingClass(varNode);

        if (classNode) {
            const className = this._getFullClassName(classNode);

            return sourceFiles.flatMap((sourceFile) =>
                this._findFieldDeclarationsByName(sourceFile.uri, className, variableName, recursiveDeclCache)
            );
        } else {
            return sourceFiles.flatMap((sourceFile) =>
                this._findVariableDeclarationsByName(sourceFile.uri, variableName, recursiveDeclCache)
            );
        }
    }

    private _findParamDeclarations(stubDecl: ParameterDecl): ParameterDecl[] {
        const result: ParameterDecl[] = [];

        const parseResults = this._parseProvider.parseFile(stubDecl.uri);
        if (!parseResults) {
            return result;
        }
        const paramNode = findNodeByPosition(stubDecl.range.start, parseResults);
        if (!paramNode || paramNode.nodeType !== ParseNodeType.Name) {
            return result;
        }

        const functionNode = getEnclosingFunction(paramNode);
        if (!functionNode) {
            return result;
        }

        const functionNamePos = convertOffsetToPosition(functionNode.d.name.start, parseResults.tokenizerOutput.lines);
        if (functionNamePos === undefined) {
            return result;
        }

        const functionStubDeclInfo = this._typeServer.getDeclsForPosition(stubDecl.uri, functionNamePos);
        if (!functionStubDeclInfo) {
            return result;
        }

        const recursiveDeclCache = new Set<string>();

        for (const functionStubDecl of functionStubDeclInfo.decls) {
            if (functionStubDecl.category === DeclCategory.Function) {
                for (const functionDecl of this._findFunctionOrTypeAliasDeclarations(
                    functionStubDecl,
                    recursiveDeclCache
                )) {
                    const targetParse = this._parseProvider.parseFile(functionDecl.uri);
                    if (!targetParse) {
                        continue;
                    }
                    const targetNode = findNodeByPosition(functionStubDecl.range.start, targetParse);
                    if (!targetNode) {
                        continue;
                    }

                    appendArray(
                        result,
                        this._lookUpSymbolDeclarations(functionDecl.uri, targetNode, paramNode.d.value)
                            .filter((d) => d.category === DeclCategory.Parameter)
                            .map((d) => d)
                    );
                }
            }
        }

        return result;
    }

    private _findFieldDeclarationsByName(
        sourceFile: Uri,
        className: string,
        variableName: string,
        recursiveDeclCache: Set<string>
    ): VariableDecl[] {
        let result: VariableDecl[] = [];

        const uniqueId = `@${sourceFile}/c/${className}/v/${variableName}`;
        if (recursiveDeclCache.has(uniqueId)) {
            return result;
        }

        recursiveDeclCache.add(uniqueId);

        result = this._findMemberDeclarationsByName(
            sourceFile,
            className,
            variableName,
            (decl, cache, result) => {
                if (decl.category === DeclCategory.Variable) {
                    if (this._isStubThatShouldBeMappedToImplementation(decl.uri)) {
                        for (const implDecl of this._findVariableDeclarations(decl, cache)) {
                            if (implDecl.category === DeclCategory.Variable) {
                                result.push(implDecl);
                            }
                        }
                    } else {
                        result.push(decl);
                    }
                }
            },
            recursiveDeclCache
        );

        recursiveDeclCache.delete(uniqueId);
        return result;
    }

    private _findVariableDeclarationsByName(
        sourceFile: Uri,
        variableName: string,
        recursiveDeclCache: Set<string>
    ): ClassOrFunctionOrVariableDecl[] {
        const result: ClassOrFunctionOrVariableDecl[] = [];

        const uniqueId = `@${sourceFile}/v/${variableName}`;
        if (recursiveDeclCache.has(uniqueId)) {
            return result;
        }

        recursiveDeclCache.add(uniqueId);

        const moduleNode = this.getModuleNode(sourceFile);
        if (!moduleNode) {
            // Don't bother deleting from the cache; we'll never get any info from this
            // file if it has no tree.
            return result;
        }

        const decls = this._lookUpSymbolDeclarations(sourceFile, moduleNode, variableName);
        if (decls.length === 0) {
            this._addDeclarationsFollowingWildcardImports(sourceFile, variableName, result, recursiveDeclCache);
        } else {
            for (const decl of decls) {
                this._addVariableDeclarations(decl, result, recursiveDeclCache);
            }
        }

        recursiveDeclCache.delete(uniqueId);
        return result;
    }

    private _findMethodDeclarationsByName(
        sourceFile: Uri,
        className: string,
        functionName: string,
        recursiveDeclCache: Set<string>
    ): ClassOrFunctionOrVariableDecl[] {
        let result: ClassOrFunctionOrVariableDecl[] = [];

        const uniqueId = `@${sourceFile}/c/${className}/f/${functionName}`;
        if (recursiveDeclCache.has(uniqueId)) {
            return result;
        }

        recursiveDeclCache.add(uniqueId);

        result = this._findMemberDeclarationsByName(
            sourceFile,
            className,
            functionName,
            (decl, cache, result) => {
                if (decl.category === DeclCategory.Function) {
                    if (this._isStubThatShouldBeMappedToImplementation(decl.uri)) {
                        appendArray(result, this._findFunctionOrTypeAliasDeclarations(decl, cache));
                    } else {
                        result.push(decl);
                    }
                }
            },
            recursiveDeclCache
        );

        recursiveDeclCache.delete(uniqueId);
        return result;
    }

    private _findMemberDeclarationsByName<T extends DeclBase>(
        sourceFile: Uri,
        className: string,
        memberName: string,
        declAdder: (d: Decl, c: Set<string>, r: T[]) => void,
        recursiveDeclCache: Set<string>
    ): T[] {
        const result: T[] = [];
        // TODO - need to reimplement this
        // const classDecls = this._findClassDeclarationsByName(sourceFile, className, recursiveDeclCache);

        // for (const classDecl of classDecls.filter((d) => d.category === DeclCategory.Class).map((d) => d)) {
        //     const classResults = this._evaluator.getTypeOfClass(classDecl.node);
        //     if (!classResults) {
        //         continue;
        //     }

        //     const member = lookUpClassMember(classResults.classType, memberName);
        //     if (member) {
        //         for (const decl of member.symbol.getDeclarations()) {
        //             declAdder(decl, recursiveDeclCache, result);
        //         }
        //     }
        // }

        return result;
    }

    private _findClassDeclarationsByName(
        sourceFile: Uri,
        fullClassName: string,
        recursiveDeclCache: Set<string>
    ): ClassOrFunctionOrVariableDecl[] {
        let classDecls: ClassOrFunctionOrVariableDecl[] = [];

        const parentNode = this.getModuleNode(sourceFile);
        if (parentNode) {
            let classNameParts = fullClassName.split('.');
            if (classNameParts.length > 0) {
                classDecls = this._findClassDeclarations(sourceFile, classNameParts[0], parentNode, recursiveDeclCache);
                classNameParts = classNameParts.slice(1);
            }

            for (const classNamePart of classNameParts) {
                classDecls = classDecls.flatMap((parentDecl) => {
                    const targetParse = this._parseProvider.parseFile(parentDecl.uri);
                    if (!targetParse) {
                        return [];
                    }

                    const parentNode = findNodeByPosition(parentDecl.range.start, targetParse);
                    if (!parentNode) {
                        return [];
                    }

                    return this._findClassDeclarations(sourceFile, classNamePart, parentNode, recursiveDeclCache);
                });
            }
        }

        return classDecls;
    }

    private _findClassDeclarations(
        sourceFile: Uri,
        className: string,
        parentNode: ParseNode,
        recursiveDeclCache: Set<string>
    ): ClassOrFunctionOrVariableDecl[] {
        const result: ClassOrFunctionOrVariableDecl[] = [];

        const uniqueId = `@${sourceFile}[${parentNode.start}]${className}`;
        if (recursiveDeclCache.has(uniqueId)) {
            return result;
        }

        recursiveDeclCache.add(uniqueId);

        const decls = this._lookUpSymbolDeclarations(sourceFile, parentNode, className);
        if (decls.length === 0 && parentNode.nodeType === ParseNodeType.Module) {
            this._addDeclarationsFollowingWildcardImports(sourceFile, className, result, recursiveDeclCache);
        } else {
            for (const decl of decls) {
                this._addClassOrFunctionDeclarations(decl, result, recursiveDeclCache);
            }
        }

        recursiveDeclCache.delete(uniqueId);
        return result;
    }

    private _addVariableDeclarations(
        decl: Decl,
        result: ClassOrFunctionOrVariableDecl[],
        recursiveDeclCache: Set<string>
    ) {
        if (decl.category === DeclCategory.Variable) {
            if (this._isStubThatShouldBeMappedToImplementation(decl.uri)) {
                appendArray(result, this._findVariableDeclarations(decl, recursiveDeclCache));
            } else {
                result.push(decl);
            }
        } else if (decl.category === DeclCategory.Import) {
            const resolvedDecl = this._typeServer.resolveImportDecl(decl, /* resolveLocalNames */ true);
            if (resolvedDecl) {
                if (resolvedDecl.category === DeclCategory.Variable) {
                    this._addVariableDeclarations(resolvedDecl, result, recursiveDeclCache);
                } else if (
                    resolvedDecl.category === DeclCategory.Class ||
                    resolvedDecl.category === DeclCategory.Function
                ) {
                    this._addClassOrFunctionDeclarations(resolvedDecl, result, recursiveDeclCache);
                }
            }
        }
    }

    private _addClassOrFunctionDeclarations(
        decl: Decl,
        result: ClassOrFunctionOrVariableDecl[],
        recursiveDeclCache: Set<string>
    ) {
        if (decl.category === DeclCategory.Class) {
            if (this._isStubThatShouldBeMappedToImplementation(decl.uri)) {
                appendArray(result, this._findClassOrTypeAliasDeclarations(decl, recursiveDeclCache));
            } else {
                result.push(decl);
            }
        } else if (decl.category === DeclCategory.Function) {
            if (this._isStubThatShouldBeMappedToImplementation(decl.uri)) {
                appendArray(result, this._findFunctionOrTypeAliasDeclarations(decl, recursiveDeclCache));
            } else {
                result.push(decl);
            }
        } else if (decl.category === DeclCategory.Import) {
            // TODO - look at adding this back
            // const adjustedDecl = this._handleSpecialBuiltInModule(decl);
            const adjustedDecl = decl;
            const resolvedDecl = this._typeServer.resolveImportDecl(adjustedDecl, /* resolveLocalNames */ true);
            if (resolvedDecl && resolvedDecl.category !== DeclCategory.Import) {
                this._addClassOrFunctionDeclarations(resolvedDecl, result, recursiveDeclCache);
            }
        } else if (decl.category === DeclCategory.Variable) {
            // Always add decl. This handles a case where function is dynamically generated such as pandas.read_csv or type alias.
            this._addVariableDeclarations(decl, result, recursiveDeclCache);

            // And try to add the real decl if we can. Sometimes, we can't since import resolver can't follow up the type alias or assignment.
            // Import resolver can't resolve an import that only exists in the lib but not in the stub in certain circumstance.

            // TODO - need to reimplement this

            // const nodeToBind = decl.typeAliasName ?? decl.node;
            // const type = this._evaluator.getType(nodeToBind);
            // if (!type) {
            //     return;
            // }

            // if (isFunction(type) && type.shared.declaration) {
            //     this._addClassOrFunctionDeclarations(type.shared.declaration, result, recursiveDeclCache);
            // } else if (isOverloaded(type)) {
            //     const overloads = OverloadedType.getOverloads(type);
            //     for (const overloadDecl of overloads.map((o) => o.shared.declaration).filter(isDefined)) {
            //         this._addClassOrFunctionDeclarations(overloadDecl, result, recursiveDeclCache);
            //     }
            // } else if (isInstantiableClass(type)) {
            //     this._addClassTypeDeclarations(decl.uri, type, result, recursiveDeclCache);
            // }
        }
    }

    private _addClassTypeDeclarations(
        originated: Uri,
        type: ClassType,
        result: ClassOrFunctionOrVariableDecl[],
        recursiveDeclCache: Set<string>
    ) {
        const fileUri = type.shared.fileUri;
        const sourceFiles = this._getSourceFiles(fileUri, /* stubToShadow */ undefined, originated);

        const fullName = type.shared.fullName;
        const moduleName = type.shared.moduleName;
        const fullClassName = fullName.substring(moduleName.length + 1 /* +1 for trailing dot */);

        for (const sourceFile of sourceFiles) {
            appendArray(result, this._findClassDeclarationsByName(sourceFile, fullClassName, recursiveDeclCache));
        }
    }

    private _lookUpSymbolDeclarations(sourceFile: Uri, node: ParseNode | undefined, symbolName: string): Decl[] {
        if (node === undefined) {
            return [];
        }

        const parseResults = this._parseProvider.parseFile(sourceFile);
        if (!parseResults) {
            return [];
        }

        const nodePosition = convertOffsetToPosition(node.start, parseResults?.tokenizerOutput.lines);
        return this._typeServer.lookUpSymbolInScope(sourceFile, nodePosition, symbolName)?.decls ?? [];
    }

    private _addDeclarationsFollowingWildcardImports(
        sourceFile: Uri,
        symbolName: string,
        result: ClassOrFunctionOrVariableDecl[],
        recursiveDeclCache: Set<string>
    ) {
        // Symbol exists in a stub doesn't exist in a python file. Use some heuristic
        // to find one from sources.
        const symbols = this._typeServer.getSymbolsForScope(sourceFile, { line: 0, character: 0 });
        if (!symbols) {
            return;
        }

        // Dig down imports with wildcard imports.
        for (const symbol of symbols) {
            for (const decl of symbol.decls) {
                if (decl.category !== DeclCategory.Import || decl.uri.isEmpty() || !decl.wildcard) {
                    continue;
                }

                const uniqueId = `@${decl.uri.key}/l/${symbolName}`;
                if (recursiveDeclCache.has(uniqueId)) {
                    continue;
                }

                // While traversing these tables, we may encounter the same decl
                // more than once (via different files' wildcard imports). To avoid this,
                // add an ID unique to this function to the recursiveDeclCache to deduplicate
                // them.
                //
                // The ID is not deleted to avoid needing a second Set to track all decls
                // seen in this function. This is safe because the ID here is unique to this
                // function.
                recursiveDeclCache.add(uniqueId);

                const sourceFiles = this._getSourceFiles(decl.uri);
                for (const sourceFile of sourceFiles) {
                    const symbol = this._typeServer.lookUpSymbolInScope(
                        sourceFile,
                        { line: 0, character: 0 },
                        symbolName
                    );
                    if (!symbol || symbol.decls.length === 0) {
                        this._addDeclarationsFollowingWildcardImports(
                            sourceFile,
                            symbolName,
                            result,
                            recursiveDeclCache
                        );
                    } else {
                        for (const decl of symbol.decls) {
                            const resolvedDecl =
                                decl.category === DeclCategory.Import
                                    ? this._typeServer.resolveImportDecl(decl, /* resolveLocalNames */ true)
                                    : decl;
                            if (!resolvedDecl) {
                                continue;
                            }

                            if (
                                resolvedDecl.category === DeclCategory.Function ||
                                resolvedDecl.category === DeclCategory.Class
                            ) {
                                this._addClassOrFunctionDeclarations(resolvedDecl, result, recursiveDeclCache);
                            } else if (resolvedDecl.category === DeclCategory.Variable) {
                                this._addVariableDeclarations(resolvedDecl, result, recursiveDeclCache);
                            }
                        }
                    }
                }
            }
        }
    }

    private _getSourceFiles(fileUri: Uri, stubToShadow?: Uri, originated?: Uri) {
        const sourceFiles: Uri[] = [];

        if (this._isStubThatShouldBeMappedToImplementation(fileUri)) {
            appendArray(sourceFiles, this._getSourcePathsFromStub(fileUri, stubToShadow ?? originated));
        } else {
            sourceFiles.push(fileUri);
        }

        return sourceFiles;
    }

    private _getFullClassName(node: ClassNode) {
        const fullName: string[] = [];

        let current: ClassNode | undefined = node;
        while (current !== undefined) {
            fullName.push(current.d.name.d.value);
            current = getEnclosingClass(current);
        }

        return fullName.reverse().join('.');
    }
}

export function isStubFile(uri: Uri): boolean {
    return uri.lastExtension === '.pyi';
}
