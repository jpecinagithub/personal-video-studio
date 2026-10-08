import { kVideo, kVideoSlug } from './redis.js';
import { isValidSlug, slugify } from './validate.js';

// Campos públicos de un vídeo (nunca se exponen rutas internas de Blob ni secretos).
export function toPublicVideo(v) {
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    description: v.description || '',
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl || '',
    storageType: v.storageType,
    mimeType: v.mimeType || '',
    duration: v.duration || 0,
    width: v.width || 0,
    height: v.height || 0,
    createdAt: v.createdAt,
  };
}

export function toPublicComment(c) {
  return { id: c.id, videoId: c.videoId, nickname: c.nickname, text: c.text, createdAt: c.createdAt };
}

// Busca un vídeo publicado por id o por slug.
export async function findVideo(redis, idOrSlug) {
  const key = String(idOrSlug || '').slice(0, 120);
  if (!key) return null;
  let raw = await redis.get(kVideo(key));
  if (!raw && isValidSlug(key)) {
    const id = await redis.get(kVideoSlug(key));
    if (id) raw = await redis.get(kVideo(id));
  }
  if (!raw) return null;
  const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return v && v.published !== false ? v : null;
}

// Genera un slug único a partir del título.
export async function uniqueSlug(redis, title, excludeId = null) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  for (;;) {
    const existingId = await redis.get(kVideoSlug(slug));
    if (!existingId || existingId === excludeId) return slug;
    slug = `${base}-${n++}`;
    if (n > 100) throw new Error('No se pudo generar un slug único.');
  }
}
