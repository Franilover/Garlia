"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plus, Check, X, Music, BookOpen, Youtube, Headphones,
  Film, Gamepad2, Tv, Rss, ExternalLink, Loader2, ChevronDown,
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
  { name: "Music",     component: Music,     label: "Música"      },
  { name: "BookOpen",  component: BookOpen,  label: "Lectura"     },
  { name: "Youtube",   component: Youtube,   label: "YouTube"     },
  { name: "Headphones",component: Headphones,label: "Podcasts"    },
  { name: "Film",      component: Film,      label: "Películas"   },
  { name: "Gamepad2",  component: Gamepad2,  label: "Juegos"      },
  { name: "Tv",        component: Tv,        label: "Series"      },
  { name: "Rss",       component: Rss,       label: "Artículos"   },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CAT_ICONS.map(({ name, component }) => [name, component])
);

function CatIcon({ name, size = 16 }: { name: string; size?: number }) {
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
    const { data, error } = await sb
      .from("pendientes_categorias")
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async add(cat: Omit<Categoria, "id">): Promise<Categoria> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb
      .from("pendientes_categorias")
      .insert({ ...cat, user_id: user?.id })
      .select()
      .single();
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
    const { data, error } = await sb
      .from("pendientes_items")
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async add(item: Omit<Item, "id" | "created_at">): Promise<Item> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb
      .from("pendientes_items")
      .insert({ ...item, user_id: user?.id })
      .select()
      .single();
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
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("music.youtube.com")) return "ytmusic";
  return "link";
}

