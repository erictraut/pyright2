/*
 * testLanguageService.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Test mock that implements LanguageServiceInterface
 */

import { CancellationToken, CodeAction, ExecuteCommandParams } from 'vscode-languageserver';

import { ConsoleInterface } from 'commonUtils/console.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { CommandController } from 'langserver/commands/commandController.js';
import { CodeActionProvider } from 'langserver/providers/codeActionProvider.js';
import {
    LanguageServerInterface,
    LanguageServerSettings,
    SignatureDisplayType,
} from 'langserver/server/languageServerInterface.js';
import { WellKnownWorkspaceKinds, Workspace, createInitStatus } from 'langserver/server/workspaceFactory.js';
import { HostSpecificFeatures } from 'langserver/tests/harness/fourslash/testState.js';
import path from 'path';
import { typeshedFallback } from 'typeserver/common/pathConsts.js';
import { Range } from 'typeserver/common/textRange.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IFileSystem } from 'typeserver/files/fileSystem.js';
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
        readonly fs: IFileSystem,
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
                    configOptions: new ConfigOptions(Uri.empty()),
                }
            ),
            disableLanguageServices: false,
            disableTaggedHints: false,
            disableWorkspaceSymbol: false,
            functionSignatureDisplay: SignatureDisplayType.Formatted,
            autoImportCompletions: true,
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
        const configOptions = _workspace.service.getConfigOptions();
        const settings: LanguageServerSettings = {
            venvPath: configOptions.venvPath,
            pythonPath: configOptions.pythonPath,
            typeshedPath: configOptions.typeshedPath,
            openFilesOnly: configOptions.checkOnlyOpenFiles,
            useLibraryCodeForTypes: configOptions.useLibraryCodeForTypes,
            disableLanguageServices: this._workspace.disableLanguageServices,
            disableTaggedHints: this._workspace.disableTaggedHints,
            autoImportCompletions: this._workspace.autoImportCompletions,
            functionSignatureDisplay: this._workspace.functionSignatureDisplay,
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
