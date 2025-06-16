/*
 * typeServerProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements the ITypeServer interface by wrapping the internal Program object.
 */

import { CancellationToken } from 'vscode-languageserver';

import { Declaration, DeclarationType } from 'typeserver/binder/declaration.js';
import { SymbolTable } from 'typeserver/binder/symbol.js';
import { findNodeByPosition, getStringNodeValueRange } from 'typeserver/common/parseTreeUtils.js';
import {
    convertOffsetToPosition,
    convertPositionToOffset,
    convertTextRangeToRange,
} from 'typeserver/common/positionUtils.js';
import { TextRange } from 'typeserver/common/textRange.js';
import { SymbolDeclInfo, TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { ImportedModuleDescriptor } from 'typeserver/imports/importResolver.js';
import { ImportType } from 'typeserver/imports/importResult.js';
import { ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { OpenFileOptions, Program } from 'typeserver/program/program.js';
import { SourceFileProvider } from 'typeserver/program/sourceFileProvider.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import {
    AutoImportInfo,
    DeclarationCategory,
    DeclarationInfo,
    DeclarationOptions,
    ITypeServer,
    ITypeServerSourceFile,
    Position,
    SourceFilesOptions,
    Declaration as TSDeclaration,
} from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export class TypeServerProvider implements ITypeServer {
    constructor(private _program: Program) {}

    get evaluator(): TypeEvaluator | undefined {
        return this._program.evaluator;
    }

    getParseResults(fileUri: Uri): ParseFileResults | undefined {
        return this._program.getParseResults(fileUri);
    }

    getSourceFile(fileUri: Uri): ITypeServerSourceFile | undefined {
        const sourceInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceInfo) {
            return undefined;
        }

        return new SourceFileProvider(this._program, sourceInfo);
    }

    getSourceFiles(options?: SourceFilesOptions): readonly ITypeServerSourceFile[] {
        return this._program
            .getSourceFileInfoList()
            .filter((fileInfo) => {
                if (options?.filter === 'checked') {
                    return fileInfo.isTracked || fileInfo.isOpenByClient;
                }

                if (options?.filter === 'inProject') {
                    return fileInfo.isTracked;
                }

                return true;
            })
            .map((fileInfo) => new SourceFileProvider(this._program, fileInfo));
    }

    getModuleSymbolTable(fileUri: Uri): SymbolTable | undefined {
        return this._program.getModuleSymbolTable(fileUri);
    }

    getSourceMapper(fileUri: Uri, preferStubs: boolean, token: CancellationToken): SourceMapper {
        return this._program.getSourceMapper(fileUri, preferStubs, token);
    }

    convertOffsetToPosition(fileUri: Uri, offset: number): Position | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        return convertOffsetToPosition(offset, parseInfo.tokenizerOutput.lines);
    }

    convertPositionToOffset(fileUri: Uri, position: Position): number | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        return convertPositionToOffset(position, parseInfo.tokenizerOutput.lines);
    }

    getDeclarationsForPosition(
        fileUri: Uri,
        position: Position,
        options?: DeclarationOptions
    ): DeclarationInfo | undefined {
        const sourceFileInfo = this._program.getSourceFileInfo(fileUri);
        if (!sourceFileInfo) {
            return undefined;
        }

        const parseInfo = sourceFileInfo.sourceFile.getParseResults();
        if (!parseInfo) {
            return undefined;
        }

        const node = findNodeByPosition(parseInfo.parserOutput.parseTree, position, parseInfo.tokenizerOutput.lines);
        if (!node) {
            return undefined;
        }

        const evaluator = this._program.evaluator;
        if (!evaluator) {
            return undefined;
        }

        let symbolInfo: SymbolDeclInfo | undefined;
        let name: string | undefined;
        let textRange: TextRange | undefined;

        if (node.nodeType === ParseNodeType.Name) {
            symbolInfo = evaluator.getDeclInfoForNameNode(node);
            name = node.d.value;
            textRange = node;
        } else if (node.nodeType === ParseNodeType.String) {
            symbolInfo = evaluator.getDeclInfoForStringNode(node);
            name = node.d.value;
            textRange = getStringNodeValueRange(node);
        }

        if (!symbolInfo || !name || !textRange) {
            return undefined;
        }

        const declarations: TSDeclaration[] = [];

        symbolInfo.decls.forEach((decl) => {
            const tsDecl = this._convertDecl(decl, !!options?.resolveImports);
            if (tsDecl) {
                declarations.push(tsDecl);
            }
        });

        // TODO - need to convert synthesized types to TSDeclaration
        // by synthesizing a new declaration.

        const range = convertTextRangeToRange(textRange, parseInfo.tokenizerOutput.lines);

        return { name, range, declarations };
    }

    convertToRealUri(fileUri: Uri): Uri | undefined {
        if (this._program.fileSystem.isInZip(fileUri)) {
            return undefined;
        }

        return this._program.fileSystem.getOriginalUri(fileUri);
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

    getImportsRecursive(fileUri: Uri): ITypeServerSourceFile[] {
        const sourceFile = this._program.getSourceFileInfo(fileUri);
        if (!sourceFile) {
            return [];
        }

        const result: ITypeServerSourceFile[] = [];
        const imports = this._program.getImportsRecursive(sourceFile);

        imports.forEach((importedFile) => {
            result.push(new SourceFileProvider(this._program, importedFile));
        });

        return result;
    }

    getImportedByRecursive(fileUri: Uri): ITypeServerSourceFile[] {
        const sourceFile = this._program.getSourceFileInfo(fileUri);
        if (!sourceFile) {
            return [];
        }

        const result: ITypeServerSourceFile[] = [];
        const imports = this._program.getImportedByRecursive(sourceFile);

        imports.forEach((importedFile) => {
            result.push(new SourceFileProvider(this._program, importedFile));
        });

        return result;
    }

    addInterimFile(uri: Uri): void {
        this._program.addInterimFile(uri);
    }

    setFileOpened(fileUri: Uri, version: number | null, contents: string, options?: OpenFileOptions): void {
        this._program.setFileOpened(fileUri, version, contents, options);
    }

    private _allocateId(): string {
        // TODO - implement a proper ID allocation mechanism.
        return 'none';
    }

    // Converts an internal declaration to a TypeServer declaration.
    private _convertDecl(decl: Declaration, resolveImports: boolean): TSDeclaration | undefined {
        if (resolveImports && decl.type === DeclarationType.Alias && this._program.evaluator) {
            decl = this._program.evaluator.resolveAliasDeclaration(decl, /* resolveLocalNames */ true) ?? decl;
        }

        let category: DeclarationCategory;

        switch (decl.type) {
            case DeclarationType.Intrinsic:
            case DeclarationType.SpecialBuiltInClass:
            case DeclarationType.Class:
                category = 'class';
                break;
            case DeclarationType.Function:
                category = 'def';
                break;
            case DeclarationType.Param:
                category = 'parameter';
                break;
            case DeclarationType.Variable:
                category = 'variable';
                break;
            case DeclarationType.TypeParam:
                category = 'type-parameter';
                break;
            case DeclarationType.TypeAlias:
                category = 'type-alias';
                break;
            case DeclarationType.Alias:
                category = 'import';
                break;
            default:
                return undefined;
        }

        return {
            id: this._allocateId(),
            category,
            uri: decl.uri,
            range: decl.range,
        };
    }
}
