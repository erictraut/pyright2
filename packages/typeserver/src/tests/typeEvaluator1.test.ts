/*
 * typeEvaluator1.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Unit tests for pyright type evaluator. Tests are split
 * arbitrarily among multiple files so they can run in parallel.
 */

import assert from 'assert';

import { ScopeType } from 'typeserver/binder/scope.js';
import { getScope } from 'typeserver/common/analyzerNodeInfo.js';
import {
    pythonVersion3_10,
    pythonVersion3_11,
    pythonVersion3_7,
    pythonVersion3_8,
    pythonVersion3_9,
} from 'typeserver/common/pythonVersion.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { typeAnalyzeSampleFiles, validateResults } from 'typeserver/tests/testUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

test('Unreachable1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['unreachable1.py'], configOptions);
    validateResults(analysisResults1, 0, 0, 2, 1, 6);

    configOptions.diagnosticRuleSet.reportUnreachable = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['unreachable1.py'], configOptions);
    validateResults(analysisResults2, 5, 0, 2, 1, 6);

    configOptions.diagnosticRuleSet.reportUnreachable = 'warning';
    const analysisResults3 = typeAnalyzeSampleFiles(['unreachable1.py'], configOptions);
    validateResults(analysisResults3, 0, 5, 2, 1, 6);
});

test('Builtins1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['builtins1.py']);

    assert.strictEqual(analysisResults.length, 1);
    assert.notStrictEqual(analysisResults[0].parseResults, undefined);
    assert.strictEqual(analysisResults[0].errors.length, 0);
    assert.strictEqual(analysisResults[0].warnings.length, 0);

    // This list comes from python directly.
    // `python`
    // `import builtins
    // `dir(builtins)`
    // Remove True, False, None, _, __build_class__, __debug__, __doc__
    const expectedBuiltinsSymbols = [
        'ArithmeticError',
        'AssertionError',
        'AttributeError',
        'BaseException',
        'BaseExceptionGroup',
        'BlockingIOError',
        'BrokenPipeError',
        'BufferError',
        'BytesWarning',
        'ChildProcessError',
        'ConnectionAbortedError',
        'ConnectionError',
        'ConnectionRefusedError',
        'ConnectionResetError',
        'DeprecationWarning',
        'EOFError',
        'Ellipsis',
        'EncodingWarning',
        'EnvironmentError',
        'Exception',
        'ExceptionGroup',
        'FileExistsError',
        'FileNotFoundError',
        'FloatingPointError',
        'FutureWarning',
        'GeneratorExit',
        'IOError',
        'ImportError',
        'ImportWarning',
        'IndentationError',
        'IndexError',
        'InterruptedError',
        'IsADirectoryError',
        'KeyError',
        'KeyboardInterrupt',
        'LookupError',
        'ModuleNotFoundError',
        'MemoryError',
        'NameError',
        'NotADirectoryError',
        'NotImplemented',
        'NotImplementedError',
        'OSError',
        'OverflowError',
        'PendingDeprecationWarning',
        'PermissionError',
        'ProcessLookupError',
        'PythonFinalizationError',
        'RecursionError',
        'ReferenceError',
        'ResourceWarning',
        'RuntimeError',
        'RuntimeWarning',
        'StopAsyncIteration',
        'StopIteration',
        'SyntaxError',
        'SyntaxWarning',
        'SystemError',
        'SystemExit',
        'TabError',
        'TimeoutError',
        'TypeError',
        'UnboundLocalError',
        'UnicodeDecodeError',
        'UnicodeEncodeError',
        'UnicodeError',
        'UnicodeTranslateError',
        'UnicodeWarning',
        'UserWarning',
        'ValueError',
        'Warning',
        'WindowsError',
        'ZeroDivisionError',
        '__build_class__',
        '__import__',
        '__loader__',
        '__name__',
        '__package__',
        '__spec__',
        'abs',
        'aiter',
        'all',
        'anext',
        'any',
        'ascii',
        'bin',
        'bool',
        'breakpoint',
        'bytearray',
        'bytes',
        'callable',
        'chr',
        'classmethod',
        'compile',
        'complex',
        'copyright',
        'credits',
        'delattr',
        'dict',
        'dir',
        'divmod',
        'enumerate',
        'eval',
        'exec',
        'exit',
        'filter',
        'float',
        'format',
        'frozenset',
        'getattr',
        'globals',
        'hasattr',
        'hash',
        'help',
        'hex',
        'id',
        'input',
        'int',
        'isinstance',
        'issubclass',
        'iter',
        'len',
        'license',
        'list',
        'locals',
        'map',
        'max',
        'memoryview',
        'min',
        'next',
        'object',
        'oct',
        'open',
        'ord',
        'pow',
        'print',
        'property',
        'quit',
        'range',
        'repr',
        'reversed',
        'round',
        'set',
        'setattr',
        'slice',
        'sorted',
        'staticmethod',
        'str',
        'sum',
        'super',
        'tuple',
        'type',
        'vars',
        'zip',
        // These really shouldn't be exposed but are defined by builtins.pyi currently.
        'function',
        'ellipsis',
    ];

    const moduleScope = getScope(analysisResults[0].parseResults!.parserOutput.parseTree)!;
    assert.notStrictEqual(moduleScope, undefined);

    const builtinsScope = moduleScope.parent!;
    assert.notStrictEqual(builtinsScope, undefined);
    assert.strictEqual(builtinsScope.type, ScopeType.Builtin);

    // Make sure all the expected symbols are present.
    const builtinsSymbolTable = builtinsScope.symbolTable;
    for (const symbolName of expectedBuiltinsSymbols) {
        const symbol = moduleScope.lookUpSymbolRecursive(symbolName);
        if (symbol === undefined) {
            assert.fail(`${symbolName} is missing from builtins scope`);
        }
    }

    // Make sure the builtins scope doesn't contain symbols that
    // shouldn't be present.
    const symbolMap = new Map<string, string>();
    for (const symbolName of expectedBuiltinsSymbols) {
        symbolMap.set(symbolName, symbolName);
    }

    for (const builtinName of builtinsSymbolTable.keys()) {
        const symbolInfo = moduleScope.lookUpSymbolRecursive(builtinName);
        if (symbolInfo && symbolInfo.isBeyondExecutionScope) {
            if (symbolMap.get(builtinName) === undefined) {
                assert.fail(`${builtinName} should not be in builtins scope`);
            }
        }
    }
});

