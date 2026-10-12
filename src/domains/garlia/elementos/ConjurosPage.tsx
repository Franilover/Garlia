"use client";

import { Loader2, Save, Trash2, X, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { SaveIndicator } from "@/domains/garlia/_shared/UIComponents";
import { TituloCategoria } from "../_shared/TituloCategoria";
import { type SaveStatus } from "@/ui/saveStatus";
import { useConfirm } from "@/ui/ConfirmModal";

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

// ─── Casilla ────────────────────────────────────────────────────────────

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
      {conjuro.nivel_dominio && (
        <span className="text-micro font-black text-primary/30 tabular-nums leading-none">
          {conjuro.nivel_dominio}
        </span>
      )}
      <span className="text-sm font-black leading-tight text-primary/70 line-clamp-2">
        {conjuro.nombre || "(sin nombre)"}
      </span>
      {!conjuro.publicado && (
        <span className="text-micro text-primary/25 leading-none">borrador</span>
      )}
    </button>
  );
}

function ChipGrupoConjuros({
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
      <TituloCategoria titulo={titulo} total={items.length} />
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

// ─── Panel de detalle ────────────────────────────────────────────────────

function ConjuroDetail({ conjuro }: { conjuro: Conjuro }) {
  const campos: { label: string; valor: string | null | undefined }[] = [
    { label: "Nivel de dominio", valor: conjuro.nivel_dominio },
    { label: "Descripción narrativa", valor: conjuro.descripcion_narrativa },
    { label: "Instrucción Éterium", valor: conjuro.instruccion_eterium },
    { label: "Instrucción IUM", valor: conjuro.instruccion_ium },
    { label: "Requisitos biológicos", valor: conjuro.requisitos_biologicos },
    { label: "Efectos observables", valor: conjuro.efectos_observables },
    { label: "Fórmula de costo", valor: conjuro.formula_costo },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {conjuro.nivel_dominio && (
          <span className="rounded px-1.5 py-0.5 bg-primary/5 text-micro font-bold text-primary/40">
            {conjuro.nivel_dominio}
          </span>
        )}
        {!conjuro.publicado && (
          <span className="rounded px-1.5 py-0.5 bg-yellow-500/10 text-micro font-bold text-yellow-500/60">
            Borrador
          </span>
        )}
      </div>

      {campos.map(({ label, valor }) =>
        valor ? (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
              {label}
            </span>
            <p className="whitespace-pre-wrap text-micro leading-relaxed text-primary/60">
              {valor}
            </p>
          </div>
        ) : null,
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
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <Sparkles size={14} className="text-primary/40 shrink-0" />
          {onRename ? (
            <input
              className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
              placeholder="Nombre de la conjuración"
              value={nombreLocal}
              onChange={(e) => setNombreLocal(e.target.value)}
              onBlur={guardarNombre}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-sm font-black text-primary">
              {conjuro.nombre}
            </span>
          )}

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
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
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
  const { confirm, ConfirmModal } = useConfirm();
  const [selected, setSelected] = useState<Conjuro | null>(null);

  // Agrupar por nivel_dominio si existe
  const grupos = useMemo(() => {
    const conNivel = items.filter((c) => c.nivel_dominio);
    const sinNivel = items.filter((c) => !c.nivel_dominio);
    const nivelesUnicos = [...new Set(conNivel.map((c) => c.nivel_dominio as string))].sort();
    const resultado: { id: string; nombre: string; items: Conjuro[] }[] = [];
    for (const nivel of nivelesUnicos) {
      resultado.push({ id: nivel, nombre: nivel, items: conNivel.filter((c) => c.nivel_dominio === nivel) });
    }
    if (sinNivel.length > 0) {
      resultado.push({ id: "__sin_nivel__", nombre: "Conjuraciones", items: sinNivel });
    }
    if (resultado.length === 0 && items.length > 0) {
      resultado.push({ id: "__todos__", nombre: "Conjuraciones", items });
    }
    return resultado;
  }, [items]);

  const containerRef = useRef<HTMLDivElement>(null);
  const numColumnas = useResponsiveColumnCount(containerRef, 260, 16);
  const columnasDeGrupos = useMemo(
    () => distribuirEnColumnas(grupos, numColumnas, (g) => g.items.length),
    [grupos, numColumnas],
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
              {columna.map((grupo) => (
                <div key={grupo.id} className="mb-4">
                  <ChipGrupoConjuros
                    titulo={grupo.nombre}
                    items={grupo.items}
                    seleccionadoId={selected?.id ?? null}
                    onSeleccionar={(id) => {
                      setSelected(items.find((c) => c.id === id) ?? null);
                    }}
                  />
                </div>
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
