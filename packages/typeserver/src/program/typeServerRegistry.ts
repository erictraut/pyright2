/*
 * typeServerRegistry.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Manages a registry of objects that the type server returns to callers.
 * Each object gets a unique ID that is used to refer to it, so this mapping
 * needs to be maintained across type server calls.
 */

import { Declaration } from 'typeserver/binder/declaration.js';
import { Type } from 'typeserver/evaluator/types.js';

export class TypeServerRegistry {
    // When a new type evaluator is created, it gets a new generation number.
    private _generation: number;
    private _nextId = 1;
    private _declarations = new Map<string, Declaration>();
    private _types = new Map<string, Type>();

    constructor(generation: number) {
        this._generation = generation;
    }

    registerDeclaration(decl: Declaration): string {
        const id = this._allocateNewId();
        this._declarations.set(id, decl);
        return id;
    }

    getDeclaration(id: string): Declaration | undefined {
        return this._declarations.get(id);
    }

    registerType(type: Type): string {
        const id = this._allocateNewId();
        this._types.set(id, type);
        return id;
    }

    getType(id: string): Type | undefined {
        return this._types.get(id);
    }

    private _allocateNewId(): string {
        const id = this._nextId++;
        return this._makeGenerationId(id);
    }

    private _makeGenerationId(id: number | string): string {
        return `${this._generation}-${id}`;
    }
}
