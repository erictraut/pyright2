/*
 * fileSystem.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * A file system abstraction that allows for different implementations
 * of a file system, including various forms of mocking or virtualization.
 */

import fs from 'fs';

import { FileWatcher, FileWatcherEventHandler } from 'typeserver/files/fileWatcher.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { Disposable } from 'vscode-jsonrpc';

export interface Stats {
    size: number;
    mtimeMs: number;
    ctimeMs: number;

    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    isZipDirectory?: () => boolean;
}

export interface MkDirOptions {
    recursive: boolean;
    // Not supported on Windows so commented out.
    // mode: string | number;
}

export interface IReadOnlyFileSystem {
    existsSync(uri: Uri): boolean;
    chdir(uri: Uri): void;
    readdirEntriesSync(uri: Uri): fs.Dirent[];
    readdirSync(uri: Uri): string[];
    readFileSync(uri: Uri, encoding?: null): Buffer;
    readFileSync(uri: Uri, encoding: BufferEncoding): string;
    readFileSync(uri: Uri, encoding?: BufferEncoding | null): string | Buffer;

    statSync(uri: Uri): Stats;
    realpathSync(uri: Uri): Uri;
    // Async I/O
    readFile(uri: Uri): Promise<Buffer>;
    readFileText(uri: Uri, encoding?: BufferEncoding): Promise<string>;
    // Return path in casing on OS.
    realCasePath(uri: Uri): Uri;

    // See whether the file is mapped to another location.
    isMappedUri(uri: Uri): boolean;

    // Get original uri if the given uri is mapped.
    getOriginalUri(mappedUri: Uri): Uri;

    // Get mapped uri if the given uri is mapped.
    getMappedUri(originalUri: Uri): Uri;

    isInZip(uri: Uri): boolean;
}

export interface IFileSystem extends IReadOnlyFileSystem {
    mkdirSync(uri: Uri, options?: MkDirOptions): void;
    writeFileSync(uri: Uri, data: string | Buffer, encoding: BufferEncoding | null): void;

    unlinkSync(uri: Uri): void;
    rmdirSync(uri: Uri): void;

    createFileSystemWatcher(uris: Uri[], listener: FileWatcherEventHandler): FileWatcher;
    createReadStream(uri: Uri): fs.ReadStream;
    createWriteStream(uri: Uri): fs.WriteStream;
    copyFileSync(uri: Uri, dst: Uri): void;

    mapDirectory(mappedUri: Uri, originalUri: Uri, filter?: (originalUri: Uri, fs: IFileSystem) => boolean): Disposable;
}

export interface TmpfileOptions {
    postfix?: string;
    prefix?: string;
}

export interface TempFile {
    // The directory returned by tmpdir must exist and be the same each time tmpdir is called.
    tmpdir(): Uri;
    tmpfile(options?: TmpfileOptions): Uri;
}

export class VirtualDirent implements fs.Dirent {
    parentPath: string;

    constructor(public name: string, private _file: boolean, parentPath: string) {
        this.parentPath = parentPath;
    }

    // Alias for `dirent.parentPath`
    get path(): string {
        return this.parentPath;
    }

    isFile(): boolean {
        return this._file;
    }

    isDirectory(): boolean {
        return !this._file;
    }

    isBlockDevice(): boolean {
        return false;
    }

    isCharacterDevice(): boolean {
        return false;
    }

    isSymbolicLink(): boolean {
        return false;
    }

    isFIFO(): boolean {
        return false;
    }

    isSocket(): boolean {
        return false;
    }
}
