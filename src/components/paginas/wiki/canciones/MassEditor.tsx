"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  X, Save, Plus, Trash2, ChevronUp, ChevronDown,
  Layers, Loader2, CheckCircle, WifiOff, Wifi,
  AlertTriangle, GripVertical, ChevronLeft, ChevronRight,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

const IDIOMAS = [
  { id: "es", label: "ES", nombre: "Español" },
  { id: "en", label: "EN", nombre: "Inglés" },
  { id: "jp", label: "JP", nombre: "Japonés" },
  { id: "romaji", label: "RO", nombre: "Reading" }
];

type Seccion = {
  id: string | number;
  nombre_seccion: string;
  letra_es?: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden?: number;
};

// ============================================================================
// HOOK: DETECCIÓN DE RED LENTA
// ============================================================================

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    // Detección de red lenta via navigator.connection (cuando disponible)
    const conn = (navigator as any).connection;
    if (conn) {
      const checkSpeed = () => {
        const slowTypes = ["slow-2g", "2g"];
        setIsSlow(slowTypes.includes(conn.effectiveType) || conn.downlink < 1);
      };
      checkSpeed();
      conn.addEventListener("change", checkSpeed);
      return () => {
        window.removeEventListener("online", updateStatus);
        window.removeEventListener("offline", updateStatus);
        conn.removeEventListener("change", checkSpeed);
      };
    }

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return { isOnline, isSlow };
}

// ============================================================================
// HOOK: BORRADOR LOCAL (anti-pérdida de datos)
// ============================================================================