test('Builtins2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['builtins2.py']);
    validateResults(analysisResults, 0);
});

test('Complex1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['complex1.py']);
    validateResults(analysisResults, 0);
});

test('TypeNarrowing1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing1.py']);

    validateResults(analysisResults, 6);
});

test('TypeNarrowing2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowing3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing3.py']);

    validateResults(analysisResults, 1);
});

test('TypeNarrowing4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing4.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowing5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing5.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowing6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing6.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowing7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing7.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowing8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowing8.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingAssert1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingAssert1.py']);

    validateResults(analysisResults, 1);
});

test('TypeNarrowingTypeIs1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTypeIs1.py']);

    validateResults(analysisResults, 3);
});

test('TypeNarrowingTypeEquals1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTypeEquals1.py']);

    validateResults(analysisResults, 3);
});

test('TypeNarrowingIsNone1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsNone1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsNone2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsNone2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsClass1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsClass1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsNoneTuple1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsNoneTuple1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsNoneTuple2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsNoneTuple2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsEllipsis1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsEllipsis1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingLiteral1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingLiteral1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingLiteral2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingLiteral2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingEnum1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingEnum1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingEnum2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingEnum2.py']);

    validateResults(analysisResults, 2);
});

test('TypeNarrowingIsinstance1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance1.py']);

    validateResults(analysisResults, 9);
});

test('TypeNarrowingIsinstance2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance3.py']);

    validateResults(analysisResults, 4);
});

