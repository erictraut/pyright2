/*
 * codeActionProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Handles 'code actions' requests from the client.
 */

import { CancellationToken, CodeAction, CodeActionKind, Command } from 'vscode-languageserver';

import { Workspace } from 'langserver/server/workspaceFactory.js';
import { CreateTypeStubFileAction } from 'typeserver/common/diagnostic.js';
import { Range } from 'typeserver/common/textRange.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { Localizer } from 'typeserver/localization/localize.js';
import { Commands } from 'typeserver/service/commands.js';

export class CodeActionProvider {
    static mightSupport(kinds: CodeActionKind[] | undefined): boolean {
        if (!kinds || kinds.length === 0) {
            return true;
        }

        // Only support quick fix actions
        return kinds.some((s) => s.startsWith(CodeActionKind.QuickFix));
    }

    static async getCodeActionsForPosition(
        workspace: Workspace,
        fileUri: Uri,
        range: Range,
        kinds: CodeActionKind[] | undefined,
        token: CancellationToken
    ) {
        throwIfCancellationRequested(token);

        const codeActions: CodeAction[] = [];
        if (!workspace.rootUri || workspace.disableLanguageServices) {
            return codeActions;
        }

        if (!this.mightSupport(kinds)) {
            // Early exit if code actions are going to be filtered anyway.
            return codeActions;
        }

        const diags = await workspace.service.getDiagnosticsForRange(fileUri, range);
        const typeStubDiag = diags.find((d) => {
            const actions = d.getActions();
            return actions && actions.find((a) => a.action === Commands.createTypeStub);
        });

        if (typeStubDiag) {
            const action = typeStubDiag
                .getActions()!
                .find((a) => a.action === Commands.createTypeStub) as CreateTypeStubFileAction;
            if (action) {
                const createTypeStubAction = CodeAction.create(
                    Localizer.CodeAction.createTypeStubFor().format({ moduleName: action.moduleName }),
                    Command.create(
                        Localizer.CodeAction.createTypeStub(),
                        Commands.createTypeStub,
                        workspace.rootUri.toString(),
                        action.moduleName,
                        fileUri.toString()
                    ),
                    CodeActionKind.QuickFix
                );
                codeActions.push(createTypeStubAction);
            }
        }

        return codeActions;
    }
}
