"use client";

/**
 * DialogosSection — editor de diálogos de game
 * ──────────────────────────────────────────────────────────────────────────
 * Layout de dos columnas (mockup 1 / Opción A):
 *   IZQUIERDA  → lista de Variantes + Temas del personaje seleccionado,
 *                con punto de color (verde / morado / naranja) y badge de prioridad.
 *   DERECHA    → formulario del ítem seleccionado.
 *
 * Estructura del JSON en dialogos_game.dialogo:
 *   [ { variantes: Variante[], temas_conversacion: TemaConversacion[] } ]
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  MessageCircle, Search, Plus, X,
  Loader2, Check, Save, Trash2,
} from "lucide-react";
import { supabase } from "@/infra/supabase/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DialogoLinea { texto: string; hablante: string }

interface RequisitoSocial {
  respeto_min?: number;
  confianza_min?: number;
  amistad_min?: number;
  afecto_min?: number;
}

interface RequisitoContextual { estaciones?: string[] }

interface Variante {
  clave: string;
  lineas: DialogoLinea[];
  prioridad: number;
  requisito_social?: RequisitoSocial;
  requisito_contextual?: RequisitoContextual;
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
}

interface DialogoDoc {
  variantes: Variante[];
  temas_conversacion: TemaConversacion[];
}

type EntryRef =
  | { type: "variante"; index: number }
  | { type: "tema"; index: number }
  | null;

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
  return (
    <input
      {...p}
      style={{ ...inputStyle, ...p.style }}
      className="outline-none"
    />
  );
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
  const [saved, setSaved] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    try { await fn(); } finally { setSaving(false); }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return { saving, saved, run };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function reqKind(entry: Variante | TemaConversacion): "social" | "season" | "none" {
  if (
    "requisito_contextual" in entry &&
    (entry as Variante).requisito_contextual?.estaciones?.length
  ) return "season";
  if (entry.requisito_social && Object.keys(entry.requisito_social).length > 0)
    return "social";
  return "none";
}

const DOT_COLOR: Record<"social" | "season" | "none", string> = {
  none:   "#22c55e",
  social: "#a855f7",
  season: "#f97316",
};

const MUTED  = "color-mix(in srgb, var(--primary) 35%, transparent)";
const BORDER = "1px solid color-mix(in srgb, var(--primary) 10%, transparent)";

// ── DialogosSection ───────────────────────────────────────────────────────────

export function DialogosSection() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [personajes, setPersonajes] = useState<any[]>([]);
  const [selPjId,    setSelPjId]    = useState<string | null>(null);
  const [dialRows,   setDialRows]   = useState<any[]>([]);
  const [selRowId,   setSelRowId]   = useState<string | null>(null);
  const [dialogo,    setDialogo]    = useState<DialogoDoc | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [q,          setQ]          = useState("");

  const [selEntry, setSelEntry] = useState<EntryRef>(null);

  // Variante form
  const [vClave,     setVClave]     = useState("");
  const [vPrio,      setVPrio]      = useState(0);
  const [vLineas,    setVLineas]    = useState<DialogoLinea[]>([]);
  const [vReqSocial, setVReqSocial] = useState<RequisitoSocial>({});
  const [vEstaciones,setVEstaciones]= useState("");   // UUIDs separados por coma

  // Tema form
  const [tClave,        setTClave]        = useState("");
  const [tTexto,        setTTexto]        = useState("");
  const [tEvento,       setTEvento]       = useState("");
  const [tJugador,      setTJugador]      = useState("");
  const [tRespuesta,    setTRespuesta]    = useState("");
  const [tRespRep,      setTRespRep]      = useState("");
  const [tRequiereTema, setTRequiereTema] = useState("");
  const [tReqSocial,    setTReqSocial]    = useState<RequisitoSocial>({});

  const { saving, saved, run } = useSave();

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadPersonajes = useCallback(async () => {
    const { data } = await supabase
      .from("personajes_game")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    const pjs = data ?? [];
    setPersonajes(pjs);
    if (pjs.length > 0) await selectPersonaje(pjs[0].id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPersonajes(); }, [loadPersonajes]);

  const selectPersonaje = async (pid: string) => {
    setSelPjId(pid);
    setLoading(true);
    setSelEntry(null);
    setDialogo(null);
    setDialRows([]);
    setSelRowId(null);
    const { data } = await supabase
      .from("dialogos_game")
      .select("id, clave, dialogo, activo")
      .eq("personaje_id", pid)
      .order("clave");
    const rows = data ?? [];
    setDialRows(rows);
    if (rows[0]) applyRow(rows[0]);
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
  };

  // ── Pick entries ─────────────────────────────────────────────────────────────

  const pickVariante = (v: Variante, idx: number) => {
    setSelEntry({ type: "variante", index: idx });
    setVClave(v.clave);
    setVPrio(v.prioridad);
    setVLineas(JSON.parse(JSON.stringify(v.lineas ?? [])));
    setVReqSocial(v.requisito_social ?? {});
    setVEstaciones((v.requisito_contextual?.estaciones ?? []).join(", "));
  };

  const pickTema = (t: TemaConversacion, idx: number) => {
    setSelEntry({ type: "tema", index: idx });
    setTClave(t.clave);
    setTTexto(t.texto);
    setTEvento(t.evento);
    setTJugador(t.jugador);
    setTRespuesta(t.respuesta);
    setTRespRep(t.respuesta_repetida ?? "");
    setTRequiereTema(t.requiere_tema ?? "");
    setTReqSocial(t.requisito_social ?? {});
  };

  // ── Add entries ───────────────────────────────────────────────────────────────

  const addVariante = () => {
    if (!dialogo) return;
    const idx = dialogo.variantes.length;
    const v: Variante = {
      clave:    `variante_${idx + 1}`,
      lineas:   [{ texto: "", hablante: "" }],
      prioridad: 0,
    };
    setDialogo({ ...dialogo, variantes: [...dialogo.variantes, v] });
    pickVariante(v, idx);
  };

  const addTema = () => {
    if (!dialogo) return;
    const idx = dialogo.temas_conversacion.length;
    const t: TemaConversacion = {
      clave: `tema_${idx + 1}`, texto: "", evento: "", jugador: "", respuesta: "",
    };
    setDialogo({ ...dialogo, temas_conversacion: [...dialogo.temas_conversacion, t] });
    pickTema(t, idx);
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const save = () => run(async () => {
    if (!dialogo || !selEntry || !selPjId) return;

    const updated: DialogoDoc = JSON.parse(JSON.stringify(dialogo));

    if (selEntry.type === "variante") {
      const reqSocial = Object.values(vReqSocial).some(v => v != null) ? vReqSocial : undefined;
      const estArray  = vEstaciones.split(",").map(s => s.trim()).filter(Boolean);
      updated.variantes[selEntry.index] = {
        clave:    vClave,
        lineas:   vLineas,
        prioridad: vPrio,
        ...(reqSocial ? { requisito_social: reqSocial } : {}),
        ...(estArray.length ? { requisito_contextual: { estaciones: estArray } } : {}),
      };
    } else {
      const reqSocial = Object.values(tReqSocial).some(v => v != null) ? tReqSocial : undefined;
      updated.temas_conversacion[selEntry.index] = {
        clave:    tClave,
        texto:    tTexto,
        evento:   tEvento,
        jugador:  tJugador,
        respuesta: tRespuesta,
        ...(tRespRep      ? { respuesta_repetida: tRespRep }      : {}),
        ...(tRequiereTema ? { requiere_tema: tRequiereTema }       : {}),
        ...(reqSocial     ? { requisito_social: reqSocial }        : {}),
      };
    }

    setDialogo(updated);
    const payload = [updated];

    if (selRowId) {
      await supabase.from("dialogos_game").update({ dialogo: payload }).eq("id", selRowId);
    } else {
      const { data } = await supabase
        .from("dialogos_game")
        .insert({ personaje_id: selPjId, clave: "principal", dialogo: payload, activo: true })
        .select()
        .single();
      if (data) setSelRowId(data.id);
    }
  });

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
    await supabase.from("dialogos_game").update({ dialogo: [updated] }).eq("id", selRowId);
  };

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const variantes = dialogo?.variantes ?? [];
  const temas     = dialogo?.temas_conversacion ?? [];
  const filteredV = q ? variantes.filter(v => v.clave.includes(q)) : variantes;
  const filteredT = q ? temas.filter(t => t.clave.includes(q) || t.texto?.includes(q)) : temas;

  const isActive = (type: "variante" | "tema", idx: number) =>
    selEntry?.type === type && selEntry.index === idx;

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
        {/* Controls: personaje + dialogo row tabs + search */}
        <div className="flex flex-col gap-2 p-3" style={{ borderBottom: BORDER }}>
          {/* Personaje selector */}
          <select
            value={selPjId ?? ""}
            onChange={e => selectPersonaje(e.target.value)}
            style={{ ...inputStyle, padding: "5px 8px" }}
          >
            <option value="">— Personaje —</option>
            {personajes.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {/* Dialogo-row tabs (solo si hay más de uno) */}
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

          {/* Search */}
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

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={16} className="animate-spin" style={{ color: MUTED }} />
            </div>
          ) : (
            <>
              {/* ── Variantes ── */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  Variantes ({filteredV.length})
                </span>
                <button
                  type="button"
                  onClick={addVariante}
                  style={{ color: MUTED }}
                  title="Nueva variante"
                >
                  <Plus size={11} />
                </button>
              </div>

              {filteredV.map((v, idx) => {
                const kind   = reqKind(v);
                const active = isActive("variante", idx);
                return (
                  <button
                    key={v.clave + idx}
                    type="button"
                    onClick={() => pickVariante(v, idx)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      background:  active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                      borderLeft:  active ? "2px solid var(--primary)" : "2px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: DOT_COLOR[kind], flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--primary)" }}>
                        {v.clave}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: MUTED }}>
                        {v.lineas?.length ?? 0}{" "}
                        {v.lineas?.length === 1 ? "línea" : "líneas"}
                        {kind === "social" &&
                          Object.entries(v.requisito_social ?? {})
                            .filter(([, val]) => val != null)
                            .map(([k, val]) => ` · ${k.replace("_min", "")} ≥ ${val}`)
                            .join("")}
                        {kind === "season" && " · estacional"}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: MUTED,
                      }}
                    >
                      P{v.prioridad}
                    </span>
                  </button>
                );
              })}

              {/* ── Temas ── */}
              <div
                className="flex items-center justify-between px-3 py-1.5 mt-2"
                style={{ borderTop: BORDER }}
              >
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: MUTED }}
                >
                  Temas ({filteredT.length})
                </span>
                <button
                  type="button"
                  onClick={addTema}
                  style={{ color: MUTED }}
                  title="Nuevo tema"
                >
                  <Plus size={11} />
                </button>
              </div>

              {filteredT.map((t, idx) => {
                const kind   = reqKind(t);
                const active = isActive("tema", idx);
                return (
                  <button
                    key={t.clave + idx}
                    type="button"
                    onClick={() => pickTema(t, idx)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                      borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: DOT_COLOR[kind], flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--primary)" }}>
                        {t.clave}
                      </p>
                      {t.texto && (
                        <p className="text-[10px] truncate" style={{ color: MUTED }}>
                          {t.texto}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Sin diálogos */}
              {!loading && dialogo &&
                filteredV.length === 0 &&
                filteredT.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: MUTED }}>
                    Sin entradas{q ? " que coincidan" : ""}
                  </p>
                )}
            </>
          )}
        </div>

        {/* Leyenda */}
        <div className="p-3 flex gap-4 flex-wrap" style={{ borderTop: BORDER }}>
          {(["none", "social", "season"] as const).map(k => (
            <div key={k} className="flex items-center gap-1">
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: DOT_COLOR[k] }} />
              <span className="text-[9px]" style={{ color: MUTED }}>
                {k === "none" ? "libre" : k === "social" ? "social" : "estacional"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
      {!selEntry ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: MUTED }}>
          <MessageCircle size={24} style={{ opacity: 0.3 }} />
          <p className="text-xs">Selecciona una variante o tema</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Panel header */}
          <div
            className="shrink-0 flex items-center justify-between gap-3 px-5 py-3"
            style={{
              borderBottom: BORDER,
              background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
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
                {saving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : saved ? (
                  <Check size={12} />
                ) : (
                  <Save size={12} />
                )}
                {saved ? "Guardado" : "Guardar"}
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {selEntry.type === "variante" ? (
              <VarianteForm
                clave={vClave}          onClave={setVClave}
                prioridad={vPrio}       onPrioridad={setVPrio}
                lineas={vLineas}        onLineas={setVLineas}
                reqSocial={vReqSocial}  onReqSocial={setVReqSocial}
                estaciones={vEstaciones} onEstaciones={setVEstaciones}
                personajes={personajes}
              />
            ) : (
              <TemaForm
                clave={tClave}            onClave={setTClave}
                texto={tTexto}            onTexto={setTTexto}
                evento={tEvento}          onEvento={setTEvento}
                jugador={tJugador}        onJugador={setTJugador}
                respuesta={tRespuesta}    onRespuesta={setTRespuesta}
                respRep={tRespRep}        onRespRep={setTRespRep}
                requiereTema={tRequiereTema} onRequiereTema={setTRequiereTema}
                reqSocial={tReqSocial}    onReqSocial={setTReqSocial}
                temasDisponibles={(dialogo?.temas_conversacion ?? [])
                  .map(t => t.clave)
                  .filter(c => c !== tClave)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VarianteForm ──────────────────────────────────────────────────────────────

const REQ_SOCIAL_KEYS: { key: keyof RequisitoSocial; label: string }[] = [
  { key: "respeto_min",   label: "Respeto mín." },
  { key: "confianza_min", label: "Confianza mín." },
  { key: "amistad_min",   label: "Amistad mín." },
  { key: "afecto_min",    label: "Afecto mín." },
];

function VarianteForm({
  clave, onClave, prioridad, onPrioridad,
  lineas, onLineas, reqSocial, onReqSocial,
  estaciones, onEstaciones, personajes,
}: {
  clave: string;      onClave: (v: string) => void;
  prioridad: number;  onPrioridad: (v: number) => void;
  lineas: DialogoLinea[];  onLineas: (v: DialogoLinea[]) => void;
  reqSocial: RequisitoSocial;  onReqSocial: (v: RequisitoSocial) => void;
  estaciones: string;  onEstaciones: (v: string) => void;
  personajes: any[];
}) {
  const setLinea = (i: number, patch: Partial<DialogoLinea>) =>
    onLineas(lineas.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLinea = () =>
    onLineas([...lineas, { texto: "", hablante: lineas[0]?.hablante ?? "" }]);
  const delLinea = (i: number) =>
    onLineas(lineas.filter((_, idx) => idx !== i));

  const linBg = "color-mix(in srgb, var(--primary) 4%, var(--bg-main))";

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
          <Inp
            type="number"
            value={prioridad}
            onChange={e => onPrioridad(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Líneas */}
      <div className="flex flex-col gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: MUTED, borderTop: BORDER, paddingTop: 6 }}
        >
          Líneas
        </span>
        {lineas.map((l, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: linBg, border: BORDER }}
          >
            <div className="flex items-start gap-2">
              <textarea
                rows={2}
                className="flex-1 outline-none rounded-xl"
                style={{ ...inputStyle, padding: "4px 8px", resize: "none", flex: 1 }}
                placeholder="Texto del diálogo…"
                value={l.texto}
                onChange={e => setLinea(i, { texto: e.target.value })}
              />
              <button
                type="button"
                onClick={() => delLinea(i)}
                style={{ color: MUTED, flexShrink: 0, marginTop: 4 }}
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] shrink-0" style={{ color: MUTED }}>Hablante</span>
              {personajes.length > 0 ? (
                <select
                  value={l.hablante}
                  onChange={e => setLinea(i, { hablante: e.target.value })}
                  style={{ ...inputStyle, padding: "3px 8px", flex: 1 }}
                >
                  <option value="">— hablante —</option>
                  {personajes.map((p: any) => (
                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              ) : (
                <Inp
                  style={{ flex: 1 }}
                  placeholder="Nombre…"
                  value={l.hablante}
                  onChange={e => setLinea(i, { hablante: e.target.value })}
                />
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addLinea}
          className="self-start flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
          style={{
            color: MUTED,
            border: BORDER,
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          }}
        >
          <Plus size={10} /> Línea
        </button>
      </div>

      {/* Requisitos sociales */}
      <div className="flex flex-col gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: MUTED, borderTop: BORDER, paddingTop: 6 }}
        >
          Requisitos sociales
        </span>
        <div className="grid grid-cols-2 gap-2">
          {REQ_SOCIAL_KEYS.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1">
              <FL label={label} />
              <Inp
                type="number"
                placeholder="—"
                value={(reqSocial[key] as number | undefined) ?? ""}
                onChange={e =>
                  onReqSocial({
                    ...reqSocial,
                    [key]: e.target.value !== "" ? Number(e.target.value) : undefined,
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>

      {/* Estaciones */}
      <div className="flex flex-col gap-1">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: MUTED, borderTop: BORDER, paddingTop: 6 }}
        >
          Estaciones (UUIDs separados por coma)
        </span>
        <TA
          rows={2}
          value={estaciones}
          onChange={e => onEstaciones(e.target.value)}
          placeholder="uuid-1, uuid-2, …"
        />
      </div>
    </>
  );
}

// ── TemaForm ──────────────────────────────────────────────────────────────────

function TemaForm({
  clave, onClave, texto, onTexto, evento, onEvento,
  jugador, onJugador, respuesta, onRespuesta,
  respRep, onRespRep, requiereTema, onRequiereTema,
  reqSocial, onReqSocial, temasDisponibles,
}: {
  clave: string;        onClave: (v: string) => void;
  texto: string;        onTexto: (v: string) => void;
  evento: string;       onEvento: (v: string) => void;
  jugador: string;      onJugador: (v: string) => void;
  respuesta: string;    onRespuesta: (v: string) => void;
  respRep: string;      onRespRep: (v: string) => void;
  requiereTema: string; onRequiereTema: (v: string) => void;
  reqSocial: RequisitoSocial;  onReqSocial: (v: RequisitoSocial) => void;
  temasDisponibles: string[];
}) {
  return (
    <>
      {/* Clave + Evento */}
      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <FL label="Clave" />
          <Inp value={clave} onChange={e => onClave(e.target.value)} placeholder="clave_tema" />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <FL label="Evento" />
          <Inp
            value={evento}
            onChange={e => onEvento(e.target.value)}
            placeholder="interesarse…"
          />
        </label>
      </div>

      {/* Texto UI */}
      <label className="flex flex-col gap-1">
        <FL label="Texto UI (menú del jugador)" />
        <Inp
          value={texto}
          onChange={e => onTexto(e.target.value)}
          placeholder="Preguntar por…"
        />
      </label>

      {/* Jugador */}
      <label className="flex flex-col gap-1">
        <FL label="Pregunta del jugador" />
        <TA rows={2} value={jugador} onChange={e => onJugador(e.target.value)} placeholder="¿…?" />
      </label>

      {/* Respuesta */}
      <label className="flex flex-col gap-1">
        <FL label="Respuesta" />
        <TA rows={3} value={respuesta} onChange={e => onRespuesta(e.target.value)} placeholder="Respuesta del NPC…" />
      </label>

      {/* Respuesta repetida */}
      <label className="flex flex-col gap-1">
        <FL label="Respuesta repetida (opcional)" />
        <TA
          rows={2}
          value={respRep}
          onChange={e => onRespRep(e.target.value)}
          placeholder="Si el jugador ya preguntó antes…"
        />
      </label>

      {/* Requiere tema previo */}
      <label className="flex flex-col gap-1">
        <FL label="Requiere tema previo" />
        <select
          value={requiereTema}
          onChange={e => onRequiereTema(e.target.value)}
          style={{ ...inputStyle, padding: "5px 8px" }}
        >
          <option value="">— sin prerequisito —</option>
          {temasDisponibles.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      {/* Requisitos sociales */}
      <div className="flex flex-col gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: MUTED, borderTop: BORDER, paddingTop: 6 }}
        >
          Requisitos sociales
        </span>
        <div className="grid grid-cols-2 gap-2">
          {REQ_SOCIAL_KEYS.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1">
              <FL label={label} />
              <Inp
                type="number"
                placeholder="—"
                value={(reqSocial[key] as number | undefined) ?? ""}
                onChange={e =>
                  onReqSocial({
                    ...reqSocial,
                    [key]: e.target.value !== "" ? Number(e.target.value) : undefined,
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