test('TypeNarrowingIsinstance4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance4.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance5.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance6.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance7.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance8.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance10.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance11.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance12.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance13.py', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance13.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance14.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance15.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance16.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance17.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance18', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance18.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance19', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance19.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance20', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance20.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIsinstance21', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIsinstance21.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingTupleLength1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTupleLength1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIn1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIn1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingIn2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingIn2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingLiteralMember1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingLiteralMember1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingNoneMember1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingNoneMember1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingTuple1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTuple1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingTypedDict1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTypedDict1.py']);

    validateResults(analysisResults, 5);
});

test('TypeNarrowingTypedDict2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTypedDict2.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingTypedDict3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingTypedDict3.py']);

    validateResults(analysisResults, 4);
});

test('typeNarrowingCallable1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingCallable1.py']);

    validateResults(analysisResults, 2);
});

test('TypeNarrowingFalsy1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingFalsy1.py']);

    validateResults(analysisResults, 0);
});

test('TypeNarrowingLocalConst1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['typeNarrowingLocalConst1.py']);

    validateResults(analysisResults, 0);
});

test('ReturnTypes1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['returnTypes1.py']);

    validateResults(analysisResults, 4);
});

test('ReturnTypes2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['returnTypes2.py']);

    validateResults(analysisResults, 0);
});

test('Specialization1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['specialization1.py']);

    validateResults(analysisResults, 7);
});

test('Specialization2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['specialization2.py']);

    validateResults(analysisResults, 0);
});

test('Expression1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression1.py']);

    validateResults(analysisResults, 4);
});

test('Expression2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression2.py']);

    validateResults(analysisResults, 1);
});

test('Expression3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression3.py']);

    validateResults(analysisResults, 0);
});

test('Expression4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression4.py']);

    validateResults(analysisResults, 2);
});

test('Expression5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression5.py']);

    validateResults(analysisResults, 12);
});

test('Expression6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression6.py']);

    validateResults(analysisResults, 0);
});

test('Expression7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression7.py']);

    validateResults(analysisResults, 2);
});

test('Expression8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression8.py']);

    validateResults(analysisResults, 1);
});

test('Expression9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['expression9.py']);

    validateResults(analysisResults, 0);
});

test('Unpack1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unpack1.py']);

    validateResults(analysisResults, 4);
});

test('Unpack2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['unpack2.py']);

    validateResults(analysisResults, 1);
});

test('Unpack3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.7 settings.
    configOptions.defaultPythonVersion = pythonVersion3_7;
    const analysisResults37 = typeAnalyzeSampleFiles(['unpack3.py'], configOptions);
    validateResults(analysisResults37, 1);

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['unpack3.py'], configOptions);
    validateResults(analysisResults38, 0);
});

test('Unpack4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['unpack4.py'], configOptions);
    validateResults(analysisResults38, 2);

    // Analyze with Python 3.9 settings.
    configOptions.defaultPythonVersion = pythonVersion3_9;
    const analysisResults39 = typeAnalyzeSampleFiles(['unpack4.py'], configOptions);
    validateResults(analysisResults39, 1);
});

test('Unpack4', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.defaultPythonVersion = pythonVersion3_11;
    const analysisResults = typeAnalyzeSampleFiles(['unpack5.py'], configOptions);
    validateResults(analysisResults, 0);
});

test('Lambda1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda1.py']);

    validateResults(analysisResults, 5);
});

test('Lambda2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda2.py']);

    validateResults(analysisResults, 6);
});

test('Lambda3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda3.py']);

    validateResults(analysisResults, 1);
});

test('Lambda4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda4.py']);

    validateResults(analysisResults, 2);
});

test('Lambda5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda5.py']);

    validateResults(analysisResults, 0);
});

test('Lambda6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda6.py']);

    validateResults(analysisResults, 1);
});

test('Lambda7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda7.py']);

    validateResults(analysisResults, 0);
});

test('Lambda8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda8.py']);

    validateResults(analysisResults, 0);
});

test('Lambda9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda9.py']);

    validateResults(analysisResults, 0);
});

