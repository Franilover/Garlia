"use client";

/**
 * SimuladorIUM.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Laboratorio experimental de IUMs — tab "Simulador" del Universo público.
 *
 * REGLA PRINCIPAL: SUPABASE MANDA.
 * Este componente NO inventa IUMs, procesos, ORIS, topologías ni resultados.
 * Se limita a:
 *   1. Leer catálogos reales de Supabase (iums, ium_salidas_funcionales,
 *      proceso_configuraciones_ium_v1 y sus tablas de detalle).
 *   2. Construir dinámicamente el payload para simular_organizacion_ium_v1.
 *   3. Llamar al motor de Supabase y mostrar la respuesta completa tal cual.
 *   4. NO guardar nada automáticamente ni convertir pruebas en canon.
 *
 * Flujo visual:
 *   IUM → salida funcional → unión → organización
 *   → proceso candidato → ORIS → resultado del motor
 */

import {
  AlertTriangle,
  ArrowDown,
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

// ─── Tipos locales ──────────────────────────────────────────────────────────

interface Ium {
  id: string;
  orden: number;
  nombre: string;
  detalle: string;
  extra?: string | null;
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

/** Componente construido por el usuario en el laboratorio */
interface ComponenteLab {
  uid: string; // uuid local, NO persistido
  ium_id: string;
  ium_nombre: string;
  posicion: string; // A, B, C, D, N …
  salidas: IumSalidaFuncional[];
}

/** Enlace construido por el usuario */
interface EnlaceLab {
  uid: string;
  origen_uid: string;
  destino_uid: string;
  tipo_union: string;
}

/** Resultado crudo del motor */
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

// ─── Constantes ─────────────────────────────────────────────────────────────

const POSICIONES = ["A", "B", "C", "D", "N", "M", "X", "Y", "Z"];
const TIPOS_UNION = ["dirigida", "bidireccional", "convergente", "divergente"];

let uidCounter = 0;
function genUID() {
  return `lab_${++uidCounter}_${Date.now()}`;
}

// ─── Hooks de datos ─────────────────────────────────────────────────────────

function useIums() {
  const [iums, setIums] = useState<Ium[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("iums")
      .select("id, orden, nombre, detalle, extra")
      .order("orden")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setIums(data ?? []);
        setLoading(false);
      });
  }, []);

  return { iums, loading, error };
}

function useIumSalidas(iumIds: string[]) {
  const [salidas, setSalidas] = useState<IumSalidaFuncional[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!iumIds.length) {
      setSalidas([]);
      return;
    }
    setLoading(true);
    supabase
      .from("ium_salidas_funcionales")
      .select("id, ium_id, clave, nombre, tipo_salida, descripcion, formula, estado, es_principal")
      .in("ium_id", iumIds)
      .order("es_principal", { ascending: false })
      .then(({ data }) => {
        setSalidas(data ?? []);
        setLoading(false);
      });
  }, [JSON.stringify(iumIds.slice().sort())]);

  return { salidas, loading };
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function PillEstado({ estado }: { estado?: string }) {
  if (!estado) return null;
  const color =
    estado === "compatible" || estado === "valido"
      ? "var(--success, #22c55e)"
      : estado === "incompatible" || estado === "error"
        ? "var(--error, #ef4444)"
        : "color-mix(in srgb, var(--primary) 50%, transparent)";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "1px 6px",
        borderRadius: 999,
        background: color,
        color: "#fff",
      }}
    >
      {estado}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "color-mix(in srgb, var(--primary) 40%, transparent)",
        marginBottom: 6,
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 12,
        background: "color-mix(in srgb, var(--primary) 20%, transparent)",
        margin: "0 auto",
      }}
    />
  );
}

