"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlignLeft, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { CapituloScrollItem } from "@/features/myself/garlia/editorCapitulos/snippets/type";
import { ContenidoInteractivo } from "./ContenidoInteractivo";

import { LectorSkeleton, ReadingProgressBar, Vignette, CapituloHeader, FinCapituloSeparador, IndexPanel, ChapterSelector } from "./LectorUI";
import { useDesbloquearPersonajes, PersonajesDesbloqueadosToast } from "@/features/myself/garlia/editorCapitulos/hooks/usePersonajes";
import { useDesbloquearReinos, ReinosDesbloqueadosToast } from "@/features/myself/garlia/editorCapitulos/hooks/useReinos";
import { useDesbloquearCiudades, CiudadesDesbloqueadasToast } from "@/features/myself/garlia/editorCapitulos/hooks/useCiudades";

/**
 * Estilos de fuente fluida para el lector.
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

/* ─────────────────────────────────────────────
   Bug 3 fix: Cola global de toasts
   Evita que múltiples toasts se sobrepongan en pantalla
   cuando dos capítulos terminan casi al mismo tiempo
   (scroll rápido, prefetch, etc.).

   La cola muestra UN toast a la vez y avanza al siguiente
   cuando el actual se cierra (manualmente o por timeout).
   ───────────────────────────────────────────── */
type ToastEntry =
  | { tipo: "personajes"; ids: string[] }
  | { tipo: "reinos";     ids: string[] }
  | { tipo: "ciudades";   ids: string[] };

// Estado global fuera del árbol de React — no causa re-renders innecesarios
const toastQueue: ToastEntry[] = [];
const toastListeners = new Set<() => void>();

function notifyListeners() {
  toastListeners.forEach(fn => fn());
}

/** Encola un toast. Se muestra cuando termina el toast actual. */
export function encolarToast(entry: ToastEntry) {
  toastQueue.push(entry);
  notifyListeners();
}

/** Hook para el componente que renderiza la cola */
function useToastQueue() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate(n => n + 1);
    toastListeners.add(update);
    return () => { toastListeners.delete(update); };
  }, []);

  const current = toastQueue[0] ?? null;

  const avanzar = useCallback(() => {
    toastQueue.shift();
    notifyListeners();
  }, []);

  return { current, avanzar };
}

/**
 * ToastPortal — se monta UNA SOLA VEZ en el árbol (en leerLibro.tsx).
 * Renderiza el primer toast de la cola; al cerrarse avanza al siguiente.
 * Exportado para que leerLibro.tsx lo incluya fuera del map de capítulos.
 */
export function ToastPortal() {
  const { current, avanzar } = useToastQueue();

  return (
    <AnimatePresence mode="wait">
      {current?.tipo === "personajes" && (
        <PersonajesDesbloqueadosToast
          key={`personajes-${current.ids.join(",")}`}
          personajesIds={current.ids}
          onClose={avanzar}
        />
      )}
      {current?.tipo === "reinos" && (
        <ReinosDesbloqueadosToast
          key={`reinos-${current.ids.join(",")}`}
          reinosIds={current.ids}
          onClose={avanzar}
        />
      )}
      {current?.tipo === "ciudades" && (
        <CiudadesDesbloqueadasToast
          key={`ciudades-${current.ids.join(",")}`}
          ciudadesIds={current.ids}
          onClose={avanzar}
        />
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   Componente de capítulo
   ───────────────────────────────────────────── */
export function CapituloScrollBlock({ cap, onNavigate, esExtra = false, haySegSiguiente = false }: {
  cap: CapituloScrollItem;
  onNavigate: (capId: string) => void;
  esExtra?: boolean;
  haySegSiguiente?: boolean;
}) {
  const words = (cap.contenido ?? "").trim()
    ? (cap.contenido ?? "").trim().split(/\s+/).length
    : 0;

  // Cada capítulo desbloquea sus propias entidades al completarse.
  const personajesIdsEfectivos = cap.personajes_ids;
  const reinosIdsEfectivos     = cap.reinos_ids as string[] | undefined;
  const ciudadesIdsEfectivos    = (cap as any).ciudades_ids;

  const { disparar: dispararPersonajes } = useDesbloquearPersonajes(cap.id, personajesIdsEfectivos);
  const { disparar: dispararReinos }     = useDesbloquearReinos(cap.id, reinosIdsEfectivos);
  const { disparar: dispararCiudades }    = useDesbloquearCiudades(cap.id, ciudadesIdsEfectivos);

  // Bug 3 fix: en vez de mostrar toasts directamente, los encola.
  // El ToastPortal (montado una sola vez en leerLibro) los muestra de uno en uno.
  // disparar() retorna los IDs nuevos directamente (no depende del estado React,
  // que actualiza asíncronamente y no estaría disponible aquí).
  const handleFinCapitulo = useCallback(async () => {
    // allSettled garantiza que si uno falla, los otros igual se procesan
    const results = await Promise.allSettled([
      dispararPersonajes(),
      dispararReinos(),
      dispararCiudades(),
    ]);
    const [rPersonajes, rReinos, rCiudades] = results;
    const nuevosPersonajes = rPersonajes.status === "fulfilled" ? rPersonajes.value : [];
    const nuevosReinos     = rReinos.status     === "fulfilled" ? rReinos.value     : [];
    const nuevasCiudades    = rCiudades.status    === "fulfilled" ? rCiudades.value    : [];
    if (nuevosPersonajes?.length) encolarToast({ tipo: "personajes", ids: nuevosPersonajes });
    if (nuevosReinos?.length)     encolarToast({ tipo: "reinos",     ids: nuevosReinos });
    if (nuevasCiudades?.length)    encolarToast({ tipo: "ciudades",    ids: nuevasCiudades });
  }, [dispararPersonajes, dispararReinos, dispararCiudades]);

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

        <FinCapituloSeparador cap={cap} onVisible={handleFinCapitulo} ocultar={true} />
      </article>
    </div>
  );
}