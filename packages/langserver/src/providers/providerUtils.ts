/*
 * providerUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Common utility functions used by language server providers.
 */

import { findNodeByOffset, getEnclosingClass, getEnclosingFunction } from 'typeserver/common/parseTreeUtils.js';
import { convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { ClassNode, FunctionNode } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { Position } from 'typeserver/protocol/typeServerProtocol.js';

// Returns the class node that contains the specified position, or undefined if no class is found.
export function getClassForPosition(pos: Position, parseResults: ParseFileResults): ClassNode | undefined {
    const classOffset = convertPositionToOffset(pos, parseResults.tokenizerOutput.lines);
    if (!classOffset) {
        return undefined;
    }

    const targetNode = findNodeByOffset(parseResults.parserOutput.parseTree, classOffset);
    if (!targetNode) {
        return undefined;
    }

    return getEnclosingClass(targetNode, /* stopAtFunction */ true);
}

// Returns the function node that contains the specified position, or undefined if no class is found.
export function getFunctionForPosition(pos: Position, parseResults: ParseFileResults): FunctionNode | undefined {
    const functionOffset = convertPositionToOffset(pos, parseResults.tokenizerOutput.lines);
    if (!functionOffset) {
        return undefined;
    }

    const targetNode = findNodeByOffset(parseResults.parserOutput.parseTree, functionOffset);
    if (!targetNode) {
        return undefined;
    }

    return getEnclosingFunction(targetNode);
}
