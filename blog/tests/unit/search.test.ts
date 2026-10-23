import { describe, expect, it } from 'vitest';
import { search, snippet, tokenize, type SearchDoc } from '../../src/lib/search';

const doc = (o: Partial<SearchDoc>): SearchDoc => ({
    slug: 's', title: '', description: '', category: 'Graphics', categorySlug: 'graphics',
    tags: [], tagSlugs: [], date: '2026-01-01T00:00:00Z', text: '', ...o,
});
const docs = [
    doc({ slug: 'fluid', title: 'Fluid simulation in C++', tags: ['C++', 'OpenGL'], tagSlugs: ['cpp', 'opengl'], text: 'pressure projection jacobi', date: '2026-02-01T00:00:00Z' }),
    doc({ slug: 'nn', title: 'Neural networks', category: 'Machine Learning', categorySlug: 'machine-learning', tags: ['Python'], tagSlugs: ['python'], text: 'gradient descent and a fluid analogy' }),
    doc({ slug: 'shaders', title: 'Writing shaders', description: 'GLSL for fluid rendering', tags: ['OpenGL'], tagSlugs: ['opengl'] }),
];

describe('search', () => {
    it('ranks title hits above description and body hits', () => {
        expect(search(docs, { q: 'fluid' }).map((d) => d.slug)).toEqual(['fluid', 'shaders', 'nn']);
    });
    it('requires every term', () => {
        expect(search(docs, { q: 'fluid jacobi' }).map((d) => d.slug)).toEqual(['fluid']);
        expect(search(docs, { q: 'fluid nothing-matches' })).toEqual([]);
    });
    it('matches tags, including C++', () => {
        expect(search(docs, { q: 'c++' }).map((d) => d.slug)).toEqual(['fluid']);
    });
    it('filters by tag and category, and lists by date with no query', () => {
        expect(search(docs, { tag: 'opengl' }).map((d) => d.slug)).toEqual(['fluid', 'shaders']);
        expect(search(docs, { category: 'machine-learning' }).map((d) => d.slug)).toEqual(['nn']);
        expect(search(docs, { q: 'fluid', category: 'graphics' }).map((d) => d.slug)).toEqual(['fluid', 'shaders']);
    });
    it('treats regex characters literally', () => {
        expect(() => search(docs, { q: '(.*' })).not.toThrow();
        expect(tokenize('Hello (World)')).toEqual(['hello', 'world']);
    });
    it('builds a snippet around the first hit', () => {
        const d = doc({ text: 'a '.repeat(200) + 'needle in the haystack' + ' b'.repeat(200) });
        const s = snippet(d, 'needle');
        expect(s).toContain('needle');
        expect(s.startsWith('…')).toBe(true);
    });
});
