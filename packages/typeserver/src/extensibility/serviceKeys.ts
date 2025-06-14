/*
 * serviceKeys.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Define service keys.
 */

import { CancellationProvider } from 'typeserver/extensibility/cancellationUtils.js';
import { ConsoleInterface } from 'typeserver/extensibility/console.js';
import { ServiceKey } from 'typeserver/extensibility/serviceProvider.js';
import { CaseSensitivityDetector } from 'typeserver/files/caseSensitivity.js';
import { FileSystem, TempFile } from 'typeserver/files/fileSystem.js';
import { SupportPartialStubs } from 'typeserver/files/partialStubService.js';
import { CacheManager } from 'typeserver/service/cacheManager.js';

export namespace ServiceKeys {
    export const fs = new ServiceKey<FileSystem>();
    export const console = new ServiceKey<ConsoleInterface>();
    export const partialStubs = new ServiceKey<SupportPartialStubs>();
    export const tempFile = new ServiceKey<TempFile>();
    export const cacheManager = new ServiceKey<CacheManager>();
    export const caseSensitivityDetector = new ServiceKey<CaseSensitivityDetector>();
    export const cancellationProvider = new ServiceKey<CancellationProvider>();
}
