/*
 * typeEvaluator3.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright type evaluator. Tests are split
 * arbitrarily among multiple files so they can run in parallel.
 */

import {
    pythonVersion3_10,
    pythonVersion3_11,
    pythonVersion3_12,
    pythonVersion3_13,
    pythonVersion3_9,
} from '../common/pythonVersion.ts';
import { ConfigOptions } from '../config/configOptions.ts';
import { Uri } from '../files/uri/uri.ts';
import { typeAnalyzeSampleFiles, validateResults } from './testUtils.ts';

test('Module1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['module1.py']);

    validateResults(analysisResults, 0);
});

test('Module2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['module2.py']);

    validateResults(analysisResults, 0);
});

test('Module3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['module3.py']);

    validateResults(analysisResults, 0);
});

test('Ellipsis1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['ellipsis1.pyi']);

    validateResults(analysisResults, 10);
});

test('Generator1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator1.py']);

    validateResults(analysisResults, 12);
});

test('Generator2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator2.py']);

    validateResults(analysisResults, 3);
});

test('Generator3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator3.py']);

    validateResults(analysisResults, 1);
});

test('Generator4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator4.py']);

    validateResults(analysisResults, 0);
});

test('Generator5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator5.py']);

    validateResults(analysisResults, 0);
});

test('Generator6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator6.py']);

    validateResults(analysisResults, 0);
});

test('Generator7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator7.py']);

    validateResults(analysisResults, 0);
});

test('Generator8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator8.py']);

    validateResults(analysisResults, 0);
});

test('Generator9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator9.py']);

    validateResults(analysisResults, 2);
});

test('Generator10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator10.py']);

    validateResults(analysisResults, 0);
});

test('Generator11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator11.py']);

    validateResults(analysisResults, 2);
});

test('Generator12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator12.py']);

    validateResults(analysisResults, 1);
});

test('Generator13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator13.py']);

    validateResults(analysisResults, 0);
});

test('Generator14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator14.py']);

    validateResults(analysisResults, 0);
});

test('Generator15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator15.py']);

    validateResults(analysisResults, 3);
});

test('Generator16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generator16.py']);

    validateResults(analysisResults, 1);
});

test('Await1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['await1.py']);

    validateResults(analysisResults, 0);
});

test('Await2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['await2.py']);

    validateResults(analysisResults, 0);
});

test('Await3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['await3.py']);

    validateResults(analysisResults, 6);
});

test('Coroutines1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // This functionality is deprecated in Python 3.11, so the type no longer
    // exists in typing.pyi after that point.
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['coroutines1.py'], configOptions);

    validateResults(analysisResults, 5);
});

test('Coroutines2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['coroutines2.py']);

    validateResults(analysisResults, 0);
});

test('Coroutines3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // This functionality is deprecated in Python 3.11, so the type no longer
    // exists in typing.pyi after that point.
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['coroutines3.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('Coroutines4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['coroutines4.py']);

    validateResults(analysisResults, 0);
});

test('Loop1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop1.py']);

    validateResults(analysisResults, 2);
});

test('Loop2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop2.py']);

    validateResults(analysisResults, 0);
});

test('Loop3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop3.py']);

    validateResults(analysisResults, 0);
});

test('Loop4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop4.py']);

    validateResults(analysisResults, 0);
});

test('Loop5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop5.py']);

    validateResults(analysisResults, 0);
});

test('Loop6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop6.py']);

    validateResults(analysisResults, 0);
});

test('Loop7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop7.py']);

    validateResults(analysisResults, 0);
});

test('Loop8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop8.py']);

    validateResults(analysisResults, 0);
});

test('Loop9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop9.py']);

    validateResults(analysisResults, 0);
});

test('Loop10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop10.py']);

    validateResults(analysisResults, 0);
});

test('Loop11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop11.py']);

    validateResults(analysisResults, 3);
});

test('Loop12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop12.py']);

    validateResults(analysisResults, 1);
});

test('Loop13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop13.py']);

    validateResults(analysisResults, 0);
});

test('Loop14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop14.py']);

    validateResults(analysisResults, 0);
});

test('Loop15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop15.py']);

    validateResults(analysisResults, 0);
});

test('Loop16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop16.py']);

    validateResults(analysisResults, 0);
});

test('Loop17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop17.py']);

    validateResults(analysisResults, 0);
});

test('Loop18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop18.py']);

    validateResults(analysisResults, 0);
});

test('Loop19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop19.py']);

    validateResults(analysisResults, 0);
});

test('Loop20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop20.py']);

    validateResults(analysisResults, 0);
});

test('Loop21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop21.py']);

    validateResults(analysisResults, 0);
});

test('Loop22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop22.py']);

    validateResults(analysisResults, 0);
});

test('Loop23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop23.py']);

    validateResults(analysisResults, 0);
});

test('Loop24', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop24.py']);

    validateResults(analysisResults, 0);
});

test('Loop25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop25.py']);

    validateResults(analysisResults, 0);
});

test('Loop26', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop26.py']);

    validateResults(analysisResults, 0);
});

