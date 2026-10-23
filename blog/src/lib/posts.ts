import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify } from './text';

export type Post = CollectionEntry<'posts'>;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Is this post public in a production build, as of `now`? */
export function isPublished(data: Pick<Post['data'], 'draft' | 'date'>, now = new Date()) {
    return !data.draft && data.date.getTime() <= now.getTime();
}

/**
 * Every post that should be on the site, newest first. Drafts and
 * future-dated posts appear only under `npm run dev`, flagged as such.
 */
export async function getPosts(): Promise<Post[]> {
    const all = await getCollection('posts');
    for (const p of all) {
        if (!SLUG_RE.test(p.id)) {
            throw new Error(`Post file name "${p.id}" must be lowercase-words-with-dashes (it becomes the URL).`);
        }
    }
    const visible = import.meta.env.DEV ? all : all.filter((p) => isPublished(p.data));
    return visible.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export interface Term { name: string; slug: string; count: number }

export function collectTerms(posts: Post[], pick: (p: Post) => string[]): Term[] {
    const map = new Map<string, Term>();
    for (const p of posts) {
        for (const name of pick(p)) {
            const slug = slugify(name);
            const t = map.get(slug) ?? { name, slug, count: 0 };
            t.count += 1;
            map.set(slug, t);
        }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const tagsOf = (p: Post) => p.data.tags;
export const categoryOf = (p: Post) => [p.data.category];

/** Up to `limit` other posts, ranked by shared tags, then same category, then recency. */
export function relatedPosts(post: Post, posts: Post[], limit = 3): Post[] {
    const tags = new Set(post.data.tags.map(slugify));
    return posts
        .filter((p) => p.id !== post.id)
        .map((p) => ({
            p,
            score: p.data.tags.filter((t) => tags.has(slugify(t))).length * 2
                + (slugify(p.data.category) === slugify(post.data.category) ? 1 : 0),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || b.p.data.date.getTime() - a.p.data.date.getTime())
        .slice(0, limit)
        .map((x) => x.p);
}
