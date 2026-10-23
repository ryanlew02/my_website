/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
    test: {
        include: ['tests/unit/**/*.test.ts', 'tests/db/**/*.test.ts'],
        testTimeout: 30_000,
    },
});
