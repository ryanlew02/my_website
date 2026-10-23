// Article page behavior: like button, share menu, view count, TOC highlight,
// and the discussion below the post.
import { supabase } from '../lib/supabase';
import { getMe } from '../lib/session';
import { postIdFor } from '../lib/post-id';
import { friendlyError } from '../lib/errors';
import { toast } from '../lib/dom';
import { mountComments } from './comments';

const actions = document.querySelector<HTMLElement>('[data-post-actions]');
const slug = actions?.dataset.slug ?? '';
const sb = supabase();

// Back/forward restores a frozen copy of the page without re-running this
// script, so comments, likes and sign-in state could be stale (e.g. comments
// reopened in the admin dashboard still showing "closed"). Reload instead.
addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

// ── Share: native share sheet on phones, otherwise a menu ─────────────────
const share = document.querySelector<HTMLButtonElement>('[data-share]');
const shareMenu = document.getElementById('share-menu');
if (share && shareMenu) {
    const url = share.dataset.url!;
    const setOpen = (open: boolean) => {
        shareMenu.hidden = !open;
        share.setAttribute('aria-expanded', String(open));
        if (open) shareMenu.querySelector<HTMLElement>('a, button')?.focus();
    };
    share.addEventListener('click', async () => {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            try { await navigator.share({ url, title: share.dataset.title }); return; }
            catch (e) { if ((e as Error).name === 'AbortError') return; }
        }
        setOpen(shareMenu.hidden !== false);
    });
    shareMenu.querySelector('[data-copy-link]')?.addEventListener('click', async () => {
        setOpen(false);
        try {
            await navigator.clipboard.writeText(url);
            toast('Link copied');
        } catch {
            prompt('Copy this link:', url);
        }
    });
    shareMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', (e) => {
        if (!shareMenu.hidden && !(e.target as Element).closest('.share')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !shareMenu.hidden) { setOpen(false); share.focus(); }
    });
}

// ── View count: at most once per browser per day ──────────────────────────
if (sb && slug) {
    const key = `viewed:${slug}`;
    const today = new Date().toISOString().slice(0, 10);
    let seen: string | null = null;
    try { seen = localStorage.getItem(key); } catch { /* ignore */ }
    if (seen !== today) {
        sb.rpc('record_view', { p_slug: slug }).then(() => {
            try { localStorage.setItem(key, today); } catch { /* ignore */ }
        });
    }
}

// ── Like ──────────────────────────────────────────────────────────────────
const likeBtn = document.querySelector<HTMLButtonElement>('[data-like]');
async function setupLike() {
    if (!sb || !likeBtn) return;
    const postId = await postIdFor(slug).catch(() => null);
    if (!postId) return;
    const countEl = likeBtn.querySelector<HTMLElement>('[data-like-count]')!;
    const labelEl = likeBtn.querySelector<HTMLElement>('[data-like-label]')!;
    let count = 0;
    let liked = false;

    const paint = () => {
        likeBtn.setAttribute('aria-pressed', String(liked));
        labelEl.textContent = liked ? 'Liked' : 'Like';
        countEl.textContent = count ? ` · ${count}` : '';
        likeBtn.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} this post${count ? ` (${count} likes)` : ''}`);
    };

    const [{ data: c }, me] = await Promise.all([sb.rpc('post_like_count', { p_post_id: postId }), getMe()]);
    count = (c as number) ?? 0;
    if (me) {
        const { data } = await sb.from('post_likes').select('post_id').eq('post_id', postId).maybeSingle();
        liked = Boolean(data);
    }
    paint();
    likeBtn.hidden = false;

    likeBtn.addEventListener('click', async () => {
        const who = await getMe();
        if (!who) {
            location.href = `/blog/signin/?next=${encodeURIComponent(location.pathname)}`;
            return;
        }
        likeBtn.disabled = true;
        const wasLiked = liked;
        liked = !liked;
        count += liked ? 1 : -1;
        paint();
        const { error } = wasLiked
            ? await sb.from('post_likes').delete().eq('post_id', postId)
            : await sb.from('post_likes').insert({ post_id: postId });
        if (error && error.code !== '23505') {
            liked = wasLiked;
            count += liked ? 1 : -1;
            paint();
            toast(friendlyError(error));
        }
        likeBtn.disabled = false;
    });
}
setupLike();

// ── TOC: mark the section being read ──────────────────────────────────────
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc] a')];
if (tocLinks.length && 'IntersectionObserver' in window) {
    const bySlug = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const visible = new Set<string>();
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
        const first = [...bySlug.keys()].find((id) => visible.has(id));
        if (!first) return;
        for (const [id, a] of bySlug) a.classList.toggle('active', id === first);
    }, { rootMargin: '-80px 0px -65% 0px' });
    for (const id of bySlug.keys()) {
        const h = document.getElementById(id);
        if (h) io.observe(h);
    }
    // Collapse the TOC by default on narrow screens.
    const toc = document.querySelector<HTMLDetailsElement>('[data-toc]');
    if (toc && matchMedia('(max-width: 1100px)').matches) toc.open = false;
}

// ── Discussion ────────────────────────────────────────────────────────────
const commentsRoot = document.querySelector<HTMLElement>('[data-comments]');
if (commentsRoot && sb) mountComments(commentsRoot);
