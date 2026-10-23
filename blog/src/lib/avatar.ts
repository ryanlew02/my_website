export interface AvatarSource {
    avatar_path?: string | null;
    provider_avatar_url?: string | null;
    display_name?: string | null;
    username?: string | null;
}

export function avatarUrl(p: AvatarSource, supabaseUrl: string): string | null {
    if (p.avatar_path && supabaseUrl) {
        return `${supabaseUrl}/storage/v1/object/public/avatars/${p.avatar_path.split('/').map(encodeURIComponent).join('/')}`;
    }
    if (p.provider_avatar_url && /^https:\/\/(avatars\.githubusercontent\.com|lh\d\.googleusercontent\.com)\//.test(p.provider_avatar_url)) {
        return p.provider_avatar_url;
    }
    return null;
}

export function initials(p: AvatarSource): string {
    const name = (p.display_name || p.username || '?').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
    return letters.toUpperCase();
}