test('Loop27', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop27.py']);

    validateResults(analysisResults, 0);
});

test('Loop28', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop28.py']);

    validateResults(analysisResults, 0);
});

test('Loop29', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop29.py']);

    validateResults(analysisResults, 0);
});

test('Loop30', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop30.py']);

    validateResults(analysisResults, 0);
});

test('Loop31', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop31.py']);

    validateResults(analysisResults, 1);
});

test('Loop32', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop32.py']);

    validateResults(analysisResults, 0);
});

test('Loop33', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop33.py']);

    validateResults(analysisResults, 0);
});

test('Loop34', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop34.py']);

    validateResults(analysisResults, 0);
});

test('Loop35', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop35.py']);

    validateResults(analysisResults, 0);
});

test('Loop36', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop36.py']);

    validateResults(analysisResults, 0);
});

test('Loop37', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop37.py']);

    validateResults(analysisResults, 0);
});

test('Loop38', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop38.py']);

    validateResults(analysisResults, 0);
});

test('Loop39', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop39.py']);

    validateResults(analysisResults, 0);
});

test('Loop40', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop40.py']);

    validateResults(analysisResults, 0);
});

test('Loop41', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop41.py']);

    validateResults(analysisResults, 2);
});

test('Loop42', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop42.py']);

    validateResults(analysisResults, 0);
});

test('Loop43', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop43.py']);

    validateResults(analysisResults, 0);
});

test('Loop44', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop44.py']);

    validateResults(analysisResults, 0);
});

test('Loop45', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop45.py']);

    validateResults(analysisResults, 0);
});

test('Loop46', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop46.py']);

    validateResults(analysisResults, 0);
});

test('Loop47', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop47.py']);

    validateResults(analysisResults, 0);
});

test('Loop48', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop48.py']);

    validateResults(analysisResults, 0);
});

test('Loop49', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop49.py']);

    validateResults(analysisResults, 0);
});

test('Loop50', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop50.py']);

    validateResults(analysisResults, 0);
});

test('Loop51', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop51.py']);

    validateResults(analysisResults, 0);
});

test('Loop52', () => {
    const analysisResults = typeAnalyzeSampleFiles(['loop52.py']);

    validateResults(analysisResults, 0);
});

test('ForLoop1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['forLoop1.py']);

    validateResults(analysisResults, 4);
});

test('ForLoop2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['forLoop2.py']);

    validateResults(analysisResults, 7);
});

test('Comprehension1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension1.py']);

    validateResults(analysisResults, 2);
});

test('Comprehension2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension2.py']);

    validateResults(analysisResults, 0);
});

test('Comprehension3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension3.py']);

    validateResults(analysisResults, 0);
});

test('Comprehension4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension4.py']);

    validateResults(analysisResults, 0);
});

test('Comprehension5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension5.py']);

    validateResults(analysisResults, 0);
});

test('Comprehension6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension6.py']);

    validateResults(analysisResults, 4);
});

test('Comprehension7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension7.py']);

    validateResults(analysisResults, 1);
});

test('Comprehension8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension8.py']);

    validateResults(analysisResults, 0);
});

test('Comprehension9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension9.py']);

    validateResults(analysisResults, 0);
});

test('Comprehension10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension10.py']);

    validateResults(analysisResults, 1);
});

test('Comprehension11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['comprehension11.py']);

    validateResults(analysisResults, 0);
});

test('Literals1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals1.py']);

    validateResults(analysisResults, 7);
});

test('Literals2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals2.py']);

    validateResults(analysisResults, 3);
});

test('Literals3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals3.py']);

    validateResults(analysisResults, 5);
});

test('Literals4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals4.py']);

    validateResults(analysisResults, 0);
});

test('Literals5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals5.py']);

    validateResults(analysisResults, 2);
});

test('Literals6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals6.py']);

    validateResults(analysisResults, 25);
});

test('Literals7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literals7.py']);

    validateResults(analysisResults, 1);
});

test('TypeAlias1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias1.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias2.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias3.py']);

    validateResults(analysisResults, 1);
});

test('TypeAlias4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults3_9 = typeAnalyzeSampleFiles(['typeAlias4.py'], configOptions);
    validateResults(analysisResults3_9, 1);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults3_10 = typeAnalyzeSampleFiles(['typeAlias4.py'], configOptions);
    validateResults(analysisResults3_10, 12);
});

test('TypeAlias5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias5.py']);

    validateResults(analysisResults, 4);
});

test('TypeAlias6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias6.py']);

    validateResults(analysisResults, 5);
});

test('TypeAlias7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias7.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias8.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias9.py']);

    validateResults(analysisResults, 4);
});

test('TypeAlias10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias10.py']);

    validateResults(analysisResults, 5);
});

test('TypeAlias11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias11.py']);

    validateResults(analysisResults, 2);
});

test('TypeAlias12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias12.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias13.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias14.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias15.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias16.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias17', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['typeAlias17.py'], configOptions);
    validateResults(analysisResults1, 4);

    configOptions.diagnosticRuleSet.reportMissingTypeArgument = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['typeAlias17.py'], configOptions);
    validateResults(analysisResults2, 11);
});

