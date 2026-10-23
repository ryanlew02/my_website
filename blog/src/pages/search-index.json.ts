import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { markdownToPlainText, slugify } from '../lib/text';
import type { SearchDoc } from '../lib/search';

// Built from the same list as the pages, so a draft can never be searched.
export const GET: APIRoute = async () => {
    const posts = await getPosts();
    const docs: SearchDoc[] = posts.filter((p) => !p.data.draft).map((p) => ({
        slug: p.id,
        title: p.data.title,
        description: p.data.description,
        category: p.data.category,
        categorySlug: slugify(p.data.category),
        tags: p.data.tags,
        tagSlugs: p.data.tags.map(slugify),
        date: p.data.date.toISOString(),
        text: markdownToPlainText(p.body ?? '').slice(0, 20000),
    }));
    return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
};
