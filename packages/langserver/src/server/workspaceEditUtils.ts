/*
 * workspaceEditUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Convert pyright's FileEditActions to LanguageServer's WorkspaceEdits.
 */

import {
    ChangeAnnotation,
    CreateFile,
    DeleteFile,
    RenameFile,
    TextDocumentEdit,
    TextEdit,
    WorkspaceEdit,
} from 'vscode-languageserver';

import { createMapFromItems } from 'commonUtils/collectionUtils.js';
import { assertNever } from 'commonUtils/debug.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { isArray } from 'commonUtils/valueTypeUtils.js';
import { FileEditAction, FileEditActions, TextEditAction } from 'typeserver/common/editAction.js';
import { convertRangeToTextRange } from 'typeserver/common/positionUtils.js';
import { TextRange } from 'typeserver/common/textRange.js';
import { TextRangeCollection } from 'typeserver/common/textRangeCollection.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export function convertToTextEdits(editActions: TextEditAction[]): TextEdit[] {
    return editActions.map((editAction) => ({
        range: editAction.range,
        newText: editAction.replacementText,
    }));
}

export function convertToFileTextEdits(fileUri: Uri, editActions: TextEditAction[]): FileEditAction[] {
    return editActions.map((a) => ({ fileUri, ...a }));
}

export function convertToWorkspaceEdit(ts: ITypeServer, edits: FileEditAction[]): WorkspaceEdit;
export function convertToWorkspaceEdit(ts: ITypeServer, edits: FileEditActions): WorkspaceEdit;
export function convertToWorkspaceEdit(
    ts: ITypeServer,
    edits: FileEditActions,
    changeAnnotations: {
        [id: string]: ChangeAnnotation;
    },
    defaultAnnotationId: string
): WorkspaceEdit;
export function convertToWorkspaceEdit(
    ts: ITypeServer,
    edits: FileEditActions | FileEditAction[],
    changeAnnotations?: {
        [id: string]: ChangeAnnotation;
    },
    defaultAnnotationId = 'default'
): WorkspaceEdit {
    if (isArray(edits)) {
        return _convertToWorkspaceEditWithChanges(ts, edits);
    }

    return _convertToWorkspaceEditWithDocumentChanges(ts, edits, changeAnnotations, defaultAnnotationId);
}

export function appendToWorkspaceEdit(ts: ITypeServer, edits: FileEditAction[], workspaceEdit: WorkspaceEdit) {
    edits.forEach((edit) => {
        const uri = ts.convertToRealUri(edit.fileUri)?.toString();
        if (uri) {
            workspaceEdit.changes![uri] = workspaceEdit.changes![uri] || [];
            workspaceEdit.changes![uri].push({ range: edit.range, newText: edit.replacementText });
        }
    });
}

export function applyTextEditsToString(
    edits: TextEditAction[],
    lines: TextRangeCollection<TextRange>,
    originalText: string
) {
    const editsWithOffset = edits
        .map((e) => ({
            range: convertRangeToTextRange(e.range, lines) ?? { start: originalText.length, length: 0 },
            text: e.replacementText,
        }))
        .sort((e1, e2) => {
            const result = e2.range.start - e1.range.start;
            if (result !== 0) {
                return result;
            }

            return TextRange.getEnd(e2.range) - TextRange.getEnd(e1.range);
        });

    // Apply change in reverse order.
    let current = originalText;
    for (const change of editsWithOffset) {
        current = current.substr(0, change.range.start) + change.text + current.substr(TextRange.getEnd(change.range));
    }

    return current;
}

// export function applyWorkspaceEdit(typeServer: ITypeServer, edits: WorkspaceEdit, filesChanged: Map<string, Uri>) {
//     if (edits.changes) {
//         for (const kv of Object.entries(edits.changes)) {
//             const fileUri = Uri.parse(kv[0], typeServer.extensionManager.caseSensitivity);
//             const fileInfo = typeServer.getSourceFileInfo(fileUri);
//             if (!fileInfo || !fileInfo.inProject) {
//                 // We don't allow non user file being modified.
//                 continue;
//             }

//             applyDocumentChanges(typeServer, fileInfo, kv[1]);
//             filesChanged.set(fileUri.key, fileUri);
//         }
//     }

//     // For now, we don't support annotations.
//     if (edits.documentChanges) {
//         for (const change of edits.documentChanges) {
//             if (TextDocumentEdit.is(change)) {
//                 const fileUri = Uri.parse(change.textDocument.uri, typeServer.extensionManager.caseSensitivity);
//                 const fileInfo = typeServer.getSourceFileInfo(fileUri);
//                 if (!fileInfo || !fileInfo.inProject) {
//                     // We don't allow non user file being modified.
//                     continue;
//                 }

//                 applyDocumentChanges(typeServer, fileInfo, change.edits.filter((e) => TextEdit.is(e)) as TextEdit[]);
//                 filesChanged.set(fileUri.key, fileUri);
//             }

//             // For now, we don't support other kinds of text changes.
//             // But if we want to add support for those in future, we should add them here.
//         }
//     }
// }

