/*
 * pythonEnvProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * An abstraction that allows the type server to query information about
 * the configured Python environment, such as search paths.
 */

import child_process from 'child_process';

import { PythonVersion } from 'typeserver/common/pythonVersion.js';
import { PythonPlatform } from 'typeserver/config/configOptions.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { getAnyExtensionFromPath } from 'typeserver/utils/pathUtils.js';

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

export interface PythonPathResult {
    paths: string[];
    prefix: string | undefined;
}

export interface PythonEnvProvider {
    getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult;
    getPythonVersion(pythonPath?: Uri, logInfo?: string[]): PythonVersion | undefined;
    getPythonPlatform(logInfo?: string[]): PythonPlatform | undefined;
}

// This variant of PythonEnvProvider is used when the environment has no
// access to a Python environment or the platform it is running on.
export class NoAccessPythonEnvProvider implements PythonEnvProvider {
    getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult {
        logInfo?.push('No access to python executable.');

        return {
            paths: [],
            prefix: undefined,
        };
    }

    getPythonVersion(pythonPath?: Uri, logInfo?: string[]): PythonVersion | undefined {
        return undefined;
    }

    getPythonPlatform(logInfo?: string[]): PythonPlatform | undefined {
        return undefined;
    }
}

// This variant of PythonEnvProvider is used when the environment has no
// access to a Python environment but can determine the platform it is running on.
export class LimitedAccessPythonEnvProvider extends NoAccessPythonEnvProvider {
    override getPythonPlatform(logInfo?: string[]): PythonPlatform | undefined {
        switch (process.platform) {
            case 'darwin':
                return PythonPlatform.Darwin;

            case 'linux':
                return PythonPlatform.Linux;

            case 'win32':
                return PythonPlatform.Windows;
        }

        return undefined;
    }
}

export class FullAccessPythonEnvProvider extends LimitedAccessPythonEnvProvider {
    override getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult {
        const importFailureInfo = logInfo ?? [];
        const result = this._executePythonInterpreter(pythonPath?.getFilePath(), (p) =>
            this._getSearchPathResultFromInterpreter(p, importFailureInfo)
        );

        if (!result) {
            return {
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

    // Executes a chunk of Python code via the provided interpreter and returns the output.
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
    ): PythonPathResult {
        const paths: string[] = [];
        let prefix: string | undefined;

        try {
            importFailureInfo.push(`Executing interpreter: '${interpreterPath}'`);
            const execOutput = this._executeCodeInInterpreter(interpreterPath, [], extractSys);

            // Parse the execOutput. It should be a JSON-encoded array of paths.
            try {
                const execSplit = JSON.parse(execOutput);
                for (let execSplitEntry of execSplit.path) {
                    execSplitEntry = execSplitEntry.trim();
                    if (execSplitEntry) {
                        paths.push(execSplitEntry);
                    }
                }

                prefix = execSplit.prefix;
            } catch (err) {
                importFailureInfo.push(`Could not parse output: '${execOutput}'`);
                throw err;
            }
        } catch (err) {
            importFailureInfo.push('Received exception while executing interpreter');
            throw err;
        }

        return { paths, prefix };
    }
}
