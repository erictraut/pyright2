/*
 * emptyUri.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * URI class that represents an empty URI.
 */

import { JsonObjType } from 'typeserver/files/uri/baseUri.js';
import { ConstantUri } from 'typeserver/files/uri/constantUri.js';

const EmptyKey = '<empty>';

export class EmptyUri extends ConstantUri {
    private static _instance = new EmptyUri();

    private constructor() {
        super(EmptyKey);
    }

    static get instance() {
        return EmptyUri._instance;
    }

    override toJsonObj(): JsonObjType {
        return {
            _key: EmptyKey,
        };
    }

    static isEmptyUri(uri: any): uri is EmptyUri {
        return uri?._key === EmptyKey;
    }

    override isEmpty(): boolean {
        return true;
    }

    override toString(): string {
        return '';
    }
}
