import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw,
  RefreshCw, PictureInPicture2, AlertTriangle, Loader2, Gauge,
} from 'lucide-react';
import { formatDuration, detectFormat, canPlayType } from '../lib/format.js';

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
const SEEK_STEP = 10;

function errorMessage(code) {
  switch (code) {
    case 1: return 'La reproducción se interrumpió.';
    case 2: return 'Error de red al cargar el vídeo. Comprueba tu conexión.';
    case 3: return 'El vídeo está dañado o su formato no es válido.';
    case 4: return 'Este formato no es compatible con tu navegador.';
    default: return 'No se pudo reproducir el vídeo.';
  }
}

export default function VideoPlayer({ src, poster, title }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const hideTimer = useRef(null);
  const seekingRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inPip, setInPip] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [showSpeed, setShowSpeed] = useState(false);
  const [hoverPct, setHoverPct] = useState(null);

  const format = detectFormat(src);
  const playability = canPlayType(format.mime);
  const unsupported = playability === '';

  const pipSupported =
    typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  // ---- helpers ----
  const poke = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing && started) {
      hideTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeed(false);
      }, 2600);
    }
  };

  useEffect(() => {
    poke();
    return () => hideTimer.current && clearTimeout(hideTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, started]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    const onPipEnter = () => setInPip(true);
    const onPipLeave = () => setInPip(false);
    document.addEventListener('fullscreenchange', onFs);
    const v = videoRef.current;
    v?.addEventListener('enterpictureinpicture', onPipEnter);
    v?.addEventListener('leavepictureinpicture', onPipLeave);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      v?.removeEventListener('enterpictureinpicture', onPipEnter);
      v?.removeEventListener('leavepictureinpicture', onPipLeave);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || error) return;
    if (v.paused) {
      setStarted(true);
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const seekBy = (delta) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration);
    setTime(v.currentTime);
    poke();
  };

  const restart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setTime(0);
    setStarted(true);
    v.play().catch(() => {});
    poke();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    poke();
  };

  const changeVolume = (val) => {
    const v = videoRef.current;
    const nv = Math.min(1, Math.max(0, val));
    setVolume(nv);
    if (v) {
      v.volume = nv;
      v.muted = nv === 0;
      setMuted(v.muted);
    }
    poke();
  };

  const changeRate = (r) => {
    const v = videoRef.current;
    setRate(r);
    if (v) v.playbackRate = r;
    setShowSpeed(false);
    poke();
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch { /* no-op */ }
    poke();
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v || !pipSupported) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* no-op */ }
    poke();
  };

  // ---- seekbar ----
  const ratioFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, x));
  };

  const onTrackDown = (e) => {
    if (!duration) return;
    seekingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const r = ratioFromEvent(e);
    setTime(r * duration);
  };
  const onTrackMove = (e) => {
    if (!duration) return;
    const r = ratioFromEvent(e);
    if (seekingRef.current) {
      setTime(r * duration);
    } else if (e.pointerType === 'mouse') {
      setHoverPct(r);
    }
  };
  const onTrackUp = (e) => {
    if (!seekingRef.current) return;
    seekingRef.current = false;
    const v = videoRef.current;
    if (v && duration) {
      v.currentTime = ratioFromEvent(e) * duration;
      setTime(v.currentTime);
    }
    poke();
  };

  const onDoubleClickZone = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.35) seekBy(-SEEK_STEP);
    else if (x > 0.65) seekBy(SEEK_STEP);
    else toggleFullscreen();
  };

  // ---- teclado ----
  const onKeyDown = (e) => {
    const k = e.key;
    const handled = [' ', 'k', 'j', 'l', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'f', 'm', 'p', 'Home'].includes(k);
    if (!handled) return;
    e.preventDefault();
    switch (k) {
      case ' ': case 'k': togglePlay(); break;
      case 'j': case 'ArrowLeft': seekBy(-SEEK_STEP); break;
      case 'l': case 'ArrowRight': seekBy(SEEK_STEP); break;
      case 'ArrowUp': changeVolume(volume + 0.1); break;
      case 'ArrowDown': changeVolume(volume - 0.1); break;
      case 'f': toggleFullscreen(); break;
      case 'm': toggleMute(); break;
      case 'p': togglePip(); break;
      case 'Home': restart(); break;
      default: break;
    }
  };

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={poke}
      onTouchStart={poke}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none outline-none group/player shadow-2xl shadow-black/60 ${
        isFullscreen ? 'rounded-none' : ''
      }`}
      aria-label={`Reproductor: ${title}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="absolute inset-0 w-full h-full"
        onClick={togglePlay}
        onDoubleClick={onDoubleClickZone}
        onPlay={() => { setPlaying(true); setStarted(true); setWaiting(false); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { if (!seekingRef.current) setTime(e.currentTarget.currentTime); }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onProgress={(e) => {
          const v = e.currentTarget;
          try {
            if (v.buffered.length > 0 && v.duration > 0) {
              setBuffered(v.buffered.end(v.buffered.length - 1));
            }
          } catch { /* no-op */ }
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onSeeking={() => setWaiting(true)}
        onSeeked={() => setWaiting(false)}
        onError={(e) => setError(errorMessage(e.currentTarget.error?.code))}
      />

      {/* Formato no compatible */}
      {!error && unsupported && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-lg">Formato no reproducible aquí</p>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Este vídeo está en formato <span className="text-zinc-200 font-medium">{format.label}</span> y
              tu navegador no puede reproducirlo. Prueba con otro navegador o pide al administrador
              una versión en MP4 (H.264), que funciona en todas partes.
            </p>
          </div>
        </div>
      )}

      {/* Error de reproducción */}
      {error && !unsupported && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-lg">No se pudo reproducir</p>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <button
              onClick={restart}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-night-700 hover:bg-night-600 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Cargando */}
      {waiting && !error && started && (
        <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
          <Loader2 className="w-12 h-12 text-white/80 animate-spin" />
        </div>
      )}

      {/* Botón central de play */}
      {!started && !error && !unsupported && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 grid place-items-center bg-black/40 hover:bg-black/30 transition-colors"
          aria-label="Reproducir"
        >
          <span className="grid place-items-center w-20 h-20 rounded-full bg-accent-600 hover:bg-accent-500 shadow-2xl shadow-accent-600/40 hover:scale-105 transition-all">
            <Play className="w-9 h-9 text-white fill-white ml-1" />
          </span>
        </button>
      )}
      {started && !playing && !waiting && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 grid place-items-center pointer-events-none"
          aria-label="Continuar"
          tabIndex={-1}
        >
          <span className="grid place-items-center w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm pointer-events-auto hover:bg-accent-600 transition-colors">
            <Play className="w-7 h-7 text-white fill-white ml-0.5" />
          </span>
        </button>
      )}

      {/* Controles */}
      {!error && !unsupported && (
        <div
          className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 pb-3 px-3 sm:px-4 transition-all duration-300 ${
            showControls || !playing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Barra de progreso */}
          <div
            ref={trackRef}
            onPointerDown={onTrackDown}
            onPointerMove={onTrackMove}
            onPointerUp={onTrackUp}
            onPointerLeave={() => { setHoverPct(null); if (seekingRef.current) { seekingRef.current = false; const v = videoRef.current; if (v) v.currentTime = time; } }}
            className="relative h-5 flex items-center cursor-pointer touch-none group/bar"
            role="slider"
            aria-label="Progreso"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
          >
            <div className="relative w-full h-1 group-hover/bar:h-1.5 transition-all rounded-full bg-white/20">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${bufPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `${pct}%` }}
              />
            </div>
            {hoverPct !== null && duration > 0 && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-[11px] text-zinc-200 pointer-events-none"
                style={{ left: `${hoverPct * 100}%` }}
              >
                {formatDuration(hoverPct * duration)}
              </div>
            )}
          </div>

          {/* Fila de botones */}
          <div className="flex items-center gap-1 sm:gap-2 mt-1">
            <CtrlBtn onClick={() => seekBy(-SEEK_STEP)} label="Retroceder 10 segundos">
              <RotateCcw className="w-5 h-5" />
            </CtrlBtn>
            <CtrlBtn onClick={togglePlay} label={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </CtrlBtn>
            <CtrlBtn onClick={() => seekBy(SEEK_STEP)} label="Adelantar 10 segundos">
              <RotateCw className="w-5 h-5" />
            </CtrlBtn>
            <CtrlBtn onClick={restart} label="Reiniciar vídeo">
              <RefreshCw className="w-5 h-5" />
            </CtrlBtn>

            <div className="hidden sm:flex items-center gap-2 ml-1">
              <CtrlBtn onClick={toggleMute} label={muted ? 'Activar sonido' : 'Silenciar'}>
                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </CtrlBtn>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="vol-slider w-20"
                aria-label="Volumen"
              />
            </div>

            <span className="ml-2 text-xs text-zinc-300 tabular-nums whitespace-nowrap">
              {formatDuration(time)} <span className="text-zinc-500">/ {formatDuration(duration)}</span>
            </span>

            <div className="flex-1" />

            {/* Velocidad */}
            <div className="relative">
              <CtrlBtn onClick={() => setShowSpeed((s) => !s)} label="Velocidad de reproducción">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-1">
                  <Gauge className="w-4 h-4" />
                  {rate}x
                </span>
              </CtrlBtn>
              {showSpeed && (
                <div className="absolute bottom-11 right-0 w-36 rounded-xl bg-night-800 border border-white/10 shadow-2xl overflow-hidden">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeRate(s)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                        s === rate ? 'text-accent-400 font-semibold' : 'text-zinc-300'
                      }`}
                    >
                      {s}x {s === 1 && <span className="text-zinc-500 text-xs">(normal)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {pipSupported && (
              <CtrlBtn onClick={togglePip} label="Picture-in-Picture">
                <PictureInPicture2 className={`w-5 h-5 ${inPip ? 'text-accent-400' : ''}`} />
              </CtrlBtn>
            )}
            <CtrlBtn onClick={toggleFullscreen} label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </CtrlBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ children, onClick, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid place-items-center w-9 h-9 rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors"
    >
      {children}
    </button>
  );
}
