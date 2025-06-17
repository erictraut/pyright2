/*
 * autoImporter.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Logic for performing auto-import completions.
 */

import { CancellationToken, CompletionItem, CompletionItemKind, SymbolKind } from 'vscode-languageserver';

import { CompletionItemData, CompletionMap } from 'langserver/providers/completionProvider.js';
import { IndexAliasData } from 'langserver/providers/symbolIndexer.js';
import { fromLSPAny } from 'langserver/server/lspUtils.js';

import { addIfUnique, appendArray, createMapFromItems } from 'commonUtils/collectionUtils.js';
import { stripFileExtension } from 'commonUtils/pathUtils.js';
import {
    compareStringsCaseSensitive,
    getCharacterCount,
    getStringComparer,
    isPatternInSymbol,
} from 'commonUtils/stringUtils.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { DeclarationType } from 'typeserver/binder/declaration.js';
import { Symbol } from 'typeserver/binder/symbol.js';
import {
    isConstantName,
    isDunderName,
    isPrivateOrProtectedName,
    isPublicConstantOrTypeAlias,
    isTypeAliasName,
} from 'typeserver/binder/symbolNameUtils.js';
import { isVisibleExternally } from 'typeserver/binder/symbolUtils.js';
import { TextEditAction } from 'typeserver/common/editAction.js';
import { convertOffsetToPosition, convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { Position, Range, TextRange } from 'typeserver/common/textRange.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { ImportType } from 'typeserver/imports/importResult.js';
import { ImportStatement, ImportStatements, getTopLevelImports } from 'typeserver/imports/importStatementUtils.js';
import { ImportFromAsNode, ImportFromNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { AutoImportInfo, ITypeServer, ITypeServerSourceFile } from 'typeserver/protocol/typeServerProtocol.js';

export interface ModuleNameInfo {
    name: string;
    nameForImportFrom?: string;
}

export interface ImportNameWithModuleInfo extends ImportNameInfo {
    module: AutoImportInfo;
    nameForImportFrom?: string;
}

export interface InsertionEdit {
    range: Range;
    preChange: string;
    importStatement: string;
    postChange: string;
    importGroup: ImportGroup;
}

export interface ImportNameInfo {
    name?: string;
    alias?: string;
}

export const enum ImportGroup {
    // The ordering here is important because this is the order
    // in which PEP8 specifies that imports should be ordered.
    Stdlib = 0,
    External = 1,
    Local = 2,
    LocalRelative = 3,
}

export interface AutoImportSymbol {
    readonly name: string;
    readonly library: boolean;

    readonly kind?: SymbolKind;
    readonly itemKind?: CompletionItemKind;
    readonly importAlias?: IndexAliasData;

    readonly symbol?: Symbol;
    readonly inDunderAll?: boolean;
    readonly hasRedundantAlias?: boolean;
}

export interface ModuleSymbolTable {
    readonly uri: Uri;
    getSymbols(): Generator<AutoImportSymbol>;
}

export type ModuleSymbolMap = Map<string, ModuleSymbolTable>;

export interface AutoImportResult {
    readonly name: string;
    readonly declUri: Uri;
    readonly originalName: string;
    readonly originalDeclUri: Uri;
    readonly insertionText: string;
    readonly symbol?: Symbol;
    readonly source?: string;
    readonly edits?: TextEditAction[];
    readonly alias?: string;
    readonly kind?: CompletionItemKind;
}

export interface AutoImportOptions {
    readonly patternMatcher?: (pattern: string, name: string) => boolean;
    readonly lazyEdit?: boolean;
}

export interface ImportParts {
    // The name of the module or symbol including alias from the `import` or `from ... import` statement
    readonly importName: string;

    // The actual name of the symbol (not alias)
    readonly symbolName?: string;

    // The name of the module from `from ... import` statement
    readonly importFrom?: string;

    // Uri of the module
    readonly fileUri: Uri;

    // The number of dots in the module name, indicating its depth in the module hierarchy
    readonly dotCount: number;

    // Name and category of target module.
    readonly targetImportInfo: AutoImportInfo;
}

export interface ImportAliasData {
    readonly importParts: ImportParts;
    readonly importGroup: ImportGroup;
    readonly symbol?: Symbol;
    readonly kind?: SymbolKind;
    readonly itemKind?: CompletionItemKind;
    readonly inDunderAll?: boolean;
    readonly hasRedundantAlias?: boolean;

    // Uri pointing to the original module that contains the actual symbol that the alias resolves to.
    readonly fileUri: Uri;
}

export type AutoImportResultMap = Map<string, AutoImportResult[]>;

interface AdditionEdit extends TextEditAction {
    importName: string;
}

const indentTextRegEx = /^\s*$/;
const underscoreRegEx = /_/g;

// Build a map of all modules within this program and the module-
// level scope that contains the symbol table for the module.
export function buildModuleSymbolsMap(
    typeServer: ITypeServer,
    files: readonly ITypeServerSourceFile[]
): ModuleSymbolMap {
    const moduleSymbolMap = new Map<string, ModuleSymbolTable>();

    files.forEach((file) => {
        // If this file is a type stub file that has corresponding implementation
        // files, don't add the stub file to the map.
        const implementations = typeServer.getStubImplementation(file.uri);
        if (implementations && implementations.length > 0) {
            return;
        }

        const uri = file.uri;
        const symbolTable = typeServer.getModuleSymbolTable(uri);
        if (!symbolTable) {
            return;
        }

        const fileName = stripFileExtension(uri.fileName);

        // Don't offer imports from files that are named with private
        // naming semantics like "_ast.py" unless they're in the current
        // user file list.
        if (isPrivateOrProtectedName(fileName) && !file.inProject) {
            return;
        }

        moduleSymbolMap.set(uri.key, {
            uri,
            *getSymbols() {
                for (const [name, symbol] of symbolTable) {
                    if (!isVisibleExternally(symbol)) {
                        continue;
                    }

                    const declarations = symbol.getDeclarations();
                    if (!declarations || declarations.length === 0) {
                        continue;
                    }

                    const declaration = declarations[0];
                    if (!declaration) {
                        continue;
                    }

                    if (declaration.type === DeclarationType.Alias && file.inProject) {
                        // We don't include import alias in auto import
                        // for workspace files.
                        continue;
                    }

                    const variableKind =
                        declaration.type === DeclarationType.Variable && !declaration.isConstant && !declaration.isFinal
                            ? SymbolKind.Variable
                            : undefined;

                    yield {
                        name,
                        symbol,
                        kind: variableKind,
                        library: !file.inProject,
                        inDunderAll: symbol.isInDunderAll(),
                    };
                }
            },
        });
        return;
    });

    return moduleSymbolMap;
}

export class AutoImporter {
    private readonly _importStatements: ImportStatements;

    constructor(
        protected readonly fileUri: Uri,
        protected readonly typeServer: ITypeServer,
        protected readonly parseResults: ParseFileResults,
        private readonly _invocationPosition: Position,
        private readonly _excludes: CompletionMap,
        protected readonly moduleSymbolMap: ModuleSymbolMap,
        protected readonly options: AutoImportOptions
    ) {
        this._importStatements = getTopLevelImports(
            this.parseResults.parserOutput.parseTree,
            /* includeImplicitImports */ true
        );
    }

    getAutoImportCandidates(
        word: string,
        similarityLimit: number,
        abbrFromUsers: string | undefined,
        token: CancellationToken
    ) {
        const results: AutoImportResult[] = [];
        const map = this.getCandidates(word, similarityLimit, abbrFromUsers, token);

        map.forEach((v) => appendArray(results, v));
        return results;
    }

    test_getTextEditsForAutoImportSymbolAddition(
        importNameInfo: ImportNameInfo | ImportNameInfo[],
        importStatement: ImportStatement,
        parseFileResults: ParseFileResults
    ): TextEditAction[] {
        return this._getTextEditsForAutoImportSymbolAddition(importNameInfo, importStatement, parseFileResults);
    }

    test_getTextEditsForAutoImportInsertions(
        importNameInfo: ImportNameWithModuleInfo[] | ImportNameWithModuleInfo,
        importStatements: ImportStatements,
        parseFileResults: ParseFileResults,
        invocationPosition: Position
    ): TextEditAction[] {
        return this._getTextEditsForAutoImportInsertions(
            importNameInfo,
            importStatements,
            parseFileResults,
            invocationPosition
        );
    }

    protected getCompletionItemData(item: CompletionItem): CompletionItemData | undefined {
        return fromLSPAny<CompletionItemData>(item.data);
    }

    protected getCandidates(
        word: string,
        similarityLimit: number,
        abbrFromUsers: string | undefined,
        token: CancellationToken
    ) {
        const resultMap = new Map<string, AutoImportResult[]>();
        const importAliasMap = new Map<string, Map<string, ImportAliasData>>();

        this.addImportsFromModuleMap(word, similarityLimit, abbrFromUsers, importAliasMap, resultMap, token);
        this.addImportsFromImportAliasMap(importAliasMap, abbrFromUsers, resultMap, token);

        return resultMap;
    }

    protected addImportsFromModuleMap(
        word: string,
        similarityLimit: number,
        abbrFromUsers: string | undefined,
        aliasMap: Map<string, Map<string, ImportAliasData>>,
        results: AutoImportResultMap,
        token: CancellationToken
    ) {
        this.moduleSymbolMap.forEach((topLevelSymbols, key) => {
            // See if this file should be offered as an implicit import.
            const uriProperties = this.getUriProperties(this.moduleSymbolMap!, topLevelSymbols.uri);
            this.processModuleSymbolTable(
                topLevelSymbols,
                topLevelSymbols.uri,
                word,
                similarityLimit,
                uriProperties,
                abbrFromUsers,
                aliasMap,
                results,
                token
            );
        });
    }

    protected addImportsFromImportAliasMap(
        importAliasMap: Map<string, Map<string, ImportAliasData>>,
        abbrFromUsers: string | undefined,
        results: AutoImportResultMap,
        token: CancellationToken
    ) {
        throwIfCancellationRequested(token);

        importAliasMap.forEach((mapPerSymbolName) => {
            mapPerSymbolName.forEach((importAliasData, originalName) => {
                if (abbrFromUsers) {
                    // When alias name is used, our regular exclude mechanism would not work. we need to check
                    // whether import, the alias is referring to, already exists.
                    // ex) import numpy
                    //     np| <= auto-import here.
                    // or
                    //     from scipy import io as spio
                    //     io| <= auto-import here

                    // If import statement for the module already exist, then bail out.
                    // ex) import module[.submodule] or from module[.submodule] import symbol
                    if (this._importStatements.mapByFilePath.has(importAliasData.importParts.fileUri.key)) {
                        return;
                    }

                    // If it is the module itself that got imported, make sure we don't import it again.
                    // ex) from module import submodule as ss
                    //     submodule <= auto-import here
                    if (importAliasData.importParts.importFrom) {
                        const imported = this._importStatements.orderedImports.find(
                            (i) => i.moduleName === importAliasData.importParts.importFrom
                        );
                        if (
                            imported &&
                            imported.node.nodeType === ParseNodeType.ImportFrom &&
                            imported.node.d.imports.some(
                                (i) => i.d.name.d.value === importAliasData.importParts.symbolName
                            )
                        ) {
                            return;
                        }
                    }
                }

                const alreadyIncluded = this._containsName(
                    importAliasData.importParts.importName,
                    importAliasData.importParts.importFrom,
                    results
                );
                if (alreadyIncluded) {
                    return;
                }

                const autoImportTextEdits = this._getTextEditsForAutoImportByFilePath(
                    { name: importAliasData.importParts.symbolName, alias: abbrFromUsers },
                    {
                        name: importAliasData.importParts.importFrom ?? importAliasData.importParts.importName,
                    },
                    importAliasData.importParts.importName,
                    importAliasData.importGroup,
                    importAliasData.importParts.fileUri
                );

                this._addResult(results, {
                    name: importAliasData.importParts.importName,
                    alias: abbrFromUsers,
                    symbol: importAliasData.symbol,
                    kind: importAliasData.itemKind ?? convertSymbolKindToCompletionItemKind(importAliasData.kind),
                    source: importAliasData.importParts.importFrom,
                    insertionText: autoImportTextEdits.insertionText,
                    edits: autoImportTextEdits.edits,
                    declUri: importAliasData.importParts.fileUri,
                    originalName,
                    originalDeclUri: importAliasData.fileUri,
                });
            });
        });
    }

    protected processModuleSymbolTable(
        topLevelSymbols: ModuleSymbolTable,
        moduleUri: Uri,
        word: string,
        similarityLimit: number,
        fileProperties: { isStub: boolean; hasInit: boolean; isUserCode: boolean },
        abbrFromUsers: string | undefined,
        importAliasMap: Map<string, Map<string, ImportAliasData>>,
        results: AutoImportResultMap,
        token: CancellationToken
    ) {
        throwIfCancellationRequested(token);

        const targetImportParts = this._getImportPartsForTargetModule(moduleUri);
        if (!targetImportParts) {
            return;
        }

        const dotCount = getCharacterCount(targetImportParts.moduleNameAndType.moduleName, '.');
        for (const autoSymbol of topLevelSymbols.getSymbols()) {
            if (!this.shouldIncludeVariable(autoSymbol, fileProperties.isStub)) {
                continue;
            }

            // For very short matching strings, we will require an exact match. Otherwise
            // we will tend to return a list that's too long. Once we get beyond two
            // characters, we can do a fuzzy match.
            const name = autoSymbol.name;
            const isSimilar = this._isSimilar(word, name, similarityLimit);
            if (!isSimilar) {
                continue;
            }

            const alreadyIncluded = this._containsName(name, targetImportParts.moduleNameAndType.moduleName, results);
            if (alreadyIncluded) {
                continue;
            }

            // We will collect all aliases and then process it later
            if (autoSymbol.importAlias) {
                this._addToImportAliasMap(
                    autoSymbol.importAlias,
                    {
                        importParts: {
                            symbolName: name,
                            importName: name,
                            importFrom: targetImportParts.moduleNameAndType.moduleName,
                            fileUri: moduleUri,
                            dotCount,
                            targetImportInfo: targetImportParts.moduleNameAndType,
                        },
                        importGroup: targetImportParts.importGroup,
                        symbol: autoSymbol.symbol,
                        kind: autoSymbol.importAlias.kind,
                        itemKind: autoSymbol.importAlias.itemKind,
                        inDunderAll: autoSymbol.inDunderAll,
                        hasRedundantAlias: autoSymbol.hasRedundantAlias,
                        fileUri: autoSymbol.importAlias.moduleUri,
                    },
                    importAliasMap
                );
                continue;
            }

            const nameForImportFrom = this.getNameForImportFrom(/* library */ !fileProperties.isUserCode, moduleUri);
            const autoImportTextEdits = this._getTextEditsForAutoImportByFilePath(
                { name, alias: abbrFromUsers },
                { name: targetImportParts.moduleNameAndType.moduleName, nameForImportFrom },
                name,
                targetImportParts.importGroup,
                moduleUri
            );

            this._addResult(results, {
                name,
                alias: abbrFromUsers,
                symbol: autoSymbol.symbol,
                source: targetImportParts.moduleNameAndType.moduleName,
                kind: autoSymbol.itemKind ?? convertSymbolKindToCompletionItemKind(autoSymbol.kind),
                insertionText: autoImportTextEdits.insertionText,
                edits: autoImportTextEdits.edits,
                declUri: moduleUri,
                originalName: name,
                originalDeclUri: moduleUri,
            });
        }

        // If the current file is in a directory that also contains an "__init__.py[i]"
        // file, we can use that directory name as an implicit import target.
        // Or if the file is a stub file, we can use it as import target.
        // Skip this check for user code.
        if (!fileProperties.isStub && !fileProperties.hasInit && !fileProperties.isUserCode) {
            return;
        }

        const importParts = this._getImportParts(moduleUri);
        if (!importParts) {
            return;
        }

        const isSimilar = this._isSimilar(word, importParts.importName, similarityLimit);
        if (!isSimilar) {
            return;
        }

        const alreadyIncluded = this._containsName(importParts.importName, importParts.importFrom, results);
        if (alreadyIncluded) {
            return;
        }

        this._addToImportAliasMap(
            {
                moduleUri,
                originalName: importParts.importName,
                kind: SymbolKind.Module,
                itemKind: CompletionItemKind.Module,
            },
            {
                importParts,
                importGroup: targetImportParts.importGroup,
                kind: SymbolKind.Module,
                itemKind: CompletionItemKind.Module,
                fileUri: moduleUri,
            },
            importAliasMap
        );
    }

    protected getNameForImportFrom(library: boolean, moduleUri: Uri): string | undefined {
        return undefined;
    }

    protected getUriProperties<T>(map: Map<string, T>, uri: Uri) {
        const fileDir = uri.getDirectory();
        const initPathPy = fileDir.initPyUri;
        const initPathPyi = fileDir.initPyiUri;
        const isStub = uri.hasExtension('.pyi');
        const hasInit = map.has(initPathPy.key) || map.has(initPathPyi.key);
        const sourceFileInfo = this.typeServer.getSourceFile(uri);
        return { isStub, hasInit, isUserCode: !!sourceFileInfo && sourceFileInfo.inProject };
    }

    protected compareImportAliasData(left: ImportAliasData, right: ImportAliasData) {
        // Choose a better alias for the same declaration based on where the alias is defined.
        // For example, we would prefer alias defined in builtin over defined in user files.
        const groupComparison = left.importGroup - right.importGroup;
        if (groupComparison !== 0) {
            return groupComparison;
        }

        const dotComparison = left.importParts.dotCount - right.importParts.dotCount;
        if (dotComparison !== 0) {
            return dotComparison;
        }

        if (left.symbol && !right.symbol) {
            return -1;
        }

        if (!left.symbol && right.symbol) {
            return 1;
        }

        return getStringComparer()(left.importParts.importName, right.importParts.importName);
    }

    protected shouldIncludeVariable(autoSymbol: AutoImportSymbol, isStub: boolean) {
        // If it is not a stub file and symbol is Variable, we only include it if
        // name is public constant or type alias
        if (isStub || autoSymbol.kind !== SymbolKind.Variable) {
            return true;
        }

        return isPublicConstantOrTypeAlias(autoSymbol.name);
    }

    private _addToImportAliasMap(
        alias: IndexAliasData,
        data: ImportAliasData,
        importAliasMap: Map<string, Map<string, ImportAliasData>>
    ) {
        // Since we don't resolve alias declaration using type evaluator, there is still a chance
        // where we show multiple aliases for same symbols. but this should still reduce number of
        // such cases.
        if (!importAliasMap.has(alias.moduleUri.key)) {
            const map = new Map<string, ImportAliasData>();
            map.set(alias.originalName, data);
            importAliasMap.set(alias.moduleUri.key, map);
            return;
        }

        const map = importAliasMap.get(alias.moduleUri.key)!;
        if (!map.has(alias.originalName)) {
            map.set(alias.originalName, data);
            return;
        }

        const existingData = map.get(alias.originalName)!;
        const comparison = this.compareImportAliasData(existingData, data);
        if (comparison <= 0) {
            // Existing data is better than new one.
            return;
        }

        // Keep the new data.
        map.set(alias.originalName, data);
    }

    private _getImportPartsForTargetModule(
        uri: Uri
    ): { importGroup: ImportGroup; moduleNameAndType: AutoImportInfo } | undefined {
        const localImport = this._importStatements.mapByFilePath.get(uri.key);
        if (localImport) {
            return {
                importGroup: _getImportGroup(localImport),
                moduleNameAndType: {
                    category: 'local',
                    moduleName: localImport.moduleName,
                },
            };
        } else {
            const moduleNameAndType = this._getModuleNameAndTypeFromFilePath(uri);
            if (!moduleNameAndType) {
                return undefined;
            }

            return {
                importGroup: this._getImportGroupFromModuleNameAndType(moduleNameAndType),
                moduleNameAndType: moduleNameAndType,
            };
        }
    }

    private _getImportParts(uri: Uri): ImportParts | undefined {
        const name = stripFileExtension(uri.fileName);

        // See if we can import module as "import xxx"
        if (name === '__init__') {
            return createImportParts(this._getModuleNameAndTypeFromFilePath(uri.getDirectory()));
        }

        return createImportParts(this._getModuleNameAndTypeFromFilePath(uri));

        function createImportParts(module: AutoImportInfo | undefined): ImportParts | undefined {
            if (!module) {
                return undefined;
            }

            const moduleName = module.moduleName;
            if (!moduleName) {
                return undefined;
            }

            const index = moduleName.lastIndexOf('.');
            const importNamePart = index > 0 ? moduleName.substring(index + 1) : undefined;
            const importFrom = index > 0 ? moduleName.substring(0, index) : undefined;
            return {
                symbolName: importNamePart,
                importName: importNamePart ?? moduleName,
                importFrom,
                fileUri: uri,
                dotCount: getCharacterCount(moduleName, '.'),
                targetImportInfo: module,
            };
        }
    }

    private _isSimilar(word: string, name: string, similarityLimit: number) {
        if (similarityLimit === 1) {
            return word === name;
        }

        if (word.length <= 0 || name.length <= 0) {
            return false;
        }

        if (!this.options.patternMatcher) {
            const index = word[0] !== '_' && name[0] === '_' && name.length > 1 ? 1 : 0;
            if (word[0].toLocaleLowerCase() !== name[index].toLocaleLowerCase()) {
                return false;
            }

            return isPatternInSymbol(word, name);
        }

        return this.options.patternMatcher(word, name);
    }

    private _shouldExclude(name: string) {
        return this._excludes.has(name, (i) =>
            CompletionMap.labelOnlyIgnoringAutoImports(i, this.getCompletionItemData.bind(this))
        );
    }

    private _containsName(name: string, source: string | undefined, results: AutoImportResultMap) {
        if (this._shouldExclude(name)) {
            return true;
        }

        const match = results.get(name);
        if (match?.some((r) => r.source === source)) {
            return true;
        }

        return false;
    }

    // Given the file path of a module that we want to import,
    // convert to a module name that can be used in an
    // 'import from' statement.
    private _getModuleNameAndTypeFromFilePath(uri: Uri): AutoImportInfo | undefined {
        return this.typeServer.getAutoImportInfo(this.fileUri, uri);
    }

    private _getTextEditsForAutoImportByFilePath(
        importNameInfo: ImportNameInfo,
        moduleNameInfo: ModuleNameInfo,
        insertionText: string,
        importGroup: ImportGroup,
        fileUri: Uri
    ): { insertionText: string; edits?: TextEditAction[] | undefined } {
        // If there is no symbolName, there can't be existing import statement.
        const importStatement = this._importStatements.mapByFilePath.get(fileUri.key);
        if (importStatement) {
            // Found import for given module. See whether we can use the module as it is.
            if (importStatement.node.nodeType === ParseNodeType.Import) {
                // For now, we don't check whether alias or moduleName got overwritten at
                // given position
                const importAlias = importStatement.subnode?.d.alias?.d.value;
                if (importNameInfo.name) {
                    // ex) import module
                    //     method | <= auto-import
                    return {
                        insertionText: `${importAlias ?? importStatement.moduleName}.${importNameInfo.name}`,
                        edits: [],
                    };
                } else if (importAlias) {
                    // ex) import module as m
                    //     m | <= auto-import
                    return {
                        insertionText: `${importAlias}`,
                        edits: [],
                    };
                }
            }

            // Does an 'import from' statement already exist?
            if (
                importNameInfo.name &&
                importStatement.node.nodeType === ParseNodeType.ImportFrom &&
                !importStatement.node.d.isWildcardImport
            ) {
                // If so, see whether what we want already exist.
                const importNode = importStatement.node.d.imports.find((i) => i.d.name.d.value === importNameInfo.name);
                if (importNode) {
                    // For now, we don't check whether alias or moduleName got overwritten at
                    // given position
                    const importAlias = importNode.d.alias?.d.value;
                    return {
                        insertionText: `${importAlias ?? importNameInfo.name}`,
                        edits: [],
                    };
                }

                // If not, add what we want at the existing 'import from' statement as long as
                // what is imported is not module itself.
                // ex) don't add "path" to existing "from os.path import dirname" statement.
                if (moduleNameInfo.name === importStatement.moduleName) {
                    return {
                        insertionText: importNameInfo.alias ?? insertionText,
                        edits: this.options.lazyEdit
                            ? undefined
                            : this._getTextEditsForAutoImportSymbolAddition(
                                  importNameInfo,
                                  importStatement,
                                  this.parseResults
                              ),
                    };
                }
            }
        } else if (importNameInfo.name) {
            // If it is the module itself that got imported, make sure we don't import it again.
            // ex) from module import submodule
            const imported = this._importStatements.orderedImports.find((i) => i.moduleName === moduleNameInfo.name);
            if (imported && imported.node.nodeType === ParseNodeType.ImportFrom && !imported.node.d.isWildcardImport) {
                const importFrom = imported.node.d.imports.find((i) => i.d.name.d.value === importNameInfo.name);
                if (importFrom) {
                    // For now, we don't check whether alias or moduleName got overwritten at
                    // given position. only move to alias, but not the other way around
                    const importAlias = importFrom.d.alias?.d.value;
                    if (importAlias) {
                        return {
                            insertionText: `${importAlias}`,
                            edits: [],
                        };
                    }
                } else {
                    // If not, add what we want at the existing import from statement.
                    return {
                        insertionText: importNameInfo.alias ?? insertionText,
                        edits: this.options.lazyEdit
                            ? undefined
                            : this._getTextEditsForAutoImportSymbolAddition(
                                  importNameInfo,
                                  imported,
                                  this.parseResults
                              ),
                    };
                }
            }

            // Check whether it is one of implicit imports
            const importFrom = this._importStatements.implicitImports?.get(fileUri.key);
            if (importFrom) {
                // For now, we don't check whether alias or moduleName got overwritten at
                // given position
                const importAlias = importFrom.d.alias?.d.value;
                return {
                    insertionText: `${importAlias ?? importFrom.d.name.d.value}.${importNameInfo.name}`,
                    edits: [],
                };
            }
        }

        return {
            insertionText: importNameInfo.alias ?? insertionText,
            edits: this.options.lazyEdit
                ? undefined
                : this._getTextEditsForAutoImportInsertion(
                      importNameInfo,
                      moduleNameInfo,
                      this._importStatements,
                      importGroup,
                      this.parseResults,
                      this._invocationPosition
                  ),
        };
    }

    private _addResult(results: AutoImportResultMap, result: AutoImportResult) {
        let entries = results.get(result.name);
        if (!entries) {
            entries = [];
            results.set(result.name, entries);
        }

        entries.push(result);
    }

    private _getTextEditsForAutoImportInsertions(
        importNameInfo: ImportNameWithModuleInfo[] | ImportNameWithModuleInfo,
        importStatements: ImportStatements,
        parseFileResults: ParseFileResults,
        invocationPosition: Position
    ): TextEditAction[] {
        const insertionEdits: InsertionEdit[] = [];

        importNameInfo = Array.isArray(importNameInfo) ? importNameInfo : [importNameInfo];
        if (importNameInfo.length === 0) {
            return [];
        }

        const map = createMapFromItems(importNameInfo, (i) => `${i.module.moduleName}-${i.nameForImportFrom ?? ''}`);
        for (const importInfo of map.values()) {
            appendArray(
                insertionEdits,
                this._getInsertionEditsForAutoImportInsertion(
                    importInfo,
                    { name: importInfo[0].module.moduleName, nameForImportFrom: importInfo[0].nameForImportFrom },
                    importStatements,
                    this._getImportGroupFromModuleNameAndType(importInfo[0].module),
                    parseFileResults,
                    invocationPosition
                )
            );
        }

        return this._convertInsertionEditsToTextEdits(parseFileResults, insertionEdits);
    }

    private _getTextEditsForAutoImportInsertion(
        importNameInfo: ImportNameInfo[] | ImportNameInfo,
        moduleNameInfo: ModuleNameInfo,
        importStatements: ImportStatements,
        importGroup: ImportGroup,
        parseFileResults: ParseFileResults,
        invocationPosition: Position
    ): TextEditAction[] {
        const insertionEdits = this._getInsertionEditsForAutoImportInsertion(
            importNameInfo,
            moduleNameInfo,
            importStatements,
            importGroup,
            parseFileResults,
            invocationPosition
        );

        return this._convertInsertionEditsToTextEdits(parseFileResults, insertionEdits);
    }

    private _convertInsertionEditsToTextEdits(parseFileResults: ParseFileResults, insertionEdits: InsertionEdit[]) {
        if (insertionEdits.length < 2) {
            return insertionEdits.map((e) => getTextEdit(e));
        }

        // Merge edits with the same insertion point.
        const editsMap = [...createMapFromItems(insertionEdits, (e) => `${e.importGroup} ${Range.print(e.range)}`)]
            .sort((a, b) => compareStringsCaseSensitive(a[0], b[0]))
            .map((v) => v[1]);

        const textEditList: TextEditAction[] = [];
        for (const editGroup of editsMap) {
            if (editGroup.length === 1) {
                textEditList.push(getTextEdit(editGroup[0]));
            } else {
                textEditList.push({
                    range: editGroup[0].range,
                    replacementText:
                        editGroup[0].preChange +
                        editGroup
                            .map((e) => e.importStatement)
                            .sort((a, b) => compareImports(a, b))
                            .join(parseFileResults.tokenizerOutput.predominantEndOfLineSequence) +
                        editGroup[0].postChange,
                });
            }
        }

        return textEditList;

        function getTextEdit(edit: InsertionEdit): TextEditAction {
            return { range: edit.range, replacementText: edit.preChange + edit.importStatement + edit.postChange };
        }

        function compareImports(a: string, b: string) {
            const isImport1 = a.startsWith('import');
            const isImport2 = b.startsWith('import');

            if (isImport1 === isImport2) {
                return a < b ? -1 : 1;
            }

            return isImport1 ? -1 : 1;
        }
    }

    private _getInsertionEditsForAutoImportInsertion(
        importNameInfo: ImportNameInfo[] | ImportNameInfo,
        moduleNameInfo: ModuleNameInfo,
        importStatements: ImportStatements,
        importGroup: ImportGroup,
        parseFileResults: ParseFileResults,
        invocationPosition: Position
    ): InsertionEdit[] {
        const insertionEdits: InsertionEdit[] = [];

        const getImportAsText = (nameInfo: ImportNameInfo, moduleName: string) => {
            const importText = nameInfo.name ? nameInfo.name : moduleName;
            return {
                sortText: importText,
                text: nameInfo.alias ? `${importText} as ${nameInfo.alias}` : importText,
            };
        };

        const appendToEdits = (importNameInfo: ImportNameInfo[], importStatementGetter: (n: string[]) => string) => {
            const importNames = importNameInfo
                .map((i) => getImportAsText(i, moduleNameInfo.name))
                .sort((a, b) => _compareImportNames(a.sortText, b.sortText))
                .reduce((set, v) => addIfUnique(set, v.text), [] as string[]);

            insertionEdits.push(
                this._getInsertionEditForAutoImportInsertion(
                    importStatementGetter(importNames),
                    importStatements,
                    moduleNameInfo.name,
                    importGroup,
                    parseFileResults,
                    invocationPosition
                )
            );
        };

        importNameInfo = Array.isArray(importNameInfo) ? importNameInfo : [importNameInfo];
        if (importNameInfo.length === 0) {
            // This will let "import [moduleName]" to be generated.
            importNameInfo.push({});
        }

        // We need to emit a new 'from import' statement if symbolName is given. otherwise, use 'import' statement.
        const map = createMapFromItems(importNameInfo, (i) => (i.name ? 'from' : 'import'));

        // Add import statements first.
        const imports = map.get('import');
        if (imports) {
            appendToEdits(imports, (names) => `import ${names.join(', ')}`);
        }

        // Add from import statements next.
        const fromImports = map.get('from');
        if (fromImports) {
            appendToEdits(
                fromImports,
                (names) => `from ${moduleNameInfo.nameForImportFrom ?? moduleNameInfo.name} import ${names.join(', ')}`
            );
        }

        return insertionEdits;
    }

    private _getInsertionEditForAutoImportInsertion(
        importStatement: string,
        importStatements: ImportStatements,
        moduleName: string,
        importGroup: ImportGroup,
        parseFileResults: ParseFileResults,
        invocationPosition: Position
    ): InsertionEdit {
        let preChange = '';
        let postChange = '';

        let insertionPosition: Position;
        const invocation = convertPositionToOffset(invocationPosition, parseFileResults.tokenizerOutput.lines)!;
        if (importStatements.orderedImports.length > 0 && invocation > importStatements.orderedImports[0].node.start) {
            let insertBefore = true;
            let insertionImport = importStatements.orderedImports[0];

            // Find a good spot to insert the new import statement. Follow
            // the PEP8 standard sorting order whereby built-in imports are
            // followed by third-party, which are followed by local.
            let prevImportGroup = ImportGroup.Stdlib;
            for (const curImport of importStatements.orderedImports) {
                // If the import was resolved, use its import type. If it wasn't
                // resolved, assume that it's the same import type as the previous
                // one.
                const curImportGroup: ImportGroup = curImport.importResult
                    ? _getImportGroup(curImport)
                    : prevImportGroup;

                if (importGroup < curImportGroup) {
                    if (!insertBefore && prevImportGroup < importGroup) {
                        // Add an extra line to create a new group.
                        preChange = parseFileResults.tokenizerOutput.predominantEndOfLineSequence + preChange;
                    }
                    break;
                }

                if (importGroup === curImportGroup && curImport.moduleName > moduleName) {
                    insertBefore = true;
                    insertionImport = curImport;
                    break;
                }

                // If we're about to hit the end of the import statements, don't go
                // any further.
                if (curImport.followsNonImportStatement) {
                    if (importGroup > prevImportGroup) {
                        // Add an extra line to create a new group.
                        preChange = parseFileResults.tokenizerOutput.predominantEndOfLineSequence + preChange;
                    }
                    break;
                }

                // If this is the last import, see if we need to create a new group.
                if (curImport === importStatements.orderedImports[importStatements.orderedImports.length - 1]) {
                    if (importGroup > curImportGroup) {
                        // Add an extra line to create a new group.
                        preChange = parseFileResults.tokenizerOutput.predominantEndOfLineSequence + preChange;
                    }
                }

                // Are we starting a new group?
                if (!insertBefore && importGroup < prevImportGroup && importGroup === curImportGroup) {
                    insertBefore = true;
                } else {
                    insertBefore = false;
                }

                prevImportGroup = curImportGroup;
                insertionImport = curImport;
            }

            if (insertionImport) {
                if (insertBefore) {
                    postChange = postChange + parseFileResults.tokenizerOutput.predominantEndOfLineSequence;
                } else {
                    preChange = parseFileResults.tokenizerOutput.predominantEndOfLineSequence + preChange;
                }

                insertionPosition = convertOffsetToPosition(
                    insertBefore ? insertionImport.node.start : TextRange.getEnd(insertionImport.node),
                    parseFileResults.tokenizerOutput.lines
                );
            } else {
                insertionPosition = { line: 0, character: 0 };
            }
        } else {
            // Insert at or near the top of the file. See if there's a doc string and
            // copyright notice, etc. at the top. If so, move past those.
            insertionPosition = { line: 0, character: 0 };
            let addNewLineBefore = false;

            for (const statement of parseFileResults.parserOutput.parseTree.d.statements) {
                let stopHere = true;
                if (statement.nodeType === ParseNodeType.StatementList && statement.d.statements.length === 1) {
                    const simpleStatement = statement.d.statements[0];

                    if (simpleStatement.nodeType === ParseNodeType.StringList) {
                        // Assume that it's a file header doc string.
                        stopHere = false;
                    } else if (simpleStatement.nodeType === ParseNodeType.Assignment) {
                        if (simpleStatement.d.leftExpr.nodeType === ParseNodeType.Name) {
                            if (isDunderName(simpleStatement.d.leftExpr.d.value)) {
                                // Assume that it's an assignment of __copyright__, __author__, etc.
                                stopHere = false;
                            }
                        }
                    }
                }

                if (stopHere) {
                    insertionPosition = convertOffsetToPosition(
                        statement.start,
                        parseFileResults.tokenizerOutput.lines
                    );
                    addNewLineBefore = false;
                    break;
                } else {
                    insertionPosition = convertOffsetToPosition(
                        statement.start + statement.length,
                        parseFileResults.tokenizerOutput.lines
                    );
                    addNewLineBefore = true;
                }
            }

            postChange =
                postChange +
                parseFileResults.tokenizerOutput.predominantEndOfLineSequence +
                parseFileResults.tokenizerOutput.predominantEndOfLineSequence;
            if (addNewLineBefore) {
                preChange = parseFileResults.tokenizerOutput.predominantEndOfLineSequence + preChange;
            } else {
                postChange = postChange + parseFileResults.tokenizerOutput.predominantEndOfLineSequence;
            }
        }

        const range = { start: insertionPosition, end: insertionPosition };
        return { range, preChange, importStatement, postChange, importGroup };
    }

    private _getImportGroupFromModuleNameAndType(targetImportInfo: AutoImportInfo): ImportGroup {
        let importGroup = ImportGroup.Local;

        if (targetImportInfo.category === 'local-stub' || targetImportInfo.category === 'external') {
            importGroup = ImportGroup.External;
        } else if (targetImportInfo.category === 'stdlib') {
            importGroup = ImportGroup.Stdlib;
        }

        return importGroup;
    }

    private _getTextEditsForAutoImportSymbolAddition(
        importNameInfo: ImportNameInfo | ImportNameInfo[],
        importStatement: ImportStatement,
        parseFileResults: ParseFileResults
    ): TextEditAction[] {
        const additionEdits: AdditionEdit[] = [];
        if (
            !importStatement.node ||
            importStatement.node.nodeType !== ParseNodeType.ImportFrom ||
            importStatement.node.d.isWildcardImport
        ) {
            return additionEdits;
        }

        // Make sure we're not attempting to auto-import a symbol that
        // already exists in the import list.
        const importFrom = importStatement.node;
        importNameInfo = (Array.isArray(importNameInfo) ? importNameInfo : [importNameInfo]).filter(
            (info) =>
                !!info.name &&
                !importFrom.d.imports.some(
                    (importAs) => importAs.d.name.d.value === info.name && importAs.d.alias?.d.value === info.alias
                )
        );

        if (importNameInfo.length === 0) {
            return additionEdits;
        }

        for (const nameInfo of importNameInfo) {
            additionEdits.push(
                this._getTextEditForAutoImportSymbolAddition(
                    nameInfo.name!,
                    nameInfo.alias,
                    importStatement.node,
                    parseFileResults
                )
            );
        }

        // Merge edits with the same insertion point.
        const editsMap = createMapFromItems(additionEdits, (e) => Range.print(e.range));
        const textEditList: TextEditAction[] = [];
        for (const editGroup of editsMap.values()) {
            if (editGroup.length === 1) {
                textEditList.push(editGroup[0]);
            } else {
                textEditList.push({
                    range: editGroup[0].range,
                    replacementText: editGroup
                        .sort((a, b) => _compareImportNames(a.importName, b.importName))
                        .map((e) => e.replacementText)
                        .join(''),
                });
            }
        }

        return textEditList;
    }

    private _getTextEditForAutoImportSymbolAddition(
        importName: string,
        alias: string | undefined,
        node: ImportFromNode,
        parseFileResults: ParseFileResults
    ): AdditionEdit {
        // Scan through the import symbols to find the right insertion point,
        // assuming we want to keep the imports alphabetized.
        let priorImport: ImportFromAsNode | undefined;
        for (const curImport of node.d.imports) {
            if (_compareImportNames(curImport.d.name.d.value, importName) > 0) {
                break;
            }

            priorImport = curImport;
        }

        // Are import symbols formatted one per line or multiple per line? We
        // will honor the existing formatting. We'll use a heuristic to determine
        // whether symbols are one per line or multiple per line.
        //   from x import a, b, c
        // or
        //   from x import (
        //      a
        //   )
        let useOnePerLineFormatting = false;
        let indentText = '';
        if (node.d.imports.length > 0) {
            const importStatementPos = convertOffsetToPosition(node.start, parseFileResults.tokenizerOutput.lines);
            const firstSymbolPos = convertOffsetToPosition(
                node.d.imports[0].start,
                parseFileResults.tokenizerOutput.lines
            );
            const secondSymbolPos =
                node.d.imports.length > 1
                    ? convertOffsetToPosition(node.d.imports[1].start, parseFileResults.tokenizerOutput.lines)
                    : undefined;

            if (
                firstSymbolPos.line > importStatementPos.line &&
                (secondSymbolPos === undefined || secondSymbolPos.line > firstSymbolPos.line)
            ) {
                const firstSymbolLineRange = parseFileResults.tokenizerOutput.lines.getItemAt(firstSymbolPos.line);

                // Use the same combination of spaces or tabs to match
                // existing formatting.
                indentText = parseFileResults.text.substr(firstSymbolLineRange.start, firstSymbolPos.character);

                // Is the indent text composed of whitespace only?
                if (indentTextRegEx.test(indentText)) {
                    useOnePerLineFormatting = true;
                }
            }
        }

        const insertionOffset = priorImport
            ? TextRange.getEnd(priorImport)
            : node.d.imports.length > 0
            ? node.d.imports[0].start
            : node.start + node.length;
        const insertionPosition = convertOffsetToPosition(insertionOffset, parseFileResults.tokenizerOutput.lines);

        const insertText = alias ? `${importName} as ${alias}` : `${importName}`;
        let replacementText: string;

        if (useOnePerLineFormatting) {
            const eol = parseFileResults.tokenizerOutput.predominantEndOfLineSequence;
            replacementText = priorImport ? `,${eol}${indentText}${insertText}` : `${insertText},${eol}${indentText}`;
        } else {
            replacementText = priorImport ? `, ${insertText}` : `${insertText}, `;
        }

        return {
            range: { start: insertionPosition, end: insertionPosition },
            importName,
            replacementText,
        };
    }
}

// Return import symbol type to allow sorting similar to isort
// CONSTANT_VARIABLE, CamelCaseClass, variable_or_function
function _getImportSymbolNameType(symbolName: string): number {
    if (isConstantName(symbolName)) {
        return 0;
    }
    if (isTypeAliasName(symbolName)) {
        return 1;
    }
    return 2;
}

function _compareImportNames(name1: string, name2: string) {
    // Compare import name by import symbol type and then alphabetical order.
    // Match isort default behavior.
    const name1Type = _getImportSymbolNameType(name1);
    const name2Type = _getImportSymbolNameType(name2);
    const compare = name1Type - name2Type;
    if (compare !== 0) {
        return compare;
    }

    // isort will prefer '_' over alphanumerical chars
    // This can't be reproduced by a normal string compare in TypeScript, since '_' > 'A'.
    // Replace all '_' with '=' which guarantees '=' < 'A'.
    // Safe to do as '=' is an invalid char in Python names.
    const name1toCompare = name1.replace(underscoreRegEx, '=');
    const name2toCompare = name2.replace(underscoreRegEx, '=');
    return compareStringsCaseSensitive(name1toCompare, name2toCompare);
}

// Determines which import grouping should be used when sorting imports.
function _getImportGroup(statement: ImportStatement): ImportGroup {
    if (statement.importResult) {
        if (statement.importResult.importType === ImportType.Stdlib) {
            return ImportGroup.Stdlib;
        }

        if (statement.importResult.importType === ImportType.External || statement.importResult.isLocalTypingsFile) {
            return ImportGroup.External;
        }

        if (statement.importResult.isRelative) {
            return ImportGroup.LocalRelative;
        }
    }

    return ImportGroup.Local;
}

export function convertSymbolKindToCompletionItemKind(kind: SymbolKind | undefined) {
    switch (kind) {
        case SymbolKind.File:
            return CompletionItemKind.File;

        case SymbolKind.Module:
        case SymbolKind.Namespace:
            return CompletionItemKind.Module;

        case SymbolKind.Package:
            return CompletionItemKind.Folder;

        case SymbolKind.Class:
            return CompletionItemKind.Class;

        case SymbolKind.Method:
            return CompletionItemKind.Method;

        case SymbolKind.Property:
            return CompletionItemKind.Property;

        case SymbolKind.Field:
            return CompletionItemKind.Field;

        case SymbolKind.Constructor:
            return CompletionItemKind.Constructor;

        case SymbolKind.Enum:
            return CompletionItemKind.Enum;

        case SymbolKind.Interface:
            return CompletionItemKind.Interface;

        case SymbolKind.Function:
            return CompletionItemKind.Function;

        case SymbolKind.Variable:
        case SymbolKind.Array:
            return CompletionItemKind.Variable;

        case SymbolKind.String:
            return CompletionItemKind.Constant;

        case SymbolKind.Number:
        case SymbolKind.Boolean:
            return CompletionItemKind.Value;

        case SymbolKind.Constant:
        case SymbolKind.Null:
            return CompletionItemKind.Constant;

        case SymbolKind.Object:
        case SymbolKind.Key:
            return CompletionItemKind.Value;

        case SymbolKind.EnumMember:
            return CompletionItemKind.EnumMember;

        case SymbolKind.Struct:
            return CompletionItemKind.Struct;

        case SymbolKind.Event:
            return CompletionItemKind.Event;

        case SymbolKind.Operator:
            return CompletionItemKind.Operator;

        case SymbolKind.TypeParameter:
            return CompletionItemKind.TypeParameter;

        default:
            return undefined;
    }
}
