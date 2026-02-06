"use client";
import React, { useState } from 'react';
import { Share2, Check, ExternalLink } from 'lucide-react'; // Usamos Lucide para ser consistentes

const ShareButton = ({ url, titulo }) => {
  const [copiado, setCopiado] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation(); // Evita que se disparen otros eventos (como el lightbox)
    
    const fullUrl = window.location.origin + url;

    if (navigator.share) {
      try {
        await navigator.share({
          title: titulo,
          text: `Mira este dibujo: ${titulo}`,
          url: fullUrl,
        });
      } catch (err) {
        console.log("Compartir cancelado");
      }
    } else {
      navigator.clipboard.writeText(fullUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`
        flex items-center gap-3 px-6 py-2.5 rounded-full transition-all duration-300 border backdrop-blur-md
        ${copiado 
          ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
          : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 active:scale-95"}
      `}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
        {copiado ? "¡Enlace Copiado!" : "Compartir"}
      </span>
      
      {copiado ? (
        <Check size={14} className="animate-in zoom-in duration-300" />
      ) : (
        <Share2 size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
};

export default ShareButton;