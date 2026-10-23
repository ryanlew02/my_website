import { expect, test } from '@playwright/test';
import { fakeSupabase, commentRow, USER_ID } from './fake-supabase';

const POST = '/blog/fixture-fluid-simulation/';

test('signed-out readers see comments and a sign-in prompt', async ({ page }) => {
    await fakeSupabase(page, { comments: [commentRow('a', 'First!')] });
    await page.goto(POST);
    await expect(page.locator('.comment-body')).toHaveText(['First!']);
    await expect(page.locator('.signin-prompt a')).toHaveAttribute('href', '/blog/signin/?next=%2Fblog%2Ffixture-fluid-simulation%2F%23comments');
    await expect(page.locator('.comment-actions')).not.toContainText('Reply');
});

test('comment text is rendered as text, never HTML', async ({ page }) => {
    const evil = '<img src=x onerror="window.__xss=1"><b>bold?</b> https://example.com/x';
    await fakeSupabase(page, { comments: [commentRow('a', evil)] });
    await page.goto(POST);
    const body = page.locator('.comment-body').first();
    await expect(body).toContainText('<img src=x onerror="window.__xss=1"><b>bold?</b>');
    await expect(body.locator('img, b')).toHaveCount(0);
    await expect(body.locator('a')).toHaveAttribute('rel', 'nofollow ugc noopener noreferrer');
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('threads replies and shows removed placeholders without text', async ({ page }) => {
    await fakeSupabase(page, {
        comments: [
            commentRow('a', null as unknown as string, { is_removed: true, username: null, display_name: null, author_id: null }),
            commentRow('b', 'a reply', { parent_id: 'a', depth: 1, created_at: '2026-01-20T11:00:00Z' }),
        ],
    });
    await page.goto(POST);
    await expect(page.locator('.comment-removed')).toHaveText('This comment was removed.');
    await expect(page.locator('#comment-a .comment-list .comment-body')).toHaveText('a reply');
});

test('a signed-in reader can post, and the request carries only allowed fields', async ({ page }) => {
    const state = await fakeSupabase(page, { signedIn: true });
    await page.goto(POST);
    const box = page.getByPlaceholder(/Add to the discussion/);
    await box.fill('  Great write-up.  ');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.locator('.comment-body')).toHaveText(['Great write-up.']);
    await expect(box).toHaveValue('');
    const insert = state.requests.find((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/comments'))!;
    expect(Object.keys(insert.body as object).sort()).toEqual(['body', 'parent_id', 'post_id']);
    await expect(page.locator('[data-comments-count]')).toHaveText('1 comment');
});

test('empty comments are rejected client-side', async ({ page }) => {
    const state = await fakeSupabase(page, { signedIn: true });
    await page.goto(POST);
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.locator('.form-error').first()).toHaveText('Write something first.');
    expect(state.requests.some((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/comments'))).toBe(false);
});

test('rate-limit errors from the database read as plain advice', async ({ page }) => {
    await fakeSupabase(page, {
        signedIn: true,
        failures: { '/rest/v1/comments': { status: 400, body: { code: 'P0001', message: 'RATE_LIMITED: slow down — try again in a minute' } } },
    });
    await page.goto(POST);
    await page.getByPlaceholder(/Add to the discussion/).fill('hello');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.locator('.form-error').first()).toHaveText('Slow down — try again in a minute.');
});

test('own comments offer edit/delete; others offer report; depth limit hides reply', async ({ page }) => {
    await fakeSupabase(page, {
        signedIn: true,
        comments: [
            commentRow('mine', 'my comment', { author_id: USER_ID, username: 'reader', display_name: 'Rea Der' }),
            commentRow('theirs', 'their comment', { created_at: '2026-01-20T12:00:00Z' }),
            commentRow('deep', 'deep reply', { parent_id: 'theirs', depth: 2, created_at: '2026-01-20T13:00:00Z' }),
        ],
    });
    await page.goto(POST);
    const mine = page.locator('#comment-mine > article .comment-actions');
    await expect(mine).toContainText('Edit');
    await expect(mine).toContainText('Delete');
    await expect(mine).not.toContainText('Report');
    const theirs = page.locator('#comment-theirs > article .comment-actions');
    await expect(theirs).toContainText('Report');
    await expect(theirs).not.toContainText('Edit');
    await expect(page.locator('#comment-deep > article .comment-actions')).not.toContainText('Reply');
});

test('banned users see a notice instead of the composer', async ({ page }) => {
    await fakeSupabase(page, { signedIn: true, banned: true });
    await page.goto(POST);
    await expect(page.locator('[data-composer-slot]')).toContainText('can’t post comments');
});

test('posts not yet registered say so instead of failing', async ({ page }) => {
    await fakeSupabase(page, { postRegistered: false });
    await page.goto(POST);
    await expect(page.locator('[data-composer-slot]')).toContainText('opens once this post is live');
});

test('like button reflects count and asks signed-out readers to sign in', async ({ page }) => {
    await fakeSupabase(page);
    await page.goto(POST);
    const like = page.locator('[data-like]');
    await expect(like).toBeVisible();
    await expect(like).toContainText('3');
    await like.click();
    await expect(page).toHaveURL(/\/blog\/signin\//);
});

test('a database outage shows an error instead of hanging or misleading', async ({ page }) => {
    await fakeSupabase(page, { failures: { '/rest/v1/posts': { status: 500, body: { message: 'Internal error' } } } });
    await page.goto(POST);
    await expect(page.locator('[data-composer-slot] .notice--error')).toContainText('Couldn’t load the discussion');
    // The article itself is unaffected.
    await expect(page.locator('h1')).toHaveText('Fixture: a fluid simulation in C++');
});

test('comments the author liked carry a "Liked by author" tag', async ({ page }) => {
    await fakeSupabase(page, {
        comments: [
            commentRow('a', 'author liked this', { like_count: 1, liked_by_author: true }),
            commentRow('b', 'nobody liked this', { created_at: '2026-01-20T11:00:00Z' }),
        ],
    });
    await page.goto(POST);
    await expect(page.locator('#comment-a .author-liked')).toBeVisible();
    await expect(page.locator('#comment-a .author-liked')).toHaveText(/Liked by author/);
    await expect(page.locator('#comment-b .author-liked')).toBeHidden();
});

test('the tag follows the admin\'s own like as they click', async ({ page }) => {
    const state = await fakeSupabase(page, { signedIn: true, isAdmin: true, comments: [commentRow('a', 'great point')] });
    await page.goto(POST);
    const like = page.locator('#comment-a .comment-actions button').first();
    const tag = page.locator('#comment-a .author-liked');
    await expect(tag).toBeHidden();
    await like.click();
    await expect(tag).toBeVisible();
    expect(state.requests.some((r) => r.method === 'POST' && r.path.startsWith('/rest/v1/comment_likes'))).toBe(true);
    await like.click();
    await expect(tag).toBeHidden();
});

test('a normal reader\'s like does not add the tag', async ({ page }) => {
    await fakeSupabase(page, { signedIn: true, comments: [commentRow('a', 'great point')] });
    await page.goto(POST);
    await page.locator('#comment-a .comment-actions button').first().click();
    await expect(page.locator('#comment-a .comment-actions button').first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#comment-a .author-liked')).toBeHidden();
});

test('each comment, replies included, sits in an outlined box', async ({ page }) => {
    await fakeSupabase(page, {
        comments: [
            commentRow('a', 'top'),
            commentRow('b', 'reply', { parent_id: 'a', depth: 1, created_at: '2026-01-20T11:00:00Z' }),
        ],
    });
    await page.goto(POST);
    for (const id of ['a', 'b']) {
        const box = page.locator(`#comment-${id} > article.comment`);
        await expect(box).toHaveCSS('border-top-width', '1px');
        await expect(box).toHaveCSS('border-top-style', 'solid');
    }
});
