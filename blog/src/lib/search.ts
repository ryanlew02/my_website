/** Client-side search over a build-time index. Pure, so it is unit-tested. */

export interface SearchDoc {
    slug: string;
    title: string;
    description: string;
    category: string;
    categorySlug: string;
    tags: string[];
    tagSlugs: string[];
    date: string;
    text: string;
}

export interface SearchQuery { q?: string; tag?: string; category?: string }

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function tokenize(q: string): string[] {
    return norm(q).split(/[^a-z0-9+#]+/).filter((t) => t.length > 0).slice(0, 12);
}

/**
 * Every term must appear somewhere (AND). Rank by where it appears:
 * title > tags > category > description > body, with a bonus for whole-word
 * title hits. Ties go to the newer post.
 */
export function search(docs: SearchDoc[], query: SearchQuery): SearchDoc[] {
    const terms = tokenize(query.q ?? '');
    const filtered = docs.filter((d) =>
        (!query.tag || d.tagSlugs.includes(query.tag)) && (!query.category || d.categorySlug === query.category));
    if (!terms.length) return [...filtered].sort((a, b) => b.date.localeCompare(a.date));

    const scored: { d: SearchDoc; score: number }[] = [];
    for (const d of filtered) {
        const fields = {
            title: norm(d.title), tags: norm(d.tags.join(' ')), category: norm(d.category),
            description: norm(d.description), text: norm(d.text),
        };
        let score = 0;
        let all = true;
        for (const t of terms) {
            let s = 0;
            if (fields.title.includes(t)) s += 10 + (new RegExp(`\\b${escapeRe(t)}\\b`).test(fields.title) ? 5 : 0);
            if (fields.tags.includes(t)) s += 8;
            if (fields.category.includes(t)) s += 5;
            if (fields.description.includes(t)) s += 4;
            if (fields.text.includes(t)) s += 1 + Math.min(4, countOf(fields.text, t) / 3);
            if (s === 0) { all = false; break; }
            score += s;
        }
        if (all) scored.push({ d, score });
    }
    return scored.sort((a, b) => b.score - a.score || b.d.date.localeCompare(a.d.date)).map((x) => x.d);
}

/** A short excerpt around the first matching term, for result snippets. */
export function snippet(doc: SearchDoc, q: string, radius = 90): string {
    const terms = tokenize(q);
    const text = doc.text;
    const lower = norm(text);
    let at = -1;
    for (const t of terms) {
        at = lower.indexOf(t);
        if (at >= 0) break;
    }
    if (at < 0) return doc.description;
    const start = Math.max(0, at - radius);
    const end = Math.min(text.length, at + radius);
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function countOf(hay: string, needle: string) {
    let n = 0;
    for (let i = hay.indexOf(needle); i >= 0 && n < 50; i = hay.indexOf(needle, i + needle.length)) n++;
    return n;
}
