"use client";
/**
 * SnippetCommandPalette
 * ─────────────────────
 * Popover compacto que reemplaza los modales grandes para insertar snippets.
 * Se abre cuando el MarkdownEditor detecta "add" en el texto.
 *
 * Flujo:
 *   Paso 0 — Lista de tipos (Drop, Choice, Use, Gate, Sección, Imagen, Sonido)
 *   Paso 1 — Form compacto inline según el tipo seleccionado
 *   Confirmar → llama onInsert(raw) y cierra
 *
 * Para Drop y Use (requieren buscar entidades) el buscador es inline en el popover.
 * Para Choice/Section/Gate/Sonido/Imagen son campos simples compactos.
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { useEntidades } from "./useEntidades";
import { parseSnippetRaw } from "./parseSnippetRaw";
import { SoundPicker }   from "@/components/forms/SoundPicker";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SnippetType =
  | "drop" | "choice" | "use" | "gate" | "section" | "imagen" | "sound";

interface PaletteProps {
  /** Posición del popover (relativa al contenedor del editor) */
  anchorRect: { top: number; left: number };
  /** Raw del snippet si estamos editando uno existente (opcional) */
  initialRaw?: string;
  /** Lista de capítulos para Choice/Use */
  listaCapitulos?: { id: string; orden: number; titulo_capitulo: string }[];
  /** Secciones [[section|id|label]] detectadas en el capítulo actual */
  listaSecciones?: { id: string; label: string }[];
  onInsert: (raw: string) => void;
  onClose:  () => void;
}

// ─── Config tipos ─────────────────────────────────────────────────────────────

const TYPES: { id: SnippetType; label: string; desc: string; icon: string; color: string }[] = [
  { id: "drop",    label: "Drop",     desc: "Entidad interactiva",  icon: "⚔",  color: "#a09af0" },
  { id: "choice",  label: "Choice",   desc: "Botón de decisión",    icon: "🔀",  color: "#5aabf5" },
  { id: "use",     label: "Use Ítem", desc: "Usar del inventario",  icon: "👆",  color: "#f07574" },
  { id: "gate",    label: "Gate",     desc: "Puerta condicional",   icon: "🚪",  color: "#e09a2a" },
  { id: "section", label: "Sección",  desc: "Ancla de navegación",  icon: "›",   color: "#8b83e8" },
  { id: "imagen",  label: "Imagen",   desc: "Imagen o flotante",    icon: "🖼",   color: "#2dc896" },
  { id: "sound",   label: "Sonido",   desc: "Efecto o música",      icon: "♪",   color: "#e87aaa" },
];

// ─── Estilos base ─────────────────────────────────────────────────────────────

