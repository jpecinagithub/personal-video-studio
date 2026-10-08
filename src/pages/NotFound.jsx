import { Link } from 'react-router-dom';
import { ArrowLeft, Ghost } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <Ghost className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-zinc-400 text-sm">La dirección que buscas no existe.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night-800 hover:bg-night-700 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a la galería
      </Link>
    </div>
  );
}
