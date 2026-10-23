// Admin dashboard. Visibility here is cosmetic: every query and action is
// authorized by the database (is_admin() inside RLS policies and SECURITY
// DEFINER functions), so a non-admin who forces this UI open gets nothing.
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getMe } from '../lib/session';
import { friendlyError } from '../lib/errors';
import { el, toast, confirmDialog } from '../lib/dom';
import { timeAgo } from '../lib/text';

const root = document.querySelector<HTMLElement>('[data-admin]')!;
const nf = new Intl.NumberFormat('en-US');

type BuildPost = { slug: string; title: string; date: string };
type DbPost = { id: string; slug: string; title: string; published: boolean; comments_locked: boolean };
type Overview = {
    users: number; comments: number; hidden: number; open_reports: number; post_likes: number;
    views_30d: number; registered_posts: number; top_posts: { slug: string; title: string; views: number }[];
};

const statTile = (value: number | string, label: string) =>
    el('div', { class: 'stat-tile' }, el('div', { class: 'value' }, typeof value === 'number' ? nf.format(value) : value), el('div', { class: 'label' }, label));

const table = (head: string[], rows: HTMLTableRowElement[], empty: string) =>
    rows.length
        ? el('div', { class: 'table-scroll' }, el('table', { class: 'data-table' },
            el('thead', {}, el('tr', {}, ...head.map((h) => el('th', { scope: 'col' }, h)))),
            el('tbody', {}, ...rows)))
        : el('p', { class: 'muted' }, empty);

