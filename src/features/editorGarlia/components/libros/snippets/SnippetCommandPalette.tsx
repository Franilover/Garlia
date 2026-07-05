"use client";
import Image from "next/image";

/**
 * SnippetCommandPalette — búsqueda unificada
 * ──────────────────────────────────────────
 * Un solo input. Escribís "add imagen castillo", "add drop espada",
 * "add sonido lluvia" y filtra todo en tiempo real sin pasos intermedios.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import { parseSnippetRaw } from "@/features/editorGarlia/hooks/capitulos/types";

type SnippetType =
  | "drop"
  | "choice"
  | "use"
  | "gate"
  | "section"
  | "imagen"
  | "sound";

interface PaletteProps {
  anchorRect: { top: number; left: number };
  initialRaw?: string;
  /** Texto pre-cargado en el buscador principal (ej. lo escrito tras "/") */
  initialQuery?: string;
  listaCapitulos?: { id: string; orden: number; titulo_capitulo: string }[];
  listaSecciones?: { id: string; label: string }[];
  onInsert: (raw: string) => void;
  onClose: () => void;
}

const CATS: {
  id: SnippetType;
  label: string;
  icon: string;
  color: string;
  keywords: string[];
}[] = [
  {
    id: "drop",
    label: "Drop",
    icon: "⚔",
    color: "#a09af0",
    keywords: ["drop", "entidad", "personaje", "criatura", "item"],
  },
  {
    id: "choice",
    label: "Choice",
    icon: "🔀",
    color: "#5aabf5",
    keywords: ["choice", "decisión", "boton", "botón"],
  },
  {
    id: "use",
    label: "Use",
    icon: "👆",
    color: "#f07574",
    keywords: ["use", "usar", "ítem", "inventario"],
  },
  {
    id: "gate",
    label: "Gate",
    icon: "🚪",
    color: "#e09a2a",
    keywords: ["gate", "puerta", "condicional"],
  },
  {
    id: "section",
    label: "Sección",
    icon: "›",
    color: "#8b83e8",
    keywords: ["section", "sección", "seccion", "ancla"],
  },
  {
    id: "imagen",
    label: "Imagen",
    icon: "🖼",
    color: "#2dc896",
    keywords: ["imagen", "img", "foto", "dibujo"],
  },
  {
    id: "sound",
    label: "Sonido",
    icon: "♪",
    color: "#e87aaa",
    keywords: ["sonido", "sound", "música", "musica", "audio"],
  },
];

const S = {
  popover: {
    position: "fixed" as const,
    zIndex: 9999,
    background: "var(--bg-menu, var(--background))",
    border:
      "0.5px solid color-mix(in srgb, var(--color-primary, var(--primary)) 25%, transparent)",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.1)",
    width: 320,
    overflow: "hidden",
    fontFamily: "var(--font-sans, system-ui)",
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: "10px 12px 9px",
    borderBottom:
      "1px solid color-mix(in srgb, var(--foreground, #fff) 6%, transparent)",
  },
  mainInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--foreground, #fff)",
    caretColor: "var(--color-primary, #7c6af7)",
    minWidth: 0,
  },
  fieldInput: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "color-mix(in srgb, var(--foreground, #fff) 5%, transparent)",
    border:
      "1px solid color-mix(in srgb, var(--foreground, #fff) 10%, transparent)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--foreground, #fff)",
    outline: "none",
  },
  list: { maxHeight: 280, overflowY: "auto" as const, padding: "4px 0" },
  row: (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 12px",
    cursor: "pointer",
    background: active
      ? "color-mix(in srgb, var(--color-primary, var(--primary)) 10%, transparent)"
      : "transparent",
    transition: "background .1s",
  }),
  iconBox: (_color: string): React.CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: 8,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "color-mix(in srgb, var(--color-primary, var(--primary)) 10%, transparent)",
    border:
      "0.5px solid color-mix(in srgb, var(--color-primary, var(--primary)) 22%, transparent)",
    fontSize: 13,
    color: "var(--color-primary, var(--primary))",
  }),
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--foreground, var(--foreground))",
    lineHeight: 1.2,
  } as React.CSSProperties,
  sublabel: {
    fontSize: 10,
    fontWeight: 400,
    color:
      "color-mix(in srgb, var(--foreground, var(--foreground)) 45%, transparent)",
  } as React.CSSProperties,
  kbd: {
    fontSize: 9,
    fontWeight: 800,
    color: "color-mix(in srgb, var(--foreground, #fff) 25%, transparent)",
    background: "color-mix(in srgb, var(--foreground, #fff) 6%, transparent)",
    border:
      "1px solid color-mix(in srgb, var(--foreground, #fff) 10%, transparent)",
    borderRadius: 4,
    padding: "1px 5px",
    marginLeft: "auto",
    flexShrink: 0,
  } as React.CSSProperties,
  empty: {
    padding: "20px 12px",
    fontSize: 11,
    textAlign: "center" as const,
    color: "color-mix(in srgb, var(--foreground, #fff) 25%, transparent)",
  },
  insertBtn: (_color: string): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box" as const,
    background:
      "color-mix(in srgb, var(--color-primary, var(--primary)) 12%, transparent)",
    border:
      "0.5px solid color-mix(in srgb, var(--color-primary, var(--primary)) 30%, transparent)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase" as const,
    letterSpacing: ".1em",
    color: "var(--color-primary, var(--primary))",
    cursor: "pointer",
    transition: "background .12s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  }),
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "color-mix(in srgb, var(--foreground, #fff) 40%, transparent)",
    fontSize: 18,
    lineHeight: 1,
    padding: "0 2px 0 0",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,
  fieldLabel: {
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: ".1em",
    color: "color-mix(in srgb, var(--foreground, #fff) 35%, transparent)",
    marginBottom: 4,
  } as React.CSSProperties,
  selectedPill: (_color: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    background:
      "color-mix(in srgb, var(--color-primary, var(--primary)) 8%, transparent)",
    border:
      "0.5px solid color-mix(in srgb, var(--color-primary, var(--primary)) 20%, transparent)",
    borderRadius: 8,
    padding: "6px 10px",
  }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function flattenTree(
  nodes: any[],
): { name: string; url: string; path: string }[] {
  const result: { name: string; url: string; path: string }[] = [];
  function walk(ns: any[], prefix: string) {
    for (const n of ns) {
      if (n.url)
        result.push({
          name: n.name,
          url: n.url,
          path: prefix ? `${prefix} / ${n.name}` : n.name,
        });
      if (n.children)
        walk(n.children, prefix ? `${prefix} / ${n.name}` : n.name);
    }
  }
  walk(nodes, "");
  return result;
}

