/*
 * sourceFile.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright sourceFile module.
 */

import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { NullConsole } from 'typeserver/extensibility/console.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { FullAccessPythonEnvProvider } from 'typeserver/extensibility/pythonEnvProvider.js';
import { RealTempFile, createFromRealFileSystem } from 'typeserver/files/realFileSystem.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { SourceFile } from 'typeserver/program/sourceFile.js';
import { combinePaths } from 'typeserver/utils/pathUtils.js';

test('Empty', () => {
    const filePath = combinePaths(process.cwd(), 'tests/samples/test_file1.py');
    const tempFile = new RealTempFile();
    const fs = createFromRealFileSystem(tempFile);
    const extensionManager = new ExtensionManager(fs, new NullConsole(), tempFile, new FullAccessPythonEnvProvider());
    extensionManager.tempFile = tempFile;

    const sourceFile = new SourceFile(
        extensionManager,
        Uri.file(filePath, extensionManager.caseSensitivity),
        '',
        false,
        false,
        {
            isEditMode: false,
        }
    );
    const configOptions = new ConfigOptions(Uri.file(process.cwd(), extensionManager.caseSensitivity));
    const importResolver = new ImportResolver(extensionManager, configOptions);

    sourceFile.parse(configOptions, importResolver);
});

// test('Empty Open file', () => {
//     const code = `
// // @filename: test.py
// //// [|/*marker*/# Content|]
//     `;

//     const state = parseAndGetTestState(code).state;
//     const marker = state.getMarkerByName('marker');

//     assert.strictEqual(
//         state.workspace.service.test_program.getSourceFile(marker.fileUri)?.getFileContent(),
//         '# Content'
//     );

//     state.workspace.service.updateOpenFileContents(marker.fileUri, 1, '');
//     assert.strictEqual(state.workspace.service.test_program.getSourceFile(marker.fileUri)?.getFileContent(), '');
// });
