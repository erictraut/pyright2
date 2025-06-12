/*
 * quickActionCommand.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements command that maps to a quick action.
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { Uri } from 'typeserver/files/uri/uri';
import { performQuickAction } from '../providers/quickActions';
import { LanguageServerInterface } from '../server/languageServerInterface';
import { convertToFileTextEdits, convertToWorkspaceEdit } from '../server/workspaceEditUtils';
import { ServerCommand } from './commandController';
import { Commands } from './commands';

export class QuickActionCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        if (params.arguments && params.arguments.length >= 1) {
            const docUri = Uri.parse(params.arguments[0] as string, this._ls.serviceProvider);
            const otherArgs = params.arguments.slice(1);
            const workspace = await this._ls.getWorkspaceForFile(docUri);

            if (params.command === Commands.orderImports && workspace.disableOrganizeImports) {
                return [];
            }

            const editActions = workspace.service.run((p) => {
                return performQuickAction(p, docUri, params.command, otherArgs, token);
            }, token);

            return convertToWorkspaceEdit(workspace.service.fs, convertToFileTextEdits(docUri, editActions ?? []));
        }
    }
}
