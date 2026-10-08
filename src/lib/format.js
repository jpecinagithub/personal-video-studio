// Formato y detección de compatibilidad de vídeo.

export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso) {
  try {
    return dateFmt.format(new Date(iso));
  } catch {
    return '';
  }
}

export function formatDateTime(iso) {
  try {
    return dateTimeFmt.format(new Date(iso));
  } catch {
    return '';
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[u]}`;
}

// Extensión -> contenedor / códec esperado. Distinguimos extensión, contenedor y códec.
const EXT_MIME = {
  mp4: { mime: 'video/mp4', label: 'MP4 · H.264/AAC' },
  m4v: { mime: 'video/x-m4v', label: 'M4V · H.264/AAC' },
  webm: { mime: 'video/webm', label: 'WebM · VP8/VP9' },
  mov: { mime: 'video/quicktime', label: 'MOV · H.264' },
  ogv: { mime: 'video/ogg', label: 'OGV · Theora' },
};

export function detectFormat(url) {
  try {
    const clean = String(url).split('?')[0].split('#')[0];
    const ext = clean.split('.').pop().toLowerCase();
    return { ext, ...(EXT_MIME[ext] || { mime: '', label: ext ? ext.toUpperCase() : 'desconocido' }) };
  } catch {
    return { ext: '', mime: '', label: 'desconocido' };
  }
}

// 'probably' | 'maybe' | '' (no reproducible)
export function canPlayType(mime) {
  if (!mime) return '';
  try {
    const v = document.createElement('video');
    return v.canPlayType(mime);
  } catch {
    return '';
  }
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
