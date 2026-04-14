import { MotionDiv } from '@/components/ui/Motion';
"use client";

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  BookOpen, ChevronDown, ChevronRight, UserCircle2,
  Loader2, PanelLeftClose, PanelLeftOpen,
  Plus, RefreshCw, Save, Search,
  Trash2, WifiOff, X, Check, CheckCircle2, AlertCircle,
  Eye, EyeOff, Maximize2, Minimize2, Clock, Hash,
  AlignLeft, Calendar, BookMarked, Pencil, MoreHorizontal, Globe, Lock, Timer, Zap,
  Mic2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import {
  useLastOpenedId, useDraftRestore, DraftRestoreBanner, usePersonajes,
} from "@/hooks/useEditorShared";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { BannerOffline, EmptyEstudio, ModalBase, SaveIndicator, CampoInput, BotonSubmit, normalize } from "@/components/templates/EstudioTemplates";
import { SoundPicker } from "@/components/forms/SoundPicker";
import { EntidadPicker } from "@/components/forms/EntidadPicker";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SnippetToolbar } from "./snippets/SnippetToolbar";

type Libro = {
  id: string;
  titulo: string;
  sinopsis?: string;
  portada_url?: string;
  estado?: string;
  visibilidad?: "publico" | "programado" | "oculto";
  fecha_publicacion?: string;
  fecha_proximo_capitulo?: string;
};

