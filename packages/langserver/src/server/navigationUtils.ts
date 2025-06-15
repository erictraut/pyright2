/*
 * navigationUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Helper functions for navigating files.
 */

import { Location } from 'vscode-languageserver-types';

import { DocumentRange } from 'typeserver/common/docRange.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';

export function convertDocumentRangesToLocation(typeServer: ITypeServer, ranges: DocumentRange[]): Location[] {
    const locations: Location[] = [];

    ranges.forEach((range) => {
        const loc = convertDocumentRangeToLocation(typeServer, range);
        if (loc) {
            locations.push(loc);
        }
    });

    return locations;
}

export function convertDocumentRangeToLocation(typeServer: ITypeServer, range: DocumentRange): Location | undefined {
    const realUri = typeServer.convertToRealUri(range.uri);
    if (!realUri) {
        return undefined;
    }

    return Location.create(realUri.toString(), range.range);
}