test('TypeAlias18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias18.py']);

    validateResults(analysisResults, 4);
});

test('TypeAlias20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias20.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias21.py']);

    validateResults(analysisResults, 0);
});

test('TypeAlias22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeAlias22.py']);

    validateResults(analysisResults, 6);
});

test('RecursiveTypeAlias1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias1.py']);

    validateResults(analysisResults, 13);
});

test('RecursiveTypeAlias2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias2.py']);

    validateResults(analysisResults, 3);
});

test('RecursiveTypeAlias3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias3.py'], configOptions);

    validateResults(analysisResults, 4);
});

test('RecursiveTypeAlias4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias4.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias5.pyi']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias6.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias7.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias8.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias9.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias10.py']);

    validateResults(analysisResults, 1);
});

test('RecursiveTypeAlias11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias11.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias12.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias13.py']);

    validateResults(analysisResults, 0);
});

test('RecursiveTypeAlias14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias14.py']);

    validateResults(analysisResults, 1);
});

test('RecursiveTypeAlias15', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias15.py'], configOptions);

    validateResults(analysisResults, 4);
});

test('RecursiveTypeAlias16', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults = typeAnalyzeSampleFiles(['recursiveTypeAlias16.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('Classes1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes1.py']);

    validateResults(analysisResults, 2);
});

test('Classes3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes3.py']);

    validateResults(analysisResults, 3);
});

test('Classes4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes4.py']);

    validateResults(analysisResults, 0);
});

test('Classes5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportIncompatibleVariableOverride = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['classes5.py'], configOptions);
    validateResults(analysisResults, 11);

    configOptions.diagnosticRuleSet.reportIncompatibleVariableOverride = 'error';
    analysisResults = typeAnalyzeSampleFiles(['classes5.py'], configOptions);
    validateResults(analysisResults, 35);
});

test('Classes6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes6.py']);

    validateResults(analysisResults, 3);
});

test('Classes7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes7.py']);

    validateResults(analysisResults, 1);
});

test('Classes8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes8.py']);

    validateResults(analysisResults, 0);
});

test('Classes9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes9.py']);

    validateResults(analysisResults, 2);
});

test('Classes10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes10.py']);

    validateResults(analysisResults, 0);
});

test('Classes11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classes11.py']);

    validateResults(analysisResults, 5);
});

test('Methods1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['methods1.py']);

    validateResults(analysisResults, 0);
});

test('MethodOverride1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['methodOverride1.py'], configOptions);
    validateResults(analysisResults, 0);

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'error';
    analysisResults = typeAnalyzeSampleFiles(['methodOverride1.py'], configOptions);
    validateResults(analysisResults, 42);
});

test('MethodOverride2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['methodOverride2.py'], configOptions);
    validateResults(analysisResults, 0);

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'error';
    analysisResults = typeAnalyzeSampleFiles(['methodOverride2.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('MethodOverride3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['methodOverride3.py'], configOptions);
    validateResults(analysisResults, 0);

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'error';
    analysisResults = typeAnalyzeSampleFiles(['methodOverride3.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('MethodOverride4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['methodOverride4.py']);
    validateResults(analysisResults, 1);
});

test('MethodOverride5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['methodOverride5.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MethodOverride6', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'none';
    const analysisResults1 = typeAnalyzeSampleFiles(['methodOverride6.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['methodOverride6.py'], configOptions);
    validateResults(analysisResults2, 3);
});

test('Enum1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum1.py']);

    validateResults(analysisResults, 3);
});

test('Enum2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum2.py']);

    validateResults(analysisResults, 0);
});

test('Enum3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum3.py']);

    validateResults(analysisResults, 0);
});

test('Enum4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum4.py']);

    validateResults(analysisResults, 0);
});

test('Enum5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum5.py']);

    validateResults(analysisResults, 0);
});

test('Enum6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum6.py']);

    validateResults(analysisResults, 4);
});

test('Enum7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum7.py']);

    validateResults(analysisResults, 0);
});

test('Enum8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum8.py']);

    validateResults(analysisResults, 0);
});

test('Enum9', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults1 = typeAnalyzeSampleFiles(['enum9.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.defaultPythonVersion = pythonVersion3_13;
    const analysisResults2 = typeAnalyzeSampleFiles(['enum9.py'], configOptions);
    validateResults(analysisResults2, 0);
});

test('Enum10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum10.py']);

    validateResults(analysisResults, 0);
});

test('Enum11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum11.py']);

    validateResults(analysisResults, 8);
});

test('Enum12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum12.py']);

    validateResults(analysisResults, 2);
});

test('Enum13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum13.py']);

    validateResults(analysisResults, 3);
});

test('Enum14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enum14.py']);

    validateResults(analysisResults, 3);
});

test('EnumAuto1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enumAuto1.py']);

    validateResults(analysisResults, 0);
});

test('EnumGenNextValue1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['enumGenNextValue1.py']);

    validateResults(analysisResults, 0);
});
