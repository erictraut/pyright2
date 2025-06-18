/*
 * typeServerProtocol.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Defines interfaces and types used in the TypeServer protocol (TSP).
 */

import { CancellationToken } from 'vscode-languageserver';

import { SymbolTable as BinderSymbolTable } from 'typeserver/binder/symbol.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { Type } from 'typeserver/evaluator/types.js';
import { OpenFileOptions } from 'typeserver/program/program.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface ITypeServer {
    // TODO - remove this and replace by individual calls
    readonly evaluator: TypeEvaluator;

    // Accessing Declarations
    //----------------
    // getDeclaration - including resolving alias declarations

    // Accessing Types
    //----------------
    // getContextType
    // getType - makeTopLevelTypeVarsConcrete
    // getTypeOfClass
    // getTypeOfFunction
    // getTypeForDeclaration
    // getTypeOfSymbol
    // getTypeOfMember

    // Operating on Types
    //----------------
    // printType
    // printFunctionParts (tooltipUtils)
    // getCallSignatureInfo
    // getBoundMagicMethod
    // bindFunctionToClassOrObject
    // getTypedDictMembersForClass

    // These should go away
    // lookUpSymbolRecursive
    // transformTypeForEnumMember (completion provider)
    // isFinalVariableDeclaration

    // TODO - replace this Type with a more abstract version
    // Returns the declared type associated with this declaration, if any.
    // Decorators (if present on a function or class declaration) are applied
    // to the type if undecorated is not true.
    getTypeForDecl(decl: Decl, undecorated?: boolean): Type | undefined;

    // TODO - rethink these interfaces.
    getModuleSymbolTable(fileUri: Uri): BinderSymbolTable | undefined;

    // TODO - remove this
    getSourceMapper(fileUri: Uri, preferStubs: boolean, token: CancellationToken): SourceMapper;

    // For a given position, returns a list of declarations for the
    getDeclsForPosition(fileUri: Uri, position: Position, options?: DeclOptions): DeclInfo | undefined;

    // Returns the symbol table for the scope of the specified position. A
    // position of 0, 0 always returns the symbol table for the global
    // (module) scope.
    getSymbolsForScope(fileUri: Uri, position: Position): Symbol[] | undefined;

    // Looks up a single symbol in the scope of the specified position
    lookUpSymbolInScope(fileUri: Uri, position: Position, name: string): Symbol | undefined;

    // Resolve an import declaration to its target declaration by following
    // the import chain. If the import cannot be resolved, it returns undefined.
    // if resolveAliased is true, it will also resolve chains that involve aliased
    // imported symbols (e.g. "import x as y" or "from x import y as z").
    resolveImportDecl(decl: ImportDecl, resolveAliased: boolean): Decl | undefined;

    // Returns a source file if the type server knows about it. This means
    // it must be part of the project (as defined by the "include" and "exclude")
    // or imported transitively by a source file that is part of the project or
    // explicitly opened by the client. If the type server is still in the process
    // of analyzing the files in the project, it may not yet know about the file.
    getSourceFile(fileUri: Uri): ITypeServerSourceFile | undefined;

    // If the specified file is a stub, returns one or more source files that
    // implement the stub. This mapping is imprecise and based on heuristics
    // that take into account the file that is importing the stub (the relativeTo
    // parameter).
    getStubImplementation(fileUri: Uri, relativeTo?: Uri): ITypeServerSourceFile[] | undefined;

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

    // Returns the transitive closure of all source files this source file imports.
    getImportsRecursive(fileUri: Uri): ITypeServerSourceFile[];

    // Returns the list of source files that include this source file in their
    // transitive closure.
    getImportedByRecursive(fileUri: Uri): ITypeServerSourceFile[];

    // TODO - rethink these interfaces.
    addInterimFile(uri: Uri): void;
    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void;
}

export interface Symbol {
    // The symbol name (e.g. "x" or "myFunc")
    name: string;

    // The declarations associated with this symbol
    decls: Decl[];
}

