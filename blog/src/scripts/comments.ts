// The discussion under a post. Everything a user typed is inserted as text
// nodes (see lib/dom.ts) — there is no HTML rendering of comments anywhere.
// Permissions shown here (edit, delete, reply) are conveniences; the
// database re-checks every one of them.
import { supabase } from '../lib/supabase';
import { getMe, type Me } from '../lib/session';
import { postRecord } from '../lib/post-id';
import { friendlyError } from '../lib/errors';
import { el, linkifiedText, toast, confirmDialog } from '../lib/dom';
import { avatarEl } from '../lib/avatar-el';
import { buildTree, validateCommentBody, MAX_DEPTH, type CommentNode, type CommentRow } from '../lib/comment-tree';
import { timeAgo } from '../lib/text';

const PAGE = 20;
const fullDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });

export async function mountComments(root: HTMLElement) {
    const sb = supabase()!;
    const slug = root.dataset.slug!;
    const slot = root.querySelector<HTMLElement>('[data-composer-slot]')!;
    const list = root.querySelector<HTMLOListElement>('[data-comment-list]')!;
    const status = root.querySelector<HTMLElement>('[data-comments-status]')!;
    const more = root.querySelector<HTMLElement>('[data-load-more]')!;
    const countEl = root.querySelector<HTMLElement>('[data-comments-count]')!;
    const signinHref = `/blog/signin/?next=${encodeURIComponent(location.pathname + '#comments')}`;

    let me: Me | null = null;
    let postId = '';
    let locked = false;
    let cursor: { at: string; id: string } | null = null;
    let total = 0;

    const setCount = (n: number) => {
        total = Math.max(0, n);
        countEl.textContent = total ? `${total} comment${total === 1 ? '' : 's'}` : '';
    };

    // ── Composer ───────────────────────────────────────────────────────────
    function composer(opts: {
        placeholder: string; submitLabel: string; initial?: string; autofocus?: boolean;
        onSubmit: (body: string) => Promise<boolean>; onCancel?: () => void;
    }) {
        const id = `c-${Math.random().toString(36).slice(2, 9)}`;
        const ta = el('textarea', {
            id, name: 'body', rows: 4, maxlength: 4000, required: true,
            placeholder: opts.placeholder, 'aria-label': opts.placeholder,
        });
        ta.value = opts.initial ?? '';
        const err = el('p', { class: 'form-error', role: 'alert' });
        const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, opts.submitLabel);
        const form = el('form', { class: 'composer', novalidate: true },
            ta,
            el('div', { class: 'composer-foot' },
                el('span', { class: 'composer-hint' }, 'Plain text. Links are clickable. ⌘/Ctrl + Enter to send.'),
                el('div', { class: 'composer-actions' },
                    opts.onCancel ? el('button', { class: 'btn btn--ghost', type: 'button', onclick: opts.onCancel }, 'Cancel') : null,
                    submit)),
            err);
        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); }
            if (e.key === 'Escape' && opts.onCancel) opts.onCancel();
        });
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const problem = validateCommentBody(ta.value);
            if (problem) { err.textContent = problem; ta.focus(); return; }
            err.textContent = '';
            submit.disabled = true;
            submit.textContent = 'Sending…';
            try {
                const ok = await opts.onSubmit(ta.value.trim());
                if (ok && !opts.initial) ta.value = '';
            } catch (error) {
                err.textContent = friendlyError(error);
            } finally {
                submit.disabled = false;
                submit.textContent = opts.submitLabel;
            }
        });
        if (opts.autofocus) requestAnimationFrame(() => ta.focus());
        return form;
    }

    // ── One comment ────────────────────────────────────────────────────────
    function renderComment(c: CommentNode): HTMLLIElement {
        const li = el('li', { id: `comment-${c.id}`, 'data-id': c.id });
        const childList = el('ol', { class: 'comment-list' });
        for (const child of c.children) childList.appendChild(renderComment(child));
        li.appendChild(commentArticle(c, li, childList));
        if (c.children.length) li.appendChild(childList);
        return li;
    }

    function commentArticle(c: CommentNode, li: HTMLLIElement, childList: HTMLOListElement): HTMLElement {
        const mine = Boolean(me && c.author_id === me.session.user.id);
        const created = new Date(c.created_at);
        const meta = c.is_removed
            ? el('div', { class: 'comment-meta' }, el('span', { class: 'handle' }, 'Removed'),
                el('time', { datetime: c.created_at, title: fullDate.format(created) }, timeAgo(c.created_at)))
            : el('div', { class: 'comment-meta' },
                el('a', { class: 'name', href: `/blog/user/?u=${encodeURIComponent(c.username ?? '')}` }, c.display_name ?? 'Reader'),
                el('span', { class: 'handle' }, `@${c.username}`),
                el('a', { href: `#comment-${c.id}`, class: 'handle' },
                    el('time', { datetime: c.created_at, title: fullDate.format(created) }, timeAgo(c.created_at))),
                c.edited_at ? el('span', { class: 'edited', title: `Edited ${fullDate.format(new Date(c.edited_at))}` }, '· edited') : null);

        const body = el('div', { class: 'comment-body' });
        if (c.is_removed) body.appendChild(el('span', { class: 'comment-removed' }, 'This comment was removed.'));
        else body.appendChild(linkifiedText(c.body ?? ''));

        const actions = el('div', { class: 'comment-actions' });
        const main = el('div', { class: 'comment-main' }, meta, body, actions);
        const article = el('article', { class: 'comment', 'aria-label': c.is_removed ? 'Removed comment' : `Comment by ${c.display_name}` },
            avatarEl(c.is_removed ? null : c, 'sm'), main);

        if (c.is_removed) return article;

        // Like
        let likes = c.like_count;
        let liked = c.liked_by_me;
        // The author's own like counts as "liked by author" too, so an admin
        // sees the badge appear or vanish as they click.
        const authorLikedOthers = c.liked_by_author && !(me?.isAdmin && c.liked_by_me);
        const likeBtn = el('button', { class: 'link-btn', type: 'button' });
        const authorBadge = el('span', { class: 'author-liked', hidden: true },
            el('span', { class: 'author-liked__heart', 'aria-hidden': 'true' }, '♥'), 'Liked by author');
        const paintLike = () => {
            likeBtn.textContent = `♥ ${likes || ''}`.trim();
            likeBtn.setAttribute('aria-pressed', String(liked));
            likeBtn.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} (${likes})`);
            authorBadge.hidden = !(authorLikedOthers || (me?.isAdmin && liked));
        };
        paintLike();
        likeBtn.addEventListener('click', async () => {
            if (!me) { location.href = signinHref; return; }
            const was = liked;
            liked = !liked; likes += liked ? 1 : -1; paintLike();
            const { error } = was
                ? await sb.from('comment_likes').delete().eq('comment_id', c.id)
                : await sb.from('comment_likes').insert({ comment_id: c.id });
            if (error && error.code !== '23505') {
                liked = was; likes += liked ? 1 : -1; paintLike();
                toast(friendlyError(error));
            }
        });
        actions.appendChild(likeBtn);
        actions.appendChild(authorBadge);

        // Reply
        if (me && !me.banned && !locked && c.depth < MAX_DEPTH) {
            let open: HTMLFormElement | null = null;
            actions.appendChild(el('button', {
                class: 'link-btn', type: 'button',
                onclick: () => {
                    if (open) { open.querySelector('textarea')?.focus(); return; }
                    open = composer({
                        placeholder: `Reply to ${c.display_name}…`, submitLabel: 'Reply', autofocus: true,
                        onCancel: () => { open?.remove(); open = null; },
                        onSubmit: async (text) => {
                            const row = await insertComment(text, c.id);
                            const node = { ...row, children: [] };
                            if (!childList.isConnected) li.appendChild(childList);
                            const childLi = renderComment(node);
                            childList.appendChild(childLi);
                            open?.remove(); open = null;
                            highlight(childLi);
                            return true;
                        },
                    });
                    main.appendChild(open);
                },
            }, 'Reply'));
        }

        // Edit / delete (own), report (others)
        if (mine && !me!.banned) {
            actions.appendChild(el('button', {
                class: 'link-btn', type: 'button',
                onclick: () => {
                    const form = composer({
                        placeholder: 'Edit your comment', submitLabel: 'Save', initial: c.body ?? '', autofocus: true,
                        onCancel: () => { form.replaceWith(body); actions.hidden = false; },
                        onSubmit: async (text) => {
                            const { data, error } = await sb.from('comments').update({ body: text }).eq('id', c.id)
                                .select('body, edited_at').maybeSingle();
                            if (error) throw error;
                            if (!data) throw new Error('FORBIDDEN');
                            c.body = data.body; c.edited_at = data.edited_at;
                            const fresh = commentArticle(c, li, childList);
                            li.replaceChild(fresh, article);
                            toast('Comment updated');
                            return true;
                        },
                    });
                    body.replaceWith(form);
                    actions.hidden = true;
                },
            }, 'Edit'));
        }
        if (mine || me?.isAdmin) {
            actions.appendChild(el('button', {
                class: 'link-btn link-btn--danger', type: 'button',
                onclick: async () => {
                    if (!(await confirmDialog('Delete this comment? This can’t be undone.'))) return;
                    const { error } = await sb.rpc('delete_comment', { p_comment_id: c.id });
                    if (error) { toast(friendlyError(error)); return; }
                    setCount(total - 1);
                    if (childList.children.length) {
                        const removed = commentArticle({ ...c, is_removed: true, body: null }, li, childList);
                        li.replaceChild(removed, li.querySelector(':scope > article')!);
                    } else {
                        li.remove();
                    }
                    toast('Comment deleted');
                },
            }, 'Delete'));
        }
        if (me && !mine) {
            actions.appendChild(el('button', { class: 'link-btn', type: 'button', onclick: () => reportDialog(c.id) }, 'Report'));
        }
        return article;
    }

    function highlight(li: HTMLElement) {
        li.querySelector(':scope > article')?.classList.add('is-highlighted');
        li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    async function insertComment(text: string, parentId: string | null): Promise<CommentRow> {
        const { data, error } = await sb.from('comments')
            .insert({ post_id: postId, parent_id: parentId, body: text })
            .select('id, parent_id, depth, body, created_at, edited_at, author_id')
            .single();
        if (error) throw error;
        setCount(total + 1);
        const p = me!.profile!;
        return {
            ...data, is_removed: false, like_count: 0, liked_by_me: false, liked_by_author: false,
            username: p.username, display_name: p.display_name,
            avatar_path: p.avatar_path, provider_avatar_url: p.provider_avatar_url,
        } as CommentRow;
    }

    function reportDialog(commentId: string) {
        const reason = el('select', { name: 'reason', required: true },
            el('option', { value: 'spam' }, 'Spam'),
            el('option', { value: 'harassment' }, 'Harassment or abuse'),
            el('option', { value: 'off-topic' }, 'Off-topic'),
            el('option', { value: 'other' }, 'Something else'));
        const details = el('textarea', { name: 'details', rows: 3, maxlength: 500, placeholder: 'Anything the moderator should know (optional)' });
        const err = el('p', { class: 'form-error', role: 'alert' });
        const d = el('dialog', { class: 'confirm', 'aria-labelledby': 'report-title' },
            el('form', { class: 'stack' },
                el('h2', { id: 'report-title', style: 'font-size:18px' }, 'Report comment'),
                el('div', { class: 'field' }, el('label', {}, 'Reason'), reason),
                el('div', { class: 'field' }, el('label', {}, 'Details'), details),
                err,
                el('div', { class: 'dialog-actions' },
                    el('button', { class: 'btn', type: 'button', onclick: () => d.close() }, 'Cancel'),
                    el('button', { class: 'btn btn--primary', type: 'submit' }, 'Send report'))));
        d.querySelector('form')!.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { error } = await sb.from('comment_reports').insert({ comment_id: commentId, reason: reason.value, details: details.value.trim() });
            if (error && error.code !== '23505') { err.textContent = friendlyError(error); return; }
            d.close();
            toast(error ? 'You already reported this comment.' : 'Thanks — a moderator will take a look.');
        });
        d.addEventListener('close', () => d.remove());
        document.body.appendChild(d);
        d.showModal();
    }

    // ── Loading ────────────────────────────────────────────────────────────
    async function loadPage() {
        more.hidden = true;
        const { data, error } = await sb.rpc('get_post_comments', {
            p_post_id: postId, p_after: cursor?.at ?? null, p_after_id: cursor?.id ?? null, p_limit: PAGE,
        });
        if (error) {
            status.replaceChildren(el('p', { class: 'notice notice--error' }, friendlyError(error, 'Couldn’t load comments. Refresh to try again.')));
            return;
        }
        const rows = (data ?? []) as CommentRow[];
        const roots = buildTree(rows);
        for (const r of roots) list.appendChild(renderComment(r));
        const last = roots.at(-1);
        if (last) cursor = { at: last.created_at, id: last.id };
        more.hidden = roots.length < PAGE;
        if (!list.children.length) {
            status.replaceChildren(el('p', { class: 'muted', style: 'margin-top:20px' }, locked ? 'No comments.' : 'No comments yet. Start the discussion.'));
        } else {
            status.replaceChildren();
        }
    }

    more.querySelector('button')!.addEventListener('click', loadPage);

    // ── Boot ───────────────────────────────────────────────────────────────
    let record: Awaited<ReturnType<typeof postRecord>>;
    try {
        [record, me] = await Promise.all([postRecord(slug), getMe()]);
    } catch (e) {
        slot.replaceChildren(el('p', { class: 'notice notice--error' }, friendlyError(e, 'Couldn’t load the discussion. Refresh to try again.')));
        return;
    }
    if (!record) {
        slot.replaceChildren(el('p', { class: 'notice' }, 'The discussion opens once this post is live.'));
        return;
    }
    postId = record.id;
    locked = record.comments_locked;

    sb.rpc('comment_counts', { p_slugs: [slug] }).then(({ data }) => {
        const row = (data as { comments: number }[] | null)?.[0];
        if (row) setCount(row.comments);
    });

    if (locked) {
        slot.replaceChildren(el('p', { class: 'notice' }, 'Comments are closed on this post.'));
    } else if (!me) {
        slot.replaceChildren(el('div', { class: 'signin-prompt' },
            el('span', {}, 'Sign in to join the discussion.'),
            el('a', { class: 'btn btn--primary', href: signinHref }, 'Sign in')));
    } else if (me.banned) {
        slot.replaceChildren(el('p', { class: 'notice' }, 'Your account can’t post comments right now.'));
    } else if (!me.profile) {
        slot.replaceChildren(el('p', { class: 'notice' }, 'Finish setting up your profile to comment. ',
            el('a', { href: '/blog/account/' }, 'Account settings')));
    } else {
        const p = me.profile;
        slot.replaceChildren(el('div', { class: 'composer-row' },
            avatarEl(p, ''),
            el('div', { style: 'flex:1;min-width:0' }, composer({
                placeholder: `Add to the discussion as ${p.display_name}…`, submitLabel: 'Post comment',
                onSubmit: async (text) => {
                    const row = await insertComment(text, null);
                    status.replaceChildren();
                    const li = renderComment({ ...row, children: [] });
                    // New top-level comments go at the end only if every page is loaded.
                    if (more.hidden) list.appendChild(li); else list.prepend(li);
                    highlight(li);
                    return true;
                },
            }))));
    }

    await loadPage();

    // Deep link to a comment (#comment-<id>)
    if (location.hash.startsWith('#comment-')) {
        const target = document.getElementById(location.hash.slice(1));
        if (target) highlight(target);
    }
}
