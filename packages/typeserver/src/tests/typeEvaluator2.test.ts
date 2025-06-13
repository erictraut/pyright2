/*
 * typeEvaluator2.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright type evaluator. Tests are split
 * arbitrarily among multiple files so they can run in parallel.
 */

import { pythonVersion3_10, pythonVersion3_9 } from 'typeserver/common/pythonVersion.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { Uri } from 'typeserver/files/uri/uri.js';
import { typeAnalyzeSampleFiles, validateResults } from 'typeserver/tests/testUtils.js';

test('CallbackProtocol1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol1.py']);

    validateResults(analysisResults, 10);
});

test('CallbackProtocol2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol2.py']);

    validateResults(analysisResults, 0);
});

test('CallbackProtocol3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol3.py']);

    validateResults(analysisResults, 0);
});

test('CallbackProtocol4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol4.py']);

    validateResults(analysisResults, 2);
});

test('CallbackProtocol5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol5.py']);

    validateResults(analysisResults, 5);
});

test('CallbackProtocol6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol6.py']);

    validateResults(analysisResults, 2);
});

test('CallbackProtocol7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol7.py']);

    validateResults(analysisResults, 0);
});

test('CallbackProtocol8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol8.py']);

    validateResults(analysisResults, 0);
});

test('CallbackProtocol9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol9.py']);

    validateResults(analysisResults, 2);
});

test('CallbackProtocol10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol10.py']);

    validateResults(analysisResults, 0);
});

test('CallbackProtocol11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['callbackProtocol11.py']);

    validateResults(analysisResults, 0);
});

test('Assignment1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment1.py']);

    validateResults(analysisResults, 8);
});

test('Assignment2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment2.py']);

    validateResults(analysisResults, 3);
});

test('Assignment3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment3.py']);

    validateResults(analysisResults, 4);
});

test('Assignment4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment4.py']);

    validateResults(analysisResults, 0);
});

test('Assignment5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment5.py']);

    validateResults(analysisResults, 0);
});

test('Assignment6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment6.py']);

    validateResults(analysisResults, 1);
});

test('Assignment7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment7.py']);

    validateResults(analysisResults, 0);
});

test('Assignment8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment8.py']);

    validateResults(analysisResults, 1);
});

test('Assignment9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment9.py']);

    validateResults(analysisResults, 1);
});

test('Assignment10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment10.py']);

    validateResults(analysisResults, 0);
});

test('Assignment11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignment11.py']);

    validateResults(analysisResults, 2);
});

test('Assignment12', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['assignment12.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportUnknownVariableType = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['assignment12.py'], configOptions);
    validateResults(analysisResults2, 3);
});

test('AugmentedAssignment1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['augmentedAssignment1.py']);

    validateResults(analysisResults, 3);
});

test('AugmentedAssignment2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['augmentedAssignment2.py']);

    validateResults(analysisResults, 3);
});

test('AugmentedAssignment3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['augmentedAssignment3.py']);

    validateResults(analysisResults, 0);
});

test('Super1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super1.py']);

    validateResults(analysisResults, 6);
});

test('Super2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super2.py']);

    validateResults(analysisResults, 0);
});

test('Super3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super3.py']);

    validateResults(analysisResults, 0);
});

test('Super4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super4.py']);

    validateResults(analysisResults, 0);
});

test('Super5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super5.py']);

    validateResults(analysisResults, 0);
});

test('Super6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super6.py']);

    validateResults(analysisResults, 0);
});

test('Super7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super7.py']);

    validateResults(analysisResults, 3);
});

test('Super8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super8.py']);

    validateResults(analysisResults, 0);
});

test('Super9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super9.py']);

    validateResults(analysisResults, 0);
});

test('Super10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super10.py']);

    validateResults(analysisResults, 0);
});

test('Super11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super11.py']);

    validateResults(analysisResults, 0);
});

test('Super12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super12.py']);

    validateResults(analysisResults, 1);
});

test('Super13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['super13.py']);

    validateResults(analysisResults, 0);
});

test('MissingSuper1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['missingSuper1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportMissingSuperCall = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['missingSuper1.py'], configOptions);
    validateResults(analysisResults2, 4);
});

test('NewType1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType1.py']);

    validateResults(analysisResults, 13);
});

test('NewType2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType2.py']);

    validateResults(analysisResults, 6);
});

test('NewType3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType3.py']);

    validateResults(analysisResults, 4);
});

test('NewType4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType4.py']);

    validateResults(analysisResults, 5);
});

test('NewType5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType5.py']);

    validateResults(analysisResults, 1);
});

test('NewType6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType6.py']);

    validateResults(analysisResults, 1);
});

