import { getRedis, kVideo, kVideos } from './_lib/redis.js';
import { toPublicVideo } from './_lib/store.js';
import { sendError } from './_lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'Método no permitido.');
  try {
    const redis = getRedis();
    const ids = await redis.smembers(kVideos);
    if (!ids || ids.length === 0) return res.status(200).json([]);
    const raws = await Promise.all(ids.map((id) => redis.get(kVideo(id))));
    const videos = raws
      .map((r) => (typeof r === 'string' ? JSON.parse(r) : r))
      .filter((v) => v && v.published !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(toPublicVideo);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(videos);
  } catch (e) {
    return sendError(res, 500, e.message || 'Error al cargar los vídeos.');
  }
}
