/*
 * serviceProviderExtensions.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Shortcuts to common services.
 */

import { CancellationProvider, DefaultCancellationProvider } from 'typeserver/extensibility/cancellationUtils.js';
import { ConsoleInterface } from 'typeserver/extensibility/console.js';
import { ServiceKeys } from 'typeserver/extensibility/serviceKeys.js';
import { ServiceProvider } from 'typeserver/extensibility/serviceProvider.js';
import { CaseSensitivityDetector } from 'typeserver/files/caseSensitivity.js';
import { FileSystem, TempFile } from 'typeserver/files/fileSystem.js';
import { PartialStubService, SupportPartialStubs } from 'typeserver/files/partialStubService.js';
import { CacheManager } from 'typeserver/service/cacheManager.js';

export function createServiceProvider(...services: any): ServiceProvider {
    const sp = new ServiceProvider();

    // For known interfaces, register the service.
    services.forEach((service: any) => {
        if (FileSystem.is(service)) {
            sp.add(ServiceKeys.fs, service);
        }
        if (ConsoleInterface.is(service)) {
            sp.add(ServiceKeys.console, service);
        }
        if (SupportPartialStubs.is(service)) {
            sp.add(ServiceKeys.partialStubs, service);
        }
        if (TempFile.is(service)) {
            sp.add(ServiceKeys.tempFile, service);
        }
        if (CaseSensitivityDetector.is(service)) {
            sp.add(ServiceKeys.caseSensitivityDetector, service);
        }
        if (CacheManager.is(service)) {
            sp.add(ServiceKeys.cacheManager, service);
        }
        if (CancellationProvider.is(service)) {
            sp.add(ServiceKeys.cancellationProvider, service);
        }
    });

    return sp;
}

export function getFs(sp: ServiceProvider): FileSystem {
    return sp.get(ServiceKeys.fs);
}

export function getConsole(sp: ServiceProvider): ConsoleInterface {
    return sp.get(ServiceKeys.console);
}

export function getPartialStubs(sp: ServiceProvider): SupportPartialStubs {
    const result = sp.tryGet(ServiceKeys.partialStubs);
    if (!result) {
        sp.add(ServiceKeys.partialStubs, new PartialStubService(getFs(sp)));
    }
    return sp.get(ServiceKeys.partialStubs);
}

export function getTmp(sp: ServiceProvider): TempFile | undefined {
    return sp.tryGet(ServiceKeys.tempFile);
}

export function getCancellationProvider(sp: ServiceProvider): CancellationProvider {
    return sp.tryGet(ServiceKeys.cancellationProvider) ?? new DefaultCancellationProvider();
}

export function getCacheManager(sp: ServiceProvider): CacheManager | undefined {
    return sp.tryGet(ServiceKeys.cacheManager);
}

export function getCaseDetector(sp: ServiceProvider): CaseSensitivityDetector {
    return sp.get(ServiceKeys.caseSensitivityDetector);
}
