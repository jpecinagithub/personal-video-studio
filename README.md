# Personal Video Studio

Plataforma personal de publicación y reproducción de vídeos: galería de hasta **10 vídeos**,
reproductor propio con controles completos, URLs permanentes con vista previa al compartir
(WhatsApp, Telegram, LinkedIn…), comentarios sin registro (máx. **30 por vídeo**) y panel de
administración protegido.

**100% serverless, sin servicios externos más allá de Vercel Hobby:**
Vercel Functions + Vercel Blob + Upstash Redis (vía Vercel Marketplace, plan gratuito).
Todo en español.

## Características

- **Galería**: tarjetas con thumbnail, título, duración, fecha y descripción; búsqueda por título; responsive (1 columna en móvil, 2–3 en escritorio).
- **Reproductor propio (HTML5)**: play/pause, barra de progreso con seek táctil, tiempo transcurrido/total, volumen, mute, pantalla completa, ±10 s, reiniciar, velocidades 0.5x–2x, atajos de teclado, Picture-in-Picture, indicador de carga y gestión de errores. Detección honesta de compatibilidad de formato (MP4/WebM/MOV/M4V/OGV): si el navegador no puede reproducirlo, lo dice y sugiere MP4/H.264.
- **Compartir**: URL permanente `/video/mi-video`; Web Share API + WhatsApp, Telegram, LinkedIn, correo y copiar enlace. **Open Graph y Twitter Card generados en el servidor** (función `/api/og` + rewrite condicional por User-Agent en `vercel.json`): WhatsApp muestra título, descripción y thumbnail aunque el rastreador no ejecute JavaScript.
- **Comentarios**: nickname + texto, sin registro; límites 30 caracteres / 500 caracteres; rate limiting por IP; inserción atómica en Redis (nunca más de 30 aunque haya peticiones simultáneas); el admin puede eliminarlos.
- **Administración** (`/admin`): login con usuario + hash bcrypt en variables de entorno, sesión en cookie HttpOnly/Secure/SameSite. Alta por **subida directa navegador → Blob** (con token seguro, progreso y sin pasar el archivo por la Function) o por **URL externa HTTPS** (validada en servidor: debe ser un archivo de vídeo accesible, no una página web). Thumbnails por subida de imagen o **captura de fotograma** del vídeo (canvas 16:9 optimizado). Contador X/10, edición, borrado con limpieza de archivos en Blob (sin huérfanos).
- **PWA instalable**: manifest, iconos, Service Worker que **nunca cachea vídeos** (solo la app).
- **Analytics**: Vercel Analytics + Speed Insights integrados (se activan en el dashboard de Vercel).
- Pie de página discreto: «Desarrollado por Jon Peciña».

## Stack

- Frontend: Vite + React 19 + JavaScript + Tailwind CSS v4 + Lucide + React Router 7
- Backend: Vercel Functions (Node 20+, sin Express permanente)
- Datos: Upstash Redis vía Vercel Marketplace (metadatos + comentarios)
- Archivos: Vercel Blob (vídeos + thumbnails, acceso público)
- Despliegue: GitHub + Vercel

## Estructura

```
├── api/                    # Vercel Functions
│   ├── _lib/               # redis.js, auth.js, validate.js, store.js
│   ├── videos.js           # GET /api/videos
│   ├── videos/[id].js      # GET /api/videos/:id (id o slug)
│   ├── videos/[id]/comments.js  # GET + POST comentarios
│   ├── og.js               # HTML con Open Graph para scrapers (?slug=)
│   └── admin/
│       ├── login.js logout.js me.js
│       ├── upload.js       # tokens de subida directa a Blob
│       ├── videos.js       # POST crear
│       ├── videos/[id].js  # PUT editar, DELETE eliminar
│       └── comments/[id].js# DELETE comentario
├── src/
│   ├── pages/              # Home, VideoPage, AdminLogin, AdminPanel, NotFound
│   ├── components/         # VideoPlayer, VideoCard, Comments, ShareButtons,
│   │                       #   VideoForm, ThumbnailStudio, Layout
│   └── lib/                # api.js, format.js
├── scripts/                # hash-password.mjs, make-icons.mjs
├── public/                 # iconos PWA, favicon
├── vercel.json             # rewrites (OG para bots, SPA para humanos)
└── .env.example
```

