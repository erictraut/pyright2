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

import { normalizeSlashes } from 'typeserver/files/pathUtils.ts';
import { runFourSlashTest } from './harness/fourslash/runner.ts';
import * as host from './harness/testHost.ts';
import { MODULE_PATH } from './harness/vfs/filesystem.ts';

describe('fourslash tests', () => {
    const testFiles: string[] = [];

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const basePath = path.resolve(__dirname, 'fourslash/');
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