test('NewType7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['newType7.py']);

    validateResults(analysisResults, 2);
});

test('isInstance1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['isinstance1.py']);

    validateResults(analysisResults, 0);
});

test('isInstance2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['isinstance2.py']);

    validateResults(analysisResults, 1);
});

test('isInstance3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults1 = typeAnalyzeSampleFiles(['isinstance3.py'], configOptions);
    validateResults(analysisResults1, 7);

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults2 = typeAnalyzeSampleFiles(['isinstance3.py'], configOptions);
    validateResults(analysisResults2, 7);
});

test('isInstance4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['isinstance4.py']);

    validateResults(analysisResults, 2);
});

test('isInstance5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['isinstance5.py']);

    validateResults(analysisResults, 2);
});

test('isInstance6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['isinstance6.py']);

    validateResults(analysisResults, 3);
});

test('Unbound1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unbound1.py']);

    validateResults(analysisResults, 1);
});

test('Unbound2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unbound2.py']);

    validateResults(analysisResults, 1);
});

test('Unbound3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unbound3.py']);

    validateResults(analysisResults, 1);
});

test('Unbound4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unbound4.py']);

    validateResults(analysisResults, 2);
});

test('Unbound5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unbound5.py']);

    validateResults(analysisResults, 2);
});

test('Unbound6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unbound6.py']);

    validateResults(analysisResults, 8);
});

test('Assert1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, this is reported as a warning.
    let analysisResults = typeAnalyzeSampleFiles(['assert1.py'], configOptions);
    validateResults(analysisResults, 0, 2);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportAssertAlwaysTrue = 'error';
    analysisResults = typeAnalyzeSampleFiles(['assert1.py'], configOptions);
    validateResults(analysisResults, 2, 0);

    // Turn off the diagnostic.
    configOptions.diagnosticRuleSet.reportAssertAlwaysTrue = 'none';
    analysisResults = typeAnalyzeSampleFiles(['assert1.py'], configOptions);
    validateResults(analysisResults, 0, 0);
});

test('RevealedType1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['revealedType1.py']);

    validateResults(analysisResults, 2, 0, 7);
});

test('AssertType1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assertType1.py']);

    validateResults(analysisResults, 11);
});

test('NameBinding1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['nameBinding1.py']);

    validateResults(analysisResults, 5);
});

test('NameBinding2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['nameBinding2.py']);

    validateResults(analysisResults, 1);
});

test('NameBinding3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['nameBinding3.py']);

    validateResults(analysisResults, 3);
});

test('NameBinding4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['nameBinding4.py']);

    validateResults(analysisResults, 0);
});

test('NameBinding5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['nameBinding5.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar1.py']);

    validateResults(analysisResults, 5);
});

test('ConstrainedTypeVar2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar2.py']);

    validateResults(analysisResults, 5);
});

test('ConstrainedTypeVar3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar3.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar4.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar5.py']);

    validateResults(analysisResults, 1);
});

test('ConstrainedTypeVar6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar6.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar7.py']);

    validateResults(analysisResults, 2);
});

test('ConstrainedTypeVar8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar8.py']);

    validateResults(analysisResults, 1);
});

test('ConstrainedTypeVar9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar9.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar10.py']);

    validateResults(analysisResults, 1);
});

test('ConstrainedTypeVar11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar11.py']);

    validateResults(analysisResults, 1);
});

test('ConstrainedTypeVar12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar12.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar13.py']);

    validateResults(analysisResults, 5);
});

test('ConstrainedTypeVar14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar14.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar15', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.disableBytesTypePromotions = true;

    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar15.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar16.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar17.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar18.py']);

    validateResults(analysisResults, 0);
});

test('ConstrainedTypeVar19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar19.py']);

    validateResults(analysisResults, 1);
});

test('ConstrainedTypeVar20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constrainedTypeVar20.py']);

    validateResults(analysisResults, 0);
});

test('MissingTypeArg1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, reportMissingTypeArgument is disabled.
    let analysisResults = typeAnalyzeSampleFiles(['missingTypeArg1.py']);
    validateResults(analysisResults, 1);

    // Turn on errors.
    configOptions.diagnosticRuleSet.reportMissingTypeArgument = 'error';
    analysisResults = typeAnalyzeSampleFiles(['missingTypeArg1.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('Solver1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver1.py']);

    validateResults(analysisResults, 0);
});

test('Solver2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver2.py']);

    validateResults(analysisResults, 0);
});

test('Solver3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver3.py']);

    validateResults(analysisResults, 1);
});

test('Solver4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver4.py']);

    validateResults(analysisResults, 0);
});

test('Solver5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver5.py']);

    validateResults(analysisResults, 0);
});

