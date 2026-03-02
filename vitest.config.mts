import tsConfigPaths from 'vite-tsconfig-paths'
import { defineProject } from 'vitest/config'

const timeout = 60 * 1000

export default defineProject({
    plugins: [tsConfigPaths()],
    test: {
        env: {
            NODE_ENV: 'test',
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['tests/unit/**/*.spec.ts'],
                },
            },
        ],
        clearMocks: true,
        restoreMocks: true,
        mockReset: true,
        globals: true,
        testTimeout: timeout,
        hookTimeout: timeout,
        exclude: ['node_modules', 'dist'],
    },
})
