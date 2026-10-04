"use client";

/**
 * ModalFlotante
 * ─────────────────────────────────────────────────────────────────────────────
 * Shell base reutilizable para paneles flotantes centrados en pantalla.
 * Replica el mismo shell visual de PanelFlotanteGlobal (backdrop blur,
 * rounded-2xl, header con X, Escape para cerrar) pero sin acoplar
 * ningún tipo de contenido específico — el children decide todo.
 *
 * Uso:
 *   <ModalFlotante
 *     abierto={!!sel}
 *     onCerrar={() => setSel(null)}
 *     titulo="Editar item"
 *     icono={<Sword size={12} />}
 *     accionesDerecha={<SaveBtn … />}
 *   >
 *     {/* contenido del form *\/}
 *   </ModalFlotante>
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalFlotanteProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: React.ReactNode;
  icono?: React.ReactNode;
  accionesDerecha?: React.ReactNode;
  children: React.ReactNode;
  /** Ancho máximo del modal. Default "max-w-3xl" */
  maxWidth?: string;
}

export function ModalFlotante({
  abierto,
  onCerrar,
  titulo,
  icono,
  accionesDerecha,
  children,
  maxWidth = "max-w-3xl",
}: ModalFlotanteProps) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, onCerrar]);

  if (!abierto || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className={`w-full h-full ${maxWidth} rounded-2xl overflow-hidden shadow-2xl flex flex-col`}
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          {icono && (
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
              }}
            >
              <span style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                {icono}
              </span>
            </div>
          )}
          {titulo && (
            <p className="flex-1 min-w-0 text-sm font-black text-primary truncate">{titulo}</p>
          )}
          {accionesDerecha && (
            <div className="shrink-0 flex items-center gap-2">{accionesDerecha}</div>
          )}
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-5 gap-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
