import { expect, test } from '@playwright/test';
import { fakeSupabase, SUPABASE, STORAGE_KEY } from './fake-supabase';

test('sign-in starts a PKCE OAuth flow with a fixed callback URL', async ({ page }) => {
    await fakeSupabase(page);
    let authorizeUrl = '';
    await page.route(`${SUPABASE}/auth/v1/authorize**`, (r) => { authorizeUrl = r.request().url(); return r.fulfill({ status: 200, body: 'ok' }); });
    await page.goto('/blog/signin/?next=%2Fblog%2Ffixture-fluid-simulation%2F');
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();
    await expect.poll(() => authorizeUrl).not.toBe('');
    const u = new URL(authorizeUrl);
    expect(u.searchParams.get('provider')).toBe('github');
    expect(u.searchParams.get('redirect_to')).toBe('http://localhost:4329/blog/auth/callback/');
    expect(u.searchParams.get('code_challenge')).toBeTruthy();
    expect(u.searchParams.get('code_challenge_method')).toBe('s256');
});

test('callback exchanges the code and returns to the remembered page', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto('/blog/signin/?next=%2Fblog%2Ffixture-fluid-simulation%2F%23comments');
    // Simulate what signInWithOAuth leaves behind: a code verifier in storage.
    await page.evaluate((k) => {
        localStorage.setItem(`${k}-code-verifier`, JSON.stringify('verifier-123'));
        sessionStorage.setItem('auth:next', '/blog/fixture-fluid-simulation/#comments');
    }, STORAGE_KEY);
    await page.goto('/blog/auth/callback/?code=good-code');
    await expect(page).toHaveURL(/\/blog\/fixture-fluid-simulation\/#comments$/);
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toContain('access_token');
});

test('callback ignores an off-site "next" value', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto('/blog/signin/');
    await page.evaluate((k) => {
        localStorage.setItem(`${k}-code-verifier`, JSON.stringify('verifier-123'));
        sessionStorage.setItem('auth:next', 'https://evil.example/phish');
    }, STORAGE_KEY);
    await page.goto('/blog/auth/callback/?code=good-code');
    await expect(page).toHaveURL('http://localhost:4329/blog/');
});

test('callback shows a friendly error for a bad code and for provider errors', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto('/blog/signin/');
    await page.evaluate((k) => localStorage.setItem(`${k}-code-verifier`, JSON.stringify('v')), STORAGE_KEY);
    await page.goto('/blog/auth/callback/?code=bad-code');
    await expect(page.locator('.notice--error')).toHaveText(/invalid or has expired/);
    await expect(page).toHaveURL('http://localhost:4329/blog/auth/callback/'); // code removed from the URL

    await page.goto('/blog/auth/callback/?error=access_denied&error_description=User+denied');
    await expect(page.locator('.notice--error')).toHaveText('Sign-in was cancelled.');
});

test('magic-link form validates and confirms', async ({ page }) => {
    const state = await fakeSupabase(page);
    await page.goto('/blog/signin/');
    await page.locator('#email').fill('not-an-email');
    await page.getByRole('button', { name: 'Email me a link' }).click();
    await expect(page.locator('.notice--error')).toHaveText('Enter a valid email address.');
    await page.locator('#email').fill('reader@example.com');
    await page.getByRole('button', { name: 'Email me a link' }).click();
    await expect(page.locator('.notice--success')).toContainText('Check reader@example.com');
    expect(state.requests.some((r) => r.path.startsWith('/auth/v1/otp'))).toBe(true);
});

test('signed-in header shows the account menu; sign-out clears the session', async ({ page }) => {
    await fakeSupabase(page, { signedIn: true });
    await page.goto('/blog/');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.locator('.account-menu')).toContainText('@reader');
    await expect(page.locator('.account-menu')).not.toContainText('Admin dashboard');
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page.locator('[data-signin-link]')).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
});

test('a revoked session is treated as signed out', async ({ page }) => {
    await fakeSupabase(page, {
        signedIn: true,
        failures: { '/rest/v1/profiles': { status: 401, body: { code: 'PGRST301', message: 'JWT expired' } } },
    });
    await page.goto('/blog/');
    await expect(page.locator('[data-signin-link]')).toBeVisible();
});

test('protected pages send signed-out visitors to sign in', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto('/blog/account/');
    await expect(page).toHaveURL(/\/blog\/signin\/\?next=%2Fblog%2Faccount%2F/);
    await page.goto('/blog/admin/');
    await expect(page).toHaveURL(/\/blog\/signin\/\?next=%2Fblog%2Fadmin%2F/);
});

test('admin dashboard refuses a normal user and loads no admin data', async ({ page }) => {
    const state = await fakeSupabase(page, { signedIn: true, isAdmin: false });
    await page.goto('/blog/admin/');
    await expect(page.locator('.notice--error')).toContainText('for the site administrator');
    expect(state.requests.some((r) => r.path.includes('admin_overview'))).toBe(false);
});

test('admin dashboard loads for an admin', async ({ page }) => {
    await fakeSupabase(page, { signedIn: true, isAdmin: true });
    await page.goto('/blog/admin/');
    await expect(page.getByRole('tab', { name: /Reports/ })).toContainText('1');
    await expect(page.locator('.stat-tile').first()).toContainText('2'); // published posts in this build
});

test('admin Comments and Reports tabs load', async ({ page }) => {
    const state = await fakeSupabase(page, { signedIn: true, isAdmin: true });
    await page.goto('/blog/admin/');
    await page.getByRole('tab', { name: /^Comments/ }).click();
    await expect(page.locator('main')).toContainText('No comments match.');
    await page.getByRole('tab', { name: /^Reports/ }).click();
    await expect(page.locator('main')).toContainText('No open reports.');
    await expect(page.locator('.notice--error')).toHaveCount(0);
    const embeds = state.requests.filter((r) => r.method === 'GET' && /\/rest\/v1\/(comments|comment_reports)\?/.test(r.path));
    expect(embeds.length).toBeGreaterThanOrEqual(2);
});

for (const tag of ['', ' @mobile']) {
    test(`header sign-in button matches the theme toggle's height${tag}`, async ({ page }) => {
        await fakeSupabase(page);
        await page.goto('/blog/');
        const signin = await page.locator('[data-signin-link]').boundingBox();
        const toggle = await page.locator('[data-theme-toggle]').boundingBox();
        expect(signin && toggle).toBeTruthy();
        expect(Math.round(signin!.height)).toBe(Math.round(toggle!.height));
        expect(Math.abs((signin!.y + signin!.height / 2) - (toggle!.y + toggle!.height / 2))).toBeLessThan(1);
    });
}
