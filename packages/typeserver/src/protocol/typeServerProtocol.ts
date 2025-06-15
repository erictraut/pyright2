/*
 * typeServerProtocol.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Defines interfaces and types used in the TypeServer protocol (TSP).
 */

import { CancellationToken } from 'vscode-languageserver';

import { SymbolTable } from 'typeserver/binder/symbol.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions } from 'typeserver/program/program.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface ITypeServer {
    readonly evaluator: TypeEvaluator | undefined;
    readonly configOptions: ConfigOptions;
    readonly importResolver: ImportResolver;
    readonly fileSystem: IReadOnlyFileSystem;
    readonly extensionManager: ExtensionManager;

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
    // Location within the type server's virtual file system. This may
    // be different from the real file system location, since the server
    // may do remapping (e.g. for partial stubs or source files located
    // within zip files).
    readonly uri: Uri;

    // Is the file part of the project as defined by the "include" and "exclude"
    // settings? These files are checked, and diagnostics are reported for them.
    readonly inProject: boolean;

    // Does this source "file" represent a cell within an iPython notebook?
    // If so, it is modeled as a chain of related source files. If it's not
    // the first cell, it will have a previousCell.
    readonly notebookCell: boolean;
    readonly previousCell?: Uri;

    // If the source file is opened in the client, this is the document version
    // supplied by the client. If the file is not open, this will be undefined.
    readonly clientVersion?: number;

    // Returns the text contents of the source file which may come from the
    // file system or from the client (if it's currently open).
    getContents(): string;

    // Returns the list of source files that are imported by this file through
    // explicit import statements or implicitly (such as the builtins module).
    // If recursive is true, it will return all imports transitively.
    getImports(recursive?: boolean): ITypeServerSourceFile[];

    // Returns the list of source files within the project that import this file.
    // If recursive is true, it will return all source files that import this
    // file transitively.
    getImportedBy(recursive?: boolean): ITypeServerSourceFile[];

    // If this file is a type stub, this returns the source files that are likely
    // to contain the implementation of that stub. Mapping of implementation
    // files may not be possible or completely accurate in all cases.
    getImplementation(): ITypeServerSourceFile[];
}
