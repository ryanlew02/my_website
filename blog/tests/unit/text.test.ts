import { describe, expect, it } from 'vitest';
import { slugify, readingTime, markdownToPlainText, timeAgo, formatDate } from '../../src/lib/text';

describe('slugify', () => {
    it('makes URL-safe slugs and keeps C++ / C# distinct', () => {
        expect(slugify('Hello, World!')).toBe('hello-world');
        expect(slugify('C++')).toBe('cpp');
        expect(slugify('C#')).toBe('csharp');
        expect(slugify('  Équations   différentielles ')).toBe('equations-differentielles');
        expect(slugify('OpenGL / GLSL')).toBe('opengl-glsl');
    });
});

describe('markdownToPlainText / readingTime', () => {
    const md = `---\ntitle: x\n---\n# Title\n\nSome **bold** [link](http://x) text.\n\n\`\`\`cpp\nint secret_code_token;\n\`\`\`\n\n$$x^2$$\n<div>raw</div>`;
    it('strips code, math, markup and frontmatter', () => {
        const t = markdownToPlainText(md);
        expect(t).toContain('Some bold link text.');
        expect(t).not.toContain('secret_code_token');
        expect(t).not.toContain('title: x');
        expect(t).not.toContain('<div>');
    });
    it('is at least one minute and grows with length', () => {
        expect(readingTime('short')).toBe(1);
        expect(readingTime('word '.repeat(2300))).toBe(10);
    });
});

describe('timeAgo', () => {
    const now = Date.parse('2026-10-22T12:00:00Z');
    it('formats relative times', () => {
        expect(timeAgo('2026-10-22T11:59:50Z', now)).toBe('just now');
        expect(timeAgo('2026-10-22T11:55:00Z', now)).toBe('5 minutes ago');
        expect(timeAgo('2026-10-21T12:00:00Z', now)).toBe('yesterday');
        expect(timeAgo('2025-10-22T12:00:00Z', now)).toBe('last year');
    });
});

it('formats dates in UTC so build machines agree', () => {
    expect(formatDate(new Date('2026-01-15T00:00:00Z'))).toBe('January 15, 2026');
});
