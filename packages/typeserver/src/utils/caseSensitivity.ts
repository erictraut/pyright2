/*
 * caseSensitivity.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Interface to determine whether the given uri string should be case
 * sensitive or not.
 */

export interface CaseSensitivityDetector {
    isCaseSensitive(uri: string): boolean;
}
