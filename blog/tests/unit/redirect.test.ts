import { describe, expect, it } from 'vitest';
import { safeNext } from '../../src/lib/redirect';

describe('safeNext (open-redirect guard)', () => {
    it('keeps same-site blog paths', () => {
        expect(safeNext('/blog/my-post/')).toBe('/blog/my-post/');
        expect(safeNext('/blog/my-post/#comments')).toBe('/blog/my-post/#comments');
        expect(safeNext('/blog/search/?q=c%2B%2B')).toBe('/blog/search/?q=c%2B%2B');
    });
    it.each([
        null, undefined, '', 'https://evil.example/blog/', '//evil.example/blog/', '/\\evil.example',
        '/blog/../../etc', 'javascript:alert(1)', '/blog\\@evil.example', '%2F%2Fevil.example',
        '/blog/\r\nSet-Cookie:x', '/', '/admin', 'blog/x', '%2Fblog%2F', '%2F%2Fevil.example%2Fblog%2F',
    ])('rejects %s', (bad) => {
        const out = safeNext(bad as string);
        expect(out.startsWith('/blog/')).toBe(true);
        expect(out).not.toContain('evil');
        expect(out).not.toMatch(/[\r\n]/);
    });
    it('normalizes dot segments that try to leave /blog/', () => {
        expect(safeNext('/blog/../admin')).toBe('/blog/');
    });
});
