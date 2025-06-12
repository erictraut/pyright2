/*
 * languageServerInterface.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Interface for language server
 */

import { TaskListToken } from 'typeserver/common/diagnostic.ts';
import { DiagnosticBooleanOverridesMap, DiagnosticSeverityOverridesMap } from 'typeserver/config/commandLineOptions.ts';
import { SignatureDisplayType } from 'typeserver/config/configOptions.ts';
import { ConsoleInterface, LogLevel } from 'typeserver/extensibility/console.ts';
import { ServiceProvider } from 'typeserver/extensibility/serviceProvider.ts';
import { FileSystem } from 'typeserver/files/fileSystem.ts';
import { FileWatcherHandler } from 'typeserver/files/fileWatcher.ts';
import { Uri } from 'typeserver/files/uri/uri.ts';
import { MaxAnalysisTime } from 'typeserver/program/program.ts';
import { Workspace } from '../server/workspaceFactory.ts';

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
    disableOrganizeImports?: boolean | undefined;
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
    //backgroundAnalysis: IBackgroundAnalysis | undefined;
}

export interface ServerOptions {
    productName: string;
    rootDirectory: Uri;
    version: string;
    serviceProvider: ServiceProvider;
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
    readonly serviceProvider: ServiceProvider;

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

export namespace CommandService {
    export function is(obj: any): obj is CommandService {
        return !!obj && obj.sendCommand !== undefined;
    }
}
