/*
 * nodeMain.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides the main entrypoint to the server when running in Node.
 */

import { ConnectionOptions } from 'vscode-languageserver';
import { createConnection } from 'vscode-languageserver/node';

import { ConsoleWithLogLevel } from 'commonUtils/console.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { LanguageServer } from 'langserver/server/languageServer.js';
import { LanguageServerOptions } from 'langserver/server/languageServerInterface.js';
import path from 'path';
import { typeshedFallback } from 'typeserver/common/pathConsts.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import {
    FileBasedCancellationProvider,
    getCancellationStrategyFromArgv,
} from 'typeserver/extensibility/fileBasedCancellationUtils.js';
import { FullAccessPythonEnvProvider } from 'typeserver/extensibility/pythonEnvProvider.js';
import { PyrightFileSystem } from 'typeserver/files/pyrightFileSystem.js';
import {
    createFromRealFileSystem,
    RealTempFile,
    WorkspaceFileWatcherProvider,
} from 'typeserver/files/realFileSystem.js';
import { initializeDependencies } from 'typeserver/service/asyncInitialization.js';
import { fileURLToPath } from 'url';

export async function main() {
    await initializeDependencies();

    const connectionOptions: ConnectionOptions = {
        cancellationStrategy: getCancellationStrategyFromArgv(process.argv),
    };

    const conn = createConnection(connectionOptions);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    //const version = require('typeserver/package.json').version || '';
    // TODO - fix the version retrieval logic
    const version = 'Unknown Version';

    const tempFile = new RealTempFile();
    const console = new ConsoleWithLogLevel(conn.console);
    const fileWatcherHandler = new WorkspaceFileWatcherProvider();
    const fileSystem = createFromRealFileSystem(tempFile, console, fileWatcherHandler);
    const pyrightFs = new PyrightFileSystem(fileSystem);

    const extensionManager = new ExtensionManager(pyrightFs, console, tempFile, new FullAccessPythonEnvProvider());
    extensionManager.tempFile = tempFile;
    extensionManager.cancellation = new FileBasedCancellationProvider();

    const dirPath = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    const rootDirectory = Uri.file(dirPath, extensionManager.caseSensitivity);
    const typeshedFallbackLoc = rootDirectory.combinePaths(typeshedFallback);

    // Set the working directory to a known location within
    // the extension directory. Otherwise the execution of
    // Python can have unintended and surprising results.
    pyrightFs.chdir(rootDirectory);

    const lsOptions: LanguageServerOptions = {
        productName: 'Pyright',
        version,
        fileWatcherHandler,
        typeshedFallbackLoc,
        extensionManager,
    };

    new LanguageServer(lsOptions, conn);
}
