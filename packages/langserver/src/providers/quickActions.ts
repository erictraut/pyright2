/*
 * quickActions.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Provides support for miscellaneous quick actions.
 */

import { CancellationToken } from 'vscode-languageserver';

import { Uri } from 'commonUtils/uri/uri.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export function performQuickAction(
    typeServer: ITypeServer,
    uri: Uri,
    command: string,
    args: any[],
    token: CancellationToken
) {
    const sourceFileInfo = typeServer.getSourceFile(uri);

    // This command should be called only for open files, in which
    // case we should have the file contents already loaded.
    if (!sourceFileInfo || sourceFileInfo.clientVersion === undefined) {
        return [];
    }

    return [];
}
