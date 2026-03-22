"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  X, Save, Plus, Trash2, ChevronUp, ChevronDown,
  Layers, CheckCircle, WifiOff,
  AlertTriangle, ChevronRight, RotateCcw, Columns
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Btn, BtnIcon } from "@/components/ui";

const IDIOMAS = [
  { id: "es",     label: "ES", nombre: "Español" },
  { id: "en",     label: "EN", nombre: "Inglés"  },
  { id: "jp",     label: "JP", nombre: "Japonés" },
  { id: "romaji", label: "RO", nombre: "Reading" },
];

type Seccion = {
  id: string | number;
  nombre_seccion: string;
  letra_es?: string; letra_en?: string; letra_jp?: string; letra_romaji?: string;
  orden?: number;
};

// ─── Hooks ─────────────────────────────────────────────────────────────────────
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlow, setIsSlow]     = useState(false);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    const conn = (navigator as any).connection;
    if (conn) {
      const checkSpeed = () => setIsSlow(["slow-2g", "2g"].includes(conn.effectiveType) || conn.downlink < 1);
      checkSpeed();
      conn.addEventListener("change", checkSpeed);
      return () => { window.removeEventListener("online", updateStatus); window.removeEventListener("offline", updateStatus); conn.removeEventListener("change", checkSpeed); };
    }
    return () => { window.removeEventListener("online", updateStatus); window.removeEventListener("offline", updateStatus); };
  }, []);

  return { isOnline, isSlow };
}

