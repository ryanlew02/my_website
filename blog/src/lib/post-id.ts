import { supabase } from './supabase';

export interface PostRecord { id: string; comments_locked: boolean }

const cache = new Map<string, Promise<PostRecord | null>>();

/** The registry row for a post slug, or null if it isn't registered/published yet. */
export function postRecord(slug: string): Promise<PostRecord | null> {
    if (!cache.has(slug)) {
        cache.set(slug, (async () => {
            const sb = supabase();
            if (!sb) return null;
            const { data, error } = await sb.from('posts').select('id, comments_locked').eq('slug', slug).maybeSingle();
            // Distinguish "not registered" (null) from "couldn't reach the database" (throw).
            if (error) { cache.delete(slug); throw error; }
            return (data as PostRecord | null) ?? null;
        })());
    }
    return cache.get(slug)!;
}

export const postIdFor = async (slug: string) => (await postRecord(slug))?.id ?? null;
