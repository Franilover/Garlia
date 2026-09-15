"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Modal } from "@/ui/Layout";

import { librosConocimientoQueries } from "./queries";
import type { LibroConocimientoConPaginas } from "./types";

interface Props {
  libroId: string | null;
  onClose: () => void;
}

/**
 * Visor "libro abierto": muestra dos páginas a la vez (izquierda | derecha),
 * como un libro físico. Se navega de a pares con flechas prev/next —
 * cada click avanza/retrocede 2 páginas (una hoja completa).
 *
 * Si el libro tiene un número impar de páginas, la última hoja queda con
 * la derecha vacía.
 */
export function VisorLibroConocimiento({ libroId, onClose }: Props) {
  const [libro, setLibro] = useState<LibroConocimientoConPaginas | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoja, setHoja] = useState(0); // índice de la hoja (par de páginas), 0-based

  useEffect(() => {
    if (!libroId) return;
    let mounted = true;
    setLoading(true);
    setHoja(0);
    librosConocimientoQueries
      .obtenerConPaginas(libroId)
      .then((data) => {
        if (mounted) setLibro(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [libroId]);

  const totalPaginas = libro?.paginas.length ?? 0;
  const totalHojas = Math.max(1, Math.ceil(totalPaginas / 2));
  const paginaIzq = libro?.paginas[hoja * 2] ?? null;
  const paginaDer = libro?.paginas[hoja * 2 + 1] ?? null;

  const puedeAnterior = hoja > 0;
  const puedeSiguiente = hoja < totalHojas - 1;

  return (
    <Modal
      maxWidth="max-w-4xl"
      open={Boolean(libroId)}
      subtitle="Universo › Libros"
      title={libro?.titulo ?? "Cargando…"}
      onClose={onClose}
    >
      {loading || !libro ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-10 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Cargando…
        </p>
      ) : totalPaginas === 0 ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-10 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Este libro todavía no tiene páginas.
        </p>
      ) : (
        <div className="space-y-3">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-0 overflow-hidden"
            style={{
              borderRadius: "var(--radius-card)",
              border:
                "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <PaginaSpread
              contenido={paginaIzq?.contenido ?? null}
              numero={paginaIzq ? hoja * 2 + 1 : null}
              borderSide="right"
            />
            <PaginaSpread
              contenido={paginaDer?.contenido ?? null}
              numero={paginaDer ? hoja * 2 + 2 : null}
              borderSide="none"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="Página anterior"
              className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-btn)] transition-opacity disabled:opacity-30"
              disabled={!puedeAnterior}
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={() => setHoja((h) => Math.max(0, h - 1))}
            >
              <ChevronLeft size={18} />
            </button>

            <p
              className="text-micro font-bold uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              Hoja {hoja + 1} / {totalHojas}
            </p>

            <button
              aria-label="Página siguiente"
              className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-btn)] transition-opacity disabled:opacity-30"
              disabled={!puedeSiguiente}
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={() => setHoja((h) => Math.min(totalHojas - 1, h + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PaginaSpread({
  contenido,
  numero,
  borderSide,
}: {
  contenido: string | null;
  numero: number | null;
  borderSide: "left" | "right" | "none";
}) {
  return (
    <div
      className="p-5 min-h-[280px] flex flex-col"
      style={{
        background: "var(--white-custom)",
        borderRight:
          borderSide === "right"
            ? "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)"
            : undefined,
        borderLeft:
          borderSide === "left"
            ? "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)"
            : undefined,
      }}
    >
      {contenido ? (
        <>
          <p
            className="flex-1 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "color-mix(in srgb, var(--primary) 80%, transparent)" }}
          >
            {contenido}
          </p>
          <p
            className="text-micro font-bold uppercase tracking-widest text-center mt-4"
            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            {numero}
          </p>
        </>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
