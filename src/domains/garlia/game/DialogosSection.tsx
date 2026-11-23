"use client";

/**
 * DialogosSection — editor de diálogos de game
 * ──────────────────────────────────────────────────────────────────────────
 * Mejoras aplicadas:
 *   1. Panel derecho con pestañas: Contenido / Condiciones / Simulador
 *   2. Constructor visual de condiciones (sin UUIDs manuales)
 *   3. Simulador: qué variante ganaría dado un estado del mundo
 *   4. Referencias dinámicas en líneas de diálogo (píldoras vinculadas)
 *   6. Estado vacío explícito cuando el personaje no tiene diálogos
 *
 * Estructura del JSON en dialogos_game.dialogo:
 *   [ { variantes: Variante[], temas_conversacion: TemaConversacion[] } ]
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle, Search, Plus, X,
  Loader2, Check, Save, Trash2, Play,
  Link2, ChevronDown, AlertTriangle, Lock, ChevronRight,
} from "lucide-react";
import { supabase } from "@/infra/supabase/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DialogoLinea {
  texto: string;
  hablante: string;
  /** Fragmentos de texto: strings literales o referencias { tipo, id, nombre } */
  _refs?: Array<string | { tipo: "personaje" | "lugar" | "mision"; id: string; nombre: string }>;
  /** Condiciones opcionales: si están presentes, esta línea solo se muestra si se cumplen */
  _condiciones?: Condicion[];
  _operador_logico?: "AND" | "OR";
}

interface RequisitoSocial {
  respeto_min?: number;
  confianza_min?: number;
  amistad_min?: number;
  afecto_min?: number;
}

interface RequisitoContextual { estaciones?: string[] }

/** Condición individual del constructor visual */
interface Condicion {
  id: string;
  tipo: "social" | "estacion" | "hora" | "mision" | "tema_conversado" | "objeto";
  campo: string;
  operador: ">=" | "<=" | "==" | "!=";
  valor: string;
}

interface Variante {
  clave: string;
  lineas: DialogoLinea[];
  prioridad: number;
  requisito_social?: RequisitoSocial;
  requisito_contextual?: RequisitoContextual;
  /** Condiciones del constructor visual (fuente de verdad cuando están presentes) */
  _condiciones?: Condicion[];
  _operador_logico?: "AND" | "OR";
  [key: string]: unknown;
}

interface TemaConversacion {
  clave: string;
  texto: string;
  evento: string;
  jugador: string;
  respuesta: string;
  respuesta_repetida?: string;
  requiere_tema?: string;
  requisito_social?: RequisitoSocial;
  _condiciones?: Condicion[];
  _operador_logico?: "AND" | "OR";
  [key: string]: unknown;
}

interface DialogoDoc {
  variantes: Variante[];
  temas_conversacion: TemaConversacion[];
}

type EntryRef =
  | { type: "variante"; index: number }
  | { type: "tema"; index: number }
  | null;

type PanelTab = "contenido" | "simulador";

// ── Shared primitives ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
  color: "var(--primary)",
  borderRadius: "10px",
  padding: "5px 10px",
  fontSize: "12px",
  outline: "none",
  width: "100%",
};

function FL({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-semibold tracking-wide"
      style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
    >
      {label}
    </span>
  );
}

function Inp(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} style={{ ...inputStyle, ...p.style }} className="outline-none" />;
}

function TA(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      style={{ ...inputStyle, resize: "none", ...p.style }}
      className="outline-none"
      rows={p.rows ?? 3}
    />
  );
}

function useSave() {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };
  return { saving, saved, error, run };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function reqKind(entry: Variante | TemaConversacion): "social" | "season" | "mixed" | "none" {
  const hasSeason =
    "requisito_contextual" in entry &&
    (entry as Variante).requisito_contextual?.estaciones?.length;
  const hasSocial =
    entry.requisito_social && Object.keys(entry.requisito_social).length > 0;
  const condTypes = new Set((entry._condiciones ?? []).map((c: Condicion) => c.tipo));
  const condSocial = condTypes.has("social");
  const condSeason = condTypes.has("estacion");

  if ((hasSeason || condSeason) && (hasSocial || condSocial)) return "mixed";
  if (hasSeason || condSeason) return "season";
  if (hasSocial || condSocial) return "social";
  return "none";
}

const DOT_COLOR: Record<"social" | "season" | "mixed" | "none", string> = {
  none:   "#22c55e",
  social: "#a855f7",
  season: "#f97316",
  mixed:  "#3b82f6",
};

const MUTED  = "color-mix(in srgb, var(--primary) 35%, transparent)";
const BORDER = "1px solid color-mix(in srgb, var(--primary) 10%, transparent)";

/** Genera un id corto y único para condiciones */
const uid = () => Math.random().toString(36).slice(2, 8);

// ── CondicionBuilder ──────────────────────────────────────────────────────────

const COND_TIPO_LABELS: Record<Condicion["tipo"], string> = {
  social:          "Relación social",
  estacion:        "Estación",
  hora:            "Hora del día",
  mision:          "Misión",
  tema_conversado: "Tema conversado",
  objeto:          "Objeto",
};

const COND_CAMPOS: Record<Condicion["tipo"], string[]> = {
  social:          ["amistad", "confianza", "respeto", "afecto"],
  estacion:        ["Florial", "Luviern", "Ardent", "Nievorn"],
  hora:            ["mañana", "mediodía", "tarde", "noche"],
  mision:          [],  // texto libre
  tema_conversado: [],  // texto libre
  objeto:          [],  // texto libre
};

const COND_OPS: Condicion["operador"][] = [">=", "<=", "==", "!="];

