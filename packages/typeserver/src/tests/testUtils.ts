/*
 * testUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Utility functions that are common to a bunch of the tests.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Diagnostic, DiagnosticCategory } from 'typeserver/common/diagnostic.js';
import { DiagnosticSink } from 'typeserver/common/diagnosticSink.js';
import { typeshedFallback } from 'typeserver/common/pathConsts.js';
import { ConfigOptions, ExecutionEnvironment, getStandardDiagnosticRuleSet } from 'typeserver/config/configOptions.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { FullAccessPythonEnvProvider } from 'typeserver/extensibility/pythonEnvProvider.js';
import { RealTempFile, createFromRealFileSystem } from 'typeserver/files/realFileSystem.js';
import { UriEx } from 'typeserver/files/uriUtils.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { ParseFileResults, ParseOptions, Parser, ParserOutput } from 'typeserver/parser/parser.js';
import { NameTypeWalker } from 'typeserver/parser/testWalker.js';
import { Program } from 'typeserver/program/program.js';
import { ConsoleWithLogLevel, NullConsole } from 'typeserver/utils/console.js';
import { fail } from 'typeserver/utils/debug.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface FileAnalysisResult {
    fileUri: Uri;
    parseResults?: ParseFileResults | undefined;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    infos: Diagnostic[];
    unusedCodes: Diagnostic[];
    unreachableCodes: Diagnostic[];
    deprecateds: Diagnostic[];
}

export function resolveSampleFilePath(fileName: string): string {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(currentDir, `./samples/${fileName}`);
}

export function readSampleFile(fileName: string): string {
    const filePath = resolveSampleFilePath(fileName);

    try {
        return fs.readFileSync(filePath, { encoding: 'utf8' });
    } catch {
        console.error(`Could not read file "${fileName}"`);
        return '';
    }
}

export function parseText(
    textToParse: string,
    diagSink: DiagnosticSink,
    parseOptions: ParseOptions = new ParseOptions()
): ParseFileResults {
    const parser = new Parser();
    return parser.parseSourceFile(textToParse, parseOptions, diagSink);
}

export function parseSampleFile(
    fileName: string,
    diagSink: DiagnosticSink,
    execEnvironment = new ExecutionEnvironment(
        'python',
        UriEx.file('.'),
        getStandardDiagnosticRuleSet(),
        /* defaultPythonVersion */ undefined,
        /* defaultPythonPlatform */ undefined,
        /* defaultExtraPaths */ undefined
    )
): ParseFileResults {
    const text = readSampleFile(fileName);
    const parseOptions = new ParseOptions();
    if (fileName.endsWith('pyi')) {
        parseOptions.isStubFile = true;
    }
    parseOptions.pythonVersion = execEnvironment.pythonVersion;
    return parseText(text, diagSink, parseOptions);
}

