/*
 * docRange.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Specifies the range of text within a document.
 */

import { Uri } from '../files/uri/uri.ts';
import { Range } from './textRange.ts';

export interface DocumentRange {
    uri: Uri;
    range: Range;
}
