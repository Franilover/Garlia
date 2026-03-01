"use client";
import React, { useState } from 'react';
import { Share2 } from 'lucide-react';

export const ShareButton = ({ url, titulo }) => {
  const [copiado, setCopiado] = useState(false);
  
  const handleShare = async (e) => {
    e.stopPropagation(); 
    // Aseguramos que la URL sea absoluta
    const fullUrl = typeof window !== 'undefined' 
      ? window.location.origin + url 
      : url;

    if (navigator.share) {
      try { 
        await navigator.share({ 
          title: titulo || "Franilover Art", 
          url: fullUrl 
        }); 
      } catch (err) {
        console.log("Error compartiendo:", err);
      }
    } else {
      // Fallback para navegadores que no soportan share nativo
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      } catch (err) {
        console.error("No se pudo copiar al portapapeles");
      }
    }
  };

  return (
    <button 
      onClick={handleShare} 
      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full transition-all active:scale-95 group"
    >
      <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">
        {copiado ? "¡Enlace Copiado!" : "Compartir"}
      </span>
      <Share2 size={12} className="text-white opacity-50 group-hover:opacity-100" />
    </button>
  );
};