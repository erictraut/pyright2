/*
 * typeEvaluator8.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright type evaluator. Tests are split
 * arbitrarily among multiple files so they can run in parallel.
 */

import assert from 'assert';

import { pythonVersion3_10, pythonVersion3_11, pythonVersion3_8 } from '../common/pythonVersion.ts';
import { ConfigOptions } from '../config/configOptions.ts';
import { Uri } from '../files/uri/uri.ts';
import { typeAnalyzeSampleFiles, validateResults } from './testUtils.ts';

test('Import1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import1.py']);
    validateResults(analysisResults, 0);
});

test('Import2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import2.py']);
    validateResults(analysisResults, 2);
});

test('Import4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import4.py']);
    validateResults(analysisResults, 2);
});

test('Import6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import6.py']);
    validateResults(analysisResults, 2);
});

test('Import7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import7.py']);
    validateResults(analysisResults, 2);
});

test('Import9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import9.py']);
    validateResults(analysisResults, 0);
});

test('Import10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import10.py']);
    validateResults(analysisResults, 1);
});

test('Import11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import11.py']);
    validateResults(analysisResults, 0);
});

test('Import12', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, optional diagnostics are ignored.
    let analysisResults = typeAnalyzeSampleFiles(['import12.py'], configOptions);
    validateResults(analysisResults, 0, 2);

    // Turn on error.
    configOptions.diagnosticRuleSet.reportWildcardImportFromLibrary = 'error';
    analysisResults = typeAnalyzeSampleFiles(['import12.py'], configOptions);
    validateResults(analysisResults, 2, 0);

    // Turn off diagnostic.
    configOptions.diagnosticRuleSet.reportWildcardImportFromLibrary = 'none';
    analysisResults = typeAnalyzeSampleFiles(['import12.py'], configOptions);
    validateResults(analysisResults, 0, 0);
});

test('Import14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import14.py', 'import13.py']);

    assert.strictEqual(analysisResults.length, 2);
    assert.strictEqual(analysisResults[0].errors.length, 0);
    assert.strictEqual(analysisResults[1].errors.length, 0);
});

test('Import15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import15.py']);
    validateResults(analysisResults, 0);
});

test('Import16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import16.py']);
    validateResults(analysisResults, 0);
});

test('Import18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['import18.py']);
    validateResults(analysisResults, 2);
});

test('DunderAll1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, reportUnsupportedDunderAll is a warning.
    let analysisResults = typeAnalyzeSampleFiles(['dunderAll1.py'], configOptions);
    validateResults(analysisResults, 0, 7);

    // Turn on error.
    configOptions.diagnosticRuleSet.reportUnsupportedDunderAll = 'error';
    analysisResults = typeAnalyzeSampleFiles(['dunderAll1.py'], configOptions);
    validateResults(analysisResults, 7, 0);

    // Turn off diagnostic.
    configOptions.diagnosticRuleSet.reportUnsupportedDunderAll = 'none';
    analysisResults = typeAnalyzeSampleFiles(['dunderAll1.py'], configOptions);
    validateResults(analysisResults, 0, 0);
});

test('DunderAll2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, reportUnsupportedDunderAll is a warning.
    let analysisResults = typeAnalyzeSampleFiles(['dunderAll2.py'], configOptions);
    validateResults(analysisResults, 0, 3);

    // Turn on error.
    configOptions.diagnosticRuleSet.reportUnsupportedDunderAll = 'error';
    analysisResults = typeAnalyzeSampleFiles(['dunderAll2.py'], configOptions);
    validateResults(analysisResults, 3, 0);

    // Turn off diagnostic.
    configOptions.diagnosticRuleSet.reportUnsupportedDunderAll = 'none';
    analysisResults = typeAnalyzeSampleFiles(['dunderAll2.py'], configOptions);
    validateResults(analysisResults, 0, 0);
});

