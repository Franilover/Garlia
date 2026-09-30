"use client";

/**
 * SimuladorIUM.tsx — Laboratorio visual de IUMs
 *
 * Canvas SVG central: cada IUM se muestra con su gráfico real de partículas
 * (IumVisual) y las uniones se dibujan como flechas SVG con bezier.
 *
 * SUPABASE MANDA: no se inventa ningún IUM, proceso, ORIS ni resultado.
 */

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Link2,
  Loader2,
  Play,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import {
  IumVisual,
  type GeometriaIum,
} from "@/domains/garlia/fisica/ParticulaVisual";
import {
  particulasDeIum,
  PARTICULA_QUIMICA_FORMULA,
  type FilaIum,
} from "@/domains/garlia/fisica/types";

// ─── Tipos ──────────────────────────────────────────────────────────────────

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

interface ComponenteLab {
  uid: string;
  ium_id: string;
  ium_nombre: string;
  posicion: string;
}

interface EnlaceLab {
  uid: string;
  origen_uid: string;
  destino_uid: string;
  tipo_union: string;
}

interface ResultadoSimulador {
  estado?: string;
  componentes?: unknown[];
  enlaces?: unknown[];
  salidas_funcionales?: unknown[];
  procesos_candidatos?: unknown[];
  cantidad_candidatos?: number;
  oris_candidatos?: unknown[];
  incompatibilidades?: unknown[];
  motivos?: string[];
  [key: string]: unknown;
}

// ─── Constantes canvas ──────────────────────────────────────────────────────

const POSICIONES = ["A", "B", "C", "D", "N", "M", "X", "Y", "Z"];
const TIPOS_UNION = ["dirigida", "bidireccional", "convergente", "divergente"];
const VISUAL_SIZE = 80;   // px del IumVisual
const VISUAL_R   = VISUAL_SIZE / 2;
const LABEL_H    = 36;    // espacio nombre + posición bajo el visual
const NODE_H     = VISUAL_SIZE + LABEL_H;
const V_GAP      = 72;
const NODE_STEP  = NODE_H + V_GAP;
const TOP_PAD    = 24;
const CANVAS_CX  = 140;  // centro horizontal de los nodos

let uidCounter = 0;
const genUID = () => `lab_${++uidCounter}_${Date.now()}`;

// ─── Hooks de datos ──────────────────────────────────────────────────────────

