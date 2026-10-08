import { del } from '@vercel/blob';
import { getRedis, kVideo, kVideoSlug, kVideos, kComments } from '../../_lib/redis.js';
import { requireAdmin } from '../../_lib/auth.js';
import { toPublicVideo } from '../../_lib/store.js';
import { sendError, readJson, cleanText, isHttpsUrl } from '../../_lib/validate.js';

// Borrado best-effort de archivos en Blob (nunca bloquea la operación principal).
async function deleteBlobs(paths) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  for (const p of paths || []) {
    if (typeof p !== 'string' || !p) continue;
    try {
      await del(p);
    } catch {
      /* se ignora: el archivo puede no existir */
    }
  }
}

async function getRaw(redis, id) {
  const raw = await redis.get(kVideo(String(id || '').slice(0, 120)));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export default async function handler(req, res) {
  try {
    requireAdmin(req);
    const redis = getRedis();
    const video = await getRaw(redis, req.query.id);
    if (!video) return sendError(res, 404, 'Vídeo no encontrado.');

    if (req.method === 'PUT') {
      const body = await readJson(req);

      if (body.title !== undefined) {
        const t = String(body.title || '');
        if (!t.trim()) return sendError(res, 400, 'El título es obligatorio.');
        if (t.trim().length > 120) return sendError(res, 400, 'El título no puede superar 120 caracteres.');
        video.title = cleanText(t, 120);
      }
      if (body.description !== undefined) {
        const d = String(body.description || '');
        if (d.trim().length > 2000) return sendError(res, 400, 'La descripción no puede superar 2000 caracteres.');
        video.description = cleanText(d, 2000);
      }
      if (body.videoUrl !== undefined) {
        const u = String(body.videoUrl || '').trim();
        if (!isHttpsUrl(u)) return sendError(res, 400, 'La URL del vídeo debe empezar por https://');
        video.videoUrl = u;
      }
      if (body.thumbnailUrl !== undefined) {
        const u = String(body.thumbnailUrl || '').trim();
        if (u && !isHttpsUrl(u)) return sendError(res, 400, 'La URL del thumbnail debe empezar por https://');
        video.thumbnailUrl = u;
      }
      if (body.storageType === 'blob' || body.storageType === 'external') video.storageType = body.storageType;
      if (body.mimeType !== undefined) video.mimeType = cleanText(body.mimeType, 60);
      if (body.duration !== undefined) video.duration = Math.max(0, Math.floor(Number(body.duration) || 0));
      if (body.width !== undefined) video.width = Math.max(0, Math.floor(Number(body.width) || 0));
      if (body.height !== undefined) video.height = Math.max(0, Math.floor(Number(body.height) || 0));
      if (Array.isArray(body.blobPaths)) {
        video.blobPaths = body.blobPaths.filter((p) => typeof p === 'string').slice(0, 10);
      }
      // NOTA: el slug es inmutable para no romper los enlaces ya compartidos.

      await redis.set(kVideo(video.id), JSON.stringify(video));
      if (Array.isArray(body.deletePaths) && body.deletePaths.length > 0) {
        await deleteBlobs(body.deletePaths);
      }
      return res.status(200).json(toPublicVideo(video));
    }

    if (req.method === 'DELETE') {
      await redis.del(kVideo(video.id));
      await redis.del(kVideoSlug(video.slug));
      await redis.srem(kVideos, video.id);
      await redis.del(kComments(video.id));
      await deleteBlobs(video.blobPaths);
      return res.status(200).json({ ok: true });
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (e) {
    return sendError(res, e.status || 500, e.message || 'Error en la operación.');
  }
}
