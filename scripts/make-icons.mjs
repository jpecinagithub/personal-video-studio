// Genera los iconos PNG de la PWA sin dependencias externas.
// Uso: npm run make-icons
// Dibuja: fondo grafito oscuro + botón de play carmesí (marca del proyecto).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// --- PNG mínimo (RGBA 8-bit) ---
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([td, data])));
  return Buffer.concat([len, td, data, crc]);
}
function encodePng(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Dibujo ---
function drawIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  // Fondo grafito
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) set(x, y, 11, 11, 14);

  const cx = size / 2, cy = size / 2;
  // En maskable, el contenido importante va en el 66% central.
  const R = (maskable ? size * 0.33 : size * 0.38);

  // Círculo carmesí
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= R) set(x, y, 225, 29, 72);
    }
  }
  // Triángulo de play (blanco), apuntando a la derecha
  const s = R * 0.62;
  const ax = cx - s * 0.45, ay = cy - s * 0.62;
  const bx = cx - s * 0.45, by = cy + s * 0.62;
  const cxp = cx + s * 0.72, cyp = cy;
  const edge = (px_, py_, x1, y1, x2, y2) => (px_ - x2) * (y1 - y2) - (x1 - x2) * (py_ - y2);
  const minX = Math.floor(Math.min(ax, bx, cxp)), maxX = Math.ceil(Math.max(ax, bx, cxp));
  const minY = Math.floor(Math.min(ay, by, cyp)), maxY = Math.ceil(Math.max(ay, by, cyp));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d1 = edge(x, y, ax, ay, bx, by);
      const d2 = edge(x, y, bx, by, cxp, cyp);
      const d3 = edge(x, y, cxp, cyp, ax, ay);
      if ((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)) set(x, y, 255, 255, 255);
    }
  }
  return encodePng(size, size, px);
}

const targets = [
  ['icon-192.png', drawIcon(192, false)],
  ['icon-512.png', drawIcon(512, false)],
  ['icon-maskable-512.png', drawIcon(512, true)],
  ['apple-touch-icon.png', drawIcon(180, false)],
];

for (const [name, buf] of targets) {
  writeFileSync(join(ROOT, name), buf);
  console.log(`✓ public/${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

// favicon.svg a juego
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0b0e"/><circle cx="32" cy="32" r="17" fill="#e11d48"/><path d="M27 22.5v19l15-9.5z" fill="#fff"/></svg>`;
writeFileSync(join(ROOT, 'favicon.svg'), svg);
console.log('✓ public/favicon.svg');
