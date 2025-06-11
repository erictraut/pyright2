/*
 * backgroundAnalysisBase.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * run analyzer from background thread
 */

import { CancellationToken, Disposable } from 'vscode-languageserver';

import { AnalysisCompleteCallback } from './analyzer/analysis';
import { ImportResolver } from './analyzer/importResolver';
import { OpenFileOptions, Program } from './analyzer/program';
import { ConfigOptions } from './common/configOptions';
import { Diagnostic } from './common/diagnostic';
import { Range } from './common/textRange';
import { Uri } from './common/uri/uri';

export interface IBackgroundAnalysis extends Disposable {
    setProgramView(program: Program): void;
    setCompletionCallback(callback?: AnalysisCompleteCallback): void;
    setImportResolver(importResolver: ImportResolver): void;
    setConfigOptions(configOptions: ConfigOptions): void;
    setTrackedFiles(fileUris: Uri[]): void;
    setAllowedThirdPartyImports(importNames: string[]): void;
    ensurePartialStubPackages(executionRoot: string | undefined): void;
    setFileOpened(fileUri: Uri, version: number | null, contents: string, options: OpenFileOptions): void;
    updateChainedUri(fileUri: Uri, chainedUri: Uri | undefined): void;
    setFileClosed(fileUri: Uri, isTracked?: boolean): void;
    addInterimFile(fileUri: Uri): void;
    markAllFilesDirty(evenIfContentsAreSame: boolean): void;
    markFilesDirty(fileUris: Uri[], evenIfContentsAreSame: boolean): void;
    startAnalysis(token: CancellationToken): void;
    analyzeFile(fileUri: Uri, token: CancellationToken): Promise<boolean>;
    analyzeFileAndGetDiagnostics(fileUri: Uri, token: CancellationToken): Promise<Diagnostic[]>;
    getDiagnosticsForRange(fileUri: Uri, range: Range, token: CancellationToken): Promise<Diagnostic[]>;
    writeTypeStub(
        targetImportPath: Uri,
        targetIsSingleFile: boolean,
        stubPath: Uri,
        token: CancellationToken
    ): Promise<any>;
    invalidateAndForceReanalysis(): void;
    restart(): void;
    shutdown(): void;
}
