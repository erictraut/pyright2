/*
 * checker.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright type checker. These tests also
 * exercise the type evaluator (which the checker relies
 * heavily upon).
 */

import { pythonVersion3_10, pythonVersion3_8, pythonVersion3_9 } from 'typeserver/common/pythonVersion.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { typeAnalyzeSampleFiles, validateResults } from 'typeserver/tests/testUtils.js';

test('BadToken1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['badToken1.py']);

    // We include this in the checker test rather than the tokenizer or
    // parser test suite because it has cascading effects that potentially
    // affect the type checker logic.
    validateResults(analysisResults, 1);
});

test('Unicode1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unicode1.py']);
    validateResults(analysisResults, 1);
});

test('CircularBaseClass', () => {
    const analysisResults = typeAnalyzeSampleFiles(['circularBaseClass.py']);

    validateResults(analysisResults, 2);
});

test('Private1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, optional diagnostics are ignored.
    let analysisResults = typeAnalyzeSampleFiles(['private1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportPrivateUsage = 'error';
    analysisResults = typeAnalyzeSampleFiles(['private1.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('Constant1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, optional diagnostics are ignored.
    let analysisResults = typeAnalyzeSampleFiles(['constant1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportConstantRedefinition = 'error';
    analysisResults = typeAnalyzeSampleFiles(['constant1.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('AbstractClass1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass1.py']);

    validateResults(analysisResults, 2);
});

test('AbstractClass2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass2.py']);

    validateResults(analysisResults, 0);
});

test('AbstractClass3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass3.py']);

    validateResults(analysisResults, 0);
});

test('AbstractClass4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass4.py']);

    validateResults(analysisResults, 1);
});

test('AbstractClass5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass5.py']);

    validateResults(analysisResults, 3);
});

test('AbstractClass6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass6.py']);

    validateResults(analysisResults, 1);
});

test('AbstractClass7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass7.py']);

    validateResults(analysisResults, 1);
});

test('AbstractClass8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass8.py']);

    validateResults(analysisResults, 1);
});

test('AbstractClass9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass9.py']);

    validateResults(analysisResults, 0);
});

test('AbstractClass10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass10.py']);

    validateResults(analysisResults, 6);
});

test('AbstractClass11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['abstractClass11.py']);

    validateResults(analysisResults, 2);
});

test('Constants1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constants1.py']);

    validateResults(analysisResults, 20);
});

test('NoReturn1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['noreturn1.py']);

    validateResults(analysisResults, 5);
});

test('NoReturn2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['noreturn2.py']);

    validateResults(analysisResults, 0);
});

test('NoReturn3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['noreturn3.py']);

    validateResults(analysisResults, 0);
});

test('NoReturn4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['noreturn4.py']);

    validateResults(analysisResults, 0);
});

test('With1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['with1.py']);

    validateResults(analysisResults, 4);
});

test('With2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['with2.py']);

    validateResults(analysisResults, 3);
});

test('With3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['with3.py']);

    validateResults(analysisResults, 4);
});

test('With4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults1 = typeAnalyzeSampleFiles(['with4.py'], configOptions);
    validateResults(analysisResults1, 4);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults2 = typeAnalyzeSampleFiles(['with4.py'], configOptions);
    validateResults(analysisResults2, 0);
});

test('With5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['with5.py']);

    validateResults(analysisResults, 0);
});

test('With6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['with6.py']);

    validateResults(analysisResults, 0);
});

test('Mro1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['mro1.py']);

    validateResults(analysisResults, 1);
});

test('Mro2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['mro2.py']);

    validateResults(analysisResults, 1);
});

test('Mro3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['mro3.py']);

    validateResults(analysisResults, 0);
});

test('Mro4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['mro4.py']);

    validateResults(analysisResults, 1);
});

