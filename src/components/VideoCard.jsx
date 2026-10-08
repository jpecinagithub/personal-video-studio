import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { formatDate, formatDuration } from '../lib/format.js';

export default function VideoCard({ video, index = 0 }) {
  return (
    <Link
      to={`/video/${video.slug}`}
      className="card-in group block rounded-2xl overflow-hidden bg-night-900 border border-white/5 hover:border-white/15 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${Math.min(index, 9) * 60}ms` }}
    >
      <div className="relative aspect-video bg-night-800 overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-night-800 to-night-950">
            <Play className="w-10 h-10 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="grid place-items-center w-14 h-14 rounded-full bg-accent-600/95 shadow-xl shadow-accent-600/40 scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </span>
        </div>
        {Number.isFinite(video.duration) && video.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-[11px] font-medium text-zinc-200">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 group-hover:text-accent-400 transition-colors">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">{formatDate(video.createdAt)}</p>
        {video.description && (
          <p className="mt-2 text-sm text-zinc-400 line-clamp-2 leading-relaxed">{video.description}</p>
        )}
      </div>
    </Link>
  );
}
