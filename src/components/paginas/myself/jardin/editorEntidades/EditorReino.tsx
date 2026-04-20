"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Map, MapPin, Plus, Check, X, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Reino, type ReinoDetalle, type SaveStatus, INPUT_CLS } from "./types";
import { useReinoDetalles, usePersonajesDelReino } from "./hooks";
import { Campo, CampoArea, BarraAcciones, SelectorImagen, SaveIndicator } from "./UIComponents";
import { PanelPersonajes } from "./PanelPersonajes";

function MapaPuntosReino({ mapaUrl, detalles, onDetallesChange }: {
  mapaUrl: string;
  detalles: ReinoDetalle[];
  onDetallesChange: (detalles: ReinoDetalle[]) => void;
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

  const handleMarkerClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(prev => prev === id ? null : id);
  };

  if (!mapaUrl) return (
    <div className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border border-dashed border-primary/15 text-primary/25">
      <Map size={20} />
      <span className="text-[9px] font-black uppercase tracking-widest">Sin imagen de mapa del reino</span>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <MapPin size={9} /> Puntos en el mapa
        {selectedId && (
          <span className="ml-auto text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
            clickeá el mapa para mover
          </span>
        )}
      </label>
      <div
        className={`relative w-full overflow-hidden rounded-xl border select-none ${
          selectedId ? "cursor-crosshair border-primary/40" : "cursor-default border-primary/15"
        }`}
        style={{ aspectRatio: "16/9" }}
        onClick={handleMapClick}
      >
        <img src={mapaUrl} alt="Mapa" className="w-full h-full object-cover pointer-events-none" draggable={false} />
        {detalles.map(d => {
          const x = d.coord_x ?? 0;
          const y = d.coord_y ?? 0;
          const isSelected = selectedId === d.id;
          return (
            <div key={d.id} className="absolute z-10 flex flex-col items-center"
              style={{ top: `${y}%`, left: `${x}%`, transform: "translate(-50%, -100%)" }}>
              <div className={`mb-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-md transition-all ${
                isSelected ? "bg-primary text-btn-text scale-110" : "bg-bg-main/90 text-primary border border-primary/20"
              }`}>{d.nombre}</div>
              <button
                onClick={e => handleMarkerClick(e, d.id)}
                className={`w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${
                  isSelected ? "bg-yellow-400 scale-125 ring-2 ring-yellow-400/50" : "bg-primary hover:scale-110"
                }`}
              />
              <div className={`w-px h-2 ${isSelected ? "bg-yellow-400" : "bg-primary/50"}`} />
            </div>
          );
        })}
        {selectedId && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
      </div>
      {selectedId && (
        <button onClick={() => setSelectedId(null)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary/50 hover:text-primary transition-all">
          <X size={9} /> Cancelar selección
        </button>
      )}
    </div>
  );
}

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
      setStatus("saved");
      onSaved(data);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const toggleOculto = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nuevo = { ...form, oculto: !form.oculto };
    setForm(nuevo);
    await saveDetalle(nuevo);
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: `¿Eliminar punto "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("reino_detalles").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="border border-primary/10 rounded-xl bg-bg-main/50 hover:border-primary/20 transition-all overflow-hidden">
      <ConfirmModal />
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin size={12} className={`shrink-0 ${form.oculto ? "text-primary/20" : "text-primary/40"}`} />
          <span className={`text-[11px] font-black uppercase tracking-widest truncate ${form.oculto ? "text-primary/30 line-through" : "text-primary"}`}>{form.nombre}</span>
          {form.oculto && (
            <span className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-orange-400/70 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-lg">
              <EyeOff size={8} /> Oculto
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleOculto} title={form.oculto ? "Mostrar en mapa" : "Ocultar del mapa"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
              form.oculto
                ? "text-orange-400 bg-orange-400/10 border-orange-400/30 hover:bg-orange-400/20"
                : "text-primary/50 bg-primary/5 border-primary/15 hover:text-primary hover:bg-primary/10"
            }`}>
            {form.oculto ? <><EyeOff size={11} /> Oculto</> : <><Eye size={11} /> Visible</>}
          </button>
          <span className="text-[9px] font-bold text-primary/30 bg-primary/5 px-1.5 py-0.5 rounded-lg border border-primary/10">
            {(form.coord_x ?? 0).toFixed(1)},{(form.coord_y ?? 0).toFixed(1)}
          </span>
          <X size={13} className={`text-primary/40 transition-transform ${expanded ? "rotate-45" : ""}`} style={{ transform: expanded ? "rotate(45deg)" : undefined }} />
        </div>
      </div>

      {expanded && (
        <div className="p-3 pt-0 border-t border-primary/5 space-y-3 bg-primary/3">
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Nombre del punto</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={INPUT_CLS + " mt-1"} />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Descripción del lugar</label>
            <textarea value={form.descripcion ?? ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full bg-input-bg text-input-text border border-primary/10 rounded-xl px-4 py-3 text-sm min-h-[180px] resize-y mt-1"
              placeholder="Escribe el lore aquí..." />
          </div>
          <div className="flex items-center justify-between px-1 py-2 rounded-xl border border-primary/8 bg-primary/3">
            <div className="flex items-center gap-2">
              {form.oculto ? <EyeOff size={13} className="text-orange-400" /> : <Eye size={13} className="text-primary/40" />}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Visibilidad en el mapa</p>
                <p className="text-[9px] text-primary/35">{form.oculto ? "Este punto no aparece para los usuarios" : "Este punto es visible en el mapa"}</p>
              </div>
            </div>
            <button onClick={toggleOculto}
              className={`relative w-10 h-5 rounded-full transition-all border ${form.oculto ? "bg-orange-400/20 border-orange-400/40" : "bg-primary/15 border-primary/20"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${form.oculto ? "left-5 bg-orange-400" : "left-0.5 bg-primary/50"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleDelete} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 size={10} /> Eliminar
            </button>
            <div className="flex items-center gap-2">
              <SaveIndicator status={status} />
              <button onClick={() => saveDetalle(form)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
                <Check size={10} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelPersonajesReino({ reinoNombre }: { reinoNombre: string }) {
  const { personajes, setPersonajes, loading } = usePersonajesDelReino(reinoNombre);
  return <PanelPersonajes personajes={personajes} loading={loading} setPersonajes={setPersonajes} titulo="Personajes" />;
}

export function EditorReino({ item, onSaved, onDeleted }: {
  item: Reino; onSaved: (r: Reino) => void; onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<Reino>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [addingPoint, setAddingPoint] = useState(false);
  const [newPointName, setNewPointName] = useState("");
  const { detalles, setDetalles } = useReinoDetalles(item.id);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("reinos").update({
        nombre: form.nombre,
        historia: form.historia, politica: form.politica,
        economia: form.economia, geografia: form.geografia, cultura: form.cultura,
        mapa_url: form.mapa_url, coord_x: form.coord_x, coord_y: form.coord_y,
        oculto: form.oculto ?? false,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar el reino "${form.nombre}" y todos sus puntos?`, danger: true });
    if (!ok) return;
    await supabase.from("reinos").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  const handleAddPoint = async () => {
    if (!newPointName.trim()) return;
    const newPoint = { reino_id: form.id, nombre: newPointName.trim(), coord_x: 50, coord_y: 50 };
    const { data, error } = await supabase.from("reino_detalles").insert([newPoint]).select().single();
    if (!error && data) { setDetalles(prev => [...prev, data]); setAddingPoint(false); setNewPointName(""); }
  };

  const handleDetallesMapChange = async (updated: ReinoDetalle[]) => {
    setDetalles(updated);
    await Promise.all(
      updated.map(d => supabase.from("reino_detalles").update({ coord_x: d.coord_x, coord_y: d.coord_y }).eq("id", d.id))
    );
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="shrink-0 p-5 pb-3">
          <SelectorImagen label="Imagen del mapa del reino" value={form.mapa_url ?? ""}
            onChange={url => setForm(f => ({ ...f, mapa_url: url }))} aspect="video"
            placeholder={<Map size={24} className="opacity-20" />} />
        </div>

        <div className="p-5 pt-2 space-y-5">
          <Campo label="Nombre" value={form.nombre ?? ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del reino" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CampoArea label="Historia" value={form.historia ?? ""} onChange={e => setForm(f => ({ ...f, historia: e.target.value }))} rows={8} placeholder="Origen, eventos clave, cronología del reino…" />
            <CampoArea label="Política" value={form.politica ?? ""} onChange={e => setForm(f => ({ ...f, politica: e.target.value }))} rows={8} placeholder="Sistema de gobierno, facciones, líderes, leyes…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CampoArea label="Economía" value={form.economia ?? ""} onChange={e => setForm(f => ({ ...f, economia: e.target.value }))} rows={8} placeholder="Recursos, comercio, moneda, riqueza…" />
            <CampoArea label="Geografía" value={form.geografia ?? ""} onChange={e => setForm(f => ({ ...f, geografia: e.target.value }))} rows={8} placeholder="Paisajes, clima, fronteras, ciudades principales…" />
          </div>
          <CampoArea label="Cultura" value={form.cultura ?? ""} onChange={e => setForm(f => ({ ...f, cultura: e.target.value }))} rows={8} placeholder="Tradiciones, religión, idioma, costumbres, arte…" />

          {}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-primary/8 bg-primary/3">
            <div className="flex items-center gap-2">
              {form.oculto ? <EyeOff size={13} className="text-orange-400" /> : <Eye size={13} className="text-primary/40" />}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Visibilidad en el mapa</p>
                <p className="text-[9px] text-primary/35">{form.oculto ? "Este reino no aparece en el mapa interactivo" : "Este reino es visible en el mapa"}</p>
              </div>
            </div>
            <button onClick={() => setForm(f => ({ ...f, oculto: !f.oculto }))}
              className={`relative w-10 h-5 rounded-full transition-all border ${form.oculto ? "bg-orange-400/20 border-orange-400/40" : "bg-primary/15 border-primary/20"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${form.oculto ? "left-5 bg-orange-400" : "left-0.5 bg-primary/50"}`} />
            </button>
          </div>

          <div className="h-px bg-primary/8" />

          <MapaPuntosReino mapaUrl={form.mapa_url ?? ""} detalles={detalles} onDetallesChange={handleDetallesMapChange} />

          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/50 flex items-center gap-2">
              <MapPin size={12} /> Puntos de Interés
              <span className="text-[9px] text-primary/30 bg-primary/8 px-2 py-0.5 rounded-full ml-1">{detalles.length}</span>
            </h3>
            <div className="space-y-2">
              {detalles.map(det => (
                <DetalleEditor key={det.id} detalle={det}
                  onSaved={updated => setDetalles(prev => prev.map(d => d.id === updated.id ? updated : d))}
                  onDeleted={id => setDetalles(prev => prev.filter(d => d.id !== id))} />
              ))}
            </div>
            {detalles.length === 0 && !addingPoint && (
              <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-5 border border-dashed border-primary/15 rounded-xl italic">Sin puntos registrados</p>
            )}
            {addingPoint ? (
              <div className="flex gap-2 p-3 bg-primary/5 rounded-xl border border-primary/15">
                <input autoFocus value={newPointName} onChange={e => setNewPointName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddPoint(); if (e.key === "Escape") setAddingPoint(false); }}
                  className="flex-1 bg-bg-main border border-primary/20 rounded-lg px-3 py-2 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                  placeholder="NOMBRE DEL LUGAR..." />
                <button onClick={handleAddPoint} disabled={!newPointName.trim()} className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40">
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

        <BarraAcciones status={status} onSave={save} onDelete={del} />
      </div>

      <PanelPersonajesReino reinoNombre={form.nombre} />
    </div>
  );
}