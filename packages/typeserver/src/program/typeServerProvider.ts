/*
 * typeServerProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements the ITypeServer interface by wrapping the internal Program object.
 */

import { CancellationToken } from 'vscode-languageserver';

import { SymbolTable } from 'typeserver/binder/symbol.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IReadOnlyFileSystem } from 'typeserver/files/fileSystem.js';
import { ImportedModuleDescriptor, ImportResolver } from 'typeserver/imports/importResolver.js';
import { ImportType } from 'typeserver/imports/importResult.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions, Program } from 'typeserver/program/program.js';
import { SourceFileProvider } from 'typeserver/program/sourceFileProvider.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { AutoImportInfo, ITypeServer, ITypeServerSourceFile } from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export class TypeServerProvider implements ITypeServer {
    constructor(private _program: Program) {}

    get evaluator(): TypeEvaluator | undefined {
        return this._program.evaluator;
    }

    get configOptions(): ConfigOptions {
        return this._program.configOptions;
    }

    get importResolver(): ImportResolver {
        return this._program.importResolver;
    }

    get fileSystem(): IReadOnlyFileSystem {
        return this._program.fileSystem;
    }

    get extensionManager(): ExtensionManager {
        return this._program.extensionManager;
    }

    getSourceFileInfoList(): readonly ITypeServerSourceFile[] {
        return this._program.getSourceFileInfoList().map((fileInfo) => new SourceFileProvider(this._program, fileInfo));
    }

    getParseResults(fileUri: Uri): ParseFileResults | undefined {
        return this._program.getParseResults(fileUri);
    }

    getSourceFileInfo(fileUri: Uri): ITypeServerSourceFile | undefined {
        const sourceInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceInfo) {
            return undefined;
        }

        return new SourceFileProvider(this._program, sourceInfo);
    }

    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined {
        return this._program.getModuleSymbolTable(fileUri);
    }

    getSourceMapper(
        fileUri: Uri,
        token: CancellationToken,
        mapCompiled?: boolean,
        preferStubs?: boolean
    ): SourceMapper {
        return this._program.getSourceMapper(fileUri, token, mapCompiled, preferStubs);
    }

    getAutoImportInfo(fileUri: Uri, targetImportUri: Uri): AutoImportInfo | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const execEnv = this._program.configOptions.findExecEnvironment(fileUri);
        const moduleImportInfo = this._program.importResolver.getModuleNameForImport(targetImportUri, execEnv);
        const moduleName = moduleImportInfo.moduleName;
        const category = moduleImportInfo.isLocalTypingsFile
            ? 'local-stub'
            : moduleImportInfo.importType === ImportType.Stdlib
            ? 'stdlib'
            : moduleImportInfo.importType === ImportType.External
            ? 'external'
            : 'local';

        return { category, moduleName };
    }

    getImportCompletions(fileUri: Uri, partialModuleName: string): Map<string, Uri> {
        const execEnv = this._program.configOptions.findExecEnvironment(fileUri);
        const split = partialModuleName
            .trim()
            .split('.')
            .map((part) => part.trim());
        let leadingDots = 0;

        while (split.length > 1 && split[0] === '') {
            leadingDots++;
            split.shift();
        }

        let hasTrailingDot = false;
        if (split.length > 1 && split[split.length - 1] === '') {
            hasTrailingDot = true;
            split.pop();
        }

        const moduleDescriptor: ImportedModuleDescriptor = {
            nameParts: split,
            leadingDots,
            hasTrailingDot,
            importedSymbols: undefined,
        };

        return this._program.importResolver.getCompletionSuggestions(fileUri, execEnv, moduleDescriptor);
    }

    addInterimFile(uri: Uri): void {
        this._program.addInterimFile(uri);
    }

    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void {
        this._program.setFileOpened(fileUri, version, contents, options);
    }
}
