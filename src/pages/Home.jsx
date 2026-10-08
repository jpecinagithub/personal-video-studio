import { useEffect, useMemo, useState } from 'react';
import { Search, Film, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api.js';
import VideoCard from '../components/VideoCard.jsx';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .listVideos()
      .then((list) => alive && setVideos(Array.isArray(list) ? list : []))
      .catch(() => alive && setError('No se pudieron cargar los vídeos. Revisa tu conexión.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.title.toLowerCase().includes(q));
  }, [videos, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Galería de <span className="text-accent-400">vídeos</span>
          </h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base max-w-xl">
            Una selección personal de vídeos. Pulsa en cualquiera para reproducirlo, compartirlo o dejar un comentario.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título…"
            aria-label="Buscar por título"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-night-900 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-night-900 border border-white/5 overflow-hidden soft-pulse">
              <div className="aspect-video bg-night-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 rounded bg-night-700 w-3/4" />
                <div className="h-3 rounded bg-night-700 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/25 p-5 text-red-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          {videos.length === 0 ? (
            <>
              <p className="text-lg font-medium text-zinc-300">Aún no hay vídeos publicados</p>
              <p className="mt-1 text-sm text-zinc-500">Vuelve pronto: el administrador está preparando el contenido.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-zinc-300">Sin resultados</p>
              <p className="mt-1 text-sm text-zinc-500">Ningún título coincide con «{query.trim()}».</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((v, i) => (
            <VideoCard key={v.id} video={v} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
