import { expect, test } from '@playwright/test';
import { fakeSupabase } from './fake-supabase';

const POST = '/blog/fixture-fluid-simulation/';

test.beforeEach(async ({ page }) => { await fakeSupabase(page); });

test('index lists published posts and never drafts or scheduled posts', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page).toHaveTitle(/Notes/);
    await expect(page.locator('.featured-title')).toHaveText('Fixture: a fluid simulation in C++');
    await expect(page.locator('.post-row-title')).toHaveText(['Fixture: neural networks from scratch']);
    const html = await page.content();
    expect(html).not.toContain('secret draft');
    expect(html).not.toContain('scheduled post');
    for (const path of ['/blog/fixture-draft/', '/blog/fixture-future/']) {
        const res = await page.request.get(path);
        expect(res.status()).toBe(404);
    }
    const index = await (await page.request.get('/blog/search-index.json')).text();
    expect(index).not.toContain('draft-body-marker');
    expect(index).not.toContain('future-body-marker');
});

test('article renders code, math, tables, TOC and anchors', async ({ page }) => {
    await page.goto(POST);
    await expect(page.locator('h1')).toHaveText('Fixture: a fluid simulation in C++');
    await expect(page.locator('.article-meta')).toContainText('Updated');
    const code = page.locator('.code-block').first();
    await expect(code.locator('.code-lang')).toHaveText('C++');
    await expect(code.locator('.code-title')).toHaveText('advect.cpp');
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.locator('.katex-display')).toHaveCount(1);
    await expect(page.locator('.table-wrap table')).toBeVisible();
    await expect(page.locator('[data-toc] a')).toHaveText(['Advection', 'Pressure projection', 'Jacobi iterations', 'Rendering']);
    await expect(page.locator('h2#advection .heading-anchor')).toHaveAttribute('href', '#advection');
    await expect(page.locator('.related-item')).toContainText(['Fixture: neural networks from scratch']);
});

test('copy button copies the code', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(POST);
    const btn = page.locator('.code-copy').first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(btn).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('float sample(const Grid& g');
});

test('CSP blocks script injected through post HTML; page scripts still run', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => { if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) violations.push(m.text()); });
    await page.goto(POST);
    expect(await page.evaluate(() => (window as unknown as { __fixtureInjected?: boolean }).__fixtureInjected)).toBeUndefined();
    expect(violations.some((v) => /script/i.test(v))).toBe(true);
    // Bundled scripts executed (they reveal the copy button).
    await expect(page.locator('.code-copy').first()).toBeVisible();
});

test('SEO metadata, structured data and feeds', async ({ page }) => {
    await page.goto(POST);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://ryanlewan.com/blog/fixture-fluid-simulation/');
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.dateModified).toBe('2026-02-01T00:00:00.000Z');
    await expect(page.locator('meta[name=robots]')).toHaveCount(0);

    const rss = await (await page.request.get('/blog/rss.xml')).text();
    expect(rss).toContain('<link>https://ryanlewan.com/blog/fixture-fluid-simulation/</link>');
    expect(rss).not.toContain('secret draft');
    const sitemap = await (await page.request.get('/blog/sitemap-0.xml')).text();
    expect(sitemap).toContain('https://ryanlewan.com/blog/fixture-fluid-simulation/');
    for (const p of ['admin', 'account', 'signin', 'auth', 'user', 'search']) expect(sitemap).not.toContain(`/blog/${p}/`);
});

test('private pages are noindex', async ({ page }) => {
    for (const p of ['/blog/admin/', '/blog/account/', '/blog/signin/', '/blog/auth/callback/', '/blog/user/']) {
        await page.goto(p);
        await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
        await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
    }
});

test('theme toggle switches and persists across reloads (inline script allowed by CSP)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/blog/');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const dark = await bg();
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await bg()).not.toBe(dark);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('follows the OS light scheme when no choice is saved', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/blog/');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(246, 246, 249)');
});

test('search finds by body text and filters by category', async ({ page }) => {
    await page.goto('/blog/search/?q=jacobi');
    await expect(page.locator('[data-search-results] .post-row-title')).toHaveText(['Fixture: a fluid simulation in C++']);
    await page.locator('#q').fill('backpropagation');
    await expect(page.locator('[data-search-results] .post-row-title')).toHaveText(['Fixture: neural networks from scratch']);
    await page.locator('#q').fill('');
    await page.locator('#f-category').selectOption('machine-learning');
    await expect(page.locator('[data-search-results] .post-row-title')).toHaveText(['Fixture: neural networks from scratch']);
    await expect(page).toHaveURL(/category=machine-learning/);
});

test('tag and category pages, and the 404 page', async ({ page }) => {
    await page.goto('/blog/tags/simulation/');
    await expect(page.locator('.post-row')).toHaveCount(2);
    await page.goto('/blog/category/graphics/');
    await expect(page.locator('.post-row')).toHaveCount(1);
    const res = await page.goto('/blog/no-such-post/');
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('That page isn’t here.');
});

test('@mobile article has no horizontal page overflow; code scrolls inside its block', async ({ page }) => {
    await page.goto(POST);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('[data-toc]')).not.toHaveAttribute('open', '');
});

test('@mobile index fits the screen', async ({ page }) => {
    await page.goto('/blog/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});

test('index has search + RSS at the top and a posts-by-tag section', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('.masthead .search-box input')).toBeVisible();
    await expect(page.locator('.masthead a[href="/blog/rss.xml"]')).toBeVisible();
    const sim = page.locator('.tag-group', { has: page.locator('a.chip[href="/blog/tags/simulation/"]') });
    await expect(sim.locator('li a')).toHaveText(['Fixture: a fluid simulation in C++', 'Fixture: neural networks from scratch']);
    await expect(page.locator('.tag-groups')).not.toContainText('Secret'); // draft-only tag
});

test('share menu opens and closes; GitHub button only on posts that set it', async ({ page }) => {
    await page.goto('/blog/fixture-fluid-simulation/');
    await expect(page.locator('.site-header a[aria-label="GitHub"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute('href', 'https://github.com/ryanlew02/my_website');
    const menu = page.locator('#share-menu');
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'LinkedIn' })).toHaveAttribute('href', /linkedin\.com.*fixture-fluid-simulation/);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    await page.goto('/blog/fixture-neural-nets/');
    await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveCount(0);
});
