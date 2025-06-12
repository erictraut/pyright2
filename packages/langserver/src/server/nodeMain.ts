/*
 * nodeMain.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides the main entrypoint to the server when running in Node.
 */

import { Connection, ConnectionOptions } from 'vscode-languageserver';
import { createConnection } from 'vscode-languageserver/node';
import { isMainThread } from 'worker_threads';

import { initializeDependencies } from './common/asyncInitialization';
import { getCancellationStrategyFromArgv } from './common/fileBasedCancellationUtils';

import { BackgroundAnalysisRunner } from './backgroundAnalysis';
import { ServiceProvider } from './common/serviceProvider';
import { PyrightServer } from './server';

export async function main(maxWorkers: number) {
    await run(
        (conn) => new PyrightServer(conn, maxWorkers),
        () => {
            const runner = new BackgroundAnalysisRunner(new ServiceProvider());
            runner.start();
        }
    );
}

export async function run(runServer: (connection: Connection) => void, runBackgroundThread: () => void) {
    await initializeDependencies();

    if (isMainThread) {
        runServer(createConnection(getConnectionOptions()));
    } else {
        runBackgroundThread();
    }
}

export function getConnectionOptions(): ConnectionOptions {
    return { cancellationStrategy: getCancellationStrategyFromArgv(process.argv) };
}
