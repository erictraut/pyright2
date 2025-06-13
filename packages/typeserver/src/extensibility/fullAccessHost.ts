/*
 * fullAccessHost.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implementation of host where it is allowed to run external executables.
 */

import child_process from 'child_process';

import { PythonVersion } from 'typeserver/common/pythonVersion.js';
import { PythonPlatform } from 'typeserver/config/configOptions.js';
import { HostKind, NoAccessHost } from 'typeserver/extensibility/host.js';
import { ServiceKeys } from 'typeserver/extensibility/serviceKeys.js';
import { ServiceProvider } from 'typeserver/extensibility/serviceProvider.js';
import { getFs } from 'typeserver/extensibility/serviceProviderExtensions.js';
import { getAnyExtensionFromPath, normalizePath } from 'typeserver/files/pathUtils.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { isDirectory } from 'typeserver/files/uri/uriUtils.js';
import { PythonPathResult } from 'typeserver/service/pythonPathUtils.js';
import { assertNever } from 'typeserver/utils/debug.js';

// preventLocalImports removes the working directory from sys.path.
// The -c flag adds it automatically, which can allow some stdlib
// modules (like json) to be overridden by other files (like json.py).
const removeCwdFromSysPath = [
    'import os, os.path, sys',
    'normalize = lambda p: os.path.normcase(os.path.normpath(p))',
    'cwd = normalize(os.getcwd())',
    'orig_sys_path = [p for p in sys.path if p != ""]',
    'sys.path[:] = [p for p in sys.path if p != "" and normalize(p) != cwd]',
];

const extractSys = [
    ...removeCwdFromSysPath,
    'import sys, json',
    'json.dump(dict(path=orig_sys_path, prefix=sys.prefix), sys.stdout)',
].join('; ');

const extractVersion = [
    ...removeCwdFromSysPath,
    'import sys, json',
    'json.dump(tuple(sys.version_info), sys.stdout)',
].join('; ');

export class LimitedAccessHost extends NoAccessHost {
    override get kind(): HostKind {
        return HostKind.LimitedAccess;
    }

    override getPythonPlatform(logInfo?: string[]): PythonPlatform | undefined {
        if (process.platform === 'darwin') {
            return PythonPlatform.Darwin;
        } else if (process.platform === 'linux') {
            return PythonPlatform.Linux;
        } else if (process.platform === 'win32') {
            return PythonPlatform.Windows;
        }

        return undefined;
    }
}

export class FullAccessHost extends LimitedAccessHost {
    constructor(protected serviceProvider: ServiceProvider) {
        super();
    }

    override get kind(): HostKind {
        return HostKind.FullAccess;
    }

    static createHost(kind: HostKind, serviceProvider: ServiceProvider) {
        switch (kind) {
            case HostKind.NoAccess:
                return new NoAccessHost();
            case HostKind.LimitedAccess:
                return new LimitedAccessHost();
            case HostKind.FullAccess:
                return new FullAccessHost(serviceProvider);
            default:
                assertNever(kind);
        }
    }

    override getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult {
        const importFailureInfo = logInfo ?? [];
        let result = this._executePythonInterpreter(pythonPath?.getFilePath(), (p) =>
            this._getSearchPathResultFromInterpreter(p, importFailureInfo)
        );

        if (!result) {
            result = {
                paths: [],
                prefix: undefined,
            };
        }

        importFailureInfo.push(`Received ${result.paths.length} paths from interpreter`);
        result.paths.forEach((path) => {
            importFailureInfo.push(`  ${path}`);
        });

        return result;
    }

    override getPythonVersion(pythonPath?: Uri, logInfo?: string[]): PythonVersion | undefined {
        const importFailureInfo = logInfo ?? [];

        try {
            const execOutput = this._executePythonInterpreter(pythonPath?.getFilePath(), (p) =>
                this._executeCodeInInterpreter(p, ['-I'], extractVersion)
            );

            const versionJson: any[] = JSON.parse(execOutput!);

            if (!Array.isArray(versionJson) || versionJson.length < 5) {
                importFailureInfo.push(`Python version ${execOutput} from interpreter is unexpected format`);
                return undefined;
            }

            const version = PythonVersion.create(
                versionJson[0],
                versionJson[1],
                versionJson[2],
                versionJson[3],
                versionJson[4]
            );

            if (version === undefined) {
                importFailureInfo.push(`Python version ${execOutput} from interpreter is unsupported`);
                return undefined;
            }

            return version;
        } catch {
            importFailureInfo.push('Unable to get Python version from interpreter');
            return undefined;
        }
    }

