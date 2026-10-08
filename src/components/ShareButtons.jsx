import { useState } from 'react';
import { Share2, Link2, Check, MessageCircle, Send } from 'lucide-react';

// Botones para compartir la URL permanente del vídeo.
export default function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const text = `${title}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        /* el usuario canceló */
      }
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const channels = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: 'hover:bg-[#25D366]/15 hover:text-[#25D366] hover:border-[#25D366]/30',
    },
    {
      name: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: 'hover:bg-[#229ED9]/15 hover:text-[#229ED9] hover:border-[#229ED9]/30',
    },
    {
      name: 'LinkedIn',
      icon: Share2,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:bg-[#0A66C2]/15 hover:text-[#0A66C2] hover:border-[#0A66C2]/30',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {navigator.share && (
        <button
          onClick={nativeShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {shared ? '¡Compartido!' : 'Compartir'}
        </button>
      )}
      {channels.map(({ name, icon: Icon, href, color }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Compartir en ${name}`}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-night-800 text-sm text-zinc-300 transition-colors ${color}`}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{name}</span>
        </a>
      ))}
      <button
        onClick={copyLink}
        title="Copiar enlace"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-night-800 text-sm text-zinc-300 hover:bg-night-700 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
        {copied ? '¡Copiado!' : 'Copiar enlace'}
      </button>
    </div>
  );
}
