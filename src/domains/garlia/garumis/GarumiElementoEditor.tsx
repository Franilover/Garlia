"use client";

/**
 * GarumiElementoEditor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel flotante con 3 tabs por elemento:
 *   1. Definición  — campos de texto + arrays
 *   2. Efectividades — tabla atacante × defensor con multiplicadores
 *   3. Ventajas innatas — lista de ventajas pasivas
 */

import { Check, Loader2, Save, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/infra/supabase/supabase";
import { ShellPortalFlotante } from "./GarumiEditor";

// ── Tokens ────────────────────────────────────────────────────────────────────

const BORDER     = "color-mix(in srgb, var(--primary) 8%, transparent)";
const BORDER_MED = "color-mix(in srgb, var(--primary) 12%, transparent)";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GarumiElemento {
  id: string;
  codigo: string;
  nombre: string;
  familia_manifestacion: string | null;
  principio: string | null;
  descripcion: string | null;
  fenomenos: string[] | null;
  capacidades: string[] | null;
  limites: string[] | null;
  relacion_ium: string | null;
  relacion_oris: string | null;
  estado_documentacion: string;
  notas_internas: string | null;
}

interface Efectividad {
  id: string;
  defensor_elemento_id: string;
  defensor_nombre: string;
  multiplicador: number;
  relacion: string;
  explicacion: string | null;
  condiciones: string | null;
}

interface Ventaja {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  efecto: string;
  limites: string | null;
  estado_documentacion: string;
}

type Tab = "definicion" | "efectividades" | "ventajas" | "garumis";

interface GarumiResumen {
  id: string;
  nombre: string;
  concepto: string | null;
  estado_documentacion: string;
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useGarumiElementos() {
  const [data, setData] = useState<GarumiElemento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    void supabase
      .from("garumi_elementos")
      .select("id, codigo, nombre, familia_manifestacion, principio, descripcion, fenomenos, capacidades, limites, relacion_ium, relacion_oris, estado_documentacion, notas_internas")
      .order("orden", { ascending: true })
      .then(({ data: rows, error }) => {
        if (off) return;
        if (!error) setData((rows ?? []) as GarumiElemento[]);
        setLoading(false);
      });
    return () => { off = true; };
  }, []);

  return { elementos: data, loading, setElementos: setData };
}

// ── Hooks secundarios (por elemento seleccionado) ─────────────────────────────

function useEfectividades(elementoId: string) {
  const [data, setData] = useState<Efectividad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    setLoading(true);
    void supabase
      .from("garumi_efectividades")
      .select(`
        id, defensor_elemento_id, multiplicador, relacion, explicacion, condiciones,
        defensor:garumi_elementos!garumi_efectividades_defensor_elemento_id_fkey(nombre)
      `)
      .eq("atacante_elemento_id", elementoId)
      .order("relacion")
      .then(({ data: rows }) => {
        if (off) return;
        setData(
          (rows ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            defensor_elemento_id: r.defensor_elemento_id as string,
            defensor_nombre: (r.defensor as { nombre: string } | null)?.nombre ?? "?",
            multiplicador: Number(r.multiplicador),
            relacion: r.relacion as string,
            explicacion: r.explicacion as string | null,
            condiciones: r.condiciones as string | null,
          }))
        );
        setLoading(false);
      });
    return () => { off = true; };
  }, [elementoId]);

  return { efectividades: data, loading };
}

function useVentajas(elementoId: string) {
  const [data, setData] = useState<Ventaja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    setLoading(true);
    void supabase
      .from("garumi_elemento_ventajas_innatas")
      .select("id, codigo, nombre, categoria, efecto, limites, estado_documentacion")
      .eq("elemento_id", elementoId)
      .then(({ data: rows }) => {
        if (off) return;
        setData((rows ?? []) as Ventaja[]);
        setLoading(false);
      });
    return () => { off = true; };
  }, [elementoId]);

  return { ventajas: data, loading };
}

// ── Hook: garumis de un elemento ──────────────────────────────────────────────

