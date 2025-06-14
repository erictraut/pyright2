/*
 * valueTypeUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Various helpers that identify types of values or
 * convert values from one type to another.
 */

export function identity<T>(x: T) {
    return x;
}

export function isArray<T extends any[]>(value: any): value is T {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}

export function isString(text: unknown): text is string {
    return typeof text === 'string';
}

export function isNumber(x: unknown): x is number {
    return typeof x === 'number';
}

export function isBoolean(x: unknown): x is boolean {
    return typeof x === 'boolean';
}

// Indicates whether a map-like contains an own property with the specified key.
export function hasProperty(map: { [index: string]: any }, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(map, key);
}

// Convert the given value to boolean
export function toBoolean(trueOrFalse: string): boolean {
    const normalized = trueOrFalse?.trim().toUpperCase();
    if (normalized === 'TRUE') {
        return true;
    }

    return false;
}

interface Thenable<T> {
    then<TResult>(
        onfulfilled?: (value: T) => TResult | Thenable<TResult>,
        onrejected?: (reason: any) => TResult | Thenable<TResult>
    ): Thenable<TResult>;
    then<TResult>(
        onfulfilled?: (value: T) => TResult | Thenable<TResult>,
        onrejected?: (reason: any) => void
    ): Thenable<TResult>;
}

export function isThenable<T>(v: any): v is Thenable<T> {
    return typeof v?.then === 'function';
}

export function isDefined<T>(element: T | undefined): element is T {
    return element !== undefined;
}
