/*
 * pythonPathUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Utility routines used to resolve various paths in Python.
 */

import * as pathConsts from 'typeserver/common/pathConsts.js';
import { PythonVersion } from 'typeserver/common/pythonVersion.js';
import { ConfigOptions } from 'typeserver/config/configOptions.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { IFileSystem } from 'typeserver/files/fileSystem.js';
import { getFileSystemEntries, isDirectory, tryStat } from 'typeserver/files/uriUtils.js';
import { compareComparableValues } from 'typeserver/utils/comparisonUtils.js';
import { normalizePath } from 'typeserver/utils/pathUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface PythonPathResult {
    paths: Uri[];
    prefix: Uri | undefined;
}

export const stdLibFolderName = 'stdlib';
export const thirdPartyFolderName = 'stubs';

export function getTypeshedSubdirectory(typeshedPath: Uri, isStdLib: boolean) {
    return typeshedPath.combinePaths(isStdLib ? stdLibFolderName : thirdPartyFolderName);
}

export function findPythonSearchPaths(
    em: ExtensionManager,
    configOptions: ConfigOptions,
    importFailureInfo: string[],
    includeWatchPathsOnly?: boolean | undefined,
    workspaceRoot?: Uri | undefined
): Uri[] {
    importFailureInfo.push('Finding python search paths');

    if (configOptions.venvPath !== undefined && configOptions.venv) {
        const venvDir = configOptions.venv;
        const venvPath = configOptions.venvPath.combinePaths(venvDir);

        const foundPaths: Uri[] = [];
        const sitePackagesPaths: Uri[] = [];

        [pathConsts.lib, pathConsts.lib64, pathConsts.libAlternate].forEach((libPath) => {
            const sitePackagesPath = findSitePackagesPath(
                em.fs,
                venvPath.combinePaths(libPath),
                configOptions.defaultPythonVersion,
                importFailureInfo
            );
            if (sitePackagesPath) {
                addPathIfUnique(foundPaths, sitePackagesPath);
                sitePackagesPaths.push(em.fs.realCasePath(sitePackagesPath));
            }
        });

        // Now add paths from ".pth" files located in each of the site packages folders.
        sitePackagesPaths.forEach((sitePackagesPath) => {
            const pthPaths = getPathsFromPthFiles(em.fs, sitePackagesPath);
            pthPaths.forEach((path) => {
                addPathIfUnique(foundPaths, path);
            });
        });

        if (foundPaths.length > 0) {
            importFailureInfo.push(`Found the following '${pathConsts.sitePackages}' dirs`);
            foundPaths.forEach((path) => {
                importFailureInfo.push(`  ${path}`);
            });
            return foundPaths;
        }

        importFailureInfo.push(
            `Did not find any '${pathConsts.sitePackages}' dirs. Falling back on python interpreter.`
        );
    }

    // Fall back on the python interpreter.
    const rawPathResult = em.pythonEnv.getPythonSearchPaths(configOptions.pythonPath, importFailureInfo);

    const pathResult: Uri[] = [];
    rawPathResult.paths.forEach((p) => {
        const normalizedPath = normalizePath(p);
        const normalizedUri = Uri.file(normalizedPath, em.caseSensitivity);

        // Skip non-existent paths and broken zips/eggs.
        if (em.fs.existsSync(normalizedUri) && isDirectory(em.fs, normalizedUri)) {
            pathResult.push(normalizedUri);
        } else {
            importFailureInfo.push(`Skipping '${normalizedPath}' because it is not a valid directory`);
        }
    });

    if (pathResult.length === 0) {
        importFailureInfo.push(`Found no valid directories`);
    }

    const prefixUri = rawPathResult.prefix ? Uri.file(rawPathResult.prefix, em.caseSensitivity) : undefined;

    if (includeWatchPathsOnly && workspaceRoot && !workspaceRoot.isEmpty()) {
        const paths = pathResult
            .filter((p) => !p.startsWith(workspaceRoot) || p.startsWith(prefixUri))
            .map((p) => em.fs.realCasePath(p));

        return paths;
    }

    return pathResult.map((p) => em.fs.realCasePath(p));
}

