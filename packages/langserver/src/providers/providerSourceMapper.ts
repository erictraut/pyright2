/*
 * providerSourceMapper.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Encapsulates a type server and arguments needed to call it for various
 * operations that involve mapping a stub file to a source file.
 */

import { CancellationToken } from 'vscode-languageserver';

import { IParseProvider } from 'langserver/providers/parseProvider.js';
import { Declaration } from 'typeserver/binder/declaration.js';
import { ClassType } from 'typeserver/evaluator/types.js';
import { ModuleNode } from 'typeserver/parser/parseNodes.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { buildImportTree } from 'typeserver/program/sourceMapperUtils.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { isDefined } from 'typeserver/utils/valueTypeUtils.js';

export class ProviderSourceMapper {
    // TODO - need to remove this
    private _sourceMapper: SourceMapper;

    constructor(
        private _typeServer: ITypeServer,
        private _parseProvider: IParseProvider,
        private _fileUri: Uri,
        private _preferStubs: boolean,
        private _cancelToken: CancellationToken
    ) {
        this._sourceMapper = _typeServer.getSourceMapper(_fileUri, _preferStubs, _cancelToken);
    }

    // If the specified fileUri is a stub file and _preferStubs is false,
    // this returns a list of Uris for the source file(s) that this stub maps to.
    getStubImplementations(fileUri: Uri): Uri[] {
        const uriList = this._isStubThatShouldBeMappedToImplementation(fileUri)
            ? this._getSourcePathsFromStub(fileUri, this._fileUri) ?? []
            : [fileUri];

        return uriList;
    }

    getStubImplementationModules(fileUri: Uri): ModuleNode[] {
        const uriList = this.getStubImplementations(fileUri);
        const parsedFiles = uriList.map((uri) => this._parseProvider.parseFile(uri)).filter(isDefined);
        return parsedFiles.map((p) => p.parserOutput.parseTree);
    }

    getModuleNode(fileUri: Uri): ModuleNode | undefined {
        // Used only to get the docstring for the stub module
        return this._sourceMapper.getModuleNode(fileUri);
    }

    findDeclarations(stubDecl: Declaration): Declaration[] {
        // Used to find corresponding declarations for a stub declaration
        return this._sourceMapper.findDeclarations(stubDecl);
    }

    findDeclarationsByType(originatedPath: Uri, type: ClassType): Declaration[] {
        // Used to implement "Go to Type Definition" for a type
        return this._sourceMapper.findDeclarationsByType(originatedPath, type);
    }

    private _getSourcePathsFromStub(stubFileUri: Uri, fromFile: Uri | undefined): Uri[] {
        // Attempt our stubFileUri to see if we can resolve it as a source file path.
        let results = this._typeServer.getStubImplementation(stubFileUri, fromFile);
        if (results && results.length > 0) {
            return results.map((file) => file.uri);
        }

        // If that didn't work, try looking through the graph up to our fromFile.
        // One of them should be able to resolve to an actual file.
        const stubFileImportTree = this._getStubFileImportTree(stubFileUri, fromFile);

        // Go through the items in this tree until we find at least one path.
        for (let i = 0; i < stubFileImportTree.length; i++) {
            results = this._typeServer.getStubImplementation(stubFileImportTree[i]);
            if (results && results.length > 0) {
                return results.map((file) => file.uri);
            }
        }

        return [];
    }

    private _getStubFileImportTree(stubFileUri: Uri, fromFile: Uri | undefined): Uri[] {
        if (!fromFile || !this._isStubThatShouldBeMappedToImplementation(stubFileUri)) {
            // No path to search, just return the starting point.
            return [stubFileUri];
        } else {
            // Otherwise recurse through the importedBy list up to our 'fromFile'.
            return buildImportTree(
                fromFile,
                stubFileUri,
                (p) => {
                    const boundSourceInfo = this._typeServer.getSourceFile(p);
                    return boundSourceInfo ? boundSourceInfo.getImportedBy().map((info) => info.uri) : [];
                },
                this._cancelToken
            ).filter((p) => this._isStubThatShouldBeMappedToImplementation(p));
        }
    }

    private _isStubThatShouldBeMappedToImplementation(fileUri: Uri): boolean {
        if (this._preferStubs) {
            return false;
        }

        const stub = isStubFile(fileUri);
        if (!stub) {
            return false;
        }

        const implFiles = this._typeServer.getStubImplementation(fileUri, this._fileUri);
        if (!implFiles || implFiles.length === 0) {
            return false;
        }

        return true;
    }
}

export function isStubFile(uri: Uri): boolean {
    return uri.lastExtension === '.pyi';
}