test('DunderAll3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Turn on error.
    configOptions.diagnosticRuleSet.reportUnsupportedDunderAll = 'error';
    const analysisResults = typeAnalyzeSampleFiles(['dunderAll3.pyi'], configOptions);
    validateResults(analysisResults, 0, 0);
});

test('CodeFlow1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow1.py']);

    validateResults(analysisResults, 2);
});

test('CodeFlow2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow2.py']);

    validateResults(analysisResults, 1);
});

test('CodeFlow3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow3.py']);

    validateResults(analysisResults, 0);
});

test('CodeFlow4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow4.py']);

    validateResults(analysisResults, 0);
});

test('CodeFlow5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow5.py']);

    validateResults(analysisResults, 0);
});

test('CodeFlow6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow6.py']);

    validateResults(analysisResults, 0);
});

test('CodeFlow7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow7.py']);

    validateResults(analysisResults, 0);
});

test('CodeFlow8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow8.py']);

    validateResults(analysisResults, 0);
});

test('CodeFlow9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['codeFlow9.py']);

    validateResults(analysisResults, 0);
});

test('CapturedVariable1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['capturedVariable1.py']);

    validateResults(analysisResults, 6);
});

test('CapturedVariable2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['capturedVariable2.py']);

    validateResults(analysisResults, 2);
});

test('Property1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property1.py']);

    validateResults(analysisResults, 5);
});

test('Property2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property2.py']);

    validateResults(analysisResults, 2);
});

test('Property3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property3.py']);

    validateResults(analysisResults, 4);
});

test('Property4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property4.py']);

    validateResults(analysisResults, 0);
});

test('Property5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property5.py']);

    validateResults(analysisResults, 0);
});

test('Property6', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with reportPropertyTypeMismatch enabled.
    configOptions.diagnosticRuleSet.reportPropertyTypeMismatch = 'error';
    const analysisResult1 = typeAnalyzeSampleFiles(['property6.py'], configOptions);
    validateResults(analysisResult1, 2);

    // Analyze with reportPropertyTypeMismatch disabled.
    configOptions.diagnosticRuleSet.reportPropertyTypeMismatch = 'none';
    const analysisResult2 = typeAnalyzeSampleFiles(['property6.py'], configOptions);
    validateResults(analysisResult2, 0);
});

test('Property7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property7.py']);

    validateResults(analysisResults, 2);
});

test('Property8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property8.py']);

    validateResults(analysisResults, 4);
});

test('Property9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property9.py']);

    validateResults(analysisResults, 0);
});

test('Property10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property10.py']);

    validateResults(analysisResults, 0);
});

test('Property11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property11.py']);

    validateResults(analysisResults, 1);
});

test('Property12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property12.py']);

    validateResults(analysisResults, 0);
});

test('Property13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property13.py']);

    validateResults(analysisResults, 0);
});

test('Property14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property14.py']);

    validateResults(analysisResults, 0);
});

test('Property15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property15.py']);

    validateResults(analysisResults, 0);
});

test('Property16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property16.py']);

    validateResults(analysisResults, 1);
});

test('Property17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property17.py']);

    validateResults(analysisResults, 0);
});

test('Property18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['property18.py']);

    validateResults(analysisResults, 0);
});

test('Operator1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator1.py']);

    validateResults(analysisResults, 5);
});

test('Operator2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator2.py']);

    validateResults(analysisResults, 1);
});

test('Operator3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator3.py']);

    validateResults(analysisResults, 0);
});

test('Operator4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator4.py']);

    validateResults(analysisResults, 0);
});

test('Operator5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator5.py']);

    validateResults(analysisResults, 1);
});

test('Operator6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator6.py']);

    validateResults(analysisResults, 0);
});

test('Operator7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator7.py']);

    validateResults(analysisResults, 1);
});

test('Operator8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator8.py']);

    validateResults(analysisResults, 2);
});

test('Operator9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator9.py']);

    validateResults(analysisResults, 0);
});

