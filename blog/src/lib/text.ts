/** Shared, dependency-free text helpers (used at build time and in the browser). */

export function slugify(input: string): string {
    return input
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\+\+/g, 'pp')        // C++ → cpp, so it doesn't collapse to "c"
        .replace(/#/g, 'sharp')        // C# → csharp
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/** Strip Markdown down to readable words: for reading time and the search index. */
export function markdownToPlainText(md: string): string {
    return md
        .replace(/^---[\s\S]*?---/, '')            // frontmatter
        .replace(/```[\s\S]*?```/g, ' ')            // fenced code
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')          // display math
        .replace(/<[^>]+>/g, ' ')                   // raw HTML
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')   // images → alt
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')    // links → text
        .replace(/`([^`]*)`/g, '$1')
        .replace(/[#>*_~|-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Minutes at 230 wpm for prose, plus a flat allowance per code block. */
export function readingTime(md: string): number {
    const words = markdownToPlainText(md).split(' ').filter(Boolean).length;
    const codeBlocks = (md.match(/```/g)?.length ?? 0) / 2;
    return Math.max(1, Math.round(words / 230 + codeBlocks * 0.4));
}

const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const formatDate = (d: Date) => dateFmt.format(d);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** "3 minutes ago" style, for comments. */
export function timeAgo(iso: string, now = Date.now()): string {
    const s = Math.round((now - new Date(iso).getTime()) / 1000);
    if (s < 45) return 'just now';
    const units: [number, Intl.RelativeTimeFormatUnit][] = [
        [60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year'],
    ];
    let v = s;
    let unit: Intl.RelativeTimeFormatUnit = 'second';
    for (const [step, u] of units) {
        unit = u;
        if (Math.abs(v) < step) break;
        v = Math.round(v / step);
    }
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-v, unit);
}
