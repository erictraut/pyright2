/*
 * chainedSourceFiles.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Unit tests for tokenizer ipython mode
 */

import assert from 'assert';
import { CancellationToken } from 'vscode-jsonrpc';
import { MarkupKind } from 'vscode-languageserver-types';

import { convertOffsetsToRange, convertOffsetToPosition } from 'typeserver/common/positionUtils.ts';
import { ConfigOptions } from 'typeserver/config/configOptions.ts';
import { NullConsole } from 'typeserver/extensibility/console.ts';
import { ServiceProvider } from 'typeserver/extensibility/serviceProvider.ts';
import { normalizeSlashes } from 'typeserver/files/pathUtils.ts';
import { Uri } from 'typeserver/files/uri/uri.ts';
import { UriEx } from 'typeserver/files/uri/uriUtils.ts';
import { Program } from 'typeserver/program/program.ts';
import { IPythonMode } from 'typeserver/program/sourceFile.ts';
import { TypeService } from 'typeserver/service/typeService.ts';
import { CompletionProvider } from '../providers/completionProvider.ts';
import { parseTestData } from './harness/fourslash/fourSlashParser.ts';
import * as host from './harness/testHost.ts';
import { createFromFileSystem } from './harness/vfs/factory.ts';

test('check chained files', () => {
    const code = `
// @filename: test1.py
//// def foo1(): pass

// @filename: test2.py
//// def foo2(): pass

// @filename: test3.py
//// def foo3(): pass

// @filename: test4.py
//// [|foo/*marker*/|]
    `;

    const basePath = UriEx.file(normalizeSlashes('/'));
    const { data, service } = createServiceWithChainedSourceFiles(basePath, code);

    const marker = data.markerPositions.get('marker')!;
    const markerUri = marker.fileUri;

    const parseResult = service.getParseResults(markerUri)!;
    const result = new CompletionProvider(
        service.program,
        markerUri,
        convertOffsetToPosition(marker.position, parseResult.tokenizerOutput.lines),
        {
            format: MarkupKind.Markdown,
            lazyEdit: false,
            snippet: false,
        },
        CancellationToken.None
    ).getCompletions();

    assert(result?.items.some((i) => i.label === 'foo1'));
    assert(result?.items.some((i) => i.label === 'foo2'));
    assert(result?.items.some((i) => i.label === 'foo3'));
});

test('modify chained files', () => {
    const code = `
// @filename: test1.py
//// def foo1(): pass

// @filename: test2.py
//// [|/*delete*/|]
//// def foo2(): pass

// @filename: test3.py
//// def foo3(): pass

// @filename: test4.py
//// [|foo/*marker*/|]
    `;

    const basePath = UriEx.file(normalizeSlashes('/'));
    const { data, service } = createServiceWithChainedSourceFiles(basePath, code);

    // Make sure files are all realized.
    const marker = data.markerPositions.get('marker')!;
    const markerUri = marker.fileUri;
    const parseResult = service.getParseResults(markerUri)!;

    // Close file in the middle of the chain
    service.setFileClosed(data.markerPositions.get('delete')!.fileUri);

    // Make sure we don't get suggestion from auto import but from chained files.
    service.program.configOptions.autoImportCompletions = false;

    const result = new CompletionProvider(
        service.program,
        markerUri,
        convertOffsetToPosition(marker.position, parseResult.tokenizerOutput.lines),
        {
            format: MarkupKind.Markdown,
            lazyEdit: false,
            snippet: false,
        },
        CancellationToken.None
    ).getCompletions();

    assert(result);

    assert(!result.items.some((i) => i.label === 'foo1'));
    assert(!result.items.some((i) => i.label === 'foo2'));
    assert(result.items.some((i) => i.label === 'foo3'));
});

test('modify chained files', async () => {
    const code = `
// @filename: test1.py
//// [|/*changed*/|]
//// def foo1(): pass

// @filename: test2.py
//// def foo2(): pass

// @filename: test3.py
//// def foo3(): pass

// @filename: test4.py
//// [|/*marker*/foo1()|]
    `;

    const basePath = UriEx.file(normalizeSlashes('/'));
    const { data, service } = createServiceWithChainedSourceFiles(basePath, code);

    const marker = data.markerPositions.get('marker')!;
    const markerUri = marker.fileUri;
    const range = data.ranges.find((r) => r.marker === marker)!;

    const parseResults = service.getParseResults(markerUri)!;
    analyze(service.program);

    // Initially, there should be no error.
    const initialDiags = await service.getDiagnosticsForRange(
        markerUri,
        convertOffsetsToRange(range.pos, range.end, parseResults.tokenizerOutput.lines)
    );

    assert.strictEqual(initialDiags.length, 0);

    // Change test1 content
    service.updateOpenFileContents(data.markerPositions.get('changed')!.fileUri, 2, 'def foo5(): pass');
    analyze(service.program);

    const finalDiags = await service.getDiagnosticsForRange(
        markerUri,
        convertOffsetsToRange(range.pos, range.end, parseResults.tokenizerOutput.lines)
    );

    assert.strictEqual(finalDiags.length, 1);
});

