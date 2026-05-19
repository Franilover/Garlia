"use client";
import { MotionDiv } from '@/components/ui/Motion';

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, UserCircle2,
  Loader2,
  Plus, Save, Search,
  Trash2, WifiOff, X, Check, CheckCircle2, AlertCircle,
  Eye, EyeOff, Minimize2, Clock, Hash,
  AlignLeft, Calendar, BookMarked, Pencil, MoreHorizontal, Globe, Lock, Timer, Zap,
  Mic2, MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import {
  useLastOpenedId, useDraftRestore, DraftRestoreBanner, usePersonajes,
} from "@/hooks/useEditorShared";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { db } from "@/lib/api/client/db";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { enqueueOperation, isReallyOnline } from "@/hooks/data/useOfflineSync";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { BannerOffline, EmptyEstudio, ModalBase, SaveIndicator, CampoInput, BotonSubmit, normalize } from "@/components/templates/EstudioTemplates";
import { SoundPicker } from "@/components/forms/SoundPicker";
import { EntidadPicker } from "@/components/forms/EntidadPicker";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SnippetToolbar, ModalDrop, ModalSonido, ModalSection, ModalChoice, ModalUseItem, ModalImagen } from "./snippets/SnippetToolbar";
import { MarkdownEditor, renderMarkdown, renderMathInElement, PROSE_STYLES } from "@/components/forms/MarkdownEditor";
import type { CommandItem as MdCommandItem, SnippetAction } from "@/components/forms/MarkdownEditor";

