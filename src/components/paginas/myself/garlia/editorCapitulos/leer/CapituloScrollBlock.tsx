"use client";
import React from "react";
import { AlignLeft, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { CapituloScrollItem } from "../snippets/type";
import { ContenidoInteractivo } from "./ContenidoInteractivo";

import { LectorSkeleton, ReadingProgressBar, Vignette, CapituloHeader, FinCapituloSeparador, IndexPanel, ChapterSelector } from "./LectorUI";
import { useDesbloquearPersonajes, PersonajesDesbloqueadosToast } from "./usePersonajes";
import { useDesbloquearReinos, ReinosDesbloqueadosToast } from "./useReinos";
import { useDesbloquearLugares, LugaresDesbloqueadosToast } from "./useLugares";

/**
 * Estilos de fuente fluida para el lector.
 * Usamos container queries para que el tamaño de fuente responda al ancho
 * real del contenedor (que varía con el panel lateral y el zoom del navegador).
 */
const FLUID_FONT_STYLES = `
  .lector-article-wrap {
    container-type: inline-size;
    container-name: lector;
  }

  @container lector (min-width: 0px) {
    .lector-article-inner {
      font-size: clamp(1rem, 2.2cqi, 1.22rem);
      line-height: 1.85;
    }
  }

  @container lector (min-width: 600px) {
    .lector-article-inner {
      font-size: clamp(1.06rem, 1.9cqi, 1.28rem);
      line-height: 1.9;
    }
  }

  @container lector (min-width: 0px) {
    .lector-titulo {
      font-size: clamp(1.6rem, 6cqi, 2.5rem);
    }
  }

  @container lector (min-width: 0px) {
    .lector-seccion {
      font-size: clamp(2rem, 7cqi, 3rem);
    }
  }
`;

export function CapituloScrollBlock({ cap, onNavigate, esExtra = false, acumPersonajesIds, acumReinosIds, acumLugaresIds }: {
  cap: CapituloScrollItem;
  onNavigate: (capId: string) => void;
  esExtra?: boolean;
  /** IDs acumulados de TODO el segmento — solo se pasan al último cap del segmento
   *  para que su FinCapituloSeparador desbloquee de golpe todos los personajes/reinos/lugares. */
  acumPersonajesIds?: string[];
  acumReinosIds?: string[];
  acumLugaresIds?: string[];
}) {
  const words = (cap.contenido ?? "").trim()
    ? (cap.contenido ?? "").trim().split(/\s+/).length
    : 0;

  // Si se pasaron ids acumulados (último cap del segmento), usarlos; si no, los propios del cap.
  const personajesIdsEfectivos = acumPersonajesIds ?? cap.personajes_ids;
  const reinosIdsEfectivos     = acumReinosIds     ?? (cap.reinos_ids as string[] | undefined);
  const lugaresIdsEfectivos    = acumLugaresIds    ?? (cap as any).lugares_ids;

  const {
    disparar: dispararPersonajes,
    mostrarCelebration: mostrarPersonajes,
    desbloqueados: personajesDesbloqueados,
    cerrar: cerrarPersonajes,
  } = useDesbloquearPersonajes(cap.id, personajesIdsEfectivos);

  const {
    disparar: dispararReinos,
    mostrarCelebration: mostrarReinos,
    desbloqueados: reinosDesbloqueados,
    cerrar: cerrarReinos,
  } = useDesbloquearReinos(cap.id, reinosIdsEfectivos);

  const {
    disparar: dispararLugares,
    mostrarCelebration: mostrarLugares,
    desbloqueados: lugaresDesbloqueados,
    cerrar: cerrarLugares,
  } = useDesbloquearLugares(cap.id, lugaresIdsEfectivos);

  // Dispara los tres hooks al llegar al final del capítulo
  const handleFinCapitulo = () => {
    dispararPersonajes();
    dispararReinos();
    dispararLugares();
  };

  return (
    <div id={`cap-${cap.id}`} className="lector-article-wrap scroll-mt-20">
      <style>{FLUID_FONT_STYLES}</style>
      {esExtra && <style>{`
        .lector-article-wrap p::first-letter,
        .lector-article-wrap p:first-of-type::first-letter,
        .prose-mundo p::first-letter,
        .lector-texto p::first-letter {
          all: unset !important;
          font-size: inherit !important;
          float: none !important;
          line-height: inherit !important;
          font-weight: inherit !important;
        }
      `}</style>}

      <article
        className="lector-article-inner mx-auto px-6 py-16 md:py-24"
        style={{ maxWidth: "min(680px, 92%)" }}
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
          <ContenidoInteractivo
            texto={cap.contenido ?? ""}
            onNavigate={onNavigate}
            esExtra={esExtra}
          />
        </div>

        {!esExtra && <FinCapituloSeparador cap={cap} onVisible={handleFinCapitulo} />}

        <AnimatePresence>
          {mostrarPersonajes && (
            <PersonajesDesbloqueadosToast
              personajesIds={personajesDesbloqueados}
              onClose={cerrarPersonajes}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mostrarReinos && (
            <ReinosDesbloqueadosToast
              reinosIds={reinosDesbloqueados}
              onClose={cerrarReinos}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mostrarLugares && (
            <LugaresDesbloqueadosToast
              lugaresIds={lugaresDesbloqueados}
              onClose={cerrarLugares}
            />
          )}
        </AnimatePresence>
      </article>
    </div>
  );
}