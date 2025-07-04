/*
 * importStatementUtils.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Unit tests for importStatementUtils module.
 */

import assert from 'assert';

import { isArray } from 'commonUtils/valueTypeUtils.js';
import {
    AutoImporter,
    ImportNameInfo,
    ImportNameWithModuleInfo,
    ModuleSymbolTable,
} from 'langserver/providers/autoImporter.js';
import { CompletionMap } from 'langserver/providers/completionProvider.js';
import { Range } from 'langserver/tests/harness/fourslash/fourSlashTypes.js';
import { parseAndGetTestState, TestState } from 'langserver/tests/harness/fourslash/testState.js';
import { isFunctionDeclaration } from 'typeserver/binder/declaration.js';
import { TextEditAction } from 'typeserver/common/editAction.js';
import { findNodeByOffset } from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetToPosition } from 'typeserver/common/positionUtils.js';
import { rangesAreEqual } from 'typeserver/common/textRange.js';
import { getRelativeModuleName, getTopLevelImports } from 'typeserver/imports/importStatementUtils.js';
import { NameNode } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { AutoImportInfo, ImportCategory, ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

test('getTextEditsForAutoImportInsertion - import empty', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys"|}|]
    `;

    testInsertion(code, 'marker1', [], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - import', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys"|}|]
    `;

    testInsertion(code, 'marker1', {}, 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - import alias', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys as s"|}|]
    `;

    testInsertion(code, 'marker1', { alias: 's' }, 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - multiple imports', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys"|}|]
    `;

    testInsertion(code, 'marker1', [{}, {}], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - multiple imports alias', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys as s, sys as y"|}|]
    `;

    testInsertion(code, 'marker1', [{ alias: 's' }, { alias: 'y' }], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - multiple imports alias duplicated', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys as s"|}|]
    `;

    testInsertion(code, 'marker1', [{ alias: 's' }, { alias: 's' }], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - from import', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!from sys import path"|}|]
    `;

    testInsertion(code, 'marker1', { name: 'path' }, 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - from import alias', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!from sys import path as p"|}|]
    `;

    testInsertion(code, 'marker1', { name: 'path', alias: 'p' }, 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - multiple from imports', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!from sys import meta_path, path"|}|]
    `;

    testInsertion(code, 'marker1', [{ name: 'path' }, { name: 'meta_path' }], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - multiple from imports with alias', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!from sys import meta_path as m, path as p"|}|]
    `;

    testInsertion(
        code,
        'marker1',
        [
            { name: 'path', alias: 'p' },
            { name: 'meta_path', alias: 'm' },
        ],
        'sys',
        'stdlib'
    );
});

test('getTextEditsForAutoImportInsertion - multiple from imports with alias duplicated', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!from sys import meta_path as m, path as p"|}|]
    `;

    testInsertion(
        code,
        'marker1',
        [
            { name: 'path', alias: 'p' },
            { name: 'meta_path', alias: 'm' },
            { name: 'path', alias: 'p' },
        ],
        'sys',
        'stdlib'
    );
});

test('getTextEditsForAutoImportInsertion - multiple import statements', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!import sys as s!n!from sys import path as p"|}|]
    `;

    testInsertion(code, 'marker1', [{ alias: 's' }, { name: 'path', alias: 'p' }], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - different group', () => {
    const code = `
//// import os[|/*marker1*/{|"r":"!n!!n!import sys as s!n!from sys import path as p"|}|]
    `;

    testInsertion(code, 'marker1', [{ alias: 's' }, { name: 'path', alias: 'p' }], 'sys', 'local');
});

test('getTextEditsForAutoImportInsertion - at the top', () => {
    const code = `
//// [|/*marker1*/{|"r":"import sys as s!n!from sys import path as p!n!!n!!n!"|}|]import os
    `;

    testInsertion(code, 'marker1', [{ alias: 's' }, { name: 'path', alias: 'p' }], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertion - at top of second group', () => {
    const code = `
//// import os
//// 
//// [|/*marker1*/{|"r":"from test.a import testa!n!"|}|]from test.b import testb
    `;

    testInsertion(code, 'marker1', [{ name: 'testa' }], 'test.a', 'local');
});

test('getTextEditsForAutoImportInsertion - at the top after module doc string', () => {
    const code = `
//// ''' module doc string '''
//// __author__ = "Software Authors Name"
//// __copyright__ = "Copyright (C) 2004 Author Name"
//// __license__ = "Public Domain"
//// __version__ = "1.0"
//// [|/*marker1*/{|"r":"import sys as s!n!from sys import path as p!n!!n!!n!"|}|]import os
    `;

    testInsertion(code, 'marker1', [{ alias: 's' }, { name: 'path', alias: 'p' }], 'sys', 'stdlib');
});

test('getTextEditsForAutoImportInsertions - mix of import and from import statements', () => {
    const code = `
//// [|/*marker1*/{|"r":"import sys as s!n!from sys import path as p!n!!n!!n!"|}|]import os
    `;

    const module: AutoImportInfo = { moduleName: 'sys', category: 'stdlib' };
    testInsertions(code, 'marker1', [
        { module, alias: 's' },
        { module, name: 'path', alias: 'p' },
    ]);
});

test('getTextEditsForAutoImportInsertions - multiple modules with different group', () => {
    const code = `
//// [|/*marker1*/|][|{|"r":"from sys import path as p!n!!n!!n!"|}|][|{|"r":"import numpy!n!!n!!n!"|}|][|{|"r":"from test import join!n!!n!!n!"|}|]import os
    `;

    const module1: AutoImportInfo = { moduleName: 'sys', category: 'stdlib' };
    const module2: AutoImportInfo = { moduleName: 'numpy', category: 'external' };
    const module3: AutoImportInfo = { moduleName: 'test', category: 'local' };

    testInsertions(code, 'marker1', [
        { module: module1, name: 'path', alias: 'p' },
        { module: module2 },
        { module: module3, name: 'join' },
    ]);
});

test('getTextEditsForAutoImportInsertions - multiple modules with existing imports', () => {
    const code = `
//// import os[|/*marker1*/|][|{|"r":"!n!from sys import path as p"|}|][|{|"r":"!n!!n!import numpy"|}|][|{|"r":"!n!!n!from test import join"|}|]
    `;

    const module1: AutoImportInfo = { moduleName: 'sys', category: 'stdlib' };
    const module2: AutoImportInfo = { moduleName: 'numpy', category: 'external' };
    const module3: AutoImportInfo = { moduleName: 'test', category: 'local' };

    testInsertions(code, 'marker1', [
        { module: module1, name: 'path', alias: 'p' },
        { module: module2 },
        { module: module3, name: 'join' },
    ]);
});

test('getTextEditsForAutoImportInsertions - multiple modules with same group', () => {
    const code = `
//// import os[|/*marker1*/|][|{|"r":"!n!!n!import module2!n!from module1 import path as p!n!from module3 import join"|}|]
    `;

    const module1: AutoImportInfo = { moduleName: 'module1', category: 'local' };
    const module2: AutoImportInfo = { moduleName: 'module2', category: 'local' };
    const module3: AutoImportInfo = { moduleName: 'module3', category: 'local' };

    testInsertions(code, 'marker1', [
        { module: module1, name: 'path', alias: 'p' },
        { module: module2 },
        { module: module3, name: 'join' },
    ]);
});

test('getTextEditsForAutoImportSymbolAddition', () => {
    const code = `
//// from sys import [|/*marker1*/{|"r":"meta_path, "|}|]path
    `;

    testAddition(code, 'marker1', { name: 'meta_path' }, 'sys');
});

test('getTextEditsForAutoImportSymbolAddition - already exist', () => {
    const code = `
//// from sys import path[|/*marker1*/|]
    `;

    testAddition(code, 'marker1', { name: 'path' }, 'sys');
});

test('getTextEditsForAutoImportSymbolAddition - with alias', () => {
    const code = `
//// from sys import path[|/*marker1*/{|"r":", path as p"|}|]
    `;

    testAddition(code, 'marker1', { name: 'path', alias: 'p' }, 'sys');
});

test('getTextEditsForAutoImportSymbolAddition - multiple names', () => {
    const code = `
//// from sys import [|/*marker1*/{|"r":"meta_path as m, "|}|]path[|{|"r":", zoom as z"|}|]
    `;

    testAddition(
        code,
        'marker1',
        [
            { name: 'meta_path', alias: 'm' },
            { name: 'zoom', alias: 'z' },
        ],
        'sys'
    );
});

test('getTextEditsForAutoImportSymbolAddition - multiple names at some spot', () => {
    const code = `
//// from sys import [|/*marker1*/{|"r":"meta_path as m, noon as n, "|}|]path
    `;

    testAddition(
        code,
        'marker1',
        [
            { name: 'meta_path', alias: 'm' },
            { name: 'noon', alias: 'n' },
        ],
        'sys'
    );
});

test('getTextEditsForAutoImportSymbolAddition - wildcard', () => {
    const code = `
//// from sys import *[|/*marker1*/|]
    `;

    testAddition(code, 'marker1', [{ name: 'path' }], 'sys');
});

test('getRelativeModuleName - same file', () => {
    const code = `
// @filename: source.py
//// [|/*src*/|] [|/*dest*/|]
    `;

    testRelativeModuleName(code, '.source');
});

test('getRelativeModuleName - same file __init__', () => {
    const code = `
// @filename: common/__init__.py
//// [|/*src*/|] [|/*dest*/|]
    `;

    testRelativeModuleName(code, '.');
});

test('getRelativeModuleName - same folder', () => {
    const code = `
// @filename: source.py
//// [|/*src*/|]

// @filename: dest.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '.dest');
});

test('getRelativeModuleName - different folder move down', () => {
    const code = `
// @filename: common/source.py
//// [|/*src*/|]

// @filename: dest.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '..dest');
});

test('getRelativeModuleName - different folder move up', () => {
    const code = `
// @filename: source.py
//// [|/*src*/|]

// @filename: common/dest.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '.common.dest');
});

test('getRelativeModuleName - folder move down __init__ parent folder', () => {
    const code = `
// @filename: nest1/nest2/source.py
//// [|/*src*/|]

// @filename: nest1/__init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '..');
});

test('getRelativeModuleName - folder move down __init__ parent folder ignore folder structure', () => {
    const code = `
// @filename: nest1/nest2/source.py
//// [|/*src*/|]

// @filename: nest1/__init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '...nest1', /*ignoreFolderStructure*/ true);
});

test('getRelativeModuleName - different folder move down __init__ sibling folder', () => {
    const code = `
// @filename: nest1/nest2/source.py
//// [|/*src*/|]

// @filename: different/__init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '...different');
});

test('getRelativeModuleName - different folder move up __init__', () => {
    const code = `
// @filename: source.py
//// [|/*src*/|]

// @filename: common/__init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '.common');
});

test('getRelativeModuleName - root __init__', () => {
    const code = `
// @filename: source.py
//// [|/*src*/|]

// @filename: __init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, '.');
});

test('getRelativeModuleName over fake file', () => {
    const code = `
// @filename: target.py
//// [|/*dest*/|]
    `;

    const state = parseAndGetTestState(code).state;
    const dest = state.getMarkerByName('dest')!.fileUri;

    assert.strictEqual(
        getRelativeModuleName(
            state.fs,
            dest.getDirectory().combinePaths('source.py'),
            dest,
            state.configOptions,
            /*ignoreFolderStructure*/ false,
            /*sourceIsFile*/ true
        ),
        '.target'
    );
});

test('getRelativeModuleName - target in stub path', () => {
    const code = `
// @filename: source.py
//// [|/*src*/|]

// @filename: typings/library/__init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, undefined);
});

test('getRelativeModuleName - target in typeshed path', () => {
    const code = `
// @filename: pyrightconfig.json
//// {
////   "typeshedPath": "my_typeshed"
//// }

// @filename: source.py
//// [|/*src*/|]

// @filename: my_typeshed/library/__init__.py
//// [|/*dest*/|]
    `;

    testRelativeModuleName(code, undefined);
});

test('resolve alias of not needed file', () => {
    const code = `
// @filename: pyrightconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: myLib/__init__.py
// @library: true
//// from myLib.foo import [|/*marker*/foo|]

// @filename: myLib/foo.py
// @library: true
//// def foo(): pass
    `;

    const state = parseAndGetTestState(code).state;
    const marker = state.getMarkerByName('marker')!;

    const evaluator = state.workspace.service.program.evaluator!;
    state.openFile(marker.fileName);

    const markerUri = marker.fileUri;
    const parseResults = state.workspace.service.getParseResults(markerUri)!;
    const nameNode = findNodeByOffset(parseResults.parserOutput.parseTree, marker.position) as NameNode;
    const aliasDecls = evaluator.getDeclInfoForNameNode(nameNode)!.decls;

    // Unroot the file. we can't explicitly close the file since it will unload the file from test program.
    state.workspace.service.program.getSourceFileInfo(markerUri)!.isOpenByClient = false;

    const unresolved = evaluator.resolveAliasDeclaration(aliasDecls[0], /*resolveLocalNames*/ false);
    assert(!unresolved);

    const resolved = evaluator.resolveAliasDeclaration(aliasDecls[0], /*resolveLocalNames*/ false, {
        skipFileNeededCheck: true,
    });

    assert(resolved);
    assert(isFunctionDeclaration(resolved));
});

function testRelativeModuleName(code: string, expected: string | undefined, ignoreFolderStructure = false) {
    const state = parseAndGetTestState(code).state;
    const src = state.getMarkerByName('src')!.fileUri;
    const dest = state.getMarkerByName('dest')!.fileUri;

    assert.strictEqual(
        getRelativeModuleName(state.fs, src, dest, state.configOptions, ignoreFolderStructure),
        expected
    );
}

function testAddition(
    code: string,
    markerName: string,
    importNameInfo: ImportNameInfo | ImportNameInfo[],
    moduleName: string
) {
    const state = parseAndGetTestState(code).state;
    const marker = state.getMarkerByName(markerName)!;
    const parseResults = state.program.getBoundSourceFile(marker!.fileUri)!.getParseResults()!;

    const importStatement = getTopLevelImports(parseResults.parserOutput.parseTree).orderedImports.find(
        (i) => i.moduleName === moduleName
    )!;

    const autoImporter = makeAutoImporter(marker!.fileUri, state.typeServer, parseResults, marker.position);
    const edits = autoImporter.test_getTextEditsForAutoImportSymbolAddition(
        importNameInfo,
        importStatement,
        parseResults
    );

    const ranges = [...state.getRanges().filter((r) => !!r.marker?.data)];
    assert.strictEqual(edits.length, ranges.length, `${markerName} expects ${ranges.length} but got ${edits.length}`);

    testTextEdits(state, edits, ranges);
}

function testInsertions(
    code: string,
    markerName: string,
    importNameInfo: ImportNameWithModuleInfo | ImportNameWithModuleInfo[]
) {
    const state = parseAndGetTestState(code).state;
    const marker = state.getMarkerByName(markerName)!;
    const parseResults = state.program.getBoundSourceFile(marker!.fileUri)!.getParseResults()!;

    const importStatements = getTopLevelImports(parseResults.parserOutput.parseTree);
    const autoImporter = makeAutoImporter(marker!.fileUri, state.typeServer, parseResults, marker.position);
    const edits = autoImporter.test_getTextEditsForAutoImportInsertions(
        importNameInfo,
        importStatements,
        parseResults,
        convertOffsetToPosition(marker.position, parseResults.tokenizerOutput.lines)
    );

    const ranges = [...state.getRanges().filter((r) => !!r.marker?.data)];
    assert.strictEqual(edits.length, ranges.length, `${markerName} expects ${ranges.length} but got ${edits.length}`);

    testTextEdits(state, edits, ranges);
}

function makeAutoImporter(uri: Uri, typeServer: ITypeServer, parseResults: ParseFileResults, markerOffset: number) {
    const completionMap = new CompletionMap();
    const moduleSymbolMap = new Map<string, ModuleSymbolTable>();
    const autoImporter = new AutoImporter(
        uri,
        typeServer,
        parseResults,
        convertOffsetToPosition(markerOffset, parseResults.tokenizerOutput.lines),
        completionMap,
        moduleSymbolMap,
        {}
    );
    return autoImporter;
}

function testInsertion(
    code: string,
    markerName: string,
    importNameInfo: ImportNameInfo | ImportNameInfo[],
    moduleName: string,
    importCategory: ImportCategory
) {
    importNameInfo = isArray(importNameInfo) ? importNameInfo : [importNameInfo];
    if (importNameInfo.length === 0) {
        importNameInfo.push({});
    }

    testInsertions(
        code,
        markerName,
        importNameInfo.map((i) => {
            return {
                module: {
                    moduleName,
                    category: importCategory,
                },
                name: i.name,
                alias: i.alias,
            };
        })
    );
}

function testTextEdits(state: TestState, edits: TextEditAction[], ranges: Range[]) {
    for (const edit of edits) {
        assert(
            ranges.some((r) => {
                const data = r.marker!.data as { r: string };
                const expectedText = data.r;
                return (
                    rangesAreEqual(state.convertPositionRange(r), edit.range) &&
                    expectedText.replace(/!n!/g, '\n') === edit.replacementText
                );
            }),
            `can't find '${edit.replacementText}'@'${edit.range.start.line},${edit.range.start.character}'`
        );
    }
}
