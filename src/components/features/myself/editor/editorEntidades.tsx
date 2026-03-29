"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, X, Plus, Trash2, Save, Loader2,
  RefreshCw, WifiOff, Users, Bug, Package,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import EstudioLayout from "@/components/layout/EstudioLayout";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Personaje = {
  id: string;
  nombre: string;
  img_url?: string;
  sobre?: string;
  reino?: string;
  especie?: string;
};

type Criatura = {
  id: string;
  nombre: string;
  imagen_url?: string;
  descripcion?: string;
  habitat?: string;
  pensamiento?: string;
  alma?: string;
};

type Item = {
  id: string;
  nombre: string;
  imagen_url?: string;
  descripcion?: string;
  categoria?: string;
};

type TabKey = "personajes" | "criaturas" | "items";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAB_CONFIG: Record<TabKey, { label: string; tabla: string; Icon: React.ElementType; imgKey: string }> = {
  personajes: { label: "Personajes", tabla: "personajes", Icon: Users,   imgKey: "img_url"    },
  criaturas:  { label: "Criaturas",  tabla: "criaturas",  Icon: Bug,     imgKey: "imagen_url" },
  items:      { label: "Items",      tabla: "items",      Icon: Package, imgKey: "imagen_url" },
};

function getImg(item: any, tab: TabKey): string | undefined {
  return tab === "personajes" ? item.img_url : item.imagen_url;
}

// ─── Hook genérico de carga ───────────────────────────────────────────────────

function useEntidades<T extends { id: string; nombre: string }>(tab: TabKey) {
  const [items,     setItems]     = useState<T[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (!navigator.onLine) { setIsOffline(true); setLoading(false); return; }
    setIsOffline(false);
    try {
      const { data, error } = await supabase.from(TAB_CONFIG[tab].tabla).select("*").order("nombre");
      if (error) throw error;
      setItems((data ?? []) as T[]);
    } catch {
      setIsOffline(true);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
    const handleOnline = () => { setIsOffline(false); load(); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [load]);

  return { items, setItems, loading, isOffline, refetch: load };
}

// ─── SaveIndicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    saving: { icon: <Loader2 size={11} className="animate-spin" />, text: "Guardando…",  cls: "text-primary/40" },
    saved:  { icon: <CheckCircle2 size={11} />,                     text: "Guardado",    cls: "text-emerald-400" },
    error:  { icon: <AlertCircle  size={11} />,                     text: "Error",       cls: "text-red-400" },
  }[status];
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${map.cls}`}>
      {map.icon} {map.text}
    </span>
  );
}

// ─── Card de lista ────────────────────────────────────────────────────────────

function EntidadCard({
  item, tab, selected, onClick,
}: {
  item: any; tab: TabKey; selected: boolean; onClick: () => void;
}) {
  const img = getImg(item, tab);
  const TabIcon = TAB_CONFIG[tab].Icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
        selected
          ? "bg-primary/15 border border-primary/30"
          : "hover:bg-primary/5 border border-transparent hover:border-primary/10"
      }`}
    >
      {/* miniatura */}
      <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {img
          ? <img src={img} alt={item.nombre} className="w-full h-full object-cover" />
          : <TabIcon size={16} className="text-primary/20" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate ${selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"}`}>
          {item.nombre}
        </p>
        {/* subtítulo según tipo */}
        {tab === "personajes" && item.especie && (
          <p className="text-[10px] text-primary/35 truncate">{item.especie}</p>
        )}
        {tab === "criaturas" && item.habitat && (
          <p className="text-[10px] text-primary/35 truncate">{item.habitat}</p>
        )}
        {tab === "items" && item.categoria && (
          <p className="text-[10px] text-primary/35 truncate">{item.categoria}</p>
        )}
      </div>
    </button>
  );
}

// ─── Panel de edición: Personaje ──────────────────────────────────────────────

