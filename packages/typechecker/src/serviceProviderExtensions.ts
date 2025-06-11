/*
 * serviceProviderExtensions.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Shortcuts to common services.
 */
import { CacheManager } from './analyzer/cacheManager';
import { CancellationProvider, DefaultCancellationProvider } from './common/cancellationUtils';
import { CaseSensitivityDetector } from './common/caseSensitivityDetector';
import { ConsoleInterface } from './common/console';
import { DocStringService, PyrightDocStringService } from './common/docStringService';
import { FileSystem, TempFile } from './common/fileSystem';
import { PartialStubService, SupportPartialStubs } from './partialStubService';
// import { CommandService, WindowService } from './languageServerInterface';
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
        docStringService(): DocStringService;
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
        if (DocStringService.is(service)) {
            sp.add(ServiceKeys.docStringService, service);
        }
        // if (WindowService.is(service)) {
        //     sp.add(ServiceKeys.windowService, service);
        // }
        // if (CommandService.is(service)) {
        //     sp.add(ServiceKeys.commandService, service);
        // }
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

ServiceProvider.prototype.docStringService = function () {
    const result = this.tryGet(ServiceKeys.docStringService);
    return result || new PyrightDocStringService();
};

ServiceProvider.prototype.cacheManager = function () {
    const result = this.tryGet(ServiceKeys.cacheManager);
    return result;
};
