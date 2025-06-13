/*
 * host.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides access to the host environment the language service is running on.
 */

import { PythonVersion } from 'typeserver/common/pythonVersion.js';
import { PythonPlatform } from 'typeserver/config/configOptions.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { PythonPathResult } from 'typeserver/service/pythonPathUtils.js';

export const enum HostKind {
    FullAccess,
    LimitedAccess,
    NoAccess,
}

export interface ScriptOutput {
    stdout: string;
    stderr: string;
}

export interface Host {
    readonly kind: HostKind;
    getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult;
    getPythonVersion(pythonPath?: Uri, logInfo?: string[]): PythonVersion | undefined;
    getPythonPlatform(logInfo?: string[]): PythonPlatform | undefined;
}

export class NoAccessHost implements Host {
    get kind(): HostKind {
        return HostKind.NoAccess;
    }

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

export type HostFactory = () => Host;
