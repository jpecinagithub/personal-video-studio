// Genera el hash bcrypt de la contraseña del administrador y un secreto
// aleatorio para la sesión. Uso:
//
//   npm run hash-password -- "tu-contraseña-segura"
//
// Copia los valores resultantes a tus variables de entorno (Vercel o .env).
// La contraseña en texto plano NO se guarda en ningún sitio.

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password || password === '--') {
  console.error('Uso: npm run hash-password -- "tu-contraseña-segura"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const secret = randomBytes(32).toString('hex');

console.log('\nAñade estas variables de entorno (Vercel → Settings → Environment Variables):\n');
console.log(`ADMIN_USERNAME=admin`);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`ADMIN_SESSION_SECRET=${secret}`);
console.log('\nGuárdalas también en tu gestor de contraseñas. No las subas al repo.\n');
