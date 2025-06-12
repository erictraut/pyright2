/*
 * typeEvaluator7.test.ts
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
    pythonVersion3_8,
} from '../common/pythonVersion.ts';
import { ConfigOptions } from '../config/configOptions.ts';
import { Uri } from '../files/uri/uri.ts';
import { typeAnalyzeSampleFiles, validateResults } from './testUtils.ts';

test('GenericType1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType1.py']);

    validateResults(analysisResults, 5);
});

test('GenericType2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType2.py']);

    validateResults(analysisResults, 0);
});

test('GenericType3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType3.py']);

    validateResults(analysisResults, 2);
});

test('GenericType4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType4.py']);

    validateResults(analysisResults, 1);
});

test('GenericType5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType5.py']);

    validateResults(analysisResults, 1);
});

test('GenericType6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType6.py']);

    validateResults(analysisResults, 1);
});

test('GenericType7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType7.py']);

    validateResults(analysisResults, 2);
});

test('GenericType8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType8.py']);

    validateResults(analysisResults, 1);
});

test('GenericType9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType9.py']);

    validateResults(analysisResults, 2);
});

test('GenericType10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType10.py']);

    validateResults(analysisResults, 0);
});

test('GenericType11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType11.py']);

    validateResults(analysisResults, 0);
});

test('GenericType12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType12.py']);

    validateResults(analysisResults, 0);
});

test('GenericType13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType13.py']);

    validateResults(analysisResults, 0);
});

test('GenericType14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType14.py']);

    validateResults(analysisResults, 0);
});

test('GenericType15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType15.py']);

    validateResults(analysisResults, 0);
});

test('GenericType16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType16.py']);

    validateResults(analysisResults, 0);
});

test('GenericType17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType17.py']);

    validateResults(analysisResults, 0);
});

test('GenericType18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType18.py']);

    validateResults(analysisResults, 1);
});

test('GenericType19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType19.py']);

    validateResults(analysisResults, 0);
});

test('GenericType20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType20.py']);

    validateResults(analysisResults, 1);
});

test('GenericType21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType21.py']);

    validateResults(analysisResults, 0);
});

test('GenericType22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType22.py']);

    validateResults(analysisResults, 1);
});

test('GenericType23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType23.py']);

    validateResults(analysisResults, 0);
});

test('GenericType24', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType24.py']);

    validateResults(analysisResults, 0);
});

test('GenericType25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType25.py']);

    validateResults(analysisResults, 1);
});

test('GenericType26', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType26.py']);

    validateResults(analysisResults, 2);
});

test('GenericType27', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType27.py']);

    validateResults(analysisResults, 0);
});

test('GenericType28', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType28.py']);

    validateResults(analysisResults, 18);
});

test('GenericType29', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType29.py']);

    validateResults(analysisResults, 0);
});

test('GenericType30', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType30.py']);

    validateResults(analysisResults, 0);
});

test('GenericType31', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType31.py']);

    validateResults(analysisResults, 2);
});

test('GenericType32', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType32.py']);

    validateResults(analysisResults, 0);
});

test('GenericType33', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType33.py']);

    validateResults(analysisResults, 1);
});

test('GenericType34', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType34.py']);

    validateResults(analysisResults, 0);
});

test('GenericType35', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType35.py']);

    validateResults(analysisResults, 1);
});

test('GenericType36', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType36.py']);

    validateResults(analysisResults, 0);
});

test('GenericType37', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType37.py']);

    validateResults(analysisResults, 0);
});

test('GenericType38', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType38.py']);

    validateResults(analysisResults, 0);
});

test('GenericType39', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType39.py']);

    validateResults(analysisResults, 0);
});

test('GenericType40', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType40.py']);

    validateResults(analysisResults, 0);
});

test('GenericType41', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType41.py']);

    validateResults(analysisResults, 0);
});

test('GenericType42', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType42.py']);

    validateResults(analysisResults, 0);
});

test('GenericType43', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType43.py']);

    validateResults(analysisResults, 0);
});

test('GenericType44', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType44.py']);

    validateResults(analysisResults, 0);
});

test('GenericType45', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType45.py']);

    validateResults(analysisResults, 6);
});

test('GenericType46', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType46.py']);

    validateResults(analysisResults, 0);
});

test('GenericType47', () => {
    const analysisResults = typeAnalyzeSampleFiles(['genericType47.py']);

    validateResults(analysisResults, 0);
});

test('Protocol1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol1.py']);

    validateResults(analysisResults, 9);
});

test('Protocol2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol2.py']);

    validateResults(analysisResults, 0);
});

test('Protocol3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol3.py']);

    validateResults(analysisResults, 13);
});

test('Protocol4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol4.py']);

    validateResults(analysisResults, 4);
});

test('Protocol5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol5.py']);

    validateResults(analysisResults, 0);
});

test('Protocol6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol6.py']);

    validateResults(analysisResults, 4);
});

test('Protocol7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol7.py']);

    validateResults(analysisResults, 1);
});

test('Protocol8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol8.py']);

    validateResults(analysisResults, 1);
});

test('Protocol9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol9.py']);

    validateResults(analysisResults, 0);
});

test('Protocol10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol10.py']);

    validateResults(analysisResults, 0);
});

test('Protocol11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol11.py']);

    validateResults(analysisResults, 0);
});

test('Protocol12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol12.py']);

    validateResults(analysisResults, 1);
});

test('Protocol13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol13.py']);

    validateResults(analysisResults, 0);
});

test('Protocol14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol14.py']);

    validateResults(analysisResults, 0);
});

test('Protocol15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol15.py']);

    validateResults(analysisResults, 0);
});

test('Protocol16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol16.py']);

    validateResults(analysisResults, 1);
});

test('Protocol17', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.reportInvalidTypeVarUse = 'error';
    const analysisResults = typeAnalyzeSampleFiles(['protocol17.py']);

    validateResults(analysisResults, 7);
});

test('Protocol18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol18.py']);

    validateResults(analysisResults, 2);
});

test('Protocol19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol19.py']);

    validateResults(analysisResults, 2);
});

test('Protocol20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol20.py']);

    validateResults(analysisResults, 0);
});

test('Protocol21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol21.py']);

    validateResults(analysisResults, 1);
});

test('Protocol22', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.reportInvalidTypeVarUse = 'error';
    const analysisResults = typeAnalyzeSampleFiles(['protocol22.py']);

    validateResults(analysisResults, 0);
});

test('Protocol23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol23.py']);

    validateResults(analysisResults, 2);
});

test('Protocol24', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol24.py']);

    validateResults(analysisResults, 6);
});

test('Protocol25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol25.py']);

    validateResults(analysisResults, 1);
});

test('Protocol26', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol26.py']);

    validateResults(analysisResults, 0);
});

test('Protocol28', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol28.py']);

    validateResults(analysisResults, 0);
});

test('Protocol29', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol29.py']);

    validateResults(analysisResults, 0);
});

test('Protocol30', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol30.py']);

    validateResults(analysisResults, 2);
});

test('Protocol31', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol31.py']);

    validateResults(analysisResults, 0);
});

test('Protocol32', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol32.py']);

    validateResults(analysisResults, 2);
});

test('Protocol33', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol33.py']);

    validateResults(analysisResults, 0);
});

test('Protocol34', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol34.py']);

    validateResults(analysisResults, 1);
});

test('Protocol35', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol35.py']);

    validateResults(analysisResults, 1);
});

test('Protocol36', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol36.py']);

    validateResults(analysisResults, 0);
});

test('Protocol37', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol37.py']);

    validateResults(analysisResults, 0);
});

test('Protocol38', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol38.py']);

    validateResults(analysisResults, 0);
});

test('Protocol39', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol39.py']);

    validateResults(analysisResults, 0);
});

test('Protocol40', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol40.py']);

    validateResults(analysisResults, 0);
});

test('Protocol41', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol41.py']);

    validateResults(analysisResults, 0);
});

test('Protocol42', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol42.py']);

    validateResults(analysisResults, 0);
});

test('Protocol43', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol43.py']);

    validateResults(analysisResults, 0);
});

test('Protocol44', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol44.py']);

    validateResults(analysisResults, 0);
});

test('Protocol45', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol45.py']);

    validateResults(analysisResults, 0);
});

test('Protocol46', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol46.py']);

    validateResults(analysisResults, 0);
});

test('Protocol47', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol47.py']);

    validateResults(analysisResults, 2);
});

test('Protocol48', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol48.py']);

    validateResults(analysisResults, 0);
});

test('Protocol49', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol49.py']);

    validateResults(analysisResults, 0);
});

test('Protocol50', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol50.py']);

    validateResults(analysisResults, 0);
});

test('Protocol51', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol51.py']);

    validateResults(analysisResults, 0);
});

test('Protocol52', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocol52.py']);

    validateResults(analysisResults, 0);
});

test('Protocol53', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Note: This test exposes some inconsistencies between override checks
    // and protocol matching. Both of these should generate 8 errors.
    configOptions.diagnosticRuleSet.reportAssignmentType = 'none';
    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'error';
    const analysisResults1 = typeAnalyzeSampleFiles(['protocol53.py'], configOptions);
    validateResults(analysisResults1, 10);

    configOptions.diagnosticRuleSet.reportAssignmentType = 'error';
    configOptions.diagnosticRuleSet.reportIncompatibleMethodOverride = 'none';
    const analysisResults2 = typeAnalyzeSampleFiles(['protocol53.py'], configOptions);
    validateResults(analysisResults2, 8);
});

test('ProtocolExplicit1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocolExplicit1.py']);

    validateResults(analysisResults, 5);
});

test('ProtocolExplicit3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['protocolExplicit3.py']);

    validateResults(analysisResults, 3);
});

test('TypedDict1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict1.py']);

    validateResults(analysisResults, 11);
});

test('TypedDict2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict2.py']);

    validateResults(analysisResults, 4);
});

test('TypedDict3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict3.py']);

    validateResults(analysisResults, 4);
});

test('TypedDict4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict4.py']);

    validateResults(analysisResults, 7);
});

test('TypedDict5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict5.py']);

    validateResults(analysisResults, 4);
});

test('TypedDict6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict6.py']);

    validateResults(analysisResults, 13);
});

test('TypedDict7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict7.py']);

    validateResults(analysisResults, 0);
});

test('TypedDict8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict8.py']);

    validateResults(analysisResults, 2);
});

test('TypedDict9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict9.py']);

    validateResults(analysisResults, 1);
});

test('TypedDict10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict10.py']);

    validateResults(analysisResults, 3);
});

test('TypedDict11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict11.py']);

    validateResults(analysisResults, 0);
});

test('TypedDict12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict12.py']);

    validateResults(analysisResults, 3);
});

test('TypedDict13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict13.py']);

    validateResults(analysisResults, 4);
});

test('TypedDict14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict14.py']);

    validateResults(analysisResults, 1);
});

test('TypedDict15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict15.py']);

    validateResults(analysisResults, 2);
});

test('TypedDict16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict16.py']);

    validateResults(analysisResults, 7);
});

test('TypedDict17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict17.py']);

    validateResults(analysisResults, 2);
});

test('TypedDict18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict18.py']);

    validateResults(analysisResults, 3);
});

test('TypedDict19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict19.py']);

    validateResults(analysisResults, 2);
});

test('TypedDict20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict20.py']);

    validateResults(analysisResults, 0);
});

test('TypedDict21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict21.py']);

    validateResults(analysisResults, 1);
});

test('TypedDict22', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict22.py']);

    validateResults(analysisResults, 0);
});

test('TypedDict23', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict23.py']);

    validateResults(analysisResults, 2);
});

test('TypedDict24', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict24.py']);

    validateResults(analysisResults, 1);
});

test('TypedDict25', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typedDict25.py']);

    validateResults(analysisResults, 0);
});

test('TypedDictInline1', () => {
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.diagnosticRuleSet.enableExperimentalFeatures = true;

    const analysisResults = typeAnalyzeSampleFiles(['typedDictInline1.py'], configOptions);
    validateResults(analysisResults, 6);
});

test('ClassVar1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar1.py']);

    validateResults(analysisResults, 1);
});

test('ClassVar2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar2.py']);

    validateResults(analysisResults, 1);
});

test('ClassVar3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar3.py']);

    validateResults(analysisResults, 13);
});

test('ClassVar4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar4.py']);

    validateResults(analysisResults, 0);
});

test('ClassVar5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar5.py']);

    validateResults(analysisResults, 0);
});

test('ClassVar6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar6.py']);

    validateResults(analysisResults, 4);
});

test('ClassVar7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['classVar7.py']);

    validateResults(analysisResults, 2);
});

test('TypeVar1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar1.py']);

    validateResults(analysisResults, 3);
});

test('TypeVar2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar2.py']);

    validateResults(analysisResults, 0);
});

test('TypeVar3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar3.py']);

    validateResults(analysisResults, 12);
});

test('TypeVar4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar4.py']);

    validateResults(analysisResults, 4);
});

test('TypeVar5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar5.py']);

    validateResults(analysisResults, 18);
});

test('TypeVar6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar6.py']);

    validateResults(analysisResults, 20);
});

test('TypeVar7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar7.py']);

    validateResults(analysisResults, 26);
});

test('TypeVar8', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_12;
    const analysisResults1 = typeAnalyzeSampleFiles(['typeVar8.py'], configOptions);
    validateResults(analysisResults1, 4);

    configOptions.defaultPythonVersion = pythonVersion3_13;
    const analysisResults2 = typeAnalyzeSampleFiles(['typeVar8.py'], configOptions);
    validateResults(analysisResults2, 2);
});

test('TypeVar9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar9.py']);

    validateResults(analysisResults, 13);
});

test('TypeVar10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar10.py']);

    validateResults(analysisResults, 0);
});

test('TypeVar11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeVar11.py']);

    validateResults(analysisResults, 0);
});

test('Annotated1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['annotated1.py'], configOptions);
    validateResults(analysisResults38, 5);

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults39 = typeAnalyzeSampleFiles(['annotated1.py'], configOptions);
    validateResults(analysisResults39, 3);
});

test('Annotated2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotated2.py']);

    validateResults(analysisResults, 0);
});

test('Circular1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['circular1.py']);

    validateResults(analysisResults, 2);
});

test('Circular2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['circular2.py']);

    validateResults(analysisResults, 0);
});

test('TryExcept1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept1.py']);

    validateResults(analysisResults, 4);
});

test('TryExcept2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept2.py']);

    validateResults(analysisResults, 0);
});

test('TryExcept3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept3.py']);

    validateResults(analysisResults, 0);
});

test('TryExcept4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept4.py']);

    validateResults(analysisResults, 4);
});

test('TryExcept5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept5.py']);

    validateResults(analysisResults, 1);
});

test('TryExcept6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept6.py']);

    validateResults(analysisResults, 1);
});

test('TryExcept8', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept8.py'], configOptions);
    validateResults(analysisResults, 3);
});

test('TryExcept9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept9.py']);
    validateResults(analysisResults, 0);
});

test('TryExcept10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept10.py']);
    validateResults(analysisResults, 1);
});

test('TryExcept11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['tryExcept11.py']);
    validateResults(analysisResults, 0);
});

test('TryExcept12', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_13;
    const analysisResults1 = typeAnalyzeSampleFiles(['tryExcept12.py'], configOptions);
    validateResults(analysisResults1, 3);

    configOptions.defaultPythonVersion = pythonVersion3_14;
    const analysisResults2 = typeAnalyzeSampleFiles(['tryExcept12.py'], configOptions);
    validateResults(analysisResults2, 1);
});

test('exceptionGroup1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults1 = typeAnalyzeSampleFiles(['exceptionGroup1.py'], configOptions);
    validateResults(analysisResults1, 34);

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults2 = typeAnalyzeSampleFiles(['exceptionGroup1.py'], configOptions);
    validateResults(analysisResults2, 10);
});

test('Del1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['del1.py']);
    validateResults(analysisResults, 6);
});

test('Del2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['del2.py']);

    validateResults(analysisResults, 2);
});

test('Any1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['any1.py']);

    validateResults(analysisResults, 8);
});

test('Type1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['type1.py']);

    validateResults(analysisResults, 8);
});