export function isPythonBinary(p: string): boolean {
    p = p.trim();
    return p === 'python' || p === 'python3';
}

function findSitePackagesPath(
    fs: IFileSystem,
    libPath: Uri,
    pythonVersion: PythonVersion | undefined,
    importFailureInfo: string[]
): Uri | undefined {
    if (fs.existsSync(libPath)) {
        importFailureInfo.push(`Found path '${libPath}'; looking for ${pathConsts.sitePackages}`);
    } else {
        importFailureInfo.push(`Did not find '${libPath}'`);
        return undefined;
    }

    const sitePackagesPath = libPath.combinePaths(pathConsts.sitePackages);
    if (fs.existsSync(sitePackagesPath)) {
        importFailureInfo.push(`Found path '${sitePackagesPath}'`);
        return sitePackagesPath;
    } else {
        importFailureInfo.push(`Did not find '${sitePackagesPath}', so looking for python subdirectory`);
    }

    // We didn't find a site-packages directory directly in the lib
    // directory. Scan for a "python3.X" directory instead.
    const entries = getFileSystemEntries(fs, libPath);

    // Candidate directories start with "python3.".
    const candidateDirs = entries.directories.filter((dirName) => {
        if (dirName.fileName.startsWith('python3.')) {
            const dirPath = dirName.combinePaths(pathConsts.sitePackages);
            return fs.existsSync(dirPath);
        }
        return false;
    });

    // If there is a python3.X directory (where 3.X matches the configured python
    // version), prefer that over other python directories.
    if (pythonVersion) {
        const preferredDir = candidateDirs.find(
            (dirName) => dirName.fileName === `python${PythonVersion.toMajorMinorString(pythonVersion)}`
        );
        if (preferredDir) {
            const dirPath = preferredDir.combinePaths(pathConsts.sitePackages);
            importFailureInfo.push(`Found path '${dirPath}'`);
            return dirPath;
        }
    }

    // If there was no python version or we didn't find an exact match, use the
    // first directory that starts with "python". Most of the time, there will be
    // only one.
    if (candidateDirs.length > 0) {
        const dirPath = candidateDirs[0].combinePaths(pathConsts.sitePackages);
        importFailureInfo.push(`Found path '${dirPath}'`);
        return dirPath;
    }

    return undefined;
}

export function readPthSearchPaths(pthFile: Uri, fs: IFileSystem): Uri[] {
    const searchPaths: Uri[] = [];

    if (fs.existsSync(pthFile)) {
        const data = fs.readFileSync(pthFile, 'utf8');
        const lines = data.split(/\r?\n/);
        lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 0 && !trimmedLine.startsWith('#') && !trimmedLine.match(/^import\s/)) {
                const pthPath = pthFile.getDirectory().combinePaths(trimmedLine);
                if (fs.existsSync(pthPath) && isDirectory(fs, pthPath)) {
                    searchPaths.push(fs.realCasePath(pthPath));
                }
            }
        });
    }

    return searchPaths;
}

export function getPathsFromPthFiles(fs: IFileSystem, parentDir: Uri): Uri[] {
    const searchPaths: Uri[] = [];

    // Get a list of all *.pth files within the specified directory.
    const pthFiles = fs
        .readdirEntriesSync(parentDir)
        .filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith('.pth'))
        .sort((a, b) => compareComparableValues(a.name, b.name));

    pthFiles.forEach((pthFile) => {
        const filePath = fs.realCasePath(parentDir.combinePaths(pthFile.name));
        const fileStats = tryStat(fs, filePath);

        // Skip all files that are much larger than expected.
        if (fileStats?.isFile() && fileStats.size > 0 && fileStats.size < 64 * 1024) {
            searchPaths.push(...readPthSearchPaths(filePath, fs));
        }
    });

    return searchPaths;
}

export function addPathIfUnique(pathList: Uri[], pathToAdd: Uri) {
    if (!pathList.some((path) => path.key === pathToAdd.key)) {
        pathList.push(pathToAdd);
        return true;
    }

    return false;
}
