import { supabase } from '../lib/supabase';
import { getMe } from '../lib/session';
import { safeNext } from '../lib/redirect';
import { authErrorMessage, callbackUrl, rememberNext } from '../lib/auth-flow';
import { friendlyError } from '../lib/errors';
import { el } from '../lib/dom';

const sb = supabase();
const root = document.querySelector<HTMLElement>('[data-signin]');
const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next'));
const errorBox = document.querySelector<HTMLElement>('[data-signin-error]');

function showError(msg: string) {
    errorBox?.replaceChildren(msg ? el('p', { class: 'notice notice--error', style: 'margin-bottom:16px' }, msg) : '');
}

if (sb && root) {
    showError(authErrorMessage(params.get('error_code') ?? params.get('error'), params.get('error_description')));

    getMe().then((me) => { if (me) location.replace(next); });

    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-provider]')) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            rememberNext(next);
            const { error } = await sb.auth.signInWithOAuth({
                provider: btn.dataset.provider as 'github' | 'google',
                options: { redirectTo: callbackUrl() },
            });
            if (error) { showError(friendlyError(error, 'Couldn’t start sign-in. Please try again.')); btn.disabled = false; }
        });
    }

    const form = root.querySelector<HTMLFormElement>('[data-email-form]');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector<HTMLInputElement>('input[name=email]')!;
        const email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Enter a valid email address.'); input.focus(); return; }
        const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
        submit.disabled = true;
        rememberNext(next);
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true } });
        submit.disabled = false;
        if (error) {
            showError(/rate limit/i.test(error.message)
                ? 'Too many emails requested. Wait a few minutes and try again.'
                : friendlyError(error, 'Couldn’t send the email. Please try again.'));
            return;
        }
        showError('');
        form.replaceWith(el('div', { class: 'notice notice--success', role: 'status' },
            `Check ${email} for a sign-in link. Open it in this browser — it expires in an hour.`));
    });
}
