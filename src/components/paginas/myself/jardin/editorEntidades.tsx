"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Trash2, Save, Loader2,
  Users, Bug, Package, Map, MapPin, Check, RefreshCw,
  AlertCircle, CheckCircle2,
  BookOpen, Mic2, ChevronDown, Image as ImageIcon, X,
  UserCircle2, Maximize2,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { useConfirm } from "@/components/ui/ConfirmModal";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Personaje = {
  id: string;
  nombre: string;
  img_url?: string;
  img_cuerpo_url?: string;
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

type CapituloNarrado = {
  id: string;
  titulo_capitulo: string;
  orden: number;
  libro_id: string;
  libro_titulo?: string;
};

type TabKey = "personajes" | "criaturas" | "items" | "reinos";
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Config ───────────────────────────────────────────────────────────────────

const TAB_CONFIG: Record<TabKey, { emoji: string; label: string; tabla: string; Icon: React.ElementType }> = {
  personajes: { emoji: "🧑", label: "Personajes", tabla: "personajes", Icon: Users   },
  criaturas:  { emoji: "🐛", label: "Criaturas",  tabla: "criaturas",  Icon: Bug     },
  items:      { emoji: "📦", label: "Items",      tabla: "items",      Icon: Package },
  reinos:     { emoji: "🗺️", label: "Mapas",      tabla: "reinos",     Icon: Map     },
};

const INPUT_CLS = "w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useEntidades<T extends { id: string; nombre: string }>(tab: TabKey) {
  const [items,     setItems]     = useState<T[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (!navigator.onLine) { setIsOffline(true); setLoading(false); return; }
    setIsOffline(false);
    try {
      const { data, error } = await supabase
        .from(TAB_CONFIG[tab].tabla).select("*").order("nombre");
      if (error) throw error;
      setItems((data ?? []) as T[]);
    } catch { setIsOffline(true); }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
    const h = () => { setIsOffline(false); load(); };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [load]);

  return { items, setItems, loading, isOffline, refetch: load };
}

/** Carga los valores únicos no-nulos de una columna de texto para usarlos como sugerencias. */
function useUniqueValues(tabla: string, columna: string) {
  const [valores, setValores] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from(tabla).select(columna).not(columna, "is", null)
      .then(({ data }) => {
        if (!data) return;
        const unique = [
          ...new Set(data.map((r: any) => r[columna]).filter(Boolean).map((v: string) => v.trim()))
        ].sort() as string[];
        setValores(unique);
      });
  }, [tabla, columna]);

  return valores;
}

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
        setCaps((data ?? []).map((c: any) => ({
          id: c.id,
          titulo_capitulo: c.titulo_capitulo,
          orden: c.orden,
          libro_id: c.libro_id,
          libro_titulo: c.libros?.titulo ?? "",
        })));
        setLoading(false);
      });
  }, [personajeId]);

  return { caps, loading };
}

// ─── SaveIndicator ────────────────────────────────────────────────────────────

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

// ─── EntidadCard ──────────────────────────────────────────────────────────────

function EntidadCard({ item, tab, selected, onClick }: {
  item: any; tab: TabKey; selected: boolean; onClick: () => void;
}) {
  const img = tab === "personajes" ? item.img_url : item.imagen_url;
  const TabIcon = TAB_CONFIG[tab].Icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
        selected ? "bg-primary/15 border border-primary/30" : "hover:bg-primary/5 border border-transparent hover:border-primary/10"
      }`}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {img ? <img src={img} alt={item.nombre} className="w-full h-full object-cover" /> : <TabIcon size={16} className="text-primary/20" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate ${selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"}`}>
          {item.nombre}
        </p>
        {tab === "personajes" && (item.especie || item.reino) && (
          <p className="text-[10px] text-primary/35 truncate">{[item.especie, item.reino].filter(Boolean).join(" · ")}</p>
        )}
        {tab === "criaturas" && item.habitat && <p className="text-[10px] text-primary/35 truncate">{item.habitat}</p>}
        {tab === "items" && item.categoria && <p className="text-[10px] text-primary/35 truncate">{item.categoria}</p>}
      </div>
    </button>
  );
}