test('Operator10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator10.py']);

    validateResults(analysisResults, 1);
});

test('Operator11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator11.py']);

    validateResults(analysisResults, 0);
});

test('Operator12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['operator12.py']);

    validateResults(analysisResults, 0);
});

test('Optional1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Disable diagnostics.
    configOptions.diagnosticRuleSet.reportOptionalSubscript = 'none';
    configOptions.diagnosticRuleSet.reportOptionalMemberAccess = 'none';
    configOptions.diagnosticRuleSet.reportOptionalCall = 'none';
    configOptions.diagnosticRuleSet.reportOptionalIterable = 'none';
    configOptions.diagnosticRuleSet.reportOptionalContextManager = 'none';
    configOptions.diagnosticRuleSet.reportOptionalOperand = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['optional1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on warnings.
    configOptions.diagnosticRuleSet.reportOptionalSubscript = 'warning';
    configOptions.diagnosticRuleSet.reportOptionalMemberAccess = 'warning';
    configOptions.diagnosticRuleSet.reportOptionalCall = 'warning';
    configOptions.diagnosticRuleSet.reportOptionalIterable = 'warning';
    configOptions.diagnosticRuleSet.reportOptionalContextManager = 'warning';
    configOptions.diagnosticRuleSet.reportOptionalOperand = 'warning';
    analysisResults = typeAnalyzeSampleFiles(['optional1.py'], configOptions);
    validateResults(analysisResults, 0, 8);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportOptionalSubscript = 'error';
    configOptions.diagnosticRuleSet.reportOptionalMemberAccess = 'error';
    configOptions.diagnosticRuleSet.reportOptionalCall = 'error';
    configOptions.diagnosticRuleSet.reportOptionalIterable = 'error';
    configOptions.diagnosticRuleSet.reportOptionalContextManager = 'error';
    configOptions.diagnosticRuleSet.reportOptionalOperand = 'error';
    analysisResults = typeAnalyzeSampleFiles(['optional1.py'], configOptions);
    validateResults(analysisResults, 8);
});

test('Optional2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Disable diagnostics.
    configOptions.diagnosticRuleSet.reportOptionalOperand = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['optional2.py'], configOptions);
    validateResults(analysisResults, 0);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportOptionalOperand = 'error';
    analysisResults = typeAnalyzeSampleFiles(['optional2.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('Tuple1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple1.py']);

    validateResults(analysisResults, 26);
});

test('Tuple2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple2.py']);

    validateResults(analysisResults, 5);
});

test('Tuple3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple3.py']);

    validateResults(analysisResults, 5);
});

test('Tuple4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple4.py']);

    validateResults(analysisResults, 0);
});

test('Tuple5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple5.py']);

    validateResults(analysisResults, 2);
});

test('Tuple6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple6.py']);

    validateResults(analysisResults, 10);
});

test('Tuple7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple7.py']);

    validateResults(analysisResults, 2);
});

test('Tuple8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple8.py']);

    validateResults(analysisResults, 11);
});

test('Tuple9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple9.py']);

    validateResults(analysisResults, 1);
});

test('Tuple10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple10.py']);

    validateResults(analysisResults, 0);
});

test('Tuple11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple11.py']);

    validateResults(analysisResults, 1);
});

test('Tuple12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple12.py']);

    validateResults(analysisResults, 0);
});

test('Tuple13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple13.py']);

    validateResults(analysisResults, 0);
});

test('Tuple15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple15.py']);

    validateResults(analysisResults, 0);
});

test('Tuple16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple16.py']);

    validateResults(analysisResults, 0);
});

test('Tuple17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple17.py']);

    validateResults(analysisResults, 0);
});

test('Tuple18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple18.py']);

    validateResults(analysisResults, 2);
});

test('Tuple19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tuple19.py']);

    validateResults(analysisResults, 1);
});

