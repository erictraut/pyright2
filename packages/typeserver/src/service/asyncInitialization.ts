/*
 * asyncInitialization.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * helpers shared between multiple packages such as pyright-internal and pyright
 */

export async function initializeDependencies() {
    if (process.env.NODE_ENV === 'production') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('source-map-support').install();
    }
}
