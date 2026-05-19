"use client";
import React, { useMemo } from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { Star, FileText, ArrowRight, Hash, Clock } from "lucide-react";

interface HomeDashboardProps {
  ensayos: any[];
  todosLosTags: string[];
  onNavigate: (titulo: string) => void;
  onTagClick: (tag: string) => void;
}

export function HomeDashboard({ ensayos, todosLosTags, onNavigate, onTagClick }: HomeDashboardProps) {
  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
  const serif: React.CSSProperties = { fontFamily: "var(--font-serif)", fontStyle: "italic" };

  const favoritos = useMemo(
    () => ensayos.filter(e => e.tags?.includes("favorito")).slice(0, 6),
    [ensayos]
  );

  const recientes = useMemo(
    () =>
      [...ensayos]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 8),
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

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-full overflow-y-auto"
      style={{ background: "var(--bg-main)" }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 32px 64px" }}>

        {/* ── Header compacto ── */}
        <div
          className="flex items-end justify-between mb-8"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)", paddingBottom: 16 }}
        >
          <div>
            <h1 style={{ ...serif, fontSize: 22, color: "color-mix(in srgb, var(--foreground) 80%, transparent)", letterSpacing: "-0.02em", margin: 0 }}>
              Escritorio
            </h1>
            <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {ensayos.length} notas · {totalPalabras.toLocaleString("es-ES")} palabras
              {tagMasUsado && ` · #${tagMasUsado} frecuente`}
            </p>
          </div>
        </div>

        {/* ── Grid principal: 3 columnas ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "color-mix(in srgb, var(--foreground) 5%, transparent)", borderRadius: 8, overflow: "hidden", marginBottom: 1 }}>

          {/* Columna 1: Favoritos */}
          <div style={{ background: "var(--bg-main)", padding: "20px 18px" }}>
            <div className="flex items-center gap-1.5 mb-4">
              <Star size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
              <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Notas maestras
              </span>
            </div>

            {favoritos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {favoritos.map((f, i) => (
                  <MotionDiv
                    key={f.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <button
                      onClick={() => onNavigate(f.titulo)}
                      className="w-full text-left group flex items-center justify-between"
                      style={{
                        padding: "6px 8px",
                        borderRadius: 5,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ ...serif, fontSize: 12, color: "color-mix(in srgb, var(--foreground) 70%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {f.titulo}
                      </span>
                      <ArrowRight size={8} style={{ color: "color-mix(in srgb, var(--foreground) 15%, transparent)", flexShrink: 0, marginLeft: 4, opacity: 0, transition: "opacity 0.1s" }}
                        className="group-hover:opacity-100"
                      />
                    </button>
                  </MotionDiv>
                ))}
              </div>
            ) : (
              <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", lineHeight: 1.6 }}>
                Agrega el tag<br />
                <span style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}>#favorito</span> a una nota.
              </p>
            )}
          </div>

          {/* Columna 2: Tags */}
          <div style={{ background: "var(--bg-main)", padding: "20px 18px" }}>
            <div className="flex items-center gap-1.5 mb-4">
              <Hash size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
              <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Tags · {todosLosTags.length}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 4px" }}>
              {todosLosTags.map((tag, i) => {
                const count = ensayos.filter(e => e.tags?.includes(tag)).length;
                return (
                  <MotionDiv
                    key={tag}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <button
                      onClick={() => onTagClick(tag)}
                      style={{
                        ...mono,
                        fontSize: 9,
                        padding: "2px 7px",
                        borderRadius: 4,
                        border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                        background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                        color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                        cursor: "pointer",
                        transition: "all 0.1s",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 20%, transparent)";
                        (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 70%, transparent)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 6%, transparent)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 8%, transparent)";
                        (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 40%, transparent)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 3%, transparent)";
                      }}
                    >
                      #{tag}
                      <span style={{ fontSize: 7, color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }}>
                        {count}
                      </span>
                    </button>
                  </MotionDiv>
                );
              })}
              {todosLosTags.length === 0 && (
                <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)" }}>
                  Aún sin tags.
                </p>
              )}
            </div>
          </div>

          {/* Columna 3: Recientes (lista densa) */}
          <div style={{ background: "var(--bg-main)", padding: "20px 18px" }}>
            <div className="flex items-center gap-1.5 mb-4">
              <Clock size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
              <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Recientes
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {recientes.map((r, i) => (
                <MotionDiv
                  key={r.id}
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <button
                    onClick={() => onNavigate(r.titulo)}
                    className="w-full text-left group flex items-center justify-between"
                    style={{
                      padding: "5px 8px",
                      borderRadius: 5,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ ...serif, fontSize: 11, color: "color-mix(in srgb, var(--foreground) 65%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {r.titulo || "Sin título"}
                    </span>
                    <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", flexShrink: 0, marginLeft: 6 }}>
                      {formatRelative(r.updated_at)}
                    </span>
                  </button>
                </MotionDiv>
              ))}
            </div>
          </div>

        </div>

        {/* ── Segunda fila: todas las notas en grid compacto ── */}
        <div
          style={{
            marginTop: 1,
            borderRadius: 8,
            overflow: "hidden",
            background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
          }}
        >
          <div style={{ background: "var(--bg-main)", padding: "20px 18px" }}>
            <div className="flex items-center gap-1.5 mb-4">
              <FileText size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
              <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Todas las notas · {ensayos.length}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1, background: "color-mix(in srgb, var(--foreground) 5%, transparent)", borderRadius: 6, overflow: "hidden" }}>
              {ensayos.map((e, i) => (
                <MotionDiv
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4) }}
                >
                  <button
                    onClick={() => onNavigate(e.titulo)}
                    className="w-full text-left group"
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      background: "var(--bg-main)",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.08s",
                    }}
                    onMouseEnter={el => (el.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
                    onMouseLeave={el => (el.currentTarget.style.background = "var(--bg-main)")}
                  >
                    <p style={{ ...serif, fontSize: 11, color: "color-mix(in srgb, var(--foreground) 65%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                      {e.titulo || "Sin título"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {e.tags?.slice(0, 2).map((t: string) => (
                        <span key={t} style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }}>
                          #{t}
                        </span>
                      ))}
                      {(!e.tags || e.tags.length === 0) && (
                        <span style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}>
                          {formatRelative(e.updated_at)}
                        </span>
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