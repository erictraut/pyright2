/*
 * typeEvaluator6.test.ts
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
    pythonVersion3_8,
    pythonVersion3_9,
} from 'typeserver/common/pythonVersion.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { typeAnalyzeSampleFiles, validateResults } from 'typeserver/tests/testUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

test('Overload1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overload1.py']);
    validateResults(analysisResults, 1);
});

test('Overload2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overload2.py']);
    validateResults(analysisResults, 3);
});

test('Overload3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overload3.py']);
    validateResults(analysisResults, 3);
});

test('Overload4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overload4.py']);
    validateResults(analysisResults, 0);
});

test('Overload5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overload5.py']);
    validateResults(analysisResults, 6);
});

test('OverloadCall1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall1.py']);
    validateResults(analysisResults, 0);
});

test('OverloadCall2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall2.py']);
    validateResults(analysisResults, 0);
});

test('OverloadCall3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall3.py']);
    validateResults(analysisResults, 0);
});

test('OverloadCall4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall4.py']);
    validateResults(analysisResults, 4);
});

test('OverloadCall5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall5.py']);
    validateResults(analysisResults, 1);
});

test('OverloadCall6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall6.py']);
    validateResults(analysisResults, 2);
});

test('OverloadCall7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall7.py']);
    validateResults(analysisResults, 0);
});

test('OverloadCall8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall8.py']);
    validateResults(analysisResults, 0);
});

test('OverloadCall9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall9.py']);
    validateResults(analysisResults, 8);
});

test('OverloadCall10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall10.py']);
    validateResults(analysisResults, 2);
});

test('OverloadCall11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadCall11.py']);
    validateResults(analysisResults, 0);
});

test('OverloadOverride1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadOverride1.py']);
    validateResults(analysisResults, 1);
});

test('OverloadImpl1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadImpl1.py']);
    validateResults(analysisResults, 6);
});

test('OverloadImpl2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['overloadImpl2.py']);
    validateResults(analysisResults, 2);
});

test('OverloadOverlap1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportOverlappingOverload = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['overloadOverlap1.py'], configOptions);
    validateResults(analysisResults, 0);

    configOptions.diagnosticRuleSet.reportOverlappingOverload = 'error';
    analysisResults = typeAnalyzeSampleFiles(['overloadOverlap1.py'], configOptions);
    validateResults(analysisResults, 16);
});

test('TypeGuard1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeGuard1.py']);

    validateResults(analysisResults, 8);
});

test('TypeGuard2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeGuard2.py']);

    validateResults(analysisResults, 0);
});

test('TypeGuard3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeGuard3.py']);
    validateResults(analysisResults, 0);
});

test('TypeIs1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeIs1.py']);
    validateResults(analysisResults, 2);
});

test('TypeIs2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeIs2.py']);
    validateResults(analysisResults, 9);
});

test('TypeIs3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeIs3.py']);
    validateResults(analysisResults, 0);
});

test('TypeIs4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeIs4.py']);
    validateResults(analysisResults, 0);
});

test('Never1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['never1.py']);

    validateResults(analysisResults, 5);
});

test('Never2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['never2.py']);

    validateResults(analysisResults, 1);
});

test('TypePromotions1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.disableBytesTypePromotions = false;

    const analysisResults = typeAnalyzeSampleFiles(['typePromotions1.py'], configOptions);

    validateResults(analysisResults, 0);
});

test('Index1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['index1.py']);

    validateResults(analysisResults, 10);
});

test('ProtocolModule2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocolModule2.py']);

    validateResults(analysisResults, 3);
});

test('ProtocolModule4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocolModule4.py']);

    validateResults(analysisResults, 1);
});

test('TypeVarTuple1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple1.py'], configOptions);
    validateResults(analysisResults, 18);
});

test('TypeVarTuple2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple2.py'], configOptions);
    validateResults(analysisResults, 16);
});

test('TypeVarTuple3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple3.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('TypeVarTuple4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple4.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypeVarTuple5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple5.py'], configOptions);
    validateResults(analysisResults, 9);
});

test('TypeVarTuple6', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple6.py'], configOptions);
    validateResults(analysisResults, 10);
});

test('TypeVarTuple7', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple7.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('TypeVarTuple8', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple8.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TypeVarTuple9', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple9.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple10', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple10.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('TypeVarTuple11', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple11.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('TypeVarTuple12', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple12.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple13', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple13.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('TypeVarTuple14', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple14.py'], configOptions);
    validateResults(analysisResults, 14);
});

test('TypeVarTuple15', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple15.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple16', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple16.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple17', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple17.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple18', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple18.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('TypeVarTuple19', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple19.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple20', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple20.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple21', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple21.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple22', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple22.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TypeVarTuple23', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple23.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple24', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple24.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple25', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple25.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple26', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple26.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TypeVarTuple27', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple27.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('TypeVarTuple28', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple28.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple29', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple29.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('TypeVarTuple30', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults = typeAnalyzeSampleFiles(['typeVarTuple30.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('Match1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['match1.py'], configOptions);
    validateResults(analysisResults, 21);
});

test('Match2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['match2.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('Match3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['match3.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchSequence1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchSequence1.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('MatchSequence2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults = typeAnalyzeSampleFiles(['matchSequence2.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchClass1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass1.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('MatchClass2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass2.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchClass3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass3.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchClass4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass4.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchClass5', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass5.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('MatchClass6', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass6.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchClass7', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchClass7.py'], configOptions);
    validateResults(analysisResults, 1);
});

test('MatchValue1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchValue1.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchMapping1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchMapping1.py'], configOptions);
    validateResults(analysisResults, 2);
});

test('MatchLiteral1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchLiteral1.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchLiteral2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['matchLiteral2.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('MatchExhaustion1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    configOptions.diagnosticRuleSet.reportMatchNotExhaustive = 'none';
    const analysisResults1 = typeAnalyzeSampleFiles(['matchExhaustion1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportMatchNotExhaustive = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['matchExhaustion1.py'], configOptions);
    validateResults(analysisResults2, 4);
});

test('MatchUnnecessary1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults1 = typeAnalyzeSampleFiles(['matchUnnecessary1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportUnnecessaryComparison = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['matchUnnecessary1.py'], configOptions);
    validateResults(analysisResults2, 7);
});

test('List1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['list1.py']);
    validateResults(analysisResults, 3);
});

test('List2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['list2.py']);
    validateResults(analysisResults, 0);
});

test('List3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['list3.py']);
    validateResults(analysisResults, 0);
});

test('Comparison1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['comparison1.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportUnnecessaryComparison = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['comparison1.py'], configOptions);
    validateResults(analysisResults2, 7);
});

test('Comparison2', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['comparison2.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportUnnecessaryComparison = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['comparison2.py'], configOptions);
    validateResults(analysisResults2, 18);
});

test('EmptyContainers1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['emptyContainers1.py']);
    validateResults(analysisResults, 5);
});

test('InitSubclass1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['initsubclass1.py']);

    validateResults(analysisResults, 6);
});

test('InitSubclass2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['initsubclass2.py']);

    validateResults(analysisResults, 2);
});

test('InitSubclass3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['initsubclass3.py']);

    validateResults(analysisResults, 3);
});

test('None1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['none1.py']);

    validateResults(analysisResults, 1);
});

test('None2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['none2.py']);

    validateResults(analysisResults, 2);
});

test('Constructor1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor1.py']);

    validateResults(analysisResults, 0);
});

test('Constructor2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor2.py']);

    validateResults(analysisResults, 0);
});

test('Constructor3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor3.py']);

    validateResults(analysisResults, 0);
});

test('Constructor4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor4.py']);

    validateResults(analysisResults, 1);
});

test('Constructor5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor5.py']);

    validateResults(analysisResults, 0);
});

test('Constructor6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor6.py']);

    validateResults(analysisResults, 0, 1);
});

test('Constructor7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor7.py']);

    validateResults(analysisResults, 0);
});

test('Constructor9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor9.py']);

    validateResults(analysisResults, 0);
});

test('Constructor10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor10.py']);

    validateResults(analysisResults, 0);
});

test('Constructor11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor11.py']);

    validateResults(analysisResults, 0);
});

test('Constructor12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor12.py']);

    validateResults(analysisResults, 0);
});

test('Constructor13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor13.py']);

    validateResults(analysisResults, 1);
});

test('Constructor14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor14.py']);

    validateResults(analysisResults, 0);
});

test('Constructor15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor15.py']);

    validateResults(analysisResults, 0);
});

test('Constructor16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor16.py']);

    validateResults(analysisResults, 2);
});

test('Constructor17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor17.py']);

    validateResults(analysisResults, 0);
});

test('Constructor18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor18.py']);

    validateResults(analysisResults, 0);
});

test('Constructor19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor19.py']);

    validateResults(analysisResults, 1);
});

test('Constructor20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor20.py']);

    validateResults(analysisResults, 2);
});

test('Constructor21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor21.py']);

    validateResults(analysisResults, 2);
});

test('Constructor22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor22.py']);

    validateResults(analysisResults, 0);
});

test('Constructor23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor23.py']);

    validateResults(analysisResults, 0);
});

test('Constructor24', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.strictParameterNoneValue = false;
    let analysisResults = typeAnalyzeSampleFiles(['constructor24.py'], configOptions);
    validateResults(analysisResults, 4);

    configOptions.diagnosticRuleSet.strictParameterNoneValue = true;
    analysisResults = typeAnalyzeSampleFiles(['constructor24.py'], configOptions);
    validateResults(analysisResults, 5);
});

test('Constructor25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor25.py']);

    validateResults(analysisResults, 1);
});

test('Constructor26', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor26.py']);

    validateResults(analysisResults, 8);
});

test('Constructor27', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor27.py']);

    validateResults(analysisResults, 0);
});

test('Constructor28', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor28.py']);

    validateResults(analysisResults, 1);
});

test('Constructor29', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor29.py']);

    validateResults(analysisResults, 0);
});

test('Constructor30', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor30.py']);

    validateResults(analysisResults, 0);
});

test('Constructor31', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor31.py']);

    validateResults(analysisResults, 0);
});

test('Constructor32', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor32.py']);

    validateResults(analysisResults, 1);
});

test('Constructor33', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructor33.py']);

    validateResults(analysisResults, 0);
});

test('ConstructorCallable1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructorCallable1.py']);

    validateResults(analysisResults, 4);
});

test('ConstructorCallable2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['constructorCallable2.py']);

    validateResults(analysisResults, 1);
});

test('InconsistentConstructor1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportInconsistentConstructor = 'none';
    let analysisResults = typeAnalyzeSampleFiles(['inconsistentConstructor1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportInconsistentConstructor = 'error';
    analysisResults = typeAnalyzeSampleFiles(['inconsistentConstructor1.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('ClassGetItem1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classGetItem1.py']);

    validateResults(analysisResults, 0, 1);
});

test('UnusedCallResult1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // By default, this is disabled.
    let analysisResults = typeAnalyzeSampleFiles(['unusedCallResult1.py'], configOptions);
    validateResults(analysisResults, 0);

    // Enable it as an error.
    configOptions.diagnosticRuleSet.reportUnusedCallResult = 'error';
    analysisResults = typeAnalyzeSampleFiles(['unusedCallResult1.py'], configOptions);
    validateResults(analysisResults, 4);
});

test('UnusedCoroutine1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unusedCoroutine1.py']);
    validateResults(analysisResults, 2);
});

test('FunctionAnnotation1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['functionAnnotation1.py']);

    validateResults(analysisResults, 1);
});

test('FunctionAnnotation2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['functionAnnotation2.py']);

    validateResults(analysisResults, 4);
});

test('FunctionAnnotation3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['functionAnnotation3.py']);

    validateResults(analysisResults, 2);
});

test('FunctionAnnotation4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['functionAnnotation4.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportTypeCommentUsage = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['functionAnnotation4.py'], configOptions);
    validateResults(analysisResults2, 3);
});

test('Subscript1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['subscript1.py'], configOptions);
    validateResults(analysisResults38, 14);

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults39 = typeAnalyzeSampleFiles(['subscript1.py'], configOptions);
    validateResults(analysisResults39, 0);
});

test('Subscript2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['subscript2.py']);
    validateResults(analysisResults, 8);
});

test('Subscript3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.9 settings.
    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults39 = typeAnalyzeSampleFiles(['subscript3.py'], configOptions);
    validateResults(analysisResults39, 37);

    // Analyze with Python 3.10 settings.
    // These are disabled because PEP 637 was rejected.
    // configOptions.defaultPythonVersion = pythonVersion3_10;
    // const analysisResults310 = typeAnalyzeSampleFiles(['subscript3.py'], configOptions);
    // validateResults(analysisResults310, 11);
});

test('Subscript4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['subscript4.py']);
    validateResults(analysisResults, 0);
});

test('Decorator1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['decorator1.py']);

    validateResults(analysisResults, 0);
});

test('Decorator2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['decorator2.py']);

    validateResults(analysisResults, 0);
});

test('Decorator3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['decorator3.py'], configOptions);
    validateResults(analysisResults38, 3);

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults39 = typeAnalyzeSampleFiles(['decorator3.py'], configOptions);
    validateResults(analysisResults39, 0);
});

test('Decorator4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['decorator4.py']);

    validateResults(analysisResults, 0);
});

test('Decorator5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['decorator5.py']);

    validateResults(analysisResults, 0);
});

test('Decorator6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['decorator6.py']);

    validateResults(analysisResults, 0);
});

test('Decorator7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['decorator7.py']);

    validateResults(analysisResults, 0);
});
