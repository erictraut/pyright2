/*
 * testLanguageService.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Test mock that implements LanguageServiceInterface
 */

import { CancellationToken, CodeAction, ExecuteCommandParams } from 'vscode-languageserver';

import { Uri } from 'commonUtils/uri/uri.js';
import { CommandController } from 'langserver/commands/commandController.js';
import { CodeActionProvider } from 'langserver/providers/codeActionProvider.js';
import { LanguageServerInterface, LanguageServerSettings } from 'langserver/server/languageServerInterface.js';
import { WellKnownWorkspaceKinds, Workspace, createInitStatus } from 'langserver/server/workspaceFactory.js';
import { HostSpecificFeatures } from 'langserver/tests/harness/fourslash/testState.js';
import path from 'path';
import { typeshedFallback } from 'typeserver/common/pathConsts.js';
import { Range } from 'typeserver/common/textRange.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { ConsoleInterface } from 'typeserver/extensibility/console.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { FileSystem } from 'typeserver/files/fileSystem.js';
import { UriEx } from 'typeserver/files/uriUtils.js';
import { TypeService, TypeServiceOptions } from 'typeserver/service/typeService.js';
import { fileURLToPath } from 'url';

export class TestFeatures implements HostSpecificFeatures {
    getCodeActionsForPosition(
        workspace: Workspace,
        fileUri: Uri,
        range: Range,
        token: CancellationToken
    ): Promise<CodeAction[]> {
        return CodeActionProvider.getCodeActionsForPosition(workspace, fileUri, range, undefined, token);
    }
    execute(ls: LanguageServerInterface, params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        const controller = new CommandController(ls);
        return controller.execute(params, token);
    }
}

export class TestLanguageService implements LanguageServerInterface {
    readonly supportAdvancedEdits = true;
    readonly extensionManager: ExtensionManager;

    private readonly _workspace: Workspace;
    private readonly _defaultWorkspace: Workspace;

    constructor(
        workspace: Workspace,
        readonly console: ConsoleInterface,
        readonly fs: FileSystem,
        options?: TypeServiceOptions
    ) {
        this._workspace = workspace;
        this.extensionManager = this._workspace.service.extensionManager;

        // Determine the of the typeshed-fallback in the real file system.
        // Assume the typeshed-fallback path is relative to the current directory.
        const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
        const typeshedPath = path.resolve(currentDir, `../../${typeshedFallback}`);
        const typeshedFallbackLoc = UriEx.file(typeshedPath);

        this._defaultWorkspace = {
            workspaceName: '',
            rootUri: undefined,
            kinds: [WellKnownWorkspaceKinds.Test],
            service: new TypeService(
                'test service',
                this.extensionManager,
                options ?? {
                    typeshedFallbackLoc,
                    console: this.console,
                    configOptions: new ConfigOptions(Uri.empty()),
                    fileSystem: this.fs,
                }
            ),
            disableLanguageServices: false,
            disableTaggedHints: false,
            disableWorkspaceSymbol: false,
            isInitialized: createInitStatus(),
            searchPathsToWatch: [],
        };
    }

    getWorkspaces(): Promise<Workspace[]> {
        return Promise.resolve([this._workspace, this._defaultWorkspace]);
    }

    getWorkspaceForFile(uri: Uri): Promise<Workspace> {
        if (uri.startsWith(this._workspace.rootUri)) {
            return Promise.resolve(this._workspace);
        }

        return Promise.resolve(this._defaultWorkspace);
    }

    getSettings(_workspace: Workspace): Promise<LanguageServerSettings> {
        const settings: LanguageServerSettings = {
            venvPath: this._workspace.service.getConfigOptions().venvPath,
            pythonPath: this._workspace.service.getConfigOptions().pythonPath,
            typeshedPath: this._workspace.service.getConfigOptions().typeshedPath,
            openFilesOnly: this._workspace.service.getConfigOptions().checkOnlyOpenFiles,
            useLibraryCodeForTypes: this._workspace.service.getConfigOptions().useLibraryCodeForTypes,
            disableLanguageServices: this._workspace.disableLanguageServices,
            disableTaggedHints: this._workspace.disableTaggedHints,
            autoImportCompletions: this._workspace.service.getConfigOptions().autoImportCompletions,
            functionSignatureDisplay: this._workspace.service.getConfigOptions().functionSignatureDisplay,
        };

        return Promise.resolve(settings);
    }

    reanalyze(): void {
        // Don't do anything
    }

    restart(): void {
        // Don't do anything
    }
}
