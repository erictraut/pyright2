/*
 * sourceFile.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright sourceFile module.
 */

import { ConfigOptions } from '../config/configOptions.ts';
import { FullAccessHost } from '../extensibility/fullAccessHost.ts';
import { createServiceProvider } from '../extensibility/serviceProviderExtensions.ts';
import { combinePaths } from '../files/pathUtils.ts';
import { RealTempFile, createFromRealFileSystem } from '../files/realFileSystem.ts';
import { Uri } from '../files/uri/uri.ts';
import { ImportResolver } from '../imports/importResolver.ts';
import { SourceFile } from '../program/sourceFile.ts';

test('Empty', () => {
    const filePath = combinePaths(process.cwd(), 'tests/samples/test_file1.py');
    const tempFile = new RealTempFile();
    const fs = createFromRealFileSystem(tempFile);
    const serviceProvider = createServiceProvider(tempFile, fs);
    const sourceFile = new SourceFile(serviceProvider, Uri.file(filePath, serviceProvider), '', false, false, {
        isEditMode: false,
    });
    const configOptions = new ConfigOptions(Uri.file(process.cwd(), serviceProvider));
    const sp = createServiceProvider(fs);
    const importResolver = new ImportResolver(sp, configOptions, new FullAccessHost(sp));

    sourceFile.parse(configOptions, importResolver);
    serviceProvider.dispose();
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