test('DefaultInitializer1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, the reportCallInDefaultInitializer is disabled.
    let analysisResults = typeAnalyzeSampleFiles(['defaultInitializer1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportCallInDefaultInitializer = 'error';
    analysisResults = typeAnalyzeSampleFiles(['defaultInitializer1.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('UnnecessaryIsInstance1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['unnecessaryIsInstance1.py'], configOptions);
    validateResults(analysisResults, 1);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportUnnecessaryIsInstance = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unnecessaryIsInstance1.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('UnnecessaryIsInstance2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['unnecessaryIsInstance2.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportUnnecessaryIsInstance = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unnecessaryIsInstance2.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('UnnecessaryIsSubclass1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['unnecessaryIsSubclass1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportUnnecessaryIsInstance = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unnecessaryIsSubclass1.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('UnnecessaryCast1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['unnecessaryCast1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportUnnecessaryCast = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unnecessaryCast1.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('UnnecessaryContains1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['unnecessaryContains1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportUnnecessaryContains = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unnecessaryContains1.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('TypeIgnore1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['typeIgnore1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Disable type ignore
    configOptions.diagnosticRuleSet.enableTypeIgnoreComments = false;
    analysisResults = typeAnalyzeSampleFiles(['typeIgnore1.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TypeIgnore2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['typeIgnore2.py'], configOptions);
    validateResults(analysisResults, 0);

    // Disable type ignore
    configOptions.diagnosticRuleSet.enableTypeIgnoreComments = false;
    analysisResults = typeAnalyzeSampleFiles(['typeIgnore2.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypeIgnore3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['typeIgnore3.py'], configOptions);
    validateResults(analysisResults, 0);

    // Disable type ignore
    configOptions.diagnosticRuleSet.enableTypeIgnoreComments = false;
    analysisResults = typeAnalyzeSampleFiles(['typeIgnore3.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypeIgnore4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['typeIgnore4.py'], configOptions);
    validateResults(analysisResults, 0);

    configOptions.diagnosticRuleSet.reportUnnecessaryTypeIgnoreComment = 'error';
    analysisResults = typeAnalyzeSampleFiles(['typeIgnore4.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('TypeIgnore5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['typeIgnore5.py'], configOptions);
    validateResults(analysisResults, 0);

    configOptions.diagnosticRuleSet.reportUnnecessaryTypeIgnoreComment = 'warning';
    analysisResults = typeAnalyzeSampleFiles(['typeIgnore5.py'], configOptions);
    validateResults(analysisResults, 0, 1);
});

test('PyrightIgnore1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults = typeAnalyzeSampleFiles(['pyrightIgnore1.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('PyrightIgnore2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['pyrightIgnore2.py'], configOptions);
    validateResults(analysisResults, 2);

    configOptions.diagnosticRuleSet.reportUnnecessaryTypeIgnoreComment = 'warning';
    analysisResults = typeAnalyzeSampleFiles(['pyrightIgnore2.py'], configOptions);
    validateResults(analysisResults, 2, 3);
});

test('PyrightComment1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults = typeAnalyzeSampleFiles(['pyrightComment1.py'], configOptions);
    validateResults(analysisResults, 9);
});

test('DuplicateImports1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, optional diagnostics are ignored.
    let analysisResults = typeAnalyzeSampleFiles(['duplicateImports1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportDuplicateImport = 'error';
    analysisResults = typeAnalyzeSampleFiles(['duplicateImports1.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('ParamNames1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    let analysisResults = typeAnalyzeSampleFiles(['paramNames1.py'], configOptions);
    validateResults(analysisResults, 0, 11);

    configOptions.diagnosticRuleSet.reportSelfClsParameterName = 'none';
    analysisResults = typeAnalyzeSampleFiles(['paramNames1.py'], configOptions);
    validateResults(analysisResults, 0, 0);

    configOptions.diagnosticRuleSet.reportSelfClsParameterName = 'error';
    analysisResults = typeAnalyzeSampleFiles(['paramNames1.py'], configOptions);
    validateResults(analysisResults, 11, 0);
});

test('ParamType1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['paramType1.py']);
    validateResults(analysisResults, 9);
});

test('Python2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['python2.py']);

    validateResults(analysisResults, 8);
});

test('InconsistentSpaceTab1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['inconsistentSpaceTab1.py']);

    validateResults(analysisResults, 1);
});

test('InconsistentSpaceTab2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['inconsistentSpaceTab2.py']);

    validateResults(analysisResults, 1);
});

test('DuplicateDeclaration1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['duplicateDeclaration1.py']);

    validateResults(analysisResults, 10);
});

test('DuplicateDeclaration2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['duplicateDeclaration2.py']);

    validateResults(analysisResults, 4);
});

test('Strings1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    const analysisResults1 = typeAnalyzeSampleFiles(['strings1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportImplicitStringConcatenation = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['strings1.py'], configOptions);
    validateResults(analysisResults2, 2);
});

test('UnusedExpression1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, this is a warning.
    let analysisResults = typeAnalyzeSampleFiles(['unusedExpression1.py'], configOptions);
    validateResults(analysisResults, 0, 14);

    // Disable it.
    configOptions.diagnosticRuleSet.reportUnusedExpression = 'none';
    analysisResults = typeAnalyzeSampleFiles(['unusedExpression1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportUnusedExpression = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unusedExpression1.py'], configOptions);
    validateResults(analysisResults, 14);
});

test('UnusedImport1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Enabled it
    configOptions.diagnosticRuleSet.reportUnusedImport = 'warning';
    let analysisResults = typeAnalyzeSampleFiles(['unusedImport1.py'], configOptions);
    validateResults(analysisResults, 0, 2);

    // Disable it.
    configOptions.diagnosticRuleSet.reportUnusedImport = 'none';
    analysisResults = typeAnalyzeSampleFiles(['unusedImport1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportUnusedImport = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unusedImport1.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('UnusedImport2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Disable it.
    configOptions.diagnosticRuleSet.reportUnusedImport = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['unusedImport2.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportUnusedImport = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unusedImport2.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('UninitializedVariable1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, this is off.
    let analysisResults = typeAnalyzeSampleFiles(['uninitializedVariable1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportUninitializedInstanceVariable = 'error';
    analysisResults = typeAnalyzeSampleFiles(['uninitializedVariable1.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('UninitializedVariable2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, this is off.
    let analysisResults = typeAnalyzeSampleFiles(['uninitializedVariable2.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportUninitializedInstanceVariable = 'error';
    analysisResults = typeAnalyzeSampleFiles(['uninitializedVariable2.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('DeprecatedAlias1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults1 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults2, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults3 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults3, 0, 0, 0, undefined, undefined, 0);

    // Now enable the deprecateTypingAliases setting.
    configOptions.diagnosticRuleSet.deprecateTypingAliases = true;

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults4 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults4, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults5 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults5, 0, 0, 0, undefined, undefined, 45);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults6 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults6, 0, 0, 0, undefined, undefined, 49);

    // Now change reportDeprecated to emit an error.
    configOptions.diagnosticRuleSet.reportDeprecated = 'error';

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults7 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults7, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults8 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults8, 45, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults9 = typeAnalyzeSampleFiles(['deprecatedAlias1.py'], configOptions);
    validateResults(analysisResults9, 49, 0, 0, undefined, undefined, 0);
});

test('DeprecatedAlias2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults1 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults2, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults3 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults3, 0, 0, 0, undefined, undefined, 0);

    // Now enable the deprecateTypingAliases setting.
    configOptions.diagnosticRuleSet.deprecateTypingAliases = true;

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults4 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults4, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults5 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults5, 0, 0, 0, undefined, undefined, 42);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults6 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults6, 0, 0, 0, undefined, undefined, 46);

    // Now change reportDeprecated to emit an error.
    configOptions.diagnosticRuleSet.reportDeprecated = 'error';

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults7 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults7, 0, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults8 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults8, 42, 0, 0, undefined, undefined, 0);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults9 = typeAnalyzeSampleFiles(['deprecatedAlias2.py'], configOptions);
    validateResults(analysisResults9, 46, 0, 0, undefined, undefined, 0);
});

test('Deprecated2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated2.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 14);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated2.py'], configOptions);
    validateResults(analysisResults2, 14);
});

test('Deprecated3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated3.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 5);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated3.py'], configOptions);
    validateResults(analysisResults2, 5);
});

test('Deprecated4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated4.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 7);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated4.py'], configOptions);
    validateResults(analysisResults2, 7);
});

test('Deprecated5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated5.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 2);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated5.py'], configOptions);
    validateResults(analysisResults2, 2);
});

test('Deprecated6', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated6.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 3);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated6.py'], configOptions);
    validateResults(analysisResults2, 3);
});

test('Deprecated7', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated7.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 2);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated7.py'], configOptions);
    validateResults(analysisResults2, 2);
});

test('Deprecated8', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['deprecated8.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 0, undefined, undefined, 4);

    configOptions.diagnosticRuleSet.reportDeprecated = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['deprecated8.py'], configOptions);
    validateResults(analysisResults2, 4);
});
