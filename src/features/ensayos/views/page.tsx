"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, PenTool, Search, X, Plus, FileText, Trash2, List, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { db } from "@/lib/api/client/db";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";

import Editor from "@/features/ensayos/components/editor";
import { EmptyState } from "@/features/ensayos/components/emptyState";
import NewNoteModal from "@/features/ensayos/components/newNoteModal";
import { GrafoEnsayos } from "@/features/ensayos/components/GrafoEnsayos";
import { HomeDashboard } from "@/features/ensayos/components/HomeDashboard";
import { LibrosDashboard } from "@/features/ensayos/personal/LibrosDashboard";

export interface ZoteroSource {
  title: string;
  author: string;
  year: string;
  citekey?: string;
  journal?: string;
  url?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function setSaveIndicator(el: HTMLElement | null, status: SaveStatus) {
  if (!el) return;
  if (status === "idle") { el.style.opacity = "0"; return; }
  el.style.opacity = "1";
  el.textContent =
    status === "saving" ? "guardando…" :
    status === "saved"  ? "✓ guardado" : "error";
  el.style.color =
    status === "saving" ? "color-mix(in srgb, var(--foreground) 20%, transparent)" :
    status === "saved"  ? "color-mix(in srgb, var(--accent) 70%, transparent)" :
                          "color-mix(in srgb, var(--primary) 70%, transparent)";
}

const LS_ACTIVE       = "ensayos-active-id";
const LS_HOME         = "ensayos-at-home";
const DEXIE_ZOTERO_KEY = "zotero_file_handle";


async function saveZoteroHandle(handle: FileSystemFileHandle) {
  try {
    if (!db) return;
    await (db as any).reproductor_handles.put({ key: DEXIE_ZOTERO_KEY, handle });
  } catch {}
}

async function loadZoteroHandle(): Promise<FileSystemFileHandle | null> {
  try {
    if (!db) return null;
    const row = await (db as any).reproductor_handles.get(DEXIE_ZOTERO_KEY);
    return row?.handle ?? null;
  } catch { return null; }
}

function parseZoteroJson(json: any[]): ZoteroSource[] {
  return json.map((item: any) => ({
    title:   item.title || "",
    author:  item.author
      ? (Array.isArray(item.author)
          ? item.author.map((a: any) => a.family || a.literal || "").filter(Boolean).join(", ")
          : item.author)
      : (item.creators?.[0]?.lastName || ""),
    year:    item.issued?.["date-parts"]?.[0]?.[0]?.toString()
          || item.date?.substring(0, 4) || "",
    citekey: item.id || item["citation-key"] || "",
    journal: item["container-title"] || item.publisher || "",
    url:     item.URL || item.url || "",
  }));
}

async function readZoteroFile(handle: FileSystemFileHandle): Promise<ZoteroSource[]> {
  const file = await handle.getFile();
  const text = await file.text();
  const json  = JSON.parse(text);
  const items = Array.isArray(json) ? json : (json.items || json.references || []);
  return parseZoteroJson(items);
}

export default function Ensayos() {
  const { user } = useAuth() as { user: any };
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal }  = useConfirm();

  const irAlHome = () => {
    setEnsayoActivoId(null);
    setTagActivo(null);
    setTocOpen(false);
    setTocEntries([]);
    setVistaActiva("home");
    localStorage.setItem(LS_HOME, "1");
  };

  const irALibros = () => {
    setEnsayoActivoId(null);
    setTagActivo(null);
    setTocOpen(false);
    setTocEntries([]);
    setVistaActiva("libros");
    localStorage.setItem(LS_HOME, "1");
  };
  const [editMode,          setEditMode]          = useState(true);
  const [vistaActiva,       setVistaActiva]       = useState<"home" | "libros">("home");
  const [tocOpen,           setTocOpen]           = useState(false);
  const [tocEntries,        setTocEntries]        = useState<{ level: number; text: string; id: string }[]>([]);
  const [searchPanelOpen,   setSearchPanelOpen]   = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [showNewNoteModal,  setShowNewNoteModal]  = useState(false);

  const [sources,           setSources]           = useState<ZoteroSource[]>([]);
  const [zoteroConnected,   setZoteroConnected]   = useState(false);
  const [tagActivo,         setTagActivo]         = useState<string | null>(null);

