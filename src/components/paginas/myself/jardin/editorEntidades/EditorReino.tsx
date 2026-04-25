"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Map, MapPin, Plus, Check, X, Trash2, Save,
  Eye, EyeOff, Loader2, ChevronDown, Globe, Landmark, Coins, Mountain,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Reino, type ReinoDetalle, type SaveStatus, INPUT_CLS } from "./types";
import { useReinoDetalles, usePersonajesDelReino } from "./hooks";
import { SelectorImagen, SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import { PanelPersonajes } from "./PanelPersonajes";

// ─── Tabs internas ─────────────────────────────────────────────────────────────
type InnerTab = "mapa" | "lore" | "politica";

const TABS: { key: InnerTab; label: string; Icon: React.ElementType }[] = [
  { key: "mapa",    label: "Mapa",    Icon: Map      },
  { key: "lore",    label: "Lore",    Icon: Globe    },
  { key: "politica",label: "Sociedad",Icon: Landmark },
];

// ─── Campo colapsable ─────────────────────────────────────────────────────────
function CampoLore({
  label, value, onChange, placeholder, rows = 6, icon: Icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; icon?: React.ElementType;
}) {
  const [open, setOpen] = useState(!!value);
  const preview = value.replace(/[#*`_~\[\]]/g, "").trim().slice(0, 80);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3">
        {Icon && <Icon size={12} className="shrink-0 text-primary/35" />}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/40">{label}</p>
          {!open && preview && <p className="text-[11px] text-primary/35 truncate mt-0.5 font-medium italic">{preview}…</p>}
          {!open && !preview && <p className="text-[10px] text-primary/20 mt-0.5 italic">{placeholder?.slice(0, 55)}…</p>}
        </div>
        <ChevronDown size={13} className="shrink-0 text-primary/25 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <MarkdownEditor value={value} onChange={onChange} placeholder={placeholder} rows={rows} toolbar defaultMode="edit" />
        </div>
      )}
    </div>
  );
}

// ─── Mapa interactivo con puntos ───────────────────────────────────────────────
function MapaPuntosReino({ mapaUrl, detalles, onDetallesChange }: {
  mapaUrl: string; detalles: ReinoDetalle[]; onDetallesChange: (d: ReinoDetalle[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));
    onDetallesChange(detalles.map(d => d.id === selectedId ? { ...d, coord_x: x, coord_y: y } : d));
    setSelectedId(null);
  };

  if (!mapaUrl) return (
    <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-primary/15 text-primary/25">
      <Map size={18} />
      <span className="text-[9px] font-black uppercase tracking-widest">Sin imagen de mapa</span>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {selectedId && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/60"
          style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <span>Clickeá el mapa para mover el punto</span>
          <button onClick={() => setSelectedId(null)} className="text-primary/40 hover:text-primary transition-colors"><X size={11} /></button>
        </div>
      )}
      <div
        className={`relative w-full overflow-hidden rounded-xl border select-none ${selectedId ? "cursor-crosshair border-primary/40" : "cursor-default border-primary/15"}`}
        onClick={handleMapClick}
      >
        <img src={mapaUrl} alt="Mapa" className="w-full h-auto object-contain pointer-events-none" draggable={false} />
        {detalles.map(d => {
          const isSelected = selectedId === d.id;
          return (
            <div key={d.id} className="absolute z-10 flex flex-col items-center"
              style={{ top: `${d.coord_y ?? 0}%`, left: `${d.coord_x ?? 0}%`, transform: "translate(-50%, -100%)" }}>
              <div className={`mb-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-md transition-all ${
                isSelected ? "bg-primary text-btn-text scale-110" : "bg-bg-main/90 text-primary border border-primary/20"
              }`}>{d.nombre}</div>
              <button onClick={e => { e.stopPropagation(); setSelectedId(prev => prev === d.id ? null : d.id); }}
                className={`w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${
                  isSelected ? "bg-yellow-400 scale-125 ring-2 ring-yellow-400/50" : "bg-primary hover:scale-110"
                }`} />
              <div className={`w-px h-2 ${isSelected ? "bg-yellow-400" : "bg-primary/50"}`} />
            </div>
          );
        })}
        {selectedId && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
      </div>
    </div>
  );
}

