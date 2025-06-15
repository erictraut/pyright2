/*
 * editAction.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Represents a single edit within a file.
 */

import { Range } from 'typeserver/common/textRange.js';
import { Uri } from 'typeserver/utils/uri/uri.js';

export interface TextEditAction {
    range: Range;
    replacementText: string;
}

export interface FileEditAction extends TextEditAction {
    fileUri: Uri;
}

export interface FileEditActions {
    edits: FileEditAction[];
    fileOperations: FileOperations[];
}

export type FileOperations = RenameFileOperation | CreateFileOperation | DeleteFileOperation;

export interface FileOperation {
    kind: 'create' | 'delete' | 'rename';
}

export interface RenameFileOperation extends FileOperation {
    kind: 'rename';
    oldFileUri: Uri;
    newFileUri: Uri;
}

export interface CreateFileOperation extends FileOperation {
    kind: 'create';
    fileUri: Uri;
}

export interface DeleteFileOperation extends FileOperation {
    kind: 'delete';
    fileUri: Uri;
}
