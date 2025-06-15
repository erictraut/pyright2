/*
 * typeServerProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements the ITypeServer interface by wrapping the internal Program object.
 */

import { CancellationToken } from 'vscode-languageserver';

import { SymbolTable } from 'typeserver/binder/symbol.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions, Program } from 'typeserver/program/program.js';
import { SourceFileProvider } from 'typeserver/program/sourceFileProvider.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { ITypeServer, ITypeServerSourceFile } from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export class TypeServerProvider implements ITypeServer {
    constructor(private _program: Program) {}

    get evaluator(): TypeEvaluator | undefined {
        return this._program.evaluator;
    }

    get configOptions(): ConfigOptions {
        return this._program.configOptions;
    }

    get importResolver(): ImportResolver {
        return this._program.importResolver;
    }

    get fileSystem(): IReadOnlyFileSystem {
        return this._program.fileSystem;
    }

    get extensionManager(): ExtensionManager {
        return this._program.extensionManager;
    }

    getSourceFileInfoList(): readonly ITypeServerSourceFile[] {
        return this._program.getSourceFileInfoList().map((fileInfo) => new SourceFileProvider(this._program, fileInfo));
    }

    getParseResults(fileUri: Uri): ParseFileResults | undefined {
        return this._program.getParseResults(fileUri);
    }

    getSourceFileInfo(fileUri: Uri): ITypeServerSourceFile | undefined {
        const sourceInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceInfo) {
            return undefined;
        }

        return new SourceFileProvider(this._program, sourceInfo);
    }

    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined {
        return this._program.getModuleSymbolTable(fileUri);
    }

    getSourceMapper(
        fileUri: Uri,
        token: CancellationToken,
        mapCompiled?: boolean,
        preferStubs?: boolean
    ): SourceMapper {
        return this._program.getSourceMapper(fileUri, token, mapCompiled, preferStubs);
    }

    handleMemoryHighUsage(): void {
        this._program.handleMemoryHighUsage();
    }

    addInterimFile(uri: Uri): void {
        this._program.addInterimFile(uri);
    }

    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void {
        this._program.setFileOpened(fileUri, version, contents, options);
    }
}
