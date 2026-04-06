"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Trash2, Save, Loader2,
  Users, Bug, Package,
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
  img_url?: string;            // cara (cuadrada)
  img_cuerpo_url?: string;     // cuerpo completo (portrait) — NUEVO
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

// ─── Config ───────────────────────────────────────────────────────────────────

const TAB_CONFIG: Record<TabKey, { label: string; tabla: string; Icon: React.ElementType }> = {
  personajes: { label: "Personajes", tabla: "personajes", Icon: Users   },
  criaturas:  { label: "Criaturas",  tabla: "criaturas",  Icon: Bug     },
  items:      { label: "Items",      tabla: "items",      Icon: Package },
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
  aspect: "square" | "portrait"; placeholder?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>

      <div
        onClick={() => setOpen(true)}
        className={`relative ${aspect === "square" ? "aspect-square" : "aspect-[3/4]"} rounded-xl overflow-hidden border border-primary/15 bg-primary/4 cursor-pointer group`}
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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ConfirmModal />

      {/* ── Hero: cara (cuadrada) + cuerpo (portrait) ── */}
      <div className="shrink-0 flex gap-3 p-5 pb-3">
        {/* Cara — cuadrada, fija 144px */}
        <div style={{ width: 144, flexShrink: 0 }}>
          <SelectorImagen
            label="Cara"
            value={form.img_url ?? ""}
            onChange={url => setForm(f => ({ ...f, img_url: url }))}
            aspect="square"
            placeholder={<UserCircle2 size={28} className="opacity-25" />}
          />
        </div>
        {/* Cuerpo completo — portrait, ocupa el resto */}
        <div className="flex-1 min-w-0">
          <SelectorImagen
            label="Cuerpo completo"
            value={form.img_cuerpo_url ?? ""}
            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
            aspect="portrait"
            placeholder={<Maximize2 size={24} className="opacity-25" />}
          />
        </div>
      </div>

      {/* ── Campos ── */}
      <div className="p-5 pt-2 space-y-5">
        <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre del personaje" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ConfirmModal />

      {/* Imagen principal — portrait */}
      <div className="shrink-0 p-5 pb-3">
        <SelectorImagen
          label="Ilustración"
          value={form.imagen_url ?? ""}
          onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
          aspect="portrait"
          placeholder={<Bug size={28} className="opacity-20" />}
        />
      </div>

      <div className="p-5 pt-2 space-y-5">
        <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre de la criatura" />
        <SelectorTexto
          label="Hábitat"
          value={form.habitat ?? ""}
          onChange={v => setForm(f => ({ ...f, habitat: v }))}
          opciones={habitats}
          placeholder="Bosque, océano, volcán…"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoArea label="Descripción"  value={form.descripcion  ?? ""} onChange={field("descripcion")}  rows={5} placeholder="Aspecto, comportamiento…" />
          <CampoArea label="Pensamiento"  value={form.pensamiento  ?? ""} onChange={field("pensamiento")}  rows={5} placeholder="¿Cómo piensa?" />
        </div>
        <CampoArea label="Alma" value={form.alma ?? ""} onChange={field("alma")} rows={3} placeholder="Naturaleza espiritual…" />
      </div>

      <BarraAcciones status={status} onSave={save} onDelete={del} />
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
          aspect="square"
          placeholder={<Package size={28} className="opacity-20" />}
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
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                tab === k ? "bg-primary/15 text-primary border border-primary/20" : "text-primary/30 hover:text-primary/60"
              }`}
            >
              <TabIcon size={11} /> {label}
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
        {selected ? (
          <>
            {tab === "personajes" && <EditorPersonaje key={selected.id} item={selected as Personaje} onSaved={handleSaved} onDeleted={handleDeleted} />}
            {tab === "criaturas"  && <EditorCriatura  key={selected.id} item={selected as Criatura}  onSaved={handleSaved} onDeleted={handleDeleted} />}
            {tab === "items"      && <EditorItem       key={selected.id} item={selected as Item}      onSaved={handleSaved} onDeleted={handleDeleted} />}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/20">
            <Icon size={52} strokeWidth={1} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Editor de {TAB_CONFIG[tab].label}</p>
            <p className="text-[10px] tracking-widest">Selecciona una entrada o crea una nueva</p>
          </div>
        )}
      </EstudioLayout>

      {showNueva && <ModalNueva tab={tab} onCreated={handleCreated} onClose={() => setShowNueva(false)} />}
    </>
  );
}