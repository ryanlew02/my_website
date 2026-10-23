#!/usr/bin/env node
// Builds the upload folder: ../dist = the portfolio files from the repo root
// + the blog Astro just built into ../dist/blog. Upload the *contents* of
// dist/ to Hostinger's public_html and the whole site is live.
//
// The portfolio is copied, not rebuilt — it stays exactly as it is in git.
// Anything that isn't part of the public site is left out (see SKIP).
import { cpSync, existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const dist = join(repo, 'dist');
const blogOut = join(dist, 'blog');


if (!existsSync(join(blogOut, 'index.html'))) {
    console.error('✗ dist/blog/index.html is missing — run `npm run build` (astro build) first.');
    process.exit(1);
}

// Refuse to ship a build that contains a draft. Drafts carry a robots
// noindex + a visible banner; their presence means a dev build leaked here.
for (const dir of readdirSync(blogOut)) {
    const page = join(blogOut, dir, 'index.html');
    if (existsSync(page) && readFileSync(page, 'utf8').includes('notice--draft')) {
        console.error(`✗ dist/blog/${dir}/ is a draft. Production builds must not include drafts.`);
        process.exit(1);
    }
}

const SKIP = new Set([
    'blog', 'dist', 'node_modules', 'status-worker',
    '.git', '.githooks', '.claude', '.vscode', '.wrangler',
    '.gitignore', '.DS_Store', '.status-token',
    'cache-bust.js', 'Ryan_Lewandowski_Resume_Main.docx', 'CLAUDE.md', 'README.md',
]);

const copied = [];
for (const name of readdirSync(repo)) {
    if (SKIP.has(name) || name.endsWith('.local')) continue;
    cpSync(join(repo, name), join(dist, name), {
        recursive: true,
        filter: (src) => !src.endsWith('.DS_Store'),
    });
    copied.push(name + (statSync(join(repo, name)).isDirectory() ? '/' : ''));
}

console.log(`✓ Site assembled in dist/
  portfolio: ${copied.join(', ')}
  blog:      blog/ (Astro build)
Upload the contents of dist/ to public_html on Hostinger.`);
