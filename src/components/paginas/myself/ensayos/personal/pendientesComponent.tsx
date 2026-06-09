"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plus, Check, X, Music, BookOpen, Youtube, Headphones,
  Film, Gamepad2, Tv, Rss, ExternalLink, Loader2, ChevronDown, Pencil as PencilIcon,
  type LucideIcon,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Categoria {
  id: string;
  nombre: string;
  icon: string;
  color: number;
  orden: number;
}

interface Item {
  id: string;
  categoria_id: string;
  titulo: string;
  url?: string;
  nota?: string;
  hecho: boolean;
  orden: number;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CAT_ICONS: { name: string; component: LucideIcon; label: string }[] = [
  { name: "Music",      component: Music,      label: "Música"    },
  { name: "BookOpen",   component: BookOpen,   label: "Lectura"   },
  { name: "Youtube",    component: Youtube,    label: "YouTube"   },
  { name: "Headphones", component: Headphones, label: "Podcasts"  },
  { name: "Film",       component: Film,       label: "Películas" },
  { name: "Gamepad2",   component: Gamepad2,   label: "Juegos"    },
  { name: "Tv",         component: Tv,         label: "Series"    },
  { name: "Rss",        component: Rss,        label: "Artículos" },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CAT_ICONS.map(({ name, component }) => [name, component])
);

function CatIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Music;
  return <Icon size={size} />;
}

// ─── Queries Supabase ─────────────────────────────────────────────────────────

async function getSupabase() {
  const { supabase } = await import("@/lib/api/client/supabase");
  return supabase;
}

