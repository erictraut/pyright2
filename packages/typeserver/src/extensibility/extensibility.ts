/*
* extensibility.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.

* Language service extensibility.
*/

import { SymbolTable } from 'typeserver/binder/symbol.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { ReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions } from 'typeserver/program/program.js';
import { IPythonMode } from 'typeserver/program/sourceFile.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { CancellationToken } from 'vscode-languageserver';

export interface ISourceFileInfo {
    // We don't want to expose the real SourceFile since
    // one can mess up program state by calling some methods on it directly.
    // For example, calling sourceFile.parse() directly will mess up
    // dependency graph maintained by the program.
    readonly uri: Uri;
    readonly contents: string;
    readonly ipythonMode: IPythonMode;

    // Information about the source file
    readonly isTypeshedFile: boolean;
    readonly isThirdPartyImport: boolean;
    readonly clientVersion: number | undefined;

    readonly chainedSourceFile?: ISourceFileInfo | undefined;

    readonly isTracked: boolean;
    readonly isOpenByClient: boolean;

    readonly imports: readonly ISourceFileInfo[];
    readonly importedBy: readonly ISourceFileInfo[];
    readonly shadows: readonly ISourceFileInfo[];
}

// Readonly wrapper around a Program. Makes sure it doesn't mutate the program.
export interface IProgramView {
    readonly evaluator: TypeEvaluator | undefined;
    readonly configOptions: ConfigOptions;
    readonly importResolver: ImportResolver;
    readonly fileSystem: ReadOnlyFileSystem;
    readonly extensionManager: ExtensionManager;

    // owns(uri: Uri): boolean;
    getSourceFileInfoList(): readonly ISourceFileInfo[];
    getParseResults(fileUri: Uri): ParseFileResults | undefined;
    getSourceFileInfo(fileUri: Uri): ISourceFileInfo | undefined;
    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined;
    getSourceMapper(fileUri: Uri, token: CancellationToken, mapCompiled?: boolean, preferStubs?: boolean): SourceMapper;

    // See whether we can get rid of these methods
    handleMemoryHighUsage(): void;
}

// This exposes some APIs to mutate program. One can use this when edits are
// temporary such as `runEditMode` or `test`
export interface IEditableProgram extends IProgramView {
    addInterimFile(uri: Uri): void;
    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void;
}
