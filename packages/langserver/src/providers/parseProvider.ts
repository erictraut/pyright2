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
        // TODO - remove this interaction with the program.
        const fileInfo = this._workspace.service.program.getSourceFile(fileUri);

        if (!fileInfo) {
            if (!this._workspace.service.program.fileSystem.existsSync(fileUri)) {
                return undefined;
            }

            this._workspace.service.program.addInterimFile(fileUri);
        }

        // TODO - add caching for the workspace to avoid parsing
        // the same file unnecessarily.
        const cachedParseResults = this._workspace.service.getParseResults(fileUri);

        return cachedParseResults;
    }
}
