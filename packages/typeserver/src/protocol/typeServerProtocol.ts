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
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions } from 'typeserver/program/program.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface ITypeServer {
    // TODO - remove this and replace by individual calls
    readonly evaluator: TypeEvaluator | undefined;

    // TODO - see if these are needed and remove if not. If they
    // are needed, make sure the interface makes sense.
    getParseResults(fileUri: Uri): ParseFileResults | undefined;
    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined;
    getSourceMapper(fileUri: Uri, preferStubs: boolean, token: CancellationToken): SourceMapper;

    // Returns a source file if the type server knows about it. This means
    // it must be part of the project (as defined by the "include" and "exclude")
    // or imported transitively by a source file that is part of the project or
    // explicitly opened by the client. If the type server is still in the process
    // of analyzing the files in the project, it may not yet know about the file.
    getSourceFile(fileUri: Uri): ITypeServerSourceFile | undefined;

    // Returns a list of source files that the type server knows about.
    // This includes all files that are part of the project (as defined by the
    // "include" and "exclude" settings) and all files that are imported transitively
    // by a source file that is part of the project or explicitly opened by the client.
    // The list may be incomplete if the type server is still in the process
    // of analyzing the files in the project.
    getSourceFiles(options?: SourceFilesOptions): readonly ITypeServerSourceFile[];

    // Converts a URI in the type server's virtual file system to a URI in the
    // real file system. If the URI cannot be converted (e.g. it points to a
    // file within a zip container), it returns undefined.
    convertToRealUri(fileUri: Uri): Uri | undefined;

    // Provides information useful for auto inserting an "from <module> import x"
    // statement that targets a specified source file.
    getAutoImportInfo(fileUri: Uri, targetImportUri: Uri): AutoImportInfo | undefined;

    // Provides a list of potential completions for a partial module name
    // within an import statement. The partialModuleName is a string of the
    // module name (perhaps partially complete) within an import statement. For
    // example, "..x.y" or "a.b.". It returns a map where the keys are
    // identifiers that can be used to complete the next part of the module
    // name and are associated with the URI of the module that this name references.
    getImportCompletions(fileUri: Uri, partialModuleName: string): Map<string, Uri>;

    // TODO - see if these are needed and remove if not. If they
    // are needed, make sure the interface makes sense.
    addInterimFile(uri: Uri): void;
    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void;
}

export type ImportCategory = 'stdlib' | 'external' | 'local' | 'local-stub';

export type SourceFileFilter = 'all' | 'inProject' | 'checked';

export interface SourceFilesOptions {
    filter?: SourceFileFilter;
}

export interface AutoImportInfo {
    // The multi-part name used in an "import" statement to import the target module.
    moduleName: string;

    // The category of the import. This can be used to determine how to sort
    // the inserted import statement.
    // stdlib - standard library module
    // external - third-party module
    // local - local module (within the project)
    // local-stub - local stub file found in the typings directory
    category: ImportCategory;
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