test('NamedTuple1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple1.py']);

    validateResults(analysisResults, 13);
});

test('NamedTuple2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple2.py']);

    validateResults(analysisResults, 8);
});

test('NamedTuple3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple3.py']);

    validateResults(analysisResults, 1);
});

test('NamedTuple4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple4.py']);

    validateResults(analysisResults, 0);
});

test('NamedTuple5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple5.py']);

    validateResults(analysisResults, 0);
});

test('NamedTuple6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple6.py']);

    validateResults(analysisResults, 6);
});

test('NamedTuple7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple7.py']);

    validateResults(analysisResults, 1);
});

test('NamedTuple8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple8.py']);

    validateResults(analysisResults, 0);
});

test('NamedTuple9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple9.py']);

    validateResults(analysisResults, 3);
});

test('NamedTuple10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple10.py']);

    validateResults(analysisResults, 1);
});

test('NamedTuple11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['namedTuple11.py']);

    validateResults(analysisResults, 3);
});

test('Slots1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['slots1.py']);

    validateResults(analysisResults, 2);
});

test('Slots2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['slots2.py']);

    validateResults(analysisResults, 3);
});

test('Slots3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['slots3.py']);

    validateResults(analysisResults, 0);
});

test('Slots4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['slots4.py']);

    validateResults(analysisResults, 0);
});

test('Parameters1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportMissingParameterType = 'none';
    const analysisResults1 = typeAnalyzeSampleFiles(['parameters1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportMissingParameterType = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['parameters1.py'], configOptions);
    validateResults(analysisResults2, 1);
});

test('Self1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self1.py']);

    validateResults(analysisResults, 15);
});

test('Self2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self2.py']);

    validateResults(analysisResults, 5);
});

test('Self3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self3.py']);

    validateResults(analysisResults, 0);
});

test('Self4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self4.py']);

    validateResults(analysisResults, 0);
});

test('Self5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self5.py']);

    validateResults(analysisResults, 0);
});

test('Self6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self6.py']);

    validateResults(analysisResults, 0);
});

test('Self7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self7.py']);

    validateResults(analysisResults, 1);
});

test('Self8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self8.py']);

    validateResults(analysisResults, 0);
});

test('Self9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self9.py']);

    validateResults(analysisResults, 0);
});

test('Self10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self10.py']);

    validateResults(analysisResults, 2);
});

test('Self11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['self11.py']);

    validateResults(analysisResults, 0);
});

test('UnusedVariable1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportUnusedVariable = 'none';
    const analysisResults1 = typeAnalyzeSampleFiles(['unusedVariable1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportUnusedVariable = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['unusedVariable1.py'], configOptions);
    validateResults(analysisResults2, 3);
});

test('Descriptor1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['descriptor1.py']);

    validateResults(analysisResults, 6);
});

test('Descriptor2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['descriptor2.py']);

    validateResults(analysisResults, 0);
});

test('Descriptor3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['descriptor3.py']);

    validateResults(analysisResults, 0);
});

test('Partial1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial1.py']);

    validateResults(analysisResults, 18);
});

test('Partial2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial2.py']);

    validateResults(analysisResults, 0);
});

test('Partial3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial3.py']);

    validateResults(analysisResults, 0);
});

test('Partial4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial4.py']);

    validateResults(analysisResults, 3);
});

test('Partial5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial5.py']);

    validateResults(analysisResults, 3);
});

test('Partial6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial6.py']);

    validateResults(analysisResults, 2);
});

test('Partial7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['partial7.py']);

    validateResults(analysisResults, 1);
});

test('TotalOrdering1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['totalOrdering1.py']);

    validateResults(analysisResults, 5);
});

test('TupleUnpack1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tupleUnpack1.py']);

    validateResults(analysisResults, 5);
});