function getTypeshedFallbackVirtualLoc(): Uri {
    // Assume the typeshed-fallback path is relative to the current directory.
    const typeshedPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../${typeshedFallback}`);
    return UriEx.file(typeshedPath);
}

export function typeAnalyzeSampleFiles(
    fileNames: string[],
    configOptions = new ConfigOptions(Uri.empty(), getTypeshedFallbackVirtualLoc()),
    console?: ConsoleWithLogLevel
): FileAnalysisResult[] {
    // Always enable "test mode".
    configOptions.internalTestMode = true;
    if (!configOptions.typeshedFallbackPath) {
        configOptions.typeshedFallbackPath = getTypeshedFallbackVirtualLoc();
    }

    const tempFile = new RealTempFile();
    const fs = createFromRealFileSystem(tempFile);
    const em = new ExtensionManager(fs, console ?? new NullConsole(), tempFile, new FullAccessPythonEnvProvider());
    em.tempFile = tempFile;
    const importResolver = new ImportResolver(em, configOptions);

    const program = new Program(importResolver, configOptions, em);
    const fileUris = fileNames.map((name) => UriEx.file(resolveSampleFilePath(name)));
    program.setTrackedFiles(fileUris);

    // Set a "pre-check callback" so we can evaluate the types of each NameNode
    // prior to checking the full document. This will exercise the contextual
    // evaluation logic.
    program.setPreCheckCallback((parserOutput: ParserOutput, evaluator: TypeEvaluator) => {
        const nameTypeWalker = new NameTypeWalker(evaluator);
        nameTypeWalker.walk(parserOutput.parseTree);
    });

    const results = getAnalysisResults(program, fileUris, configOptions);

    program.dispose();

    return results;
}

export function getAnalysisResults(
    program: Program,
    fileUris: Uri[],
    configOptions = new ConfigOptions(Uri.empty(), getTypeshedFallbackVirtualLoc())
): FileAnalysisResult[] {
    // Always enable "test mode".
    configOptions.internalTestMode = true;

    while (program.analyze()) {
        // Continue to call analyze until it completes. Since we're not
        // specifying a timeout, it should complete the first time.
    }

    const sourceFiles = fileUris.map((filePath) => program.getSourceFile(filePath));
    return sourceFiles.map((sourceFile, index) => {
        if (sourceFile) {
            const diagnostics = sourceFile.getDiagnostics(configOptions) || [];
            const analysisResult: FileAnalysisResult = {
                fileUri: sourceFile.getUri(),
                parseResults: sourceFile.getParseResults(),
                errors: diagnostics.filter((diag) => diag.category === DiagnosticCategory.Error),
                warnings: diagnostics.filter((diag) => diag.category === DiagnosticCategory.Warning),
                infos: diagnostics.filter((diag) => diag.category === DiagnosticCategory.Information),
                unusedCodes: diagnostics.filter((diag) => diag.category === DiagnosticCategory.UnusedCode),
                unreachableCodes: diagnostics.filter((diag) => diag.category === DiagnosticCategory.UnreachableCode),
                deprecateds: diagnostics.filter((diag) => diag.category === DiagnosticCategory.Deprecated),
            };
            return analysisResult;
        }

        fail(`Source file not found for ${fileUris[index]}`);
    });
}

export function validateResults(
    results: FileAnalysisResult[],
    errorCount: number,
    warningCount = 0,
    infoCount?: number,
    unusedCode?: number,
    unreachableCode?: number,
    deprecated?: number
) {
    assert.strictEqual(results.length, 1);

    if (results[0].errors.length !== errorCount) {
        logDiagnostics(results[0].errors);
        assert.fail(`Expected ${errorCount} errors, got ${results[0].errors.length}`);
    }

    if (results[0].warnings.length !== warningCount) {
        logDiagnostics(results[0].warnings);
        assert.fail(`Expected ${warningCount} warnings, got ${results[0].warnings.length}`);
    }

    if (infoCount !== undefined) {
        if (results[0].infos.length !== infoCount) {
            logDiagnostics(results[0].infos);
            assert.fail(`Expected ${infoCount} infos, got ${results[0].infos.length}`);
        }
    }

    if (unusedCode !== undefined) {
        if (results[0].unusedCodes.length !== unusedCode) {
            logDiagnostics(results[0].unusedCodes);
            assert.fail(`Expected ${unusedCode} unused, got ${results[0].unusedCodes.length}`);
        }
    }

    if (unreachableCode !== undefined) {
        if (results[0].unreachableCodes.length !== unreachableCode) {
            logDiagnostics(results[0].unreachableCodes);
            assert.fail(`Expected ${unreachableCode} unreachable, got ${results[0].unreachableCodes.length}`);
        }
    }

    if (deprecated !== undefined) {
        if (results[0].deprecateds.length !== deprecated) {
            logDiagnostics(results[0].deprecateds);
            assert.fail(`Expected ${deprecated} deprecated, got ${results[0].deprecateds.length}`);
        }
    }
}

function logDiagnostics(diags: Diagnostic[]) {
    for (const diag of diags) {
        console.error(`   [${diag.range.start.line + 1}:${diag.range.start.character + 1}] ${diag.message}`);
    }
}
