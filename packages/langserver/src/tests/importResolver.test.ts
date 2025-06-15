/*
 * importResolver.test.ts
 *
 * importResolver tests.
 */

import assert from 'assert';
import { Disposable } from 'vscode-jsonrpc';

import { Dirent, ReadStream, WriteStream } from 'fs';
import { TestPythonEnvProvider } from 'langserver/tests/harness/testPythonEnvProvider.js';
import { typeshedFolder } from 'langserver/tests/harness/vfs/factory.js';
import { MODULE_PATH, TestFileSystem } from 'langserver/tests/harness/vfs/filesystem.js';
import { lib, sitePackages, typeshedFallback } from 'typeserver/common/pathConsts.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { NullConsole } from 'typeserver/extensibility/console.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { FileSystem, MkDirOptions, Stats } from 'typeserver/files/fileSystem.js';
import { FileWatcher, FileWatcherEventHandler } from 'typeserver/files/fileWatcher.js';
import { PyrightFileSystem } from 'typeserver/files/pyrightFileSystem.js';
import { createFromRealFileSystem, RealTempFile } from 'typeserver/files/realFileSystem.js';
import { UriEx } from 'typeserver/files/uriUtils.js';
import { ImportResolver } from 'typeserver/imports/importResolver.js';
import { ImportType } from 'typeserver/imports/importResult.js';
import { combinePaths, getDirectoryPath, normalizeSlashes } from 'typeserver/utils/pathUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

const libraryRoot = combinePaths(normalizeSlashes('/'), lib, sitePackages);

function usingTrueVenv() {
    return process.env.CI_IMPORT_TEST_VENVPATH !== undefined || process.env.CI_IMPORT_TEST_PYTHONPATH !== undefined;
}

function getModulePath(): Uri {
    return Uri.file(MODULE_PATH, { isCaseSensitive: () => true });
}

