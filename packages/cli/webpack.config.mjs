/**
 * webpack.config.js
 * Copyright: Microsoft 2018
 */

import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

// eslint-disable-next-line no-restricted-imports
import { cacheConfig, monorepoResourceNameMapper, tsconfigResolveAliases } from '../../build/lib/webpack.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.resolve(__dirname, 'dist');
const typeshedFallback = path.resolve(__dirname, '..', 'typeserver', 'typeshed-fallback');

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
export default (_, { mode }) => {
    return {
        context: __dirname,
        entry: {
            'pyright-cli': './src/pyright-cli.ts',
            //'pyright-langserver': './src/langserver.ts',
        },
        target: 'node',
        output: {
            filename: '[name].js',
            path: outPath,
            // library: {
            //     type: 'module',
            // },
            module: true,
            devtoolModuleFilenameTemplate:
                mode === 'development' ? 'typeserver/[resource-path]' : monorepoResourceNameMapper('pyright'),
            clean: true,
        },
        experiments: { outputModule: true },
        devtool: mode === 'development' ? 'source-map' : 'nosources-source-map',
        cache: mode === 'development' ? cacheConfig(__dirname, __filename) : false,
        stats: {
            all: false,
            errors: true,
            warnings: true,
            publicPath: true,
            timings: true,
        },
        resolve: {
            extensions: ['.ts', '.js'],
            extensionAlias: {
                '.js': ['.ts', '.js'],
                '.cjs': ['.cts', '.cjs'],
                '.mjs': ['.mts', '.mjs'],
            },
            alias: tsconfigResolveAliases('tsconfig.json'),
        },
        externals: {
            fsevents: 'commonjs2 fsevents',
            'lodash.camelcase': 'commonjs2 lodash',
            chalk: 'commonjs2 chalk',
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
        optimization: {
            usedExports: false,
            sideEffects: true,
            splitChunks: {
                cacheGroups: {
                    defaultVendors: {
                        name: 'vendor',
                        test: /[\\/]node_modules[\\/]/,
                        chunks: 'all',
                        priority: -10,
                    },
                    pyright: {
                        name: 'pyright-internal',
                        chunks: 'all',
                        test: /[\\/]pyright-internal[\\/]/,
                        priority: -20,
                    },
                },
            },
        },
    };
};
