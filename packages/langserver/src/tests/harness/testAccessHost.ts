/*
 * testAccessHost.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * NoAccessHost variation for test environment
 */

import { NoAccessHost } from 'typeserver/extensibility/host.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { PythonPathResult } from 'typeserver/service/pythonPathUtils.js';

export class TestAccessHost extends NoAccessHost {
    constructor(private _modulePath = Uri.empty(), private _searchPaths: Uri[] = []) {
        super();
    }

    override getPythonSearchPaths(pythonPath?: Uri, logInfo?: string[]): PythonPathResult {
        return {
            paths: this._searchPaths,
            prefix: this._modulePath,
        };
    }
}
