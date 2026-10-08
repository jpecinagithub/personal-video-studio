import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, RotateCcw } from 'lucide-react';
import { formatDuration } from '../lib/format.js';

// Estudio de captura: muestra el vídeo, permite desplazarse a un instante
// y capturar un fotograma 16:9 optimizado como thumbnail.
export default function ThumbnailStudio({ videoSrc, onCaptured }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [pos, setPos] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    setPreview(null);
    setPos(0);
    setError('');
    setDuration(0);
  }, [videoSrc]);

  const seekTo = (t) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(duration) || duration <= 0) return;
    const clamped = Math.min(Math.max(0, t), duration);
    v.currentTime = clamped;
    setPos(clamped);
  };

  const capture = async () => {
    setError('');
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || v.readyState < 2 || !v.videoWidth) {
      setError('El vídeo aún no está listo. Espera a que cargue y vuelve a intentarlo.');
      return;
    }
    setCapturing(true);
    try {
      const W = 1280;
      const H = 720;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      // Recorte "cover" para rellenar 16:9
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      const scale = Math.max(W / vw, H / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture'))), 'image/jpeg', 0.85)
      );
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);
      onCaptured({ blob, previewUrl, at: pos });
    } catch {
      setError(
        'No se pudo capturar el fotograma: el vídeo externo no permite lectura de píxeles (CORS). Sube una imagen manualmente.'
      );
    } finally {
      setCapturing(false);
    }
  };

  const discard = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onCaptured(null);
  };

  if (!videoSrc) {
    return (
      <p className="text-xs text-zinc-500">
        Primero selecciona o indica el vídeo para poder capturar un fotograma.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-night-800 border border-white/10 p-4 space-y-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Capturar fotograma del vídeo</p>

      <video
        ref={videoRef}
        src={videoSrc}
        crossOrigin="anonymous"
        preload="metadata"
        muted
        playsInline
        className="w-full aspect-video rounded-lg bg-black"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onSeeked={(e) => setPos(e.currentTarget.currentTime)}
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(pos, duration || 0)}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="vol-slider flex-1"
          aria-label="Instante del vídeo"
          disabled={!duration}
        />
        <span className="text-xs text-zinc-400 tabular-nums whitespace-nowrap">
          {formatDuration(pos)} / {formatDuration(duration)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={capture}
          disabled={capturing || !duration}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-night-700 hover:bg-night-600 disabled:opacity-50 text-sm transition-colors"
        >
          {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Capturar fotograma
        </button>
        {preview && (
          <button
            type="button"
            onClick={discard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Descartar
          </button>
        )}
      </div>

      {preview && (
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Vista previa del thumbnail:</p>
          <img src={preview} alt="Vista previa del thumbnail" className="w-full max-w-sm aspect-video object-cover rounded-lg border border-white/10" />
        </div>
      )}

      {error && <p className="text-xs text-amber-300 leading-relaxed">{error}</p>}
    </div>
  );
}
