"use client";

/**
 * SimuladorIUM.tsx — Laboratorio visual de IUMs
 *
 * Canvas SVG libre:
 *  - Click izquierdo + drag → mover nodo
 *  - Click derecho sobre nodo → iniciar unión (arrastrar hasta otro nodo)
 *  - Auto-fit para que todos los nodos quepan sin scroll
 *
 * SUPABASE MANDA: no se inventa ningún IUM, proceso, ORIS ni resultado.
 *
 * Sistema de descubrimiento:
 *  - El jugador comienza sin saber qué hace cada IUM.
 *  - La función se revela tras una reacción exitosa (simulador_conocimiento_ium).
 *  - La composición también está oculta hasta entonces.
 *  - Cada simulación tiene un costo en Eterium (simulador_eterium_jugador).
 */

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Network,
  Link2,
  Loader2,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/infra/supabase/supabase";
import {
  IumVisual,
  type GeometriaIum,
} from "@/domains/garlia/fisica/ParticulaVisual";
import {
  particulasDeIum,
  type FilaIum,
} from "@/domains/garlia/fisica/types";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface IumCatalogo {
  id: string;
  orden: number;
  nombre: string;
  detalle: string;
  extra?: string | null;
  composicion: { particula: string; cantidad: number }[];
  geometria: GeometriaIum | undefined;
}

interface IumSalidaFuncional {
  id: string;
  ium_id: string;
  clave: string;
  nombre: string;
  tipo_salida: string;
  descripcion: string;
  formula?: string | null;
  estado: string;
  es_principal: boolean;
}

interface ConocimientoIum {
  ium_id: string;
  funcion_revelada: boolean;
  veces_en_reaccion_exitosa: number;
}

interface EteriumJugador {
  saldo: number;
  saldo_maximo: number;
}

interface ComponenteLab {
  uid: string;
  ium_id: string;
  ium_nombre: string;
  posicion: string;
  x: number;
  y: number;
}

interface EnlaceLab {
  uid: string;
  origen_uid: string;
  destino_uid: string;
  tipo_union: string;
}

interface OrisCandidato {
  oris_id?: string;
  oris?: string;
  rol?: string;
  prioridad?: number | null;
  estado_candidato?: string;
}

interface ProcesoCandidato {
  proceso_id?: string;
  proceso?: string;
  regla_clave?: string;
  estado_fundamento?: string;
  patrones_obligatorios?: number;
  patrones_coincidentes?: number;
  patrones_totales?: number;
  completo?: boolean;
  contexto_cubre_ley?: boolean;
  es_principal?: boolean;
  oris?: OrisCandidato[];
}

// Forma real devuelta por simular_organizacion_ium_v1
interface ResultadoSimulador {
  estado?: string;                       // "simulado" | "entrada_invalida"
  motivo?: string;                       // solo si entrada_invalida
  invalidos?: { ium_id?: string; motivo?: string }[];
  componentes?: unknown[];
  enlaces?: unknown[];
  salidas?: string[];
  procesos_candidatos?: ProcesoCandidato[];
  cantidad_procesos_candidatos?: number;
  proceso_principal?: string | null;
  desempate?: "patrones" | "contexto" | null;
  ambiguo?: boolean;
  [key: string]: unknown;
}


interface TopologiaOris {
  id: string;
  nombre: string;
  descripcion: string;
  capacidad_visual: string;
  activo: boolean;
  grafico_ascii: string;
  uniones: TopologiaUnion[];
}

interface TopologiaUnion {
  topologia_id: string;
  origen_posicion: string;
  destino_posicion: string;
  tipo_union: string;
  orden: number;
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

const POSICIONES = ["A", "B", "C", "D", "N", "M", "X", "Y", "Z"];
// Debe coincidir con tipos_union_ium_v1 (hoy solo "dirigida" tiene patrones que produzcan candidatos)
const TIPOS_UNION = ["dirigida", "reciproca", "acoplamiento"];

const NOMBRE_UNION: Record<string, string> = {
  dirigida: "Dirigida",
  reciproca: "Recíproca",
  acoplamiento: "Acoplamiento",
};

const MOTIVOS_INVALIDO: Record<string, string> = {
  ium_no_existe: "no es una pieza conocida",
  ium_sin_salida_funcional_principal: "todavía no sabe cómo participar en una reacción",
};

// Costos de Eterium por tipo de resultado
const COSTO_ETERIUM: Record<string, number> = {
  sin_resonancia: 0,
  resonancia_parcial: 1,
  reaccion_inestable: 3,
  proceso_exitoso: 8,
};

// Tamaño del nodo
const NODE_R = 44;      // radio del círculo de fondo
const LABEL_H = 34;     // espacio de texto debajo del visual
const VIS_SIZE = 72;    // tamaño del IumVisual
const VIS_R = VIS_SIZE / 2;

// Margen entre nodos al hacer auto-layout al agregar
const AUTO_COLS = 3;
const AUTO_STEP_X = 160;
const AUTO_STEP_Y = 180;
const AUTO_ORIGIN_X = 80;
const AUTO_ORIGIN_Y = 80;

let uidCounter = 0;
const genUID = () => `lab_${++uidCounter}_${Date.now()}`;

// ─── Hooks de datos ───────────────────────────────────────────────────────────

function useIumsCatalogo() {
  const [iums, setIums] = useState<IumCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const { data: baseData } = await supabase
        .from("iums")
        .select("id, orden, nombre, detalle, extra")
        .order("orden");

      const { data: pRelData } = await supabase
        .from("iums_particulas")
        .select("ium_id, particula_id, cantidad");

      const { data: partData } = await supabase
        .from("particulas")
        .select("id, nombre");

      const { data: geoData } = await supabase
        .from("v_iums_geometria_canonica_v1")
        .select("ium_id, geometria");

      if (!vivo) return;

      const nombreDePart = new Map<string, string>(
        (partData ?? []).map((p: { id: string; nombre: string }) => [p.id, p.nombre]),
      );

      const composPorIum = new Map<string, { particula: string; cantidad: number }[]>();
      for (const fila of pRelData ?? []) {
        const nombre = nombreDePart.get(fila.particula_id);
        if (!nombre) continue;
        const arr = composPorIum.get(fila.ium_id) ?? [];
        arr.push({ particula: nombre, cantidad: fila.cantidad });
        composPorIum.set(fila.ium_id, arr);
      }

      const geoPorIum = new Map<string, GeometriaIum>(
        (geoData ?? []).map((g: { ium_id: string; geometria: string }) => [
          g.ium_id,
          g.geometria as GeometriaIum,
        ]),
      );

      const result: IumCatalogo[] = (baseData ?? []).map((i) => ({
        id: i.id,
        orden: i.orden,
        nombre: i.nombre,
        detalle: i.detalle,
        extra: i.extra,
        composicion: composPorIum.get(i.id) ?? [],
        geometria: geoPorIum.get(i.id),
      }));

      setIums(result);
      setLoading(false);
    }
    cargar();
    return () => { vivo = false; };
  }, []);

  return { iums, loading };
}


function useTopologias() {
  const [topologias, setTopologias] = useState<TopologiaOris[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const [{ data: topoData }, { data: unionData }] = await Promise.all([
        supabase
          .from("topologias_oris")
          .select("id, nombre, descripcion, capacidad_visual, activo, grafico_ascii")
          .order("nombre"),
        supabase
          .from("topologia_uniones")
          .select("topologia_id, origen_posicion, destino_posicion, tipo_union, orden")
          .order("orden"),
      ]);
      if (!vivo) return;
      const unionesPorTopo = new Map<string, TopologiaUnion[]>();
      for (const u of unionData ?? []) {
        const arr = unionesPorTopo.get(u.topologia_id) ?? [];
        arr.push(u);
        unionesPorTopo.set(u.topologia_id, arr);
      }
      const result: TopologiaOris[] = (topoData ?? []).map((t) => ({
        ...t,
        uniones: unionesPorTopo.get(t.id) ?? [],
      }));
      setTopologias(result);
      setLoading(false);
    }
    cargar();
    return () => { vivo = false; };
  }, []);

  return { topologias, loading };
}

