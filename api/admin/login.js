import { getRedis } from '../_lib/redis.js';
import { verifyCredentials, signSession, setSessionCookie, getClientIp } from '../_lib/auth.js';
import { sendError, readJson } from '../_lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido.');
  try {
    // Rate limit contra fuerza bruta: 20 intentos / 10 min por IP.
    const redis = getRedis();
    const ip = getClientIp(req);
    const rlKey = `rl:login:${ip}`;
    const attempts = await redis.incr(rlKey);
    if (attempts === 1) await redis.expire(rlKey, 600);
    if (attempts > 20) return sendError(res, 429, 'Demasiados intentos. Espera unos minutos.');

    const body = await readJson(req);
    const ok = await verifyCredentials(body.username, body.password);
    if (!ok) return sendError(res, 401, 'Credenciales incorrectas.');

    setSessionCookie(res, signSession(process.env.ADMIN_USERNAME));
    return res.status(200).json({ ok: true, user: process.env.ADMIN_USERNAME });
  } catch (e) {
    return sendError(res, 500, e.message || 'Error al iniciar sesión.');
  }
}
