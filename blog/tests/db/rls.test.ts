/**
 * Row Level Security, grants and triggers, exercised against the real
 * migration in PGlite (Postgres compiled to WASM). Each test plays a role —
 * anon, a signed-in user, another user, an admin — and tries things it should
 * and shouldn't be able to do, the way a client holding the public key would.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { freshDb, type Db } from './harness';

let db: Db;
let admin: string;
let alice: string;
let bob: string;
let postId: string;

async function comment(who: string, body: string, parent: string | null = null, post = postId) {
    const rows = await db.as<{ id: string }>(
        who,
        `insert into public.comments (post_id, parent_id, body) values ($1, $2, $3) returning id`,
        [post, parent, body],
    );
    return rows[0].id;
}

beforeEach(async () => {
    db = await freshDb();
    admin = await db.createUser({ user_name: 'Ryan' });
    alice = await db.createUser({ user_name: 'alice', full_name: 'Alice A' });
    bob = await db.createUser({}, 'bob@example.com');
    await db.makeAdmin(admin);
    await db.as(admin, `select public.sync_posts($1)`, [
        JSON.stringify([{ slug: 'first-post', title: 'First post' }]),
    ]);
    postId = (await db.as<{ id: string }>('owner', `select id from public.posts where slug = 'first-post'`))[0].id;
});

describe('profiles', () => {
    it('are created on sign-up with a sanitized, unique username', async () => {
        const dup = await db.createUser({ user_name: 'alice' });
        const rows = await db.as<{ id: string; username: string; display_name: string }>(
            null, `select id, username, display_name from public.profiles order by created_at`);
        const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
        expect(byId[alice].username).toBe('alice');
        expect(byId[alice].display_name).toBe('Alice A');
        expect(byId[bob].username).toBe('bob');
        expect(byId[dup].username).toBe('alice1');
    });

    it('drop provider avatars from hosts outside the allow-list', async () => {
        const ok = await db.createUser({ avatar_url: 'https://avatars.githubusercontent.com/u/1' });
        const evil = await db.createUser({ avatar_url: 'https://evil.example/pixel.gif' });
        const rows = await db.as<{ id: string; provider_avatar_url: string | null }>(
            null, `select id, provider_avatar_url from public.profiles where id in ($1, $2)`, [ok, evil]);
        const m = Object.fromEntries(rows.map((r) => [r.id, r.provider_avatar_url]));
        expect(m[ok]).toBe('https://avatars.githubusercontent.com/u/1');
        expect(m[evil]).toBeNull();
    });

    it('can be edited by their owner only', async () => {
        await db.as(alice, `update public.profiles set bio = 'hi' where id = $1`, [alice]);
        // Bob's update silently matches zero rows under RLS.
        await db.as(bob, `update public.profiles set bio = 'pwned' where id = $1`, [alice]);
        await db.as(null, `update public.profiles set bio = 'anon' where id = $1`, [alice]).catch(() => {});
        const [row] = await db.as<{ bio: string }>(null, `select bio from public.profiles where id = $1`, [alice]);
        expect(row.bio).toBe('hi');
    });

    it('do not let users write protected columns', async () => {
        expect(await db.fails(alice,
            `update public.profiles set provider_avatar_url = 'https://avatars.githubusercontent.com/x' where id = $1`, [alice]))
            .toMatch(/permission denied/);
        expect(await db.fails(alice,
            `update public.profiles set username_changed_at = null where id = $1`, [alice]))
            .toMatch(/permission denied/);
        expect(await db.fails(alice, `insert into public.profiles (id, username, display_name) values ($1, 'x_x', 'x')`, [bob]))
            .toMatch(/permission denied/);
    });

    it('only accept avatar paths inside the owner folder', async () => {
        expect(await db.fails(alice, `update public.profiles set avatar_path = $2 where id = $1`, [alice, `${bob}/a.webp`]))
            .toMatch(/check constraint/);
        expect(await db.fails(alice, `update public.profiles set avatar_path = $2 where id = $1`, [alice, `${alice}/a.webp`]))
            .toBeNull();
    });

    it('enforce the username format and a 30-day change cooldown', async () => {
        expect(await db.fails(alice, `update public.profiles set username = 'Bad Name' where id = $1`, [alice]))
            .toMatch(/check constraint/);
        expect(await db.fails(alice, `update public.profiles set username = 'bob' where id = $1`, [alice]))
            .toMatch(/unique/);
        expect(await db.fails(alice, `update public.profiles set username = 'alice_new' where id = $1`, [alice])).toBeNull();
        expect(await db.fails(alice, `update public.profiles set username = 'alice_again' where id = $1`, [alice]))
            .toMatch(/USERNAME_COOLDOWN/);
    });
});

describe('roles', () => {
    it('cannot be self-granted', async () => {
        expect(await db.fails(alice, `insert into public.user_roles (user_id, role) values ($1, 'admin')`, [alice]))
            .toMatch(/permission denied/);
        expect(await db.fails(alice, `update public.user_roles set user_id = $1`, [alice]))
            .toMatch(/permission denied/);
        const [r] = await db.as<{ is_admin: boolean }>(alice, `select public.is_admin()`);
        expect(r.is_admin).toBe(false);
    });

    it('are visible only to their holder', async () => {
        expect(await db.as(alice, `select * from public.user_roles`)).toHaveLength(0);
        expect(await db.fails(null, `select * from public.user_roles`)).toMatch(/permission denied/);
        expect(await db.as(admin, `select * from public.user_roles`)).toHaveLength(1);
    });
});

describe('posts registry', () => {
    it('is read-only for non-admins', async () => {
        expect(await db.fails(alice, `insert into public.posts (slug, title) values ('x', 'x')`)).toMatch(/row-level security/);
        expect(await db.fails(null, `insert into public.posts (slug, title) values ('x', 'x')`)).toMatch(/permission denied/);
        await db.as(alice, `update public.posts set title = 'hacked'`);
        await db.as(alice, `delete from public.posts`);
        const [p] = await db.as<{ title: string }>(null, `select title from public.posts where id = $1`, [postId]);
        expect(p.title).toBe('First post');
        expect(await db.fails(alice, `select public.sync_posts('[]'::jsonb)`)).toMatch(/FORBIDDEN/);
        expect(await db.fails(null, `select public.sync_posts('[]'::jsonb)`)).toMatch(/permission denied/);
    });

    it('sync adds, retitles and unpublishes without deleting', async () => {
        const [r] = await db.as<{ sync_posts: Record<string, number> }>(admin, `select public.sync_posts($1)`, [
            JSON.stringify([{ slug: 'second', title: 'Second' }]),
        ]);
        expect(r.sync_posts).toEqual({ added: 1, updated: 0, unpublished: 1 });
        const visible = await db.as<{ slug: string }>(null, `select slug from public.posts`);
        expect(visible.map((p) => p.slug)).toEqual(['second']);
        // Unpublished rows still exist for the admin.
        expect(await db.as(admin, `select slug from public.posts`)).toHaveLength(2);
    });
});

describe('comments', () => {
    it('cannot be created anonymously', async () => {
        expect(await db.fails(null, `insert into public.comments (post_id, body) values ($1, 'hi')`, [postId]))
            .toMatch(/permission denied/);
    });

    it('are always attributed to the caller, whatever the client sends', async () => {
        expect(await db.fails(alice, `insert into public.comments (post_id, body, author_id) values ($1, 'x', $2)`, [postId, bob]))
            .toMatch(/permission denied/);
        const id = await comment(alice, 'hello');
        const [c] = await db.as<{ author_id: string; status: string }>(null, `select author_id, status from public.comments where id = $1`, [id]);
        expect(c.author_id).toBe(alice);
        expect(c.status).toBe('visible');
    });

    it('cannot set moderation fields on insert or update', async () => {
        expect(await db.fails(alice, `insert into public.comments (post_id, body, status) values ($1, 'x', 'hidden')`, [postId]))
            .toMatch(/permission denied/);
        const id = await comment(alice, 'hello');
        expect(await db.fails(alice, `update public.comments set status = 'hidden' where id = $1`, [id])).toMatch(/permission denied/);
        expect(await db.fails(alice, `update public.comments set post_id = $2 where id = $1`, [id, postId])).toMatch(/permission denied/);
    });

    it('can be edited only by their author, and record the edit', async () => {
        const id = await comment(alice, 'first draft');
        await db.as(bob, `update public.comments set body = 'bob was here' where id = $1`, [id]);
        let [c] = await db.as<{ body: string; edited_at: string | null }>(null, `select body, edited_at from public.comments where id = $1`, [id]);
        expect(c.body).toBe('first draft');
        expect(c.edited_at).toBeNull();
        await db.as(alice, `update public.comments set body = 'second draft' where id = $1`, [id]);
        [c] = await db.as(null, `select body, edited_at from public.comments where id = $1`, [id]);
        expect(c.body).toBe('second draft');
        expect(c.edited_at).not.toBeNull();
    });

    it('can be deleted by the author or an admin, not by others', async () => {
        const id = await comment(alice, 'bye');
        expect(await db.fails(bob, `select public.delete_comment($1)`, [id])).toMatch(/FORBIDDEN/);
        expect(await db.fails(alice, `delete from public.comments where id = $1`, [id])).toMatch(/permission denied/);
        await db.as(alice, `select public.delete_comment($1)`, [id]);
        expect(await db.as('owner', `select 1 from public.comments where id = $1`, [id])).toHaveLength(0);

        const id2 = await comment(bob, 'rude');
        await db.as(admin, `select public.delete_comment($1)`, [id2]);
        expect(await db.as('owner', `select 1 from public.comments where id = $1`, [id2])).toHaveLength(0);
    });

    it('nest replies up to depth 2 and keep them on the same post', async () => {
        const a = await comment(alice, 'root');
        const b = await comment(bob, 'reply', a);
        const c = await comment(alice, 'reply to reply', b);
        const depths = await db.as<{ id: string; depth: number }>(null, `select id, depth from public.comments`);
        expect(Object.fromEntries(depths.map((d) => [d.id, d.depth]))).toEqual({ [a]: 0, [b]: 1, [c]: 2 });
        expect(await db.fails(bob, `insert into public.comments (post_id, parent_id, body) values ($1, $2, 'too deep')`, [postId, c]))
            .toMatch(/TOO_DEEP/);

        await db.as(admin, `select public.sync_posts($1)`, [
            JSON.stringify([{ slug: 'first-post', title: 'First post' }, { slug: 'other', title: 'Other' }]),
        ]);
        const [other] = await db.as<{ id: string }>(null, `select id from public.posts where slug = 'other'`);
        expect(await db.fails(bob, `insert into public.comments (post_id, parent_id, body) values ($1, $2, 'cross')`, [other.id, a]))
            .toMatch(/INVALID_PARENT/);
    });

    it('scrub to a placeholder when deleted with replies, without leaking text', async () => {
        const root = await comment(alice, 'secret root text');
        await comment(bob, 'a reply', root);
        await db.as(alice, `select public.delete_comment($1)`, [root]);
        const rows = await db.as<{ id: string; body: string | null; is_removed: boolean; username: string | null }>(
            null, `select * from public.get_post_comments($1)`, [postId]);
        expect(rows).toHaveLength(2);
        const r = rows.find((x) => x.id === root)!;
        expect(r.is_removed).toBe(true);
        expect(r.body).toBeNull();
        expect(r.username).toBeNull();
        expect(JSON.stringify(rows)).not.toContain('secret root text');
    });

    it('enforce body length', async () => {
        expect(await db.fails(alice, `insert into public.comments (post_id, body) values ($1, '   ')`, [postId])).toMatch(/comment_body_length/);
        expect(await db.fails(alice, `insert into public.comments (post_id, body) values ($1, repeat('a', 4001))`, [postId])).toMatch(/comment_body_length/);
    });

    it('are rate limited and de-duplicated', async () => {
        await comment(alice, 'one');
        expect(await db.fails(alice, `insert into public.comments (post_id, body) values ($1, 'one')`, [postId])).toMatch(/DUPLICATE/);
        await comment(alice, 'two');
        await comment(alice, 'three');
        expect(await db.fails(alice, `insert into public.comments (post_id, body) values ($1, 'four')`, [postId])).toMatch(/RATE_LIMITED/);
        // Someone else is unaffected.
        await comment(bob, 'one');
    });

    it('are closed on unpublished or locked posts', async () => {
        await db.as(admin, `update public.posts set comments_locked = true where id = $1`, [postId]);
        expect(await db.fails(alice, `insert into public.comments (post_id, body) values ($1, 'x')`, [postId])).toMatch(/row-level security/);
        await db.as(admin, `update public.posts set comments_locked = false, published = false where id = $1`, [postId]);
        expect(await db.fails(alice, `insert into public.comments (post_id, body) values ($1, 'x')`, [postId])).toMatch(/row-level security/);
    });

    it('on unpublished posts are not publicly readable', async () => {
        await comment(alice, 'hello');
        await db.as(admin, `update public.posts set published = false where id = $1`, [postId]);
        expect(await db.as(null, `select * from public.comments`)).toHaveLength(0);
        expect(await db.as(null, `select * from public.get_post_comments($1)`, [postId])).toHaveLength(0);
        // The author still sees their own.
        expect(await db.as(alice, `select * from public.comments`)).toHaveLength(1);
    });

    it('page by top-level comment, with replies attached', async () => {
        const roots: string[] = [];
        for (const who of [alice, bob, admin]) roots.push(await comment(who, `root by ${who}`));
        await comment(bob, 'reply', roots[0]);
        const page = await db.as<{ id: string; ts: string; parent_id: string | null }>(
            null, `select *, created_at::text as ts from public.get_post_comments($1, null, null, 2)`, [postId]);
        expect(page.filter((r) => !r.parent_id)).toHaveLength(2);
        expect(page).toHaveLength(3);
        const last = page.filter((r) => !r.parent_id).at(-1)!;
        const next = await db.as<{ id: string; parent_id: string | null }>(null, `select * from public.get_post_comments($1, $2::timestamptz, $3, 2)`, [postId, last.ts, last.id]);
        const all = new Set([...page.map((r) => r.id), ...next.map((r) => r.id)]);
        expect(next.filter((r) => !r.parent_id)).toHaveLength(1);
        for (const id of roots) expect(all.has(id)).toBe(true);
    });
});

describe('banned users', () => {
    it('cannot comment, like, report or edit their profile', async () => {
        const id = await comment(alice, 'before ban');
        await db.as(admin, `select public.set_user_ban($1, true, 'spam')`, [bob]);
        expect(await db.fails(bob, `insert into public.comments (post_id, body) values ($1, 'x')`, [postId])).toMatch(/row-level security/);
        expect(await db.fails(bob, `insert into public.post_likes (post_id) values ($1)`, [postId])).toMatch(/row-level security/);
        expect(await db.fails(bob, `insert into public.comment_reports (comment_id, reason) values ($1, 'spam')`, [id])).toMatch(/row-level security/);
        await db.as(bob, `update public.profiles set bio = 'spam' where id = $1`, [bob]);
        const [p] = await db.as<{ bio: string }>(null, `select bio from public.profiles where id = $1`, [bob]);
        expect(p.bio).toBe('');

        await db.as(admin, `select public.set_user_ban($1, false)`, [bob]);
        await comment(bob, 'after unban');
    });

    it('bans are admin-only, private, and cannot target admins', async () => {
        expect(await db.fails(alice, `select public.set_user_ban($1, true)`, [bob])).toMatch(/FORBIDDEN/);
        expect(await db.fails(alice, `insert into public.user_moderation (user_id, banned_at) values ($1, now())`, [bob])).toMatch(/permission denied/);
        expect(await db.fails(admin, `select public.set_user_ban($1, true)`, [admin])).toMatch(/admins cannot be banned/);
        await db.as(admin, `select public.set_user_ban($1, true, 'x')`, [bob]);
        expect(await db.as(alice, `select * from public.user_moderation`)).toHaveLength(0);
        expect(await db.fails(null, `select * from public.user_moderation`)).toMatch(/permission denied/);
        expect(await db.fails(alice, `select * from public.banned_identities`)).toMatch(/permission denied/);
        expect(await db.fails(alice, `select public.identity_keys($1)`, [bob])).toMatch(/permission denied/);
    });

    describe('survive deleting the account and signing up again', () => {
        const canParticipate = async (who: string) =>
            (await db.as<{ can_participate: boolean }>(who, `select public.can_participate()`))[0].can_participate;
        const bobIdentity = async () => {
            const [r] = await db.as<{ provider_id: string; email: string }>('owner',
                `select i.provider_id, u.email from auth.identities i join auth.users u on u.id = i.user_id where u.id = $1`, [bob]);
            return r;
        };

        it('with the same Google account', async () => {
            const { provider_id } = await bobIdentity();
            await db.as(admin, `select public.set_user_ban($1, true, 'spam')`, [bob]);
            await db.as(bob, `select public.delete_my_account()`);
            const bob2 = await db.createUser({ user_name: 'bob' }, 'new-address@example.com', { sub: provider_id });
            expect(await canParticipate(bob2)).toBe(false);
            const [m] = await db.as<{ ban_reason: string }>(admin, `select ban_reason from public.user_moderation where user_id = $1`, [bob2]);
            expect(m.ban_reason).toBe('spam');
        });

        it('with the same email on a different sign-in', async () => {
            const { email } = await bobIdentity();
            await db.as(admin, `select public.set_user_ban($1, true)`, [bob]);
            await db.as(bob, `select public.delete_my_account()`);
            const bob2 = await db.createUser({ user_name: 'bob' }, email.toUpperCase(), { sub: 'some-other-google-account' });
            expect(await canParticipate(bob2)).toBe(false);
        });

        it('but not once they were unbanned', async () => {
            const { provider_id } = await bobIdentity();
            await db.as(admin, `select public.set_user_ban($1, true)`, [bob]);
            await db.as(admin, `select public.set_user_ban($1, false)`, [bob]);
            await db.as(bob, `select public.delete_my_account()`);
            const bob2 = await db.createUser({ user_name: 'bob' }, undefined, { sub: provider_id });
            expect(await canParticipate(bob2)).toBe(true);
        });

        it('and unbanning the new account clears it for good', async () => {
            const { provider_id } = await bobIdentity();
            await db.as(admin, `select public.set_user_ban($1, true)`, [bob]);
            await db.as(bob, `select public.delete_my_account()`);
            const bob2 = await db.createUser({ user_name: 'bob' }, undefined, { sub: provider_id });
            await db.as(admin, `select public.set_user_ban($1, false)`, [bob2]);
            expect(await canParticipate(bob2)).toBe(true);
            expect(await db.as('owner', `select * from public.banned_identities`)).toHaveLength(0);
        });
    });
});

describe('likes', () => {
    it('are one per user, owned by the caller, and private', async () => {
        await db.as(alice, `insert into public.post_likes (post_id) values ($1)`, [postId]);
        expect(await db.fails(alice, `insert into public.post_likes (post_id) values ($1)`, [postId])).toMatch(/duplicate key/);
        expect(await db.fails(alice, `insert into public.post_likes (post_id, user_id) values ($1, $2)`, [postId, bob])).toMatch(/permission denied/);
        expect(await db.fails(null, `insert into public.post_likes (post_id) values ($1)`, [postId])).toMatch(/permission denied/);
        expect(await db.as(bob, `select * from public.post_likes`)).toHaveLength(0);
        const [c] = await db.as<{ post_like_count: number }>(null, `select public.post_like_count($1)`, [postId]);
        expect(c.post_like_count).toBe(1);
        await db.as(bob, `delete from public.post_likes`); // can't remove alice's
        await db.as(alice, `delete from public.post_likes where post_id = $1`, [postId]);
        const [c2] = await db.as<{ post_like_count: number }>(null, `select public.post_like_count($1)`, [postId]);
        expect(c2.post_like_count).toBe(0);
    });

    it('on comments show up in thread counts', async () => {
        const id = await comment(alice, 'likeable');
        await db.as(bob, `insert into public.comment_likes (comment_id) values ($1)`, [id]);
        const [row] = await db.as<{ like_count: number; liked_by_me: boolean }>(bob, `select * from public.get_post_comments($1)`, [postId]);
        expect(row.like_count).toBe(1);
        expect(row.liked_by_me).toBe(true);
        const [anonRow] = await db.as<{ liked_by_me: boolean }>(null, `select * from public.get_post_comments($1)`, [postId]);
        expect(anonRow.liked_by_me).toBe(false);
    });

    it('on comments flag when the author (an admin) liked them', async () => {
        const id = await comment(alice, 'nice post');
        const flag = async () => (await db.as<{ liked_by_author: boolean }>(null, `select * from public.get_post_comments($1)`, [postId]))[0].liked_by_author;
        await db.as(bob, `insert into public.comment_likes (comment_id) values ($1)`, [id]);
        expect(await flag()).toBe(false);
        await db.as(admin, `insert into public.comment_likes (comment_id) values ($1)`, [id]);
        expect(await flag()).toBe(true);
        await db.as(admin, `delete from public.comment_likes where comment_id = $1`, [id]);
        expect(await flag()).toBe(false);
    });
});

describe('reports', () => {
    it('are private to the reporter and admins', async () => {
        const id = await comment(alice, 'questionable');
        await db.as(bob, `insert into public.comment_reports (comment_id, reason) values ($1, 'spam')`, [id]);
        expect(await db.as(alice, `select * from public.comment_reports`)).toHaveLength(0);
        expect(await db.as(bob, `select * from public.comment_reports`)).toHaveLength(1);
        expect(await db.as(admin, `select * from public.comment_reports`)).toHaveLength(1);
        expect(await db.fails(bob, `update public.comment_reports set resolved_at = now()`)).toMatch(/permission denied/);
    });

    it('reject self-reports and spoofed reporters', async () => {
        const id = await comment(alice, 'mine');
        expect(await db.fails(alice, `insert into public.comment_reports (comment_id, reason) values ($1, 'spam')`, [id])).toMatch(/your own comment/);
        expect(await db.fails(bob, `insert into public.comment_reports (comment_id, reason, reporter_id) values ($1, 'spam', $2)`, [id, admin]))
            .toMatch(/permission denied/);
    });

    it('hide a comment automatically at three, and an admin can restore it', async () => {
        const id = await comment(alice, 'controversial');
        const carol = await db.createUser({ user_name: 'carol' });
        const dave = await db.createUser({ user_name: 'dave' });
        for (const who of [bob, carol, dave]) {
            await db.as(who, `insert into public.comment_reports (comment_id, reason) values ($1, 'spam')`, [id]);
        }
        expect(await db.as(null, `select * from public.comments where id = $1`, [id])).toHaveLength(0);
        await db.as(admin, `select public.moderate_comment($1, 'restore')`, [id]);
        expect(await db.as(null, `select * from public.comments where id = $1`, [id])).toHaveLength(1);
        const open = await db.as(admin, `select * from public.comment_reports where resolved_at is null`);
        expect(open).toHaveLength(0);
    });
});

describe('moderation and admin functions', () => {
    it('are refused to normal users and anon', async () => {
        const id = await comment(alice, 'x');
        for (const sql of [
            `select public.moderate_comment('${id}', 'hide')`,
            `select public.admin_overview()`,
            `select * from public.admin_list_users()`,
        ]) {
            expect(await db.fails(bob, sql)).toMatch(/FORBIDDEN/);
            expect(await db.fails(null, sql)).toMatch(/permission denied/);
        }
    });

    it('hide comments from the public but keep them for the admin', async () => {
        const id = await comment(alice, 'hide me');
        await db.as(admin, `select public.moderate_comment($1, 'hide')`, [id]);
        expect(await db.as(null, `select * from public.comments`)).toHaveLength(0);
        expect(await db.as(bob, `select * from public.get_post_comments($1)`, [postId])).toHaveLength(0);
        expect(await db.as(admin, `select * from public.comments`)).toHaveLength(1);
        // A hidden comment can no longer be edited by its author.
        await db.as(alice, `update public.comments set body = 'sneaky' where id = $1`, [id]);
        const [c] = await db.as<{ body: string }>('owner', `select body from public.comments where id = $1`, [id]);
        expect(c.body).toBe('hide me');
    });

    it('overview and user list return counts, never emails', async () => {
        await comment(alice, 'x');
        const [o] = await db.as<{ admin_overview: Record<string, unknown> }>(admin, `select public.admin_overview()`);
        expect(o.admin_overview.users).toBe(3);
        expect(o.admin_overview.comments).toBe(1);
        const users = await db.as(admin, `select * from public.admin_list_users()`);
        expect(users).toHaveLength(3);
        expect(JSON.stringify(users)).not.toContain('@example.com');
    });

    it('page views count only published posts and are admin-readable only', async () => {
        await db.as(null, `select public.record_view('first-post')`);
        await db.as(null, `select public.record_view('first-post')`);
        await db.as(null, `select public.record_view('nope')`);
        expect(await db.fails(null, `select * from public.post_views_daily`)).toMatch(/permission denied/);
        expect(await db.as(alice, `select * from public.post_views_daily`)).toHaveLength(0);
        const rows = await db.as<{ views: number }>(admin, `select views from public.post_views_daily`);
        expect(rows).toEqual([{ views: 2 }]);
    });
});

describe('account deletion', () => {
    it('removes the account, keeps replied-to comments as placeholders', async () => {
        const lonely = await comment(alice, 'nobody replied');
        const replied = await comment(alice, 'someone replied');
        await comment(bob, 'reply', replied);
        await db.as(alice, `insert into public.post_likes (post_id) values ($1)`, [postId]);

        await db.as(alice, `select public.delete_my_account()`);

        expect(await db.as('owner', `select 1 from auth.users where id = $1`, [alice])).toHaveLength(0);
        expect(await db.as('owner', `select 1 from public.profiles where id = $1`, [alice])).toHaveLength(0);
        expect(await db.as('owner', `select 1 from public.comments where id = $1`, [lonely])).toHaveLength(0);
        const [p] = await db.as<{ body: string; author_id: string | null; deleted_at: string | null }>(
            'owner', `select body, author_id, deleted_at from public.comments where id = $1`, [replied]);
        expect(p).toEqual({ body: '', author_id: null, deleted_at: expect.anything() });
        expect(await db.as('owner', `select 1 from public.post_likes`)).toHaveLength(0);
    });

    it('cannot be used on someone else, and refuses admins', async () => {
        expect(await db.fails(null, `select public.delete_my_account()`)).toMatch(/permission denied/);
        expect(await db.fails(admin, `select public.delete_my_account()`)).toMatch(/admin role/);
    });
});

describe('storage policies', () => {
    it('let users write only inside their own avatar folder', async () => {
        expect(await db.fails(alice, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${alice}/avatar.webp`])).toBeNull();
        expect(await db.fails(alice, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${bob}/avatar.webp`])).toMatch(/row-level security/);
        expect(await db.fails(null, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${alice}/x.webp`])).toMatch(/row-level security/);
        await db.as(bob, `delete from storage.objects`);
        expect(await db.as('owner', `select 1 from storage.objects`)).toHaveLength(1);
    });

    it('bucket restricts size and type', async () => {
        const [b] = await db.as<{ file_size_limit: number; allowed_mime_types: string[] }>(
            'owner', `select file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars'`);
        expect(Number(b.file_size_limit)).toBe(524288);
        expect(b.allowed_mime_types).not.toContain('image/svg+xml');
    });
});
