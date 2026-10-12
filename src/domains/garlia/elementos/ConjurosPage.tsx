"use client";

import { Loader2, Save, Trash2, X, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { SaveIndicator } from "@/domains/garlia/_shared/UIComponents";
import { TituloCategoria } from "../_shared/TituloCategoria";
import { type SaveStatus } from "@/ui/saveStatus";
import { useConfirm } from "@/ui/ConfirmModal";
import { useOris } from "@/domains/garlia/fisica/useFisica";

import { useConjuros } from "./useConjuros";
import type { Conjuro } from "./types";

// ─── Helpers de layout ───────────────────────────────────────────────────

function useResponsiveColumnCount(
  ref: React.RefObject<HTMLElement | null>,
  minColWidth: number,
  gap: number,
): number {
  const [columnas, setColumnas] = useState(3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calcular = (ancho: number) => {
      setColumnas(Math.max(1, Math.floor((ancho + gap) / (minColWidth + gap))));
    };
    calcular(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const ancho = entries[0]?.contentRect.width;
      if (ancho != null) calcular(ancho);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, minColWidth, gap]);
  return columnas;
}

function distribuirEnColumnas<T>(
  secciones: T[],
  numColumnas: number,
  getPeso: (s: T) => number,
): T[][] {
  const columnas: T[][] = Array.from({ length: numColumnas }, () => []);
  const alturas = new Array(numColumnas).fill(0);
  const OVERHEAD = 2;
  for (const seccion of secciones) {
    let colMenor = 0;
    for (let i = 1; i < numColumnas; i++) {
      if (alturas[i] < alturas[colMenor]) colMenor = i;
    }
    columnas[colMenor].push(seccion);
    alturas[colMenor] += getPeso(seccion) + OVERHEAD;
  }
  return columnas;
}

// ─── Casilla (solo nombre, igual que ProcesoCasilla) ────────────────────

function ConjuroCasilla({
  conjuro,
  seleccionado,
  onClick,
}: {
  conjuro: Conjuro;
  seleccionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={conjuro.nombre || "(sin nombre)"}
      className={`group flex flex-col items-center justify-center gap-0.5 p-1.5 border-r border-b transition-colors text-center ${
        seleccionado
          ? "border-primary/10 bg-primary/10 ring-1 ring-inset ring-primary/40"
          : "border-primary/10 hover:bg-primary/5"
      }`}
    >
      <span className="text-sm font-black leading-tight text-primary/70 line-clamp-3">
        {conjuro.nombre || "(sin nombre)"}
      </span>
    </button>
  );
}

// ─── Grupo: Nivel de dominio → Conjuros ─────────────────────────────────

function GrupoNivel({
  titulo,
  items,
  seleccionadoId,
  onSeleccionar,
}: {
  titulo: string;
  items: Conjuro[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <TituloCategoria titulo={titulo} total={items.length} jerarquica />
      <div
        className="grid gap-0 border-t border-l border-primary/10"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}
      >
        {items.map((conjuro) => (
          <ConjuroCasilla
            key={conjuro.id}
            conjuro={conjuro}
            seleccionado={conjuro.id === seleccionadoId}
            onClick={() => onSeleccionar(conjuro.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Bloque Oris → (Niveles → Conjuros) ─────────────────────────────────

function BloqueOris({
  nombreOris,
  niveles,
  seleccionadoId,
  onSeleccionar,
}: {
  nombreOris: string;
  niveles: { nivel: string; items: Conjuro[] }[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  const total = niveles.reduce((sum, n) => sum + n.items.length, 0);
  return (
    <div className="flex flex-col mb-4">
      <TituloCategoria titulo={nombreOris} total={total} />
      <div className="flex flex-col pl-0">
        {niveles.map(({ nivel, items }) => (
          <GrupoNivel
            key={nivel}
            titulo={nivel}
            items={items}
            seleccionadoId={seleccionadoId}
            onSeleccionar={onSeleccionar}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Pill de meta ────────────────────────────────────────────────────────

function MetaPill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "draft" | "formula";
}) {
  const styles = {
    default: "bg-primary/8 text-primary/50 border-primary/10",
    draft: "bg-yellow-500/10 text-yellow-500/70 border-yellow-500/20",
    formula: "bg-primary/5 text-primary/40 border-primary/8 font-mono",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-micro font-bold border ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

// ─── Bloque de sección del detalle ───────────────────────────────────────

function SeccionDetalle({
  icono,
  titulo,
  children,
  accent,
}: {
  icono?: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl p-3"
      style={{
        background: accent
          ? `color-mix(in srgb, ${accent} 5%, var(--bg-main))`
          : "color-mix(in srgb, var(--primary) 3%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
      }}
    >
      <div className="flex items-center gap-1.5">
        {icono && (
          <span className="shrink-0 text-primary/30" style={{ fontSize: 10 }}>
            {icono}
          </span>
        )}
        <span className="text-micro font-black uppercase tracking-[0.18em] text-primary/30">
          {titulo}
        </span>
      </div>
      <div className="text-micro leading-relaxed text-primary/65 whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

// ─── Panel de detalle (layout horizontal en 2 columnas) ──────────────────

function ConjuroDetail({ conjuro }: { conjuro: Conjuro }) {
  return (
    <div className="flex flex-col gap-4">
      {/* ── Fila meta: nivel + estado ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {conjuro.nivel_dominio && (
          <MetaPill>⬡ {conjuro.nivel_dominio}</MetaPill>
        )}
        {!conjuro.publicado && (
          <MetaPill variant="draft">◌ Borrador</MetaPill>
        )}
      </div>

      {/* ── Descripción narrativa — ancho completo, destacada ── */}
      {conjuro.descripcion_narrativa && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            borderLeft: "3px solid color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        >
          <p className="text-sm leading-relaxed text-primary/75 italic">
            {conjuro.descripcion_narrativa}
          </p>
        </div>
      )}

      {/* ── Grid 2 columnas: Éterium + IUM ── */}
      {(conjuro.instruccion_eterium || conjuro.instruccion_ium) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {conjuro.instruccion_eterium && (
            <SeccionDetalle icono="◈" titulo="Instrucción Éterium">
              {conjuro.instruccion_eterium}
            </SeccionDetalle>
          )}
          {conjuro.instruccion_ium && (
            <SeccionDetalle icono="⬟" titulo="Instrucción IUM">
              {conjuro.instruccion_ium}
            </SeccionDetalle>
          )}
        </div>
      )}

      {/* ── Grid 2 columnas: Requisitos + Efectos ── */}
      {(conjuro.requisitos_biologicos || conjuro.efectos_observables) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {conjuro.requisitos_biologicos && (
            <SeccionDetalle icono="◉" titulo="Requisitos biológicos">
              {conjuro.requisitos_biologicos}
            </SeccionDetalle>
          )}
          {conjuro.efectos_observables && (
            <SeccionDetalle icono="◎" titulo="Efectos observables">
              {conjuro.efectos_observables}
            </SeccionDetalle>
          )}
        </div>
      )}

      {/* ── Fórmula de costo — ancho completo, estilo técnico ── */}
      {conjuro.formula_costo && (
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-1"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          }}
        >
          <span className="text-micro font-black uppercase tracking-[0.18em] text-primary/30">
            ◆ Fórmula de costo
          </span>
          <p className="font-mono text-micro leading-relaxed text-primary/60 whitespace-pre-wrap">
            {conjuro.formula_costo}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Panel flotante ──────────────────────────────────────────────────────

export function ConjuroPanelFlotante({
  conjuro,
  onClose,
  onRename,
  onDelete,
}: {
  conjuro: Conjuro;
  onClose: () => void;
  onRename?: (nuevoNombre: string) => void;
  onDelete?: () => void;
}) {
  const [nombreLocal, setNombreLocal] = useState(conjuro.nombre);
  const [status, setStatus] = useState<SaveStatus>("idle");
  useEffect(() => setNombreLocal(conjuro.nombre), [conjuro.id, conjuro.nombre]);

  async function guardarNombre() {
    if (!onRename) return;
    const nuevo = nombreLocal.trim();
    if (!nuevo || nuevo === conjuro.nombre) {
      setNombreLocal(conjuro.nombre);
      return;
    }
    setStatus("saving");
    try {
      await onRename(nuevo);
      setStatus("saved");
    } catch (e) {
      console.error("[ConjurosPage] error renombrando:", e);
      setStatus("error");
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "color-mix(in srgb, var(--primary) 35%, transparent)", backdropFilter: "blur(8px)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* ── Header bar ── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <Sparkles size={13} className="text-primary/35 shrink-0" />

          {/* Nombre editable o estático */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {onRename ? (
              <input
                className="min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
                style={{ width: "clamp(120px, 40%, 320px)" }}
                placeholder="Nombre de la conjuración"
                value={nombreLocal}
                onChange={(e) => setNombreLocal(e.target.value)}
                onBlur={guardarNombre}
              />
            ) : (
              <span className="truncate text-sm font-black text-primary">
                {conjuro.nombre}
              </span>
            )}

            {/* Badges de nivel y estado en el header */}
            {conjuro.nivel_dominio && (
              <span
                className="hidden sm:inline-flex items-center shrink-0 rounded px-1.5 py-0.5 text-micro font-bold border"
                style={{
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                }}
              >
                {conjuro.nivel_dominio}
              </span>
            )}
            {!conjuro.publicado && (
              <span className="hidden sm:inline-flex items-center shrink-0 rounded px-1.5 py-0.5 text-micro font-bold border border-yellow-500/20 bg-yellow-500/10 text-yellow-500/70">
                Borrador
              </span>
            )}
          </div>

          {/* Acciones */}
          <div className="shrink-0 flex items-center gap-1.5">
            <SaveIndicator status={status} />
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-micro font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
              >
                <Trash2 size={10} />
              </button>
            )}
            {onRename && (
              <button
                type="button"
                disabled={status === "saving"}
                onClick={guardarNombre}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-micro font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Save size={10} /> Guardar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Cuerpo scrollable ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <ConjuroDetail conjuro={conjuro} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Page principal ──────────────────────────────────────────────────────

export default function ConjurosPage() {
  const { items, loading, renombrarConjuro, eliminarConjuro } = useConjuros();
  const { items: orisList } = useOris();
  const { confirm, ConfirmModal } = useConfirm();
  const [selected, setSelected] = useState<Conjuro | null>(null);

  // Agrupar: Oris → Nivel de Dominio → Conjuros
  const bloques = useMemo(() => {
    // Mapa orisId → nombre
    const orisNombre = new Map(orisList.map((o) => [o.id, o.nombre]));

    // Agrupar por oris_id
    const porOris = new Map<string, Conjuro[]>();
    for (const c of items) {
      const key = c.oris_id ?? "__sin_oris__";
      if (!porOris.has(key)) porOris.set(key, []);
      porOris.get(key)!.push(c);
    }

    // Ordenar: Oris con nombre conocido primero (por su nombre), sin oris al final
    const claves = [...porOris.keys()].sort((a, b) => {
      if (a === "__sin_oris__") return 1;
      if (b === "__sin_oris__") return -1;
      return (orisNombre.get(a) ?? a).localeCompare(orisNombre.get(b) ?? b);
    });

    return claves.map((orisId) => {
      const conjuros = porOris.get(orisId)!;
      const nombreOris =
        orisId === "__sin_oris__"
          ? "Sin Oris"
          : (orisNombre.get(orisId) ?? orisId.slice(0, 8));

      // Agrupar por nivel_dominio dentro de este Oris
      const porNivel = new Map<string, Conjuro[]>();
      for (const c of conjuros) {
        const nivel = c.nivel_dominio ?? "__sin_nivel__";
        if (!porNivel.has(nivel)) porNivel.set(nivel, []);
        porNivel.get(nivel)!.push(c);
      }

      const nivelesOrdenados = [...porNivel.keys()].sort((a, b) => {
        if (a === "__sin_nivel__") return 1;
        if (b === "__sin_nivel__") return -1;
        return a.localeCompare(b);
      });

      const niveles = nivelesOrdenados.map((nivel) => ({
        nivel: nivel === "__sin_nivel__" ? "Sin nivel" : nivel,
        items: porNivel.get(nivel)!,
      }));

      return { orisId, nombreOris, niveles };
    });
  }, [items, orisList]);

  const containerRef = useRef<HTMLDivElement>(null);
  const numColumnas = useResponsiveColumnCount(containerRef, 260, 16);
  const columnasDeGrupos = useMemo(
    () => distribuirEnColumnas(bloques, numColumnas, (b) => b.niveles.reduce((s, n) => s + n.items.length, 0)),
    [bloques, numColumnas],
  );

  return (
    <div className="px-3 pb-4 pt-2">
      {loading ? (
        <p className="py-5 text-center text-micro text-primary/35">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="py-5 text-center text-micro text-primary/35">
          No hay conjuraciones todavía. Añadí la primera desde el menú.
        </p>
      ) : (
        <div ref={containerRef} className="flex w-full items-start gap-4">
          {columnasDeGrupos.map((columna, colIdx) => (
            <div key={colIdx} className="flex min-w-0 flex-1 flex-col">
              {columna.map((bloque) => (
                <BloqueOris
                  key={bloque.orisId}
                  nombreOris={bloque.nombreOris}
                  niveles={bloque.niveles}
                  seleccionadoId={selected?.id ?? null}
                  onSeleccionar={(id) => {
                    setSelected(items.find((c) => c.id === id) ?? null);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {selected && (
        <ConjuroPanelFlotante
          conjuro={selected}
          onClose={() => setSelected(null)}
          onRename={(nuevoNombre) => renombrarConjuro(selected.id, nuevoNombre)}
          onDelete={async () => {
            const ok = await confirm({
              title: "Eliminar conjuración",
              message: `¿Eliminar "${selected.nombre}"? Esta acción no se puede deshacer.`,
            });
            if (!ok) return;
            await eliminarConjuro(selected.id);
            setSelected(null);
          }}
        />
      )}
      <ConfirmModal />
    </div>
  );
}
