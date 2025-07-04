/*
 * renameProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that rename identifier on the given position and its references.
 */

import { CancellationToken, WorkspaceEdit } from 'vscode-languageserver';

import { assertNever } from 'commonUtils/debug.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { IParseProvider } from 'langserver/providers/parseProvider.js';
import { ReferenceUseCase } from 'langserver/providers/providerTypes.js';
import { ReferencesProvider, ReferencesResult } from 'langserver/providers/referencesProvider.js';
import { convertToWorkspaceEdit } from 'langserver/server/workspaceEditUtils.js';
import { FileEditAction } from 'typeserver/common/editAction.js';
import { convertTextRangeToRange } from 'typeserver/common/positionUtils.js';
import { Position, Range } from 'typeserver/common/textRange.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export class RenameProvider {
    constructor(
        private _typeServer: ITypeServer,
        private _parseProvider: IParseProvider,
        private _fileUri: Uri,
        private _parseResults: ParseFileResults,
        private _position: Position,
        private _token: CancellationToken
    ) {}

    canRenameSymbol(isDefaultWorkspace: boolean, isUntitled: boolean): Range | null {
        throwIfCancellationRequested(this._token);
        const referencesResult = this._getReferenceResult();
        if (!referencesResult) {
            return null;
        }

        const renameMode = RenameProvider.getRenameSymbolMode(
            this._typeServer,
            this._fileUri,
            referencesResult,
            isDefaultWorkspace,
            isUntitled
        );
        if (renameMode === 'none') {
            return null;
        }

        // Return the range of the symbol.
        return convertTextRangeToRange(referencesResult.nodeAtOffset, this._parseResults.tokenizerOutput.lines);
    }

    renameSymbol(newName: string, isDefaultWorkspace: boolean, isUntitled: boolean): WorkspaceEdit | null {
        throwIfCancellationRequested(this._token);

        const referencesResult = this._getReferenceResult();
        if (!referencesResult) {
            return null;
        }

        const referenceProvider = new ReferencesProvider(this._typeServer, this._parseProvider, this._token);
        const renameMode = RenameProvider.getRenameSymbolMode(
            this._typeServer,
            this._fileUri,
            referencesResult,
            isDefaultWorkspace,
            isUntitled
        );

        switch (renameMode) {
            case 'singleFileMode':
                referenceProvider.addReferencesToResult(this._fileUri, /* includeDeclaration */ true, referencesResult);
                break;

            case 'multiFileMode': {
                for (const curSourceFileInfo of this._typeServer.getSourceFiles()) {
                    // Make sure we only add user code to the references to prevent us
                    // from accidentally changing third party library or type stub.
                    if (curSourceFileInfo.inProject) {
                        // Make sure searching symbol name exists in the file.
                        const content = curSourceFileInfo.getContents();
                        if (!referencesResult.symbolNames.some((s) => content.search(s) >= 0)) {
                            continue;
                        }

                        referenceProvider.addReferencesToResult(
                            curSourceFileInfo.uri,
                            /* includeDeclaration */ true,
                            referencesResult
                        );
                    }
                }
                break;
            }

            case 'none':
                // Rename is not allowed.
                // ex) rename symbols from libraries.
                return null;

            default:
                assertNever(renameMode);
        }

        const edits: FileEditAction[] = [];
        referencesResult.results.forEach((result) => {
            // Special case the renames of keyword arguments.
            edits.push({
                fileUri: result.location.uri,
                range: result.location.range,
                replacementText: newName,
            });
        });

        return convertToWorkspaceEdit(this._typeServer, { edits, fileOperations: [] });
    }

    static getRenameSymbolMode(
        typeServer: ITypeServer,
        fileUri: Uri,
        referencesResult: ReferencesResult,
        isDefaultWorkspace: boolean,
        isUntitled: boolean
    ) {
        const sourceFileInfo = typeServer.getSourceFile(fileUri)!;

        // We have 2 different cases
        // Single file mode.
        // 1. rename on default workspace (ex, standalone file mode).
        // 2. rename local symbols.
        // 3. rename symbols defined in the non user open file.
        //
        // and Multi file mode.
        // 1. rename public symbols defined in user files on regular workspace (ex, open folder mode).
        const userFile = sourceFileInfo.inProject;
        if (
            isDefaultWorkspace ||
            (userFile && !referencesResult.requiresGlobalSearch) ||
            (!userFile &&
                sourceFileInfo.clientVersion !== undefined &&
                referencesResult.declarations.every((d) => d.uri.equals(sourceFileInfo.uri)))
        ) {
            return 'singleFileMode';
        }

        if (referencesResult.declarations.every((d) => typeServer.getSourceFile(d.uri)?.inProject)) {
            return 'multiFileMode';
        }

        // Rename is not allowed.
        // ex) rename symbols from libraries.
        return 'none';
    }

    private _getReferenceResult() {
        const referencesResult = ReferencesProvider.getDeclarationForPosition(
            this._typeServer,
            this._parseProvider,
            this._fileUri,
            this._position,
            /* reporter */ undefined,
            ReferenceUseCase.Rename,
            this._token
        );
        if (!referencesResult) {
            return undefined;
        }

        if (referencesResult.containsOnlyImportDecls) {
            return undefined;
        }

        if (referencesResult.nonImportDeclarations.length === 0) {
            // There is no symbol we can rename.
            return undefined;
        }

        // Use declarations that doesn't contain import decls.
        return new ReferencesResult(
            referencesResult.requiresGlobalSearch,
            referencesResult.nodeAtOffset,
            referencesResult.symbolNames,
            referencesResult.nonImportDeclarations,
            referencesResult.useCase
        );
    }
}
