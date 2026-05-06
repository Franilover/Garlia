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

/**
 * Estilos de fuente fluida para el lector.
 * Usamos container queries para que el tamaño de fuente responda al ancho
 * real del contenedor (que varía con el panel lateral y el zoom del navegador).
 *
 * Cuando el usuario hace zoom-in el área disponible se estrecha → el clamp
 * cae al mínimo y la fuente sube proporcionalmente al zoom del sistema.
 * Cuando hay mucho espacio (pantalla grande, zoom al 75%) el texto crece
 * y los márgenes laterales del max-width también aumentan.
 */
const FLUID_FONT_STYLES = `
  .lector-article-wrap {
    container-type: inline-size;
    container-name: lector;
  }

  /* Fuente base del artículo: escala con el ancho del contenedor */
  @container lector (min-width: 0px) {
    .lector-article-inner {
      /* clamp: mínimo 1rem, preferido 2.2cqi (2.2% del ancho del contenedor), máximo 1.22rem */
      font-size: clamp(1rem, 2.2cqi, 1.22rem);
      line-height: 1.85;
    }
  }

  /* En contenedores amplios (desktop con espacio) el texto crece más */
  @container lector (min-width: 600px) {
    .lector-article-inner {
      font-size: clamp(1.06rem, 1.9cqi, 1.28rem);
      line-height: 1.9;
    }
  }

  /* Título del capítulo también fluido */
  @container lector (min-width: 0px) {
    .lector-titulo {
      font-size: clamp(1.6rem, 6cqi, 2.5rem);
    }
  }

  /* Símbolo § */
  @container lector (min-width: 0px) {
    .lector-seccion {
      font-size: clamp(2rem, 7cqi, 3rem);
    }
  }
`;

/** Renderiza contenido markdown del capítulo preservando el estilo del lector */
function ContenidoMarkdown({ texto, onNavigate }: { texto: string; onNavigate: (capId: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(texto), [texto]);

  useEffect(() => { renderMathInElement(ref.current); }, [html]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const capMatch = href.match(/^#cap-(.+)$/);
      if (capMatch) {
        e.preventDefault();
        onNavigate(capMatch[1]);
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

export function CapituloScrollBlock({ cap, onNavigate, esExtra = false }: {
  cap: CapituloScrollItem;
  onNavigate: (capId: string) => void;
  esExtra?: boolean;
}) {
  const words = (cap.contenido ?? "").trim()
    ? (cap.contenido ?? "").trim().split(/\s+/).length
    : 0;

  const { disparar, mostrarCelebration, desbloqueados, cerrar } =
    useDesbloquearPersonajes(cap.id, cap.personajes_ids);

  const usarMarkdown = tieneMarkdown(cap.contenido ?? "");

  return (
    /*
     * lector-article-wrap: contenedor de referencia para container queries.
     * Ocupa todo el ancho disponible en la columna de texto.
     * El artículo interior tiene max-width para limitar la línea de lectura,
     * pero los márgenes horizontales crecen naturalmente cuando hay más espacio.
     */
    <div id={`cap-${cap.id}`} className="lector-article-wrap scroll-mt-20">
      <style>{FLUID_FONT_STYLES}</style>

      <article
        className="lector-article-inner mx-auto px-6 py-16 md:py-24"
        style={{
          /*
           * max-width fluido: en móvil sin panel = ancho casi completo.
           * En desktop con panel lateral el espacio es menor, así que
           * usamos un max-width amplio y dejamos que los márgenes automáticos
           * creen el espacio visual cuando hay sitio de sobra.
           */
          maxWidth: "min(680px, 92%)",
        }}
      >
        <header className="mb-12 text-center">
          {!esExtra && (
            <span className="lector-seccion text-primary/20 font-serif italic block mb-2">
              {cap.orden}
            </span>
          )}
          <h1 className="lector-titulo font-black text-primary tracking-tighter uppercase italic leading-none">
            {cap.titulo_capitulo}
          </h1>
          {!esExtra && (
            <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
              <span className="flex items-center gap-1"><AlignLeft size={9} /> {words.toLocaleString()} palabras</span>
              <span className="flex items-center gap-1"><Clock size={9} /> ~{Math.max(1, Math.round(words / 200))} min</span>
            </div>
          )}
        </header>

        <div className="min-h-[20vh]">
          {usarMarkdown
            ? <ContenidoMarkdown texto={cap.contenido ?? ""} onNavigate={onNavigate} />
            : <ContenidoInteractivo texto={cap.contenido ?? ""} onNavigate={onNavigate} />
          }
        </div>

        {!esExtra && <FinCapituloSeparador cap={cap} onVisible={disparar} />}

        <AnimatePresence>
          {mostrarCelebration && (
            <PersonajesDesbloqueadosToast personajesIds={desbloqueados} onClose={cerrar} />
          )}
        </AnimatePresence>
      </article>
    </div>
  );
}