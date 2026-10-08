import { useEffect, useState } from 'react';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';

export const MAX_COMMENTS = 30;
export const MAX_NICKNAME = 30;
export const MAX_TEXT = 500;

export default function Comments({ videoId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getComments(videoId)
      .then((list) => alive && setComments(Array.isArray(list) ? list : []))
      .catch(() => alive && setComments([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [videoId]);

  const full = comments.length >= MAX_COMMENTS;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const nick = nickname.trim().replace(/\s+/g, ' ');
    const body = text.trim().replace(/\s+/g, ' ');
    if (!nick) return setError('Escribe un nickname.');
    if (!body) return setError('Escribe un comentario.');
    if (nick.length > MAX_NICKNAME) return setError(`El nickname no puede superar ${MAX_NICKNAME} caracteres.`);
    if (body.length > MAX_TEXT) return setError(`El comentario no puede superar ${MAX_TEXT} caracteres.`);
    setSending(true);
    try {
      const created = await api.postComment(videoId, { nickname: nick, text: body });
      setComments((prev) => [created, ...prev]);
      setText('');
    } catch (err) {
      setError(err.message || 'No se pudo publicar el comentario.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-8" aria-label="Comentarios">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="w-5 h-5 text-accent-400" />
        Comentarios ({comments.length}/{MAX_COMMENTS})
      </h2>

      {full ? (
        <p className="mt-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          Este vídeo ha alcanzado el máximo de comentarios.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 rounded-2xl bg-night-900 border border-white/5 p-4 space-y-3">
          <div>
            <label htmlFor="nickname" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Nickname
            </label>
            <input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={MAX_NICKNAME}
              placeholder="¿Cómo te llamas?"
              className="w-full sm:max-w-xs px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
            />
          </div>
          <div>
            <label htmlFor="comment" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Comentario
            </label>
            <textarea
              id="comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TEXT}
              rows={3}
              placeholder="Escribe tu comentario…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20 resize-y"
            />
            <p className="mt-1 text-right text-[11px] text-zinc-600">{text.length}/{MAX_TEXT}</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publicar comentario
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500 soft-pulse">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando comentarios…
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay comentarios. ¡Sé la primera persona en comentar!</p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="rounded-2xl bg-night-900 border border-white/5 p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-full bg-night-700 text-zinc-300">
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{c.nickname}</p>
                  <p className="text-[11px] text-zinc-500">{formatDateTime(c.createdAt)}</p>
                </div>
              </div>
              <p className="mt-2.5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                {c.text}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
