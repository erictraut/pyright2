/*
 * documentSymbolProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that enumerates all of the symbols within a specified
 * source file document.
 */

import { CancellationToken, DocumentSymbol, Location, SymbolInformation } from 'vscode-languageserver';

import { Uri } from 'commonUtils/uri/uri.js';
import { IndexOptions, IndexSymbolData, SymbolIndexer } from 'langserver/providers/symbolIndexer.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export function convertToFlatSymbols(
    typeServer: ITypeServer,
    uri: Uri,
    symbolList: DocumentSymbol[]
): SymbolInformation[] {
    const flatSymbols: SymbolInformation[] = [];

    for (const symbol of symbolList) {
        _appendToFlatSymbolsRecursive(typeServer, flatSymbols, uri, symbol);
    }

    return flatSymbols;
}

export class DocumentSymbolProvider {
    constructor(
        protected readonly typeServer: ITypeServer,
        protected readonly uri: Uri,
        private readonly _parseResults: ParseFileResults,
        private readonly _supportHierarchicalDocumentSymbol: boolean,
        private readonly _indexOptions: IndexOptions,
        private readonly _token: CancellationToken
    ) {}

    getSymbols(): DocumentSymbol[] | SymbolInformation[] {
        const symbolList = this.getHierarchicalSymbols();
        if (this._supportHierarchicalDocumentSymbol) {
            return symbolList;
        }

        return convertToFlatSymbols(this.typeServer, this.uri, symbolList);
    }

    protected getHierarchicalSymbols() {
        const symbolList: DocumentSymbol[] = [];
        const indexSymbolData = SymbolIndexer.indexSymbols(this._parseResults, this._indexOptions, this._token);
        this.appendDocumentSymbolsRecursive(indexSymbolData, symbolList);

        return symbolList;
    }

    protected appendDocumentSymbolsRecursive(
        indexSymbolData: IndexSymbolData[] | undefined,
        symbolList: DocumentSymbol[]
    ) {
        throwIfCancellationRequested(this._token);

        if (!indexSymbolData) {
            return;
        }

        for (const symbolData of indexSymbolData) {
            if (symbolData.alias) {
                continue;
            }

            // It's possible for a name to be '' under certain error
            // conditions (such as a decorator with no associated function
            // or class).
            if (!symbolData.name) {
                continue;
            }

            const children: DocumentSymbol[] = [];
            this.appendDocumentSymbolsRecursive(symbolData.children, children);

            const symbolInfo: DocumentSymbol = {
                name: symbolData.name,
                kind: symbolData.kind,
                range: symbolData.range!,
                selectionRange: symbolData.selectionRange!,
                children: children!,
            };

            symbolList.push(symbolInfo);
        }
    }
}

function _appendToFlatSymbolsRecursive(
    typeServer: ITypeServer,
    flatSymbols: SymbolInformation[],
    documentUri: Uri,
    symbol: DocumentSymbol,
    parent?: DocumentSymbol
) {
    const realUri = typeServer.convertToRealUri(documentUri);
    if (!realUri) {
        return;
    }

    const flatSymbol: SymbolInformation = {
        name: symbol.name,
        kind: symbol.kind,
        location: Location.create(realUri.toString(), symbol.range),
    };

    if (symbol.tags) {
        flatSymbol.tags = symbol.tags;
    }

    if (parent) {
        flatSymbol.containerName = parent.name;
    }

    flatSymbols.push(flatSymbol);

    if (symbol.children) {
        for (const child of symbol.children) {
            _appendToFlatSymbolsRecursive(typeServer, flatSymbols, documentUri, child, symbol);
        }
    }
}
