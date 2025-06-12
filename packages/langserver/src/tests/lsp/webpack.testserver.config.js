/**
 * webpack.config-cli.js
 * Copyright: Microsoft 2018
 */

import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import { tsconfigResolveAliases } from '../../../../../build/lib/webpack.js';

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
            filename: '[name].bundle.ts',
            path: outPath,
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        },
        devtool: 'source-map',
        stats: {
            all: false,
            errors: true,
            warnings: true,
            publicPath: true,
            timings: true,
        },
        resolve: {
            extensions: ['.ts', '.ts'],
            alias: tsconfigResolveAliases('tsconfig.json'),
        },
        externals: {
            fsevents: 'commonjs2 fsevents',
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