function EditorPersonaje({ item, onSaved, onDeleted }: {
  item: Personaje;
  onSaved: (p: Personaje) => void;
  onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Personaje>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre: form.nombre, img_url: form.img_url, sobre: form.sobre,
        reino: form.reino, especie: form.especie,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    if (!confirm(`¿Eliminar a "${form.nombre}"?`)) return;
    await supabase.from("personajes").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Cabecera con imagen */}
      <div className="relative h-40 bg-primary/5 border-b border-primary/10 shrink-0 overflow-hidden flex items-center justify-center">
        {form.img_url
          ? <img src={form.img_url} alt={form.nombre} className="h-full w-full object-contain" />
          : <Users size={48} strokeWidth={1} className="text-primary/10" />
        }
        <div className="absolute inset-0 bg-linear-to-t from-bg-main/80 to-transparent" />
        <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
          <h2 className="text-lg font-black text-primary truncate">{form.nombre || "Sin nombre"}</h2>
          <SaveIndicator status={status} />
        </div>
      </div>

      {/* Campos */}
      <div className="p-5 space-y-4">
        <Campo label="Nombre"   value={form.nombre       ?? ""} onChange={field("nombre")}   />
        <Campo label="Especie"  value={form.especie      ?? ""} onChange={field("especie")}  />
        <Campo label="Reino"    value={form.reino        ?? ""} onChange={field("reino")}    />
        <Campo label="Imagen URL" value={form.img_url   ?? ""} onChange={field("img_url")}  />
        <CampoArea label="Sobre" value={form.sobre       ?? ""} onChange={field("sobre")}    />
      </div>

      {/* Acciones */}
      <div className="shrink-0 px-5 pb-5 flex items-center justify-between gap-3 mt-auto">
        <button onClick={del}  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
          <Trash2 size={11} /> Eliminar
        </button>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
          <Save size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Panel de edición: Criatura ───────────────────────────────────────────────

function EditorCriatura({ item, onSaved, onDeleted }: {
  item: Criatura;
  onSaved: (c: Criatura) => void;
  onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Criatura) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criaturas").update({
        nombre: form.nombre, imagen_url: form.imagen_url, descripcion: form.descripcion,
        habitat: form.habitat, pensamiento: form.pensamiento, alma: form.alma,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    if (!confirm(`¿Eliminar a "${form.nombre}"?`)) return;
    await supabase.from("criaturas").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="relative h-40 bg-primary/5 border-b border-primary/10 shrink-0 overflow-hidden flex items-center justify-center">
        {form.imagen_url
          ? <img src={form.imagen_url} alt={form.nombre} className="h-full w-full object-contain" />
          : <Bug size={48} strokeWidth={1} className="text-primary/10" />
        }
        <div className="absolute inset-0 bg-linear-to-t from-bg-main/80 to-transparent" />
        <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
          <h2 className="text-lg font-black text-primary truncate">{form.nombre || "Sin nombre"}</h2>
          <SaveIndicator status={status} />
        </div>
      </div>

      <div className="p-5 space-y-4">
        <Campo    label="Nombre"      value={form.nombre      ?? ""} onChange={field("nombre")}      />
        <Campo    label="Hábitat"     value={form.habitat     ?? ""} onChange={field("habitat")}     />
        <Campo    label="Imagen URL"  value={form.imagen_url  ?? ""} onChange={field("imagen_url")}  />
        <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} />
        <CampoArea label="Pensamiento" value={form.pensamiento ?? ""} onChange={field("pensamiento")} />
        <CampoArea label="Alma"        value={form.alma        ?? ""} onChange={field("alma")}        />
      </div>

      <div className="shrink-0 px-5 pb-5 flex items-center justify-between gap-3 mt-auto">
        <button onClick={del}  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
          <Trash2 size={11} /> Eliminar
        </button>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
          <Save size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Panel de edición: Item ───────────────────────────────────────────────────

function EditorItem({ item, onSaved, onDeleted }: {
  item: Item;
  onSaved: (i: Item) => void;
  onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Item>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("items").update({
        nombre: form.nombre, imagen_url: form.imagen_url,
        descripcion: form.descripcion, categoria: form.categoria,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    if (!confirm(`¿Eliminar "${form.nombre}"?`)) return;
    await supabase.from("items").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="relative h-40 bg-primary/5 border-b border-primary/10 shrink-0 overflow-hidden flex items-center justify-center">
        {form.imagen_url
          ? <img src={form.imagen_url} alt={form.nombre} className="h-full w-full object-contain" />
          : <Package size={48} strokeWidth={1} className="text-primary/10" />
        }
        <div className="absolute inset-0 bg-linear-to-t from-bg-main/80 to-transparent" />
        <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
          <h2 className="text-lg font-black text-primary truncate">{form.nombre || "Sin nombre"}</h2>
          <SaveIndicator status={status} />
        </div>
      </div>

      <div className="p-5 space-y-4">
        <Campo    label="Nombre"     value={form.nombre     ?? ""} onChange={field("nombre")}     />
        <Campo    label="Categoría"  value={form.categoria  ?? ""} onChange={field("categoria")}  />
        <Campo    label="Imagen URL" value={form.imagen_url ?? ""} onChange={field("imagen_url")} />
        <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} />
      </div>

      <div className="shrink-0 px-5 pb-5 flex items-center justify-between gap-3 mt-auto">
        <button onClick={del}  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
          <Trash2 size={11} /> Eliminar
        </button>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
          <Save size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Componentes de campo reutilizables ───────────────────────────────────────

const INPUT_CLS = "w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors";

function Campo({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <input value={value} onChange={onChange} className={INPUT_CLS} />
    </div>
  );
}

function CampoArea({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <textarea value={value} onChange={onChange} rows={4} className={`${INPUT_CLS} resize-none`} />
    </div>
  );
}

// ─── Modal: Nueva entidad ─────────────────────────────────────────────────────

function ModalNueva({ tab, onCreated, onClose }: {
  tab: TabKey;
  onCreated: (item: any) => void;
  onClose: () => void;
}) {
  const [nombre,  setNombre]  = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const payload: any = { nombre: nombre.trim() };
      const { data, error } = await supabase.from(TAB_CONFIG[tab].tabla).insert([payload]).select().single();
      if (error) throw error;
      onCreated(data);
      onClose();
    } catch { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white-custom text-foreground border border-primary/15 rounded-2xl p-6 w-80 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50">
          Nueva entrada · {TAB_CONFIG[tab].label}
        </h3>
        <input
          autoFocus
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && create()}
          placeholder="Nombre…"
          className="w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/40 transition-colors"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/10 text-primary/30 hover:text-primary hover:border-primary/20 transition-all">
            Cancelar
          </button>
          <button
            onClick={create}
            disabled={loading || !nombre.trim()}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EditorEntidades() {
  const [tab,         setTab]         = useState<TabKey>("personajes");
  const [busqueda,    setBusqueda]    = useState("");
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNueva,   setShowNueva]   = useState(false);

  const { items, setItems, loading, isOffline, refetch } = useEntidades<any>(tab);

  useEffect(() => { setSelectedId(null); setBusqueda(""); }, [tab]);

  const filtrados = useMemo(() =>
    items.filter(i => !busqueda || normalize(i.nombre).includes(normalize(busqueda))),
    [items, busqueda]
  );

  const selected = useMemo(() => items.find(i => i.id === selectedId) ?? null, [items, selectedId]);

  const handleCreated = (item: any) => { setItems(prev => [item, ...prev]); setSelectedId(item.id); };
  const handleSaved   = (item: any) => setItems(prev => prev.map(i => i.id === item.id ? item : i));
  const handleDeleted = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); setSelectedId(null); };
  const handleSelect  = (id: string) => { setSelectedId(id); setSidebarOpen(false); };

  const { Icon } = TAB_CONFIG[tab];

  const headerExtra = (
    <>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
        {(Object.keys(TAB_CONFIG) as TabKey[]).map(k => {
          const { Icon: TabIcon, label } = TAB_CONFIG[k];
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                tab === k
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-primary/30 hover:text-primary/60"
              }`}
            >
              <TabIcon size={11} /> {label}
            </button>
          );
        })}
      </div>
      {/* Nueva entrada */}
      <button
        onClick={() => setShowNueva(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
      >
        <Plus size={12} /> Nueva entrada
      </button>
    </>
  );

  const sidebarContent = (
    <div className="space-y-0.5">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-primary/30">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-10 text-primary/25">
          <p className="text-xs font-black uppercase tracking-widest">Sin resultados</p>
        </div>
      ) : (
        filtrados.map(item => (
          <EntidadCard
            key={item.id}
            item={item}
            tab={tab}
            selected={selectedId === item.id}
            onClick={() => handleSelect(item.id)}
          />
        ))
      )}
    </div>
  );

  return (
    <>
      <EstudioLayout
        titulo={TAB_CONFIG[tab].label}
        icono={<Icon size={12} />}
        colapsadoLabel={TAB_CONFIG[tab].label}
        onRefetch={refetch}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        busquedaPlaceholder={`Buscar ${TAB_CONFIG[tab].label.toLowerCase()}…`}
        headerExtra={headerExtra}
        sidebarContent={sidebarContent}
        isOffline={isOffline}
        footerLeft={`${items.length} entradas`}
        footerRight={`${filtrados.length} mostradas`}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
        {selected ? (
          <>
            {tab === "personajes" && (
              <EditorPersonaje key={selected.id} item={selected as Personaje} onSaved={handleSaved} onDeleted={handleDeleted} />
            )}
            {tab === "criaturas" && (
              <EditorCriatura key={selected.id} item={selected as Criatura} onSaved={handleSaved} onDeleted={handleDeleted} />
            )}
            {tab === "items" && (
              <EditorItem key={selected.id} item={selected as Item} onSaved={handleSaved} onDeleted={handleDeleted} />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/20">
            <Icon size={52} strokeWidth={1} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Editor de {TAB_CONFIG[tab].label}</p>
            <p className="text-[10px] tracking-widest">Selecciona una entrada o crea una nueva</p>
          </div>
        )}
      </EstudioLayout>

      {showNueva && (
        <ModalNueva tab={tab} onCreated={handleCreated} onClose={() => setShowNueva(false)} />
      )}
    </>
  );
}