"use client";

/**
 * OrganismoPanelFlotante.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Panel flotante de detalle de UN Organismo — click en una fila de
 * PanelOrganismosCriatura (dentro de EditorCriatura) abre esto. Muestra las
 * dos rutas reales que cuelgan de un Organismo (ver estado_proyecto/schema):
 *   - Sistemas (organismo_sistemas) → cada uno con sus Órganos
 *     (sistema_organos), abiertos en SistemaPanelFlotante.
 *   - Órganos directos (organismo_organos) — Órganos que el Organismo posee
 *     sin pasar por ningún Sistema catalogado, con rol y cantidad.
 * Mismo idioma visual que GrupoCompuestoPanelFlotante
 * (elementos/GruposCompuestosPage.tsx): modal centrado con backdrop blur,
 * header con ícono + nombre + cerrar, cierra con click en el backdrop,
 * Escape o el botón X.
 *
 * Click en un Sistema abre SistemaPanelFlotante encima; click en un Órgano
 * directo abre GrupoCompuestoPanelFlotante encima — mismo patrón de
 * navegación en cascada que el resto del EditorCriatura.
 */

import { Boxes, Layers, Waypoints, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useOrganismoSistemas } from "@/domains/garlia/elementos/useOrganismoSistemas";
import { useOrganismoOrganos } from "@/domains/garlia/elementos/useOrganismoOrganos";
import { SistemaPanelFlotante } from "@/domains/garlia/criaturas/SistemaPanelFlotante";
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
  const organosDirectos = useOrganismoOrganos(organismo.id);
  const { items: compuestosOrganos } = useCompuestosConElementos();
  const { items: catalogoOrganos, setItems: setCatalogoOrganos } = useOrganos();

  // Sistema abierto (encima de este panel) al clickear una fila de Sistema
  // — reutiliza SistemaPanelFlotante.
  const [editandoSistemaId, setEditandoSistemaId] = useState<string | null>(null);
  // Órgano directo abierto al clickear una fila de "Órganos directos".
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
            panel de solo-visualización) + cerrar. */}
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

        {/* Contenido: Sistemas (con sus Órganos anidados) + Órganos directos
            — las dos rutas reales que cuelgan de un Organismo, lado a lado. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 items-start">
            <div className="md:pr-4">
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
                <div className="flex flex-col gap-1">
                  {sistemas.items.map((s) => (
                    <button
                      key={s.vinculo_id}
                      type="button"
                      onClick={() => setEditandoSistemaId(s.sistema_id)}
                      className="flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <Waypoints size={11} className="shrink-0 text-primary/30" />
                      <span className="flex-1 min-w-0 truncate text-micro font-bold text-primary/80 hover:text-accent">
                        {s.sistema.nombre || "Sin nombre"}
                      </span>
                      {s.proporcion && (
                        <span className="shrink-0 text-micro text-primary/35">{s.proporcion}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:pl-4 md:border-l md:border-primary/10">
              <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
                Órganos directos
              </p>
              <p className="text-micro text-primary/30 -mt-1 mb-2">
                Órganos que el Organismo posee sin pasar por un Sistema.
              </p>
              {organosDirectos.loading ? (
                <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
              ) : organosDirectos.items.length === 0 ? (
                <p className="text-micro text-primary/25 italic py-1">
                  Sin Órganos directos todavía.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {organosDirectos.items.map((o) => (
                    <button
                      key={o.vinculo_id}
                      type="button"
                      onClick={() => setEditandoOrganoId(o.organo_id)}
                      className="flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <Layers size={11} className="shrink-0 text-primary/30" />
                      <span className="flex-1 min-w-0 truncate text-micro font-bold text-primary/80 hover:text-accent">
                        {o.organo.nombre || "Sin nombre"}
                      </span>
                      {o.rol && (
                        <span className="shrink-0 text-micro text-primary/35">{o.rol}</span>
                      )}
                      <span className="shrink-0 text-micro text-primary/35">×{o.cantidad}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detalle del Sistema elegido (sus Órganos) — apilado encima. */}
      {editandoSistemaId &&
        (() => {
          const sistemaActivo = sistemas.items.find((s) => s.sistema_id === editandoSistemaId)?.sistema;
          if (!sistemaActivo) return null;
          return (
            <SistemaPanelFlotante sistema={sistemaActivo} onCerrar={() => setEditandoSistemaId(null)} />
          );
        })()}

      {/* Editor completo del Órgano directo elegido — apilado encima. */}
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
