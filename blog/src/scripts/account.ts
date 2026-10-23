import { supabase } from '../lib/supabase';
import { getMe, signOut, PROFILE_COLUMNS, type Profile } from '../lib/session';
import { friendlyError } from '../lib/errors';
import { el, toast, confirmDialog } from '../lib/dom';
import { avatarEl } from '../lib/avatar-el';
import { checkAvatarFile, squareAvatar, AVATAR_MAX_UPLOAD } from '../lib/image';

const sb = supabase();
const root = document.querySelector<HTMLElement>('[data-account-page]')!;
const fmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

function field(label: string, input: HTMLElement, hint?: string) {
    const id = input.id || `f-${Math.random().toString(36).slice(2, 8)}`;
    input.id = id;
    return el('div', { class: 'field' }, el('label', { for: id }, label), input, hint ? el('span', { class: 'hint' }, hint) : null);
}

async function main() {
    if (!sb) { root.replaceChildren(el('p', { class: 'notice' }, 'Accounts aren’t configured on this build.')); return; }
    const me = await getMe();
    if (!me) { location.replace(`/blog/signin/?next=${encodeURIComponent('/blog/account/')}`); return; }
    if (!me.profile) { root.replaceChildren(el('p', { class: 'notice notice--error' }, 'Your profile couldn’t be loaded. Refresh to try again.')); return; }

    let profile: Profile = me.profile;
    const { data: account } = await sb.rpc('my_account');
    const changedAt = (account as { username_changed_at?: string } | null)?.username_changed_at;
    const cooldownUntil = changedAt ? new Date(new Date(changedAt).getTime() + 30 * 864e5) : null;
    const usernameLocked = cooldownUntil !== null && cooldownUntil > new Date();

    // ── Profile ────────────────────────────────────────────────────────────
    const displayName = el('input', { name: 'display_name', maxlength: 50, required: true, autocomplete: 'nickname' });
    displayName.value = profile.display_name;
    const username = el('input', { name: 'username', maxlength: 24, pattern: '[a-z0-9_]{3,24}', required: true, autocapitalize: 'off', spellcheck: 'false', disabled: usernameLocked });
    username.value = profile.username;
    const bio = el('textarea', { name: 'bio', rows: 3, maxlength: 280 });
    bio.value = profile.bio;
    const err = el('p', { class: 'form-error', role: 'alert' });
    const save = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Save profile');

    const profileForm = el('form', { class: 'stack', novalidate: true },
        field('Display name', displayName, 'Shown next to your comments.'),
        el('div', { class: 'field' },
            el('label', { for: 'username' }, 'Username'),
            el('div', { class: 'input-prefix' }, el('span', {}, '@'), Object.assign(username, { id: 'username' })),
            el('span', { class: 'hint' }, usernameLocked
                ? `You can change it again on ${fmt.format(cooldownUntil!)}.`
                : '3–24 characters: lowercase letters, numbers, underscores. After you change it, it’s locked for 30 days.')),
        field('Bio', bio, 'Optional, up to 280 characters. Plain text.'),
        err,
        el('div', {}, save));

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.textContent = '';
        const update: Partial<Profile> = { display_name: displayName.value.trim(), bio: bio.value.trim() };
        const u = username.value.trim().toLowerCase();
        if (!update.display_name) { err.textContent = 'Display name can’t be empty.'; return; }
        if (!usernameLocked && u !== profile.username) {
            if (!/^[a-z0-9_]{3,24}$/.test(u)) { err.textContent = 'Usernames are 3–24 lowercase letters, numbers or underscores.'; return; }
            if (!(await confirmDialog(`Change your username to @${u}? You won’t be able to change it again for 30 days.`, 'Change', false))) return;
            update.username = u;
        }
        save.disabled = true;
        const { data, error } = await sb.from('profiles').update(update).eq('id', profile.id).select(PROFILE_COLUMNS).maybeSingle();
        save.disabled = false;
        if (error) { err.textContent = friendlyError(error); return; }
        if (!data) { err.textContent = 'Your profile couldn’t be saved. You may need to sign in again.'; return; }
        profile = data as Profile;
        toast('Profile saved');
        if (update.username) location.reload();
    });

    // ── Avatar ─────────────────────────────────────────────────────────────
    const avatarBox = el('div', {}, avatarEl(profile, 'lg'));
    const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'visually-hidden', id: 'avatar-file' });
    const avatarErr = el('p', { class: 'form-error', role: 'alert' });
    const removeBtn = el('button', { class: 'btn btn--sm', type: 'button', hidden: !profile.avatar_path }, 'Remove');
    const uploadLabel = el('label', { class: 'btn btn--sm', for: 'avatar-file', tabindex: 0, role: 'button' }, 'Upload photo');
    uploadLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

    async function setAvatarPath(path: string | null) {
        const old = profile.avatar_path;
        const { data, error } = await sb!.from('profiles').update({ avatar_path: path }).eq('id', profile.id).select(PROFILE_COLUMNS).maybeSingle();
        if (error || !data) throw error ?? new Error('FORBIDDEN');
        profile = data as Profile;
        if (old && old !== path) await sb!.storage.from('avatars').remove([old]);
        avatarBox.replaceChildren(avatarEl(profile, 'lg'));
        removeBtn.hidden = !profile.avatar_path;
    }

    fileInput.addEventListener('change', async () => {
        avatarErr.textContent = '';
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        const problem = checkAvatarFile(file);
        if (problem) { avatarErr.textContent = problem; return; }
        uploadLabel.textContent = 'Uploading…';
        try {
            const blob = await squareAvatar(file);
            if (blob.size > AVATAR_MAX_UPLOAD) throw new Error('That image is too detailed to compress under 512 KB.');
            const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
            const path = `${profile.id}/${Date.now()}.${ext}`;
            const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
            if (error) throw error;
            await setAvatarPath(path);
            toast('Photo updated');
        } catch (e) {
            avatarErr.textContent = e instanceof Error && e.message.startsWith('That image') ? e.message : friendlyError(e, 'Upload failed. Try a different image.');
        } finally {
            uploadLabel.textContent = 'Upload photo';
        }
    });
    removeBtn.addEventListener('click', async () => {
        try { await setAvatarPath(null); toast('Photo removed'); } catch (e) { avatarErr.textContent = friendlyError(e); }
    });

    // ── Session / danger zone ──────────────────────────────────────────────
    const user = me.session.user;
    const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider ?? 'email'];

    const deleteBtn = el('button', { class: 'btn btn--danger', type: 'button', disabled: me.isAdmin }, 'Delete account');
    deleteBtn.addEventListener('click', async () => {
        const typed = prompt(`This permanently deletes your account, likes and comments (comments others replied to become “removed”). Type your username (${profile.username}) to confirm.`);
        if (typed?.trim().toLowerCase() !== profile.username) { if (typed !== null) toast('Username didn’t match — nothing was deleted.'); return; }
        deleteBtn.disabled = true;
        try {
            const { data: files } = await sb.storage.from('avatars').list(profile.id);
            if (files?.length) await sb.storage.from('avatars').remove(files.map((f) => `${profile.id}/${f.name}`));
            const { error } = await sb.rpc('delete_my_account');
            if (error) throw error;
            await sb.auth.signOut({ scope: 'local' });
            location.replace('/blog/?account=deleted');
        } catch (e) {
            deleteBtn.disabled = false;
            toast(friendlyError(e));
        }
    });

    root.replaceChildren(
        me.banned ? el('p', { class: 'notice notice--error', style: 'margin-bottom:20px' }, 'Your account is suspended from commenting and editing your profile.') : '',
        el('section', { class: 'panel' },
            el('h2', {}, 'Photo'),
            el('div', { class: 'field-row' }, avatarBox, el('div', { class: 'field-row' }, uploadLabel, fileInput, removeBtn)),
            el('p', { class: 'muted', style: 'margin-top:10px' }, 'PNG, JPEG or WebP. Cropped to a square; location data is stripped.'),
            avatarErr),
        el('section', { class: 'panel' }, el('h2', {}, 'Profile'), profileForm),
        el('section', { class: 'panel' },
            el('h2', {}, 'Sign-in'),
            el('p', {}, 'Email: ', el('strong', {}, user.email ?? '—'), el('span', { class: 'muted' }, ' (private)')),
            el('p', { class: 'muted' }, `Signed in with ${providers.join(', ')}. Member since ${fmt.format(new Date(profile.created_at))}.`),
            el('p', { class: 'muted' }, el('a', { href: `/blog/user/?u=${encodeURIComponent(profile.username)}` }, 'View your public profile →')),
            el('div', { class: 'field-row', style: 'margin-top:16px' },
                el('button', { class: 'btn', type: 'button', onclick: async () => { await signOut(); location.replace('/blog/'); } }, 'Sign out'),
                el('button', {
                    class: 'btn', type: 'button',
                    onclick: async () => { await sb.auth.signOut({ scope: 'global' }); location.replace('/blog/'); },
                }, 'Sign out on all devices'))),
        el('section', { class: 'panel' },
            el('h2', {}, 'Delete account'),
            el('p', { class: 'muted' }, me.isAdmin
                ? 'Admin accounts can’t be deleted from here. Remove the admin role in Supabase first.'
                : 'Removes your profile, photo, likes and comments. This can’t be undone.'),
            el('div', { style: 'margin-top:14px' }, deleteBtn)),
    );
}

main().catch((e) => root.replaceChildren(el('p', { class: 'notice notice--error' }, friendlyError(e))));
