/*
 * jest.config.mjs
 *
 * Configuration for jest tests.
 */

export default {
    testEnvironment: 'node',
    roots: ['<rootDir>/src/tests'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: 'tsconfig.json',
            },
        ],
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    extensionsToTreatAsEsm: ['.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    moduleNameMapper: {
        '^typeserver/(.*).js$': '<rootDir>/../typeserver/src/$1.ts',
        '^commonUtils/(.*).js$': '<rootDir>/../typeserver/src/utils/$1',
        '^langserver/(.*).js$': '<rootDir>/../langserver/src/$1',
    },
};
