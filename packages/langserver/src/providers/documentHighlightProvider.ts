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

import { DocumentSymbolCollector } from 'langserver/providers/documentSymbolCollector.js';
import * as ParseTreeUtils from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetsToRange, convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { Position, TextRange } from 'typeserver/common/textRange.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { IProgramView, ReferenceUseCase } from 'typeserver/extensibility/extensibility.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';

export class DocumentHighlightProvider {
    private readonly _parseResults: ParseFileResults | undefined;

    constructor(
        private _program: IProgramView,
        private _fileUri: Uri,
        private _position: Position,
        private _token: CancellationToken
    ) {
        this._parseResults = this._program.getParseResults(this._fileUri);
    }

    getDocumentHighlight(): DocumentHighlight[] | undefined {
        throwIfCancellationRequested(this._token);
        if (!this._parseResults) {
            return undefined;
        }

        const offset = convertPositionToOffset(this._position, this._parseResults.tokenizerOutput.lines);
        if (offset === undefined) {
            return undefined;
        }

        const node = ParseTreeUtils.findNodeByOffset(this._parseResults.parserOutput.parseTree, offset);
        if (node === undefined) {
            return undefined;
        }

        if (node.nodeType !== ParseNodeType.Name) {
            return undefined;
        }

        const results = DocumentSymbolCollector.collectFromNode(
            this._program,
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
                r.node.nodeType === ParseNodeType.Name && ParseTreeUtils.isWriteAccess(r.node)
                    ? DocumentHighlightKind.Write
                    : DocumentHighlightKind.Read,
            range: convertOffsetsToRange(r.range.start, TextRange.getEnd(r.range), lines),
        }));
    }
}
