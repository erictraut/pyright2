/*
 * createTypeStub.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements 'create stub' command functionality.
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { Uri } from 'commonUtils/uri/uri.js';
import { ServerCommand } from 'langserver/commands/commandController.js';
import { LanguageServerInterface } from 'langserver/server/languageServerInterface.js';
import { TypeServerExecutor } from 'langserver/server/typeServerExecutor.js';
import { Workspace } from 'langserver/server/workspaceFactory.js';
import { OperationCanceledException } from 'typeserver/extensibility/cancellationUtils.js';

export class CreateTypeStubCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        if (!cmdParams.arguments || cmdParams.arguments.length < 2) {
            return undefined;
        }
        const workspaceRoot = Uri.parse(cmdParams.arguments[0] as string, this._ls.extensionManager.caseSensitivity);
        const importName = cmdParams.arguments[1] as string;
        const callingFile = Uri.parse(cmdParams.arguments[2] as string, this._ls.extensionManager.caseSensitivity);
        const workspace = await this._ls.getWorkspaceForFile(callingFile ?? workspaceRoot);
        return await new TypeStubCreator(this._ls).create(workspace, importName, token);
    }
}

export class TypeStubCreator {
    constructor(private _ls: LanguageServerInterface) {}

    async create(workspace: Workspace, importName: string, token: CancellationToken): Promise<any> {
        const service = await TypeServerExecutor.cloneService(this._ls, workspace, {
            typeStubTargetImportName: importName,
        });
        try {
            await service.writeTypeStubInBackground(token);
            service.dispose();
            // TODO - need to reimplement
            // const infoMessage = `Type stub was successfully created for '${importName}'.`;
            // this._ls.window.showInformationMessage(infoMessage);

            // This is called after a new type stub has been created. It allows
            // us to invalidate caches and force reanalysis of files that potentially
            // are affected by the appearance of a new type stub.
            this._ls.reanalyze();
        } catch (err) {
            const isCancellation = OperationCanceledException.is(err);
            if (isCancellation) {
                const errMessage = `Type stub creation for '${importName}' was canceled`;
                this._ls.console.error(errMessage);
            } else {
                let errMessage = '';
                if (err instanceof Error) {
                    errMessage = ': ' + err.message;
                }
                errMessage = `An error occurred when creating type stub for '${importName}'` + errMessage;
                this._ls.console.error(errMessage);

                // TODO - need to reimplement
                // this._ls.window.showErrorMessage(errMessage);
            }
        }
    }
}