export interface DeclInfo {
    // Symbol name or dictionary key associated with the declarations
    name: string;

    // Range of characters that comprise the value that was used
    // to look up the declaration
    range: Range;

    // One or more declarations with locations
    decls: Decl[];
}

export interface Position {
    line: number; // 0-based line number
    character: number; // 0-based character index within the line
}

export interface Range {
    start: Position; // Start position of the range
    end: Position; // End position of the range
}

export type ImportCategory = 'stdlib' | 'external' | 'local' | 'local-stub';

export type SourceFileFilter = 'all' | 'inProject' | 'checked';

export interface SourceFilesOptions {
    filter?: SourceFileFilter;
}

export interface DeclOptions {
    // Resolve import declarations if possible?
    resolveImports?: boolean;
}

export enum DeclCategory {
    // A "class" statement (or a special form in typing.pyi)
    Class = 'class',

    // A "def" statement
    Function = 'def',

    // A parameter in a "def" or "lambda" statement (with or without a type annotation)
    Parameter = 'parameter',

    // A local variable (with or without a type annotation)
    Variable = 'variable',

    // An "import" or "from ... import" statement
    Import = 'import',

    // A type parameter defined with Python 3.12 generics syntax
    TypeParameter = 'type-parameter',

    // A "type" statement
    TypeAlias = 'type-alias',
}

export interface DeclBase {
    // The category of the declaration based on the statement that defines it
    category: DeclCategory;

    // An ID that can be used to retrieve additional information about
    // the declaration such as its type
    id: string;

    // The Uri of the source file that contains the declaration
    uri: Uri;

    // The range within the file that can be used for "go to declaration"
    // or "get type" operations
    range: Range;

    // The dot-separated import name for the file that contains the declaration
    moduleName: string;
}

export interface ClassDecl extends DeclBase {
    category: DeclCategory.Class;
}

export interface FunctionDecl extends DeclBase {
    category: DeclCategory.Function;

    // Is this a def statement within a class body?
    method: boolean;

    // Does the function include "yield" or "yield from" statements?
    generator: boolean;
}

export interface ParameterDecl extends DeclBase {
    category: DeclCategory.Parameter;
}

export interface VariableDecl extends DeclBase {
    category: DeclCategory.Variable;

    // Is this a variable defined in a __slot__ definition?
    slots: boolean;

    // Is the variable's name in all caps indicating it's a constant?
    constant: boolean;

    // Is the variable declared as final?
    final: boolean;
}

export interface ImportDecl extends DeclBase {
    category: DeclCategory.Import;

    // Set if the import statement uses an "as" clause to rename the imported
    // module or symbol. This applies to both "import X as Y" and "from X import Y as Z".
    // If the import statement does not use an "as" clause, this will be undefined.
    aliasName?: string;
    aliasPosition?: Position;

    // The name of the symbol being imported (for "from ... import X" statements);
    // this doesn't apply to "import X" statements.
    symbolName?: string;

    // Indicates a wildcard import statement
    wildcard?: boolean;
}

export interface TypeParameterDecl extends DeclBase {
    category: DeclCategory.TypeParameter;
}

export interface TypeAliasDecl extends DeclBase {
    category: DeclCategory.TypeAlias;
}

// A declaration that can be returned by the type server.
export type Decl =
    | ClassDecl
    | FunctionDecl
    | ParameterDecl
    | VariableDecl
    | ImportDecl
    | TypeParameterDecl
    | TypeAliasDecl;

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

    // Returns the text of the source file which may come from the
    // file system or from the client (if it's currently open). Optionally,
    // a start and end offset can be provided to return a substring.
    getContents(start?: number, end?: number): string;

    // Returns the list of source files that are directly imported by this file
    // through import statements or implicitly (such as the builtins module).
    getImports(): ITypeServerSourceFile[];

    // Returns the list of source files that directly import this file.
    getImportedBy(): ITypeServerSourceFile[];
}
