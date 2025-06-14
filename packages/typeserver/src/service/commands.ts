/*
 * commands.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Command identifier strings.
 */

export const enum Commands {
    createTypeStub = 'pyright.createtypestub',
    restartServer = 'pyright.restartserver',
    unusedImport = 'pyright.unusedImport',
}
