import { getRedis, kVideo, kVideoSlug } from './_lib/redis.js';
import { escapeHtml, isValidSlug } from './_lib/validate.js';

// Genera el HTML con metadatos Open Graph / Twitter Card para los scrapers
// (WhatsApp, Telegram, LinkedIn, X, Facebook…). Los rastreadores no ejecutan
// JavaScript, así que estas etiquetas deben venir en el HTML del servidor.
// En vercel.json, /video/:slug se reescribe aquí SOLO cuando el User-Agent
// es un bot; los navegadores reales reciben la SPA.

function baseUrl(req) {
  const env = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  if (env) return env;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return `${proto}://${host}`;
}

export function buildOgHtml({ video, canonical }) {
  const title = escapeHtml(video.title || 'Vídeo');
  const description = escapeHtml(
    video.description || 'Vídeo publicado en Personal Video Studio.'
  );
  const image = escapeHtml(video.thumbnailUrl || '');
  const videoUrl = escapeHtml(video.videoUrl || '');
  const mime = escapeHtml(video.mimeType || 'video/mp4');
  const siteName = 'Personal Video Studio';

  const imageTags = image
    ? `    <meta property="og:image" content="${image}" />\n    <meta name="twitter:image" content="${image}" />\n`
    : '';
  const videoTags =
    videoUrl && videoUrl.startsWith('https://')
      ? `    <meta property="og:video" content="${videoUrl}" />\n` +
        `    <meta property="og:video:secure_url" content="${videoUrl}" />\n` +
        `    <meta property="og:video:type" content="${mime}" />\n` +
        (video.width > 0 ? `    <meta property="og:video:width" content="${video.width}" />\n` : '') +
        (video.height > 0 ? `    <meta property="og:video:height" content="${video.height}" />\n` : '')
      : '';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title} — ${siteName}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="video.other" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
${imageTags}${videoTags}  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="theme-color" content="#0b0b0e" />
  <style>
    body { margin: 0; background: #0b0b0e; color: #f4f4f5; font-family: system-ui, sans-serif;
           display: grid; place-items: center; min-height: 100vh; padding: 24px; }
    .card { max-width: 560px; width: 100%; background: #121218; border: 1px solid rgba(255,255,255,.08);
            border-radius: 16px; overflow: hidden; }
    .card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; background: #000; }
    .body { padding: 20px 22px 24px; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 18px; color: #a1a1aa; font-size: 14px; line-height: 1.6; }
    a.btn { display: inline-block; background: #e11d48; color: #fff; text-decoration: none;
            padding: 10px 22px; border-radius: 999px; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    ${image ? `<img src="${image}" alt="${title}" />` : ''}
    <div class="body">
      <h1>${title}</h1>
      <p>${description}</p>
      <a class="btn" href="${escapeHtml(canonical)}">Ver vídeo</a>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').slice(0, 120);
  try {
    const redis = getRedis();
    const id = isValidSlug(slug) ? await redis.get(kVideoSlug(slug)) : null;
    if (!id) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send('<html><body>Vídeo no encontrado</body></html>');
    }
    const raw = await redis.get(kVideo(id));
    const video = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!video || video.published === false) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send('<html><body>Vídeo no encontrado</body></html>');
    }
    const canonical = `${baseUrl(req)}/video/${video.slug}`;
    const html = buildOgHtml({ video, canonical });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (e) {
    // Sin Redis no se puede resolver el vídeo: se devuelven los metadatos
    // genéricos del sitio (200) en lugar de un 500, para que los scrapers
    // (WhatsApp, Telegram…) reciban siempre una vista previa válida.
    if (String((e && e.message) || '').includes('Redis no configurado')) {
      const canonical = baseUrl(req);
      const html = buildOgHtml({
        video: {
          title: 'Personal Video Studio',
          description: 'Plataforma personal de vídeos: publica, comparte y comenta.',
          thumbnailUrl: '',
          videoUrl: '',
        },
        canonical,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300');
      return res.status(200).send(html);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send('<html><body>Error interno</body></html>');
  }
}
