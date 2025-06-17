/*
 * parseProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * An object that is able to parse a file and return the parse results.
 */

import { Workspace } from 'langserver/server/workspaceFactory.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface IParseProvider {
    parseFile(fileUri: Uri): ParseFileResults | undefined;
}

export class WorkspaceParseProvider implements IParseProvider {
    constructor(private _workspace: Workspace) {}

    parseFile(fileUri: Uri): ParseFileResults | undefined {
        // TODO - add caching for the workspace to avoid parsing
        // the same file unnecessarily.
        return this._workspace.service.getParseResults(fileUri);
    }
}
