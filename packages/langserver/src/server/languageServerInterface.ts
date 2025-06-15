/*
 * languageServerInterface.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Interface for language server
 */

import { Uri } from 'commonUtils/uri/uri.js';
import { Workspace } from 'langserver/server/workspaceFactory.js';
import { TaskListToken } from 'typeserver/common/diagnostic.js';
import { DiagnosticBooleanOverridesMap, DiagnosticSeverityOverridesMap } from 'typeserver/config/commandLineOptions.js';
import { SignatureDisplayType } from 'typeserver/config/configOptions.js';
import { ConsoleInterface, LogLevel } from 'typeserver/extensibility/console.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { FileSystem } from 'typeserver/files/fileSystem.js';
import { FileWatcherHandler } from 'typeserver/files/fileWatcher.js';
import { MaxAnalysisTime } from 'typeserver/program/program.js';

export interface ServerSettings {
    venvPath?: Uri | undefined;
    pythonPath?: Uri | undefined;
    typeshedPath?: Uri | undefined;
    stubPath?: Uri | undefined;
    openFilesOnly?: boolean | undefined;
    typeCheckingMode?: string | undefined;
    useLibraryCodeForTypes?: boolean | undefined;
    disableLanguageServices?: boolean | undefined;
    disableTaggedHints?: boolean | undefined;
    autoSearchPaths?: boolean | undefined;
    extraPaths?: Uri[] | undefined;
    watchForSourceChanges?: boolean | undefined;
    watchForLibraryChanges?: boolean | undefined;
    watchForConfigChanges?: boolean | undefined;
    diagnosticSeverityOverrides?: DiagnosticSeverityOverridesMap | undefined;
    diagnosticBooleanOverrides?: DiagnosticBooleanOverridesMap | undefined;
    logLevel?: LogLevel | undefined;
    autoImportCompletions?: boolean | undefined;
    indexing?: boolean | undefined;
    logTypeEvaluationTime?: boolean | undefined;
    typeEvaluationTimeThreshold?: number | undefined;
    includeFileSpecs?: string[];
    excludeFileSpecs?: string[];
    ignoreFileSpecs?: string[];
    taskListTokens?: TaskListToken[];
    functionSignatureDisplay?: SignatureDisplayType | undefined;
}

export interface MessageAction {
    title: string;
    [key: string]: string | boolean | number | object;
}

export interface WorkspaceServices {
    fs: FileSystem | undefined;
}

export interface ServerOptions {
    productName: string;
    typeshedFallbackLoc: Uri;
    version: string;
    extensionManager: ExtensionManager;
    fileWatcherHandler: FileWatcherHandler;
    maxAnalysisTimeInForeground?: MaxAnalysisTime;
    disableChecker?: boolean;
    supportedCommands?: string[];
    supportedCodeActions?: string[];
    supportsTelemetry?: boolean;
}

export interface LanguageServerBaseInterface {
    readonly console: ConsoleInterface;
    readonly supportAdvancedEdits: boolean;
    readonly extensionManager: ExtensionManager;

    reanalyze(): void;
    restart(): void;

    getWorkspaces(): Promise<Workspace[]>;
    getSettings(workspace: Workspace): Promise<ServerSettings>;
}

export interface LanguageServerInterface extends LanguageServerBaseInterface {
    getWorkspaceForFile(fileUri: Uri, pythonPath?: Uri): Promise<Workspace>;
}

export interface CommandService {
    sendCommand(id: string, ...args: string[]): void;
}
