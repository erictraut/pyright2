/**
 * webpack.config-cli.js
 * Copyright: Microsoft 2018
 */

import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line no-restricted-imports
import { tsconfigResolveAliases } from '../../../../../build/lib/webpack.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.resolve(__dirname, '..', '..', '..', 'out');
const typeshedFallback = path.resolve(__dirname, '..', '..', '..', '..', 'typeserver', 'typeshed-fallback');

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
export default (_, { mode }) => {
    return {
        context: __dirname,
        entry: {
            testServer: './main.ts',
        },
        target: 'node',
        output: {
            filename: '[name].bundle.js',
            path: outPath,
            libraryTarget: 'module',
            devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        },
        experiments: { outputModule: true },
        devtool: 'source-map',
        stats: {
            all: false,
            errors: true,
            warnings: true,
            publicPath: true,
            timings: true,
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
            alias: tsconfigResolveAliases('tsconfig.json'),
        },
        externals: {
            fsevents: 'commonjs2 fsevents',
            'fs-extra': 'commonjs2 fs-extra',
            'jsonc-parser': 'commonjs2 jsonc-parser',
            'vscode-jsonrpc': 'commonjs2 vscode-jsonrpc',
            'vscode-languageserver-protocol': 'commonjs2 vscode-languageserver-protocol',
            'vscode-languageserver': 'commonjs2 vscode-languageserver',
            '@yarnpkg/fslib': 'commonjs2 @yarnpkg/fslib',
            '@yarnpkg/libzip': 'commonjs2 @yarnpkg/libzip',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.json',
                    },
                },
                {
                    // Transform pre-compiled JS files to use syntax available in Node 12+.
                    // esbuild is fast, so let it run on all JS files rather than matching
                    // only known-bad libs.
                    test: /\.js$/,
                    loader: 'esbuild-loader',
                    options: {
                        target: 'node12',
                    },
                },
            ],
        },
        plugins: [new CopyPlugin({ patterns: [{ from: typeshedFallback, to: 'typeshed-fallback' }] })],
    };
};