async function main() {
    const sb = supabase();
    if (!sb) return root.replaceChildren(el('p', { class: 'notice' }, 'Supabase isn’t configured on this build.'));
    const me = await getMe();
    if (!me) return location.replace(`/blog/signin/?next=${encodeURIComponent('/blog/admin/')}`);
    if (!me.isAdmin) {
        return root.replaceChildren(el('p', { class: 'notice notice--error' }, 'This page is for the site administrator. ',
            el('a', { href: '/blog/' }, 'Back to the blog')));
    }

    const build: BuildPost[] = await fetch('/blog/posts.json').then((r) => r.json()).catch(() => []);
    const ctx = { sb, build };

    const panels: Record<string, () => Promise<HTMLElement>> = {
        Overview: () => overview(ctx),
        Posts: () => postsPanel(ctx),
        Comments: () => commentsPanel(ctx),
        Reports: () => reportsPanel(ctx),
        Users: () => usersPanel(ctx),
    };
    const body = el('div', { role: 'tabpanel', id: 'admin-panel' });
    const tabs = el('div', { class: 'admin-tabs', role: 'tablist', 'aria-label': 'Admin sections' });

    async function show(name: string) {
        for (const b of tabs.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
        body.replaceChildren(el('p', { class: 'muted' }, 'Loading…'));
        try {
            body.replaceChildren(await panels[name]());
        } catch (e) {
            body.replaceChildren(el('p', { class: 'notice notice--error' }, friendlyError(e)));
        }
        try { sessionStorage.setItem('admin:tab', name); } catch { /* ignore */ }
    }
    for (const name of Object.keys(panels)) {
        tabs.appendChild(el('button', { type: 'button', role: 'tab', 'data-tab': name, 'aria-controls': 'admin-panel', onclick: () => show(name) }, name));
    }
    root.replaceChildren(tabs, body);

    // Keep the registry in step with what's deployed, silently.
    await syncPosts(ctx, false);

    const { data: o } = await sb.rpc('admin_overview');
    const open = (o as Overview | null)?.open_reports ?? 0;
    if (open) tabs.querySelector('[data-tab="Reports"]')!.appendChild(el('span', { class: 'badge-count' }, String(open)));

    let initial = 'Overview';
    try { initial = sessionStorage.getItem('admin:tab') ?? initial; } catch { /* ignore */ }
    show(panels[initial] ? initial : 'Overview');
}

interface Ctx { sb: SupabaseClient; build: BuildPost[] }

async function syncPosts({ sb, build }: Ctx, loud: boolean) {
    if (!build.length && !loud) return;
    const { data, error } = await sb.rpc('sync_posts', { p_posts: build.map(({ slug, title }) => ({ slug, title })) });
    if (error) { toast(friendlyError(error)); return; }
    const r = data as { added: number; updated: number; unpublished: number };
    if (loud || r.added || r.unpublished) {
        toast(`Posts synced — ${r.added} added, ${r.updated} updated, ${r.unpublished} unpublished.`);
    }
}

// ── Overview ──────────────────────────────────────────────────────────────
async function overview({ sb, build }: Ctx) {
    const [{ data, error }, recent] = await Promise.all([
        sb.rpc('admin_overview'),
        sb.from('comments').select('id, body, created_at, status, deleted_at, posts(slug, title), profiles!comments_author_id_fkey(username, display_name)')
            .order('created_at', { ascending: false }).limit(8),
    ]);
    if (error) throw error;
    const o = data as Overview;
    return el('div', { class: 'stack', style: 'gap:32px' },
        el('div', { class: 'stat-grid' },
            statTile(build.length, 'Published posts'),
            statTile(o.users, 'Registered users'),
            statTile(o.comments, 'Comments'),
            statTile(o.open_reports, 'Open reports'),
            statTile(o.post_likes, 'Post likes'),
            statTile(o.views_30d, 'Views · 30 days')),
        el('p', { class: 'muted' }, 'Drafts aren’t counted: they only exist in your local checkout until you publish them (see README → Publishing).'),
        el('section', {},
            el('div', { class: 'section-label' }, 'Most read · 30 days'),
            table(['Post', 'Views'], o.top_posts.map((p) => el('tr', {},
                el('td', {}, el('a', { href: `/blog/${p.slug}/` }, p.title)), el('td', { class: 'num' }, nf.format(p.views)))), 'No views recorded yet.')),
        el('section', {},
            el('div', { class: 'section-label' }, 'Recent activity'),
            table(['Comment', 'By', 'On', 'When'], ((recent.data ?? []) as unknown as RecentRow[]).map((c) => el('tr', {},
                el('td', { class: 'clip' }, c.deleted_at ? el('em', { class: 'muted' }, 'deleted') : truncate(c.body, 140),
                    c.status === 'hidden' ? el('span', { class: 'pill pill--warn', style: 'margin-left:8px' }, 'hidden') : ''),
                el('td', {}, c.profiles ? `@${c.profiles.username}` : '—'),
                el('td', {}, c.posts ? el('a', { href: `/blog/${c.posts.slug}/#comment-${c.id}` }, c.posts.title) : '—'),
                el('td', {}, timeAgo(c.created_at)))), 'No comments yet.')),
    );
}

type RecentRow = { id: string; body: string; created_at: string; status: string; deleted_at: string | null;
    posts: { slug: string; title: string } | null; profiles: { username: string; display_name: string } | null };

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

// ── Posts ─────────────────────────────────────────────────────────────────
async function postsPanel(ctx: Ctx) {
    const { sb, build } = ctx;
    const [{ data: dbPosts, error }, { data: counts }, { data: views }] = await Promise.all([
        sb.from('posts').select('id, slug, title, published, comments_locked').order('created_at', { ascending: false }),
        sb.rpc('comment_counts', { p_slugs: build.map((b) => b.slug) }),
        sb.from('post_views_daily').select('post_id, views').gte('day', new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)),
    ]);
    if (error) throw error;
    const reg = new Map((dbPosts as DbPost[]).map((p) => [p.slug, p]));
    const countMap = new Map(((counts ?? []) as { slug: string; comments: number; likes: number }[]).map((c) => [c.slug, c]));
    const viewMap = new Map<string, number>();
    for (const v of (views ?? []) as { post_id: string; views: number }[]) viewMap.set(v.post_id, (viewMap.get(v.post_id) ?? 0) + v.views);

    const slugs = [...new Set([...build.map((b) => b.slug), ...reg.keys()])];
    const search = el('input', { type: 'search', placeholder: 'Filter posts…', 'aria-label': 'Filter posts' });
    const tbodyWrap = el('div');

    const render = () => {
        const q = search.value.trim().toLowerCase();
        const rows = slugs
            .map((slug) => ({ slug, b: build.find((x) => x.slug === slug), d: reg.get(slug) }))
            .filter(({ slug, b, d }) => !q || slug.includes(q) || (b?.title ?? d?.title ?? '').toLowerCase().includes(q))
            .map(({ slug, b, d }) => {
                const state = !d ? el('span', { class: 'pill' }, 'not synced')
                    : d.published ? el('span', { class: 'pill pill--ok' }, 'live')
                    : el('span', { class: 'pill pill--warn' }, 'unpublished');
                const c = countMap.get(slug);
                const lock = d ? el('button', {
                    class: 'btn btn--sm', type: 'button',
                    onclick: async () => {
                        const { error: e } = await sb.from('posts').update({ comments_locked: !d.comments_locked }).eq('id', d.id);
                        if (e) return toast(friendlyError(e));
                        d.comments_locked = !d.comments_locked;
                        toast(d.comments_locked ? 'Comments closed' : 'Comments reopened');
                        render();
                    },
                }, d.comments_locked ? 'Reopen comments' : 'Close comments') : null;
                return el('tr', {},
                    el('td', {}, b ? el('a', { href: `/blog/${slug}/` }, b.title) : (d?.title ?? slug), el('div', { class: 'muted' }, slug)),
                    el('td', {}, state, d?.comments_locked ? el('span', { class: 'pill', style: 'margin-left:6px' }, 'closed') : ''),
                    el('td', { class: 'num' }, d ? nf.format(viewMap.get(d.id) ?? 0) : '—'),
                    el('td', { class: 'num' }, nf.format(c?.comments ?? 0)),
                    el('td', { class: 'num' }, nf.format(c?.likes ?? 0)),
                    el('td', {}, el('div', { class: 'row-actions' }, lock)));
            });
        tbodyWrap.replaceChildren(table(['Post', 'Status', 'Views 30d', 'Comments', 'Likes', ''], rows, 'No posts yet.'));
    };
    search.addEventListener('input', render);
    render();

    return el('div', {},
        el('div', { class: 'notice', style: 'margin-bottom:20px' },
            'Posts are Markdown files in ', el('code', {}, 'blog/src/content/posts/'),
            ' — write, preview and version them locally, then build and upload (README → Publishing). This table shows what’s deployed and its discussion. A post removed from the site is marked unpublished here; its comments are kept but hidden.'),
        el('div', { class: 'toolbar' }, el('div', { class: 'field' }, search),
            el('button', { class: 'btn', type: 'button', onclick: async () => { await syncPosts(ctx, true); render(); } }, 'Sync now')),
        tbodyWrap);
}

