import { requireAdmin } from '../_lib/auth.js';
import { sendError } from '../_lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'Método no permitido.');
  try {
    const user = requireAdmin(req);
    return res.status(200).json({ ok: true, user });
  } catch (e) {
    return sendError(res, e.status || 401, 'No autorizado.');
  }
}
