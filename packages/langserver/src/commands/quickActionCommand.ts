/*
 * quickActionCommand.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements command that maps to a quick action.
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { ServerCommand } from 'langserver/commands/commandController.js';
import { performQuickAction } from 'langserver/providers/quickActions.js';
import { LanguageServerInterface } from 'langserver/server/languageServerInterface.js';
import { convertToFileTextEdits, convertToWorkspaceEdit } from 'langserver/server/workspaceEditUtils.js';
import { getCaseDetector } from 'typeserver/extensibility/serviceProviderExtensions.js';
import { Uri } from 'typeserver/files/uri/uri.js';

export class QuickActionCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        if (params.arguments && params.arguments.length >= 1) {
            const docUri = Uri.parse(params.arguments[0] as string, getCaseDetector(this._ls.serviceProvider));
            const otherArgs = params.arguments.slice(1);
            const workspace = await this._ls.getWorkspaceForFile(docUri);

            const editActions = workspace.service.run((p) => {
                return performQuickAction(p, docUri, params.command, otherArgs, token);
            }, token);

            return convertToWorkspaceEdit(workspace.service.fs, convertToFileTextEdits(docUri, editActions ?? []));
        }
    }
}
