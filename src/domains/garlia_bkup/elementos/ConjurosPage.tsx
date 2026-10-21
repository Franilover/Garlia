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
import { useConjuracionConfiguracionIum } from "./useConjuracionConfiguracionIum";
import type { ConjuracionConfigIumFlujo } from "./useConjuracionConfiguracionIum";
import { iumAFilaIum, particulasDeIum } from "@/domains/garlia/fisica/types";
import { useIumsConParticulas } from "@/domains/garlia/fisica/useIumsConParticulas";
import { useGeometriaIums } from "@/domains/garlia/fisica/useGeometriaIums";
import { IumPanelFlotante } from "@/domains/garlia/fisica/FisicaPage";
import { IumGlifo } from "@/domains/garlia/fisica/ParticulaVisual";
import { Cpu } from "lucide-react";

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
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
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

      {/* ── Configuración IUM — topología del hechizo ── */}
      <ConjuracionIumBloque conjuracionId={conjuro.id} />
    </div>
  );
}

// ─── Gráfico de IUMs (idéntico a ConfiguracionIumGrafo de ProcesosPage) ──

function ConjuracionIumGrafo({
  flujo,
  onClickNodo,
}: {
  flujo: ConjuracionConfigIumFlujo[];
  onClickNodo?: (iumId: string) => void;
}) {
  const { items: iums } = useIumsConParticulas();
  const iumPorId = useMemo(
    () => Object.fromEntries(iums.map((i) => [i.id, iumAFilaIum(i)])),
    [iums],
  );
  const { geometriaDe } = useGeometriaIums();
  const particulasDe = (iumId: string) => {
    const fila = iumPorId[iumId];
    return fila ? particulasDeIum(fila) : [];
  };

  const { columnas, aristas } = useMemo(() => {
    const nombrePorId = new Map<string, string>();
    const rolPorId = new Map<string, string>();
    const salidas = new Map<string, Set<string>>();
    const entradas = new Map<string, Set<string>>();

    for (const f of flujo) {
      nombrePorId.set(f.ium_origen_id, f.ium_origen);
      nombrePorId.set(f.ium_destino_id, f.ium_destino);
      if (f.participacion_origen) rolPorId.set(f.ium_origen_id, f.participacion_origen);
      if (f.participacion_destino) rolPorId.set(f.ium_destino_id, f.participacion_destino);
      if (!salidas.has(f.ium_origen_id)) salidas.set(f.ium_origen_id, new Set());
      salidas.get(f.ium_origen_id)!.add(f.ium_destino_id);
      if (!entradas.has(f.ium_destino_id)) entradas.set(f.ium_destino_id, new Set());
      entradas.get(f.ium_destino_id)!.add(f.ium_origen_id);
    }

    const ids = Array.from(nombrePorId.keys());
    const nivelPorId = new Map<string, number>();
    const fuentes = ids.filter((id) => !entradas.has(id) || entradas.get(id)!.size === 0);
    const cola = (fuentes.length > 0 ? fuentes : ids).map((id) => ({ id, nivel: 0 }));
    for (const { id } of cola) nivelPorId.set(id, 0);

    let cursor = 0;
    while (cursor < cola.length) {
      const { id, nivel } = cola[cursor++];
      for (const destinoId of salidas.get(id) ?? []) {
        const nivelActual = nivelPorId.get(destinoId);
        const nivelPropuesto = nivel + 1;
        if (nivelActual === undefined || nivelPropuesto > nivelActual) {
          nivelPorId.set(destinoId, nivelPropuesto);
          cola.push({ id: destinoId, nivel: nivelPropuesto });
        }
      }
    }
    for (const id of ids) if (!nivelPorId.has(id)) nivelPorId.set(id, 0);

    const porColumna = new Map<number, string[]>();
    for (const id of ids) {
      const nivel = nivelPorId.get(id)!;
      if (!porColumna.has(nivel)) porColumna.set(nivel, []);
      porColumna.get(nivel)!.push(id);
    }
    const columnasOrdenadas = Array.from(porColumna.keys()).sort((a, b) => a - b);

    const ANCHO_COL = 130;
    const ALTO_FILA = 90;
    const PAD_X = 40;
    const PAD_Y = 15;

    const pos = new Map<string, { x: number; y: number }>();
    columnasOrdenadas.forEach((nivel, colIdx) => {
      const idsDeColumna = porColumna.get(nivel)!;
      idsDeColumna.forEach((id, filaIdx) => {
        pos.set(id, { x: PAD_X + colIdx * ANCHO_COL, y: PAD_Y + filaIdx * ALTO_FILA });
      });
    });

    const columnas = columnasOrdenadas.map((nivel) =>
      (porColumna.get(nivel) ?? []).map((id) => ({
        id,
        nombre: nombrePorId.get(id) ?? id.slice(0, 8),
        rol: rolPorId.get(id) ?? null,
        pos: pos.get(id)!,
      })),
    );

    const aristas = flujo.map((f, idx) => ({
      key: `${f.ium_origen_id}-${f.ium_destino_id}-${idx}`,
      desde: pos.get(f.ium_origen_id)!,
      hasta: pos.get(f.ium_destino_id)!,
      tipo: f.tipo_union,
      idOrigen: f.ium_origen_id,
      idDestino: f.ium_destino_id,
    }));

    return { columnas, aristas };
  }, [flujo]);

  const R_NODO = 22;
  const CENTRO_X = R_NODO + 4;
  const CENTRO_Y = R_NODO + 4;
  const ALTO_LEYENDA = 20;
  const anchoTotal = columnas.length * 130 + 40;
  const altoTotal = Math.max(...columnas.map((c) => c.length), 1) * 90 + 30 + ALTO_LEYENDA;

  const TRAZO_UNION = "color-mix(in srgb, var(--primary) 70%, transparent)";
  const TRAZO_RECIPROCA = "var(--primary)";
  const TEXTOS_TIPO: Record<string, string> = {
    dirigida: "dirigida",
    reciproca: "recíproca",
    acoplamiento: "acoplamiento",
  };
  const tiposUsados = useMemo(
    () => Array.from(new Set(aristas.map((a) => a.tipo).filter((t): t is string => !!t))),
    [aristas],
  );

  return (
    <svg
      viewBox={`0 0 ${anchoTotal} ${altoTotal}`}
      className="w-full h-auto"
      style={{ minHeight: Math.min(altoTotal, 220) }}
    >
      <defs>
        <marker id="flecha-conj-ium" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: TRAZO_UNION }} />
        </marker>
        <marker id="flecha-conj-ium-rec" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: TRAZO_RECIPROCA }} />
        </marker>
      </defs>
      {onClickNodo && (
        <style>{`
          .conj-nodo-clicable circle { transition: opacity 120ms ease; }
          .conj-nodo-clicable:hover circle { opacity: 0.7; }
        `}</style>
      )}

      {aristas.map((a) => {
        const esRec = a.tipo === "reciproca";
        const esAcop = a.tipo === "acoplamiento";
        const x1 = a.desde.x + CENTRO_X + R_NODO;
        const y1 = a.desde.y + CENTRO_Y;
        const x2 = a.hasta.x + CENTRO_X - R_NODO;
        const y2 = a.hasta.y + CENTRO_Y;
        const mismaColumna = a.desde.x === a.hasta.x;
        const path = mismaColumna
          ? `M ${a.desde.x + CENTRO_X} ${a.desde.y + CENTRO_Y + R_NODO} C ${a.desde.x + CENTRO_X + 36} ${y1 + 20}, ${a.hasta.x + CENTRO_X + 36} ${y2 - 20}, ${a.hasta.x + CENTRO_X} ${a.hasta.y + CENTRO_Y - R_NODO}`
          : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
        return (
          <path
            key={a.key}
            d={path}
            fill="none"
            strokeWidth={esRec ? 2 : 1.6}
            strokeLinecap="round"
            strokeDasharray={esAcop ? "4 4" : undefined}
            style={{ stroke: esRec ? TRAZO_RECIPROCA : TRAZO_UNION }}
            markerEnd={esAcop ? undefined : `url(#${esRec ? "flecha-conj-ium-rec" : "flecha-conj-ium"})`}
            markerStart={esRec ? `url(#flecha-conj-ium-rec)` : undefined}
          />
        );
      })}

      {columnas.map((columna) =>
        columna.map((nodo) => {
          const cx = nodo.pos.x + CENTRO_X;
          const cy = nodo.pos.y + CENTRO_Y;
          const clicable = !!onClickNodo;
          return (
            <g
              key={nodo.id}
              onClick={clicable ? () => onClickNodo!(nodo.id) : undefined}
              style={clicable ? { cursor: "pointer" } : undefined}
              className={clicable ? "conj-nodo-clicable" : undefined}
            >
              <title>{`${nodo.nombre}${nodo.rol ? ` — ${nodo.rol.replace(/_/g, " ")}` : ""}`}</title>
              <circle
                cx={cx}
                cy={cy}
                r={R_NODO + 2}
                strokeWidth={0.8}
                style={{
                  fill: "var(--bg-main)",
                  stroke: "color-mix(in srgb, var(--primary) 30%, transparent)",
                }}
              />
              <IumGlifo
                cx={cx}
                cy={cy}
                r={R_NODO * 0.78}
                particulas={particulasDe(nodo.id)}
                geometria={geometriaDe(nodo.id).geometria}
              />
              <text
                x={cx}
                y={cy + R_NODO + 12}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={700}
                paintOrder="stroke"
                strokeWidth={3}
                strokeLinejoin="round"
                style={{ fill: "var(--primary)", stroke: "var(--bg-main)" }}
              >
                {nodo.nombre}
              </text>
              {nodo.rol && (
                <text
                  x={cx}
                  y={cy + R_NODO + 22}
                  textAnchor="middle"
                  fontSize={7.5}
                  paintOrder="stroke"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  style={{ fill: "color-mix(in srgb, var(--primary) 60%, transparent)", stroke: "var(--bg-main)" }}
                >
                  {nodo.rol.replace(/_/g, " ")}
                </text>
              )}
            </g>
          );
        }),
      )}

      {tiposUsados.length > 1 &&
        tiposUsados.map((tipo, i) => (
          <g key={tipo} transform={`translate(${8 + i * 90}, ${altoTotal - ALTO_LEYENDA / 2})`}>
            <line
              x1={0} y1={0} x2={16} y2={0}
              strokeWidth={tipo === "reciproca" ? 2 : 1.5}
              strokeLinecap="round"
              strokeDasharray={tipo === "acoplamiento" ? "3 3" : undefined}
              style={{ stroke: tipo === "reciproca" ? TRAZO_RECIPROCA : TRAZO_UNION }}
            />
            <text x={21} y={2.5} fontSize={7.5} style={{ fill: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
              {TEXTOS_TIPO[tipo] ?? tipo}
            </text>
          </g>
        ))}
    </svg>
  );
}

