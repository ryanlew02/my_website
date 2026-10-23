import { describe, expect, it } from 'vitest';
import { buildTree, validateCommentBody, type CommentRow } from '../../src/lib/comment-tree';

const row = (id: string, parent: string | null, at: string): CommentRow => ({
    id, parent_id: parent, depth: 0, body: id, is_removed: false, created_at: at, edited_at: null,
    author_id: 'u', username: 'u', display_name: 'U', avatar_path: null, provider_avatar_url: null, like_count: 0, liked_by_me: false, liked_by_author: false,
});

describe('buildTree', () => {
    it('nests replies under their parents in time order, whatever the input order', () => {
        const tree = buildTree([
            row('c', 'a', '2026-01-01T00:03:00Z'),
            row('b', null, '2026-01-01T00:02:00Z'),
            row('a', null, '2026-01-01T00:01:00Z'),
            row('d', 'a', '2026-01-01T00:02:30Z'),
            row('e', 'd', '2026-01-01T00:04:00Z'),
        ]);
        expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
        expect(tree[0].children.map((n) => n.id)).toEqual(['d', 'c']);
        expect(tree[0].children[0].children.map((n) => n.id)).toEqual(['e']);
    });
    it('drops orphans rather than promoting them to the top level', () => {
        expect(buildTree([row('x', 'missing', '2026-01-01T00:00:00Z')])).toEqual([]);
    });
});

describe('validateCommentBody', () => {
    it('rejects empty and over-long comments', () => {
        expect(validateCommentBody('   ')).toMatch(/Write something/);
        expect(validateCommentBody('a'.repeat(4001))).toMatch(/4000/);
        expect(validateCommentBody('fine')).toBeNull();
    });
});
