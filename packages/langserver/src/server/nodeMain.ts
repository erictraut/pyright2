/*
 * nodeMain.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides the main entrypoint to the server when running in Node.
 */

import { CodeActionKind, ConnectionOptions } from 'vscode-languageserver';
import { createConnection } from 'vscode-languageserver/node';

import { LanguageServer } from 'langserver/server/languageServer.js';
import { LanguageServerOptions } from 'langserver/server/languageServerInterface.js';
import path from 'path';
import { typeshedFallback } from 'typeserver/common/pathConsts.js';
import { ConsoleWithLogLevel } from 'typeserver/extensibility/console.js';
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
import { Uri } from 'typeserver/utils/uri/uri.js';
import { fileURLToPath } from 'url';

const maxAnalysisTimeInForeground = { openFilesTimeInMs: 50, noOpenFilesTimeInMs: 200 };

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

    const em = new ExtensionManager(pyrightFs, console, tempFile, new FullAccessPythonEnvProvider());
    em.tempFile = tempFile;
    em.cancellation = new FileBasedCancellationProvider();

    const dirPath = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    const rootDirectory = Uri.file(dirPath, em.caseSensitivity);
    const typeshedFallbackLoc = rootDirectory.combinePaths(typeshedFallback);

    const lsOptions: LanguageServerOptions = {
        productName: 'Pyright',
        typeshedFallbackLoc,
        version,
        extensionManager: em,
        fileWatcherHandler,
        maxAnalysisTimeInForeground,
        supportedCodeActions: [CodeActionKind.QuickFix],
    };

    new LanguageServer(lsOptions, conn);
}
