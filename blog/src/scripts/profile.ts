import { supabase } from '../lib/supabase';
import { PROFILE_COLUMNS, type Profile } from '../lib/session';
import { el, linkifiedText } from '../lib/dom';
import { avatarEl } from '../lib/avatar-el';
import { timeAgo } from '../lib/text';
import { friendlyError } from '../lib/errors';

const sb = supabase();
const root = document.querySelector<HTMLElement>('[data-profile-page]')!;
const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

function notFound() {
    document.title = 'Profile not found · Ryan Lewandowski';
    root.replaceChildren(el('h1', { class: 'page-title' }, 'No such reader'),
        el('p', { class: 'lede' }, 'That profile doesn’t exist, or the account was deleted.'));
}

(async () => {
    const username = (new URLSearchParams(location.search).get('u') ?? '').toLowerCase();
    if (!sb) return root.replaceChildren(el('p', { class: 'notice' }, 'Profiles aren’t configured on this build.'));
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return notFound();

    const { data, error } = await sb.from('profiles').select(PROFILE_COLUMNS).eq('username', username).maybeSingle();
    if (error) return root.replaceChildren(el('p', { class: 'notice notice--error' }, friendlyError(error)));
    if (!data) return notFound();
    const p = data as Profile;
    document.title = `${p.display_name} (@${p.username}) · Ryan Lewandowski`;

    const { data: comments } = await sb.from('comments')
        .select('id, body, created_at, posts!inner(slug, title, published)')
        .eq('author_id', p.id).eq('status', 'visible').is('deleted_at', null).eq('posts.published', true)
        .order('created_at', { ascending: false }).limit(10);

    type Row = { id: string; body: string; created_at: string; posts: { slug: string; title: string } };
    const rows = (comments ?? []) as unknown as Row[];

    root.replaceChildren(
        el('div', { class: 'profile-head' }, avatarEl(p, 'lg'),
            el('div', {}, el('h1', {}, p.display_name),
                el('p', { class: 'muted' }, `@${p.username} · joined ${fmt.format(new Date(p.created_at))}`))),
        p.bio ? el('p', { class: 'profile-bio' }, linkifiedText(p.bio)) : '',
        el('section', { style: 'margin-top:40px' },
            el('div', { class: 'section-label' }, 'Recent comments'),
            rows.length
                ? el('div', { class: 'post-list' }, ...rows.map((r) => el('a', { class: 'post-row', href: `/blog/${r.posts.slug}/#comment-${r.id}` },
                    el('div', { class: 'kicker' }, el('span', { class: 'accent' }, r.posts.title), el('span', {}, timeAgo(r.created_at))),
                    el('p', { class: 'post-row-desc', style: 'white-space:pre-wrap' }, r.body.length > 280 ? r.body.slice(0, 280) + '…' : r.body))))
                : el('p', { class: 'muted' }, 'No comments yet.')),
    );
})();
