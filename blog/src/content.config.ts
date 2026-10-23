import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per post in src/content/posts/. The file name is the URL:
//   my-first-fluid-simulation.md        → /blog/my-first-fluid-simulation/
//   my-first-fluid-simulation/index.md  → same URL, with images beside it
// Files starting with "_" are ignored.
// Browser tests build with only the fixture posts, so publishing a real post
// never changes what they see.
const patterns = process.env.BLOG_TEST_BUILD
    ? ['tests/fixtures/posts/*.md']
    : ['src/content/posts/**/[^_]*.md'];

const posts = defineCollection({
    loader: glob({
        pattern: patterns,
        base: '.',
        generateId: ({ entry }) => {
            const parts = entry.replace(/\.md$/, '').split('/');
            const last = parts.pop()!;
            return last === 'index' ? parts.pop()! : last;
        },
    }),
    schema: ({ image }) =>
        z.object({
            title: z.string().min(1).max(160),
            description: z.string().min(1).max(300),
            /** Publication date. A date in the future keeps the post out of the build until then. */
            date: z.coerce.date(),
            updated: z.coerce.date().optional(),
            category: z.string().min(1).max(40),
            tags: z.array(z.string().min(1).max(40)).max(12).default([]),
            /** Drafts render in `npm run dev` only — never in a production build. */
            draft: z.boolean().default(false),
            featured: z.boolean().default(false),
            cover: image().optional(),
            coverAlt: z.string().max(200).optional(),
        }),
});

export const collections = { posts };
