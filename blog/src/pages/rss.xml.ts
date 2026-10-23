import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { SITE } from '../lib/site';

export const GET: APIRoute = async (context) => {
    const posts = (await getPosts()).filter((p) => !p.data.draft);
    return rss({
        title: SITE.title,
        description: SITE.description,
        site: new URL('/blog/', context.site).toString(),
        items: posts.map((p) => ({
            title: p.data.title,
            description: p.data.description,
            pubDate: p.data.date,
            link: `/blog/${p.id}/`,
            categories: [p.data.category, ...p.data.tags],
            author: SITE.author,
        })),
        customData: '<language>en-us</language>',
        trailingSlash: true,
    });
};