  // For pre-filling the new note modal title (used when creating tag-pages)
  const [pendingNoteTitle,  setPendingNoteTitle]  = useState<string | null>(null);

  const {
    data: tareas,
    setData: setTareas,
    addRow: addTareaRow,
    updateRow: updateTareaRow,
  } = useSupabaseData("tareas", { order: { campo: "created_at", asc: false } });

  const { data: eventos, setData: setEventos } = useSupabaseData<any>("eventos");
  const { data: capitulosRaw } = useSupabaseData<any>("capitulos", {
    select: "id, titulo_capitulo, fecha_publicacion, libro_id",
  });
  const { data: horarioRaw } = useSupabaseData<any>("horario");
  const [isAddingEvento, setIsAddingEvento] = useState(false);

  const {
    data:     ensayos,
    setData:  setEnsayos,
    loading,
    isOffline,
    addRow,
    updateRow,
    deleteRow,
  } = useSupabaseData("ensayos", { order: { campo: "updated_at", asc: false } });

  const handleTagClick = useCallback((tag: string | null) => setTagActivo(tag), []);

  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    if (localStorage.getItem(LS_HOME) === "1") return null;
    return localStorage.getItem(LS_ACTIVE);
  });

  const [searchTerm, setSearchTerm] = useState("");

  const pendingUpdatesRef  = useRef<Record<string, Record<string, any>>>({});
  const saveTimerRef       = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveIndicatorRef   = useRef<HTMLSpanElement | null>(null);

  // ── FIX: guard para no tocar el DOM después de desmontar ──────────────────
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Limpiar TODOS los timers de guardado pendientes al desmontar
      Object.values(saveTimerRef.current).forEach(clearTimeout);
      saveTimerRef.current = {};
    };
  }, []);

  // ─── Zotero ────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const handle = await loadZoteroHandle();

      if (!handle) {
        const cached = localStorage.getItem("fran-zotero-cache");
        if (cached) {
          try { setSources(JSON.parse(cached)); } catch {}
        }
        return;
      }

      try {
        const h    = handle as any;
        const perm = await h.queryPermission({ mode: "read" });
        const granted = perm === "granted"
          ? "granted"
          : await h.requestPermission({ mode: "read" });

        if (granted !== "granted") return;

        const parsed = await readZoteroFile(handle);
        setSources(parsed);
        setZoteroConnected(true);
        localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
      } catch {
        const cached = localStorage.getItem("fran-zotero-cache");
        if (cached) {
          try { setSources(JSON.parse(cached)); } catch {}
        }
      }
    })();
  }, []);

  const connectZotero = useCallback(async () => {
    if (!("showOpenFilePicker" in window)) {
      const input = document.createElement("input");
      input.type   = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text  = await file.text();
          const json  = JSON.parse(text);
          const items = Array.isArray(json) ? json : (json.items || json.references || []);
          const parsed = parseZoteroJson(items);
          setSources(parsed);
          setZoteroConnected(true);
          localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
        } catch { toast.error("Error al leer el archivo Zotero"); }
      };
      input.click();
      return;
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types:    [{ description: "Zotero JSON", accept: { "application/json": [".json"] } }],
        multiple: false,
      });
      await saveZoteroHandle(handle);
      const parsed = await readZoteroFile(handle);
      setSources(parsed);
      setZoteroConnected(true);
      localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    }
  }, []);

  const refreshZotero = useCallback(async () => {
    const handle = await loadZoteroHandle();
    if (!handle) { connectZotero(); return; }
    try {
      const h       = handle as any;
      const perm    = await h.queryPermission({ mode: "read" });
      const granted = perm === "granted"
        ? "granted"
        : await h.requestPermission({ mode: "read" });
      if (granted !== "granted") return;
      const parsed = await readZoteroFile(handle);
      setSources(parsed);
      localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
    } catch { connectZotero(); }
  }, [connectZotero]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const setEnsayoActivo = useCallback((id: string | null) => {
    setEnsayoActivoId(id);
    setTocOpen(false);
    setTocEntries([]);
    if (id) {
      localStorage.setItem(LS_ACTIVE, id);
      localStorage.removeItem(LS_HOME);
    } else {
      localStorage.removeItem(LS_ACTIVE);
      localStorage.setItem(LS_HOME, "1");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) {
        setSearchPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const todosLosTags = useMemo(() => {
    const set = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [ensayos]);

  const allWikilinkNames = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; type: string }[] = [];

    todosLosTags.forEach(tag => {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push({ name: tag, type: "tag" });
      }
    });

    ensayos.forEach((e: any) => {
      const titulo = e.titulo?.trim();
      if (!titulo || seen.has(titulo)) return;
      seen.add(titulo);
      const tipo = e.tags?.[0] ?? "nota";
      result.push({ name: titulo, type: tipo });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [ensayos, todosLosTags]);

  const ensayosFiltrados = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return ensayos
      .filter((e: any) => {
        const cumpleTag      = tagActivo ? e.tags?.includes(tagActivo) : true;
        const cumpleBusqueda = !q
          || e.titulo?.toLowerCase().includes(q)
          || e.contenido?.toLowerCase().includes(q);
        return cumpleTag && cumpleBusqueda;
      })
      .sort((a: any, b: any) => {
        if (!q) return 0; // sin búsqueda: mantener orden original (updated_at)
        const aTitulo = a.titulo?.toLowerCase().includes(q);
        const bTitulo = b.titulo?.toLowerCase().includes(q);
        if (aTitulo && !bTitulo) return -1; // a sube
        if (!aTitulo && bTitulo) return 1;  // b sube
        return 0; // empate: mantener orden relativo
      });
  }, [ensayos, tagActivo, searchTerm]);

  // ─── Guardado ──────────────────────────────────────────────────────────────

  const scheduleSave = useCallback((id: string, updates: Record<string, any>) => {
    pendingUpdatesRef.current[id] = {
      ...(pendingUpdatesRef.current[id] || {}),
      ...updates,
    };

    if (saveTimerRef.current[id]) clearTimeout(saveTimerRef.current[id]);

    saveTimerRef.current[id] = setTimeout(async () => {
      // ── FIX 1: si el componente se desmontó, no hacer nada ────────────────
      if (!isMountedRef.current) return;

      const batch = { ...(pendingUpdatesRef.current[id] || {}) };
      delete pendingUpdatesRef.current[id];
      delete saveTimerRef.current[id];

      setSaveIndicator(saveIndicatorRef.current, "saving");

      const now     = new Date().toISOString();
      const payload = { ...batch, updated_at: now };

      setEnsayos((prev: any[]) =>
        prev.map((e: any) => e.id === id ? { ...e, ...payload } : e)
      );

      try {
        // ── FIX 2: timeout propio de 10s para que nunca quede colgado ────────
        const savePromise = updateRow(id, payload);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("save timeout")), 10_000)
        );

        const { error } = await Promise.race([savePromise, timeoutPromise]) as any;
        if (error) throw error;

        // ── FIX 3: guard post-await por si el usuario navegó mientras guardaba
        if (!isMountedRef.current) return;

        setSaveIndicator(saveIndicatorRef.current, "saved");
        setTimeout(() => {
          if (isMountedRef.current) setSaveIndicator(saveIndicatorRef.current, "idle");
        }, 2000);

      } catch (err: any) {
        if (!isMountedRef.current) return;

        setSaveIndicator(saveIndicatorRef.current, "error");

        // ── FIX 4: auto-limpiar el error para no quedar atascado en "error" ──
        setTimeout(() => {
          if (isMountedRef.current) setSaveIndicator(saveIndicatorRef.current, "idle");
        }, 4000);

        console.warn("[scheduleSave] error al guardar:", err?.message ?? err);
      }
    }, 1500);
  }, [updateRow, setEnsayos]);


  // ─── Tag-as-page navigation ────────────────────────────────────────────────

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const autoCreateTagPage = useCallback(async (tag: string): Promise<string | null> => {
    if (!user) return null;
    const now = new Date().toISOString();

    const existing = ensayos.find(
      (e: any) => e.titulo?.toLowerCase() === tag.toLowerCase()
    );
    if (existing) return existing.id;

    const { data, error } = await addRow({
      titulo:     capitalize(tag),
      user_id:    user.id,
      contenido:  `# ${capitalize(tag)}\n`,
      tags:       [tag],
      updated_at: now,
    });
    if (!error && data) {
      setEnsayos((prev: any[]) => {
        if (prev.find((e: any) => e.id === data.id)) return prev;
        return [data, ...prev];
      });
      return data.id;
    }
    return null;
  }, [user, ensayos, addRow, setEnsayos]);

  const navigateToPage = useCallback(async (name: string, isTag = false) => {
    const normalized = name.trim().toLowerCase();
    const found = ensayos.find(
      (e: any) => e.titulo?.toLowerCase() === normalized
    );
    if (found) {
      setEnsayoActivo(found.id);
    } else if (isTag) {
      const newId = await autoCreateTagPage(name.trim());
      if (newId) {
        setEnsayoActivo(newId);
      }
    } else {
      setPendingNoteTitle(name.trim());
      setShowNewNoteModal(true);
    }
  }, [ensayos, autoCreateTagPage]);

  const autoCreateMissingTagPages = useCallback(async (tags: string[]) => {
    for (const tag of tags) {
      const exists = ensayos.some((e: any) => e.titulo?.toLowerCase() === tag.toLowerCase());
      if (!exists) {
        await autoCreateTagPage(tag);
      }
    }
  }, [ensayos, autoCreateTagPage]);

  const handleTagNavigate = useCallback((tag: string) => {
    navigateToPage(tag, true);
  }, [navigateToPage]);

  const renameEnCascada = useCallback((oldTitulo: string, newTitulo: string) => {
    const oldLower = oldTitulo.toLowerCase();
    ensayos.forEach((e: any) => {
      let changed = false;
      const updates: Record<string, any> = {};

      // 1. Reemplazar [[viejo]] → [[nuevo]] en el contenido
      if (e.contenido) {
        const escaped = oldTitulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\[\\[${escaped}\\]\\]`, "gi");
        const newContenido = e.contenido.replace(regex, `[[${newTitulo}]]`);
        if (newContenido !== e.contenido) {
          updates.contenido = newContenido;
          changed = true;
        }
      }

      // 2. Reemplazar el valor en el array tags
      if (e.tags?.some((t: string) => t.toLowerCase() === oldLower)) {
        updates.tags = e.tags.map((t: string) =>
          t.toLowerCase() === oldLower ? newTitulo.toLowerCase() : t
        );
        changed = true;
      }

      if (changed) {
        scheduleSave(e.id, updates);
        setEnsayos((prev: any[]) =>
          prev.map((p: any) => p.id === e.id ? { ...p, ...updates } : p)
        );
      }
    });
  }, [ensayos, scheduleSave, setEnsayos]);

  const actualizarLocal = useCallback((id: string, field: string, value: any, extra?: any) => {
    // "titulo:rename" → solo guardamos el título nuevo; el rename en cascada
    // usa el valor original (extra) capturado en onFocus, no el estado intermedio
    if (field === "titulo:rename") {
      const oldTitulo = (extra as string)?.trim();
      const newTitulo = (value as string).trim();
      if (oldTitulo && oldTitulo !== newTitulo) {
        renameEnCascada(oldTitulo, newTitulo);
      }
      return; // el título ya fue guardado por el onChange normal
    }

    scheduleSave(id, { [field]: value });

    if (field === "tags" && Array.isArray(value)) {
      autoCreateMissingTagPages(value);
    }
  }, [scheduleSave, autoCreateMissingTagPages, renameEnCascada]);


  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const crearEnsayo = async (titulo: string) => {
    if (!titulo.trim() || !user) return;
    const now = new Date().toISOString();

    const payload = {
      titulo:     capitalize(titulo.trim()),
      user_id:    user.id,
      contenido:  "",
      tags:       tagActivo ? [tagActivo] : [],
      updated_at: now,
    };

    const { data, error } = await addRow(payload);
    if (!error && data) {
      setEnsayos((prev: any[]) => {
        if (prev.find((e: any) => e.id === data.id)) return prev;
        return [data, ...prev];
      });
      setEnsayoActivo(data.id);
      setEditMode(true);
      setShowNewNoteModal(false);
      setPendingNoteTitle(null);
    }
  };

  const eliminarEnsayo = async (id: string) => {
    const ok = await confirm({ message: "¿Eliminar esta nota?", danger: true, confirmLabel: "Eliminar" });
    if (!ok) return;

    if (saveTimerRef.current[id]) {
      clearTimeout(saveTimerRef.current[id]);
      delete saveTimerRef.current[id];
    }
    delete pendingUpdatesRef.current[id];

    await deleteRow(id);
    setEnsayos((prev: any[]) => prev.filter((e: any) => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivo(null);
  };

  // --- AÑADE ESTOS HANDLERS ---
  const handleAddTarea = async (titulo: string) => {
    if (!user) return;
    const { data, error } = await addTareaRow({
      titulo,
      user_id: user.id,
      completada: false,
      created_at: new Date().toISOString()
    });
    if (!error && data) {
      setTareas((prev: any[]) => [data, ...prev]);
    }
  };

  const handleToggleTarea = async (id: string, completada: boolean) => {
    const { error } = await updateTareaRow(id, { completada: !completada });
    if (!error) {
      setTareas((prev: any[]) => 
        prev.map(t => t.id === id ? { ...t, completada: !completada } : t)
      );
    }
  };

  const handleAddEvento = async (fechaISO: string, titulo: string, tipo: string) => {
    if (!titulo.trim() || isAddingEvento) return;
    setIsAddingEvento(true);
    try {
      const creado = await eventosQueries.add({ titulo, tipo, fecha: fechaISO });
      if (creado) setEventos((prev: any[]) => [...prev, creado]);
    } catch (err) { console.error(err); }
    finally { setIsAddingEvento(false); }
  };

  const handleEnsayoClick = (id: string) => {
    setEnsayoActivo(id);
  };

  const handleEnsayoClickSinCerrar = useCallback((id: string) => {
    setEnsayoActivo(id);
  }, [setEnsayoActivo]);

  const ensayoActivo = ensayos.find((e: any) => e.id === ensayoActivoId) ?? null;



  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .ensayos-root {
          --sidebar-bg:   var(--bg-menu);
          --sidebar-text: color-mix(in srgb, var(--foreground) 60%, transparent);
          --editor-bg:    var(--bg-main);
          --editor-text:  var(--foreground);
        }
      `}</style>

      <div className="ensayos-root h-full flex flex-col" style={{ background: "var(--bg-main)" }}>

        {/* ── Barra superior ── */}
        <div
          className="shrink-0 z-20 px-4 flex items-center gap-3"
          style={{
            borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
            background:   "color-mix(in srgb, var(--bg-menu) 60%, transparent)",
            backdropFilter: "blur(8px)",
            minHeight: 36,
          }}
        >
          {/* Grafo — izquierda */}
          {/* Grafo — izquierda */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Botón Home — solo icono */}
          <button
            onClick={irAlHome}
            title="Volver al escritorio"
            style={{
              background: ensayoActivoId ? "transparent" : "color-mix(in srgb, var(--foreground) 6%, transparent)",
              border: "1px solid",
              borderColor: ensayoActivoId ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "color-mix(in srgb, var(--foreground) 15%, transparent)",
              borderRadius: 5,
              padding: "3px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 25%, transparent)";
              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 6%, transparent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = ensayoActivoId ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "color-mix(in srgb, var(--foreground) 15%, transparent)";
              (e.currentTarget as HTMLElement).style.background = ensayoActivoId ? "transparent" : "color-mix(in srgb, var(--foreground) 6%, transparent)";
            }}
          >
            <PenTool size={9} style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }} />
          </button>

          {/* Grafo (solo cuando hay nota activa) */}
          {ensayoActivo && (
            <GrafoEnsayos
              ensayo={ensayoActivo}
              ensayos={ensayos}
              onSelectEnsayo={handleEnsayoClickSinCerrar}
            />
          )}

          {/* TOC (solo cuando hay nota activa con headings) */}
          {ensayoActivo && tocEntries.length > 0 && (
            <button
              onClick={() => setTocOpen(p => !p)}
              title="Tabla de contenidos"
              style={{
                background: tocOpen ? "color-mix(in srgb, var(--color-primary,#7c6af7) 12%, transparent)" : "none",
                border: "1px solid",
                borderColor: tocOpen
                  ? "color-mix(in srgb, var(--color-primary,#7c6af7) 30%, transparent)"
                  : "color-mix(in srgb, var(--foreground) 8%, transparent)",
                borderRadius: 5,
                cursor: "pointer",
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                transition: "all 0.12s",
              }}
              onMouseEnter={e => {
                if (!tocOpen) {
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 25%, transparent)";
                  (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 6%, transparent)";
                }
              }}
              onMouseLeave={e => {
                if (!tocOpen) {
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 8%, transparent)";
                  (e.currentTarget as HTMLElement).style.background = "none";
                }
              }}
            >
              <List size={9} style={{ color: tocOpen ? "var(--color-primary,#7c6af7)" : "color-mix(in srgb, var(--foreground) 35%, transparent)" }} />
            </button>
          )}
        </div>

          {/* Buscador + panel — centro */}
          <div className="flex-1 flex justify-center">
            <div className="relative" style={{ width: "min(400px, 100%)" }} ref={searchPanelRef}>
              {/* Input */}
              <Search
                size={10}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "color-mix(in srgb, var(--foreground) 22%, transparent)" }}
              />
              <input
                type="text"
                placeholder={`buscar entre ${ensayos.length} notas...`}
                value={searchTerm}
                onFocus={() => setSearchPanelOpen(true)}
                onChange={e => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  setSearchPanelOpen(true);
                }}
                onKeyDown={e => {
                  if (e.key === "Escape") { setSearchPanelOpen(false); setSearchTerm(""); (e.target as HTMLInputElement).blur(); }
                  if (e.key === "Enter" && ensayosFiltrados.length > 0) {
                    handleEnsayoClick(ensayosFiltrados[0].id);
                    setSearchPanelOpen(false);
                    setSearchTerm("");
                  }
                }}
                className="w-full outline-none"
                style={{
                  background:   "color-mix(in srgb, var(--foreground) 4%, transparent)",
                  border:       "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                  borderRadius: searchPanelOpen ? "5px 5px 0 0" : 5,
                  padding:      "4px 26px 4px 24px",
                  fontSize:     10,
                  color:        "color-mix(in srgb, var(--foreground) 70%, transparent)",
                  fontFamily:   "var(--font-mono)",
                  transition:   "border-radius 0.1s",
                }}
              />
              {searchTerm ? (
                <button
                  onClick={() => { setSearchTerm(""); setSearchPanelOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 22%, transparent)", display: "flex", padding: 0 }}
                >
                  <X size={9} />
                </button>
              ) : (
                <button
                  onClick={() => setSearchPanelOpen(p => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 18%, transparent)", display: "flex", padding: 0 }}
                >
                  <Plus size={9} onClick={e => { e.stopPropagation(); setShowNewNoteModal(true); setSearchPanelOpen(false); }} />
                </button>
              )}

              {/* Panel dropdown */}
              <AnimatePresence>
                {searchPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--bg-menu)",
                      border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                      borderTop: "none",
                      borderRadius: "0 0 7px 7px",
                      boxShadow: "0 12px 40px color-mix(in srgb, var(--bg-main) 40%, transparent)",
                      zIndex: 50,
                      maxHeight: 360,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Tags */}
                    {todosLosTags.length > 0 && (
                      <div
                        className="px-3 py-2 flex flex-wrap gap-1 shrink-0"
                        style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 5%, transparent)" }}
                      >
                        <button
                          onClick={() => { setTagActivo(null); }}
                          style={{
                            fontSize: 9, padding: "1px 7px", borderRadius: 3,
                            border: "1px solid",
                            borderColor: !tagActivo ? "color-mix(in srgb, var(--foreground) 30%, transparent)" : "color-mix(in srgb, var(--foreground) 8%, transparent)",
                            background: !tagActivo ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "transparent",
                            color: !tagActivo ? "color-mix(in srgb, var(--foreground) 80%, transparent)" : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                            cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.1s",
                          }}
                        >all</button>
                        {todosLosTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setTagActivo(tagActivo === tag ? null : tag)}
                            style={{
                              fontSize: 9, padding: "1px 7px", borderRadius: 3,
                              border: "1px solid",
                              borderColor: tagActivo === tag ? "color-mix(in srgb, var(--foreground) 30%, transparent)" : "color-mix(in srgb, var(--foreground) 8%, transparent)",
                              background: tagActivo === tag ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "transparent",
                              color: tagActivo === tag ? "color-mix(in srgb, var(--foreground) 80%, transparent)" : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                              cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.1s",
                            }}
                          >#{tag}</button>
                        ))}
                      </div>
                    )}

                    {/* Lista de notas */}
                    <div style={{ overflowY: "auto", flex: 1 }}>
                      {ensayosFiltrados.length === 0 ? (
                        <div className="px-4 py-5 text-center">
                          <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", fontFamily: "var(--font-mono)" }}>
                            sin resultados
                          </p>
                        </div>
                      ) : (
                        ensayosFiltrados.map(ens => {
                          const isActive = ens.id === ensayoActivoId;
                          const esLibro = ens.tags?.includes("libro");
                          return (
                            <div
                              key={ens.id}
                              className="group flex items-center gap-2 px-3 py-2 cursor-pointer relative"
                              style={{
                                background: isActive ? "color-mix(in srgb, var(--foreground) 5%, transparent)" : "transparent",
                                borderLeft: `2px solid ${isActive ? "color-mix(in srgb, var(--foreground) 25%, transparent)" : "transparent"}`,
                                transition: "background 0.08s",
                              }}
                              onClick={() => { handleEnsayoClick(ens.id); setSearchPanelOpen(false); setSearchTerm(""); }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 3%, transparent)"; }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                              {esLibro
                                ? <BookOpen size={9} style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)", flexShrink: 0 }} />
                                : <FileText size={9} style={{ color: "color-mix(in srgb, var(--foreground) 18%, transparent)", flexShrink: 0 }} />
                              }
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 11, fontFamily: "var(--font-serif)", fontStyle: "italic", color: "color-mix(in srgb, var(--foreground) 70%, transparent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {ens.titulo || "Sin título"}
                                </p>
                                <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "color-mix(in srgb, var(--foreground) 18%, transparent)" }}>
                                  {new Date(ens.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                                  {ens.tags?.length > 0 && ` · ${ens.tags.filter((t: string) => t !== "libro").slice(0, 2).map((t: string) => `#${t}`).join(" ")}`}
                                </p>
                              </div>
                              {esLibro && (
                                <span
                                  style={{
                                    fontSize: 8,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)",
                                    background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                                    color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                                    fontFamily: "var(--font-mono)",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    flexShrink: 0,
                                    userSelect: "none",
                                  }}
                                >
                                  libro
                                </span>
                              )}
                              <button
                                className="opacity-0 group-hover:opacity-100"
                                onClick={e => { e.stopPropagation(); eliminarEnsayo(ens.id); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--accent) 50%, transparent)", padding: 2, flexShrink: 0, transition: "opacity 0.1s" }}
                              >
                                <Trash2 size={9} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div
                      className="shrink-0 px-3 py-1.5 flex items-center justify-between"
                      style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 5%, transparent)", background: "color-mix(in srgb, var(--foreground) 2%, transparent)" }}
                    >
                      <span style={{ fontSize: 8, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", fontFamily: "var(--font-mono)" }}>
                        {ensayosFiltrados.length} de {ensayos.length} notas · enter para abrir
                      </span>
                      <button
                        onClick={() => { setShowNewNoteModal(true); setSearchPanelOpen(false); }}
                        className="flex items-center gap-1"
                        style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)", background: "color-mix(in srgb, var(--foreground) 5%, transparent)", color: "color-mix(in srgb, var(--foreground) 45%, transparent)", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                      >
                        <Plus size={8} /> nueva nota
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Indicador guardado — derecha */}
          <div className="shrink-0" style={{ minWidth: 64, textAlign: "right" }}>
            <span
              ref={saveIndicatorRef}
              style={{ fontSize: 9, fontFamily: "var(--font-mono)", opacity: 0, transition: "opacity 0.3s", letterSpacing: "0.1em", textTransform: "uppercase" }}
            />
          </div>
        </div>

        {/* ── Contenido principal ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary/20" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {ensayoActivo ? (
                <Editor
                  key={ensayoActivo.id}
                  ensayo={ensayoActivo}
                  ensayos={ensayos}
                  sources={sources}
                  editMode={editMode}
                  onToggleEditMode={() => setEditMode(p => !p)}
                  onUpdateField={actualizarLocal}
                  onNavigateToPage={(name) => navigateToPage(name, false)}
                  onOpenLibrosDashboard={irALibros}
                  onTagClick={(tag) => {
                    setTagActivo(tag);
                    setVistaActiva("home");
                    setEnsayoActivo(null);
                  }}
                  tocOpen={tocOpen}
                  onTocToggle={() => setTocOpen(p => !p)}
                  onTocEntriesChange={setTocEntries}
                />
              ) : vistaActiva === "libros" ? (
                <LibrosDashboard
                  key="libros"
                  ensayos={ensayos}
                  onNavigate={(titulo) => navigateToPage(titulo, false)}
                  onTagClick={handleTagClick}
                  onToggleEstado={(libroId, estado, add) => {
                    const libro = ensayos.find((e: any) => e.id === libroId);
                    if (!libro) return;
                    const tagsActuales: string[] = libro.tags ?? [];
                    const nuevosTags = add
                      ? [...new Set([...tagsActuales, estado])]
                      : tagsActuales.filter((t: string) => t !== estado);
                    scheduleSave(libroId, { tags: nuevosTags });
                  }}
                  onCrearLibro={async () => {
                    const now = new Date().toISOString();
                    const payload = {
                      titulo:     "Nuevo libro",
                      user_id:    user?.id,
                      contenido:  "",
                      tags:       ["libro"],
                      updated_at: now,
                    };
                    const { data, error } = await addRow(payload);
                    if (!error && data) {
                      setEnsayos((prev: any[]) => {
                        if (prev.find((e: any) => e.id === data.id)) return prev;
                        return [data, ...prev];
                      });
                      setEnsayoActivo(data.id);
                      setEditMode(true);
                    }
                  }}
                />
              ) : (
                <HomeDashboard 
                  key="home"
                  ensayos={ensayos} 
                  todosLosTags={todosLosTags}
                  tagActivo={tagActivo}
                  onNavigate={(titulo) => navigateToPage(titulo, false)}
                  onTagClick={(tag) => navigateToPage(tag, true)}
                  tareas={tareas}
                  onToggleTarea={handleToggleTarea}
                  onAddTarea={handleAddTarea}
                  eventos={eventos ?? []}
                  capitulosRaw={capitulosRaw ?? []}
                  horario={horarioRaw ?? []}
                  isAddingEvento={isAddingEvento}
                  onAddEvento={handleAddEvento}
                  onToggleEstado={(libroId, estado, add) => {
                    const libro = ensayos.find((e: any) => e.id === libroId);
                    if (!libro) return;
                    const tagsActuales: string[] = libro.tags ?? [];
                    const nuevosTags = add
                      ? [...new Set([...tagsActuales, estado])]
                      : tagsActuales.filter((t: string) => t !== estado);
                    scheduleSave(libroId, { tags: nuevosTags });
                  }}
                  onCrearLibro={async () => {
                    const now = new Date().toISOString();
                    const payload = {
                      titulo:     "Nuevo libro",
                      user_id:    user?.id,
                      contenido:  "",
                      tags:       ["libro"],
                      updated_at: now,
                    };
                    const { data, error } = await addRow(payload);
                    if (!error && data) {
                      setEnsayos((prev: any[]) => {
                        if (prev.find((e: any) => e.id === data.id)) return prev;
                        return [data, ...prev];
                      });
                      setEnsayoActivo(data.id);
                      setEditMode(true);
                    }
                  }}
                />
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showNewNoteModal && (
          <NewNoteModal
            initialTitle={pendingNoteTitle ?? undefined}
            onConfirm={crearEnsayo}
            onClose={() => {
              setShowNewNoteModal(false);
              setPendingNoteTitle(null);
            }}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <ConfirmModal />
    </>
  );
}