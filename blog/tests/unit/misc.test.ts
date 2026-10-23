import { describe, expect, it } from 'vitest';
import { friendlyError } from '../../src/lib/errors';
import { avatarUrl, initials } from '../../src/lib/avatar';
import { checkAvatarFile } from '../../src/lib/image';
import { isPublished } from '../../src/lib/posts';

describe('friendlyError', () => {
    it('maps database error codes to readable text and never echoes internals', () => {
        expect(friendlyError({ message: 'RATE_LIMITED: slow down — try again in a minute' })).toBe('Slow down — try again in a minute.');
        expect(friendlyError({ message: 'USERNAME_COOLDOWN: x' })).toMatch(/30 days/);
        expect(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' })).toBe('That’s already taken.');
        expect(friendlyError({ code: '42501', message: 'new row violates row-level security policy for table "comments"' })).not.toMatch(/comments|policy/);
        expect(friendlyError({ message: 'TypeError: Failed to fetch' })).toMatch(/connection/);
        const generic = friendlyError({ message: 'relation "public.secret_table" does not exist' });
        expect(generic).not.toContain('secret_table');
    });
});

describe('avatars', () => {
    it('only builds URLs for storage paths or allow-listed provider hosts', () => {
        expect(avatarUrl({ avatar_path: 'u1/a b.webp' }, 'https://x.supabase.co')).toBe('https://x.supabase.co/storage/v1/object/public/avatars/u1/a%20b.webp');
        expect(avatarUrl({ provider_avatar_url: 'https://avatars.githubusercontent.com/u/1' }, '')).toBe('https://avatars.githubusercontent.com/u/1');
        expect(avatarUrl({ provider_avatar_url: 'https://evil.example/x.png' }, '')).toBeNull();
        expect(avatarUrl({ provider_avatar_url: 'javascript:alert(1)' }, '')).toBeNull();
    });
    it('derives initials', () => {
        expect(initials({ display_name: 'Ada Lovelace' })).toBe('AL');
        expect(initials({ username: 'grace' })).toBe('GR');
    });
    it('validates uploads by type and size', () => {
        expect(checkAvatarFile({ type: 'image/svg+xml', size: 10 })).toMatch(/PNG/);
        expect(checkAvatarFile({ type: 'image/gif', size: 10 })).toMatch(/PNG/);
        expect(checkAvatarFile({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
        expect(checkAvatarFile({ type: 'image/webp', size: 1000 })).toBeNull();
    });
});

describe('isPublished', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    it('hides drafts and future-dated posts', () => {
        expect(isPublished({ draft: false, date: new Date('2026-05-01') }, now)).toBe(true);
        expect(isPublished({ draft: true, date: new Date('2026-05-01') }, now)).toBe(false);
        expect(isPublished({ draft: false, date: new Date('2026-07-01') }, now)).toBe(false);
    });
});
