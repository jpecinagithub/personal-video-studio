import { clearSessionCookie } from '../_lib/auth.js';
import { sendError } from '../_lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido.');
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