## Puesta en marcha (despliegue en Vercel)

> El código ya está en GitHub. Estos pasos se hacen una sola vez en el panel de Vercel.

1. **Importar el repositorio** en Vercel (Add New → Project → importar `personal-video-studio`). Framework: Vite.
2. **Crear Upstash Redis**: en el proyecto, pestaña **Storage** → **Create Database** → **Upstash Redis** (vía Marketplace, plan gratuito) → **Connect** al proyecto. Vercel inyecta `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` solas.
3. **Crear el Blob Store**: **Storage** → **Create Store** → **Blob**. **MUY IMPORTANTE: créalo con acceso público** (no privado); con un store privado las subidas fallan. Conéctalo al proyecto: Vercel inyecta `BLOB_READ_WRITE_TOKEN` sola.
4. **Variables del administrador**: **Settings → Environment Variables**, añade:
   - `ADMIN_USERNAME` (p. ej. `admin`)
   - `ADMIN_PASSWORD_HASH`: genéralo en tu terminal con `npm run hash-password -- "tu-contraseña"` (nunca subas la contraseña al repo)
   - `ADMIN_SESSION_SECRET`: el script anterior también imprime uno aleatorio
   - `PUBLIC_URL`: `https://tu-proyecto.vercel.app` (opcional; si se omite se detecta del host)
5. **Deploy** (o Redeploy si ya habías desplegado antes de añadir las variables).
6. **Activar Analytics**: en el proyecto, pestaña **Analytics** → Enable; **Speed Insights** → Enable. El código ya está integrado.

### Primer uso

1. Entra en `https://tu-proyecto.vercel.app/admin` e inicia sesión.
2. Pulsa **Nuevo vídeo**: sube un MP4 (o indica una URL https directa) y elige thumbnail (sube imagen o captura un fotograma).
3. Abre `/video/tu-slug`, pulsa **Compartir → WhatsApp** y comprueba que aparecen título, descripción y thumbnail.
4. Validadores: [OpenGraph.xyz](https://www.opengraph.xyz/) o las tarjetas de [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).

## Desarrollo local

```bash
npm install
npm run dev          # frontend en http://localhost:5173
```

Las Functions necesitan `vercel dev` (Vercel CLI) y las variables de entorno de producción
(`vercel env pull`). Sin Redis/Blob configurados, la API devuelve errores explicativos.

```bash
npm run hash-password -- "tu-contraseña"   # genera ADMIN_PASSWORD_HASH + secreto
npm run make-icons                          # regenera los iconos PWA
npm run build                               # build de producción
```

## Conversión local opcional (FFmpeg)

No hay transcodificación en el servidor (requisito del proyecto). Si un vídeo no es
compatible (p. ej. MOV con códec raro), conviértelo en tu ordenador a MP4/H.264+AAC:

```bash
ffmpeg -i entrada.mov -c:v libx264 -preset medium -crf 22 -c:a aac -movflags +faststart salida.mp4
```

`-movflags +faststart` coloca los metadatos al inicio para streaming progresivo.

## Límites y costes

| Recurso | Límite app | Plan gratuito |
|---|---|---|
| Vídeos publicados | 10 | — |
| Comentarios por vídeo | 30 (atómico) | — |
| Upstash Redis (Marketplace) | — | plan gratuito suficiente para este uso |
| Vercel Blob | — | incluido en Hobby con cuota gratuita |
| Vercel Functions | — | incluidas en Hobby |

Sin tarjeta, sin suscripciones, sin servicios de terceros fuera del ecosistema Vercel.

## Seguridad

- Contraseña solo como hash bcrypt (nunca en el repo); sesión firmada HMAC en cookie HttpOnly + Secure + SameSite=Lax.
- Todos los endpoints `/api/admin/*` validan la sesión **en el servidor**.
- Subidas a Blob solo con token de un solo uso emitido al admin; tipos MIME y tamaño (1 GB) limitados.
- Comentarios validados en servidor, sin HTML (React escapa el texto), rate limiting por IP.
- Ningún secreto en variables `VITE_*` ni en el frontend.

## Licencia

Uso personal. Desarrollado por Jon Peciña.
