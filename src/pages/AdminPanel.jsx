import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, LogOut, Loader2, MessageSquare, ExternalLink,
  AlertTriangle, X, ChevronDown, Film,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime } from '../lib/format.js';
import VideoForm from '../components/VideoForm.jsx';

const MAX_VIDEOS = 10;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedComments, setExpandedComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listVideos();
      setVideos(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e.status === 401) navigate('/admin', { replace: true });
      else setError('No se pudieron cargar los vídeos.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    api
      .me()
      .then(load)
      .catch(() => navigate('/admin', { replace: true }));
  }, [load, navigate]);

  const logout = async () => {
    await api.logout().catch(() => {});
    navigate('/admin', { replace: true });
  };

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await api.adminCreateVideo(data);
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    try {
      await api.adminUpdateVideo(editing.id, data);
      setEditing(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (video) => {
    setDeleting(true);
    try {
      await api.adminDeleteVideo(video.id);
      setConfirmDelete(null);
      await load();
    } catch {
      setError('No se pudo eliminar el vídeo.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleComments = async (video) => {
    if (expandedComments === video.id) {
      setExpandedComments(null);
      return;
    }
    setExpandedComments(video.id);
    setCommentsLoading(true);
    try {
      const list = await api.getComments(video.id);
      setComments(Array.isArray(list) ? list : []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const deleteComment = async (videoId, commentId) => {
    try {
      await api.adminDeleteComment(videoId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setError('No se pudo eliminar el comentario.');
    }
  };

  const full = videos.length >= MAX_VIDEOS;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Panel de administración</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className={`font-semibold ${full ? 'text-amber-400' : 'text-zinc-300'}`}>
              {videos.length}/{MAX_VIDEOS} vídeos
            </span>
            {full && ' · has alcanzado el máximo'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditing(null); setShowForm((s) => !s); }}
            disabled={full && !showForm}
            title={full ? 'Máximo de vídeos alcanzado' : 'Publicar un nuevo vídeo'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cerrar' : 'Nuevo vídeo'}
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-4 text-sm text-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Formulario de alta */}
      {showForm && (
        <div className="mb-8 rounded-2xl bg-night-900 border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-5">Publicar nuevo vídeo</h2>
          <VideoForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitting={submitting} />
        </div>
      )}

      {/* Formulario de edición */}
      {editing && (
        <div className="mb-8 rounded-2xl bg-night-900 border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-5">Editar vídeo</h2>
          <VideoForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} submitting={submitting} />
        </div>
      )}

      {/* Lista de vídeos */}
      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-night-900 border border-white/5">
          <Film className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium">No hay vídeos publicados</p>
          <p className="mt-1 text-sm text-zinc-500">Usa «Nuevo vídeo» para publicar el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="rounded-2xl bg-night-900 border border-white/5 p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-48 shrink-0 aspect-video rounded-xl overflow-hidden bg-night-800">
                  {v.thumbnailUrl && <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-snug">{v.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(v.createdAt)} · /video/{v.slug} · {v.storageType === 'blob' ? 'Archivo subido' : 'URL externa'}
                  </p>
                  {v.description && <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{v.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={`/video/${v.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-night-700 hover:bg-night-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ver
                    </a>
                    <button
                      onClick={() => toggleComments(v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-night-700 hover:bg-night-600 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Comentarios
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedComments === v.id ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setEditing(v); window.scrollTo(0, 0); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-night-700 hover:bg-night-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    {confirmDelete === v.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="text-amber-300">¿Eliminar definitivamente?</span>
                        <button
                          onClick={() => handleDelete(v)}
                          disabled={deleting}
                          className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                        >
                          {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-full bg-night-700 transition-colors">
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(v.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-night-700 hover:bg-red-600/80 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Moderación de comentarios */}
              {expandedComments === v.id && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  {commentsLoading ? (
                    <p className="text-sm text-zinc-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando comentarios…
                    </p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-zinc-500">Este vídeo no tiene comentarios.</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-night-800 p-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-200">
                              {c.nickname} <span className="font-normal text-zinc-500">· {formatDateTime(c.createdAt)}</span>
                            </p>
                            <p className="mt-1 text-sm text-zinc-300 break-words">{c.text}</p>
                          </div>
                          <button
                            onClick={() => deleteComment(v.id, c.id)}
                            title="Eliminar comentario"
                            className="shrink-0 grid place-items-center w-8 h-8 rounded-full text-zinc-500 hover:text-white hover:bg-red-600/80 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
