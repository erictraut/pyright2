/*
 * documentHighlightProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that maps a position within a Python program file into
 * one or more highlight types.
 */

import { CancellationToken, DocumentHighlight, DocumentHighlightKind } from 'vscode-languageserver';

import { Uri } from 'commonUtils/uri/uri.js';
import { DocumentSymbolCollector } from 'langserver/providers/documentSymbolCollector.js';
import { IParseProvider } from 'langserver/providers/parseProvider.js';
import { ReferenceUseCase } from 'langserver/providers/providerTypes.js';
import { findNodeByOffset, isWriteAccess } from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetsToRange, convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { Position, TextRange } from 'typeserver/common/textRange.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export class DocumentHighlightProvider {
    constructor(
        private _typeServer: ITypeServer,
        private _parseProvider: IParseProvider,
        private _fileUri: Uri,
        private _parseResults: ParseFileResults,
        private _position: Position,
        private _token: CancellationToken
    ) {}

    getDocumentHighlight(): DocumentHighlight[] | undefined {
        throwIfCancellationRequested(this._token);
        if (!this._parseResults) {
            return undefined;
        }

        const offset = convertPositionToOffset(this._position, this._parseResults.tokenizerOutput.lines);
        if (offset === undefined) {
            return undefined;
        }

        const node = findNodeByOffset(this._parseResults.parserOutput.parseTree, offset);
        if (node === undefined) {
            return undefined;
        }

        if (node.nodeType !== ParseNodeType.Name) {
            return undefined;
        }

        const results = DocumentSymbolCollector.collectFromNode(
            this._typeServer,
            this._parseProvider,
            node,
            this._token,
            this._parseResults.parserOutput.parseTree,
            {
                treatModuleInImportAndFromImportSame: true,
                useCase: ReferenceUseCase.References,
            }
        );

        const lines = this._parseResults.tokenizerOutput.lines;
        return results.map((r) => ({
            kind:
                r.node.nodeType === ParseNodeType.Name && isWriteAccess(r.node)
                    ? DocumentHighlightKind.Write
                    : DocumentHighlightKind.Read,
            range: convertOffsetsToRange(r.range.start, TextRange.getEnd(r.range), lines),
        }));
    }
}
