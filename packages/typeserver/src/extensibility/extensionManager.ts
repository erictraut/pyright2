/*
 * extensionManager.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Container for abstracted extension points used in the type server.
 */

import { CancellationProvider } from 'typeserver/extensibility/cancellationUtils.js';
import { PythonEnvProvider } from 'typeserver/extensibility/pythonEnvProvider.js';
import { IFileSystem, TempFile } from 'typeserver/files/fileSystem.js';
import { CaseSensitivityDetector } from 'typeserver/utils/caseSensitivity.js';
import { ConsoleInterface } from 'typeserver/utils/console.js';

export class ExtensionManager {
    private _fileSystemProvider: IFileSystem;
    private _consoleProvider: ConsoleInterface;
    private _caseSensitivityProvider: CaseSensitivityDetector;
    private _pythonEnvProvider: PythonEnvProvider;

    private _tempFileProvider: TempFile | undefined;
    private _cancellationProvider: CancellationProvider | undefined;

    constructor(
        fileSystemProvider: IFileSystem,
        consoleProvider: ConsoleInterface,
        caseSensitivityProvider: CaseSensitivityDetector,
        pythonEnvProvider: PythonEnvProvider
    ) {
        this._fileSystemProvider = fileSystemProvider;
        this._consoleProvider = consoleProvider;
        this._caseSensitivityProvider = caseSensitivityProvider;
        this._pythonEnvProvider = pythonEnvProvider;
    }

    get fs(): IFileSystem {
        return this._fileSystemProvider;
    }

    set fs(value: IFileSystem) {
        this._fileSystemProvider = value;
    }

    get console(): ConsoleInterface {
        return this._consoleProvider;
    }

    set console(value: ConsoleInterface) {
        this._consoleProvider = value;
    }

    get tempFile(): TempFile | undefined {
        return this._tempFileProvider;
    }

    set tempFile(value: TempFile | undefined) {
        this._tempFileProvider = value;
    }

    get caseSensitivity(): CaseSensitivityDetector {
        return this._caseSensitivityProvider;
    }

    set caseSensitivity(value: CaseSensitivityDetector) {
        this._caseSensitivityProvider = value;
    }

    get cancellation(): CancellationProvider | undefined {
        return this._cancellationProvider;
    }

    set cancellation(value: CancellationProvider) {
        this._cancellationProvider = value;
    }

    get pythonEnv(): PythonEnvProvider {
        return this._pythonEnvProvider;
    }

    set pythonEnv(value: PythonEnvProvider) {
        this._pythonEnvProvider = value;
    }
}