function generateChainedFiles(count: number, lastFile: string) {
    let code = '';
    for (let i = 0; i < count; i++) {
        code += `
// @filename: test${i + 1}.py
//// def foo${i + 1}(): pass
`;
    }
    code += lastFile;
    return code;
}

test('chained files with 1000s of files', async () => {
    const lastFile = `
// @filename: testFinal.py
//// [|/*marker*/foo1()|]
    `;
    const code = generateChainedFiles(1000, lastFile);
    const basePath = UriEx.file(normalizeSlashes('/'));
    const { data, service } = createServiceWithChainedSourceFiles(basePath, code);
    const marker = data.markerPositions.get('marker')!;
    const markerUri = marker.fileUri;
    const range = data.ranges.find((r) => r.marker === marker)!;

    const parseResults = service.getParseResults(markerUri)!;
    analyze(service.program);

    // There should be no error as it should find the foo1 in the first chained file.
    const initialDiags = await service.getDiagnosticsForRange(
        markerUri,
        convertOffsetsToRange(range.pos, range.end, parseResults.tokenizerOutput.lines)
    );

    assert.strictEqual(initialDiags.length, 0);
});

test('imported by files', async () => {
    const code = `
// @filename: test1.py
//// import [|/*marker*/os|]

// @filename: test2.py
//// os.path.join()
    `;

    const basePath = UriEx.file(normalizeSlashes('/'));
    const { data, service } = createServiceWithChainedSourceFiles(basePath, code);
    analyze(service.program);

    const marker = data.markerPositions.get('marker')!;
    const markerUri = marker.fileUri;
    const range = data.ranges.find((r) => r.marker === marker)!;

    const parseResults = service.getParseResults(markerUri)!;
    const diagnostics = await service.getDiagnosticsForRange(
        markerUri,
        convertOffsetsToRange(range.pos, range.end, parseResults.tokenizerOutput.lines)
    );

    assert.strictEqual(diagnostics.length, 0);
});

test('re ordering cells', async () => {
    const code = `
// @filename: test1.py
//// import [|/*marker*/os|]

// @filename: test2.py
//// /*bottom*/os.path.join()
    `;

    const basePath = UriEx.file(normalizeSlashes('/'));
    const { data, service } = createServiceWithChainedSourceFiles(basePath, code);
    analyze(service.program);

    const marker = data.markerPositions.get('marker')!;
    const markerUri = marker.fileUri;
    const range = data.ranges.find((r) => r.marker === marker)!;

    const bottom = data.markerPositions.get('bottom')!;
    const bottomUri = bottom.fileUri;

    service.updateChainedUri(bottomUri, undefined);
    service.updateChainedUri(markerUri, bottomUri);
    analyze(service.program);

    const parseResults = service.getParseResults(markerUri)!;
    const diagnostics = await service.getDiagnosticsForRange(
        markerUri,
        convertOffsetsToRange(range.pos, range.end, parseResults.tokenizerOutput.lines)
    );

    assert.strictEqual(diagnostics.length, 1);
});

function createServiceWithChainedSourceFiles(basePath: Uri, code: string) {
    const fs = createFromFileSystem(host.HOST, /*ignoreCase*/ false, { cwd: basePath.getFilePath() });
    const service = new TypeService('test service', new ServiceProvider(), {
        console: new NullConsole(),
        importResolverFactory: TypeService.createImportResolver,
        configOptions: new ConfigOptions(basePath),
        fileSystem: fs,
    });

    const data = parseTestData(basePath.getFilePath(), code, '');

    let chainedFilePath: Uri | undefined;
    for (const file of data.files) {
        const uri = file.fileUri;
        service.setFileOpened(uri, 1, file.content, IPythonMode.CellDocs, chainedFilePath);
        chainedFilePath = uri;
    }
    return { data, service };
}

function analyze(program: Program) {
    while (program.analyze()) {
        // Process all queued items
    }
}
