/*
 * tomlUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Helpers related to TOML
 */

import * as TOML from 'smol-toml';

export function parse(toml: string): Record<string, TOML.TomlPrimitive> {
    return TOML.parse(toml);
}
