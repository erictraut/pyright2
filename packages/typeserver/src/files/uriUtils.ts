/*
 * uriUtils.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Utility functions for manipulating URIs.
 */

import type { Dirent } from 'fs';

import { IFileSystem, IReadOnlyFileSystem, Stats } from 'typeserver/files/fileSystem.js';
import { CaseSensitivityDetector } from 'typeserver/utils/caseSensitivity.js';
import {
    getRegexEscapedSeparator,
    isDirectoryWildcardPatternPresent,
    stripTrailingDirectorySeparator,
} from 'typeserver/utils/pathUtils.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface FileSpec {
    // File specs can contain wildcard characters (**, *, ?). This
    // specifies the first portion of the file spec that contains
    // no wildcards.
    wildcardRoot: Uri;

    // Regular expression that can be used to match against this
    // file spec.
    regExp: RegExp;

    // Indicates whether the file spec has a directory wildcard (**).
    // When present, the search cannot terminate without exploring to
    // an arbitrary depth.
    hasDirectoryWildcard: boolean;
}

const _includeFileRegex = /\.pyi?$/;
const _wildcardRegex = /[*?]/;

export namespace FileSpec {
    export function is(value: any): value is FileSpec {
        const candidate: FileSpec = value as FileSpec;
        return candidate && !!candidate.wildcardRoot && !!candidate.regExp;
    }
    export function isInPath(uri: Uri, paths: FileSpec[]) {
        return !!paths.find((p) => uri.matchesRegex(p.regExp));
    }

    export function matchesIncludeFileRegex(uri: Uri, isFile = true) {
        return isFile ? uri.matchesRegex(_includeFileRegex) : true;
    }

    export function matchIncludeFileSpec(includeRegExp: RegExp, exclude: FileSpec[], uri: Uri, isFile = true) {
        if (uri.matchesRegex(includeRegExp)) {
            if (!FileSpec.isInPath(uri, exclude) && FileSpec.matchesIncludeFileRegex(uri, isFile)) {
                return true;
            }
        }

        return false;
    }
}

export interface FileSystemEntries {
    files: Uri[];
    directories: Uri[];
}

export function forEachAncestorDirectory(
    directory: Uri,
    callback: (directory: Uri) => Uri | undefined
): Uri | undefined {
    while (true) {
        const result = callback(directory);
        if (result !== undefined) {
            return result;
        }

        const parentPath = directory.getDirectory();
        if (parentPath.equals(directory)) {
            return undefined;
        }

        directory = parentPath;
    }
}

// Creates a directory hierarchy for a path, starting from some ancestor path.
export function makeDirectories(fs: IFileSystem, dir: Uri, startingFrom: Uri) {
    if (!dir.startsWith(startingFrom)) {
        return;
    }

    const pathComponents = dir.getPathComponents();
    const relativeToComponents = startingFrom.getPathComponents();
    let curPath = startingFrom;

    for (let i = relativeToComponents.length; i < pathComponents.length; i++) {
        curPath = curPath.combinePaths(pathComponents[i]);
        if (!fs.existsSync(curPath)) {
            fs.mkdirSync(curPath);
        }
    }
}

export function getFileSize(fs: IReadOnlyFileSystem, uri: Uri) {
    const stat = tryStat(fs, uri);
    if (stat?.isFile()) {
        return stat.size;
    }
    return 0;
}

export function fileExists(fs: IReadOnlyFileSystem, uri: Uri): boolean {
    return fileSystemEntryExists(fs, uri, FileSystemEntryKind.File);
}

export function directoryExists(fs: IReadOnlyFileSystem, uri: Uri): boolean {
    return fileSystemEntryExists(fs, uri, FileSystemEntryKind.Directory);
}

export function isDirectory(fs: IReadOnlyFileSystem, uri: Uri): boolean {
    return tryStat(fs, uri)?.isDirectory() ?? false;
}

export function isFile(fs: IReadOnlyFileSystem, uri: Uri, treatZipDirectoryAsFile = false): boolean {
    const stats = tryStat(fs, uri);
    if (stats?.isFile()) {
        return true;
    }

    if (!treatZipDirectoryAsFile) {
        return false;
    }

    return stats?.isZipDirectory?.() ?? false;
}