function useGarumisDeElemento(elementoId: string) {
  const [asignados, setAsignados] = useState<GarumiResumen[]>([]);
  const [todos, setTodos] = useState<GarumiResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    setLoading(true);
    void Promise.all([
      supabase
        .from("garumi_elemento_asignaciones")
        .select("garumi_id, garumis(id, nombre, concepto, estado_documentacion)")
        .eq("elemento_id", elementoId),
      supabase
        .from("garumis")
        .select("id, nombre, concepto, estado_documentacion")
        .order("nombre", { ascending: true }),
    ]).then(([asigRes, todosRes]) => {
      if (off) return;
      const asigRows = (asigRes.data ?? []).map((r: Record<string, unknown>) => r.garumis as GarumiResumen);
      setAsignados(asigRows.filter(Boolean));
      setTodos((todosRes.data ?? []) as GarumiResumen[]);
      setLoading(false);
    });
    return () => { off = true; };
  }, [elementoId]);

  async function asignar(garumiId: string) {
    await supabase.from("garumi_elemento_asignaciones").insert({ elemento_id: elementoId, garumi_id: garumiId });
    const found = todos.find((g) => g.id === garumiId);
    if (found) setAsignados((prev) => [...prev, found]);
  }

  async function desasignar(garumiId: string) {
    await supabase.from("garumi_elemento_asignaciones").delete().eq("elemento_id", elementoId).eq("garumi_id", garumiId);
    setAsignados((prev) => prev.filter((g) => g.id !== garumiId));
  }

  return { asignados, todos, loading, asignar, desasignar };
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-1" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <span className="text-[9px] font-black uppercase tracking-[0.22em]"
        style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
        {children}
      </span>
    </div>
  );
}

function CampoTexto({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  const style: React.CSSProperties = { fontSize: 11, color: "color-mix(in srgb, var(--primary) 70%, transparent)", borderColor: BORDER };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
        {label}
      </label>
      {multiline
        ? <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "—"} className="bg-transparent outline-none border-b resize-none placeholder:text-primary/20 leading-relaxed" style={style} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "—"} className="bg-transparent outline-none border-b pb-0.5 placeholder:text-primary/20" style={style} />
      }
    </div>
  );
}

function CampoArray({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void; }) {
  const [draft, setDraft] = useState("");
  function agregar() { const t = draft.trim(); if (!t) return; onChange([...value, t]); setDraft(""); }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
        {label}
      </label>
      {value.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {value.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 group">
              <span style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 60%, transparent)", flex: 1, lineHeight: 1.4 }}>{item}</span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary/25 hover:text-red-400">
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
          placeholder="Agregar…" className="flex-1 bg-transparent outline-none border-b pb-0.5 placeholder:text-primary/15"
          style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 60%, transparent)", borderColor: BORDER }} />
        <button type="button" onClick={agregar} className="text-primary/30 hover:text-primary transition-colors"><Check size={10} /></button>
      </div>
    </div>
  );
}

// ── Tab: Definición ───────────────────────────────────────────────────────────

function TabDefinicion({ form, setForm }: { form: GarumiElemento; setForm: React.Dispatch<React.SetStateAction<GarumiElemento>> }) {
  const set = (k: keyof GarumiElemento) => (v: string) => setForm((f) => ({ ...f, [k]: v || null }));
  return (
    <div className="grid h-full" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
      <div className="flex flex-col gap-4 p-4" style={{ borderRight: `1px solid ${BORDER}` }}>
        <CampoTexto label="Familia / manifestación" value={form.familia_manifestacion ?? ""} onChange={set("familia_manifestacion")} placeholder="ej. Térmica" />
        <CampoTexto label="Principio" value={form.principio ?? ""} onChange={set("principio")} />
        <CampoTexto label="Descripción" value={form.descripcion ?? ""} onChange={set("descripcion")} multiline />
        <CampoTexto label="Relación con IUMs" value={form.relacion_ium ?? ""} onChange={set("relacion_ium")} multiline />
        <CampoTexto label="Relación con Oris" value={form.relacion_oris ?? ""} onChange={set("relacion_oris")} multiline />
      </div>
      <div className="flex flex-col gap-5 p-4">
        <div><SectionLabel>Fenómenos</SectionLabel><div className="pt-2"><CampoArray label="" value={form.fenomenos ?? []} onChange={(v) => setForm((f) => ({ ...f, fenomenos: v }))} /></div></div>
        <div><SectionLabel>Capacidades</SectionLabel><div className="pt-2"><CampoArray label="" value={form.capacidades ?? []} onChange={(v) => setForm((f) => ({ ...f, capacidades: v }))} /></div></div>
        <div><SectionLabel>Límites</SectionLabel><div className="pt-2"><CampoArray label="" value={form.limites ?? []} onChange={(v) => setForm((f) => ({ ...f, limites: v }))} /></div></div>
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
          <CampoTexto label="Notas internas" value={form.notas_internas ?? ""} onChange={set("notas_internas")} multiline />
        </div>
      </div>
    </div>
  );
}