    protected shouldUseShellToRunInterpreter(interpreterPath: string): boolean {
        // Windows bat/cmd files must me executed with the shell due to the following breaking change:
        // https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2#command-injection-via-args-parameter-of-child_processspawn-without-shell-option-enabled-on-windows-cve-2024-27980---high
        return (
            process.platform === 'win32' &&
            !!getAnyExtensionFromPath(interpreterPath, ['.bat', '.cmd'], /* ignoreCase */ true)
        );
    }

    private _executePythonInterpreter<T>(
        pythonPath: string | undefined,
        execute: (path: string) => T | undefined
    ): T | undefined {
        if (pythonPath) {
            return execute(pythonPath);
        } else {
            let result: T | undefined;
            try {
                // On non-Windows platforms, always default to python3 first. We want to
                // avoid this on Windows because it might invoke a script that displays
                // a dialog box indicating that python can be downloaded from the app store.
                if (process.platform !== 'win32') {
                    result = execute('python3');
                }
            } catch {
                // Ignore failure on python3
            }

            if (result !== undefined) {
                return result;
            }

            // On some platforms, 'python3' might not exist. Try 'python' instead.
            return execute('python');
        }
    }

    /**
     * Executes a chunk of Python code via the provided interpreter and returns the output.
     * @param interpreterPath Path to interpreter.
     * @param commandLineArgs Command line args for interpreter other than the code to execute.
     * @param code Code to execute.
     */
    private _executeCodeInInterpreter(interpreterPath: string, commandLineArgs: string[], code: string): string {
        const useShell = this.shouldUseShellToRunInterpreter(interpreterPath);
        if (useShell) {
            code = '"' + code + '"';
        }

        commandLineArgs.push('-c', code);

        const execOutput = child_process.execFileSync(interpreterPath, commandLineArgs, {
            encoding: 'utf8',
            shell: useShell,
        });

        return execOutput;
    }

    private _getSearchPathResultFromInterpreter(
        interpreterPath: string,
        importFailureInfo: string[]
    ): PythonPathResult | undefined {
        const result: PythonPathResult = {
            paths: [],
            prefix: undefined,
        };

        try {
            importFailureInfo.push(`Executing interpreter: '${interpreterPath}'`);
            const execOutput = this._executeCodeInInterpreter(interpreterPath, [], extractSys);
            const caseDetector = this.serviceProvider.get(ServiceKeys.caseSensitivityDetector);

            // Parse the execOutput. It should be a JSON-encoded array of paths.
            try {
                const execSplit = JSON.parse(execOutput);
                for (let execSplitEntry of execSplit.path) {
                    execSplitEntry = execSplitEntry.trim();
                    if (execSplitEntry) {
                        const normalizedPath = normalizePath(execSplitEntry);
                        const normalizedUri = Uri.file(normalizedPath, caseDetector);
                        const fs = getFs(this.serviceProvider);

                        // Skip non-existent paths and broken zips/eggs.
                        if (fs.existsSync(normalizedUri) && isDirectory(fs, normalizedUri)) {
                            result.paths.push(normalizedUri);
                        } else {
                            importFailureInfo.push(`Skipping '${normalizedPath}' because it is not a valid directory`);
                        }
                    }
                }

                result.prefix = Uri.file(execSplit.prefix, caseDetector);

                if (result.paths.length === 0) {
                    importFailureInfo.push(`Found no valid directories`);
                }
            } catch (err) {
                importFailureInfo.push(`Could not parse output: '${execOutput}'`);
                throw err;
            }
        } catch {
            return undefined;
        }

        return result;
    }
}
