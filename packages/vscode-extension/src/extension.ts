/*
 * extension.ts
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides client for Pyright Python language server. This portion runs
 * in the context of the VS Code process and talks to the server, which
 * runs in another process.
 */

import path from 'path';
import {
    commands,
    ExtensionContext,
    extensions,
    OutputChannel,
    Uri,
    window,
    workspace,
    WorkspaceConfiguration,
} from 'vscode';
import {
    CancellationToken,
    ConfigurationParams,
    ConfigurationRequest,
    DidChangeConfigurationNotification,
    LanguageClient,
    LanguageClientOptions,
    ResponseError,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient/node';

import { Commands } from 'typeserver/service/commands.js';
import { isThenable } from 'typeserver/utils/valueTypeUtils.js';

// eslint-disable-next-line no-restricted-imports
import { FileBasedCancellationStrategy } from './cancellationUtils.js';

let cancellationStrategy: FileBasedCancellationStrategy | undefined;

let languageClient: LanguageClient | undefined;

const pythonPathChangedListenerMap = new Map<string, string>();

// Request a heap size of 3GB. This is reasonable for modern systems.
const defaultHeapSize = 3072;

export async function activate(context: ExtensionContext) {
    const pythonSettings = workspace.getConfiguration('python');
    const langServer = pythonSettings.get('languageServer');

    // See if Pylance is installed. If so, don't activate the Pyright extension.
    // Doing so will generate "command already registered" errors and redundant
    // hover text, etc.because the two extensions overlap in functionality.
    const pylanceExtension = extensions.getExtension('ms-python.vscode-pylance');
    if (pylanceExtension && langServer !== 'None') {
        window.showErrorMessage(
            'Pyright has detected that the Pylance extension is installed. ' +
                'Pylance includes the functionality of Pyright, and running both of ' +
                'these extensions can lead to problems. Pyright will disable itself. ' +
                'Uninstall or disable Pyright to avoid this message.'
        );
        return;
    }

    cancellationStrategy = new FileBasedCancellationStrategy();

    const bundlePath = context.asAbsolutePath(path.join('dist', 'server.cjs'));
    const runOptions = { execArgv: [`--max-old-space-size=${defaultHeapSize}`] };
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6600', `--max-old-space-size=${defaultHeapSize}`] };

    // If the extension is launched in debug mode, then the debug server options are used.
    const serverOptions: ServerOptions = {
        run: {
            module: bundlePath,
            transport: TransportKind.ipc,
            args: cancellationStrategy.getCommandLineArguments(),
            options: runOptions,
        },

        debug: {
            module: bundlePath,
            transport: TransportKind.ipc,
            args: cancellationStrategy.getCommandLineArguments(),
            options: debugOptions,
        },
    };

    const clientOptions: LanguageClientOptions = {
        // Register the server for python source files.
        documentSelector: [
            { scheme: 'file', language: 'python' },
            { scheme: 'untitled', language: 'python' },
        ],
        synchronize: {
            // Synchronize the setting section to the server.
            configurationSection: ['python', 'pyright'],
        },
        connectionOptions: { cancellationStrategy: cancellationStrategy },
        middleware: {
            // Use the middleware hook to override the configuration call. This allows
            // us to inject the proper "python.pythonPath" setting from the Python extension's
            // private settings store.
            workspace: {
                configuration: async (
                    params: ConfigurationParams,
                    token: CancellationToken,
                    next: ConfigurationRequest.HandlerSignature
                ) => {
                    let result = next(params, token);
                    if (isThenable(result)) {
                        result = await result;
                    }
                    if (result instanceof ResponseError) {
                        return result;
                    }

                    for (const [i, item] of params.items.entries()) {
                        if (item.section === 'python.analysis') {
                            const analysisConfig = workspace.getConfiguration(
                                item.section,
                                item.scopeUri ? Uri.parse(item.scopeUri) : undefined
                            );

                            // If stubPath is not set, remove it rather than sending default value.
                            // This lets the server know that it's unset rather than explicitly
                            // set to the default value (typings) so it can behave differently.
                            if (!isConfigSettingSetByUser(analysisConfig, 'stubPath')) {
                                delete (result[i] as any).stubPath;
                            }
                        }
                    }

                    // For backwards compatibility, set python.pythonPath to the configured
                    // value as though it were in the user's settings.json file.
                    const addPythonPath = (settings: any[]): Promise<any[]> => {
                        const pythonPathPromises: Promise<string | undefined>[] = params.items.map((item) => {
                            if (item.section === 'python') {
                                const uri = item.scopeUri ? Uri.parse(item.scopeUri) : undefined;
                                return getPythonPathFromPythonExtension(client.outputChannel, uri, () => {
                                    // Posts a "workspace/didChangeConfiguration" message to the service
                                    // so it re-queries the settings for all workspaces.
                                    client.sendNotification(DidChangeConfigurationNotification.type, {
                                        settings: null,
                                    });
                                });
                            }
                            return Promise.resolve(undefined);
                        });

                        return Promise.all(pythonPathPromises).then((pythonPaths) => {
                            pythonPaths.forEach((pythonPath, i) => {
                                // If there is a pythonPath returned by the Python extension,
                                // always prefer this over the pythonPath that uses the old
                                // mechanism.
                                if (pythonPath !== undefined) {
                                    settings[i].pythonPath = pythonPath;
                                }
                            });
                            return settings;
                        });
                    };

                    return addPythonPath(result);
                },
            },
        },
        initializationOptions: {
            diagnosticMode: workspace.getConfiguration('python.analysis').get('diagnosticMode'),
            disablePullDiagnostics: workspace.getConfiguration('pyright').get('disablePullDiagnostics'),
        },
    };

    // Create the language client and start the client.
    const client = new LanguageClient('python', 'Pyright', serverOptions, clientOptions);
    languageClient = client;

    // Register our custom commands.
    const genericCommands = [Commands.createTypeStub, Commands.restartServer];
    genericCommands.forEach((command) => {
        context.subscriptions.push(
            commands.registerCommand(command, (...args: any[]) => {
                client.sendRequest('workspace/executeCommand', { command, arguments: args });
            })
        );
    });

    await client.start();
}

export function deactivate() {
    if (cancellationStrategy) {
        cancellationStrategy.dispose();
        cancellationStrategy = undefined;
    }

    const client = languageClient;
    languageClient = undefined;

    return client?.stop();
}

// The VS Code Python extension manages its own internal store of configuration settings.
// The setting that was traditionally named "python.pythonPath" has been moved to the
// Python extension's internal store for reasons of security and because it differs per
// project and by user.
async function getPythonPathFromPythonExtension(
    outputChannel: OutputChannel,
    scopeUri: Uri | undefined,
    postConfigChanged: () => void
): Promise<string | undefined> {
    try {
        const extension = extensions.getExtension('ms-python.python');
        if (!extension) {
            outputChannel.appendLine('Python extension not found');
        } else {
            if (extension.packageJSON?.featureFlags?.usingNewInterpreterStorage) {
                if (!extension.isActive) {
                    outputChannel.appendLine('Waiting for Python extension to load');
                    await extension.activate();
                    outputChannel.appendLine('Python extension loaded');
                }

                const execDetails = await extension.exports.settings.getExecutionDetails(scopeUri);
                let result: string | undefined;
                if (execDetails.execCommand && execDetails.execCommand.length > 0) {
                    result = execDetails.execCommand[0];
                }

                if (extension.exports.settings.onDidChangeExecutionDetails) {
                    installPythonPathChangedListener(
                        extension.exports.settings.onDidChangeExecutionDetails,
                        scopeUri,
                        postConfigChanged
                    );
                }

                if (!result) {
                    outputChannel.appendLine(`No pythonPath provided by Python extension`);
                } else {
                    outputChannel.appendLine(`Received pythonPath from Python extension: ${result}`);
                }

                return result;
            }
        }
    } catch (error) {
        outputChannel.appendLine(
            `Exception occurred when attempting to read pythonPath from Python extension: ${JSON.stringify(error)}`
        );
    }

    return undefined;
}

function installPythonPathChangedListener(
    onDidChangeExecutionDetails: (callback: () => void) => void,
    scopeUri: Uri | undefined,
    postConfigChanged: () => void
) {
    const uriString = scopeUri ? scopeUri.toString() : '';

    // No need to install another listener for this URI if
    // it already exists.
    if (pythonPathChangedListenerMap.has(uriString)) {
        return;
    }

    onDidChangeExecutionDetails(() => {
        postConfigChanged();
    });

    pythonPathChangedListenerMap.set(uriString, uriString);
}

function isConfigSettingSetByUser(configuration: WorkspaceConfiguration, setting: string): boolean {
    const inspect = configuration.inspect(setting);
    if (inspect === undefined) {
        return false;
    }

    return (
        inspect.globalValue !== undefined ||
        inspect.workspaceValue !== undefined ||
        inspect.workspaceFolderValue !== undefined ||
        inspect.globalLanguageValue !== undefined ||
        inspect.workspaceLanguageValue !== undefined ||
        inspect.workspaceFolderLanguageValue !== undefined
    );
}