// ── Comments ──────────────────────────────────────────────────────────────
async function commentsPanel({ sb }: Ctx) {
    const PAGE = 30;
    const filter = el('select', { 'aria-label': 'Filter comments' },
        el('option', { value: 'all' }, 'All comments'),
        el('option', { value: 'visible' }, 'Visible'),
        el('option', { value: 'hidden' }, 'Hidden'));
    const search = el('input', { type: 'search', placeholder: 'Search comment text…', 'aria-label': 'Search comments' });
    const list = el('div');
    const moreBtn = el('button', { class: 'btn', type: 'button', hidden: true }, 'Load more');
    let offset = 0;
    let rows: HTMLTableRowElement[] = [];

    async function load(reset: boolean) {
        if (reset) { offset = 0; rows = []; }
        let q = sb.from('comments')
            .select('id, body, created_at, edited_at, status, deleted_at, depth, posts(slug, title), profiles!comments_author_id_fkey(username)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE - 1);
        if (filter.value !== 'all') q = q.eq('status', filter.value);
        const term = search.value.trim();
        if (term) q = q.ilike('body', `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
        const { data, error } = await q;
        if (error) { toast(friendlyError(error)); return; }
        const batch = (data ?? []) as unknown as (RecentRow & { depth: number })[];
        rows.push(...batch.map((c) => commentRow(sb, c, () => load(true))));
        offset += batch.length;
        moreBtn.hidden = batch.length < PAGE;
        list.replaceChildren(table(['Comment', 'Author', 'Post', 'When', ''], rows, 'No comments match.'));
    }
    filter.addEventListener('change', () => load(true));
    let t: ReturnType<typeof setTimeout>;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => load(true), 250); });
    moreBtn.addEventListener('click', () => load(false));
    await load(true);
    return el('div', {}, el('div', { class: 'toolbar' }, el('div', { class: 'field' }, search), filter), list, el('div', { style: 'margin-top:16px' }, moreBtn));
}

function moderationButtons(sb: SupabaseClient, id: string, status: string, after: () => void, withDismiss = false) {
    const act = async (action: string, msg: string, confirmText?: string) => {
        if (confirmText && !(await confirmDialog(confirmText))) return;
        const { error } = await sb.rpc('moderate_comment', { p_comment_id: id, p_action: action });
        if (error) return toast(friendlyError(error));
        toast(msg);
        after();
    };
    return el('div', { class: 'row-actions' },
        status === 'hidden'
            ? el('button', { class: 'btn btn--sm', type: 'button', onclick: () => act('restore', 'Comment restored') }, 'Restore')
            : el('button', { class: 'btn btn--sm', type: 'button', onclick: () => act('hide', 'Comment hidden') }, 'Hide'),
        withDismiss ? el('button', { class: 'btn btn--sm', type: 'button', onclick: () => act('dismiss_reports', 'Reports dismissed') }, 'Dismiss') : null,
        el('button', { class: 'btn btn--sm btn--danger', type: 'button',
            onclick: () => act('delete', 'Comment deleted', 'Permanently delete this comment and every reply under it? Use “Hide” to keep the thread.') }, 'Delete'));
}

function commentRow(sb: SupabaseClient, c: RecentRow, after: () => void) {
    return el('tr', {},
        el('td', { class: 'clip' }, truncate(c.body, 400),
            c.status === 'hidden' ? el('div', {}, el('span', { class: 'pill pill--warn' }, 'hidden')) : ''),
        el('td', {}, c.profiles ? el('a', { href: `/blog/user/?u=${encodeURIComponent(c.profiles.username)}` }, `@${c.profiles.username}`) : '—'),
        el('td', {}, c.posts ? el('a', { href: `/blog/${c.posts.slug}/#comment-${c.id}` }, c.posts.title) : '—'),
        el('td', { title: new Date(c.created_at).toLocaleString() }, timeAgo(c.created_at)),
        el('td', {}, moderationButtons(sb, c.id, c.status, after)));
}

// ── Reports ───────────────────────────────────────────────────────────────
async function reportsPanel({ sb }: Ctx) {
    const wrap = el('div');
    const showResolved = el('input', { type: 'checkbox', id: 'show-resolved' });
    async function load() {
        let q = sb.from('comment_reports')
            .select('id, reason, details, created_at, resolved_at, comment_id, comments(id, body, status, deleted_at, posts(slug, title), profiles!comments_author_id_fkey(username)), profiles!comment_reports_reporter_id_fkey(username)')
            .order('created_at', { ascending: false }).limit(200);
        if (!showResolved.checked) q = q.is('resolved_at', null);
        const { data, error } = await q;
        if (error) throw error;
        type R = { id: string; reason: string; details: string; created_at: string; resolved_at: string | null; comment_id: string;
            comments: (RecentRow & { status: string }) | null; profiles: { username: string } | null };
        const byComment = new Map<string, R[]>();
        for (const r of (data ?? []) as unknown as R[]) {
            const list = byComment.get(r.comment_id) ?? [];
            list.push(r);
            byComment.set(r.comment_id, list);
        }
        const rows = [...byComment.values()].map((reports) => {
            const c = reports[0].comments;
            return el('tr', {},
                el('td', { class: 'clip' }, c ? truncate(c.body, 400) : el('em', { class: 'muted' }, 'comment deleted'),
                    c?.status === 'hidden' ? el('div', {}, el('span', { class: 'pill pill--warn' }, 'hidden')) : ''),
                el('td', {}, c?.profiles ? `@${c.profiles.username}` : '—'),
                el('td', {}, ...reports.map((r) => el('div', { style: 'margin-bottom:6px' },
                    el('span', { class: `pill ${r.resolved_at ? '' : 'pill--accent'}` }, r.reason), ' ',
                    el('span', { class: 'muted' }, `@${r.profiles?.username ?? '?'} · ${timeAgo(r.created_at)}`),
                    r.details ? el('div', { class: 'clip muted' }, r.details) : ''))),
                el('td', {}, c?.posts ? el('a', { href: `/blog/${c.posts.slug}/#comment-${c.id}` }, c.posts.title) : '—'),
                el('td', {}, c ? moderationButtons(sb, c.id, c.status, () => load().catch((e) => toast(friendlyError(e))), true) : ''));
        });
        wrap.replaceChildren(table(['Comment', 'Author', 'Reports', 'Post', ''], rows, showResolved.checked ? 'No reports.' : 'No open reports. 🎉'));
    }
    showResolved.addEventListener('change', () => load().catch((e) => toast(friendlyError(e))));
    await load();
    return el('div', {},
        el('p', { class: 'muted', style: 'margin-bottom:16px' }, 'A comment is hidden automatically once three people report it. Restore clears its reports; Dismiss keeps it visible and closes them.'),
        el('div', { class: 'toolbar' }, el('label', { class: 'field-row', for: 'show-resolved' }, showResolved, 'Show resolved')),
        wrap);
}

// ── Users ─────────────────────────────────────────────────────────────────
async function usersPanel({ sb }: Ctx) {
    const search = el('input', { type: 'search', placeholder: 'Search username or name…', 'aria-label': 'Search users' });
    const wrap = el('div');
    type U = { id: string; username: string; display_name: string; created_at: string; comment_count: number;
        banned_at: string | null; ban_reason: string | null; is_admin: boolean };
    async function load() {
        const { data, error } = await sb.rpc('admin_list_users', { p_search: search.value.trim() || null, p_limit: 100, p_offset: 0 });
        if (error) { toast(friendlyError(error)); return; }
        const rows = ((data ?? []) as U[]).map((u) => el('tr', {},
            el('td', {}, el('a', { href: `/blog/user/?u=${encodeURIComponent(u.username)}` }, u.display_name), el('div', { class: 'muted' }, `@${u.username}`)),
            el('td', {}, u.is_admin ? el('span', { class: 'pill pill--accent' }, 'admin')
                : u.banned_at ? el('span', { class: 'pill pill--warn', title: u.ban_reason ?? '' }, 'suspended')
                : el('span', { class: 'pill pill--ok' }, 'active')),
            el('td', { class: 'num' }, nf.format(u.comment_count)),
            el('td', {}, new Date(u.created_at).toLocaleDateString()),
            el('td', {}, u.is_admin ? '' : el('div', { class: 'row-actions' }, el('button', {
                class: `btn btn--sm ${u.banned_at ? '' : 'btn--danger'}`, type: 'button',
                onclick: async () => {
                    let reason: string | null = null;
                    if (!u.banned_at) {
                        reason = prompt(`Suspend @${u.username}? They’ll be unable to comment, like, report or edit their profile. Reason (private, optional):`, '');
                        if (reason === null) return;
                    }
                    const { error: e } = await sb.rpc('set_user_ban', { p_user_id: u.id, p_banned: !u.banned_at, p_reason: reason });
                    if (e) return toast(friendlyError(e));
                    toast(u.banned_at ? 'User reinstated' : 'User suspended');
                    load();
                },
            }, u.banned_at ? 'Reinstate' : 'Suspend')))));
        wrap.replaceChildren(table(['User', 'Status', 'Comments', 'Joined', ''], rows, 'No users found.'));
    }
    let t: ReturnType<typeof setTimeout>;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); });
    await load();
    return el('div', {},
        el('p', { class: 'muted', style: 'margin-bottom:16px' }, 'Only public profile data is shown here — no emails. Suspending is reversible; to remove someone’s content, delete their comments.'),
        el('div', { class: 'toolbar' }, el('div', { class: 'field' }, search)), wrap);
}

main().catch((e) => root.replaceChildren(el('p', { class: 'notice notice--error' }, friendlyError(e))));
