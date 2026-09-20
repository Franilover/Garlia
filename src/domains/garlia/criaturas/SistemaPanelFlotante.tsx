"use client";

/**
 * SistemaPanelFlotante.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Panel flotante de detalle de UN Sistema — sus Órganos (sistema_organos).
 * Extraído de OrganismoPanelFlotante para reutilizarlo también desde el
 * bloque "Sistemas vinculados" de PerfilAtomicoCriaturaPanel (Sistema
 * enlazado directo a una Criatura, sin pasar por un Organismo). Mismo
 * idioma visual que GrupoCompuestoPanelFlotante/OrganismoPanelFlotante:
 * modal centrado con backdrop blur, cierra con click en el backdrop,
 * Escape o el botón X.
 *
 * Click en un Órgano listado abre el editor completo de Órgano
 * (GrupoCompuestoPanelFlotante, tipo="organo") apilado encima.
 */

import { Layers, Waypoints, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useSistemaOrganos } from "@/domains/garlia/elementos/useSistemaOrganos";
import { GrupoCompuestoPanelFlotante } from "@/domains/garlia/elementos/GruposCompuestosPage";
import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useOrganos } from "@/domains/garlia/elementos/useOrganos";
import type { Sistema } from "@/domains/garlia/elementos/types";

export function SistemaPanelFlotante({
  sistema,
  onCerrar,
  onAbrirOrganoExterno,
  onAbrirSistemaExterno,
  onAbrirOrganismoExterno,
  onAbrirCriaturaExterno,
  onAbrirCelulaExterno,
  onAbrirTejidoExterno,
}: {
  sistema: Sistema;
  onCerrar: () => void;
  /**
   * Reemplaza TODA la pila (cierra este panel y cualquier ancestro) y abre
   * el editor completo del Órgano elegido desde el breadcrumb interno de
   * GrupoCompuestoPanelFlotante (Órgano ⇄ Sistema ⇄ Organismo) — no apila
   * encima, entra "desde cero" como si se hubiera clickeado ese Órgano
   * directo. Resuelto arriba en EditorCriatura.tsx.
   */
  onAbrirOrganoExterno?: (organoId: string) => void;
  /**
   * Reemplaza TODA la pila y abre ESE Sistema en un SistemaPanelFlotante
   * nuevo — usado cuando, parado en un Órgano/Tejido/Célula abierto desde
   * acá, se clickea "Sistema" en su breadcrumb interno y se elige uno
   * DISTINTO al que trajo hasta ahí.
   */
  onAbrirSistemaExterno?: (sistemaId: string) => void;
  /** Misma idea que onAbrirSistemaExterno, un nivel más arriba: reemplaza
   *  toda la pila y abre ESE Organismo en OrganismoPanelFlotante. */
  onAbrirOrganismoExterno?: (organismoId: string) => void;
  /** Salto DIRECTO a una Criatura desde el nivel "Criatura" del breadcrumb
   *  de un Órgano/Tejido/Célula abierto acá — sin pasar por Organismo.
   *  Sale de la pila de paneles: lo resuelve el padre (EditorCriatura). */
  onAbrirCriaturaExterno?: (criaturaId: string) => void;
  /** Salto DIRECTO (reemplaza toda la pila) a una Célula/Tejido elegida en el
   *  breadcrumb de cualquier panel apilado. Resuelto en EditorCriatura. */
  onAbrirCelulaExterno?: (celulaId: string) => void;
  onAbrirTejidoExterno?: (tejidoId: string) => void;
}) {
  const organos = useSistemaOrganos(sistema.id);
  const { items: compuestosOrganos } = useCompuestosConElementos();
  const { items: catalogoOrganos, setItems: setCatalogoOrganos } = useOrganos();

  const [editandoOrganoId, setEditandoOrganoId] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          >
            <Waypoints className="text-primary/50" size={12} />
          </div>
          <p className="flex-1 min-w-0 text-sm font-black text-primary truncate">
            {sistema.nombre || "Sin nombre"}
          </p>
          <p className="shrink-0 text-micro font-black uppercase tracking-[0.15em] text-primary/40">
            Sistema
          </p>
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
            Órganos
          </p>

          {organos.loading ? (
            <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
          ) : organos.items.length === 0 ? (
            <p className="text-micro text-primary/25 italic py-1">
              Sin Órganos vinculados a este Sistema todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {organos.items.map((o) => (
                <button
                  key={o.vinculo_id}
                  type="button"
                  onClick={() => setEditandoOrganoId(o.organo_id)}
                  className="flex items-center gap-1.5 text-left text-micro text-primary/70 hover:text-accent px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <Layers size={11} className="shrink-0 text-primary/30" />
                  <span className="truncate">{o.organo.nombre || "Sin nombre"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {editandoOrganoId &&
        (() => {
          const organoActivo = catalogoOrganos.find((o) => o.id === editandoOrganoId);
          if (!organoActivo) return null;
          return (
            <GrupoCompuestoPanelFlotante
              grupo={organoActivo}
              compuestos={compuestosOrganos}
              onCerrar={() => setEditandoOrganoId(null)}
              onActualizar={(id, cambios) =>
                setCatalogoOrganos((prev) =>
                  prev.map((o) => (o.id === id ? { ...o, ...cambios } : o)),
                )
              }
              onAbrirOrganoExterno={onAbrirOrganoExterno}
              onAbrirSistemaExterno={onAbrirSistemaExterno}
              onAbrirOrganismoExterno={onAbrirOrganismoExterno}
              onAbrirCriaturaExterno={onAbrirCriaturaExterno}
              onAbrirCelulaExterno={onAbrirCelulaExterno}
              onAbrirTejidoExterno={onAbrirTejidoExterno}
            />
          );
        })()}
    </div>,
    document.body,
  );
}