// ── Tab: Efectividades ────────────────────────────────────────────────────────

const RELACION_COLOR: Record<string, string> = {
  ventaja:    "color-mix(in srgb, #22c55e 70%, transparent)",
  desventaja: "color-mix(in srgb, #ef4444 70%, transparent)",
  neutral:    "color-mix(in srgb, var(--primary) 22%, transparent)",
  inmune:     "color-mix(in srgb, #a855f7 70%, transparent)",
  absorbe:    "color-mix(in srgb, #f59e0b 70%, transparent)",
};

const MULT_LABEL: Record<string, string> = {
  "2":    "×2",
  "1.5":  "×1.5",
  "1":    "×1",
  "0.5":  "×0.5",
  "0":    "×0",
};

function MultBadge({ valor, relacion }: { valor: number; relacion: string }) {
  const color = RELACION_COLOR[relacion] ?? "color-mix(in srgb, var(--primary) 30%, transparent)";
  const label = MULT_LABEL[String(valor)] ?? `×${valor}`;
  return (
    <span className="tabular-nums font-black" style={{ fontSize: 11, color }}>{label}</span>
  );
}

function TabEfectividades({ elementoId }: { elementoId: string }) {
  const { efectividades, loading } = useEfectividades(elementoId);
  const [expandido, setExpandido] = useState<string | null>(null);

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
    </div>
  );

  // Separate into groups for clarity
  const ventajas    = efectividades.filter((e) => e.relacion === "ventaja");
  const desventajas = efectividades.filter((e) => e.relacion === "desventaja");
  const resto       = efectividades.filter((e) => e.relacion !== "ventaja" && e.relacion !== "desventaja");

  function Fila({ e }: { e: Efectividad }) {
    const abierto = expandido === e.id;
    return (
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <button type="button" onClick={() => setExpandido(abierto ? null : e.id)}
          className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
          style={{ background: abierto ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "transparent" }}>
          <MultBadge valor={e.multiplicador} relacion={e.relacion} />
          <span className="flex-1 font-black uppercase tracking-widest" style={{ fontSize: 10, color: "var(--primary)" }}>
            {e.defensor_nombre}
          </span>
          <span className="uppercase tracking-widest" style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            {e.relacion}
          </span>
        </button>
        {abierto && (e.explicacion || e.condiciones) && (
          <div className="px-4 pb-3 flex flex-col gap-1.5">
            {e.explicacion && (
              <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.5 }}>
                {e.explicacion}
              </p>
            )}
            {e.condiciones && (
              <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontStyle: "italic" }}>
                Condición: {e.condiciones}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function Grupo({ titulo, items }: { titulo: string; items: Efectividad[] }) {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-4 py-1.5" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderBottom: `1px solid ${BORDER}` }}>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            {titulo}
          </span>
        </div>
        {items.map((e) => <Fila key={e.id} e={e} />)}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <Grupo titulo="Ventaja" items={ventajas} />
      <Grupo titulo="Desventaja" items={desventajas} />
      <Grupo titulo="Otros" items={resto} />
    </div>
  );
}

// ── Tab: Ventajas innatas ─────────────────────────────────────────────────────

const CATEGORIA_COLOR: Record<string, string> = {
  resistencia:           "#22c55e",
  percepcion:            "#60a5fa",
  adaptacion:            "#f59e0b",
  estabilidad:           "#a78bfa",
  inmunidad_condicional: "#f472b6",
};

function TabVentajas({ elementoId }: { elementoId: string }) {
  const { ventajas, loading } = useVentajas(elementoId);
  const [expandido, setExpandido] = useState<string | null>(null);

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
    </div>
  );

  if (ventajas.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>
        Sin ventajas innatas registradas.
      </p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {ventajas.map((v) => {
        const abierto = expandido === v.id;
        const catColor = CATEGORIA_COLOR[v.categoria] ?? "var(--primary)";
        return (
          <div key={v.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
            <button type="button" onClick={() => setExpandido(abierto ? null : v.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: abierto ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "transparent" }}>
              {/* Categoria dot */}
              <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: catColor, opacity: 0.7 }} />
              <span className="flex-1 font-black uppercase tracking-widest" style={{ fontSize: 10, color: "var(--primary)" }}>
                {v.nombre}
              </span>
              <span className="uppercase tracking-widest" style={{ fontSize: 8, color: `color-mix(in srgb, ${catColor} 60%, transparent)` }}>
                {v.categoria.replace(/_/g, " ")}
              </span>
            </button>
            {abierto && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 60%, transparent)", lineHeight: 1.5 }}>
                  {v.efecto}
                </p>
                {v.limites && (
                  <div style={{ borderLeft: `2px solid color-mix(in srgb, var(--primary) 10%, transparent)`, paddingLeft: 8 }}>
                    <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontStyle: "italic", lineHeight: 1.5 }}>
                      {v.limites}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Garumis del elemento ─────────────────────────────────────────────────

function TabGarumis({ elementoId }: { elementoId: string }) {
  const { asignados, todos, loading, asignar, desasignar } = useGarumisDeElemento(elementoId);

  const asignadosIds = new Set(asignados.map((g) => g.id));
  const disponibles = todos.filter((g) => !asignadosIds.has(g.id));

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Lista de garumis asignados */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {asignados.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>
              Sin Garumis asignados a este elemento.
            </p>
          </div>
        ) : (
          asignados.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 px-4 py-2.5 group"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-black uppercase tracking-widest truncate"
                  style={{ fontSize: 10, color: "var(--primary)" }}>
                  {g.nombre}
                </p>
                {g.concepto && (
                  <p className="truncate" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", marginTop: 1 }}>
                    {g.concepto}
                  </p>
                )}
              </div>
              <span className="shrink-0 uppercase tracking-widest"
                style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                {g.estado_documentacion}
              </span>
              <button
                type="button"
                onClick={() => void desasignar(g.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary/25 hover:text-red-400"
              >
                <X size={11} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Selector para añadir */}
      {disponibles.length > 0 && (
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{ borderTop: `1px solid ${BORDER}`, background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}
        >
          <span className="text-[9px] font-black uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            Añadir
          </span>
          <select
            defaultValue=""
            className="flex-1 bg-transparent outline-none border-b pb-0.5"
            style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 60%, transparent)", borderColor: BORDER }}
            onChange={(e) => {
              if (e.target.value) {
                void asignar(e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>Seleccionar Garumi…</option>
            {disponibles.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}{g.concepto ? ` — ${g.concepto}` : ""}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Editor completo de un elemento ───────────────────────────────────────────

function EditorElemento({ elemento, onGuardado, onEliminado }: {
  elemento: GarumiElemento;
  onGuardado: (e: GarumiElemento) => void;
  onEliminado: (id: string) => void;
}) {
  const [form, setForm]     = useState<GarumiElemento>(elemento);
  const [tab, setTab]       = useState<Tab>("definicion");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => { setForm(elemento); setStatus("idle"); setConfirmando(false); }, [elemento.id]);

  async function guardar() {
    setStatus("saving");
    const { error } = await supabase.from("garumi_elementos").update({
      nombre: form.nombre, familia_manifestacion: form.familia_manifestacion || null,
      principio: form.principio || null, descripcion: form.descripcion || null,
      fenomenos: form.fenomenos ?? [], capacidades: form.capacidades ?? [], limites: form.limites ?? [],
      relacion_ium: form.relacion_ium || null, relacion_oris: form.relacion_oris || null,
      estado_documentacion: form.estado_documentacion, notas_internas: form.notas_internas || null,
    }).eq("id", form.id);
    if (error) { setStatus("error"); return; }
    setStatus("saved"); onGuardado(form); setTimeout(() => setStatus("idle"), 2000);
  }

  async function eliminar() {
    await supabase.from("garumi_elementos").delete().eq("id", form.id);
    onEliminado(form.id);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "definicion",    label: "Definición" },
    { id: "efectividades", label: "Efectividades" },
    { id: "ventajas",      label: "Ventajas" },
    { id: "garumis",       label: "Garumis" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ borderLeft: `1px solid ${BORDER}` }}>

      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        <span className="shrink-0 font-black uppercase tracking-widest px-2 py-0.5"
          style={{ fontSize: 10, borderRadius: "var(--radius-btn)", border: `1px solid ${BORDER_MED}`, color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
          {form.codigo}
        </span>
        <input className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
        <select value={form.estado_documentacion} onChange={(e) => setForm((f) => ({ ...f, estado_documentacion: e.target.value }))}
          className="bg-transparent outline-none" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", letterSpacing: "0.06em" }}>
          <option value="borrador">borrador</option>
          <option value="aprobado">aprobado</option>
          <option value="canon">canon</option>
        </select>
        {status === "saving" && <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">Guardando…</span>}
        {status === "saved"  && <span className="text-[9px] font-black uppercase tracking-widest text-green-500/70">Guardado</span>}
        {status === "error"  && <span className="text-[9px] font-black uppercase tracking-widest text-red-400/70">Error</span>}
        {confirmando ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase text-red-400">¿Eliminar?</span>
            <button type="button" onClick={() => void eliminar()} className="flex items-center justify-center w-6 h-6 bg-red-500 text-white hover:bg-red-600 transition-all" style={{ borderRadius: "var(--radius-btn)" }}><Check size={11} /></button>
            <button type="button" onClick={() => setConfirmando(false)} className="flex items-center justify-center w-6 h-6 text-primary/40 hover:text-primary" style={{ borderRadius: "var(--radius-btn)", border: `1px solid ${BORDER_MED}` }}><X size={11} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="flex items-center justify-center w-6 h-6 text-red-400/40 hover:text-red-400 transition-colors" style={{ borderRadius: "var(--radius-btn)" }}><Trash2 size={11} /></button>
        )}
        <button type="button" onClick={() => void guardar()} disabled={status === "saving"}
          className="flex items-center gap-1 px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          style={{ borderRadius: "var(--radius-btn)", background: "var(--primary)", color: "var(--btn-text, #fff)" }}>
          <Save size={10} /> Guardar
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className="px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-colors"
            style={{
              color: tab === t.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {tab === "definicion"    && <TabDefinicion form={form} setForm={setForm} />}
        {tab === "efectividades" && <TabEfectividades elementoId={elemento.id} />}
        {tab === "ventajas"      && <TabVentajas elementoId={elemento.id} />}
        {tab === "garumis"       && <TabGarumis elementoId={elemento.id} />}
      </div>
    </div>
  );
}

// ── Panel completo ────────────────────────────────────────────────────────────

function PanelElementos({ onCerrar }: { onCerrar: () => void }) {
  const { elementos, loading, setElementos } = useGarumiElementos();
  const [seleccionado, setSeleccionado] = useState<GarumiElemento | null>(null);

  useEffect(() => {
    if (!seleccionado && elementos.length > 0) setSeleccionado(elementos[0]);
  }, [elementos, seleccionado]);

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ borderRadius: "var(--radius-card)", border: `1px solid ${BORDER_MED}`, background: "var(--bg-main)" }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        <span className="flex-1 font-black text-primary uppercase tracking-widest" style={{ fontSize: 11 }}>Elementos Garumi</span>
        <span style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>{elementos.length} elementos</span>
        <button type="button" onClick={onCerrar} className="flex items-center justify-center w-7 h-7 text-primary/30 hover:text-primary transition-colors" style={{ borderRadius: "var(--radius-btn)" }}>
          <X size={14} />
        </button>
      </div>

      {/* Lista + editor */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Lista lateral */}
        <div className="shrink-0 flex flex-col overflow-y-auto" style={{ width: 170, borderRight: `1px solid ${BORDER}`, scrollbarWidth: "none" }}>
          {loading
            ? <div className="flex justify-center py-8"><Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
            : elementos.map((el) => {
              const activo = seleccionado?.id === el.id;
              return (
                <button key={el.id} type="button" onClick={() => setSeleccionado(el)}
                  className="flex flex-col gap-0.5 text-left px-3 py-2.5 transition-colors w-full"
                  style={{ background: activo ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", borderBottom: `1px solid ${BORDER}` }}>
                  <span className="font-black uppercase tracking-widest"
                    style={{ fontSize: 10, color: activo ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                    {el.nombre}
                  </span>
                  <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 25%, transparent)", letterSpacing: "0.06em" }}>
                    {el.codigo}{el.familia_manifestacion && ` · ${el.familia_manifestacion}`}
                  </span>
                </button>
              );
            })
          }
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 flex flex-col">
          {seleccionado
            ? <EditorElemento key={seleccionado.id} elemento={seleccionado}
                onGuardado={(updated) => { setElementos((prev) => prev.map((e) => e.id === updated.id ? updated : e)); setSeleccionado(updated); }}
                onEliminado={(id) => { setElementos((prev) => prev.filter((e) => e.id !== id)); setSeleccionado(null); }} />
            : <div className="flex items-center justify-center h-full">
                <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>Selecciona un elemento.</p>
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ── Portal exportable ─────────────────────────────────────────────────────────

export function GarumiElementosPortal({ onCerrar }: { onCerrar: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <ShellPortalFlotante onCerrar={onCerrar}>
      <PanelElementos onCerrar={onCerrar} />
    </ShellPortalFlotante>,
    document.body,
  );
}
