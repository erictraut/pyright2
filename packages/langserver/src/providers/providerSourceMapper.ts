/*
 * providerSourceMapper.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Encapsulates a type server and arguments needed to call it for various
 * operations that involve mapping a stub file to a source file.
 */

import { Declaration } from 'typeserver/binder/declaration.js';
import { ClassType } from 'typeserver/evaluator/types.js';
import { ModuleNode } from 'typeserver/parser/parseNodes.js';
import { SourceMapper } from 'typeserver/program/sourceMapper.js';
import { ITypeServer } from 'typeserver/protocol/typeServerProtocol.js';
import { Uri } from 'typeserver/utils/uri/uri.js';
import { CancellationToken } from 'vscode-languageserver';

export class ProviderSourceMapper {
    // TODO - need to remove this
    private _sourceMapper: SourceMapper;

    constructor(
        private _typeServer: ITypeServer,
        private _fileUri: Uri,
        private _preferStubs: boolean,
        private _token: CancellationToken
    ) {
        this._sourceMapper = _typeServer.getSourceMapper(_fileUri, _preferStubs, _token);
    }

    findModules(stubFileUri: Uri): ModuleNode[] {
        // Used to get the docstring for the implementation modules
        // and to get a synthesized declaration for a module so
        // "go to definition" works for intermediate modules in a
        // multi-part module name.
        return this._sourceMapper.findModules(stubFileUri);
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
}

export function isStubFile(uri: Uri): boolean {
    return uri.lastExtension === '.pyi';
}
