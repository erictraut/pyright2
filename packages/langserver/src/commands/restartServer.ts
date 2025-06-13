/*
 * restartServer.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements 'restart server' command functionality.
 */

import { ExecuteCommandParams } from 'vscode-languageserver';

import { ServerCommand } from 'langserver/commands/commandController.js';
import { LanguageServerInterface } from 'langserver/server/languageServerInterface.js';

export class RestartServerCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(cmdParams: ExecuteCommandParams): Promise<any> {
        this._ls.restart();
    }
}
