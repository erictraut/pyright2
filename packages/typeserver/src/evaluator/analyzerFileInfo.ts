/*
 * analyzerFileInfo.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Information associated with a source file that is used
 * by the binder and checker.
 */

import { Scope } from 'typeserver/binder/scope.js';
import { SymbolTable } from 'typeserver/binder/symbol.js';
import { TextRangeDiagnosticSink } from 'typeserver/common/diagnosticSink.js';
import { PythonVersion, pythonVersion3_14 } from 'typeserver/common/pythonVersion.js';
import { TextRange } from 'typeserver/common/textRange.js';
import { TextRangeCollection } from 'typeserver/common/textRangeCollection.js';
import { DiagnosticRuleSet, ExecutionEnvironment } from 'typeserver/config/configOptions.js';
import { IPythonMode } from 'typeserver/program/sourceFile.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

// Maps import paths to the symbol table for the imported module.
export interface AbsoluteModuleDescriptor {
    importingFileUri: Uri;
    nameParts: string[];
}

export interface LookupImportOptions {
    skipFileNeededCheck: boolean;
    skipParsing?: boolean;
}

export type ImportLookup = (
    fileUriOrModule: Uri | AbsoluteModuleDescriptor,
    options?: LookupImportOptions
) => ImportLookupResult | undefined;

export interface ImportLookupResult {
    symbolTable: SymbolTable;
    dunderAllNames: string[] | undefined;
    usesUnsupportedDunderAllForm: boolean;
    docString: string | undefined;
    isInPyTypedPackage: boolean;
}

export interface AnalyzerFileInfo {
    importLookup: ImportLookup;
    futureImports: Set<string>;
    builtinsScope?: Scope | undefined;
    diagnosticSink: TextRangeDiagnosticSink;
    executionEnvironment: ExecutionEnvironment;
    diagnosticRuleSet: DiagnosticRuleSet;
    lines: TextRangeCollection<TextRange>;
    typingSymbolAliases: Map<string, string>;
    definedConstants: Map<string, boolean | string>;
    fileId: string;
    fileUri: Uri;
    moduleName: string;
    isStubFile: boolean;
    isTypingStubFile: boolean;
    isTypingExtensionsStubFile: boolean;
    isTypeshedStubFile: boolean;
    isBuiltInStubFile: boolean;
    isInPyTypedPackage: boolean;
    ipythonMode: IPythonMode;
    accessedSymbolSet: Set<number>;
}

export function isAnnotationEvaluationPostponed(fileInfo: AnalyzerFileInfo) {
    if (fileInfo.isStubFile) {
        return true;
    }

    if (fileInfo.futureImports.has('annotations')) {
        return true;
    }

    // As of May 2023, the Python steering council has approved PEP 649 for Python 3.13.
    // It was tentatively approved for 3.12, but they decided to defer until the next
    // release to reduce the risk. As of May 8, 2024, the change did not make it into
    // Python 3.13beta1, so it has been deferred to Python 3.14.
    // https://discuss.python.org/t/pep-649-deferred-evaluation-of-annotations-tentatively-accepted/21331
    if (PythonVersion.isGreaterOrEqualTo(fileInfo.executionEnvironment.pythonVersion, pythonVersion3_14)) {
        return true;
    }

    return false;
}
