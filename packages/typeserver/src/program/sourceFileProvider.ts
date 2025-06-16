/*
 * sourceFileProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements the ITypeServerSourceFile interface by wrapping the internal
 * SourceFileInfo object.
 */

import { Program } from 'typeserver/program/program.js';
import { IPythonMode } from 'typeserver/program/sourceFile.js';
import { SourceFileInfo } from 'typeserver/program/sourceFileInfo.js';
import { ITypeServerSourceFile } from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export class SourceFileProvider implements ITypeServerSourceFile {
    constructor(private _program: Program, private _sourceFileInfo: SourceFileInfo) {}

    get uri(): Uri {
        return this._sourceFileInfo.uri;
    }

    get inProject(): boolean {
        return this._sourceFileInfo.isUserCode;
    }

    get notebookCell(): boolean {
        return this._sourceFileInfo.ipythonMode === IPythonMode.CellDocs;
    }

    get previousCell(): Uri | undefined {
        const prevCell = this._sourceFileInfo.chainedSourceFile;
        if (!prevCell) {
            return undefined;
        }

        return prevCell.uri;
    }

    get clientVersion(): number | undefined {
        return this._sourceFileInfo.clientVersion;
    }

    getContents(): string {
        return this._sourceFileInfo.contents;
    }

    getImports(): ITypeServerSourceFile[] {
        return this._sourceFileInfo.imports.map((f) => new SourceFileProvider(this._program, f));
    }

    getImportedBy(): ITypeServerSourceFile[] {
        return this._sourceFileInfo.importedBy.map((f) => new SourceFileProvider(this._program, f));
    }

    getImplementation(): ITypeServerSourceFile[] {
        return this._sourceFileInfo.shadows.map((shadowedFile) => {
            return new SourceFileProvider(this._program, shadowedFile);
        });
    }
}
