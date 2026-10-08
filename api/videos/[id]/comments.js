import { getRedis, kComments, MAX_COMMENTS } from '../../_lib/redis.js';
import { getClientIp } from '../../_lib/auth.js';
import { findVideo, toPublicComment } from '../../_lib/store.js';
import { sendError, readJson, cleanText, newId, nowIso } from '../../_lib/validate.js';

const MAX_NICKNAME = 30;
const MAX_TEXT = 500;
// Rate limit: 5 comentarios por minuto e IP.
const RL_LIMIT = 5;
const RL_WINDOW = 60;

// Inserción atómica: solo añade si hay menos de 30 comentarios.
const INSERT_SCRIPT = `
if redis.call('LLEN', KEYS[1]) >= tonumber(ARGV[2]) then
  return 0
end
redis.call('LPUSH', KEYS[1], ARGV[1])
return 1
`;

export default async function handler(req, res) {
  try {
    const redis = getRedis();
    const video = await findVideo(redis, req.query.id);
    if (!video) return sendError(res, 404, 'Vídeo no encontrado.');

    if (req.method === 'GET') {
      const raws = await redis.lrange(kComments(video.id), 0, MAX_COMMENTS - 1);
      const list = (raws || [])
        .map((r) => {
          try {
            return typeof r === 'string' ? JSON.parse(r) : r;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .map(toPublicComment);
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      // Rate limiting por IP (ventana fija).
      const ip = getClientIp(req);
      const rlKey = `rl:comment:${ip}`;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.expire(rlKey, RL_WINDOW);
      if (count > RL_LIMIT) {
        return sendError(res, 429, 'Estás publicando demasiados comentarios. Espera un minuto.');
      }

      const body = await readJson(req);
      const nickname = cleanText(body.nickname, MAX_NICKNAME);
      const text = cleanText(body.text, MAX_TEXT);
      if (!nickname) return sendError(res, 400, 'El nickname es obligatorio.');
      if (!text) return sendError(res, 400, 'El comentario no puede estar vacío.');
      if (String(body.nickname || '').trim().length > MAX_NICKNAME) {
        return sendError(res, 400, `El nickname no puede superar ${MAX_NICKNAME} caracteres.`);
      }
      if (String(body.text || '').trim().length > MAX_TEXT) {
        return sendError(res, 400, `El comentario no puede superar ${MAX_TEXT} caracteres.`);
      }

      const comment = { id: newId(), videoId: video.id, nickname, text, createdAt: nowIso() };
      const added = await redis.eval(INSERT_SCRIPT, [kComments(video.id)], [JSON.stringify(comment), String(MAX_COMMENTS)]);
      if (Number(added) !== 1) {
        return sendError(res, 409, 'Este vídeo ha alcanzado el máximo de comentarios.');
      }
      return res.status(201).json(toPublicComment(comment));
    }

    return sendError(res, 405, 'Método no permitido.');
  } catch (e) {
    return sendError(res, 500, e.message || 'Error en los comentarios.');
  }
}
