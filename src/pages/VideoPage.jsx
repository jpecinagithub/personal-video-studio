import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Loader2, AlertTriangle, Film } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate, formatDuration } from '../lib/format.js';
import VideoPlayer from '../components/VideoPlayer.jsx';
import Comments from '../components/Comments.jsx';
import ShareButtons from '../components/ShareButtons.jsx';

export default function VideoPage() {
  const { slug } = useParams();
  const [video, setVideo] = useState(null);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    Promise.all([api.getVideo(slug), api.listVideos()])
      .then(([v, list]) => {
        if (!alive) return;
        setVideo(v);
        setOthers((Array.isArray(list) ? list : []).filter((x) => x.id !== v.id).slice(0, 9));
        document.title = `${v.title} — Personal Video Studio`;
      })
      .catch((err) => {
        if (alive && err.status === 404) setNotFound(true);
      })
      .finally(() => alive && setLoading(false));
    window.scrollTo(0, 0);
    return () => {
      alive = false;
      document.title = 'Personal Video Studio';
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="aspect-video rounded-2xl bg-night-900 soft-pulse" />
        <div className="mt-6 h-6 rounded bg-night-800 w-2/3 soft-pulse" />
        <div className="mt-3 h-4 rounded bg-night-800 w-1/3 soft-pulse" />
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Vídeo no encontrado</h1>
        <p className="mt-2 text-zinc-400 text-sm">Es posible que haya sido eliminado o que el enlace no sea correcto.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night-800 hover:bg-night-700 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a la galería
        </Link>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/video/${video.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Galería
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Columna principal */}
        <div className="min-w-0">
          <VideoPlayer src={video.videoUrl} poster={video.thumbnailUrl} title={video.title} />

          <h1 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{video.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {formatDate(video.createdAt)}
            </span>
            {Number.isFinite(video.duration) && video.duration > 0 && (
              <span>Duración: {formatDuration(video.duration)}</span>
            )}
          </div>

          {video.description && (
            <p className="mt-4 text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              {video.description}
            </p>
          )}

          <div className="mt-5 pt-5 border-t border-white/5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Compartir este vídeo</p>
            <ShareButtons url={shareUrl} title={video.title} />
          </div>

          <Comments videoId={video.id} />
        </div>

        {/* Lateral: otros vídeos */}
        <aside className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Otros vídeos</h2>
          {others.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Film className="w-4 h-4" /> No hay más vídeos publicados.
            </div>
          ) : (
            <div className="space-y-3">
              {others.map((v) => (
                <Link
                  key={v.id}
                  to={`/video/${v.slug}`}
                  className="group flex gap-3 rounded-xl p-2 hover:bg-night-900 transition-colors"
                >
                  <div className="relative w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-night-800">
                    {v.thumbnailUrl && (
                      <img src={v.thumbnailUrl} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
                    )}
                    {Number.isFinite(v.duration) && v.duration > 0 && (
                      <span className="absolute bottom-1 right-1 px-1 py-px rounded bg-black/80 text-[10px] text-zinc-200">
                        {formatDuration(v.duration)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-accent-400 transition-colors">
                      {v.title}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">{formatDate(v.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
