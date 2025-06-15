/*
 * sourceFileInfoUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Functions that operate on SourceFileInfo objects.
 */

import { IProgramView, ISourceFileInfo } from 'typeserver/extensibility/extensibility.js';
import { fail } from 'typeserver/utils/debug.js';

export function isUserCode(fileInfo: ISourceFileInfo | undefined) {
    return !!fileInfo && fileInfo.isTracked && !fileInfo.isThirdPartyImport && !fileInfo.isTypeshedFile;
}

export function collectImportedByCells<T extends ISourceFileInfo>(program: IProgramView, fileInfo: T): Set<T> {
    const importedByCells = new Set<T>();
    _collectImportedByRecursively(fileInfo, importedByCells);
    return importedByCells;
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

function _collectImportedByRecursively(fileInfo: ISourceFileInfo, importedBy: Set<ISourceFileInfo>) {
    fileInfo.importedBy.forEach((dep) => {
        if (importedBy.has(dep)) {
            // Already visited.
            return;
        }

        importedBy.add(dep);
        _collectImportedByRecursively(dep, importedBy);
    });
}
