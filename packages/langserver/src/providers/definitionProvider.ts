/*
 * definitionProvider.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * Author: Eric Traut
 *
 * Logic that maps a position within a Python program file into
 * a "definition" of the item that is referred to at that position.
 * For example, if the location is within an import name, the
 * definition is the top of the resolved import file.
 */

import { CancellationToken } from 'vscode-languageserver';

import { appendArray } from 'commonUtils/collectionUtils.js';
import { Uri } from 'commonUtils/uri/uri.js';
import { isDefined } from 'commonUtils/valueTypeUtils.js';
import {
    Declaration,
    DeclarationType,
    isFunctionDeclaration,
    isUnresolvedAliasDeclaration,
} from 'typeserver/binder/declaration.js';
import { SynthesizedTypeInfo } from 'typeserver/binder/symbol.js';
import { getFileInfo } from 'typeserver/common/analyzerNodeInfo.js';
import { DocumentRange } from 'typeserver/common/docRange.js';
import { findNodeByOffset } from 'typeserver/common/parseTreeUtils.js';
import { convertOffsetsToRange, convertPositionToOffset } from 'typeserver/common/positionUtils.js';
import { Position, rangesAreEqual } from 'typeserver/common/textRange.js';
import { TypeEvaluator } from 'typeserver/evaluator/typeEvaluatorTypes.js';
import { OverloadedType, TypeCategory, isOverloaded } from 'typeserver/evaluator/types.js';
import { doForEachSubtype } from 'typeserver/evaluator/typeUtils.js';
import { throwIfCancellationRequested } from 'typeserver/extensibility/cancellationUtils.js';
import { IProgramView } from 'typeserver/extensibility/extensibility.js';
import { ExtensionManager } from 'typeserver/extensibility/extensionManager.js';
import { ParseNode, ParseNodeType } from 'typeserver/parser/parseNodes.js';
import { ParseFileResults } from 'typeserver/parser/parser.js';
import { SourceMapper, isStubFile } from 'typeserver/program/sourceMapper.js';

export enum DefinitionFilter {
    All = 'all',
    PreferSource = 'preferSource',
    PreferStubs = 'preferStubs',
}

export function addDeclarationsToDefinitions(
    evaluator: TypeEvaluator,
    sourceMapper: SourceMapper,
    declarations: Declaration[] | undefined,
    definitions: DocumentRange[]
) {
    if (!declarations) {
        return;
    }

    declarations.forEach((decl) => {
        let resolvedDecl = evaluator.resolveAliasDeclaration(decl, /* resolveLocalNames */ true, {
            allowExternallyHiddenAccess: true,
        });

        if (!resolvedDecl || resolvedDecl.uri.isEmpty()) {
            return;
        }

        // If the decl is an unresolved import, skip it.
        if (resolvedDecl.type === DeclarationType.Alias) {
            if (resolvedDecl.isUnresolved || isUnresolvedAliasDeclaration(resolvedDecl)) {
                return;
            }
        }

        // If the resolved decl is still an alias, it means it
        // resolved to a module. We need to apply loader actions
        // to determine its path.
        if (
            resolvedDecl.type === DeclarationType.Alias &&
            resolvedDecl.symbolName &&
            resolvedDecl.submoduleFallback &&
            !resolvedDecl.submoduleFallback.uri.isEmpty()
        ) {
            resolvedDecl = resolvedDecl.submoduleFallback;
        }

        _addIfUnique(definitions, {
            uri: resolvedDecl.uri,
            range: resolvedDecl.range,
        });

        if (isFunctionDeclaration(resolvedDecl)) {
            // Handle overloaded function case
            const functionType = evaluator.getTypeForDeclaration(resolvedDecl)?.type;
            if (functionType && isOverloaded(functionType)) {
                for (const overloadDecl of OverloadedType.getOverloads(functionType)
                    .map((o) => o.shared.declaration)
                    .filter(isDefined)) {
                    _addIfUnique(definitions, {
                        uri: overloadDecl.uri,
                        range: overloadDecl.range,
                    });
                }
            }
        }

        if (!isStubFile(resolvedDecl.uri)) {
            return;
        }

        if (resolvedDecl.type === DeclarationType.Alias) {
            // Add matching source module
            sourceMapper
                .findModules(resolvedDecl.uri)
                .map((m) => getFileInfo(m)?.fileUri)
                .filter(isDefined)
                .forEach((f) => _addIfUnique(definitions, _createModuleEntry(f)));
            return;
        }

        const implDecls = sourceMapper.findDeclarations(resolvedDecl);
        for (const implDecl of implDecls) {
            if (implDecl && !implDecl.uri.isEmpty()) {
                _addIfUnique(definitions, {
                    uri: implDecl.uri,
                    range: implDecl.range,
                });
            }
        }
    });
}

export function filterDefinitions(filter: DefinitionFilter, definitions: DocumentRange[]) {
    if (filter === DefinitionFilter.All) {
        return definitions;
    }

    // If go-to-declaration is supported, attempt to only show only pyi files in go-to-declaration
    // and none in go-to-definition, unless filtering would produce an empty list.
    const preferStubs = filter === DefinitionFilter.PreferStubs;
    const wantedFile = (v: DocumentRange) => preferStubs === isStubFile(v.uri);
    if (definitions.find(wantedFile)) {
        return definitions.filter(wantedFile);
    }

    return definitions;
}

class DefinitionProviderBase {
    protected constructor(
        protected readonly sourceMapper: SourceMapper,
        protected readonly evaluator: TypeEvaluator,
        private readonly _extensionManager: ExtensionManager | undefined,
        protected readonly node: ParseNode | undefined,
        protected readonly offset: number,
        private readonly _filter: DefinitionFilter,
        protected readonly token: CancellationToken
    ) {}