// export function applyDocumentChanges(typeServer: ITypeServer, file: ITypeServerSourceFile, edits: TextEdit[]) {
//     if (file.clientVersion === undefined) {
//         const fileContent = file.getContents();
//         typeServer.setFileOpened(file.uri, 0, fileContent ?? '', {
//             isInProject: file.inProject,
//             isNotebookCell: file.notebookCell,
//             previousCellUri: file.previousCell,
//         });
//     }

//     const version = file.clientVersion ?? 0;
//     const fileUri = file.uri;
//     const filePath = fileUri.getFilePath();
//     const sourceDoc = TextDocument.create(filePath, 'python', version, file.getContents());

//     typeServer.setFileOpened(fileUri, version + 1, TextDocument.applyEdits(sourceDoc, edits), {
//         isInProject: file.inProject,
//         isNotebookCell: file.notebookCell,
//         previousCellUri: file.previousCell,
//     });
// }

// export function generateWorkspaceEdit(
//     ts: ITypeServer,
//     originalService: TypeService,
//     clonedService: TypeService,
//     filesChanged: Map<string, Uri>
// ) {
//     // For now, we won't do text diff to find out minimal text changes. instead, we will
//     // consider whole text of the files are changed. In future, we could consider
//     // doing minimal changes using vscode's differ (https://github.com/microsoft/vscode/blob/main/src/vs/base/common/diff/diff.ts)
//     // to support annotation.
//     const edits: WorkspaceEdit = { changes: {} };

//     for (const uri of filesChanged.values()) {
//         const original = originalService.program.getBoundSourceFile(uri);
//         const final = clonedService.program.getBoundSourceFile(uri);
//         if (!original || !final) {
//             // Both must exist.
//             continue;
//         }

//         const parseResults = original.getParseResults();
//         if (!parseResults) {
//             continue;
//         }

//         const realUri = ts.convertToRealUri(uri);
//         if (!realUri) {
//             continue;
//         }

//         edits.changes![realUri.toString()] = [
//             {
//                 range: convertTextRangeToRange(parseResults.parserOutput.parseTree, parseResults.tokenizerOutput.lines),
//                 newText: final.getFileContent() ?? '',
//             },
//         ];
//     }

//     return edits;
// }

function _convertToWorkspaceEditWithChanges(ts: ITypeServer, edits: FileEditAction[]) {
    const workspaceEdit: WorkspaceEdit = {
        changes: {},
    };

    appendToWorkspaceEdit(ts, edits, workspaceEdit);
    return workspaceEdit;
}

function _convertToWorkspaceEditWithDocumentChanges(
    ts: ITypeServer,
    editActions: FileEditActions,
    changeAnnotations?: {
        [id: string]: ChangeAnnotation;
    },
    defaultAnnotationId = 'default'
) {
    const workspaceEdit: WorkspaceEdit = {
        documentChanges: [],
        changeAnnotations: changeAnnotations,
    };

    // Ordering of documentChanges are important.
    // Make sure create operation happens before edits.
    for (const operation of editActions.fileOperations) {
        switch (operation.kind) {
            case 'create': {
                const realUri = ts.convertToRealUri(operation.fileUri);
                if (realUri) {
                    workspaceEdit.documentChanges!.push(
                        CreateFile.create(realUri.toString(), /* options */ undefined, defaultAnnotationId)
                    );
                }
                break;
            }

            case 'rename':
            case 'delete': {
                break;
            }

            default: {
                assertNever(operation);
            }
        }
    }

    // Text edit's file path must refer to original file paths unless it is a new file just created.
    const mapPerFile = createMapFromItems(editActions.edits, (e) => {
        const realUri = ts.convertToRealUri(e.fileUri);
        if (!realUri) {
            return '';
        }
        return realUri.toString();
    });
    for (const [uri, value] of mapPerFile) {
        workspaceEdit.documentChanges!.push(
            TextDocumentEdit.create(
                { uri: uri, version: null },
                Array.from(
                    value.map((v) => ({
                        range: v.range,
                        newText: v.replacementText,
                        annotationId: defaultAnnotationId,
                    }))
                )
            )
        );
    }

    for (const operation of editActions.fileOperations) {
        switch (operation.kind) {
            case 'create':
                break;

            case 'rename': {
                const realUri = ts.convertToRealUri(operation.oldFileUri);
                if (realUri) {
                    workspaceEdit.documentChanges!.push(
                        RenameFile.create(
                            realUri.toString(),
                            realUri.toString(),
                            /* options */ undefined,
                            defaultAnnotationId
                        )
                    );
                }
                break;
            }

            case 'delete': {
                const realUri = ts.convertToRealUri(operation.fileUri);
                if (realUri) {
                    workspaceEdit.documentChanges!.push(
                        DeleteFile.create(realUri.toString(), /* options */ undefined, defaultAnnotationId)
                    );
                }
                break;
            }

            default:
                assertNever(operation);
        }
    }

    return workspaceEdit;
}