/** Tarjeta de un componente IUM en el canvas central */
function ComponenteCard({
  comp,
  salidas,
  posicionesUsadas,
  onRemove,
  onPosicion,
}: {
  comp: ComponenteLab;
  salidas: IumSalidaFuncional[];
  posicionesUsadas: string[];
  onRemove: () => void;
  onPosicion: (p: string) => void;
}) {
  const principal = salidas.find((s) => s.es_principal);
  const disponibles = POSICIONES.filter(
    (p) => p === comp.posicion || !posicionesUsadas.includes(p),
  );

  return (
    <div
      style={{
        border: "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
        borderRadius: "var(--radius-card)",
        padding: "8px 10px",
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        position: "relative",
        minWidth: 160,
      }}
    >
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          padding: 2,
        }}
        title="Eliminar IUM"
      >
        <X size={10} />
      </button>

      {/* Posición */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: "color-mix(in srgb, var(--primary) 60%, transparent)",
            lineHeight: 1,
          }}
        >
          {comp.posicion}
        </span>
        <select
          value={comp.posicion}
          onChange={(e) => onPosicion(e.target.value)}
          style={{
            fontSize: 9,
            background: "transparent",
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "var(--fg-main)",
            padding: "1px 4px",
          }}
        >
          {disponibles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Nombre */}
      <p style={{ fontSize: 11, fontWeight: 700, margin: 0, marginBottom: 2 }}>
        {comp.ium_nombre}
      </p>

      {/* Salida principal */}
      {principal && (
        <p
          style={{
            fontSize: 9,
            color: "color-mix(in srgb, var(--primary) 55%, transparent)",
            margin: 0,
          }}
        >
          ↳ {principal.nombre}{" "}
          <span style={{ opacity: 0.7 }}>({principal.tipo_salida})</span>
        </p>
      )}
    </div>
  );
}

/** Tarjeta de un enlace */
function EnlaceCard({
  enlace,
  componentes,
  onRemove,
  onTipoUnion,
}: {
  enlace: EnlaceLab;
  componentes: ComponenteLab[];
  onRemove: () => void;
  onTipoUnion: (t: string) => void;
}) {
  const origen = componentes.find((c) => c.uid === enlace.origen_uid);
  const destino = componentes.find((c) => c.uid === enlace.destino_uid);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
        borderRadius: "var(--radius-btn)",
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        fontSize: 10,
      }}
    >
      <span style={{ fontWeight: 700 }}>{origen?.posicion ?? "?"}</span>
      <ArrowDown size={8} style={{ transform: "rotate(-90deg)" }} />
      <span style={{ fontWeight: 700 }}>{destino?.posicion ?? "?"}</span>
      <select
        value={enlace.tipo_union}
        onChange={(e) => onTipoUnion(e.target.value)}
        style={{
          fontSize: 9,
          background: "transparent",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
          borderRadius: "var(--radius-btn)",
          color: "var(--fg-main)",
          padding: "1px 4px",
        }}
      >
        {TIPOS_UNION.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        onClick={onRemove}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <X size={9} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
      </button>
    </div>
  );
}