    getDefinitionsForNode(node: ParseNode, offset: number) {
        throwIfCancellationRequested(this.token);

        const definitions: DocumentRange[] = [];

        // There should be only one 'definition', so only if extensions failed should we try again.
        if (definitions.length === 0) {
            if (node.nodeType === ParseNodeType.Name) {
                const declInfo = this.evaluator.getDeclInfoForNameNode(node);
                if (declInfo) {
                    this.resolveDeclarations(declInfo.decls, definitions);
                    this.addSynthesizedTypes(declInfo.synthesizedTypes, definitions);
                }
            } else if (node.nodeType === ParseNodeType.String) {
                const declInfo = this.evaluator.getDeclInfoForStringNode(node);
                if (declInfo) {
                    this.resolveDeclarations(declInfo.decls, definitions);
                    this.addSynthesizedTypes(declInfo.synthesizedTypes, definitions);
                }
            }
        }

        if (definitions.length === 0) {
            return undefined;
        }

        return filterDefinitions(this._filter, definitions);
    }

    protected resolveDeclarations(declarations: Declaration[] | undefined, definitions: DocumentRange[]) {
        addDeclarationsToDefinitions(this.evaluator, this.sourceMapper, declarations, definitions);
    }

    protected addSynthesizedTypes(synthTypes: SynthesizedTypeInfo[], definitions: DocumentRange[]) {
        for (const synthType of synthTypes) {
            if (!synthType.node) {
                continue;
            }

            const fileInfo = getFileInfo(synthType.node);
            const range = convertOffsetsToRange(
                synthType.node.start,
                synthType.node.start + synthType.node.length,
                fileInfo.lines
            );

            definitions.push({ uri: fileInfo.fileUri, range });
        }
    }
}

export class DefinitionProvider extends DefinitionProviderBase {
    constructor(
        program: IProgramView,
        fileUri: Uri,
        position: Position,
        filter: DefinitionFilter,
        token: CancellationToken
    ) {
        const sourceMapper = program.getSourceMapper(fileUri, token);
        const parseResults = program.getParseResults(fileUri);
        const { node, offset } = _tryGetNode(parseResults, position);

        super(sourceMapper, program.evaluator!, program.extensionManager, node, offset, filter, token);
    }

    static getDefinitionsForNode(
        sourceMapper: SourceMapper,
        evaluator: TypeEvaluator,
        node: ParseNode,
        offset: number,
        token: CancellationToken
    ) {
        const provider = new DefinitionProviderBase(
            sourceMapper,
            evaluator,
            undefined,
            node,
            offset,
            DefinitionFilter.All,
            token
        );
        return provider.getDefinitionsForNode(node, offset);
    }

    getDefinitions(): DocumentRange[] | undefined {
        if (this.node === undefined) {
            return undefined;
        }

        return this.getDefinitionsForNode(this.node, this.offset);
    }
}

export class TypeDefinitionProvider extends DefinitionProviderBase {
    private readonly _fileUri: Uri;

    constructor(program: IProgramView, fileUri: Uri, position: Position, token: CancellationToken) {
        const sourceMapper = program.getSourceMapper(fileUri, token, /*mapCompiled*/ false, /*preferStubs*/ true);
        const parseResults = program.getParseResults(fileUri);
        const { node, offset } = _tryGetNode(parseResults, position);

        super(sourceMapper, program.evaluator!, program.extensionManager, node, offset, DefinitionFilter.All, token);
        this._fileUri = fileUri;
    }

    getDefinitions(): DocumentRange[] | undefined {
        throwIfCancellationRequested(this.token);
        if (this.node === undefined) {
            return undefined;
        }

        const definitions: DocumentRange[] = [];

        if (this.node.nodeType === ParseNodeType.Name) {
            const type = this.evaluator.getType(this.node);

            if (type) {
                let declarations: Declaration[] = [];

                doForEachSubtype(type, (subtype) => {
                    if (subtype?.category === TypeCategory.Class) {
                        appendArray(
                            declarations,
                            this.sourceMapper.findClassDeclarationsByType(this._fileUri, subtype)
                        );
                    }
                });

                // Fall back to Go To Definition if the type can't be found (ex. Go To Type Definition
                // was executed on a type name)
                if (declarations.length === 0) {
                    declarations = this.evaluator.getDeclInfoForNameNode(this.node)?.decls ?? [];
                }

                this.resolveDeclarations(declarations, definitions);
            }
        } else if (this.node.nodeType === ParseNodeType.String) {
            const declarations = this.evaluator.getDeclInfoForStringNode(this.node)?.decls;
            this.resolveDeclarations(declarations, definitions);
        }

        if (definitions.length === 0) {
            return undefined;
        }

        return definitions;
    }
}

function _tryGetNode(parseResults: ParseFileResults | undefined, position: Position) {
    if (!parseResults) {
        return { node: undefined, offset: 0 };
    }

    const offset = convertPositionToOffset(position, parseResults.tokenizerOutput.lines);
    if (offset === undefined) {
        return { node: undefined, offset: 0 };
    }

    return { node: findNodeByOffset(parseResults.parserOutput.parseTree, offset), offset };
}

function _createModuleEntry(uri: Uri): DocumentRange {
    return {
        uri,
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
        },
    };
}

function _addIfUnique(definitions: DocumentRange[], itemToAdd: DocumentRange) {
    for (const def of definitions) {
        if (def.uri.equals(itemToAdd.uri) && rangesAreEqual(def.range, itemToAdd.range)) {
            return;
        }
    }

    definitions.push(itemToAdd);
}
