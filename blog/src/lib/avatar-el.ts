import { supabaseUrl } from './supabase';
import { avatarUrl, initials, type AvatarSource } from './avatar';
import { el } from './dom';

/** An avatar circle: the uploaded image, the provider's, or initials. null = removed author. */
export function avatarEl(p: AvatarSource | null, size: '' | 'sm' | 'lg' = '') {
    const cls = `avatar${size ? ` avatar--${size}` : ''}${p ? '' : ' avatar--removed'}`;
    if (!p) return el('span', { class: cls, 'aria-hidden': 'true' }, '–');
    const src = avatarUrl(p, supabaseUrl);
    return src
        ? el('span', { class: cls }, el('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', width: 72, height: 72 }))
        : el('span', { class: cls, 'aria-hidden': 'true' }, initials(p));
}

