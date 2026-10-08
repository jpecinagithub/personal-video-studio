import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'pvs_admin';
const SESSION_TTL = 7 * 24 * 3600; // 7 días

// Comparación segura: timingSafeEqual exige la misma longitud.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function b64urlEncode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function b64urlDecode(str) {
  return JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
}

// Firma HMAC-SHA256 del payload con el secreto de sesión.
export function signSession(username) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('Falta ADMIN_SESSION_SECRET en las variables de entorno.');
  const payload = b64urlEncode({ u: username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL });
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(cookieHeader) {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || !cookieHeader) return false;
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return false;
    const [payload, sig] = match[1].split('.');
    if (!payload || !sig) return false;
    const expected = createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const data = b64urlDecode(payload);
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return false;
    if (data.u !== process.env.ADMIN_USERNAME) return false;
    return data.u;
  } catch {
    return false;
  }
}

// Compara usuario + contraseña (bcrypt). Siempre hace una comparación bcrypt
// para no filtrar por tiempo si el usuario existe o no.
export async function verifyCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  // Hash dummy válido para mantener el tiempo constante cuando no hay hash configurado.
  const dummy = '$2b$10$C6UzMDM.H6dfI/f/IKc8Xu0o8qOqJ9Z8Y8X8W8V8U8T8S8R8Q8P8O8N8M';
  const okPass = await bcrypt.compare(String(password || ''), hash || dummy);
  const okUser = safeEqual(username, expectedUser) && expectedUser.length > 0;
  return okUser && okPass && !!hash;
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

// Lanza { status: 401 } si no hay sesión válida. Usar en cada endpoint protegido.
export function requireAdmin(req) {
  const user = verifySession(req.headers?.cookie);
  if (!user) {
    const err = new Error('No autorizado.');
    err.status = 401;
    throw err;
  }
  return user;
}

export function getClientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
