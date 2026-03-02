import diiaConfig from '@diia-inhouse/eslint-config'

/**  @type {import('eslint').Linter.Config}  */
export default [
    ...diiaConfig,
    {
        ignores: ['*.js', '*.mjs', 'node_modules', 'dist', 'vitest.config.mts'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json', './tests/tsconfig.json'],
            },
        },
    },
]
