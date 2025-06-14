/*
 * server.ts
 *
 * Implements pyright language server.
 */

import path from 'path';
import {
    CancellationToken,
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
    Connection,
    ExecuteCommandParams,
    WorkDoneProgressServerReporter,
} from 'vscode-languageserver';

import { CommandController } from 'langserver/commands/commandController.js';
import { CodeActionProvider } from 'langserver/providers/codeActionProvider.js';
import { resolvePathWithEnvVariables } from 'langserver/server/envVarUtils.js';
import { LanguageServerBase } from 'langserver/server/languageServerBase.js';
import { ServerSettings } from 'langserver/server/languageServerInterface.js';
import { ProgressReporter } from 'langserver/server/progressReporter.js';
import { WellKnownWorkspaceKinds, Workspace } from 'langserver/server/workspaceFactory.js';
import { typeshedFallback } from 'typeserver/common/pathConsts.js';
import { ConfigOptions, SignatureDisplayType } from 'typeserver/config/configOptions.js';
import { ConsoleWithLogLevel, LogLevel, convertLogLevel } from 'typeserver/extensibility/console.js';
import { FileBasedCancellationProvider } from 'typeserver/extensibility/fileBasedCancellationUtils.js';
import { FullAccessHost } from 'typeserver/extensibility/fullAccessHost.js';
import { Host } from 'typeserver/extensibility/host.js';
import { ServiceProvider } from 'typeserver/extensibility/serviceProvider.js';
import { createServiceProvider, getCaseDetector } from 'typeserver/extensibility/serviceProviderExtensions.js';
import { FileSystem } from 'typeserver/files/fileSystem.js';
import { PartialStubService } from 'typeserver/files/partialStubService.js';
import { PyrightFileSystem } from 'typeserver/files/pyrightFileSystem.js';
import {
    RealTempFile,
    WorkspaceFileWatcherProvider,
    createFromRealFileSystem,
} from 'typeserver/files/realFileSystem.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { AnalysisResults } from 'typeserver/service/analysis.js';
import { CacheManager } from 'typeserver/service/cacheManager.js';
import { isPythonBinary } from 'typeserver/service/pythonPathUtils.js';
import { isDefined, isString } from 'typeserver/utils/valueTypeUtils.js';
import { fileURLToPath } from 'url';

const maxAnalysisTimeInForeground = { openFilesTimeInMs: 50, noOpenFilesTimeInMs: 200 };

export class PyrightServer extends LanguageServerBase {
    private _controller: CommandController;

    constructor(connection: Connection, realFileSystem?: FileSystem, typeshedFallbackLoc?: Uri) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        //const version = require('typeserver/package.json').version || '';
        // TODO - fix the version retrieval logic
        const version = 'Unknown Version';

        const tempFile = new RealTempFile();
        const console = new ConsoleWithLogLevel(connection.console);
        const fileWatcherProvider = new WorkspaceFileWatcherProvider();
        const fileSystem = realFileSystem ?? createFromRealFileSystem(tempFile, console, fileWatcherProvider);
        const pyrightFs = new PyrightFileSystem(fileSystem);
        const cacheManager = new CacheManager();
        const partialStubService = new PartialStubService(pyrightFs);

        const serviceProvider = createServiceProvider(
            pyrightFs,
            tempFile,
            console,
            cacheManager,
            partialStubService,
            new FileBasedCancellationProvider('bg')
        );

        if (!typeshedFallbackLoc) {
            const dirPath = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
            const rootDirectory = Uri.file(dirPath, getCaseDetector(serviceProvider));
            typeshedFallbackLoc = rootDirectory.combinePaths(typeshedFallback);
        }

        super(
            {
                productName: 'Pyright',
                typeshedFallbackLoc,
                version,
                serviceProvider,
                fileWatcherHandler: fileWatcherProvider,
                maxAnalysisTimeInForeground,
                supportedCodeActions: [CodeActionKind.QuickFix],
            },
            connection
        );

        this._controller = new CommandController(this);
    }

    async getSettings(workspace: Workspace): Promise<ServerSettings> {
        const serverSettings: ServerSettings = {
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
            functionSignatureDisplay: SignatureDisplayType.formatted,
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

    protected override createHost(): Host {
        return new FullAccessHost(this.serverOptions.serviceProvider);
    }

    protected override createImportResolver(
        serviceProvider: ServiceProvider,
        options: ConfigOptions,
        host: Host
    ): ImportResolver {
        const importResolver = new ImportResolver(serviceProvider, options, host);

        // In case there was cached information in the file system related to
        // import resolution, invalidate it now.
        importResolver.invalidateCache();

        return importResolver;
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

        const uri = Uri.parse(params.textDocument.uri, getCaseDetector(this.serverOptions.serviceProvider));
        const workspace = await this.getWorkspaceForFile(uri);
        return CodeActionProvider.getCodeActionsForPosition(workspace, uri, params.range, params.context.only, token);
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

    private _getStringValues(values: any) {
        if (!values || !Array.isArray(values) || values.length === 0) {
            return [];
        }

        return values.filter((p) => p && isString(p)) as string[];
    }
}
