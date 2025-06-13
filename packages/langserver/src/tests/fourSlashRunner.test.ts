/*
 * fourSlashRunner.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Entry point that will read all *.fourslash.ts files and
 * register jest tests for them and run
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { runFourSlashTest } from 'langserver/tests/harness/fourslash/runner.js';
import * as host from 'langserver/tests/harness/testHost.js';
import { MODULE_PATH } from 'langserver/tests/harness/vfs/filesystem.js';
import { normalizeSlashes } from 'typeserver/files/pathUtils.js';

describe('fourslash tests', () => {
    const testFiles: string[] = [];

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const basePath = path.resolve(currentDir, 'fourslash/');
    for (const file of host.HOST.listFiles(basePath, /.*\.fourslash\.ts$/i, { recursive: true })) {
        testFiles.push(file);
    }

    testFiles.forEach((file) => {
        describe(file, () => {
            const fn = normalizeSlashes(file);
            const justName = fn.replace(/^.*[\\/]/, '');

            // TODO: make these to use promise/async rather than callback token
            it('fourslash test ' + justName + ' run', (cb) => {
                runFourSlashTest(MODULE_PATH, fn, cb);
            });
        });
    });
});
