import { safeNext } from './redirect';

const KEY = 'auth:next';

/** Remember where to return after the OAuth / magic-link round trip. */
export function rememberNext(next: string | null) {
    try { sessionStorage.setItem(KEY, safeNext(next)); } catch { /* ignore */ }
}

export function takeNext(): string {
    let v: string | null = null;
    try { v = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    return safeNext(v);
}

export const callbackUrl = () => `${location.origin}/blog/auth/callback/`;

/** Errors the auth server can hand back in the redirect URL, made readable. */
export function authErrorMessage(code: string | null, description: string | null): string {
    if (!code && !description) return '';
    const d = (description ?? '').toLowerCase();
    if (d.includes('expired') || code === 'otp_expired') return 'That sign-in link has expired. Request a new one below.';
    if (code === 'access_denied') return 'Sign-in was cancelled.';
    if (d.includes('email') && d.includes('confirm')) return 'Please confirm your email address first.';
    return 'Sign-in didn’t complete. Please try again.';
}
