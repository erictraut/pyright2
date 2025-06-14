/*
 * comparisons.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Comparison utility functions.
 */

export const enum Comparison {
    LessThan = -1,
    EqualTo = 0,
    GreaterThan = 1,
}

export function compareComparableValues(a: string | undefined, b: string | undefined): Comparison;
export function compareComparableValues(a: number | undefined, b: number | undefined): Comparison;
export function compareComparableValues(a: string | number | undefined, b: string | number | undefined) {
    return a === b
        ? Comparison.EqualTo
        : a === undefined
        ? Comparison.LessThan
        : b === undefined
        ? Comparison.GreaterThan
        : a < b
        ? Comparison.LessThan
        : Comparison.GreaterThan;
}

export function compareValues(a: number | undefined, b: number | undefined): Comparison {
    return compareComparableValues(a, b);
}
