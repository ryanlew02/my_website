import type { Page, Route } from '@playwright/test';

export const SUPABASE = 'https://test-project.supabase.co';
export const STORAGE_KEY = 'sb-test-project-auth-token';

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_ID = '22222222-2222-4222-8222-222222222222';
export const POST_ID = '33333333-3333-4333-8333-333333333333';

export const profile = (over: Record<string, unknown> = {}) => ({
    id: USER_ID, username: 'reader', display_name: 'Rea Der', bio: '', avatar_path: null,
    provider_avatar_url: null, created_at: '2026-01-01T00:00:00Z', ...over,
});

export function session(expiresInSec = 3600) {
    const now = Math.floor(Date.now() / 1000);
    return {
        access_token: 'header.' + Buffer.from(JSON.stringify({ sub: USER_ID, exp: now + expiresInSec, role: 'authenticated' })).toString('base64url') + '.sig',
        token_type: 'bearer', expires_in: expiresInSec, expires_at: now + expiresInSec, refresh_token: 'refresh-token',
        user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'reader@example.com',
            app_metadata: { provider: 'github', providers: ['github'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    };
}

export interface FakeState {
    signedIn: boolean;
    isAdmin: boolean;
    banned: boolean;
    postRegistered: boolean;
    comments: Record<string, unknown>[];
    requests: { method: string; path: string; body: unknown }[];
    /** Make a given path respond with this status + body (e.g. simulate a revoked session). */
    failures: Record<string, { status: number; body: unknown }>;
}

/** Route every Supabase request through an in-memory fake. */
export async function fakeSupabase(page: Page, init: Partial<FakeState> = {}) {
    const state: FakeState = {
        signedIn: false, isAdmin: false, banned: false, postRegistered: true,
        comments: [], requests: [], failures: {}, ...init,
    };
    if (state.signedIn) {
        // Seed once per tab, so a sign-out followed by a reload stays signed out.
        await page.addInitScript(([k, v]) => {
            if (sessionStorage.getItem('__seeded')) return;
            sessionStorage.setItem('__seeded', '1');
            localStorage.setItem(k, v);
        }, [STORAGE_KEY, JSON.stringify(session())]);
    }

    await page.route(`${SUPABASE}/**`, async (route: Route) => {
        const req = route.request();
        const url = new URL(req.url());
        const path = url.pathname;
        let body: unknown = null;
        try { body = req.postDataJSON(); } catch { body = req.postData(); }
        state.requests.push({ method: req.method(), path: path + url.search, body });
        const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
        const json = (data: unknown, status = 200) => route.fulfill({
            status, contentType: 'application/json',
            body: JSON.stringify(wantsObject && Array.isArray(data) ? data[0] ?? null : data),
        });

        const fail = state.failures[path];
        if (fail) return json(fail.body, fail.status);

        // ── auth ──
        if (path === '/auth/v1/token') {
            const grant = url.searchParams.get('grant_type');
            if (grant === 'pkce') {
                const b = body as { auth_code?: string; code_verifier?: string };
                if (b.auth_code === 'good-code' && b.code_verifier) { state.signedIn = true; return json(session()); }
                return json({ error: 'invalid_grant', error_description: 'invalid flow state, no valid flow state found', code: 'flow_state_not_found' }, 400);
            }
            if (grant === 'refresh_token') return json(session());
        }
        if (path === '/auth/v1/logout') { state.signedIn = false; return route.fulfill({ status: 204 }); }
        if (path === '/auth/v1/user') return json(session().user);
        if (path === '/auth/v1/otp') return json({});

        // ── rest ──
        // Real PostgREST refuses a bare profiles(...) embed from comments: there
        // are two paths (the author, and comment_likes), so the FK must be named.
        const select = url.searchParams.get('select') ?? '';
        if ((path === '/rest/v1/comments' || path === '/rest/v1/comment_reports') && req.method() === 'GET'
            && /(^|[,(]\s*)profiles\(/.test(select)) {
            return json({ code: 'PGRST201', message: "Could not embed because more than one relationship was found for 'comments' and 'profiles'" }, 300);
        }
        if (path === '/rest/v1/profiles') return json(state.signedIn ? [profile()] : []);
        if (path === '/rest/v1/posts') {
            return json(state.postRegistered ? [{ id: POST_ID, slug: 'fixture-fluid-simulation', title: 'x', published: true, comments_locked: false }] : []);
        }
        if (path === '/rest/v1/rpc/my_account') return json(state.signedIn ? { is_admin: state.isAdmin, banned: state.banned, username_changed_at: null } : null);
        if (path === '/rest/v1/rpc/record_view') return route.fulfill({ status: 204 });
        if (path === '/rest/v1/rpc/post_like_count') return json(3);
        if (path === '/rest/v1/rpc/comment_counts') return json([{ slug: 'fixture-fluid-simulation', comments: state.comments.length, likes: 3 }]);
        if (path === '/rest/v1/rpc/get_post_comments') return json(state.comments);
        if (path === '/rest/v1/comment_likes') {
            if (req.method() === 'POST') return route.fulfill({ status: 201 });
            if (req.method() === 'DELETE') return route.fulfill({ status: 204 });
            return json([]);
        }
        if (path === '/rest/v1/post_likes') {
            if (req.method() === 'POST') return route.fulfill({ status: 201 });
            if (req.method() === 'DELETE') return route.fulfill({ status: 204 });
            return json([]);
        }
        if (path === '/rest/v1/comments' && req.method() === 'POST') {
            const b = body as { body: string; parent_id: string | null };
            const row = { id: `c-${state.comments.length + 1}`, parent_id: b.parent_id, depth: b.parent_id ? 1 : 0, body: b.body,
                created_at: new Date().toISOString(), edited_at: null, author_id: USER_ID };
            state.comments.push({ ...row, is_removed: false, username: 'reader', display_name: 'Rea Der', avatar_path: null,
                provider_avatar_url: null, like_count: 0, liked_by_me: false, liked_by_author: false });
            return json([row], 201);
        }
        if (path === '/rest/v1/rpc/sync_posts') return json({ added: 0, updated: 0, unpublished: 0 });
        if (path === '/rest/v1/rpc/admin_overview') {
            if (!state.isAdmin) return json({ code: '42501', message: 'FORBIDDEN' }, 403);
            return json({ users: 5, comments: 2, hidden: 0, open_reports: 1, post_likes: 3, views_30d: 40, registered_posts: 2, top_posts: [] });
        }
        return json([]);
    });
    return state;
}

/** A comment row as get_post_comments returns it. */
export const commentRow = (id: string, body: string, over: Record<string, unknown> = {}) => ({
    id, parent_id: null, depth: 0, body, is_removed: false, created_at: '2026-01-20T10:00:00Z', edited_at: null,
    author_id: OTHER_ID, username: 'other', display_name: 'Other Person', avatar_path: null,
    provider_avatar_url: null, like_count: 0, liked_by_me: false, liked_by_author: false, ...over,
});
