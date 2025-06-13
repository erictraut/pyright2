/*
 * sourceFileInfoUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Functions that operate on SourceFileInfo objects.
 */

import { IProgramView, ISourceFileInfo } from 'typeserver/extensibility/extensibility.js';
import { IPythonMode } from 'typeserver/program/sourceFile.js';
import { fail } from 'typeserver/utils/debug.js';

export function isUserCode(fileInfo: ISourceFileInfo | undefined) {
    return !!fileInfo && fileInfo.isTracked && !fileInfo.isThirdPartyImport && !fileInfo.isTypeshedFile;
}

export function collectImportedByCells<T extends ISourceFileInfo>(program: IProgramView, fileInfo: T): Set<T> {
    // The ImportedBy only works when files are parsed. Due to the lazy-loading nature of our system,
    // we can't ensure that all files within the program are parsed, which might lead to an incomplete dependency graph.
    // Parsing all regular files goes against our lazy-nature, but for notebook cells, which we open by default,
    // it makes sense to force complete parsing since they'll be parsed at some point anyway due to things like
    // `semantic tokens` or `checkers`.
    _parseAllOpenCells(program);

    const importedByCells = new Set<T>();
    collectImportedByRecursively(fileInfo, importedByCells);
    return importedByCells;
}

export function collectImportedByRecursively(fileInfo: ISourceFileInfo, importedBy: Set<ISourceFileInfo>) {
    fileInfo.importedBy.forEach((dep) => {
        if (importedBy.has(dep)) {
            // Already visited.
            return;
        }

        importedBy.add(dep);
        collectImportedByRecursively(dep, importedBy);
    });
}

export function verifyNoCyclesInChainedFiles<T extends ISourceFileInfo>(program: IProgramView, fileInfo: T): void {
    let nextChainedFile = fileInfo.chainedSourceFile;
    if (!nextChainedFile) {
        return;
    }

    const set = new Set<string>([fileInfo.uri.key]);
    while (nextChainedFile) {
        const path = nextChainedFile.uri.key;
        if (set.has(path)) {
            // We found a cycle.
            fail(`Found a cycle in implicit imports files for ${path}`);
        }

        set.add(path);
        nextChainedFile = nextChainedFile.chainedSourceFile;
    }
}

export function createChainedByList<T extends ISourceFileInfo>(program: IProgramView, fileInfo: T): T[] {
    // We want to create reverse map of all chained files.
    const map = new Map<ISourceFileInfo, ISourceFileInfo>();
    for (const file of program.getSourceFileInfoList()) {
        if (!file.chainedSourceFile) {
            continue;
        }

        map.set(file.chainedSourceFile, file);
    }

    const visited = new Set<ISourceFileInfo>();

    const chainedByList: ISourceFileInfo[] = [fileInfo];
    let current: ISourceFileInfo | undefined = fileInfo;
    while (current) {
        if (visited.has(current)) {
            fail('Detected a cycle in chained files');
        }
        visited.add(current);

        current = map.get(current);
        if (current) {
            chainedByList.push(current);
        }
    }

    return chainedByList as T[];
}

function _parseAllOpenCells(program: IProgramView): void {
    for (const file of program.getSourceFileInfoList()) {
        if (file.ipythonMode !== IPythonMode.CellDocs) {
            continue;
        }

        program.getParserOutput(file.uri);
        program.handleMemoryHighUsage();
    }
}
