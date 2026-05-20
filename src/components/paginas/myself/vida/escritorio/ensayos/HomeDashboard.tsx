"use client";
import React, { useMemo, useState } from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { Star, FileText, ArrowRight, Hash, Clock, CheckSquare, Plus, Check } from "lucide-react";

import { RelojDigital } from "@/components/paginas/myself/vida/escritorio/tareas/relojDigital";
import { VistaMes } from "@/components/paginas/myself/vida/escritorio/tareas/vistaMes";

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

  const favoritos = useMemo(
    () => ensayos.filter(e => e.tags?.includes("favorito")).slice(0, 10),
    [ensayos]
  );

  const recientes = useMemo(
    () => [...ensayos]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10),
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
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px" }}>

        {/* ── Stats mínimo arriba ── */}
        <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 18%, transparent)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {ensayos.length} notas · {totalPalabras.toLocaleString("es-ES")} palabras
          {tagMasUsado && ` · #${tagMasUsado}`}
          {pendientes.length > 0 && ` · ${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""}`}
        </p>

        {/* ══════════════════════════════════════════
            FILA PRINCIPAL — grid con areas
            col: VistaMes | Reloj+Tareas | Favoritos+Recientes | Tags
        ══════════════════════════════════════════ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 0.85fr",
          gridTemplateRows: "1fr 1fr",
          gridTemplateAreas: `
            "mes reloj     favoritos tags"
            "mes tareas    recientes tags"
          `,
          gap: gap,
          background: divColor,
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: gap,
          /* altura fija para que el span funcione bien */
          minHeight: 480,
        }}>

          {/* ── VistaMes — span 2 rows ── */}
          <div style={{ gridArea: "mes", background: "var(--bg-main)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <VistaMes
              eventos={eventos}
              capitulosRaw={capitulosRaw}
              isAddingEvento={isAddingEvento}
              onAddEvento={handleAddEvento}
            />
          </div>

          {/* ── Reloj ── */}
          <div style={{ gridArea: "reloj", background: "var(--bg-main)", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <RelojDigital horario={horario} tareas={tareas} />
          </div>

          {/* ── Tareas ── */}
          <div style={{ gridArea: "tareas", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SectionHeader
              icon={<CheckSquare size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />}
              label="Pendientes"
              count={pendientes.length}
            />

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
          </div>

          {/* ── Favoritos ── */}
          <div style={{ gridArea: "favoritos", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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

          {/* ── Recientes ── */}
          <div style={{ gridArea: "recientes", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SectionHeader
              icon={<Clock size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />}
              label="Recientes"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", flex: 1 }}>
              {recientes.map((r, i) => (
                <MotionDiv key={r.id} initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <button
                    onClick={() => onNavigate(r.titulo)}
                    className="w-full text-left group flex items-center justify-between"
                    style={{ padding: "5px 8px", borderRadius: 5, background: "transparent", border: "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ ...serif, fontSize: 11, color: "color-mix(in srgb, var(--foreground) 65%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.titulo || "Sin título"}</span>
                    <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", flexShrink: 0, marginLeft: 6 }}>{formatRelative(r.updated_at)}</span>
                  </button>
                </MotionDiv>
              ))}
            </div>
          </div>

          {/* ── Tags — span 2 rows ── */}
          <div style={{ gridArea: "tags", background: "var(--bg-main)", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1, background: divColor, borderRadius: 6, overflow: "hidden" }}>
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
    </MotionDiv>
  );
}