import { getRedis, kVideo, kVideoSlug, kVideos, MAX_VIDEOS } from '../_lib/redis.js';
import { requireAdmin } from '../_lib/auth.js';
import { toPublicVideo, uniqueSlug } from '../_lib/store.js';
import { sendError, readJson, cleanText, newId, nowIso, isHttpsUrl } from '../_lib/validate.js';

// Verifica que una URL externa sea un archivo de vídeo directo y accesible.
async function checkExternalVideo(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    let res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) {
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: ctrl.signal,
        redirect: 'follow',
      });
    }
    const reachable = res.ok || res.status === 206;
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    return { reachable, contentType: ct };
  } catch {
    return { reachable: false, contentType: '' };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido.');
  try {
    requireAdmin(req);
    const redis = getRedis();
    const body = await readJson(req);

    const rawTitle = String(body.title || '');
    if (!rawTitle.trim()) return sendError(res, 400, 'El título es obligatorio.');
    if (rawTitle.trim().length > 120) return sendError(res, 400, 'El título no puede superar 120 caracteres.');
    const rawDesc = String(body.description || '');
    if (rawDesc.trim().length > 2000) return sendError(res, 400, 'La descripción no puede superar 2000 caracteres.');

    const storageType = body.storageType === 'external' ? 'external' : 'blob';
    const videoUrl = String(body.videoUrl || '').trim();
    if (!isHttpsUrl(videoUrl)) return sendError(res, 400, 'La URL del vídeo debe empezar por https://');
    const thumbnailUrl = String(body.thumbnailUrl || '').trim();
    if (thumbnailUrl && !isHttpsUrl(thumbnailUrl)) {
      return sendError(res, 400, 'La URL del thumbnail debe empezar por https://');
    }

    if (storageType === 'external') {
      const check = await checkExternalVideo(videoUrl);
      if (!check.reachable) {
        return sendError(res, 400, 'No se pudo acceder a la URL del vídeo. Revisa que exista y sea pública.');
      }
      if (check.contentType && !check.contentType.startsWith('video/')) {
        return sendError(
          res,
          400,
          'La URL no parece un archivo de vídeo directo (devuelve ' + check.contentType + '). Usa la URL directa del archivo, no la de una página web.'
        );
      }
    }

    const count = await redis.scard(kVideos);
    if (count >= MAX_VIDEOS) {
      return sendError(res, 409, `Máximo de ${MAX_VIDEOS} vídeos alcanzado. Elimina uno para publicar otro.`);
    }

    const id = newId();
    const slug = await uniqueSlug(redis, rawTitle);
    const video = {
      id,
      slug,
      title: cleanText(rawTitle, 120),
      description: cleanText(rawDesc, 2000),
      videoUrl,
      thumbnailUrl,
      storageType,
      mimeType: cleanText(body.mimeType, 60),
      duration: Math.max(0, Math.floor(Number(body.duration) || 0)),
      width: Math.max(0, Math.floor(Number(body.width) || 0)),
      height: Math.max(0, Math.floor(Number(body.height) || 0)),
      blobPaths: Array.isArray(body.blobPaths) ? body.blobPaths.filter((p) => typeof p === 'string').slice(0, 10) : [],
      createdAt: nowIso(),
      published: true,
    };

    await redis.set(kVideo(id), JSON.stringify(video));
    await redis.set(kVideoSlug(slug), id);
    await redis.sadd(kVideos, id);

    return res.status(201).json(toPublicVideo(video));
  } catch (e) {
    return sendError(res, e.status || 500, e.message || 'Error al publicar el vídeo.');
  }
}
