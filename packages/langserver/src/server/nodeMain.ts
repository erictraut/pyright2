/*
 * nodeMain.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides the main entrypoint to the server when running in Node.
 */

import { ConnectionOptions } from 'vscode-languageserver';
import { createConnection } from 'vscode-languageserver/node';

import { getCancellationStrategyFromArgv } from 'typeserver/extensibility/fileBasedCancellationUtils';
import { initializeDependencies } from 'typeserver/service/asyncInitialization';

import { PyrightServer } from './server';

export async function main(maxWorkers: number) {
    await initializeDependencies();

    const connectionOptions: ConnectionOptions = {
        cancellationStrategy: getCancellationStrategyFromArgv(process.argv),
    };

    const conn = createConnection(connectionOptions);

    new PyrightServer(conn, maxWorkers);
}