function cleanUrl(url: string): string {
  if (!url.startsWith("http")) return `https://${url}`;
  return url;
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/15 focus:bg-white-custom rounded-[var(--radius-btn)] py-2.5 px-4 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all";

// ─── Formulario: nueva categoría ──────────────────────────────────────────────

interface FormNuevaCategoriaProps {
  onGuardar: (cat: Omit<Categoria, "id">) => Promise<void>;
  onCancelar: () => void;
  guardando: boolean;
  orden: number;
}

const FormNuevaCategoria = ({ onGuardar, onCancelar, guardando, orden }: FormNuevaCategoriaProps) => {
  const [nombre, setNombre] = useState("");
  const icon  = "Music";
  const color = 0;

  const handleGuardar = () => {
    if (!nombre.trim()) return;
    onGuardar({ nombre: nombre.trim(), icon, color, orden });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-5 shadow-lg shadow-primary/5 mb-4"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-4">Nueva categoría</p>

      <div className="mb-3">
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la categoría..."
          className={inputCls}
          onKeyDown={e => e.key === "Enter" && handleGuardar()}
          autoFocus
        />
      </div>


      <div className="flex gap-2">
        <button
          onClick={handleGuardar}
          disabled={!nombre.trim() || guardando}
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest bg-primary text-btn-text px-4 py-2 rounded-[var(--radius-btn)] hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {guardando ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Guardar
        </button>
        <button
          onClick={onCancelar}
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest bg-primary/8 text-primary px-4 py-2 rounded-[var(--radius-btn)] hover:bg-primary/12 transition-all"
        >
          <X size={11} /> Cancelar
        </button>
      </div>
    </motion.div>
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
  const [titulo, setTitulo] = useState("");
  const [url, setUrl]       = useState("");
  const [nota, setNota]     = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (!titulo.trim()) return;
    setGuardando(true);
    try {
      await onGuardar({
        categoria_id: categoriaId,
        titulo: titulo.trim(),
        url: url.trim() || undefined,
        nota: nota.trim() || undefined,
        hecho: false,
        orden,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-2 pb-1 space-y-2">
        <input
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Título o descripción..."
          className={inputCls}
          onKeyDown={e => e.key === "Enter" && handleGuardar()}
          autoFocus
        />
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="URL (opcional)..."
          className={inputCls}
        />
        <input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Nota (opcional)..."
          className={inputCls}
        />
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={handleGuardar}
            disabled={!titulo.trim() || guardando}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text px-3 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {guardando ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            Añadir
          </button>
          <button
            onClick={onCancelar}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-primary/8 text-primary px-3 py-1.5 rounded-[var(--radius-btn)] hover:bg-primary/12 transition-all"
          >
            <X size={10} /> Cancelar
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
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6, scale: 0.97 }}
      className={cn(
        "flex items-start gap-3 py-2 px-2 rounded-[var(--radius-btn)] group transition-all",
        item.hecho ? "opacity-40" : "hover:bg-primary/4"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.hecho)}
        className={cn(
          "mt-0.5 w-4 h-4 rounded-[4px] border-[length:var(--border-width)] flex-shrink-0 flex items-center justify-center transition-all",
          item.hecho
            ? "bg-primary/20 border-primary/20"
            : "bg-transparent border-primary/25 hover:border-primary/50"
        )}
      >
        {item.hecho && <Check size={10} className="text-primary/60" />}
      </button>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-bold leading-snug break-words text-primary/80", item.hecho ? "line-through" : "")}>
          {item.titulo}
        </p>
        {item.nota && (
          <p className="text-[11px] font-medium mt-0.5 text-primary/40 break-words">{item.nota}</p>
        )}
        {item.url && (
          <a
            href={cleanUrl(item.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary/70 transition-all"
          >
            {urlType === "youtube" && <Youtube size={10} />}
            {urlType === "ytmusic" && <Music size={10} />}
            {(urlType === "link" || !urlType) && <ExternalLink size={10} />}
            {urlType === "youtube" ? "YouTube" : urlType === "ytmusic" ? "YT Music" : "Abrir enlace"}
          </a>
        )}
      </div>

      {/* Eliminar */}
      <button
        onClick={() => onEliminar(item.id)}
        className="opacity-0 group-hover:opacity-100 mt-0.5 flex-shrink-0 text-primary/25 hover:text-primary/60 transition-all"
      >
        <X size={12} />
      </button>
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
}

const CardCategoria = ({
  cat, items, onAddItem, onToggleItem, onEliminarItem, onEliminarCat
}: CardCategoriaProps) => {
  const [anadiendo, setAnadiendo] = useState(false);
  const [mostrarHechos, setMostrarHechos] = useState(false);

  const pendientes = items.filter(i => !i.hecho);
  const hechos     = items.filter(i => i.hecho);

  const handleAddItem = async (item: Omit<Item, "id" | "created_at">) => {
    await onAddItem(item);
    setAnadiendo(false);
  };

  return (
    <div className="rounded-[var(--radius-card)] border-[length:var(--border-width)] border-primary/10 bg-white-custom overflow-hidden">
      {/* Header de categoría */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[var(--radius-btn)] flex items-center justify-center bg-primary/8 text-primary/50">
            <CatIcon name={cat.icon} size={14} />
          </div>
          <div>
            <p className="text-[13px] font-black text-primary">{cat.nombre}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">
              {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}
              {hechos.length > 0 && ` · ${hechos.length} hecho${hechos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setAnadiendo(v => !v)}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-[var(--radius-btn)] transition-all bg-primary/6 text-primary/50 hover:bg-primary/10 hover:text-primary/70"
        >
          {anadiendo ? <X size={10} /> : <Plus size={10} />}
          {anadiendo ? "Cancelar" : "Añadir"}
        </button>
      </div>

      {/* Formulario nuevo ítem */}
      <AnimatePresence>
        {anadiendo && (
          <div className="px-4">
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
      <div className="px-3 pb-2 space-y-0.5">
        {pendientes.length === 0 && !anadiendo && (
          <p className="text-[11px] font-bold text-center py-3 text-primary/25">
            Nada pendiente · añade algo
          </p>
        )}
        <AnimatePresence mode="popLayout">
          {pendientes.map(item => (
            <CardItem
              key={item.id}
              item={item}
              onToggle={onToggleItem}
              onEliminar={onEliminarItem}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Items hechos (colapsables) */}
      {hechos.length > 0 && (
        <div className="border-t border-primary/6 px-4 py-2">
          <button
            onClick={() => setMostrarHechos(v => !v)}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/50 transition-all w-full"
          >
            <motion.div animate={{ rotate: mostrarHechos ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={10} />
            </motion.div>
            {mostrarHechos ? "Ocultar" : "Ver"} {hechos.length} completado{hechos.length !== 1 ? "s" : ""}
          </button>

          <AnimatePresence>
            {mostrarHechos && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-1 space-y-0.5"
              >
                {hechos.map(item => (
                  <CardItem
                    key={item.id}
                    item={item}
                    onToggle={onToggleItem}
                    onEliminar={onEliminarItem}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Eliminar categoría */}
      <div className="px-4 pb-3">
        <button
          onClick={() => onEliminarCat(cat.id)}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/20 hover:text-primary/45 transition-all mt-1"
        >
          <X size={9} /> Eliminar categoría
        </button>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const PaginaPendientes = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems]           = useState<Item[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [creandoCat, setCreandoCat] = useState(false);
  const [guardandoCat, setGuardandoCat] = useState(false);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [cats, its] = await Promise.all([
        categoriasQueries.getAll(),
        itemsQueries.getAll(),
      ]);
      setCategorias(cats);
      setItems(its);
    } catch (err) {
      console.error("[PaginaPendientes] cargar:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Guardar categoría ──────────────────────────────────────────────────────
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

  // ── Eliminar categoría ────────────────────────────────────────────────────
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

  // ── Añadir ítem ───────────────────────────────────────────────────────────
  const handleAddItem = async (datos: Omit<Item, "id" | "created_at">) => {
    try {
      const nuevo = await itemsQueries.add(datos);
      setItems(prev => [...prev, nuevo]);
    } catch (err) {
      console.error("[PaginaPendientes] add item:", err);
    }
  };

  // ── Toggle ítem ───────────────────────────────────────────────────────────
  const handleToggleItem = async (id: string, hecho: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, hecho } : i));
    try {
      await itemsQueries.toggleHecho(id, hecho);
    } catch (err) {
      console.error("[PaginaPendientes] toggle:", err);
      cargar();
    }
  };

  // ── Eliminar ítem ─────────────────────────────────────────────────────────
  const handleEliminarItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await itemsQueries.delete(id);
    } catch (err) {
      console.error("[PaginaPendientes] eliminar item:", err);
      cargar();
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = items.length;
    const hechos    = items.filter(i => i.hecho).length;
    const pendientes = total - hechos;
    return { total, hechos, pendientes };
  }, [items]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-4 md:px-6 space-y-4">

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Categorías", value: categorias.length },
            { label: "Pendientes", value: stats.pendientes },
            { label: "Completados", value: stats.hechos },
          ].map(s => (
            <div key={s.label} className="bg-white-custom border-[length:var(--border-width)] border-primary/8 rounded-[var(--radius-card)] p-4 text-center">
              <span className="text-2xl font-black text-primary tracking-tight block">{s.value}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/35 block mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/35">
          Pendientes
        </span>
        <button
          onClick={() => setCreandoCat(v => !v)}
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest bg-primary text-btn-text px-4 py-2 rounded-[var(--radius-btn)] hover:opacity-90 transition-opacity"
        >
          {creandoCat ? <X size={12} /> : <Plus size={12} />}
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
        <div className="flex items-center justify-center py-12 gap-2 text-primary/40">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-bold">Cargando…</span>
        </div>
      ) : categorias.length === 0 && !creandoCat ? (
        <div className="text-center py-14">
          <div className="flex justify-center mb-3 text-primary/20">
            <BookOpen size={32} />
          </div>
          <p className="text-sm font-black text-primary/40 uppercase tracking-widest">Nada por aquí aún</p>
          <p className="text-xs text-primary/25 font-bold mt-1">Crea una categoría para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          <AnimatePresence mode="popLayout">
            {categorias.map(cat => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 10 }}
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
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};