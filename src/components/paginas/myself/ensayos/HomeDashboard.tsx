"use client";
import React, { useMemo, useState } from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { Star, FileText, ArrowRight, Hash, Clock, CheckSquare, Plus, Check, X, ShoppingCart, Dumbbell, Package, UtensilsCrossed, ChevronLeft, Search, Shirt } from "lucide-react";

import { AnimatePresence } from "framer-motion";
import { RelojDigital } from "@/components/paginas/myself/ensayos/personal/tareas/relojDigital";
import { VistaMes } from "@/components/paginas/myself/ensayos/personal/tareas/vistaMes";
import { VistaSemanal } from "@/components/paginas/myself/ensayos/personal/tareas/vistaSemanal";
import type { ModoCalendario } from "@/components/paginas/myself/ensayos/personal/tareas/types";
import ComprasPage from "@/components/paginas/myself/ensayos/personal/compras";
import { PaginaEjercicios } from "@/components/paginas/myself/ensayos/personal/ejerciciosComponent";
import { IngredientesPage } from "@/components/paginas/myself/ensayos/personal/ingredientes";
import RecetasPage from "@/components/paginas/myself/ensayos/personal/recetas";
import ArmarioPage from "@/components/paginas/myself/ensayos/personal/ropa";

interface HomeDashboardProps {
  ensayos: any[];
  todosLosTags: string[];
  onNavigate: (titulo: string) => void;
  onTagClick: (tag: string) => void;
  tareas?: any[];
  onToggleTarea?: (id: string, completada: boolean) => void;
  onAddTarea?: (titulo: string) => void;
  eventos?: any[];
  capitulosRaw?: any[];
  horario?: any[];
  isAddingEvento?: boolean;
  onAddEvento?: (fechaISO: string, titulo: string, tipo: string) => Promise<void>;
}

