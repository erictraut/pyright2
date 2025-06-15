/*
 * navigationUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Helper functions for navigating files.
 */

import { Location } from 'vscode-languageserver-types';

import { Uri } from 'commonUtils/uri/uri.js';
import { DocumentRange } from 'typeserver/common/docRange.js';
import { IReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { convertUriToLspUriString } from 'typeserver/files/uriUtils.js';

export function canNavigateToFile(fs: IReadOnlyFileSystem, path: Uri): boolean {
    return !fs.isInZip(path);
}

export function convertDocumentRangesToLocation(fs: IReadOnlyFileSystem, ranges: DocumentRange[]): Location[] {
    const locations: Location[] = [];

    ranges.forEach((range) => {
        const loc = convertDocumentRangeToLocation(fs, range);
        if (loc) {
            locations.push(loc);
        }
    });

    return locations;
}

export function convertDocumentRangeToLocation(fs: IReadOnlyFileSystem, range: DocumentRange): Location | undefined {
    if (!canNavigateToFile(fs, range.uri)) {
        return undefined;
    }

    return Location.create(convertUriToLspUriString(fs, range.uri), range.range);
}
