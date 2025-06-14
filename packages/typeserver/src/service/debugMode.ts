/*
 * debugMode.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Accessor for determining whether the type server is running in debug mode.
 */

let _debugMode: boolean | undefined = undefined;

// TODO - clean up this mechanism so the value comes from the
// entry point of the type server.

export function isDebugMode() {
    if (_debugMode === undefined) {
        // Cache debugging mode since it can't be changed while process is running.
        const argv = process.execArgv.join();
        _debugMode = argv.includes('inspect') || argv.includes('debug');
    }

    return _debugMode;
}
