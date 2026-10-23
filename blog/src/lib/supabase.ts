import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * The browser's Supabase client, or null when the project isn't configured
 * (the static blog still works; accounts and comments switch off).
 *
 * Sessions: this is a static site with no server of its own, so there is
 * nothing that could set an HttpOnly cookie. supabase-js keeps the session
 * in localStorage and refreshes it itself — Supabase's documented pattern for
 * client-only apps. The PKCE flow means OAuth codes in the callback URL are
 * useless without the verifier this browser holds. The page CSP (script-src
 * 'self' + hashes) and rendering all user text as text are what keep that
 * storage out of reach of injected script.
 */
export function supabase(): SupabaseClient | null {
    if (!supabaseConfigured) return null;
    client ??= createClient(url!, key!, {
        auth: {
            flowType: 'pkce',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // the callback page exchanges the code explicitly
        },
    });
    return client;
}

export const supabaseUrl = url ?? '';
