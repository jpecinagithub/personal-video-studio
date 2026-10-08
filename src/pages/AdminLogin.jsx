import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(() => navigate('/admin/panel', { replace: true }))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Introduce el usuario y la contraseña.');
      return;
    }
    setLoading(true);
    try {
      await api.login(username.trim(), password);
      navigate('/admin/panel', { replace: true });
    } catch {
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <div className="rounded-2xl bg-night-900 border border-white/5 p-8">
        <div className="grid place-items-center w-12 h-12 rounded-xl bg-night-700 mb-5">
          <ShieldCheck className="w-6 h-6 text-accent-400" />
        </div>
        <h1 className="text-2xl font-bold">Acceso del administrador</h1>
        <p className="mt-1 text-sm text-zinc-500">Solo el administrador puede publicar y gestionar vídeos.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-user" className="block text-xs font-medium text-zinc-400 mb-1.5">Usuario</label>
            <input
              id="admin-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
            />
          </div>
          <div>
            <label htmlFor="admin-pass" className="block text-xs font-medium text-zinc-400 mb-1.5">Contraseña</label>
            <input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-night-800 border border-white/10 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