describe('Import tests with fake venv', () => {
    const tempFile = new RealTempFile();

    afterAll(() => tempFile.dispose());

    if (!usingTrueVenv()) {
        describe('Import tests that cannot run in a true venv', () => {
            test('partial stub file exists', () => {
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'partialStub.pyi'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                        content: 'partial\n',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', 'partialStub.py'),
                        content: 'def test(): pass',
                    },
                ];

                const importResult = getImportResult(files, ['myLib', 'partialStub']);
                assert(importResult.isImportFound);
                assert(importResult.isStubFile);
                assert.strictEqual(
                    importResult.resolvedUris.filter(
                        (f) => !f.isEmpty() && f.getFilePath() === combinePaths(libraryRoot, 'myLib', 'partialStub.pyi')
                    ).length,
                    1
                );
            });

            test('partial stub __init__ exists', () => {
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', '__init__.pyi'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                        content: 'partial\n',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                        content: 'def test(): pass',
                    },
                ];

                const importResult = getImportResult(files, ['myLib']);
                assert(importResult.isImportFound);
                assert(importResult.isStubFile);
                assert.strictEqual(
                    importResult.resolvedUris.filter(
                        (f) => f.getFilePath() === combinePaths(libraryRoot, 'myLib', '__init__.pyi')
                    ).length,
                    1
                );
            });

            test('stub package', () => {
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'stub.pyi'),
                        content: '# empty',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', '__init__.pyi'),
                        content: '# empty',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', 'partialStub.py'),
                        content: 'def test(): pass',
                    },
                ];

                // If fully typed stub package exists, that wins over the real package.
                const importResult = getImportResult(files, ['myLib', 'partialStub']);
                assert(!importResult.isImportFound);
            });

            test('partial stub package in typing folder', () => {
                const typingFolder = combinePaths(normalizeSlashes('/'), 'typing');
                const files = [
                    {
                        path: combinePaths(typingFolder, 'myLib-stubs', '__init__.pyi'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(typingFolder, 'myLib-stubs', 'py.typed'),
                        content: 'partial\n',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                        content: 'def test(): pass',
                    },
                ];

                const importResult = getImportResult(files, ['myLib'], (c) => (c.stubPath = UriEx.file(typingFolder)));
                assert(importResult.isImportFound);
                assert(importResult.isStubFile);
                assert.strictEqual(
                    importResult.resolvedUris.filter(
                        (f) => f.getFilePath() === combinePaths(libraryRoot, 'myLib', '__init__.pyi')
                    ).length,
                    1
                );
            });

            test('typeshed folder', () => {
                const typeshedFolder = combinePaths(normalizeSlashes('/'), 'ts');
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', '__init__.pyi'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                        content: 'partial\n',
                    },
                    {
                        path: combinePaths(typeshedFolder, 'stubs', 'myLibPackage', 'myLib.pyi'),
                        content: '# empty',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                        content: 'def test(): pass',
                    },
                ];

                // Stub packages win over typeshed.
                const importResult = getImportResult(
                    files,
                    ['myLib'],
                    (c) => (c.typeshedPath = UriEx.file(typeshedFolder))
                );
                assert(importResult.isImportFound);
                assert(importResult.isStubFile);
                assert.strictEqual(
                    importResult.resolvedUris.filter(
                        (f) => f.getFilePath() === combinePaths(libraryRoot, 'myLib', '__init__.pyi')
                    ).length,
                    1
                );
            });

            test('typeshed fallback folder', () => {
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', '__init__.pyi'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                        content: 'partial\n',
                    },
                    {
                        path: combinePaths('/', typeshedFallback, 'stubs', 'myLibPackage', 'myLib.pyi'),
                        content: '# empty',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                        content: 'def test(): pass',
                    },
                ];

                // Stub packages win over typeshed.
                const importResult = getImportResult(files, ['myLib']);
                assert(importResult.isImportFound);
                assert(importResult.isStubFile);
                assert.strictEqual(
                    importResult.resolvedUris.filter(
                        (f) => f.getFilePath() === combinePaths(libraryRoot, 'myLib', '__init__.pyi')
                    ).length,
                    1
                );
            });

            test('py.typed file', () => {
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', '__init__.pyi'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                        content: 'partial\n',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                        content: 'def test(): pass',
                    },
                    {
                        path: combinePaths(libraryRoot, 'myLib', 'py.typed'),
                        content: '# typed',
                    },
                ];

                // Partial stub package always overrides original package.
                const importResult = getImportResult(files, ['myLib']);
                assert(importResult.isImportFound);
                assert(importResult.isStubFile);
            });

            test('py.typed library', () => {
                const files = [
                    {
                        path: combinePaths(libraryRoot, 'os', '__init__.py'),
                        content: 'def test(): ...',
                    },
                    {
                        path: combinePaths(libraryRoot, 'os', 'py.typed'),
                        content: '',
                    },
                    {
                        path: combinePaths('/', typeshedFallback, 'stubs', 'os', 'os', '__init__.pyi'),
                        content: '# empty',
                    },
                ];

                const importResult = getImportResult(files, ['os']);
                assert(importResult.isImportFound);
                assert.strictEqual(
                    importResult.resolvedUris[importResult.resolvedUris.length - 1].getFilePath(),
                    files[0].path
                );
            });

            test('import side by side file sub under lib folder', () => {
                const files = [
                    {
                        path: combinePaths('/lib/site-packages/myLib', 'file1.py'),
                        content: 'def test1(): ...',
                    },
                    {
                        path: combinePaths('/lib/site-packages/myLib', 'file2.py'),
                        content: 'def test2(): ...',
                    },
                ];

                const importResult = getImportResult(files, ['file1']);
                assert(!importResult.isImportFound);
            });
        });

        test('getModuleNameForImport library file', () => {
            const files = [
                {
                    path: combinePaths(libraryRoot, 'myLib', 'myModule', 'file1.py'),
                    content: '# empty',
                },
            ];

            const moduleImportInfo = getModuleNameForImport(files);

            assert.strictEqual(moduleImportInfo.importType, ImportType.ThirdParty);
            assert(!moduleImportInfo.isThirdPartyPyTypedPresent);
            assert(!moduleImportInfo.isLocalTypingsFile);
        });

        test('getModuleNameForImport py.typed library file', () => {
            const files = [
                {
                    path: combinePaths(libraryRoot, 'myLib', 'py.typed'),
                    content: '',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', 'myModule', 'file1.py'),
                    content: '# empty',
                },
            ];

            const moduleImportInfo = getModuleNameForImport(files);

            assert.strictEqual(moduleImportInfo.importType, ImportType.ThirdParty);
            assert(moduleImportInfo.isThirdPartyPyTypedPresent);
            assert(!moduleImportInfo.isLocalTypingsFile);
        });
    }

    describe('Import tests that can run with or without a true venv', () => {
        test('side by side files', () => {
            const myFile = combinePaths('src', 'file.py');
            const files = [
                {
                    path: combinePaths(libraryRoot, 'myLib-stubs', 'partialStub.pyi'),
                    content: 'def test(): ...',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                    content: 'partial\n',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', 'partialStub.pyi'),
                    content: '# empty',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', 'partialStub.py'),
                    content: 'def test(): pass',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib-stubs', 'partialStub2.pyi'),
                    content: 'def test(): ...',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', 'partialStub2.py'),
                    content: 'def test(): pass',
                },
                {
                    path: myFile,
                    content: '# not used',
                },
            ];

            const em = createExtensionManagerFromFiles(files);
            const configOptions = new ConfigOptions(UriEx.file('/'), typeshedFolder);
            const fs = em.fs;
            const importResolver = new ImportResolver(em, configOptions);

            // Stub package wins over original package (per PEP 561 rules).
            const myUri = UriEx.file(myFile);
            const sideBySideResult = importResolver.resolveImport(myUri, configOptions.findExecEnvironment(myUri), {
                leadingDots: 0,
                nameParts: ['myLib', 'partialStub'],
                importedSymbols: new Set<string>(),
            });

            assert(sideBySideResult.isImportFound);
            assert(sideBySideResult.isStubFile);

            const sideBySideStubFile = UriEx.file(combinePaths(libraryRoot, 'myLib', 'partialStub.pyi'));
            assert.strictEqual(sideBySideResult.resolvedUris.filter((f) => f.key === sideBySideStubFile.key).length, 1);
            assert.strictEqual('def test(): ...', fs.readFileSync(sideBySideStubFile, 'utf8'));

            // Side by side stub doesn't completely disable partial stub.
            const partialStubResult = importResolver.resolveImport(myUri, configOptions.findExecEnvironment(myUri), {
                leadingDots: 0,
                nameParts: ['myLib', 'partialStub2'],
                importedSymbols: new Set<string>(),
            });

            assert(partialStubResult.isImportFound);
            assert(partialStubResult.isStubFile);

            const partialStubFile = UriEx.file(combinePaths(libraryRoot, 'myLib', 'partialStub2.pyi'));
            assert.strictEqual(partialStubResult.resolvedUris.filter((f) => f.key === partialStubFile.key).length, 1);
        });

        test('stub namespace package', () => {
            const files = [
                {
                    path: combinePaths(libraryRoot, 'myLib-stubs', 'stub.pyi'),
                    content: '# empty',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', 'partialStub.py'),
                    content: 'def test(): pass',
                },
            ];

            // If fully typed stub package exists, that wins over the real package.
            const importResult = getImportResult(files, ['myLib', 'partialStub']);
            assert(importResult.isImportFound);
            assert(!importResult.isStubFile);
            assert.strictEqual(
                importResult.resolvedUris.filter(
                    (f) => !f.isEmpty() && f.getFilePath() === combinePaths(libraryRoot, 'myLib', 'partialStub.py')
                ).length,
                1
            );
        });

        test('py.typed namespace package plus stubs', () => {
            const typingFolder = combinePaths(normalizeSlashes('/'), 'typing');
            const files = [
                {
                    path: combinePaths(typingFolder, 'myLib/core', 'foo.pyi'),
                    content: 'def test(): pass',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', 'py.typed'),
                    content: '',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                    content: 'def test(): pass',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', '__init__.pyi'),
                    content: 'def test(): pass',
                },
            ];

            const importResult = getImportResult(files, ['myLib'], (c) => (c.stubPath = UriEx.file(typingFolder)));
            assert(importResult.isImportFound);
            assert(importResult.isStubFile);
            assert.strictEqual(
                importResult.resolvedUris.filter(
                    (f) => !f.isEmpty() && f.getFilePath() === combinePaths(libraryRoot, 'myLib', '__init__.pyi')
                ).length,
                1
            );
        });

        test('stub in typing folder over partial stub package', () => {
            const typingFolder = combinePaths(normalizeSlashes('/'), 'typing');
            const files = [
                {
                    path: combinePaths(libraryRoot, 'myLib-stubs', '__init__.pyi'),
                    content: 'def test(): ...',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib-stubs', 'py.typed'),
                    content: 'partial\n',
                },
                {
                    path: combinePaths(typingFolder, 'myLib.pyi'),
                    content: '# empty',
                },
                {
                    path: combinePaths(libraryRoot, 'myLib', '__init__.py'),
                    content: 'def test(): pass',
                },
            ];

            // If the package exists in typing folder, that gets picked up first.
            const importResult = getImportResult(files, ['myLib'], (c) => (c.stubPath = UriEx.file(typingFolder)));
            assert(importResult.isImportFound);
            assert(importResult.isStubFile);
            assert.strictEqual(
                importResult.resolvedUris.filter(
                    (f) => f.getFilePath() === combinePaths(libraryRoot, 'myLib', '__init__.pyi')
                ).length,
                0
            );
        });

        test('non py.typed library', () => {
            const files = [
                {
                    path: combinePaths(libraryRoot, 'os', '__init__.py'),
                    content: 'def test(): ...',
                },
                {
                    path: combinePaths('/', typeshedFallback, 'stubs', 'os', 'os', '__init__.pyi'),
                    content: '# empty',
                },
            ];

            const importResult = getImportResult(files, ['os']);
            assert(importResult.isImportFound);
            assert.strictEqual(
                importResult.resolvedUris[importResult.resolvedUris.length - 1].getFilePath(),
                files[1].path
            );
        });

        test('no empty import roots', () => {
            const sp = createExtensionManagerFromFiles([]);
            const configOptions = new ConfigOptions(Uri.empty(), typeshedFolder); // Empty, like open-file mode.
            const importResolver = new ImportResolver(sp, configOptions);
            importResolver.getImportRoots(configOptions.getDefaultExecEnvironment()).forEach((path) => assert(path));
        });

        test('multiple typeshedFallback', () => {
            const files = [
                {
                    path: combinePaths('/', typeshedFallback, 'stubs', 'aLib', 'aLib', '__init__.pyi'),
                    content: '# empty',
                },
                {
                    path: combinePaths('/', typeshedFallback, 'stubs', 'bLib', 'bLib', '__init__.pyi'),
                    content: '# empty',
                },
            ];

            const sp = createExtensionManagerFromFiles(files);
            const configOptions = new ConfigOptions(Uri.empty(), typeshedFolder); // Empty, like open-file mode.
            const importResolver = new ImportResolver(sp, configOptions);
            const importRoots = importResolver.getImportRoots(configOptions.getDefaultExecEnvironment());

            assert.strictEqual(
                importRoots.filter(
                    (f) => !f.isEmpty() && f.getFilePath() === combinePaths('/', typeshedFallback, 'stubs', 'aLib')
                ).length,
                1
            );
            assert.strictEqual(
                importRoots.filter(
                    (f) => !f.isEmpty() && f.getFilePath() === combinePaths('/', typeshedFallback, 'stubs', 'bLib')
                ).length,
                1
            );
        });

        test('import side by side file root', () => {
            const files = [
                {
                    path: combinePaths('/', 'file1.py'),
                    content: 'def test1(): ...',
                },
                {
                    path: combinePaths('/', 'file2.py'),
                    content: 'def test2(): ...',
                },
            ];

            const importResult = getImportResult(files, ['file1']);
            assert(importResult.isImportFound);
            assert.strictEqual(
                importResult.resolvedUris.filter((f) => f.getFilePath() === combinePaths('/', 'file1.py')).length,
                1
            );
        });

        test('import side by side file sub folder', () => {
            const files = [
                {
                    path: combinePaths('/test', 'file1.py'),
                    content: 'def test1(): ...',
                },
                {
                    path: combinePaths('/test', 'file2.py'),
                    content: 'def test2(): ...',
                },
            ];

            const importResult = getImportResult(files, ['file1']);
            assert(importResult.isImportFound);
            assert.strictEqual(
                importResult.resolvedUris.filter((f) => f.getFilePath() === combinePaths('/test', 'file1.py')).length,
                1
            );
        });

        test('import side by side file sub under src folder', () => {
            const files = [
                {
                    path: combinePaths('/src/nested', 'file1.py'),
                    content: 'def test1(): ...',
                },
                {
                    path: combinePaths('/src/nested', 'file2.py'),
                    content: 'def test2(): ...',
                },
            ];

            const importResult = getImportResult(files, ['file1']);
            assert(importResult.isImportFound);
            assert.strictEqual(
                importResult.resolvedUris.filter((f) => f.getFilePath() === combinePaths('/src/nested', 'file1.py'))
                    .length,
                1
            );
        });

        test('import file sub under containing folder', () => {
            const files = [
                {
                    path: combinePaths('/src/nested', 'file1.py'),
                    content: 'def test1(): ...',
                },
                {
                    path: combinePaths('/src/nested/nested2', 'file2.py'),
                    content: 'def test2(): ...',
                },
            ];

            const importResult = getImportResult(files, ['file1']);
            assert(importResult.isImportFound);
            assert.strictEqual(
                importResult.resolvedUris.filter((f) => f.getFilePath() === combinePaths('/src/nested', 'file1.py'))
                    .length,
                1
            );
        });

        test("don't walk up the root", () => {
            const files = [
                {
                    path: combinePaths('/', 'file1.py'),
                    content: 'def test1(): ...',
                },
            ];

            const importResult = getImportResult(files, ['notExist'], (c) => (c.projectRoot = Uri.empty()));
            assert(!importResult.isImportFound);
        });

        test('nested namespace package 1', () => {
            const files = [
                {
                    path: combinePaths('/', 'packages1', 'a', 'b', 'c', 'd.py'),
                    content: 'def f(): pass',
                },
                {
                    path: combinePaths('/', 'packages1', 'a', '__init__.py'),
                    content: '',
                },
                {
                    path: combinePaths('/', 'packages2', 'a', '__init__.py'),
                    content: '',
                },
            ];

            const importResult = getImportResult(files, ['a', 'b', 'c', 'd'], (config) => {
                config.defaultExtraPaths = [
                    UriEx.file(combinePaths('/', 'packages1')),
                    UriEx.file(combinePaths('/', 'packages2')),
                ];
            });
            assert(importResult.isImportFound);
        });

        test('nested namespace package 2', () => {
            const files = [
                {
                    path: combinePaths('/', 'packages1', 'a', 'b', 'c', 'd.py'),
                    content: 'def f(): pass',
                },
                {
                    path: combinePaths('/', 'packages1', 'a', 'b', 'c', '__init__.py'),
                    content: '',
                },
                {
                    path: combinePaths('/', 'packages2', 'a', 'b', 'c', '__init__.py'),
                    content: '',
                },
            ];

            const importResult = getImportResult(files, ['a', 'b', 'c', 'd'], (config) => {
                config.defaultExtraPaths = [
                    UriEx.file(combinePaths('/', 'packages1')),
                    UriEx.file(combinePaths('/', 'packages2')),
                ];
            });
            assert(importResult.isImportFound);
        });

        test('nested namespace package 3', () => {
            const files = [
                {
                    path: combinePaths('/', 'packages1', 'a', 'b', 'c', 'd.py'),
                    content: 'def f(): pass',
                },
                {
                    path: combinePaths('/', 'packages2', 'a', '__init__.py'),
                    content: '',
                },
            ];

            const importResult = getImportResult(files, ['a', 'b', 'c', 'd'], (config) => {
                config.defaultExtraPaths = [
                    UriEx.file(combinePaths('/', 'packages1')),
                    UriEx.file(combinePaths('/', 'packages2')),
                ];
            });
            assert(!importResult.isImportFound);
        });

        test('nested namespace package 4', () => {
            const files = [
                {
                    path: combinePaths('/', 'packages1', 'a', 'b', '__init__.py'),
                    content: '',
                },
                {
                    path: combinePaths('/', 'packages1', 'a', 'b', 'c.py'),
                    content: 'def f(): pass',
                },
                {
                    path: combinePaths('/', 'packages2', 'a', '__init__.py'),
                    content: '',
                },
                {
                    path: combinePaths('/', 'packages2', 'a', 'b', '__init__.py'),
                    content: '',
                },
            ];

            const importResult = getImportResult(files, ['a', 'b', 'c'], (config) => {
                config.defaultExtraPaths = [
                    UriEx.file(combinePaths('/', 'packages1')),
                    UriEx.file(combinePaths('/', 'packages2')),
                ];
            });
            assert(!importResult.isImportFound);
        });

        test('default workspace importing side by side file', () => {
            const files = [
                {
                    path: combinePaths('/', 'src', 'a', 'b', 'file1.py'),
                    content: 'import file2',
                },
                {
                    path: combinePaths('/', 'src', 'a', 'b', 'file2.py'),
                    content: 'def f(): pass',
                },
            ];

            const importResult = getImportResult(files, ['file2'], (config) => {
                config.projectRoot = Uri.defaultWorkspace({ isCaseSensitive: () => true });
            });
            assert(importResult.isImportFound);
        });

        test('getModuleNameForImport user file', () => {
            const files = [
                {
                    path: combinePaths('/', 'src', 'file1.py'),
                    content: '# empty',
                },
            ];

            const moduleImportInfo = getModuleNameForImport(files);

            assert.strictEqual(moduleImportInfo.importType, ImportType.Local);
            assert(!moduleImportInfo.isThirdPartyPyTypedPresent);
            assert(!moduleImportInfo.isLocalTypingsFile);
        });
    });

    if (usingTrueVenv()) {
        describe('Import tests that have to run with a venv', () => {
            test('venv can find imports', () => {
                const tempFile = new RealTempFile();
                const files = [
                    {
                        path: combinePaths('/', 'file1.py'),
                        content: 'import pytest',
                    },
                ];

                const importResult = getImportResult(files, ['pytest']);
                assert(importResult.isImportFound, `Import not found: ${importResult.importFailureInfo?.join('\n')}`);

                tempFile.dispose();
            });
        });
    }

    function getImportResult(
        files: { path: string; content: string }[],
        nameParts: string[],
        setup?: (c: ConfigOptions) => void
    ) {
        const { importResolver, uri, configOptions } = setupImportResolver(files, setup);

        const importResult = importResolver.resolveImport(uri, configOptions.findExecEnvironment(uri), {
            leadingDots: 0,
            nameParts,
            importedSymbols: new Set<string>(),
        });

        // Add the config venvpath to the import result so we can output it on failure.
        if (!importResult.isImportFound) {
            importResult.importFailureInfo = importResult.importFailureInfo ?? [];
            importResult.importFailureInfo.push(`venvPath: ${configOptions.venvPath}`);
        }

        return importResult;
    }

    function getModuleNameForImport(files: { path: string; content: string }[], setup?: (c: ConfigOptions) => void) {
        const { importResolver, uri, configOptions } = setupImportResolver(files, setup);

        const moduleImportInfo = importResolver.getModuleNameForImport(
            uri,
            configOptions.findExecEnvironment(uri),
            undefined,
            /* detectPyTyped */ true
        );

        return moduleImportInfo;
    }

    function setupImportResolver(files: { path: string; content: string }[], setup?: (c: ConfigOptions) => void) {
        const defaultSetup =
            setup ??
            ((c) => {
                /* empty */
            });
        const defaultEmFactory = (files: { path: string; content: string }[]) => createExtensionManagerFromFiles(files);

        // Use environment variables to determine how to create a host and how to modify the config options.
        // These are set in the CI to test imports with different options.
        let configModifier = defaultSetup;
        let emFactory = defaultEmFactory;

        if (process.env.CI_IMPORT_TEST_VENVPATH) {
            configModifier = (c: ConfigOptions) => {
                defaultSetup(c);
                c.venvPath = UriEx.file(
                    process.env.CI_IMPORT_TEST_VENVPATH!,
                    /* isCaseSensitive */ true,
                    /* checkRelative */ true
                );
                c.venv = process.env.CI_IMPORT_TEST_VENV;
            };
            emFactory = (files: { path: string; content: string }[]) => createExtensionManagerWithCombinedFs(files);
        } else if (process.env.CI_IMPORT_TEST_PYTHONPATH) {
            configModifier = (c: ConfigOptions) => {
                defaultSetup(c);
                c.pythonPath = UriEx.file(
                    process.env.CI_IMPORT_TEST_PYTHONPATH!,
                    /* isCaseSensitive */ true,
                    /* checkRelative */ true
                );
            };
            emFactory = (files: { path: string; content: string }[]) => createExtensionManagerWithCombinedFs(files);
        }

        const em = emFactory(files);
        const configOptions = new ConfigOptions(UriEx.file('/'), typeshedFolder);
        configModifier(configOptions);

        const file = files.length > 0 ? files[files.length - 1].path : combinePaths('src', 'file.py');
        if (files.length === 0) {
            files.push({
                path: file,
                content: '# not used',
            });
        }

        const uri = UriEx.file(file);
        const importResolver = new ImportResolver(em, configOptions);

        return { importResolver, uri, configOptions };
    }
});

