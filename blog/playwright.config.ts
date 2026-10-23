import { defineConfig, devices } from '@playwright/test';

// Builds the blog with fixture posts and a fake Supabase URL into ./test-dist,
// serves it the way Hostinger would, and runs the browser tests against it.
// Supabase itself is replaced per-test by tests/e2e/fake-supabase.ts, so these
// exercise the real client code without a real project.
const PORT = 4329;

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    reporter: [['list']],
    use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
        { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
    ],
    webServer: {
        command: `npx astro build && node scripts/preview.mjs`,
        url: `http://localhost:${PORT}/blog/`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
            BLOG_TEST_BUILD: '1',
            PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
            PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
            PREVIEW_ROOT: 'test-dist',
            PORT: String(PORT),
            PUBLIC_ENABLE_EMAIL_LOGIN: 'true',
        },
    },
});
