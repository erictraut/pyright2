/*
 * signatureHelp.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Unit tests for signature help.
 */

import assert from 'assert';
import { CancellationToken, MarkupKind } from 'vscode-languageserver';

import { WorkspaceParseProvider } from 'langserver/providers/parseProvider.js';
import { SignatureHelpProvider } from 'langserver/providers/signatureHelpProvider.js';
import { parseAndGetTestState } from 'langserver/tests/harness/fourslash/testState.js';
import { convertOffsetToPosition } from 'typeserver/common/positionUtils.js';

test('invalid position in format string segment', () => {
    const code = `
// @filename: test.py
//// f'{"(".capit[|/*marker*/|]alize()}'
    `;

    checkSignatureHelp(code, false);
});

test('valid position in format string segment', () => {
    const code = `
// @filename: test.py
//// f'{"(".capitalize([|/*marker*/|])}'
    `;

    checkSignatureHelp(code, true);
});

test('valid position in the second format string segment', () => {
    const code = `
// @filename: test.py
//// f'{print("hello")} {"(".capitalize([|/*marker*/|])}'
    `;

    checkSignatureHelp(code, true);
});

test('invalid position in the second format string segment', () => {
    const code = `
// @filename: test.py
//// f'{print("hello")} {"(".capitalize [|/*marker*/|]  ()}'
    `;

    checkSignatureHelp(code, false);
});

test('nested call in format string segment', () => {
    const code = `
// @filename: test.py
//// def foo():
////     pass
////
//// f'{"(".capitalize(foo([|/*marker*/|]))}'
    `;

    checkSignatureHelp(code, true);
});

test('within arguments in format string segment', () => {
    const code = `
// @filename: test.py
//// def foo():
////     pass
////
//// f'{"(".capitalize(fo[|/*marker*/|]o())}'
    `;

    checkSignatureHelp(code, true);
});

function checkSignatureHelp(code: string, expects: boolean) {
    const state = parseAndGetTestState(code).state;
    const marker = state.getMarkerByName('marker');

    const parseResults = state.workspace.service.getParseResults(marker.fileUri)!;
    const position = convertOffsetToPosition(marker.position, parseResults.tokenizerOutput.lines);

    const actual = new SignatureHelpProvider(
        state.typeServer,
        new WorkspaceParseProvider(state.workspace),
        marker.fileUri,
        parseResults,
        position,
        MarkupKind.Markdown,
        /*hasSignatureLabelOffsetCapability*/ true,
        /*hasActiveParameterCapability*/ true,
        /*context*/ undefined,
        CancellationToken.None
    ).getSignatureHelp();

    assert.strictEqual(!!actual, expects);
}
