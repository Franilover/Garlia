"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, X, Plus, Trash2, Save, Loader2,
  RefreshCw, WifiOff, Users, Bug, Package,
  AlertCircle, CheckCircle2, BookOpen, Mic2, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { useConfirm } from "@/components/ui/ConfirmModal";

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

type CapituloNarrado = {
  id: string;
  titulo_capitulo: string;
  orden: number;
  libro_id: string;
  libro_titulo?: string;
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

const INPUT_CLS = "w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors";

// ─── Hook: carga entidades ────────────────────────────────────────────────────

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

// ─── Hook: capítulos narrados por un personaje ────────────────────────────────

function useCapitulosNarrados(personajeId: string | null) {
  const [caps,    setCaps]    = useState<CapituloNarrado[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personajeId) { setCaps([]); return; }
    setLoading(true);
    supabase
      .from("capitulos")
      .select("id, titulo_capitulo, orden, libro_id, libros(titulo)")
      .eq("narrador_id", personajeId)
      .order("orden")
      .then(({ data }) => {
        setCaps(
          (data ?? []).map((c: any) => ({
            id: c.id,
            titulo_capitulo: c.titulo_capitulo,
            orden: c.orden,
            libro_id: c.libro_id,
            libro_titulo: c.libros?.titulo ?? "",
          }))
        );
        setLoading(false);
      });
  }, [personajeId]);

  return { caps, loading };
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

// ─── EntidadCard (sidebar) ────────────────────────────────────────────────────

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

// ─── Componentes de campo ─────────────────────────────────────────────────────

function Campo({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <input value={value} onChange={onChange} placeholder={placeholder} className={INPUT_CLS} />
    </div>
  );
}

function CampoArea({ label, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} className={`${INPUT_CLS} resize-none`} />
    </div>
  );
}

// ─── ImagenHero (imagen grande + nombre encima) ───────────────────────────────

function ImagenHero({
  src, nombre, icon, status, onDelete, onSave,
}: {
  src?: string; nombre: string; icon: React.ReactNode;
  status: SaveStatus; onDelete: () => void; onSave: () => void;
}) {
  return (
    <div className="relative shrink-0" style={{ height: "clamp(220px, 35vh, 320px)" }}>
      {/* Imagen de fondo */}
      <div className="absolute inset-0 bg-primary/5 overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-10">
            {icon}
          </div>
        )}
      </div>

      {/* Degradado inferior usando variable CSS — no rompe en dark */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, color-mix(in srgb, var(--bg-main) 92%, transparent) 0%, color-mix(in srgb, var(--bg-main) 40%, transparent) 50%, transparent 100%)",
        }}
      />

      {/* Contenido encima del gradiente */}
      <div className="absolute inset-x-0 bottom-0 px-6 pb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-primary leading-tight truncate">
            {nombre || "Sin nombre"}
          </h2>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <SaveIndicator status={status} />
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary/90 text-btn-text hover:bg-primary transition-all shadow-lg"
          >
            <Save size={11} /> Guardar
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-xl text-[9px] font-black border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/8 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bloque: Capítulos narrados ───────────────────────────────────────────────

function BloqueCapsNarrados({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosNarrados(personajeId);

  return (
    <div className="rounded-2xl border border-primary/10 overflow-hidden">
      {/* Header del bloque */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/8"
        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
        <Mic2 size={13} className="text-primary/50" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">
          Capítulos narrados
        </span>
        {!loading && caps.length > 0 && (
          <span className="ml-auto text-[9px] font-black text-primary/30 bg-primary/8 px-2 py-0.5 rounded-full">
            {caps.length}
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="divide-y divide-primary/5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-primary/20" />
          </div>
        ) : caps.length === 0 ? (
          <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest px-4 py-5 text-center italic">
            Sin capítulos narrados aún
          </p>
        ) : (
          caps.map(cap => (
            <div
              key={cap.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-primary/3 transition-colors"
            >
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black"
                style={{
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: "var(--accent)",
                }}
              >
                {cap.orden}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary truncate uppercase italic">
                  {cap.titulo_capitulo}
                </p>
                {cap.libro_titulo && (
                  <p className="text-[9px] text-primary/35 truncate flex items-center gap-1">
                    <BookOpen size={8} />
                    {cap.libro_titulo}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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
  const { confirm, ConfirmModal } = useConfirm();

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
    const ok = await confirm({ message: `¿Eliminar a "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("personajes").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ConfirmModal />

      {/* Hero con imagen grande */}
      <ImagenHero
        src={form.img_url}
        nombre={form.nombre}
        icon={<Users size={80} />}
        status={status}
        onSave={save}
        onDelete={del}
      />

      {/* Cuerpo en dos columnas */}
      <div className="p-6 space-y-6">

        {/* Fila 1: nombre + especie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre del personaje" />
          <Campo label="Especie" value={form.especie ?? ""} onChange={field("especie")} placeholder="Humano, elfo, demonio…" />
        </div>

        {/* Fila 2: reino + URL imagen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Reino" value={form.reino ?? ""} onChange={field("reino")} placeholder="Reino o facción" />
          <Campo label="URL de imagen" value={form.img_url ?? ""} onChange={field("img_url")} placeholder="https://…" />
        </div>

        {/* Descripción completa */}
        <CampoArea label="Sobre el personaje" value={form.sobre ?? ""} onChange={field("sobre")} rows={5} placeholder="Biografía, personalidad, historia…" />

        {/* Separador */}
        <div className="h-px bg-primary/8" />

        {/* Capítulos narrados por este personaje */}
        <BloqueCapsNarrados personajeId={form.id} />
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
  const { confirm, ConfirmModal } = useConfirm();

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
    const ok = await confirm({ message: `¿Eliminar a "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("criaturas").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ConfirmModal />

      <ImagenHero
        src={form.imagen_url}
        nombre={form.nombre}
        icon={<Bug size={80} />}
        status={status}
        onSave={save}
        onDelete={del}
      />

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nombre"     value={form.nombre      ?? ""} onChange={field("nombre")}      placeholder="Nombre de la criatura" />
          <Campo label="Hábitat"    value={form.habitat     ?? ""} onChange={field("habitat")}     placeholder="Bosque, océano, volcán…" />
        </div>
        <Campo label="URL de imagen" value={form.imagen_url ?? ""} onChange={field("imagen_url")} placeholder="https://…" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} rows={4} placeholder="Aspecto, comportamiento…" />
          <CampoArea label="Pensamiento" value={form.pensamiento ?? ""} onChange={field("pensamiento")} rows={4} placeholder="¿Cómo piensa?" />
        </div>
        <CampoArea label="Alma" value={form.alma ?? ""} onChange={field("alma")} rows={3} placeholder="Naturaleza espiritual…" />
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
  const { confirm, ConfirmModal } = useConfirm();

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
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("items").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ConfirmModal />

      <ImagenHero
        src={form.imagen_url}
        nombre={form.nombre}
        icon={<Package size={80} />}
        status={status}
        onSave={save}
        onDelete={del}
      />

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nombre"    value={form.nombre    ?? ""} onChange={field("nombre")}    placeholder="Nombre del objeto" />
          <Campo label="Categoría" value={form.categoria ?? ""} onChange={field("categoria")} placeholder="Arma, reliquia, objeto…" />
        </div>
        <Campo label="URL de imagen" value={form.imagen_url ?? ""} onChange={field("imagen_url")} placeholder="https://…" />
        <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} rows={5} placeholder="Qué es, qué hace, historia…" />
      </div>
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