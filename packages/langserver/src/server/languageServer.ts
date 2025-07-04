/*
 * languageServerBase.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Primary interface and state manager for the language server.
 * It response to LSP requests received from the client.
 */

import {
    AbstractCancellationTokenSource,
    CallHierarchyIncomingCallsParams,
    CallHierarchyItem,
    CallHierarchyOutgoingCall,
    CallHierarchyOutgoingCallsParams,
    CallHierarchyPrepareParams,
    CancellationToken,
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
    CompletionItem,
    CompletionList,
    CompletionParams,
    CompletionTriggerKind,
    ConfigurationItem,
    Connection,
    Declaration,
    DeclarationLink,
    Definition,
    DefinitionLink,
    Diagnostic,
    DiagnosticRelatedInformation,
    DiagnosticSeverity,
    DiagnosticTag,
    DidChangeConfigurationParams,
    DidChangeTextDocumentParams,
    DidChangeWatchedFilesParams,
    DidCloseTextDocumentParams,
    DidOpenTextDocumentParams,
    Disposable,
    DocumentDiagnosticParams,
    DocumentDiagnosticReport,
    DocumentHighlight,
    DocumentHighlightParams,
    DocumentSymbol,
    DocumentSymbolParams,
    ExecuteCommandParams,
    HoverParams,
    InitializeParams,
    InitializeResult,
    LSPObject,
    Location,
    MarkupKind,
    PrepareRenameParams,
    PublishDiagnosticsParams,
    ReferenceParams,
    RemoteWindow,
    RenameParams,
    ResultProgressReporter,
    SignatureHelp,
    SignatureHelpParams,
    SymbolInformation,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    WorkDoneProgressReporter,
    WorkDoneProgressServerReporter,
    WorkspaceDiagnosticParams,
    WorkspaceDocumentDiagnosticReport,
    WorkspaceEdit,
    WorkspaceFoldersChangeEvent,
    WorkspaceSymbol,
    WorkspaceSymbolParams,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { CaseSensitivityDetector } from 'commonUtils/caseSensitivity.js';
import { getNestedProperty } from 'commonUtils/collectionUtils.js';
import { ConsoleInterface, ConsoleWithLogLevel, LogLevel, convertLogLevel } from 'commonUtils/console.js';
import { assert } from 'commonUtils/debug.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { CommandController } from 'langserver/commands/commandController.js';
import { CommandResult } from 'langserver/commands/commandResult.js';
import { CallHierarchyProvider } from 'langserver/providers/callHierarchyProvider.js';
import { CodeActionProvider } from 'langserver/providers/codeActionProvider.js';
import { CompletionItemData, CompletionProvider } from 'langserver/providers/completionProvider.js';
import {
    DefinitionFilter,
    DefinitionProvider,
    TypeDefinitionProvider,
} from 'langserver/providers/definitionProvider.js';
import { DocumentHighlightProvider } from 'langserver/providers/documentHighlightProvider.js';
import { CollectionResult } from 'langserver/providers/documentSymbolCollector.js';
import { DocumentSymbolProvider } from 'langserver/providers/documentSymbolProvider.js';
import { HoverProvider } from 'langserver/providers/hoverProvider.js';
import { WorkspaceParseProvider } from 'langserver/providers/parseProvider.js';
import { ReferencesProvider } from 'langserver/providers/referencesProvider.js';
import { RenameProvider } from 'langserver/providers/renameProvider.js';
import { SignatureHelpProvider } from 'langserver/providers/signatureHelpProvider.js';
import { WorkspaceSymbolProvider } from 'langserver/providers/workspaceSymbolProvider.js';
import { DynamicFeature, DynamicFeatures } from 'langserver/server/dynamicFeature.js';
import { resolvePathWithEnvVariables } from 'langserver/server/envVarUtils.js';
import { FileWatcherDynamicFeature } from 'langserver/server/fileWatcherDynamicFeature.js';
import {
    LanguageServerInterface,
    LanguageServerOptions,
    LanguageServerSettings,
    SignatureDisplayType,
    WorkspaceServices,
} from 'langserver/server/languageServerInterface.js';
import { ClientCapabilities, InitializationOptions } from 'langserver/server/lspTypes.js';
import { fromLSPAny, isNullProgressReporter } from 'langserver/server/lspUtils.js';
import { ProgressReportTracker, ProgressReporter } from 'langserver/server/progressReporter.js';
import { getEffectiveCommandLineOptions } from 'langserver/server/typeServerExecutor.js';
import {
    InitStatus,
    WellKnownWorkspaceKinds,
    Workspace,
    WorkspaceFactory,
} from 'langserver/server/workspaceFactory.js';
import { Diagnostic as AnalyzerDiagnostic, DiagnosticCategory } from 'typeserver/common/diagnostic.js';
import { DiagnosticRule } from 'typeserver/common/diagnosticRules.js';
import { FileDiagnostics } from 'typeserver/common/diagnosticSink.js';
import { DocumentRange } from 'typeserver/common/docRange.js';
import { Position, Range } from 'typeserver/common/textRange.js';
import { DiagnosticSeverityOverrides, getDiagnosticSeverityOverrides } from 'typeserver/config/commandLineOptions.js';
import { ConfigOptions, getDiagLevelDiagnosticRules, parseDiagLevel } from 'typeserver/config/configOptions.js';
import { CancelAfter } from 'typeserver/extensibility/cancellationUtils.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IFileSystem } from 'typeserver/files/fileSystem.js';
import { FileWatcherEventType } from 'typeserver/files/fileWatcher.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { Localizer, setLocaleOverride } from 'typeserver/localization/localize.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { IPythonMode, SourceFile } from 'typeserver/program/sourceFile.js';
import { TypeServerProvider } from 'typeserver/program/typeServerProvider.js';
import { AnalysisResults } from 'typeserver/service/analysis.js';
import { isPythonBinary } from 'typeserver/service/pythonPathUtils.js';
import { TypeService } from 'typeserver/service/typeService.js';
import { isDefined, isString } from 'typeserver/utils/valueTypeUtils.js';

const DiagnosticsVersionNone = -1;

const maxAnalysisTime = { openFilesTimeInMs: 50, noOpenFilesTimeInMs: 200 };

export class LanguageServer implements LanguageServerInterface, Disposable {
    // We support running only one "find all reference" at a time.
    private _pendingFindAllRefsCancellationSource: AbstractCancellationTokenSource | undefined;

    // We support running only one command at a time.
    private _pendingCommandCancellationSource: AbstractCancellationTokenSource | undefined;

    private _progressReporter: ProgressReporter;
    private _progressReportCounter = 0;

    private _lastTriggerKind: CompletionTriggerKind | undefined = CompletionTriggerKind.Invoked;

    private _initialized = false;
    private _workspaceFoldersChangedDisposable: Disposable | undefined;

    private _controller: CommandController;

    protected client: ClientCapabilities = {
        hasConfigurationCapability: false,
        hasVisualStudioExtensionsCapability: false,
        hasWorkspaceFoldersCapability: false,
        hasWatchFileCapability: false,
        hasWatchFileRelativePathCapability: false,
        hasActiveParameterCapability: false,
        hasSignatureLabelOffsetCapability: false,
        hasHierarchicalDocumentSymbolCapability: false,
        hasWindowProgressCapability: false,
        hasGoToDeclarationCapability: false,
        hasDocumentChangeCapability: false,
        hasDocumentAnnotationCapability: false,
        hasCompletionCommitCharCapability: false,
        hoverContentFormat: MarkupKind.PlainText,
        completionDocFormat: MarkupKind.PlainText,
        completionSupportsSnippet: false,
        signatureDocFormat: MarkupKind.PlainText,
        supportsDeprecatedDiagnosticTag: false,
        supportsUnnecessaryDiagnosticTag: false,
        supportsTaskItemDiagnosticTag: false,
        completionItemResolveSupportsAdditionalTextEdits: false,
        usingPullDiagnostics: false,
        requiresPullRelatedInformationCapability: false,
    };

    protected defaultClientConfig: any;

    protected readonly workspaceFactory: WorkspaceFactory;
    protected readonly openFileMap = new Map<string, TextDocument>();
    protected readonly fs: IFileSystem;
    protected readonly caseSensitiveDetector: CaseSensitivityDetector;

    // The URIs for which diagnostics are reported
    protected readonly documentsWithDiagnostics = new Set<string>();

    protected readonly dynamicFeatures = new DynamicFeatures();

    constructor(protected serverOptions: LanguageServerOptions, protected connection: Connection) {
        this.console.info(
            `${serverOptions.productName} language server ${
                serverOptions.version && serverOptions.version + ' '
            }starting`
        );

        this.fs = this.serverOptions.extensionManager.fs;
        this.caseSensitiveDetector = this.serverOptions.extensionManager.caseSensitivity;

        this.workspaceFactory = new WorkspaceFactory(
            this.console,
            this.createTypeServiceForWorkspace.bind(this),
            this.onWorkspaceCreated.bind(this),
            this.onWorkspaceRemoved.bind(this),
            this.extensionManager
        );

        // Set up callbacks.
        const supportedCommands: string[] = [];
        const supportedCodeActions: string[] = [CodeActionKind.QuickFix];
        this.setupConnection(supportedCommands, supportedCodeActions);

        this._progressReporter = new ProgressReportTracker(this.createProgressReporter());

        // Listen on the connection.
        this.connection.listen();

        this._controller = new CommandController(this);
    }

    get console(): ConsoleInterface {
        return this.serverOptions.extensionManager.console;
    }

    // Provides access to the client's window.
    get window(): RemoteWindow {
        return this.connection.window;
    }

    get supportAdvancedEdits(): boolean {
        return this.client.hasDocumentChangeCapability && this.client.hasDocumentAnnotationCapability;
    }

    get extensionManager() {
        return this.serverOptions.extensionManager;
    }

    dispose() {
        this.workspaceFactory.clear();
        this.openFileMap.clear();
        this.dynamicFeatures.unregister();
        this._workspaceFoldersChangedDisposable?.dispose();
    }

    async getSettings(workspace: Workspace): Promise<LanguageServerSettings> {
        const serverSettings: LanguageServerSettings = {
            watchForSourceChanges: true,
            watchForLibraryChanges: true,
            watchForConfigChanges: true,
            openFilesOnly: true,
            useLibraryCodeForTypes: true,
            disableLanguageServices: false,
            disableTaggedHints: false,
            typeCheckingMode: 'standard',
            diagnosticSeverityOverrides: {},
            logLevel: LogLevel.Info,
            autoImportCompletions: true,
            functionSignatureDisplay: SignatureDisplayType.Formatted,
        };

        try {
            const workspaces = this.workspaceFactory.getNonDefaultWorkspaces(WellKnownWorkspaceKinds.Regular);

            const pythonSection = await this.getConfiguration(workspace.rootUri, 'python');
            if (pythonSection) {
                const pythonPath = pythonSection.pythonPath;
                if (pythonPath && isString(pythonPath) && !isPythonBinary(pythonPath)) {
                    serverSettings.pythonPath = resolvePathWithEnvVariables(workspace, pythonPath, workspaces);
                }

                const venvPath = pythonSection.venvPath;
                if (venvPath && isString(venvPath)) {
                    serverSettings.venvPath = resolvePathWithEnvVariables(workspace, venvPath, workspaces);
                }
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace.rootUri, 'python.analysis');
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && Array.isArray(typeshedPaths) && typeshedPaths.length > 0) {
                    const typeshedPath = typeshedPaths[0];
                    if (typeshedPath && isString(typeshedPath)) {
                        serverSettings.typeshedPath = resolvePathWithEnvVariables(workspace, typeshedPath, workspaces);
                    }
                }

                const stubPath = pythonAnalysisSection.stubPath;
                if (stubPath && isString(stubPath)) {
                    serverSettings.stubPath = resolvePathWithEnvVariables(workspace, stubPath, workspaces);
                }

                const diagnosticSeverityOverrides = pythonAnalysisSection.diagnosticSeverityOverrides;
                if (diagnosticSeverityOverrides) {
                    for (const [name, value] of Object.entries(diagnosticSeverityOverrides)) {
                        const ruleName = this.getDiagnosticRuleName(name);
                        const severity = this.getSeverityOverrides(value as string | boolean);
                        if (ruleName && severity) {
                            serverSettings.diagnosticSeverityOverrides![ruleName] = severity!;
                        }
                    }
                }

                if (pythonAnalysisSection.diagnosticMode !== undefined) {
                    serverSettings.openFilesOnly = this.isOpenFilesOnly(pythonAnalysisSection.diagnosticMode);
                } else if (pythonAnalysisSection.openFilesOnly !== undefined) {
                    serverSettings.openFilesOnly = !!pythonAnalysisSection.openFilesOnly;
                }

                if (pythonAnalysisSection.useLibraryCodeForTypes !== undefined) {
                    serverSettings.useLibraryCodeForTypes = !!pythonAnalysisSection.useLibraryCodeForTypes;
                }

                serverSettings.logLevel = convertLogLevel(pythonAnalysisSection.logLevel);
                serverSettings.autoSearchPaths = !!pythonAnalysisSection.autoSearchPaths;

                const extraPaths = pythonAnalysisSection.extraPaths;
                if (extraPaths && Array.isArray(extraPaths) && extraPaths.length > 0) {
                    serverSettings.extraPaths = extraPaths
                        .filter((p) => p && isString(p))
                        .map((p) => resolvePathWithEnvVariables(workspace, p, workspaces))
                        .filter(isDefined);
                }

                serverSettings.includeFileSpecs = this._getStringValues(pythonAnalysisSection.include);
                serverSettings.excludeFileSpecs = this._getStringValues(pythonAnalysisSection.exclude);
                serverSettings.ignoreFileSpecs = this._getStringValues(pythonAnalysisSection.ignore);

                if (pythonAnalysisSection.typeCheckingMode !== undefined) {
                    serverSettings.typeCheckingMode = pythonAnalysisSection.typeCheckingMode;
                }

                if (pythonAnalysisSection.autoImportCompletions !== undefined) {
                    serverSettings.autoImportCompletions = pythonAnalysisSection.autoImportCompletions;
                }

                if (
                    serverSettings.logLevel === LogLevel.Log &&
                    pythonAnalysisSection.logTypeEvaluationTime !== undefined
                ) {
                    serverSettings.logTypeEvaluationTime = pythonAnalysisSection.logTypeEvaluationTime;
                }

                if (pythonAnalysisSection.typeEvaluationTimeThreshold !== undefined) {
                    serverSettings.typeEvaluationTimeThreshold = pythonAnalysisSection.typeEvaluationTimeThreshold;
                }
            } else {
                serverSettings.autoSearchPaths = true;
            }

            const pyrightSection = await this.getConfiguration(workspace.rootUri, 'pyright');
            if (pyrightSection) {
                if (pyrightSection.openFilesOnly !== undefined) {
                    serverSettings.openFilesOnly = !!pyrightSection.openFilesOnly;
                }

                if (pyrightSection.useLibraryCodeForTypes !== undefined) {
                    serverSettings.useLibraryCodeForTypes = !!pyrightSection.useLibraryCodeForTypes;
                }

                serverSettings.disableLanguageServices = !!pyrightSection.disableLanguageServices;
                serverSettings.disableTaggedHints = !!pyrightSection.disableTaggedHints;

                const typeCheckingMode = pyrightSection.typeCheckingMode;
                if (typeCheckingMode && isString(typeCheckingMode)) {
                    serverSettings.typeCheckingMode = typeCheckingMode;
                }
            }
        } catch (error) {
            this.console.error(`Error reading settings: ${error}`);
        }
        return serverSettings;
    }

    createTypeService(name: string, workspaceRoot: Uri, services?: WorkspaceServices): TypeService {
        this.console.info(`Starting service instance "${name}"`);

        const service = new TypeService(name, this.serverOptions.extensionManager, {
            typeshedFallbackLoc: this.serverOptions.typeshedFallbackLoc,
            maxAnalysisTime,
            usingPullDiagnostics: this.client.usingPullDiagnostics,
        });

        service.setCompletionCallback((results) => this.onAnalysisCompletedHandler(service.fs, results));
        return service;
    }

    async getWorkspaces(): Promise<Workspace[]> {
        const workspaces = this.workspaceFactory.items();
        for (const workspace of workspaces) {
            await workspace.isInitialized.promise;
        }

        return workspaces;
    }

    async getWorkspaceForFile(fileUri: Uri, pythonPath?: Uri): Promise<Workspace> {
        return this.workspaceFactory.getWorkspaceForFile(fileUri, pythonPath);
    }

    async getContainingWorkspacesForFile(fileUri: Uri): Promise<Workspace[]> {
        return this.workspaceFactory.getContainingWorkspacesForFile(fileUri);
    }

    reanalyze() {
        this.workspaceFactory.items().forEach((workspace) => {
            workspace.service.invalidateAndForceReanalysis();
        });
    }

    restart() {
        this.workspaceFactory.items().forEach((workspace) => {
            workspace.service.restart();
        });
    }

    updateSettingsForAllWorkspaces(): void {
        const tasks: Promise<void>[] = [];
        this.workspaceFactory.items().forEach((workspace) => {
            // Updating settings can change workspace's file ownership. Make workspace uninitialized so that
            // features can wait until workspace gets new settings.
            // the file's ownership can also changed by `pyrightconfig.json` changes, but those are synchronous
            // operation, so it won't affect this.
            workspace.isInitialized = workspace.isInitialized.reset();
            tasks.push(this.updateSettingsForWorkspace(workspace, workspace.isInitialized));
        });

        Promise.all(tasks).then(() => {
            this.dynamicFeatures.register();
        });
    }

    async updateSettingsForWorkspace(
        workspace: Workspace,
        status: InitStatus | undefined,
        serverSettings?: LanguageServerSettings
    ): Promise<void> {
        try {
            status?.markCalled();

            serverSettings = serverSettings ?? (await this.getSettings(workspace));

            // Set logging level first.
            (this.console as ConsoleWithLogLevel).level = serverSettings.logLevel ?? LogLevel.Info;

            this.dynamicFeatures.update(serverSettings);

            // Then use the updated settings to restart the service.
            this.updateOptionsAndRestartService(workspace, serverSettings);

            workspace.disableLanguageServices = !!serverSettings.disableLanguageServices;
            workspace.disableTaggedHints = !!serverSettings.disableTaggedHints;
            workspace.functionSignatureDisplay =
                serverSettings.functionSignatureDisplay ?? SignatureDisplayType.Formatted;
            workspace.autoImportCompletions = !!serverSettings.autoImportCompletions;
        } finally {
            // Don't use workspace.isInitialized directly since it might have been
            // reset due to pending config change event.
            // The workspace is now open for business.
            status?.resolve();
        }
    }

    updateOptionsAndRestartService(
        workspace: Workspace,
        serverSettings: LanguageServerSettings,
        typeStubTargetImportName?: string
    ) {
        const commandLineOptions = getEffectiveCommandLineOptions(
            workspace.rootUri,
            serverSettings,
            /* trackFiles */ true,
            typeStubTargetImportName,
            /* pythonEnvironmentName */ undefined
        );

        // Setting options causes the analyzer service to re-analyze everything.
        workspace.service.setOptions(commandLineOptions);
        workspace.searchPathsToWatch = workspace.service.librarySearchUrisToWatch ?? [];
    }

    protected executeCommand(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        return this._controller.execute(params, token);
    }

    protected isLongRunningCommand(command: string): boolean {
        return this._controller.isLongRunningCommand(command);
    }

    protected isRefactoringCommand(command: string): boolean {
        return this._controller.isRefactoringCommand(command);
    }

    protected async executeCodeAction(
        params: CodeActionParams,
        token: CancellationToken
    ): Promise<(Command | CodeAction)[] | undefined | null> {
        this.recordUserInteractionTime();

        const uri = Uri.parse(params.textDocument.uri, this.serverOptions.extensionManager.caseSensitivity);
        const workspace = await this.getWorkspaceForFile(uri);
        return CodeActionProvider.getCodeActionsForPosition(workspace, uri, params.range, params.context.only, token);
    }

    protected async getConfiguration(scopeUri: Uri | undefined, section: string): Promise<any> {
        if (this.client.hasConfigurationCapability) {
            const item: ConfigurationItem = {};

            if (scopeUri !== undefined) {
                item.scopeUri = scopeUri.toString();
            }

            if (section !== undefined) {
                item.section = section;
            }

            return this.connection.workspace.getConfiguration(item);
        }

        if (this.defaultClientConfig) {
            return getNestedProperty(this.defaultClientConfig, section);
        }

        return undefined;
    }

    protected isOpenFilesOnly(diagnosticMode: string): boolean {
        return diagnosticMode !== 'workspace';
    }

    protected getSeverityOverrides(value: string | boolean): DiagnosticSeverityOverrides | undefined {
        const enumValue = parseDiagLevel(value);
        if (!enumValue) {
            return undefined;
        }
        if (getDiagnosticSeverityOverrides().includes(enumValue)) {
            return enumValue;
        }

        return undefined;
    }

    protected getDiagnosticRuleName(value: string): DiagnosticRule | undefined {
        const enumValue = value as DiagnosticRule;
        if (getDiagLevelDiagnosticRules().includes(enumValue)) {
            return enumValue;
        }

        return undefined;
    }

    protected createImportResolver(extensionManager: ExtensionManager, options: ConfigOptions): ImportResolver {
        const importResolver = new ImportResolver(extensionManager, options);

        // In case there was cached information in the file system related to
        // import resolution, invalidate it now.
        importResolver.invalidateCache();

        return importResolver;
    }

    protected setupConnection(supportedCommands: string[], supportedCodeActions: string[]): void {
        // After the server has started the client sends an initialize request. The server receives
        // in the passed params the rootPath of the workspace plus the client capabilities.
        this.connection.onInitialize((params) => this.initialize(params, supportedCommands, supportedCodeActions));

        this.connection.onInitialized(() => this.onInitialized());

        this.connection.onDidChangeConfiguration((params) => this.onDidChangeConfiguration(params));

        this.connection.onCodeAction((params, token) => this.executeCodeAction(params, token));

        this.connection.onDefinition(async (params, token) => this.onDefinition(params, token));
        this.connection.onDeclaration(async (params, token) => this.onDeclaration(params, token));
        this.connection.onTypeDefinition(async (params, token) => this.onTypeDefinition(params, token));

        this.connection.onReferences(async (params, token, workDoneReporter, resultReporter) =>
            this.onReferences(params, token, workDoneReporter, resultReporter)
        );

        this.connection.onDocumentSymbol(async (params, token) => this.onDocumentSymbol(params, token));
        this.connection.onWorkspaceSymbol(async (params, token, _, resultReporter) =>
            this.onWorkspaceSymbol(params, token, resultReporter)
        );

        this.connection.onHover(async (params, token) => this.onHover(params, token));

        this.connection.onDocumentHighlight(async (params, token) => this.onDocumentHighlight(params, token));

        this.connection.onSignatureHelp(async (params, token) => this.onSignatureHelp(params, token));

        this.connection.onCompletion((params, token) => this.onCompletion(params, token));
        this.connection.onCompletionResolve(async (params, token) => this.onCompletionResolve(params, token));

        this.connection.onPrepareRename(async (params, token) => this.onPrepareRenameRequest(params, token));
        this.connection.onRenameRequest(async (params, token) => this.onRenameRequest(params, token));

        const callHierarchy = this.connection.languages.callHierarchy;
        callHierarchy.onPrepare(async (params, token) => this.onCallHierarchyPrepare(params, token));
        callHierarchy.onIncomingCalls(async (params, token) => this.onCallHierarchyIncomingCalls(params, token));
        callHierarchy.onOutgoingCalls(async (params, token) => this.onCallHierarchyOutgoingCalls(params, token));

        this.connection.onDidOpenTextDocument(async (params) => this.onDidOpenTextDocument(params));
        this.connection.onDidChangeTextDocument(async (params) => this.onDidChangeTextDocument(params));
        this.connection.onDidCloseTextDocument(async (params) => this.onDidCloseTextDocument(params));
        this.connection.onDidChangeWatchedFiles((params) => this.onDidChangeWatchedFiles(params));

        this.connection.languages.diagnostics.on(async (params, token) => this.onDiagnostics(params, token));
        this.connection.languages.diagnostics.onWorkspace(async (params, token) =>
            this.onWorkspaceDiagnostics(params, token)
        );
        this.connection.onExecuteCommand(async (params, token, reporter) =>
            this.onExecuteCommand(params, token, reporter)
        );
        this.connection.onShutdown(async (token) => this.onShutdown(token));
    }

    protected async initialize(
        params: InitializeParams,
        supportedCommands: string[],
        supportedCodeActions: string[]
    ): Promise<InitializeResult> {
        if (params.locale) {
            setLocaleOverride(params.locale);
        }

        const initializationOptions = (params.initializationOptions ?? {}) as LSPObject & InitializationOptions;
        const capabilities = params.capabilities;
        this.client.hasConfigurationCapability = !!capabilities.workspace?.configuration;
        this.client.hasWatchFileCapability = !!capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration;
        this.client.hasWatchFileRelativePathCapability =
            !!capabilities.workspace?.didChangeWatchedFiles?.relativePatternSupport;
        this.client.hasWorkspaceFoldersCapability = !!capabilities.workspace?.workspaceFolders;
        this.client.hasVisualStudioExtensionsCapability = !!(capabilities as any)._vs_supportsVisualStudioExtensions;
        this.client.hasActiveParameterCapability =
            !!capabilities.textDocument?.signatureHelp?.signatureInformation?.activeParameterSupport;
        this.client.hasSignatureLabelOffsetCapability =
            !!capabilities.textDocument?.signatureHelp?.signatureInformation?.parameterInformation?.labelOffsetSupport;
        this.client.hasHierarchicalDocumentSymbolCapability =
            !!capabilities.textDocument?.documentSymbol?.hierarchicalDocumentSymbolSupport;
        this.client.hasDocumentChangeCapability =
            !!capabilities.workspace?.workspaceEdit?.documentChanges &&
            !!capabilities.workspace.workspaceEdit?.resourceOperations;
        this.client.hasDocumentAnnotationCapability = !!capabilities.workspace?.workspaceEdit?.changeAnnotationSupport;
        this.client.hasCompletionCommitCharCapability =
            !!capabilities.textDocument?.completion?.completionList?.itemDefaults &&
            !!capabilities.textDocument.completion.completionItem?.commitCharactersSupport;

        this.client.hoverContentFormat = this._getCompatibleMarkupKind(capabilities.textDocument?.hover?.contentFormat);
        this.client.completionDocFormat = this._getCompatibleMarkupKind(
            capabilities.textDocument?.completion?.completionItem?.documentationFormat
        );
        this.client.completionSupportsSnippet = !!capabilities.textDocument?.completion?.completionItem?.snippetSupport;
        this.client.signatureDocFormat = this._getCompatibleMarkupKind(
            capabilities.textDocument?.signatureHelp?.signatureInformation?.documentationFormat
        );
        const supportedDiagnosticTags = capabilities.textDocument?.publishDiagnostics?.tagSupport?.valueSet || [];
        this.client.supportsUnnecessaryDiagnosticTag = supportedDiagnosticTags.some(
            (tag) => tag === DiagnosticTag.Unnecessary
        );
        this.client.supportsDeprecatedDiagnosticTag = supportedDiagnosticTags.some(
            (tag) => tag === DiagnosticTag.Deprecated
        );
        // If the client is running in VS, it always supports task item diagnostics.
        this.client.supportsTaskItemDiagnosticTag = this.client.hasVisualStudioExtensionsCapability;
        this.client.hasWindowProgressCapability = !!capabilities.window?.workDoneProgress;
        this.client.hasGoToDeclarationCapability = !!capabilities.textDocument?.declaration;
        this.client.completionItemResolveSupportsAdditionalTextEdits =
            !!capabilities.textDocument?.completion?.completionItem?.resolveSupport?.properties.some(
                (p) => p === 'additionalTextEdits'
            );
        this.client.usingPullDiagnostics =
            !!capabilities.textDocument?.diagnostic?.dynamicRegistration &&
            initializationOptions?.diagnosticMode !== 'workspace' &&
            initializationOptions?.disablePullDiagnostics !== true;
        this.client.requiresPullRelatedInformationCapability =
            !!capabilities.textDocument?.diagnostic?.relatedInformation &&
            initializationOptions?.diagnosticMode !== 'workspace' &&
            initializationOptions?.disablePullDiagnostics !== true;

        // Create a service instance for each of the workspace folders.
        this.workspaceFactory.handleInitialize(params);

        if (this.client.hasWatchFileCapability) {
            this.addDynamicFeature(
                new FileWatcherDynamicFeature(
                    this.connection,
                    this.client.hasWatchFileRelativePathCapability,
                    this.fs,
                    this.workspaceFactory
                )
            );
        }

        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
                definitionProvider: { workDoneProgress: true },
                declarationProvider: { workDoneProgress: true },
                typeDefinitionProvider: { workDoneProgress: true },
                referencesProvider: { workDoneProgress: true },
                documentSymbolProvider: { workDoneProgress: true },
                workspaceSymbolProvider: { workDoneProgress: true },
                hoverProvider: { workDoneProgress: true },
                documentHighlightProvider: { workDoneProgress: true },
                renameProvider: { prepareProvider: true, workDoneProgress: true },
                completionProvider: {
                    triggerCharacters: this.client.hasVisualStudioExtensionsCapability
                        ? ['.', '[', '@', '"', "'"]
                        : ['.', '[', '"', "'"],
                    resolveProvider: true,
                    workDoneProgress: true,
                    completionItem: {
                        labelDetailsSupport: true,
                    },
                },
                signatureHelpProvider: {
                    triggerCharacters: ['(', ',', ')'],
                    workDoneProgress: true,
                },
                codeActionProvider: {
                    codeActionKinds: supportedCodeActions,
                    workDoneProgress: true,
                },
                executeCommandProvider: {
                    commands: supportedCommands,
                    workDoneProgress: true,
                },
                callHierarchyProvider: true,
                workspace: {
                    workspaceFolders: {
                        supported: true,
                        changeNotifications: true,
                    },
                },
            },
        };

        if (this.client.usingPullDiagnostics) {
            result.capabilities.diagnosticProvider = {
                identifier: 'pyright',
                documentSelector: null,
                interFileDependencies: true,
                workspaceDiagnostics: false, // Workspace wide are not pull diagnostics.
            };
        }

        return result;
    }

    protected onInitialized() {
        this.handleInitialized((event) => {
            this.workspaceFactory.handleWorkspaceFoldersChanged(event, null);
            this.dynamicFeatures.register();
        });
    }

    protected handleInitialized(changeWorkspaceFolderHandler: (e: WorkspaceFoldersChangeEvent) => any) {
        // Mark as initialized. We need this to make sure to
        // not send config updates before this point.
        this._initialized = true;

        if (!this.client.hasWorkspaceFoldersCapability) {
            // If folder capability is not supported, initialize ones given by onInitialize.
            this.updateSettingsForAllWorkspaces();
            return;
        }

        this._workspaceFoldersChangedDisposable =
            this.connection.workspace.onDidChangeWorkspaceFolders(changeWorkspaceFolderHandler);

        this.dynamicFeatures.register();
    }

    protected onDidChangeConfiguration(params: DidChangeConfigurationParams) {
        this.console.log(`Received updated settings`);
        if (params?.settings) {
            this.defaultClientConfig = params?.settings;
        }
        this.updateSettingsForAllWorkspaces();
    }

    protected async onDefinition(
        params: TextDocumentPositionParams,
        token: CancellationToken
    ): Promise<Definition | DefinitionLink[] | undefined | null> {
        return this.getDefinitions(
            params,
            token,
            this.client.hasGoToDeclarationCapability ? DefinitionFilter.PreferSource : DefinitionFilter.All,
            (workspace, uri, position, filter, token) => {
                const parseResults = this.getCachedParseResultsForFile(workspace, uri);
                if (!parseResults) {
                    return undefined;
                }

                return workspace.service.run((typeServer) => {
                    return new DefinitionProvider(
                        typeServer,
                        new WorkspaceParseProvider(workspace),
                        uri,
                        parseResults,
                        position,
                        filter,
                        token
                    ).getDefinitions();
                }, token);
            }
        );
    }

    protected async onDeclaration(
        params: TextDocumentPositionParams,
        token: CancellationToken
    ): Promise<Declaration | DeclarationLink[] | undefined | null> {
        return this.getDefinitions(
            params,
            token,
            this.client.hasGoToDeclarationCapability ? DefinitionFilter.PreferStubs : DefinitionFilter.All,
            (workspace, uri, position, filter, token) => {
                const parseResults = this.getCachedParseResultsForFile(workspace, uri);
                if (!parseResults) {
                    return undefined;
                }

                return workspace.service.run((typeServer) => {
                    return new DefinitionProvider(
                        typeServer,
                        new WorkspaceParseProvider(workspace),
                        uri,
                        parseResults,
                        position,
                        filter,
                        token
                    ).getDefinitions();
                }, token);
            }
        );
    }

    protected async onTypeDefinition(
        params: TextDocumentPositionParams,
        token: CancellationToken
    ): Promise<Definition | DefinitionLink[] | undefined | null> {
        return this.getDefinitions(params, token, DefinitionFilter.All, (workspace, uri, position, _, token) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return undefined;
            }

            return workspace.service.run((typeServer) => {
                return new TypeDefinitionProvider(
                    typeServer,
                    new WorkspaceParseProvider(workspace),
                    uri,
                    parseResults,
                    position,
                    token
                ).getDefinitions();
            }, token);
        });
    }

    protected async getDefinitions(
        params: TextDocumentPositionParams,
        token: CancellationToken,
        filter: DefinitionFilter,
        getDefinitionsFunc: (
            workspace: Workspace,
            fileUri: Uri,
            position: Position,
            filter: DefinitionFilter,
            token: CancellationToken
        ) => DocumentRange[] | undefined
    ): Promise<Location[] | undefined> {
        this.recordUserInteractionTime();

        const uri = this.convertLspUriStringToUri(params.textDocument.uri);

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return undefined;
        }

        const locations = getDefinitionsFunc(workspace, uri, params.position, filter, token);
        if (!locations) {
            return undefined;
        }
        const typeServer = new TypeServerProvider(workspace.service.program);
        const results: Location[] = [];

        locations.forEach((loc) => {
            const realUri = typeServer.convertToRealUri(loc.uri);
            if (realUri) {
                results.push(Location.create(realUri.toString(), loc.range));
            }
        });

        return results.length > 0 ? results : undefined;
    }

    protected async onReferences(
        params: ReferenceParams,
        token: CancellationToken,
        workDoneReporter: WorkDoneProgressReporter,
        resultReporter: ResultProgressReporter<Location[]> | undefined,
        createDocumentRange?: (uri: Uri, result: CollectionResult, parseResults: ParseFileResults) => DocumentRange
    ): Promise<Location[] | null | undefined> {
        if (this._pendingFindAllRefsCancellationSource) {
            this._pendingFindAllRefsCancellationSource.cancel();
            this._pendingFindAllRefsCancellationSource = undefined;
        }

        // VS Code doesn't support cancellation of "find all references".
        // We provide a progress bar a cancellation button so the user can cancel
        // any long-running actions.
        const progress = await this.getProgressReporter(
            workDoneReporter,
            Localizer.CodeAction.findingReferences(),
            token
        );

        const source = progress.source;
        this._pendingFindAllRefsCancellationSource = source;

        try {
            const uri = this.convertLspUriStringToUri(params.textDocument.uri);

            const workspace = await this.getWorkspaceForFile(uri);
            if (workspace.disableLanguageServices) {
                return;
            }

            return workspace.service.run((typeServer) => {
                const parseResults = this.getCachedParseResultsForFile(workspace, uri);
                if (!parseResults) {
                    return undefined;
                }

                return new ReferencesProvider(
                    typeServer,
                    new WorkspaceParseProvider(workspace),
                    source.token,
                    createDocumentRange
                ).reportReferences(uri, params.position, params.context.includeDeclaration, resultReporter);
            }, token);
        } finally {
            progress.reporter.done();
            source.dispose();
        }
    }

    protected async onDocumentSymbol(
        params: DocumentSymbolParams,
        token: CancellationToken
    ): Promise<DocumentSymbol[] | SymbolInformation[] | null | undefined> {
        this.recordUserInteractionTime();

        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return undefined;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return undefined;
            }

            return new DocumentSymbolProvider(
                typeServer,
                uri,
                parseResults,
                this.client.hasHierarchicalDocumentSymbolCapability,
                { includeAliases: false },
                token
            ).getSymbols();
        }, token);
    }

    protected onWorkspaceSymbol(
        params: WorkspaceSymbolParams,
        token: CancellationToken,
        resultReporter: ResultProgressReporter<SymbolInformation[]> | undefined
    ): Promise<SymbolInformation[] | WorkspaceSymbol[] | null | undefined> {
        const result = new WorkspaceSymbolProvider(
            this.workspaceFactory.items(),
            resultReporter,
            params.query,
            token
        ).reportSymbols();

        return Promise.resolve(result);
    }

    protected async onHover(params: HoverParams, token: CancellationToken) {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return undefined;
        }

        return workspace.service.run((typeServer) => {
            return new HoverProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                params.position,
                {
                    functionSignatureDisplay: workspace.functionSignatureDisplay,
                },
                this.client.hoverContentFormat,
                token
            ).getHover();
        }, token);
    }

    protected async onDocumentHighlight(
        params: DocumentHighlightParams,
        token: CancellationToken
    ): Promise<DocumentHighlight[] | null | undefined> {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const workspace = await this.getWorkspaceForFile(uri);

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return undefined;
            }

            return new DocumentHighlightProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.position,
                token
            ).getDocumentHighlight();
        }, token);
    }

    protected async onSignatureHelp(
        params: SignatureHelpParams,
        token: CancellationToken
    ): Promise<SignatureHelp | undefined | null> {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return;
        }

        return workspace.service.run((ts) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return undefined;
            }

            return new SignatureHelpProvider(
                ts,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.position,
                this.client.signatureDocFormat,
                this.client.hasSignatureLabelOffsetCapability,
                this.client.hasActiveParameterCapability,
                params.context,
                token
            ).getSignatureHelp();
        }, token);
    }

    protected setCompletionIncomplete(params: CompletionParams, completions: CompletionList | null) {
        // We set completion incomplete for the first invocation and next consecutive call,
        // but after that we mark it as completed so the client doesn't repeatedly call back.
        // We mark the first one as incomplete because completion could be invoked without
        // any meaningful character provided, such as an explicit completion invocation (ctrl+space)
        // or a period. That might cause us to not include some items (e.g., auto-imports).
        // The next consecutive call provides some characters to help us to pick
        // better completion items. After that, we are not going to introduce new items,
        // so we can let the client to do the filtering and caching.
        const completionIncomplete =
            this._lastTriggerKind !== CompletionTriggerKind.TriggerForIncompleteCompletions ||
            params.context?.triggerKind !== CompletionTriggerKind.TriggerForIncompleteCompletions;

        this._lastTriggerKind = params.context?.triggerKind;

        if (completions) {
            completions.isIncomplete = completionIncomplete;
        }
    }

    protected async onCompletion(params: CompletionParams, token: CancellationToken): Promise<CompletionList | null> {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return null;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return null;
            }

            const completions = new CompletionProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                this.extensionManager.caseSensitivity,
                uri,
                parseResults,
                params.position,
                {
                    functionSignatureDisplay: workspace.functionSignatureDisplay,
                    autoImport: workspace.autoImportCompletions,
                    format: this.client.completionDocFormat,
                    snippet: this.client.completionSupportsSnippet,
                    lazyEdit: false,
                    triggerCharacter: params?.context?.triggerCharacter,
                },
                token
            ).getCompletions();

            this.setCompletionIncomplete(params, completions);
            return completions;
        }, token);
    }

    // Cancellation bugs in vscode and LSP:
    // https://github.com/microsoft/vscode-languageserver-node/issues/615
    // https://github.com/microsoft/vscode/issues/95485
    //
    // If resolver throws cancellation exception, LSP and VSCode
    // cache that result and never call us back.
    protected async onCompletionResolve(params: CompletionItem, token: CancellationToken): Promise<CompletionItem> {
        const completionItemData = fromLSPAny<CompletionItemData>(params.data);
        if (completionItemData && completionItemData.uri) {
            const uri = Uri.parse(completionItemData.uri, this.caseSensitiveDetector);
            const workspace = await this.getWorkspaceForFile(uri);
            workspace.service.run((typeServer) => {
                const parseResults = this.getCachedParseResultsForFile(workspace, uri);
                if (!parseResults) {
                    return null;
                }

                return new CompletionProvider(
                    typeServer,
                    new WorkspaceParseProvider(workspace),
                    this.extensionManager.caseSensitivity,
                    uri,
                    parseResults,
                    completionItemData.position,
                    {
                        functionSignatureDisplay: workspace.functionSignatureDisplay,
                        autoImport: workspace.autoImportCompletions,
                        format: this.client.completionDocFormat,
                        snippet: this.client.completionSupportsSnippet,
                        lazyEdit: false,
                    },
                    token
                ).resolveCompletionItem(params);
            }, token);
        }
        return params;
    }

    protected async onPrepareRenameRequest(
        params: PrepareRenameParams,
        token: CancellationToken
    ): Promise<Range | { range: Range; placeholder: string } | null> {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const isUntitled = uri.isUntitled();

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return null;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return null;
            }

            return new RenameProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.position,
                token
            ).canRenameSymbol(workspace.kinds.includes(WellKnownWorkspaceKinds.Default), isUntitled);
        }, token);
    }

    protected async onRenameRequest(
        params: RenameParams,
        token: CancellationToken
    ): Promise<WorkspaceEdit | null | undefined> {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const isUntitled = uri.isUntitled();

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return null;
            }

            return new RenameProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.position,
                token
            ).renameSymbol(params.newName, workspace.kinds.includes(WellKnownWorkspaceKinds.Default), isUntitled);
        }, token);
    }

    protected async onCallHierarchyPrepare(
        params: CallHierarchyPrepareParams,
        token: CancellationToken
    ): Promise<CallHierarchyItem[] | null> {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return null;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return null;
            }

            return new CallHierarchyProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.position,
                token
            ).onPrepare();
        }, token);
    }

    protected async onCallHierarchyIncomingCalls(params: CallHierarchyIncomingCallsParams, token: CancellationToken) {
        const uri = this.convertLspUriStringToUri(params.item.uri);

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return null;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return null;
            }

            return new CallHierarchyProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.item.range.start,
                token
            ).getIncomingCalls();
        }, token);
    }

    protected async onCallHierarchyOutgoingCalls(
        params: CallHierarchyOutgoingCallsParams,
        token: CancellationToken
    ): Promise<CallHierarchyOutgoingCall[] | null> {
        const uri = this.convertLspUriStringToUri(params.item.uri);

        const workspace = await this.getWorkspaceForFile(uri);
        if (workspace.disableLanguageServices) {
            return null;
        }

        return workspace.service.run((typeServer) => {
            const parseResults = this.getCachedParseResultsForFile(workspace, uri);
            if (!parseResults) {
                return null;
            }

            return new CallHierarchyProvider(
                typeServer,
                new WorkspaceParseProvider(workspace),
                uri,
                parseResults,
                params.item.range.start,
                token
            ).getOutgoingCalls();
        }, token);
    }

    protected async onDidOpenTextDocument(params: DidOpenTextDocumentParams, ipythonMode = IPythonMode.None) {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);

        let doc = this.openFileMap.get(uri.key);
        if (doc) {
            // We shouldn't get an open text document request for an already-opened doc.
            this.console.error(`Received redundant open text document command for ${uri}`);
            TextDocument.update(doc, [{ text: params.textDocument.text }], params.textDocument.version);
        } else {
            doc = TextDocument.create(
                params.textDocument.uri,
                'python',
                params.textDocument.version,
                params.textDocument.text
            );
        }
        this.openFileMap.set(uri.key, doc);

        // Send this open to all the workspaces that might contain this file.
        const workspaces = await this.getContainingWorkspacesForFile(uri);
        workspaces.forEach((w) => {
            w.service.setFileOpened(uri, params.textDocument.version, params.textDocument.text, ipythonMode);
        });
    }

    protected async onDidChangeTextDocument(params: DidChangeTextDocumentParams, ipythonMode = IPythonMode.None) {
        this.recordUserInteractionTime();

        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const doc = this.openFileMap.get(uri.key);
        if (!doc) {
            // We shouldn't get a change text request for a closed doc.
            this.console.error(`Received change text document command for closed file ${uri}`);
            return;
        }

        TextDocument.update(doc, params.contentChanges, params.textDocument.version);
        const newContents = doc.getText();

        // Send this change to all the workspaces that might contain this file.
        const workspaces = await this.getContainingWorkspacesForFile(uri);
        workspaces.forEach((w) => {
            w.service.updateOpenFileContents(uri, params.textDocument.version, newContents, ipythonMode);
        });
    }

    protected async onDidCloseTextDocument(params: DidCloseTextDocumentParams) {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);

        // Send this close to all the workspaces that might contain this file.
        const workspaces = await this.getContainingWorkspacesForFile(uri);
        workspaces.forEach((w) => {
            w.service.setFileClosed(uri);
        });

        this.openFileMap.delete(uri.key);
    }

    protected async onDiagnostics(params: DocumentDiagnosticParams, token: CancellationToken) {
        const uri = this.convertLspUriStringToUri(params.textDocument.uri);
        const workspace = await this.getWorkspaceForFile(uri);
        let sourceFile = workspace.service.getSourceFile(uri);
        let diagnosticsVersion = sourceFile?.isCheckingRequired()
            ? DiagnosticsVersionNone
            : sourceFile?.getDiagnosticVersion() ?? DiagnosticsVersionNone;
        const result: DocumentDiagnosticReport = {
            kind: 'full',
            resultId: sourceFile?.getDiagnosticVersion()?.toString(),
            items: [],
        };
        if (
            workspace.disableLanguageServices ||
            !this.canNavigateToFile(uri, workspace.service.fs) ||
            token.isCancellationRequested
        ) {
            return result;
        }

        // Send a progress message to the client.
        this.incrementAnalysisProgress();

        try {
            // Reanalyze the file if it's not up to date.
            if (params.previousResultId !== diagnosticsVersion.toString() && sourceFile) {
                let diagnosticsVersionAfter = DiagnosticsVersionNone - 1; // Just has to be different
                let serverDiagnostics: AnalyzerDiagnostic[] = [];

                // Loop until we analyze the same version that we started with.
                while (diagnosticsVersion !== diagnosticsVersionAfter && !token.isCancellationRequested && sourceFile) {
                    // Reset the version we're analyzing
                    sourceFile = workspace.service.getSourceFile(uri);
                    diagnosticsVersion = sourceFile?.getDiagnosticVersion() ?? DiagnosticsVersionNone;

                    // Then reanalyze the file (this should go to the background thread so this thread can handle other requests).
                    if (sourceFile) {
                        serverDiagnostics = await workspace.service.analyzeFileAndGetDiagnostics(uri, token);
                    }

                    // If any text edits came in, make sure we reanalyze the file. Diagnostics version should be reset to zero
                    // if a text edit comes in.
                    const sourceFileAfter = workspace.service.getSourceFile(uri);
                    diagnosticsVersionAfter = sourceFileAfter?.getDiagnosticVersion() ?? DiagnosticsVersionNone;
                }

                // Then convert the diagnostics to the LSP format.
                const lspDiagnostics = this._convertDiagnostics(workspace.service.fs, serverDiagnostics).filter(
                    (d) => d !== undefined
                ) as Diagnostic[];

                result.resultId =
                    diagnosticsVersionAfter === DiagnosticsVersionNone ? undefined : diagnosticsVersionAfter.toString();
                result.items = lspDiagnostics;
            } else {
                (result as any).kind = 'unchanged';
                result.resultId =
                    diagnosticsVersion === DiagnosticsVersionNone ? undefined : diagnosticsVersion.toString();
                delete (result as any).items;
            }
        } finally {
            this.decrementAnalysisProgress();
        }

        return result;
    }

    protected async onWorkspaceDiagnostics(params: WorkspaceDiagnosticParams, token: CancellationToken) {
        const workspaces = await this.getWorkspaces();
        const promises: Promise<WorkspaceDocumentDiagnosticReport>[] = [];
        workspaces.forEach((workspace) => {
            if (!workspace.disableLanguageServices) {
                const files = workspace.service.getOwnedFiles();
                files.forEach((file) => {
                    const sourceFile = workspace.service.getSourceFile(file)!;
                    if (this.canNavigateToFile(sourceFile.getUri(), workspace.service.fs)) {
                        promises.push(this._getWorkspaceDocumentDiagnostics(params, sourceFile, workspace, token));
                    }
                });
            }
        });
        return {
            items: await Promise.all(promises),
        };
    }

    protected onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
        params.changes.forEach((change) => {
            const filePath = this.fs.realCasePath(this.convertLspUriStringToUri(change.uri));
            const eventType: FileWatcherEventType = change.type === 1 ? 'add' : 'change';
            this.serverOptions.fileWatcherHandler.onFileChange(eventType, filePath);
        });
    }

    protected async onExecuteCommand(
        params: ExecuteCommandParams,
        token: CancellationToken,
        reporter: WorkDoneProgressReporter
    ) {
        // Cancel running command if there is one.
        if (this._pendingCommandCancellationSource) {
            this._pendingCommandCancellationSource.cancel();
            this._pendingCommandCancellationSource = undefined;
        }

        const executeCommand = async (token: CancellationToken) => {
            const result = await this.executeCommand(params, token);
            if (WorkspaceEdit.is(result)) {
                // Tell client to apply edits.
                // Do not await; the client isn't expecting a result.
                this.connection.workspace.applyEdit({
                    label: `Command '${params.command}'`,
                    edit: result,
                    metadata: { isRefactoring: this.isRefactoringCommand(params.command) },
                });
            }

            if (CommandResult.is(result)) {
                // Tell client to apply edits.
                // Await so that we return after the edit is complete.
                await this.connection.workspace.applyEdit({
                    label: result.label,
                    edit: result.edits,
                    metadata: { isRefactoring: this.isRefactoringCommand(params.command) },
                });
            }

            return result;
        };

        if (this.isLongRunningCommand(params.command)) {
            // Create a progress dialog for long-running commands.
            const progress = await this.getProgressReporter(reporter, Localizer.CodeAction.executingCommand(), token);

            const source = progress.source;
            this._pendingCommandCancellationSource = source;

            try {
                const result = await executeCommand(source.token);
                return result;
            } finally {
                progress.reporter.done();
                source.dispose();
            }
        } else {
            const result = await executeCommand(token);
            return result;
        }
    }

    protected onShutdown(token: CancellationToken) {
        // Shutdown remaining workspaces.
        this.workspaceFactory.clear();

        // Stop tracking all open files.
        this.openFileMap.clear();

        return Promise.resolve();
    }

    protected convertDiagnostics(fs: IFileSystem, fileDiagnostics: FileDiagnostics): PublishDiagnosticsParams[] {
        const realUri = fs.getOriginalUri(fileDiagnostics.fileUri);
        return [
            {
                uri: realUri.toString(),
                version: fileDiagnostics.version,
                diagnostics: this._convertDiagnostics(fs, fileDiagnostics.diagnostics),
            },
        ];
    }

    protected getDiagCode(_diag: AnalyzerDiagnostic, rule: string | undefined): string | undefined {
        return rule;
    }

    protected onAnalysisCompletedHandler(fs: IFileSystem, results: AnalysisResults): void {
        // If we're in pull mode, disregard any 'tracking' results. They're not necessary.
        if (this.client.usingPullDiagnostics && results.reason === 'tracking') {
            return;
        }

        // Send the computed diagnostics to the client.
        results.diagnostics.forEach((fileDiag) => {
            if (!this.canNavigateToFile(fileDiag.fileUri, fs)) {
                return;
            }

            this.sendDiagnostics(this.convertDiagnostics(fs, fileDiag));
        });

        if (!this._progressReporter.isEnabled(results)) {
            // Make sure to disable progress bar if it is currently active.
            // This can happen if a user changes typeCheckingMode in the middle
            // of analysis.
            // end() is noop if there is no active progress bar.
            this._progressReporter.end();
            return;
        }

        // Update progress.
        this.sendProgressMessage(results.requiringAnalysisCount.files);
    }

    protected incrementAnalysisProgress() {
        this._progressReportCounter += 1;
        this.sendProgressMessage(this._progressReportCounter);
    }

    protected decrementAnalysisProgress() {
        this._progressReportCounter -= 1;
        if (this._progressReportCounter < 0) {
            this._progressReportCounter = 0;
        }
        this.sendProgressMessage(this._progressReportCounter);
    }

    protected sendProgressMessage(fileCount: number) {
        if (fileCount <= 0) {
            this._progressReporter.end();
            return;
        }
        const progressMessage =
            fileCount === 1
                ? Localizer.CodeAction.filesToAnalyzeOne()
                : Localizer.CodeAction.filesToAnalyzeCount().format({
                      count: fileCount,
                  });

        // Update progress.
        if (!this._progressReporter.isDisplayingProgress()) {
            this._progressReporter.begin();
        }
        this._progressReporter.report(progressMessage);
    }

    protected onWorkspaceCreated(workspace: Workspace) {
        // Update settings on this workspace (but only if initialize has happened)
        if (this._initialized) {
            this.updateSettingsForWorkspace(workspace, workspace.isInitialized).catch(() => {
                /* ignore errors */
            });
        }

        // Otherwise the initialize completion should cause settings to be updated on all workspaces.
    }

    protected onWorkspaceRemoved(workspace: Workspace) {
        const documentsWithDiagnosticsList = [...this.documentsWithDiagnostics];
        const otherWorkspaces = this.workspaceFactory.items().filter((w) => w !== workspace);

        for (const uri of documentsWithDiagnosticsList) {
            const fileUri = this.convertLspUriStringToUri(uri);

            if (workspace.service.isTracked(fileUri)) {
                // Do not clean up diagnostics for files tracked by multiple workspaces
                if (otherWorkspaces.some((w) => w.service.isTracked(fileUri))) {
                    continue;
                }
                this.sendDiagnostics([
                    {
                        uri: uri,
                        diagnostics: [],
                    },
                ]);
            }
        }
    }

    protected createTypeServiceForWorkspace(
        name: string,
        workspaceRoot: Uri | undefined,
        kinds: string[],
        services?: WorkspaceServices
    ): TypeService {
        return this.createTypeService(name, workspaceRoot || Uri.empty(), services);
    }

    protected recordUserInteractionTime() {
        // Tell all of the services that the user is actively
        // interacting with one or more editors, so they should
        // back off from performing any work.
        this.workspaceFactory.items().forEach((workspace: { service: { recordUserInteractionTime: () => void } }) => {
            workspace.service.recordUserInteractionTime();
        });
    }

    protected getDocumentationUrlForDiagnostic(diag: AnalyzerDiagnostic): string | undefined {
        const rule = diag.getRule();
        if (rule) {
            // Configuration.md is configured to have a link for every rule name.
            return `https://github.com/microsoft/pyright/blob/main/docs/configuration.md#${rule}`;
        }
        return undefined;
    }

    protected createProgressReporter(): ProgressReporter {
        // The old progress notifications are kept for backwards compatibility with
        // clients that do not support work done progress.
        let displayingProgress = false;
        let workDoneProgress: Promise<WorkDoneProgressServerReporter> | undefined;
        return {
            isDisplayingProgress: () => displayingProgress,
            isEnabled: (data: AnalysisResults) => true,
            begin: () => {
                displayingProgress = true;
                if (this.client.hasWindowProgressCapability) {
                    workDoneProgress = this.connection.window.createWorkDoneProgress();
                    workDoneProgress
                        .then((progress) => {
                            progress.begin('');
                        })
                        .catch(() => {
                            /* ignore errors */
                        });
                } else {
                    this.connection.sendNotification('pyright/beginProgress');
                }
            },
            report: (message: string) => {
                if (workDoneProgress) {
                    workDoneProgress
                        .then((progress) => {
                            progress.report(message);
                        })
                        .catch(() => {
                            /* ignore errors */
                        });
                } else {
                    this.connection.sendNotification('pyright/reportProgress', message);
                }
            },
            end: () => {
                displayingProgress = false;
                if (workDoneProgress) {
                    workDoneProgress
                        .then((progress) => {
                            progress.done();
                        })
                        .catch(() => {
                            /* ignore errors */
                        });
                    workDoneProgress = undefined;
                } else {
                    this.connection.sendNotification('pyright/endProgress');
                }
            },
        };
    }

    protected canNavigateToFile(path: Uri, fs: IFileSystem): boolean {
        return !fs.isInZip(path);
    }

    protected async getProgressReporter(reporter: WorkDoneProgressReporter, title: string, token: CancellationToken) {
        const cp = this.extensionManager.cancellation;
        assert(cp !== undefined);

        // This is a bit ugly, but we need to determine whether the provided reporter
        // is an actual client-side progress reporter or a dummy (null) progress reporter
        // created by the LSP library. If it's the latter, we'll create a server-initiated
        // progress reporter.
        if (!isNullProgressReporter(reporter)) {
            return { reporter: reporter, source: CancelAfter(cp, token) };
        }

        const serverInitiatedReporter = await this.connection.window.createWorkDoneProgress();
        serverInitiatedReporter.begin(
            title,
            /* percentage */ undefined,
            /* message */ undefined,
            /* cancellable */ true
        );

        return {
            reporter: serverInitiatedReporter,
            source: CancelAfter(cp, token, serverInitiatedReporter.token),
        };
    }

    protected sendDiagnostics(params: PublishDiagnosticsParams[]) {
        for (const param of params) {
            if (param.diagnostics.length === 0) {
                this.documentsWithDiagnostics.delete(param.uri);
            } else {
                this.documentsWithDiagnostics.add(param.uri);
            }
            this.connection.sendDiagnostics(param);
        }
    }

    protected convertLspUriStringToUri(uri: string) {
        return Uri.parse(uri, this.serverOptions.extensionManager.caseSensitivity);
    }

    protected addDynamicFeature(feature: DynamicFeature) {
        this.dynamicFeatures.add(feature);
    }

    protected getCachedParseResultsForFile(workspace: Workspace, uri: Uri): ParseFileResults | undefined {
        // TODO - implement a cache on the workspace object
        return workspace.service.getParseResults(uri);
    }

    private _getCompatibleMarkupKind(clientSupportedFormats: MarkupKind[] | undefined) {
        const serverSupportedFormats = [MarkupKind.PlainText, MarkupKind.Markdown];

        for (const format of clientSupportedFormats ?? []) {
            if (serverSupportedFormats.includes(format)) {
                return format;
            }
        }

        return MarkupKind.PlainText;
    }

    private async _getWorkspaceDocumentDiagnostics(
        params: WorkspaceDiagnosticParams,
        sourceFile: SourceFile,
        workspace: Workspace,
        token: CancellationToken
    ) {
        const originalUri = workspace.service.fs.getOriginalUri(sourceFile.getUri());
        const result: WorkspaceDocumentDiagnosticReport = {
            uri: originalUri.toString(),
            version: sourceFile.getClientVersion() ?? null,
            kind: 'full',
            items: [],
        };
        const previousId = params.previousResultIds.find((x) => x.uri === originalUri.toString());
        const documentResult = await this.onDiagnostics(
            { previousResultId: previousId?.value, textDocument: { uri: result.uri } },
            token
        );
        if (documentResult.kind === 'full') {
            result.items = documentResult.items;
        } else {
            (result as any).kind = documentResult.kind;
            delete (result as any).items;
        }
        return result;
    }

    private _getStringValues(values: any) {
        if (!values || !Array.isArray(values) || values.length === 0) {
            return [];
        }

        return values.filter((p) => p && isString(p)) as string[];
    }

    private _convertDiagnostics(fs: IFileSystem, diags: AnalyzerDiagnostic[]): Diagnostic[] {
        const convertedDiags: Diagnostic[] = [];

        diags.forEach((diag) => {
            const severity = convertCategoryToSeverity(diag.category);
            const rule = diag.getRule();
            const code = this.getDiagCode(diag, rule);
            const vsDiag = Diagnostic.create(diag.range, diag.message, severity, code, this.serverOptions.productName);

            if (
                diag.category === DiagnosticCategory.UnusedCode ||
                diag.category === DiagnosticCategory.UnreachableCode
            ) {
                vsDiag.tags = [DiagnosticTag.Unnecessary];
                vsDiag.severity = DiagnosticSeverity.Hint;

                // If the client doesn't support "unnecessary" tags, don't report unused code.
                if (!this.client.supportsUnnecessaryDiagnosticTag) {
                    return;
                }
            } else if (diag.category === DiagnosticCategory.Deprecated) {
                vsDiag.tags = [DiagnosticTag.Deprecated];
                vsDiag.severity = DiagnosticSeverity.Hint;

                // If the client doesn't support "deprecated" tags, don't report.
                if (!this.client.supportsDeprecatedDiagnosticTag) {
                    return;
                }
            } else if (diag.category === DiagnosticCategory.TaskItem) {
                // TaskItem is not supported.
                return;
            }

            if (rule) {
                const ruleDocUrl = this.getDocumentationUrlForDiagnostic(diag);
                if (ruleDocUrl) {
                    vsDiag.codeDescription = {
                        href: ruleDocUrl,
                    };
                }
            }

            const relatedInfo = diag.getRelatedInfo();
            if (relatedInfo.length > 0) {
                vsDiag.relatedInformation = [];

                relatedInfo.forEach((info) => {
                    if (this.canNavigateToFile(info.uri, fs)) {
                        const realUri = fs.getOriginalUri(info.uri);
                        vsDiag.relatedInformation!.push(
                            DiagnosticRelatedInformation.create(
                                Location.create(realUri.toString(), info.range),
                                info.message
                            )
                        );
                    }
                });
            }

            convertedDiags.push(vsDiag);
        });

        function convertCategoryToSeverity(category: DiagnosticCategory) {
            switch (category) {
                case DiagnosticCategory.Error:
                    return DiagnosticSeverity.Error;

                case DiagnosticCategory.Warning:
                    return DiagnosticSeverity.Warning;

                case DiagnosticCategory.Information:
                    return DiagnosticSeverity.Information;

                case DiagnosticCategory.TaskItem:
                    // Task items show up in the task list only if they are
                    // information or above.
                    return DiagnosticSeverity.Information;

                case DiagnosticCategory.UnusedCode:
                case DiagnosticCategory.UnreachableCode:
                case DiagnosticCategory.Deprecated:
                    return DiagnosticSeverity.Hint;
            }
        }

        return convertedDiags;
    }
}
