/*
 * commandController.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements language server commands execution functionality.
 */

import { CancellationToken, ExecuteCommandParams, ResponseError } from 'vscode-languageserver';

import { CreateTypeStubCommand } from 'langserver/commands/createTypeStub.js';
import { RestartServerCommand } from 'langserver/commands/restartServer.js';
import { LanguageServerInterface } from 'langserver/server/languageServerInterface.js';
import { Commands } from 'typeserver/service/commands.js';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any>;
}

export class CommandController implements ServerCommand {
    private _createStub: CreateTypeStubCommand;
    private _restartServer: RestartServerCommand;

    constructor(ls: LanguageServerInterface) {
        this._createStub = new CreateTypeStubCommand(ls);
        this._restartServer = new RestartServerCommand(ls);
    }

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        switch (cmdParams.command) {
            case Commands.createTypeStub: {
                return this._createStub.execute(cmdParams, token);
            }

            case Commands.restartServer: {
                return this._restartServer.execute(cmdParams);
            }

            default: {
                return new ResponseError<string>(1, 'Unsupported command');
            }
        }
    }

    isLongRunningCommand(command: string): boolean {
        switch (command) {
            case Commands.createTypeStub:
            case Commands.restartServer:
                return true;

            default:
                return false;
        }
    }

    isRefactoringCommand(command: string): boolean {
        return false;
    }
}
