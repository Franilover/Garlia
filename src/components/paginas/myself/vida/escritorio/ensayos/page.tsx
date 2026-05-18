"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, PenTool, Search, X, Plus, FileText, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { db } from "@/lib/api/client/db";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import Editor from "@/components/paginas/myself/vida/escritorio/ensayos/editor";
import { EmptyState } from "@/components/paginas/myself/vida/escritorio/ensayos/emptyState";
import NewNoteModal from "@/components/paginas/myself/vida/escritorio/ensayos/newNoteModal";
import { GrafoEnsayos } from "@/components/paginas/myself/vida/escritorio/ensayos/GrafoEnsayos";
import { HomeDashboard } from "@/components/paginas/myself/vida/escritorio/ensayos/HomeDashboard";

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
  };
  const [editMode,          setEditMode]          = useState(true);
  const [searchPanelOpen,   setSearchPanelOpen]   = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [showNewNoteModal,  setShowNewNoteModal]  = useState(false);

  const [sources,           setSources]           = useState<ZoteroSource[]>([]);
  const [zoteroConnected,   setZoteroConnected]   = useState(false);
  const [tagActivo,         setTagActivo]         = useState<string | null>(null);

  // For pre-filling the new note modal title (used when creating tag-pages)
  const [pendingNoteTitle,  setPendingNoteTitle]  = useState<string | null>(null);

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

  // ─── Tag-as-page navigation ────────────────────────────────────────────────

  const autoCreateTagPage = useCallback(async (tag: string): Promise<string | null> => {
    if (!user) return null;
    const now = new Date().toISOString();
    const linkedNotes = ensayos
      .filter((e: any) => e.tags?.includes(tag) && e.titulo)
      .map((e: any) => `- [[${e.titulo}]]`)
      .join("\n");

    const contenido = `# ${tag}\n\nNotas con esta etiqueta:\n\n${linkedNotes || "_ninguna aún_"}`;

    const payload = {
      titulo:     tag,
      user_id:    user.id,
      contenido,
      tags:       [tag],
      updated_at: now,
    };

    const { data, error } = await addRow(payload);
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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const setEnsayoActivo = useCallback((id: string | null) => {
    setEnsayoActivoId(id);
    if (id) localStorage.setItem(LS_ACTIVE, id);
    else     localStorage.removeItem(LS_ACTIVE);
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
    return ensayos.filter((e: any) => {
      const cumpleTag      = tagActivo ? e.tags?.includes(tagActivo) : true;
      const q              = searchTerm.toLowerCase();
      const cumpleBusqueda = e.titulo?.toLowerCase().includes(q) || e.contenido?.toLowerCase().includes(q);
      return cumpleTag && cumpleBusqueda;
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

  const actualizarLocal = useCallback((id: string, field: string, value: any) => {
    scheduleSave(id, { [field]: value });
    if (field === "tags" && Array.isArray(value)) {
      autoCreateMissingTagPages(value);
    }
  }, [scheduleSave, autoCreateMissingTagPages]);

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const crearEnsayo = async (titulo: string) => {
    if (!titulo.trim() || !user) return;
    const now = new Date().toISOString();

    const payload = {
      titulo:     titulo.trim(),
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

  const handleEnsayoClick = (id: string) => {
    setEnsayoActivo(id);
  };

  const handleEnsayoClickSinCerrar = useCallback((id: string) => {
    setEnsayoActivo(id);
  }, [setEnsayoActivo]);

  const ensayoActivo = ensayos.find((e: any) => e.id === ensayoActivoId) ?? null;

  // ─── Keep tag-pages content in sync ───────────────────────────────────────
  useEffect(() => {
    if (!ensayos.length) return;
    const allTags = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => allTags.add(t)));

    allTags.forEach(tag => {
      const tagPage = ensayos.find((e: any) => e.titulo?.toLowerCase() === tag.toLowerCase());
      if (!tagPage) return;
      const linkedNotes = ensayos
        .filter((e: any) => e.id !== tagPage.id && e.tags?.includes(tag) && e.titulo)
        .map((e: any) => `- [[${e.titulo}]]`)
        .join("\n");
      const newContent = `# ${tag}\n\nNotas con esta etiqueta:\n\n${linkedNotes || "_ninguna aún_"}`;
      if (tagPage.contenido !== newContent) {
        scheduleSave(tagPage.id, { contenido: newContent });
        setEnsayos((prev: any[]) =>
          prev.map((e: any) => e.id === tagPage.id ? { ...e, contenido: newContent } : e)
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensayos.map((e: any) => `${e.id}:${e.tags?.join(",")}`).join("|")]);

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
          <div className="shrink-0">
            {ensayoActivo ? (
              <GrafoEnsayos
                ensayo={ensayoActivo}
                ensayos={ensayos}
                onSelectEnsayo={handleEnsayoClickSinCerrar}
              />
            ) : (
              <div className="flex items-center gap-1.5" style={{ opacity: 0.3 }}>
                <PenTool size={10} style={{ color: "var(--foreground)" }} />
              </div>
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
                              <FileText size={9} style={{ color: "color-mix(in srgb, var(--foreground) 18%, transparent)", flexShrink: 0 }} />
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 11, fontFamily: "var(--font-serif)", fontStyle: "italic", color: "color-mix(in srgb, var(--foreground) 70%, transparent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {ens.titulo || "Sin título"}
                                </p>
                                <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "color-mix(in srgb, var(--foreground) 18%, transparent)" }}>
                                  {new Date(ens.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                                  {ens.tags?.length > 0 && ` · ${ens.tags.slice(0, 2).map((t: string) => `#${t}`).join(" ")}`}
                                </p>
                              </div>
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
                  entities={allWikilinkNames}
                />
              ) : (
                /* AQUÍ: Si no hay ensayo activo, mostramos el Dashboard en vez de EmptyState */
                <HomeDashboard 
                  key="home"
                  ensayos={ensayos} 
                  todosLosTags={todosLosTags}
                  onNavigate={(titulo) => navigateToPage(titulo, false)}
                  onTagClick={(tag) => setTagActivo(tag)} 
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