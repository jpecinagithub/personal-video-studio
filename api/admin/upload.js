import { handleUpload } from '@vercel/blob/client';
import { requireAdmin } from '../_lib/auth.js';
import { sendError } from '../_lib/validate.js';

// Emite tokens de subida directa navegador -> Vercel Blob.
// El archivo NUNCA pasa por la Function: solo viaja el token firmado.
const ALLOWED = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/ogg',
  'image/jpeg',
  'image/png',
  'image/webp',
];

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string' && req.body.length > 0) return JSON.parse(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Método no permitido.');
  try {
    const body = await readBody(req);
    const json = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => {
        // Solo el administrador puede obtener tokens de subida.
        requireAdmin(req);
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 1024 * 1024 * 1024, // 1 GB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (e) {
    return sendError(res, e.status || 500, e.message || 'Error al generar el token de subida.');
  }
}
