// Fills in comment / like counts on post lists, in one request. Optional:
// the list is complete without it.
import { supabase } from '../lib/supabase';

const rows = [...document.querySelectorAll<HTMLElement>('[data-post-slug]')];
const sb = supabase();
if (sb && rows.length) {
    const slugs = [...new Set(rows.map((r) => r.dataset.postSlug!))];
    sb.rpc('comment_counts', { p_slugs: slugs }).then(({ data }) => {
        if (!data) return;
        const bySlug = new Map((data as { slug: string; comments: number; likes: number }[]).map((r) => [r.slug, r]));
        for (const row of rows) {
            const s = bySlug.get(row.dataset.postSlug!);
            if (!s) continue;
            for (const [key, n] of [['comments', s.comments], ['likes', s.likes]] as const) {
                const stat = row.querySelector<HTMLElement>(`[data-stat="${key}"]`);
                if (!stat || n === 0) continue;
                stat.querySelector('span')!.textContent = String(n);
                stat.setAttribute('aria-label', `${n} ${key}`);
                stat.hidden = false;
            }
        }
    });
}
