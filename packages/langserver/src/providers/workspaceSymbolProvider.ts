/*
 * workspaceSymbolProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provide langue server workspace symbol functionality.
 */

import { CancellationToken, Location, ResultProgressReporter, SymbolInformation } from 'vscode-languageserver';

import { appendArray } from 'commonUtils/collectionUtils.js';
import { isPatternInSymbol } from 'commonUtils/stringUtils.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { IndexSymbolData, SymbolIndexer } from 'langserver/providers/symbolIndexer.js';
import { Workspace } from 'langserver/server/workspaceFactory.js';
import { getFileInfo } from 'typeserver/common/analyzerNodeInfo.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

type WorkspaceSymbolCallback = (symbols: SymbolInformation[]) => void;

export class WorkspaceSymbolProvider {
    private _reporter: WorkspaceSymbolCallback;
    private _allSymbols: SymbolInformation[] = [];

    constructor(
        private readonly _workspaces: Workspace[],
        resultReporter: ResultProgressReporter<SymbolInformation[]> | undefined,
        private readonly _query: string,
        private readonly _token: CancellationToken
    ) {
        this._reporter = resultReporter
            ? (symbols) => resultReporter.report(symbols)
            : (symbols) => appendArray(this._allSymbols, symbols);
    }

    reportSymbols(): SymbolInformation[] {
        for (const workspace of this._workspaces) {
            if (workspace.disableLanguageServices || workspace.disableWorkspaceSymbol) {
                continue;
            }

            if (!workspace.isInitialized.resolved()) {
                // If workspace is not resolved, ignore this workspace and move on.
                // We could wait for the initialization but that cause this to be async
                // so for now, we will just ignore any workspace that is not initialized yet.
                continue;
            }

            workspace.service.run((program) => {
                this._reportSymbolsForProgram(program);
            }, this._token);
        }

        return this._allSymbols;
    }

    protected getSymbolsForDocument(typeServer: ITypeServer, fileUri: Uri): SymbolInformation[] {
        const symbolList: SymbolInformation[] = [];

        const parseResults = typeServer.getParseResults(fileUri);
        if (!parseResults) {
            return symbolList;
        }

        const fileInfo = getFileInfo(parseResults.parserOutput.parseTree);
        if (!fileInfo) {
            return symbolList;
        }

        const indexSymbolData = SymbolIndexer.indexSymbols(
            fileInfo,
            parseResults,
            { includeAliases: false },
            this._token
        );
        this.appendWorkspaceSymbolsRecursive(indexSymbolData, typeServer, fileUri, '', symbolList);

        return symbolList;
    }

    protected appendWorkspaceSymbolsRecursive(
        indexSymbolData: IndexSymbolData[] | undefined,
        typeServer: ITypeServer,
        fileUri: Uri,
        container: string,
        symbolList: SymbolInformation[]
    ) {
        throwIfCancellationRequested(this._token);

        if (!indexSymbolData) {
            return;
        }

        for (const symbolData of indexSymbolData) {
            if (symbolData.alias) {
                continue;
            }

            if (isPatternInSymbol(this._query, symbolData.name)) {
                const realUri = typeServer.convertToRealUri(fileUri);
                if (realUri) {
                    const location: Location = {
                        uri: realUri.toString(),
                        range: symbolData.selectionRange!,
                    };

                    const symbolInfo: SymbolInformation = {
                        name: symbolData.name,
                        kind: symbolData.kind,
                        location,
                    };

                    if (container.length) {
                        symbolInfo.containerName = container;
                    }

                    symbolList.push(symbolInfo);
                }
            }

            this.appendWorkspaceSymbolsRecursive(
                symbolData.children,
                typeServer,
                fileUri,
                this._getContainerName(container, symbolData.name),
                symbolList
            );
        }
    }

    private _reportSymbolsForProgram(typeServer: ITypeServer) {
        // Don't do a search if the query is empty. We'll return
        // too many results in this case.
        if (!this._query) {
            return;
        }

        // "Workspace symbols" searches symbols only from user code.
        for (const sourceFileInfo of typeServer.getSourceFileInfoList()) {
            if (!sourceFileInfo.inProject) {
                continue;
            }

            const symbolList = this.getSymbolsForDocument(typeServer, sourceFileInfo.uri);
            if (symbolList.length > 0) {
                this._reporter(symbolList);
            }
        }
    }

    private _getContainerName(container: string, name: string) {
        if (container.length > 0) {
            return `${container}.${name}`;
        }

        return name;
    }
}
