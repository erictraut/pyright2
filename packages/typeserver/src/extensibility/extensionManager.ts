/*
 * extensionManager.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Container for abstracted extension points used in the type server.
 */

import { CancellationProvider } from 'typeserver/extensibility/cancellationUtils.js';
import { ConsoleInterface } from 'typeserver/extensibility/console.js';
import { CaseSensitivityDetector } from 'typeserver/files/caseSensitivity.js';
import { FileSystem, TempFile } from 'typeserver/files/fileSystem.js';
import { PartialStubService } from 'typeserver/files/partialStubService.js';
import { CacheManager } from 'typeserver/service/cacheManager.js';

export class ExtensionManager {
    private _fileSystemProvider: FileSystem;
    private _consoleProvider: ConsoleInterface;
    private _caseSensitivityProvider: CaseSensitivityDetector; // TODO - remove this

    private _partialStubProvider: PartialStubService | undefined; // TODO - remove this
    private _tempFileProvider: TempFile | undefined;
    private _cacheManagerProvider: CacheManager | undefined; // TODO - remove this
    private _cancellationProvider: CancellationProvider | undefined;

    constructor(
        fileSystemProvider: FileSystem,
        consoleProvider: ConsoleInterface,
        caseSensitivityDetector: CaseSensitivityDetector
    ) {
        this._fileSystemProvider = fileSystemProvider;
        this._consoleProvider = consoleProvider;
        this._caseSensitivityProvider = caseSensitivityDetector;
    }

    get fs(): FileSystem {
        return this._fileSystemProvider;
    }

    set fs(value: FileSystem) {
        this._fileSystemProvider = value;
    }

    get console(): ConsoleInterface {
        return this._consoleProvider;
    }

    set console(value: ConsoleInterface) {
        this._consoleProvider = value;
    }

    get partialStubs(): PartialStubService | undefined {
        return this._partialStubProvider;
    }

    set partialStubs(value: PartialStubService) {
        this._partialStubProvider = value;
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

    get cacheManager(): CacheManager | undefined {
        return this._cacheManagerProvider;
    }

    set cacheManager(value: CacheManager) {
        this._cacheManagerProvider = value;
    }

    get cancellation(): CancellationProvider | undefined {
        return this._cancellationProvider;
    }

    set cancellation(value: CancellationProvider) {
        this._cancellationProvider = value;
    }

    clone(): ExtensionManager {
        const clone = new ExtensionManager(
            this._fileSystemProvider,
            this._consoleProvider,
            this._caseSensitivityProvider
        );

        clone._partialStubProvider = this._partialStubProvider;
        clone._tempFileProvider = this._tempFileProvider;
        clone._cacheManagerProvider = this._cacheManagerProvider;
        clone._cancellationProvider = this._cancellationProvider;

        return clone;
    }
}
