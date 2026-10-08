import { randomUUID } from 'node:crypto';

// Limpieza de texto: recorta, colapsa espacios y elimina caracteres de control.
export function cleanText(value, maxLen) {
  let s = String(value ?? '');
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = s.trim().replace(/\s+/g, ' ');
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function newId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function slugify(title) {
  const base = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'video';
}

export function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''));
}

export function isHttpsUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Escape para interpolar valores en el HTML de Open Graph.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lee el cuerpo JSON de la petición (Vercel lo pre-parsea a veces; si no, lo leemos del stream).
export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string' && req.body.length > 0) return JSON.parse(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}