function CondicionBuilder({
  condiciones,
  operador,
  onChange,
  onOpChange,
}: {
  condiciones: Condicion[];
  operador: "AND" | "OR";
  onChange: (c: Condicion[]) => void;
  onOpChange: (op: "AND" | "OR") => void;
}) {
  const add = (tipo: Condicion["tipo"]) => {
    const campos = COND_CAMPOS[tipo];
    onChange([...condiciones, {
      id: uid(),
      tipo,
      campo: campos[0] ?? "",
      operador: ">=",
      valor: "",
    }]);
  };

  const update = (id: string, patch: Partial<Condicion>) =>
    onChange(condiciones.map(c => c.id === id ? { ...c, ...patch } : c));

  const remove = (id: string) =>
    onChange(condiciones.filter(c => c.id !== id));

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11,
    padding: "3px 10px",
    borderRadius: 20,
    border: BORDER,
    background: active
      ? "color-mix(in srgb, var(--primary) 14%, transparent)"
      : "color-mix(in srgb, var(--primary) 4%, transparent)",
    color: active ? "var(--primary)" : MUTED,
    cursor: "pointer",
  });

  const condRowBg = "color-mix(in srgb, var(--primary) 4%, var(--bg-main))";

  return (
    <div className="flex flex-col gap-3">
      {/* Condiciones activas */}
      {condiciones.length > 0 && (
        <div className="flex flex-col gap-2">
          {condiciones.map((c, i) => {
            const campos = COND_CAMPOS[c.tipo];
            const isFreeText = campos.length === 0;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-2 p-3 rounded-xl"
                style={{ background: condRowBg, border: BORDER }}
              >
                {/* Separador AND/OR entre condiciones */}
                {i > 0 && (
                  <div className="flex items-center gap-2 pb-1">
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                    <div className="flex gap-1">
                      {(["AND", "OR"] as const).map(op => (
                        <button
                          key={op}
                          type="button"
                          style={chipStyle(operador === op)}
                          onClick={() => onOpChange(op)}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tipo */}
                  <select
                    value={c.tipo}
                    onChange={e => update(c.id, { tipo: e.target.value as Condicion["tipo"], campo: COND_CAMPOS[e.target.value as Condicion["tipo"]][0] ?? "", valor: "" })}
                    style={{ ...inputStyle, width: "auto", flex: "1 1 110px" }}
                  >
                    {Object.entries(COND_TIPO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>

                  {/* Campo: select si hay opciones, input si no */}
                  {!isFreeText ? (
                    <select
                      value={c.campo}
                      onChange={e => update(c.id, { campo: e.target.value })}
                      style={{ ...inputStyle, width: "auto", flex: "1 1 90px" }}
                    >
                      {campos.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  ) : (
                    <Inp
                      placeholder="nombre…"
                      value={c.campo}
                      onChange={e => update(c.id, { campo: e.target.value })}
                      style={{ flex: "1 1 90px" }}
                    />
                  )}

                  {/* Operador (solo para tipos numéricos/comparables) */}
                  {(c.tipo === "social" || c.tipo === "hora") && (
                    <select
                      value={c.operador}
                      onChange={e => update(c.id, { operador: e.target.value as Condicion["operador"] })}
                      style={{ ...inputStyle, width: 60 }}
                    >
                      {COND_OPS.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  )}

                  {/* Valor numérico para social */}
                  {c.tipo === "social" && (
                    <Inp
                      type="number"
                      placeholder="0"
                      value={c.valor}
                      onChange={e => update(c.id, { valor: e.target.value })}
                      style={{ width: 70 }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    style={{ color: MUTED, marginLeft: "auto", flexShrink: 0 }}
                    title="Eliminar condición"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Añadir condición */}
      <div className="flex flex-col gap-2">
        <FL label="Añadir condición" />
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(COND_TIPO_LABELS) as Condicion["tipo"][]).map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => add(tipo)}
              style={chipStyle(false)}
            >
              + {COND_TIPO_LABELS[tipo]}
            </button>
          ))}
        </div>
      </div>

      {condiciones.length === 0 && (
        <p className="text-xs" style={{ color: MUTED }}>
          Sin condiciones — esta entrada estará siempre disponible.
        </p>
      )}
    </div>
  );
}

// ── Simulador ─────────────────────────────────────────────────────────────────

interface EstadoSim {
  amistad: number;
  confianza: number;
  respeto: number;
  afecto: number;
  estacion: string;
  temasConversados: string;
}

function evalCondicion(c: Condicion, estado: EstadoSim): boolean {
  const val = Number(c.valor);
  switch (c.tipo) {
    case "social": {
      const estadoVal = estado[c.campo as keyof EstadoSim] as number;
      if (c.operador === ">=") return estadoVal >= val;
      if (c.operador === "<=") return estadoVal <= val;
      if (c.operador === "==") return estadoVal === val;
      if (c.operador === "!=") return estadoVal !== val;
      return false;
    }
    case "estacion":
      return estado.estacion.toLowerCase() === c.campo.toLowerCase();
    case "tema_conversado":
      return estado.temasConversados.split(",").map(s => s.trim()).includes(c.campo);
    default:
      return true; // tipos no evaluables localmente → pasan
  }
}

function evalVariante(v: Variante, estado: EstadoSim): {
  pasa: boolean;
  detalles: Array<{ label: string; pasa: boolean }>;
} {
  const condiciones: Array<{ label: string; pasa: boolean }> = [];

  // Condiciones del constructor visual
  if (v._condiciones && v._condiciones.length > 0) {
    for (const c of v._condiciones) {
      const pasa = evalCondicion(c, estado);
      condiciones.push({
        label: `${COND_TIPO_LABELS[c.tipo]} · ${c.campo} ${c.tipo === "social" ? `${c.operador} ${c.valor}` : ""}`,
        pasa,
      });
    }
    const op = v._operador_logico ?? "AND";
    const pasa = op === "AND"
      ? condiciones.every(c => c.pasa)
      : condiciones.some(c => c.pasa);
    return { pasa, detalles: condiciones };
  }

  // Fallback: requisito_social legacy
  const rs = v.requisito_social ?? {};
  if (rs.amistad_min != null)   condiciones.push({ label: `Amistad ≥ ${rs.amistad_min}`,   pasa: estado.amistad   >= rs.amistad_min });
  if (rs.confianza_min != null) condiciones.push({ label: `Confianza ≥ ${rs.confianza_min}`, pasa: estado.confianza >= rs.confianza_min });
  if (rs.respeto_min != null)   condiciones.push({ label: `Respeto ≥ ${rs.respeto_min}`,   pasa: estado.respeto   >= rs.respeto_min });
  if (rs.afecto_min != null)    condiciones.push({ label: `Afecto ≥ ${rs.afecto_min}`,     pasa: estado.afecto    >= rs.afecto_min });

  const estaciones = v.requisito_contextual?.estaciones ?? [];
  if (estaciones.length > 0) {
    condiciones.push({
      label: `Estación en [${estaciones.join(", ")}]`,
      pasa: estaciones.some(e => e.toLowerCase() === estado.estacion.toLowerCase()),
    });
  }

  if (condiciones.length === 0) return { pasa: true, detalles: [] };
  return { pasa: condiciones.every(c => c.pasa), detalles: condiciones };
}

function Simulador({ variantes, temas }: { variantes: Variante[]; temas: TemaConversacion[] }) {
  const [estado, setEstado] = useState<EstadoSim>({
    amistad: 0, confianza: 0, respeto: 0, afecto: 0,
    estacion: "", temasConversados: "",
  });
  const [resultado, setResultado] = useState<null | {
    ganadora: Variante | null;
    evaluaciones: Array<{ variante: Variante; pasa: boolean; detalles: Array<{ label: string; pasa: boolean }> }>;
  }>(null);

  const simular = () => {
    const evaluaciones = variantes
      .map(v => ({ variante: v, ...evalVariante(v, estado) }))
      .sort((a, b) => b.variante.prioridad - a.variante.prioridad);
    const ganadoras = evaluaciones.filter(e => e.pasa);
    setResultado({ ganadora: ganadoras[0]?.variante ?? null, evaluaciones });
  };

  const campoEst: React.CSSProperties = { ...inputStyle, flex: "1 1 100px" };

  return (
    <div className="flex flex-col gap-4">
      {/* Inputs de estado */}
      <div className="flex flex-col gap-3">
        <FL label="Estado del mundo" />
        <div className="grid grid-cols-2 gap-2">
          {(["amistad", "confianza", "respeto", "afecto"] as const).map(k => (
            <label key={k} className="flex flex-col gap-1">
              <FL label={k.charAt(0).toUpperCase() + k.slice(1)} />
              <Inp
                type="number"
                value={estado[k]}
                onChange={e => setEstado(prev => ({ ...prev, [k]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <FL label="Estación actual" />
          <select
            value={estado.estacion}
            onChange={e => setEstado(prev => ({ ...prev, estacion: e.target.value }))}
            style={{ ...inputStyle, padding: "5px 8px" }}
          >
            <option value="">— sin estación —</option>
            {["Florial", "Luviern", "Ardent", "Nievorn"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <FL label="Temas conversados (claves separadas por coma)" />
          <Inp
            value={estado.temasConversados}
            onChange={e => setEstado(prev => ({ ...prev, temasConversados: e.target.value }))}
            placeholder="nima, recorridos…"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={simular}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{ background: "var(--primary)", color: "var(--btn-text, #fff)" }}
      >
        <Play size={12} /> Simular
      </button>

      {/* Resultado */}
      {resultado && (
        <div className="flex flex-col gap-3" style={{ borderTop: BORDER, paddingTop: 12 }}>
          <FL label="Resultado" />

          {resultado.ganadora ? (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{ background: "color-mix(in srgb, #22c55e 10%, transparent)", border: "1px solid color-mix(in srgb, #22c55e 25%, transparent)" }}
            >
              <Check size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                Variante seleccionada: <em style={{ fontStyle: "normal" }}>{resultado.ganadora.clave}</em>
              </span>
              <span style={{ color: MUTED, marginLeft: "auto" }}>
                P{resultado.ganadora.prioridad}
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{ background: "color-mix(in srgb, #ef4444 8%, transparent)", border: "1px solid color-mix(in srgb, #ef4444 20%, transparent)" }}
            >
              <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span style={{ color: "var(--primary)" }}>Ninguna variante cumple las condiciones.</span>
            </div>
          )}

          {resultado.evaluaciones.map(({ variante, pasa, detalles }) => (
            <div
              key={variante.clave}
              className="flex flex-col gap-1 p-3 rounded-xl text-xs"
              style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)", border: BORDER }}
            >
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: pasa ? "#22c55e" : MUTED,
                  }}
                />
                <span style={{ fontWeight: 600, color: "var(--primary)" }}>{variante.clave}</span>
                <span style={{ color: MUTED }}>· P{variante.prioridad}</span>
                {resultado.ganadora?.clave === variante.clave && (
                  <span
                    className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "color-mix(in srgb, #22c55e 15%, transparent)", color: "#22c55e" }}
                  >
                    seleccionada
                  </span>
                )}
              </div>
              {detalles.length === 0 && (
                <span style={{ color: MUTED, paddingLeft: 15 }}>sin requisitos — siempre disponible</span>
              )}
              {detalles.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5" style={{ paddingLeft: 15 }}>
                  {d.pasa
                    ? <Check size={10} style={{ color: "#22c55e", flexShrink: 0 }} />
                    : <X     size={10} style={{ color: "#ef4444", flexShrink: 0 }} />
                  }
                  <span style={{ color: d.pasa ? MUTED : "#ef4444" }}>{d.label}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Temas disponibles */}
          <div className="flex flex-col gap-2" style={{ borderTop: BORDER, paddingTop: 10 }}>
            <FL label="Temas disponibles con este estado" />
            <div className="flex flex-wrap gap-1.5">
              {temas.map(t => {
                const conversados = estado.temasConversados.split(",").map(s => s.trim());
                const prereqOk = !t.requiere_tema || conversados.includes(t.requiere_tema);
                // Evaluar req social legacy
                const rs = t.requisito_social ?? {};
                const socialOk =
                  (rs.amistad_min   == null || estado.amistad   >= rs.amistad_min) &&
                  (rs.confianza_min == null || estado.confianza >= rs.confianza_min) &&
                  (rs.respeto_min   == null || estado.respeto   >= rs.respeto_min) &&
                  (rs.afecto_min    == null || estado.afecto    >= rs.afecto_min);
                const condOk = !t._condiciones || t._condiciones.length === 0 ||
                  (t._operador_logico === "OR"
                    ? t._condiciones.some(c => evalCondicion(c, estado))
                    : t._condiciones.every(c => evalCondicion(c, estado)));
                const disponible = prereqOk && socialOk && condOk;
                return (
                  <span
                    key={t.clave}
                    className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{
                      background: disponible
                        ? "color-mix(in srgb, #22c55e 10%, transparent)"
                        : "color-mix(in srgb, var(--primary) 4%, transparent)",
                      color: disponible ? "#22c55e" : MUTED,
                      border: disponible
                        ? "1px solid color-mix(in srgb, #22c55e 25%, transparent)"
                        : BORDER,
                      textDecoration: disponible ? "none" : "line-through",
                    }}
                    title={!prereqOk ? `Requiere tema: ${t.requiere_tema}` : !socialOk ? "Requisito social no cumplido" : ""}
                  >
                    {t.clave}
                    {!prereqOk && <span style={{ marginLeft: 4, fontSize: 9 }}>(req. tema)</span>}
                  </span>
                );
              })}
              {temas.length === 0 && (
                <span className="text-xs" style={{ color: MUTED }}>Sin temas definidos.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LineaEditor ───────────────────────────────────────────────────────────────
// Editor de una línea de diálogo: texto, hablante, refs y condiciones opcionales

function LineaEditor({
  linea,
  onChange,
  onDelete,
  personajes,
}: {
  linea: DialogoLinea;
  onChange: (l: DialogoLinea) => void;
  onDelete: () => void;
  personajes: Array<{ id: string; nombre: string }>;
}) {
  const [showRefMenu,  setShowRefMenu]  = useState(false);
  const [showCondMenu, setShowCondMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Si hay _refs las usamos; si no, reconstruimos a partir de texto plano
  const refs: DialogoLinea["_refs"] = linea._refs ?? [linea.texto];
  const hasCustomRefs = linea._refs && linea._refs.some(r => typeof r !== "string");

  const lineConds: Condicion[] = linea._condiciones ?? [];
  const lineOp:   "AND" | "OR" = linea._operador_logico ?? "AND";
  const hasConds = lineConds.length > 0;

  const renderRefs = () =>
    refs.map((r, i) =>
      typeof r === "string" ? (
        <span key={i} style={{ color: "var(--primary)", fontSize: 12 }}>{r}</span>
      ) : (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            background: "color-mix(in srgb, #a855f7 15%, transparent)",
            color: "color-mix(in srgb, #a855f7 85%, var(--primary))",
            border: "1px solid color-mix(in srgb, #a855f7 25%, transparent)",
            borderRadius: 5,
            padding: "1px 7px",
            fontSize: 11,
            cursor: "pointer",
          }}
          title={`${r.tipo} · ${r.id}`}
        >
          <Link2 size={9} />
          {r.nombre}
        </span>
      )
    );

  const insertRef = (tipo: "personaje" | "lugar" | "mision", item: { id: string; nombre: string }) => {
    const newRefs: DialogoLinea["_refs"] = [...refs, { tipo, id: item.id, nombre: item.nombre }];
    onChange({
      ...linea,
      _refs: newRefs,
      texto: newRefs.map(r => typeof r === "string" ? r : r.nombre).join(""),
    });
    setShowRefMenu(false);
  };

  const linBg = "color-mix(in srgb, var(--primary) 4%, var(--bg-main))";
  const condBg = hasConds
    ? "color-mix(in srgb, #f97316 8%, transparent)"
    : "transparent";
  const condBorder = hasConds
    ? "1px solid color-mix(in srgb, #f97316 25%, transparent)"
    : BORDER;

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-xl"
      style={{ background: linBg, border: BORDER }}
    >
      {/* Texto / preview con píldoras */}
      {hasCustomRefs ? (
        <div
          className="flex flex-wrap items-center gap-1 rounded-xl p-2 min-h-[40px]"
          style={{ ...inputStyle, height: "auto", lineHeight: 1.8 }}
        >
          {renderRefs()}
          <button
            type="button"
            style={{ fontSize: 10, color: MUTED, marginLeft: 4 }}
            onClick={() => onChange({ ...linea, _refs: undefined })}
            title="Editar como texto plano"
          >
            [editar]
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            className="flex-1 outline-none rounded-xl"
            style={{ ...inputStyle, padding: "4px 8px", resize: "none", flex: 1 }}
            placeholder="Texto del diálogo…"
            value={linea.texto}
            onChange={e => onChange({ ...linea, texto: e.target.value, _refs: undefined })}
          />
          <button
            type="button"
            onClick={onDelete}
            style={{ color: MUTED, flexShrink: 0, marginTop: 4 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Fila: hablante + botones */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] shrink-0" style={{ color: MUTED }}>Hablante</span>
        {personajes.length > 0 ? (
          <select
            value={linea.hablante}
            onChange={e => onChange({ ...linea, hablante: e.target.value })}
            style={{ ...inputStyle, padding: "3px 8px", flex: 1 }}
          >
            <option value="">— hablante —</option>
            {personajes.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        ) : (
          <Inp
            style={{ flex: 1 }}
            placeholder="Nombre…"
            value={linea.hablante}
            onChange={e => onChange({ ...linea, hablante: e.target.value })}
          />
        )}

        {/* Insertar referencia */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => { setShowRefMenu(v => !v); setShowCondMenu(false); }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
            style={{ color: MUTED, border: BORDER, background: "transparent" }}
            title="Insertar referencia dinámica"
          >
            <Link2 size={10} /> Ref. <ChevronDown size={9} />
          </button>
          {showRefMenu && (
            <div
              className="absolute flex flex-col gap-1 p-2 rounded-xl z-10"
              style={{
                top: "calc(100% + 4px)", right: 0,
                background: "var(--bg-main)",
                border: BORDER,
                minWidth: 160,
                boxShadow: "0 4px 16px rgba(0,0,0,.12)",
              }}
            >
              <span className="text-[9px] font-semibold px-1" style={{ color: MUTED }}>Personajes</span>
              {personajes.slice(0, 8).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => insertRef("personaje", p)}
                  className="text-left text-xs px-2 py-1 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: "var(--primary)" }}
                >
                  {p.nombre}
                </button>
              ))}
              <div style={{ borderTop: BORDER, margin: "4px 0" }} />
              <span className="text-[9px] font-semibold px-1" style={{ color: MUTED }}>Tipos</span>
              {(["lugar", "mision"] as const).map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    const nombre = prompt(`Nombre del ${tipo}:`);
                    if (nombre) insertRef(tipo, { id: uid(), nombre });
                  }}
                  className="text-left text-xs px-2 py-1 rounded-lg"
                  style={{ color: MUTED }}
                >
                  + {tipo}…
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowRefMenu(false)}
                className="text-[10px] text-center"
                style={{ color: MUTED, marginTop: 2 }}
              >
                cerrar
              </button>
            </div>
          )}
        </div>

        {/* Botón condición de línea */}
        <button
          type="button"
          onClick={() => { setShowCondMenu(v => !v); setShowRefMenu(false); }}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
          style={{
            color: hasConds ? "#f97316" : MUTED,
            border: condBorder,
            background: condBg,
          }}
          title="Condición de esta línea"
        >
          <Lock size={9} />
          {hasConds ? `${lineConds.length} cond.` : "Cond."}
        </button>

        {hasCustomRefs && (
          <button
            type="button"
            onClick={onDelete}
            style={{ color: MUTED, flexShrink: 0, marginLeft: "auto" }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Panel de condiciones de la línea — inline, expandible */}
      {showCondMenu && (
        <div
          className="flex flex-col gap-2 p-2 rounded-xl"
          style={{
            background: "color-mix(in srgb, #f97316 5%, var(--bg-main))",
            border: "1px solid color-mix(in srgb, #f97316 20%, transparent)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "#f97316" }}>
              Esta línea solo se muestra si…
            </span>
            {hasConds && (
              <button
                type="button"
                onClick={() => onChange({ ...linea, _condiciones: [], _operador_logico: undefined })}
                className="text-[9px]"
                style={{ color: MUTED }}
              >
                limpiar
              </button>
            )}
          </div>
          <CondicionBuilder
            condiciones={lineConds}
            operador={lineOp}
            onChange={c => onChange({ ...linea, _condiciones: c })}
            onOpChange={op => onChange({ ...linea, _operador_logico: op })}
          />
          {!hasConds && (
            <p className="text-[9px]" style={{ color: MUTED }}>
              Sin condiciones — esta línea siempre se muestra dentro de la variante.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── DialogosSection ───────────────────────────────────────────────────────────

export function DialogosSection() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [personajes, setPersonajes] = useState<any[]>([]);
  const [selPjId,    setSelPjId]    = useState<string | null>(null);
  const [selPjNombre,setSelPjNombre]= useState<string>("");
  const [dialRows,   setDialRows]   = useState<any[]>([]);
  const [selRowId,   setSelRowId]   = useState<string | null>(null);
  const [dialogo,    setDialogo]    = useState<DialogoDoc | null>(null);
  const [sinDialogos,setSinDialogos]= useState(false);   // Mejora 6
  const [loading,    setLoading]    = useState(false);
  const [creating,   setCreating]   = useState(false);   // Mejora 6
  const [q,          setQ]          = useState("");

  const [selEntry,   setSelEntry]   = useState<EntryRef>(null);
  const [panelTab,   setPanelTab]   = useState<PanelTab>("contenido");
  const [isDirty,    setIsDirty]    = useState(false);

  // Sidebar tree state (Diseño B)
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());
  const [variantesOpen, setVariantesOpen] = useState(true);
  const [temasOpen,     setTemasOpen]     = useState(true);

  const toggleTemaBranch = (clave: string) =>
    setCollapsedBranches(prev => {
      const next = new Set(prev);
      next.has(clave) ? next.delete(clave) : next.add(clave);
      return next;
    });

  // Variante form
  const [vClave,       setVClave]       = useState("");
  const [vPrio,        setVPrio]        = useState(0);
  const [vLineas,      setVLineas]      = useState<DialogoLinea[]>([]);
  const [vCondiciones, setVCondiciones] = useState<Condicion[]>([]);
  const [vOpLogico,    setVOpLogico]    = useState<"AND" | "OR">("AND");

  // Tema form
  const [tClave,        setTClave]        = useState("");
  const [tTexto,        setTTexto]        = useState("");
  const [tEvento,       setTEvento]       = useState("");
  const [tJugador,      setTJugador]      = useState("");
  const [tRespuesta,    setTRespuesta]    = useState("");
  const [tRespRep,      setTRespRep]      = useState("");
  const [tRequiereTema, setTRequiereTema] = useState("");
  const [tCondiciones,  setTCondiciones]  = useState<Condicion[]>([]);
  const [tOpLogico,     setTOpLogico]     = useState<"AND" | "OR">("AND");

  const { saving, saved, error, run } = useSave();

  // Marcar dirty cuando cambian los campos del formulario
  const markDirty = () => setIsDirty(true);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadPersonajes = useCallback(async () => {
    const { data } = await supabase
      .from("personajes_game")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    const pjs = data ?? [];
    setPersonajes(pjs);
    if (pjs.length > 0) await selectPersonaje(pjs[0].id, pjs[0].nombre);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPersonajes(); }, [loadPersonajes]);

  const selectPersonaje = async (pid: string, nombre?: string) => {
    setSelPjId(pid);
    setSelPjNombre(nombre ?? personajes.find(p => p.id === pid)?.nombre ?? "");
    setLoading(true);
    setSelEntry(null);
    setDialogo(null);
    setSinDialogos(false);
    setDialRows([]);
    setSelRowId(null);
    setIsDirty(false);
    const { data } = await supabase
      .from("dialogos_game")
      .select("id, clave, dialogo, activo")
      .eq("personaje_id", pid)
      .order("clave");
    const rows = data ?? [];
    setDialRows(rows);
    if (rows[0]) {
      applyRow(rows[0]);
    } else {
      setSinDialogos(true); // Mejora 6
    }
    setLoading(false);
  };

  const applyRow = (row: any) => {
    setSelRowId(row.id);
    setSelEntry(null);
    const raw = row.dialogo;
    const doc = Array.isArray(raw) ? raw[0] : raw;
    setDialogo({
      variantes:          doc?.variantes          ?? [],
      temas_conversacion: doc?.temas_conversacion ?? [],
    });
    setSinDialogos(false);
  };

  // ── Mejora 6: Crear diálogos para personaje sin registros ─────────────────

  const crearDialogos = async () => {
    if (!selPjId) return;
    setCreating(true);
    const docVacio: DialogoDoc = {
      variantes: [{ clave: "principal", lineas: [{ texto: "", hablante: "" }], prioridad: 0 }],
      temas_conversacion: [],
    };
    const { data, error: err } = await supabase
      .from("dialogos_game")
      .insert({ personaje_id: selPjId, clave: "principal", dialogo: [docVacio], activo: true })
      .select()
      .single();
    setCreating(false);
    if (err) {
      alert(`Error al crear: ${err.message}`);
      return;
    }
    if (data) {
      setDialRows([data]);
      applyRow(data);
    }
  };

  // ── Pick entries ─────────────────────────────────────────────────────────────

  const pickVariante = (v: Variante, idx: number) => {
    setSelEntry({ type: "variante", index: idx });
    setPanelTab("contenido");
    setVClave(v.clave);
    setVPrio(v.prioridad);
    setVLineas(JSON.parse(JSON.stringify(v.lineas ?? [])));
    setVCondiciones(JSON.parse(JSON.stringify(v._condiciones ?? [])));
    setVOpLogico(v._operador_logico ?? "AND");
    setIsDirty(false);
  };

  const pickTema = (t: TemaConversacion, idx: number) => {
    setSelEntry({ type: "tema", index: idx });
    setPanelTab("contenido");
    setTClave(t.clave);
    setTTexto(t.texto);
    setTEvento(t.evento);
    setTJugador(t.jugador);
    setTRespuesta(t.respuesta);
    setTRespRep(t.respuesta_repetida ?? "");
    setTRequiereTema(t.requiere_tema ?? "");
    setTCondiciones(JSON.parse(JSON.stringify(t._condiciones ?? [])));
    setTOpLogico(t._operador_logico ?? "AND");
    setIsDirty(false);
  };

  // ── Add entries ───────────────────────────────────────────────────────────────

  const addVariante = () => {
    if (!dialogo) return;
    const idx = dialogo.variantes.length;
    const v: Variante = {
      clave:     `variante_${Date.now()}`,
      lineas:    [{ texto: "", hablante: "" }],
      prioridad: 0,
    };
    setDialogo({ ...dialogo, variantes: [...dialogo.variantes, v] });
    pickVariante(v, idx);
  };

  const addTema = () => {
    if (!dialogo) return;
    const idx = dialogo.temas_conversacion.length;
    const t: TemaConversacion = {
      clave: `tema_${Date.now()}`, texto: "", evento: "", jugador: "", respuesta: "",
    };
    setDialogo({ ...dialogo, temas_conversacion: [...dialogo.temas_conversacion, t] });
    pickTema(t, idx);
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const save = () => run(async () => {
    if (!dialogo || !selEntry || !selPjId) return;

    // Preservamos todos los campos desconocidos del objeto original
    const updated: DialogoDoc = JSON.parse(JSON.stringify(dialogo));

    if (selEntry.type === "variante") {
      const original = dialogo.variantes[selEntry.index] ?? {};
      // Derivar requisito_social desde condiciones visuales
      const socialConds = vCondiciones.filter(c => c.tipo === "social");
      const reqSocial: RequisitoSocial = {};
      for (const c of socialConds) {
        if (c.campo === "amistad")   reqSocial.amistad_min   = Number(c.valor);
        if (c.campo === "confianza") reqSocial.confianza_min = Number(c.valor);
        if (c.campo === "respeto")   reqSocial.respeto_min   = Number(c.valor);
        if (c.campo === "afecto")    reqSocial.afecto_min    = Number(c.valor);
      }
      const estConds = vCondiciones.filter(c => c.tipo === "estacion").map(c => c.campo);

      updated.variantes[selEntry.index] = {
        ...original,                      // preservar campos desconocidos
        clave:     vClave,
        lineas:    vLineas,
        prioridad: vPrio,
        _condiciones:    vCondiciones,
        _operador_logico: vOpLogico,
        ...(Object.keys(reqSocial).length ? { requisito_social: reqSocial } : { requisito_social: undefined }),
        ...(estConds.length ? { requisito_contextual: { estaciones: estConds } } : { requisito_contextual: undefined }),
      };
    } else {
      const original = dialogo.temas_conversacion[selEntry.index] ?? {};
      const socialConds = tCondiciones.filter(c => c.tipo === "social");
      const reqSocial: RequisitoSocial = {};
      for (const c of socialConds) {
        if (c.campo === "amistad")   reqSocial.amistad_min   = Number(c.valor);
        if (c.campo === "confianza") reqSocial.confianza_min = Number(c.valor);
        if (c.campo === "respeto")   reqSocial.respeto_min   = Number(c.valor);
        if (c.campo === "afecto")    reqSocial.afecto_min    = Number(c.valor);
      }

      updated.temas_conversacion[selEntry.index] = {
        ...original,
        clave:     tClave,
        texto:     tTexto,
        evento:    tEvento,
        jugador:   tJugador,
        respuesta: tRespuesta,
        _condiciones:    tCondiciones,
        _operador_logico: tOpLogico,
        ...(tRespRep      ? { respuesta_repetida: tRespRep }  : { respuesta_repetida: undefined }),
        ...(tRequiereTema ? { requiere_tema: tRequiereTema }   : { requiere_tema: undefined }),
        ...(Object.keys(reqSocial).length ? { requisito_social: reqSocial } : { requisito_social: undefined }),
      };
    }

    setDialogo(updated);
    const payload = [updated];

    if (selRowId) {
      const { error: err } = await supabase
        .from("dialogos_game")
        .update({ dialogo: payload })
        .eq("id", selRowId);
      if (err) throw new Error(err.message);
    } else {
      const { data, error: err } = await supabase
        .from("dialogos_game")
        .insert({ personaje_id: selPjId, clave: "principal", dialogo: payload, activo: true })
        .select()
        .single();
      if (err) throw new Error(err.message);
      if (data) setSelRowId(data.id);
    }

    setIsDirty(false);
  });

  // ── Descartar cambios ─────────────────────────────────────────────────────────

  const descartar = () => {
    if (!selEntry || !dialogo) return;
    if (selEntry.type === "variante") {
      pickVariante(dialogo.variantes[selEntry.index], selEntry.index);
    } else {
      pickTema(dialogo.temas_conversacion[selEntry.index], selEntry.index);
    }
    setIsDirty(false);
  };

  // ── Delete entry ──────────────────────────────────────────────────────────────

  const deleteEntry = async () => {
    if (!dialogo || !selEntry || !selRowId) return;
    if (!confirm("¿Eliminar esta entrada?")) return;
    const updated: DialogoDoc = JSON.parse(JSON.stringify(dialogo));
    if (selEntry.type === "variante") {
      updated.variantes.splice(selEntry.index, 1);
    } else {
      updated.temas_conversacion.splice(selEntry.index, 1);
    }
    setDialogo(updated);
    setSelEntry(null);
    const { error: err } = await supabase
      .from("dialogos_game")
      .update({ dialogo: [updated] })
      .eq("id", selRowId);
    if (err) console.error("Error al eliminar:", err.message);
  };

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const variantes = dialogo?.variantes ?? [];
  const temas     = dialogo?.temas_conversacion ?? [];
  // Filtrar por clave conservando índice original
  const filteredV = variantes
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => !q || v.clave.includes(q));
  const filteredT = temas
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !q || t.clave.includes(q) || t.texto?.includes(q));

  const isActive = (type: "variante" | "tema", idx: number) =>
    selEntry?.type === type && selEntry.index === idx;

  // ── Panel tabs para Variante ──────────────────────────────────────────────────

  const PANEL_TABS: Array<{ id: PanelTab; label: string }> = [
    { id: "contenido",  label: "Contenido" },
    { id: "simulador",  label: "Simulador" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 min-h-0 h-full">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0 h-full"
        style={{
          width: 248,
          background: "color-mix(in srgb, var(--primary) 3%, var(--bg-main))",
          borderRight: BORDER,
        }}
      >
        {/* Controls */}
        <div className="flex flex-col gap-2 p-3" style={{ borderBottom: BORDER }}>
          <select
            value={selPjId ?? ""}
            onChange={e => {
              const opt = personajes.find(p => p.id === e.target.value);
              selectPersonaje(e.target.value, opt?.nombre);
            }}
            style={{ ...inputStyle, padding: "5px 8px" }}
          >
            <option value="">— Personaje —</option>
            {personajes.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {dialRows.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {dialRows.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => applyRow(r)}
                  className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                  style={{
                    background: r.id === selRowId
                      ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                      : "color-mix(in srgb, var(--primary) 5%, transparent)",
                    color: r.id === selRowId ? "var(--primary)" : MUTED,
                    border: BORDER,
                  }}
                >
                  {r.clave}
                </button>
              ))}
            </div>
          )}

          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
            style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", border: BORDER }}
          >
            <Search size={11} style={{ color: MUTED, flexShrink: 0 }} />
            <input
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Entry list — Diseño B: Árbol de dependencias */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={16} className="animate-spin" style={{ color: MUTED }} />
            </div>

          /* ── Mejora 6: Personaje sin diálogos ── */
          ) : sinDialogos ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-10">
              <MessageCircle size={28} style={{ color: MUTED, opacity: 0.4 }} />
              <p className="text-xs text-center" style={{ color: MUTED }}>
                {selPjNombre || "Este personaje"} no tiene diálogos todavía.
              </p>
              <button
                type="button"
                onClick={crearDialogos}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: "var(--primary)",
                  color: "var(--btn-text, #fff)",
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Crear conjunto de diálogos
              </button>
            </div>

          ) : (
            <>
              {/* ── VARIANTES (lista plana colapsable) ── */}
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-1.5"
                onClick={() => setVariantesOpen(v => !v)}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
                  <ChevronRight
                    size={10}
                    style={{
                      color: MUTED,
                      transition: "transform .15s",
                      transform: variantesOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  />
                  Variantes ({filteredV.length})
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); addVariante(); }}
                  style={{ color: MUTED }}
                  title="Nueva variante"
                >
                  <Plus size={11} />
                </button>
              </button>

              {variantesOpen && filteredV.map(({ v, i }) => {
                const kind   = reqKind(v);
                const active = isActive("variante", i);
                return (
                  <button
                    key={v.clave + i}
                    type="button"
                    onClick={() => pickVariante(v, i)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      background:  active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                      borderLeft:  active ? "2px solid var(--primary)" : "2px solid transparent",
                    }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: DOT_COLOR[kind], flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--primary)" }}>
                        {v.clave}
                        {active && isDirty && (
                          <span style={{ marginLeft: 5, display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", verticalAlign: "middle" }} />
                        )}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: MUTED }}>
                        {v.lineas?.length ?? 0} {v.lineas?.length === 1 ? "línea" : "líneas"}
                        {kind === "season" && " · estacional"}
                        {kind === "social" && " · social"}
                        {kind === "mixed"  && " · social + estacional"}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: MUTED }}
                    >
                      P{v.prioridad}
                    </span>
                  </button>
                );
              })}

              {/* ── TEMAS (árbol de dependencias) ── */}
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-1.5 mt-2"
                style={{ borderTop: BORDER }}
                onClick={() => setTemasOpen(v => !v)}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
                  <ChevronRight
                    size={10}
                    style={{
                      color: MUTED,
                      transition: "transform .15s",
                      transform: temasOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  />
                  Temas ({filteredT.length})
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); addTema(); }}
                  style={{ color: MUTED }}
                  title="Nuevo tema"
                >
                  <Plus size={11} />
                </button>
              </button>

              {temasOpen && (() => {
                // Construir árbol: raíces → hijos directos
                const allTemas = temas;
                const allClaves = new Set(allTemas.map(t => t.clave));

                // Hijos de cada tema (indexados por requiere_tema)
                const childrenOf: Record<string, number[]> = {};
                const roots: number[] = [];

                allTemas.forEach((t, i) => {
                  const req = t.requiere_tema;
                  if (req && allClaves.has(req)) {
                    if (!childrenOf[req]) childrenOf[req] = [];
                    childrenOf[req].push(i);
                  } else {
                    roots.push(i);
                  }
                });

                // Filtrado: si hay búsqueda, mostramos sólo los que coinciden
                const matchesFilter = (idx: number) => {
                  const t = allTemas[idx];
                  return !q || t.clave.includes(q) || t.texto?.includes(q);
                };

                // Nodo recursivo
                const renderTemaNode = (idx: number, depth: number): React.ReactNode => {
                  const t      = allTemas[idx];
                  const kind   = reqKind(t);
                  const active = isActive("tema", idx);
                  const children = childrenOf[t.clave] ?? [];
                  const hasChildren = children.length > 0;
                  const isCollapsed = collapsedBranches.has(t.clave);

                  // Cuando hay filtro, omitir nodos que no coincidan y cuyo
                  // subárbol tampoco tenga coincidencias
                  const subtreeMatches = (i: number): boolean => {
                    if (matchesFilter(i)) return true;
                    return (childrenOf[allTemas[i].clave] ?? []).some(c => subtreeMatches(c));
                  };
                  if (q && !subtreeMatches(idx)) return null;

                  const paddingLeft = 12 + depth * 16;

                  return (
                    <React.Fragment key={t.clave + idx}>
                      <div
                        className="w-full flex items-center gap-2 py-1.5 text-left transition-colors"
                        style={{
                          paddingLeft,
                          paddingRight: 10,
                          background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                          borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        {/* Caret de colapso */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleTemaBranch(t.clave)}
                            style={{ color: MUTED, flexShrink: 0, lineHeight: 1, padding: 0 }}
                            title={isCollapsed ? "Expandir" : "Colapsar"}
                          >
                            <ChevronRight
                              size={10}
                              style={{
                                transition: "transform .15s",
                                transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                              }}
                            />
                          </button>
                        ) : (
                          <span style={{ width: 10, flexShrink: 0 }} />
                        )}

                        {/* Punto de color */}
                        <div
                          style={{ width: 7, height: 7, borderRadius: "50%", background: DOT_COLOR[kind], flexShrink: 0 }}
                          onClick={() => pickTema(t, idx)}
                        />

                        {/* Nombre */}
                        <div className="flex-1 min-w-0" onClick={() => pickTema(t, idx)}>
                          <p className="text-xs font-medium truncate" style={{ color: "var(--primary)" }}>
                            {t.clave}
                            {active && isDirty && (
                              <span style={{ marginLeft: 5, display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", verticalAlign: "middle" }} />
                            )}
                          </p>
                          {t.texto && !active && (
                            <p className="text-[10px] truncate" style={{ color: MUTED }}>{t.texto}</p>
                          )}
                        </div>

                        {/* Ícono de candado si tiene prerequisito */}
                        {t.requiere_tema && (
                          <span title={`Requiere: ${t.requiere_tema}`} style={{ flexShrink: 0, lineHeight: 0 }}>
                            <Lock size={9} style={{ color: MUTED }} />
                          </span>
                        )}
                      </div>

                      {/* Hijos (con línea vertical de árbol) */}
                      {hasChildren && !isCollapsed && (
                        <div style={{ borderLeft: `1.5px solid color-mix(in srgb, var(--primary) 10%, transparent)`, marginLeft: paddingLeft + 7 }}>
                          {children.map(ci => renderTemaNode(ci, depth + 1))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                };

                return (
                  <>
                    {roots.map(i => renderTemaNode(i, 0))}
                    {!loading && dialogo && roots.length === 0 && filteredT.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: MUTED }}>
                        Sin temas{q ? " que coincidan" : ""}
                      </p>
                    )}
                  </>
                );
              })()}

              {!loading && dialogo && filteredV.length === 0 && filteredT.length === 0 && !variantesOpen && !temasOpen && (
                <p className="text-xs text-center py-6" style={{ color: MUTED }}>
                  Sin entradas{q ? " que coincidan" : ""}
                </p>
              )}
            </>
          )}
        </div>

        {/* Leyenda — Diseño B */}
        <div className="p-3 flex gap-3 flex-wrap" style={{ borderTop: BORDER }}>
          {(["none", "social", "season", "mixed"] as const).map(k => (
            <div key={k} className="flex items-center gap-1">
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: DOT_COLOR[k] }} />
              <span className="text-[9px]" style={{ color: MUTED }}>
                {k === "none" ? "libre" : k === "social" ? "social" : k === "season" ? "estacional" : "mixto"}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <Lock size={8} style={{ color: MUTED }} />
            <span className="text-[9px]" style={{ color: MUTED }}>requiere</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
      {!selEntry ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: MUTED }}>
          <MessageCircle size={24} style={{ opacity: 0.3 }} />
          <p className="text-xs">Selecciona una variante o tema</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Panel header */}
          <div
            className="shrink-0 flex items-center justify-between gap-3 px-5 py-3"
            style={{ borderBottom: BORDER, background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Punto ámbar si hay cambios */}
              {isDirty && (
                <div
                  style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }}
                  title="Cambios sin guardar"
                />
              )}
              <span className="text-sm font-bold truncate" style={{ color: "var(--primary)" }}>
                {selEntry.type === "variante" ? vClave : tClave}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: selEntry.type === "variante"
                    ? "color-mix(in srgb, #a855f7 15%, transparent)"
                    : "color-mix(in srgb, #3b82f6 15%, transparent)",
                  color: selEntry.type === "variante"
                    ? "color-mix(in srgb, #a855f7 85%, var(--primary))"
                    : "color-mix(in srgb, #3b82f6 85%, var(--primary))",
                }}
              >
                {selEntry.type}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={deleteEntry}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: MUTED }}
                title="Eliminar entrada"
              >
                <Trash2 size={13} />
              </button>
              {isDirty && (
                <button
                  type="button"
                  onClick={descartar}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: MUTED, border: BORDER }}
                >
                  Descartar
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: saved
                    ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                    : "var(--primary)",
                  color: saved ? "var(--primary)" : "var(--btn-text, #fff)",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
                {saved ? "Guardado" : "Guardar"}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="flex items-center gap-2 px-5 py-2 text-xs"
              style={{ background: "color-mix(in srgb, #ef4444 8%, transparent)", color: "#ef4444", borderBottom: "1px solid color-mix(in srgb, #ef4444 20%, transparent)" }}
            >
              <AlertTriangle size={12} />
              {error}
            </div>
          )}

          {/* Pestañas */}
          <div className="flex" style={{ borderBottom: BORDER }}>
            {PANEL_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPanelTab(tab.id)}
                className="px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: panelTab === tab.id ? "var(--primary)" : MUTED,
                  borderBottom: panelTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                  background: "transparent",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

            {/* ── PESTAÑA: CONTENIDO ── */}
            {panelTab === "contenido" && selEntry.type === "variante" && (
              <VarianteContenido
                clave={vClave}           onClave={v => { setVClave(v);         markDirty(); }}
                prioridad={vPrio}        onPrioridad={v => { setVPrio(v);      markDirty(); }}
                condiciones={vCondiciones} onCondiciones={c => { setVCondiciones(c); markDirty(); }}
                opLogico={vOpLogico}     onOpLogico={op => { setVOpLogico(op); markDirty(); }}
                lineas={vLineas}         onLineas={v => { setVLineas(v);       markDirty(); }}
                personajes={personajes}
              />
            )}

            {panelTab === "contenido" && selEntry.type === "tema" && (
              <TemaContenido
                clave={tClave}            onClave={v => { setTClave(v);            markDirty(); }}
                texto={tTexto}            onTexto={v => { setTTexto(v);            markDirty(); }}
                evento={tEvento}          onEvento={v => { setTEvento(v);          markDirty(); }}
                jugador={tJugador}        onJugador={v => { setTJugador(v);        markDirty(); }}
                respuesta={tRespuesta}    onRespuesta={v => { setTRespuesta(v);    markDirty(); }}
                respRep={tRespRep}        onRespRep={v => { setTRespRep(v);        markDirty(); }}
                requiereTema={tRequiereTema} onRequiereTema={v => { setTRequiereTema(v); markDirty(); }}
                temasDisponibles={(dialogo?.temas_conversacion ?? []).map(t => t.clave).filter(c => c !== tClave)}
              />
            )}

            {/* ── PESTAÑA: SIMULADOR ── */}
            {panelTab === "simulador" && (
              <Simulador
                variantes={variantes}
                temas={temas}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VarianteContenido ─────────────────────────────────────────────────────────

function VarianteContenido({
  clave, onClave, prioridad, onPrioridad,
  condiciones, onCondiciones, opLogico, onOpLogico,
  lineas, onLineas, personajes,
}: {
  clave: string;           onClave: (v: string) => void;
  prioridad: number;       onPrioridad: (v: number) => void;
  condiciones: Condicion[]; onCondiciones: (c: Condicion[]) => void;
  opLogico: "AND" | "OR";  onOpLogico: (op: "AND" | "OR") => void;
  lineas: DialogoLinea[];  onLineas: (v: DialogoLinea[]) => void;
  personajes: any[];
}) {
  const setLinea = (i: number, patch: Partial<DialogoLinea>) =>
    onLineas(lineas.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLinea = () =>
    onLineas([...lineas, { texto: "", hablante: lineas[0]?.hablante ?? "" }]);
  const delLinea = (i: number) =>
    onLineas(lineas.filter((_, idx) => idx !== i));

  return (
    <>
      {/* Clave + Prioridad */}
      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <FL label="Clave" />
          <Inp value={clave} onChange={e => onClave(e.target.value)} placeholder="clave_variante" />
        </label>
        <label className="flex flex-col gap-1" style={{ width: 90 }}>
          <FL label="Prioridad" />
          <Inp type="number" value={prioridad} onChange={e => onPrioridad(Number(e.target.value))} />
        </label>
      </div>

      {/* Condiciones de la variante — inline */}
      <div className="flex flex-col gap-2" style={{ borderTop: BORDER, paddingTop: 8 }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
            Condiciones de la variante
            {condiciones.length > 0 && (
              <span
                className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: MUTED }}
              >
                {condiciones.length}
              </span>
            )}
          </span>
        </div>
        <CondicionBuilder
          condiciones={condiciones}
          operador={opLogico}
          onChange={onCondiciones}
          onOpChange={onOpLogico}
        />
      </div>

      {/* Líneas */}
      <div className="flex flex-col gap-2" style={{ borderTop: BORDER, paddingTop: 8 }}>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          Líneas
        </span>
        {lineas.map((l, i) => (
          <LineaEditor
            key={i}
            linea={l}
            onChange={patch => setLinea(i, patch)}
            onDelete={() => delLinea(i)}
            personajes={personajes}
          />
        ))}
        <button
          type="button"
          onClick={addLinea}
          className="self-start flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ color: MUTED, border: BORDER, background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}
        >
          <Plus size={10} /> Línea
        </button>
      </div>
    </>
  );
}

// ── TemaContenido ─────────────────────────────────────────────────────────────

function TemaContenido({
  clave, onClave, texto, onTexto, evento, onEvento,
  jugador, onJugador, respuesta, onRespuesta,
  respRep, onRespRep, requiereTema, onRequiereTema, temasDisponibles,
}: {
  clave: string;        onClave: (v: string) => void;
  texto: string;        onTexto: (v: string) => void;
  evento: string;       onEvento: (v: string) => void;
  jugador: string;      onJugador: (v: string) => void;
  respuesta: string;    onRespuesta: (v: string) => void;
  respRep: string;      onRespRep: (v: string) => void;
  requiereTema: string; onRequiereTema: (v: string) => void;
  temasDisponibles: string[];
}) {
  return (
    <>
      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <FL label="Clave" />
          <Inp value={clave} onChange={e => onClave(e.target.value)} placeholder="clave_tema" />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <FL label="Evento" />
          <Inp value={evento} onChange={e => onEvento(e.target.value)} placeholder="interesarse…" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <FL label="Texto UI (menú del jugador)" />
        <Inp value={texto} onChange={e => onTexto(e.target.value)} placeholder="Preguntar por…" />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="Pregunta del jugador" />
        <TA rows={2} value={jugador} onChange={e => onJugador(e.target.value)} placeholder="¿…?" />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="Respuesta" />
        <TA rows={3} value={respuesta} onChange={e => onRespuesta(e.target.value)} placeholder="Respuesta del NPC…" />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="Respuesta repetida (opcional)" />
        <TA rows={2} value={respRep} onChange={e => onRespRep(e.target.value)} placeholder="Si el jugador ya preguntó antes…" />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="Requiere tema previo" />
        <select
          value={requiereTema}
          onChange={e => onRequiereTema(e.target.value)}
          style={{ ...inputStyle, padding: "5px 8px" }}
        >
          <option value="">— sin prerequisito —</option>
          {temasDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
    </>
  );
}