/** Panel colapsable para mostrar la respuesta del simulador */
function ResultadoPanel({ resultado }: { resultado: ResultadoSimulador }) {
  const [expandido, setExpandido] = useState(true);

  const candidatos = resultado.procesos_candidatos as Array<{ nombre?: string; id?: string }> | undefined;
  const oris = resultado.oris_candidatos as Array<{ nombre?: string; id?: string }> | undefined;
  const incompatibilidades = resultado.incompatibilidades as Array<{ motivo?: string; descripcion?: string }> | undefined;
  const motivos = resultado.motivos as string[] | undefined;

  const hayError =
    resultado.estado === "incompatible" ||
    resultado.estado === "error" ||
    (incompatibilidades && incompatibilidades.length > 0);

  return (
    <div
      style={{
        border: `var(--border-width) solid ${hayError ? "color-mix(in srgb, var(--error, #ef4444) 40%, transparent)" : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {expandido ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span style={{ fontSize: 10, fontWeight: 700, flex: 1 }}>Resultado del motor</span>
        <PillEstado estado={resultado.estado} />
      </button>

      {expandido && (
        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Procesos candidatos */}
          <div>
            <SectionTitle>
              Procesos candidatos ({resultado.cantidad_candidatos ?? candidatos?.length ?? 0})
            </SectionTitle>
            {candidatos && candidatos.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {candidatos.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                      fontWeight: 600,
                    }}
                  >
                    ✓ {p.nombre ?? String(p)}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", margin: 0 }}>
                Sin procesos candidatos
              </p>
            )}
          </div>

          {/* ORIS candidatos */}
          {oris && oris.length > 0 && (
            <div>
              <SectionTitle>ORIS candidatos</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {oris.map((o, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      border: "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
                      fontWeight: 600,
                    }}
                  >
                    <Zap size={8} style={{ display: "inline", marginRight: 3 }} />
                    {o.nombre ?? String(o)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Incompatibilidades */}
          {hayError && (
            <div>
              <SectionTitle>Incompatibilidades</SectionTitle>
              {incompatibilidades && incompatibilidades.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {incompatibilidades.map((inc, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "flex-start",
                        fontSize: 9,
                        color: "color-mix(in srgb, var(--error, #ef4444) 80%, var(--fg-main))",
                      }}
                    >
                      <AlertTriangle size={9} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{inc.motivo ?? inc.descripcion ?? JSON.stringify(inc)}</span>
                    </div>
                  ))}
                </div>
              )}
              {motivos && motivos.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                  {motivos.map((m, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 9,
                        margin: 0,
                        color: "color-mix(in srgb, var(--error, #ef4444) 70%, var(--fg-main))",
                      }}
                    >
                      • {m}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JSON completo colapsable */}
          <details style={{ marginTop: 2 }}>
            <summary
              style={{
                fontSize: 9,
                fontWeight: 700,
                cursor: "pointer",
                color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Respuesta completa del motor
            </summary>
            <pre
              style={{
                fontSize: 8,
                overflow: "auto",
                maxHeight: 240,
                background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                borderRadius: "var(--radius-btn)",
                padding: 8,
                marginTop: 4,
                color: "color-mix(in srgb, var(--primary) 70%, transparent)",
                lineHeight: 1.4,
              }}
            >
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
  // Catálogos
  const { iums, loading: loadingIums } = useIums();

  // Estado del laboratorio
  const [busqueda, setBusqueda] = useState("");
  const [componentes, setComponentes] = useState<ComponenteLab[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceLab[]>([]);

  // Modal de enlace
  const [modalEnlace, setModalEnlace] = useState(false);
  const [enlaceOrigen, setEnlaceOrigen] = useState<string>("");
  const [enlaceDestino, setEnlaceDestino] = useState<string>("");
  const [enlaceTipo, setEnlaceTipo] = useState<string>("dirigida");

  // Simulador
  const [simulando, setSimulando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSimulador | null>(null);
  const [errorSimulador, setErrorSimulador] = useState<string | null>(null);

  // Salidas funcionales de los IUMs en el canvas
  const iumIds = useMemo(() => componentes.map((c) => c.ium_id), [componentes]);
  const { salidas, loading: loadingSalidas } = useIumSalidas(iumIds);

  // IUMs filtrados por búsqueda
  const iumsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return iums;
    return iums.filter(
      (i) => i.nombre.toLowerCase().includes(q) || i.detalle.toLowerCase().includes(q),
    );
  }, [iums, busqueda]);

  // Posiciones ya usadas
  const posicionesUsadas = useMemo(() => componentes.map((c) => c.posicion), [componentes]);

  // Agregar IUM al canvas
  const agregarIum = useCallback(
    (ium: Ium) => {
      const posicionLibre = POSICIONES.find((p) => !posicionesUsadas.includes(p)) ?? "X";
      setComponentes((prev) => [
        ...prev,
        {
          uid: genUID(),
          ium_id: ium.id,
          ium_nombre: ium.nombre,
          posicion: posicionLibre,
          salidas: [],
        },
      ]);
    },
    [posicionesUsadas],
  );

  // Cambiar posición de un componente
  const cambiarPosicion = useCallback((uid: string, posicion: string) => {
    setComponentes((prev) => prev.map((c) => (c.uid === uid ? { ...c, posicion } : c)));
  }, []);

  // Eliminar componente (y sus enlaces)
  const eliminarComponente = useCallback((uid: string) => {
    setComponentes((prev) => prev.filter((c) => c.uid !== uid));
    setEnlaces((prev) =>
      prev.filter((e) => e.origen_uid !== uid && e.destino_uid !== uid),
    );
  }, []);

  // Agregar enlace
  const agregarEnlace = useCallback(() => {
    if (!enlaceOrigen || !enlaceDestino || enlaceOrigen === enlaceDestino) return;
    setEnlaces((prev) => [
      ...prev,
      {
        uid: genUID(),
        origen_uid: enlaceOrigen,
        destino_uid: enlaceDestino,
        tipo_union: enlaceTipo,
      },
    ]);
    setModalEnlace(false);
    setEnlaceOrigen("");
    setEnlaceDestino("");
    setEnlaceTipo("dirigida");
  }, [enlaceOrigen, enlaceDestino, enlaceTipo]);

  // Cambiar tipo de unión de un enlace
  const cambiarTipoUnion = useCallback((uid: string, tipo: string) => {
    setEnlaces((prev) => prev.map((e) => (e.uid === uid ? { ...e, tipo_union: tipo } : e)));
  }, []);

  // Construir payload para el simulador
  const buildPayload = useCallback(() => {
    return {
      componentes: componentes.map((c) => ({
        ium_id: c.ium_id,
        posicion: c.posicion,
      })),
      enlaces: enlaces.map((e) => {
        const origen = componentes.find((c) => c.uid === e.origen_uid);
        const destino = componentes.find((c) => c.uid === e.destino_uid);
        return {
          origen: origen?.posicion ?? "",
          destino: destino?.posicion ?? "",
          tipo_union: e.tipo_union,
        };
      }),
      contexto: {},
    };
  }, [componentes, enlaces]);

  // Ejecutar simulador
  const simular = useCallback(async () => {
    if (!componentes.length) return;
    setSimulando(true);
    setResultado(null);
    setErrorSimulador(null);

    try {
      const payload = buildPayload();
      const { data, error: err } = await supabase.rpc(
        "simular_organizacion_ium_v1" as never,
        payload as never,
      );
      if (err) {
        setErrorSimulador(err.message);
      } else {
        setResultado((data as ResultadoSimulador) ?? { estado: "sin_respuesta" });
      }
    } catch (e) {
      setErrorSimulador(e instanceof Error ? e.message : String(e));
    } finally {
      setSimulando(false);
    }
  }, [componentes, buildPayload]);

  const limpiarTodo = useCallback(() => {
    setComponentes([]);
    setEnlaces([]);
    setResultado(null);
    setErrorSimulador(null);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 260px",
        gridTemplateRows: "1fr auto",
        height: "calc(100vh - 80px)",
        gap: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Panel izquierdo: catálogo de IUMs ───────────────────────────────── */}
      <div
        style={{
          borderRight:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "8px 10px",
            borderBottom:
              "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
              margin: 0,
              marginBottom: 6,
            }}
          >
            IUMs
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              border:
                "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
              borderRadius: "var(--radius-btn)",
              padding: "3px 6px",
            }}
          >
            <Search size={9} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar IUM..."
              style={{
                border: "none",
                background: "transparent",
                fontSize: 10,
                color: "var(--fg-main)",
                outline: "none",
                width: "100%",
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loadingIums ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            iumsFiltrados.map((ium) => (
              <button
                key={ium.id}
                onClick={() => agregarIum(ium)}
                title={ium.detalle}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "color-mix(in srgb, var(--primary) 7%, transparent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                <Plus size={8} style={{ flexShrink: 0, color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ium.nombre}
                </span>
              </button>
            ))
          )}
          {!loadingIums && !iumsFiltrados.length && (
            <p
              style={{
                fontSize: 9,
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                textAlign: "center",
                padding: "12px 8px",
                margin: 0,
              }}
            >
              Sin resultados
            </p>
          )}
        </div>
      </div>

      {/* ── Panel central: canvas ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
        }}
      >
        {/* Toolbar central */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderBottom:
              "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <FlaskConical size={10} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
              flex: 1,
            }}
          >
            Canvas ({componentes.length} IUM{componentes.length !== 1 ? "s" : ""})
          </span>
          {componentes.length > 1 && (
            <button
              onClick={() => setModalEnlace(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "var(--radius-btn)",
                border:
                  "var(--border-width) solid color-mix(in srgb, var(--primary) 25%, transparent)",
                background: "transparent",
                cursor: "pointer",
                color: "var(--fg-main)",
              }}
            >
              <Link2 size={9} />
              Agregar unión
            </button>
          )}
          {componentes.length > 0 && (
            <button
              onClick={limpiarTodo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "var(--radius-btn)",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              <Trash2 size={9} />
            </button>
          )}
        </div>

        {/* Canvas scrolleable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {componentes.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 8,
              }}
            >
              <FlaskConical
                size={28}
                style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}
              />
              <p
                style={{
                  fontSize: 10,
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                  textAlign: "center",
                  maxWidth: 200,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Agrega IUMs desde el panel izquierdo para construir una combinación
              </p>
            </div>
          ) : (
            componentes.map((comp, i) => {
              const salidasComp = salidas.filter((s) => s.ium_id === comp.ium_id);
              const enlaceSaliente = enlaces.find((e) => e.origen_uid === comp.uid);
              return (
                <React.Fragment key={comp.uid}>
                  <ComponenteCard
                    comp={comp}
                    salidas={salidasComp}
                    posicionesUsadas={posicionesUsadas}
                    onRemove={() => eliminarComponente(comp.uid)}
                    onPosicion={(p) => cambiarPosicion(comp.uid, p)}
                  />
                  {i < componentes.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        padding: "4px 0",
                      }}
                    >
                      <Divider />
                      {enlaceSaliente && (
                        <span
                          style={{
                            fontSize: 8,
                            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {enlaceSaliente.tipo_union}
                        </span>
                      )}
                      <Divider />
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Uniones listadas */}
        {enlaces.length > 0 && (
          <div
            style={{
              borderTop:
                "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
              padding: "6px 10px",
            }}
          >
            <SectionTitle>Uniones ({enlaces.length})</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {enlaces.map((e) => (
                <EnlaceCard
                  key={e.uid}
                  enlace={e}
                  componentes={componentes}
                  onRemove={() =>
                    setEnlaces((prev) => prev.filter((x) => x.uid !== e.uid))
                  }
                  onTipoUnion={(t) => cambiarTipoUnion(e.uid, t)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Botón simular */}
        <div
          style={{
            borderTop:
              "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
            padding: "8px 10px",
          }}
        >
          <button
            onClick={simular}
            disabled={!componentes.length || simulando}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "6px 0",
              borderRadius: "var(--radius-btn)",
              background:
                componentes.length && !simulando
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 15%, transparent)",
              color: componentes.length && !simulando ? "#fff" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              border: "none",
              cursor: componentes.length && !simulando ? "pointer" : "not-allowed",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "background 0.15s",
            }}
          >
            {simulando ? (
              <>
                <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />
                Simulando...
              </>
            ) : (
              <>
                <Play size={10} />
                Simular
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Panel derecho: resultados ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "8px 10px",
            borderBottom:
              "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
              margin: 0,
            }}
          >
            Organización
          </p>
        </div>

        {/* Contenido derecho scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Resumen de lo que hay en el canvas */}
          {componentes.length > 0 && (
            <div>
              <SectionTitle>IUMs seleccionados</SectionTitle>
              {componentes.map((c) => {
                const salidasComp = salidas.filter((s) => s.ium_id === c.ium_id);
                const principal = salidasComp.find((s) => s.es_principal);
                return (
                  <div
                    key={c.uid}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                        }}
                      >
                        {c.posicion}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700 }}>{c.ium_nombre}</span>
                    </div>
                    {principal && (
                      <p
                        style={{
                          fontSize: 9,
                          margin: 0,
                          color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                          paddingLeft: 14,
                        }}
                      >
                        ↳ {principal.nombre}
                      </p>
                    )}
                  </div>
                );
              })}

              {enlaces.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <SectionTitle>Uniones</SectionTitle>
                  {enlaces.map((e) => {
                    const or = componentes.find((c) => c.uid === e.origen_uid);
                    const dst = componentes.find((c) => c.uid === e.destino_uid);
                    return (
                      <p key={e.uid} style={{ fontSize: 9, margin: "0 0 2px 0" }}>
                        {or?.posicion} → {dst?.posicion}{" "}
                        <span style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                          ({e.tipo_union})
                        </span>
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error del simulador */}
          {errorSimulador && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-card)",
                border:
                  "var(--border-width) solid color-mix(in srgb, var(--error, #ef4444) 40%, transparent)",
                background: "color-mix(in srgb, var(--error, #ef4444) 6%, transparent)",
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <AlertTriangle
                  size={10}
                  style={{ color: "var(--error, #ef4444)", flexShrink: 0, marginTop: 1 }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      margin: "0 0 3px 0",
                      color: "var(--error, #ef4444)",
                    }}
                  >
                    Error del motor
                  </p>
                  <p style={{ fontSize: 9, margin: 0, opacity: 0.8 }}>{errorSimulador}</p>
                  <p
                    style={{
                      fontSize: 8,
                      margin: "4px 0 0 0",
                      color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                    }}
                  >
                    La función simular_organizacion_ium_v1 puede no existir aún en esta base o
                    requiere parámetros distintos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Resultado del simulador */}
          {resultado && <ResultadoPanel resultado={resultado} />}

          {/* Vacío */}
          {!resultado && !errorSimulador && componentes.length === 0 && (
            <p
              style={{
                fontSize: 9,
                color: "color-mix(in srgb, var(--primary) 25%, transparent)",
                textAlign: "center",
                padding: "24px 12px",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Agrega IUMs en el canvas y presiona Simular para ver la respuesta del motor de Garlia
            </p>
          )}
        </div>
      </div>

      {/* ── Modal de enlace ───────────────────────────────────────────────────── */}
      {modalEnlace && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "color-mix(in srgb, var(--bg-main) 70%, transparent)",
            backdropFilter: "blur(4px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setModalEnlace(false)}
        >
          <div
            style={{
              background: "var(--bg-main)",
              border:
                "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
              borderRadius: "var(--radius-card)",
              padding: 16,
              minWidth: 260,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link2 size={11} />
              <span style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>Nueva unión</span>
              <button
                onClick={() => setModalEnlace(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
              >
                <X size={12} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Origen
              </label>
              <select
                value={enlaceOrigen}
                onChange={(e) => setEnlaceOrigen(e.target.value)}
                style={{
                  fontSize: 10,
                  padding: "4px 6px",
                  border:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 25%, transparent)",
                  borderRadius: "var(--radius-btn)",
                  background: "transparent",
                  color: "var(--fg-main)",
                }}
              >
                <option value="">Seleccionar IUM...</option>
                {componentes.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.posicion} — {c.ium_nombre}
                  </option>
                ))}
              </select>

              <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Destino
              </label>
              <select
                value={enlaceDestino}
                onChange={(e) => setEnlaceDestino(e.target.value)}
                style={{
                  fontSize: 10,
                  padding: "4px 6px",
                  border:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 25%, transparent)",
                  borderRadius: "var(--radius-btn)",
                  background: "transparent",
                  color: "var(--fg-main)",
                }}
              >
                <option value="">Seleccionar IUM...</option>
                {componentes
                  .filter((c) => c.uid !== enlaceOrigen)
                  .map((c) => (
                    <option key={c.uid} value={c.uid}>
                      {c.posicion} — {c.ium_nombre}
                    </option>
                  ))}
              </select>

              <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Tipo de unión
              </label>
              <select
                value={enlaceTipo}
                onChange={(e) => setEnlaceTipo(e.target.value)}
                style={{
                  fontSize: 10,
                  padding: "4px 6px",
                  border:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 25%, transparent)",
                  borderRadius: "var(--radius-btn)",
                  background: "transparent",
                  color: "var(--fg-main)",
                }}
              >
                {TIPOS_UNION.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={agregarEnlace}
              disabled={!enlaceOrigen || !enlaceDestino}
              style={{
                padding: "6px 0",
                borderRadius: "var(--radius-btn)",
                background: enlaceOrigen && enlaceDestino ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
                color: enlaceOrigen && enlaceDestino ? "#fff" : "color-mix(in srgb, var(--primary) 35%, transparent)",
                border: "none",
                cursor: enlaceOrigen && enlaceDestino ? "pointer" : "not-allowed",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              Agregar unión
            </button>
          </div>
        </div>
      )}

      {/* Keyframe de spin inline */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
