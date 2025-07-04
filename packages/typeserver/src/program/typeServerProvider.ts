/*
 * typeServerProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements the ITypeServer interface by wrapping the internal Program object.
 */

import { CancellationToken } from 'vscode-languageserver';

import { Declaration, DeclarationType } from 'typeserver/binder/declaration.js';
import { Scope } from 'typeserver/binder/scope.js';
import { Symbol as BinderSymbol, SymbolTable as BinderSymbolTable } from 'typeserver/binder/symbol.js';
import { getFileInfo, getScope } from 'typeserver/common/analyzerNodeInfo.js';
import { findNodeByPosition, getStringNodeValueRange } from 'typeserver/common/parseTreeUtils.js';
import {
    convertOffsetToPosition,
    convertPositionToOffset,
    convertTextRangeToRange,
} from 'typeserver/common/positionUtils.js';
import { TextRange } from 'typeserver/common/textRange.js';
import { SymbolDeclInfo, TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import {
    Type as EvaluatorType,
    FunctionType,
    isClass,
    isFunction,
    isFunctionOrOverloaded,
    isInstantiableClass,
    OverloadedType,
    TypeCategory,
} from 'typeserver/evaluator/types.js';
import { convertToInstance } from 'typeserver/evaluator/typeUtils.js';
import { ImportedModuleDescriptor } from 'typeserver/imports/importResolver.js';
import { ImportType } from 'typeserver/imports/importResult.js';
import { isExpressionNode, ParseNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { OpenFileOptions, Program } from 'typeserver/program/program.js';
import { SourceFileProvider } from 'typeserver/program/sourceFileProvider.js';
import { isStubFile, SourceMapper } from 'typeserver/program/sourceMapper.js';
import {
    AttributeAccessInfo,
    AttributeInfo,
    AttributeOptions,
    AutoImportInfo,
    CallableTypeParts,
    Decl,
    DeclCategory,
    DeclInfo,
    DeclOptions,
    ImportDecl,
    ITypeServer,
    ITypeServerSourceFile,
    Position,
    PrintTypeOptions,
    SignatureTypeParts,
    SourceFilesOptions,
    Symbol,
    Type,
    TypeFlags,
    TypeResult,
} from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { isDefined } from 'typeserver/utils/valueTypeUtils.js';

export class TypeServerProvider implements ITypeServer {
    constructor(private _program: Program) {}

    get evaluator(): TypeEvaluator {
        return this._program.evaluator!;
    }

    getType(fileUri: Uri, start: Position, end?: Position): TypeResult | undefined {
        const node = this._findNodeByRange(fileUri, start, end);
        if (!node || !isExpressionNode(node)) {
            return undefined;
        }

        const typeResult = this._program.evaluator?.getTypeResult(node);
        if (!typeResult) {
            return undefined;
        }

        let calledType: EvaluatorType | undefined;
        if (typeResult.overloadsUsedForCall) {
            calledType = OverloadedType.create(typeResult.overloadsUsedForCall);
        }

        return this._convertTypeResult(fileUri, node, typeResult.type, calledType);
    }

    getContextType(fileUri: Uri, start: Position, end?: Position): TypeResult | undefined {
        const node = this._findNodeByRange(fileUri, start, end);
        if (!node || !isExpressionNode(node)) {
            return undefined;
        }

        const type = this._program.evaluator?.getExpectedType(node)?.type;
        if (!type) {
            return undefined;
        }

        return this._convertTypeResult(fileUri, node, type);
    }

    printType(type: Type, options?: PrintTypeOptions): string | undefined {
        let evaluatorType = this._program.typeServerRegistry?.getType(type.id);
        if (!evaluatorType) {
            return undefined;
        }

        // If this is a type alias, print it as the type it represents.
        if (evaluatorType.props?.typeAliasInfo) {
            evaluatorType = convertToInstance(evaluatorType);
        }

        return this._program.evaluator?.printType(evaluatorType, options);
    }

    printCallableTypeParts(type: Type, options?: PrintTypeOptions): CallableTypeParts | undefined {
        const evaluatorType = this._program.typeServerRegistry?.getType(type.id);
        if (!evaluatorType || !this._program.evaluator) {
            return undefined;
        }

        const evaluator = this._program.evaluator;

        if (!isFunctionOrOverloaded(evaluatorType)) {
            return undefined;
        }

        let callables: FunctionType[];

        if (isFunction(evaluatorType)) {
            callables = [evaluatorType];
        } else {
            callables = OverloadedType.getOverloads(evaluatorType);
        }

        const signatures = callables.map((callable) => {
            const parts = evaluator.printFunctionParts(callable);
            const sig: SignatureTypeParts = {
                async: FunctionType.isAsync(callable),
                parameters: parts[0],
                returnType: parts[1],
            };

            return sig;
        });

        return {
            signatures,
        };
    }

    getAttributeAccess(type: Type, name: string, options?: AttributeOptions): AttributeAccessInfo | undefined {
        const evaluatorType = this._program.typeServerRegistry?.getType(type.id);
        if (!evaluatorType) {
            return undefined;
        }

        // TODO - need to provide a better implementation
        if (isClass(evaluatorType)) {
            const boundMethod = this._program.evaluator?.getBoundMagicMethod(evaluatorType, name);
            if (!boundMethod) {
                return undefined;
            }

            return {
                type: this._convertType(boundMethod),
            };
        }
        return undefined;
    }

    getAttributes(type: Type, options?: AttributeOptions): AttributeInfo[] | undefined {
        // TODO - need to implement
        return undefined;
    }

    getTypeForDecl(decl: Decl, undecorated?: boolean): TypeResult | undefined {
        const declaration = this._program.typeServerRegistry?.getDeclaration(decl.id);
        if (!declaration) {
            return undefined;
        }

        const convertedType = this._convertType(
            this._program.evaluator?.getTypeForDeclaration(declaration, undecorated)?.type
        );
        if (!convertedType) {
            return undefined;
        }

        return { type: convertedType };
    }

    getSourceFile(fileUri: Uri): ITypeServerSourceFile | undefined {
        const sourceInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceInfo) {
            return undefined;
        }

        return new SourceFileProvider(this._program, sourceInfo);
    }

    getStubImplementation(fileUri: Uri, relativeToUri?: Uri): ITypeServerSourceFile[] | undefined {
        if (!isStubFile(fileUri)) {
            return undefined;
        }

        const sourceInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceInfo) {
            return undefined;
        }

        const execEnv = this._program.configOptions.findExecEnvironment(relativeToUri ?? fileUri);

        // Attempt our stubFileUri to see if we can resolve it as a source file path.
        const results = this._program.importResolver
            .getSourceFilesFromStub(fileUri, execEnv)
            .map((uri) => {
                let stubFileInfo = this._program.getSourceFileInfo(uri);

                if (!stubFileInfo) {
                    // Make sure uri exits before adding interim file.
                    if (!this._program.fileSystem.existsSync(uri)) {
                        return undefined;
                    }

                    stubFileInfo = this._program.addInterimFile(uri);
                }

                this._program.addShadowedFile(stubFileInfo, fileUri);

                return stubFileInfo;
            })
            .filter(isDefined);

        return results.map((file) => new SourceFileProvider(this._program, file));
    }

    getSourceFiles(options?: SourceFilesOptions): readonly ITypeServerSourceFile[] {
        return this._program
            .getSourceFileInfoList()
            .filter((fileInfo) => {
                if (options?.filter === 'checked') {
                    return fileInfo.isTracked || fileInfo.isOpenByClient;
                }

                if (options?.filter === 'inProject') {
                    return fileInfo.isTracked;
                }

                return true;
            })
            .map((fileInfo) => new SourceFileProvider(this._program, fileInfo));
    }

    // TODO - remove this
    getModuleSymbolTable(fileUri: Uri): BinderSymbolTable | undefined {
        return this._program.getModuleSymbolTable(fileUri);
    }

    // TODO - remove this
    getSourceMapper(fileUri: Uri, preferStubs: boolean, token: CancellationToken): SourceMapper {
        return this._program.getSourceMapper(fileUri, preferStubs, token);
    }

    getSymbolsForScope(fileUri: Uri, position: Position): Symbol[] | undefined {
        const scope = this._getScopeForPosition(fileUri, position);
        if (!scope) {
            return undefined;
        }

        const symbols: Symbol[] = [];
        scope.symbolTable.forEach((symbol, name) => {
            symbols.push(this._convertSymbol(name, symbol));
        });

        return symbols;
    }

    getSymbolInScope(fileUri: Uri, position: Position, symbolName: string): Symbol | undefined {
        const scope = this._getScopeForPosition(fileUri, position);
        if (!scope) {
            return undefined;
        }

        const symbol = scope.symbolTable.get(symbolName);
        if (!symbol) {
            return undefined;
        }

        return this._convertSymbol(symbolName, symbol);
    }

    getDeclsForPosition(fileUri: Uri, position: Position, options?: DeclOptions): DeclInfo | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        const node = findNodeByPosition(parseInfo.parserOutput.parseTree, position, parseInfo.tokenizerOutput.lines);
        if (!node) {
            return undefined;
        }

        const evaluator = this._program.evaluator;
        if (!evaluator) {
            return undefined;
        }

        let symbolInfo: SymbolDeclInfo | undefined;
        let name: string | undefined;
        let textRange: TextRange | undefined;

        if (node.nodeType === ParseNodeType.Name) {
            symbolInfo = evaluator.getDeclInfoForNameNode(node);
            name = node.d.value;
            textRange = node;
        } else if (node.nodeType === ParseNodeType.String) {
            symbolInfo = evaluator.getDeclInfoForStringNode(node);
            name = node.d.value;
            textRange = getStringNodeValueRange(node);
        }

        if (!symbolInfo || !name || !textRange) {
            return undefined;
        }

        const decls: Decl[] = [];

        symbolInfo.decls.forEach((binderDecl) => {
            const decl = this._convertDecl(binderDecl, !!options?.resolveImports);
            if (decl) {
                decls.push(decl);
            }
        });

        // TODO - need to convert synthesized types to TSDeclaration
        // by synthesizing a new declaration.

        const range = convertTextRangeToRange(textRange, parseInfo.tokenizerOutput.lines);

        return { name, range, decls };
    }

    resolveImportDecl(decl: ImportDecl, resolveAliased: boolean): Decl | undefined {
        const declaration = this._program.typeServerRegistry?.getDeclaration(decl.id);
        if (!declaration) {
            return undefined;
        }
        const resolvedDecl = this._program.evaluator?.resolveAliasDeclaration(declaration, resolveAliased);
        if (!resolvedDecl) {
            return undefined;
        }

        return this._convertDecl(resolvedDecl, /* resolveImports */ false);
    }

    convertToRealUri(fileUri: Uri): Uri | undefined {
        if (this._program.fileSystem.isInZip(fileUri)) {
            return undefined;
        }

        return this._program.fileSystem.getOriginalUri(fileUri);
    }

    getAutoImportInfo(fileUri: Uri, targetImportUri: Uri): AutoImportInfo | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const execEnv = this._program.configOptions.findExecEnvironment(fileUri);
        const moduleImportInfo = this._program.importResolver.getModuleNameForImport(targetImportUri, execEnv);
        const moduleName = moduleImportInfo.moduleName;
        const category = moduleImportInfo.isLocalTypingsFile
            ? 'local-stub'
            : moduleImportInfo.importType === ImportType.Stdlib
            ? 'stdlib'
            : moduleImportInfo.importType === ImportType.External
            ? 'external'
            : 'local';

        return { category, moduleName };
    }

    getImportCompletions(fileUri: Uri, partialModuleName: string): Map<string, Uri> {
        const execEnv = this._program.configOptions.findExecEnvironment(fileUri);
        const split = partialModuleName
            .trim()
            .split('.')
            .map((part) => part.trim());
        let leadingDots = 0;

        while (split.length > 1 && split[0] === '') {
            leadingDots++;
            split.shift();
        }

        let hasTrailingDot = false;
        if (split.length > 1 && split[split.length - 1] === '') {
            hasTrailingDot = true;
            split.pop();
        }

        const moduleDescriptor: ImportedModuleDescriptor = {
            nameParts: split,
            leadingDots,
            hasTrailingDot,
            importedSymbols: undefined,
        };

        return this._program.importResolver.getCompletionSuggestions(fileUri, execEnv, moduleDescriptor);
    }

    getImportsRecursive(fileUri: Uri): ITypeServerSourceFile[] {
        const sourceFile = this._program.getSourceFileInfo(fileUri);
        if (!sourceFile) {
            return [];
        }

        const result: ITypeServerSourceFile[] = [];
        const imports = this._program.getImportsRecursive(sourceFile);

        imports.forEach((importedFile) => {
            result.push(new SourceFileProvider(this._program, importedFile));
        });

        return result;
    }

    getImportedByRecursive(fileUri: Uri): ITypeServerSourceFile[] {
        const sourceFile = this._program.getSourceFileInfo(fileUri);
        if (!sourceFile) {
            return [];
        }

        const result: ITypeServerSourceFile[] = [];
        const imports = this._program.getImportedByRecursive(sourceFile);

        imports.forEach((importedFile) => {
            result.push(new SourceFileProvider(this._program, importedFile));
        });

        return result;
    }

    addInterimFile(uri: Uri): void {
        this._program.addInterimFile(uri);
    }

    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void {
        this._program.setFileOpened(fileUri, version, contents, options);
    }

    private _findNodeByRange(fileUri: Uri, start: Position, end?: Position): ParseNode | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        const startNode = findNodeByPosition(parseInfo.parserOutput.parseTree, start, parseInfo.tokenizerOutput.lines);
        if (!startNode) {
            return undefined;
        }

        if (!end) {
            return startNode;
        }

        const endOffset = convertPositionToOffset(end, parseInfo.tokenizerOutput.lines);
        if (endOffset === undefined) {
            return undefined;
        }

        let curNode = startNode;
        while (endOffset > curNode.start + curNode.length) {
            if (!curNode.parent) {
                return undefined;
            }
            curNode = curNode.parent;
        }

        return curNode;
    }

    private _allocateId(): string {
        // TODO - implement a proper ID allocation mechanism.
        return 'none';
    }

    private _convertSymbol(name: string, symbol: BinderSymbol): Symbol {
        const decls: Decl[] = [];
        symbol.getDeclarations().forEach((binderDecl) => {
            const decl = this._convertDecl(binderDecl, /* resolveImports */ true);
            if (decl) {
                decls.push(decl);
            }
        });

        return { name, decls };
    }

    private _convertTypeResult(
        fileUri: Uri,
        node: TextRange,
        type: EvaluatorType,
        calledType?: EvaluatorType
    ): TypeResult | undefined {
        const convertedType = this._convertType(type);
        if (!convertedType) {
            return undefined;
        }

        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        const range = convertTextRangeToRange(node, parseInfo.tokenizerOutput.lines);

        const convertedCalled = calledType ? this._convertType(calledType) : undefined;

        return { type: convertedType, range, called: convertedCalled };
    }

    private _convertType(type: EvaluatorType | undefined): Type | undefined {
        if (!type) {
            return undefined;
        }

        if (!this._program.typeServerRegistry) {
            return undefined;
        }

        const id = this._program.typeServerRegistry.registerType(type);
        let decls: Decl[] | undefined;
        let flags: TypeFlags = TypeFlags.None;
        let moduleUri: Uri | undefined;
        let docString: string | undefined;

        if (type.props?.typeAliasInfo) {
            flags = TypeFlags.TypeAlias;
        } else {
            switch (type.category) {
                case TypeCategory.Any:
                    flags = TypeFlags.Any;
                    break;

                case TypeCategory.Unknown:
                    flags = TypeFlags.Any | TypeFlags.Unknown;
                    break;

                case TypeCategory.Class:
                    if (isInstantiableClass(type)) {
                        flags = TypeFlags.Class;
                        if (type.shared.docString) {
                            docString = type.shared.docString;
                        }
                    }

                    if (type.shared.declaration) {
                        const decl = this._convertDecl(type.shared.declaration, /* resolveImports */ true);
                        if (decl) {
                            decls = [decl];
                        }
                    }
                    break;

                case TypeCategory.Module: {
                    if (isInstantiableClass(type)) {
                        flags = TypeFlags.Class;
                    } else {
                        flags = TypeFlags.Module;
                        moduleUri = type.priv.fileUri;
                    }
                    break;
                }

                case TypeCategory.Function: {
                    if (isInstantiableClass(type)) {
                        flags = TypeFlags.Class;
                    } else {
                        flags = TypeFlags.Callable;
                        docString = type.shared.docString;

                        if (type.shared.declaration) {
                            const decl = this._convertDecl(type.shared.declaration, /* resolveImports */ true);
                            if (decl) {
                                decls = [decl];
                            }
                        }
                    }
                    break;
                }

                case TypeCategory.Overloaded: {
                    if (isInstantiableClass(type)) {
                        flags = TypeFlags.Class;
                    } else {
                        flags = TypeFlags.Callable | TypeFlags.Overloaded;

                        const impl = OverloadedType.getImplementation(type);
                        const overloads = OverloadedType.getOverloads(type);

                        if (impl && isFunction(impl) && impl.shared.docString) {
                            docString = impl.shared.docString;
                        } else if (overloads.length > 0 && overloads[0].shared.docString) {
                            docString = overloads[0].shared.docString;
                        }

                        if (type.priv._overloads) {
                            decls = overloads
                                .map((overload) =>
                                    overload.shared.declaration
                                        ? this._convertDecl(overload.shared.declaration, /* resolveImports */ true)
                                        : undefined
                                )
                                .filter(isDefined);
                        }
                    }
                    break;
                }

                case TypeCategory.Never:
                    flags = TypeFlags.Never;
                    break;
            }
        }

        return {
            id,
            flags,
            decls,
            moduleUri,
            docString,
        };
    }

    // Converts an internal declaration to a TypeServer declaration.
    private _convertDecl(decl: Declaration, resolveImports: boolean): Decl | undefined {
        if (resolveImports && decl.type === DeclarationType.Alias && this._program.evaluator) {
            decl = this._program.evaluator.resolveAliasDeclaration(decl, /* resolveLocalNames */ true) ?? decl;
        }

        if (!this._program.typeServerRegistry) {
            return undefined;
        }

        const id = this._program.typeServerRegistry.registerDeclaration(decl);

        switch (decl.type) {
            case DeclarationType.Intrinsic:
            case DeclarationType.SpecialBuiltInClass:
            case DeclarationType.Class: {
                return {
                    category: DeclCategory.Class,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                    specialForm: decl.type !== DeclarationType.Class,
                };
            }

            case DeclarationType.Function: {
                return {
                    category: DeclCategory.Function,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                    method: decl.isMethod,
                    generator: decl.isGenerator,
                };
            }

            case DeclarationType.Param: {
                return {
                    category: DeclCategory.Parameter,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                };
            }

            case DeclarationType.Variable: {
                return {
                    category: DeclCategory.Variable,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                    slots: !!decl.isDefinedBySlots,
                    final: !!decl.isFinal,
                    constant: !!decl.isConstant,
                };
            }

            case DeclarationType.TypeParam: {
                return {
                    category: DeclCategory.TypeParameter,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                };
            }

            case DeclarationType.TypeAlias: {
                return {
                    category: DeclCategory.TypeAlias,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                };
            }

            case DeclarationType.Alias: {
                const fileInfo = decl.aliasName ? getFileInfo(decl.aliasName) : undefined;

                return {
                    category: DeclCategory.Import,
                    id,
                    uri: decl.uri,
                    range: decl.range,
                    moduleName: decl.moduleName,
                    aliasName: decl.aliasName?.d.value,
                    aliasPosition:
                        decl.aliasName && fileInfo
                            ? convertOffsetToPosition(decl.aliasName.start, fileInfo.lines)
                            : undefined,
                    symbolName: decl.symbolName,
                    wildcard:
                        decl.node !== undefined &&
                        decl.node.nodeType === ParseNodeType.ImportFrom &&
                        decl.node.d.isWildcardImport,
                };
            }

            default:
                return undefined;
        }
    }

    private _getScopeForPosition(fileUri: Uri, position: Position): Scope | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        const node = findNodeByPosition(parseInfo.parserOutput.parseTree, position, parseInfo.tokenizerOutput.lines);
        if (!node) {
            return undefined;
        }

        return getScope(node);
    }
}
