/*
 * testLanguageService.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Test mock that implements LanguageServiceInterface
 */

import { CancellationToken, CodeAction, ExecuteCommandParams } from 'vscode-languageserver';

import { CommandController } from 'langserver/commands/commandController.js';
import { CodeActionProvider } from 'langserver/providers/codeActionProvider.js';
import { LanguageServerInterface, ServerSettings } from 'langserver/server/languageServerInterface.js';
import { WellKnownWorkspaceKinds, Workspace, createInitStatus } from 'langserver/server/workspaceFactory.js';
import { HostSpecificFeatures } from 'langserver/tests/harness/fourslash/testState.js';
import { TestAccessHost } from 'langserver/tests/harness/testAccessHost.js';
import { Range } from 'typeserver/common/textRange.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { ConsoleInterface } from 'typeserver/extensibility/console.js';
import { ServiceProvider } from 'typeserver/extensibility/serviceProvider.js';
import { FileSystem } from 'typeserver/files/fileSystem.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { ImportResolverFactory } from 'typeserver/imports/importResolver.js';
import { TypeService, TypeServiceOptions } from 'typeserver/service/typeService.js';

export class TestFeatures implements HostSpecificFeatures {
    importResolverFactory: ImportResolverFactory = TypeService.createImportResolver;

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
    readonly serviceProvider: ServiceProvider;

    private readonly _workspace: Workspace;
    private readonly _defaultWorkspace: Workspace;

    constructor(
        workspace: Workspace,
        readonly console: ConsoleInterface,
        readonly fs: FileSystem,
        options?: TypeServiceOptions
    ) {
        this._workspace = workspace;
        this.serviceProvider = this._workspace.service.serviceProvider;

        this._defaultWorkspace = {
            workspaceName: '',
            rootUri: undefined,
            kinds: [WellKnownWorkspaceKinds.Test],
            service: new TypeService(
                'test service',
                new ServiceProvider(),
                options ?? {
                    console: this.console,
                    hostFactory: () => new TestAccessHost(),
                    importResolverFactory: TypeService.createImportResolver,
                    configOptions: new ConfigOptions(Uri.empty()),
                    fileSystem: this.fs,
                }
            ),
            disableLanguageServices: false,
            disableTaggedHints: false,
            disableOrganizeImports: false,
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

    getSettings(_workspace: Workspace): Promise<ServerSettings> {
        const settings: ServerSettings = {
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