export function tryStat(fs: IReadOnlyFileSystem, uri: Uri): Stats | undefined {
    try {
        if (fs.existsSync(uri)) {
            return fs.statSync(uri);
        }
    } catch (e: any) {
        return undefined;
    }
    return undefined;
}

export function tryRealpath(fs: IReadOnlyFileSystem, uri: Uri): Uri | undefined {
    try {
        return fs.realpathSync(uri);
    } catch (e: any) {
        return undefined;
    }
}

export function getFileSystemEntries(fs: IReadOnlyFileSystem, uri: Uri): FileSystemEntries {
    try {
        return getFileSystemEntriesFromDirEntries(fs.readdirEntriesSync(uri), fs, uri);
    } catch (e: any) {
        return { files: [], directories: [] };
    }
}

// Sorts the entires into files and directories, including any symbolic links.
export function getFileSystemEntriesFromDirEntries(
    dirEntries: Dirent[],
    fs: IReadOnlyFileSystem,
    uri: Uri
): FileSystemEntries {
    const entries = dirEntries.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }

        if (a.name > b.name) {
            return 1;
        }

        return 0;
    });
    const files: Uri[] = [];
    const directories: Uri[] = [];
    for (const entry of entries) {
        // This is necessary because on some file system node fails to exclude
        // "." and "..". See https://github.com/nodejs/node/issues/4002
        if (entry.name === '.' || entry.name === '..') {
            continue;
        }

        const entryUri = uri.combinePaths(entry.name);
        if (entry.isFile()) {
            files.push(entryUri);
        } else if (entry.isDirectory()) {
            directories.push(entryUri);
        } else if (entry.isSymbolicLink()) {
            const stat = tryStat(fs, entryUri);
            if (stat?.isFile()) {
                files.push(entryUri);
            } else if (stat?.isDirectory()) {
                directories.push(entryUri);
            }
        }
    }
    return { files, directories };
}

// Transforms a relative file spec (one that potentially contains
// escape characters **, * or ?) and returns a regular expression
// that can be used for matching against.
export function getWildcardRegexPattern(root: Uri, fileSpec: string): string {
    const absolutePath = root.resolvePaths(fileSpec);
    const pathComponents = Array.from(absolutePath.getPathComponents());
    const escapedSeparator = getRegexEscapedSeparator('/');
    const doubleAsteriskRegexFragment = `(${escapedSeparator}[^${escapedSeparator}][^${escapedSeparator}]*)*?`;
    const reservedCharacterPattern = new RegExp(`[^\\w\\s${escapedSeparator}]`, 'g');

    // Strip the directory separator from the root component.
    if (pathComponents.length > 0) {
        pathComponents[0] = stripTrailingDirectorySeparator(pathComponents[0]);
    }

    let regExPattern = '';
    let firstComponent = true;

    for (let component of pathComponents) {
        if (component === '**') {
            regExPattern += doubleAsteriskRegexFragment;
        } else {
            if (!firstComponent) {
                component = escapedSeparator + component;
            }

            regExPattern += component.replace(reservedCharacterPattern, (match) => {
                if (match === '*') {
                    return `[^${escapedSeparator}]*`;
                } else if (match === '?') {
                    return `[^${escapedSeparator}]`;
                } else {
                    // escaping anything that is not reserved characters - word/space/separator
                    return '\\' + match;
                }
            });

            firstComponent = false;
        }
    }

    return regExPattern;
}

// Returns the topmost path that contains no wildcard characters.
export function getWildcardRoot(root: Uri, fileSpec: string): Uri {
    const absolutePath = root.resolvePaths(fileSpec);
    // make a copy of the path components so we can modify them.
    const pathComponents = Array.from(absolutePath.getPathComponents());
    let wildcardRoot = absolutePath.root;

    // Remove the root component.
    if (pathComponents.length > 0) {
        pathComponents.shift();
    }

    for (const component of pathComponents) {
        if (component === '**') {
            break;
        } else {
            if (_wildcardRegex.test(component)) {
                break;
            }

            wildcardRoot = wildcardRoot.resolvePaths(component);
        }
    }

    return wildcardRoot;
}

