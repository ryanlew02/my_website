import { describe, expect, it } from 'vitest';
import { createMarkdownProcessor, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { rehypeBlog, shikiMetaTitle } from '../../src/lib/markdown-plugins.mjs';

// Same plugin chain as astro.config.mjs.
const processor = await createMarkdownProcessor({
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark-dimmed' }, defaultColor: false, transformers: [shikiMetaTitle()] },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeHeadingIds, [rehypeKatex, { strict: 'ignore', throwOnError: false }], rehypeBlog],
});
const render = async (md: string) => (await processor.render(md)).code;

describe('markdown pipeline', () => {
    it('wraps code blocks with a language label, title and copy button', async () => {
        const html = await render('```cpp title="main.cpp"\nint main() {}\n```');
        expect(html).toContain('<figure class="code-block" data-lang="cpp">');
        expect(html).toContain('<span class="code-lang">C++</span>');
        expect(html).toContain('<span class="code-title">main.cpp</span>');
        expect(html).toMatch(/<button type="button" class="code-copy" hidden data-copy[^>]*>Copy<\/button>/);
        expect(html).toContain('--shiki-dark');
        expect(html).toContain('tabindex="0"');
        expect(html).not.toContain('data-title');
    });
    it('labels unlabelled code as text', async () => {
        expect(await render('```\nplain\n```')).toContain('<span class="code-lang">Text</span>');
    });
    it('adds heading anchors without polluting the heading text', async () => {
        const res = await processor.render('## Pressure projection\n\n### Jacobi');
        expect(res.code).toContain('<h2 id="pressure-projection">Pressure projection<a class="heading-anchor" href="#pressure-projection" aria-label="Link to this section"></a></h2>');
        expect(res.metadata.headings.map((h) => h.text)).toEqual(['Pressure projection', 'Jacobi']);
    });
    it('renders inline and display math with KaTeX', async () => {
        const html = await render('Inline $a^2$.\n\n$$\n\\frac{1}{2}\n$$');
        expect(html).toContain('class="katex"');
        expect(html).toContain('katex-display');
    });
    it('wraps tables for horizontal scrolling and hardens external links', async () => {
        const html = await render('| a | b |\n|---|---|\n| 1 | 2 |\n\n[x](https://example.com) [y](/blog/)');
        expect(html).toMatch(/<div class="table-wrap" tabindex="0">\s*<table>/);
        expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer">x</a>');
        expect(html).toContain('<a href="/blog/">y</a>');
    });
    it('lazy-loads images', async () => {
        expect(await render('![alt](https://example.com/a.png)')).toMatch(/loading="lazy"/);
    });
});
