"use client";
import React from "react";
import { AlignLeft, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { CapituloScrollItem } from "./type";
import { ContenidoInteractivo } from "./segmentos/ContenidoInteractivo";
import { useDesbloquearPersonajes, PersonajesDesbloqueadosToast, FinCapituloSeparador } from "./ui/PersonajesYSeparador";

export function CapituloScrollBlock({ cap, onNavigate }: {
  cap: CapituloScrollItem;
  onNavigate: (capId: string) => void;
}) {
  const words = (cap.contenido ?? "").trim()
    ? (cap.contenido ?? "").trim().split(/\s+/).length
    : 0;

  const { disparar, mostrarCelebration, desbloqueados, cerrar } =
    useDesbloquearPersonajes(cap.id, cap.personajes_ids);

  return (
    <article id={`cap-${cap.id}`} className="max-w-2xl mx-auto px-6 py-16 md:py-24 scroll-mt-20">
      <header className="mb-12 text-center">
        <span className="text-primary/20 font-serif italic text-4xl block mb-2">§ {cap.orden}</span>
        <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tighter uppercase italic leading-none">
          {cap.titulo_capitulo}
        </h1>
        <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
          <span className="flex items-center gap-1"><AlignLeft size={9} /> {words.toLocaleString()} palabras</span>
          <span className="flex items-center gap-1"><Clock size={9} /> ~{Math.max(1, Math.round(words / 200))} min</span>
        </div>
      </header>

      <div className="min-h-[20vh]">
        <ContenidoInteractivo texto={cap.contenido ?? ""} onNavigate={onNavigate} />
      </div>

      <FinCapituloSeparador cap={cap} onVisible={disparar} />

      <AnimatePresence>
        {mostrarCelebration && (
          <PersonajesDesbloqueadosToast personajesIds={desbloqueados} onClose={cerrar} />
        )}
      </AnimatePresence>
    </article>
  );
}
