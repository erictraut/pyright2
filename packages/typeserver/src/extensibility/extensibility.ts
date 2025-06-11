/*
* extensibility.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.

* Language service extensibility.
*/

import { CancellationToken } from 'vscode-languageserver';

import { SymbolTable } from '../binder/symbol';
import { Diagnostic } from '../common/diagnostic';
import { Range } from '../common/textRange';
import { ConfigOptions } from '../config/configOptions';
import { TypeEvaluator } from '../evaluator/typeEvaluatorTypes';
import { ServiceProvider } from '../extensibility/serviceProvider';
import { ReadOnlyFileSystem } from '../files/fileSystem';
import { Uri } from '../files/uri/uri';
import { ImportResolver } from '../imports/importResolver';
import { ParseFileResults, ParserOutput } from '../parser/parser';
import { OpenFileOptions, Program } from '../program/program';
import { IPythonMode } from '../program/sourceFile';
import { SourceMapper } from '../program/sourceMapper';
import { ConsoleInterface } from './console';

export interface ISourceFile {
    // See whether we can convert these to regular properties.
    isStubFile(): boolean;
    isTypingStubFile(): boolean;

    isThirdPartyPyTypedPresent(): boolean;

    getIPythonMode(): IPythonMode;
    getUri(): Uri;
    getFileContent(): string | undefined;
    getClientVersion(): number | undefined;
    getOpenFileContents(): string | undefined;
    getModuleSymbolTable(): SymbolTable | undefined;
    getDiagnostics(options: ConfigOptions): Diagnostic[] | undefined;
    getParserOutput(): ParserOutput | undefined;
}

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
    readonly isThirdPartyPyTypedPresent: boolean;
    readonly isTypingStubFile: boolean;
    readonly hasTypeAnnotations: boolean;
    readonly diagnosticsVersion: number | undefined;
    readonly clientVersion: number | undefined;

    readonly chainedSourceFile?: ISourceFileInfo | undefined;

    readonly isTracked: boolean;
    readonly isOpenByClient: boolean;

    readonly imports: readonly ISourceFileInfo[];
    readonly importedBy: readonly ISourceFileInfo[];
    readonly shadows: readonly ISourceFileInfo[];
    readonly shadowedBy: readonly ISourceFileInfo[];
}

// Readonly wrapper around a Program. Makes sure it doesn't mutate the program.
export interface IProgramView {
    readonly id: string;
    readonly rootPath: Uri;
    readonly console: ConsoleInterface;
    readonly evaluator: TypeEvaluator | undefined;
    readonly configOptions: ConfigOptions;
    readonly importResolver: ImportResolver;
    readonly fileSystem: ReadOnlyFileSystem;
    readonly serviceProvider: ServiceProvider;

    owns(uri: Uri): boolean;
    getSourceFileInfoList(): readonly ISourceFileInfo[];
    getParserOutput(fileUri: Uri): ParserOutput | undefined;
    getParseResults(fileUri: Uri): ParseFileResults | undefined;
    getSourceFileInfo(fileUri: Uri): ISourceFileInfo | undefined;
    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined;
    getChainedUri(fileUri: Uri): Uri | undefined;
    getSourceMapper(fileUri: Uri, token: CancellationToken, mapCompiled?: boolean, preferStubs?: boolean): SourceMapper;

    // Consider getDiagnosticsForRange to call `analyzeFile` automatically if the file is not analyzed.
    analyzeFile(fileUri: Uri, token: CancellationToken): boolean;
    getDiagnosticsForRange(fileUri: Uri, range: Range): Diagnostic[];

    // See whether we can get rid of these methods
    handleMemoryHighUsage(): void;
    clone(): Program;
}

// This exposes some APIs to mutate program. Unlike ProgramMutator, this will only mutate this program
// and doesn't forward the request to the BG thread.
// One can use this when edits are temporary such as `runEditMode` or `test`
export interface IEditableProgram extends IProgramView {
    addInterimFile(uri: Uri): void;
    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void;
    updateChainedUri(fileUri: Uri, chainedUri: Uri | undefined): void;
}
