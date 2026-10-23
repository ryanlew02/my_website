import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';

// The published post list the admin dashboard syncs into the database
// registry, so comments and likes have a row to point at. Public on purpose:
// it holds nothing that isn't already on the index page.
export const GET: APIRoute = async () => {
    const posts = (await getPosts()).filter((p) => !p.data.draft);
    const body = posts.map((p) => ({ slug: p.id, title: p.data.title, date: p.data.date.toISOString() }));
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
};
