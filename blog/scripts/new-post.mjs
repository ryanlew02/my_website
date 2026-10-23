#!/usr/bin/env node
// npm run new -- "My first fluid simulation" [--category Graphics] [--tags "C++, OpenGL"]
// Creates src/content/posts/<slug>.md as a draft, dated today.
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { category: { type: 'string', default: 'Notes' }, tags: { type: 'string', default: '' } },
});
const title = positionals.join(' ').trim();
if (!title) {
    console.error('Usage: npm run new -- "Post title" [--category Graphics] [--tags "C++, OpenGL"]');
    process.exit(1);
}
const slug = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/\+\+/g, 'pp').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const file = join(resolve(import.meta.dirname, '../src/content/posts'), `${slug}.md`);
if (existsSync(file)) {
    console.error(`✗ ${file} already exists.`);
    process.exit(1);
}
const tags = values.tags.split(',').map((t) => t.trim()).filter(Boolean);
const yaml = (s) => JSON.stringify(s); // JSON strings are valid YAML scalars
writeFileSync(file, `---
title: ${yaml(title)}
description: ${yaml('One or two sentences: what this post is about and why it matters.')}
date: ${new Date().toISOString().slice(0, 10)}
category: ${yaml(values.category)}
tags: [${tags.map(yaml).join(', ')}]
draft: true
# cover: ./images/${slug}-cover.jpg   # optional, relative to this file
# coverAlt: "What the cover shows"
---

Opening paragraph.

## A section

Write in Markdown. Fenced code gets highlighting, a language label and a copy button:

\`\`\`cpp title="main.cpp"
int main() { return 0; }
\`\`\`

Inline math like $E = mc^2$, or display math:

$$
\\nabla \\cdot \\mathbf{u} = 0
$$
`);
console.log(`✓ Created src/content/posts/${slug}.md (draft)
  Preview:  npm run dev  →  http://localhost:4321/blog/${slug}/
  Publish:  set draft: false, then npm run build and upload dist/`);
