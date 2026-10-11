"use client";

/**
 * SistemaSolarSection
 * ───────────────────────────────────────────────────────────────────────────
 * Visualización interactiva del sistema solar de Garlia.
 * Lee TODO de Supabase (cuerpos_celestes_v1 + valores_fisicos_v1):
 *   - Posiciones orbitales derivadas de distancia_au (magnitud del canon)
 *   - Tamaños derivados de radio_km
 *   - Colores y tipo de cuerpo (tipo_cuerpo)
 *
 * Si se añade un planeta nuevo en Supabase, aparece solo sin tocar código.
 * Clicking en cualquier cuerpo abre su PanelFlotante (kind "planeta" o
 * el tipo que corresponda).
 *
 * FIX: zoom y pan via <g transform> — el viewBox es fijo. Antes el zoom
 * se aplicaba en las coordenadas calculadas, lo que sacaba los planetas
 * fuera del viewBox visible.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Globe } from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";

// ── Tipos ──────────────────────────────────────────────────────────────────

type CuerpoCeleste = {
  id: string;
  nombre: string;
  tipo_cuerpo: string | null;
  cuerpo_principal_id: string | null;
  descripcion: string | null;
  canon: boolean | null;
};

type ValorFisico = {
  entidad_tipo: string;
  entidad_id: string;
  magnitud_id: string;
  valor: number;
  unidad_id: string | null;
};

type CuerpoConFisica = CuerpoCeleste & {
  distancia_au: number | null;   // null = estrella central (0 AU)
  radio_km: number | null;
  temperatura_k: number | null;
};

// ── Paleta de colores por tipo ─────────────────────────────────────────────

function colorDeCuerpo(c: CuerpoConFisica): string {
  const tipo = c.tipo_cuerpo ?? "";
  const nombre = c.nombre.toLowerCase();

  if (tipo === "estrella") return "#FFD580";

  // Colores narrativos por nombre conocido
  if (nombre === "vérun" || nombre === "verun") return "#E8856A";
  if (nombre === "arath") return "#D4A96A";
  if (nombre === "garlia") return "#6AAED4";
  if (nombre === "wanocua") return "#5BBFCF";
  if (nombre === "korvath") return "#C4A46A";
  if (nombre === "kethvar") return "#A8C4D8";
  if (nombre === "nelveth") return "#8AAFC4";

  // Fallback por tipo
  if (tipo === "planeta") return "#9BAFC4";
  if (tipo === "luna") return "#A8A8A8";
  if (tipo === "cinturón" || tipo === "cinturon") return "#7A6A5A";
  return "#888888";
}

// ── Escalas ────────────────────────────────────────────────────────────────

/** Radio visual mínimo / máximo para planetas */
const MIN_R = 4;
const MAX_R = 22;
const STAR_R = 30;
const MOON_R = 3;

function escalarRadio(radioKm: number | null, tipo: string | null, allRadios: number[]): number {
  if (tipo === "estrella") return STAR_R;
  if (tipo === "luna") return MOON_R;
  if (!radioKm) return MIN_R + 1;
  const min = Math.min(...allRadios);
  const max = Math.max(...allRadios);
  if (max === min) return (MIN_R + MAX_R) / 2;
  return MIN_R + ((radioKm - min) / (max - min)) * (MAX_R - MIN_R);
}

// ── Componente principal ───────────────────────────────────────────────────

