/*
 * envVarUtils.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Unit tests for functions in envVarUtils.
 */

import { jest } from '@jest/globals';
import assert from 'assert';
import os from 'os';

import { NullConsole } from 'commonUtils/console.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { expandPathVariables, resolvePathWithEnvVariables } from 'langserver/server/envVarUtils.js';
import { SignatureDisplayType } from 'langserver/server/languageServerInterface.js';
import { WellKnownWorkspaceKinds, Workspace, createInitStatus } from 'langserver/server/workspaceFactory.js';
import { TestPythonEnvProvider } from 'langserver/tests/harness/testPythonEnvProvider.js';
import { typeshedFolder } from 'langserver/tests/harness/vfs/factory.js';
import { TestFileSystem } from 'langserver/tests/harness/vfs/filesystem.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { UriEx } from 'typeserver/files/uriUtils.js';
import { TypeService } from 'typeserver/service/typeService.js';

const defaultWorkspace = createWorkspace(undefined);
const normalWorkspace = createWorkspace(UriEx.file('/'));

test('expands ${workspaceFolder}', () => {
    const workspaceFolderUri = UriEx.parse('/src');
    const test_path = '${workspaceFolder}/foo';
    const path = `${workspaceFolderUri.getPath()}/foo`;
    assert.equal(expandPathVariables(test_path, workspaceFolderUri, []), path);
});

test('expands ${workspaceFolder:sibling}', () => {
    const workspaceFolderUri = UriEx.parse('/src');
    const workspace = { workspaceName: 'sibling', rootUri: workspaceFolderUri } as Workspace;
    const test_path = `\${workspaceFolder:${workspace.workspaceName}}/foo`;
    const path = `${workspaceFolderUri.getPath()}/foo`;
    assert.equal(expandPathVariables(test_path, workspaceFolderUri, [workspace]), path);
});

test('resolvePathWithEnvVariables ${workspaceFolder}', () => {
    const workspaceFolderUri = UriEx.parse('mem-fs:/hello/there');
    const test_path = `\${workspaceFolder}/foo`;
    const path = `${workspaceFolderUri.toString()}/foo`;

    assert.equal(resolvePathWithEnvVariables(defaultWorkspace, test_path, []), undefined);

    const workspace = createWorkspace(workspaceFolderUri);
    assert.equal(resolvePathWithEnvVariables(workspace, test_path, [])?.toString(), path);
});

test('test resolvePathWithEnvVariables', () => {
    assert(!resolvePathWithEnvVariables(defaultWorkspace, '', []));
    assert(!resolvePathWithEnvVariables(defaultWorkspace, '${workspaceFolder}', []));
});

