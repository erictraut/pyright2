/*
 * navigationUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Helper functions for navigating files.
 */

import { Location } from 'vscode-languageserver-types';

import { DocumentRange } from 'typeserver/common/docRange.js';
import { ReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { convertUriToLspUriString } from 'typeserver/files/uriUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export function canNavigateToFile(fs: ReadOnlyFileSystem, path: Uri): boolean {
    return !fs.isInZip(path);
}

export function convertDocumentRangesToLocation(
    fs: ReadOnlyFileSystem,
    ranges: DocumentRange[],
    converter: (fs: ReadOnlyFileSystem, range: DocumentRange) => Location | undefined = convertDocumentRangeToLocation
): Location[] {
    return ranges.map((range) => converter(fs, range)).filter((loc) => !!loc) as Location[];
}

export function convertDocumentRangeToLocation(fs: ReadOnlyFileSystem, range: DocumentRange): Location | undefined {
    if (!canNavigateToFile(fs, range.uri)) {
        return undefined;
    }

    return Location.create(convertUriToLspUriString(fs, range.uri), range.range);
}
