/*
 * testStateUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Various test utility functions for TestState.
 */

import assert from 'assert';
import * as JSONC from 'jsonc-parser';

import {
    FourSlashData,
    FourSlashFile,
    GlobalMetadataOptionNames,
    Marker,
    MetadataOptionNames,
} from 'langserver/tests/harness/fourslash/fourSlashTypes.js';
import * as vfs from 'langserver/tests/harness/vfs/filesystem.js';
import { configFileName } from 'typeserver/common/pathConsts.js';
import { Comparison } from 'typeserver/utils/comparisonUtils.js';
import { combinePaths, getBaseFileName } from 'typeserver/utils/pathUtils.js';
import { getStringComparer } from 'typeserver/utils/stringUtils.js';
import { toBoolean } from 'typeserver/utils/valueTypeUtils.js';

export function createVfsInfoFromFourSlashData(projectRoot: string, testData: FourSlashData) {
    const metaProjectRoot = testData.globalOptions[GlobalMetadataOptionNames.projectRoot];
    projectRoot = metaProjectRoot ? combinePaths(projectRoot, metaProjectRoot) : projectRoot;

    const ignoreCase = toBoolean(testData.globalOptions[GlobalMetadataOptionNames.ignoreCase]);

    let rawConfigJson = '';
    const sourceFileNames: string[] = [];
    const files: vfs.FileSet = {};

    for (const file of testData.files) {
        // if one of file is configuration file, set config options from the given json
        if (isConfig(file, ignoreCase)) {
            try {
                rawConfigJson = JSONC.parse(file.content);
            } catch (e: any) {
                throw new Error(`Failed to parse test ${file.fileName}: ${e.message}`);
            }
        } else {
            files[file.fileName] = new vfs.File(file.content, { meta: file.fileOptions, encoding: 'utf8' });

            if (!toBoolean(file.fileOptions[MetadataOptionNames.library])) {
                sourceFileNames.push(file.fileName);
            }
        }
    }
    return { files, sourceFileNames, projectRoot, ignoreCase, rawConfigJson };
}

export function getMarkerName(testData: FourSlashData, markerToFind: Marker) {
    let found: string | undefined;
    testData.markerPositions.forEach((marker, name) => {
        if (marker === markerToFind) {
            found = name;
        }
    });

    assert.ok(found);
    return found!;
}

export function getMarkerByName(testData: FourSlashData, markerName: string) {
    const markerPos = testData.markerPositions.get(markerName);
    if (markerPos === undefined) {
        throw new Error(
            `Unknown marker "${markerName}" Available markers: ${getMarkerNames(testData)
                .map((m) => '"' + m + '"')
                .join(', ')}`
        );
    } else {
        return markerPos;
    }
}

export function getMarkerNames(testData: FourSlashData): string[] {
    return [...testData.markerPositions.keys()];
}

export function getRangeByMarkerName(testData: FourSlashData, markerName: string) {
    const marker = getMarkerByName(testData, markerName);
    return testData.ranges.find((r) => r.marker === marker);
}

function isConfig(file: FourSlashFile, ignoreCase: boolean): boolean {
    const comparer = getStringComparer(ignoreCase);
    return comparer(getBaseFileName(file.fileName), configFileName) === Comparison.EqualTo;
}
