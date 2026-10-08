import { Link, useLocation } from 'react-router-dom';
import { Clapperboard, ShieldCheck } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const inAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-night-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-600/30">
              <Clapperboard className="w-5 h-5 text-white" />
            </span>
            <span className="font-semibold tracking-tight text-lg">
              Personal <span className="text-accent-400">Video Studio</span>
            </span>
          </Link>
          {!inAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Acceso del administrador"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-white/5 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">Personal Video Studio · Tus vídeos, tu plataforma</p>
          <p className="text-xs text-zinc-600">Desarrollado por Jon Peciña</p>
        </div>
      </footer>
    </div>
  );
}
