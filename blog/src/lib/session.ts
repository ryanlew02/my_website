import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    avatar_path: string | null;
    provider_avatar_url: string | null;
    created_at: string;
}

export const PROFILE_COLUMNS = 'id, username, display_name, bio, avatar_path, provider_avatar_url, created_at';

export interface Me {
    session: Session;
    profile: Profile | null;
    isAdmin: boolean;
    banned: boolean;
}

let mePromise: Promise<Me | null> | null = null;

/**
 * The signed-in visitor, or null. `getSession()` reads the stored session
 * (refreshing it if expired) so this is cheap; the profile and role are
 * fetched once per page. The role is only ever a UI hint — every privileged
 * action is checked again by the database.
 */
export function getMe(force = false): Promise<Me | null> {
    if (mePromise && !force) return mePromise;
    mePromise = (async () => {
        const sb = supabase();
        if (!sb) return null;
        const { data, error } = await sb.auth.getSession();
        if (error || !data.session) return null;
        const session = data.session;
        const [profileRes, accountRes] = await Promise.all([
            sb.from('profiles').select(PROFILE_COLUMNS).eq('id', session.user.id).maybeSingle(),
            sb.rpc('my_account'),
        ]);
        // A 401 here means the stored session is no longer valid server side.
        if (profileRes.error && /JWT|401/.test(profileRes.error.message)) {
            await sb.auth.signOut({ scope: 'local' });
            return null;
        }
        const account = (accountRes.data ?? {}) as { is_admin?: boolean; banned?: boolean };
        return {
            session,
            profile: (profileRes.data as Profile | null) ?? null,
            isAdmin: Boolean(account.is_admin),
            banned: Boolean(account.banned),
        };
    })();
    return mePromise;
}

export async function signOut() {
    const sb = supabase();
    if (!sb) return;
    await sb.auth.signOut();
    mePromise = null;
}

/** Re-run `fn` whenever someone signs in or out in this or another tab. */
export function onAuthChange(fn: () => void) {
    const sb = supabase();
    if (!sb) return;
    sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
            mePromise = null;
            // Defer: supabase-js warns against awaiting other calls inside this callback.
            setTimeout(fn, 0);
        }
    });
}
