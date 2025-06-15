/*
 * testPythonEnvProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * NoAccessHost variation for test environment
 */

import { Uri } from 'commonUtils/uri/uri.js';
import { NoAccessPythonEnvProvider, PythonPathResult } from 'typeserver/extensibility/pythonEnvProvider.js';

export class TestPythonEnvProvider extends NoAccessPythonEnvProvider {
    constructor(private _modulePath: string | undefined = undefined, private _searchPaths: string[] = []) {
        super();
    }

    override getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult {
        return {
            paths: this._searchPaths,
            prefix: this._modulePath,
        };
    }
}
