/*
 * importStatementUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Utility routines for summarizing and manipulating
 * import statements in a Python source file.
 */

import * as AnalyzerNodeInfo from 'typeserver/common/analyzerNodeInfo.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { IReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { isFile } from 'typeserver/files/uriUtils.js';
import { ImportResult } from 'typeserver/imports/importResult.js';
import {
    ImportAsNode,
    ImportFromAsNode,
    ImportFromNode,
    ImportNode,
    ModuleNameNode,
    ModuleNode,
    ParseNodeType,
} from 'typeserver/parser/parseNodes.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface ImportStatement {
    node: ImportNode | ImportFromNode;
    subnode?: ImportAsNode;
    importResult: ImportResult | undefined;
    resolvedPath: Uri | undefined;
    moduleName: string;
    followsNonImportStatement: boolean;
}

export interface ImportStatements {
    orderedImports: ImportStatement[];
    mapByFilePath: Map<string, ImportStatement>;
    implicitImports?: Map<string, ImportFromAsNode>;
}

// Looks for top-level 'import' and 'import from' statements and provides
// an ordered list and a map (by file path).
export function getTopLevelImports(parseTree: ModuleNode, includeImplicitImports = false): ImportStatements {
    const localImports: ImportStatements = {
        orderedImports: [],
        mapByFilePath: new Map<string, ImportStatement>(),
    };

    let followsNonImportStatement = false;
    let foundFirstImportStatement = false;

    parseTree.d.statements.forEach((statement) => {
        if (statement.nodeType === ParseNodeType.StatementList) {
            statement.d.statements.forEach((subStatement) => {
                if (subStatement.nodeType === ParseNodeType.Import) {
                    foundFirstImportStatement = true;
                    _processImportNode(subStatement, localImports, followsNonImportStatement);
                    followsNonImportStatement = false;
                } else if (subStatement.nodeType === ParseNodeType.ImportFrom) {
                    foundFirstImportStatement = true;
                    _processImportFromNode(
                        subStatement,
                        localImports,
                        followsNonImportStatement,
                        includeImplicitImports
                    );
                    followsNonImportStatement = false;
                } else {
                    followsNonImportStatement = foundFirstImportStatement;
                }
            });
        } else {
            followsNonImportStatement = foundFirstImportStatement;
        }
    });

    return localImports;
}

export function getRelativeModuleName(
    fs: IReadOnlyFileSystem,
    sourcePath: Uri,
    targetPath: Uri,
    configOptions: ConfigOptions,
    ignoreFolderStructure = false,
    sourceIsFile?: boolean
) {
    let srcPath = sourcePath;
    sourceIsFile = sourceIsFile !== undefined ? sourceIsFile : isFile(fs, sourcePath);
    if (sourceIsFile) {
        srcPath = sourcePath.getDirectory();
    }

    let symbolName: string | undefined;
    let destPath = targetPath;
    if (
        (configOptions.stubPath && destPath.isChild(configOptions.stubPath)) ||
        (configOptions.typeshedPath && destPath.isChild(configOptions.typeshedPath))
    ) {
        // Always use absolute imports for files in these library-like directories.
        return undefined;
    }
    if (sourceIsFile) {
        destPath = targetPath.getDirectory();

        const fileName = targetPath.stripAllExtensions().fileName;
        if (fileName !== '__init__') {
            // ex) src: a.py, dest: b.py -> ".b" will be returned.
            symbolName = fileName;
        } else if (ignoreFolderStructure) {
            // ex) src: nested1/nested2/__init__.py, dest: nested1/__init__.py -> "...nested1" will be returned
            //     like how it would return for sibling folder.
            //
            // if folder structure is not ignored, ".." will be returned
            symbolName = destPath.fileName;
            destPath = destPath.getDirectory();
        }
    }

    const relativePaths = srcPath.getRelativePathComponents(destPath);

    // This assumes both file paths are under the same importing root.
    // So this doesn't handle paths pointing to 2 different import roots.
    // ex) user file A to library file B
    let currentPaths = '.';
    for (let i = 0; i < relativePaths.length; i++) {
        const relativePath = relativePaths[i];
        if (relativePath === '..') {
            currentPaths += '.';
        } else {
            currentPaths += relativePath;
        }

        if (relativePath !== '..' && i !== relativePaths.length - 1) {
            currentPaths += '.';
        }
    }

    if (symbolName) {
        currentPaths =
            currentPaths[currentPaths.length - 1] === '.' ? currentPaths + symbolName : currentPaths + '.' + symbolName;
    }

    return currentPaths;
}

function _processImportNode(node: ImportNode, localImports: ImportStatements, followsNonImportStatement: boolean) {
    node.d.list.forEach((importAsNode) => {
        const importResult = AnalyzerNodeInfo.getImportInfo(importAsNode.d.module);
        let resolvedPath: Uri | undefined;

        if (importResult && importResult.isImportFound) {
            resolvedPath = importResult.resolvedUris[importResult.resolvedUris.length - 1];
        }

        const localImport: ImportStatement = {
            node,
            subnode: importAsNode,
            importResult,
            resolvedPath,
            moduleName: _formatModuleName(importAsNode.d.module),
            followsNonImportStatement,
        };

        localImports.orderedImports.push(localImport);

        // Add it to the map.
        if (resolvedPath && !resolvedPath.isEmpty()) {
            // Don't overwrite existing import or import from statements
            // because we always want to prefer 'import from' over 'import'
            // in the map.
            if (!localImports.mapByFilePath.has(resolvedPath.key)) {
                localImports.mapByFilePath.set(resolvedPath.key, localImport);
            }
        }
    });
}

function _processImportFromNode(
    node: ImportFromNode,
    localImports: ImportStatements,
    followsNonImportStatement: boolean,
    includeImplicitImports: boolean
) {
    const importResult = AnalyzerNodeInfo.getImportInfo(node.d.module);
    let resolvedPath: Uri | undefined;

    if (importResult && importResult.isImportFound) {
        resolvedPath = importResult.resolvedUris[importResult.resolvedUris.length - 1];
    }

    if (includeImplicitImports && importResult) {
        localImports.implicitImports = localImports.implicitImports ?? new Map<string, ImportFromAsNode>();

        for (const implicitImport of importResult.implicitImports.values()) {
            const importFromAs = node.d.imports.find((i) => i.d.name.d.value === implicitImport.name);
            if (importFromAs) {
                localImports.implicitImports.set(implicitImport.uri.key, importFromAs);
            }
        }
    }

    const localImport: ImportStatement = {
        node,
        importResult,
        resolvedPath,
        moduleName: _formatModuleName(node.d.module),
        followsNonImportStatement,
    };

    localImports.orderedImports.push(localImport);

    // Add it to the map.
    if (resolvedPath && !resolvedPath.isEmpty()) {
        const prevEntry = localImports.mapByFilePath.get(resolvedPath.key);
        // Overwrite existing import statements because we always want to prefer
        // 'import from' over 'import'. Also, overwrite existing 'import from' if
        // the module name is shorter.
        if (
            !prevEntry ||
            prevEntry.node.nodeType === ParseNodeType.Import ||
            prevEntry.moduleName.length > localImport.moduleName.length
        ) {
            localImports.mapByFilePath.set(resolvedPath.key, localImport);
        }
    }
}

function _formatModuleName(node: ModuleNameNode): string {
    let moduleName = '';
    for (let i = 0; i < node.d.leadingDots; i++) {
        moduleName = moduleName + '.';
    }

    moduleName += node.d.nameParts.map((part) => part.d.value).join('.');

    return moduleName;
}
