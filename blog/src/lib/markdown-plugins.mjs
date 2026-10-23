// Markdown → HTML touches that every post gets for free. Posts are written by
// the site owner and live in git, so this pipeline trusts its input (raw HTML
// in a post is allowed, e.g. for an <iframe> embed). User-written text —
// comments, bios — never goes through here; it is rendered as plain text.

import { visit } from 'unist-util-visit';

const LANG_LABELS = {
    cpp: 'C++', 'c++': 'C++', c: 'C', cs: 'C#', csharp: 'C#', js: 'JavaScript', javascript: 'JavaScript',
    ts: 'TypeScript', typescript: 'TypeScript', py: 'Python', python: 'Python', glsl: 'GLSL', hlsl: 'HLSL',
    wgsl: 'WGSL', rust: 'Rust', rs: 'Rust', go: 'Go', swift: 'Swift', sh: 'Shell', bash: 'Shell',
    zsh: 'Shell', shell: 'Shell', console: 'Console', sql: 'SQL', json: 'JSON', yaml: 'YAML', yml: 'YAML',
    toml: 'TOML', html: 'HTML', css: 'CSS', md: 'Markdown', markdown: 'Markdown', cmake: 'CMake',
    diff: 'Diff', java: 'Java', kotlin: 'Kotlin', lua: 'Lua', zig: 'Zig', asm: 'Assembly',
    plaintext: 'Text', text: 'Text', txt: 'Text',
};

export function languageLabel(lang) {
    if (!lang) return 'Text';
    return LANG_LABELS[lang.toLowerCase()] ?? lang;
}

/** Shiki transformer: ```cpp title="main.cpp" → data-title on the <pre>. */
export function shikiMetaTitle() {
    return {
        name: 'blog:meta-title',
        pre(node) {
            const raw = this.options.meta?.__raw ?? '';
            const m = raw.match(/title=(?:"([^"]+)"|'([^']+)'|(\S+))/);
            if (m) node.properties['data-title'] = m[1] ?? m[2] ?? m[3];
        },
    };
}

const h = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

/** Heading anchors, code-block chrome, scrollable tables, safe external links. */
export function rehypeBlog() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (!parent || index === undefined) return;

            // Heading anchors: an empty link (its "#" is drawn by CSS) so the
            // heading's text — and the table of contents built from it — stay clean.
            if (/^h[2-4]$/.test(node.tagName) && node.properties?.id) {
                node.children.push(h('a', {
                    className: ['heading-anchor'],
                    href: `#${node.properties.id}`,
                    ariaLabel: 'Link to this section',
                }));
                return;
            }

            // Code blocks: wrap Shiki's <pre> with a header carrying the
            // language, an optional file title and a copy button. The button
            // starts hidden and is revealed by the page script, so it never
            // shows up dead when JavaScript is off.
            if (node.tagName === 'pre' && node.properties?.dataLanguage !== undefined) {
                const lang = String(node.properties.dataLanguage || '');
                if (lang === 'math') return;
                // Shiki sets the raw attribute name; normalize either spelling.
                const title = node.properties.dataTitle ?? node.properties['data-title'];
                delete node.properties.dataTitle;
                delete node.properties['data-title'];
                node.properties.tabIndex = 0; // scrollable region must be focusable
                const head = h('div', { className: ['code-head'] }, [
                    h('span', { className: ['code-lang'] }, [text(languageLabel(lang))]),
                    ...(title ? [h('span', { className: ['code-title'] }, [text(String(title))])] : []),
                    h('button', { type: 'button', className: ['code-copy'], hidden: true, dataCopy: '' }, [text('Copy')]),
                ]);
                parent.children[index] = h('figure', { className: ['code-block'], dataLang: lang }, [head, node]);
                return 'skip';
            }

            // Wide tables scroll inside their own box instead of the page.
            if (node.tagName === 'table') {
                parent.children[index] = h('div', { className: ['table-wrap'], tabIndex: 0 }, [node]);
                return 'skip';
            }

            if (node.tagName === 'a' && typeof node.properties?.href === 'string'
                && /^https?:\/\//.test(node.properties.href)
                && !node.properties.href.startsWith('https://ryanlewan.com')) {
                node.properties.rel = ['noopener', 'noreferrer'];
            }

            if (node.tagName === 'img') {
                node.properties.loading ??= 'lazy';
                node.properties.decoding ??= 'async';
            }
        });
    };
}
