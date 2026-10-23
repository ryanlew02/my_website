export interface CommentRow {
    id: string;
    parent_id: string | null;
    depth: number;
    body: string | null;
    is_removed: boolean;
    created_at: string;
    edited_at: string | null;
    author_id: string | null;
    username: string | null;
    display_name: string | null;
    avatar_path: string | null;
    provider_avatar_url: string | null;
    like_count: number;
    liked_by_me: boolean;
    /** An admin (the blog's author) liked it. */
    liked_by_author: boolean;
}

export interface CommentNode extends CommentRow { children: CommentNode[] }

export const MAX_DEPTH = 2;

/** Rows (any order) → roots in chronological order, each with sorted children. */
export function buildTree(rows: CommentRow[]): CommentNode[] {
    const byId = new Map<string, CommentNode>();
    for (const r of rows) byId.set(r.id, { ...r, children: [] });
    const roots: CommentNode[] = [];
    for (const n of byId.values()) {
        const parent = n.parent_id ? byId.get(n.parent_id) : undefined;
        if (parent) parent.children.push(n);
        else if (!n.parent_id) roots.push(n);
        // A reply whose parent isn't in this page is dropped; it arrives with its root.
    }
    const byTime = (a: CommentNode, b: CommentNode) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
    const sortDeep = (list: CommentNode[]) => {
        list.sort(byTime);
        for (const n of list) sortDeep(n.children);
    };
    sortDeep(roots);
    return roots;
}

/** Comments are plain text. Validate before sending; the DB enforces the same. */
export function validateCommentBody(body: string): string | null {
    const t = body.trim();
    if (!t) return 'Write something first.';
    if (t.length > 4000) return `That’s ${t.length} characters — the limit is 4000.`;
    return null;
}