// ─── Bloque IUM de conjuración (análogo a ConfiguracionIumBloque de Procesos) ─

function ConjuracionIumBloque({ conjuracionId }: { conjuracionId: string }) {
  const { configuracion, flujo, loading } = useConjuracionConfiguracionIum(conjuracionId);
  const [iumAbiertoId, setIumAbiertoId] = useState<string | null>(null);
  const { items: iumsCatalogo, setItems: setIumsCatalogo } = useIumsConParticulas();
  const { geometriaDe } = useGeometriaIums();
  const iumAbierto = iumsCatalogo.find((i) => i.id === iumAbiertoId) ?? null;

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2.5 rounded-lg border border-primary/10">
      <div className="flex items-center gap-1.5">
        <Cpu size={13} className="text-primary/40 shrink-0" />
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Configuración IUM · Topología
        </span>
      </div>

      {!configuracion ? (
        <p className="py-1 text-micro text-primary/30">Sin configuración IUM</p>
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <span className="text-micro font-bold text-primary/70">
              {configuracion.config_nombre ?? "Configuración sin nombre"}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-bold border capitalize ${
                  configuracion.config_estado === "canonica"
                    ? "text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5"
                    : configuracion.config_estado === "propuesta"
                      ? "text-amber-500/70 border-amber-500/20 bg-amber-500/5"
                      : "text-primary/50 border-primary/15 bg-primary/5"
                }`}
              >
                {configuracion.config_estado === "propuesta"
                  ? "Configuración en revisión"
                  : configuracion.config_estado.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-primary/35">v{configuracion.config_version}</span>
            </div>
          </div>

          {flujo.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-primary/45">Topología</span>
              <div className="rounded-md border border-primary/10 bg-primary/[0.02] p-2 overflow-x-auto">
                <ConjuracionIumGrafo flujo={flujo} onClickNodo={(iumId) => setIumAbiertoId(iumId)} />
              </div>
            </div>
          )}

          {configuracion.fundamento && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-primary/45">Fundamento</span>
              <p className="text-micro text-primary/55 leading-relaxed whitespace-pre-wrap">
                {configuracion.fundamento}
              </p>
            </div>
          )}
        </div>
      )}

      {iumAbierto ? (
        <IumPanelFlotante
          ium={iumAbierto}
          geometriaDe={geometriaDe}
          onCerrar={() => setIumAbiertoId(null)}
          onActualizar={(id, cambios) => {
            setIumsCatalogo((cur) =>
              cur.map((item) => (item.id === id ? { ...item, ...cambios } : item)),
            );
          }}
        />
      ) : null}
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
