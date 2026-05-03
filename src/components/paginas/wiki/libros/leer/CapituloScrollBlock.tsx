"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { AlignLeft, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { CapituloScrollItem } from "./type";
import { ContenidoInteractivo } from "./segmentos/ContenidoInteractivo";
import { useDesbloquearPersonajes, PersonajesDesbloqueadosToast, FinCapituloSeparador } from "./ui/PersonajesYSeparador";
import { renderMarkdown, renderMathInElement, PROSE_STYLES } from "@/components/forms/MarkdownEditor";

/** Detecta si el texto usa sintaxis markdown real */
function tieneMarkdown(texto: string): boolean {
  return /^#{1,6}\s|^\*\*|^__|^\*[^*]|\[.+\]\(|^>\s|^```|^-\s|^\d+\.\s|\[\[TOC\]\]|^>\s*\[!/m.test(texto);
}

/** Renderiza contenido markdown del capítulo preservando el estilo del lector */
function ContenidoMarkdown({ texto, onNavigate }: { texto: string; onNavigate: (capId: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(texto), [texto]);

  useEffect(() => { renderMathInElement(ref.current); }, [html]);

  // Interceptar clics en links internos (ej: [Cap 2](#cap-xxx)) para usar onNavigate
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      // link interno tipo #cap-<id>
      const capMatch = href.match(/^#cap-(.+)$/);
      if (capMatch) {
        e.preventDefault();
        onNavigate(capMatch[1]);
        return;
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [onNavigate]);

  return (
    <>
      <style>{PROSE_STYLES}</style>
      <div
        ref={ref}
        className="prose-mundo lector-texto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

export function CapituloScrollBlock({ cap, onNavigate }: {
  cap: CapituloScrollItem;
  onNavigate: (capId: string) => void;
}) {
  const words = (cap.contenido ?? "").trim()
    ? (cap.contenido ?? "").trim().split(/\s+/).length
    : 0;

  const { disparar, mostrarCelebration, desbloqueados, cerrar } =
    useDesbloquearPersonajes(cap.id, cap.personajes_ids);

  const usarMarkdown = tieneMarkdown(cap.contenido ?? "");

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
        {usarMarkdown
          ? <ContenidoMarkdown texto={cap.contenido ?? ""} onNavigate={onNavigate} />
          : <ContenidoInteractivo texto={cap.contenido ?? ""} onNavigate={onNavigate} />
        }
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