function createTestFileSystem(files: { path: string; content: string }[]): TestFileSystem {
    const fs = new TestFileSystem(/* ignoreCase */ false, { cwd: normalizeSlashes('/') });

    for (const file of files) {
        const path = normalizeSlashes(file.path);
        const dir = getDirectoryPath(path);
        fs.mkdirpSync(dir);

        fs.writeFileSync(UriEx.file(path), file.content);
    }

    return fs;
}

function createExtensionManagerFromFiles(files: { path: string; content: string }[]): ExtensionManager {
    const testFS = createTestFileSystem(files);
    const fs = new PyrightFileSystem(testFS);
    return createExtensionManagerWithFs(testFS, fs);
}

function createExtensionManagerWithCombinedFs(files: { path: string; content: string }[]): ExtensionManager {
    const testFS = createTestFileSystem(files);
    const fs = new PyrightFileSystem(new CombinedFileSystem(testFS));
    return createExtensionManagerWithFs(testFS, fs);
}

function createExtensionManagerWithFs(testFS: TestFileSystem, fs: FileSystem): ExtensionManager {
    const consoleProvider = new NullConsole();
    const pythonEnv = new TestPythonEnvProvider(getModulePath().toString(), [libraryRoot]);
    const em = new ExtensionManager(fs, consoleProvider, testFS, pythonEnv);
    em.tempFile = testFS;
    return em;
}

