"use client";

/**
 * GamePage — /myself/game  v5
 * ──────────────────────────────────────────────────────────────────────────
 * Tres tabs principales:
 *   MUNDO     → Biomas · Reinos · Ecología
 *   ENTIDADES → Personajes · Criaturas IA · Especies
 *   GAME      → Items · Props · Misiones · Social · Recetas
 *              · Factores abióticos · Modificadores
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, Check, ChevronRight, FlaskConical, Globe2, Layers,
  Loader2, MapPin, MessageCircle, Mountain, Network, Plus,
  Save, Search, Shield, Sword, Trash2, TreePine,
  Users, X, Gamepad2, Package, ScrollText, Leaf, Heart,
  Utensils, Thermometer, Clock,
} from "lucide-react";
import { supabase } from "@/infra/supabase/supabase";
import { PopoverFlotante } from "@/domains/garlia/_shared/PopoverFlotante";

// ─────────────────────────────────────────────────────────────────────────────
// PanelModal — wrapper con misma API que ModalFlotante pero usa PopoverFlotante
// como base (backdrop blur, centrado en pantalla, header con icono/titulo/X)
// ─────────────────────────────────────────────────────────────────────────────

function PanelModal({
  abierto,
  onCerrar,
  titulo,
  icono,
  accionesDerecha,
  children,
  maxWidth,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: React.ReactNode;
  icono?: React.ReactNode;
  accionesDerecha?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const bodyRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => { bodyRef.current = document.body; }, []);
  if (!abierto) return null;
  const widthPx = maxWidth === "max-w-2xl" ? 680 : 780;
  return (
    <PopoverFlotante
      anchor={bodyRef.current}
      onClose={onCerrar}
      width={widthPx}
      maxHeight={Math.round(window.innerHeight * 0.85)}
      backdrop
      centerVertically
      centerHorizontally
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 -mx-4 -mt-4 px-4 py-3 mb-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        {icono && (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
            <span style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>{icono}</span>
          </div>
        )}
        {titulo && <p className="flex-1 min-w-0 text-sm font-black truncate" style={{ color: "var(--primary)" }}>{titulo}</p>}
        {accionesDerecha && <div className="shrink-0 flex items-center gap-2">{accionesDerecha}</div>}
        <button type="button" onClick={onCerrar} title="Cerrar (Esc)"
          className="shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </PopoverFlotante>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

type MainTab = "mundo" | "entidades" | "game";
type MundoSec = "biomas" | "reinos" | "ecologia";
type EntidadesSec = "personajes" | "criaturas";
type GameSec = "items" | "props" | "misiones" | "recetas" | "factores" | "modificadores";

const inputStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
  color: "var(--primary)",
};

function FL({ label }: { label: string }) {
  return (
    <span className="text-xs font-semibold tracking-wide" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
      {label}
    </span>
  );
}
function Inp(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className="px-3 py-2 rounded-xl text-sm outline-none w-full" style={inputStyle} />;
}
function TA(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className="px-3 py-2 rounded-xl text-sm outline-none w-full resize-none" style={inputStyle} rows={p.rows ?? 3} />;
}
function Sel(p: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return <select {...p} className="px-3 py-2 rounded-xl text-sm outline-none w-full" style={inputStyle} />;
}
function Bdg({ text, active }: { text: string; active: boolean }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
      background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "color-mix(in srgb, var(--primary) 6%, transparent)",
      color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
    }}>{text}</span>
  );
}
function SaveBtn({ saving, saved, disabled, onClick }: { saving: boolean; saved: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={saving || disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{ background: saved ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--primary)", color: saved ? "var(--primary)" : "var(--btn-text,#fff)", opacity: disabled ? 0.4 : 1 }}>
      {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}

function JsonEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const prev = useRef(JSON.stringify(value));
  useEffect(() => {
    const s = JSON.stringify(value);
    if (s !== prev.current) { setRaw(JSON.stringify(value, null, 2)); setErr(null); prev.current = s; }
  }, [value]);
  return (
    <div className="flex flex-col gap-1 h-full">
      <textarea className="flex-1 font-mono text-xs p-3 rounded-xl resize-none outline-none" spellCheck={false}
        style={{ ...inputStyle, border: `1px solid ${err ? "var(--destructive,#ef4444)" : "color-mix(in srgb, var(--primary) 12%, transparent)"}`, minHeight: "160px" }}
        value={raw} onChange={(e) => { setRaw(e.target.value); try { onChange(JSON.parse(e.target.value)); setErr(null); } catch { setErr("JSON inválido"); } }} />
      {err && <p className="text-xs" style={{ color: "var(--destructive,#ef4444)" }}>{err}</p>}
    </div>
  );
}

function SideItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors group"
      style={{ background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 70%, transparent)", borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent" }}>
      {children}
    </button>
  );
}

function SideList<T extends { id: string }>({ items, selectedId, onSelect, onNew, newLabel, isNew, loading, renderItem, width = 240, searchPlaceholder = "Buscar…", filterFn }:
  { items: T[]; selectedId?: string; onSelect: (i: T) => void; onNew?: () => void; newLabel?: string; isNew?: boolean; loading: boolean; renderItem: (i: T, active: boolean) => React.ReactNode; width?: number; searchPlaceholder?: string; filterFn?: (i: T, q: string) => boolean }) {
  const [q, setQ] = useState("");
  const filtered = q && filterFn ? items.filter((i) => filterFn(i, q)) : items;
  return (
    <div className="flex flex-col shrink-0 rounded-2xl overflow-hidden" style={{ width: `${width}px`, border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, var(--bg-main))" }}>
      <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
          <input className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--primary)" }} placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {onNew && (
        <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <button type="button" onClick={onNew} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: isNew ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "color-mix(in srgb, var(--primary) 6%, transparent)", color: "var(--primary)" }}>
            <Plus size={12} />{newLabel ?? "Nuevo"}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
          : filtered.length === 0 ? <p className="text-center py-8 text-xs" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Sin resultados</p>
          : filtered.map((i) => renderItem(i, i.id === selectedId))}
      </div>
    </div>
  );
}

function Panel({ title, saveBtn, empty, emptyIcon, children }: { title?: string; saveBtn?: React.ReactNode; empty?: boolean; emptyIcon?: React.ReactNode; children?: React.ReactNode }) {
  if (empty) return (
    <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2" style={{ border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)" }}>
      {emptyIcon}
      <p className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Seleccioná un ítem</p>
    </div>
  );
  return (
    <div className="flex-1 rounded-2xl p-5 flex flex-col gap-4 min-h-0" style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))" }}>
      {(title || saveBtn) && (
        <div className="flex items-center justify-between shrink-0">
          {title && <h2 className="text-sm font-bold" style={{ color: "var(--primary)" }}>{title}</h2>}
          {saveBtn}
        </div>
      )}
      {children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="shrink-0 text-xs font-semibold uppercase tracking-wide pt-2 pb-1"
      style={{ color: "var(--primary)", borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
      {label}
    </div>
  );
}

function useSave() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    await fn();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return { saving, saved, run };
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Biomas (árbol jerárquico Bioma → Ecosistema → Hábitat)
// ─────────────────────────────────────────────────────────────────────────────

type TreeSel = { kind: "bioma"; id: string } | { kind: "eco"; id: string } | { kind: "hab"; id: string } | null;

function BiomasSection() {
  const [biomas,   setBiomas]   = useState<any[]>([]);
  const [ecos,     setEcos]     = useState<any[]>([]);
  const [habitats, setHabitats] = useState<any[]>([]);
  const [tiposH,   setTiposH]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sel,      setSel]      = useState<TreeSel>(null);
  const { saving, saved, run }  = useSave();

  // form bioma
  const [bNombre, setBNombre] = useState(""); const [bDesc, setBDesc] = useState(""); const [bAfinidad, setBAfinidad] = useState("");
  // form eco
  const [eNombre, setENombre] = useState(""); const [eClima, setEClima] = useState(""); const [eDesc, setEDesc] = useState(""); const [eTipo, setETipo] = useState(""); const [eBiomaId, setEBiomaId] = useState("");
  // form hab
  const [hNombre, setHNombre] = useState(""); const [hDesc, setHDesc] = useState(""); const [hEcoId, setHEcoId] = useState(""); const [hTipoId, setHTipoId] = useState(""); const [hActivo, setHActivo] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, e, h, t] = await Promise.all([
      supabase.from("biomas").select("id,nombre,descripcion,afinidad,orden").order("orden"),
      supabase.from("ecosistemas").select("id,nombre,clima,descripcion,tipo_entorno,bioma_id").order("nombre"),
      supabase.from("habitats").select("id,nombre,descripcion,ecosistema_id,tipo_habitat_id,activo").order("nombre"),
      supabase.from("tipos_habitat").select("id,clave,nombre").order("nombre"),
    ]);
    setBiomas(b.data ?? []); setEcos(e.data ?? []); setHabitats(h.data ?? []); setTiposH(t.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const pickBioma = (b: any) => { setSel({ kind: "bioma", id: b.id }); setBNombre(b.nombre); setBDesc(b.descripcion ?? ""); setBAfinidad(b.afinidad ?? ""); };
  const pickEco   = (e: any) => { setSel({ kind: "eco",   id: e.id }); setENombre(e.nombre); setEClima(e.clima ?? ""); setEDesc(e.descripcion ?? ""); setETipo(e.tipo_entorno ?? ""); setEBiomaId(e.bioma_id ?? ""); };
  const pickHab   = (h: any) => { setSel({ kind: "hab",   id: h.id }); setHNombre(h.nombre); setHDesc(h.descripcion ?? ""); setHEcoId(h.ecosistema_id ?? ""); setHTipoId(h.tipo_habitat_id ?? ""); setHActivo(h.activo); };

  const saveBioma = () => run(async () => { await supabase.from("biomas").update({ nombre: bNombre, descripcion: bDesc, afinidad: bAfinidad }).eq("id", sel!.id); await load(); });
  const saveEco   = () => run(async () => { await supabase.from("ecosistemas").update({ nombre: eNombre, clima: eClima, descripcion: eDesc, tipo_entorno: eTipo, bioma_id: eBiomaId || null }).eq("id", sel!.id); await load(); });
  const saveHab   = () => run(async () => { await supabase.from("habitats").update({ nombre: hNombre, descripcion: hDesc, ecosistema_id: hEcoId, tipo_habitat_id: hTipoId, activo: hActivo }).eq("id", sel!.id); await load(); });

  const addEco = async (biomaId: string) => {
    const { data } = await supabase.from("ecosistemas").insert({ nombre: "Nuevo ecosistema", bioma_id: biomaId, clima: "", tipo_entorno: "", descripcion: "" }).select().single();
    await load(); if (data) { setExpanded((p) => ({ ...p, [biomaId]: true })); pickEco(data); }
  };
  const addHab = async (ecoId: string) => {
    const tipoDefault = tiposH[0]?.id ?? null;
    const { data } = await supabase.from("habitats").insert({ nombre: "Nuevo hábitat", ecosistema_id: ecoId, tipo_habitat_id: tipoDefault, activo: true, descripcion: "" }).select().single();
    await load(); if (data) { setExpanded((p) => ({ ...p, [ecoId]: true })); pickHab(data); }
  };
  const addBioma = async () => {
    const { data } = await supabase.from("biomas").insert({ nombre: "Nuevo bioma", descripcion: "", afinidad: "" }).select().single();
    await load(); if (data) pickBioma(data);
  };
  const delItem = async () => {
    if (!sel) return;
    if (!confirm("¿Eliminar?")) return;
    if (sel.kind === "bioma") await supabase.from("biomas").delete().eq("id", sel.id);
    if (sel.kind === "eco")   await supabase.from("ecosistemas").delete().eq("id", sel.id);
    if (sel.kind === "hab")   await supabase.from("habitats").delete().eq("id", sel.id);
    setSel(null); await load();
  };

  const iSel = (kind: string, id: string) => sel?.kind === kind && sel?.id === id;
  const rowStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
    color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 70%, transparent)",
    borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {biomas.map((b) => {
            const bEcos = ecos.filter((e) => e.bioma_id === b.id);
            return (
              <div key={b.id}>
                {/* Bioma pill */}
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => pickBioma(b)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-[1.03]"
                    style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
                    <Mountain size={11} /> {b.nombre}
                    {b.afinidad && <span className="opacity-50">· {b.afinidad}</span>}
                  </button>
                  <button type="button" onClick={() => addEco(b.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
                    style={{ border: "1px dashed color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}>
                    <Plus size={9} /> eco
                  </button>
                </div>
                {/* Ecosistemas grid */}
                {bEcos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-4 mb-1">
                    {bEcos.map((e) => {
                      const bHabs = habitats.filter((h) => h.ecosistema_id === e.id);
                      return (
                        <div key={e.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => pickEco(e)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:scale-[1.03]"
                              style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)", color: "color-mix(in srgb, var(--primary) 80%, transparent)" }}>
                              <TreePine size={10} /> {e.nombre}
                            </button>
                            <button type="button" onClick={() => addHab(e.id)}
                              className="opacity-40 hover:opacity-100 transition-opacity"
                              style={{ color: "var(--primary)" }} title="+ Hábitat">
                              <Plus size={9} />
                            </button>
                          </div>
                          {/* Hábitats pills */}
                          {bHabs.length > 0 && (
                            <div className="flex flex-wrap gap-1 pl-3">
                              {bHabs.map((h) => (
                                <button key={h.id} type="button" onClick={() => pickHab(h)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all hover:scale-[1.03]"
                                  style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                                  <MapPin size={8} /> {h.nombre}
                                  <span className="opacity-50">{h.activo ? "" : " ·off"}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={addBioma}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold opacity-50 hover:opacity-100 transition-opacity"
            style={{ border: "1px dashed color-mix(in srgb, var(--primary) 30%, transparent)", color: "var(--primary)" }}>
            <Plus size={11} /> Nuevo bioma
          </button>
        </div>
      )}

      {/* ── Paneles flotantes ── */}
      <PanelModal abierto={sel?.kind === "bioma"} onCerrar={() => setSel(null)}
        titulo={biomas.find((x) => x.id === sel?.id)?.nombre ?? "Bioma"} icono={<Mountain size={12} />}
        accionesDerecha={<div className="flex gap-2">
          <SaveBtn saving={saving} saved={saved} disabled={!bNombre.trim()} onClick={saveBioma} />
          <button type="button" onClick={delItem} className="p-1.5 rounded-lg" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={13} /></button>
        </div>}>
        <label className="flex flex-col gap-1"><FL label="Nombre" /><Inp value={bNombre} onChange={(e) => setBNombre(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><FL label="Afinidad" /><Inp value={bAfinidad} onChange={(e) => setBAfinidad(e.target.value)} placeholder="ej. fuego, agua…" /></label>
        <label className="flex flex-col gap-1"><FL label="Descripción" /><TA value={bDesc} onChange={(e) => setBDesc(e.target.value)} rows={4} /></label>
      </PanelModal>

      <PanelModal abierto={sel?.kind === "eco"} onCerrar={() => setSel(null)}
        titulo={ecos.find((x) => x.id === sel?.id)?.nombre ?? "Ecosistema"} icono={<TreePine size={12} />}
        accionesDerecha={<div className="flex gap-2">
          <SaveBtn saving={saving} saved={saved} disabled={!eNombre.trim()} onClick={saveEco} />
          <button type="button" onClick={delItem} className="p-1.5 rounded-lg" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={13} /></button>
        </div>}>
        <label className="flex flex-col gap-1"><FL label="Nombre" /><Inp value={eNombre} onChange={(e) => setENombre(e.target.value)} /></label>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Clima" /><Inp value={eClima} onChange={(e) => setEClima(e.target.value)} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Tipo entorno" /><Inp value={eTipo} onChange={(e) => setETipo(e.target.value)} /></label>
        </div>
        <label className="flex flex-col gap-1"><FL label="Bioma padre" />
          <Sel value={eBiomaId} onChange={(e) => setEBiomaId(e.target.value)}>
            <option value="">— sin bioma —</option>
            {biomas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </Sel>
        </label>
        <label className="flex flex-col gap-1"><FL label="Descripción" /><TA value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={3} /></label>
      </PanelModal>

      <PanelModal abierto={sel?.kind === "hab"} onCerrar={() => setSel(null)}
        titulo={habitats.find((x) => x.id === sel?.id)?.nombre ?? "Hábitat"} icono={<MapPin size={12} />}
        accionesDerecha={<div className="flex gap-2">
          <SaveBtn saving={saving} saved={saved} disabled={!hNombre.trim()} onClick={saveHab} />
          <button type="button" onClick={delItem} className="p-1.5 rounded-lg" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={13} /></button>
        </div>}>
        <label className="flex flex-col gap-1"><FL label="Nombre" /><Inp value={hNombre} onChange={(e) => setHNombre(e.target.value)} /></label>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Ecosistema" />
            <Sel value={hEcoId} onChange={(e) => setHEcoId(e.target.value)}>
              <option value="">— seleccionar —</option>
              {ecos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Sel>
          </label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Tipo hábitat" />
            <Sel value={hTipoId} onChange={(e) => setHTipoId(e.target.value)}>
              <option value="">— seleccionar —</option>
              {tiposH.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </Sel>
          </label>
        </div>
        <label className="flex flex-col gap-1"><FL label="Descripción" /><TA value={hDesc} onChange={(e) => setHDesc(e.target.value)} rows={3} /></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hActivo} onChange={(e) => setHActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Reinos
// ─────────────────────────────────────────────────────────────────────────────

function ReinosSection() {
  const [reinos, setReinos] = useState<any[]>([]);
  const [reinosGame, setReinosGame] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [gameRow, setGameRow] = useState<any>(null);
  const { saving, saved, run } = useSave();
  const [clave, setClave] = useState(""); const [nombreG, setNombreG] = useState(""); const [descG, setDescG] = useState(""); const [activo, setActivo] = useState(true); const [orden, setOrden] = useState(0); const [props, setProps] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: r } = await supabase.from("reinos").select("id,nombre,descripcion,publicado").order("nombre");
    const { data: rg } = await supabase.from("reinos_game").select("*").order("orden");
    setReinos(r ?? []); setReinosGame(rg ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const pick = (r: any) => {
    setSel(r);
    const rg = reinosGame.find((g) => g.reino_id === r.id) ?? null;
    setGameRow(rg); setClave(rg?.clave ?? ""); setNombreG(rg?.nombre ?? ""); setDescG(rg?.descripcion ?? ""); setActivo(rg?.activo ?? true); setOrden(rg?.orden ?? 0); setProps(rg?.propiedades ?? {});
  };
  const save = () => run(async () => {
    if (!sel || !clave.trim()) return;
    const p = { reino_id: sel.id, clave: clave.trim(), nombre: nombreG || null, descripcion: descG || null, activo, orden, propiedades: props };
    if (gameRow) await supabase.from("reinos_game").update(p).eq("id", gameRow.id);
    else { const { data } = await supabase.from("reinos_game").insert(p).select().single(); setGameRow(data); }
    await load();
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {reinos.map((r) => (
            <button key={r.id} type="button" onClick={() => pick(r)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-[1.03]"
              style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)" }}>
              <Shield size={10} /> {r.nombre}
              {reinosGame.some((g) => g.reino_id === r.id) && <span className="opacity-50">· game</span>}
            </button>
          ))}
        </div>
      )}

      <PanelModal abierto={!!sel} onCerrar={() => setSel(null)}
        titulo={sel?.nombre} icono={<Shield size={12} />}
        accionesDerecha={<SaveBtn saving={saving} saved={saved} disabled={!clave.trim()} onClick={save} />}>
        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{sel?.descripcion ?? "Sin descripción canónica"}</p>
        <Divider label="Capa Game (reinos_game)" />
        {!gameRow && <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Sin entrada en reinos_game — se creará al guardar.</p>}
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Clave (Godot)" /><Inp value={clave} onChange={(e) => setClave(e.target.value)} placeholder="ej. reino_norte" /></label>
          <label className="flex flex-col gap-1 w-20"><FL label="Orden" /><Inp type="number" value={orden} onChange={(e) => setOrden(Number(e.target.value))} /></label>
        </div>
        <label className="flex flex-col gap-1"><FL label="Nombre game (override)" /><Inp value={nombreG} onChange={(e) => setNombreG(e.target.value)} placeholder="Dejar vacío = usa el canónico" /></label>
        <label className="flex flex-col gap-1"><FL label="Descripción game" /><TA value={descG} onChange={(e) => setDescG(e.target.value)} rows={3} /></label>
        <label className="flex flex-col gap-1"><FL label="Propiedades (JSON)" /><div style={{ minHeight: "100px" }}><JsonEditor value={props} onChange={setProps} /></div></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo en Godot</span></label>
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Ecología (bioma_ecosistemas, bioma_reinos, participantes, relaciones, catálogos)
// ─────────────────────────────────────────────────────────────────────────────

type EcoSub = "bioma_eco" | "bioma_reinos" | "participantes" | "criatura_roles" | "relaciones" | "roles" | "tipos_h" | "tipos_p";

const ECO_SUBS: { key: EcoSub; label: string }[] = [
  { key: "bioma_eco", label: "Bioma → Ecosistema" },
  { key: "bioma_reinos", label: "Bioma → Reinos" },
  { key: "participantes", label: "Participantes" },
  { key: "criatura_roles", label: "Criatura → Roles" },
  { key: "relaciones", label: "Relaciones" },
  { key: "roles", label: "Roles ecológicos" },
  { key: "tipos_h", label: "Tipos hábitat" },
  { key: "tipos_p", label: "Tipos presencia" },
];

// Tabla simple de relaciones N:M con selector doble
function RelTable({ rows, catalogo1, catalogo2, label1, label2, id1, id2, tabla, pkComposite = false, extraCols }:
  { rows: any[]; catalogo1: any[]; catalogo2: any[]; label1: string; label2: string; id1: string; id2: string; tabla: string; pkComposite?: boolean; extraCols?: { key: string; label: string; cat?: any[]; catIdKey?: string; catNameKey?: string }[] }) {
  const [v1, setV1] = useState(""); const [v2, setV2] = useState(""); const [extras, setExtras] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const name1 = (id: string) => catalogo1.find((c) => c.id === id)?.nombre ?? id.slice(0, 6);
  const name2 = (id: string) => catalogo2.find((c) => c.id === id)?.nombre ?? id.slice(0, 6);

  const add = async () => {
    if (!v1 || !v2) return;
    setSaving(true);
    const payload: any = { [id1]: v1, [id2]: v2 };
    extraCols?.forEach((ec) => { if (extras[ec.key]) payload[ec.key] = extras[ec.key]; });
    await supabase.from(tabla).insert(payload);
    setSaving(false); setV1(""); setV2(""); setExtras({});
  };
  const del = async (row: any) => {
    if (!confirm("¿Eliminar?")) return;
    if (pkComposite) await supabase.from(tabla).delete().eq(id1, row[id1]).eq(id2, row[id2]);
    else await supabase.from(tabla).delete().eq("id", row.id);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Add row */}
      <div className="flex gap-2 items-end flex-wrap">
        <label className="flex flex-col gap-1 flex-1 min-w-32">
          <FL label={label1} />
          <Sel value={v1} onChange={(e) => setV1(e.target.value)}>
            <option value="">— {label1} —</option>
            {catalogo1.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Sel>
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-32">
          <FL label={label2} />
          <Sel value={v2} onChange={(e) => setV2(e.target.value)}>
            <option value="">— {label2} —</option>
            {catalogo2.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Sel>
        </label>
        {extraCols?.map((ec) => (
          <label key={ec.key} className="flex flex-col gap-1 flex-1 min-w-28">
            <FL label={ec.label} />
            {ec.cat ? (
              <Sel value={extras[ec.key] ?? ""} onChange={(e) => setExtras((prev) => ({ ...prev, [ec.key]: e.target.value }))}>
                <option value="">—</option>
                {ec.cat.map((c) => <option key={c.id} value={c.id}>{c[ec.catNameKey ?? "nombre"]}</option>)}
              </Sel>
            ) : (
              <Inp value={extras[ec.key] ?? ""} onChange={(e) => setExtras((prev) => ({ ...prev, [ec.key]: e.target.value }))} />
            )}
          </label>
        ))}
        <button type="button" onClick={add} disabled={saving || !v1 || !v2}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
          style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !v1 || !v2 ? 0.4 : 1 }}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Añadir
        </button>
      </div>
      {/* Rows */}
      <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "340px" }}>
        {rows.length === 0 ? <p className="text-xs py-4 text-center" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Sin registros</p>
          : rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
              style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <span className="flex-1 text-xs" style={{ color: "var(--primary)" }}>{name1(row[id1])}</span>
              <ChevronRight size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
              <span className="flex-1 text-xs" style={{ color: "var(--primary)" }}>{name2(row[id2])}</span>
              {extraCols?.map((ec) => row[ec.key] && (
                <Bdg key={ec.key} text={ec.cat ? (ec.cat.find((c) => c.id === row[ec.key])?.[ec.catNameKey ?? "nombre"] ?? row[ec.key]) : row[ec.key]} active={false} />
              ))}
              <button type="button" onClick={() => del(row)} className="opacity-0 group-hover:opacity-100 ml-1" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}><Trash2 size={11} /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

function EcologiaSection() {
  const [sub, setSub] = useState<EcoSub>("bioma_eco");
  const [loading, setLoading] = useState(true);
  // catalogs
  const [biomas, setBiomas] = useState<any[]>([]);
  const [ecos, setEcos] = useState<any[]>([]);
  const [reinos, setReinos] = useState<any[]>([]);
  const [criaturas, setCriaturas] = useState<any[]>([]);
  const [habitats, setHabitats] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [tiposH, setTiposH] = useState<any[]>([]);
  const [tiposP, setTiposP] = useState<any[]>([]);
  // rows
  const [biomaEco, setBiomaEco] = useState<any[]>([]);
  const [biomaRey, setBiomaRey] = useState<any[]>([]);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [criaturaRoles, setCriaturaRoles] = useState<any[]>([]);
  const [relaciones, setRelaciones] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await Promise.all([
      supabase.from("biomas").select("id,nombre").order("nombre"),
      supabase.from("ecosistemas").select("id,nombre").order("nombre"),
      supabase.from("reinos").select("id,nombre").order("nombre"),
      supabase.from("criaturas").select("id,nombre").order("nombre"),
      supabase.from("habitats").select("id,nombre").order("nombre"),
      supabase.from("roles_ecologicos").select("id,nombre,categoria").order("nombre"),
      supabase.from("tipos_habitat").select("id,clave,nombre,activo").order("nombre"),
      supabase.from("tipos_presencia_ecologica").select("id,clave,nombre,activo"),
      supabase.from("bioma_ecosistemas").select("bioma_id,ecosistema_id"),
      supabase.from("bioma_reinos").select("bioma_id,reino_id"),
      supabase.from("ecosistema_participantes").select("id,ecosistema_id,criatura_id,activo"),
      supabase.from("ecosistema_criatura_roles").select("id,ecosistema_id,criatura_id,rol_id,es_principal,origen"),
      supabase.from("ecosistema_relaciones_criaturas").select("id,ecosistema_id,criatura_origen_id,criatura_destino_id,tipo_relacion"),
    ]);
    setBiomas(all[0].data ?? []); setEcos(all[1].data ?? []); setReinos(all[2].data ?? []);
    setCriaturas(all[3].data ?? []); setHabitats(all[4].data ?? []); setRoles(all[5].data ?? []);
    setTiposH(all[6].data ?? []); setTiposP(all[7].data ?? []);
    setBiomaEco(all[8].data ?? []); setBiomaRey(all[9].data ?? []);
    setParticipantes(all[10].data ?? []); setCriaturaRoles(all[11].data ?? []); setRelaciones(all[12].data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Catálogos CRUD inline
  const [rolesNew, setRolesNew] = useState(""); const [rolesCat, setRolesCat] = useState(""); const [savingRole, setSavingRole] = useState(false);
  const addRole = async () => { if (!rolesNew.trim()) return; setSavingRole(true); await supabase.from("roles_ecologicos").insert({ nombre: rolesNew, descripcion: "", categoria: rolesCat }); setSavingRole(false); setRolesNew(""); setRolesCat(""); await load(); };
  const delRole = async (id: string) => { await supabase.from("roles_ecologicos").delete().eq("id", id); await load(); };

  const [thNew, setThNew] = useState(""); const [thClave, setThClave] = useState(""); const [savingTH, setSavingTH] = useState(false);
  const addTH = async () => { if (!thNew.trim() || !thClave.trim()) return; setSavingTH(true); await supabase.from("tipos_habitat").insert({ nombre: thNew, clave: thClave, orden: 99, activo: true }); setSavingTH(false); setThNew(""); setThClave(""); await load(); };
  const delTH = async (id: string) => { await supabase.from("tipos_habitat").delete().eq("id", id); await load(); };

  const [tpNew, setTpNew] = useState(""); const [tpClave, setTpClave] = useState("");  const [savingTP, setSavingTP] = useState(false);
  const addTP = async () => { if (!tpNew.trim() || !tpClave.trim()) return; setSavingTP(true); await supabase.from("tipos_presencia_ecologica").insert({ nombre: tpNew, clave: tpClave, activo: true }); setSavingTP(false); setTpNew(""); setTpClave(""); await load(); };
  const delTP = async (id: string) => { await supabase.from("tipos_presencia_ecologica").delete().eq("id", id); await load(); };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Sub-tabs ecología */}
      <div className="flex gap-0.5 flex-wrap shrink-0">
        {ECO_SUBS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setSub(key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: sub === key ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: sub === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div> : (
          <div className="rounded-2xl p-5" style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))" }}>
            {sub === "bioma_eco" && (
              <>
                <h3 className="text-sm font-bold mb-4" style={{ color: "var(--primary)" }}>Bioma → Ecosistema</h3>
                <RelTable rows={biomaEco} catalogo1={biomas} catalogo2={ecos} label1="Bioma" label2="Ecosistema" id1="bioma_id" id2="ecosistema_id" tabla="bioma_ecosistemas" pkComposite />
              </>
            )}
            {sub === "bioma_reinos" && (
              <>
                <h3 className="text-sm font-bold mb-4" style={{ color: "var(--primary)" }}>Bioma → Reinos</h3>
                <RelTable rows={biomaRey} catalogo1={biomas} catalogo2={reinos} label1="Bioma" label2="Reino" id1="bioma_id" id2="reino_id" tabla="bioma_reinos" pkComposite />
              </>
            )}
            {sub === "participantes" && (
              <>
                <h3 className="text-sm font-bold mb-4" style={{ color: "var(--primary)" }}>Participantes de ecosistema</h3>
                <RelTable rows={participantes} catalogo1={ecos} catalogo2={criaturas} label1="Ecosistema" label2="Criatura" id1="ecosistema_id" id2="criatura_id" tabla="ecosistema_participantes" />
              </>
            )}
            {sub === "criatura_roles" && (
              <>
                <h3 className="text-sm font-bold mb-4" style={{ color: "var(--primary)" }}>Criatura → Rol ecológico por ecosistema</h3>
                <RelTable
                  rows={criaturaRoles}
                  catalogo1={criaturas} catalogo2={roles}
                  label1="Criatura" label2="Rol ecológico"
                  id1="criatura_id" id2="rol_id"
                  tabla="ecosistema_criatura_roles"
                  extraCols={[
                    { key: "ecosistema_id", label: "Ecosistema", cat: ecos, catIdKey: "id", catNameKey: "nombre" },
                    { key: "origen", label: "Origen" },
                  ]}
                />
              </>
            )}
            {sub === "relaciones" && (
              <>
                <h3 className="text-sm font-bold mb-4" style={{ color: "var(--primary)" }}>Relaciones entre criaturas</h3>
                <RelTable rows={relaciones} catalogo1={criaturas} catalogo2={criaturas} label1="Criatura origen" label2="Criatura destino" id1="criatura_origen_id" id2="criatura_destino_id" tabla="ecosistema_relaciones_criaturas"
                  extraCols={[{ key: "tipo_relacion", label: "Tipo" }, { key: "ecosistema_id", label: "Ecosistema", cat: ecos, catIdKey: "id", catNameKey: "nombre" }]} />
              </>
            )}
            {sub === "roles" && (
              <>
                <h3 className="text-sm font-bold mb-3" style={{ color: "var(--primary)" }}>Roles ecológicos</h3>
                <div className="flex gap-2 mb-3">
                  <Inp value={rolesNew} onChange={(e) => setRolesNew(e.target.value)} placeholder="Nombre del rol" />
                  <Inp value={rolesCat} onChange={(e) => setRolesCat(e.target.value)} placeholder="Categoría" />
                  <button type="button" onClick={addRole} disabled={savingRole || !rolesNew.trim()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
                    style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !rolesNew.trim() ? 0.4 : 1 }}>
                    {savingRole ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Añadir
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {roles.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      <span className="flex-1 text-sm" style={{ color: "var(--primary)" }}>{r.nombre}</span>
                      <Bdg text={r.categoria} active={false} />
                      <button type="button" onClick={() => delRole(r.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {sub === "tipos_h" && (
              <>
                <h3 className="text-sm font-bold mb-3" style={{ color: "var(--primary)" }}>Tipos de hábitat</h3>
                <div className="flex gap-2 mb-3">
                  <Inp value={thClave} onChange={(e) => setThClave(e.target.value)} placeholder="Clave (ej. bosque)" />
                  <Inp value={thNew} onChange={(e) => setThNew(e.target.value)} placeholder="Nombre" />
                  <button type="button" onClick={addTH} disabled={savingTH || !thNew.trim() || !thClave.trim()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
                    style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !thNew.trim() ? 0.4 : 1 }}>
                    {savingTH ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Añadir
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {tiposH.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      <span className="text-xs font-mono" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{t.clave}</span>
                      <span className="flex-1 text-sm" style={{ color: "var(--primary)" }}>{t.nombre}</span>
                      <Bdg text={t.activo ? "on" : "off"} active={t.activo} />
                      <button type="button" onClick={() => delTH(t.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {sub === "tipos_p" && (
              <>
                <h3 className="text-sm font-bold mb-3" style={{ color: "var(--primary)" }}>Tipos de presencia ecológica</h3>
                <div className="flex gap-2 mb-3">
                  <Inp value={tpClave} onChange={(e) => setTpClave(e.target.value)} placeholder="Clave" />
                  <Inp value={tpNew} onChange={(e) => setTpNew(e.target.value)} placeholder="Nombre" />
                  <button type="button" onClick={addTP} disabled={savingTP || !tpNew.trim() || !tpClave.trim()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
                    style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !tpNew.trim() ? 0.4 : 1 }}>
                    {savingTP ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Añadir
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {tiposP.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      <span className="text-xs font-mono" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{t.clave}</span>
                      <span className="flex-1 text-sm" style={{ color: "var(--primary)" }}>{t.nombre}</span>
                      <Bdg text={t.activo ? "on" : "off"} active={t.activo} />
                      <button type="button" onClick={() => delTP(t.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTIDADES — Personajes + Diálogos
// ─────────────────────────────────────────────────────────────────────────────

function PersonajesSection() {
  const [personajes, setPersonajes] = useState<any[]>([]);
  const [criaturas, setCriaturas] = useState<any[]>([]);
  const [dialogos, setDialogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const { saving, saved, run } = useSave();
  const { saving: savingD, saved: savedD, run: runD } = useSave();
  const { saving: savingSoc, saved: savedSoc, run: runSoc } = useSave();
  const [selDial, setSelDial] = useState<any>(null);
  const [dialJson, setDialJson] = useState<Record<string, unknown>>({});
  const [nombre, setNombre] = useState(""); const [criaturaId, setCriaturaId] = useState(""); const [activo, setActivo] = useState(true);
  // Social
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialPerfil, setSocialPerfil] = useState<any>(null);
  const [regalos, setRegalos] = useState<any[]>([]);
  const [itemsCat, setItemsCat] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("personajes_game").select("*").order("nombre"),
      supabase.from("criaturas").select("id,nombre").order("nombre"),
    ]);
    setPersonajes(p ?? []); setCriaturas(c ?? []); setLoading(false);
  }, []);

  const loadSocial = useCallback(async (pid: string) => {
    const [{ data: s }, { data: r }, { data: it }] = await Promise.all([
      supabase.from("personaje_social_v1").select("*").eq("personaje_game_id", pid),
      supabase.from("personaje_regalos_v1").select("*, items(id,nombre)").eq("personaje_game_id", pid),
      supabase.from("items").select("id,nombre").order("nombre"),
    ]);
    setSocialPerfil(s?.[0] ?? null); setRegalos(r ?? []); setItemsCat(it ?? []);
  }, []);
  const loadDials = useCallback(async (pid: string) => {
    const { data } = await supabase.from("dialogos_game").select("id,clave,dialogo,activo").eq("personaje_id", pid).order("clave");
    setDialogos(data ?? []); setSelDial(null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pick = (p: any) => { setSel(p); setIsNew(false); setNombre(p.nombre); setCriaturaId(p.criatura_id); setActivo(p.activo); loadDials(p.id); };
  const startNew = () => { setSel(null); setIsNew(true); setNombre(""); setCriaturaId(criaturas[0]?.id ?? ""); setActivo(true); setDialogos([]); setSelDial(null); };
  const save = () => run(async () => { const p = { nombre, criatura_id: criaturaId, activo }; isNew ? await supabase.from("personajes_game").insert(p) : await supabase.from("personajes_game").update(p).eq("id", sel.id); await load(); });
  const del = async (id: string) => { if (!confirm("¿Eliminar personaje?")) return; await supabase.from("personajes_game").delete().eq("id", id); if (sel?.id === id) { setSel(null); setIsNew(false); setDialogos([]); } await load(); };
  const saveD = () => runD(async () => { if (!selDial) return; await supabase.from("dialogos_game").update({ dialogo: dialJson }).eq("id", selDial.id); if (sel) loadDials(sel.id); });
  const cName = (id: string) => criaturas.find((c) => c.id === id)?.nombre ?? "—";
  const openSocial = () => { if (sel) { loadSocial(sel.id); setSocialOpen(true); } };
  const saveSocial = () => runSoc(async () => {
    if (!sel || !socialPerfil) return;
    const { personaje_game_id, created_at, updated_at, ...rest } = socialPerfil;
    await supabase.from("personaje_social_v1").update(rest).eq("personaje_game_id", personaje_game_id);
  });
  const numSoc = (label: string, key: string) => (
    <label className="flex flex-col gap-1">
      <FL label={label} />
      <Inp type="number" step="0.01" value={socialPerfil?.[key] ?? 0}
        onChange={(e) => setSocialPerfil((prev: any) => ({ ...prev, [key]: Number(e.target.value) }))} />
    </label>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      <GridToolbar q="" onQ={() => {}} onNew={startNew} newLabel="Nuevo personaje" />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {personajes.map((p) => (
            <GridCard key={p.id} nombre={p.nombre} sub={cName(p.criatura_id)} badge={p.activo ? "on" : "off"}
              icono={<Users size={14} />} onClick={() => pick(p)} />
          ))}
        </div>
      )}

      <PanelModal abierto={!!sel || isNew} onCerrar={() => { setSel(null); setIsNew(false); setSelDial(null); }}
        titulo={isNew ? "Nuevo personaje" : sel?.nombre} icono={<Users size={12} />}
        accionesDerecha={<SaveBtn saving={saving} saved={saved} disabled={!nombre.trim() || !criaturaId} onClick={save} />}>
        <label className="flex flex-col gap-1"><FL label="Nombre" /><Inp value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><FL label="Criatura canónica" /><Sel value={criaturaId} onChange={(e) => setCriaturaId(e.target.value)}><option value="">—</option>{criaturas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></label>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
          <div className="flex items-center gap-2">
            {sel && !isNew && (
              <button type="button" onClick={openSocial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--primary)" }}>
                <Heart size={11} /> Social
              </button>
            )}
            {sel && !isNew && <button type="button" onClick={() => del(sel.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={11} /> Eliminar</button>}
          </div>
        </div>
        {sel && !isNew && (
          <>
            <Divider label={`Diálogos (${dialogos.length})`} />
            {dialogos.length === 0 ? <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Sin diálogos</p>
              : dialogos.map((d) => (
                <button key={d.id} type="button" onClick={() => { setSelDial(d); setDialJson(d.dialogo); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors"
                  style={{ background: selDial?.id === d.id ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "color-mix(in srgb, var(--primary) 4%, transparent)", border: `1px solid ${selDial?.id === d.id ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}` }}>
                  <MessageCircle size={11} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
                  <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--primary)" }}>{d.clave}</span>
                  <Bdg text={d.activo ? "on" : "off"} active={d.activo} />
                </button>
              ))}
          </>
        )}
      </PanelModal>

      {/* Panel diálogo anidado */}
      <PanelModal abierto={!!selDial} onCerrar={() => setSelDial(null)}
        titulo={`Diálogo · ${selDial?.clave}`} icono={<MessageCircle size={12} />}
        accionesDerecha={<SaveBtn saving={savingD} saved={savedD} onClick={saveD} />}>
        <div style={{ minHeight: "240px" }}><JsonEditor value={dialJson} onChange={setDialJson} /></div>
      </PanelModal>

      {/* Panel Social anidado */}
      <PanelModal abierto={socialOpen} onCerrar={() => setSocialOpen(false)}
        titulo={`Social — ${sel?.nombre ?? ""}`} icono={<Heart size={12} />}
        accionesDerecha={socialPerfil ? <SaveBtn saving={savingSoc} saved={savedSoc} onClick={saveSocial} /> : undefined}>
        {!socialPerfil ? (
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Sin perfil social — no existe entrada en personaje_social_v1.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {numSoc("Amistad inicial", "amistad_inicial")}
              {numSoc("Confianza inicial", "confianza_inicial")}
              {numSoc("Respeto inicial", "respeto_inicial")}
              {numSoc("Afecto inicial", "afecto_inicial")}
              {numSoc("Sociabilidad", "sociabilidad")}
              {numSoc("Curiosidad", "curiosidad")}
              {numSoc("Generosidad", "generosidad")}
              {numSoc("Prudencia", "prudencia")}
              {numSoc("Agresividad", "agresividad")}
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={socialPerfil.activo ?? true}
                onChange={(e) => setSocialPerfil((prev: any) => ({ ...prev, activo: e.target.checked }))} />
              <span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span>
            </label>
          </>
        )}
        {regalos.length > 0 && (
          <>
            <Divider label={`Regalos (${regalos.length})`} />
            {regalos.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <span className="flex-1 text-xs" style={{ color: "var(--primary)" }}>
                  {r.items?.nombre ?? itemsCat.find((i) => i.id === r.item_id)?.nombre ?? r.item_id?.slice(0, 8) + "…"}
                </span>
                <Bdg text={r.reaccion} active={r.reaccion === "amor"} />
              </div>
            ))}
          </>
        )}
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTIDADES — Criaturas IA
// ─────────────────────────────────────────────────────────────────────────────

function CriaturasSection() {
  const [criaturas, setCriaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const { saving, saved, run } = useSave();
  const { saving: savingEsp, saved: savedEsp, run: runEsp } = useSave();
  const [iaConfig, setIaConfig] = useState<Record<string, unknown>>({});
  const [tab, setTab] = useState<"ia" | "dialogo">("ia");
  // Especie
  const [especieOpen, setEspecieOpen] = useState(false);
  const [eteriumV1, setEteriumV1] = useState<any[]>([]);
  const [eteriumGame, setEteriumGame] = useState<any[]>([]);
  const [especie, setEspecie] = useState<any>(null);
  const [isNewEsp, setIsNewEsp] = useState(false);
  const [eClave, setEClave] = useState(""); const [eNombre, setENombre] = useState(""); const [eActivo, setEActivo] = useState(true); const [eOrden, setEOrden] = useState(0);
  const [capBase, setCapBase] = useState(0); const [recBase, setRecBase] = useState(0); const [efBase, setEfBase] = useState(0); const [etActivo, setEtActivo] = useState(true);
  const [vidaCompartidos, setVidaCompartidos] = useState(false); const [recEterium, setRecEterium] = useState(true); const [etInicial, setEtInicial] = useState(0); const [etgActivo, setEtgActivo] = useState(true);

  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.from("criaturas").select("id,nombre,ia_config,dialogo").order("nombre"); setCriaturas(data ?? []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const pick = (c: any) => { setSel(c); setIaConfig(tab === "ia" ? (c.ia_config ?? {}) : (c.dialogo ?? {})); };
  useEffect(() => { if (sel) { setIaConfig(tab === "ia" ? (sel.ia_config ?? {}) : (sel.dialogo ?? {})); } }, [tab]); // eslint-disable-line
  const save = () => run(async () => {
    if (!sel) return;
    const field = tab === "ia" ? "ia_config" : "dialogo";
    await supabase.from("criaturas").update({ [field]: iaConfig }).eq("id", sel.id);
    setCriaturas((prev) => prev.map((c) => c.id === sel.id ? { ...c, [field]: iaConfig } : c));
    setSel((prev: any) => prev ? { ...prev, [field]: iaConfig } : prev);
  });

  const openEspecie = async () => {
    if (!sel) return;
    const [{ data: ev }, { data: eg }, { data: esp }] = await Promise.all([
      supabase.from("especie_eterium_v1").select("*"),
      supabase.from("especie_eterium_game").select("*"),
      supabase.from("especies_jugables").select("*").eq("criatura_id", sel.id).maybeSingle(),
    ]);
    setEteriumV1(ev ?? []); setEteriumGame(eg ?? []);
    if (esp) {
      setEspecie(esp); setIsNewEsp(false);
      setEClave(esp.clave); setENombre(esp.nombre); setEActivo(esp.activo); setEOrden(esp.orden ?? 0);
      const evRow = (ev ?? []).find((v: any) => v.especie_id === esp.id);
      if (evRow) { setCapBase(evRow.capacidad_base); setRecBase(evRow.recuperacion_base); setEfBase(evRow.eficiencia_base); setEtActivo(evRow.activo); }
      else { setCapBase(0); setRecBase(0); setEfBase(0); setEtActivo(true); }
      const egRow = evRow ? (eg ?? []).find((g: any) => g.especie_eterium_id === evRow.id) : null;
      if (egRow) { setVidaCompartidos(egRow.vida_eterium_compartidos); setRecEterium(egRow.recuperacion_eterium); setEtInicial(egRow.eterium_inicial); setEtgActivo(egRow.activo); }
      else { setVidaCompartidos(false); setRecEterium(true); setEtInicial(0); setEtgActivo(true); }
    } else {
      setEspecie(null); setIsNewEsp(true);
      setEClave(sel.nombre.toLowerCase().replace(/\s+/g, "_")); setENombre(sel.nombre); setEActivo(true); setEOrden(0);
      setCapBase(0); setRecBase(0); setEfBase(0); setEtActivo(true);
      setVidaCompartidos(false); setRecEterium(true); setEtInicial(0); setEtgActivo(true);
    }
    setEspecieOpen(true);
  };

  const saveEspecie = () => runEsp(async () => {
    if (!sel) return;
    const p = { clave: eClave, nombre: eNombre, activo: eActivo, orden: eOrden, criatura_id: sel.id };
    let espId = especie?.id;
    if (isNewEsp) { const { data } = await supabase.from("especies_jugables").insert(p).select().single(); espId = data?.id; setEspecie(data); setIsNewEsp(false); }
    else await supabase.from("especies_jugables").update(p).eq("id", espId);
    if (!espId) return;
    const evRow = eteriumV1.find((v: any) => v.especie_id === espId);
    const evPayload = { especie_id: espId, capacidad_base: capBase, recuperacion_base: recBase, eficiencia_base: efBase, activo: etActivo };
    let evId = evRow?.id;
    if (evRow) await supabase.from("especie_eterium_v1").update(evPayload).eq("id", evRow.id);
    else { const { data } = await supabase.from("especie_eterium_v1").insert(evPayload).select().single(); evId = data?.id; }
    if (!evId) return;
    const egRow = eteriumGame.find((g: any) => g.especie_eterium_id === evId);
    const egPayload = { especie_eterium_id: evId, vida_eterium_compartidos: vidaCompartidos, recuperacion_eterium: recEterium, eterium_inicial: etInicial, activo: etgActivo };
    if (egRow) await supabase.from("especie_eterium_game").update(egPayload).eq("id", egRow.id);
    else await supabase.from("especie_eterium_game").insert(egPayload);
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {criaturas.map((c) => (
            <GridCard key={c.id} nombre={c.nombre}
              badge={Object.keys(c.ia_config ?? {}).length > 0 ? "ia" : undefined}
              icono={<Bot size={14} />} onClick={() => pick(c)} />
          ))}
        </div>
      )}

      <PanelModal abierto={!!sel} onCerrar={() => setSel(null)}
        titulo={sel?.nombre} icono={<Bot size={12} />}
        accionesDerecha={
          <div className="flex items-center gap-2">
            <button type="button" onClick={openEspecie}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--primary)" }}>
              <Leaf size={11} /> Especie
            </button>
            <SaveBtn saving={saving} saved={saved} onClick={save} />
          </div>
        }>
        <div className="flex shrink-0 gap-1 p-1 rounded-xl self-start" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          {(["ia", "dialogo"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab === t ? "var(--primary)" : "transparent", color: tab === t ? "var(--btn-text,#fff)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
              {t === "ia" ? "ia_config" : "dialogo"}
            </button>
          ))}
        </div>
        <div style={{ minHeight: "240px" }}><JsonEditor value={iaConfig} onChange={setIaConfig} /></div>
      </PanelModal>

      {/* Panel Especie anidado */}
      <PanelModal abierto={especieOpen} onCerrar={() => setEspecieOpen(false)}
        titulo={isNewEsp ? `Nueva especie · ${sel?.nombre}` : `Especie · ${eNombre}`} icono={<Leaf size={12} />}
        accionesDerecha={<SaveBtn saving={savingEsp} saved={savedEsp} disabled={!eClave.trim() || !eNombre.trim()} onClick={saveEspecie} />}>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Clave" /><Inp value={eClave} onChange={(e) => setEClave(e.target.value)} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Nombre" /><Inp value={eNombre} onChange={(e) => setENombre(e.target.value)} /></label>
          <label className="flex flex-col gap-1 w-16"><FL label="Orden" /><Inp type="number" value={eOrden} onChange={(e) => setEOrden(Number(e.target.value))} /></label>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={eActivo} onChange={(e) => setEActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
        <Divider label="Eterium base (especie_eterium_v1)" />
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Capacidad base" /><Inp type="number" step="0.1" value={capBase} onChange={(e) => setCapBase(Number(e.target.value))} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Recuperación" /><Inp type="number" step="0.1" value={recBase} onChange={(e) => setRecBase(Number(e.target.value))} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Eficiencia" /><Inp type="number" step="0.01" value={efBase} onChange={(e) => setEfBase(Number(e.target.value))} /></label>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={etActivo} onChange={(e) => setEtActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo en v1</span></label>
        <Divider label="Eterium game (especie_eterium_game)" />
        <label className="flex flex-col gap-1"><FL label="Eterium inicial" /><Inp type="number" value={etInicial} onChange={(e) => setEtInicial(Number(e.target.value))} /></label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={vidaCompartidos} onChange={(e) => setVidaCompartidos(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Vida/eterium compartidos</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={recEterium} onChange={(e) => setRecEterium(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Recuperación eterium</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={etgActivo} onChange={(e) => setEtgActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo en game</span></label>
        </div>
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GAME — Social + Regalos
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Shared grid helpers — patrón QuimicaPage / ElementoPage
// ─────────────────────────────────────────────────────────────────────────────

/** Casilla de grid genérica */
function GridCard({
  nombre,
  sub,
  badge,
  icono,
  onClick,
}: {
  nombre: string;
  sub?: string;
  badge?: string;
  icono?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 p-3 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {icono && (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        >
          <span style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>{icono}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate" style={{ color: "var(--primary)" }}>{nombre}</p>
        {sub && (
          <p className="text-[10px] truncate mt-0.5" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{sub}</p>
        )}
      </div>
      {badge && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "color-mix(in srgb, var(--primary) 60%, transparent)",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** Barra de búsqueda + botón nuevo encima del grid */
function GridToolbar({
  q,
  onQ,
  onNew,
  newLabel,
}: {
  q: string;
  onQ: (v: string) => void;
  onNew?: () => void;
  newLabel?: string;
}) {
  return (
    <div className="shrink-0 flex items-center gap-2 mb-4">
      <div
        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <Search size={12} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
        <input
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: "var(--primary)" }}
          placeholder="Buscar…"
          value={q}
          onChange={(e) => onQ(e.target.value)}
        />
      </div>
      {onNew && (
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "var(--primary)", color: "var(--btn-text,#fff)" }}
        >
          <Plus size={12} /> {newLabel ?? "Nuevo"}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME — Items (grid + PanelModal)
// ─────────────────────────────────────────────────────────────────────────────

function ItemsSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [q, setQ] = useState("");
  const { saving, saved, run } = useSave();
  const [tipo, setTipo] = useState(""); const [maxStack, setMaxStack] = useState(1); const [props, setProps] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.from("items_game").select("id,item_id,tipo,max_stack,propiedades,items(id,nombre,categoria)").order("created_at"); setItems(data ?? []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const pick = (i: any) => { setSel(i); setTipo(i.tipo ?? ""); setMaxStack(i.max_stack); setProps(i.propiedades ?? {}); };
  const save = () => run(async () => { await supabase.from("items_game").update({ tipo, max_stack: maxStack, propiedades: props }).eq("id", sel.id); await load(); });
  const iNombre = (i: any) => i.items?.nombre ?? i.item_id?.slice(0, 8) + "…";

  const filtered = q ? items.filter((i) => iNombre(i).toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      <GridToolbar q={q} onQ={setQ} />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {filtered.map((i) => (
            <GridCard
              key={i.id}
              nombre={iNombre(i)}
              sub={i.items?.categoria ?? i.tipo ?? ""}
              badge={`×${i.max_stack}`}
              icono={<Sword size={14} />}
              onClick={() => pick(i)}
            />
          ))}
        </div>
      )}

      <PanelModal
        abierto={!!sel}
        onCerrar={() => setSel(null)}
        titulo={sel ? iNombre(sel) : ""}
        icono={<Sword size={12} />}
        accionesDerecha={<SaveBtn saving={saving} saved={saved} onClick={save} />}
      >
        <p className="text-xs font-mono shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>{sel?.items?.categoria ?? ""} · {sel?.item_id}</p>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Tipo" /><Inp value={tipo} onChange={(e) => setTipo(e.target.value)} /></label>
          <label className="flex flex-col gap-1 w-24"><FL label="Max stack" /><Inp type="number" value={maxStack} onChange={(e) => setMaxStack(Number(e.target.value))} /></label>
        </div>
        <label className="flex flex-col gap-1 flex-1 min-h-0"><FL label="Propiedades (JSON)" /><div style={{ minHeight: "160px" }}><JsonEditor value={props} onChange={setProps} /></div></label>
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME — Props (grid + PanelModal)
// ─────────────────────────────────────────────────────────────────────────────

function PropsSection() {
  const [items, setItems] = useState<any[]>([]);
  const [biomas, setBiomas] = useState<any[]>([]);
  const [ecos, setEcos] = useState<any[]>([]);
  const [habitats, setHabitats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [q, setQ] = useState("");
  const { saving, saved, run } = useSave();
  const [clave, setClave] = useState(""); const [nombre, setNombre] = useState(""); const [tipo, setTipo] = useState(""); const [activo, setActivo] = useState(true);
  const [orden, setOrden] = useState(0); const [peso, setPeso] = useState(0); const [escala, setEscala] = useState(1);
  const [biomaId, setBiomaId] = useState(""); const [ecoId, setEcoId] = useState(""); const [habId, setHabId] = useState("");
  const [props, setProps] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("props_game").select("*").order("orden");
    const { data: b } = await supabase.from("biomas").select("id,nombre").order("nombre");
    const { data: e } = await supabase.from("ecosistemas").select("id,nombre").order("nombre");
    const { data: h } = await supabase.from("habitats").select("id,nombre").order("nombre");
    setItems(data ?? []); setBiomas(b ?? []); setEcos(e ?? []); setHabitats(h ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const pick = (p: any) => { setSel(p); setIsNew(false); setClave(p.clave); setNombre(p.nombre); setTipo(p.tipo); setActivo(p.activo); setOrden(p.orden); setPeso(p.peso); setEscala(p.escala); setBiomaId(p.bioma_id ?? ""); setEcoId(p.ecosistema_id ?? ""); setHabId(p.habitat_id ?? ""); setProps(p.propiedades ?? {}); };
  const startNew = () => { setSel(null); setIsNew(true); setClave(""); setNombre(""); setTipo(""); setActivo(true); setOrden(0); setPeso(0); setEscala(1); setBiomaId(""); setEcoId(""); setHabId(""); setProps({}); };
  const save = () => run(async () => {
    const p = { clave, nombre, tipo, activo, orden, peso, escala, bioma_id: biomaId || null, ecosistema_id: ecoId || null, habitat_id: habId || null, propiedades: props };
    isNew ? await supabase.from("props_game").insert(p) : await supabase.from("props_game").update(p).eq("id", sel.id);
    await load(); if (isNew) setIsNew(false);
  });
  const del = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("props_game").delete().eq("id", id); if (sel?.id === id) { setSel(null); } await load(); };

  const filtered = q ? items.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()) || p.clave.toLowerCase().includes(q.toLowerCase())) : items;
  const abierto = !!sel || isNew;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      <GridToolbar q={q} onQ={setQ} onNew={startNew} newLabel="Nuevo prop" />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {filtered.map((p) => (
            <GridCard
              key={p.id}
              nombre={p.nombre}
              sub={p.clave}
              badge={p.activo ? "on" : "off"}
              icono={<Package size={14} />}
              onClick={() => pick(p)}
            />
          ))}
        </div>
      )}

      <PanelModal
        abierto={abierto}
        onCerrar={() => { setSel(null); setIsNew(false); }}
        titulo={isNew ? "Nuevo prop" : sel?.nombre}
        icono={<Package size={12} />}
        accionesDerecha={<SaveBtn saving={saving} saved={saved} disabled={!clave.trim() || !nombre.trim()} onClick={save} />}
      >
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Clave" /><Inp value={clave} onChange={(e) => setClave(e.target.value)} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Nombre" /><Inp value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        </div>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Tipo" /><Inp value={tipo} onChange={(e) => setTipo(e.target.value)} /></label>
          <label className="flex flex-col gap-1 w-16"><FL label="Orden" /><Inp type="number" value={orden} onChange={(e) => setOrden(Number(e.target.value))} /></label>
          <label className="flex flex-col gap-1 w-16"><FL label="Escala" /><Inp type="number" step="0.1" value={escala} onChange={(e) => setEscala(Number(e.target.value))} /></label>
          <label className="flex flex-col gap-1 w-16"><FL label="Peso" /><Inp type="number" step="0.1" value={peso} onChange={(e) => setPeso(Number(e.target.value))} /></label>
        </div>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Bioma" /><Sel value={biomaId} onChange={(e) => setBiomaId(e.target.value)}><option value="">—</option>{biomas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Sel></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Ecosistema" /><Sel value={ecoId} onChange={(e) => setEcoId(e.target.value)}><option value="">—</option>{ecos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Sel></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Hábitat" /><Sel value={habId} onChange={(e) => setHabId(e.target.value)}><option value="">—</option>{habitats.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}</Sel></label>
        </div>
        <label className="flex flex-col gap-1"><FL label="Propiedades (JSON)" /><div style={{ minHeight: "120px" }}><JsonEditor value={props} onChange={setProps} /></div></label>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
          {sel && !isNew && (
            <button type="button" onClick={() => del(sel.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={11} /> Eliminar</button>
          )}
        </div>
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME — Misiones (grid + PanelModal)
// ─────────────────────────────────────────────────────────────────────────────

function MisionesSection() {
  const [misiones, setMisiones] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const [recompensas, setRecompensas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [q, setQ] = useState("");
  const { saving, saved, run } = useSave();
  const [clave, setClave] = useState(""); const [nombre, setNombre] = useState(""); const [desc, setDesc] = useState(""); const [tipo, setTipo] = useState("principal"); const [activo, setActivo] = useState(true); const [autoAceptar, setAutoAceptar] = useState(false); const [orden, setOrden] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase.from("misiones_game").select("*").order("orden");
    setMisiones(m ?? []); setLoading(false);
  }, []);
  const loadSub = useCallback(async (mid: string) => {
    const { data: o } = await supabase.from("misiones_objetivos_game").select("*").eq("mision_id", mid).order("orden");
    const { data: r } = await supabase.from("misiones_recompensas_game").select("*").eq("mision_id", mid).order("orden");
    setObjetivos(o ?? []); setRecompensas(r ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pick = (m: any) => { setSel(m); setIsNew(false); setClave(m.clave); setNombre(m.nombre); setDesc(m.descripcion); setTipo(m.tipo); setActivo(m.activo); setAutoAceptar(m.auto_aceptar); setOrden(m.orden); loadSub(m.id); };
  const startNew = () => { setSel(null); setIsNew(true); setClave(""); setNombre(""); setDesc(""); setTipo("principal"); setActivo(true); setAutoAceptar(false); setOrden(0); setObjetivos([]); setRecompensas([]); };
  const save = () => run(async () => {
    const p = { clave, nombre, descripcion: desc, tipo, activo, auto_aceptar: autoAceptar, orden };
    isNew ? await supabase.from("misiones_game").insert(p) : await supabase.from("misiones_game").update(p).eq("id", sel.id);
    await load(); if (isNew) setIsNew(false);
  });
  const del = async (id: string) => { if (!confirm("¿Eliminar misión?")) return; await supabase.from("misiones_game").delete().eq("id", id); if (sel?.id === id) setSel(null); await load(); };
  const delObj = async (id: string) => { await supabase.from("misiones_objetivos_game").delete().eq("id", id); if (sel) loadSub(sel.id); };
  const delRec = async (id: string) => { await supabase.from("misiones_recompensas_game").delete().eq("id", id); if (sel) loadSub(sel.id); };

  const filtered = q ? misiones.filter((m) => m.nombre.toLowerCase().includes(q.toLowerCase())) : misiones;
  const abierto = !!sel || isNew;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      <GridToolbar q={q} onQ={setQ} onNew={startNew} newLabel="Nueva misión" />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {filtered.map((m) => (
            <GridCard
              key={m.id}
              nombre={m.nombre}
              sub={m.tipo}
              badge={m.activo ? "on" : "off"}
              icono={<ScrollText size={14} />}
              onClick={() => pick(m)}
            />
          ))}
        </div>
      )}

      <PanelModal
        abierto={abierto}
        onCerrar={() => { setSel(null); setIsNew(false); }}
        titulo={isNew ? "Nueva misión" : sel?.nombre}
        icono={<ScrollText size={12} />}
        accionesDerecha={<SaveBtn saving={saving} saved={saved} disabled={!clave.trim() || !nombre.trim()} onClick={save} />}
        maxWidth="max-w-2xl"
      >
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Clave" /><Inp value={clave} onChange={(e) => setClave(e.target.value)} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Tipo" /><Sel value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="principal">principal</option><option value="secundaria">secundaria</option><option value="diaria">diaria</option><option value="oculta">oculta</option></Sel></label>
          <label className="flex flex-col gap-1 w-16"><FL label="Orden" /><Inp type="number" value={orden} onChange={(e) => setOrden(Number(e.target.value))} /></label>
        </div>
        <label className="flex flex-col gap-1"><FL label="Nombre" /><Inp value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><FL label="Descripción" /><TA value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={autoAceptar} onChange={(e) => setAutoAceptar(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Auto-aceptar</span></label>
        </div>

        {sel && !isNew && (
          <>
            <Divider label={`Objetivos (${objetivos.length})`} />
            {objetivos.map((o) => (
              <div key={o.id} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <span className="text-xs font-mono shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>{o.orden}.</span>
                <span className="flex-1 text-xs" style={{ color: "var(--primary)" }}>{o.descripcion}</span>
                <Bdg text={o.tipo} active={false} />
                <button type="button" onClick={() => delObj(o.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}><Trash2 size={11} /></button>
              </div>
            ))}

            <Divider label={`Recompensas (${recompensas.length})`} />
            {recompensas.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <span className="flex-1 text-xs" style={{ color: "var(--primary)" }}>{r.tipo} × {r.cantidad}</span>
                <button type="button" onClick={() => delRec(r.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}><Trash2 size={11} /></button>
              </div>
            ))}
            <div className="flex justify-end">
              <button type="button" onClick={() => del(sel.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={11} /> Eliminar misión</button>
            </div>
          </>
        )}
      </PanelModal>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// GAME — Recetas (grid + PanelModal)
// ─────────────────────────────────────────────────────────────────────────────

function RecetasSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [q, setQ] = useState("");
  const { saving, saved, run } = useSave();
  const [nombre, setNombre] = useState(""); const [desc, setDesc] = useState(""); const [categoria, setCategoria] = useState(""); const [desbloqueada, setDesbloqueada] = useState(true);
  const [ingredientes, setIngredientes] = useState<Record<string, unknown>>({}); const [resultado, setResultado] = useState<Record<string, unknown>>({}); const [props, setProps] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => { setLoading(true); const { data } = await supabase.from("recetas_game").select("*").order("categoria"); setItems(data ?? []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const pick = (r: any) => { setSel(r); setIsNew(false); setNombre(r.nombre); setDesc(r.descripcion ?? ""); setCategoria(r.categoria); setDesbloqueada(r.desbloqueada_por_defecto); setIngredientes(r.ingredientes ?? {}); setResultado(r.resultado ?? {}); setProps(r.propiedades ?? {}); };
  const startNew = () => { setSel(null); setIsNew(true); setNombre(""); setDesc(""); setCategoria(""); setDesbloqueada(true); setIngredientes({}); setResultado({}); setProps({}); };
  const save = () => run(async () => {
    const p = { nombre, descripcion: desc, categoria, desbloqueada_por_defecto: desbloqueada, ingredientes, resultado, propiedades: props };
    isNew ? await supabase.from("recetas_game").insert(p) : await supabase.from("recetas_game").update(p).eq("id", sel.id);
    await load(); if (isNew) setIsNew(false);
  });
  const del = async (id: string) => { if (!confirm("¿Eliminar receta?")) return; await supabase.from("recetas_game").delete().eq("id", id); if (sel?.id === id) setSel(null); await load(); };

  const filtered = q ? items.filter((r) => r.nombre.toLowerCase().includes(q.toLowerCase())) : items;
  const abierto = !!sel || isNew;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      <GridToolbar q={q} onQ={setQ} onNew={startNew} newLabel="Nueva receta" />
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {filtered.map((r) => (
            <GridCard
              key={r.id}
              nombre={r.nombre}
              sub={r.categoria}
              icono={<Utensils size={14} />}
              onClick={() => pick(r)}
            />
          ))}
        </div>
      )}

      <PanelModal
        abierto={abierto}
        onCerrar={() => { setSel(null); setIsNew(false); }}
        titulo={isNew ? "Nueva receta" : sel?.nombre}
        icono={<Utensils size={12} />}
        accionesDerecha={<SaveBtn saving={saving} saved={saved} disabled={!nombre.trim()} onClick={save} />}
      >
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1"><FL label="Nombre" /><Inp value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label className="flex flex-col gap-1 flex-1"><FL label="Categoría" /><Inp value={categoria} onChange={(e) => setCategoria(e.target.value)} /></label>
        </div>
        <label className="flex flex-col gap-1"><FL label="Descripción" /><TA value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={desbloqueada} onChange={(e) => setDesbloqueada(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Desbloqueada por defecto</span></label>
        <label className="flex flex-col gap-1"><FL label="Ingredientes (JSON)" /><div style={{ minHeight: "100px" }}><JsonEditor value={ingredientes} onChange={setIngredientes} /></div></label>
        <label className="flex flex-col gap-1"><FL label="Resultado (JSON)" /><div style={{ minHeight: "80px" }}><JsonEditor value={resultado} onChange={setResultado} /></div></label>
        <label className="flex flex-col gap-1"><FL label="Propiedades (JSON)" /><div style={{ minHeight: "80px" }}><JsonEditor value={props} onChange={setProps} /></div></label>
        {sel && !isNew && (
          <div className="flex justify-end">
            <button type="button" onClick={() => del(sel.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={11} /> Eliminar</button>
          </div>
        )}
      </PanelModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENTE — Factores abióticos · Modificadores (grid + PanelModal)
// ─────────────────────────────────────────────────────────────────────────────

type AmbSub = "factores" | "modificadores";

const AMB_SUBS: { key: AmbSub; label: string }[] = [
  { key: "factores", label: "Factores abióticos" },
  { key: "modificadores", label: "Modificadores" },
];

function AmbienteSection({ activeSub }: { activeSub: AmbSub }) {
  const sub = activeSub;
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // factores_abioticos
  const [factores, setFactores] = useState<any[]>([]);
  const [selF, setSelF] = useState<any>(null);
  const { saving: savingF, saved: savedF, run: runF } = useSave();
  const [fNombre, setFNombre] = useState(""); const [fClave, setFClave] = useState(""); const [fDesc, setFDesc] = useState("");
  const [fCat, setFCat] = useState(""); const [fTipo, setFTipo] = useState(""); const [fMin, setFMin] = useState(""); const [fMax, setFMax] = useState(""); const [fActivo, setFActivo] = useState(true);

  // estacion_modificadores_abioticos
  const [modificadores, setModificadores] = useState<any[]>([]);
  const [selM, setSelM] = useState<any>(null);
  const { saving: savingM, saved: savedM, run: runM } = useSave();
  const [mDelta, setMDelta] = useState(0); const [mFuente, setMFuente] = useState(""); const [mMetodo, setMMetodo] = useState(""); const [mActivo, setMActivo] = useState(true);
  const [mEstacionId, setMEstacionId] = useState(""); const [mFactorId, setMFactorId] = useState("");
  const [isNewM, setIsNewM] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, m] = await Promise.all([
      supabase.from("factores_abioticos").select("id,clave,nombre,descripcion,categoria,tipo_valor,rango_min,rango_max,orden,activo").order("orden"),
      supabase.from("estacion_modificadores_abioticos").select("id,estacion_id,factor_id,delta_numerico,fuente,metodo,activo").order("created_at"),
    ]);
    setFactores(f.data ?? []);
    setModificadores(m.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pickF = (f: any) => { setSelF(f); setFNombre(f.nombre); setFClave(f.clave); setFDesc(f.descripcion ?? ""); setFCat(f.categoria); setFTipo(f.tipo_valor); setFMin(f.rango_min ?? ""); setFMax(f.rango_max ?? ""); setFActivo(f.activo); };
  const saveF = () => runF(async () => {
    const p = { nombre: fNombre, clave: fClave, descripcion: fDesc, categoria: fCat, tipo_valor: fTipo, rango_min: fMin !== "" ? Number(fMin) : null, rango_max: fMax !== "" ? Number(fMax) : null, activo: fActivo };
    await supabase.from("factores_abioticos").update(p).eq("id", selF.id);
    await load();
  });

  const pickM = (m: any) => { setSelM(m); setIsNewM(false); setMDelta(m.delta_numerico); setMFuente(m.fuente); setMMetodo(m.metodo); setMActivo(m.activo); setMEstacionId(m.estacion_id); setMFactorId(m.factor_id); };
  const startNewM = () => { setSelM(null); setIsNewM(true); setMDelta(0); setMFuente(""); setMMetodo("multiplicar"); setMActivo(true); setMEstacionId(""); setMFactorId(""); };
  const saveM = () => runM(async () => {
    const p = { estacion_id: mEstacionId, factor_id: mFactorId, delta_numerico: mDelta, fuente: mFuente, metodo: mMetodo, activo: mActivo };
    isNewM ? await supabase.from("estacion_modificadores_abioticos").insert(p) : await supabase.from("estacion_modificadores_abioticos").update(p).eq("id", selM.id);
    await load(); if (isNewM) setIsNewM(false);
  });
  const delM = async (id: string) => { if (!confirm("¿Eliminar modificador?")) return; await supabase.from("estacion_modificadores_abioticos").delete().eq("id", id); if (selM?.id === id) { setSelM(null); setIsNewM(false); } await load(); };

  const factorName = (id: string) => factores.find((f) => f.id === id)?.nombre ?? "—";

  const filteredF = q ? factores.filter((f) => f.nombre.toLowerCase().includes(q.toLowerCase()) || f.clave.toLowerCase().includes(q.toLowerCase())) : factores;
  const filteredM = q ? modificadores.filter((m) => factorName(m.factor_id).toLowerCase().includes(q.toLowerCase())) : modificadores;

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} /></div>;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
      {sub === "factores" && (
        <>
          <GridToolbar q={q} onQ={setQ} />
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {filteredF.map((f) => (
              <GridCard
                key={f.id}
                nombre={f.nombre}
                sub={f.clave}
                badge={f.activo ? "on" : "off"}
                icono={<Thermometer size={14} />}
                onClick={() => pickF(f)}
              />
            ))}
          </div>
          <PanelModal
            abierto={!!selF}
            onCerrar={() => setSelF(null)}
            titulo={selF?.nombre}
            icono={<Thermometer size={12} />}
            accionesDerecha={<SaveBtn saving={savingF} saved={savedF} disabled={!fNombre.trim()} onClick={saveF} />}
          >
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FL label="Nombre" /><Inp value={fNombre} onChange={(e) => setFNombre(e.target.value)} /></label>
              <label className="flex flex-col gap-1 w-36"><FL label="Clave (Godot)" /><Inp value={fClave} onChange={(e) => setFClave(e.target.value)} /></label>
            </div>
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FL label="Categoría" /><Inp value={fCat} onChange={(e) => setFCat(e.target.value)} placeholder="ej. clima, suelo…" /></label>
              <label className="flex flex-col gap-1 flex-1"><FL label="Tipo valor" /><Inp value={fTipo} onChange={(e) => setFTipo(e.target.value)} placeholder="ej. numerico, booleano…" /></label>
            </div>
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FL label="Rango mín" /><Inp type="number" value={fMin} onChange={(e) => setFMin(e.target.value)} /></label>
              <label className="flex flex-col gap-1 flex-1"><FL label="Rango máx" /><Inp type="number" value={fMax} onChange={(e) => setFMax(e.target.value)} /></label>
            </div>
            <label className="flex flex-col gap-1"><FL label="Descripción" /><TA value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3} /></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={fActivo} onChange={(e) => setFActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
          </PanelModal>
        </>
      )}

      {sub === "modificadores" && (
        <>
          <GridToolbar q={q} onQ={setQ} onNew={startNewM} newLabel="Nuevo modificador" />
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {filteredM.map((m) => (
              <GridCard
                key={m.id}
                nombre={factorName(m.factor_id)}
                sub={m.estacion_id ?? "—"}
                badge={`${m.delta_numerico > 0 ? "+" : ""}${m.delta_numerico}`}
                icono={<Clock size={14} />}
                onClick={() => pickM(m)}
              />
            ))}
          </div>
          <PanelModal
            abierto={!!selM || isNewM}
            onCerrar={() => { setSelM(null); setIsNewM(false); }}
            titulo={isNewM ? "Nuevo modificador" : factorName(selM?.factor_id)}
            icono={<Clock size={12} />}
            accionesDerecha={<SaveBtn saving={savingM} saved={savedM} disabled={!mEstacionId || !mFactorId} onClick={saveM} />}
          >
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FL label="Estación ID" /><Inp value={mEstacionId} onChange={(e) => setMEstacionId(e.target.value)} placeholder="UUID estación" /></label>
              <label className="flex flex-col gap-1 flex-1"><FL label="Factor abiótico" />
                <Sel value={mFactorId} onChange={(e) => setMFactorId(e.target.value)}>
                  <option value="">— factor —</option>
                  {factores.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </Sel>
              </label>
            </div>
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FL label="Delta numérico" /><Inp type="number" value={mDelta} onChange={(e) => setMDelta(Number(e.target.value))} /></label>
              <label className="flex flex-col gap-1 flex-1"><FL label="Método" />
                <Sel value={mMetodo} onChange={(e) => setMMetodo(e.target.value)}>
                  <option value="multiplicar">multiplicar</option>
                  <option value="sumar">sumar</option>
                  <option value="reemplazar">reemplazar</option>
                </Sel>
              </label>
            </div>
            <label className="flex flex-col gap-1"><FL label="Fuente" /><Inp value={mFuente} onChange={(e) => setMFuente(e.target.value)} placeholder="ej. canon, estimado…" /></label>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mActivo} onChange={(e) => setMActivo(e.target.checked)} /><span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span></label>
              {selM && !isNewM && (
                <button type="button" onClick={() => delM(selM.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><Trash2 size={11} /> Eliminar</button>
              )}
            </div>
          </PanelModal>
        </>
      )}
    </div>
  );
}


const MUNDO_SUBS: { key: MundoSec; label: string; icon: React.ElementType }[] = [
  { key: "biomas", label: "Biomas", icon: Mountain },
  { key: "reinos", label: "Reinos", icon: Shield },
  { key: "ecologia", label: "Ecología", icon: TreePine },
];

const ENTIDADES_SUBS: { key: EntidadesSec; label: string; icon: React.ElementType }[] = [
  { key: "personajes", label: "Personajes", icon: Users },
  { key: "criaturas", label: "Criaturas IA", icon: Bot },
];

const GAME_SUBS: { key: GameSec; label: string; icon: React.ElementType }[] = [
  { key: "items", label: "Items", icon: Sword },
  { key: "props", label: "Props", icon: Package },
  { key: "misiones", label: "Misiones", icon: ScrollText },

  { key: "recetas", label: "Recetas", icon: Utensils },
  { key: "factores", label: "Factores abióticos", icon: Thermometer },
  { key: "modificadores", label: "Modificadores", icon: Clock },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const MAIN_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "mundo", label: "Mundo", icon: Globe2 },
  { key: "entidades", label: "Entidades", icon: Layers },
  { key: "game", label: "Game", icon: Gamepad2 },
];

export default function GamePage() {
  const [mainTab, setMainTab] = useState<MainTab>("mundo");
  const [mundoSec, setMundoSec] = useState<MundoSec>("biomas");
  const [entidadesSec, setEntidadesSec] = useState<EntidadesSec>("personajes");
  const [gameSec, setGameSec] = useState<GameSec>("items");

  const subSecs = mainTab === "mundo" ? MUNDO_SUBS : mainTab === "entidades" ? ENTIDADES_SUBS : GAME_SUBS;
  const activeSub = mainTab === "mundo" ? mundoSec : mainTab === "entidades" ? entidadesSec : gameSec;
  const setActiveSub = (k: string) => {
    if (mainTab === "mundo") setMundoSec(k as MundoSec);
    else if (mainTab === "entidades") setEntidadesSec(k as EntidadesSec);
    else setGameSec(k as GameSec);
  };

  const ambSubs: AmbSub[] = ["factores", "modificadores"];

  return (
    <div className="flex flex-col h-full min-h-0" style={{ paddingLeft: "52px" }}>
      {/* Tab principal */}
      <div className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-0 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
        {MAIN_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setMainTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all rounded-t-lg"
            style={{ background: mainTab === key ? "color-mix(in srgb, var(--primary) 8%, var(--bg-main))" : "transparent", color: mainTab === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)", borderBottom: mainTab === key ? "2px solid var(--primary)" : "2px solid transparent", marginBottom: "-1px" }}>
            <Icon size={13} strokeWidth={mainTab === key ? 2.5 : 2} />{label}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="shrink-0 flex items-center gap-0.5 px-4 py-2 border-b flex-wrap"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))" }}>
        {subSecs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setActiveSub(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: activeSub === key ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: activeSub === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
            <Icon size={12} strokeWidth={activeSub === key ? 2.5 : 2} />{label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 flex flex-col">
        {mainTab === "mundo" && (
          <>
            {mundoSec === "biomas" && <BiomasSection />}
            {mundoSec === "reinos" && <ReinosSection />}
            {mundoSec === "ecologia" && <EcologiaSection />}
          </>
        )}
        {mainTab === "entidades" && (
          <>
            {entidadesSec === "personajes" && <PersonajesSection />}
            {entidadesSec === "criaturas" && <CriaturasSection />}
          </>
        )}
        {mainTab === "game" && (
          <>
            {gameSec === "items" && <ItemsSection />}
            {gameSec === "props" && <PropsSection />}
            {gameSec === "misiones" && <MisionesSection />}

            {gameSec === "recetas" && <RecetasSection />}
            {ambSubs.includes(gameSec as AmbSub) && <AmbienteSection activeSub={gameSec as AmbSub} />}
          </>
        )}
      </div>
    </div>
  );
}