function useDraftStorage(key: string) {
  const saveDraft  = useCallback((data: Seccion[]) => { try { localStorage.setItem(`draft_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {} }, [key]);
  const loadDraft  = useCallback((): { data: Seccion[]; ts: number } | null => { try { const r = localStorage.getItem(`draft_${key}`); return r ? JSON.parse(r) : null; } catch { return null; } }, [key]);
  const clearDraft = useCallback(() => { try { localStorage.removeItem(`draft_${key}`); } catch {} }, [key]);
  return { saveDraft, loadDraft, clearDraft };
}

// ─── SaveStatusPill ─────────────────────────────────────────────────────────────
type SaveStatus = "idle" | "draft" | "saving" | "saved" | "error" | "offline";

function SaveStatusPill({ status, isSlow }: { status: SaveStatus; isSlow: boolean }) {
  const config: Record<SaveStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle:    { label: "",                                              color: "",                                                                     icon: null },
    draft:   { label: "Borrador local",                               color: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30", icon: <AlertTriangle size={12} /> },
    saving:  { label: isSlow ? "Guardando (red lenta)..." : "Guardando...", color: "bg-primary/10 text-primary border-primary/20",                   icon: <Layers size={12} className="animate-pulse" /> },
    saved:   { label: "Guardado ✓",                                   color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", icon: <CheckCircle size={12} /> },
    error:   { label: "Error al guardar",                             color: "bg-red-500/15 text-red-500 border-red-500/30",                          icon: <AlertTriangle size={12} /> },
    offline: { label: "Sin conexión · Borrador guardado",             color: "bg-primary/10 text-primary/60 border-primary/20",                       icon: <WifiOff size={12} /> },
  };
  const cfg = config[status];
  if (!cfg.label) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </motion.div>
  );
}

// ─── SeccionCard ────────────────────────────────────────────────────────────────
function SeccionCard({ sec, idx, total, activeTab, splitTab, splitMode, onChange, onMover, onEliminar, expanded, onToggleExpand }: {
  sec: Seccion; idx: number; total: number; activeTab: string; splitTab: string | null; splitMode: boolean;
  onChange: (id: string | number, campo: string, valor: string) => void;
  onMover: (idx: number, dir: number) => void; onEliminar: (idx: number) => void;
  expanded: boolean; onToggleExpand: () => void;
}) {
  const isNew        = sec.id.toString().startsWith("temp-");
  const letraKey     = `letra_${activeTab}`;
  const letraVal     = (sec as any)[letraKey] || "";
  const lineCount    = letraVal.split("\n").length;
  const splitLetraKey = splitTab ? `letra_${splitTab}` : null;
  const splitLetraVal = splitLetraKey ? ((sec as any)[splitLetraKey] || "") : "";
  const splitLineCount = splitLetraVal.split("\n").length;
  const maxRows = Math.max(4, lineCount + 1, splitLineCount + 1);
  const textareaCls = "w-full bg-bg-main border border-primary/10 rounded-[var(--radius-input)] p-4 text-primary text-sm italic font-serif leading-relaxed outline-none focus:bg-white-custom focus:border-primary/40 transition-all resize-none";

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
      className={`rounded-[var(--radius-btn)] border transition-all ${isNew ? "border-amber-500/30 bg-amber-500/10" : "border-primary/10 bg-white-custom"} ${expanded ? "shadow-xl shadow-primary/8" : "shadow-sm"}`}>

      <div className="flex items-center gap-2 p-3 md:p-4">
        <span className="text-[10px] font-black text-primary/30 italic w-7 text-center flex-shrink-0">
          {(idx + 1).toString().padStart(2, "0")}
        </span>
        <input type="text" value={sec.nombre_seccion}
          onChange={e => onChange(sec.id, "nombre_seccion", e.target.value.toUpperCase())}
          className="flex-1 min-w-0 bg-transparent text-primary font-black uppercase text-[11px] tracking-widest outline-none border-b border-transparent focus:border-primary/30 transition-colors pb-0.5 truncate"
          placeholder="NOMBRE DE SECCIÓN" />
        <div className="flex gap-0.5 flex-shrink-0">
          <button disabled={idx === 0} onClick={() => onMover(idx, -1)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-input)] text-primary/40 hover:text-primary hover:bg-primary/5 disabled:opacity-20 active:scale-90 transition-all touch-manipulation">
            <ChevronUp size={14} />
          </button>
          <button disabled={idx === total - 1} onClick={() => onMover(idx, 1)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-input)] text-primary/40 hover:text-primary hover:bg-primary/5 disabled:opacity-20 active:scale-90 transition-all touch-manipulation">
            <ChevronDown size={14} />
          </button>
        </div>
        <button onClick={onToggleExpand}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-input)] bg-primary/5 text-primary active:scale-90 transition-all touch-manipulation flex-shrink-0">
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </button>
        <BtnIcon variant="danger" size="sm" onClick={() => onEliminar(idx)} className="border-none w-8 h-8 flex-shrink-0">
          <Trash2 size={13} />
        </BtnIcon>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className={`px-3 pb-4 md:px-5 md:pb-5 ${splitMode && splitLetraKey ? "grid grid-cols-2 gap-3" : ""}`}>
              <div className="flex flex-col gap-1">
                {splitMode && splitLetraKey && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/50 px-1">
                    {IDIOMAS.find(i => i.id === activeTab)?.nombre}
                  </span>
                )}
                <textarea value={letraVal} onChange={e => onChange(sec.id, letraKey, e.target.value)}
                  rows={maxRows} className={textareaCls}
                  placeholder={`Contenido en ${IDIOMAS.find(i => i.id === activeTab)?.nombre.toLowerCase()}...`}
                  style={{ fontSize: "16px" }} />
              </div>
              {splitMode && splitLetraKey && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/50 px-1">
                    {IDIOMAS.find(i => i.id === splitTab)?.nombre}
                  </span>
                  <textarea value={splitLetraVal} onChange={e => onChange(sec.id, splitLetraKey, e.target.value)}
                    rows={maxRows} className={textareaCls.replace("bg-bg-main border-primary/10", "bg-primary/5 border-primary/15")}
                    placeholder={`Contenido en ${IDIOMAS.find(i => i.id === splitTab)?.nombre.toLowerCase()}...`}
                    style={{ fontSize: "16px" }} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && letraVal && (
        <div className="px-4 pb-3">
          <p className="text-primary/40 text-[11px] italic font-serif leading-relaxed line-clamp-2">
            {letraVal.split("\n").slice(0, 2).join(" · ")}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Modal principal ────────────────────────────────────────────────────────────
interface MassEditModalProps {
  isOpen: boolean; onClose: () => void; secciones: Seccion[];
  isProcessing: boolean; onSave: (secciones: Seccion[]) => Promise<void>;
  cancionId?: string | number;
}

export const MassEditModal: React.FC<MassEditModalProps> = ({ isOpen, onClose, secciones, isProcessing, onSave, cancionId = "draft" }) => {
  const [localSecciones, setLocalSecciones]   = useState<Seccion[]>([]);
  const [activeTab, setActiveTab]             = useState("es");
  const [splitMode, setSplitMode]             = useState(false);
  const [splitTab, setSplitTab]               = useState<string | null>(null);
  const [expandedIds, setExpandedIds]         = useState<Set<string | number>>(new Set());
  const [saveStatus, setSaveStatus]           = useState<SaveStatus>("idle");
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  const saveTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSeccionesRef    = useRef<Seccion[]>([]);
  const isSavingRef          = useRef(false);
  const isOpenRef            = useRef(false);
  const { isOnline, isSlow } = useNetworkStatus();
  const { saveDraft, loadDraft, clearDraft } = useDraftStorage(String(cancionId));

  useEffect(() => { localSeccionesRef.current = localSecciones; }, [localSecciones]);

  useEffect(() => {
    if (!isOpen) { isOpenRef.current = false; return; }
    if (isOpenRef.current) return;
    isOpenRef.current = true;
    const draft = loadDraft();
    if (draft && Date.now() - draft.ts < 1000 * 60 * 60 * 4) {
      setShowRecoveryBanner(true);
      setLocalSecciones(draft.data);
      setCambiosPendientes(true);
      setSaveStatus("draft");
    } else {
      clearDraft();
      setLocalSecciones(JSON.parse(JSON.stringify(secciones)));
      setCambiosPendientes(false);
      setSaveStatus("idle");
    }
    if (secciones.length > 0) setExpandedIds(new Set([secciones[0].id]));
  }, [isOpen]);

  const guardarEnServidor = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus("saving");
    try {
      await onSave(localSeccionesRef.current.map((s, i) => ({ ...s, orden: i + 1 })));
      clearDraft(); setCambiosPendientes(false); setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch { setSaveStatus("error"); }
    finally { isSavingRef.current = false; }
  }, [onSave, clearDraft]);

  useEffect(() => {
    if (!cambiosPendientes || isProcessing) return;
    saveDraft(localSeccionesRef.current);
    if (!isOnline) { setSaveStatus("offline"); return; }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => guardarEnServidor(), isSlow ? 5000 : 2500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [cambiosPendientes, isOnline, isSlow, isProcessing, guardarEnServidor]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isOpen) {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        guardarEnServidor();
      }
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, guardarEnServidor]);

  const handleChange = useCallback((id: string | number, campo: string, valor: string) => {
    setLocalSecciones(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const copia = [...prev];
      copia[idx] = { ...copia[idx], [campo]: valor };
      return copia;
    });
    setCambiosPendientes(true);
    if (saveStatus !== "saving") setSaveStatus("draft");
  }, [saveStatus]);

  const moverSeccion = (index: number, dir: number) => {
    const ni = index + dir;
    if (ni < 0 || ni >= localSecciones.length) return;
    setLocalSecciones(prev => { const c = [...prev]; [c[index], c[ni]] = [c[ni], c[index]]; return c; });
    setCambiosPendientes(true);
  };

  const eliminarSeccion = (index: number) => {
    if (!confirm("¿Eliminar esta sección? No se puede deshacer.")) return;
    const sec = localSecciones[index];
    setExpandedIds(prev => { const n = new Set(prev); n.delete(sec.id); return n; });
    setLocalSecciones(prev => prev.filter((_, i) => i !== index));
    setCambiosPendientes(true);
  };

  const añadirSeccion = () => {
    const nueva: Seccion = { id: `temp-${Date.now()}`, nombre_seccion: "NUEVA SECCIÓN", letra_es: "", letra_en: "", letra_jp: "", letra_romaji: "" };
    setLocalSecciones(prev => [...prev, nueva]);
    setExpandedIds(prev => new Set([...prev, nueva.id]));
    setCambiosPendientes(true);
  };

  const toggleExpand   = (id: string | number) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll      = () => setExpandedIds(new Set(localSecciones.map(s => s.id)));
  const collapseAll    = () => setExpandedIds(new Set());
  const descartarBorrador = () => { clearDraft(); setLocalSecciones(JSON.parse(JSON.stringify(secciones))); setCambiosPendientes(false); setSaveStatus("idle"); setShowRecoveryBanner(false); };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-md" />
        <motion.div
          initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative z-10 w-full bg-bg-main flex flex-col h-[96dvh] rounded-t-[2rem] md:h-[92vh] md:max-w-4xl md:rounded-[var(--radius-card)] md:mx-4 shadow-2xl border border-primary/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-white-custom border-b border-primary/10">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-primary/20 rounded-full" />
            </div>
            <div className="px-4 py-3 md:px-8 md:py-5 flex items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-primary p-2 rounded-[var(--radius-btn)] flex-shrink-0" style={{ color: "var(--btn-text)" }}>
                  <Layers size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-primary font-black uppercase text-[11px] tracking-[0.25em] italic truncate">Editor Maestro</h3>
                  <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">{localSecciones.length} secciones</p>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <SaveStatusPill key={saveStatus} status={saveStatus} isSlow={isSlow} />
              </AnimatePresence>
              {!isOnline && <WifiOff size={16} className="text-slate-400 flex-shrink-0" title="Sin conexión" />}
              <BtnIcon variant="ghost" onClick={onClose} className="border-none text-primary/30 hover:text-red-500 hover:bg-red-500/15 flex-shrink-0">
                <X size={20} />
              </BtnIcon>
            </div>

            {/* Tabs de idioma */}
            <div className="px-4 pb-3 md:px-8 md:pb-4 flex flex-col gap-2">
              <div className="flex gap-1 bg-primary/5 p-1 rounded-[var(--radius-btn)] border border-primary/10 overflow-x-auto scrollbar-none">
                {IDIOMAS.map(lang => (
                  <button key={lang.id} onClick={() => setActiveTab(lang.id)}
                    className={`flex-1 min-w-[3.5rem] py-2.5 rounded-[var(--radius-input)] font-black text-[10px] uppercase transition-all touch-manipulation whitespace-nowrap ${activeTab === lang.id ? "bg-primary shadow-md" : "text-primary/50 hover:text-primary"}`}
                    style={activeTab === lang.id ? { color: "var(--btn-text)" } : {}}>
                    {lang.label}
                    <span className="hidden md:inline ml-1 font-normal normal-case opacity-60">· {lang.nombre}</span>
                  </button>
                ))}
                <button
                  onClick={() => { if (splitMode) { setSplitMode(false); setSplitTab(null); } else { setSplitTab(IDIOMAS.find(i => i.id !== activeTab)?.id ?? null); setSplitMode(true); } }}
                  title="Modo doble idioma"
                  className={`flex items-center gap-1 px-3 py-2.5 rounded-[var(--radius-input)] font-black text-[10px] uppercase transition-all touch-manipulation whitespace-nowrap flex-shrink-0 ${splitMode ? "bg-accent shadow-md" : "text-primary/50 hover:text-primary"}`}
                  style={splitMode ? { color: "var(--btn-text)" } : {}}>
                  <Columns size={12} />
                  <span className="hidden md:inline">Split</span>
                </button>
              </div>
              <AnimatePresence>
                {splitMode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-violet-500 whitespace-nowrap flex-shrink-0">2do idioma:</span>
                      <div className="flex gap-1 bg-accent/10 p-1 rounded-[var(--radius-btn)] border border-accent/20 overflow-x-auto scrollbar-none flex-1">
                        {IDIOMAS.filter(i => i.id !== activeTab).map(lang => (
                          <button key={lang.id} onClick={() => setSplitTab(lang.id)}
                            className={`flex-1 min-w-[3.5rem] py-2 rounded-[var(--radius-input)] font-black text-[10px] uppercase transition-all touch-manipulation whitespace-nowrap ${splitTab === lang.id ? "bg-accent shadow-md" : "text-accent/70 hover:text-accent"}`}
                            style={splitTab === lang.id ? { color: "var(--btn-text)" } : {}}>
                            {lang.label}
                            <span className="hidden md:inline ml-1 font-normal normal-case opacity-60">· {lang.nombre}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Banner de recuperación */}
          <AnimatePresence>
            {showRecoveryBanner && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 md:px-8">
                <div className="flex items-center gap-3">
                  <RotateCcw size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-300">Borrador recuperado</p>
                    <p className="text-[10px] text-amber-500/80">Tenías cambios sin guardar. ¿Continuar desde aquí?</p>
                  </div>
                  <button onClick={descartarBorrador} className="text-[10px] font-bold text-amber-600 dark:text-amber-300 hover:opacity-80 underline whitespace-nowrap touch-manipulation px-2 py-1">Descartar</button>
                  <Btn size="sm" onClick={() => setShowRecoveryBanner(false)} className="bg-amber-500 hover:bg-amber-600 whitespace-nowrap">Continuar</Btn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barra expandir/colapsar */}
          <div className="flex-shrink-0 px-4 py-2 md:px-8 flex items-center gap-2 border-b border-primary/5 bg-white-custom/50">
            <button onClick={expandAll} className="text-[10px] font-bold text-primary/50 hover:text-primary transition-colors touch-manipulation px-2 py-1">Expandir todo</button>
            <span className="text-primary/20">·</span>
            <button onClick={collapseAll} className="text-[10px] font-bold text-primary/50 hover:text-primary transition-colors touch-manipulation px-2 py-1">Colapsar todo</button>
            <div className="flex-1" />
            <span className="text-[9px] font-bold text-primary/30 uppercase tracking-widest hidden md:block">
              {isSlow ? "🐢 Red lenta · guardado cada 5s" : "Auto-guardado activado"}
            </span>
          </div>

          {/* Lista de secciones */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-8 md:py-6 space-y-3">
            <AnimatePresence mode="popLayout">
              {localSecciones.map((sec, idx) => (
                <SeccionCard key={sec.id} sec={sec} idx={idx} total={localSecciones.length}
                  activeTab={activeTab} splitTab={splitTab} splitMode={splitMode}
                  onChange={handleChange} onMover={moverSeccion} onEliminar={eliminarSeccion}
                  expanded={expandedIds.has(sec.id)} onToggleExpand={() => toggleExpand(sec.id)} />
              ))}
            </AnimatePresence>
            <motion.button layout onClick={añadirSeccion}
              className="w-full py-6 md:py-8 border border-dashed border-primary/15 rounded-[var(--radius-btn)] text-primary/40 hover:border-primary/40 hover:text-primary hover:bg-primary/3 active:scale-[0.98] transition-all flex flex-col items-center gap-2 touch-manipulation">
              <Plus size={20} />
              <span className="font-black uppercase text-[10px] tracking-widest">Añadir nueva sección</span>
            </motion.button>
            <div className="h-4" />
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white-custom border-t border-primary/10 px-4 py-3 md:px-8 md:py-5">
            <div className="flex items-center gap-3">
              <p className="flex-1 text-[9px] font-bold text-primary/40 uppercase tracking-wider hidden md:block">
                {isOnline ? `💡 Ctrl+S para guardar · ${isSlow ? "Red lenta: guardado cada 5s" : "Auto: cada 2.5s"}` : "⚠️ Sin conexión · Los cambios están en borrador local"}
              </p>
              <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
              <Btn
                loading={saveStatus === "saving"}
                icon={<Save size={14} />}
                onClick={() => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); guardarEnServidor(); }}
                disabled={!cambiosPendientes || saveStatus === "saving" || !isOnline}
              >
                <span className="hidden md:inline">{saveStatus === "saving" ? "Guardando..." : "Guardar ahora"}</span>
                <span className="md:hidden">{saveStatus === "saving" ? "..." : "Guardar"}</span>
              </Btn>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MassEditModal;