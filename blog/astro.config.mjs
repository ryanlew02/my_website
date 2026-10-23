// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { createHash } from 'node:crypto';
import { rehypeBlog, shikiMetaTitle } from './src/lib/markdown-plugins.mjs';
import { THEME_INIT } from './src/lib/theme-init.mjs';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const supabaseUrl = env.PUBLIC_SUPABASE_URL || '';
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : '';

// Pages that only make sense to a signed-in visitor: kept out of the sitemap
// (and marked noindex in their own <head>).
const PRIVATE = /\/blog\/(admin|account|signin|auth|user|search|404)/;

// `BLOG_TEST_BUILD=1 astro build` (used by the end-to-end tests) adds the
// fixture posts in tests/fixtures/posts and builds into ./test-dist, so it can
// never overwrite or leak into the real upload folder.
const TEST_BUILD = Boolean(process.env.BLOG_TEST_BUILD);

export default defineConfig({
    site: 'https://ryanlewan.com',
    base: '/blog',
    trailingSlash: 'always',
    // The whole site is assembled in ../dist (see scripts/assemble-site.mjs);
    // the blog lands in its /blog folder, exactly as Hostinger will serve it.
    outDir: TEST_BUILD ? './test-dist/blog' : '../dist/blog',
    build: { format: 'directory', assets: '_assets' },
    prefetch: { prefetchAll: false, defaultStrategy: 'hover' },

    integrations: [
        sitemap({ filter: (page) => !PRIVATE.test(page) }),
    ],

    markdown: {
        shikiConfig: {
            themes: { light: 'github-light', dark: 'github-dark-dimmed' },
            defaultColor: false,
            transformers: [shikiMetaTitle()],
        },
        processor: unified({
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeHeadingIds, [rehypeKatex, { strict: 'ignore', throwOnError: false }], rehypeBlog],
        }),
    },

    security: {
        csp: {
            // Scripts are locked to this origin plus the hashes Astro computes.
            // Styles allow inline because Shiki and KaTeX emit style attributes;
            // that is the trade-off Astro documents for Shiki under CSP.
            // Astro hashes its bundled scripts itself; the one is:inline script
            // (theme before first paint) is hashed here.
            scriptDirective: {
                hashes: [/** @type {`sha256-${string}`} */ (`sha256-${createHash('sha256').update(THEME_INIT).digest('base64')}`)],
            },
            styleDirective: {
                resources: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            },
            directives: [
                "default-src 'self'",
                /** @type {`connect-src${string}`} */ (`connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace('https://', 'wss://')}`.trim()),
                /** @type {`img-src${string}`} */ (`img-src 'self' data: blob: ${supabaseOrigin} https://avatars.githubusercontent.com https://*.googleusercontent.com`.trim()),
                "font-src 'self' https://fonts.gstatic.com",
                'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
                "form-action 'self'",
                "base-uri 'self'",
                "object-src 'none'",
            ],
        },
    },
});
