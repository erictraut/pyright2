/*
 * typeEvaluator5.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright type evaluator. Tests are split
 * arbitrarily among multiple files so they can run in parallel.
 */

import { pythonVersion3_11, pythonVersion3_12, pythonVersion3_13 } from '../common/pythonVersion.ts';
import { ConfigOptions } from '../config/configOptions.ts';
import { Uri } from '../files/uri/uri.ts';
import { typeAnalyzeSampleFiles, validateResults } from './testUtils.ts';

test('TypeParams1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams1.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('TypeParams2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults1 = typeAnalyzeSampleFiles(['typeParams2.py'], configOptions);
    validateResults(analysisResults1, 2);

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults2 = typeAnalyzeSampleFiles(['typeParams2.py'], configOptions);
    validateResults(analysisResults2, 0);
});

test('TypeParams3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams3.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('TypeParams4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams4.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('TypeParams5', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams5.py'], configOptions);
    validateResults(analysisResults, 9);
});

test('TypeParams6', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams6.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TypeParams7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams7.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypeParams8', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeParams8.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('AutoVariance1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['autoVariance1.py'], configOptions);
    validateResults(analysisResults, 17);
});

test('AutoVariance2', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['autoVariance2.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('AutoVariance3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['autoVariance3.py'], configOptions);
    validateResults(analysisResults, 18);
});

test('AutoVariance4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['autoVariance4.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('AutoVariance5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['autoVariance5.py']);
    validateResults(analysisResults, 0);
});

test('TypeAliasStatement1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeAliasStatement1.py'], configOptions);
    validateResults(analysisResults, 10);
});

test('TypeAliasStatement2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults1 = typeAnalyzeSampleFiles(['typeAliasStatement2.py'], configOptions);
    validateResults(analysisResults1, 1);

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults2 = typeAnalyzeSampleFiles(['typeAliasStatement2.py'], configOptions);
    validateResults(analysisResults2, 0);
});

test('TypeAliasStatement3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeAliasStatement3.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('TypeAliasStatement4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeAliasStatement4.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('TypeAliasStatement5', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeAliasStatement5.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('Hashability1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['hashability1.py']);
    validateResults(analysisResults, 10);
});

test('Hashability2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['hashability2.py']);
    validateResults(analysisResults, 6);
});

test('Hashability3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['hashability3.py']);
    validateResults(analysisResults, 1);
});

test('Override1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['override1.py']);
    validateResults(analysisResults, 5);
});

test('Override2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['override2.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportImplicitOverride = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['override2.py'], configOptions);
    validateResults(analysisResults2, 2);
});

test('TypeVarDefault1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefault1.py']);
    validateResults(analysisResults, 14);
});

test('TypeVarDefault2', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefault2.py'], configOptions);
    validateResults(analysisResults, 24);
});

test('TypeVarDefault3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefault3.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('TypeVarDefault4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefault4.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TypeVarDefault5', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefault5.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarDefaultClass1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultClass1.py']);
    validateResults(analysisResults, 0);
});

test('TypeVarDefaultClass2', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultClass2.py'], configOptions);
    validateResults(analysisResults, 10);
});

test('TypeVarDefaultClass3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultClass3.py'], configOptions);
    validateResults(analysisResults, 9);
});

test('TypeVarDefaultClass4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultClass4.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarDefaultTypeAlias1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultTypeAlias1.py']);
    validateResults(analysisResults, 0);
});

test('TypeVarDefaultTypeAlias2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultTypeAlias2.py']);
    validateResults(analysisResults, 11);
});

test('TypeVarDefaultTypeAlias3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultTypeAlias3.py'], configOptions);
    validateResults(analysisResults, 10);
});

test('TypeVarDefaultFunction1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultFunction1.py']);
    validateResults(analysisResults, 0);
});

test('TypeVarDefaultFunction2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultFunction2.py']);
    validateResults(analysisResults, 1);
});

test('TypeVarDefaultFunction3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_13;

    const analysisResults = typeAnalyzeSampleFiles(['typeVarDefaultFunction3.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('FutureImport1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['futureImport1.py']);
    validateResults(analysisResults, 0);
});

test('FutureImport2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['futureImport2.py']);
    validateResults(analysisResults, 2);
});

test('FutureImport3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['futureImport3.py']);
    validateResults(analysisResults, 1);
});

test('Conditional1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['conditional1.py']);
    validateResults(analysisResults, 15);
});

test('TypePrinter1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typePrinter1.py']);
    validateResults(analysisResults, 0);
});

test('TypePrinter3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typePrinter3.py']);
    validateResults(analysisResults, 2);
});

test('TypeAliasType1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_12;

    const analysisResults = typeAnalyzeSampleFiles(['typeAliasType1.py'], configOptions);
    validateResults(analysisResults, 17);
});

test('TypeAliasType2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAliasType2.py']);
    validateResults(analysisResults, 7);
});

test('TypedDictReadOnly1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults = typeAnalyzeSampleFiles(['typedDictReadOnly1.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypedDictReadOnly2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults = typeAnalyzeSampleFiles(['typedDictReadOnly2.py'], configOptions);
    validateResults(analysisResults, 17);
});

test('TypedDictClosed1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed1.py'], configOptions);
    validateResults(analysisResults, 7);
});

test('TypedDictClosed2', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed2.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypedDictClosed3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed3.py'], configOptions);
    validateResults(analysisResults, 10);
});

test('TypedDictClosed4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed4.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('TypedDictClosed5', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed5.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('TypedDictClosed6', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed6.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('TypedDictClosed7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed7.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('TypedDictClosed8', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed8.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypedDictClosed9', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed9.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('TypedDictClosed10', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictClosed10.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('DataclassTransform1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassTransform1.py']);

    validateResults(analysisResults, 6);
});

test('DataclassTransform2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassTransform2.py']);

    validateResults(analysisResults, 6);
});

test('DataclassTransform3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassTransform3.py']);

    validateResults(analysisResults, 6);
});

test('DataclassTransform4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassTransform4.py']);

    validateResults(analysisResults, 2);
});

test('Async1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['async1.py']);

    validateResults(analysisResults, 6);
});

test('TypeCheckOnly1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeCheckOnly1.py']);
    validateResults(analysisResults, 4);
});

test('NoTypeCheck1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['noTypeCheck1.py']);
    validateResults(analysisResults, 2);
});
