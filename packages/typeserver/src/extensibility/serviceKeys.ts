/*
 * serviceKeys.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Define service keys.
 */

import { CaseSensitivityDetector } from '../files/caseSensitivityDetector';
import { FileSystem, TempFile } from '../files/fileSystem';
import { SupportPartialStubs } from '../files/partialStubService';
import { CacheManager } from '../service/cacheManager';
import { CancellationProvider } from './cancellationUtils';
import { ConsoleInterface } from './console';
import { ServiceKey } from './serviceProvider';

export namespace ServiceKeys {
    export const fs = new ServiceKey<FileSystem>();
    export const console = new ServiceKey<ConsoleInterface>();
    export const partialStubs = new ServiceKey<SupportPartialStubs>();
    export const tempFile = new ServiceKey<TempFile>();
    export const cacheManager = new ServiceKey<CacheManager>();
    export const caseSensitivityDetector = new ServiceKey<CaseSensitivityDetector>();
    export const cancellationProvider = new ServiceKey<CancellationProvider>();
}