export function hasPythonExtension(uri: Uri) {
    return uri.hasExtension('.py') || uri.hasExtension('.pyi');
}

export function getFileSpec(root: Uri, fileSpec: string): FileSpec {
    let regExPattern = getWildcardRegexPattern(root, fileSpec);
    const escapedSeparator = getRegexEscapedSeparator('/');
    regExPattern = `^(${regExPattern})($|${escapedSeparator})`;

    const regExp = new RegExp(regExPattern, root.isCaseSensitive ? undefined : 'i');
    const wildcardRoot = getWildcardRoot(root, fileSpec);
    const hasDirectoryWildcard = isDirectoryWildcardPatternPresent(fileSpec);

    return {
        wildcardRoot,
        regExp,
        hasDirectoryWildcard,
    };
}

const enum FileSystemEntryKind {
    File,
    Directory,
}

function fileSystemEntryExists(fs: IReadOnlyFileSystem, uri: Uri, entryKind: FileSystemEntryKind): boolean {
    try {
        const stat = fs.statSync(uri);

        switch (entryKind) {
            case FileSystemEntryKind.File:
                return stat.isFile();

            case FileSystemEntryKind.Directory:
                return stat.isDirectory();

            default:
                return false;
        }
    } catch (e: any) {
        return false;
    }
}

export function getDirectoryChangeKind(
    fs: IReadOnlyFileSystem,
    oldDirectory: Uri,
    newDirectory: Uri
): 'Same' | 'Renamed' | 'Moved' {
    if (oldDirectory.equals(newDirectory)) {
        return 'Same';
    }

    const relativePaths = oldDirectory.getRelativePathComponents(newDirectory);

    // 2 means only last folder name has changed.
    if (relativePaths.length === 2 && relativePaths[0] === '..' && relativePaths[1] !== '..') {
        return 'Renamed';
    }

    return 'Moved';
}

export function deduplicateFolders(listOfFolders: Uri[][], excludes: Uri[] = []): Uri[] {
    const foldersToWatch = new Map<string, Uri>();

    listOfFolders.forEach((folders) => {
        folders.forEach((p) => {
            if (foldersToWatch.has(p.key)) {
                // Bail out on exact match.
                return;
            }

            for (const exclude of excludes) {
                if (p.startsWith(exclude)) {
                    return;
                }
            }

            for (const existing of foldersToWatch) {
                // ex) p: "/user/test" existing: "/user"
                if (p.startsWith(existing[1])) {
                    // We already have the parent folder in the watch list
                    return;
                }

                // ex) p: "/user" folderToWatch: "/user/test"
                if (existing[1].startsWith(p)) {
                    // We found better one to watch. replace.
                    foldersToWatch.delete(existing[0]);
                    foldersToWatch.set(p.key, p);
                    return;
                }
            }

            foldersToWatch.set(p.key, p);
        });
    });

    return [...foldersToWatch.values()];
}

export namespace UriEx {
    export function file(path: string): Uri;
    export function file(path: string, isCaseSensitive: boolean, checkRelative?: boolean): Uri;
    export function file(path: string, arg?: boolean, checkRelative?: boolean): Uri {
        const caseDetector = _getCaseSensitivityDetector(arg);
        return Uri.file(path, caseDetector, checkRelative);
    }

    export function parse(path: string | undefined): Uri;
    export function parse(path: string | undefined, isCaseSensitive: boolean): Uri;
    export function parse(value: string | undefined, arg?: boolean): Uri {
        const caseDetector = _getCaseSensitivityDetector(arg);
        return Uri.parse(value, caseDetector);
    }

    const caseSensitivityDetector: CaseSensitivityDetector = {
        isCaseSensitive: () => true,
    };

    const caseInsensitivityDetector: CaseSensitivityDetector = {
        isCaseSensitive: () => false,
    };

    function _getCaseSensitivityDetector(arg: boolean | undefined) {
        if (arg === undefined) {
            return caseSensitivityDetector;
        }

        return arg ? caseSensitivityDetector : caseInsensitivityDetector;
    }
}
