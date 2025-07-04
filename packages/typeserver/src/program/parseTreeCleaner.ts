/*
 * parseTreeCleaner.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * A parse tree walker that's used to clean any analysis
 * information hanging off the parse tree. It's used when
 * dependent files have been modified and the file requires
 * reanalysis. Without this, we'd need to generate a fresh
 * parse tree from scratch.
 */

import * as AnalyzerNodeInfo from 'typeserver/common/analyzerNodeInfo.js';
import { ModuleNode, ParseNode } from 'typeserver/parser/parseNodes.js';
import { ParseTreeWalker } from 'typeserver/parser/parseTreeWalker.js';

export class ParseTreeCleanerWalker extends ParseTreeWalker {
    private _parseTree: ModuleNode;

    constructor(parseTree: ModuleNode) {
        super();

        this._parseTree = parseTree;
    }

    clean() {
        this.walk(this._parseTree);
    }

    override visitNode(node: ParseNode) {
        AnalyzerNodeInfo.cleanNodeAnalysisInfo(node);
        return super.visitNode(node);
    }
}
