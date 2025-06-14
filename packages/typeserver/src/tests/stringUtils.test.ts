/*
 * stringUtils.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import assert from 'assert';

import { Comparison } from 'typeserver/utils/comparisonUtils.js';
import {
    compareStringsCaseInsensitive,
    compareStringsCaseSensitive,
    isPatternInSymbol,
} from 'typeserver/utils/stringUtils.js';

test('stringUtils isPatternInSymbol', () => {
    assert.equal(isPatternInSymbol('', 'abcd'), true);

    assert.equal(isPatternInSymbol('abcd', 'abcd'), true);
    assert.equal(isPatternInSymbol('abc', 'abcd'), true);

    assert.equal(isPatternInSymbol('ABCD', 'abcd'), true);
    assert.equal(isPatternInSymbol('ABC', 'abcd'), true);

    assert.equal(isPatternInSymbol('acbd', 'abcd'), false);
    assert.equal(isPatternInSymbol('abce', 'abcd'), false);
    assert.equal(isPatternInSymbol('abcde', 'abcd'), false);
    assert.equal(isPatternInSymbol('azcde', 'abcd'), false);
    assert.equal(isPatternInSymbol('acde', 'abcd'), false);
    assert.equal(isPatternInSymbol('zbcd', 'abcd'), false);
});

test('CoreCompareStringsCaseInsensitive1', () => {
    assert.equal(compareStringsCaseInsensitive('Hello', 'hello'), Comparison.EqualTo);
});

test('CoreCompareStringsCaseInsensitive2', () => {
    assert.equal(compareStringsCaseInsensitive('Hello', undefined), Comparison.GreaterThan);
});

test('CoreCompareStringsCaseInsensitive3', () => {
    assert.equal(compareStringsCaseInsensitive(undefined, 'hello'), Comparison.LessThan);
});

test('CoreCompareStringsCaseInsensitive4', () => {
    assert.equal(compareStringsCaseInsensitive(undefined, undefined), Comparison.EqualTo);
});

test('CoreCompareStringsCaseSensitive', () => {
    assert.equal(compareStringsCaseSensitive('Hello', 'hello'), Comparison.LessThan);
});
