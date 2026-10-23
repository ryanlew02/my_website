/** Avatar rules, mirrored by the `avatars` bucket config in the migration. */
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const AVATAR_MAX_INPUT = 5 * 1024 * 1024;   // what we accept from the picker
export const AVATAR_MAX_UPLOAD = 512 * 1024;       // what the bucket accepts

export function checkAvatarFile(f: { type: string; size: number }): string | null {
    if (!AVATAR_TYPES.includes(f.type)) return 'Use a PNG, JPEG or WebP image.';
    if (f.size > AVATAR_MAX_INPUT) return 'That image is over 5 MB.';
    return null;
}

/**
 * Center-crop to a square and re-encode at 256px. Re-encoding through a
 * canvas also drops EXIF (including GPS location) and anything else that
 * was riding along in the original file.
 */
export async function squareAvatar(file: File, size = 256): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
    if (blob && blob.type === 'image/webp') return blob;
    // Safari before 17 can't encode WebP.
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.88));
}