class CombinedFileSystem implements FileSystem {
    private _realFS = createFromRealFileSystem(this._testFS);

    constructor(private _testFS: TestFileSystem) {}

    mkdirSync(path: Uri, options?: MkDirOptions | undefined): void {
        this._testFS.mkdirSync(path, options);
    }

    writeFileSync(path: Uri, data: string | Buffer, encoding: BufferEncoding | null): void {
        this._testFS.writeFileSync(path, data, encoding);
    }

    unlinkSync(path: Uri): void {
        this._testFS.unlinkSync(path);
    }

    rmdirSync(path: Uri): void {
        this._testFS.rmdirSync(path);
    }

    createFileSystemWatcher(paths: Uri[], listener: FileWatcherEventHandler): FileWatcher {
        return this._testFS.createFileSystemWatcher(paths, listener);
    }

    createReadStream(path: Uri): ReadStream {
        return this._testFS.createReadStream(path);
    }

    createWriteStream(path: Uri): WriteStream {
        return this._testFS.createWriteStream(path);
    }

    copyFileSync(src: Uri, dst: Uri): void {
        this._testFS.copyFileSync(src, dst);
    }

    existsSync(path: Uri): boolean {
        return this._testFS.existsSync(path) || this._realFS.existsSync(path);
    }

    chdir(path: Uri): void {
        this._testFS.chdir(path);
    }

