/*
 * providerTooltipUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Helper functions for formatting text that can appear in hover text,
 * completion suggestions, etc.
 */

import { SignatureDisplayType } from 'langserver/server/languageServerInterface.js';
import {
    ITypeServer,
    Position,
    Range,
    SignatureTypeParts,
    Type,
    TypeFlags,
} from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

// The number of spaces to indent each parameter, after moving to a newline in tooltips.
const functionParamIndentOffset = 4;

export function getToolTipForType(
    typeServer: ITypeServer,
    type: Type | undefined,
    label: string,
    name: string,
    isProperty: boolean,
    functionSignatureDisplay: SignatureDisplayType
): string {
    let toolTipText = '';
    if (type && type.flags & TypeFlags.Callable) {
        const callableParts = typeServer.printCallableTypeParts(type)?.signatures;
        if (callableParts) {
            if (callableParts.length > 1) {
                toolTipText = label.length > 0 ? `(${label})\n` : '';
                toolTipText += getOverloadedTooltip(callableParts, name, functionSignatureDisplay);
            } else {
                toolTipText = getCallableTooltip(callableParts[0], label, name, isProperty, functionSignatureDisplay);
            }
            return toolTipText;
        }
    }

    toolTipText = label.length > 0 ? `(${label}) ` : '';
    const typeText = type ? typeServer.printType(type) : 'Unknown';
    toolTipText += `${name}: ${typeText}`;

    return toolTipText;
}

export function getOverloadedTooltip(
    sigParts: SignatureTypeParts[],
    name: string,
    functionSignatureDisplay: SignatureDisplayType,
    columnThreshold = 70 // VSCode's default hover width
) {
    let content = '';
    const overloads = sigParts.map((sig) =>
        getCallableTooltip(sig, /* label */ '', name, /* isProperty */ false, functionSignatureDisplay)
    );

    for (let i = 0; i < overloads.length; i++) {
        if (i !== 0 && overloads[i].length > columnThreshold && overloads[i - 1].length <= columnThreshold) {
            content += '\n';
        }

        content += overloads[i] + `: ...`;

        if (i < overloads.length - 1) {
            content += '\n';
            if (overloads[i].length > columnThreshold) {
                content += '\n';
            }
        }
    }

    return content;
}

export function getCallableTooltip(
    sigParts: SignatureTypeParts,
    label: string,
    functionName: string,
    isProperty = false,
    functionSignatureDisplay: SignatureDisplayType
) {
    const labelFormatted = label.length === 0 ? '' : `(${label}) `;
    const indentStr =
        functionSignatureDisplay === SignatureDisplayType.Formatted ? '\n' + ' '.repeat(functionParamIndentOffset) : '';
    const paramSignature = `${formatSignature(sigParts.parameters, indentStr, functionSignatureDisplay)} -> ${
        sigParts.returnType
    }`;

    const sep = isProperty ? ': ' : '';
    let defKeyword = '';
    if (!isProperty) {
        defKeyword = 'def ';

        if (sigParts.async) {
            defKeyword = 'async ' + defKeyword;
        }
    }

    return `${labelFormatted}${defKeyword}${functionName}${sep}${paramSignature}`;
}

export function getTypeForToolTip(
    typeServer: ITypeServer,
    fileUri: Uri,
    position: Position,
    callNodeRange?: Range
): Type | undefined {
    const type = typeServer.getType(fileUri, position)?.type;
    if (!type) {
        return undefined;
    }

    if (!callNodeRange) {
        return type;
    }

    return limitOverloadBasedOnCall(typeServer, type, fileUri, callNodeRange);
}

export function limitOverloadBasedOnCall(
    typeServer: ITypeServer,
    type: Type,
    fileUri: Uri,
    callNodeRange: Range
): Type {
    // If it's a callable, see if it's part of a call expression.
    // If so, we may be able to eliminate some of the overloads based on
    // the overload resolution.
    if ((type.flags & TypeFlags.Callable) === 0) {
        return type;
    }

    const callTypeResult = typeServer.getType(fileUri, callNodeRange.start, callNodeRange.end);
    return callTypeResult?.called ?? type;
}

// Only formats signature if there is more than one parameter
function formatSignature(paramParts: string[], indentStr: string, functionSignatureDisplay: SignatureDisplayType) {
    return functionSignatureDisplay === SignatureDisplayType.Formatted && paramParts.length > 1
        ? `(${indentStr}${paramParts.join(',' + indentStr)}\n)`
        : `(${paramParts.join(', ')})`;
}
