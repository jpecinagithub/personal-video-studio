import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { UploadCloud, Link2, Loader2, ImagePlus, X } from 'lucide-react';
import { formatBytes, formatDuration } from '../lib/format.js';
import ThumbnailStudio from './ThumbnailStudio.jsx';

const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB por subida

// Lee duración y dimensiones de un vídeo (archivo local u URL).
function probeVideo(src) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const done = (ok, extra = {}) => {
      v.src = '';
      resolve({ ok, duration: v.duration || 0, width: v.videoWidth || 0, height: v.videoHeight || 0, ...extra });
    };
    v.onloadedmetadata = () => done(true);
    v.onerror = () => done(false);
    setTimeout(() => done(false, { timeout: true }), 15000);
    v.src = src;
  });
}

// Subida directa navegador -> Vercel Blob con token seguro del backend.
async function uploadToBlob(file, onProgress) {
  const res = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload',
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });
  return res; // { url, pathname }
}

export default function VideoForm({ initial, onSubmit, onCancel, submitting }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [mode, setMode] = useState(initial?.storageType === 'external' ? 'url' : 'upload');

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(initial?.videoUrl || '');
  const [urlInput, setUrlInput] = useState(initial?.storageType === 'external' ? initial.videoUrl : '');
  const [duration, setDuration] = useState(initial?.duration || 0);
  const [dims, setDims] = useState({ width: initial?.width || 0, height: initial?.height || 0 });

  const [thumbMode, setThumbMode] = useState('upload');
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(initial?.thumbnailUrl || '');
  const [captured, setCaptured] = useState(null); // { blob, previewUrl }

  const [progress, setProgress] = useState(null); // { label, pct }
  const [error, setError] = useState('');
  const objectUrls = useRef([]);

  useEffect(() => () => objectUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const trackUrl = (u) => {
    objectUrls.current.push(u);
    return u;
  };

  const onVideoFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`El archivo supera el máximo de ${formatBytes(MAX_VIDEO_BYTES)}.`);
      return;
    }
    setError('');
    setVideoFile(file);
    const obj = trackUrl(URL.createObjectURL(file));
    setVideoPreview(obj);
    const probe = await probeVideo(obj);
    if (probe.ok) {
      setDuration(probe.duration);
      setDims({ width: probe.width, height: probe.height });
    }
  };

  const onUrlInput = async (value) => {
    setUrlInput(value);
    setError('');
    const trimmed = value.trim();
    if (!/^https:\/\/.+\..+/.test(trimmed)) {
      setVideoPreview('');
      return;
    }
    setVideoPreview(trimmed);
    const probe = await probeVideo(trimmed);
    if (probe.ok) {
      setDuration(probe.duration);
      setDims({ width: probe.width, height: probe.height });
    }
  };

  const onThumbFile = (file) => {
    if (!file) return;
    setThumbFile(file);
    setCaptured(null);
    setThumbPreview(trackUrl(URL.createObjectURL(file)));
  };

  const onCaptured = (c) => {
    setCaptured(c);
    if (c) {
      setThumbFile(null);
      setThumbPreview(c.previewUrl);
    } else if (!thumbFile) {
      setThumbPreview(initial?.thumbnailUrl || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const t = title.trim();
    if (!t) return setError('El título es obligatorio.');
    if (t.length > 120) return setError('El título no puede superar 120 caracteres.');
    if (description.trim().length > 2000) return setError('La descripción no puede superar 2000 caracteres.');

    let videoUrl = '';
    let mimeType = '';
    let storageType = 'blob';
    const blobPaths = [];
    const deletePaths = [];

    try {
      if (mode === 'upload') {
        if (videoFile) {
          if (initial?.storageType === 'blob' && initial.blobPaths?.length) {
            deletePaths.push(...initial.blobPaths.filter((p) => p.includes('/videos/') || true));
          }
          setProgress({ label: 'Subiendo vídeo…', pct: 0 });
          const up = await uploadToBlob(videoFile, (pct) => setProgress({ label: 'Subiendo vídeo…', pct }));
          videoUrl = up.url;
          mimeType = videoFile.type || '';
          blobPaths.push(up.pathname);
        } else if (isEdit && initial.storageType === 'blob') {
          videoUrl = initial.videoUrl;
          mimeType = initial.mimeType || '';
          blobPaths.push(...(initial.blobPaths || []));
        } else {
          return setError('Selecciona un archivo de vídeo.');
        }
        storageType = 'blob';
      } else {
        const u = urlInput.trim();
        if (!/^https:\/\//i.test(u)) return setError('La URL debe empezar por https://');
        if (isEdit && initial.storageType === 'blob' && initial.blobPaths?.length) {
          deletePaths.push(...initial.blobPaths);
        }
        videoUrl = u;
        storageType = 'external';
        mimeType = '';
      }

      let thumbnailUrl = thumbPreview && !thumbPreview.startsWith('blob:') ? thumbPreview : initial?.thumbnailUrl || '';
      if (thumbFile) {
        setProgress({ label: 'Subiendo thumbnail…', pct: 0 });
        const up = await uploadToBlob(thumbFile, (pct) => setProgress({ label: 'Subiendo thumbnail…', pct }));
        thumbnailUrl = up.url;
        blobPaths.push(up.pathname);
        if (isEdit && initial.thumbnailBlobPath) deletePaths.push(initial.thumbnailBlobPath);
      } else if (captured) {
        setProgress({ label: 'Subiendo thumbnail…', pct: 0 });
        const file = new File([captured.blob], 'thumbnail.jpg', { type: 'image/jpeg' });
        const up = await uploadToBlob(file, (pct) => setProgress({ label: 'Subiendo thumbnail…', pct }));
        thumbnailUrl = up.url;
        blobPaths.push(up.pathname);
        if (isEdit && initial.thumbnailBlobPath) deletePaths.push(initial.thumbnailBlobPath);
      }

      setProgress({ label: 'Guardando…', pct: 100 });
      await onSubmit({
        title: t,
        description: description.trim(),
        videoUrl,
        thumbnailUrl,
        storageType,
        mimeType,
        duration: Math.round(duration) || 0,
        width: dims.width || 0,
        height: dims.height || 0,
        blobPaths,
        deletePaths,
      });
    } catch (err) {
      setError(err.message || 'No se pudo guardar el vídeo.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Título y descripción */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Mi vídeo personal"
          className="w-full px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descripción (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Una breve descripción del vídeo…"
          className="w-full px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20 resize-y"
        />
      </div>

      {/* Origen del vídeo */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">Origen del vídeo</p>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-night-800 border border-white/10">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'upload' ? 'bg-accent-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Subir archivo
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'url' ? 'bg-accent-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Link2 className="w-4 h-4" /> URL externa
          </button>
        </div>

        {mode === 'upload' ? (
          <div className="mt-3">
            <label className="flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-xl border-2 border-dashed border-white/15 hover:border-accent-500/50 bg-night-800/50 cursor-pointer transition-colors">
              <UploadCloud className="w-8 h-8 text-zinc-500" />
              <span className="text-sm text-zinc-300">
                {videoFile ? videoFile.name : 'Pulsa para seleccionar un vídeo de tu ordenador'}
              </span>
              <span className="text-xs text-zinc-600">MP4, WebM, MOV, M4V u OGV · máx. {formatBytes(MAX_VIDEO_BYTES)}</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,.mp4,.webm,.mov,.m4v,.ogv"
                className="hidden"
                onChange={(e) => onVideoFile(e.target.files?.[0])}
              />
            </label>
            {videoFile && (
              <p className="mt-2 text-xs text-zinc-500">
                {formatBytes(videoFile.size)}
                {duration > 0 && <> · duración detectada: {formatDuration(duration)}</>}
                {dims.width > 0 && <> · {dims.width}×{dims.height}</>}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <input
              value={urlInput}
              onChange={(e) => onUrlInput(e.target.value)}
              placeholder="https://ejemplo.com/mi-video.mp4"
              inputMode="url"
              className="w-full px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              Debe ser la URL <em>directa</em> del archivo (https://…/video.mp4), no la de una página web.
              {duration > 0 && <> · duración detectada: {formatDuration(duration)}</>}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">Thumbnail</p>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setThumbMode('upload')}
            className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
              thumbMode === 'upload'
                ? 'bg-night-700 border-accent-500/50 text-zinc-100'
                : 'border-white/10 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Subir imagen
          </button>
          <button
            type="button"
            onClick={() => setThumbMode('capture')}
            className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
              thumbMode === 'capture'
                ? 'bg-night-700 border-accent-500/50 text-zinc-100'
                : 'border-white/10 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Capturar del vídeo
          </button>
        </div>

        {thumbMode === 'upload' ? (
          <label className="flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-white/15 hover:border-accent-500/50 bg-night-800/50 cursor-pointer transition-colors">
            <ImagePlus className="w-6 h-6 text-zinc-500 shrink-0" />
            <span className="text-sm text-zinc-300">{thumbFile ? thumbFile.name : 'Seleccionar imagen JPG, PNG o WebP'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => onThumbFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <ThumbnailStudio videoSrc={videoPreview} onCaptured={onCaptured} />
        )}

        {thumbPreview && (
          <div className="mt-3 relative inline-block">
            <img src={thumbPreview} alt="Thumbnail" className="w-48 aspect-video object-cover rounded-lg border border-white/10" />
            <button
              type="button"
              onClick={() => { setThumbPreview(initial?.thumbnailUrl || ''); setThumbFile(null); setCaptured(null); }}
              className="absolute -top-2 -right-2 grid place-items-center w-6 h-6 rounded-full bg-night-700 hover:bg-red-600 transition-colors"
              title="Quitar thumbnail"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progreso */}
      {progress && (
        <div className="rounded-xl bg-night-800 border border-white/10 p-4">
          <p className="text-sm text-zinc-300 mb-2">{progress.label}</p>
          <div className="h-2 rounded-full bg-night-700 overflow-hidden">
            <div className="h-full rounded-full bg-accent-500 transition-all duration-300" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-500 tabular-nums">{progress.pct}%</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || !!progress}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {(submitting || progress) && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Publicar vídeo'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-full text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}
