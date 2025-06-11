/*
 * serviceProviderExtensions.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Shortcuts to common services.
 */

import { CaseSensitivityDetector } from '../files/caseSensitivityDetector';
import { FileSystem, TempFile } from '../files/fileSystem';
import { PartialStubService, SupportPartialStubs } from '../files/partialStubService';
import { CacheManager } from '../service/cacheManager';
import { CancellationProvider, DefaultCancellationProvider } from './cancellationUtils';
import { ConsoleInterface } from './console';
import { ServiceKeys } from './serviceKeys';
import { ServiceProvider } from './serviceProvider';

declare module './serviceProvider' {
    interface ServiceProvider {
        fs(): FileSystem;
        console(): ConsoleInterface;
        cancellationProvider(): CancellationProvider;
        tmp(): TempFile | undefined;
        partialStubs(): SupportPartialStubs;
        cacheManager(): CacheManager | undefined;
    }
}

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

ServiceProvider.prototype.fs = function () {
    return this.get(ServiceKeys.fs);
};

ServiceProvider.prototype.console = function () {
    return this.get(ServiceKeys.console);
};

ServiceProvider.prototype.partialStubs = function () {
    const result = this.tryGet(ServiceKeys.partialStubs);
    if (!result) {
        this.add(ServiceKeys.partialStubs, new PartialStubService(this.fs()));
    }
    return this.get(ServiceKeys.partialStubs);
};

ServiceProvider.prototype.tmp = function () {
    return this.tryGet(ServiceKeys.tempFile);
};

ServiceProvider.prototype.cancellationProvider = function () {
    return this.tryGet(ServiceKeys.cancellationProvider) ?? new DefaultCancellationProvider();
};

ServiceProvider.prototype.cacheManager = function () {
    const result = this.tryGet(ServiceKeys.cacheManager);
    return result;
};
