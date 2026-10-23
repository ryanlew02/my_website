import { supabase } from '../lib/supabase';
import { takeNext, authErrorMessage } from '../lib/auth-flow';
import { el } from '../lib/dom';

const sb = supabase();
const title = document.querySelector<HTMLElement>('[data-callback-title]')!;
const body = document.querySelector<HTMLElement>('[data-callback-body]')!;
const params = new URLSearchParams(location.search);
// Hash-style errors (#error=…) are also possible from the auth server.
const hash = new URLSearchParams(location.hash.slice(1));

function fail(message: string) {
    title.textContent = 'Sign-in didn’t finish';
    body.replaceChildren(
        el('p', { class: 'notice notice--error' }, message),
        el('p', { style: 'margin-top:16px' }, el('a', { class: 'btn btn--primary', href: '/blog/signin/' }, 'Try again')));
}

(async () => {
    // Drop the one-time code from the address bar and history right away.
    history.replaceState(null, '', location.pathname);

    if (!sb) return fail('Accounts aren’t configured on this build.');
    const err = params.get('error') ?? hash.get('error');
    if (err) return fail(authErrorMessage(params.get('error_code') ?? hash.get('error_code') ?? err,
        params.get('error_description') ?? hash.get('error_description')));

    const code = params.get('code');
    if (!code) {
        // Already signed in (e.g. a reload of this page)? Then just continue.
        const { data } = await sb.auth.getSession();
        if (data.session) return location.replace(takeNext());
        return fail('This sign-in link is missing its code. Request a new one.');
    }

    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
        console.error('[auth] exchange failed', error);
        return fail(/code verifier|both auth code and code verifier/i.test(error.message)
            ? 'Open the sign-in link in the same browser you requested it from.'
            : 'That sign-in link is invalid or has expired.');
    }
    location.replace(takeNext());
})();