type Libro = {
  id: string;
  titulo: string;
  sinopsis?: string;
  portada_url?: string;
  estado?: string;
  visibilidad?: "publico" | "programado" | "oculto";
  fecha_publicacion?: string;
  fecha_proximo_capitulo?: string;
  reino_id?: string | null;
  categoria?: string | null;
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
  reino_id?: string | null;
  narrador_id?: string | null;
  status?: "pending" | "synced";
  deleted?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "pending" | "error";

const TABLA_CAPS = "capitulos";

const ESTADO_COLOR: Record<string, string> = {
  "EN PROCESO": "border border-[color-mix(in_srgb,var(--callout-warning-border)_40%,transparent)] text-[var(--callout-warning-title)] bg-[color-mix(in_srgb,var(--callout-warning-border)_12%,transparent)]",
  FINALIZADO:   "border border-[color-mix(in_srgb,var(--callout-success-border)_40%,transparent)] text-[var(--callout-success-title)] bg-[color-mix(in_srgb,var(--callout-success-border)_12%,transparent)]",
  BORRADOR:     "border border-primary/20 text-primary/40 bg-primary/10",
  PAUSADO:      "border border-primary/20 text-primary/40 bg-primary/10",
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


const SAVE_TIMEOUT_MS = 10_000;

async function capUpdateContenido(id: string, contenido: string): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!(await isReallyOnline())) {
    await dexieCapWrite([{ ...existing, id, contenido, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    return;
  }
  try {
    // FIX: timeout de 10s para que nunca quede colgado
    const updatePromise = librosQueries.updateContenido(id, contenido);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("save timeout")), SAVE_TIMEOUT_MS)
    );
    const res = await Promise.race([updatePromise, timeoutPromise]) as any;
    if (res?.error) throw res.error;
    if (existing) await dexieCapWrite([{ ...existing, contenido, status: "synced" }]);
  } catch {
    await dexieCapWrite([{ ...existing, id, contenido, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    throw new Error("offline");
  }
}

async function capUpdateMeta(id: string, fields: Partial<Capitulo>): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!(await isReallyOnline())) {
    await dexieCapWrite([{ ...existing, id, ...fields, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, fields);
    return;
  }
  try {
    // FIX: timeout de 10s para que nunca quede colgado
    const updatePromise = supabase.from(TABLA_CAPS).update(fields).eq("id", id);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("save timeout")), SAVE_TIMEOUT_MS)
    );
    const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;
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
  if (!(await isReallyOnline())) {
    const tmpId = crypto.randomUUID();
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
    const tmpId = crypto.randomUUID();
    const row = { ...base, id: tmpId, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "upsert", tmpId, row);
    return row;
  }
}

async function capDelete(id: string): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!(await isReallyOnline())) {
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

    if (!(await isReallyOnline())) {
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
      if (error) {
        // FIX: solo marcar offline si es error de red, no de API/permisos
        const isNetworkError =
          error?.message?.toLowerCase().includes("failed to fetch") ||
          error?.message?.toLowerCase().includes("network") ||
          error?.code === "PGRST000";
        if (isNetworkError) setIsOffline(true);
        setLoading(false);
        return;
      }
      const caps = (data || []) as Capitulo[];
      setCapitulos(caps);
      setIsOffline(false);
      await dexieCapWrite(caps.map((c) => ({ ...c, status: "synced" })));
    } catch (err: any) {
      // FIX: solo marcar offline si es realmente error de red
      const msg = err?.message?.toLowerCase() ?? "";
      const isNetworkError =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed");
      setIsOffline(isNetworkError);
      if (local.length === 0) setCapitulos(await dexieCapRead(id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (libroId) load(libroId);
    else { setCapitulos([]); setIsOffline(false); }
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

    if (!(await isReallyOnline())) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    // Optimistic: asumimos online hasta que comprobemos lo contrario
    setIsOffline(false);

    try {
      const fetchPromise = supabase.from(TABLA_CAPS).select("*").eq("id", id).single();
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        // Solo marcamos offline si no tenemos datos locales para mostrar
        setIsOffline(!local);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) {
        // FIX: distinguir error de red vs error de API (permisos, RLS, 400, etc.)
        // Un error de API NO es "offline" — tenemos conexión, solo falló la query
        const isNetworkError =
          error?.message?.toLowerCase().includes("failed to fetch") ||
          error?.message?.toLowerCase().includes("network") ||
          error?.code === "PGRST000";
        if (isNetworkError) {
          setIsOffline(true);
        }
        // En cualquier caso (network o API error), si tenemos datos locales los mostramos
        // pero NO marcamos offline por un error de permisos o similar
        setLoading(false);
        return;
      }

      if (local?.status === "pending" && local.contenido !== data.contenido) {
        setCap({ ...data, contenido: local.contenido, status: "pending" });
      } else {
        setCap(data as Capitulo);
        await dexieCapWrite([{ ...data, status: "synced" }]);
      }
      // Llegamos aquí = fetch exitoso = estamos online
      setIsOffline(false);
    } catch (err: any) {
      // FIX: solo marcar offline si es realmente un error de red
      const msg = err?.message?.toLowerCase() ?? "";
      const isNetworkError =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed");
      setIsOffline(isNetworkError);
      if (!local) setCap(await dexieCapGet(id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (capId) load(capId);
    else { setCap(null); setIsOffline(false); }
  }, [capId, load]);

  useEffect(() => {
    const h = () => { if (capId) { setIsOffline(false); load(capId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [capId, load]);

  return { cap, setCap, loading, isOffline, reload: () => capId && load(capId) };
}

const EstadisticasEscritura = ({ texto, compact = false }: { texto: string; compact?: boolean }) => {
  const palabras  = wordCount(texto);
  const caracteres = texto.length;
  const lectura   = readingTime(palabras);
  if (compact) {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/25">
        <Hash size={9}/>{palabras.toLocaleString()}
        <span className="text-primary/15">·</span>
        <Clock size={9}/>{lectura}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
      <span className="flex items-center gap-1"><Hash size={9}/>{palabras.toLocaleString()} pal.</span>
      <span className="hidden sm:flex items-center gap-1"><AlignLeft size={9}/>{caracteres.toLocaleString()} car.</span>
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
  const [hovered,  setHovered]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const btnOpacity = menuOpen ? 1 : hovered ? 0.55 : 0;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "6px 32px 6px 10px",
          borderRadius: 7,
          border: "1px solid",
          borderColor: selected
            ? "var(--primary)"
            : hovered
            ? "color-mix(in srgb, var(--primary) 18%, transparent)"
            : "transparent",
          background: selected
            ? "var(--primary)"
            : hovered
            ? "color-mix(in srgb, var(--primary) 5%, transparent)"
            : "transparent",
          color: selected ? "var(--bg-main)" : "var(--primary)",
          fontSize: 10,
          fontFamily: "var(--font-mono, monospace)",
          fontWeight: 900,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
          cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Número de orden */}
          <span style={{
            fontSize: 8,
            opacity: selected ? 0.6 : 0.35,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}>
            {String(cap.orden).padStart(2, "0")}
          </span>
          {/* Indicadores */}
          {cap.status === "pending" && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--callout-info-border)", flexShrink: 0 }} title="Pendiente de sync" />
          )}
          {cap.visibilidad === "oculto" && (
            <Lock size={8} style={{ opacity: selected ? 0.5 : 0.3, flexShrink: 0 }} />
          )}
          {cap.visibilidad === "programado" && cap.fecha_publicacion && new Date(cap.fecha_publicacion) > new Date() && (
            <Timer size={8} style={{ opacity: selected ? 0.5 : 0.3, flexShrink: 0 }} />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cap.titulo_capitulo}
          </span>
        </span>
      </button>

      {/* Menú de tres puntos */}
      <div ref={menuRef} style={{ position: "absolute", top: 4, right: 4 }}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "none",
            background: menuOpen
              ? "color-mix(in srgb, var(--primary) 12%, transparent)"
              : "transparent",
            color: selected ? "var(--bg-main)" : "var(--primary)",
            opacity: btnOpacity,
            cursor: "pointer",
            transition: "opacity 0.1s, background 0.1s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 12%, transparent)";
          }}
          onMouseLeave={e => {
            if (!menuOpen) {
              e.currentTarget.style.opacity = hovered ? "0.55" : "0";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <MoreHorizontal size={11} />
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 50,
            minWidth: 148,
            background: "var(--white-custom)",
            border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
            borderRadius: 8,
            boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
            padding: 3,
            overflow: "hidden",
          }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cap); }}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: "var(--text-on-card)", opacity: 0.65, cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.background = "transparent"; }}
            >
              <Pencil size={10} /> Editar
            </button>
            <div style={{ height: 1, background: "color-mix(in srgb, var(--primary) 10%, transparent)", margin: "2px 6px" }} />
            <button
              onClick={async e => {
                e.stopPropagation(); setMenuOpen(false);
                const ok = await confirm({ message: `¿Eliminar "${cap.titulo_capitulo}"?`, danger: true });
                if (ok) onDelete(cap.id);
              }}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: "var(--accent)", opacity: 0.7, cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
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
  libro, selectedCapId, onSelectCap, expanded, onToggle, onEditCap, onDeleteCap, onEditLibro, onNuevoCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
  onNuevoCap: (libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(expanded ? libro.id : null);
  const [rowHovered, setRowHovered] = useState(false);

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}
        onMouseEnter={() => setRowHovered(true)}
        onMouseLeave={() => setRowHovered(false)}
      >
        <button
          onClick={onToggle}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 7, textAlign: "left",
            background: expanded ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
            border: "1px solid",
            borderColor: expanded
              ? "color-mix(in srgb, var(--primary) 14%, transparent)"
              : "transparent",
            cursor: "pointer", transition: "background 0.12s, border-color 0.12s",
          }}
          onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; }}
          onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
        >
          <BookMarked size={11} style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }} />
          <span style={{
            flex: 1, fontSize: 10, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            fontStyle: "italic", textTransform: "uppercase" as const, letterSpacing: "0.06em",
            color: "var(--primary)", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {libro.titulo}
          </span>
          {libro.estado && (
            <span style={{
              fontSize: 7, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase" as const, letterSpacing: "0.08em",
              padding: "1px 5px", borderRadius: 3, border: "1px solid", flexShrink: 0,
              ...(libro.estado === "FINALIZADO"
                ? { borderColor: "color-mix(in srgb, var(--callout-success-border) 40%, transparent)", color: "var(--callout-success-title)", background: "color-mix(in srgb, var(--callout-success-border) 8%, transparent)" }
                : libro.estado === "EN PROCESO"
                ? { borderColor: "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)", color: "var(--callout-warning-title)", background: "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)" }
                : { borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", background: "transparent", opacity: 0.4 }),
            }}>
              {libro.estado === "EN PROCESO" ? "WIP" : libro.estado === "FINALIZADO" ? "done" : "…"}
            </span>
          )}
          {expanded
            ? <ChevronDown size={10} style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }} />
          }
        </button>

        {/* Botón editar libro */}
        <button
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditLibro(libro); }}
          title="Editar libro"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: 5, border: "none", flexShrink: 0,
            background: "transparent", color: "var(--primary)",
            opacity: rowHovered ? 0.45 : 0, cursor: "pointer",
            transition: "opacity 0.1s, background 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = rowHovered ? "0.45" : "0"; e.currentTarget.style.background = "transparent"; }}
        >
          <Pencil size={10} />
        </button>
      </div>

      {expanded && (
        <div style={{
          marginLeft: 16, paddingLeft: 12,
          borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          marginTop: 4,
        }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--primary)", opacity: 0.2 }} />
            </div>
          ) : capitulos.length === 0 ? (
            <p style={{
              fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.12em",
              color: "var(--primary)", opacity: 0.2, padding: "8px 6px",
            }}>Sin capítulos</p>
          ) : capitulos.map(cap => (
            <CapituloItem
              key={cap.id}
              cap={cap}
              selected={selectedCapId === cap.id}
              onClick={() => onSelectCap(libro.id, cap.id)}
              onEdit={onEditCap}
              onDelete={id => onDeleteCap(id, libro.id)}
            />
          ))}
          <div style={{ paddingTop: 4, paddingBottom: 2 }}>
            <button
              onClick={() => onNuevoCap(libro.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 5, padding: "6px 0", borderRadius: 6,
                border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
                background: "transparent",
                fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: "var(--primary)", opacity: 0.3, cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s, border-color 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 30%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.3"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 15%, transparent)"; }}
            >
              <Plus size={9} /> Nuevo capítulo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

      {}
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

      {}
      {open && (
        <div
          className="border rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            background: "var(--bg-main)",
          }}
        >
          {}
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

          {}
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