export function SistemaSolarSection() {
  const [cuerpos, setCuerpos] = useState<CuerpoConFisica[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const abrirPanel = usePanelFlotante((s) => s.abrir);

  // ── Carga de Supabase ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);

      // 1. Cuerpos celestes
      const { data: rawCuerpos, error: e1 } = await supabase
        .from("cuerpos_celestes_v1")
        .select("id, nombre, tipo_cuerpo, cuerpo_principal_id, descripcion, canon");

      if (e1 || !rawCuerpos || cancelado) { setLoading(false); return; }

      // 2. Valores físicos
      const ids = rawCuerpos.map((c: any) => c.id);
      const { data: rawValores } = await supabase
        .from("valores_fisicos")
        .select("entidad_tipo, entidad_id, magnitud_id, valor, unidad_id")
        .eq("entidad_tipo", "cuerpo_celeste")
        .in("entidad_id", ids);

      if (cancelado) return;

      // 3. Magnitudes
      const { data: magnitudes } = await supabase
        .from("magnitudes_fisicas")
        .select("id, clave, nombre");

      if (cancelado) return;

      const magMap: Record<string, string> = {};
      for (const m of magnitudes ?? []) {
        magMap[m.id] = m.clave ?? m.nombre?.toLowerCase().replace(/\s+/g, "_") ?? "";
      }

      // Indexar valores por entidad
      const valoresPorEntidad: Record<string, Record<string, number>> = {};
      for (const v of rawValores ?? []) {
        if (!valoresPorEntidad[v.entidad_id]) valoresPorEntidad[v.entidad_id] = {};
        const clave = magMap[v.magnitud_id] ?? v.magnitud_id;
        valoresPorEntidad[v.entidad_id][clave] = Number(v.valor);
      }

      // Combinar
      const combinados: CuerpoConFisica[] = rawCuerpos.map((c: any) => {
        const vals = valoresPorEntidad[c.id] ?? {};
        // semieje_mayor_orbital está en metros → convertir a AU (1 AU = 149_597_870_700 m)
        const AU_M = 149597870700;
        const distancia =
          vals["distancia_au"] ??
          (vals["semieje_mayor_orbital"] != null ? vals["semieje_mayor_orbital"] / AU_M : null) ??
          null;
        const radio =
          vals["radio_km"] ?? vals["radio"] ?? vals["radio_ecuatorial_km"] ??
          (vals["longitud"] != null ? vals["longitud"] / 1000 : null) ?? null;
        const temp = vals["temperatura"] ?? vals["temperatura_superficie_k"] ?? vals["temperatura_k"] ?? null;

        return {
          ...c,
          distancia_au: distancia,
          radio_km: radio,
          temperatura_k: temp,
        } as CuerpoConFisica;
      });

      setCuerpos(combinados);
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, []);

  // ── Derivados para render ─────────────────────────────────────────────────

  const planetas = useMemo(
    () => cuerpos
      .filter((c) => c.tipo_cuerpo === "planeta" || c.tipo_cuerpo === "estrella")
      .sort((a, b) => (a.distancia_au ?? 0) - (b.distancia_au ?? 0)),
    [cuerpos],
  );

  const lunas = useMemo(
    () => cuerpos.filter((c) => c.tipo_cuerpo === "luna"),
    [cuerpos],
  );

  const cinturones = useMemo(
    () => cuerpos.filter((c) => c.tipo_cuerpo === "cinturón" || c.tipo_cuerpo === "cinturon"),
    [cuerpos],
  );

  const allRadios = useMemo(
    () => planetas.filter((c) => c.tipo_cuerpo === "planeta").map((c) => c.radio_km ?? 0).filter(Boolean),
    [planetas],
  );

  const estrella = useMemo(() => planetas.find((c) => c.tipo_cuerpo === "estrella"), [planetas]);
  const soloPlanetas = useMemo(() => planetas.filter((c) => c.tipo_cuerpo === "planeta"), [planetas]);

  const maxAU = useMemo(
    () => Math.max(...soloPlanetas.map((c) => c.distancia_au ?? 0), 1),
    [soloPlanetas],
  );

  // Dimensiones SVG (fijas — el zoom va en el <g transform>)
  const SVG_W = 1200;
  const SVG_H = 480;
  const CENTER_X = SVG_W / 2;
  const CENTER_Y = SVG_H / 2;

  // Posiciones en coordenadas base (sin zoom — el zoom lo aplica el <g>)
  function xDePlaneta(distAU: number): number {
    return CENTER_X + (distAU / maxAU) * (SVG_W / 2 - 60);
  }

  function xDeEstrella(): number {
    return CENTER_X - (SVG_W / 2 - 60) * 0.05;
  }

  const hovered = hoveredId ? cuerpos.find((c) => c.id === hoveredId) : null;

  // ── Drag para pan ─────────────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as SVGElement).closest("[data-cuerpo]")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }

  function onMouseUp() {
    setDragging(false);
    dragStart.current = null;
  }

  function resetView() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(4, Math.max(0.5, z + delta)));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={24} />
      </div>
    );
  }

  if (planetas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-primary/30 text-sm">
        No hay cuerpos celestes en Supabase aún.
      </div>
    );
  }

  // Transform: zoom centrado en el centro del SVG + pan
  const transform = `translate(${CENTER_X + offset.x}, ${CENTER_Y + offset.y}) scale(${zoom}) translate(${-CENTER_X}, ${-CENTER_Y})`;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: "var(--bg-main)" }}>

      {/* ── Barra superior ── */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-primary/40" />
          <p className="text-micro font-black uppercase tracking-[0.18em] text-primary/40">
            Sistema Solar
          </p>
          <span className="text-micro text-primary/20 ml-2">
            {soloPlanetas.length} planeta{soloPlanetas.length !== 1 ? "s" : ""}
            {lunas.length > 0 && ` · ${lunas.length} luna${lunas.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            title="Acercar"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            title="Alejar"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            title="Resetear vista"
          >
            <RotateCcw size={12} />
          </button>
          <span className="text-micro text-primary/20 ml-1 w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* ── SVG ── */}
      <div className="flex-1 overflow-hidden relative" style={{ cursor: dragging ? "grabbing" : "grab" }} onWheel={onWheel}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full select-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            {/* Glow estrella */}
            <filter id="glow-star" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-planet" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradiente de fondo */}
            <radialGradient id="space-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--primary) 4%, var(--bg-main))" />
              <stop offset="100%" stopColor="var(--bg-main)" />
            </radialGradient>
          </defs>

          {/* Fondo fijo (fuera del grupo transformado para que no se mueva) */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#space-bg)" />

          {/* Estrellas decorativas fijas */}
          {[
            [120, 80], [340, 40], [580, 120], [760, 60], [920, 100], [1080, 45],
            [200, 380], [450, 420], [700, 390], [950, 440], [1100, 380],
            [60, 200], [280, 260], [510, 180], [730, 300], [1000, 220],
          ].map(([sx, sy], i) => (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={i % 2 === 0 ? 1 : 0.6}
              fill="color-mix(in srgb, var(--primary) 20%, transparent)"
            />
          ))}

          {/* ── Todo el contenido del sistema solar en un grupo con zoom + pan ── */}
          <g transform={transform}>

            {/* Cinturones de asteroides */}
            {cinturones.map((c) => {
              if (!c.distancia_au) return null;
              const cx = xDePlaneta(c.distancia_au);
              return (
                <g key={c.id}>
                  <ellipse
                    cx={cx}
                    cy={CENTER_Y}
                    rx={18}
                    ry={CENTER_Y * 0.75}
                    fill="none"
                    stroke="color-mix(in srgb, var(--primary) 12%, transparent)"
                    strokeWidth={6}
                    strokeDasharray="3 5"
                  />
                  <text
                    x={cx}
                    y={CENTER_Y - CENTER_Y * 0.75 - 8}
                    textAnchor="middle"
                    fontSize={9}
                    fill="color-mix(in srgb, var(--primary) 25%, transparent)"
                    fontFamily="var(--font-mono, monospace)"
                    fontWeight="700"
                    letterSpacing="0.1em"
                  >
                    {c.nombre}
                  </text>
                </g>
              );
            })}

            {/* Línea de la eclíptica */}
            <line
              x1={CENTER_X - (SVG_W / 2 - 20)}
              y1={CENTER_Y}
              x2={xDePlaneta(maxAU) + 60}
              y2={CENTER_Y}
              stroke="color-mix(in srgb, var(--primary) 6%, transparent)"
              strokeWidth={1}
              strokeDasharray="4 8"
            />

            {/* Órbitas de planetas */}
            {soloPlanetas.map((planeta) => {
              if (!planeta.distancia_au) return null;
              const px = xDePlaneta(planeta.distancia_au);
              const estrellax = estrella ? xDeEstrella() : CENTER_X;
              const orbW = Math.abs(px - estrellax);
              return (
                <ellipse
                  key={`orbit-${planeta.id}`}
                  cx={estrellax}
                  cy={CENTER_Y}
                  rx={orbW}
                  ry={orbW * 0.18}
                  fill="none"
                  stroke={
                    hoveredId === planeta.id
                      ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                      : "color-mix(in srgb, var(--primary) 7%, transparent)"
                  }
                  strokeWidth={hoveredId === planeta.id ? 1.5 : 0.8}
                  strokeDasharray={hoveredId === planeta.id ? "none" : "3 6"}
                  style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
                />
              );
            })}

            {/* Lunas */}
            {lunas.map((luna, li) => {
              const padre = cuerpos.find((c) => c.id === luna.cuerpo_principal_id);
              if (!padre || !padre.distancia_au) return null;
              const px = xDePlaneta(padre.distancia_au);
              const angle = (li * 137.5 * Math.PI) / 180;
              const orbitR = escalarRadio(padre.radio_km, padre.tipo_cuerpo, allRadios) + 12;
              const lx = px + Math.cos(angle) * orbitR;
              const ly = CENTER_Y + Math.sin(angle) * orbitR * 0.4;
              const isHov = hoveredId === luna.id;
              return (
                <g
                  key={luna.id}
                  data-cuerpo="true"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredId(luna.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => abrirPanel("planeta", luna.id)}
                >
                  <circle
                    cx={lx}
                    cy={ly}
                    r={isHov ? MOON_R + 1.5 : MOON_R}
                    fill={colorDeCuerpo(luna)}
                    opacity={isHov ? 1 : 0.7}
                    style={{ transition: "r 0.15s, opacity 0.15s" }}
                  />
                  {isHov && (
                    <text
                      x={lx}
                      y={ly - MOON_R - 5}
                      textAnchor="middle"
                      fontSize={8}
                      fill="color-mix(in srgb, var(--primary) 60%, transparent)"
                      fontWeight="700"
                      fontFamily="inherit"
                    >
                      {luna.nombre}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Estrella */}
            {estrella && (() => {
              const sx = xDeEstrella();
              const r = STAR_R;
              const isHov = hoveredId === estrella.id;
              return (
                <g
                  key={estrella.id}
                  data-cuerpo="true"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredId(estrella.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => abrirPanel("planeta", estrella.id)}
                >
                  <circle cx={sx} cy={CENTER_Y} r={r * 2.2} fill="#FFD58010" />
                  <circle cx={sx} cy={CENTER_Y} r={r * 1.5} fill="#FFD58018" />
                  <circle
                    cx={sx}
                    cy={CENTER_Y}
                    r={isHov ? r * 1.1 : r}
                    fill={colorDeCuerpo(estrella)}
                    filter="url(#glow-star)"
                    style={{ transition: "r 0.2s" }}
                  />
                  <text
                    x={sx}
                    y={CENTER_Y + r + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fill="color-mix(in srgb, var(--primary) 45%, transparent)"
                    fontWeight="900"
                    fontFamily="inherit"
                    letterSpacing="0.05em"
                  >
                    {estrella.nombre}
                  </text>
                </g>
              );
            })()}

            {/* Planetas */}
            {soloPlanetas.map((planeta) => {
              if (!planeta.distancia_au) return null;
              const px = xDePlaneta(planeta.distancia_au);
              const r = escalarRadio(planeta.radio_km, planeta.tipo_cuerpo, allRadios);
              const isHov = hoveredId === planeta.id;
              const color = colorDeCuerpo(planeta);
              const orbitInclination = (soloPlanetas.indexOf(planeta) % 3 - 1) * 8;

              return (
                <g
                  key={planeta.id}
                  data-cuerpo="true"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredId(planeta.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => abrirPanel("planeta", planeta.id)}
                >
                  {isHov && (
                    <circle
                      cx={px}
                      cy={CENTER_Y + orbitInclination}
                      r={r * 2.5}
                      fill={`${color}15`}
                    />
                  )}
                  <circle
                    cx={px}
                    cy={CENTER_Y + orbitInclination}
                    r={isHov ? r * 1.12 : r}
                    fill={color}
                    filter={isHov ? "url(#glow-planet)" : undefined}
                    style={{ transition: "r 0.15s" }}
                  />
                  <text
                    x={px}
                    y={CENTER_Y + orbitInclination + r + (isHov ? 16 : 13)}
                    textAnchor="middle"
                    fontSize={isHov ? 10 : 9}
                    fill={
                      isHov
                        ? "color-mix(in srgb, var(--primary) 70%, transparent)"
                        : "color-mix(in srgb, var(--primary) 35%, transparent)"
                    }
                    fontWeight="900"
                    fontFamily="inherit"
                    letterSpacing="0.04em"
                    style={{ transition: "font-size 0.15s, fill 0.15s" }}
                  >
                    {planeta.nombre}
                  </text>
                  {isHov && (
                    <text
                      x={px}
                      y={CENTER_Y + orbitInclination + r + 28}
                      textAnchor="middle"
                      fontSize={8}
                      fill="color-mix(in srgb, var(--primary) 30%, transparent)"
                      fontWeight="600"
                      fontFamily="var(--font-mono, monospace)"
                    >
                      {planeta.distancia_au?.toFixed(2)} AU
                      {planeta.radio_km && ` · ${(planeta.radio_km / 1000).toFixed(0)}k km`}
                    </text>
                  )}
                </g>
              );
            })}

          </g>{/* fin <g transform> */}
        </svg>

        {/* ── Tooltip flotante del hovered ── */}
        {hovered && hovered.descripcion && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-2.5 rounded-xl max-w-sm text-center"
            style={{
              background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/40 mb-1">
              {hovered.nombre}
            </p>
            <p className="text-xs text-primary/55 font-light leading-relaxed line-clamp-2">
              {hovered.descripcion}
            </p>
          </div>
        )}

        {/* Instrucción inicial */}
        {!hoveredId && (
          <p className="absolute top-3 right-4 text-micro text-primary/15 pointer-events-none">
            Arrastrá para desplazar · scroll para zoom · click para detalles
          </p>
        )}
      </div>
    </div>
  );
}
