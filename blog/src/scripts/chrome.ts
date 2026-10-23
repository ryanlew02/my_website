// Runs on every page: theme toggle, header account menu, code-copy buttons.
import { getMe, onAuthChange, signOut } from '../lib/session';
import { supabaseConfigured } from '../lib/supabase';
import { avatarEl } from '../lib/avatar-el';
import { el } from '../lib/dom';

// ── Theme ─────────────────────────────────────────────────────────────────
const root = document.documentElement;
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const current = root.dataset.theme
        ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = current === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
});

// ── Code blocks ───────────────────────────────────────────────────────────
for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    if (!navigator.clipboard) continue;
    btn.hidden = false;
    btn.addEventListener('click', async () => {
        const code = btn.closest('.code-block')?.querySelector('pre')?.innerText ?? '';
        try {
            await navigator.clipboard.writeText(code.replace(/\n$/, ''));
            btn.textContent = 'Copied';
            btn.classList.add('copied');
        } catch {
            btn.textContent = 'Press ⌘C';
        }
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1600);
    });
}

// ── Account menu ──────────────────────────────────────────────────────────
const slot = document.querySelector<HTMLElement>('[data-account]');
const signinLink = slot?.querySelector<HTMLAnchorElement>('[data-signin-link]');
if (slot && !supabaseConfigured) slot.hidden = true;

async function renderAccount() {
    if (!slot || !supabaseConfigured) return;
    const me = await getMe();
    if (!me) {
        slot.replaceChildren(signinLink ?? '');
        return;
    }
    const p = me.profile;
    const menu = el('div', { class: 'account-menu', id: 'account-menu', hidden: true, role: 'menu' },
        el('div', { class: 'who' },
            el('strong', {}, p?.display_name ?? 'Signed in'),
            p ? `@${p.username}` : ''),
        p ? el('a', { href: `/blog/user/?u=${encodeURIComponent(p.username)}`, role: 'menuitem' }, 'Your profile') : null,
        el('a', { href: '/blog/account/', role: 'menuitem' }, 'Account settings'),
        me.isAdmin ? el('a', { href: '/blog/admin/', role: 'menuitem' }, 'Admin dashboard') : null,
        el('button', {
            type: 'button', role: 'menuitem',
            onclick: async () => { await signOut(); location.reload(); },
        }, 'Sign out'),
    );
    const trigger = el('button', {
        class: 'account-trigger', type: 'button',
        'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'account-menu',
        'aria-label': 'Account menu',
    }, avatarEl(p ?? { display_name: me.session.user.email ?? '?' }, 'sm'));

    const setOpen = (open: boolean) => {
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
        if (open) menu.querySelector<HTMLElement>('a, button')?.focus();
    };
    trigger.addEventListener('click', () => setOpen(menu.hidden !== false));
    document.addEventListener('click', (e) => { if (!slot.contains(e.target as Node)) setOpen(false); });
    slot.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) { setOpen(false); trigger.focus(); }
    });
    slot.replaceChildren(trigger, menu);
}

renderAccount();
onAuthChange(renderAccount);