// ─── SelectorImagen (con SimpleImagePicker en modal) ─────────────────────────

function SelectorImagen({ label, value, onChange, aspect, placeholder }: {
  label: string; value: string; onChange: (url: string) => void;
  aspect: "square" | "portrait" | "landscape" | "video" | "full"; placeholder?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const aspectCls =
    aspect === "square"    ? "aspect-square" :
    aspect === "portrait"  ? "aspect-[3/4]"  :
    aspect === "landscape" ? "h-[100px]"     :
    aspect === "full"      ? "h-full"        :
    "aspect-video";

  return (
    <div className={`flex flex-col gap-1.5 ${aspect === "full" ? "h-full" : ""}`}>
      {label && <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 shrink-0">{label}</label>}

      <div
        onClick={() => setOpen(true)}
        className={`relative ${aspectCls} ${aspect === "full" ? "flex-1" : ""} rounded-none overflow-hidden border-0 bg-primary/4 cursor-pointer group`}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {/* Overlay hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              <ImageIcon size={18} className="text-white" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Cambiar</span>
            </div>
            {/* Quitar imagen */}
            <button
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={10} className="text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/20 hover:text-primary/40 transition-colors">
            {placeholder ?? <ImageIcon size={24} />}
            <span className="text-[9px] font-black uppercase tracking-widest">Elegir imagen</span>
          </div>
        )}
      </div>

      {/* Modal picker */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <ImageIcon size={11} /> {label}
              </h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onSelect={url => { onChange(url); setOpen(false); }}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SelectorTexto con lista de sugerencias de Supabase ──────────────────────

function SelectorTexto({ label, value, onChange, opciones, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  opciones: string[]; placeholder?: string;
}) {
  const [open,  setOpen]  = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onChange(input); // confirmar valor escrito libremente
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, input, onChange]);

  const filtradas = useMemo(
    () => opciones.filter(o => normalize(o).includes(normalize(input))),
    [opciones, input]
  );

  const select = (v: string) => { setInput(v); onChange(v); setOpen(false); };

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <div className="relative">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={INPUT_CLS + " pr-8"}
        />
        <button
          type="button" onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (filtradas.length > 0 || (input.trim() && !opciones.includes(input.trim()))) && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-primary/15 overflow-hidden shadow-xl max-h-52 overflow-y-auto"
            style={{ background: "var(--bg-main)" }}
          >
            {/* Opciones existentes */}
            {filtradas.map(op => (
              <button
                key={op} type="button" onClick={() => select(op)}
                className="w-full text-left px-3 py-2.5 text-xs font-medium hover:bg-primary/8 transition-colors flex items-center justify-between"
                style={{ color: value === op ? "var(--primary)" : "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
              >
                <span>{op}</span>
                {value === op && <CheckCircle2 size={11} className="text-primary shrink-0" />}
              </button>
            ))}
            {/* "Usar valor nuevo" si no existe */}
            {input.trim() && !opciones.includes(input.trim()) && filtradas.length === 0 && (
              <button
                type="button" onClick={() => select(input.trim())}
                className="w-full text-left px-3 py-2.5 text-xs font-medium hover:bg-primary/8 transition-colors flex items-center gap-2 text-primary/50"
              >
                <Plus size={11} /> Usar "{input.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campo, CampoArea ─────────────────────────────────────────────────────────

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

// ─── BloqueCapsNarrados ───────────────────────────────────────────────────────

function BloqueCapsNarrados({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosNarrados(personajeId);

  return (
    <div className="rounded-2xl border border-primary/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/8"
        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
        <Mic2 size={13} className="text-primary/50" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">Capítulos narrados</span>
        {!loading && caps.length > 0 && (
          <span className="ml-auto text-[9px] font-black text-primary/30 bg-primary/8 px-2 py-0.5 rounded-full">{caps.length}</span>
        )}
      </div>
      <div className="divide-y divide-primary/5">
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
        ) : caps.length === 0 ? (
          <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest px-4 py-5 text-center italic">Sin capítulos narrados aún</p>
        ) : caps.map(cap => (
          <div key={cap.id} className="flex items-center gap-3 px-4 py-3 hover:bg-primary/3 transition-colors">
            <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
              {cap.orden}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-primary truncate uppercase italic">{cap.titulo_capitulo}</p>
              {cap.libro_titulo && (
                <p className="text-[9px] text-primary/35 truncate flex items-center gap-1">
                  <BookOpen size={8} /> {cap.libro_titulo}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Barra de acciones sticky ─────────────────────────────────────────────────

function BarraAcciones({ status, onSave, onDelete }: {
  status: SaveStatus; onSave: () => void; onDelete: () => void;
}) {
  return (
    <div
      className="shrink-0 sticky bottom-0 z-10 px-5 py-3 flex items-center justify-between gap-3 border-t border-primary/8"
      style={{ background: "color-mix(in srgb, var(--bg-main) 95%, transparent)", backdropFilter: "blur(8px)" }}
    >
      <SaveIndicator status={status} />
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
          <Trash2 size={11} /> Eliminar
        </button>
        <button onClick={onSave}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
          <Save size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ─── EditorPersonaje ──────────────────────────────────────────────────────────

function EditorPersonaje({ item, onSaved, onDeleted }: {
  item: Personaje; onSaved: (p: Personaje) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Personaje>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const reinos   = useUniqueValues("personajes", "reino");
  const especies = useUniqueValues("personajes", "especie");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre:         form.nombre,
        img_url:        form.img_url        || null,
        img_cuerpo_url: form.img_cuerpo_url || null,
        sobre:          form.sobre,
        reino:          form.reino,
        especie:        form.especie,
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
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* ── Columna izquierda: cara + campos + caps ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

        {/* Cara cuadrada pequeña */}
        <div className="shrink-0 p-5 pb-3" style={{ width: 140 }}>
          <SelectorImagen
            label="Cara"
            value={form.img_url ?? ""}
            onChange={url => setForm(f => ({ ...f, img_url: url }))}
            aspect="square"
            placeholder={<UserCircle2 size={22} className="opacity-25" />}
          />
        </div>

        {/* Campos */}
        <div className="p-5 pt-2 space-y-5">
          {/* 3 columnas en desktop: nombre / especie / reino */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre del personaje" />
            <SelectorTexto
              label="Especie / Raza"
              value={form.especie ?? ""}
              onChange={v => setForm(f => ({ ...f, especie: v }))}
              opciones={especies}
              placeholder="Humano, elfo, demonio…"
            />
            <SelectorTexto
              label="Reino / Facción"
              value={form.reino ?? ""}
              onChange={v => setForm(f => ({ ...f, reino: v }))}
              opciones={reinos}
              placeholder="Reino, grupo, nación…"
            />
          </div>

          <CampoArea label="Sobre el personaje" value={form.sobre ?? ""} onChange={field("sobre")} rows={6} placeholder="Biografía, personalidad, historia…" />

          <div className="h-px bg-primary/8" />
          <BloqueCapsNarrados personajeId={form.id} />
        </div>

        <BarraAcciones status={status} onSave={save} onDelete={del} />
      </div>

      {/* ── Columna derecha: imagen de cuerpo full-height ── */}
      <div className="w-44 shrink-0 border-l border-primary/10 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0">
          <SelectorImagen
            label=""
            value={form.img_cuerpo_url ?? ""}
            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
            aspect="full"
            placeholder={<Maximize2 size={20} className="opacity-20" />}
          />
        </div>
        <div className="shrink-0 px-2 py-1.5 border-t border-primary/8">
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 block text-center">Cuerpo</span>
        </div>
      </div>
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────

function EditorCriatura({ item, onSaved, onDeleted }: {
  item: Criatura; onSaved: (c: Criatura) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const habitats = useUniqueValues("criaturas", "habitat");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Criatura) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criaturas").update({
        nombre: form.nombre, imagen_url: form.imagen_url || null,
        descripcion: form.descripcion, habitat: form.habitat,
        pensamiento: form.pensamiento, alma: form.alma,
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

  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesDeEspecie(form.nombre);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Imagen principal — compacta */}
        <div className="shrink-0 p-5 pb-3">
          <SelectorImagen
            label="Ilustración"
            value={form.imagen_url ?? ""}
            onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
            aspect="landscape"
            placeholder={<Bug size={20} className="opacity-20" />}
          />
        </div>

        <div className="p-5 pt-2 space-y-5">
          {/* 2 columnas: nombre + hábitat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre de la criatura" />
            <SelectorTexto
              label="Hábitat"
              value={form.habitat ?? ""}
              onChange={v => setForm(f => ({ ...f, habitat: v }))}
              opciones={habitats}
              placeholder="Bosque, océano, volcán…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoArea label="Descripción"  value={form.descripcion  ?? ""} onChange={field("descripcion")}  rows={5} placeholder="Aspecto, comportamiento…" />
            <CampoArea label="Pensamiento"  value={form.pensamiento  ?? ""} onChange={field("pensamiento")}  rows={5} placeholder="¿Cómo piensa?" />
          </div>
          <CampoArea label="Alma" value={form.alma ?? ""} onChange={field("alma")} rows={3} placeholder="Naturaleza espiritual…" />
        </div>

        <BarraAcciones status={status} onSave={save} onDelete={del} />
      </div>

      {/* Panel de personajes de esta especie */}
      <PanelPersonajes
        personajes={personajes}
        loading={loadingPersonajes}
        setPersonajes={setPersonajes}
        titulo="De esta especie"
      />
    </div>
  );
}

// ─── EditorItem ───────────────────────────────────────────────────────────────

function EditorItem({ item, onSaved, onDeleted }: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Item>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const categorias = useUniqueValues("items", "categoria");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("items").update({
        nombre: form.nombre, imagen_url: form.imagen_url || null,
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

      <div className="shrink-0 p-5 pb-3">
        <SelectorImagen
          label="Imagen"
          value={form.imagen_url ?? ""}
          onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
          aspect="landscape"
          placeholder={<Package size={20} className="opacity-20" />}
        />
      </div>

      <div className="p-5 pt-2 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre del objeto" />
          <SelectorTexto
            label="Categoría"
            value={form.categoria ?? ""}
            onChange={v => setForm(f => ({ ...f, categoria: v }))}
            opciones={categorias}
            placeholder="Arma, reliquia, objeto…"
          />
        </div>
        <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} rows={6} placeholder="Qué es, qué hace, su historia…" />
      </div>

      <BarraAcciones status={status} onSave={save} onDelete={del} />
    </div>
  );
}

// ─── Hook detalles de reino ───────────────────────────────────────────────────

function useReinoDetalles(reinoId: string | null) {
  const [detalles, setDetalles] = useState<ReinoDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase.from("reino_detalles").select("*").eq("reino_id", id).order("nombre");
    setDetalles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (reinoId) load(reinoId);
    else setDetalles([]);
  }, [reinoId, load]);

  return { detalles, setDetalles, loading };
}

// ─── Hook personajes del reino ────────────────────────────────────────────────

function usePersonajesDelReino(reinoNombre: string | null | undefined) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reinoNombre) { setPersonajes([]); return; }
    setLoading(true);
    supabase
      .from("personajes")
      .select("id, nombre, img_url, img_cuerpo_url, especie, reino, sobre")
      .ilike("reino", `%${reinoNombre}%`)
      .order("nombre")
      .then(({ data }) => { setPersonajes(data || []); setLoading(false); });
  }, [reinoNombre]);

  return { personajes, setPersonajes, loading };
}

// ─── Hook personajes de una especie ──────────────────────────────────────────

function usePersonajesDeEspecie(especieNombre: string | null | undefined) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!especieNombre?.trim()) { setPersonajes([]); return; }
    setLoading(true);
    supabase
      .from("personajes")
      .select("id, nombre, img_url, img_cuerpo_url, especie, reino, sobre")
      .ilike("especie", `%${especieNombre}%`)
      .order("nombre")
      .then(({ data }) => { setPersonajes(data || []); setLoading(false); });
  }, [especieNombre]);

  return { personajes, setPersonajes, loading };
}

// ─── Mini editor de personaje (para overlay del panel) ───────────────────────

function MiniEditorPersonaje({ personaje, onSaved, onClose }: {
  personaje: Personaje; onSaved: (p: Personaje) => void; onClose: () => void;
}) {
  const [form,   setForm]   = useState<Personaje>(personaje);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const reinos   = useUniqueValues("personajes", "reino");
  const especies = useUniqueValues("personajes", "especie");

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre: form.nombre, img_url: form.img_url || null,
        img_cuerpo_url: form.img_cuerpo_url || null,
        sobre: form.sobre, reino: form.reino, especie: form.especie,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => { setStatus("idle"); }, 2000);
    } catch { setStatus("error"); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-primary/10"
        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center shrink-0">
            {form.img_url
              ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
              : <UserCircle2 size={13} className="text-primary/25" />}
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary truncate">{form.nombre}</span>
        </div>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex min-h-0">
          {/* Imagen de cara */}
          <div className="shrink-0 p-4 pb-2" style={{ width: 120 }}>
            <SelectorImagen label="Cara" value={form.img_url ?? ""} onChange={url => setForm(f => ({ ...f, img_url: url }))}
              aspect="square" placeholder={<UserCircle2 size={20} className="opacity-25" />} />
          </div>
          {/* Imagen de cuerpo */}
          <div className="shrink-0 border-l border-primary/8 flex flex-col" style={{ width: 80 }}>
            <div className="flex-1 min-h-0">
              <SelectorImagen label="" value={form.img_cuerpo_url ?? ""} onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
                aspect="full" placeholder={<Maximize2 size={16} className="opacity-20" />} />
            </div>
            <div className="shrink-0 px-1 py-1 border-t border-primary/8 text-center">
              <span className="text-[7px] font-black uppercase tracking-widest text-primary/20">Cuerpo</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 3 columnas: nombre / especie / reino */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre" />
            <SelectorTexto label="Especie / Raza" value={form.especie ?? ""}
              onChange={v => setForm(f => ({ ...f, especie: v }))} opciones={especies} placeholder="Especie…" />
            <SelectorTexto label="Reino / Facción" value={form.reino ?? ""}
              onChange={v => setForm(f => ({ ...f, reino: v }))} opciones={reinos} placeholder="Reino…" />
          </div>
          <CampoArea label="Sobre el personaje" value={form.sobre ?? ""} onChange={field("sobre")} rows={5}
            placeholder="Biografía, personalidad, historia…" />
        </div>
      </div>

      {/* Barra sticky */}
      <div className="shrink-0 sticky bottom-0 px-4 py-3 flex items-center justify-end gap-2 border-t border-primary/8"
        style={{ background: "color-mix(in srgb, var(--bg-main) 95%, transparent)", backdropFilter: "blur(8px)" }}>
        <SaveIndicator status={status} />
        <button onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
          <Save size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Panel personajes compartido (reino y especie) ────────────────────────────

function PanelPersonajes({ personajes, loading, setPersonajes, titulo = "Personajes" }: {
  personajes: Personaje[];
  loading: boolean;
  setPersonajes: React.Dispatch<React.SetStateAction<Personaje[]>>;
  titulo?: string;
}) {
  const [editando, setEditando] = useState<Personaje | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const handleSaved = (updated: Personaje) => {
    setPersonajes(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditando(updated);
  };

  // En móvil: botón flotante que abre overlay fullscreen
  // En desktop: panel lateral fijo
  return (
    <>
      {/* ── Botón móvil ── */}
      <button
        onClick={() => setPanelAbierto(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-xl border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10"
        style={{ background: "color-mix(in srgb, var(--white-custom) 95%, transparent)", backdropFilter: "blur(10px)" }}
      >
        <Users size={13} />
        {titulo}
        {!loading && personajes.length > 0 && (
          <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded-full text-[9px]">{personajes.length}</span>
        )}
      </button>

      {/* ── Overlay móvil ── */}
      {panelAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: "var(--bg-main)" }}>
          {/* Si hay personaje seleccionado para editar */}
          {editando ? (
            <MiniEditorPersonaje
              personaje={editando}
              onSaved={handleSaved}
              onClose={() => setEditando(null)}
            />
          ) : (
            <>
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-primary/10"
                style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-primary/50" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{titulo}</span>
                  {!loading && personajes.length > 0 && (
                    <span className="text-[9px] font-black text-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full">{personajes.length}</span>
                  )}
                </div>
                <button onClick={() => setPanelAbierto(false)} className="text-primary/30 hover:text-primary transition-colors p-1">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-primary/20" /></div>
                ) : personajes.length === 0 ? (
                  <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-12 italic">Sin personajes</p>
                ) : personajes.map(p => (
                  <button key={p.id} onClick={() => setEditando(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/8 border border-transparent hover:border-primary/10 transition-all">
                    <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                      {p.img_url ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" /> : <UserCircle2 size={16} className="text-primary/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary/80 truncate">{p.nombre}</p>
                      <p className="text-[10px] text-primary/35 truncate">{[p.especie, p.reino].filter(Boolean).join(" · ")}</p>
                    </div>
                    <ChevronDown size={13} className="-rotate-90 text-primary/25" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Panel desktop lateral ── */}
      <div className="hidden md:flex w-52 shrink-0 border-l border-primary/10 flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 px-3 py-2.5 border-b border-primary/8 flex items-center gap-2"
          style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
          <Users size={11} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{titulo}</span>
          {!loading && personajes.length > 0 && (
            <span className="ml-auto text-[9px] font-black text-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full">{personajes.length}</span>
          )}
        </div>

        {/* Lista o editor */}
        {editando ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <MiniEditorPersonaje personaje={editando} onSaved={handleSaved} onClose={() => setEditando(null)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
            ) : personajes.length === 0 ? (
              <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-8 italic">Sin personajes</p>
            ) : personajes.map(p => (
              <button key={p.id} onClick={() => setEditando(p)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-primary/8 border border-transparent hover:border-primary/10 transition-colors text-left">
                <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {p.img_url ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" /> : <UserCircle2 size={13} className="text-primary/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-primary/80 truncate">{p.nombre}</p>
                  {p.especie && <p className="text-[9px] text-primary/35 truncate">{p.especie}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── PanelPersonajesReino (wrapper para EditorReino) ─────────────────────────

function PanelPersonajesReino({ reinoNombre }: { reinoNombre: string }) {
  const { personajes, setPersonajes, loading } = usePersonajesDelReino(reinoNombre);
  return <PanelPersonajes personajes={personajes} loading={loading} setPersonajes={setPersonajes} titulo="Personajes" />;
}
// ─── MapaPuntosReino — mapa interactivo de puntos de un reino ─────────────────

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
            <div
              key={d.id}
              className="absolute z-10 flex flex-col items-center"
              style={{ top: `${y}%`, left: `${x}%`, transform: "translate(-50%, -100%)" }}
            >
              {/* Nombre debajo del pin */}
              <div
                className={`mb-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-md transition-all ${
                  isSelected
                    ? "bg-primary text-btn-text scale-110"
                    : "bg-bg-main/90 text-primary border border-primary/20"
                }`}
              >
                {d.nombre}
              </div>
              <button
                onClick={e => handleMarkerClick(e, d.id)}
                className={`w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${
                  isSelected ? "bg-yellow-400 scale-125 ring-2 ring-yellow-400/50" : "bg-primary hover:scale-110"
                }`}
              />
              {/* línea vertical */}
              <div className={`w-px h-2 ${isSelected ? "bg-yellow-400" : "bg-primary/50"}`} />
            </div>
          );
        })}

        {selectedId && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        )}
      </div>
      {selectedId && (
        <button
          onClick={() => setSelectedId(null)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary/50 hover:text-primary transition-all"
        >
          <X size={9} /> Cancelar selección
        </button>
      )}
    </div>
  );
}

// ─── DetalleEditor ────────────────────────────────────────────────────────────

function DetalleEditor({ detalle, onSaved, onDeleted }: {
  detalle: ReinoDetalle; onSaved: (d: ReinoDetalle) => void; onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState(detalle);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  // Sync coords when parent updates them (from map interaction)
  useEffect(() => {
    setForm(f => ({ ...f, coord_x: detalle.coord_x, coord_y: detalle.coord_y }));
  }, [detalle.coord_x, detalle.coord_y]);

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
    <div className="border border-primary/10 rounded-xl bg-bg-main/50 hover:border-primary/20 transition-all overflow-hidden">
      <ConfirmModal />
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin size={12} className="text-primary/40 shrink-0" />
          <span className="text-[11px] font-black uppercase text-primary tracking-widest truncate">{form.nombre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-bold text-primary/30 bg-primary/5 px-1.5 py-0.5 rounded-lg border border-primary/10">
            {(form.coord_x ?? 0).toFixed(1)},{(form.coord_y ?? 0).toFixed(1)}
          </span>
          <ChevronDown size={13} className={`text-primary/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      {expanded && (
        <div className="p-3 pt-0 border-t border-primary/5 space-y-3 bg-primary/3">
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Nombre del punto</label>
            <input
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className={INPUT_CLS + " mt-1"}
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Descripción del lugar</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full bg-input-bg text-input-text border border-primary/10 rounded-xl px-4 py-3 text-sm min-h-[180px] resize-y mt-1"
              placeholder="Escribe el lore aquí..."
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleDelete} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 size={10} /> Eliminar
            </button>
            <div className="flex items-center gap-2">
              <SaveIndicator status={status} />
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
                <Check size={10} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── EditorReino ──────────────────────────────────────────────────────────────

function EditorReino({ item, onSaved, onDeleted }: {
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
        nombre: form.nombre, descripcion: form.descripcion,
        mapa_url: form.mapa_url, coord_x: form.coord_x, coord_y: form.coord_y,
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
    if (!error && data) {
      setDetalles(prev => [...prev, data]);
      setAddingPoint(false);
      setNewPointName("");
    }
  };

  // Guardar coords de todos los puntos movidos en el mapa
  const handleDetallesMapChange = async (updated: ReinoDetalle[]) => {
    setDetalles(updated);
    // Persistir todos en paralelo
    await Promise.all(
      updated.map(d =>
        supabase.from("reino_detalles").update({ coord_x: d.coord_x, coord_y: d.coord_y }).eq("id", d.id)
      )
    );
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

        {/* Selector imagen del mapa */}
        <div className="shrink-0 p-5 pb-3">
          <SelectorImagen
            label="Imagen del mapa del reino"
            value={form.mapa_url ?? ""}
            onChange={url => setForm(f => ({ ...f, mapa_url: url }))}
            aspect="video"
            placeholder={<Map size={24} className="opacity-20" />}
          />
        </div>

        <div className="p-5 pt-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nombre" value={form.nombre ?? ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del reino" />
            <div /> {/* espacio reservado para futuros campos */}
          </div>
          <CampoArea label="Descripción / Lore" value={form.descripcion ?? ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={5} placeholder="Historia y detalles del reino…" />

          <div className="h-px bg-primary/8" />

          {/* Mapa del reino con todos los puntos */}
          <MapaPuntosReino
            mapaUrl={form.mapa_url ?? ""}
            detalles={detalles}
            onDetallesChange={handleDetallesMapChange}
          />

          {/* Lista de puntos para editar nombre/descripción */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/50 flex items-center gap-2">
              <MapPin size={12} /> Puntos de Interés
              <span className="text-[9px] text-primary/30 bg-primary/8 px-2 py-0.5 rounded-full ml-1">{detalles.length}</span>
            </h3>

            <div className="space-y-2">
              {detalles.map(det => (
                <DetalleEditor
                  key={det.id}
                  detalle={det}
                  onSaved={updated => setDetalles(prev => prev.map(d => d.id === updated.id ? updated : d))}
                  onDeleted={id => setDetalles(prev => prev.filter(d => d.id !== id))}
                />
              ))}
            </div>

            {detalles.length === 0 && !addingPoint && (
              <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-5 border border-dashed border-primary/15 rounded-xl italic">
                Sin puntos registrados
              </p>
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
                <button onClick={handleAddPoint} disabled={!newPointName.trim()} className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40">
                  <Check size={13} />
                </button>
                <button onClick={() => setAddingPoint(false)} className="px-2.5 py-2 rounded-lg text-primary/40 hover:text-primary transition-all">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingPoint(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
              >
                <Plus size={11} /> Añadir Punto de Interés
              </button>
            )}
          </div>
        </div>

        <BarraAcciones status={status} onSave={save} onDelete={del} />
      </div>

      {/* Panel de personajes del reino */}
      <PanelPersonajesReino reinoNombre={form.nombre} />
    </div>
  );
}

// ─── Modal nueva entidad ──────────────────────────────────────────────────────

function ModalNueva({ tab, onCreated, onClose }: {
  tab: TabKey; onCreated: (item: any) => void; onClose: () => void;
}) {
  const [nombre,  setNombre]  = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TAB_CONFIG[tab].tabla).insert([{ nombre: nombre.trim() }]).select().single();
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
          autoFocus value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && create()}
          placeholder="Nombre…"
          className="w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/40 transition-colors"
        />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/10 text-primary/30 hover:text-primary hover:border-primary/20 transition-all">
            Cancelar
          </button>
          <button onClick={create} disabled={loading || !nombre.trim()}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
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
            <button key={k} onClick={() => setTab(k)}
              title={label}
              className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                tab === k ? "bg-primary/15 text-primary border border-primary/20" : "text-primary/25 hover:text-primary/60"
              }`}
            >
              <TabIcon size={13} />
            </button>
          );
        })}
      </div>
      <button onClick={() => setShowNueva(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
        <Plus size={12} /> Nueva entrada
      </button>
    </>
  );

  const sidebarContent = (
    <div className="space-y-0.5">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-primary/30"><Loader2 className="animate-spin" size={24} /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-10 text-primary/25"><p className="text-xs font-black uppercase tracking-widest">Sin resultados</p></div>
      ) : filtrados.map(item => (
        <EntidadCard key={item.id} item={item} tab={tab} selected={selectedId === item.id} onClick={() => handleSelect(item.id)} />
      ))}
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
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {selected ? (
            <>
              {tab === "personajes" && <EditorPersonaje key={selected.id} item={selected as Personaje} onSaved={handleSaved} onDeleted={handleDeleted} />}
              {tab === "criaturas"  && <EditorCriatura  key={selected.id} item={selected as Criatura}  onSaved={handleSaved} onDeleted={handleDeleted} />}
              {tab === "items"      && <EditorItem       key={selected.id} item={selected as Item}      onSaved={handleSaved} onDeleted={handleDeleted} />}
              {tab === "reinos"     && <EditorReino      key={selected.id} item={selected as Reino}     onSaved={handleSaved} onDeleted={handleDeleted} />}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/20">
              <Icon size={52} strokeWidth={1} />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Editor de {TAB_CONFIG[tab].label}</p>
              <p className="text-[10px] tracking-widest">Selecciona una entrada o crea una nueva</p>
            </div>
          )}
        </div>
      </EstudioLayout>

      {showNueva && <ModalNueva tab={tab} onCreated={handleCreated} onClose={() => setShowNueva(false)} />}
    </>
  );
}