type Capitulo = {
  id: string;
  libro_id: string;
  titulo_capitulo: string;
  contenido: string;
  orden: number;
  fecha_publicacion: string;
  visibilidad?: "publico" | "programado" | "oculto";
  personajes_ids?: string[];
  // ── NUEVO: personaje que narra/protagoniza el capítulo ──
  narrador_id?: string | null;
  status?: "pending" | "synced";
  deleted?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "pending" | "error";

const TABLA_CAPS = "capitulos";

const ESTADO_COLOR: Record<string, string> = {
  "EN PROCESO": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  FINALIZADO:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  BORRADOR:     "bg-primary/10 text-primary/40 border-primary/20",
  PAUSADO:      "bg-primary/10 text-primary/40 border-primary/20",
};

const VISIBILIDAD_CONFIG = {
  publico:    { label: "Público",    icon: Globe, color: "bg-primary/15 text-primary border-primary/30"           },
  programado: { label: "Programado", icon: Timer, color: "bg-primary/8  text-primary/70 border-primary/20"        },
  oculto:     { label: "Borrador",   icon: Lock,  color: "bg-primary/5  text-primary/40 border-primary/10"        },
} as const;


function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingTime(words: number) {
  const mins = Math.ceil(words / 200);
  return mins < 1 ? "<1 min" : `${mins} min`;
}

function toDateInput(iso: string) {
  return iso ? iso.split("T")[0] : new Date().toISOString().split("T")[0];
}

async function dexieCapRead(libroId: string): Promise<Capitulo[]> {
  try {
    const table = (db as any)[TABLA_CAPS];
    if (!table) return [];
    const rows = (await table.toArray()) as Capitulo[];
    return rows
      .filter((r) => r.libro_id === libroId && !r.deleted)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  } catch { return []; }
}

async function dexieCapGet(id: string): Promise<Capitulo | null> {
  try { return await (db as any)[TABLA_CAPS]?.get(id) ?? null; } catch { return null; }
}

async function dexieCapWrite(rows: Capitulo[]): Promise<void> {
  try {
    const table = (db as any)[TABLA_CAPS];
    if (!table || !rows.length) return;
    await table.bulkPut(rows);
  } catch (e) { console.warn("[Dexie] capitulos:", e); }
}

async function dexieLibrosRead(): Promise<Libro[]> {
  try {
    const table = (db as any)["libros"];
    if (!table) return [];
    const rows = await table.toArray();
    return rows.filter((r: any) => !r.deleted) as Libro[];
  } catch { return []; }
}

async function capUpdateContenido(id: string, contenido: string): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!navigator.onLine) {
    await dexieCapWrite([{ ...existing, id, contenido, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    return;
  }
  try {
    const res = await librosQueries.updateContenido(id, contenido);
    if (res.error) throw res.error;
    if (existing) await dexieCapWrite([{ ...existing, contenido, status: "synced" }]);
  } catch {
    await dexieCapWrite([{ ...existing, id, contenido, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    throw new Error("offline");
  }
}

async function capUpdateMeta(id: string, fields: Partial<Capitulo>): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!navigator.onLine) {
    await dexieCapWrite([{ ...existing, id, ...fields, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, fields);
    return;
  }
  try {
    const { error } = await supabase.from(TABLA_CAPS).update(fields).eq("id", id);
    if (error) throw error;
    if (existing) await dexieCapWrite([{ ...existing, ...fields, status: "synced" }]);
  } catch {
    await dexieCapWrite([{ ...existing, id, ...fields, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, fields);
    throw new Error("offline");
  }
}

async function capCreate(
  libroId: string, titulo: string, orden: number,
  visibilidad: "publico" | "programado" | "oculto" = "oculto",
  fecha?: string,
  narradorId?: string | null,
): Promise<Capitulo> {
  const base: any = {
    libro_id: libroId,
    titulo_capitulo: titulo.toUpperCase(),
    contenido: "",
    orden,
    visibilidad,
    fecha_publicacion: visibilidad === "programado" ? (fecha ?? null) : null,
    narrador_id: narradorId ?? null,
  };
  if (!navigator.onLine) {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = { ...base, id: tmpId, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "upsert", tmpId, row);
    return row;
  }
  try {
    const { data, error } = await supabase.from(TABLA_CAPS).insert([base]).select().single();
    if (error) throw error;
    await dexieCapWrite([{ ...data, status: "synced" }]);
    return data as Capitulo;
  } catch {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = { ...base, id: tmpId, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "upsert", tmpId, row);
    return row;
  }
}

async function capDelete(id: string): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!navigator.onLine) {
    if (existing) await dexieCapWrite([{ ...existing, deleted: true, status: "pending" }]);
    await enqueueOperation(TABLA_CAPS, "delete", id);
    return;
  }
  try {
    const { error } = await supabase.from(TABLA_CAPS).delete().eq("id", id);
    if (error) throw error;
    try { await (db as any)[TABLA_CAPS]?.delete(id); } catch {}
  } catch {
    if (existing) await dexieCapWrite([{ ...existing, deleted: true, status: "pending" }]);
    await enqueueOperation(TABLA_CAPS, "delete", id);
    throw new Error("offline");
  }
}

async function libroUpdateMeta(id: string, fields: Partial<Libro>): Promise<void> {
  const { error } = await supabase.from("libros").update(fields).eq("id", id);
  if (error) throw error;
}

async function libroUpdateVisibilidad(id: string, visibilidad: string, fechaPublicacion?: string): Promise<void> {
  const fields: any = { visibilidad };
  if (fechaPublicacion !== undefined) fields.fecha_publicacion = fechaPublicacion || null;
  const { error } = await supabase.from("libros").update(fields).eq("id", id);
  if (error) throw error;
}


function useLibros() {
  const [libros, setLibros]       = useState<Libro[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    const local = await dexieLibrosRead();
    if (local.length > 0) {
      setLibros(local);
      setLoading(false);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = librosQueries.getAll({ isAdmin: true, order: { campo: "created_at", asc: false } });
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const l = ((result as any)?.data || []) as Libro[];
      setLibros(l);
      try {
        const table = (db as any)["libros"];
        if (table) await table.bulkPut(l.map((x) => ({ ...x, status: "synced" })));
      } catch {}
    } catch {
      if (local.length === 0) setLibros(await dexieLibrosRead());
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const h = () => { setIsOffline(false); load(); };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [load]);

  return { libros, setLibros, loading, isOffline, refetch: load };
}

function useCapitulos(libroId: string | null) {
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    const local = await dexieCapRead(id);
    if (local.length > 0) {
      setCapitulos(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = supabase
        .from(TABLA_CAPS).select("*").eq("libro_id", id).order("orden", { ascending: true });
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) throw error;
      const caps = (data || []) as Capitulo[];
      setCapitulos(caps);
      await dexieCapWrite(caps.map((c) => ({ ...c, status: "synced" })));
    } catch {
      if (local.length === 0) setCapitulos(await dexieCapRead(id));
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (libroId) load(libroId);
    else setCapitulos([]);
  }, [libroId, load]);

  useEffect(() => {
    const h = () => { if (libroId) { setIsOffline(false); load(libroId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [libroId, load]);

  return { capitulos, setCapitulos, loading, isOffline, reload: () => libroId && load(libroId) };
}

function useCapituloEditor(capId: string | null) {
  const [cap, setCap]             = useState<Capitulo | null>(null);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    const local = await dexieCapGet(id);
    if (local) {
      setCap(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = supabase.from(TABLA_CAPS).select("*").eq("id", id).single();
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(!local);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) throw error;

      if (local?.status === "pending" && local.contenido !== data.contenido) {
        setCap({ ...data, contenido: local.contenido, status: "pending" });
      } else {
        setCap(data as Capitulo);
        await dexieCapWrite([{ ...data, status: "synced" }]);
      }
    } catch {
      if (!local) setCap(await dexieCapGet(id));
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (capId) load(capId);
    else setCap(null);
  }, [capId, load]);

  useEffect(() => {
    const h = () => { if (capId) { setIsOffline(false); load(capId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [capId, load]);

  return { cap, setCap, loading, isOffline, reload: () => capId && load(capId) };
}

const EstadisticasEscritura = ({ texto }: { texto: string }) => {
  const palabras  = wordCount(texto);
  const caracteres = texto.length;
  const lectura   = readingTime(palabras);
  return (
    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
      <span className="flex items-center gap-1"><Hash size={9}/>{palabras.toLocaleString()} pal.</span>
      <span className="flex items-center gap-1"><AlignLeft size={9}/>{caracteres.toLocaleString()} car.</span>
      <span className="flex items-center gap-1"><Clock size={9}/>{lectura}</span>
    </div>
  );
};

const CapituloItem = ({
  cap, selected, onClick, onEdit, onDelete,
}: {
  cap: Capitulo;
  selected: boolean;
  onClick: () => void;
  onEdit: (cap: Capitulo) => void;
  onDelete: (id: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="relative group/cap">
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-lg transition-all border text-[11px] font-bold ${
          selected
            ? "bg-primary text-bg-main border-primary shadow-md shadow-primary/15"
            : "border-transparent hover:bg-primary/5 hover:border-primary/10 text-primary/70"
        }`}
      >
        <span className="flex items-center gap-2 pr-5">
          {cap.status === "pending" && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Pendiente de sync" />
          )}
          {cap.visibilidad === "oculto" && (
            <Lock size={9} className="shrink-0 opacity-40" />
          )}
          {cap.visibilidad === "programado" && new Date(cap.fecha_publicacion) > new Date() && (
            <Timer size={9} className="shrink-0 opacity-40" />
          )}
          <span className="truncate">
            {cap.orden}. {cap.titulo_capitulo}
          </span>
        </span>
      </button>

      <div ref={menuRef} className="absolute top-1 right-1">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          className={`p-1 rounded transition-all ${
            menuOpen
              ? "bg-primary/20 text-primary opacity-100"
              : selected
                ? "opacity-50 hover:opacity-100 text-bg-main hover:bg-bg-main/20"
                : "opacity-0 group-hover/cap:opacity-100 text-primary/40 hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <MoreHorizontal size={11} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-7 z-50 min-w-[150px] bg-bg-main border border-primary/15 rounded-xl shadow-xl py-1 overflow-hidden">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cap); }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:bg-primary/8 hover:text-primary transition-all flex items-center gap-2"
            >
              <Pencil size={10} /> Editar
            </button>
            <div className="h-px bg-primary/8 mx-2 my-1" />
            <button
              onClick={async e => {
                e.stopPropagation();
                setMenuOpen(false);
                const ok = await confirm({ message: `¿Eliminar "${cap.titulo_capitulo}"?`, danger: true });
                if (ok) onDelete(cap.id);
              }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:bg-red-500/8 hover:text-red-400 transition-all flex items-center gap-2"
            >
              <Trash2 size={10} /> Eliminar
            </button>
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
};

const LibroItem = ({
  libro, selectedCapId, onSelectCap, expanded, onToggle, onEditCap, onDeleteCap, onEditLibro,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
}) => {
  const { capitulos, loading } = useCapitulos(expanded ? libro.id : null);

  return (
    <div className="mb-1">
      <div className="relative flex items-center gap-1 group/libro">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-all text-left"
      >
        <BookMarked size={12} className="text-primary/30 shrink-0" />
        <span className="flex-1 text-xs font-black uppercase italic tracking-tight text-primary leading-tight truncate">
          {libro.titulo}
        </span>
        {libro.visibilidad && libro.visibilidad !== "publico" && (() => {
          const cfg = VISIBILIDAD_CONFIG[libro.visibilidad] ?? VISIBILIDAD_CONFIG.oculto;
          const Icon = cfg.icon;
          return (
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 flex items-center gap-0.5 ${cfg.color}`}>
              <Icon size={8} />
            </span>
          );
        })()}
        {libro.estado && (
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${ESTADO_COLOR[libro.estado] || ESTADO_COLOR.BORRADOR}`}>
            {libro.estado === "EN PROCESO" ? "WIP" : libro.estado === "FINALIZADO" ? "✓" : "…"}
          </span>
        )}
        {expanded
          ? <ChevronDown size={11} className="text-primary/25 shrink-0"/>
          : <ChevronRight size={11} className="text-primary/25 shrink-0"/>
        }
      </button>
      <button
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditLibro(libro); }}
        className="opacity-0 group-hover/libro:opacity-100 p-1.5 rounded-lg hover:bg-primary/10 text-primary/25 hover:text-primary transition-all mr-1 shrink-0"
        title="Editar libro"
      >
        <Pencil size={10}/>
      </button>
      </div>

      {expanded && (
        <div className="ml-4 pl-3 border-l border-primary/10 mt-1 space-y-0.5">
          {loading ? (
            <div className="py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-primary/20"/></div>
          ) : capitulos.length === 0 ? (
            <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest px-2 py-2">Sin capítulos</p>
          ) : (
            capitulos.map(cap => (
              <CapituloItem
                key={cap.id}
                cap={cap}
                selected={selectedCapId === cap.id}
                onClick={() => onSelectCap(libro.id, cap.id)}
                onEdit={onEditCap}
                onDelete={id => onDeleteCap(id, libro.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Selector de visibilidad inline para capítulo ────────────────────────────
const VisibilidadCapPicker = ({
  capId, current, onChanged,
}: {
  capId: string;
  current: "publico" | "programado" | "oculto";
  onChanged: (v: "publico" | "programado" | "oculto") => void;
}) => {
  const [saving, setSaving] = useState(false);

  const handleChange = async (v: "publico" | "programado" | "oculto") => {
    if (v === current || saving) return;
    setSaving(true);
    try {
      await capUpdateMeta(capId, { visibilidad: v });
      onChanged(v);
    } catch {}
    setSaving(false);
  };

  return (
    <span className="flex items-center gap-1">
      {(["oculto", "programado", "publico"] as const).map(v => {
        const cfg = VISIBILIDAD_CONFIG[v];
        const Icon = cfg.icon;
        const active = current === v;
        return (
          <button
            key={v}
            onClick={() => handleChange(v)}
            title={cfg.label}
            disabled={saving}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wide transition-all disabled:opacity-40 ${
              active ? cfg.color : "border-primary/10 text-primary/25 hover:border-primary/25 hover:text-primary/50"
            }`}
          >
            <Icon size={8} />
            {active && <span>{cfg.label}</span>}
          </button>
        );
      })}
    </span>
  );
};

// ─── NUEVO: Selector de narrador/protagonista (single-select) ────────────────
const SelectorNarrador = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) => {
  const { personajes, loading } = usePersonajes();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = personajes.find(p => p.id === value) ?? null;

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-2">
        <Mic2 size={10} />
        Narrador / Protagonista del capítulo
      </label>

      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all"
        style={{
          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <>
              {(selected as any).img_url && (
                <img
                  src={(selected as any).img_url}
                  className="w-5 h-5 rounded-full object-cover border border-primary/20"
                  alt=""
                />
              )}
              <span className="font-black uppercase">{selected.nombre}</span>
            </>
          ) : (
            loading ? "Cargando…" : "Sin narrador asignado"
          )}
        </span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="border rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            background: "var(--bg-main)",
          }}
        >
          {/* Opción: ninguno */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
            style={{ color: !value ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)" }}
          >
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <X size={9} className="opacity-50" />
              </span>
              Ninguno
            </span>
            {!value && <Check size={11} style={{ color: "var(--primary)" }} />}
          </button>

          <div className="h-px mx-3" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

          {/* Lista de personajes */}
          <div className="max-h-48 overflow-y-auto">
            {personajes.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">Sin personajes</p>
            ) : personajes.map(p => {
              const sel = value === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                  style={{ color: sel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                >
                  <span className="flex items-center gap-2">
                    {(p as any).img_url ? (
                      <img src={(p as any).img_url} className="w-5 h-5 rounded-full object-cover border border-primary/15" alt="" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle2 size={10} className="opacity-40" />
                      </span>
                    )}
                    {p.nombre}
                  </span>
                  {sel && <Check size={11} style={{ color: "var(--primary)" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Snippets de diálogo ─────────────────────────────────────────────────────

type DialogSnippet = {
  label: string;
  title: string;
  insert: string | ((sel: string) => string);
};

const DIALOG_SNIPPETS: DialogSnippet[] = [
  { label: "—",        title: "Guión de diálogo",          insert: "— " },
  { label: "— … —",   title: "Acotación entre guiones",   insert: (sel) => `— ${sel || "…"} —` },
  { label: "«»",       title: "Comillas angulares",        insert: (sel) => `«${sel || "…"}»` },
  { label: "—diálogo", title: "Línea de diálogo completa", insert: (sel) => `— ${sel || ""}` },
  { label: "…",        title: "Puntos suspensivos",        insert: "…" },
  { label: "–",        title: "Guión corto (en-dash)",    insert: "–" },
];

function insertAtCursor(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  snippet: DialogSnippet,
) {
  const start = ta.selectionStart ?? 0;
  const end   = ta.selectionEnd ?? 0;
  const sel   = value.slice(start, end);
  const ins   = typeof snippet.insert === "function" ? snippet.insert(sel) : snippet.insert;
  const next  = value.slice(0, start) + ins + value.slice(end);
  onChange(next);
  // Restore cursor after react re-render
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + ins.length;
    ta.setSelectionRange(pos, pos);
  });
}

const DialogSnippets = ({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="shrink-0 flex items-center gap-1 px-8 py-1.5 border-b border-primary/5 flex-wrap">
    <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 mr-1">Diálogo</span>
    {DIALOG_SNIPPETS.map((s) => (
      <button
        key={s.label}
        title={s.title}
        type="button"
        onMouseDown={(e) => {
          // prevent textarea losing focus
          e.preventDefault();
          if (textareaRef.current) insertAtCursor(textareaRef.current, value, onChange, s);
        }}
        className="px-2.5 py-1 rounded-lg border border-primary/10 text-[11px] font-mono text-primary/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all select-none"
      >
        {s.label}
      </button>
    ))}
  </div>
);

// ─── PanelEditor ─────────────────────────────────────────────────────────────

const PanelEditor = ({
  capId, libroId, onCapitulosChange, focusMode, onToggleFocus,
}: {
  capId: string;
  libroId: string;
  onCapitulosChange: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}) => {
  const { cap, setCap, loading, isOffline, reload } = useCapituloEditor(capId);
  const [contenido,     setContenido]     = useState("");
  const [saveStatus,    setSaveStatus]    = useState<SaveStatus>("idle");
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [titulo,        setTitulo]        = useState("");
  const [editingFecha,  setEditingFecha]  = useState(false);
  const [fecha,         setFecha]         = useState("");
  const [capVisibilidad, setCapVisibilidad] = useState<"publico" | "programado" | "oculto">("oculto");
  const [savingMeta,    setSavingMeta]    = useState(false);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [listaSnippetCaps, setListaSnippetCaps] = useState<{id:string;orden:number;titulo_capitulo:string}[]>([]);
  const timer            = useRef<any>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const scrollRef        = useRef<HTMLDivElement>(null);
  const caretMirrorRef   = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const draft = useDraftRestore({
    key: `cap-draft-${capId}`,
    serverValue: cap?.contenido || "",
    enabled: !!capId && !loading,
  });

  useEffect(() => {
    if (!cap) return;
    setContenido(cap.contenido || "");
    setTitulo(cap.titulo_capitulo || "");
    setFecha(toDateInput(cap.fecha_publicacion));
    setCapVisibilidad(cap.visibilidad ?? "oculto");
    if (cap.status === "pending") setSaveStatus("pending");
    else setSaveStatus("idle");
  }, [cap?.id]);

  useEffect(() => {
    if (!libroId) return;
    supabase.from("capitulos").select("id, orden, titulo_capitulo")
      .eq("libro_id", libroId).order("orden").then(({ data }) => {
        setListaSnippetCaps((data ?? []) as {id:string;orden:number;titulo_capitulo:string}[]);
      });
  }, [libroId]);

  // ── Auto-height ────────────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [contenido]);

  // ── Centrar cursor verticalmente usando un div espejo ──────────────────────
  const centerCursor = useCallback(() => {
    const ta        = textareaRef.current;
    const container = scrollRef.current;
    const mirror    = caretMirrorRef.current;
    if (!ta || !container || !mirror) return;

    const cs = getComputedStyle(ta);
    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: ${ta.clientWidth}px;
      font: ${cs.font};
      line-height: ${cs.lineHeight};
      padding: ${cs.padding};
      border: ${cs.border};
      box-sizing: ${cs.boxSizing};
      top: 0;
      left: 0;
    `;

    const textBefore = ta.value.slice(0, ta.selectionStart ?? ta.value.length);
    mirror.innerHTML =
      textBefore
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\n/g, "<br>") +
      '<span id="caret-pos">\u200b</span>';

    const caretSpan = mirror.querySelector("#caret-pos") as HTMLElement | null;
    if (!caretSpan) return;

    const mirrorRect = mirror.getBoundingClientRect();
    const caretRect  = caretSpan.getBoundingClientRect();
    const caretTop   = caretRect.top - mirrorRect.top;

    const targetScroll = ta.offsetTop + caretTop - container.clientHeight / 2;
    container.scrollTop = Math.max(0, targetScroll);
  }, []);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    setSaveStatus("saving");
    draft.save(val);
    try {
      await capUpdateContenido(capId, val);
      setCap(prev => prev ? { ...prev, contenido: val } : prev);
      draft.clear();
      setSaveStatus(navigator.onLine ? "saved" : "pending");
      if (navigator.onLine) setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("pending");
    }
  }, [capId, setCap, draft]);

  const onChange = (val: string) => {
    setContenido(val);
    draft.save(val);
    setSaveStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 2000);
    // Centrar cursor después del re-render (cuando el auto-height ya corrió)
    requestAnimationFrame(() => centerCursor());
  };

  const handleSaveTitle = async () => {
    if (!titulo.trim()) return;
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, { titulo_capitulo: titulo.trim().toUpperCase() });
      setCap(prev => prev ? { ...prev, titulo_capitulo: titulo.trim().toUpperCase() } : prev);
      onCapitulosChange();
    } catch {}
    setEditingTitle(false);
    setSavingMeta(false);
  };

  const handleSaveFecha = async () => {
    if (!fecha) return;
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, { fecha_publicacion: fecha });
      setCap(prev => prev ? { ...prev, fecha_publicacion: fecha } : prev);
      onCapitulosChange();
    } catch {}
    setEditingFecha(false);
    setSavingMeta(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: `¿Eliminar permanentemente "${cap?.titulo_capitulo}"?`,
      danger: true,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    try {
      await capDelete(capId);
      onCapitulosChange();
    } catch {}
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28}/>
    </div>
  );
  if (!cap) return null;

  // Narrador del capítulo (para mostrar en la cabecera)
  const narradorLabel = cap.narrador_id ? null : null; // se resuelve en ModalEditar, aquí solo mostramos el id si existe

  const palabras = wordCount(contenido);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Modal de preview del lector */}
      <AnimatePresence>
        {previewOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col">
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-bg-main"
            />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-3 bg-white-custom/80 backdrop-blur-md border-b border-primary/10 shrink-0">
                <div className="flex items-center gap-3">
                  <Eye size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 italic">
                    Vista previa — {cap?.titulo_capitulo}
                  </span>
                  {cap?.visibilidad !== "publico" && (
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 tracking-wide">
                      <Lock size={8} />
                      {VISIBILIDAD_CONFIG[cap?.visibilidad ?? "oculto"]?.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/wiki/libros/${libroId}/leer/${capId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-bold text-primary/25 uppercase tracking-widest hover:text-primary/50 transition-colors flex items-center gap-1"
                  >
                    Abrir página pública ↗
                  </a>
                  <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all">
                    <X size={16}/>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-8 py-12">
                  <h1 className="text-3xl font-black uppercase italic tracking-tight text-primary mb-8 leading-tight">
                    {cap?.titulo_capitulo}
                  </h1>
                  <div
                    className="prose prose-invert max-w-none text-primary/80 leading-relaxed whitespace-pre-wrap font-serif text-base"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {contenido || <span className="text-primary/25 italic">Sin contenido aún…</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <DraftRestoreBanner
        draft={draft}
        onRestore={(v) => { setContenido(v); draft.dismiss(); }}
        label="Hay un borrador local de este capítulo"
      />
      {isOffline && <BannerOffline color="blue" mensaje="Sin conexión — los cambios se guardan localmente" />}

      {saveStatus === "pending" && !isOffline && (
        <div className="shrink-0 flex items-center gap-2 px-8 py-2 bg-blue-500/8 border-b border-blue-500/15 text-[9px] font-black uppercase tracking-widest text-blue-400/70">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
          Cambios pendientes de sincronizar
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-8 pt-6 pb-4 border-b border-primary/8 space-y-4">

          {/* Título */}
          <div className="flex items-start gap-3">
            {editingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }
                  }}
                  className="flex-1 bg-transparent text-2xl font-black uppercase italic tracking-tight text-primary outline-none border-b-2 border-primary/30 focus:border-primary pb-1"
                />
                <button onClick={handleSaveTitle} disabled={savingMeta} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40">
                  {savingMeta ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                </button>
                <button onClick={() => { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }} className="p-2 rounded-lg hover:bg-primary/5 text-primary/30 hover:text-primary transition-all">
                  <X size={14}/>
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <h1
                  className="flex-1 text-2xl font-black uppercase italic tracking-tight text-primary leading-tight cursor-pointer hover:text-primary/70 transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {cap.titulo_capitulo}
                </h1>
                <button onClick={() => setEditingTitle(true)} className="shrink-0 p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all mt-1">
                  <Pencil size={13}/>
                </button>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => doSave(contenido)} disabled={saveStatus === "saving"}
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30" title="Guardar (Ctrl+S)">
                <Save size={14}/>
              </button>
              <button onClick={() => setPreviewOpen(true)}
                className="p-2 rounded-lg hover:bg-emerald-500/10 text-primary/30 hover:text-emerald-500 transition-all" title="Vista previa">
                <Eye size={14}/>
              </button>
              <button onClick={onToggleFocus} className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all" title="Modo foco">
                <Maximize2 size={14}/>
              </button>
              <button onClick={reload as any} className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all" title="Recargar">
                <RefreshCw size={13}/>
              </button>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all" title="Eliminar capítulo">
                <Trash2 size={13}/>
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-[9px] font-black uppercase text-primary/30 tracking-widest flex-wrap">
              <span className="flex items-center gap-1">
                <Hash size={9}/> Cap. {cap.orden}
              </span>

              {/* Narrador pill — visible si está asignado */}
              {cap.narrador_id && (
                <NarradorPill narradorId={cap.narrador_id} />
              )}

              {capVisibilidad === "programado" && (
                editingFecha ? (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={9}/>
                    <input autoFocus type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveFecha();
                        if (e.key === "Escape") { setEditingFecha(false); setFecha(toDateInput(cap.fecha_publicacion)); }
                      }}
                      className="bg-primary/5 border border-primary/20 rounded-lg px-2 py-0.5 text-[9px] font-bold text-primary outline-none focus:border-primary/40 transition-colors"
                    />
                    <button onClick={handleSaveFecha} disabled={savingMeta} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40">
                      {savingMeta ? <Loader2 size={10} className="animate-spin"/> : <Check size={10}/>}
                    </button>
                    <button onClick={() => { setEditingFecha(false); setFecha(toDateInput(cap.fecha_publicacion)); }} className="p-1 rounded hover:bg-primary/5 text-primary/30 hover:text-primary transition-all">
                      <X size={10}/>
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setEditingFecha(true)} className="flex items-center gap-1 hover:text-primary transition-colors group/fecha" title="Editar fecha">
                    <Calendar size={9}/>
                    {fecha
                      ? new Date(fecha) > new Date()
                        ? `Programado · ${new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`
                        : new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                      : "Sin fecha"
                    }
                    <Pencil size={8} className="opacity-0 group-hover/fecha:opacity-60 transition-opacity ml-0.5"/>
                  </button>
                )
              )}

              <VisibilidadCapPicker
                capId={capId}
                current={capVisibilidad}
                onChanged={(v) => {
                  setCapVisibilidad(v);
                  setCap(prev => prev ? { ...prev, visibilidad: v } : prev);
                  if (v !== "programado") {
                    setFecha("");
                    capUpdateMeta(capId, { fecha_publicacion: null as any });
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <EstadisticasEscritura texto={contenido}/>
              <SaveIndicator status={saveStatus}/>
            </div>
          </div>
        </div>
      )}

      {focusMode && (
        <div className="shrink-0 flex items-center justify-between px-8 py-3 border-b border-primary/5">
          <span className="text-xs font-black uppercase italic tracking-tight text-primary/40 truncate max-w-xs">
            {cap.titulo_capitulo}
          </span>
          <div className="flex items-center gap-3">
            <EstadisticasEscritura texto={contenido}/>
            <SaveIndicator status={saveStatus}/>
            <button onClick={onToggleFocus} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all">
              <Minimize2 size={13}/>
            </button>
          </div>
        </div>
      )}

      {!focusMode && (
        <DialogSnippets textareaRef={textareaRef} value={contenido} onChange={onChange} />
      )}

      {!focusMode && (
        <SnippetToolbar
          textareaRef={textareaRef}
          value={contenido}
          onChange={onChange}
          listaCapitulos={listaSnippetCaps}
        />
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto relative ${focusMode ? "px-16 py-12 max-w-3xl mx-auto w-full" : "px-8 py-6"}`}>
        {/* Div espejo para calcular posición exacta del cursor (word-wrap real) */}
        <div ref={caretMirrorRef} aria-hidden="true" />
        <textarea
          ref={textareaRef}
          value={contenido}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(contenido); }
          }}
          spellCheck
          className={`w-full bg-transparent outline-none resize-none text-primary leading-[1.9] placeholder:text-primary/15 font-serif transition-all ${focusMode ? "text-xl" : "text-base"}`}
          style={{ minHeight: "60vh" }}
          placeholder="Empieza a escribir…"
        />
      </div>

      {!focusMode && (
        <div className="shrink-0 px-8 py-3 border-t border-primary/5 flex items-center justify-between">
          <EstadisticasEscritura texto={contenido}/>
          <span className="text-[9px] font-black uppercase text-primary/20 tracking-widest">Ctrl+S para guardar</span>
        </div>
      )}
      <ConfirmModal />
    </div>
  );
};

// ─── Pill del narrador en la barra del editor ─────────────────────────────────
const NarradorPill = ({ narradorId }: { narradorId: string }) => {
  const { personajes } = usePersonajes();
  const p = personajes.find(x => x.id === narradorId);
  if (!p) return null;
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wide"
      style={{
        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
        color: "var(--accent)",
      }}
    >
      <Mic2 size={8} />
      {p.nombre}
    </span>
  );
};

// ─── SelectorVisibilidad ─────────────────────────────────────────────────────
const SelectorVisibilidad = ({
  value, onChange, fechaPublicacion, onFechaChange, label = "Visibilidad",
}: {
  value: "publico" | "programado" | "oculto";
  onChange: (v: "publico" | "programado" | "oculto") => void;
  fechaPublicacion?: string;
  onFechaChange?: (v: string) => void;
  label?: string;
}) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">
      {label}
    </label>
    <div className="flex gap-2">
      {(["oculto", "programado", "publico"] as const).map((v) => {
        const cfg = VISIBILIDAD_CONFIG[v];
        const Icon = cfg.icon;
        const active = value === v;
        return (
          <button
            key={v} type="button"
            onClick={() => onChange(v)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide border transition-all ${
              active ? cfg.color + " shadow-sm" : "border-primary/10 text-primary/30 hover:border-primary/25 hover:text-primary/60"
            }`}
          >
            <Icon size={11} /> {cfg.label}
          </button>
        );
      })}
    </div>
    {value === "programado" && (
      <div className="mt-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Fecha de publicación</label>
        <input
          type="date"
          value={fechaPublicacion || ""}
          onChange={e => onFechaChange?.(e.target.value)}
          className="mt-1 w-full bg-primary/5 border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-[11px] font-bold text-primary outline-none focus:border-primary/30 transition-colors"
        />
      </div>
    )}
  </div>
);

// ─── Selector multi-personaje (aparecen en el capítulo) ──────────────────────
const SelectorPersonajesCapitulo = ({
  value, onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { personajes, loading } = usePersonajes();
  const [open, setOpen] = useState(false);
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  const selected = personajes.filter(p => value.includes(p.id));

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-2">
        <UserCircle2 size={10} />
        Personajes que aparecen
        <span className="text-primary/25 normal-case font-medium">(se desbloquean al terminar)</span>
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(p => (
            <span key={p.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
              {p.nombre}
              <button type="button" onClick={() => toggle(p.id)} className="opacity-50 hover:opacity-100 transition-opacity ml-0.5">✕</button>
            </span>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all"
        style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
        <span>{loading ? "Cargando…" : selected.length > 0 ? `${selected.length} seleccionado${selected.length > 1 ? "s" : ""}` : "Añadir personajes…"}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border rounded-[var(--radius-btn)] overflow-hidden max-h-44 overflow-y-auto"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)", background: "var(--bg-main)" }}>
          {personajes.length === 0 ? (
            <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">Sin personajes</p>
          ) : (
            personajes.map(p => {
              const sel = value.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggle(p.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                  style={{ color: sel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                  <span>{p.nombre}</span>
                  {sel && <Check size={11} className="shrink-0" style={{ color: "var(--primary)" }} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ─── ModalEditarCapitulo ─────────────────────────────────────────────────────
const ModalEditarCapitulo = ({
  cap, onSaved, onClose,
}: {
  cap: Capitulo;
  onSaved: (c: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo,        setTitulo]        = useState(cap.titulo_capitulo);
  const [orden,         setOrden]         = useState(String(cap.orden));
  const [fecha,         setFecha]         = useState(toDateInput(cap.fecha_publicacion));
  const [visibilidad,   setVisibilidad]   = useState<"publico" | "programado" | "oculto">(cap.visibilidad ?? "oculto");
  const [personajesIds, setPersonajesIds] = useState<string[]>(cap.personajes_ids ?? []);
  const [narradorId,    setNarradorId]    = useState<string | null>(cap.narrador_id ?? null);
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const fields: Partial<Capitulo> = {
        titulo_capitulo: titulo.trim().toUpperCase(),
        orden: parseInt(orden) || cap.orden,
        fecha_publicacion: visibilidad === "programado" ? fecha : null as any,
        visibilidad,
        personajes_ids: personajesIds,
        narrador_id: narradorId,
      };
      await capUpdateMeta(cap.id, fields);
      onSaved({ ...cap, ...fields });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <Pencil size={12}/> Editar Capítulo
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="NOMBRE DEL CAPÍTULO…" autoFocus />
        <CampoInput label="Orden" value={orden} onChange={setOrden} type="number" placeholder="1" />
        <SelectorVisibilidad
          value={visibilidad}
          onChange={(v) => {
            setVisibilidad(v);
            if (v !== "programado") setFecha("");
          }}
          fechaPublicacion={fecha}
          onFechaChange={setFecha}
          label="Visibilidad del Capítulo"
        />
        {/* Narrador primero — es el campo más característico */}
        <SelectorNarrador value={narradorId} onChange={setNarradorId} />
        <SelectorPersonajesCapitulo value={personajesIds} onChange={setPersonajesIds} />
        <BotonSubmit
          loading={saving}
          disabled={!titulo.trim()}
          labelLoading={<><Loader2 size={13} className="animate-spin"/>Guardando…</>}
          labelNormal={<><Check size={13}/>Guardar Cambios</>}
        />
      </form>
    </ModalBase>
  );
};

// ─── ModalNuevoCapitulo ───────────────────────────────────────────────────────
const ModalNuevoCapitulo = ({
  libroId, ordenSiguiente, onCreated, onClose,
}: {
  libroId: string;
  ordenSiguiente: number;
  onCreated: (cap: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo,        setTitulo]        = useState("");
  const [fecha,         setFecha]         = useState("");
  const [visibilidad,   setVisibilidad]   = useState<"publico" | "programado" | "oculto">("oculto");
  const [personajesIds, setPersonajesIds] = useState<string[]>([]);
  const [narradorId,    setNarradorId]    = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const nuevo = await capCreate(libroId, titulo, ordenSiguiente, visibilidad, fecha || undefined, narradorId);
      if (personajesIds.length > 0) {
        await capUpdateMeta(nuevo.id, { personajes_ids: personajesIds });
        Object.assign(nuevo, { personajes_ids: personajesIds });
      }
      onCreated(nuevo);
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic">Nuevo Capítulo</h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="NOMBRE DEL CAPÍTULO…" autoFocus />
        <SelectorVisibilidad
          value={visibilidad}
          onChange={(v) => {
            setVisibilidad(v);
            if (v !== "programado") setFecha("");
          }}
          fechaPublicacion={fecha}
          onFechaChange={setFecha}
          label="Visibilidad del Capítulo"
        />
        <SelectorNarrador value={narradorId} onChange={setNarradorId} />
        <SelectorPersonajesCapitulo value={personajesIds} onChange={setPersonajesIds} />
        <BotonSubmit
          loading={saving}
          disabled={!titulo.trim()}
          labelLoading={<><Loader2 size={13} className="animate-spin"/>Creando…</>}
          labelNormal={<><Plus size={13}/>Crear Capítulo</>}
        />
      </form>
    </ModalBase>
  );
};

// ─── ModalEditarLibro ─────────────────────────────────────────────────────────
const ModalEditarLibro = ({
  libro, onSaved, onClose,
}: {
  libro: Libro;
  onSaved: (l: Libro) => void;
  onClose: () => void;
}) => {
  const [titulo,      setTitulo]      = useState(libro.titulo);
  const [sinopsis,    setSinopsis]    = useState(libro.sinopsis ?? "");
  const [portada,     setPortada]     = useState(libro.portada_url ?? "");
  const [estado,      setEstado]      = useState(libro.estado ?? "BORRADOR");
  const [visibilidad, setVisibilidad] = useState<"publico" | "programado" | "oculto">(libro.visibilidad ?? "oculto");
  const [fechaLibro,  setFechaLibro]  = useState(libro.fecha_publicacion ?? "");
  const [saving,      setSaving]      = useState(false);

  const ESTADOS = ["BORRADOR", "EN PROCESO", "FINALIZADO", "PAUSADO"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const fields: Partial<Libro> = {
        titulo: titulo.trim().toUpperCase(),
        sinopsis: sinopsis.trim(),
        portada_url: portada.trim(),
        estado,
        visibilidad,
        // ✅ null limpia la columna en Supabase; undefined causa error 400
        fecha_publicacion: visibilidad === "programado" ? (fechaLibro || null) : null,
      };
      await libroUpdateMeta(libro.id, fields);
      onSaved({ ...libro, ...fields });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <BookMarked size={12}/> Editar Libro
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="TÍTULO DEL LIBRO…" autoFocus />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Sinopsis</label>
          <textarea
            value={sinopsis}
            onChange={e => setSinopsis(e.target.value)}
            rows={4}
            placeholder="Descripción del libro…"
            className="w-full bg-bg-main border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2.5 text-[12px] text-primary outline-none focus:border-primary/30 resize-none transition-colors"
          />
        </div>
        <CampoInput label="URL de portada" value={portada} onChange={setPortada} placeholder="https://…" />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Estado</label>
          <div className="flex gap-1.5 flex-wrap">
            {ESTADOS.map(est => (
              <button key={est} type="button" onClick={() => setEstado(est)}
                className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide border transition-all ${
                  estado === est
                    ? "bg-primary text-btn-text border-primary shadow-sm"
                    : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary/70"
                }`}>
                {est}
              </button>
            ))}
          </div>
        </div>
        <SelectorVisibilidad
          value={visibilidad}
          onChange={setVisibilidad}
          fechaPublicacion={fechaLibro}
          onFechaChange={setFechaLibro}
          label="Visibilidad del Libro"
        />
        <div className="pt-2">
          <BotonSubmit
            loading={saving}
            disabled={!titulo.trim()}
            labelLoading={<><Loader2 size={13} className="animate-spin"/>Guardando…</>}
            labelNormal={<><Check size={13}/>Guardar Cambios</>}
          />
        </div>
      </form>
    </ModalBase>
  );
};


export default function EstudioCapitulos() {
  const { libros, setLibros, loading: loadingLibros, isOffline: listaOffline, refetch } = useLibros();

  const [lastCapId,   setLastCapId]   = useLastOpenedId("estudio-caps-last-cap");
  const [lastLibroId, setLastLibroId] = useLastOpenedId("estudio-caps-last-libro");

  const [expandedLibros, setExpandedLibros]     = useState<Set<string>>(new Set());
  const [selectedLibroId, _setSelectedLibroId]  = useState<string | null>(lastLibroId);
  const [selectedCapId,   _setSelectedCapId]    = useState<string | null>(lastCapId);

  const setSelectedLibroId = (id: string | null) => { _setSelectedLibroId(id); setLastLibroId(id); };
  const setSelectedCapId   = (id: string | null) => { _setSelectedCapId(id);   setLastCapId(id); };
  const [sidebarOpen,     setSidebarOpen]       = useState(true);
  const [focusMode,       setFocusMode]         = useState(false);
  const [busqueda,        setBusqueda]          = useState("");
  const [showNuevoCap,    setShowNuevoCap]      = useState(false);
  const [editandoCap,     setEditandoCap]       = useState<Capitulo | null>(null);
  const [capRefreshKey,   setCapRefreshKey]     = useState(0);
  const [editandoLibro,   setEditandoLibro]     = useState<Libro | null>(null);

  const { capitulos, setCapitulos, reload: reloadCaps } = useCapitulos(selectedLibroId);

  useEffect(() => {
    if (lastLibroId) setExpandedLibros(new Set([lastLibroId]));
  }, []); // eslint-disable-line

  const librosFiltrados = useMemo(() =>
    libros.filter(l => !busqueda || normalize(l.titulo).includes(normalize(busqueda))),
    [libros, busqueda]
  );

  const toggleExpanded = (libroId: string) => {
    setExpandedLibros(prev => {
      const next = new Set(prev);
      if (next.has(libroId)) next.delete(libroId);
      else next.add(libroId);
      return next;
    });
  };

  const handleSelectCap = (libroId: string, capId: string) => {
    setSelectedLibroId(libroId);
    setSelectedCapId(capId);
    setFocusMode(false);
    setSidebarOpen(false);
  };

  const handleCapCreada = (cap: Capitulo) => {
    setCapitulos(prev => [...prev, cap]);
    setSelectedCapId(cap.id);
    setCapRefreshKey(k => k + 1);
  };

  const handleCapEditada = (cap: Capitulo) => {
    setCapitulos(prev => prev.map(c => c.id === cap.id ? cap : c));
    setCapRefreshKey(k => k + 1);
    setEditandoCap(null);
  };

  const handleLibroEditado = (libro: Libro) => {
    setLibros(prev => prev.map(l => l.id === libro.id ? libro : l));
    setEditandoLibro(null);
  };

  const handleCapEliminada = async (id: string, libroId: string) => {
    try {
      await capDelete(id);
      if (selectedCapId === id) setSelectedCapId(null);
      setCapRefreshKey(k => k + 1);
    } catch {}
  };

  const sidebarContent = (
    <>
      {selectedLibroId && (
        <div className="px-2 pb-3">
          <button onClick={() => setShowNuevoCap(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
            <Plus size={12}/> Nuevo Capítulo
          </button>
        </div>
      )}
      {loadingLibros ? (
        <div className="flex items-center justify-center py-12 text-primary/30"><Loader2 className="animate-spin" size={20}/></div>
      ) : librosFiltrados.length === 0 ? (
        <div className="text-center py-10 text-primary/25"><p className="text-xs font-black uppercase tracking-widest">Sin resultados</p></div>
      ) : librosFiltrados.map(libro => (
        <LibroItem key={libro.id + capRefreshKey} libro={libro} selectedCapId={selectedCapId}
          onSelectCap={handleSelectCap} expanded={expandedLibros.has(libro.id)}
          onToggle={() => toggleExpanded(libro.id)} onEditCap={setEditandoCap}
          onDeleteCap={handleCapEliminada} onEditLibro={setEditandoLibro} />
      ))}
    </>
  );

  return (
    <>
      <EstudioLayout
        titulo="Estudio de Capítulos" icono={<BookOpen size={12}/>}
        colapsadoLabel="Biblioteca" onRefetch={refetch}
        busqueda={busqueda} onBusquedaChange={setBusqueda}
        busquedaPlaceholder="Buscar libro…"
        sidebarContent={sidebarContent} isOffline={listaOffline}
        footerLeft={`${libros.length} libros`}
        footerRight={selectedCapId ? (
          <button onClick={() => setFocusMode(m => !m)} title="Modo foco" className="text-primary/25 hover:text-primary transition-colors">
            {focusMode ? <Minimize2 size={11}/> : <Maximize2 size={11}/>}
          </button>
        ) : undefined}
        sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen}
      >
        {selectedCapId && selectedLibroId ? (
          <PanelEditor key={selectedCapId} capId={selectedCapId} libroId={selectedLibroId}
            onCapitulosChange={() => setCapRefreshKey(k => k + 1)}
            focusMode={focusMode} onToggleFocus={() => setFocusMode(m => !m)} />
        ) : (
          <EmptyEstudio icono={<BookOpen size={52} strokeWidth={1}/>} titulo="Estudio de Capítulos" subtitulo="Expande un libro y selecciona un capítulo" />
        )}
      </EstudioLayout>
      {showNuevoCap && selectedLibroId && <ModalNuevoCapitulo libroId={selectedLibroId} ordenSiguiente={capitulos.length + 1} onCreated={handleCapCreada} onClose={() => setShowNuevoCap(false)} />}
      {editandoLibro && <ModalEditarLibro libro={editandoLibro} onSaved={handleLibroEditado} onClose={() => setEditandoLibro(null)} />}
      {editandoCap && <ModalEditarCapitulo cap={editandoCap} onSaved={handleCapEditada} onClose={() => setEditandoCap(null)} />}
    </>
  );
}