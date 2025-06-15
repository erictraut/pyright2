/*
 * languageServerInterface.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Interface for language server
 */

import { ConsoleInterface, LogLevel } from 'commonUtils/console.js';
import { Workspace } from 'langserver/server/workspaceFactory.js';
import { TaskListToken } from 'typeserver/common/diagnostic.js';
import { DiagnosticBooleanOverridesMap, DiagnosticSeverityOverridesMap } from 'typeserver/config/commandLineOptions.js';
import { SignatureDisplayType } from 'typeserver/config/configOptions.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IFileSystem } from 'typeserver/files/fileSystem.js';
import { FileWatcherHandler } from 'typeserver/files/fileWatcher.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface LanguageServerSettings {
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
    fs: IFileSystem | undefined;
}

export interface LanguageServerOptions {
    productName: string;
    version: string;
    typeshedFallbackLoc: Uri;
    extensionManager: ExtensionManager;
    fileWatcherHandler: FileWatcherHandler;
}

export interface LanguageServerInterface {
    readonly console: ConsoleInterface;
    readonly supportAdvancedEdits: boolean;
    readonly extensionManager: ExtensionManager;

    reanalyze(): void;
    restart(): void;

    getWorkspaces(): Promise<Workspace[]>;
    getSettings(workspace: Workspace): Promise<LanguageServerSettings>;
    getWorkspaceForFile(fileUri: Uri, pythonPath?: Uri): Promise<Workspace>;
}

export interface CommandService {
    sendCommand(id: string, ...args: string[]): void;
}