function useDraftStorage(key: string) {
  const saveDraft = useCallback((data: Seccion[]) => {
    try {
      localStorage.setItem(`draft_${key}`, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
  }, [key]);

  const loadDraft = useCallback((): { data: Seccion[]; ts: number } | null => {
    try {
      const raw = localStorage.getItem(`draft_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [key]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(`draft_${key}`); } catch {}
  }, [key]);

  return { saveDraft, loadDraft, clearDraft };
}

// ============================================================================
// COMPONENTE: BARRA DE ESTADO DE GUARDADO (top pill)
// ============================================================================

type SaveStatus = "idle" | "draft" | "saving" | "saved" | "error" | "offline";

function SaveStatusPill({ status, isSlow }: { status: SaveStatus; isSlow: boolean }) {
  const config: Record<SaveStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle:    { label: "",                  color: "",                                          icon: null },
    draft:   { label: "Borrador local",   color: "bg-amber-100 text-amber-700 border-amber-200", icon: <AlertTriangle size={12} /> },
    saving:  { label: isSlow ? "Guardando (red lenta)..." : "Guardando...", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Loader2 size={12} className="animate-spin" /> },
    saved:   { label: "Guardado ✓",       color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle size={12} /> },
    error:   { label: "Error al guardar", color: "bg-red-100 text-red-700 border-red-200",         icon: <AlertTriangle size={12} /> },
    offline: { label: "Sin conexión · Borrador guardado", color: "bg-slate-100 text-slate-600 border-slate-200", icon: <WifiOff size={12} /> },
  };

  const cfg = config[status];
  if (!cfg.label) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </motion.div>
  );
}

// ============================================================================
// COMPONENTE: TARJETA DE SECCIÓN (móvil-first)
// ============================================================================

function SeccionCard({
  sec,
  idx,
  total,
  activeTab,
  onChange,
  onMover,
  onEliminar,
  expanded,
  onToggleExpand,
}: {
  sec: Seccion;
  idx: number;
  total: number;
  activeTab: string;
  onChange: (id: string | number, campo: string, valor: string) => void;
  onMover: (idx: number, dir: number) => void;
  onEliminar: (idx: number) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const isNew = sec.id.toString().startsWith("temp-");
  const letraKey = `letra_${activeTab}`;
  const letraVal = (sec as any)[letraKey] || "";
  const lineCount = letraVal.split("\n").length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      className={`rounded-[1.5rem] border transition-all ${
        isNew
          ? "border-amber-200 bg-amber-50/50"
          : "border-[#6B5E70]/10 bg-white"
      } ${expanded ? "shadow-xl shadow-[#6B5E70]/8" : "shadow-sm"}`}
    >
      {/* Header de la tarjeta */}
      <div className="flex items-center gap-2 p-3 md:p-4">
        {/* Número */}
        <span className="text-[10px] font-black text-[#6B5E70]/30 italic w-7 text-center flex-shrink-0">
          {(idx + 1).toString().padStart(2, "0")}
        </span>

        {/* Nombre editable */}
        <input
          type="text"
          value={sec.nombre_seccion}
          onChange={(e) => onChange(sec.id, "nombre_seccion", e.target.value.toUpperCase())}
          className="flex-1 min-w-0 bg-transparent text-[#6B5E70] font-black uppercase text-[11px] tracking-widest outline-none border-b border-transparent focus:border-[#6B5E70]/30 transition-colors pb-0.5 truncate"
          placeholder="NOMBRE DE SECCIÓN"
        />

        {/* Botones de reorden (siempre visibles en móvil) */}
        <div className="flex gap-0.5 flex-shrink-0">
          <button
            disabled={idx === 0}
            onClick={() => onMover(idx, -1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B5E70]/40 hover:text-[#6B5E70] hover:bg-[#6B5E70]/5 disabled:opacity-20 active:scale-90 transition-all touch-manipulation"
          >
            <ChevronUp size={14} />
          </button>
          <button
            disabled={idx === total - 1}
            onClick={() => onMover(idx, 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B5E70]/40 hover:text-[#6B5E70] hover:bg-[#6B5E70]/5 disabled:opacity-20 active:scale-90 transition-all touch-manipulation"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#6B5E70]/5 text-[#6B5E70] active:scale-90 transition-all touch-manipulation flex-shrink-0"
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </button>

        {/* Eliminar */}
        <button
          onClick={() => onEliminar(idx)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 active:scale-90 transition-all touch-manipulation flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Área de texto — solo visible cuando expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 md:px-5 md:pb-5">
              <textarea
                value={letraVal}
                onChange={(e) => onChange(sec.id, letraKey, e.target.value)}
                rows={Math.max(4, lineCount + 1)}
                className="w-full bg-[#FDFCFD] border border-[#6B5E70]/10 rounded-[1rem] p-4 text-[#6B5E70] text-sm italic font-serif leading-relaxed outline-none focus:bg-white focus:border-[#6B5E70]/40 transition-all resize-none"
                placeholder={`Contenido en ${IDIOMAS.find((i) => i.id === activeTab)?.nombre.toLowerCase()}...`}
                style={{ fontSize: "16px" /* evita zoom en iOS */ }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview de líneas cuando colapsado */}
      {!expanded && letraVal && (
        <div className="px-4 pb-3">
          <p className="text-[#6B5E70]/40 text-[11px] italic font-serif leading-relaxed line-clamp-2">
            {letraVal.split("\n").slice(0, 2).join(" · ")}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MODAL PRINCIPAL: EDITOR MAESTRO v2
// ============================================================================

interface MassEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  secciones: Seccion[];
  isProcessing: boolean;
  onSave: (secciones: Seccion[]) => Promise<void>;
  cancionId?: string | number; // para el borrador local
}

export const MassEditModal: React.FC<MassEditModalProps> = ({
  isOpen,
  onClose,
  secciones,
  isProcessing,
  onSave,
  cancionId = "draft",
}) => {
  const [localSecciones, setLocalSecciones] = useState<Seccion[]>([]);
  const [activeTab, setActiveTab] = useState("es");
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [hasDraftRecovery, setHasDraftRecovery] = useState(false);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isOnline, isSlow } = useNetworkStatus();
  const { saveDraft, loadDraft, clearDraft } = useDraftStorage(String(cancionId));

  // Inicializar datos y verificar si hay borrador recuperable
  useEffect(() => {
    if (!isOpen) return;
    const draft = loadDraft();
    const ahora = Date.now();
    const MAX_DRAFT_AGE = 1000 * 60 * 60 * 4; // 4 horas

    if (draft && ahora - draft.ts < MAX_DRAFT_AGE) {
      setHasDraftRecovery(true);
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
    // Expandir la primera sección por defecto
    if (secciones.length > 0) {
      setExpandedIds(new Set([secciones[0].id]));
    }
  }, [isOpen]);

  // Auto-guardado inteligente (respeta conexión lenta)
  useEffect(() => {
    if (!cambiosPendientes || isProcessing) return;

    // Siempre guardar borrador local inmediatamente
    saveDraft(localSecciones);

    if (!isOnline) {
      setSaveStatus("offline");
      return;
    }

    // Debounce más largo si red lenta
    const delay = isSlow ? 5000 : 2500;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await guardarEnServidor();
    }, delay);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [cambiosPendientes, localSecciones, isOnline, isSlow, isProcessing]);

  const guardarEnServidor = async () => {
    setSaveStatus("saving");
    try {
      const conOrden = localSecciones.map((s, i) => ({ ...s, orden: i + 1 }));
      await onSave(conOrden);
      clearDraft();
      setCambiosPendientes(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  // Ctrl+S / Cmd+S
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
  }, [isOpen, localSecciones]);

  const handleChange = useCallback((id: string | number, campo: string, valor: string) => {
    setLocalSecciones((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
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
    setLocalSecciones((prev) => {
      const c = [...prev];
      [c[index], c[ni]] = [c[ni], c[index]];
      return c;
    });
    setCambiosPendientes(true);
  };

  const eliminarSeccion = (index: number) => {
    if (!confirm("¿Eliminar esta sección? No se puede deshacer.")) return;
    const sec = localSecciones[index];
    setExpandedIds((prev) => {
      const n = new Set(prev);
      n.delete(sec.id);
      return n;
    });
    setLocalSecciones((prev) => prev.filter((_, i) => i !== index));
    setCambiosPendientes(true);
  };

  const añadirSeccion = () => {
    const nueva: Seccion = {
      id: `temp-${Date.now()}`,
      nombre_seccion: "NUEVA SECCIÓN",
      letra_es: "",
      letra_en: "",
      letra_jp: "",
      letra_romaji: "",
    };
    setLocalSecciones((prev) => [...prev, nueva]);
    setExpandedIds((prev) => new Set([...prev, nueva.id]));
    setCambiosPendientes(true);
  };

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const expandAll = () => setExpandedIds(new Set(localSecciones.map((s) => s.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const descartarBorrador = () => {
    clearDraft();
    setLocalSecciones(JSON.parse(JSON.stringify(secciones)));
    setCambiosPendientes(false);
    setSaveStatus("idle");
    setShowRecoveryBanner(false);
    setHasDraftRecovery(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#6B5E70]/40 backdrop-blur-md"
        />

        {/* Panel principal — bottom sheet en móvil, modal centrado en desktop */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="
            relative z-10 w-full bg-[#FDFCFD] flex flex-col
            h-[96dvh] rounded-t-[2rem]
            md:h-[92vh] md:max-w-4xl md:rounded-[2.5rem] md:mx-4
            shadow-2xl border border-[#6B5E70]/10 overflow-hidden
          "
        >
          {/* ───── HEADER ───── */}
          <div className="flex-shrink-0 bg-white border-b border-[#6B5E70]/10">
            {/* Pill de drag en móvil */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-[#6B5E70]/20 rounded-full" />
            </div>

            <div className="px-4 py-3 md:px-8 md:py-5 flex items-center gap-3">
              {/* Icono + título */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-[#6B5E70] p-2 rounded-xl text-white flex-shrink-0">
                  <Layers size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[#6B5E70] font-black uppercase text-[11px] tracking-[0.25em] italic truncate">
                    Editor Maestro
                  </h3>
                  <p className="text-[9px] font-bold text-[#6B5E70]/40 uppercase tracking-widest">
                    {localSecciones.length} secciones
                  </p>
                </div>
              </div>

              {/* Estado de guardado */}
              <AnimatePresence mode="wait">
                <SaveStatusPill key={saveStatus} status={saveStatus} isSlow={isSlow} />
              </AnimatePresence>

              {/* Indicador de red (icono compacto) */}
              {!isOnline && (
                <div className="text-slate-400 flex-shrink-0" title="Sin conexión">
                  <WifiOff size={16} />
                </div>
              )}

              {/* Cerrar */}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6B5E70]/30 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 touch-manipulation flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de idioma — scrollable en móvil */}
            <div className="px-4 pb-3 md:px-8 md:pb-4">
              <div className="flex gap-1 bg-[#6B5E70]/5 p-1 rounded-xl border border-[#6B5E70]/10 overflow-x-auto scrollbar-none">
                {IDIOMAS.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setActiveTab(lang.id)}
                    className={`flex-1 min-w-[3.5rem] py-2.5 rounded-lg font-black text-[10px] uppercase transition-all touch-manipulation whitespace-nowrap ${
                      activeTab === lang.id
                        ? "bg-[#6B5E70] text-white shadow-md"
                        : "text-[#6B5E70]/50 hover:text-[#6B5E70]"
                    }`}
                  >
                    {lang.label}
                    <span className="hidden md:inline ml-1 font-normal normal-case opacity-60">
                      · {lang.nombre}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ───── BANNER DE RECUPERACIÓN ───── */}
          <AnimatePresence>
            {showRecoveryBanner && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-3 md:px-8"
              >
                <div className="flex items-center gap-3">
                  <RotateCcw size={16} className="text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-amber-800">
                      Borrador recuperado
                    </p>
                    <p className="text-[10px] text-amber-600">
                      Tenías cambios sin guardar. ¿Continuar desde aquí?
                    </p>
                  </div>
                  <button
                    onClick={descartarBorrador}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline whitespace-nowrap touch-manipulation px-2 py-1"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => setShowRecoveryBanner(false)}
                    className="text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg touch-manipulation whitespace-nowrap"
                  >
                    Continuar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ───── TOOLBAR DE SECCIONES ───── */}
          <div className="flex-shrink-0 px-4 py-2 md:px-8 flex items-center gap-2 border-b border-[#6B5E70]/5 bg-white/50">
            <button
              onClick={expandAll}
              className="text-[10px] font-bold text-[#6B5E70]/50 hover:text-[#6B5E70] transition-colors touch-manipulation px-2 py-1"
            >
              Expandir todo
            </button>
            <span className="text-[#6B5E70]/20">·</span>
            <button
              onClick={collapseAll}
              className="text-[10px] font-bold text-[#6B5E70]/50 hover:text-[#6B5E70] transition-colors touch-manipulation px-2 py-1"
            >
              Colapsar todo
            </button>
            <div className="flex-1" />
            <span className="text-[9px] font-bold text-[#6B5E70]/30 uppercase tracking-widest hidden md:block">
              {isSlow ? "🐢 Red lenta · guardado cada 5s" : "Auto-guardado activado"}
            </span>
          </div>

          {/* ───── LISTA DE SECCIONES ───── */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-8 md:py-6 space-y-3">
            <AnimatePresence mode="popLayout">
              {localSecciones.map((sec, idx) => (
                <SeccionCard
                  key={sec.id}
                  sec={sec}
                  idx={idx}
                  total={localSecciones.length}
                  activeTab={activeTab}
                  onChange={handleChange}
                  onMover={moverSeccion}
                  onEliminar={eliminarSeccion}
                  expanded={expandedIds.has(sec.id)}
                  onToggleExpand={() => toggleExpand(sec.id)}
                />
              ))}
            </AnimatePresence>

            {/* Botón añadir sección */}
            <motion.button
              layout
              onClick={añadirSeccion}
              className="w-full py-6 md:py-8 border-2 border-dashed border-[#6B5E70]/15 rounded-[1.5rem] text-[#6B5E70]/40 hover:border-[#6B5E70]/40 hover:text-[#6B5E70] hover:bg-[#6B5E70]/3 active:scale-[0.98] transition-all flex flex-col items-center gap-2 touch-manipulation"
            >
              <Plus size={20} />
              <span className="font-black uppercase text-[10px] tracking-widest">
                Añadir nueva sección
              </span>
            </motion.button>

            {/* Espacio extra para el footer fijo */}
            <div className="h-4" />
          </div>

          {/* ───── FOOTER ───── */}
          <div className="flex-shrink-0 bg-white border-t border-[#6B5E70]/10 px-4 py-3 md:px-8 md:py-5">
            <div className="flex items-center gap-3">
              {/* Info de guardado */}
              <p className="flex-1 text-[9px] font-bold text-[#6B5E70]/40 uppercase tracking-wider hidden md:block">
                {isOnline
                  ? `💡 Ctrl+S para guardar · ${isSlow ? "Red lenta: guardado cada 5s" : "Auto: cada 2.5s"}`
                  : "⚠️ Sin conexión · Los cambios están en borrador local"}
              </p>

              {/* Cerrar sin guardar */}
              <button
                onClick={onClose}
                className="px-5 py-3 md:px-6 bg-[#6B5E70]/8 text-[#6B5E70] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#6B5E70]/15 transition-colors touch-manipulation"
              >
                Cerrar
              </button>

              {/* Guardar ahora */}
              <button
                onClick={() => {
                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                  guardarEnServidor();
                }}
                disabled={!cambiosPendientes || saveStatus === "saving" || !isOnline}
                className="
                  flex items-center gap-2 px-5 py-3 md:px-7
                  bg-[#6B5E70] text-white rounded-xl font-black uppercase text-[10px] tracking-widest
                  hover:bg-[#5A4D5F] active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all touch-manipulation
                "
              >
                {saveStatus === "saving" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span className="hidden md:inline">
                  {saveStatus === "saving" ? "Guardando..." : "Guardar ahora"}
                </span>
                <span className="md:hidden">
                  {saveStatus === "saving" ? "..." : "Guardar"}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MassEditModal;