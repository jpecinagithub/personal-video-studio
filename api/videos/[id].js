import { getRedis } from '../_lib/redis.js';
import { findVideo, toPublicVideo } from '../_lib/store.js';
import { sendError } from '../_lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'Método no permitido.');
  try {
    const redis = getRedis();
    const video = await findVideo(redis, req.query.id);
    if (!video) return sendError(res, 404, 'Vídeo no encontrado.');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(toPublicVideo(video));
  } catch (e) {
    return sendError(res, 500, e.message || 'Error al cargar el vídeo.');
  }
}
