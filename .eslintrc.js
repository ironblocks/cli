module.exports = {
    root: true,
    env: {
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
    overrides: [
        {
            files: ['**/*.ts?(x)'],
            parser: '@typescript-eslint/parser',
            extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/typescript'],
        },
    ],
    plugins: ['simple-import-sort', 'prettier', '@typescript-eslint'],
    parserOptions: {
        tsconfigRootDir: '.',
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: {},
            node: {
                paths: ['src'],
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
    rules: {
        'prettier/prettier': ['error', {}, { usePrettierrc: true }],
        '@typescript-eslint/no-unused-vars': [
            'error', // or "error"
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            },
        ],
        'arrow-parens': 0,
        'no-debugger': 1,
        'no-return-await': 0,
        'object-curly-spacing': ['error', 'always'],
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'no-var': 'error',
        'comma-dangle': [1, 'always-multiline'],
        'no-console': [
            1,
            {
                allow: ['warn', 'error'],
            },
        ],
        'import/namespace': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
    },
};
