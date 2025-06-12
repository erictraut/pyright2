/*
 * serviceKeys.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Define service keys.
 */

import { CaseSensitivityDetector } from '../files/caseSensitivityDetector.ts';
import { FileSystem, TempFile } from '../files/fileSystem.ts';
import { SupportPartialStubs } from '../files/partialStubService.ts';
import { CacheManager } from '../service/cacheManager.ts';
import { CancellationProvider } from './cancellationUtils.ts';
import { ConsoleInterface } from './console.ts';
import { ServiceKey } from './serviceProvider.ts';

export namespace ServiceKeys {
    export const fs = new ServiceKey<FileSystem>();
    export const console = new ServiceKey<ConsoleInterface>();
    export const partialStubs = new ServiceKey<SupportPartialStubs>();
    export const tempFile = new ServiceKey<TempFile>();
    export const cacheManager = new ServiceKey<CacheManager>();
    export const caseSensitivityDetector = new ServiceKey<CaseSensitivityDetector>();
    export const cancellationProvider = new ServiceKey<CancellationProvider>();
}
