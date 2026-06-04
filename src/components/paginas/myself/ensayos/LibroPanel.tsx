"use client";
import React, { useState, useMemo } from "react";
import { BookOpen, BookCheck, BookDashed, User, Tag, Hash, FileDigit, Bookmark } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type EstadoLectura = "leyendo" | "leido" | "pendiente" | null;

interface LibroPanelProps {
  ensayo: any;
  ensayos: any[];
  onUpdateField: (id: string, field: string, value: any) => void;
}

// ── Constantes ─────────────────────────────────────────────────────────────────
const ESTADO_TAGS = ["leyendo", "leido", "pendiente"] as const;
const ESTADO_CONFIG = {
  leyendo:   { label: "leyendo",   icon: BookOpen,    accent: "var(--accent)" },
  leido:     { label: "leído",     icon: BookCheck,   accent: "color-mix(in srgb, var(--foreground) 55%, transparent)" },
  pendiente: { label: "pendiente", icon: BookDashed,  accent: "color-mix(in srgb, var(--foreground) 28%, transparent)" },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function getEstado(tags: string[]): EstadoLectura {
  for (const e of ESTADO_TAGS) {
    if (tags.includes(e)) return e;
  }
  return null;
}

// Extrae el campo "autor" del contenido o de los tags del ensayo.
// Convención: tag con prefijo "autor:" o campo dedicado en el objeto.
function getAutor(ensayo: any): string {
  return ensayo.autor ?? ensayo.author ?? "";
}

// Devuelve todos los co-tags (excluye "libro" y los de estado)
function getCoTags(tags: string[]): string[] {
  const excluir = new Set(["libro", ...ESTADO_TAGS]);
  return tags.filter(t => !excluir.has(t));
}

// ── Selector de estado ─────────────────────────────────────────────────────────
function EstadoSelector({
  estado,
  onChange,
  mono,
}: {
  estado: EstadoLectura;
  onChange: (nuevo: EstadoLectura) => void;
  mono: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {ESTADO_TAGS.map(e => {
        const cfg = ESTADO_CONFIG[e];
        const Icon = cfg.icon;
        const isActive = estado === e;
        return (
          <button
            key={e}
            onClick={() => onChange(isActive ? null : e)}
            title={cfg.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: isActive
                ? `color-mix(in srgb, ${cfg.accent} 40%, transparent)`
                : "color-mix(in srgb, var(--foreground) 8%, transparent)",
              background: isActive
                ? `color-mix(in srgb, ${cfg.accent} 10%, transparent)`
                : "transparent",
              color: isActive ? cfg.accent : "color-mix(in srgb, var(--foreground) 28%, transparent)",
              cursor: "pointer",
              transition: "all 0.12s",
              ...mono,
              fontSize: 9,
              textTransform: "lowercase",
              letterSpacing: "0.04em",
            }}
          >
            <Icon size={9} strokeWidth={isActive ? 2.2 : 1.8} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Selector numérico ──────────────────────────────────────────────────────────
function PaginasInput({
  label,
  value,
  onChange,
  max,
  icon,
  mono,
  accent,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  max?: number | null;
  icon: React.ReactNode;
  mono: React.CSSProperties;
  accent?: string;
}) {
  const [focused, setFocused] = useState(false);

  const porcentaje = max && max > 0 && value != null ? Math.min(100, Math.round((value / max) * 100)) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}>
          {icon}
        </span>
        <span style={{
          ...mono, fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
        }}>
          {label}
        </span>
        {porcentaje !== null && (
          <span style={{
            ...mono, fontSize: 7,
            marginLeft: "auto",
            color: accent ?? "color-mix(in srgb, var(--accent) 60%, transparent)",
          }}>
            {porcentaje}%
          </span>
        )}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 8px",
        borderRadius: 5,
        border: `1px solid ${focused
          ? "color-mix(in srgb, var(--foreground) 18%, transparent)"
          : "color-mix(in srgb, var(--foreground) 8%, transparent)"}`,
        background: focused
          ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
          : "transparent",
        transition: "all 0.1s",
      }}>
        <input
          type="number"
          min={0}
          max={max ?? undefined}
          value={value ?? ""}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => {
            const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
            onChange(isNaN(v as any) ? null : v);
          }}
          placeholder="—"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            ...mono,
            fontSize: 13,
            color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
            letterSpacing: "-0.02em",
          }}
        />
        <span style={{ ...mono, fontSize: 8, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", flexShrink: 0 }}>
          p.
        </span>
      </div>

      {/* Progress bar — solo aparece en "página actual" cuando hay total */}
      {porcentaje !== null && (
        <div style={{
          height: 2,
          borderRadius: 99,
          background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
          overflow: "hidden",
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${porcentaje}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              height: "100%",
              borderRadius: 99,
              background: accent ?? "var(--accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Input de texto inline ──────────────────────────────────────────────────────
function InlineTextInput({
  value,
  onChange,
  placeholder,
  icon,
  label,
  mono,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  label: string;
  mono: React.CSSProperties;
  suggestions?: string[];
}) {
  const [focused, setFocused] = useState(false);
  const [showSug, setShowSug] = useState(false);

  const filtered = useMemo(() => {
    if (!value.trim() || !suggestions?.length) return [];
    const q = value.trim().toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q) && s !== value).slice(0, 5);
  }, [value, suggestions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}>
          {icon}
        </span>
        <span style={{
          ...mono, fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
        }}>
          {label}
        </span>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "5px 8px",
        borderRadius: 5,
        border: `1px solid ${focused
          ? "color-mix(in srgb, var(--foreground) 18%, transparent)"
          : "color-mix(in srgb, var(--foreground) 8%, transparent)"}`,
        background: focused
          ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
          : "transparent",
        transition: "all 0.1s",
      }}>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={() => { setFocused(true); setShowSug(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSug(false), 150); }}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            ...mono,
            fontSize: 11,
            color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
          }}
        />
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {showSug && filtered.length > 0 && (
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
              zIndex: 50,
              background: "var(--bg-menu)",
              border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
              borderRadius: 5,
              overflow: "hidden",
              boxShadow: "0 6px 20px color-mix(in srgb, var(--bg-main) 50%, transparent)",
            }}
          >
            {filtered.map(s => (
              <button
                key={s}
                onMouseDown={() => { onChange(s); setShowSug(false); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "5px 10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...mono,
                  fontSize: 10,
                  color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
                  transition: "background 0.08s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tag selector inline ────────────────────────────────────────────────────────
function TagSelector({
  tags,
  allTags,
  onAddTag,
  onRemoveTag,
  mono,
}: {
  tags: string[];
  allTags: string[];
  onAddTag: (t: string) => void;
  onRemoveTag: (t: string) => void;
  mono: React.CSSProperties;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const coTags = getCoTags(tags);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.trim().toLowerCase();
    return allTags
      .filter(t => !tags.includes(t) && t.toLowerCase().includes(q))
      .slice(0, 6);
  }, [input, allTags, tags]);

  const addTag = (t: string) => {
    const val = t.trim().toLowerCase();
    if (val && !tags.includes(val)) onAddTag(val);
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Tag size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
        <span style={{
          ...mono, fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
        }}>
          etiquetas
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        {/* libro chip — fijo, no eliminable */}
        <span style={{
          ...mono, fontSize: 9,
          padding: "2px 7px",
          borderRadius: 3,
          background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
          border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
          color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
          cursor: "default",
        }}>
          #libro
        </span>

        {coTags.map(t => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              ...mono, fontSize: 9,
              padding: "2px 4px 2px 7px",
              borderRadius: 3,
              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
              color: "color-mix(in srgb, var(--accent) 80%, transparent)",
            }}
          >
            #{t}
            <button
              onClick={() => onRemoveTag(t)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "0 1px",
                color: "color-mix(in srgb, var(--accent) 40%, transparent)",
                fontSize: 10, lineHeight: 1,
                display: "flex", alignItems: "center",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--accent) 80%, transparent)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--accent) 40%, transparent)"}
            >
              ×
            </button>
          </span>
        ))}

        {/* Input nuevo tag */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={input}
            placeholder="+ tag"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
              if (e.key === "Escape") { setInput(""); }
            }}
            style={{
              ...mono, fontSize: 9,
              padding: "2px 7px",
              borderRadius: 3,
              border: "1px dashed color-mix(in srgb, var(--foreground) 12%, transparent)",
              background: focused ? "color-mix(in srgb, var(--foreground) 3%, transparent)" : "transparent",
              color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
              outline: "none",
              width: input ? 110 : 50,
              transition: "width 0.12s, background 0.1s",
            }}
          />
          <AnimatePresence>
            {focused && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: 0,
                  background: "var(--bg-menu)",
                  border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                  borderRadius: 4,
                  padding: "3px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  zIndex: 50,
                  minWidth: 120,
                  boxShadow: "0 -4px 12px color-mix(in srgb, var(--foreground) 8%, transparent)",
                }}
              >
                {suggestions.map(t => (
                  <button
                    key={t}
                    onMouseDown={() => addTag(t)}
                    style={{
                      ...mono, fontSize: 9,
                      color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
                      background: "transparent",
                      border: "none", borderRadius: 3,
                      padding: "3px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 12%, transparent)";
                      (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--accent) 90%, transparent)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 60%, transparent)";
                    }}
                  >
                    #{t}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function LibroPanel({ ensayo, ensayos, onUpdateField }: LibroPanelProps) {
  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  const tags: string[] = ensayo.tags ?? [];
  const estado = getEstado(tags);

  // ── Estado local (igual que localTitulo/localContenido en Editor) ──────────
  // Estos campos se actualizan instantáneamente en la UI; onUpdateField los
  // persiste en background con debounce. Sin estado local el input queda
  // congelado hasta que Supabase confirma (~1.5s).
  const [localAutor,        setLocalAutor]        = useState<string>(ensayo.autor ?? "");
  const [localPaginasTotal, setLocalPaginasTotal] = useState<number | null>(ensayo.paginas_total ?? null);
  const [localPaginaActual, setLocalPaginaActual] = useState<number | null>(ensayo.pagina_actual ?? null);

  // Sincronizar cuando cambia de nota (ensayo.id)
  const prevIdRef = React.useRef<string>(ensayo.id);
  if (prevIdRef.current !== ensayo.id) {
    prevIdRef.current      = ensayo.id;
    setLocalAutor(ensayo.autor ?? "");
    setLocalPaginasTotal(ensayo.paginas_total ?? null);
    setLocalPaginaActual(ensayo.pagina_actual ?? null);
  }

  // Todos los autores conocidos (para autocomplete)
  const allAutores = useMemo(() => {
    const set = new Set<string>();
    ensayos.forEach((e: any) => {
      if (e.autor) set.add(e.autor);
    });
    return Array.from(set).sort();
  }, [ensayos]);

  // Todos los tags conocidos (para autocomplete en el selector de tags)
  const allTags = useMemo(() => {
    const set = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => set.add(t)));
    tags.forEach(t => set.delete(t));
    return Array.from(set).sort();
  }, [ensayos, tags]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEstado = (nuevo: EstadoLectura) => {
    const sinEstado = tags.filter(t => !ESTADO_TAGS.includes(t as any));
    const next = nuevo ? [...sinEstado, nuevo] : sinEstado;
    onUpdateField(ensayo.id, "tags", next);
  };

  const handleAutor = (v: string) => {
    setLocalAutor(v);
    onUpdateField(ensayo.id, "autor", v);
  };

  const handlePaginasTotal = (v: number | null) => {
    setLocalPaginasTotal(v);
    onUpdateField(ensayo.id, "paginas_total", v);
  };

  const handlePaginaActual = (v: number | null) => {
    setLocalPaginaActual(v);
    onUpdateField(ensayo.id, "pagina_actual", v);
  };

  const handleAddTag = (t: string) => {
    onUpdateField(ensayo.id, "tags", [...tags, t]);
  };

  const handleRemoveTag = (t: string) => {
    onUpdateField(ensayo.id, "tags", tags.filter(x => x !== t));
  };

  // ── Progress % — usa estado local para respuesta inmediata ──
  const progreso = localPaginasTotal && localPaginasTotal > 0 && localPaginaActual != null
    ? Math.min(100, Math.round((localPaginaActual / localPaginasTotal) * 100))
    : null;

  const estadoActual = estado ? ESTADO_CONFIG[estado] : null;

  return (
    <div style={{
      padding: "16px 20px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* ── Header fila ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Icono libro */}
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: estadoActual
            ? `color-mix(in srgb, ${estadoActual.accent} 12%, transparent)`
            : "color-mix(in srgb, var(--foreground) 5%, transparent)",
          border: `1px solid ${estadoActual
            ? `color-mix(in srgb, ${estadoActual.accent} 25%, transparent)`
            : "color-mix(in srgb, var(--foreground) 10%, transparent)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.2s",
        }}>
          <BookOpen size={10} style={{
            color: estadoActual
              ? estadoActual.accent
              : "color-mix(in srgb, var(--foreground) 30%, transparent)",
            transition: "color 0.2s",
          }} />
        </div>

        <span style={{
          ...mono, fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
        }}>
          libro
        </span>

        {/* Estado badge */}
        {estadoActual && (
          <span style={{
            ...mono, fontSize: 8,
            padding: "1px 7px",
            borderRadius: 99,
            background: `color-mix(in srgb, ${estadoActual.accent} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${estadoActual.accent} 22%, transparent)`,
            color: estadoActual.accent,
          }}>
            {estadoActual.label}
          </span>
        )}

        {/* Progreso en línea */}
        {progreso !== null && (
          <span style={{
            ...mono, fontSize: 8,
            color: "color-mix(in srgb, var(--accent) 55%, transparent)",
            marginLeft: "auto",
          }}>
            {progreso}% leído
          </span>
        )}
      </div>

      {/* ── Fila: Estado + Autor ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Estado de lectura */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Bookmark size={9} style={{ color: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} />
            <span style={{
              ...mono, fontSize: 8,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
            }}>
              estado
            </span>
          </div>
          <EstadoSelector estado={estado} onChange={handleEstado} mono={mono} />
        </div>

        {/* Autor */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <InlineTextInput
            value={localAutor}
            onChange={handleAutor}
            placeholder="autor..."
            icon={<User size={9} />}
            label="autor"
            mono={mono}
            suggestions={allAutores}
          />
        </div>
      </div>

      {/* ── Fila: Páginas ── */}
      <div style={{ display: "flex", gap: 12 }}>
        <PaginasInput
          label="páginas totales"
          value={localPaginasTotal}
          onChange={handlePaginasTotal}
          icon={<FileDigit size={9} />}
          mono={mono}
        />
        <PaginasInput
          label="página actual"
          value={localPaginaActual}
          onChange={handlePaginaActual}
          max={localPaginasTotal}
          icon={<Hash size={9} />}
          mono={mono}
          accent="var(--accent)"
        />
      </div>

      {/* ── Fila: Tags ── */}
      <TagSelector
        tags={tags}
        allTags={allTags}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        mono={mono}
      />
    </div>
  );
}

export default LibroPanel;