/** Trae iums + composición de partículas + geometría en una sola batería de queries */
function useIumsCatalogo() {
  const [iums, setIums] = useState<IumCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;

    async function cargar() {
      // 1) IUMs base
      const { data: baseData } = await supabase
        .from("iums")
        .select("id, orden, nombre, detalle, extra")
        .order("orden");

      // 2) Relación IUM → partículas (id, nombre) a través de iums_particulas
      const { data: pRelData } = await supabase
        .from("iums_particulas")
        .select("ium_id, particula_id, cantidad");

      // 3) Partículas (id, nombre) para resolver el nombre
      const { data: partData } = await supabase
        .from("particulas")
        .select("id, nombre");

      // 4) Geometría
      const { data: geoData } = await supabase
        .from("v_iums_geometria_canonica_v1")
        .select("ium_id, geometria");

      if (!vivo) return;

      const nombreDePart = new Map<string, string>(
        (partData ?? []).map((p: { id: string; nombre: string }) => [p.id, p.nombre]),
      );

      // Composición por ium_id
      const composPorIum = new Map<string, { particula: string; cantidad: number }[]>();
      for (const fila of pRelData ?? []) {
        const nombre = nombreDePart.get(fila.particula_id);
        if (!nombre) continue;
        const arr = composPorIum.get(fila.ium_id) ?? [];
        arr.push({ particula: nombre, cantidad: fila.cantidad });
        composPorIum.set(fila.ium_id, arr);
      }

      // Geometría por ium_id
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

// ─── Helpers de posición de nodo ────────────────────────────────────────────

function nodeCY(index: number) {
  return TOP_PAD + index * NODE_STEP + VISUAL_R;
}

// ─── Flecha SVG ──────────────────────────────────────────────────────────────

const ARROW_COLOR = "color-mix(in srgb, var(--primary) 55%, transparent)";
const ARROW_MARKER_ID = "sim-arrow";

function ConnectionPath({
  x1, y1, x2, y2, label, tipo,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label?: string; tipo: string;
}) {
  const downward = y2 > y1;
  const mid = (y1 + y2) / 2;
  const sameColumn = x1 === x2;

  let d: string;
  if (sameColumn && downward) {
    // Curva suave hacia abajo
    d = `M ${x1} ${y1} C ${x1} ${y1 + 40} ${x2} ${y2 - 40} ${x2} ${y2}`;
  } else {
    // Conexión cruzada: curva lateral
    const offset = 80;
    d = `M ${x1} ${y1} C ${x1 + offset} ${y1 + 30} ${x2 + offset} ${y2 - 30} ${x2} ${y2}`;
  }

  const midX = sameColumn ? x1 : x1 + 50;
  const midY = mid;

  return (
    <g>
      <path
        d={d}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray={tipo === "bidireccional" ? "4 3" : undefined}
        markerEnd={`url(#${ARROW_MARKER_ID})`}
        style={{ stroke: ARROW_COLOR }}
      />
      {label && (
        <text
          x={midX + 6}
          y={midY}
          fontSize={8}
          fontWeight={700}
          dominantBaseline="central"
          style={{ fill: ARROW_COLOR, letterSpacing: "0.04em" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ─── Nodo de IUM en el canvas ────────────────────────────────────────────────

function IumNode({
  comp,
  iumData,
  salidas,
  posicionesUsadas,
  index,
  onRemove,
  onPosicion,
}: {
  comp: ComponenteLab;
  iumData: IumCatalogo | undefined;
  salidas: IumSalidaFuncional[];
  posicionesUsadas: string[];
  index: number;
  onRemove: () => void;
  onPosicion: (p: string) => void;
}) {
  const cy = nodeCY(index);
  const topY = cy - VISUAL_R;
  const labelY = cy + VISUAL_R + 4;

  const principal = salidas.find((s) => s.es_principal);
  const disponibles = POSICIONES.filter(
    (p) => p === comp.posicion || !posicionesUsadas.includes(p),
  );

  // Datos para IumVisual
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

  return (
    <g>
      {/* Halo de fondo */}
      <circle
        cx={CANVAS_CX}
        cy={cy}
        r={VISUAL_R + 6}
        style={{
          fill: "color-mix(in srgb, var(--primary) 5%, transparent)",
          stroke: "color-mix(in srgb, var(--primary) 18%, transparent)",
          strokeWidth: 1,
        }}
      />

      {/* IumVisual como foreignObject */}
      <foreignObject
        x={CANVAS_CX - VISUAL_R}
        y={topY}
        width={VISUAL_SIZE}
        height={VISUAL_SIZE}
        style={{ overflow: "visible" }}
      >
        <div style={{ width: VISUAL_SIZE, height: VISUAL_SIZE }}>
          <IumVisual
            particulas={particulas}
            geometria={iumData?.geometria}
            size={VISUAL_SIZE}
            showToggle={false}
          />
        </div>
      </foreignObject>

      {/* Badge de posición */}
      <circle
        cx={CANVAS_CX + VISUAL_R - 2}
        cy={cy - VISUAL_R + 2}
        r={10}
        style={{ fill: "var(--primary)" }}
      />
      <text
        x={CANVAS_CX + VISUAL_R - 2}
        y={cy - VISUAL_R + 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={8}
        fontWeight={900}
        style={{ fill: "#fff" }}
      >
        {comp.posicion}
      </text>

      {/* Nombre */}
      <text
        x={CANVAS_CX}
        y={labelY + 8}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={10}
        fontWeight={700}
        style={{ fill: "var(--fg-main)" }}
      >
        {comp.ium_nombre}
      </text>

      {/* Salida principal */}
      {principal && (
        <text
          x={CANVAS_CX}
          y={labelY + 22}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={8}
          style={{ fill: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
        >
          ↳ {principal.nombre}
        </text>
      )}

      {/* Botón eliminar */}
      <foreignObject
        x={CANVAS_CX + VISUAL_R + 6}
        y={cy - 8}
        width={16}
        height={16}
      >
        <button
          onClick={onRemove}
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            background: "var(--bg-main)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <X size={8} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
        </button>
      </foreignObject>

      {/* Selector de posición */}
      <foreignObject
        x={CANVAS_CX - VISUAL_R - 52}
        y={cy - 11}
        width={48}
        height={22}
      >
        <select
          value={comp.posicion}
          onChange={(e) => onPosicion(e.target.value)}
          style={{
            width: 48,
            fontSize: 9,
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
            borderRadius: 4,
            color: "var(--fg-main)",
            padding: "2px 3px",
          }}
        >
          {disponibles.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </foreignObject>
    </g>
  );
}

// ─── Sub-componente: resultado del motor ─────────────────────────────────────

function ResultadoPanel({ resultado }: { resultado: ResultadoSimulador }) {
  const [expandido, setExpandido] = useState(true);

  const candidatos = resultado.procesos_candidatos as Array<{ nombre?: string }> | undefined;
  const oris       = resultado.oris_candidatos as Array<{ nombre?: string }> | undefined;
  const incomp     = resultado.incompatibilidades as Array<{ motivo?: string; descripcion?: string }> | undefined;
  const motivos    = resultado.motivos as string[] | undefined;
  const hayError   = resultado.estado === "incompatible" || resultado.estado === "error" || !!(incomp?.length);

  return (
    <div
      style={{
        border: `1px solid ${hayError ? "color-mix(in srgb, var(--error,#ef4444) 40%, transparent)" : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpandido(!expandido)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          border: "none",
          cursor: "pointer",
        }}
      >
        {expandido ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
        <span style={{ fontSize: 9, fontWeight: 700, flex: 1 }}>Resultado del motor</span>
        {resultado.estado && (
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 999,
            background: hayError ? "var(--error,#ef4444)" : "var(--success,#22c55e)",
            color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {resultado.estado}
          </span>
        )}
      </button>

      {expandido && (
        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
          {/* Procesos */}
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: "0 0 4px" }}>
              Procesos candidatos ({resultado.cantidad_candidatos ?? candidatos?.length ?? 0})
            </p>
            {candidatos?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {candidatos.map((p, i) => (
                  <span key={i} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "color-mix(in srgb, var(--primary) 12%, transparent)", fontWeight: 600 }}>
                    ✓ {p.nombre ?? JSON.stringify(p)}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 30%, transparent)", margin: 0 }}>Sin procesos candidatos</p>
            )}
          </div>

          {/* ORIS */}
          {!!oris?.length && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: "0 0 4px" }}>
                ORIS candidatos
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {oris.map((o, i) => (
                  <span key={i} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", fontWeight: 600 }}>
                    <Zap size={7} style={{ display: "inline", marginRight: 2 }} />
                    {o.nombre ?? JSON.stringify(o)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Incompatibilidades */}
          {hayError && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--error,#ef4444) 80%, var(--fg-main))", margin: "0 0 3px" }}>
                Incompatibilidades
              </p>
              {incomp?.map((inc, i) => (
                <div key={i} style={{ display: "flex", gap: 5, fontSize: 9, color: "color-mix(in srgb, var(--error,#ef4444) 70%, var(--fg-main))", marginBottom: 2 }}>
                  <AlertTriangle size={9} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{inc.motivo ?? inc.descripcion ?? JSON.stringify(inc)}</span>
                </div>
              ))}
              {motivos?.map((m, i) => (
                <p key={i} style={{ fontSize: 9, margin: "2px 0 0", color: "color-mix(in srgb, var(--error,#ef4444) 60%, var(--fg-main))" }}>• {m}</p>
              ))}
            </div>
          )}

          {/* JSON completo */}
          <details>
            <summary style={{ fontSize: 8, fontWeight: 700, cursor: "pointer", color: "color-mix(in srgb, var(--primary) 40%, transparent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Respuesta completa
            </summary>
            <pre style={{ fontSize: 7.5, overflow: "auto", maxHeight: 200, background: "color-mix(in srgb, var(--primary) 5%, transparent)", borderRadius: 4, padding: 6, marginTop: 3, color: "color-mix(in srgb, var(--primary) 65%, transparent)", lineHeight: 1.4 }}>
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function SimuladorIUM() {
  const { iums, loading: loadingIums } = useIumsCatalogo();
  const [busqueda, setBusqueda] = useState("");
  const [componentes, setComponentes] = useState<ComponenteLab[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceLab[]>([]);

  // Modal enlace
  const [modalEnlace, setModalEnlace]       = useState(false);
  const [enlaceOrigen, setEnlaceOrigen]     = useState("");
  const [enlaceDestino, setEnlaceDestino]   = useState("");
  const [enlaceTipo, setEnlaceTipo]         = useState("dirigida");

  // Simulador
  const [simulando, setSimulando]     = useState(false);
  const [resultado, setResultado]     = useState<ResultadoSimulador | null>(null);
  const [errorSim, setErrorSim]       = useState<string | null>(null);

  const iumIds  = useMemo(() => componentes.map((c) => c.ium_id), [componentes]);
  const salidas = useIumSalidas(iumIds);

  const iumMap = useMemo(
    () => new Map(iums.map((i) => [i.id, i])),
    [iums],
  );

  const iumsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return q ? iums.filter((i) => i.nombre.toLowerCase().includes(q) || i.detalle.toLowerCase().includes(q)) : iums;
  }, [iums, busqueda]);

  const posicionesUsadas = useMemo(() => componentes.map((c) => c.posicion), [componentes]);

  // Altura del canvas SVG
  const canvasH = useMemo(
    () => Math.max(220, TOP_PAD * 2 + componentes.length * NODE_STEP),
    [componentes.length],
  );
  // Ancho: espacio para nodo + selector izq + botón der + margen etiqueta conexión
  const canvasW = 320;

  // Agregar IUM
  const agregarIum = useCallback((ium: IumCatalogo) => {
    const posLibre = POSICIONES.find((p) => !posicionesUsadas.includes(p)) ?? "X";
    setComponentes((prev) => [...prev, { uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre, posicion: posLibre }]);
  }, [posicionesUsadas]);

  const cambiarPosicion = useCallback((uid: string, p: string) =>
    setComponentes((prev) => prev.map((c) => c.uid === uid ? { ...c, posicion: p } : c)), []);

  const eliminarComponente = useCallback((uid: string) => {
    setComponentes((prev) => prev.filter((c) => c.uid !== uid));
    setEnlaces((prev) => prev.filter((e) => e.origen_uid !== uid && e.destino_uid !== uid));
  }, []);

  const agregarEnlace = useCallback(() => {
    if (!enlaceOrigen || !enlaceDestino || enlaceOrigen === enlaceDestino) return;
    setEnlaces((prev) => [...prev, { uid: genUID(), origen_uid: enlaceOrigen, destino_uid: enlaceDestino, tipo_union: enlaceTipo }]);
    setModalEnlace(false);
    setEnlaceOrigen(""); setEnlaceDestino(""); setEnlaceTipo("dirigida");
  }, [enlaceOrigen, enlaceDestino, enlaceTipo]);

  const cambiarTipoUnion = useCallback((uid: string, t: string) =>
    setEnlaces((prev) => prev.map((e) => e.uid === uid ? { ...e, tipo_union: t } : e)), []);

  const limpiar = useCallback(() => {
    setComponentes([]); setEnlaces([]); setResultado(null); setErrorSim(null);
  }, []);

  const simular = useCallback(async () => {
    if (!componentes.length) return;
    setSimulando(true); setResultado(null); setErrorSim(null);
    try {
      const payload = {
        componentes: componentes.map((c) => ({ ium_id: c.ium_id, posicion: c.posicion })),
        enlaces: enlaces.map((e) => {
          const or  = componentes.find((c) => c.uid === e.origen_uid);
          const dst = componentes.find((c) => c.uid === e.destino_uid);
          return { origen: or?.posicion ?? "", destino: dst?.posicion ?? "", tipo_union: e.tipo_union };
        }),
        contexto: {},
      };
      const { data, error: err } = await supabase.rpc("simular_organizacion_ium_v1" as never, payload as never);
      if (err) setErrorSim(err.message);
      else setResultado((data as ResultadoSimulador) ?? { estado: "sin_respuesta" });
    } catch (e) {
      setErrorSim(e instanceof Error ? e.message : String(e));
    } finally {
      setSimulando(false);
    }
  }, [componentes, enlaces]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "grid", gridTemplateColumns: "190px 1fr 260px", height: "calc(100vh - 80px)", overflow: "hidden" }}>

      {/* ── Izquierda: catálogo ──────────────────────────────────────────────── */}
      <div style={{ borderRight: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
              style={{ border: "none", background: "transparent", fontSize: 10, color: "var(--fg-main)", outline: "none", width: "100%" }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingIums ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : iumsFiltrados.map((ium) => (
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
                {ium.composicion.length > 0 && (
                  <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 35%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ium.composicion.map((c) => `${c.cantidad > 1 ? `${c.cantidad}×` : ""}${c.particula}`).join(" · ")}
                  </span>
                )}
              </div>
            </button>
          ))}
          {!loadingIums && !iumsFiltrados.length && (
            <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 28%, transparent)", textAlign: "center", padding: "12px 8px", margin: 0 }}>Sin resultados</p>
          )}
        </div>
      </div>

      {/* ── Centro: canvas SVG ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", flexShrink: 0 }}>
          <FlaskConical size={10} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 40%, transparent)", flex: 1 }}>
            Canvas — {componentes.length} IUM{componentes.length !== 1 ? "s" : ""}
          </span>
          {componentes.length > 1 && (
            <button onClick={() => setModalEnlace(true)}
              style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", background: "transparent", cursor: "pointer", color: "var(--fg-main)" }}>
              <Link2 size={9} /> Unir
            </button>
          )}
          {componentes.length > 0 && (
            <button onClick={limpiar}
              style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 4px", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              <Trash2 size={10} />
            </button>
          )}
        </div>

        {/* SVG canvas scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {componentes.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
              <FlaskConical size={32} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />
              <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)", textAlign: "center", maxWidth: 180, margin: 0, lineHeight: 1.6 }}>
                Agrega IUMs desde el panel izquierdo
              </p>
            </div>
          ) : (
            <svg
              width="100%"
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              style={{ display: "block", minHeight: canvasH }}
            >
              <defs>
                <marker
                  id={ARROW_MARKER_ID}
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0.5 L0,5.5 L6.5,3 z" style={{ fill: ARROW_COLOR }} />
                </marker>
              </defs>

              {/* Conexiones */}
              {enlaces.map((e) => {
                const iOr  = componentes.findIndex((c) => c.uid === e.origen_uid);
                const iDst = componentes.findIndex((c) => c.uid === e.destino_uid);
                if (iOr < 0 || iDst < 0) return null;
                const y1 = nodeCY(iOr) + VISUAL_R + 4;
                const y2 = nodeCY(iDst) - VISUAL_R - 4;
                return (
                  <ConnectionPath
                    key={e.uid}
                    x1={CANVAS_CX} y1={y1}
                    x2={CANVAS_CX} y2={y2}
                    tipo={e.tipo_union}
                    label={e.tipo_union}
                  />
                );
              })}

              {/* Nodos */}
              {componentes.map((comp, i) => (
                <IumNode
                  key={comp.uid}
                  comp={comp}
                  iumData={iumMap.get(comp.ium_id)}
                  salidas={salidas.filter((s) => s.ium_id === comp.ium_id)}
                  posicionesUsadas={posicionesUsadas}
                  index={i}
                  onRemove={() => eliminarComponente(comp.uid)}
                  onPosicion={(p) => cambiarPosicion(comp.uid, p)}
                />
              ))}
            </svg>
          )}
        </div>

        {/* Botón simular */}
        <div style={{ padding: "6px 10px", borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", flexShrink: 0 }}>
          <button
            onClick={simular}
            disabled={!componentes.length || simulando}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 0",
              borderRadius: "var(--radius-btn)",
              background: componentes.length && !simulando ? "var(--primary)" : "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: componentes.length && !simulando ? "#fff" : "color-mix(in srgb, var(--primary) 35%, transparent)",
              border: "none",
              cursor: componentes.length && !simulando ? "pointer" : "not-allowed",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            {simulando
              ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Simulando...</>
              : <><Play size={10} /> Simular</>
            }
          </button>
        </div>
      </div>

      {/* ── Derecha: resultados ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", flexShrink: 0 }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: 0 }}>
            Organización
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Resumen */}
          {componentes.length > 0 && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--primary) 38%, transparent)", margin: "0 0 5px" }}>
                IUMs seleccionados
              </p>
              {componentes.map((c) => {
                const principal = salidas.filter((s) => s.ium_id === c.ium_id).find((s) => s.es_principal);
                return (
                  <div key={c.uid} style={{ marginBottom: 5 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>{c.posicion}</span>
                      <span style={{ fontSize: 10, fontWeight: 700 }}>{c.ium_nombre}</span>
                    </div>
                    {principal && (
                      <p style={{ fontSize: 8, margin: 0, paddingLeft: 12, color: "color-mix(in srgb, var(--primary) 42%, transparent)" }}>
                        ↳ {principal.nombre}
                      </p>
                    )}
                  </div>
                );
              })}

              {enlaces.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--primary) 38%, transparent)", margin: "0 0 4px" }}>
                    Uniones
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
                          onChange={(ev) => cambiarTipoUnion(e.uid, ev.target.value)}
                          style={{ fontSize: 8, background: "transparent", border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)", borderRadius: 3, color: "var(--fg-main)", padding: "1px 3px" }}
                        >
                          {TIPOS_UNION.map((t) => <option key={t} value={t}>{t}</option>)}
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
          )}

          {/* Error simulador */}
          {errorSim && (
            <div style={{ padding: "7px 9px", borderRadius: "var(--radius-card)", border: "1px solid color-mix(in srgb, var(--error,#ef4444) 35%, transparent)", background: "color-mix(in srgb, var(--error,#ef4444) 6%, transparent)" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <AlertTriangle size={10} style={{ color: "var(--error,#ef4444)", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, margin: "0 0 2px", color: "var(--error,#ef4444)" }}>Error del motor</p>
                  <p style={{ fontSize: 8, margin: 0 }}>{errorSim}</p>
                  <p style={{ fontSize: 7.5, margin: "4px 0 0", color: "color-mix(in srgb, var(--primary) 32%, transparent)" }}>
                    La RPC simular_organizacion_ium_v1 puede no estar disponible aún o requiere parámetros distintos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {resultado && <ResultadoPanel resultado={resultado} />}

          {!resultado && !errorSim && !componentes.length && (
            <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 22%, transparent)", textAlign: "center", padding: "20px 8px", margin: 0, lineHeight: 1.6 }}>
              Agrega IUMs y presiona Simular para ver la respuesta del motor
            </p>
          )}
        </div>
      </div>

      {/* ── Modal de unión ───────────────────────────────────────────────────── */}
      {modalEnlace && (
        <div
          style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--bg-main) 72%, transparent)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setModalEnlace(false)}
        >
          <div
            style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "var(--radius-card)", padding: 16, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link2 size={11} />
              <span style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>Nueva unión</span>
              <button onClick={() => setModalEnlace(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
            </div>

            {(["Origen", "Destino"] as const).map((label) => {
              const val  = label === "Origen" ? enlaceOrigen : enlaceDestino;
              const setV = label === "Origen" ? setEnlaceOrigen : setEnlaceDestino;
              return (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
                  <select value={val} onChange={(e) => setV(e.target.value)}
                    style={{ fontSize: 10, padding: "4px 6px", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", borderRadius: "var(--radius-btn)", background: "transparent", color: "var(--fg-main)" }}>
                    <option value="">Seleccionar...</option>
                    {componentes
                      .filter((c) => label === "Origen" || c.uid !== enlaceOrigen)
                      .map((c) => <option key={c.uid} value={c.uid}>{c.posicion} — {c.ium_nombre}</option>)}
                  </select>
                </div>
              );
            })}

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tipo de unión</label>
              <select value={enlaceTipo} onChange={(e) => setEnlaceTipo(e.target.value)}
                style={{ fontSize: 10, padding: "4px 6px", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", borderRadius: "var(--radius-btn)", background: "transparent", color: "var(--fg-main)" }}>
                {TIPOS_UNION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <button onClick={agregarEnlace} disabled={!enlaceOrigen || !enlaceDestino}
              style={{ padding: "6px 0", borderRadius: "var(--radius-btn)", background: enlaceOrigen && enlaceDestino ? "var(--primary)" : "color-mix(in srgb, var(--primary) 12%, transparent)", color: enlaceOrigen && enlaceDestino ? "#fff" : "color-mix(in srgb, var(--primary) 30%, transparent)", border: "none", cursor: enlaceOrigen && enlaceDestino ? "pointer" : "not-allowed", fontSize: 10, fontWeight: 700 }}>
              Agregar unión
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
