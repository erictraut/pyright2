/*
 * symbolNameUtils.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import assert from 'assert';
import {
    isConstantName,
    isDunderName,
    isPrivateName,
    isPrivateOrProtectedName,
    isProtectedName,
    isPublicConstantOrTypeAlias,
    isTypeAliasName,
} from 'typeserver/binder/symbolNameUtils.js';

test('symbolNameUtils isPrivateName', () => {
    assert.strictEqual(isPrivateName('__var'), true);
    assert.strictEqual(isPrivateName('__Var_1-2'), true);

    assert.strictEqual(isPrivateName('var'), false);
    assert.strictEqual(isPrivateName('_var'), false);
    assert.strictEqual(isPrivateName('__var__'), false);
});

test('symbolNameUtils isProtectedName', () => {
    assert.strictEqual(isProtectedName('_var'), true);
    assert.strictEqual(isProtectedName('_Var_1-2'), true);

    assert.strictEqual(isProtectedName('__var'), false);
    assert.strictEqual(isProtectedName('var'), false);
});

test('symbolNameUtils isPrivateOrProtectedName', () => {
    assert.strictEqual(isPrivateOrProtectedName('_var'), true);
    assert.strictEqual(isPrivateOrProtectedName('__VAR_1-2'), true);

    assert.strictEqual(isPrivateOrProtectedName('var'), false);
    assert.strictEqual(isPrivateOrProtectedName('__init__'), false);
});

test('symbolNameUtils isDunderName', () => {
    assert.strictEqual(isDunderName('__init__'), true);
    assert.strictEqual(isDunderName('__CONSTANT__'), true);

    assert.strictEqual(isDunderName('____'), false);
    assert.strictEqual(isDunderName('_init_'), false);
    assert.strictEqual(isDunderName('init'), false);
});

test('symbolNameUtils isConstantName', () => {
    assert.strictEqual(isConstantName('CONSTANT'), true);
    assert.strictEqual(isConstantName('CONSTANT_NAME'), true);
    assert.strictEqual(isConstantName('CONSTANT_42'), true);
    assert.strictEqual(isConstantName('_CONSTANT_42'), true);
    assert.strictEqual(isConstantName('__CONSTANT_42'), true);

    assert.strictEqual(isConstantName('Constant'), false);
    assert.strictEqual(isConstantName('constant'), false);
    assert.strictEqual(isConstantName('____'), false);
});

test('symbolNameUtils isTypeAliasName', () => {
    assert.strictEqual(isTypeAliasName('TypeAlias'), true);
    assert.strictEqual(isTypeAliasName('Type_alias'), true);
    assert.strictEqual(isTypeAliasName('TypeAlias1'), true);
    assert.strictEqual(isTypeAliasName('_TypeAlias'), true);
    assert.strictEqual(isTypeAliasName('__TypeAlias'), true);

    assert.strictEqual(isTypeAliasName('invalidTypeAlias'), false);
    assert.strictEqual(isTypeAliasName('1TypeAlias'), false);
    assert.strictEqual(isTypeAliasName('___TypeAlias'), false);
});

test('symbolNameUtils isPublicConstantOrTypeAliasName', () => {
    assert.strictEqual(isPublicConstantOrTypeAlias('CONSTANT'), true);
    assert.strictEqual(isPublicConstantOrTypeAlias('TypeAlias'), true);

    assert.strictEqual(isPublicConstantOrTypeAlias('var'), false);
    assert.strictEqual(isPublicConstantOrTypeAlias('_CONSTANT'), false);
    assert.strictEqual(isPublicConstantOrTypeAlias('_TypeAlias'), false);
    assert.strictEqual(isPublicConstantOrTypeAlias('__TypeAlias'), false);
});