test('Lambda10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda10.py']);

    validateResults(analysisResults, 0);
});

test('Lambda11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda11.py']);

    validateResults(analysisResults, 0);
});

test('Lambda12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda12.py']);

    validateResults(analysisResults, 0);
});

test('Lambda13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda13.py']);

    validateResults(analysisResults, 0);
});

test('Lambda14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda14.py']);

    validateResults(analysisResults, 0);
});

test('Lambda15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['lambda15.py']);

    validateResults(analysisResults, 0);
});

test('Call1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call1.py']);

    validateResults(analysisResults, 6);
});

test('Call2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call2.py']);

    validateResults(analysisResults, 24);
});

test('Call3', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    // Analyze with Python 3.7 settings. This will generate more errors.
    configOptions.defaultPythonVersion = pythonVersion3_7;
    const analysisResults37 = typeAnalyzeSampleFiles(['call3.py'], configOptions);
    validateResults(analysisResults37, 36);

    // Analyze with Python 3.8 settings.
    configOptions.defaultPythonVersion = pythonVersion3_8;
    const analysisResults38 = typeAnalyzeSampleFiles(['call3.py'], configOptions);
    validateResults(analysisResults38, 20);
});

test('Call4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call4.py']);

    validateResults(analysisResults, 0);
});

test('Call5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call5.py']);

    validateResults(analysisResults, 5);
});

test('Call6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call6.py']);

    validateResults(analysisResults, 4);
});

test('Call7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call7.py']);

    validateResults(analysisResults, 8);
});

test('Call8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call8.py']);

    validateResults(analysisResults, 0);
});

test('Call9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call9.py']);

    validateResults(analysisResults, 1);
});

test('Call10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call10.py']);

    validateResults(analysisResults, 3);
});

test('Call11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call11.py']);

    validateResults(analysisResults, 0);
});

test('Call12', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call12.py']);

    validateResults(analysisResults, 2);
});

test('Call13', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call13.py']);

    validateResults(analysisResults, 0);
});

test('Call14', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call14.py']);

    validateResults(analysisResults, 5);
});

test('Call15', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call15.py']);

    validateResults(analysisResults, 4);
});

test('Call16', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call16.py']);

    validateResults(analysisResults, 0);
});

test('Call17', () => {
    const analysisResults = typeAnalyzeSampleFiles(['call17.py']);

    validateResults(analysisResults, 0);
});

test('Function1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function1.py']);

    validateResults(analysisResults, 0);
});

test('Function2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function2.py']);

    validateResults(analysisResults, 0);
});

test('Function3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function3.py']);

    validateResults(analysisResults, 1);
});

test('Function5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function5.py']);

    validateResults(analysisResults, 0);
});

test('Function6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function6.py']);

    validateResults(analysisResults, 0);
});

test('Function7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function7.py']);

    validateResults(analysisResults, 2);
});

test('Function8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function8.py']);

    validateResults(analysisResults, 0);
});

test('Function9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function9.py']);

    validateResults(analysisResults, 0);
});

test('Function10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['function10.py']);

    validateResults(analysisResults, 0);
});

test('KwargsUnpack1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['kwargsUnpack1.py']);

    validateResults(analysisResults, 13);
});

test('FunctionMember1', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    configOptions.diagnosticRuleSet.reportFunctionMemberAccess = 'none';
    const analysisResult1 = typeAnalyzeSampleFiles(['functionMember1.py'], configOptions);
    validateResults(analysisResult1, 0);

    configOptions.diagnosticRuleSet.reportFunctionMemberAccess = 'error';
    const analysisResult2 = typeAnalyzeSampleFiles(['functionMember1.py'], configOptions);
    validateResults(analysisResult2, 3);
});

test('FunctionMember2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['functionMember2.py']);

    validateResults(analysisResults, 6);
});

test('Annotations1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotations1.py']);

    validateResults(analysisResults, 21);
});

test('Annotations2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotations2.py']);

    validateResults(analysisResults, 2);
});

test('Annotations3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotations3.py']);

    validateResults(analysisResults, 0);
});

