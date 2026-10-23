/**
 * Where to send someone after sign-in. Only same-site paths under the blog
 * are accepted — anything else (another origin, protocol-relative "//evil",
 * backslash tricks, javascript:) falls back to the blog home. This is the
 * open-redirect guard; every `next` parameter goes through it.
 */
export function safeNext(next: string | null | undefined, base = '/blog/'): string {
    // `next` arrives already decoded (URLSearchParams / sessionStorage), so it
    // is checked as-is — decoding again would corrupt queries like ?q=c%2B%2B.
    if (!next || typeof next !== 'string') return base;
    if (/[\\\u0000-\u001f]/.test(next)) return base;
    if (!next.startsWith(base) || next.startsWith('//')) return base;
    // Resolve against a dummy origin and make sure it didn't escape.
    try {
        const u = new URL(next, 'https://ryanlewan.invalid');
        if (u.origin !== 'https://ryanlewan.invalid' || !u.pathname.startsWith(base)) return base;
        return u.pathname + u.search + u.hash;
    } catch {
        return base;
    }
}