function useIumSalidas(iumIds: string[]) {
  const [salidas, setSalidas] = useState<IumSalidaFuncional[]>([]);
  useEffect(() => {
    if (!iumIds.length) { setSalidas([]); return; }
    supabase
      .from("ium_salidas_funcionales")
      .select("id, ium_id, clave, nombre, tipo_salida, descripcion, formula, estado, es_principal")
      .in("ium_id", iumIds)
      .order("es_principal", { ascending: false })
      .then(({ data }) => setSalidas(data ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(iumIds.slice().sort())]);
  return salidas;
}

// ─── Hook: conocimiento del jugador sobre los IUMs ─────────────────────────

function useConocimientoIums(perfilId: string | null) {
  const [conocimiento, setConocimiento] = useState<Map<string, ConocimientoIum>>(new Map());

  const cargar = useCallback(async () => {
    if (!perfilId) return;
    const { data } = await supabase
      .from("simulador_conocimiento_ium")
      .select("ium_id, funcion_revelada, veces_en_reaccion_exitosa")
      .eq("perfil_id", perfilId);
    if (data) {
      const mapa = new Map<string, ConocimientoIum>();
      for (const fila of data) mapa.set(fila.ium_id, fila);
      setConocimiento(mapa);
    }
  }, [perfilId]);

  useEffect(() => { cargar(); }, [cargar]);

  return { conocimiento, recargar: cargar };
}

// ─── Hook: saldo de Eterium del jugador ────────────────────────────────────

function useEteriumJugador(perfilId: string | null) {
  const [eterium, setEterium] = useState<EteriumJugador>({ saldo: 100, saldo_maximo: 100 });

  const cargar = useCallback(async () => {
    if (!perfilId) return;
    const { data } = await supabase
      .from("simulador_eterium_jugador")
      .select("saldo, saldo_maximo")
      .eq("perfil_id", perfilId)
      .maybeSingle();
    if (data) setEterium(data);
  }, [perfilId]);

  useEffect(() => { cargar(); }, [cargar]);

  return { eterium, recargar: cargar };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ARROW_COLOR = "color-mix(in srgb, var(--primary) 55%, transparent)";
const ARROW_ID = "sim-arrow-head";

function autoPos(index: number): { x: number; y: number } {
  const col = index % AUTO_COLS;
  const row = Math.floor(index / AUTO_COLS);
  return {
    x: AUTO_ORIGIN_X + col * AUTO_STEP_X,
    y: AUTO_ORIGIN_Y + row * AUTO_STEP_Y,
  };
}


// ─── Sistema de slots por topología ──────────────────────────────────────────
//
// Cada topología tiene sus posiciones canónicas en un espacio de 700×700 px.
// "nucleo" siempre al centro. El resto se distribuye alrededor.
// Coordenadas SVG (x=0..700, y=0..700).

const CANVAS_W = 700;
const CANVAS_H = 700;
const SLOT_SNAP_RADIUS = 80; // px SVG: si el nodo cae dentro, salta al slot

type SlotLayout = Record<string, { x: number; y: number }>;

const LAYOUT_2: SlotLayout = {
  a:      { x: 200, y: 350 },
  nucleo: { x: 500, y: 350 },
};
const LAYOUT_3_CHAIN: SlotLayout = {
  a:      { x: 130, y: 350 },
  nucleo: { x: 370, y: 350 },
  b:      { x: 610, y: 350 },
};
const LAYOUT_3_CONVERGE: SlotLayout = {
  a:      { x: 170, y: 200 },
  b:      { x: 530, y: 200 },
  nucleo: { x: 350, y: 440 },
};
const LAYOUT_4_CONVERGE: SlotLayout = {
  a:      { x: 155, y: 190 },
  b:      { x: 545, y: 190 },
  nucleo: { x: 350, y: 360 },
  c:      { x: 350, y: 560 },
};
const LAYOUT_4_STRUCT: SlotLayout = {
  a:      { x: 170, y: 210 },
  b:      { x: 530, y: 210 },
  nucleo: { x: 350, y: 410 },
  c:      { x: 580, y: 550 },
};
const LAYOUT_5_BRANCH: SlotLayout = {
  a:      { x: 130, y: 350 },
  nucleo: { x: 350, y: 350 },
  b:      { x: 570, y: 200 },
  c:      { x: 570, y: 480 },
  d:      { x: 570, y: 560 },
};
const LAYOUT_5_CYCLE: SlotLayout = {
  a:      { x: 190, y: 200 },
  b:      { x: 510, y: 200 },
  nucleo: { x: 510, y: 450 },
  c:      { x: 190, y: 450 },
  d:      { x: 510, y: 580 },
};
const LAYOUT_5_CHAIN: SlotLayout = {
  a:      { x: 100, y: 350 },
  nucleo: { x: 280, y: 350 },
  b:      { x: 460, y: 200 },
  d:      { x: 460, y: 480 },
  c:      { x: 640, y: 480 },
};
const LAYOUT_5_FEED: SlotLayout = {
  a:      { x: 190, y: 200 },
  b:      { x: 510, y: 200 },
  nucleo: { x: 510, y: 420 },
  c:      { x: 190, y: 420 },
  d:      { x: 640, y: 420 },
};

// Mapa nombre→layout. Las claves deben coincidir exactamente con t.nombre en Supabase.
const TOPO_LAYOUTS: Record<string, SlotLayout> = {
  "Convergencia nuclear":       LAYOUT_3_CONVERGE,
  "Convergencia con resolución": LAYOUT_4_CONVERGE,
  "Estructural":                LAYOUT_4_STRUCT,
  "Ramificación":               LAYOUT_5_BRANCH,
  "Ciclo con salida":           LAYOUT_5_CYCLE,
  "Cadena dinámica":            LAYOUT_5_CHAIN,
  "Retroalimentación":          LAYOUT_5_FEED,
};

// Normaliza nombre de posición canónica → clave del layout
const canonKey = (p: string) => p.toLowerCase().trim();

// Devuelve las coordenadas de todos los slots de una topología
function getSlotsActivos(topo: TopologiaOris): SlotLayout {
  const layout = TOPO_LAYOUTS[topo.nombre];
  if (!layout) return {};
  return layout;
}

// Dado (x,y) y los slots activos, devuelve el slot más cercano si está dentro del radio
function slotMasCercano(
  x: number, y: number, slots: SlotLayout, radioSVG: number,
): { key: string; x: number; y: number } | null {
  let best: { key: string; x: number; y: number; dist: number } | null = null;
  for (const [key, pos] of Object.entries(slots)) {
    const dist = Math.hypot(x - pos.x, y - pos.y);
    if (dist <= radioSVG && (!best || dist < best.dist)) {
      best = { key, x: pos.x, y: pos.y, dist };
    }
  }
  return best;
}

// ─── Conexión SVG ─────────────────────────────────────────────────────────────

function ConnectionLine({
  x1, y1, x2, y2, tipo, label, onRemove, resonancia,
}: {
  x1: number; y1: number; x2: number; y2: number;
  tipo: string; label?: string; onRemove?: () => void;
  resonancia?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perp = Math.min(50, len * 0.25);
  const cpx = mx - (dy / len) * perp;
  const cpy = my + (dx / len) * perp;
  const d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;

  const strokeColor = resonancia
    ? "var(--success,#22c55e)"
    : ARROW_COLOR;

  return (
    <g>
      <path d={d} fill="none" strokeWidth={12} stroke="transparent"
        style={{ cursor: "pointer" }}
        onClick={onRemove}
      />
      <path
        d={d}
        fill="none"
        strokeWidth={resonancia ? 2.5 : 1.5}
        strokeDasharray={tipo === "reciproca" ? "4 3" : tipo === "acoplamiento" ? "1.5 2.5" : undefined}
        markerEnd={`url(#${ARROW_ID})`}
        style={{
          stroke: strokeColor,
          pointerEvents: "none",
          filter: resonancia ? "drop-shadow(0 0 4px var(--success,#22c55e))" : undefined,
          transition: "stroke 0.4s, stroke-width 0.4s",
        }}
      />
      {label && (
        <text
          x={cpx}
          y={cpy - 5}
          fontSize={7.5}
          fontWeight={700}
          textAnchor="middle"
          style={{ fill: strokeColor, pointerEvents: "none", letterSpacing: "0.04em" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ─── Nodo IUM draggable ───────────────────────────────────────────────────────

function IumNodeSVG({
  comp,
  iumData,
  salidas,
  selected,
  linking,
  onMouseDownDrag,
  onContextMenu,
  onRemove,
  onMouseEnter,
  onMouseLeave,
  scale,
  reaccion,
  funcionRevelada,
}: {
  reaccion?: "exito" | "inestable" | null;
  comp: ComponenteLab;
  iumData: IumCatalogo | undefined;
  salidas: IumSalidaFuncional[];
  selected: boolean;
  linking: boolean;
  onMouseDownDrag: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  scale: number;
  funcionRevelada: boolean;
}) {
  const { x, y } = comp;
  const principal = funcionRevelada ? salidas.find((s) => s.es_principal) : undefined;

  const filaIum: FilaIum | undefined = iumData
    ? {
        id: iumData.id,
        nombre: iumData.nombre,
        detalle: iumData.detalle,
        extra: iumData.extra ?? undefined,
        composicion: iumData.composicion,
      }
    : undefined;
  const particulas = filaIum ? particulasDeIum(filaIum) : [];

  const visR = VIS_R;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "grab" }}
      onMouseDown={onMouseDownDrag}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {(linking || selected) && (
        <circle
          r={visR + 12}
          fill="none"
          stroke={linking ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)"}
          strokeWidth={linking ? 2 : 1}
          strokeDasharray={linking ? undefined : "3 3"}
          style={{ transition: "stroke 0.15s" }}
        />
      )}

      {reaccion && (
        <circle
          r={visR + 16}
          fill="none"
          strokeWidth={2.5}
          style={{
            stroke: reaccion === "exito" ? "var(--success,#22c55e)" : "var(--warning,#f59e0b)",
            animation: "destello 1.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      <circle
        r={visR + 6}
        style={{ fill: "none", stroke: "none" }}
      />

      <foreignObject
        x={-visR}
        y={-visR}
        width={VIS_SIZE}
        height={VIS_SIZE}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div style={{ width: VIS_SIZE, height: VIS_SIZE }}>
          <IumVisual
            particulas={particulas}
            geometria={iumData?.geometria}
            size={VIS_SIZE}
            showToggle={false}
          />
        </div>
      </foreignObject>

      {/* Badge posición */}
      <circle
        cx={visR - 2}
        cy={-visR + 2}
        r={9}
        style={{ fill: "var(--primary)" }}
      />
      <text
        x={visR - 2}
        y={-visR + 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={7.5}
        fontWeight={900}
        style={{ fill: "var(--btn-text)", pointerEvents: "none" }}
      >
        {comp.posicion}
      </text>

      {/* Nombre */}
      <text
        x={0}
        y={visR + 18}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={9}
        fontWeight={700}
        style={{ fill: "var(--foreground)", pointerEvents: "none" }}
      >
        {comp.ium_nombre}
      </text>

      {/* Salida principal — solo si fue revelada */}
      {principal && (
        <text
          x={0}
          y={visR + 32}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={7.5}
          style={{
            fill: "var(--primary)",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          ↳ {principal.nombre}
        </text>
      )}

      {/* Indicador "función desconocida" */}
      {!funcionRevelada && (
        <text
          x={0}
          y={visR + 32}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={7.5}
          style={{
            fill: "color-mix(in srgb, var(--primary) 30%, transparent)",
            pointerEvents: "none",
            fontStyle: "italic",
          }}
        >
          ↳ comportamiento desconocido
        </text>
      )}

      {/* Botón eliminar */}
      <foreignObject
        x={visR + 4}
        y={-visR - 2}
        width={16}
        height={16}
        style={{ pointerEvents: "all" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Eliminar"
          style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            background: "var(--bg-main)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          }}
        >
          <X size={8} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
        </button>
      </foreignObject>
    </g>
  );
}

// ─── Badge de Eterium ─────────────────────────────────────────────────────────

function EteriumBadge({ saldo, saldoMaximo, costo }: { saldo: number; saldoMaximo: number; costo: number }) {
  const pct = Math.max(0, Math.min(1, saldo / (saldoMaximo || 100)));
  const color = pct > 0.5 ? "var(--primary)" : pct > 0.2 ? "var(--warning,#f59e0b)" : "var(--error,#ef4444)";

  return (
    <div style={{
      position: "absolute", top: 12, left: 12, zIndex: 10,
      display: "flex", flexDirection: "column", gap: 3,
      background: "color-mix(in srgb, var(--bg-main) 85%, transparent)",
      border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
      borderRadius: 8, padding: "6px 10px", backdropFilter: "blur(6px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Zap size={9} style={{ color }} />
        <span style={{ fontSize: 9, fontWeight: 800, color }}>
          {Math.floor(saldo)} / {saldoMaximo}
        </span>
        <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontWeight: 400 }}>
          Eterium
        </span>
      </div>
      {/* Barra */}
      <div style={{ width: 90, height: 3, borderRadius: 99, background: "color-mix(in srgb, var(--primary) 12%, transparent)", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 99, background: color, transition: "width 0.5s ease" }} />
      </div>
      {costo > 0 && (
        <span style={{ fontSize: 7, color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
          Costo estimado: {costo} ⬡
        </span>
      )}
    </div>
  );
}

// ─── Modal de descubrimiento ──────────────────────────────────────────────────

function ModalDescubrimiento({
  iums,
  onCerrar,
}: {
  iums: { nombre: string; salida?: string }[];
  onCerrar: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "color-mix(in srgb, var(--bg-main) 60%, transparent)",
        padding: "20px 16px",
      }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
          borderRadius: 18, padding: "24px 22px",
          width: "100%", maxWidth: 340,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          animation: "modal-aparecer 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          textAlign: "center",
        }}
      >
        <Sparkles size={28} style={{ color: "var(--primary)", animation: "latido 1.6s ease-in-out infinite" }} />
        <div>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 4px", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
            ¡Primera revelación!
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            {iums.length === 1
              ? `Comprendes cómo funciona ${iums[0].nombre}`
              : `Comprendes ${iums.length} nuevas piezas`}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          {iums.map((ium, i) => (
            <div key={i} style={{
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)",
              borderRadius: 10, padding: "8px 14px", textAlign: "left",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 2px" }}>{ium.nombre}</p>
              {ium.salida && (
                <p style={{ fontSize: 9, margin: 0, color: "var(--primary)", opacity: 0.8 }}>
                  ↳ {ium.salida}
                </p>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 9, margin: 0, lineHeight: 1.6, color: "color-mix(in srgb, var(--foreground) 55%, transparent)", maxWidth: 260 }}>
          Ahora puedes ver qué hace esta pieza en el catálogo. Sigue experimentando para descubrir más.
        </p>

        <button
          onClick={onCerrar}
          style={{
            padding: "8px 24px", borderRadius: 999,
            background: "var(--primary)", color: "var(--btn-text)",
            border: "none", cursor: "pointer", fontSize: 10, fontWeight: 800,
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

// ─── Panel resultado ──────────────────────────────────────────────────────────

function ResultadoPanel({ resultado, nombreIum }: { resultado: ResultadoSimulador; nombreIum: (id?: string) => string }) {
  const candidatos = resultado.procesos_candidatos ?? [];
  const invalidos  = resultado.invalidos ?? [];
  const principal  = candidatos.find((p) => p.es_principal);
  const invalida   = resultado.estado !== undefined && resultado.estado !== "simulado";

  let tipo: "exito" | "inestable" | "nada" | "invalida" = "nada";
  if (invalida) tipo = "invalida";
  else if (resultado.proceso_principal) tipo = "exito";
  else if (resultado.ambiguo || candidatos.length > 0) tipo = "inestable";

  const oris = Array.from(new Set((principal?.oris ?? []).map((o) => o.oris ?? o.oris_id).filter(Boolean))) as string[];

  // Feedback de resonancia parcial
  const coincidentes = principal?.patrones_coincidentes ?? candidatos[0]?.patrones_coincidentes ?? 0;
  const totales      = principal?.patrones_totales ?? candidatos[0]?.patrones_totales ?? 0;
  const hayResonanciaInfo = tipo === "nada" && totales > 0 && coincidentes > 0;

  const color =
    tipo === "exito" ? "var(--success,#22c55e)"
    : tipo === "inestable" ? "var(--warning,#f59e0b)"
    : tipo === "invalida" ? "var(--error,#ef4444)"
    : "var(--primary)";

  return (
    <div style={{
      padding: "14px 12px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center",
      animation: "aparecer 0.45s ease-out",
    }}>
      {tipo === "exito" && (
        <>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0, color: `color-mix(in srgb, ${color} 80%, var(--foreground))` }}>
            ¡Algo ocurre!
          </p>
          <p style={{ fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1.15 }}>{resultado.proceso_principal}</p>
          {!!oris.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 2 }}>
              {oris.map((o) => (
                <span key={o} style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                  {o}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {tipo === "inestable" && (
        <>
          <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Reacción inestable</p>
          <p style={{ fontSize: 9, margin: 0, lineHeight: 1.5, color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
            La combinación vibra, pero no termina de decidirse. Algo debe inclinar la balanza.
          </p>
          {totales > 0 && (
            <p style={{ fontSize: 8, margin: 0, color: "color-mix(in srgb, var(--warning,#f59e0b) 80%, transparent)" }}>
              {coincidentes} de {totales} vínculos reconocidos
            </p>
          )}
        </>
      )}

      {tipo === "nada" && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
            {hayResonanciaInfo ? "Algo resuena… pero débilmente" : "No ocurre nada… todavía"}
          </p>
          <p style={{ fontSize: 9, margin: 0, lineHeight: 1.5, color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            {hayResonanciaInfo
              ? `${coincidentes} de ${totales} conexiones reconocidas. Algo falta.`
              : "Prueba otras piezas, otras uniones u otra forma."}
          </p>
        </>
      )}

      {tipo === "invalida" && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Hay piezas que aún no pueden reaccionar</p>
          {invalidos.map((inv, i) => (
            <p key={i} style={{ fontSize: 9, margin: 0, lineHeight: 1.5 }}>
              <strong>{nombreIum(inv.ium_id)}</strong> {MOTIVOS_INVALIDO[inv.motivo ?? ""] ?? "no puede participar"}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SimuladorIUM() {
  const { iums, loading: loadingIums } = useIumsCatalogo();
  const { topologias } = useTopologias();
  const [busqueda, setBusqueda] = useState("");
  const [componentes, setComponentes] = useState<ComponenteLab[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceLab[]>([]);

  // Auth: obtener perfil del jugador
  const [perfilId, setPerfilId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setPerfilId(data?.user?.id ?? null);
    });
  }, []);

  // Sistema de descubrimiento
  const { conocimiento, recargar: recargarConocimiento } = useConocimientoIums(perfilId);
  const { eterium, recargar: recargarEterium } = useEteriumJugador(perfilId);

  // Modal de revelación
  const [revelaciones, setRevelaciones] = useState<{ nombre: string; salida?: string }[]>([]);

  // Drag de nodo
  const dragging = useRef<{
    uid: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
    moved: boolean;
  } | null>(null);

  // Modo enlace (click derecho)
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [linkingMouse, setLinkingMouse] = useState<{ x: number; y: number } | null>(null);
  const [linkingOver, setLinkingOver] = useState<string | null>(null);
  const [linkingTipo, setLinkingTipo] = useState("dirigida");

  // Topología seleccionada
  const [topoSeleccionada, setTopoSeleccionada] = useState<TopologiaOris | null>(null);

  // Modal tipo unión al soltar
  const [modalTipo, setModalTipo] = useState<{
    origenUid: string;
    destinoUid: string;
  } | null>(null);

  // Viewport transform (pan + zoom)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Simulador
  const [simulando, setSimulando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSimulador | null>(null);
  const [errorSim, setErrorSim] = useState<string | null>(null);
  const [avisoTopo, setAvisoTopo] = useState<string | null>(null);
  // Slot resaltado mientras arrastra en modo topología
  const [dragSlotPreview, setDragSlotPreview] = useState<{ key: string; x: number; y: number } | null>(null);
  const [slotDropdown, setSlotDropdown] = useState<{ key: string; posUI: string; x: number; y: number } | null>(null);
  const [busquedaSlot, setBusquedaSlot] = useState("");
  const [drawerIzq, setDrawerIzq] = useState(false);
  const [drawerDer, setDrawerDer] = useState(false);

  // IDs en canvas para saber qué salidas cargar
  const iumIds = useMemo(() => componentes.map((c) => c.ium_id), [componentes]);
  const salidas = useIumSalidas(iumIds);
  const iumMap = useMemo(() => new Map(iums.map((i) => [i.id, i])), [iums]);

  // ── Clasificar resultado para el costo de Eterium ────────────────────────
  const clasificarResultado = useCallback((res: ResultadoSimulador): string => {
    if (!res || res.estado !== "simulado") return "sin_resonancia";
    if (res.proceso_principal) return "proceso_exitoso";
    const candidatos = res.procesos_candidatos ?? [];
    if (res.ambiguo || candidatos.length > 0) {
      const alguno = candidatos[0];
      if (alguno && (alguno.patrones_coincidentes ?? 0) > 0) return "reaccion_inestable";
    }
    // Ver si hay resonancia parcial (patrones coincidentes pero sin proceso)
    const tieneCoincidencias = candidatos.some((c) => (c.patrones_coincidentes ?? 0) > 0);
    return tieneCoincidencias ? "resonancia_parcial" : "sin_resonancia";
  }, []);

  // Costo estimado para mostrar al jugador antes de simular
  const costoEstimado = useMemo(() => {
    // No podemos saber el resultado antes de simular — mostramos el máximo posible
    return componentes.length > 0 ? COSTO_ETERIUM.proceso_exitoso : 0;
  }, [componentes.length]);

  // Si el jugador cambia la combinación, el resultado anterior deja de valer
  const firmaCombinacion = useMemo(
    () =>
      componentes.map((c) => `${c.ium_id}@${c.posicion}`).join("|") + "#" +
      enlaces.map((e) => `${e.origen_uid}>${e.destino_uid}:${e.tipo_union}`).join("|"),
    [componentes, enlaces],
  );
  useEffect(() => { setResultado(null); setErrorSim(null); }, [firmaCombinacion]);

  const iumsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return q
      ? iums.filter((i) => i.nombre.toLowerCase().includes(q) || i.detalle.toLowerCase().includes(q))
      : iums;
  }, [iums, busqueda]);

  const posicionesUsadas = useMemo(() => componentes.map((c) => c.posicion), [componentes]);

  // ── Conversión coordenadas pantalla → SVG ─────────────────────────────────

  const screenToSVG = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: screenX, y: screenY };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    return {
      x: viewBox.x + (screenX - rect.left) * scaleX,
      y: viewBox.y + (screenY - rect.top) * scaleY,
    };
  }, [viewBox]);

  // ── Helper: cablear slots al añadir un componente en modo topología ─────────

  const cablearSlot = useCallback((newComp: ComponenteLab, compsPrevios: ComponenteLab[]) => {
    if (!topoSeleccionada) return;
    const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
    const todosComps = [...compsPrevios, newComp];
    const nuevosEnlaces: EnlaceLab[] = [];
    for (const u of topoSeleccionada.uniones) {
      const orPosUI  = toUI(u.origen_posicion);
      const dstPosUI = toUI(u.destino_posicion);
      if (orPosUI !== newComp.posicion && dstPosUI !== newComp.posicion) continue;
      const orComp  = orPosUI  === newComp.posicion ? newComp : todosComps.find((c) => c.posicion === orPosUI);
      const dstComp = dstPosUI === newComp.posicion ? newComp : todosComps.find((c) => c.posicion === dstPosUI);
      if (!orComp || !dstComp) continue;
      const yaExiste = enlaces.some((e) => e.origen_uid === orComp.uid && e.destino_uid === dstComp.uid);
      if (!yaExiste) {
        nuevosEnlaces.push({ uid: genUID(), origen_uid: orComp.uid, destino_uid: dstComp.uid, tipo_union: u.tipo_union });
      }
    }
    if (nuevosEnlaces.length) setEnlaces((prev) => [...prev, ...nuevosEnlaces]);
  }, [topoSeleccionada, enlaces]);

  // ── Agregar IUM ───────────────────────────────────────────────────────────

  const agregarIum = useCallback((ium: IumCatalogo) => {
    if (topoSeleccionada) {
      const slots = getSlotsActivos(topoSeleccionada);
      const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
      const slotsLibres = Object.keys(slots).filter(
        (k) => !componentes.some((c) => c.posicion === toUI(k)),
      );
      if (!slotsLibres.length) return;
      const key = slotsLibres[0];
      const { x, y } = slots[key];
      const newComp: ComponenteLab = { uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre, posicion: toUI(key), x, y };
      setComponentes((prev) => [...prev, newComp]);
      cablearSlot(newComp, componentes);
    } else {
      const idx = componentes.length;
      const { x, y } = autoPos(idx);
      const posLibre = POSICIONES.find((p) => !posicionesUsadas.includes(p)) ?? "X";
      setComponentes((prev) => [...prev, {
        uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre,
        posicion: posLibre, x, y,
      }]);
    }
  }, [componentes, posicionesUsadas, topoSeleccionada, cablearSlot]);

  // ── Auto-fit viewBox ──────────────────────────────────────────────────────

  const fitAll = useCallback(() => {
    const NODE_R = 52;
    const PADDING = 90;

    const fitPoints = (points: { x: number; y: number }[]) => {
      if (!points.length) return;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const rawMinX = Math.min(...xs) - NODE_R - PADDING;
      const rawMinY = Math.min(...ys) - NODE_R - PADDING;
      const rawMaxX = Math.max(...xs) + NODE_R + PADDING;
      const rawMaxY = Math.max(...ys) + NODE_R + PADDING;
      const rawW = rawMaxX - rawMinX;
      const rawH = rawMaxY - rawMinY;

      const svgEl = svgRef.current;
      const aspect = svgEl
        ? svgEl.clientWidth / Math.max(svgEl.clientHeight, 1)
        : 4 / 3;

      let finalW = rawW;
      let finalH = rawH;
      if (rawW / rawH > aspect) {
        finalH = rawW / aspect;
      } else {
        finalW = rawH * aspect;
      }
      const cx = (rawMinX + rawMaxX) / 2;
      const cy = (rawMinY + rawMaxY) / 2;
      setViewBox({ x: cx - finalW / 2, y: cy - finalH / 2, w: finalW, h: finalH });
    };

    if (!componentes.length) {
      if (topoSeleccionada) {
        const slots = Object.values(getSlotsActivos(topoSeleccionada));
        if (slots.length) { fitPoints(slots); return; }
      }
      setViewBox({ x: 0, y: 0, w: 800, h: 600 });
      return;
    }
    fitPoints(componentes.map((c) => ({ x: c.x, y: c.y })));
  }, [componentes, topoSeleccionada]);

  useEffect(() => { fitAll(); }, [componentes.length, topoSeleccionada]);
  useEffect(() => {
    const fn = () => fitAll();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [fitAll]);

  // ── Drag de nodo ──────────────────────────────────────────────────────────

  const onNodeMouseDown = useCallback((uid: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const comp = componentes.find((c) => c.uid === uid);
    if (!comp) return;
    const svgPos = screenToSVG(e.clientX, e.clientY);
    dragging.current = {
      uid,
      startMouseX: svgPos.x,
      startMouseY: svgPos.y,
      startNodeX: comp.x,
      startNodeY: comp.y,
      moved: false,
    };
  }, [componentes, screenToSVG]);

  // ── Click derecho en nodo = iniciar enlace ─────────────────────────────────

  const onNodeContextMenu = useCallback((uid: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (linkingFrom) {
      if (linkingFrom !== uid) {
        setModalTipo({ origenUid: linkingFrom, destinoUid: uid });
      }
      setLinkingFrom(null);
      setLinkingMouse(null);
      setLinkingOver(null);
    } else {
      setLinkingFrom(uid);
      const svgPos = screenToSVG(e.clientX, e.clientY);
      setLinkingMouse(svgPos);
    }
  }, [linkingFrom, screenToSVG]);

  // ── Mouse move en SVG ─────────────────────────────────────────────────────

  const onSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svgPos = screenToSVG(e.clientX, e.clientY);

    const drag = dragging.current;
    if (drag) {
      const dx = svgPos.x - drag.startMouseX;
      const dy = svgPos.y - drag.startMouseY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
      const nx = drag.startNodeX + dx;
      const ny = drag.startNodeY + dy;
      const uid = drag.uid;

      if (topoSeleccionada) {
        const slots = getSlotsActivos(topoSeleccionada);
        const snap = slotMasCercano(nx, ny, slots, SLOT_SNAP_RADIUS * 1.8);
        setDragSlotPreview(snap);
        setComponentes((prev) =>
          prev.map((c) => c.uid === uid ? { ...c, x: nx, y: ny } : c),
        );
      } else {
        setComponentes((prev) =>
          prev.map((c) => c.uid === uid ? { ...c, x: nx, y: ny } : c),
        );
      }
    }

    if (linkingFrom) {
      setLinkingMouse(svgPos);
    }
  }, [screenToSVG, linkingFrom, topoSeleccionada]);

  // ── Mouse up ──────────────────────────────────────────────────────────────

  const onSVGMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const drag = dragging.current;
    dragging.current = null;

    if (drag && drag.moved && topoSeleccionada) {
      const slots = getSlotsActivos(topoSeleccionada);
      const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
      setComponentes((prev) => {
        const nodo = prev.find((c) => c.uid === drag.uid);
        if (!nodo) return prev;
        const snap = slotMasCercano(nodo.x, nodo.y, slots, SLOT_SNAP_RADIUS * 2.5);
        if (!snap) {
          return prev.map((c) => c.uid === drag.uid
            ? { ...c, x: drag.startNodeX, y: drag.startNodeY }
            : c);
        }
        const newPosUI = toUI(snap.key);
        const ocupante = prev.find((c) => c.uid !== drag.uid && c.posicion === newPosUI);
        return prev.map((c) => {
          if (c.uid === drag.uid) {
            return { ...c, posicion: newPosUI, x: snap.x, y: snap.y };
          }
          if (ocupante && c.uid === ocupante.uid) {
            return { ...c, posicion: nodo.posicion, x: drag.startNodeX, y: drag.startNodeY };
          }
          return c;
        });
      });
    }

    setDragSlotPreview(null);

    if (linkingFrom && !linkingOver) {
      setLinkingFrom(null);
      setLinkingMouse(null);
    }
  }, [linkingFrom, linkingOver, topoSeleccionada]);

  // ── Pan del canvas (arrastrar fondo) ──────────────────────────────────────

  const onCanvasMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest("[data-ium-node]")) return;
    setSlotDropdown(null); setBusquedaSlot("");
  }, []);

  // ── Cancelar enlace con Escape ────────────────────────────────────────────

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLinkingFrom(null);
        setLinkingMouse(null);
        setLinkingOver(null);
        setSlotDropdown(null);
        setBusquedaSlot("");
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // ── Confirmar enlace ──────────────────────────────────────────────────────

  const elegirIumEnSlot = useCallback((ium: IumCatalogo, slotKey: string, posUI: string, sx: number, sy: number) => {
    const newComp: ComponenteLab = { uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre, posicion: posUI, x: sx, y: sy };
    setComponentes((prev) => [...prev, newComp]);
    cablearSlot(newComp, componentes);
    setSlotDropdown(null);
    setBusquedaSlot("");
  }, [componentes, cablearSlot]);

  const confirmarEnlace = useCallback(() => {
    if (!modalTipo) return;
    setEnlaces((prev) => [...prev, {
      uid: genUID(),
      origen_uid: modalTipo.origenUid,
      destino_uid: modalTipo.destinoUid,
      tipo_union: linkingTipo,
    }]);
    setModalTipo(null);
    setLinkingTipo("dirigida");
  }, [modalTipo, linkingTipo]);

  // ── Aplicar topología ────────────────────────────────────────────────────────

  const aplicarTopologia = useCallback((topo: TopologiaOris) => {
    setTopoSeleccionada(topo);
    setResultado(null);
    setErrorSim(null);

    const canonToUI = (p: string) => (p === "nucleo" ? "N" : p.toUpperCase());
    const slots = getSlotsActivos(topo);
    const slotsOrden = Object.keys(slots);
    const nSlots = slotsOrden.length;
    const nNodos = componentes.length;

    const nuevosComps = componentes.map((c, i) => {
      if (i >= nSlots) return c;
      const key = slotsOrden[i];
      const { x, y } = slots[key];
      return { ...c, posicion: canonToUI(key), x, y };
    });

    const posMap = new Map<string, string>();
    nuevosComps.slice(0, nSlots).forEach((c, i) => {
      posMap.set(slotsOrden[i], c.uid);
    });

    const nuevosEnlaces: EnlaceLab[] = [];
    for (const u of topo.uniones) {
      const orUid  = posMap.get(u.origen_posicion);
      const dstUid = posMap.get(u.destino_posicion);
      if (orUid && dstUid) {
        nuevosEnlaces.push({ uid: genUID(), origen_uid: orUid, destino_uid: dstUid, tipo_union: u.tipo_union });
      }
    }

    setComponentes(nuevosComps);
    setEnlaces(nuevosEnlaces);

    if (nNodos < nSlots) {
      const f = nSlots - nNodos;
      setAvisoTopo(`Faltan ${f} IUM${f !== 1 ? "s" : ""} para completar esta forma. Agrégalos desde la lista.`);
    } else if (nNodos > nSlots) {
      const f = nNodos - nSlots;
      setAvisoTopo(`${f} IUM${f !== 1 ? "s" : ""} se quedaron fuera: la forma solo tiene ${nSlots} huecos.`);
    } else {
      setAvisoTopo(null);
    }
  }, [componentes]);

  const limpiar = useCallback(() => {
    setComponentes([]); setEnlaces([]); setResultado(null); setErrorSim(null); setAvisoTopo(null); setTopoSeleccionada(null); setDragSlotPreview(null);
  }, []);

  // ── Simular ────────────────────────────────────────────────────────────────

  const simular = useCallback(async () => {
    if (!componentes.length) return;
    setResultado(null); setErrorSim(null);

    // Validar IUMs repetidos con enlaces
    const conteo = new Map<string, number>();
    componentes.forEach((c) => conteo.set(c.ium_id, (conteo.get(c.ium_id) ?? 0) + 1));
    const repetidos = new Set<string>();
    for (const e of enlaces) {
      for (const uid of [e.origen_uid, e.destino_uid]) {
        const c = componentes.find((x) => x.uid === uid);
        if (c && (conteo.get(c.ium_id) ?? 0) > 1) repetidos.add(c.ium_nombre);
      }
    }
    if (repetidos.size) {
      setErrorSim(`Cada IUM solo puede unirse una vez. Quita las copias repetidas de: ${[...repetidos].join(", ")}.`);
      return;
    }

    setSimulando(true);
    try {
      const payload = {
        p_componentes: componentes.map((c) => ({ ium_id: c.ium_id, posicion: c.posicion })),
        p_enlaces: enlaces.flatMap((e) => {
          const or  = componentes.find((c) => c.uid === e.origen_uid);
          const dst = componentes.find((c) => c.uid === e.destino_uid);
          if (!or || !dst) return [];
          return [{ origen: or.ium_id, destino: dst.ium_id, tipo_union: e.tipo_union }];
        }),
        p_contexto: {},
      };
      const { data, error: err } = await supabase.rpc("simular_organizacion_ium_v1" as never, payload as never);
      if (err) {
        console.error(err);
        setErrorSim("El laboratorio no respondió. Inténtalo de nuevo.");
        return;
      }

      const res = (data as ResultadoSimulador) ?? { estado: "sin_respuesta" };
      setResultado(res);

      // ── Registrar intento en Supabase ─────────────────────────────────────
      if (perfilId) {
        const tipoResultado = clasificarResultado(res);
        const candidatos = res.procesos_candidatos ?? [];
        const principal = candidatos.find((p) => p.es_principal) ?? candidatos[0];

        const { data: regData } = await supabase.rpc("registrar_intento_simulador" as never, {
          p_perfil_id:             perfilId,
          p_ium_ids:               componentes.map((c) => c.ium_id),
          p_configuracion:         payload as never,
          p_resultado_tipo:        tipoResultado,
          p_proceso_id:            null,
          p_patrones_coincidentes: principal?.patrones_coincidentes ?? 0,
          p_patrones_totales:      principal?.patrones_totales ?? 0,
        } as never);

        // Procesar revelaciones
        const regResult = regData as { nuevas_revelaciones?: string[] } | null;
        if (regResult?.nuevas_revelaciones?.length) {
          // Buscar nombres y salidas de los IUMs revelados
          const reveladosInfo = regResult.nuevas_revelaciones.map((iumId) => {
            const iumDato = iumMap.get(iumId);
            const salidaPrincipal = salidas.find((s) => s.ium_id === iumId && s.es_principal);
            return {
              nombre: iumDato?.nombre ?? iumId,
              salida: salidaPrincipal?.nombre,
            };
          });
          setRevelaciones(reveladosInfo);
        }

        // Recargar estado de Eterium y conocimiento
        await Promise.all([recargarEterium(), recargarConocimiento()]);
      }

    } catch (e) {
      console.error(e);
      setErrorSim("El laboratorio no respondió. Inténtalo de nuevo.");
    } finally {
      setSimulando(false);
    }
  }, [componentes, enlaces, perfilId, clasificarResultado, iumMap, salidas, recargarEterium, recargarConocimiento]);

  // ── Scale actual ───────────────────────────────────────────────────────────

  const currentScale = 1;

  // ── Determinar resonancia por enlace (para resaltarlos en el canvas) ───────

  const enlacesConResonancia = useMemo(() => {
    if (!resultado || resultado.estado !== "simulado" || !resultado.proceso_principal) return new Set<string>();
    // Si hay proceso exitoso, todos los enlaces "brillan" — por ahora resaltamos todos
    return new Set(enlaces.map((e) => e.uid));
  }, [resultado, enlaces]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="sim-root">

      {/* ── Izquierda: catálogo ─────────────────────────────────────────────── */}
      <>
      {drawerIzq && <div onClick={() => setDrawerIzq(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "color-mix(in srgb, var(--bg-main) 50%, transparent)" }} />}
      <div className={`sim-panel-izq${drawerIzq ? " sim-panel-izq--open" : ""}`}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: "0 0 6px" }}>
            IUMs
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)", borderRadius: "var(--radius-btn)", padding: "3px 6px" }}>
            <Search size={9} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              style={{ border: "none", background: "transparent", fontSize: 10, color: "var(--foreground)", outline: "none", width: "100%" }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingIums ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (() => {
            const idsUsados = new Set(componentes.map((c) => c.ium_id));
            const usados = iumsFiltrados.filter((i) => idsUsados.has(i.id));
            const disponibles = iumsFiltrados.filter((i) => !idsUsados.has(i.id));
            return (
              <>
                {usados.map((ium) => {
                  const revelado = conocimiento.get(ium.id)?.funcion_revelada ?? false;
                  return (
                    <div
                      key={ium.id}
                      title={ium.detalle}
                      style={{ width: "100%", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, background: "color-mix(in srgb, var(--primary) 13%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--primary)" }}>
                          {ium.nombre}
                        </span>
                        {/* Composición — solo visible si fue revelado */}
                        {revelado && ium.composicion.length > 0 && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ium.composicion.map((c) => `${c.cantidad > 1 ? `${c.cantidad}×` : ""}${c.particula}`).join(" · ")}
                          </span>
                        )}
                        {!revelado && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 28%, transparent)", fontStyle: "italic" }}>
                            comportamiento desconocido
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {disponibles.map((ium) => {
                  const revelado = conocimiento.get(ium.id)?.funcion_revelada ?? false;
                  return (
                    <button
                      key={ium.id}
                      onClick={() => agregarIum(ium)}
                      title={ium.detalle}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 7%, transparent)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    >
                      <Plus size={8} style={{ flexShrink: 0, color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ium.nombre}
                        </span>
                        {/* Composición — solo si fue revelado */}
                        {revelado && ium.composicion.length > 0 && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 35%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ium.composicion.map((c) => `${c.cantidad > 1 ? `${c.cantidad}×` : ""}${c.particula}`).join(" · ")}
                          </span>
                        )}
                        {!revelado && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 25%, transparent)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            ?
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {!iumsFiltrados.length && (
                  <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 28%, transparent)", textAlign: "center", padding: "12px 8px", margin: 0 }}>Sin resultados</p>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Centro: canvas libre ────────────────────────────────────────────── */}
      </>

      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
        {componentes.length === 0 && !topoSeleccionada ? (
          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <FlaskConical size={32} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />
            <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)", textAlign: "center", maxWidth: 200, margin: 0, lineHeight: 1.6 }}>
              Agrega IUMs desde el panel izquierdo.<br />
              <span style={{ fontSize: 9 }}>Arrastra para mover · click derecho para unir</span>
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
            {/* Badge de Eterium */}
            <EteriumBadge
              saldo={eterium.saldo}
              saldoMaximo={eterium.saldo_maximo}
              costo={componentes.length > 0 ? costoEstimado : 0}
            />

            {/* Botón Probar flotante */}
            <button
              onClick={simular}
              disabled={!componentes.length || simulando}
              style={{
                position: "absolute", top: 12, right: 12, zIndex: 10,
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 999,
                background: "var(--primary)",
                color: "var(--btn-text)",
                border: "none",
                cursor: componentes.length && !simulando ? "pointer" : "not-allowed",
                opacity: componentes.length && !simulando ? 1 : 0.35,
                fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
              }}
            >
              {simulando
                ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Reaccionando…</>
                : <><Play size={10} /> Probar</>}
            </button>
            <svg
              ref={svgRef}
              style={{ flex: 1, display: "block", cursor: linkingFrom ? "crosshair" : "default", userSelect: "none" }}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              onMouseDown={(e) => { onCanvasMouseDown(e); }}
              onMouseMove={(e) => { onSVGMouseMove(e); }}
              onMouseUp={(e) => { onSVGMouseUp(e); }}
              onMouseLeave={() => { dragging.current = null; }}
              onContextMenu={(e) => {
                if (linkingFrom) { e.preventDefault(); setLinkingFrom(null); setLinkingMouse(null); setLinkingOver(null); }
              }}
            >
              <defs>
                <marker id={ARROW_ID} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                  <path d="M0,0.5 L0,5.5 L6.5,3 z" style={{ fill: ARROW_COLOR }} />
                </marker>
              </defs>

              {/* Uniones fantasma de la topología */}
              {topoSeleccionada && (() => {
                const slots = getSlotsActivos(topoSeleccionada);
                const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
                return topoSeleccionada.uniones.map((u, i) => {
                  const orPos  = slots[u.origen_posicion];
                  const dstPos = slots[u.destino_posicion];
                  if (!orPos || !dstPos) return null;
                  const orComp  = componentes.find((c) => c.posicion === toUI(u.origen_posicion));
                  const dstComp = componentes.find((c) => c.posicion === toUI(u.destino_posicion));
                  if (orComp && dstComp) return null;
                  const x1 = orComp  ? orComp.x  : orPos.x;
                  const y1 = orComp  ? orComp.y  : orPos.y;
                  const x2 = dstComp ? dstComp.x : dstPos.x;
                  const y2 = dstComp ? dstComp.y : dstPos.y;
                  return (
                    <ConnectionLine
                      key={`topo-${i}`}
                      x1={x1} y1={y1}
                      x2={x2} y2={y2}
                      tipo={u.tipo_union}
                      label={u.tipo_union}
                    />
                  );
                });
              })()}

              {/* Conexiones existentes */}
              {enlaces.map((e) => {
                const or  = componentes.find((c) => c.uid === e.origen_uid);
                const dst = componentes.find((c) => c.uid === e.destino_uid);
                if (!or || !dst) return null;
                return (
                  <ConnectionLine
                    key={e.uid}
                    x1={or.x} y1={or.y}
                    x2={dst.x} y2={dst.y}
                    tipo={e.tipo_union}
                    label={e.tipo_union}
                    resonancia={enlacesConResonancia.has(e.uid)}
                    onRemove={() => setEnlaces((prev) => prev.filter((x) => x.uid !== e.uid))}
                  />
                );
              })}

              {/* Línea de enlace en progreso */}
              {linkingFrom && linkingMouse && (() => {
                const from = componentes.find((c) => c.uid === linkingFrom);
                if (!from) return null;
                return (
                  <line
                    x1={from.x} y1={from.y}
                    x2={linkingMouse.x} y2={linkingMouse.y}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    style={{ stroke: "var(--primary)", pointerEvents: "none" }}
                  />
                );
              })()}

              {/* Grid de slots de topología */}
              {topoSeleccionada && (() => {
                const slots = Object.entries(getSlotsActivos(topoSeleccionada));
                const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
                return slots.map(([key, pos]) => {
                  const posUI = toUI(key);
                  const ocupado = componentes.some((c) => c.posicion === posUI);
                  const esDragPreview = dragSlotPreview?.key === key;
                  return (
                    <g key={key}
                      onClick={!ocupado ? (e) => {
                        e.stopPropagation();
                        setSlotDropdown(slotDropdown?.key === key ? null : { key, posUI, x: pos.x, y: pos.y });
                        setBusquedaSlot("");
                      } : undefined}
                      style={!ocupado ? { cursor: "pointer" } : undefined}
                    >
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_R + 10}
                        fill={slotDropdown?.key === key
                          ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                          : esDragPreview
                            ? "color-mix(in srgb, var(--primary) 16%, transparent)"
                            : "color-mix(in srgb, var(--primary) 4%, transparent)"}
                        stroke={slotDropdown?.key === key
                          ? "var(--primary)"
                          : esDragPreview
                            ? "color-mix(in srgb, var(--primary) 70%, transparent)"
                            : ocupado
                              ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                              : "color-mix(in srgb, var(--primary) 28%, transparent)"}
                        strokeWidth={slotDropdown?.key === key ? 2 : esDragPreview ? 2 : 1}
                        strokeDasharray={ocupado ? undefined : "4 3"}
                        style={{ transition: "fill 0.15s, stroke 0.15s" }}
                      />
                      <text
                        x={pos.x} y={pos.y - (NODE_R + 10) + 14}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 10, fontWeight: 800,
                          fill: slotDropdown?.key === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                          pointerEvents: "none", userSelect: "none", letterSpacing: "0.12em",
                        }}
                      >
                        {posUI}
                      </text>
                      {!ocupado && (
                        <text
                          x={pos.x} y={pos.y + 6}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: 26, fontWeight: 200,
                            fill: slotDropdown?.key === key
                              ? "var(--primary)"
                              : "color-mix(in srgb, var(--primary) 28%, transparent)",
                            pointerEvents: "none", userSelect: "none",
                            transition: "fill 0.15s",
                          }}
                        >
                          +
                        </text>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Nodos */}
              {componentes.map((comp) => (
                <g key={comp.uid} data-ium-node="true">
                  <IumNodeSVG
                    comp={comp}
                    iumData={iumMap.get(comp.ium_id)}
                    salidas={salidas.filter((s) => s.ium_id === comp.ium_id)}
                    selected={false}
                    linking={linkingFrom === comp.uid}
                    funcionRevelada={conocimiento.get(comp.ium_id)?.funcion_revelada ?? false}
                    reaccion={
                      !resultado || resultado.estado !== "simulado" ? null
                      : resultado.proceso_principal ? "exito"
                      : (resultado.ambiguo || (resultado.procesos_candidatos?.length ?? 0) > 0) ? "inestable"
                      : null
                    }
                    scale={currentScale}
                    onMouseDownDrag={(e) => onNodeMouseDown(comp.uid, e)}
                    onContextMenu={(e) => onNodeContextMenu(comp.uid, e)}
                    onRemove={() => {
                      setComponentes((prev) => prev.filter((c) => c.uid !== comp.uid));
                      setEnlaces((prev) => prev.filter((e) => e.origen_uid !== comp.uid && e.destino_uid !== comp.uid));
                    }}
                    onMouseEnter={() => setLinkingOver(comp.uid)}
                    onMouseLeave={() => setLinkingOver(null)}
                  />
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* ── Derecha: resultados ─────────────────────────────────────────────── */}
      <>
      {drawerDer && <div onClick={() => setDrawerDer(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "color-mix(in srgb, var(--bg-main) 50%, transparent)" }} />}
      <div className={`sim-panel-der${drawerDer ? " sim-panel-der--open" : ""}`}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: 0, flex: 1 }}>
            Organización
          </p>
          <button className="sim-btn-close-drawer" onClick={() => setDrawerDer(false)}
            style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <X size={14} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Selector de topología */}
          <div>
            <button
              onClick={() => { setTopoSeleccionada(null); setEnlaces([]); setAvisoTopo(null); }}
              style={{
                width: "100%", textAlign: "left", border: "1px solid",
                borderColor: !topoSeleccionada
                  ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                background: !topoSeleccionada
                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : "transparent",
                cursor: "pointer", padding: "5px 9px", borderRadius: "var(--radius-btn)",
                fontSize: 9, fontStyle: "italic", marginBottom: 4,
                color: !topoSeleccionada ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                fontWeight: !topoSeleccionada ? 700 : 400,
              }}
            >
              Libre — sin forma fija
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {topologias.map((t) => {
                const activa = topoSeleccionada?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => aplicarTopologia(t)}
                    style={{
                      width: "100%", textAlign: "left", border: "1px solid",
                      borderColor: activa
                        ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                        : "color-mix(in srgb, var(--primary) 12%, transparent)",
                      background: activa
                        ? "color-mix(in srgb, var(--primary) 9%, transparent)"
                        : "transparent",
                      cursor: "pointer", padding: "5px 9px",
                      borderRadius: "var(--radius-btn)",
                      opacity: t.activo ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (!activa) (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
                    }}
                    onMouseLeave={(e) => {
                      if (!activa) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: activa ? 800 : 400, color: activa ? "var(--primary)" : "var(--foreground)" }}>
                      {t.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uniones */}
          {enlaces.length > 0 && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--primary) 38%, transparent)", margin: "0 0 4px" }}>
                Uniones ({enlaces.length})
              </p>
              {enlaces.map((e) => {
                const or  = componentes.find((c) => c.uid === e.origen_uid);
                const dst = componentes.find((c) => c.uid === e.destino_uid);
                return (
                  <div key={e.uid} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, fontSize: 9 }}>
                    <span style={{ fontWeight: 700 }}>{or?.posicion}</span>
                    <span style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>→</span>
                    <span style={{ fontWeight: 700 }}>{dst?.posicion}</span>
                    <select
                      value={e.tipo_union}
                      onChange={(ev) => setEnlaces((prev) => prev.map((x) => x.uid === e.uid ? { ...x, tipo_union: ev.target.value } : x))}
                      style={{ fontSize: 8, background: "transparent", border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)", borderRadius: 3, color: "var(--foreground)", padding: "1px 3px" }}
                    >
                      {TIPOS_UNION.map((t) => <option key={t} value={t}>{NOMBRE_UNION[t] ?? t}</option>)}
                    </select>
                    <button onClick={() => setEnlaces((prev) => prev.filter((x) => x.uid !== e.uid))}
                      style={{ border: "none", background: "none", cursor: "pointer", padding: 0, marginLeft: "auto" }}>
                      <X size={8} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal tipo de unión ──────────────────────────────────────────────── */}
      </>

      {/* ── Modal añadir IUM a slot ─────────────────────────────────────────── */}
      {slotDropdown && (() => {
        const { key, posUI, x: sx, y: sy } = slotDropdown;
        const iumsDisponibles = iums.filter((u) => {
          const ya = componentes.some((c) => c.ium_id === u.id);
          const q = busquedaSlot.toLowerCase().trim();
          return !ya && (!q || u.nombre.toLowerCase().includes(q) || u.detalle.toLowerCase().includes(q));
        });
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--bg-main) 60%, transparent)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => { setSlotDropdown(null); setBusquedaSlot(""); }}
          >
            <div
              style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", width: 260, maxHeight: 380 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)" }}>{posUI}</span>
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 45%, transparent)", flex: 1 }}>Elige un IUM</span>
                <button
                  onClick={() => { setSlotDropdown(null); setBusquedaSlot(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
                >
                  <X size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                </button>
              </div>
              <div style={{ padding: "7px 12px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
                <Search size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
                <input
                  autoFocus
                  value={busquedaSlot}
                  onChange={(e) => setBusquedaSlot(e.target.value)}
                  placeholder="Buscar..."
                  style={{ border: "none", background: "transparent", fontSize: 10, outline: "none", width: "100%", color: "var(--foreground)" }}
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {iumsDisponibles.length === 0 && (
                  <p style={{ fontSize: 9, textAlign: "center", padding: "14px 12px", margin: 0, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    {componentes.length >= (Object.keys(getSlotsActivos(topoSeleccionada!)).length) ? "Topología llena" : "Sin resultados"}
                  </p>
                )}
                {iumsDisponibles.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => elegirIumEnSlot(u, key, posUI, sx, sy)}
                    style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "7px 14px", display: "flex", flexDirection: "column", gap: 2 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 7%, transparent)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{u.nombre}</span>
                    <span style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 38%, transparent)", fontStyle: "italic" }}>
                      {conocimiento.get(u.id)?.funcion_revelada ? "conocido" : "desconocido"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {modalTipo && (() => {
        const or  = componentes.find((c) => c.uid === modalTipo.origenUid);
        const dst = componentes.find((c) => c.uid === modalTipo.destinoUid);
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--bg-main) 72%, transparent)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setModalTipo(null)}
          >
            <div
              style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "var(--radius-card)", padding: 16, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={11} />
                <span style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>Nueva unión</span>
                <button onClick={() => setModalTipo(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
              </div>
              <p style={{ fontSize: 9, margin: 0, color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                <strong style={{ color: "var(--foreground)" }}>{or?.posicion} {or?.ium_nombre}</strong>
                {" → "}
                <strong style={{ color: "var(--foreground)" }}>{dst?.posicion} {dst?.ium_nombre}</strong>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tipo de unión</label>
                <select value={linkingTipo} onChange={(e) => setLinkingTipo(e.target.value)}
                  style={{ fontSize: 10, padding: "4px 6px", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", borderRadius: "var(--radius-btn)", background: "transparent", color: "var(--foreground)" }}>
                  {TIPOS_UNION.map((t) => <option key={t} value={t}>{NOMBRE_UNION[t] ?? t}</option>)}
                </select>
              </div>
              <button onClick={confirmarEnlace}
                style={{ padding: "6px 0", borderRadius: "var(--radius-btn)", background: "var(--primary)", color: "var(--btn-text)", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                Confirmar unión
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── FABs móvil ─────────────────────────────────────────────────────── */}
      <button
        className="sim-fab-izq"
        onClick={() => { setDrawerIzq(true); setDrawerDer(false); }}
        title="IUMs"
        style={{ display: "none" }}
      >
        <Plus size={20} />
      </button>
      <button
        className="sim-fab-der"
        onClick={() => { setDrawerDer(true); setDrawerIzq(false); }}
        title="Organización"
        style={{ display: "none" }}
      >
        <Network size={18} />
      </button>

      {/* ── Modal resultado ─────────────────────────────────────────────────── */}
      {(resultado || errorSim) && (
        <div
          className="sim-modal-res"
          onClick={() => { setResultado(null); setErrorSim(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "color-mix(in srgb, var(--bg-main) 55%, transparent)",
            padding: "20px 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-main)",
              border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
              borderRadius: 16,
              width: "100%", maxWidth: 360,
              overflow: "hidden",
              animation: "modal-aparecer 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 0" }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                Resultado
              </span>
              <button
                onClick={() => { setResultado(null); setErrorSim(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1, display: "flex" }}
              >
                <X size={13} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
              </button>
            </div>

            <div style={{ padding: "10px 16px 18px" }}>
              {errorSim ? (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={14} style={{ color: "var(--error,#ef4444)", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, margin: "0 0 3px", color: "var(--error,#ef4444)" }}>Error del motor</p>
                    <p style={{ fontSize: 9, margin: 0 }}>{errorSim}</p>
                  </div>
                </div>
              ) : resultado ? (
                <ResultadoPanel resultado={resultado} nombreIum={(id) => (id ? iumMap.get(id)?.nombre ?? id : "Un IUM")} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de descubrimiento (revelación de función) ──────────────────── */}
      {revelaciones.length > 0 && (
        <ModalDescubrimiento
          iums={revelaciones}
          onCerrar={() => setRevelaciones([])}
        />
      )}

      <style>{`
        /* ── Layout ── */
        .sim-root {
          --sim-nav: 56px; --sim-top: 61px;
          display: grid; grid-template-columns: 190px 1fr 260px; height: calc(100vh - 80px); overflow: hidden;
        }
        .sim-panel-izq { border-right: 1px solid color-mix(in srgb, var(--primary) 12%, transparent); display: flex; flex-direction: column; overflow: hidden; }
        .sim-panel-der { display: flex; flex-direction: column; overflow: hidden; }
        /* ── FABs móvil (base ocultos) ── */
        .sim-fab-izq, .sim-fab-der {
          position: fixed; bottom: 24px; z-index: 500;
          width: 50px; height: 50px; border-radius: 50%;
          background: var(--primary); color: var(--btn-text);
          border: none; cursor: pointer;
          align-items: center; justify-content: center;
          transition: transform .15s ease;
        }
        .sim-fab-izq:active, .sim-fab-der:active { transform: scale(0.93); }
        .sim-fab-izq { left: 16px; }
        .sim-fab-der { right: 16px; }
        /* ── Móvil ── */
        @media (max-width: 700px) {
          .sim-root { grid-template-columns: 1fr; height: calc(100vh - var(--sim-top) - var(--sim-nav)); height: calc(100dvh - var(--sim-top) - var(--sim-nav)); margin-bottom: -5rem; }
          .sim-panel-izq { position: fixed; inset: 0 auto var(--sim-nav) 0; width: min(80vw,300px); z-index: 400; background: var(--bg-main); border-right: 1px solid color-mix(in srgb,var(--primary) 18%,transparent); transform: translateX(-105%); transition: transform .25s ease; }
          .sim-panel-izq--open { transform: translateX(0); }
          .sim-panel-der { position: fixed; inset: 0 0 var(--sim-nav) auto; width: min(85vw,320px); z-index: 400; background: var(--bg-main); border-left: 1px solid color-mix(in srgb,var(--primary) 18%,transparent); transform: translateX(105%); transition: transform .25s ease; }
          .sim-panel-der--open { transform: translateX(0); }
          .sim-btn-close-drawer { display: flex !important; }
          .sim-fab-izq, .sim-fab-der { display: flex !important; bottom: calc(var(--sim-nav) + 16px); }
          .sim-modal-res { padding-bottom: calc(var(--sim-nav) + 20px) !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes aparecer { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes latido { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes destello { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.95; } }
        @keyframes modal-aparecer { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