test('Annotations4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotations4.py']);

    validateResults(analysisResults, 8);
});

test('Annotations5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotations5.py']);

    validateResults(analysisResults, 1);
});

test('Annotations6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotations6.py']);

    validateResults(analysisResults, 2);
});

test('AnnotatedVar1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar1.py']);

    validateResults(analysisResults, 2);
});

test('AnnotatedVar2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar2.py']);

    validateResults(analysisResults, 5);
});

test('AnnotatedVar3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar3.py']);

    validateResults(analysisResults, 7);
});

test('AnnotatedVar4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar4.py']);

    validateResults(analysisResults, 5);
});

test('AnnotatedVar5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar5.py']);

    validateResults(analysisResults, 5);
});

test('AnnotatedVar6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar6.py']);

    validateResults(analysisResults, 0);
});

test('AnnotatedVar7', () => {
    const configOptions = new ConfigOptions(Uri.empty());

    const analysisResults1 = typeAnalyzeSampleFiles(['annotatedVar7.py'], configOptions);
    validateResults(analysisResults1, 0);

    configOptions.diagnosticRuleSet.reportTypeCommentUsage = 'error';
    const analysisResults2 = typeAnalyzeSampleFiles(['annotatedVar7.py'], configOptions);
    validateResults(analysisResults2, 3);
});

test('AnnotatedVar8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['annotatedVar8.py']);

    validateResults(analysisResults, 4);
});

test('Required1', () => {
    // Analyze with Python 3.10 settings.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['required1.py'], configOptions);

    validateResults(analysisResults, 8);
});

test('Required2', () => {
    // Analyze with Python 3.10 settings.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['required2.py'], configOptions);

    validateResults(analysisResults, 7);
});

test('Required3', () => {
    // Analyze with Python 3.10 settings.
    const configOptions = new ConfigOptions(Uri.empty());
    configOptions.defaultPythonVersion = pythonVersion3_10;
    const analysisResults = typeAnalyzeSampleFiles(['required3.py'], configOptions);

    validateResults(analysisResults, 2);
});

test('Metaclass1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass1.py']);
    validateResults(analysisResults, 4);
});

test('Metaclass2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass2.py']);
    validateResults(analysisResults, 2);
});

test('Metaclass3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass3.py']);
    validateResults(analysisResults, 1);
});

test('Metaclass4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass4.py']);
    validateResults(analysisResults, 1);
});

test('Metaclass5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass5.py']);
    validateResults(analysisResults, 1);
});

test('Metaclass6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass6.py']);
    validateResults(analysisResults, 0);
});

test('Metaclass7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass7.py']);
    validateResults(analysisResults, 0);
});

test('Metaclass8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass8.py']);
    validateResults(analysisResults, 1);
});

test('Metaclass9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass9.py']);
    validateResults(analysisResults, 6);
});

test('Metaclass10', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass10.py']);
    validateResults(analysisResults, 0);
});

test('Metaclass11', () => {
    const analysisResults = typeAnalyzeSampleFiles(['metaclass11.py']);
    validateResults(analysisResults, 4);
});

test('AssignmentExpr1', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr1.py']);
    validateResults(analysisResults, 7);
});

test('AssignmentExpr2', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr2.py']);
    validateResults(analysisResults, 8);
});

test('AssignmentExpr3', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr3.py']);
    validateResults(analysisResults, 5);
});

test('AssignmentExpr4', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr4.py']);
    validateResults(analysisResults, 16);
});

test('AssignmentExpr5', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr5.py']);
    validateResults(analysisResults, 0);
});

test('AssignmentExpr6', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr6.py']);
    validateResults(analysisResults, 0);
});

test('AssignmentExpr7', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr7.py']);
    validateResults(analysisResults, 2);
});

test('AssignmentExpr8', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr8.py']);
    validateResults(analysisResults, 0);
});

test('AssignmentExpr9', () => {
    const analysisResults = typeAnalyzeSampleFiles(['assignmentExpr9.py']);
    validateResults(analysisResults, 0);
});