test('Solver6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver6.py']);

    validateResults(analysisResults, 1);
});

test('Solver7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver7.py']);

    validateResults(analysisResults, 0);
});

test('Solver8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver8.py']);

    validateResults(analysisResults, 1);
});

test('Solver9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver9.py']);

    validateResults(analysisResults, 1);
});

test('Solver10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver10.py']);

    validateResults(analysisResults, 0);
});

test('Solver11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver11.py']);

    validateResults(analysisResults, 0);
});

test('Solver12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver12.py']);

    validateResults(analysisResults, 0);
});

test('Solver13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver13.py']);

    validateResults(analysisResults, 0);
});

test('Solver14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver14.py']);

    validateResults(analysisResults, 0);
});

test('Solver15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver15.py']);

    validateResults(analysisResults, 0);
});

test('Solver16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver16.py']);

    validateResults(analysisResults, 1);
});

test('Solver17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver17.py']);

    validateResults(analysisResults, 0);
});

test('Solver18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver18.py']);

    validateResults(analysisResults, 0);
});

test('Solver19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver19.py']);

    validateResults(analysisResults, 0);
});

test('Solver20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver20.py']);

    validateResults(analysisResults, 0);
});

test('Solver21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver21.py']);

    validateResults(analysisResults, 0);
});

test('Solver22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver22.py']);

    validateResults(analysisResults, 0);
});

test('Solver23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver23.py']);

    validateResults(analysisResults, 2);
});

test('Solver24', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver24.py']);

    validateResults(analysisResults, 0);
});

test('Solver25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver25.py']);

    validateResults(analysisResults, 0);
});

test('Solver26', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver26.py']);

    validateResults(analysisResults, 0);
});

test('Solver27', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver27.py']);

    validateResults(analysisResults, 0);
});

test('Solver28', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver28.py']);

    validateResults(analysisResults, 0);
});

test('Solver29', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver29.py']);

    validateResults(analysisResults, 0);
});

test('Solver30', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver30.py']);

    validateResults(analysisResults, 0);
});

test('Solver31', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver31.py']);

    validateResults(analysisResults, 0);
});

test('Solver32', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver32.py']);

    validateResults(analysisResults, 0);
});

test('Solver33', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver33.py']);

    validateResults(analysisResults, 0);
});

test('Solver34', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver34.py']);

    validateResults(analysisResults, 1);
});

test('Solver35', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver35.py']);

    validateResults(analysisResults, 4);
});

test('Solver36', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver36.py']);

    validateResults(analysisResults, 1);
});

test('Solver37', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver37.py']);

    validateResults(analysisResults, 0);
});

test('Solver38', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver38.py']);

    validateResults(analysisResults, 0);
});

test('Solver39', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver39.py']);

    validateResults(analysisResults, 0);
});

test('Solver40', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver40.py']);

    validateResults(analysisResults, 0);
});

test('Solver41', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver41.py']);

    validateResults(analysisResults, 0);
});

test('Solver42', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver42.py']);

    validateResults(analysisResults, 2);
});

test('Solver43', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver43.py']);

    validateResults(analysisResults, 0);
});

test('Solver44', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver44.py']);

    validateResults(analysisResults, 0);
});

test('Solver45', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solver45.py']);

    validateResults(analysisResults, 0);
});

test('SolverScoring1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverScoring1.py']);

    validateResults(analysisResults, 0);
});

test('SolverScoring2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverScoring2.py']);

    validateResults(analysisResults, 2);
});

test('SolverScoring3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverScoring3.py']);

    validateResults(analysisResults, 0);
});

test('SolverScoring4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverScoring4.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder1.py']);

    validateResults(analysisResults, 1);
});

test('SolverHigherOrder2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder2.py']);

    validateResults(analysisResults, 1);
});

test('SolverHigherOrder3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder3.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder4.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder5.py']);

    validateResults(analysisResults, 1);
});

test('SolverHigherOrder6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder6.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder7.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder8.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder9.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder10.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder11.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder12.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder13.py']);

    validateResults(analysisResults, 0);
});

test('SolverHigherOrder14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverHigherOrder14.py']);

    validateResults(analysisResults, 0);
});

test('SolverLiteral1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverLiteral1.py']);

    validateResults(analysisResults, 0);
});

test('SolverLiteral2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverLiteral2.py']);

    validateResults(analysisResults, 1);
});

test('SolverUnknown1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['solverUnknown1.py']);

    validateResults(analysisResults, 0);
});

test('Sentinel1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;
    const analysisResults = typeAnalyzeSampleFiles(['sentinel1.py'], configOptions);
    validateResults(analysisResults, 5);
});
