import { Redis } from '@upstash/redis';

// Cliente Redis (Upstash vía Vercel Marketplace, API REST: sin conexiones persistentes,
// ideal para serverless). Las variables las inyecta Vercel al conectar el Storage.
let client = null;

export function getRedis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Redis no configurado. Conecta Upstash Redis en el panel de Vercel (Storage) o define UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  client = new Redis({ url, token });
  return client;
}

// Claves
export const kVideo = (id) => `video:${id}`;
export const kVideoSlug = (slug) => `video:slug:${slug}`;
export const kVideos = 'videos'; // SET de ids
export const kComments = (videoId) => `comments:${videoId}`; // LIST de JSON

export const MAX_VIDEOS = 10;
export const MAX_COMMENTS = 30;
