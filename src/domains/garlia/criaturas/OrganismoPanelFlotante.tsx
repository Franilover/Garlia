"use client";

/**
 * OrganismoPanelFlotante.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Panel flotante de detalle de UN Organismo — click en una fila de
 * PanelOrganismosCriatura (dentro de EditorCriatura) abre esto. Muestra el
 * nivel "techo" de la cadena biológica que cuelga del Organismo: sus
 * Sistemas (organismo_sistemas) y, dentro de cada Sistema, sus Órganos
 * (sistema_organos) — mismo idioma visual que GrupoCompuestoPanelFlotante
 * (elementos/GruposCompuestosPage.tsx): modal centrado con backdrop blur,
 * header con ícono + nombre + cerrar, cierra con click en el backdrop,
 * Escape o el botón X.
 *
 * Click en un Órgano listado abre el editor completo de Órgano
 * (GrupoCompuestoPanelFlotante, tipo="organo") apilado encima — mismo
 * patrón de navegación en cascada que el resto del EditorCriatura.
 */

import { Boxes, Layers, Waypoints, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useOrganismoSistemas } from "@/domains/garlia/elementos/useOrganismoSistemas";
import { useSistemaOrganos } from "@/domains/garlia/elementos/useSistemaOrganos";
import { GrupoCompuestoPanelFlotante } from "@/domains/garlia/elementos/GruposCompuestosPage";
import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useOrganos } from "@/domains/garlia/elementos/useOrganos";
import type { Organismo } from "@/domains/garlia/elementos/types";

export function OrganismoPanelFlotante({
  organismo,
  onCerrar,
}: {
  organismo: Organismo;
  onCerrar: () => void;
}) {
  const sistemas = useOrganismoSistemas(organismo.id);
  const { items: compuestosOrganos } = useCompuestosConElementos();
  const { items: catalogoOrganos, setItems: setCatalogoOrganos } = useOrganos();

  // Órgano abierto (encima de este panel) al clickear una fila de Órgano
  // dentro de un Sistema — reutiliza el editor completo de Órgano, mismo
  // que usa la sección "Órganos" de EditorCriatura.
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
        {/* Header: ícono + nombre (solo lectura acá — el nombre del
            Organismo se edita desde su propio catálogo, no desde este
            panel de solo-visualización de Sistemas/Órganos) + cerrar. */}
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
            <Boxes className="text-primary/50" size={12} />
          </div>
          <p className="flex-1 min-w-0 text-sm font-black text-primary truncate">
            {organismo.nombre || "Sin nombre"}
          </p>
          <p className="shrink-0 text-micro font-black uppercase tracking-[0.15em] text-primary/40">
            Organismo
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

        {/* Contenido: Sistemas del Organismo, cada uno con sus Órganos
            anidados — techo de la cadena Célula→Tejido→Órgano→Sistema→
            Organismo, visto de arriba hacia abajo. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
            Sistemas
          </p>

          {sistemas.loading ? (
            <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
          ) : sistemas.items.length === 0 ? (
            <p className="text-micro text-primary/25 italic py-1">
              Sin Sistemas vinculados a este Organismo todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sistemas.items.map((s) => (
                <SistemaConOrganos
                  key={s.vinculo_id}
                  sistemaId={s.sistema_id}
                  sistemaNombre={s.sistema.nombre}
                  proporcion={s.proporcion}
                  onAbrirOrgano={setEditandoOrganoId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor completo del Órgano elegido — apilado encima, mismo
          comportamiento que el resto de la cascada en EditorCriatura. */}
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
            />
          );
        })()}
    </div>,
    document.body,
  );
}

/** Un Sistema del Organismo, con sus Órganos (sistema_organos) listados debajo. */
function SistemaConOrganos({
  sistemaId,
  sistemaNombre,
  proporcion,
  onAbrirOrgano,
}: {
  sistemaId: string;
  sistemaNombre: string;
  proporcion: string | null;
  onAbrirOrgano: (organoId: string) => void;
}) {
  const organos = useSistemaOrganos(sistemaId);

  return (
    <div className="bg-primary/5 rounded-md px-2.5 py-2 border border-primary/10">
      <div className="flex items-center gap-1.5">
        <Waypoints size={11} className="text-primary/40 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-micro font-bold text-primary/80">
          {sistemaNombre || "Sin nombre"}
        </span>
        {proporcion && (
          <span className="shrink-0 text-micro text-primary/35">{proporcion}</span>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-1.5 pl-[19px]">
        {organos.loading ? (
          <p className="text-micro text-primary/25 italic">Cargando…</p>
        ) : organos.items.length === 0 ? (
          <p className="text-micro text-primary/25 italic">Sin Órganos vinculados.</p>
        ) : (
          organos.items.map((o) => (
            <button
              key={o.vinculo_id}
              type="button"
              onClick={() => onAbrirOrgano(o.organo_id)}
              className="flex items-center gap-1.5 text-left text-micro text-primary/60 hover:text-accent px-1.5 py-1 rounded hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <Layers size={10} className="shrink-0 text-primary/30" />
              <span className="truncate">{o.organo.nombre || "Sin nombre"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
