"use client";
import React, { useMemo, useState } from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad"; // ajusta la ruta si es distinta
import { BookOpen, Search, X, ArrowRight, BookMarked, BookCheck, BookDashed, Library } from "lucide-react";

interface LibrosDashboardProps {
  ensayos: any[];
  onNavigate: (titulo: string) => void;
  onTagClick?: (tag: string) => void;
  onToggleEstado: (libroId: string, estado: "leyendo" | "leido" | "pendiente", add: boolean) => void;
}

type OrdenLibros = "reciente" | "titulo" | "palabras";

// ─── Componente principal ─────────────────────────────────────────────────────
export function LibrosDashboard({ ensayos, onNavigate, onTagClick, onToggleEstado }: LibrosDashboardProps) {
  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
  const serif: React.CSSProperties = { fontFamily: "var(--font-serif)", fontStyle: "italic" };

  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<OrdenLibros>("reciente");
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Todos los libros
  const libros = useMemo(
    () => ensayos.filter(e => e.tags?.includes("libro")),
    [ensayos]
  );

  // IDs agrupados por estado
  const leyendoIds = useMemo(
    () => libros.filter(e => e.tags?.includes("leyendo")).map(e => e.id),
    [libros]
  );
  const leidosIds = useMemo(
    () => libros.filter(e => e.tags?.includes("leido")).map(e => e.id),
    [libros]
  );
  const pendientesIds = useMemo(
    () => libros
      .filter(e => e.tags?.includes("pendiente") && !e.tags?.includes("leyendo") && !e.tags?.includes("leido"))
      .map(e => e.id),
    [libros]
  );

  // Shape que SeccionEntidad espera: { id, nombre, imagen_url? }
  const librosComoEntidades = useMemo(
    () => libros.map(l => ({
      id: l.id,
      nombre: l.titulo || "Sin título",
      // imagen_url: l.cover_url ?? null,  // descomenta si tienes portadas
    })),
    [libros]
  );

  // Co-tags para filtros (excluye estado-tags y "libro")
  const estadoTags = new Set(["libro", "leyendo", "leido", "pendiente"]);
  const coTags = useMemo(() => {
    const freq: Record<string, number> = {};
    libros.forEach(e =>
      e.tags?.forEach((t: string) => {
        if (!estadoTags.has(t)) freq[t] = (freq[t] || 0) + 1;
      })
    );
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [libros]);

  // Stats
  const totalPalabras = useMemo(
    () => libros.reduce((acc, e) => acc + (e.contenido?.split(/\s+/).filter(Boolean).length || 0), 0),
    [libros]
  );

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "hoy";
    if (days === 1) return "ayer";
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}sem`;
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  const wordCount = (e: any) =>
    e.contenido?.split(/\s+/).filter(Boolean).length || 0;

  // Grid filtrado
  const filtrados = useMemo(() => {
    let result = libros;
    if (tagFiltro) result = result.filter(e => e.tags?.includes(tagFiltro));
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result.filter(e => e.titulo?.toLowerCase().includes(q) || e.contenido?.toLowerCase().includes(q));
    }
    if (orden === "reciente") return [...result].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    if (orden === "titulo")   return [...result].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "", "es"));
    if (orden === "palabras") return [...result].sort((a, b) => wordCount(b) - wordCount(a));
    return result;
  }, [libros, busqueda, orden, tagFiltro]);

  const divColor = "color-mix(in srgb, var(--foreground) 5%, transparent)";
  const borderColor = "color-mix(in srgb, var(--foreground) 7%, transparent)";

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-main)",
      }}
    >

      {/* ══════════════════════════════════════════
          COLUMNA IZQUIERDA — grid principal
      ══════════════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 28px 64px" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
              }}>
                <BookOpen size={15} />
              </div>
              <h1 style={{ ...serif, fontSize: 22, color: "color-mix(in srgb, var(--foreground) 80%, transparent)", margin: 0, lineHeight: 1 }}>
                biblioteca
              </h1>
            </div>
            <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", textTransform: "uppercase", letterSpacing: "0.13em", margin: 0 }}>
              {libros.length} libros · {totalPalabras.toLocaleString("es-ES")} palabras
              {tagFiltro && ` · #${tagFiltro}`}
              {busqueda && ` · "${busqueda}"`}
            </p>
          </div>

          {/* ── Controls ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{
              flex: 1, minWidth: 160, display: "flex", alignItems: "center", gap: 7,
              background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
              borderRadius: 7, padding: "6px 10px",
            }}>
              <Search size={10} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)", flexShrink: 0 }} />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="buscar libro..."
                style={{
                  flex: 1, border: "none", background: "transparent", outline: "none",
                  ...mono, fontSize: 10,
                  color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
                }}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 0, color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}>
                  <X size={9} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {(["reciente", "titulo", "palabras"] as OrdenLibros[]).map(o => (
                <button
                  key={o}
                  onClick={() => setOrden(o)}
                  style={{
                    ...mono, fontSize: 8, padding: "5px 9px", borderRadius: 5, border: "none",
                    cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em",
                    transition: "all 0.1s",
                    background: orden === o ? "color-mix(in srgb, var(--foreground) 10%, transparent)" : "transparent",
                    color: orden === o ? "color-mix(in srgb, var(--foreground) 70%, transparent)" : "color-mix(in srgb, var(--foreground) 28%, transparent)",
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* ── Co-tags filter ── */}
          {coTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 20 }}>
              <button
                onClick={() => setTagFiltro(null)}
                style={{
                  ...mono, fontSize: 9, padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                  border: "1px solid",
                  borderColor: !tagFiltro ? "color-mix(in srgb, var(--foreground) 35%, transparent)" : "color-mix(in srgb, var(--foreground) 10%, transparent)",
                  background: !tagFiltro ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "transparent",
                  color: !tagFiltro ? "color-mix(in srgb, var(--foreground) 80%, transparent)" : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  transition: "all 0.1s",
                }}
              >
                todos
              </button>
              {coTags.map(([tag, count]) => {
                const isActive = tagFiltro === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setTagFiltro(isActive ? null : tag)}
                    style={{
                      ...mono, fontSize: 9, padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                      border: "1px solid",
                      borderColor: isActive ? "color-mix(in srgb, var(--foreground) 30%, transparent)" : "color-mix(in srgb, var(--foreground) 8%, transparent)",
                      background: isActive ? "color-mix(in srgb, var(--foreground) 7%, transparent)" : "transparent",
                      color: isActive ? "color-mix(in srgb, var(--foreground) 75%, transparent)" : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                      transition: "all 0.1s",
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    #{tag}
                    <span style={{ fontSize: 7, color: "color-mix(in srgb, var(--foreground) 18%, transparent)" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Empty state ── */}
          {filtrados.length === 0 && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: "center", padding: "64px 0" }}
            >
              <BookMarked size={28} style={{ color: "color-mix(in srgb, var(--foreground) 10%, transparent)", margin: "0 auto 14px" }} />
              <p style={{ ...serif, fontSize: 15, color: "color-mix(in srgb, var(--foreground) 25%, transparent)", marginBottom: 6 }}>
                {libros.length === 0 ? "ningún libro aún" : "sin resultados"}
              </p>
              <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
                {libros.length === 0
                  ? "agrega la etiqueta #libro a una nota para verla aquí"
                  : "prueba con otro término o limpia los filtros"}
              </p>
            </MotionDiv>
          )}

          {/* ── Carta destacada ── */}
          {filtrados.length > 0 && orden === "reciente" && !busqueda && !tagFiltro && (
            <MotionDiv
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              style={{ marginBottom: 8 }}
            >
              <button
                onClick={() => onNavigate(filtrados[0].titulo)}
                className="w-full text-left group"
                style={{
                  display: "block", width: "100%",
                  padding: "20px 22px",
                  background: "var(--bg-main)",
                  border: "1px solid color-mix(in srgb, var(--foreground) 9%, transparent)",
                  borderRadius: 10, cursor: "pointer",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 3%, transparent)";
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 18%, transparent)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-main)";
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 9%, transparent)";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 22%, transparent)", textTransform: "uppercase", letterSpacing: "0.13em" }}>
                        reciente
                      </span>
                      <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }} />
                    </div>
                    <h2 style={{ ...serif, fontSize: 19, color: "color-mix(in srgb, var(--foreground) 78%, transparent)", margin: "0 0 4px", lineHeight: 1.25 }}>
                      {filtrados[0].titulo || "Sin título"}
                    </h2>
                    {filtrados[0].autor && (
                      <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 30%, transparent)", margin: "0 0 8px" }}>
                        {filtrados[0].autor}
                      </p>
                    )}
                    {/* Progress bar destacada */}
                    {filtrados[0].paginas_total && filtrados[0].pagina_actual != null && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ height: 2, borderRadius: 99, background: "color-mix(in srgb, var(--foreground) 6%, transparent)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(100, Math.round((filtrados[0].pagina_actual / filtrados[0].paginas_total) * 100))}%`,
                            background: "color-mix(in srgb, var(--accent) 60%, transparent)",
                            borderRadius: 99,
                          }} />
                        </div>
                        <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--accent) 50%, transparent)", marginTop: 3, display: "block" }}>
                          p. {filtrados[0].pagina_actual} / {filtrados[0].paginas_total} · {Math.min(100, Math.round((filtrados[0].pagina_actual / filtrados[0].paginas_total) * 100))}% leído
                        </span>
                      </div>
                    )}
                    {filtrados[0].contenido && (
                      <p style={{
                        ...mono, fontSize: 10,
                        color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                        margin: "0 0 12px",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as any,
                        lineHeight: 1.6,
                      }}>
                        {filtrados[0].contenido.replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").slice(0, 200)}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {filtrados[0].tags?.filter((t: string) => !estadoTags.has(t)).slice(0, 4).map((t: string) => (
                        <span key={t} style={{
                          ...mono, fontSize: 8,
                          padding: "2px 6px", borderRadius: 3,
                          background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                          color: "color-mix(in srgb, var(--foreground) 28%, transparent)",
                        }}>#{t}</span>
                      ))}
                      <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 18%, transparent)" }}>
                        {formatRelative(filtrados[0].updated_at)} · {wordCount(filtrados[0]).toLocaleString("es-ES")}p
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    style={{ color: "color-mix(in srgb, var(--foreground) 18%, transparent)", flexShrink: 0, marginTop: 4 }}
                  />
                </div>
              </button>
            </MotionDiv>
          )}

          {/* ── Grid ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 1,
            background: divColor,
            borderRadius: 8,
            overflow: "hidden",
          }}>
            {(filtrados.length > 0 && orden === "reciente" && !busqueda && !tagFiltro
              ? filtrados.slice(1)
              : filtrados
            ).map((libro, i) => {
              const wc = wordCount(libro);
              const tags = libro.tags?.filter((t: string) => !estadoTags.has(t)) ?? [];
              return (
                <MotionDiv
                  key={libro.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                >
                  <button
                    onClick={() => onNavigate(libro.titulo)}
                    onMouseEnter={() => setHoveredId(libro.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="w-full text-left"
                    style={{
                      display: "flex", flexDirection: "column",
                      padding: "14px 15px",
                      background: hoveredId === libro.id
                        ? "color-mix(in srgb, var(--foreground) 4%, transparent)"
                        : "var(--bg-main)",
                      border: "none", cursor: "pointer",
                      transition: "background 0.08s",
                      height: "100%",
                    }}
                  >
                    <p style={{
                      ...serif, fontSize: 13,
                      color: "color-mix(in srgb, var(--foreground) 72%, transparent)",
                      margin: "0 0 4px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {libro.titulo || "Sin título"}
                    </p>
                    {libro.autor && (
                      <p style={{
                        ...mono, fontSize: 8,
                        color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                        margin: "0 0 5px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {libro.autor}
                      </p>
                    )}
                    {libro.contenido && (
                      <p style={{
                        ...mono, fontSize: 9,
                        color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
                        margin: "0 0 10px", lineHeight: 1.55, flex: 1,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as any,
                      }}>
                        {libro.contenido.replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").slice(0, 120)}
                      </p>
                    )}
                    {/* Progress bar */}
                    {libro.paginas_total && libro.pagina_actual != null && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ height: 2, borderRadius: 99, background: "color-mix(in srgb, var(--foreground) 6%, transparent)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(100, Math.round((libro.pagina_actual / libro.paginas_total) * 100))}%`,
                            background: "color-mix(in srgb, var(--accent) 55%, transparent)",
                            borderRadius: 99,
                          }} />
                        </div>
                        <span style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--accent) 45%, transparent)", marginTop: 2, display: "block" }}>
                          p. {libro.pagina_actual} / {libro.paginas_total}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: "auto" }}>
                      {tags.slice(0, 2).map((t: string) => (
                        <span key={t} style={{ ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 22%, transparent)" }}>#{t}</span>
                      ))}
                      <span style={{ marginLeft: "auto", ...mono, fontSize: 7, color: "color-mix(in srgb, var(--foreground) 16%, transparent)" }}>
                        {formatRelative(libro.updated_at)}
                        {wc > 0 && ` · ${wc.toLocaleString("es-ES")}p`}
                      </span>
                    </div>
                  </button>
                </MotionDiv>
              );
            })}
          </div>

          {filtrados.length === 1 && orden === "reciente" && !busqueda && !tagFiltro && (
            <div style={{ paddingTop: 16, textAlign: "center" }}>
              <p style={{ ...mono, fontSize: 9, color: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
                solo un libro por ahora — agrega #libro a más notas para verlas aquí
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════
          COLUMNA DERECHA — panel de estados
          Usa SeccionEntidad reutilizado con los
          libros mapeados a { id, nombre }.
      ══════════════════════════════════════════ */}
      <div style={{
        width: 220,
        flexShrink: 0,
        borderLeft: `1px solid ${borderColor}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "color-mix(in srgb, var(--foreground) 1.5%, transparent)",
      }}>

        {/* Título del panel */}
        <div style={{
          padding: "14px 10px 8px",
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Library size={10} style={{ color: "color-mix(in srgb, var(--foreground) 22%, transparent)" }} />
            <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 22%, transparent)", textTransform: "uppercase", letterSpacing: "0.13em" }}>
              estado de lectura
            </span>
          </div>
        </div>

        {/* Las tres secciones reutilizando SeccionEntidad */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

          <SeccionEntidad
            label="Leyendo ahora"
            icon={<BookOpen size={9} />}
            fallbackIcon={<BookOpen size={12} />}
            emptyLabel="ninguno en curso"
            allEntities={librosComoEntidades}
            selectedIds={leyendoIds}
            loading={false}
            saving={false}
            onToggle={(id, add) => onToggleEstado(id, "leyendo", add)}
            onEntityClick={id => {
              const libro = libros.find(l => l.id === id);
              if (libro) onNavigate(libro.titulo);
            }}
          />

          <div style={{ height: 1, background: borderColor }} />

          <SeccionEntidad
            label="Leídos"
            icon={<BookCheck size={9} />}
            fallbackIcon={<BookCheck size={12} />}
            emptyLabel="aún nada terminado"
            allEntities={librosComoEntidades}
            selectedIds={leidosIds}
            loading={false}
            saving={false}
            onToggle={(id, add) => onToggleEstado(id, "leido", add)}
            onEntityClick={id => {
              const libro = libros.find(l => l.id === id);
              if (libro) onNavigate(libro.titulo);
            }}
          />

          <div style={{ height: 1, background: borderColor }} />

          <SeccionEntidad
            label="Pendientes"
            icon={<BookDashed size={9} />}
            fallbackIcon={<BookDashed size={12} />}
            emptyLabel="lista limpia"
            allEntities={librosComoEntidades}
            selectedIds={pendientesIds}
            loading={false}
            saving={false}
            onToggle={(id, add) => onToggleEstado(id, "pendiente", add)}
            onEntityClick={id => {
              const libro = libros.find(l => l.id === id);
              if (libro) onNavigate(libro.titulo);
            }}
          />

        </div>

      </div>

    </MotionDiv>
  );
}