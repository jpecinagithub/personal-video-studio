import { getRedis, kComments, MAX_COMMENTS } from '../../_lib/redis.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendError, readJson } from '../../_lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return sendError(res, 405, 'Método no permitido.');
  try {
    requireAdmin(req);
    const redis = getRedis();
    const body = await readJson(req);
    const videoId = String(body.videoId || '').slice(0, 120);
    const commentId = String(req.query.id || '').slice(0, 120);
    if (!videoId || !commentId) return sendError(res, 400, 'Faltan parámetros.');

    const raws = await redis.lrange(kComments(videoId), 0, MAX_COMMENTS - 1);
    let target = null;
    for (const r of raws || []) {
      try {
        const c = typeof r === 'string' ? JSON.parse(r) : r;
        if (c && c.id === commentId) {
          target = r;
          break;
        }
      } catch {
        /* entrada corrupta: se ignora */
      }
    }
    if (!target) return sendError(res, 404, 'Comentario no encontrado.');

    await redis.lrem(kComments(videoId), 1, target);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return sendError(res, e.status || 500, e.message || 'Error al eliminar el comentario.');
  }
}
