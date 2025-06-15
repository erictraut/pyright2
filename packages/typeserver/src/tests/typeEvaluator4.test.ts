/*
 * typeEvaluator4.test.ts
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
    pythonVersion3_14,
    pythonVersion3_7,
    pythonVersion3_8,
    pythonVersion3_9,
} from 'typeserver/common/pythonVersion.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { typeAnalyzeSampleFiles, validateResults } from 'typeserver/tests/testUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

test('Final1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final1.py']);
    validateResults(analysisResults, 1);
});

test('Final2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final2.py']);
    validateResults(analysisResults, 15);
});

test('Final3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final3.py']);
    validateResults(analysisResults, 41);
});

test('Final4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final4.pyi']);
    validateResults(analysisResults, 3);
});

test('Final5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final5.py']);
    validateResults(analysisResults, 0);
});

test('Final6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final6.pyi']);
    validateResults(analysisResults, 2);
});

test('Final8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['final8.py']);
    validateResults(analysisResults, 4);
});

test('InferredTypes1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['inferredTypes1.py']);
    validateResults(analysisResults, 0);
});

test('InferredTypes2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['inferredTypes2.py']);
    validateResults(analysisResults, 0);
});

test('InferredTypes3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['inferredTypes3.py']);
    validateResults(analysisResults, 0);
});

test('CallSite2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callSite2.py']);
    validateResults(analysisResults, 0);
});

test('CallSite3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callSite3.py']);
    validateResults(analysisResults, 0);
});

test('FString1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults1 = typeAnalyzeSampleFiles(['fstring1.py'], configOptions);
    validateResults(analysisResults1, 15, 1);

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults2 = typeAnalyzeSampleFiles(['fstring1.py'], configOptions);
    validateResults(analysisResults2, 11, 1);
});

test('FString2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['fstring2.py']);
    validateResults(analysisResults, 0);
});

test('FString3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['fstring3.py']);
    validateResults(analysisResults, 0);
});

test('FString4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['fstring4.py']);
    validateResults(analysisResults, 0);
});

test('FString5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.7 settings. This will generate errors.
    configOptions.defaultPythonVersion = pythonVersion3_7;
    const analysisResults37 = typeAnalyzeSampleFiles(['fstring5.py'], configOptions);
    validateResults(analysisResults37, 6);

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['fstring5.py'], configOptions);
    validateResults(analysisResults38, 0);
});

test('TString1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_13;
    const analysisResults1 = typeAnalyzeSampleFiles(['tstring1.py'], configOptions);
    validateResults(analysisResults1, 11);

    configOptions.defaultPythonVersion = pythonVersion3_14;
    const analysisResults2 = typeAnalyzeSampleFiles(['tstring1.py'], configOptions);
    validateResults(analysisResults2, 8);
});

test('TString2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_14;
    const analysisResults1 = typeAnalyzeSampleFiles(['tstring2.py'], configOptions);
    validateResults(analysisResults1, 1);
});

test('MemberAccess1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess1.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess2.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess3.py']);
    validateResults(analysisResults, 3);
});

test('MemberAccess4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess4.py']);
    validateResults(analysisResults, 5);
});

test('MemberAccess5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess5.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess6.py']);
    validateResults(analysisResults, 2);
});

test('MemberAccess7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess7.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess8.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess9.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess10.py']);
    validateResults(analysisResults, 2);
});

test('MemberAccess11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess11.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess12.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess13.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess14.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess15.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess16.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess17.py']);
    validateResults(analysisResults, 5);
});

test('MemberAccess18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess18.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess19.py']);
    validateResults(analysisResults, 10);
});

test('MemberAccess20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess20.py']);
    validateResults(analysisResults, 1);
});

test('MemberAccess21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess21.py']);
    validateResults(analysisResults, 1);
});

test('MemberAccess22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess22.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess23.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess24', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess24.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess25.py']);
    validateResults(analysisResults, 12);
});

test('MemberAccess26', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess26.py']);
    validateResults(analysisResults, 3);
});

test('MemberAccess27', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess27.py']);
    validateResults(analysisResults, 0);
});

test('MemberAccess28', () => {
    const analysisResults = typeAnalyzeSampleFiles(['memberAccess28.py']);
    validateResults(analysisResults, 1);
});

test('DataClassNamedTuple1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassNamedTuple1.py']);

    validateResults(analysisResults, 6);
});

test('DataClassNamedTuple2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassNamedTuple2.py']);

    validateResults(analysisResults, 1);
});

test('DataClass1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass1.py']);

    validateResults(analysisResults, 11);
});

test('DataClass2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass2.py']);

    validateResults(analysisResults, 0);
});

test('DataClass3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass3.py']);

    validateResults(analysisResults, 2);
});

test('DataClass4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass4.py']);

    validateResults(analysisResults, 6);
});

test('DataClass5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass5.py']);

    validateResults(analysisResults, 1);
});

test('DataClass6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass6.py']);

    validateResults(analysisResults, 1);
});

test('DataClass7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass7.py']);

    validateResults(analysisResults, 1);
});

test('DataClass8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass8.py']);

    validateResults(analysisResults, 0);
});

test('DataClass9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass9.py']);

    validateResults(analysisResults, 0);
});

test('DataClass10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass10.py']);

    validateResults(analysisResults, 0);
});

test('DataClass11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass11.py']);

    validateResults(analysisResults, 0);
});

test('DataClass12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass12.py']);

    validateResults(analysisResults, 3);
});

test('DataClass13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass13.py']);

    validateResults(analysisResults, 1);
});

test('DataClass14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass14.py']);

    validateResults(analysisResults, 0);
});

test('DataClass15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass15.py']);

    validateResults(analysisResults, 0);
});

test('DataClass16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass16.py']);

    validateResults(analysisResults, 1);
});

test('DataClass17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass17.py']);

    validateResults(analysisResults, 6);
});

test('DataClass18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclass18.py']);

    validateResults(analysisResults, 0);
});

test('DataClassReplace1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults1 = typeAnalyzeSampleFiles(['dataclassReplace1.py'], configOptions);
    validateResults(analysisResults1, 10);

    configOptions.defaultPythonVersion = pythonVersion3_13;
    const analysisResults2 = typeAnalyzeSampleFiles(['dataclassReplace1.py'], configOptions);
    validateResults(analysisResults2, 4);
});

test('DataClassFrozen1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassFrozen1.py']);

    validateResults(analysisResults, 4);
});

test('DataClassKwOnly1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['dataclassKwOnly1.py'], configOptions);

    validateResults(analysisResults, 3);
});

test('DataClassSlots1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['dataclassSlots1.py'], configOptions);

    validateResults(analysisResults, 5);
});

test('DataClassHash1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassHash1.py']);

    validateResults(analysisResults, 2);
});

test('DataClassDescriptors1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassDescriptors1.py']);

    validateResults(analysisResults, 1);
});

test('DataClassDescriptors2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassDescriptors2.py']);

    validateResults(analysisResults, 0);
});

test('DataClassConverter1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassConverter1.py']);

    validateResults(analysisResults, 3);
});

test('DataClassConverter2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassConverter2.py']);

    validateResults(analysisResults, 4);
});

test('DataClassConverter3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassConverter3.py']);

    validateResults(analysisResults, 0);
});

test('DataClassPostInit1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dataclassPostInit1.py']);

    validateResults(analysisResults, 3);
});

test('InitVar1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['initVar1.py']);

    validateResults(analysisResults, 2, 1);
});

test('Callable1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable1.py']);

    validateResults(analysisResults, 3);
});

test('Callable2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable2.py']);

    validateResults(analysisResults, 2);
});

test('Callable3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable3.py']);

    validateResults(analysisResults, 0);
});

test('Callable4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable4.py']);

    validateResults(analysisResults, 0);
});

test('Callable5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable5.py']);

    validateResults(analysisResults, 3);
});

test('Callable6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable6.py']);

    validateResults(analysisResults, 9);
});

test('Callable7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callable7.py']);

    validateResults(analysisResults, 1);
});

test('Generic1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generic1.py']);

    validateResults(analysisResults, 9);
});

test('Generic2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generic2.py']);

    validateResults(analysisResults, 3);
});

test('Generic3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['generic3.py']);

    validateResults(analysisResults, 3);
});

test('Unions1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.disableBytesTypePromotions = true;

    // Analyze with Python 3.9 settings. This will generate errors.
    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults3_9 = typeAnalyzeSampleFiles(['unions1.py'], configOptions);
    validateResults(analysisResults3_9, 11);

    // Analyze with Python 3.10 settings.
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults3_10 = typeAnalyzeSampleFiles(['unions1.py'], configOptions);
    validateResults(analysisResults3_10, 0);
});

test('Unions2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['unions2.py'], configOptions);
    validateResults(analysisResults38, 0);
});

test('Unions3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.9 settings. This will generate errors.
    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults3_9 = typeAnalyzeSampleFiles(['unions3.py'], configOptions);
    validateResults(analysisResults3_9, 1);

    // Analyze with Python 3.10 settings.
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults3_10 = typeAnalyzeSampleFiles(['unions3.py'], configOptions);
    validateResults(analysisResults3_10, 0);
});

test('Unions4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unions4.py']);

    validateResults(analysisResults, 7);
});

test('Unions5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unions5.py']);

    validateResults(analysisResults, 6);
});

test('Unions6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unions6.py']);

    validateResults(analysisResults, 0);
});

test('ParamSpec1', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec1.py']);
    validateResults(results, 9);
});

test('ParamSpec2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults39 = typeAnalyzeSampleFiles(['paramSpec2.py'], configOptions);
    validateResults(analysisResults39, 9);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults310 = typeAnalyzeSampleFiles(['paramSpec2.py'], configOptions);
    validateResults(analysisResults310, 0);
});

test('ParamSpec3', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec3.py']);
    validateResults(results, 3);
});

test('ParamSpec4', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec4.py']);
    validateResults(results, 10);
});

test('ParamSpec5', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec5.py']);
    validateResults(results, 0);
});

test('ParamSpec6', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec6.py']);
    validateResults(results, 0);
});

test('ParamSpec7', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec7.py']);
    validateResults(results, 0);
});

test('ParamSpec8', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec8.py']);
    validateResults(results, 7);
});

test('ParamSpec9', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec9.py']);
    validateResults(results, 14);
});

test('ParamSpec10', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec10.py']);
    validateResults(results, 0);
});

test('ParamSpec11', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec11.py']);
    validateResults(results, 0);
});

test('ParamSpec12', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec12.py']);
    validateResults(results, 14);
});

test('ParamSpec13', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec13.py']);
    validateResults(results, 11);
});

test('ParamSpec14', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec14.py']);
    validateResults(results, 0);
});

test('ParamSpec15', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec15.py']);
    validateResults(results, 0);
});

test('ParamSpec16', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec16.py']);
    validateResults(results, 0);
});

test('ParamSpec17', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec17.py']);
    validateResults(results, 0);
});

test('ParamSpec18', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec18.py']);
    validateResults(results, 0);
});

test('ParamSpec19', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec19.py']);
    validateResults(results, 0);
});

test('ParamSpec20', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec20.py']);
    validateResults(results, 8);
});

test('ParamSpec21', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec21.py']);
    validateResults(results, 0);
});

test('ParamSpec22', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec22.py']);
    validateResults(results, 0);
});

test('ParamSpec23', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec23.py']);
    validateResults(results, 0);
});

test('ParamSpec24', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec24.py']);
    validateResults(results, 0);
});

test('ParamSpec25', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec25.py']);
    validateResults(results, 0);
});

test('ParamSpec26', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec26.py']);
    validateResults(results, 0);
});

test('ParamSpec27', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec27.py']);
    validateResults(results, 2);
});

test('ParamSpec28', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec28.py']);
    validateResults(results, 0);
});

test('ParamSpec29', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec29.py']);
    validateResults(results, 3);
});

test('ParamSpec30', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec30.py']);
    validateResults(results, 0);
});

test('ParamSpec31', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec31.py']);
    validateResults(results, 0);
});

test('ParamSpec32', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec32.py']);
    validateResults(results, 4);
});

test('ParamSpec33', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec33.py']);
    validateResults(results, 4);
});

test('ParamSpec34', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec34.py']);
    validateResults(results, 0);
});

test('ParamSpec35', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec35.py']);
    validateResults(results, 1);
});

test('ParamSpec36', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec36.py']);
    validateResults(results, 3);
});

test('ParamSpec37', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec37.py']);
    validateResults(results, 0);
});

test('ParamSpec38', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec38.py']);
    validateResults(results, 0);
});

test('ParamSpec39', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec39.py']);
    validateResults(results, 0);
});

test('ParamSpec40', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec40.py']);
    validateResults(results, 0);
});

test('ParamSpec41', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec41.py']);
    validateResults(results, 1);
});

test('ParamSpec42', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec42.py']);
    validateResults(results, 0);
});

test('ParamSpec43', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec43.py']);
    validateResults(results, 0);
});

test('ParamSpec44', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec44.py']);
    validateResults(results, 0);
});

test('ParamSpec45', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec45.py']);
    validateResults(results, 0);
});

test('ParamSpec46', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec46.py']);
    validateResults(results, 2);
});

test('ParamSpec47', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec47.py']);
    validateResults(results, 3);
});

test('ParamSpec48', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec48.py']);
    validateResults(results, 0);
});

test('ParamSpec49', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec49.py']);
    validateResults(results, 8);
});

test('ParamSpec50', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec50.py']);
    validateResults(results, 2);
});

test('ParamSpec51', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec51.py']);
    validateResults(results, 0);
});

test('ParamSpec52', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec52.py']);
    validateResults(results, 2);
});

test('ParamSpec53', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec53.py']);
    validateResults(results, 0);
});

test('ParamSpec54', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec54.py']);
    validateResults(results, 0);
});

test('ParamSpec55', () => {
    const results = typeAnalyzeSampleFiles(['paramSpec55.py']);
    validateResults(results, 1);
});

test('Slice1', () => {
    const results = typeAnalyzeSampleFiles(['slice1.py']);
    validateResults(results, 0);
});