// ── Header compartido para todos los forms ───────────────────────────────────

function FormHeader({
  label,
  icon,
  color,
  onBack,
}: {
  label: string;
  icon: string;
  color: string;
  onBack: () => void;
}) {
  return (
    <div style={S.header}>
      <button style={S.backBtn} title="Volver" onClick={onBack}>
        ‹
      </button>
      <span
        style={{
          ...S.iconBox(color),
          width: 22,
          height: 22,
          fontSize: 11,
          borderRadius: 6,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color,
          textTransform: "uppercase" as const,
          letterSpacing: ".08em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Form Drop ────────────────────────────────────────────────────────────────

function FormDrop({
  initialRaw,
  onInsert,
  onBack,
  query,
}: {
  initialRaw?: string;
  onInsert: (s: string) => void;
  onBack: () => void;
  query?: string;
}) {
  const init = parseSnippetRaw(initialRaw);
  const initialId = init?.kind === "drop" ? (init as any).entidadId : undefined;
  const [palabra, setPalabra] = useState<string>(
    init?.kind === "drop" ? ((init as any).label ?? "") : "",
  );

  type Ent = {
    id: string;
    nombre: string;
    tipo: "personaje" | "criatura" | "item";
    subtipo?: string;
    imagen_url?: string;
  };
  const TIPO_CFG = {
    personaje: { icon: "👤", color: "#a09af0" },
    criatura: { icon: "🐉", color: "#f07574" },
    item: { icon: "🗡", color: "#e09a2a" },
  };

  const [all, setAll] = useState<Ent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(query ?? "");
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Ent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/entidades")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const list: Ent[] = [
          ...(d.data?.personajes ?? []).map((x: any) => ({
            id: x.id,
            nombre: x.nombre,
            tipo: "personaje" as const,
            subtipo: x.ocupacion,
            imagen_url: x.img_url || x.imagen_url,
          })),
          ...(d.data?.criaturas ?? []).map((x: any) => ({
            id: x.id,
            nombre: x.nombre,
            tipo: "criatura" as const,
            subtipo: x.habitat,
            imagen_url: x.img_url || x.imagen_url,
          })),
          ...(d.data?.items ?? []).map((x: any) => ({
            id: x.id,
            nombre: x.nombre,
            tipo: "item" as const,
            subtipo: x.categoria,
            imagen_url: x.imagen_url,
          })),
        ].sort((a, b) => a.nombre.localeCompare(b.nombre));
        setAll(list);
        // Si estamos editando un drop existente, preseleccionamos la
        // entidad real apenas tenemos la lista cargada. Antes initialId
        // se calculaba pero nunca se usaba, así que el form siempre
        // arrancaba "sin vínculo" — eso es lo que rompía el snippet
        // al volver a guardar.
        if (initialId) {
          const found = list.find((e) => e.id === initialId);
          if (found) setSelected(found);
        }
      })
      .finally(() => setLoading(false));
  }, [initialId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [q]);

  const filtered = useMemo(
    () =>
      q
        ? all.filter(
            (e) =>
              e.nombre.toLowerCase().includes(q.toLowerCase()) ||
              e.tipo.includes(q.toLowerCase()),
          )
        : all,
    [all, q],
  );

  if (selected) {
    const cfg = TIPO_CFG[selected.tipo];
    return (
      <>
        <FormHeader color="#a09af0" icon="⚔" label="Drop" onBack={onBack} />
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={S.selectedPill(cfg.color)}>
            {selected.imagen_url ? (
              <Image
                alt=""
                src={selected.imagen_url}
                style={{
                  width: 36,
                  height: 36,
                  objectFit: "cover",
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              />
            ) : (
              <span style={S.iconBox(cfg.color)}>{cfg.icon}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.label}>{selected.nombre}</div>
              <div style={{ ...S.sublabel, color: cfg.color }}>
                {selected.tipo}
                {selected.subtipo ? ` · ${selected.subtipo}` : ""}
              </div>
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "color-mix(in srgb,var(--foreground) 35%,transparent)",
                fontSize: 14,
              }}
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
          </div>
          <div>
            <div style={S.fieldLabel}>Palabra en el texto</div>
            <input
              placeholder="ej: la espada oxidada…"
              style={S.fieldInput}
              value={palabra}
              onChange={(e) => setPalabra(e.target.value)}
            />
          </div>
          <button
            disabled={!palabra.trim()}
            style={S.insertBtn("#a09af0")}
            onClick={() =>
              onInsert(
                `[[drop|${palabra.trim()}|${selected.tipo}|${selected.id}|${selected.nombre}]]`,
              )
            }
          >
            ⚔ Insertar Drop
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <FormHeader color="#a09af0" icon="⚔" label="Drop" onBack={onBack} />
      <div style={{ padding: "10px 12px 6px" }}>
        <input
          ref={inputRef}
          placeholder="Personaje, criatura o ítem…"
          style={S.fieldInput}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((v) => Math.min(v + 1, filtered.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((v) => Math.max(v - 1, 0));
            }
            if (e.key === "Enter" && filtered[active]) {
              setSelected(filtered[active]);
              setPalabra((p) => p || filtered[active].nombre);
            }
          }}
        />
      </div>
      <div style={S.list}>
        {loading && <div style={S.empty}>Cargando…</div>}
        {!loading && filtered.length === 0 && (
          <div style={S.empty}>Sin resultados</div>
        )}
        {filtered.map((e, i) => {
          const cfg = TIPO_CFG[e.tipo];
          return (
            <div
              key={e.id}
              style={S.row(i === active || e.id === initialId)}
              onClick={() => {
                setSelected(e);
                setPalabra((p) => p || e.nombre);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {e.imagen_url ? (
                <Image
                  alt=""
                  src={e.imagen_url}
                  style={{
                    width: 28,
                    height: 28,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span style={S.iconBox(cfg.color)}>{cfg.icon}</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.label}>{e.nombre}</div>
                <div style={{ ...S.sublabel, color: cfg.color }}>
                  {e.tipo}
                  {e.subtipo ? ` · ${e.subtipo}` : ""}
                </div>
              </div>
              {e.id === initialId && <span style={S.kbd}>actual</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Form Choice ──────────────────────────────────────────────────────────────

function FormChoice({
  initialRaw,
  listaSecciones = [],
  onInsert,
  onBack,
}: {
  initialRaw?: string;
  listaSecciones?: { id: string; label: string }[];
  onInsert: (s: string) => void;
  onBack: () => void;
}) {
  const init = parseSnippetRaw(initialRaw);
  const [texto, setTexto] = useState(
    init?.kind === "choice" ? (init as any).texto : "",
  );
  const [target, setTarget] = useState(
    init?.kind === "choice" ? (init as any).target : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const snippet =
    texto.trim() && target.trim()
      ? `[[choice|${texto.trim()}|${target.trim()}]]`
      : "";

  return (
    <>
      <FormHeader color="#5aabf5" icon="🔀" label="Choice" onBack={onBack} />
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        <div>
          <div style={S.fieldLabel}>Texto del botón</div>
          <input
            ref={inputRef}
            placeholder="ej: Inspeccionar pared…"
            style={S.fieldInput}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        {listaSecciones.length > 0 ? (
          <div>
            <div style={S.fieldLabel}>Sección destino</div>
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {listaSecciones.map((sec) => (
                <div
                  key={sec.id}
                  style={{
                    ...S.row(target === sec.id),
                    borderRadius: 6,
                    marginBottom: 2,
                    border:
                      target === sec.id
                        ? "1px solid color-mix(in srgb,#5aabf5 40%,transparent)"
                        : "1px solid transparent",
                  }}
                  onClick={() => setTarget(sec.id)}
                >
                  <span style={S.iconBox("#5aabf5")}>›</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.label}>{sec.label || sec.id}</div>
                    <div
                      style={{
                        ...S.sublabel,
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {sec.id}
                    </div>
                  </div>
                  {target === sec.id && <span style={S.kbd}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={S.fieldLabel}>ID de sección destino</div>
            <input
              placeholder="ej: cofre-secreto"
              style={{
                ...S.fieldInput,
                fontFamily: "var(--font-mono, monospace)",
              }}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <div style={{ ...S.sublabel, marginTop: 4 }}>
              Creá primero una Sección en este capítulo.
            </div>
          </div>
        )}
        <button
          disabled={!snippet}
          style={S.insertBtn("#5aabf5")}
          onClick={() => snippet && onInsert(snippet)}
        >
          🔀 Insertar Choice
        </button>
      </div>
    </>
  );
}

// ── Form Section ─────────────────────────────────────────────────────────────

function FormSection({
  initialRaw,
  onInsert,
  onBack,
}: {
  initialRaw?: string;
  onInsert: (s: string) => void;
  onBack: () => void;
}) {
  const init = parseSnippetRaw(initialRaw);
  const [label, setLabel] = useState(
    init?.kind === "section" ? (init as any).label : "",
  );
  const [id, setId] = useState(
    init?.kind === "section" ? (init as any).id : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const autoId =
    id ||
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  const snippet = autoId
    ? label
      ? `[[section|${autoId}|${label}]]`
      : `[[section|${autoId}]]`
    : "";

  return (
    <>
      <FormHeader color="#8b83e8" icon="›" label="Sección" onBack={onBack} />
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>
          <div style={S.fieldLabel}>Nombre visible</div>
          <input
            ref={inputRef}
            placeholder="ej: Abrir el cofre…"
            style={S.fieldInput}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <div style={S.fieldLabel}>ID (auto)</div>
          <input
            placeholder={autoId || "ej: cofre"}
            style={{
              ...S.fieldInput,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
            }}
            value={id}
            onChange={(e) =>
              setId(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
          />
        </div>
        <button
          disabled={!autoId}
          style={S.insertBtn("#8b83e8")}
          onClick={() => snippet && onInsert(snippet)}
        >
          › Insertar Sección
        </button>
      </div>
    </>
  );
}

// ── Form Use ─────────────────────────────────────────────────────────────────

function FormUse({
  initialRaw,
  listaSecciones = [],
  onInsert,
  onBack,
}: {
  initialRaw?: string;
  listaSecciones?: { id: string; label: string }[];
  onInsert: (s: string) => void;
  onBack: () => void;
}) {
  const init = parseSnippetRaw(initialRaw);
  const [palabra, setPalabra] = useState(
    init?.kind === "use" ? (init as any).label : "",
  );
  const [targetOk, setTargetOk] = useState("");
  const [targetFail, setTargetFail] = useState("");
  const [item, setItem] = useState<{ id: string; nombre: string } | null>(null);
  const [items, setItems] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/entidades?tipo=item")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok)
          setItems(
            (d.data?.items ?? []).map((x: any) => ({
              id: x.id,
              nombre: x.nombre,
            })),
          );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => i.nombre.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );
  const snippet =
    palabra.trim() && item && targetOk
      ? `[[use|${palabra.trim()}|${item.id}|${targetOk}${targetFail ? `|${targetFail}` : ""}]]`
      : "";

  const SeccionSelect = ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }) =>
    listaSecciones.length > 0 ? (
      <select
        style={{ ...S.fieldInput, cursor: "pointer" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {listaSecciones.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label || s.id}
          </option>
        ))}
      </select>
    ) : (
      <input
        placeholder={placeholder}
        style={S.fieldInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  return (
    <>
      <FormHeader color="#f07574" icon="👆" label="Use Ítem" onBack={onBack} />
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 380,
          overflowY: "auto",
        }}
      >
        <div>
          <div style={S.fieldLabel}>Palabra en el texto</div>
          <input
            ref={inputRef}
            placeholder="ej: usar llave…"
            style={S.fieldInput}
            value={palabra}
            onChange={(e) => setPalabra(e.target.value)}
          />
        </div>
        {!item ? (
          <div>
            <div style={S.fieldLabel}>Ítem a usar</div>
            <input
              placeholder="Buscar ítem…"
              style={S.fieldInput}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((v) => Math.min(v + 1, filtered.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((v) => Math.max(v - 1, 0));
                }
                if (e.key === "Enter" && filtered[active])
                  setItem(filtered[active]);
              }}
            />
            <div style={{ maxHeight: 120, overflowY: "auto", marginTop: 4 }}>
              {loading && <div style={S.empty}>Cargando…</div>}
              {filtered.map((it, i) => (
                <div
                  key={it.id}
                  style={S.row(i === active)}
                  onClick={() => setItem(it)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span style={S.iconBox("#f07574")}>👆</span>
                  <span style={S.label}>{it.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={S.selectedPill("#f07574")}>
            <span style={S.iconBox("#f07574")}>👆</span>
            <span style={{ ...S.label, flex: 1 }}>{item.nombre}</span>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "color-mix(in srgb,var(--foreground) 35%,transparent)",
                fontSize: 14,
              }}
              onClick={() => setItem(null)}
            >
              ✕
            </button>
          </div>
        )}
        <div>
          <div style={S.fieldLabel}>Sección si TIENE el ítem *</div>
          <SeccionSelect
            placeholder="— elegí sección —"
            value={targetOk}
            onChange={setTargetOk}
          />
        </div>
        <div>
          <div style={S.fieldLabel}>Sección si NO tiene (opcional)</div>
          <SeccionSelect
            placeholder="— ninguna —"
            value={targetFail}
            onChange={setTargetFail}
          />
        </div>
        <button
          disabled={!snippet}
          style={S.insertBtn("#f07574")}
          onClick={() => snippet && onInsert(snippet)}
        >
          👆 Insertar Use
        </button>
      </div>
    </>
  );
}

// ── Form Gate ────────────────────────────────────────────────────────────────

function FormGate({
  initialRaw: _initialRaw,
  onInsert,
  onBack,
}: {
  initialRaw?: string;
  onInsert: (s: string) => void;
  onBack: () => void;
}) {
  const [item, setItem] = useState<{ id: string; nombre: string } | null>(null);
  const [tieneTexto, setTiene] = useState("");
  const [noTieneTexto, setNoTiene] = useState("");
  const [items, setItems] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    void fetch("/api/entidades?tipo=item")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok)
          setItems(
            (d.data?.items ?? []).map((x: any) => ({
              id: x.id,
              nombre: x.nombre,
            })),
          );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => i.nombre.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );
  const snippet =
    item && tieneTexto.trim()
      ? `[[gate|${item.id}|${tieneTexto.trim()}${noTieneTexto.trim() ? `\n===\n${noTieneTexto.trim()}` : ""}]]`
      : "";

  return (
    <>
      <FormHeader color="#e09a2a" icon="🚪" label="Gate" onBack={onBack} />
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 380,
          overflowY: "auto",
        }}
      >
        {!item ? (
          <div>
            <div style={S.fieldLabel}>Ítem condición</div>
            <input
              autoFocus
              placeholder="Buscar ítem…"
              style={S.fieldInput}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((v) => Math.min(v + 1, filtered.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((v) => Math.max(v - 1, 0));
                }
                if (e.key === "Enter" && filtered[active])
                  setItem(filtered[active]);
              }}
            />
            <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 4 }}>
              {loading && <div style={S.empty}>Cargando…</div>}
              {filtered.map((it, i) => (
                <div
                  key={it.id}
                  style={S.row(i === active)}
                  onClick={() => setItem(it)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span style={S.iconBox("#e09a2a")}>🚪</span>
                  <span style={S.label}>{it.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={S.selectedPill("#e09a2a")}>
            <span style={S.iconBox("#e09a2a")}>🚪</span>
            <span style={{ ...S.label, flex: 1 }}>{item.nombre}</span>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "color-mix(in srgb,var(--foreground) 35%,transparent)",
                fontSize: 14,
              }}
              onClick={() => setItem(null)}
            >
              ✕
            </button>
          </div>
        )}
        <div>
          <div style={S.fieldLabel}>Texto si TIENE el ítem *</div>
          <textarea
            placeholder="El personaje usa el objeto…"
            rows={3}
            style={{
              ...S.fieldInput,
              resize: "none" as const,
              fontFamily: "inherit",
            }}
            value={tieneTexto}
            onChange={(e) => setTiene(e.target.value)}
          />
        </div>
        <div>
          <div style={S.fieldLabel}>Texto si NO tiene (opcional)</div>
          <textarea
            placeholder="No tenés ese ítem…"
            rows={2}
            style={{
              ...S.fieldInput,
              resize: "none" as const,
              fontFamily: "inherit",
            }}
            value={noTieneTexto}
            onChange={(e) => setNoTiene(e.target.value)}
          />
        </div>
        <button
          disabled={!snippet}
          style={S.insertBtn("#e09a2a")}
          onClick={() => snippet && onInsert(snippet)}
        >
          🚪 Insertar Gate
        </button>
      </div>
    </>
  );
}

// ── Form Imagen ───────────────────────────────────────────────────────────────

function FormImagen({
  initialRaw,
  onInsert,
  onBack,
  query,
}: {
  initialRaw?: string;
  onInsert: (s: string) => void;
  onBack: () => void;
  query?: string;
}) {
  const init = parseSnippetRaw(initialRaw);
  const [all, setAll] = useState<{ name: string; url: string; path: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(query ?? "");
  const [selected, setSelected] = useState<string | null>(
    (init as any)?.url ?? null,
  );
  const [caption, setCaption] = useState((init as any)?.alt ?? "");
  const [mode, setMode] = useState<"img" | "float">(
    (init as any)?.float ? "float" : "img",
  );
  const [word, setWord] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/dibujos")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAll(flattenTree(d.tree));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [q]);

  const filtered = useMemo(
    () =>
      q
        ? all.filter(
            (f) =>
              f.name.toLowerCase().includes(q.toLowerCase()) ||
              f.path.toLowerCase().includes(q.toLowerCase()),
          )
        : all,
    [all, q],
  );

  const snippet = selected
    ? mode === "img"
      ? caption
        ? `[[img|${selected}|${caption}]]`
        : `[[img|${selected}]]`
      : `[[float|${word.trim() || "imagen"}|${selected}${caption ? `|${caption}` : ""}]]`
    : "";

  return (
    <>
      <FormHeader color="#2dc896" icon="🖼" label="Imagen" onBack={onBack} />
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {(["img", "float"] as const).map((m) => (
            <button
              key={m}
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: 7,
                cursor: "pointer",
                border: `1px solid color-mix(in srgb,#2dc896 ${mode === m ? 40 : 15}%,transparent)`,
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase" as const,
                background:
                  mode === m
                    ? "color-mix(in srgb,#2dc896 18%,transparent)"
                    : "none",
                color:
                  mode === m
                    ? "#2dc896"
                    : "color-mix(in srgb,var(--foreground) 35%,transparent)",
              }}
              onClick={() => setMode(m)}
            >
              {m === "img" ? "Inline" : "Flotante"}
            </button>
          ))}
        </div>
        <div>
          <div style={S.fieldLabel}>Buscar imagen</div>
          <input
            ref={inputRef}
            placeholder="Nombre de archivo…"
            style={S.fieldInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((v) => Math.min(v + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((v) => Math.max(v - 1, 0));
              }
              if (e.key === "Enter" && filtered[active])
                setSelected(filtered[active].url);
            }}
          />
        </div>
        {!selected ? (
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {loading && <div style={S.empty}>Cargando…</div>}
            {!loading && filtered.length === 0 && (
              <div style={S.empty}>Sin resultados</div>
            )}
            {filtered.map((f, i) => (
              <div
                key={f.url}
                style={S.row(i === active)}
                onClick={() => setSelected(f.url)}
                onMouseEnter={() => setActive(i)}
              >
                <Image
                  alt={f.name}
                  src={f.url}
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: "cover",
                    borderRadius: 5,
                    flexShrink: 0,
                    border:
                      "1px solid color-mix(in srgb,var(--foreground) 10%,transparent)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.label}>{f.name}</div>
                  <div style={S.sublabel}>{f.path}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={S.selectedPill("#2dc896")}>
            <Image
              alt=""
              src={selected}
              style={{
                width: 36,
                height: 36,
                objectFit: "cover",
                borderRadius: 6,
                flexShrink: 0,
              }}
            />
            <span style={{ ...S.label, flex: 1, fontSize: 11 }}>
              {selected.split("/").pop()}
            </span>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "color-mix(in srgb,var(--foreground) 35%,transparent)",
                fontSize: 14,
              }}
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
          </div>
        )}
        {selected && mode === "float" && (
          <div>
            <div style={S.fieldLabel}>Palabra en el texto</div>
            <input
              placeholder="ej: el castillo…"
              style={S.fieldInput}
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
          </div>
        )}
        {selected && (
          <div>
            <div style={S.fieldLabel}>Caption (opcional)</div>
            <input
              placeholder="Descripción…"
              style={S.fieldInput}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        )}
        <button
          disabled={!snippet}
          style={S.insertBtn("#2dc896")}
          onClick={() => snippet && onInsert(snippet)}
        >
          🖼 Insertar Imagen
        </button>
      </div>
    </>
  );
}

// ── Form Sound ────────────────────────────────────────────────────────────────

function FormSound({
  onInsert,
  onBack,
  query,
}: {
  onInsert: (s: string) => void;
  onBack: () => void;
  query?: string;
}) {
  const [all, setAll] = useState<{ name: string; url: string; path: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(query ?? "");
  const [selected, setSelected] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/sonidos")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAll(flattenTree(d.tree));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [q]);
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  const filtered = useMemo(
    () =>
      q
        ? all.filter(
            (f) =>
              f.name.toLowerCase().includes(q.toLowerCase()) ||
              f.path.toLowerCase().includes(q.toLowerCase()),
          )
        : all,
    [all, q],
  );

  const togglePlay = (url: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    if (selected === url && playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.src = url;
      audioRef.current.volume = volume;
      void audioRef.current.play();
      setPlaying(true);
      setSelected(url);
    }
  };

  return (
    <>
      <FormHeader color="#e87aaa" icon="♪" label="Sonido" onBack={onBack} />
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 380,
          overflowY: "auto",
        }}
      >
        <div>
          <div style={S.fieldLabel}>Buscar sonido</div>
          <input
            ref={inputRef}
            placeholder="Nombre del archivo…"
            style={S.fieldInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((v) => Math.min(v + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((v) => Math.max(v - 1, 0));
              }
              if (e.key === "Enter" && filtered[active])
                setSelected(filtered[active].url);
            }}
          />
        </div>
        <div style={{ maxHeight: 180, overflowY: "auto" }}>
          {loading && <div style={S.empty}>Cargando…</div>}
          {!loading && filtered.length === 0 && (
            <div style={S.empty}>Sin resultados</div>
          )}
          {filtered.map((f, i) => (
            <div
              key={f.url}
              style={{
                ...S.row(i === active || selected === f.url),
                border:
                  selected === f.url
                    ? "1px solid color-mix(in srgb,#e87aaa 35%,transparent)"
                    : "1px solid transparent",
                borderRadius: 6,
                marginBottom: 2,
              }}
              onClick={() => setSelected(f.url)}
              onMouseEnter={() => setActive(i)}
            >
              <button
                style={{
                  ...S.iconBox("#e87aaa"),
                  cursor: "pointer",
                  border: "none",
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(f.url);
                }}
              >
                {selected === f.url && playing ? "⏸" : "▶"}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.label}>{f.name}</div>
                <div style={S.sublabel}>{f.path}</div>
              </div>
              {selected === f.url && <span style={S.kbd}>✓</span>}
            </div>
          ))}
        </div>
        {selected && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div style={S.fieldLabel}>Volumen</div>
              <div style={S.sublabel}>{Math.round(volume * 100)}%</div>
            </div>
            <input
              max="1"
              min="0"
              step="0.1"
              style={{
                width: "100%",
                accentColor: "#e87aaa",
                cursor: "pointer",
              }}
              type="range"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
            />
          </div>
        )}
        <button
          disabled={!selected}
          style={S.insertBtn("#e87aaa")}
          onClick={() =>
            selected && onInsert(`[[sound|${selected}|${volume.toFixed(1)}]]`)
          }
        >
          ♪ Insertar Sonido
        </button>
      </div>
    </>
  );
}

// ── Paleta principal ──────────────────────────────────────────────────────────

export function SnippetCommandPalette({
  anchorRect,
  initialRaw,
  initialQuery = "",
  listaCapitulos: _listaCapitulos = [],
  listaSecciones = [],
  onInsert,
  onClose,
}: PaletteProps) {
  const [q, setQ] = useState(initialQuery);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedType, setSelectedType] = useState<SnippetType | null>(() => {
    if (!initialRaw) return null;
    const kind = initialRaw.slice(2, -2).split("|")[0].trim();
    const map: Record<string, SnippetType> = {
      drop: "drop",
      img: "imagen",
      float: "imagen",
      choice: "choice",
      use: "use",
      gate: "gate",
      section: "section",
      sound: "sound",
    };
    return map[kind] ?? null;
  });
  const [childQuery, setChildQuery] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pos = useMemo(() => {
    const W = window.innerWidth,
      H = window.innerHeight;
    const w = 320,
      maxH = 440;
    let top = anchorRect.top + 24;
    let left = anchorRect.left;
    if (left + w > W - 8) left = W - w - 8;
    if (left < 8) left = 8;
    if (top + maxH > H - 8) top = anchorRect.top - maxH - 4;
    return { top, left };
  }, [anchorRect]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedType) {
          setSelectedType(null);
          setQ("");
          setChildQuery("");
        } else onClose();
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose, selectedType]);

  useEffect(() => {
    if (!selectedType) setTimeout(() => inputRef.current?.focus(), 30);
  }, [selectedType]);

  // Detectar "imagen castillo" → matchedCat=imagen, searchQ=castillo
  const { matchedCat, searchQ } = useMemo(() => {
    const lower = q.toLowerCase().trim();
    for (const cat of CATS) {
      for (const kw of cat.keywords) {
        if (lower === kw || lower.startsWith(kw + " ")) {
          return {
            matchedCat: cat.id as SnippetType,
            searchQ: lower.slice(kw.length).trim(),
          };
        }
      }
    }
    return { matchedCat: null as SnippetType | null, searchQ: lower };
  }, [q]);

  const filteredCats = useMemo(() => {
    if (!searchQ && !matchedCat) return CATS;
    if (matchedCat) return CATS.filter((c) => c.id === matchedCat);
    return CATS.filter(
      (c) =>
        c.keywords.some((k) => k.includes(searchQ)) ||
        c.label.toLowerCase().includes(searchQ),
    );
  }, [matchedCat, searchQ]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((v) => Math.min(v + 1, filteredCats.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((v) => Math.max(v - 1, 0));
    }
    if (e.key === "Enter" && filteredCats[activeIdx]) {
      e.preventDefault();
      setChildQuery(searchQ);
      setSelectedType(filteredCats[activeIdx].id);
    }
  };

  const handleInsert = useCallback(
    (raw: string) => {
      onInsert(raw);
      onClose();
    },
    [onInsert, onClose],
  );
  const handleBack = useCallback(() => {
    setSelectedType(null);
    setQ("");
    setChildQuery("");
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ ...S.popover, top: pos.top, left: pos.left }}
    >
      {!selectedType && (
        <>
          <div style={S.header}>
            <span
              style={{
                fontSize: 12,
                color:
                  "color-mix(in srgb,var(--color-primary,#7c6af7) 60%,transparent)",
                flexShrink: 0,
              }}
            >
              ✦
            </span>
            <input
              ref={inputRef}
              placeholder="drop espada · imagen castillo · sonido lluvia…"
              style={S.mainInput}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={handleKeyDown}
            />
            <span style={S.kbd}>esc</span>
          </div>

          <div style={S.list}>
            {filteredCats.length === 0 && (
              <div style={S.empty}>Sin resultados</div>
            )}
            {filteredCats.map((cat, i) => (
              <div
                key={cat.id}
                style={S.row(i === activeIdx)}
                onClick={() => {
                  setChildQuery(searchQ);
                  setSelectedType(cat.id);
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span style={S.iconBox(cat.color)}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.label}>{cat.label}</div>
                  {searchQ && (
                    <div style={{ ...S.sublabel, color: cat.color }}>
                      buscar «{searchQ}»
                    </div>
                  )}
                </div>
                <span style={S.kbd}>↵</span>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: "6px 12px 8px",
              borderTop:
                "1px solid color-mix(in srgb,var(--foreground) 5%,transparent)",
            }}
          >
            <span style={{ ...S.sublabel, fontSize: 8, opacity: 0.7 }}>
              tipo + nombre · ej:{" "}
              <em
                style={{
                  color:
                    "color-mix(in srgb,var(--color-primary,#7c6af7) 70%,transparent)",
                  fontStyle: "normal",
                }}
              >
                imagen castillo
              </em>
            </span>
          </div>
        </>
      )}

      {selectedType === "drop" && (
        <FormDrop
          initialRaw={initialRaw}
          query={childQuery}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
      {selectedType === "choice" && (
        <FormChoice
          initialRaw={initialRaw}
          listaSecciones={listaSecciones}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
      {selectedType === "section" && (
        <FormSection
          initialRaw={initialRaw}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
      {selectedType === "use" && (
        <FormUse
          initialRaw={initialRaw}
          listaSecciones={listaSecciones}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
      {selectedType === "gate" && (
        <FormGate
          initialRaw={initialRaw}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
      {selectedType === "imagen" && (
        <FormImagen
          initialRaw={initialRaw}
          query={childQuery}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
      {selectedType === "sound" && (
        <FormSound
          query={childQuery}
          onBack={handleBack}
          onInsert={handleInsert}
        />
      )}
    </div>
  );
}
