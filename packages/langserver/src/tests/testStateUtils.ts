/*
 * testStateUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Test helpers for TestState
 */

import assert from 'assert';
import { CancellationToken } from 'vscode-languageserver';

import { createMapFromItems } from 'commonUtils/collectionUtils.js';
import { assertNever } from 'commonUtils/debug.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { isArray } from 'commonUtils/valueTypeUtils.js';
import { DocumentSymbolCollector } from 'langserver/providers/documentSymbolCollector.js';
import { WorkspaceParseProvider } from 'langserver/providers/parseProvider.js';
import { applyTextEditsToString } from 'langserver/server/workspaceEditUtils.js';
import { Workspace } from 'langserver/server/workspaceFactory.js';
import { Range } from 'langserver/tests/harness/fourslash/fourSlashTypes.js';
import { TestState } from 'langserver/tests/harness/fourslash/testState.js';
import { FileEditAction, FileEditActions } from 'typeserver/common/editAction.js';
import { findNodeByOffset } from 'typeserver/common/parseTreeUtils.js';
import { TextRange, rangesAreEqual } from 'typeserver/common/textRange.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { isFile } from 'typeserver/files/uriUtils.js';
import { NameNode } from 'typeserver/parser/parseNodes.js';
import { Program } from 'typeserver/program/program.js';
import { TypeServerProvider } from 'typeserver/program/typeServerProvider.js';

export function convertFileEditActionToString(edit: FileEditAction): string {
    return `'${edit.replacementText.replace(/\n/g, '!n!')}'@'${edit.fileUri}:(${edit.range.start.line},${
        edit.range.start.character
    })-(${edit.range.end.line},${edit.range.end.character})'`;
}

export function convertRangeToFileEditAction(state: TestState, range: Range, replacementText?: string): FileEditAction {
    const data = range.marker?.data as { r: string } | undefined;
    return {
        fileUri: range.fileUri,
        replacementText: (replacementText ?? data?.r ?? 'N/A').replace(/!n!/g, '\n'),
        range: state.convertPositionRange(range),
    };
}

export function verifyEdits(
    state: TestState,
    fileEditActions: FileEditActions,
    ranges: Range[],
    replacementText: string | undefined
) {
    for (const edit of fileEditActions.edits) {
        const expected: FileEditAction[] = ranges.map((r) => convertRangeToFileEditAction(state, r, replacementText));
        assert(
            expected.some((a) => {
                return (
                    a.fileUri.equals(edit.fileUri) &&
                    rangesAreEqual(a.range, edit.range) &&
                    a.replacementText === edit.replacementText
                );
            }),
            `can't find ${convertFileEditActionToString(edit)} in ${expected
                .map((a) => convertFileEditActionToString(a))
                .join('|')}`
        );
    }
}

export function applyFileEditActions(state: TestState, fileEditActions: FileEditActions) {
    // Apply changes
    // First, apply text changes
    const editsPerFileMap = createMapFromItems(fileEditActions.edits, (e) => e.fileUri.key);

    for (const [editFileName, editsPerFile] of editsPerFileMap) {
        const result = _applyEdits(state, editFileName, editsPerFile);
        state.testFS.writeFileSync(Uri.file(editFileName, state.extensionManager.caseSensitivity), result.text, 'utf8');

        // Update open file content if the file is in opened state.
        if (result.version) {
            let openedFilePath = editFileName;
            const renamed = fileEditActions.fileOperations.find(
                (o) => o.kind === 'rename' && o.oldFileUri.getFilePath() === editFileName
            );
            if (renamed?.kind === 'rename') {
                openedFilePath = renamed.newFileUri.getFilePath();
                state.program.setFileClosed(renamed.oldFileUri);
            }

            state.program.setFileOpened(
                Uri.file(openedFilePath, state.extensionManager.caseSensitivity),
                result.version + 1,
                result.text
            );
        }
    }

    // Second, apply filename change to disk or rename directory.
    for (const fileOperation of fileEditActions.fileOperations) {
        switch (fileOperation.kind) {
            case 'create': {
                state.testFS.mkdirpSync(fileOperation.fileUri.getDirectory().getFilePath());
                state.testFS.writeFileSync(fileOperation.fileUri, '');
                break;
            }
            case 'rename': {
                if (isFile(state.testFS, fileOperation.oldFileUri)) {
                    state.testFS.mkdirpSync(fileOperation.newFileUri.getDirectory().getFilePath());
                    state.testFS.renameSync(
                        fileOperation.oldFileUri.getFilePath(),
                        fileOperation.newFileUri.getFilePath()
                    );

                    // Add new file as tracked file
                    state.program.addTrackedFile(fileOperation.newFileUri);
                } else {
                    state.testFS.renameSync(
                        fileOperation.oldFileUri.getFilePath(),
                        fileOperation.newFileUri.getFilePath()
                    );
                }
                break;
            }
            case 'delete': {
                state.testFS.rimrafSync(fileOperation.fileUri.getFilePath());
                break;
            }
            default:
                assertNever(fileOperation);
        }
    }

    // And refresh program.
    state.importResolver.invalidateCache();
    state.program.markAllFilesDirty(true);
}

function _applyEdits(state: TestState, filePath: string, edits: FileEditAction[]) {
    const sourceFile = state.program.getBoundSourceFile(Uri.file(filePath, state.extensionManager.caseSensitivity))!;
    const parseResults = sourceFile.getParseResults()!;

    const current = applyTextEditsToString(
        edits.filter((e) => e.fileUri.getFilePath() === filePath),
        parseResults.tokenizerOutput.lines,
        parseResults.text
    );

    return { version: sourceFile.getClientVersion(), text: current };
}

export function verifyReferencesAtPosition(
    workspace: Workspace,
    program: Program,
    configOption: ConfigOptions,
    symbolNames: string | string[],
    fileName: string,
    position: number,
    ranges: Range[]
) {
    const sourceFile = program.getBoundSourceFile(Uri.file(fileName, program.extensionManager.caseSensitivity));
    assert(sourceFile);
    const typeServer = new TypeServerProvider(program);

    const node = findNodeByOffset(sourceFile.getParseResults()!.parserOutput.parseTree, position);
    const decls = DocumentSymbolCollector.getDeclarationsForNode(
        typeServer,
        new WorkspaceParseProvider(workspace),
        node as NameNode,
        /* resolveLocalName */ true,
        CancellationToken.None
    );

    const rangesByFile = createMapFromItems(ranges, (r) => r.fileName);
    for (const rangeFileName of rangesByFile.keys()) {
        const collector = new DocumentSymbolCollector(
            typeServer,
            isArray(symbolNames) ? symbolNames : [symbolNames],
            decls,
            program
                .getBoundSourceFile(Uri.file(rangeFileName, program.extensionManager.caseSensitivity))!
                .getParseResults()!.parserOutput.parseTree,
            CancellationToken.None,
            {
                treatModuleInImportAndFromImportSame: true,
                skipUnreachableCode: false,
            }
        );

        const results = collector.collect();
        const rangesOnFile = rangesByFile.get(rangeFileName)!;
        assert.strictEqual(results.length, rangesOnFile.length, `${rangeFileName}@${symbolNames}`);

        for (const result of results) {
            assert(rangesOnFile.some((r) => r.pos === result.range.start && r.end === TextRange.getEnd(result.range)));
        }
    }
}