describe('expandPathVariables', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...OLD_ENV };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    test('expands ${env:HOME}', () => {
        process.env.HOME = 'file:///home/foo';
        const test_path = '${env:HOME}/bar';
        const path = `${process.env.HOME}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('resolvePathWithEnvVariables ${env:HOME}', () => {
        process.env.HOME = '/home/foo';
        const test_path = '${env:HOME}/bar';
        const path = `file://${process.env.HOME}/bar`;

        assert.equal(resolvePathWithEnvVariables(defaultWorkspace, test_path, [])?.toString(), path);
        assert.equal(resolvePathWithEnvVariables(normalWorkspace, test_path, [])?.toString(), path);
    });

    test('expands ${env:USERNAME}', () => {
        process.env.USERNAME = 'foo';
        const test_path = 'file:///home/${env:USERNAME}/bar';
        const path = `file:///home/${process.env.USERNAME}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('expands ${env:VIRTUAL_ENV}', () => {
        process.env.VIRTUAL_ENV = 'file:///home/foo/.venv/path';
        const test_path = '${env:VIRTUAL_ENV}/bar';
        const path = `${process.env.VIRTUAL_ENV}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('resolvePathWithEnvVariables ${env:VIRTUAL_ENV}', () => {
        process.env.VIRTUAL_ENV = 'https://server/home/foo/.venv/path';
        const test_path = '${env:VIRTUAL_ENV}/bar';
        const path = `${process.env.VIRTUAL_ENV}/bar`;

        assert.equal(resolvePathWithEnvVariables(defaultWorkspace, test_path, [])?.toString(), path);
        assert.equal(resolvePathWithEnvVariables(normalWorkspace, test_path, [])?.toString(), path);
    });

    test('expands ~ with os.homedir()', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('file:///home/foo');
        process.env.HOME = '';
        process.env.USERPROFILE = '';
        const test_path = '~/bar';
        const path = `${os.homedir()}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('resolvePathWithEnvVariables ~ with os.homedir()', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('c:\\home\\foo');

        process.env.HOME = '';
        process.env.USERPROFILE = '';
        const test_path = '~/bar';
        const fileUri = UriEx.file(`${os.homedir()}/bar`);

        const defaultResult = resolvePathWithEnvVariables(defaultWorkspace, test_path, []);
        const normalResult = resolvePathWithEnvVariables(normalWorkspace, test_path, []);

        assert.equal(defaultResult?.scheme, fileUri.scheme);
        assert.equal(normalResult?.scheme, fileUri.scheme);

        assert.equal(defaultResult?.getFilePath(), fileUri.getFilePath());
        assert.equal(normalResult?.getFilePath(), fileUri.getFilePath());
    });

    test('expands ~ with env:HOME', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('');
        process.env.HOME = 'file:///home/foo';
        process.env.USERPROFILE = '';
        const test_path = '~/bar';
        const path = `${process.env.HOME}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('expands ~ with env:USERPROFILE', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('');
        process.env.HOME = '';
        process.env.USERPROFILE = 'file:///home/foo';
        const test_path = '~/bar';
        const path = `${process.env.USERPROFILE}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('expands /~ with os.homedir()', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('file:///home/foo');
        process.env.HOME = '';
        process.env.USERPROFILE = '';
        const test_path = '/~/bar';
        const path = `${os.homedir()}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('expands /~ with env:HOME', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('');
        process.env.HOME = 'file:///home/foo';
        process.env.USERPROFILE = '';
        const test_path = '/~/bar';
        const path = `${process.env.HOME}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('expands /~ with env:USERPROFILE', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('');
        process.env.HOME = '';
        process.env.USERPROFILE = 'file:///home/foo';
        const test_path = '/~/bar';
        const path = `${process.env.USERPROFILE}/bar`;
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), path);
    });

    test('dont expands ~ when it is used as normal char 1', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('file:///home/foo');
        const test_path = '/home/user/~testfolder/testapp';
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), test_path);
    });

    test('dont expands ~ when it is used as normal char 2', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('file:///home/foo');
        const test_path = '/home/user/testfolder~';
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), test_path);
    });

    test('dont expands ~ when it is used as normal char 3', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('file:///home/foo');
        const test_path = '/home/user/test~folder';
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), test_path);
    });

    test('dont expands ~ when it is used as normal char 4', () => {
        jest.spyOn(os, 'homedir').mockReturnValue('file:///home/foo');
        const test_path = '/home/user/testfolder~/testapp';
        assert.equal(expandPathVariables(test_path, Uri.empty(), []), test_path);
    });
});

function createWorkspace(rootUri: Uri | undefined): Workspace {
    const fs = new TestFileSystem(false);
    const console = new NullConsole();
    const em = new ExtensionManager(fs, console, fs, new TestPythonEnvProvider());

    return {
        workspaceName: '',
        rootUri,
        kinds: [WellKnownWorkspaceKinds.Test],
        service: new TypeService('test service', em, {
            typeshedFallbackLoc: typeshedFolder,
            configOptions: new ConfigOptions(Uri.empty()),
        }),
        disableLanguageServices: false,
        disableTaggedHints: false,
        disableWorkspaceSymbol: false,
        functionSignatureDisplay: SignatureDisplayType.Formatted,
        autoImportCompletions: true,
        isInitialized: createInitStatus(),
        searchPathsToWatch: [],
    };
}
