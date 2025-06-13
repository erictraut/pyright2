/*
 * docRange.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Specifies the range of text within a document.
 */

import { Range } from 'typeserver/common/textRange.js';
import { Uri } from 'typeserver/files/uri/uri.js';

export interface DocumentRange {
    uri: Uri;
    range: Range;
}