// ─── DetalleEditor ─────────────────────────────────────────────────────────────
function DetalleEditor({ detalle, onSaved, onDeleted }: {
  detalle: ReinoDetalle; onSaved: (d: ReinoDetalle) => void; onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState(detalle);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const prevCoords = useRef({ x: detalle.coord_x, y: detalle.coord_y });
  useEffect(() => {
    if (detalle.coord_x !== prevCoords.current.x || detalle.coord_y !== prevCoords.current.y) {
      prevCoords.current = { x: detalle.coord_x, y: detalle.coord_y };
      setForm(f => ({ ...f, coord_x: detalle.coord_x, coord_y: detalle.coord_y }));
    }
  }, [detalle.coord_x, detalle.coord_y]);

  const saveDetalle = async (data: ReinoDetalle) => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("reino_detalles").update({
        nombre: data.nombre, descripcion: data.descripcion,
        coord_x: data.coord_x, coord_y: data.coord_y, oculto: data.oculto ?? false,
      }).eq("id", data.id);
      if (error) throw error;
      setStatus("saved"); onSaved(data);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const toggleOculto = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nuevo = { ...form, oculto: !form.oculto };
    setForm(nuevo); await saveDetalle(nuevo);
  };

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
      <ConfirmModal />
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <MapPin size={11} className={`shrink-0 ${form.oculto ? "text-primary/20" : "text-primary/40"}`} />
        <span className={`flex-1 text-[11px] font-black uppercase tracking-widest truncate ${form.oculto ? "text-primary/30 line-through" : "text-primary"}`}>{form.nombre}</span>
        {form.oculto && (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-orange-400/70 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
            <EyeOff size={8} /> Oculto
          </span>
        )}
        <button onClick={toggleOculto} className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
          form.oculto ? "text-orange-400 bg-orange-400/10 border-orange-400/30" : "text-primary/40 bg-primary/5 border-primary/10 hover:text-primary"
        }`}>
          {form.oculto ? <Eye size={9} /> : <EyeOff size={9} />}
        </button>
        <X size={12} className="text-primary/25 transition-transform duration-200" style={{ transform: expanded ? "rotate(45deg)" : undefined }} />
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t space-y-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Nombre</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={INPUT_CLS + " mt-1"} placeholder="Nombre del lugar" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Descripción</label>
            <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
              rows={4} placeholder="Describe este lugar…" toolbar defaultMode="edit" />
          </div>
          <div className="flex items-center justify-between">
            <button onClick={async () => {
              const ok = await confirm({ message: `¿Eliminar punto "${form.nombre}"?`, danger: true });
              if (!ok) return;
              await supabase.from("reino_detalles").delete().eq("id", form.id);
              onDeleted(form.id);
            }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
              <Trash2 size={10} /> Eliminar
            </button>
            <div className="flex items-center gap-2">
              <SaveIndicator status={status} />
              <button onClick={() => saveDetalle(form)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
                <Check size={10} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditorReino ───────────────────────────────────────────────────────────────
export function EditorReino({ item, onSaved, onDeleted }: {
  item: Reino; onSaved: (r: Reino) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Reino>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [tab,    setTab]    = useState<InnerTab>("mapa");
  const [addingPoint, setAddingPoint] = useState(false);
  const [newPointName, setNewPointName] = useState("");
  const { detalles, setDetalles } = useReinoDetalles(item.id);
  const { confirm, ConfirmModal } = useConfirm();
  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesDelReino(form.nombre);

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("reinos").update({
        nombre: form.nombre, historia: form.historia, politica: form.politica,
        economia: form.economia, geografia: form.geografia, cultura: form.cultura,
        mapa_url: form.mapa_url, coord_x: form.coord_x, coord_y: form.coord_y,
        oculto: form.oculto ?? false,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved"); onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar el reino "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("reinos").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  const handleAddPoint = async () => {
    if (!newPointName.trim()) return;
    const { data, error } = await supabase.from("reino_detalles")
      .insert([{ reino_id: form.id, nombre: newPointName.trim(), coord_x: 50, coord_y: 50 }]).select().single();
    if (!error && data) { setDetalles(prev => [...prev, data]); setAddingPoint(false); setNewPointName(""); }
  };

  const handleDetallesMapChange = async (updated: ReinoDetalle[]) => {
    setDetalles(updated);
    await Promise.all(updated.map(d =>
      supabase.from("reino_detalles").update({ coord_x: d.coord_x, coord_y: d.coord_y }).eq("id", d.id)
    ));
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Fixed header ─────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          {/* Visibility toggle */}
          <button
            onClick={() => setForm(f => ({ ...f, oculto: !f.oculto }))}
            title={form.oculto ? "Mostrar en mapa" : "Ocultar del mapa"}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all border"
            style={form.oculto ? {
              color: "oklch(0.75 0.15 60)",
              background: "color-mix(in srgb, oklch(0.75 0.15 60) 12%, transparent)",
              borderColor: "color-mix(in srgb, oklch(0.75 0.15 60) 30%, transparent)",
            } : {
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            {form.oculto ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          {/* Name */}
          <input
            value={form.nombre ?? ""}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre del reino"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-2">
            <SaveIndicator status={status} />
            <button onClick={del}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
              <Trash2 size={10} />
            </button>
            <button onClick={save} disabled={status === "saving"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
              <Save size={11} /> Guardar
            </button>
          </div>
        </div>

        {/* ── Inner tabs ───────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-1 px-4 py-2 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={tab === key ? {
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              } : {
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                border: "1px solid transparent",
              }}
            >
              <Icon size={11} /> <span className="hidden sm:inline">{label}</span>
              {key === "mapa" && detalles.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                  {detalles.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* MAPA */}
          {tab === "mapa" && (
            <div className="p-4 space-y-4">
              <SelectorImagen label="Imagen del mapa" value={form.mapa_url ?? ""}
                onChange={url => setForm(f => ({ ...f, mapa_url: url }))} aspect="landscape"
                placeholder={<Map size={24} className="opacity-20" />} />

              <MapaPuntosReino mapaUrl={form.mapa_url ?? ""} detalles={detalles} onDetallesChange={handleDetallesMapChange} />

              {/* Puntos de interés */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin size={11} className="text-primary/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">Puntos de Interés</span>
                  {detalles.length > 0 && (
                    <span className="text-[9px] font-black text-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full ml-1">{detalles.length}</span>
                  )}
                </div>

                <div className="space-y-2">
                  {detalles.map(det => (
                    <DetalleEditor key={det.id} detalle={det}
                      onSaved={updated => setDetalles(prev => prev.map(d => d.id === updated.id ? updated : d))}
                      onDeleted={id => setDetalles(prev => prev.filter(d => d.id !== id))} />
                  ))}
                </div>

                {detalles.length === 0 && !addingPoint && (
                  <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-5 border border-dashed border-primary/15 rounded-xl italic">
                    Sin puntos registrados
                  </p>
                )}

                {addingPoint ? (
                  <div className="flex gap-2 p-3 rounded-xl border border-primary/15"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                    <input autoFocus value={newPointName} onChange={e => setNewPointName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddPoint(); if (e.key === "Escape") setAddingPoint(false); }}
                      className="flex-1 bg-bg-main border border-primary/20 rounded-lg px-3 py-2 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                      placeholder="NOMBRE DEL LUGAR..." />
                    <button onClick={handleAddPoint} disabled={!newPointName.trim()}
                      className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setAddingPoint(false)} className="px-2.5 py-2 rounded-lg text-primary/40 hover:text-primary transition-all">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingPoint(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
                    <Plus size={11} /> Añadir Punto de Interés
                  </button>
                )}
              </div>
            </div>
          )}

          {/* LORE */}
          {tab === "lore" && (
            <div className="p-4 space-y-3">
              <CampoLore label="Historia" icon={Globe} value={form.historia ?? ""} onChange={v => setForm(f => ({ ...f, historia: v }))}
                placeholder="Origen, eventos clave, cronología del reino…" rows={7} />
              <CampoLore label="Geografía" icon={Mountain} value={form.geografia ?? ""} onChange={v => setForm(f => ({ ...f, geografia: v }))}
                placeholder="Paisajes, clima, fronteras, ciudades principales…" rows={7} />
              <CampoLore label="Cultura" icon={Globe} value={form.cultura ?? ""} onChange={v => setForm(f => ({ ...f, cultura: v }))}
                placeholder="Tradiciones, religión, idioma, costumbres, arte…" rows={7} />
            </div>
          )}

          {/* SOCIEDAD */}
          {tab === "politica" && (
            <div className="p-4 space-y-3">
              <CampoLore label="Política" icon={Landmark} value={form.politica ?? ""} onChange={v => setForm(f => ({ ...f, politica: v }))}
                placeholder="Sistema de gobierno, facciones, líderes, leyes…" rows={7} />
              <CampoLore label="Economía" icon={Coins} value={form.economia ?? ""} onChange={v => setForm(f => ({ ...f, economia: v }))}
                placeholder="Recursos, comercio, moneda, riqueza…" rows={7} />
            </div>
          )}
        </div>
      </div>

      {/* Panel personajes del reino */}
      <PanelPersonajes personajes={personajes} loading={loadingPersonajes} setPersonajes={setPersonajes} titulo="Personajes" />
    </div>
  );
}