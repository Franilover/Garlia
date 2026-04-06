"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Map, MapPin, Plus, Trash2, Save, Loader2,
  Image as ImageIcon, X, ChevronDown, CheckCircle2,
  AlertCircle, Edit3, Check, MoreHorizontal, Pencil, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize, EmptyEstudio, ModalBase, CampoInput, BotonSubmit } from "@/components/templates/EstudioTemplates";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { useConfirm } from "@/components/ui/ConfirmModal";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { useLastOpenedId } from "@/hooks/useEditorShared";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Reino = {
  id: string;
  nombre: string;
  descripcion?: string;
  mapa_url?: string;
  coord_x?: number;
  coord_y?: number;
};

type ReinoDetalle = {
  id: string;
  reino_id: string;
  nombre: string;
  descripcion?: string;
  coord_x?: number;
  coord_y?: number;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const INPUT_CLS = "w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors";

// ─── Hooks de Datos ───────────────────────────────────────────────────────────

function useReinos() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("reinos").select("*").order("nombre");
    if (!error && data) setReinos(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { reinos, setReinos, loading, refetch: load };
}

function useReinoEditor(reinoId: string | null) {
  const [reino, setReino] = useState<Reino | null>(null);
  const [detalles, setDetalles] = useState<ReinoDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const [reinoRes, detallesRes] = await Promise.all([
      supabase.from("reinos").select("*").eq("id", id).single(),
      supabase.from("reino_detalles").select("*").eq("reino_id", id).order("nombre")
    ]);
    if (!reinoRes.error) setReino(reinoRes.data);
    if (!detallesRes.error) setDetalles(detallesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (reinoId) load(reinoId);
    else { setReino(null); setDetalles([]); }
  }, [reinoId, load]);

  return { reino, setReino, detalles, setDetalles, loading, reload: () => reinoId && load(reinoId) };
}

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    saving: { icon: <Loader2 size={11} className="animate-spin" />, text: "Guardando…", cls: "text-primary/40" },
    saved:  { icon: <CheckCircle2 size={11} />,                     text: "Guardado",   cls: "text-emerald-400" },
    error:  { icon: <AlertCircle  size={11} />,                     text: "Error",      cls: "text-red-400" },
  }[status];
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${map.cls}`}>
      {map.icon} {map.text}
    </span>
  );
}

function SelectorImagen({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (url: string) => void; placeholder?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <div onClick={() => setOpen(true)} className="relative aspect-video rounded-xl overflow-hidden border border-primary/15 bg-primary/4 cursor-pointer group">
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              <ImageIcon size={18} className="text-white" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Cambiar</span>
            </div>
            <button onClick={e => { e.stopPropagation(); onChange(""); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <X size={10} className="text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/20 hover:text-primary/40 transition-colors">
            {placeholder ?? <ImageIcon size={24} />}
            <span className="text-[9px] font-black uppercase tracking-widest">Elegir imagen de mapa</span>
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><ImageIcon size={11} /> {label}</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editor de Detalles (Puntos del Mapa) ─────────────────────────────────────

function DetalleEditor({ detalle, onSaved, onDeleted }: { detalle: ReinoDetalle; onSaved: (d: ReinoDetalle) => void; onDeleted: (id: string) => void; }) {
  const [form, setForm] = useState(detalle);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const handleSave = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("reino_detalles").update(form).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: `¿Eliminar punto "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("reino_detalles").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="border border-primary/10 rounded-xl bg-bg-main/50 hover:border-primary/20 transition-all overflow-hidden mb-3">
      <ConfirmModal />
      <div className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin size={13} className="text-primary/40 shrink-0" />
          <span className="text-[11px] font-black uppercase text-primary tracking-widest truncate">{form.nombre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-bold text-primary/30 tracking-widest bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
            X:{form.coord_x || 0} Y:{form.coord_y || 0}
          </span>
          <ChevronDown size={14} className={`text-primary/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 pt-0 border-t border-primary/5 space-y-4 bg-primary/3">
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Nombre</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={INPUT_CLS + " mt-1"} />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Descripción / Lore</label>
            <textarea value={form.descripcion || ""} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} className={INPUT_CLS + " mt-1 resize-none"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Coord X (%)</label>
              <input type="number" step="0.01" value={form.coord_x || 0} onChange={e => setForm({ ...form, coord_x: parseFloat(e.target.value) })} className={INPUT_CLS + " mt-1"} />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Coord Y (%)</label>
              <input type="number" step="0.01" value={form.coord_y || 0} onChange={e => setForm({ ...form, coord_y: parseFloat(e.target.value) })} className={INPUT_CLS + " mt-1"} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={handleDelete} className="p-2 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
              <Trash2 size={11} /> Eliminar
            </button>
            <div className="flex items-center gap-3">
              <SaveIndicator status={status} />
              <button onClick={handleSave} className="bg-primary text-bg-main px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5">
                <Check size={11} /> Guardar Punto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel Principal del Editor ───────────────────────────────────────────────

function PanelEditorReino({ reinoId }: { reinoId: string }) {
  const { reino, setReino, detalles, setDetalles, loading, reload } = useReinoEditor(reinoId);
  const [form, setForm] = useState<Reino | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [addingPoint, setAddingPoint] = useState(false);
  const [newPointName, setNewPointName] = useState("");

  useEffect(() => { if (reino) setForm(reino); }, [reino]);

  const saveReino = async () => {
    if (!form) return;
    setStatus("saving");
    try {
      const { error } = await supabase.from("reinos").update({
        nombre: form.nombre,
        descripcion: form.descripcion,
        mapa_url: form.mapa_url,
        coord_x: form.coord_x,
        coord_y: form.coord_y,
      }).eq("id", form.id);
      if (error) throw error;
      setReino(form);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const handleAddPoint = async () => {
    if (!newPointName.trim() || !form) return;
    try {
      const newPoint = { reino_id: form.id, nombre: newPointName.trim(), coord_x: 50, coord_y: 50 };
      const { data, error } = await supabase.from("reino_detalles").insert([newPoint]).select().single();
      if (error) throw error;
      setDetalles(prev => [...prev, data]);
      setAddingPoint(false);
      setNewPointName("");
    } catch (e) { console.error(e); }
  };

  if (loading || !form) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-bg-main relative">
      
      {/* Header fijo */}
      <div className="shrink-0 px-8 py-6 border-b border-primary/10 sticky top-0 bg-bg-main/90 backdrop-blur-md z-10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <input
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            className="w-full bg-transparent text-2xl font-black uppercase italic tracking-tight text-primary outline-none border-b-2 border-transparent focus:border-primary/30 pb-1 truncate"
            placeholder="NOMBRE DEL REINO"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SaveIndicator status={status} />
          <button onClick={saveReino} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary text-white hover:text-bg-main transition-all" title="Guardar reino">
            <Save size={15} />
          </button>
          <button onClick={reload} className="p-2 rounded-xl hover:bg-primary/10 text-primary/30 hover:text-primary transition-all" title="Recargar">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl space-y-8">
        
        {/* Sección General */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Descripción General / Lore</label>
              <textarea
                value={form.descripcion || ""}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                rows={6}
                className={INPUT_CLS + " mt-1 resize-none"}
                placeholder="Historia y detalles del reino..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Ubicación Global X (%)</label>
                <input type="number" step="0.01" value={form.coord_x || 0} onChange={e => setForm({ ...form, coord_x: parseFloat(e.target.value) })} className={INPUT_CLS + " mt-1"} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Ubicación Global Y (%)</label>
                <input type="number" step="0.01" value={form.coord_y || 0} onChange={e => setForm({ ...form, coord_y: parseFloat(e.target.value) })} className={INPUT_CLS + " mt-1"} />
              </div>
            </div>
          </div>
          
          <div>
            <SelectorImagen
              label="Cartografía (Imagen del Mapa)"
              value={form.mapa_url || ""}
              onChange={url => setForm({ ...form, mapa_url: url })}
            />
          </div>
        </div>

        {/* Sección Puntos de Interés */}
        <div className="border-t border-primary/10 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <MapPin size={14} /> Puntos de Interés ({detalles.length})
            </h3>
          </div>

          <div className="space-y-3">
            {detalles.map(det => (
              <DetalleEditor
                key={det.id}
                detalle={det}
                onSaved={(updated) => setDetalles(prev => prev.map(d => d.id === updated.id ? updated : d))}
                onDeleted={(id) => setDetalles(prev => prev.filter(d => d.id !== id))}
              />
            ))}

            {detalles.length === 0 && !addingPoint && (
              <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest text-center py-6 border border-dashed border-primary/15 rounded-xl">Sin puntos registrados</p>
            )}

            {addingPoint ? (
              <div className="flex gap-2 p-3 bg-primary/5 rounded-xl border border-primary/15">
                <input
                  autoFocus
                  value={newPointName}
                  onChange={e => setNewPointName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddPoint(); if (e.key === "Escape") setAddingPoint(false); }}
                  className="flex-1 bg-bg-main border border-primary/20 rounded-lg px-3 py-2 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                  placeholder="NOMBRE DEL LUGAR..."
                />
                <button onClick={handleAddPoint} disabled={!newPointName.trim()} className="bg-primary text-bg-main px-4 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40"><Check size={14} /></button>
                <button onClick={() => setAddingPoint(false)} className="px-3 py-2 rounded-lg text-primary/40 hover:text-primary transition-all"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setAddingPoint(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest mt-2">
                <Plus size={12} /> Añadir Punto de Interés
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Componente Layout Principal ──────────────────────────────────────────────

export default function EstudioReinos() {
  const { reinos, setReinos, loading, refetch } = useReinos();
  const [lastId, setLastId] = useLastOpenedId("estudio-reinos-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(lastId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showNuevo, setShowNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const setSelectedId = (id: string | null) => { _setSelectedId(id); setLastId(id); };

  const filtrados = useMemo(() => reinos.filter(r => !busqueda || normalize(r.nombre).includes(normalize(busqueda))), [reinos, busqueda]);

  const handleCrearReino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    try {
      const { data, error } = await supabase.from("reinos").insert([{ nombre: nombreNuevo.trim(), coord_x: 50, coord_y: 50 }]).select().single();
      if (error) throw error;
      setReinos(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setSelectedId(data.id);
      setShowNuevo(false);
      setNombreNuevo("");
    } catch (e) { console.error(e); }
    setCreando(false);
  };

  const handleEliminarReino = async (id: string, nombre: string) => {
    const ok = await confirm({ message: `¿Eliminar permanentemente el reino "${nombre}" y todos sus puntos?`, danger: true });
    if (!ok) return;
    try {
      await supabase.from("reinos").delete().eq("id", id);
      setReinos(prev => prev.filter(r => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) { console.error(e); }
  };

  const sidebarContent = (
    <div className="space-y-1">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-primary/30"><Loader2 className="animate-spin" size={20} /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-10 text-primary/25"><p className="text-xs font-black uppercase tracking-widest">Sin resultados</p></div>
      ) : (
        filtrados.map(r => (
          <div key={r.id} className="relative group/reino">
            <button
              onClick={() => { setSelectedId(r.id); setSidebarOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
                selectedId === r.id ? "bg-primary text-bg-main border-primary shadow-lg shadow-primary/20" : "border-transparent hover:bg-primary/5 hover:border-primary/10 text-primary"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-black text-sm uppercase italic tracking-tight truncate flex-1 ${selectedId === r.id ? "text-bg-main" : ""}`}>
                  {r.nombre}
                </span>
              </div>
            </button>
            <div className="absolute top-2 right-2 opacity-0 group-hover/reino:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleEliminarReino(r.id, r.nombre); }}
                className={`p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-all ${selectedId === r.id ? "text-bg-main/70 hover:text-bg-main hover:bg-bg-main/20" : ""}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      <ConfirmModal />
      <EstudioLayout
        titulo="Cartografía"
        icono={<Map size={12} />}
        colapsadoLabel="Reinos"
        onRefetch={refetch}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        busquedaPlaceholder="Buscar reino..."
        headerExtra={
          <button onClick={() => setShowNuevo(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
            <Plus size={12} /> Nuevo Reino
          </button>
        }
        sidebarContent={sidebarContent}
        footerLeft={`${reinos.length} reinos`}
        footerRight={`${filtrados.length} mostrados`}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
        {selectedId ? (
          <PanelEditorReino key={selectedId} reinoId={selectedId} />
        ) : (
          <EmptyEstudio icono={<Map size={52} strokeWidth={1} />} titulo="Estudio Cartográfico" subtitulo="Selecciona un reino o crea uno nuevo" />
        )}
      </EstudioLayout>

      {showNuevo && (
        <ModalBase onClose={() => setShowNuevo(false)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
              <Map size={12} /> Nuevo Reino
            </h3>
            <button onClick={() => setShowNuevo(false)} className="text-primary/30 hover:text-primary"><X size={16} /></button>
          </div>
          <form onSubmit={handleCrearReino} className="space-y-4">
            <CampoInput label="Nombre del Reino *" value={nombreNuevo} onChange={setNombreNuevo} placeholder="EJ: LESTA..." autoFocus />
            <BotonSubmit loading={creando} disabled={!nombreNuevo.trim()} labelLoading={<><Loader2 size={13} className="animate-spin" /> Creando...</>} labelNormal={<><Plus size={13} /> Crear Reino</>} />
          </form>
        </ModalBase>
      )}
    </>
  );
}