// ─── SelectorReino ────────────────────────────────────────────────────────────
type Reino = { id: string; nombre: string };

function useReinos() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("reinos")
      .select("id, nombre")
      .eq("oculto", false)
      .order("nombre", { ascending: true })
      .then(({ data }) => {
        setReinos((data ?? []) as Reino[]);
        setLoading(false);
      });
  }, []);
  return { reinos, loading };
}

const SelectorReino = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) => {
  const { reinos, loading } = useReinos();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = reinos.find(r => r.id === value) ?? null;

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-2">
        <MapPin size={10} />
        Reino / Ubicación
      </label>
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
          <MapPin size={12} className="opacity-50 shrink-0" />
          <span className="font-black uppercase truncate">
            {selected ? selected.nombre : loading ? "Cargando…" : "Sin reino asignado"}
          </span>
        </span>
        <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="border rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            background: "var(--bg-main)",
          }}
        >
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
          <div className="max-h-48 overflow-y-auto">
            {reinos.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">Sin reinos</p>
            ) : reinos.map(r => {
              const sel = value === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange(r.id); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                  style={{ color: sel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                >
                  <span className="flex items-center gap-2">
                    <MapPin size={10} className="opacity-40 shrink-0" />
                    {r.nombre}
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

// Versión de DIALOG_SNIPPETS compatible con el menú "add" del MarkdownEditor
const DIALOG_COMMANDS: MdCommandItem[] = [
  { id: "dial-guion",    label: "Guión de diálogo",          description: "— (inicia línea de diálogo)",           keywords: ["dial", "guion", "—", "add"],   icon: "—",   snippet: "— " },
  { id: "dial-acotac",  label: "Acotación entre guiones",   description: "— … — (acotación narrativa)",           keywords: ["acot", "dial", "—", "add"],   icon: "—…—", snippet: "— … —" },
  { id: "dial-comillas", label: "Comillas angulares «»",     description: "«texto» (estilo literario)",            keywords: ["comi", "angul", "«»", "add"],  icon: "«»",  snippet: "«»", cursorOffset: 1 },
  { id: "dial-linea",   label: "Línea de diálogo completa", description: "— (línea entera lista para escribir)",  keywords: ["linea", "línea", "dial", "add"], icon: "—…",  snippet: "— " },
  { id: "dial-puntos",  label: "Puntos suspensivos",        description: "… (suspensivos tipográficos)",          keywords: ["punt", "susp", "…", "add"],    icon: "…",   snippet: "…" },
  { id: "dial-endash",  label: "Guión corto (en-dash)",     description: "– (en-dash tipográfico)",               keywords: ["endash", "corto", "–", "add"], icon: "–",   snippet: "–" },
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
  <div className="shrink-0 flex items-center gap-1 px-4 sm:px-8 py-1.5 border-b border-primary/5 flex-wrap">
    <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 mr-1">Diálogo</span>
    {DIALOG_SNIPPETS.map((s) => (
      <button
        key={s.label}
        title={s.title}
        type="button"
        onMouseDown={(e) => {
          
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

/** Renderiza markdown del contenido del capítulo — usado en la vista previa del editor */
const MarkdownPreviewPane = ({ contenido }: { contenido: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const html = React.useMemo(() => renderMarkdown(contenido), [contenido]);
  React.useEffect(() => { renderMathInElement(ref.current); }, [html]);
  return (
    <div
      ref={ref}
      className="prose-mundo lector-texto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

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
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [openSnippetModal, setOpenSnippetModal] = useState<"drop" | "choice" | "use" | "section" | "sound" | "imagen" | null>(null);
  const timer            = useRef<any>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const scrollRef        = useRef<HTMLDivElement>(null);
  const caretMirrorRef   = useRef<HTMLDivElement>(null);
  const mdInsertRef      = useRef<((text: string) => void) | null>(null);
  // FIX: guard para no actualizar estado después de desmontar/cambiar capítulo
  const isMountedRef     = useRef(true);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Limpiar el timer de guardado al desmontar (cambio de capítulo)
      clearTimeout(timer.current);
    };
  }, []);

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

  
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [contenido]);

  
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
    container.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
  }, []);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    if (!isMountedRef.current) return; // guard: capítulo ya cambió
    setSaveStatus("saving");
    draft.save(val);
    try {
      await capUpdateContenido(capId, val);
      if (!isMountedRef.current) return; // guard post-await
      setCap(prev => prev ? { ...prev, contenido: val } : prev);
      draft.clear();
      const stillOnline = await isReallyOnline();
      setSaveStatus(stillOnline ? "saved" : "pending");
      if (stillOnline) setTimeout(() => {
        if (isMountedRef.current) setSaveStatus("idle");
      }, 2500);
    } catch {
      if (!isMountedRef.current) return; // guard post-await
      setSaveStatus("pending");
      // FIX: auto-limpiar "pending/error" después de 5s para no quedar atascado
      setTimeout(() => {
        if (isMountedRef.current) setSaveStatus(s => s === "pending" ? "idle" : s);
      }, 5000);
    }
  }, [capId, setCap, draft]);

  const onChange = (val: string) => {
    setContenido(val);
    draft.save(val);
    setSaveStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 2000);
    
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) requestAnimationFrame(() => centerCursor());
  };

  // ── Acción de snippets en el preview ─────────────────────────────────────
  const handleSnippetAction = useCallback((action: SnippetAction) => {
    switch (action.type) {
      case "choice": {
        // Buscar si el target es un capId conocido
        const cap = listaSnippetCaps.find(c => c.id === action.target);
        if (cap) {
          // Navegar al capítulo
          window.dispatchEvent(new CustomEvent("snippet:navigate-cap", { detail: { capId: action.target } }));
        } else {
          // Saltar a sección dentro del mismo documento (scroll)
          const el = document.getElementById(`section-${action.target}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        break;
      }
      case "section": {
        // La sección es solo un ancla visual; al hacer click, resaltarla brevemente
        const el = document.getElementById(`section-${action.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("snip-section--highlight");
          setTimeout(() => el.classList.remove("snip-section--highlight"), 1200);
        }
        break;
      }
      case "use":
      case "drop":
      case "sound":
      case "img":
      case "float":
        // Estos pueden extenderse más adelante; por ahora no hacen nada en el editor
        break;
    }
  }, [listaSnippetCaps]);

  // ── Comandos del menú "add" para los snippets interactivos ───────────────
  const snippetCommands: MdCommandItem[] = useMemo(() => [
    {
      id: "snip-drop",
      label: "Drop (entidad)",
      description: "Inserta personaje, criatura o ítem interactivo",
      keywords: ["drop", "enti", "personaj", "criatur", "item", "add"],
      icon: "⚔️",
      action: () => setOpenSnippetModal("drop"),
    },
    {
      id: "snip-imagen",
      label: "Imagen",
      description: "Inserta imagen inline o flotante [[img|…]]",
      keywords: ["img", "imagen", "foto", "imag", "add"],
      icon: "🖼️",
      action: () => setOpenSnippetModal("imagen"),
    },
    {
      id: "snip-choice",
      label: "Choice (decisión)",
      description: "Botón de decisión [[choice|texto|capítulo]]",
      keywords: ["choi", "choice", "decis", "boton", "botón", "add"],
      icon: "🔀",
      action: () => setOpenSnippetModal("choice"),
    },
    {
      id: "snip-use",
      label: "Use Ítem",
      description: "Interacción con ítem del inventario [[use|…]]",
      keywords: ["use", "item", "ítem", "inven", "add"],
      icon: "🖱️",
      action: () => setOpenSnippetModal("use"),
    },
    {
      id: "snip-section",
      label: "Sección",
      description: "Marca de sección para choices [[section|id]]",
      keywords: ["secc", "section", "ancora", "add"],
      icon: "📌",
      action: () => setOpenSnippetModal("section"),
    },
    {
      id: "snip-sound",
      label: "Sonido",
      description: "Inserta un efecto de sonido o música",
      keywords: ["son", "sound", "music", "audio", "add"],
      icon: "🎵",
      action: () => setOpenSnippetModal("sound"),
    },
    {
      id: "snip-cita",
      label: "Cita",
      description: "[[cita|Texto — Fuente]]",
      keywords: ["cita", "quote", "add"],
      icon: "«»",
      snippet: "[[cita|Texto de la cita — Fuente]]",
    },
    {
      id: "snip-parrafo",
      label: "Párrafo",
      description: "Salto de párrafo doble",
      keywords: ["parr", "párr", "salto", "add"],
      icon: "¶",
      snippet: " ",
    },
  ], []);

  // Todos los extraCommands juntos: snippets interactivos + diálogo
  const extraCommands: MdCommandItem[] = useMemo(
    () => [...snippetCommands, ...DIALOG_COMMANDS],
    [snippetCommands],
  );

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

  
  const narradorLabel = cap.narrador_id ? null : null; 

  const palabras = wordCount(contenido);

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {}
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
                  <Eye size={14} className="text-primary/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 italic">
                    Vista previa — {cap?.titulo_capitulo}
                  </span>
                  {cap?.visibilidad !== "publico" && (
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--callout-warning-border)_30%,transparent)] bg-[color-mix(in_srgb,var(--callout-warning-border)_10%,transparent)] text-[var(--callout-warning-title)] tracking-wide">
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
                <style>{PROSE_STYLES}</style>
                <div className="max-w-2xl mx-auto px-8 py-12">
                  <h1 className="text-3xl font-black uppercase italic tracking-tight text-primary mb-8 leading-tight">
                    {cap?.titulo_capitulo}
                  </h1>
                  {contenido
                    ? <MarkdownPreviewPane contenido={contenido} />
                    : <span className="text-primary/25 italic text-sm">Sin contenido aún…</span>
                  }
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
        <div className="shrink-0 flex items-center gap-2 px-4 sm:px-8 py-2 bg-[color-mix(in_srgb,var(--callout-info-border)_8%,transparent)] border-b border-[color-mix(in_srgb,var(--callout-info-border)_15%,transparent)] text-[9px] font-black uppercase tracking-widest text-[var(--callout-info-title)]" style={{ opacity: 0.7 }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--callout-info-border)]"/>
          Cambios pendientes de sincronizar
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-primary/8 space-y-3">

          {}
          <div className="flex items-start gap-2">
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
                  className="flex-1 bg-transparent text-lg sm:text-2xl font-black uppercase italic tracking-tight text-primary outline-none border-b-2 border-primary/30 focus:border-primary pb-1"
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
                  className="flex-1 text-lg sm:text-2xl font-black uppercase italic tracking-tight text-primary leading-tight cursor-pointer hover:text-primary/70 transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {cap.titulo_capitulo}
                </h1>
                <button onClick={() => setEditingTitle(true)} className="shrink-0 p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all mt-0.5">
                  <Pencil size={12}/>
                </button>
              </div>
            )}

            {}
            {/* Desktop actions */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <button onClick={() => doSave(contenido)} disabled={saveStatus === "saving"}
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30" title="Guardar (Ctrl+S)">
                <Save size={14}/>
              </button>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all" title="Eliminar capítulo">
                <Trash2 size={13}/>
              </button>
            </div>

            {}
            {/* Mobile: save + delete */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              <SaveIndicator status={saveStatus}/>
              <button onClick={() => doSave(contenido)} disabled={saveStatus === "saving"}
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30">
                <Save size={14}/>
              </button>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all">
                <Trash2 size={14}/>
              </button>
            </div>
          </div>

          {}
          {/* Meta row — compact on mobile */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary/30 tracking-widest flex-wrap min-w-0 overflow-x-auto">
              <span className="flex items-center gap-1 shrink-0">
                <Hash size={9}/> {cap.orden}
              </span>

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
                    <span className="hidden sm:inline">
                      {fecha
                        ? new Date(fecha) > new Date()
                          ? `Prog. · ${new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                          : new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                        : "Sin fecha"
                      }
                    </span>
                    <span className="sm:hidden">
                      {fecha ? new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Fecha"}
                    </span>
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

            <div className="flex items-center gap-2 shrink-0">
              <EstadisticasEscritura texto={contenido} compact={true}/>
              {/* SaveIndicator only on desktop here; mobile has it in the actions row */}
              <span className="hidden sm:block"><SaveIndicator status={saveStatus}/></span>
            </div>
          </div>
        </div>
      )}

      {focusMode && (
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-8 py-2 sm:py-3 border-b border-primary/5">
          <span className="text-xs font-black uppercase italic tracking-tight text-primary/40 truncate max-w-[180px] sm:max-w-xs">
            {cap.titulo_capitulo}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <EstadisticasEscritura texto={contenido} compact={true}/>
            <SaveIndicator status={saveStatus}/>
            <button onClick={onToggleFocus} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all">
              <Minimize2 size={13}/>
            </button>
          </div>
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-4 sm:px-8 py-1.5 border-b border-primary/5">
          <span className="text-[8px] font-black uppercase tracking-widest text-primary/20">
            Escribe <kbd className="px-1.5 py-0.5 rounded bg-primary/8 text-primary/40 font-mono not-italic">add</kbd> para insertar elementos · Ctrl+S guarda
          </span>
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto relative ${focusMode ? "px-5 sm:px-16 py-8 sm:py-12" : "px-4 sm:px-8 py-4 sm:py-6"}`} style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Mirror oculto para caret-centering */}
        <div ref={caretMirrorRef} aria-hidden="true" />
        <div className={focusMode ? "max-w-3xl mx-auto w-full" : ""}>
          <MarkdownEditor
            value={contenido}
            onChange={onChange}
            placeholder="Empieza a escribir…"
            defaultMode={focusMode ? "edit" : "split"}
            rows={focusMode ? 30 : 20}
            extraCommands={extraCommands}
            insertRef={mdInsertRef}
            onSnippetAction={handleSnippetAction}
          />
        </div>
      </div>

      {!focusMode && (
        <div className="shrink-0 px-3 sm:px-8 py-2 sm:py-2.5 border-t border-primary/5 flex items-center justify-between">
          <EstadisticasEscritura texto={contenido}/>
          <span className="hidden sm:block text-[9px] font-black uppercase text-primary/20 tracking-widest">Ctrl+S para guardar</span>
        </div>
      )}
      <ConfirmModal />

      {/* ── Modales de snippets (abiertos desde el menú "add") ── */}
      {openSnippetModal === "drop"    && <ModalDrop    onInsert={s => mdInsertRef.current?.(s)} onClose={() => setOpenSnippetModal(null)} />}
      {openSnippetModal === "imagen"  && <ModalImagen  onInsert={s => mdInsertRef.current?.(s)} onClose={() => setOpenSnippetModal(null)} />}
      {openSnippetModal === "choice"  && <ModalChoice  onInsert={s => mdInsertRef.current?.(s)} onClose={() => setOpenSnippetModal(null)} listaCapitulos={listaSnippetCaps} />}
      {openSnippetModal === "use"     && <ModalUseItem onInsert={s => mdInsertRef.current?.(s)} onClose={() => setOpenSnippetModal(null)} listaCapitulos={listaSnippetCaps} />}
      {openSnippetModal === "section" && <ModalSection onInsert={s => mdInsertRef.current?.(s)} onClose={() => setOpenSnippetModal(null)} />}
      {openSnippetModal === "sound"   && <ModalSonido  onInsert={s => mdInsertRef.current?.(s)} onClose={() => setOpenSnippetModal(null)} />}
    </div>
  );
};

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
  const [reinoId,       setReinoId]       = useState<string | null>(cap.reino_id ?? null);
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
        reino_id: reinoId,
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
        {}
        <SelectorNarrador value={narradorId} onChange={setNarradorId} />
        <SelectorReino value={reinoId} onChange={setReinoId} />
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
  const [reinoId,       setReinoId]       = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const nuevo = await capCreate(libroId, titulo, ordenSiguiente, visibilidad, fecha || undefined, narradorId);
      const extraFields: Partial<Capitulo> = {};
      if (personajesIds.length > 0) extraFields.personajes_ids = personajesIds;
      if (reinoId) extraFields.reino_id = reinoId;
      if (Object.keys(extraFields).length > 0) {
        await capUpdateMeta(nuevo.id, extraFields);
        Object.assign(nuevo, extraFields);
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
        <SelectorReino value={reinoId} onChange={setReinoId} />
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

function SelectorImagenPortada({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Portada</label>
      <div
        onClick={() => setOpen(true)}
        className="relative aspect-[2/3] w-28 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 cursor-pointer group"
      >
        {value ? (
          <>
            <img src={value} alt="portada" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              <BookMarked size={16} className="text-white" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Cambiar</span>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={9} className="text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/25 hover:text-primary/50 transition-colors">
            <BookMarked size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center px-1">Elegir portada</span>
          </div>
        )}
      </div>
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
                <BookMarked size={11} /> Portada del libro
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

const ModalNuevoLibro = ({
  onCreated, onClose,
}: {
  onCreated: (titulo: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [titulo,  setTitulo]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await onCreated(titulo);
      onClose();
    } catch {
      setErrorMsg("No se pudo crear el libro. Inténtalo de nuevo.");
    }
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <BookMarked size={12}/> Nuevo Libro
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="TÍTULO DEL LIBRO…" autoFocus />
        {errorMsg && <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">{errorMsg}</p>}
        <div className="pt-1">
          <BotonSubmit
            loading={saving}
            disabled={!titulo.trim()}
            labelLoading={<><Loader2 size={13} className="animate-spin"/>Creando…</>}
            labelNormal={<><Plus size={13}/>Crear Libro</>}
          />
        </div>
      </form>
    </ModalBase>
  );
};

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
  const [reinoId,     setReinoId]     = useState<string | null>(libro.reino_id ?? null);
  const [categoria,   setCategoria]   = useState(libro.categoria ?? "");
  const [saving,      setSaving]      = useState(false);

  const ESTADOS = ["BORRADOR", "EN PROCESO", "FINALIZADO", "PAUSADO"];
  const CATEGORIAS = ["Libro", "Extra"];

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
        reino_id: reinoId,
        categoria: categoria.trim() || null,
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
        <SelectorImagenPortada value={portada} onChange={setPortada} />
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
        <SelectorReino value={reinoId} onChange={setReinoId} />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Categoría</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button key={cat} type="button" onClick={() => setCategoria(categoria === cat ? "" : cat)}
                className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide border transition-all ${
                  categoria === cat
                    ? "bg-primary text-btn-text border-primary shadow-sm"
                    : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary/70"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
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

// ─── LibroColumna ─────────────────────────────────────────────────────────────
// Each book is rendered as a vertical column in the horizontal browser

// ─── LibroCard (mobile grid view) ────────────────────────────────────────────
const LibroCard = ({
  libro, selectedCapId, onSelectCap, onEditCap, onDeleteCap, onEditLibro, onNuevoCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
  onNuevoCap: (libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(libro.id);
  const isSelected = capitulos.some(c => c.id === selectedCapId);

  return (
    <div
      className="flex flex-col rounded-xl border overflow-hidden transition-all"
      style={{
        borderColor: isSelected
          ? "color-mix(in srgb, var(--primary) 25%, transparent)"
          : "color-mix(in srgb, var(--primary) 10%, transparent)",
        background: isSelected
          ? "color-mix(in srgb, var(--primary) 5%, transparent)"
          : "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      {/* Cabecera */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b shrink-0"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {libro.portada_url ? (
          <img src={libro.portada_url} alt="" className="w-4 h-4 rounded object-cover shrink-0 border border-primary/10" />
        ) : (
          <BookMarked size={9} className="text-primary/25 shrink-0" />
        )}
        <span className="flex-1 text-[8px] font-black uppercase italic tracking-tight text-primary/70 truncate leading-tight" title={libro.titulo}>
          {libro.titulo}
        </span>
        <button
          onClick={() => onEditLibro(libro)}
          className="shrink-0 p-0.5 rounded text-primary/20 hover:text-primary transition-all"
        >
          <Pencil size={8} />
        </button>
      </div>

      {/* Lista de capítulos (máx 4 visibles, scroll) */}
      <div className="flex-1 overflow-y-auto max-h-28 p-1 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 size={11} className="animate-spin text-primary/20" /></div>
        ) : capitulos.length === 0 ? (
          <p className="text-[8px] text-primary/20 font-black uppercase tracking-widest px-1 py-2 text-center">Sin caps</p>
        ) : capitulos.map(cap => (
          <button
            key={cap.id}
            onClick={() => onSelectCap(libro.id, cap.id)}
            className={`w-full text-left px-2 py-1 rounded-md text-[9px] font-bold truncate transition-all border ${
              selectedCapId === cap.id
                ? "bg-primary text-bg-main border-primary"
                : "border-transparent text-primary/60 hover:bg-primary/8 hover:text-primary"
            }`}
          >
            {cap.orden}. {cap.titulo_capitulo}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-1 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        <button
          onClick={() => onNuevoCap(libro.id)}
          className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-primary/12 text-[8px] font-black uppercase tracking-widest text-primary/20 hover:text-primary/50 hover:border-primary/25 hover:bg-primary/3 transition-all"
        >
          <Plus size={8} /> Cap
        </button>
      </div>
    </div>
  );
};

const LibroColumna = ({
  libro, selectedCapId, onSelectCap, onEditCap, onDeleteCap, onEditLibro, onNuevoCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
  onNuevoCap: (libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(libro.id);
  const [hdrHovered, setHdrHovered] = useState(false);
  const isSelected = capitulos.some(c => c.id === selectedCapId);

  return (
    <div
      style={{
        flexShrink: 0,
        width: 220,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        overflow: "hidden",
        background: isSelected
          ? "color-mix(in srgb, var(--primary) 3%, var(--bg-main))"
          : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Cabecera del libro */}
      <div
        style={{
          padding: "10px 10px 8px",
          borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
        onMouseEnter={() => setHdrHovered(true)}
        onMouseLeave={() => setHdrHovered(false)}
      >
        {/* Portada o ícono */}
        {libro.portada_url ? (
          <img
            src={libro.portada_url}
            alt=""
            style={{ width: 22, height: 30, borderRadius: 3, objectFit: "cover", flexShrink: 0, border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}
          />
        ) : (
          <div style={{
            width: 22, height: 30, borderRadius: 3, flexShrink: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          }}>
            <BookMarked size={10} style={{ color: "var(--primary)", opacity: 0.3 }} />
          </div>
        )}

        {/* Título */}
        <span style={{
          flex: 1,
          fontSize: 9,
          fontFamily: "var(--font-mono, monospace)",
          fontWeight: 900,
          fontStyle: "italic",
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          color: "var(--primary)",
          opacity: 0.8,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as any,
        }} title={libro.titulo}>
          {libro.titulo}
        </span>

        {/* Badge estado */}
        {libro.estado && (
          <span style={{
            fontSize: 7,
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 900,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            padding: "1px 5px",
            borderRadius: 3,
            border: "1px solid",
            flexShrink: 0,
            ...(libro.estado === "FINALIZADO"
              ? { borderColor: "color-mix(in srgb, var(--callout-success-border) 40%, transparent)", color: "var(--callout-success-title)", background: "color-mix(in srgb, var(--callout-success-border) 8%, transparent)" }
              : libro.estado === "EN PROCESO"
              ? { borderColor: "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)", color: "var(--callout-warning-title)", background: "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)" }
              : { borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 6%, transparent)", opacity: 0.5 }),
          }}>
            {libro.estado === "EN PROCESO" ? "WIP" : libro.estado === "FINALIZADO" ? "done" : "…"}
          </span>
        )}

        {/* Botón editar libro */}
        <button
          onClick={() => onEditLibro(libro)}
          title="Editar libro"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20, borderRadius: 4, border: "none",
            background: "transparent", color: "var(--primary)",
            opacity: hdrHovered ? 0.5 : 0,
            cursor: "pointer", flexShrink: 0,
            transition: "opacity 0.1s, background 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = hdrHovered ? "0.5" : "0"; e.currentTarget.style.background = "transparent"; }}
        >
          <Pencil size={9} />
        </button>
      </div>

      {/* Lista de capítulos */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--primary)", opacity: 0.2 }} />
          </div>
        ) : capitulos.length === 0 ? (
          <p style={{
            fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--primary)", opacity: 0.2, textAlign: "center", padding: "12px 6px",
          }}>
            Sin capítulos
          </p>
        ) : capitulos.map(cap => (
          <CapituloItem
            key={cap.id}
            cap={cap}
            selected={selectedCapId === cap.id}
            onClick={() => onSelectCap(libro.id, cap.id)}
            onEdit={onEditCap}
            onDelete={id => onDeleteCap(id, libro.id)}
          />
        ))}
      </div>

      {/* Footer: nuevo capítulo */}
      <div style={{
        flexShrink: 0, padding: "6px",
        borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
      }}>
        <button
          onClick={() => onNuevoCap(libro.id)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 5, padding: "6px 0", borderRadius: 6,
            border: "1px dashed color-mix(in srgb, var(--primary) 18%, transparent)",
            background: "transparent",
            fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            textTransform: "uppercase" as const, letterSpacing: "0.1em",
            color: "var(--primary)", opacity: 0.3, cursor: "pointer",
            transition: "opacity 0.1s, background 0.1s, border-color 0.1s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "0.75";
            e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 35%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = "0.3";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 18%, transparent)";
          }}
        >
          <Plus size={9} /> Nuevo cap
        </button>
      </div>
    </div>
  );
};

export function EditorCapitulosPanel() {
  const {
    data:     libros,
    setData:  setLibros,
    loading:  loadingLibros,
    isOffline: listaOffline,
    refetch,
    addRow:   addLibro,
  } = useSupabaseData<Libro>("libros", {
    isAdmin: true,
    order: { campo: "created_at", asc: false },
  });

  const [lastCapId,   setLastCapId]   = useLastOpenedId("estudio-caps-last-cap");
  const [lastLibroId, setLastLibroId] = useLastOpenedId("estudio-caps-last-libro");

  const [selectedLibroId, _setSelectedLibroId]  = useState<string | null>(lastLibroId);
  const [selectedCapId,   _setSelectedCapId]    = useState<string | null>(lastCapId);

  const setSelectedLibroId = (id: string | null) => { _setSelectedLibroId(id); setLastLibroId(id); };
  const setSelectedCapId   = (id: string | null) => { _setSelectedCapId(id);   setLastCapId(id); };
  const [sidebarOpen,     setSidebarOpen]       = useState(true);
  const [focusMode,       setFocusMode]         = useState(false);
  const [busqueda,        setBusqueda]          = useState("");
  const [showNuevoCap,    setShowNuevoCap]      = useState(false);
  const [showNuevoLibro,  setShowNuevoLibro]    = useState(false);
  const [editandoCap,     setEditandoCap]       = useState<Capitulo | null>(null);
  const [capRefreshKey,   setCapRefreshKey]     = useState(0);
  const [editandoLibro,   setEditandoLibro]     = useState<Libro | null>(null);

  const { capitulos, setCapitulos, reload: reloadCaps } = useCapitulos(selectedLibroId);

  const librosFiltrados = useMemo(() =>
    libros.filter(l => !busqueda || normalize(l.titulo).includes(normalize(busqueda))),
    [libros, busqueda]
  );

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

  const handleLibroCreado = async (titulo: string) => {
    const { data, error } = await addLibro({
      titulo: titulo.trim().toUpperCase(),
      estado: "BORRADOR",
      visibilidad: "oculto",
    });
    if (error || !data) throw new Error(error ?? "Error al crear libro");
    setSelectedLibroId(data.id);
    setShowNuevoLibro(false);
  };

  const handleCapEliminada = async (id: string, libroId: string) => {
    try {
      await capDelete(id);
      if (selectedCapId === id) setSelectedCapId(null);
      setCapRefreshKey(k => k + 1);
    } catch {}
  };

  const bibliotecaAbierta = !selectedCapId || sidebarOpen;

  return (
    <>
      <div className="flex flex-col h-full">

        {/* ── Topbar ── */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderBottom: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            background: "var(--bg-main)",
          }}
        >
          {/* Brand - desktop */}
          <div className="hidden sm:flex" style={{ alignItems: "center", gap: 6, flexShrink: 0, borderRight: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)", paddingRight: 12, marginRight: 2 }}>
            <BookOpen size={12} style={{ color: "var(--primary)", opacity: 0.4 }} />
            <span style={{
              fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.14em",
              color: "var(--foreground)", opacity: 0.45,
            }}>
              Capítulos
            </span>
          </div>

          {/* Mobile: botón volver */}
          {selectedCapId && (
            <button
              onClick={() => { setSelectedCapId(null); setSidebarOpen(true); }}
              className="sm:hidden"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.12em",
                color: "var(--primary)", opacity: 0.5, background: "none", border: "none",
                cursor: "pointer", flexShrink: 0, transition: "opacity 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; }}
            >
              <ArrowLeft size={11} /> Libros
            </button>
          )}

          {/* Offline badge */}
          {listaOffline && (
            <span style={{
              display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
              fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--callout-warning-title)",
              border: "1px solid color-mix(in srgb, var(--callout-warning-border) 30%, transparent)",
              background: "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)",
              padding: "2px 8px", borderRadius: 20,
            }}>
              <WifiOff size={8} />
              <span className="hidden sm:inline">Offline</span>
            </span>
          )}

          {/* Buscador */}
          <div style={{
            flex: 1, height: 36, display: "flex", alignItems: "center",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            borderRadius: 8, overflow: "hidden", background: "var(--input-bg)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onFocus={() => {}}
            className="focus-within:[border-color:color-mix(in_srgb,var(--primary)_50%,transparent)]"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px", color: "var(--primary)", opacity: 0.45, flexShrink: 0 }}>
              <Search size={12} />
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={e => {
                const v = e.target.value;
                if (v.trim().toLowerCase() === "add") {
                  setBusqueda("");
                  setShowNuevoLibro(true);
                } else {
                  setBusqueda(v);
                }
              }}
              placeholder="buscar libro… (escribe «add» para añadir)"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "9px 0", fontSize: 12, fontFamily: "var(--font-mono, monospace)",
                color: "var(--input-text)", letterSpacing: "0.02em",
              }}
            />
            {busqueda && (
              <>
                <div style={{ width: 1, height: 16, background: "color-mix(in srgb, var(--primary) 18%, transparent)", flexShrink: 0, margin: "0 2px" }} />
                <button
                  onClick={() => setBusqueda("")}
                  title="Limpiar"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, marginRight: 3, borderRadius: 5, border: "none",
                    background: "transparent", color: "var(--primary)", opacity: 0.5, cursor: "pointer",
                    transition: "opacity 0.1s, background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.background = "transparent"; }}
                >
                  <X size={11} />
                </button>
              </>
            )}
          </div>

          {/* Botón nuevo libro */}
          <button
            onClick={() => setShowNuevoLibro(true)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "0 12px",
              height: 36, flexShrink: 0, whiteSpace: "nowrap",
              border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
              borderRadius: 6, background: "transparent",
              fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--primary)", opacity: 0.7, cursor: "pointer",
              transition: "opacity 0.15s, background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 30%, transparent)"; }}
          >
            <Plus size={11} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>


        </div>

        {/* ── Biblioteca de columnas (se colapsa cuando hay un cap abierto y sidebarOpen=false) ── */}
        <AnimatePresence initial={false}>
          {bibliotecaAbierta && (
            <motion.div
              key="biblioteca"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className={`overflow-hidden border-b ${selectedCapId ? "shrink-0" : "flex-1 sm:shrink-0 sm:flex-none"}`}
              style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              {/* ── Mobile: grid de 2 columnas ── */}
              <div
                className="sm:hidden overflow-y-auto p-2"
                style={{ height: selectedCapId ? "240px" : "100%" }}
              >
                <div className="grid grid-cols-2 gap-2">
                  {loadingLibros ? (
                    <div className="col-span-2 flex items-center justify-center py-8 text-primary/25">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : librosFiltrados.length === 0 ? (
                    <div className="col-span-2 flex items-center justify-center py-8 text-primary/20">
                      <p className="text-[8px] font-black uppercase tracking-widest">Sin resultados · escribe «add» para crear</p>
                    </div>
                  ) : librosFiltrados.map(libro => (
                    <LibroCard
                      key={libro.id + capRefreshKey}
                      libro={libro}
                      selectedCapId={selectedCapId}
                      onSelectCap={handleSelectCap}
                      onEditCap={setEditandoCap}
                      onDeleteCap={handleCapEliminada}
                      onEditLibro={setEditandoLibro}
                      onNuevoCap={(libroId) => { setSelectedLibroId(libroId); setShowNuevoCap(true); }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Desktop: scroll horizontal de columnas ── */}
              <div className="hidden sm:flex overflow-x-auto" style={{ maxHeight: selectedCapId ? "220px" : "340px" }}>

                {/* Columna: Nuevo libro */}
                {/* Columnas de libros */}
                {loadingLibros ? (
                  <div className="flex items-center justify-center px-12 py-8 text-primary/25">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : librosFiltrados.length === 0 ? (
                  <div className="flex items-center justify-center px-12 py-8 text-primary/20">
                    <p className="text-[9px] font-black uppercase tracking-widest">Sin resultados</p>
                  </div>
                ) : librosFiltrados.map(libro => (
                  <LibroColumna
                    key={libro.id + capRefreshKey}
                    libro={libro}
                    selectedCapId={selectedCapId}
                    onSelectCap={handleSelectCap}
                    onEditCap={setEditandoCap}
                    onDeleteCap={handleCapEliminada}
                    onEditLibro={setEditandoLibro}
                    onNuevoCap={(libroId) => { setSelectedLibroId(libroId); setShowNuevoCap(true); }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Editor ── */}
        <div className="flex-1 min-h-0">
          {selectedCapId && selectedLibroId ? (
            <PanelEditor
              key={selectedCapId}
              capId={selectedCapId}
              libroId={selectedLibroId}
              onCapitulosChange={() => setCapRefreshKey(k => k + 1)}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode(m => !m)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/20">
                Selecciona un capítulo
              </p>
            </div>
          )}
        </div>
      </div>

      {showNuevoLibro && <ModalNuevoLibro onCreated={handleLibroCreado} onClose={() => setShowNuevoLibro(false)} />}
      {showNuevoCap && selectedLibroId && <ModalNuevoCapitulo libroId={selectedLibroId} ordenSiguiente={capitulos.length + 1} onCreated={handleCapCreada} onClose={() => setShowNuevoCap(false)} />}
      {editandoLibro && <ModalEditarLibro libro={editandoLibro} onSaved={handleLibroEditado} onClose={() => setEditandoLibro(null)} />}
      {editandoCap && <ModalEditarCapitulo cap={editandoCap} onSaved={handleCapEditada} onClose={() => setEditandoCap(null)} />}
    </>
  );
}

export default function EstudioCapitulos() {
  return (
    <div className="h-[100dvh] bg-bg-main">
      <EditorCapitulosPanel />
    </div>
  );
}