    readdirEntriesSync(path: Uri): Dirent[] {
        if (this._testFS.existsSync(path)) {
            return this._testFS.readdirEntriesSync(path);
        }
        return this._realFS.readdirEntriesSync(path);
    }

    readdirSync(path: Uri): string[] {
        if (this._testFS.existsSync(path)) {
            return this._testFS.readdirSync(path);
        }
        return this._realFS.readdirSync(path);
    }

    readFileSync(path: Uri, encoding?: null): Buffer;
    readFileSync(path: Uri, encoding: BufferEncoding): string;
    readFileSync(path: Uri, encoding?: BufferEncoding | null): string | Buffer;
    readFileSync(path: Uri, encoding: BufferEncoding | null = null) {
        if (this._testFS.existsSync(path)) {
            return this._testFS.readFileSync(path, encoding);
        }
        return this._realFS.readFileSync(path, encoding);
    }

    statSync(path: Uri): Stats {
        if (this._testFS.existsSync(path)) {
            return this._testFS.statSync(path);
        }
        return this._realFS.statSync(path);
    }

    realpathSync(path: Uri): Uri {
        if (this._testFS.existsSync(path)) {
            return this._testFS.realpathSync(path);
        }
        return this._realFS.realpathSync(path);
    }

    readFile(path: Uri): Promise<Buffer> {
        if (this._testFS.existsSync(path)) {
            return this._testFS.readFile(path);
        }
        return this._realFS.readFile(path);
    }

    readFileText(path: Uri, encoding?: BufferEncoding | undefined): Promise<string> {
        if (this._testFS.existsSync(path)) {
            return this._testFS.readFileText(path, encoding);
        }
        return this._realFS.readFileText(path, encoding);
    }

    realCasePath(path: Uri): Uri {
        return this._testFS.realCasePath(path);
    }

    isMappedUri(filepath: Uri): boolean {
        return this._testFS.isMappedUri(filepath);
    }

    getOriginalUri(mappedFilePath: Uri): Uri {
        return this._testFS.getOriginalUri(mappedFilePath);
    }

    getMappedUri(originalFilePath: Uri): Uri {
        return this._testFS.getMappedUri(originalFilePath);
    }

    isInZip(path: Uri): boolean {
        return this._testFS.isInZip(path);
    }

    mapDirectory(mappedUri: Uri, originalUri: Uri, filter?: (originalUri: Uri, fs: FileSystem) => boolean): Disposable {
        return this._realFS.mapDirectory(mappedUri, originalUri, filter);
    }
}