test('TupleUnpack2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults1 = typeAnalyzeSampleFiles(['tupleUnpack2.py'], configOptions);
    validateResults(analysisResults1, 18);

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults2 = typeAnalyzeSampleFiles(['tupleUnpack2.py'], configOptions);
    validateResults(analysisResults2, 4);
});

test('TupleUnpack3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults1 = typeAnalyzeSampleFiles(['tupleUnpack3.py'], configOptions);
    validateResults(analysisResults1, 1);
});

test('TupleUnpack4', () => {
    const analysisResults1 = typeAnalyzeSampleFiles(['tupleUnpack4.py']);
    validateResults(analysisResults1, 2);
});

test('TupleUnpack5', () => {
    const analysisResults1 = typeAnalyzeSampleFiles(['tupleUnpack5.py']);
    validateResults(analysisResults1, 0);
});

test('PseudoGeneric1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['pseudoGeneric1.py']);

    validateResults(analysisResults, 0);
});

test('PseudoGeneric2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['pseudoGeneric2.py']);

    validateResults(analysisResults, 1);
});

test('PseudoGeneric3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['pseudoGeneric3.py']);

    validateResults(analysisResults, 0);
});

test('Strings2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['strings2.py']);

    validateResults(analysisResults, 2, 1);
});

test('LiteralString1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literalString1.py']);

    validateResults(analysisResults, 10);
});

test('LiteralString2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literalString2.py']);

    validateResults(analysisResults, 0);
});

test('LiteralString3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['literalString3.py']);

    validateResults(analysisResults, 0);
});

test('ParamInference1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['paramInference1.py']);

    validateResults(analysisResults, 0);
});

test('ParamInference2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['paramInference2.py']);

    validateResults(analysisResults, 0);
});

test('Dictionary1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dictionary1.py']);

    validateResults(analysisResults, 3);
});

test('Dictionary2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dictionary2.py']);

    validateResults(analysisResults, 1);
});

test('Dictionary3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dictionary3.py']);

    validateResults(analysisResults, 1);
});

test('Dictionary4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['dictionary4.py']);

    validateResults(analysisResults, 0);
});

test('StaticExpression1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_8;
    configOptions.defaultPythonPlatform = 'windows';

    const analysisResults1 = typeAnalyzeSampleFiles(['staticExpression1.py'], configOptions);
    validateResults(analysisResults1, 9);

    configOptions.defaultPythonVersion = pythonVersion3_11;
    configOptions.defaultPythonPlatform = 'Linux';

    const analysisResults2 = typeAnalyzeSampleFiles(['staticExpression1.py'], configOptions);
    validateResults(analysisResults2, 6);

    configOptions.defineConstant.set('DEFINED_TRUE', true);
    configOptions.defineConstant.set('DEFINED_FALSE', false);
    configOptions.defineConstant.set('DEFINED_STR', 'hi!');
    const analysisResults3 = typeAnalyzeSampleFiles(['staticExpression1.py'], configOptions);
    validateResults(analysisResults3, 0);
});

test('StaticExpression2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['staticExpression2.py']);

    validateResults(analysisResults, 0);
});

test('SpecialForm1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['specialForm1.py']);

    validateResults(analysisResults, 4);
});

test('SpecialForm2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['specialForm2.py']);

    validateResults(analysisResults, 0);
});

test('SpecialForm3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['specialForm3.py']);

    validateResults(analysisResults, 22);
});

test('SpecialForm4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['specialForm4.py']);

    validateResults(analysisResults, 72);
});

test('TypeForm1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm1.py'], configOptions);

    validateResults(analysisResults, 4);
});

test('TypeForm2', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm2.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('TypeForm3', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm3.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('TypeForm4', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm4.py'], configOptions);

    validateResults(analysisResults, 27);
});

test('TypeForm5', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm5.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('TypeForm6', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm6.py'], configOptions);

    validateResults(analysisResults, 8);
});

test('TypeForm7', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['typeForm7.py'], configOptions);

    validateResults(analysisResults, 1);
});