export function HomeDashboard({
  ensayos, todosLosTags, onNavigate, onTagClick,
  tareas = [], onToggleTarea, onAddTarea,
  eventos = [], capitulosRaw = [], horario = [],
  isAddingEvento = false, onAddEvento,
}: HomeDashboardProps) {
  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
  const serif: React.CSSProperties = { fontFamily: "var(--font-serif)", fontStyle: "italic" };

  const [nuevaTarea, setNuevaTarea] = useState("");
  const [modoCalendario, setModoCalendario] = useState<ModoCalendario>("mes");
  const [panelAbierto, setPanelAbierto] = useState<"reloj" | "tareas" | null>(null);
  const [vistaPersonal, setVistaPersonal] = useState<"compras" | "ejercicios" | "ingredientes" | "recetas" | "ropa" | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const favoritos = useMemo(
    () => ensayos.filter(e => e.tags?.includes("favorito")).slice(0, 10),
    [ensayos]
  );

  const totalPalabras = useMemo(
    () => ensayos.reduce((acc, e) => acc + (e.contenido?.split(/\s+/).filter(Boolean).length || 0), 0),
    [ensayos]
  );

  const tagMasUsado = useMemo(() => {
    const freq: Record<string, number> = {};
    ensayos.forEach(e => e.tags?.forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [ensayos]);

  const pendientes = useMemo(() => tareas.filter(t => !t.completada).slice(0, 10), [tareas]);
  const completadas = useMemo(() => tareas.filter(t => t.completada).slice(0, 4), [tareas]);

  const handleAddTarea = () => {
    if (!nuevaTarea.trim() || !onAddTarea) return;
    onAddTarea(nuevaTarea.trim());
    setNuevaTarea("");
  };

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 2) return "ahora";
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  const handleAddEvento = onAddEvento ?? (async () => {});

  const gap = 1;
  const divColor = "color-mix(in srgb, var(--foreground) 5%, transparent)";

  /* ── Sección reutilizable ── */
  const SectionHeader = ({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      {icon}
      <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em", flex: 1 }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          ...mono, fontSize: 7,
          background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
          color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
          padding: "1px 5px", borderRadius: 99,
        }}>{count}</span>
      )}
    </div>
  );

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-full overflow-y-auto"
      style={{ background: "var(--bg-main)" }}
    >
      <style>{`
        @media (max-width: 767px) {
          .hd-main-grid {
            display: flex !important;
            flex-direction: column !important;
            min-height: unset !important;
          }
          .hd-mes { min-height: 340px !important; }
          .hd-side-panel { display: none !important; }
          .hd-favoritos, .hd-recientes, .hd-tags {
            padding: 14px 16px !important;
          }
          .hd-notes-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .hd-outer-padding {
            padding: 16px 16px 80px !important;
          }
          .hd-stats {
            font-size: 10px !important;
            margin-bottom: 12px !important;
          }
          .hd-personal-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 5px !important;
          }
          .hd-personal-btn span {
            font-size: 9px !important;
          }
          .hd-mobile-actions {
            display: flex !important;
          }
        }
        .hd-mobile-actions { display: none; }
        @media (min-width: 768px) {
          .hd-mobile-actions { display: none !important; }
        }
      `}</style>
      <div className="hd-outer-padding" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px" }}>

        {/* ── Stats mínimo arriba ── */}
        <p className="hd-stats" style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 18%, transparent)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {ensayos.length} notas · {totalPalabras.toLocaleString("es-ES")} palabras
          {tagMasUsado && ` · #${tagMasUsado}`}
          {pendientes.length > 0 && ` · ${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""}`}
        </p>

        {/* Botones móvil: Reloj + Tareas (solo en mobile, arriba del grid) */}
        <div className="hd-mobile-actions" style={{ gap: 6, marginBottom: 10 }}>
          <button
            onClick={() => setPanelAbierto(p => p === "reloj" ? null : "reloj")}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              transition: "all 0.12s", flex: 1, justifyContent: "center",
              background: panelAbierto === "reloj"
                ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
                : "color-mix(in srgb, var(--foreground) 5%, transparent)",
              color: panelAbierto === "reloj"
                ? "color-mix(in srgb, var(--foreground) 80%, transparent)"
                : "color-mix(in srgb, var(--foreground) 40%, transparent)",
            }}
          >
            <Clock size={12} />
            <span style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reloj</span>
          </button>
          <button
            onClick={() => setPanelAbierto(p => p === "tareas" ? null : "tareas")}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              transition: "all 0.12s", flex: 1, justifyContent: "center",
              background: panelAbierto === "tareas"
                ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
                : "color-mix(in srgb, var(--foreground) 5%, transparent)",
              color: panelAbierto === "tareas"
                ? "color-mix(in srgb, var(--foreground) 80%, transparent)"
                : "color-mix(in srgb, var(--foreground) 40%, transparent)",
            }}
          >
            <CheckSquare size={12} />
            <span style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tareas {pendientes.length > 0 && `· ${pendientes.length}`}</span>
          </button>
        </div>

        {/* Panel móvil: Reloj o Tareas inline (solo mobile) */}
        <AnimatePresence>
          {panelAbierto && (
            <MotionDiv
              key={`mobile-panel-${panelAbierto}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                overflow: "hidden",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                border: "1px solid color-mix(in srgb, var(--foreground) 7%, transparent)",
                marginBottom: 8,
              }}
              className="hd-mobile-actions"
            >
              <div style={{ padding: "12px 16px", minHeight: panelAbierto === "reloj" ? 200 : "auto" }}>
                {panelAbierto === "reloj" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180 }}>
                    <RelojDigital horario={horario} tareas={tareas} />
                  </div>
                )}
                {panelAbierto === "tareas" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                      <CheckSquare size={10} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)", marginRight: 6 }} />
                      <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 30%, transparent)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Pendientes</span>
                    </div>
                    {onAddTarea && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          value={nuevaTarea}
                          onChange={e => setNuevaTarea(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddTarea()}
                          placeholder="Nueva tarea..."
                          style={{
                            ...mono, flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 6,
                            border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                            background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                            color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
                            outline: "none", minWidth: 0,
                          }}
                        />
                        <button
                          onClick={handleAddTarea}
                          disabled={!nuevaTarea.trim()}
                          style={{
                            width: 36, height: 36, borderRadius: 6, border: "none", cursor: "pointer",
                            background: nuevaTarea.trim() ? "color-mix(in srgb, var(--foreground) 12%, transparent)" : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                            color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.1s", flexShrink: 0,
                          }}
                        ><Plus size={14} /></button>
                      </div>
                    )}
                    {pendientes.length === 0 && (
                      <p style={{ ...mono, fontSize: 11, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", fontStyle: "italic" }}>Sin pendientes.</p>
                    )}
                    {pendientes.map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => onToggleTarea?.(t.id, t.completada)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 6px", borderRadius: 6, background: "transparent", border: "none",
                          cursor: onToggleTarea ? "pointer" : "default", width: "100%", textAlign: "left",
                        }}
                      >
                        <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} />
                        <span style={{ ...mono, fontSize: 13, color: "color-mix(in srgb, var(--foreground) 65%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.titulo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            FILA PRINCIPAL — grid con areas
            col: VistaMes | Reloj+Tareas | Favoritos+Recientes | Tags
        ══════════════════════════════════════════ */}
        <div className="hd-main-grid" style={{
          display: "grid",
          gridTemplateColumns: "2.4fr 1fr 0.85fr",
          gridTemplateRows: "1fr 1fr",
          gridTemplateAreas: `
            "mes favoritos tags"
            "mes recientes tags"
          `,
          gap: gap,
          background: divColor,
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: gap,
          /* altura fija para que el span funcione bien */
          minHeight: 480,
        }}>

          {/* ── Calendario — span 2 rows (expanded) ── */}
          <div className="hd-mes" style={{ gridArea: "mes", background: "var(--bg-main)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>

            {/* Barra superior: botones icono izquierda + toggle mes/semana derecha */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px 0",
              flexShrink: 0,
            }}>
              {/* Botones de icono — Reloj y Tareas */}
              <div className="hd-side-panel" style={{ display: "flex", gap: 3 }}>
                {/* Botón Reloj */}
                <button
                  onClick={() => setPanelAbierto(p => p === "reloj" ? null : "reloj")}
                  title="Reloj"
                  style={{
                    width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.12s",
                    background: panelAbierto === "reloj"
                      ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                    color: panelAbierto === "reloj"
                      ? "color-mix(in srgb, var(--foreground) 80%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  }}
                  onMouseEnter={e => { if (panelAbierto !== "reloj") { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 8%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 60%, transparent)"; } }}
                  onMouseLeave={e => { if (panelAbierto !== "reloj") { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 30%, transparent)"; } }}
                >
                  <Clock size={11} />
                </button>
                {/* Botón Tareas */}
                <button
                  onClick={() => setPanelAbierto(p => p === "tareas" ? null : "tareas")}
                  title="Tareas"
                  style={{
                    width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.12s",
                    background: panelAbierto === "tareas"
                      ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                    color: panelAbierto === "tareas"
                      ? "color-mix(in srgb, var(--foreground) 80%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  }}
                  onMouseEnter={e => { if (panelAbierto !== "tareas") { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 8%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 60%, transparent)"; } }}
                  onMouseLeave={e => { if (panelAbierto !== "tareas") { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 30%, transparent)"; } }}
                >
                  <CheckSquare size={11} />
                </button>
              </div>

              {/* Toggle Mes / Semana */}
              <div style={{ display: "flex", gap: 2 }}>
                {(["mes", "semana"] as ModoCalendario[]).map(modo => (
                  <button
                    key={modo}
                    onClick={() => setModoCalendario(modo)}
                    style={{
                      ...mono,
                      fontSize: 7,
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      transition: "all 0.12s",
                      background: modoCalendario === modo
                        ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                        : "transparent",
                      color: modoCalendario === modo
                        ? "color-mix(in srgb, var(--foreground) 70%, transparent)"
                        : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                    }}
                  >
                    {modo}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista activa */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
              <AnimatePresence mode="wait">
                {modoCalendario === "mes" ? (
                  <MotionDiv
                    key="mes"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{ height: "100%" }}
                  >
                    <VistaMes
                      eventos={eventos}
                      capitulosRaw={capitulosRaw}
                      isAddingEvento={isAddingEvento}
                      onAddEvento={handleAddEvento}
                    />
                  </MotionDiv>
                ) : (
                  <MotionDiv
                    key="semana"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{ height: "100%", padding: "12px 16px", overflow: "auto" }}
                  >
                    <VistaSemanal
                      eventos={eventos}
                      capitulosRaw={capitulosRaw}
                      isAddingEvento={isAddingEvento}
                      onAddEvento={handleAddEvento}
                    />
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* ── Panel flotante: Reloj ── */}
              <AnimatePresence>
                {panelAbierto === "reloj" && (
                  <MotionDiv
                    key="panel-reloj"
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      background: "var(--bg-main)",
                      zIndex: 10,
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "8px 10px 0", flexShrink: 0 }}>
                      <button
                        onClick={() => setPanelAbierto(null)}
                        style={{
                          width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                          background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                          color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 10%, transparent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)"; }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <RelojDigital horario={horario} tareas={tareas} />
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* ── Panel flotante: Tareas ── */}
              <AnimatePresence>
                {panelAbierto === "tareas" && (
                  <MotionDiv
                    key="panel-tareas"
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      background: "var(--bg-main)",
                      zIndex: 10,
                      display: "flex", flexDirection: "column",
                      padding: "12px 18px 16px",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                      <CheckSquare size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)", marginRight: 6 }} />
                      <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em", flex: 1 }}>
                        Pendientes
                        {pendientes.length > 0 && (
                          <span style={{ marginLeft: 5, fontSize: 7, background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "color-mix(in srgb, var(--foreground) 40%, transparent)", padding: "1px 5px", borderRadius: 99 }}>{pendientes.length}</span>
                        )}
                      </span>
                      <button
                        onClick={() => setPanelAbierto(null)}
                        style={{
                          width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                          background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                          color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 10%, transparent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)"; }}
                      >
                        <X size={10} />
                      </button>
                    </div>

                    {onAddTarea && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        <input
                          type="text"
                          value={nuevaTarea}
                          onChange={e => setNuevaTarea(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddTarea()}
                          placeholder="Nueva tarea..."
                          style={{
                            ...mono, flex: 1, fontSize: 9, padding: "4px 8px", borderRadius: 5,
                            border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                            background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                            color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
                            outline: "none", minWidth: 0,
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--foreground) 20%, transparent)"; e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)"; }}
                          onBlur={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--foreground) 8%, transparent)"; e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 3%, transparent)"; }}
                        />
                        <button
                          onClick={handleAddTarea}
                          disabled={!nuevaTarea.trim()}
                          style={{
                            width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                            background: nuevaTarea.trim() ? "color-mix(in srgb, var(--foreground) 12%, transparent)" : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                            color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.1s", flexShrink: 0,
                          }}
                        ><Plus size={10} /></button>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, overflowY: "auto" }}>
                      {pendientes.length === 0 && (
                        <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", fontStyle: "italic" }}>Sin pendientes.</p>
                      )}
                      {pendientes.map((t, i) => (
                        <MotionDiv key={t.id} initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                          <button
                            onClick={() => onToggleTarea?.(t.id, t.completada)}
                            className="w-full text-left group flex items-center gap-2"
                            style={{ padding: "5px 6px", borderRadius: 5, background: "transparent", border: "none", cursor: onToggleTarea ? "pointer" : "default", transition: "background 0.1s" }}
                            onMouseEnter={e => onToggleTarea && (e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, border: "1px solid color-mix(in srgb, var(--foreground) 20%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} />
                            <span style={{ ...mono, fontSize: 10, color: "color-mix(in srgb, var(--foreground) 65%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.titulo}</span>
                          </button>
                        </MotionDiv>
                      ))}
                      {completadas.length > 0 && pendientes.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                          <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }} />
                          <span style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 18%, transparent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>listas</span>
                          <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }} />
                        </div>
                      )}
                      {completadas.map((t, i) => (
                        <MotionDiv key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                          <button
                            onClick={() => onToggleTarea?.(t.id, t.completada)}
                            className="w-full text-left flex items-center gap-2"
                            style={{ padding: "5px 6px", borderRadius: 5, background: "transparent", border: "none", cursor: onToggleTarea ? "pointer" : "default", opacity: 0.4 }}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: "color-mix(in srgb, var(--foreground) 25%, transparent)", border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              <Check size={6} style={{ color: "var(--bg-main)", strokeWidth: 3 }} />
                            </span>
                            <span style={{ ...mono, fontSize: 10, color: "color-mix(in srgb, var(--foreground) 40%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: "line-through" }}>{t.titulo}</span>
                          </button>
                        </MotionDiv>
                      ))}
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* ── Favoritos ── */}
          <div className="hd-favoritos" style={{ gridArea: "favoritos", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SectionHeader
              icon={<Star size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />}
              label="Favoritos"
            />
            {favoritos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", flex: 1 }}>
                {favoritos.map((f, i) => (
                  <MotionDiv key={f.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <button
                      onClick={() => onNavigate(f.titulo)}
                      className="w-full text-left group flex items-center justify-between"
                      style={{ padding: "6px 8px", borderRadius: 5, background: "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ ...serif, fontSize: 12, color: "color-mix(in srgb, var(--foreground) 70%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.titulo}</span>
                      <ArrowRight size={8} style={{ color: "color-mix(in srgb, var(--foreground) 15%, transparent)", flexShrink: 0, marginLeft: 4, opacity: 0, transition: "opacity 0.1s" }} className="group-hover:opacity-100" />
                    </button>
                  </MotionDiv>
                ))}
              </div>
            ) : (
              <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", lineHeight: 1.6 }}>
                Agrega <span style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}>#favorito</span> a una nota.
              </p>
            )}
          </div>

          {/* ── Personal ── */}
          <div className="hd-recientes" style={{ gridArea: "recientes", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SectionHeader
              icon={<Star size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />}
              label="Personal"
            />
            <div className="hd-personal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1, alignContent: "start" }}>
              {([
                { id: "compras", label: "Compras", icon: <ShoppingCart size={16} /> },
                { id: "ejercicios", label: "Ejercicios", icon: <Dumbbell size={16} /> },
                { id: "ingredientes", label: "Ingredientes", icon: <Package size={16} /> },
                { id: "recetas", label: "Recetas", icon: <UtensilsCrossed size={16} /> },
                { id: "ropa", label: "Ropa", icon: <Shirt size={16} /> },
              ] as const).map(({ id, label, icon }) => (
                <MotionDiv key={id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ gridColumn: id === "ropa" ? "1 / -1" : undefined }}>
                  <button
                    className="hd-personal-btn"
                    onClick={() => setVistaPersonal(id)}
                    style={{
                      width: "100%", padding: "10px 8px", borderRadius: 7,
                      border: "1px solid color-mix(in srgb, var(--foreground) 7%, transparent)",
                      background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 6, transition: "all 0.12s",
                      color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "color-mix(in srgb, var(--foreground) 6%, transparent)";
                      el.style.borderColor = "color-mix(in srgb, var(--foreground) 16%, transparent)";
                      el.style.color = "color-mix(in srgb, var(--foreground) 70%, transparent)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "color-mix(in srgb, var(--foreground) 3%, transparent)";
                      el.style.borderColor = "color-mix(in srgb, var(--foreground) 7%, transparent)";
                      el.style.color = "color-mix(in srgb, var(--foreground) 40%, transparent)";
                    }}
                  >
                    {icon}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
                  </button>
                </MotionDiv>
              ))}
            </div>
          </div>

          {/* ── Tags — span 2 rows ── */}
          <div className="hd-tags" style={{ gridArea: "tags", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SectionHeader
              icon={<Hash size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />}
              label={`Tags · ${todosLosTags.length}`}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", overflowY: "auto", alignContent: "flex-start", flex: 1 }}>
              {todosLosTags.map((tag, i) => {
                const count = ensayos.filter(e => e.tags?.includes(tag)).length;
                return (
                  <MotionDiv key={tag} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <button
                      onClick={() => onTagClick(tag)}
                      style={{
                        ...mono, fontSize: 9, padding: "2px 7px", borderRadius: 4,
                        border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                        background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                        color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                        cursor: "pointer", transition: "all 0.1s",
                        display: "flex", alignItems: "center", gap: 3,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 20%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 70%, transparent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 6%, transparent)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 8%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 40%, transparent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 3%, transparent)"; }}
                    >
                      #{tag}
                      <span style={{ fontSize: 7, color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }}>{count}</span>
                    </button>
                  </MotionDiv>
                );
              })}
              {todosLosTags.length === 0 && (
                <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)" }}>Aún sin tags.</p>
              )}
            </div>
          </div>

        </div>

        {/* ── Todas las notas ── */}
        <div style={{ borderRadius: 8, overflow: "hidden", background: divColor }}>
          <div style={{ background: "var(--bg-main)", padding: "20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <FileText size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
              <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Todas las notas · {ensayos.length}
              </span>
            </div>
            <div className="hd-notes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1, background: divColor, borderRadius: 6, overflow: "hidden" }}>
              {ensayos.map((e, i) => (
                <MotionDiv key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.4) }}>
                  <button
                    onClick={() => onNavigate(e.titulo)}
                    className="w-full text-left group"
                    style={{ display: "block", padding: "10px 12px", background: "var(--bg-main)", border: "none", cursor: "pointer", transition: "background 0.08s" }}
                    onMouseEnter={el => (el.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                    onMouseLeave={el => (el.currentTarget.style.background = "var(--bg-main)")}
                  >
                    <p style={{ ...serif, fontSize: 11, color: "color-mix(in srgb, var(--foreground) 65%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                      {e.titulo || "Sin título"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {e.tags?.slice(0, 2).map((t: string) => (
                        <span key={t} style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }}>#{t}</span>
                      ))}
                      {(!e.tags || e.tags.length === 0) && (
                        <span style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}>{formatRelative(e.updated_at)}</span>
                      )}
                    </div>
                  </button>
                </MotionDiv>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════
          OVERLAY PANTALLA COMPLETA — Sección Personal
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {vistaPersonal && (
          <MotionDiv
            key={vistaPersonal}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 md:left-[68px] z-50 flex flex-col overflow-hidden"
            style={{ background: "var(--bg-main)" }}
          >
            {/* ── Barra superior ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px",
              borderBottom: "1px solid color-mix(in srgb, var(--foreground) 7%, transparent)",
              flexShrink: 0,
              background: "var(--bg-main)",
            }}>
              {/* Botón volver */}
              <button
                onClick={() => setVistaPersonal(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 6, border: "none",
                  background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                  color: "color-mix(in srgb, var(--foreground) 55%, transparent)",
                  cursor: "pointer", transition: "all 0.1s", flexShrink: 0,
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 10%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 80%, transparent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 55%, transparent)"; }}
              >
                <ChevronLeft size={12} />
                Menú
              </button>

              {/* Buscador de ensayos */}
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                borderRadius: 7, padding: "5px 10px",
                border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
              }}>
                <Search size={11} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && busqueda.trim()) { onNavigate(busqueda.trim()); setBusqueda(""); setVistaPersonal(null); } }}
                  placeholder="Buscar nota..."
                  style={{
                    flex: 1, border: "none", background: "transparent", outline: "none",
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
                  }}
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 0, color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Contenido del componente ── */}
            <div className="flex-1 overflow-auto pb-14 md:pb-0">
              {vistaPersonal === "compras" && <ComprasPage />}
              {vistaPersonal === "ejercicios" && <PaginaEjercicios />}
              {vistaPersonal === "ingredientes" && <IngredientesPage />}
              {vistaPersonal === "recetas" && <RecetasPage />}
              {vistaPersonal === "ropa" && <ArmarioPage />}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
}