const categoriasQueries = {
  async getAll(): Promise<Categoria[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("pendientes_categorias").select("*").order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async add(cat: Omit<Categoria, "id">): Promise<Categoria> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("pendientes_categorias").insert({ ...cat, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, datos: Partial<Omit<Categoria, "id">>): Promise<Categoria> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("pendientes_categorias").update(datos).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("pendientes_categorias").delete().eq("id", id);
    if (error) throw error;
  },
};

const itemsQueries = {
  async getAll(): Promise<Item[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("pendientes_items").select("*").order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async add(item: Omit<Item, "id" | "created_at">): Promise<Item> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("pendientes_items").insert({ ...item, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },
  async toggleHecho(id: string, hecho: boolean): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("pendientes_items").update({ hecho }).eq("id", id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("pendientes_items").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Helpers de URL ───────────────────────────────────────────────────────────

function detectUrlType(url: string): "youtube" | "ytmusic" | "link" | null {
  if (!url) return null;
  if (url.includes("music.youtube.com")) return "ytmusic";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return "link";
}

function cleanUrl(url: string): string {
  if (!url.startsWith("http")) return `https://${url}`;
  return url;
}

function isYoutubeUrl(url: string): boolean {
  return url.includes("youtube.com/") || url.includes("youtu.be/") || url.includes("music.youtube.com/");
}

async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title ?? null;
  } catch {
    return null;
  }
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/15 focus:bg-white-custom rounded-[var(--radius-btn)] py-2 px-3 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all";

// ─── Selector de icono compartido ─────────────────────────────────────────────

const IconSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1">
    {CAT_ICONS.map(({ name, component: Icon, label }) => (
      <button
        key={name}
        type="button"
        title={label}
        onClick={() => onChange(name)}
        className={cn(
          "w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center transition-all border-[length:var(--border-width)]",
          value === name
            ? "bg-primary text-btn-text border-primary"
            : "bg-primary/5 text-primary/50 border-transparent hover:bg-primary/10 hover:text-primary/70"
        )}
      >
        <Icon size={14} />
      </button>
    ))}
  </div>
);

// ─── Formulario: nueva categoría ──────────────────────────────────────────────

interface FormNuevaCategoriaProps {
  onGuardar: (cat: Omit<Categoria, "id">) => Promise<void>;
  onCancelar: () => void;
  guardando: boolean;
  orden: number;
}

const FormNuevaCategoria = ({ onGuardar, onCancelar, guardando, orden }: FormNuevaCategoriaProps) => {
  const [nombre, setNombre] = useState("");
  const [icon, setIcon]     = useState("Music");

  const handleGuardar = () => {
    if (!nombre.trim()) return;
    onGuardar({ nombre: nombre.trim(), icon, color: 0, orden });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-4 shadow-lg shadow-primary/5 mb-3 space-y-3"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Nueva categoría</p>
      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nombre de la categoría..."
        className={inputCls}
        onKeyDown={e => e.key === "Enter" && handleGuardar()}
        autoFocus
      />
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">Icono</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleGuardar}
          disabled={!nombre.trim() || guardando}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text px-3 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {guardando ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          Guardar
        </button>
        <button
          onClick={onCancelar}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-primary/8 text-primary px-3 py-1.5 rounded-[var(--radius-btn)] hover:bg-primary/12 transition-all"
        >
          <X size={10} /> Cancelar
        </button>
      </div>
    </motion.div>
  );
};

// ─── Formulario: editar categoría ────────────────────────────────────────────

interface FormEditarCategoriaProps {
  cat: Categoria;
  onGuardar: (datos: Partial<Omit<Categoria, "id">>) => Promise<void>;
  onCancelar: () => void;
  guardando: boolean;
}

const FormEditarCategoria = ({ cat, onGuardar, onCancelar, guardando }: FormEditarCategoriaProps) => {
  const [nombre, setNombre] = useState(cat.nombre);
  const [icon, setIcon]     = useState(cat.icon);

  const handleGuardar = () => {
    if (!nombre.trim()) return;
    onGuardar({ nombre: nombre.trim(), icon });
  };

  return (
    <div className="px-3 pb-3 border-t border-primary/5 pt-3 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Editar categoría</p>
      <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre..." className={inputCls} onKeyDown={e => e.key === "Enter" && handleGuardar()} autoFocus />
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">Icono</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancelar} className="flex-1 py-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width)] border-primary/15 text-xs font-black text-primary/60 hover:bg-primary/4 transition-all">Cancelar</button>
        <button onClick={handleGuardar} disabled={!nombre.trim() || guardando} className="flex-1 py-1.5 rounded-[var(--radius-btn)] bg-primary text-btn-text text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
          {guardando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Guardar
        </button>
      </div>
    </div>
  );
};

// ─── Formulario: nuevo ítem ───────────────────────────────────────────────────

interface FormNuevoItemProps {
  categoriaId: string;
  orden: number;
  onGuardar: (item: Omit<Item, "id" | "created_at">) => Promise<void>;
  onCancelar: () => void;
}

const FormNuevoItem = ({ categoriaId, orden, onGuardar, onCancelar }: FormNuevoItemProps) => {
  const [titulo, setTitulo]           = useState("");
  const [url, setUrl]                 = useState("");
  const [guardando, setGuardando]     = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [dragOver, setDragOver]       = useState(false);

  const handleGuardar = async () => {
    if (!titulo.trim()) return;
    setGuardando(true);
    try {
      await onGuardar({ categoria_id: categoriaId, titulo: titulo.trim(), url: url.trim() || undefined, hecho: false, orden });
    } finally {
      setGuardando(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list") || "";
    const trimmed = dropped.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    if (isYoutubeUrl(trimmed)) {
      setFetchingTitle(true);
      const fetched = await fetchYoutubeTitle(trimmed);
      setFetchingTitle(false);
      if (fetched) setTitulo(fetched);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className={cn("pt-2 pb-1 space-y-1.5", dragOver && "ring-1 ring-primary/20 bg-primary/3 rounded-[var(--radius-btn)]")}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="relative">
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder={fetchingTitle ? "" : "Título..."}
            className={inputCls}
            onKeyDown={e => e.key === "Enter" && handleGuardar()}
            autoFocus
            disabled={fetchingTitle}
          />
          {fetchingTitle && (
            <div className="absolute inset-0 flex items-center gap-2 px-3 pointer-events-none">
              <Loader2 size={11} className="animate-spin text-primary/40" />
              <span className="text-xs font-bold text-primary/40">Obteniendo título…</span>
            </div>
          )}
        </div>
        <input
          value={url}
          onChange={async e => {
            const val = e.target.value;
            setUrl(val);
            if (isYoutubeUrl(val) && !titulo.trim()) {
              setFetchingTitle(true);
              const fetched = await fetchYoutubeTitle(val);
              setFetchingTitle(false);
              if (fetched) setTitulo(fetched);
            }
          }}
          placeholder="URL (opcional)..."
          className={inputCls}
        />
        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={handleGuardar}
            disabled={!titulo.trim() || guardando || fetchingTitle}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text px-2.5 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {guardando ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
            Añadir
          </button>
          <button
            onClick={onCancelar}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-primary/8 text-primary px-2.5 py-1.5 rounded-[var(--radius-btn)] hover:bg-primary/12 transition-all"
          >
            <X size={9} /> Cancelar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Card de ítem ─────────────────────────────────────────────────────────────

interface CardItemProps {
  item: Item;
  onToggle: (id: string, hecho: boolean) => void;
  onEliminar: (id: string) => void;
}

const CardItem = ({ item, onToggle, onEliminar }: CardItemProps) => {
  const urlType = detectUrlType(item.url ?? "");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 4, scale: 0.97 }}
      className={cn(
        "flex items-center gap-2 py-1 px-1.5 rounded group transition-all",
        item.hecho ? "opacity-35" : "hover:bg-primary/3"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.hecho)}
        className={cn(
          "w-3.5 h-3.5 rounded-[3px] border-[length:var(--border-width)] shrink-0 flex items-center justify-center transition-all",
          item.hecho ? "bg-primary/20 border-primary/20" : "bg-transparent border-primary/25 hover:border-primary/50"
        )}
      >
        {item.hecho && <Check size={8} className="text-primary/60" />}
      </button>

      {/* Título */}
      <span className={cn("flex-1 min-w-0 text-[12px] font-bold leading-none text-primary/80 truncate", item.hecho && "line-through")}>
        {item.titulo}
      </span>

      {/* Enlace + eliminar */}
      <div className="flex items-center gap-1 shrink-0">
        {item.url && (
          <a
            href={cleanUrl(item.url)}
            target="_blank"
            rel="noopener noreferrer"
            title={item.url}
            className="text-primary/30 hover:text-primary/60 transition-all"
            onClick={e => e.stopPropagation()}
          >
            {urlType === "youtube" && <Youtube size={11} />}
            {urlType === "ytmusic" && <Music size={11} />}
            {(urlType === "link" || !urlType) && <ExternalLink size={11} />}
          </a>
        )}
        <button
          onClick={() => onEliminar(item.id)}
          className="opacity-0 group-hover:opacity-100 text-primary/20 hover:text-primary/60 transition-all"
        >
          <X size={11} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Card de categoría ────────────────────────────────────────────────────────

interface CardCategoriaProps {
  cat: Categoria;
  items: Item[];
  onAddItem: (item: Omit<Item, "id" | "created_at">) => Promise<void>;
  onToggleItem: (id: string, hecho: boolean) => void;
  onEliminarItem: (id: string) => void;
  onEliminarCat: (id: string) => void;
  onEditarCat: (id: string, datos: Partial<Omit<Categoria, "id">>) => Promise<void>;
}

const CardCategoria = ({
  cat, items, onAddItem, onToggleItem, onEliminarItem, onEliminarCat, onEditarCat
}: CardCategoriaProps) => {
  const [anadiendo, setAnadiendo]         = useState(false);
  const [editando, setEditando]           = useState(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [mostrarHechos, setMostrarHechos] = useState(false);

  const pendientes = items.filter(i => !i.hecho);
  const hechos     = items.filter(i => i.hecho);

  const handleAddItem = async (item: Omit<Item, "id" | "created_at">) => {
    await onAddItem(item);
    setAnadiendo(false);
  };

  const handleEditar = async (datos: Partial<Omit<Categoria, "id">>) => {
    setGuardandoEdit(true);
    try {
      await onEditarCat(cat.id, datos);
      setEditando(false);
    } finally {
      setGuardandoEdit(false);
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border-[length:var(--border-width)] border-primary/10 bg-white-custom overflow-hidden break-inside-avoid mb-3">
      {editando ? (
        <FormEditarCategoria cat={cat} onGuardar={handleEditar} onCancelar={() => setEditando(false)} guardando={guardandoEdit} />
      ) : (
        <>
          {/* Header */}
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/8 text-primary/50">
                <CatIcon name={cat.icon} size={13} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-[13px] font-black text-primary leading-none">{cat.nombre}</p>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">
                  {pendientes.length > 0 ? pendientes.length : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditando(true)}
                className="w-6 h-6 flex items-center justify-center rounded text-primary/25 hover:text-primary/60 hover:bg-primary/8 transition-all"
                title="Editar"
              >
                <PencilIcon size={11} />
              </button>
              <button
                onClick={() => setAnadiendo(v => !v)}
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded transition-all",
                  anadiendo
                    ? "bg-primary/10 text-primary/60 hover:bg-primary/15"
                    : "text-primary/30 hover:bg-primary/8 hover:text-primary/60"
                )}
                title={anadiendo ? "Cancelar" : "Añadir ítem"}
              >
                {anadiendo ? <X size={11} /> : <Plus size={11} />}
              </button>
            </div>
          </div>

          {/* Formulario nuevo ítem */}
          <AnimatePresence>
            {anadiendo && (
              <div className="px-3 pb-1">
                <FormNuevoItem
                  categoriaId={cat.id}
                  orden={items.length}
                  onGuardar={handleAddItem}
                  onCancelar={() => setAnadiendo(false)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Items pendientes */}
          <div className="px-2 pb-1">
            {pendientes.length === 0 && !anadiendo && (
              <p className="text-[10px] font-bold text-center py-2 text-primary/20">Vacío</p>
            )}
            <AnimatePresence mode="popLayout">
              {pendientes.map(item => (
                <CardItem key={item.id} item={item} onToggle={onToggleItem} onEliminar={onEliminarItem} />
              ))}
            </AnimatePresence>
          </div>

          {/* Items hechos (colapsables) */}
          {hechos.length > 0 && (
            <div className="border-t border-primary/5 px-3 py-1.5">
              <button
                onClick={() => setMostrarHechos(v => !v)}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/25 hover:text-primary/45 transition-all w-full"
              >
                <motion.div animate={{ rotate: mostrarHechos ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={9} />
                </motion.div>
                {hechos.length} hecho{hechos.length !== 1 ? "s" : ""}
              </button>

              <AnimatePresence>
                {mostrarHechos && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-0.5"
                  >
                    {hechos.map(item => (
                      <CardItem key={item.id} item={item} onToggle={onToggleItem} onEliminar={onEliminarItem} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Eliminar categoría */}
          <div className="px-3 pb-2 pt-0.5">
            <button
              onClick={() => onEliminarCat(cat.id)}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/15 hover:text-primary/40 transition-all"
            >
              <X size={8} /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const PaginaPendientes = () => {
  const [categorias, setCategorias]     = useState<Categoria[]>([]);
  const [items, setItems]               = useState<Item[]>([]);
  const [cargando, setCargando]         = useState(true);
  const [creandoCat, setCreandoCat]     = useState(false);
  const [guardandoCat, setGuardandoCat] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [cats, its] = await Promise.all([categoriasQueries.getAll(), itemsQueries.getAll()]);
      setCategorias(cats);
      setItems(its);
    } catch (err) {
      console.error("[PaginaPendientes] cargar:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardarCat = async (datos: Omit<Categoria, "id">) => {
    setGuardandoCat(true);
    try {
      const nueva = await categoriasQueries.add(datos);
      setCategorias(prev => [...prev, nueva]);
      setCreandoCat(false);
    } catch (err) {
      console.error("[PaginaPendientes] guardar cat:", err);
    } finally {
      setGuardandoCat(false);
    }
  };

  const handleEditarCat = async (id: string, datos: Partial<Omit<Categoria, "id">>) => {
    try {
      const updated = await categoriasQueries.update(id, datos);
      setCategorias(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      console.error("[PaginaPendientes] editar cat:", err);
      cargar();
    }
  };

  const handleEliminarCat = async (id: string) => {
    setCategorias(prev => prev.filter(c => c.id !== id));
    setItems(prev => prev.filter(i => i.categoria_id !== id));
    try {
      await categoriasQueries.delete(id);
    } catch (err) {
      console.error("[PaginaPendientes] eliminar cat:", err);
      cargar();
    }
  };

  const handleAddItem = async (datos: Omit<Item, "id" | "created_at">) => {
    try {
      const nuevo = await itemsQueries.add(datos);
      setItems(prev => [...prev, nuevo]);
    } catch (err) {
      console.error("[PaginaPendientes] add item:", err);
    }
  };

  const handleToggleItem = async (id: string, hecho: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, hecho } : i));
    try {
      await itemsQueries.toggleHecho(id, hecho);
    } catch (err) {
      console.error("[PaginaPendientes] toggle:", err);
      cargar();
    }
  };

  const handleEliminarItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await itemsQueries.delete(id);
    } catch (err) {
      console.error("[PaginaPendientes] eliminar item:", err);
      cargar();
    }
  };

  const stats = useMemo(() => {
    const total      = items.length;
    const hechos     = items.filter(i => i.hecho).length;
    const pendientes = total - hechos;
    return { total, hechos, pendientes };
  }, [items]);

  return (
    <div className="w-full px-4 md:px-6 space-y-3">

      {/* Stats compactos inline */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          {[
            { label: "categorías",  value: categorias.length },
            { label: "pendientes",  value: stats.pendientes  },
            { label: "hechos",      value: stats.hechos      },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-primary tracking-tight leading-none">{s.value}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/35">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/30">Pendientes</span>
        <button
          onClick={() => setCreandoCat(v => !v)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text px-3 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 transition-opacity"
        >
          {creandoCat ? <X size={11} /> : <Plus size={11} />}
          {creandoCat ? "Cancelar" : "Nueva categoría"}
        </button>
      </div>

      {/* Formulario nueva categoría */}
      <AnimatePresence>
        {creandoCat && (
          <FormNuevaCategoria
            onGuardar={handleGuardarCat}
            onCancelar={() => setCreandoCat(false)}
            guardando={guardandoCat}
            orden={categorias.length}
          />
        )}
      </AnimatePresence>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-10 gap-2 text-primary/40">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs font-bold">Cargando…</span>
        </div>
      ) : categorias.length === 0 && !creandoCat ? (
        <div className="text-center py-12">
          <BookOpen size={28} className="mx-auto mb-2 text-primary/20" />
          <p className="text-xs font-black text-primary/40 uppercase tracking-widest">Nada por aquí aún</p>
          <p className="text-[11px] text-primary/25 font-bold mt-1">Crea una categoría para empezar</p>
        </div>
      ) : (
        // CSS columns = masonry nativo: columnas de altura independiente,
        // las cards se distribuyen verticalmente sin empujar filas.
        <div className="columns-1 md:columns-3 gap-3">
          <AnimatePresence mode="popLayout">
            {categorias.map(cat => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <CardCategoria
                  cat={cat}
                  items={items.filter(i => i.categoria_id === cat.id)}
                  onAddItem={handleAddItem}
                  onToggleItem={handleToggleItem}
                  onEliminarItem={handleEliminarItem}
                  onEliminarCat={handleEliminarCat}
                  onEditarCat={handleEditarCat}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};