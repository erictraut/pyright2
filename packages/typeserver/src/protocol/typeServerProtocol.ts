/*
 * typeServerProtocol.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Defines interfaces and types used in the TypeServer protocol (TSP).
 */

import { SymbolTable } from 'typeserver/binder/symbol.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions } from 'typeserver/program/program.js';
import { IPythonMode } from 'typeserver/program/sourceFile.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { CancellationToken } from 'vscode-languageserver';

export interface ITypeServer {
    readonly evaluator: TypeEvaluator | undefined;
    readonly configOptions: ConfigOptions;
    readonly importResolver: ImportResolver;
    readonly fileSystem: IReadOnlyFileSystem;
    readonly extensionManager: ExtensionManager;

    // owns(uri: Uri): boolean;
    getSourceFileInfoList(): readonly ITypeServerSourceFile[];
    getParseResults(fileUri: Uri): ParseFileResults | undefined;
    getSourceFileInfo(fileUri: Uri): ITypeServerSourceFile | undefined;
    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined;
    getSourceMapper(fileUri: Uri, token: CancellationToken, mapCompiled?: boolean, preferStubs?: boolean): SourceMapper;

    // See whether we can get rid of these methods
    handleMemoryHighUsage(): void;

    addInterimFile(uri: Uri): void;
    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void;
}

export interface ITypeServerSourceFile {
    readonly uri: Uri;
    readonly contents: string;
    readonly ipythonMode: IPythonMode;

    // Information about the source file
    readonly isTypeshedFile: boolean;
    readonly isThirdPartyImport: boolean;
    readonly clientVersion: number | undefined;

    readonly chainedSourceFile?: ITypeServerSourceFile | undefined;

    readonly isTracked: boolean;
    readonly isOpenByClient: boolean;

    readonly imports: readonly ITypeServerSourceFile[];
    readonly importedBy: readonly ITypeServerSourceFile[];
    readonly shadows: readonly ITypeServerSourceFile[];
}
