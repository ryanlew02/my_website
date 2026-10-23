/**
 * Turn a Supabase/Postgres error into something a reader can act on. The
 * database raises errors with a CODE: prefix (see the migration); anything
 * unrecognized becomes a generic message, and the detail goes to the console
 * only — never into the page.
 */
const MESSAGES: Record<string, string> = {
    RATE_LIMITED: 'You’re doing that a bit fast — wait a minute and try again.',
    DUPLICATE: 'You already posted that.',
    TOO_DEEP: 'Replies can only nest three levels deep.',
    INVALID_PARENT: 'That comment is no longer available to reply to.',
    USERNAME_COOLDOWN: 'Usernames can only be changed once every 30 days.',
    FORBIDDEN: 'You don’t have permission to do that.',
    NOT_FOUND: 'That no longer exists.',
    NOT_AUTHENTICATED: 'Please sign in first.',
};

interface MaybePgError { message?: string; code?: string; details?: string }

export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
    const e = (err ?? {}) as MaybePgError;
    const msg = e.message ?? '';
    const prefix = msg.match(/^([A-Z_]+)(?::\s*(.*))?$/);
    if (prefix && MESSAGES[prefix[1]]) {
        // Daily-limit and other specific texts from the DB are safe, authored strings.
        return prefix[1] === 'RATE_LIMITED' && prefix[2] ? capitalize(prefix[2]) + '.' : MESSAGES[prefix[1]];
    }
    if (msg.startsWith('INVALID:') ) return capitalize(msg.slice(8).trim()) + '.';
    if (e.code === '23505') return 'That’s already taken.';
    if (e.code === '23514') return 'That value isn’t allowed — check the length and characters.';
    if (e.code === '42501' || /row-level security/.test(msg)) return 'You can’t do that right now. You may need to sign in again.';
    if (e.code === 'PGRST301' || /JWT expired|invalid JWT/i.test(msg)) return 'Your session expired. Please sign in again.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Couldn’t reach the server. Check your connection and try again.';
    if (typeof console !== 'undefined') console.error('[blog]', err);
    return fallback;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