const S = {
  popover: {
    position: "fixed" as const,
    zIndex: 9999,
    background: "var(--bg-menu, #15121f)",
    border: "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent)",
    borderRadius: 12,
    boxShadow: "0 16px 48px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4)",
    backdropFilter: "blur(16px)",
    width: 280,
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: "9px 12px 8px",
    borderBottom: "1px solid color-mix(in srgb, var(--foreground, #fff) 6%, transparent)",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--foreground, #fff)",
    caretColor: "var(--color-primary, #7c6af7)",
  },
  list: {
    maxHeight: 260,
    overflowY: "auto" as const,
    padding: "4px 0",
  },
  row: (active: boolean, color?: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 12px",
    cursor: "pointer",
    background: active
      ? "color-mix(in srgb, var(--color-primary, #7c6af7) 10%, transparent)"
      : "none",
    transition: "background .1s",
  }),
  iconBox: (color: string): React.CSSProperties => ({
    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: `color-mix(in srgb, ${color} 15%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    fontSize: 13, color,
  }),
  label: {
    fontSize: 12, fontWeight: 700,
    color: "var(--foreground, #fff)",
    lineHeight: 1.2,
  },
  desc: {
    fontSize: 9, fontWeight: 600,
    color: "color-mix(in srgb, var(--foreground, #fff) 40%, transparent)",
    textTransform: "uppercase" as const,
    letterSpacing: ".06em",
    marginTop: 1,
  },
  kbd: {
    marginLeft: "auto",
    fontSize: 9, fontWeight: 800,
    color: "color-mix(in srgb, var(--foreground, #fff) 25%, transparent)",
    background: "color-mix(in srgb, var(--foreground, #fff) 6%, transparent)",
    border: "1px solid color-mix(in srgb, var(--foreground, #fff) 10%, transparent)",
    borderRadius: 4, padding: "1px 5px",
  },
  backBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "color-mix(in srgb, var(--foreground, #fff) 40%, transparent)",
    fontSize: 16, lineHeight: 1, padding: "0 2px",
    display: "flex", alignItems: "center",
  },
  fieldLabel: {
    fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const,
    letterSpacing: ".1em",
    color: "color-mix(in srgb, var(--foreground, #fff) 35%, transparent)",
    marginBottom: 4,
  },
  input: {
    width: "100%", boxSizing: "border-box" as const,
    background: "color-mix(in srgb, var(--foreground, #fff) 5%, transparent)",
    border: "1px solid color-mix(in srgb, var(--foreground, #fff) 10%, transparent)",
    borderRadius: 7, padding: "7px 10px",
    fontSize: 12, fontWeight: 500,
    color: "var(--foreground, #fff)",
    outline: "none",
  },
  insertBtn: (color: string): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box" as const,
    background: `color-mix(in srgb, ${color} 18%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
    borderRadius: 7, padding: "8px 12px",
    fontSize: 10, fontWeight: 900,
    textTransform: "uppercase" as const, letterSpacing: ".1em",
    color, cursor: "pointer",
    transition: "background .12s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  }),
  emptyMsg: {
    padding: "16px 12px",
    fontSize: 11, textAlign: "center" as const,
    color: "color-mix(in srgb, var(--foreground, #fff) 25%, transparent)",
  },
};

// ─── Buscador de entidades (Drop / Use) ───────────────────────────────────────

function EntidadBrowser({
  tipo, color, icon, label,
  initialId, onSelect,
}: {
  tipo: "entidad" | "item";
  color: string; icon: string; label: string;
  initialId?: string;
  onSelect: (id: string, nombre: string) => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, loading } = useEntidades(tipo);

  const filtered = useMemo(() =>
    items.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActive(0); }, [q]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(v => Math.min(v + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      onSelect(filtered[active].id, filtered[active].nombre);
    }
  };

  return (
    <>
      <div style={{ padding: "8px 12px 6px" }}>
        <div style={{ ...S.fieldLabel }}>Buscar {label}</div>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Nombre del ${label.toLowerCase()}…`}
          style={S.input}
        />
      </div>
      <div style={S.list}>
        {loading && <div style={S.emptyMsg}>Cargando…</div>}
        {!loading && filtered.length === 0 && <div style={S.emptyMsg}>Sin resultados</div>}
        {filtered.map((item, i) => (
          <div
            key={item.id}
            style={S.row(i === active)}
            onClick={() => onSelect(item.id, item.nombre)}
            onMouseEnter={() => setActive(i)}
          >
            <span style={S.iconBox(color)}>{icon}</span>
            <span style={S.label}>{item.nombre}</span>
            {initialId === item.id && (
              <span style={{ ...S.kbd, marginLeft: "auto" }}>actual</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Forms por tipo ───────────────────────────────────────────────────────────

function FormDrop({ initialRaw, onInsert }: { initialRaw?: string; onInsert: (s: string) => void }) {
  const init = parseSnippetRaw(initialRaw);
  const initialId = init?.kind === "drop" ? init.entidadId : undefined;
  return (
    <EntidadBrowser
      tipo="entidad" color="#a09af0" icon="⚔" label="Entidad"
      initialId={initialId}
      onSelect={(id, nombre) => onInsert(`[[drop|${id}|${nombre}]]`)}
    />
  );
}

function FormChoice({
  initialRaw, listaSecciones = [], onInsert,
}: { initialRaw?: string; listaSecciones?: { id: string; label: string }[]; onInsert: (s: string) => void }) {
  const init = parseSnippetRaw(initialRaw);
  const [texto,  setTexto]  = useState(init?.kind === "choice" ? init.texto  : "");
  const [target, setTarget] = useState(init?.kind === "choice" ? init.target : "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const snippet = texto.trim() && target.trim()
    ? `[[choice|${texto.trim()}|${target.trim()}]]` : "";

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <div style={S.fieldLabel}>Texto del botón</div>
        <input ref={inputRef} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="ej: Inspeccionar pared…" style={S.input} />
      </div>

      {listaSecciones.length > 0 ? (
        <div>
          <div style={S.fieldLabel}>Sección destino</div>
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {listaSecciones.map(sec => (
              <div
                key={sec.id}
                style={{
                  ...S.row(target === sec.id),
                  borderRadius: 6,
                  marginBottom: 2,
                  border: target === sec.id
                    ? "1px solid color-mix(in srgb, #5aabf5 40%, transparent)"
                    : "1px solid transparent",
                }}
                onClick={() => setTarget(sec.id)}
              >
                <span style={S.iconBox("#5aabf5")}>›</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={S.label}>{sec.label || sec.id}</span>
                  <span style={{ ...S.desc, display: "block", fontFamily: "var(--font-mono, monospace)" }}>{sec.id}</span>
                </div>
                {target === sec.id && <span style={S.kbd}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={S.fieldLabel}>ID de sección destino</div>
          <input value={target} onChange={e => setTarget(e.target.value)}
            placeholder="ej: cofre-secreto" style={{ ...S.input, fontFamily: "var(--font-mono, monospace)" }} />
          <div style={{ ...S.desc, marginTop: 4 }}>
            Creá primero una sección con ‹ Insertar Sección › en este capítulo.
          </div>
        </div>
      )}

      <button
        style={S.insertBtn("#5aabf5")}
        disabled={!snippet}
        onClick={() => snippet && onInsert(snippet)}
      >
        🔀 Insertar Choice
      </button>
    </div>
  );
}

function FormSection({ initialRaw, onInsert }: { initialRaw?: string; onInsert: (s: string) => void }) {
  const init = parseSnippetRaw(initialRaw);
  const [label, setLabel] = useState(init?.kind === "section" ? init.label : "");
  const [id,    setId]    = useState(init?.kind === "section" ? init.id    : "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const autoId = id || label.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const snippet = autoId ? (label ? `[[section|${autoId}|${label}]]` : `[[section|${autoId}]]`) : "";

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <div style={S.fieldLabel}>Nombre visible</div>
        <input ref={inputRef} value={label} onChange={e => setLabel(e.target.value)}
          placeholder="ej: Abrir el cofre…" style={S.input} />
      </div>
      <div>
        <div style={S.fieldLabel}>ID (auto)</div>
        <input value={id} onChange={e => setId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder={autoId || "ej: cofre"} style={{ ...S.input, fontFamily: "var(--font-mono, monospace)", fontSize: 11 }} />
      </div>
      <button style={S.insertBtn("#8b83e8")} disabled={!autoId}
        onClick={() => snippet && onInsert(snippet)}>
        › Insertar Sección
      </button>
    </div>
  );
}

function FormUse({
  initialRaw, listaCapitulos, onInsert,
}: { initialRaw?: string; listaCapitulos: { id: string; orden: number; titulo_capitulo: string }[]; onInsert: (s: string) => void }) {
  const init = parseSnippetRaw(initialRaw);
  const [palabra, setPalabra]     = useState(init?.kind === "use" ? init.label      : "");
  const [targetOk, setTargetOk]   = useState(init?.kind === "use" ? (init as any).sectionOk   : "");
  const [targetFail, setTargetFail] = useState(init?.kind === "use" ? (init as any).sectionFail : "");
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const snippet = palabra.trim() && selectedItem && targetOk.trim()
    ? `[[use|${palabra.trim()}|${selectedItem.id}|${targetOk.trim()}${targetFail.trim() ? `|${targetFail.trim()}` : ""}]]`
    : "";

  if (!selectedItem) {
    return (
      <>
        <div style={{ padding: "8px 12px 4px" }}>
          <div style={S.fieldLabel}>Palabra en el texto</div>
          <input ref={inputRef} value={palabra} onChange={e => setPalabra(e.target.value)}
            placeholder="ej: usar llave…" style={S.input} />
        </div>
        <EntidadBrowser
          tipo="item" color="#f07574" icon="👆" label="Ítem"
          onSelect={(id, nombre) => setSelectedItem({ id, nombre })}
        />
      </>
    );
  }

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.iconBox("#f07574")}>👆</span>
        <span style={S.label}>{selectedItem.nombre}</span>
        <button onClick={() => setSelectedItem(null)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb,var(--foreground) 35%,transparent)", fontSize: 12 }}>
          ✕
        </button>
      </div>
      <div>
        <div style={S.fieldLabel}>Sección si TIENE el ítem *</div>
        <input value={targetOk} onChange={e => setTargetOk(e.target.value)}
          placeholder="ej: exito-llave" style={S.input} />
      </div>
      <div>
        <div style={S.fieldLabel}>Sección si NO tiene (opcional)</div>
        <input value={targetFail} onChange={e => setTargetFail(e.target.value)}
          placeholder="ej: fallo-llave" style={S.input} />
      </div>
      <button style={S.insertBtn("#f07574")} disabled={!snippet}
        onClick={() => snippet && onInsert(snippet)}>
        👆 Insertar Use
      </button>
    </div>
  );
}

function FormGate({ initialRaw, onInsert }: { initialRaw?: string; onInsert: (s: string) => void }) {
  const init = parseSnippetRaw(initialRaw);
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(null);
  const [tieneTexto,   setTieneTexto]   = useState((init as any)?.tieneTexto   ?? "");
  const [noTieneTexto, setNoTieneTexto] = useState((init as any)?.noTieneTexto ?? "");

  const snippet = selectedItem && tieneTexto.trim()
    ? `[[gate|${selectedItem.id}|${tieneTexto.trim()}${noTieneTexto.trim() ? `|${noTieneTexto.trim()}` : ""}]]`
    : "";

  if (!selectedItem) {
    return (
      <EntidadBrowser
        tipo="item" color="#e09a2a" icon="🚪" label="Ítem"
        onSelect={(id, nombre) => setSelectedItem({ id, nombre })}
      />
    );
  }

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.iconBox("#e09a2a")}>🚪</span>
        <span style={S.label}>{selectedItem.nombre}</span>
        <button onClick={() => setSelectedItem(null)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb,var(--foreground) 35%,transparent)", fontSize: 12 }}>
          ✕
        </button>
      </div>
      <div>
        <div style={S.fieldLabel}>Texto si TIENE el ítem *</div>
        <textarea value={tieneTexto} onChange={e => setTieneTexto(e.target.value)}
          rows={3} placeholder="El personaje usa el objeto…"
          style={{ ...S.input, resize: "none" as const, fontFamily: "inherit" }} />
      </div>
      <div>
        <div style={S.fieldLabel}>Texto si NO tiene (opcional)</div>
        <textarea value={noTieneTexto} onChange={e => setNoTieneTexto(e.target.value)}
          rows={2} placeholder="No tenés ese ítem…"
          style={{ ...S.input, resize: "none" as const, fontFamily: "inherit" }} />
      </div>
      <button style={S.insertBtn("#e09a2a")} disabled={!snippet}
        onClick={() => snippet && onInsert(snippet)}>
        🚪 Insertar Gate
      </button>
    </div>
  );
}

function FormImagen({ initialRaw, onInsert }: { initialRaw?: string; onInsert: (s: string) => void }) {
  const init = parseSnippetRaw(initialRaw);
  const [selected, setSelected] = useState<string | null>((init as any)?.url ?? null);
  const [caption,  setCaption]  = useState((init as any)?.alt  ?? "");
  const [mode,     setMode]     = useState<"img" | "float">((init as any)?.float ? "float" : "img");
  const [word,     setWord]     = useState("");

  const handleInsert = () => {
    if (!selected) return;
    const s = mode === "img"
      ? (caption ? `[[img|${selected}|${caption}]]` : `[[img|${selected}]]`)
      : `[[float|${word.trim() || "imagen"}|${selected}${caption ? `|${caption}` : ""}]]`;
    onInsert(s);
  };

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {(["img", "float"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "6px", borderRadius: 7, border: "1px solid",
            fontSize: 10, fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase" as const, letterSpacing: ".07em",
            background: mode === m ? "color-mix(in srgb,#2dc896 18%,transparent)" : "none",
            borderColor: mode === m ? "color-mix(in srgb,#2dc896 40%,transparent)" : "color-mix(in srgb,var(--foreground) 10%,transparent)",
            color: mode === m ? "#2dc896" : "color-mix(in srgb,var(--foreground) 40%,transparent)",
          }}>{m === "img" ? "Inline" : "Flotante"}</button>
        ))}
      </div>
      <SimpleImagePicker onSelect={setSelected} onClose={() => {}} />
      {selected && (
        <>
          {mode === "float" && (
            <div>
              <div style={S.fieldLabel}>Palabra en el texto</div>
              <input value={word} onChange={e => setWord(e.target.value)}
                placeholder="ej: el castillo…" style={S.input} />
            </div>
          )}
          <div>
            <div style={S.fieldLabel}>Caption (opcional)</div>
            <input value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Descripción…" style={S.input} />
          </div>
          <button style={S.insertBtn("#2dc896")} onClick={handleInsert}>
            🖼 Insertar Imagen
          </button>
        </>
      )}
    </div>
  );
}

function FormSound({ initialRaw, onInsert, onClose }: { initialRaw?: string; onInsert: (s: string) => void; onClose: () => void }) {
  const SP = SoundPicker as React.ComponentType<any>;
  const init = parseSnippetRaw(initialRaw);
  return (
    <SP open onClose={onClose} onInsert={onInsert}
      initialSrc={init?.kind === "sound" ? init.src : undefined} />
  );
}

// ─── Paleta principal ─────────────────────────────────────────────────────────

export function SnippetCommandPalette({
  anchorRect, initialRaw, listaCapitulos = [], listaSecciones = [], onInsert, onClose,
}: PaletteProps) {
  const [q,            setQ]            = useState("");
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [selectedType, setSelectedType] = useState<SnippetType | null>(() => {
    if (!initialRaw) return null;
    const kind = initialRaw.slice(2, -2).split("|")[0].trim();
    const map: Record<string, SnippetType> = {
      drop: "drop", img: "imagen", float: "imagen",
      choice: "choice", use: "use", gate: "gate",
      section: "section", sound: "sound",
    };
    return map[kind] ?? null;
  });
  const inputRef   = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Posición inteligente (evita salirse de pantalla)
  const pos = useMemo(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const w = 280, maxH = 340;
    let top  = anchorRect.top + 24;
    let left = anchorRect.left;
    if (left + w > W - 8)  left = W - w - 8;
    if (left < 8)          left = 8;
    if (top + maxH > H - 8) top = anchorRect.top - maxH - 4;
    return { top, left };
  }, [anchorRect]);

  // Cerrar con click fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  // Cerrar con Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    if (!selectedType) inputRef.current?.focus();
  }, [selectedType]);

  const filtered = useMemo(() =>
    TYPES.filter(t =>
      t.label.toLowerCase().includes(q.toLowerCase()) ||
      t.desc.toLowerCase().includes(q.toLowerCase())
    ), [q]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(v => Math.min(v + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(v => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && filtered[activeIdx]) {
      e.preventDefault();
      setSelectedType(filtered[activeIdx].id);
    }
  };

  const handleInsert = useCallback((raw: string) => {
    onInsert(raw);
    onClose();
  }, [onInsert, onClose]);

  const selectedDef = TYPES.find(t => t.id === selectedType);

  return (
    <div ref={containerRef} style={{ ...S.popover, top: pos.top, left: pos.left }}>

      {/* Header */}
      <div style={S.header}>
        {selectedType ? (
          <>
            <button style={S.backBtn} onClick={() => setSelectedType(null)} title="Volver">‹</button>
            <span style={{ ...S.iconBox(selectedDef!.color), width: 20, height: 20, fontSize: 11, borderRadius: 5 }}>
              {selectedDef!.icon}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: selectedDef!.color, textTransform: "uppercase", letterSpacing: ".08em" }}>
              {selectedDef!.label}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11, color: "color-mix(in srgb,var(--foreground) 30%,transparent)" }}>✦</span>
            <input
              ref={inputRef}
              value={q}
              onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Tipo de snippet…"
              style={S.searchInput}
            />
            <span style={S.kbd}>esc</span>
          </>
        )}
      </div>

      {/* Contenido */}
      {!selectedType ? (
        <div style={S.list}>
          {filtered.length === 0 && <div style={S.emptyMsg}>Sin resultados</div>}
          {filtered.map((t, i) => (
            <div
              key={t.id}
              style={S.row(i === activeIdx)}
              onClick={() => setSelectedType(t.id)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span style={S.iconBox(t.color)}>{t.icon}</span>
              <div>
                <div style={S.label}>{t.label}</div>
                <div style={S.desc}>{t.desc}</div>
              </div>
              {i < 9 && <span style={S.kbd}>↵</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {selectedType === "drop"    && <FormDrop    initialRaw={initialRaw} onInsert={handleInsert} />}
          {selectedType === "choice"  && <FormChoice  initialRaw={initialRaw} listaSecciones={listaSecciones} onInsert={handleInsert} />}
          {selectedType === "section" && <FormSection initialRaw={initialRaw} onInsert={handleInsert} />}
          {selectedType === "use"     && <FormUse     initialRaw={initialRaw} listaCapitulos={listaCapitulos} onInsert={handleInsert} />}
          {selectedType === "gate"    && <FormGate    initialRaw={initialRaw} onInsert={handleInsert} />}
          {selectedType === "imagen"  && <FormImagen  initialRaw={initialRaw} onInsert={handleInsert} />}
          {selectedType === "sound"   && <FormSound   initialRaw={initialRaw} onInsert={handleInsert} onClose={onClose} />}
        </div>
      )}
    </div>
  );
}