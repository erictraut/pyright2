/*
 * serviceKeys.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Define service keys.
 */

import { CacheManager } from './analyzer/cacheManager';
import { CancellationProvider } from './common/cancellationUtils';
import { CaseSensitivityDetector } from './common/caseSensitivityDetector';
import { ConsoleInterface } from './common/console';
import { FileSystem, TempFile } from './common/fileSystem';
import { SupportPartialStubs } from './partialStubService';
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
