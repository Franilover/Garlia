"use client";
/**
 * IdiomasSection — Editor de Mundo · Culturas & Idiomas  v2
 * ──────────────────────────────────────────────────────────
 * Layout: lista izquierda fija + panel de detalle derecho con tabs.
 * Persiste todo en Supabase (tablas: idiomas, idiomas_frases, idiomas_reglas,
 * idiomas_fonemas, idiomas_lexemas, idiomas_lexemas_significados, culturas_idiomas).
 *
 * Tabs del detalle:
 *   info       → metadatos, tipo, familia, escritura, cultura principal
 *   fonologia  → notas libres + inventario fonémico estructurado (consonantes / vocales)
 *   lexico     → diccionario: lemas con significados, categoría gramatical, pronunciación
 *   frases     → corpus de frases con transliteración y traducción
 *   reglas     → reglas gramaticales por categoría
 *   culturas   → culturas que usan el idioma (culturas_idiomas)
 */
import {
  AlignLeft, ArrowLeft, Book, BookOpen, Check, ChevronDown, ChevronUp,
  FileText, Globe, Languages, List, Loader2, Mic, Plus,
  Search, Trash2, X, Users, Link2, Wand2, AlertTriangle,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useIdiomas, useIdiomaDetalle, useCulturas,
  useFonemas, useLexemas, useCulturasIdioma,
} from "./useIdiomas";
import { GeneradorNombres } from "./GeneradorNombres";
import type {
  Idioma, IdiomaFrase, IdiomaRegla, IdiomaFonema,
  IdiomaLexema, IdiomaLexemaSignificado,
  IdiomaTipo, FraseCategoria, ReglaCategoria,
  DireccionEscritura, TipoFonema, CategoriaGramatical,
  CulturaIdioma,
} from "./types";

// ── Constantes ────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<IdiomaTipo, string> = {
  natural: "Natural", creado: "Creado", muerto: "Muerto",
  pidgin: "Pidgin", sign: "Señas", ritual: "Ritual", secreto: "Secreto",
};

const TIPO_COLORS: Record<IdiomaTipo, string> = {
  natural: "#4ade80", creado: "#60a5fa", muerto: "#9ca3af",
  pidgin: "#f59e0b", sign: "#c084fc", ritual: "#f87171", secreto: "#fb923c",
};

const REGLA_CATS: ReglaCategoria[] = [
  "fonologia", "morfologia", "sintaxis", "semantica", "pragmatica", "escritura", "otro",
];

const REGLA_CAT_LABELS: Record<ReglaCategoria, string> = {
  fonologia: "Fonología", morfologia: "Morfología", sintaxis: "Sintaxis",
  semantica: "Semántica", pragmatica: "Pragmática", escritura: "Escritura", otro: "Otro",
};

const FRASE_CATS: FraseCategoria[] = [
  "saludo", "despedida", "pregunta", "numero", "color", "tiempo",
  "ritual", "insulto", "piropo", "refrán", "otro",
];

const FRASE_CAT_LABELS: Record<FraseCategoria, string> = {
  saludo: "Saludo", despedida: "Despedida", pregunta: "Pregunta",
  numero: "Número", color: "Color", tiempo: "Tiempo",
  ritual: "Ritual", insulto: "Insulto", piropo: "Piropo",
  "refrán": "Refrán", otro: "Otro",
};

const DIR_LABELS: Record<DireccionEscritura, string> = {
  ltr: "Izq → Der", rtl: "Der → Izq",
  ttb: "Arriba → Abajo", btt: "Abajo → Arriba", boustrophedon: "Boustrophedon",
};

const TIPO_FONEMA_LABELS: Record<TipoFonema, string> = {
  consonante: "Consonante", vocal: "Vocal", semivocal: "Semivocal",
  tono: "Tono", otro: "Otro",
};

const PUNTOS_ARTICULACION = [
  "bilabial", "labiodental", "dental", "alveolar", "postalveolar",
  "retrofleja", "palatal", "velar", "uvular", "faríngea", "glotal", "otro",
];

const MODOS_ARTICULACION = [
  "oclusiva", "fricativa", "africada", "nasal", "lateral",
  "vibrante", "aproximante", "click", "eyectiva", "implosiva", "otro",
];

const CAT_GRAM_LABELS: Partial<Record<CategoriaGramatical, string>> = {
  sustantivo: "Sustantivo", verbo: "Verbo", adjetivo: "Adjetivo",
  adverbio: "Adverbio", pronombre: "Pronombre", preposicion: "Preposición",
  conjuncion: "Conjunción", interjeccion: "Interjección", articulo: "Artículo",
  numeral: "Numeral", partícula: "Partícula", clasificador: "Clasificador", otro: "Otro",
};

const CATS_GRAM = Object.keys(CAT_GRAM_LABELS) as CategoriaGramatical[];

const ROL_IDIOMA_LABELS: Record<CulturaIdioma["rol"], string> = {
  nativo: "Nativo", comercio: "Comercio", ritual: "Ritual",
  extinto: "Extinto", aprendido: "Aprendido",
};

// ── Primitivos de UI ──────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded"
      style={{
        background: color ? `${color}22` : "color-mix(in srgb, var(--primary) 10%, transparent)",
        color: color ?? "var(--primary)",
        border: `1px solid ${color ? `${color}44` : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
      }}
    >
      {label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-micro font-black uppercase tracking-widest mb-1"
      style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
    >
      {children}
    </p>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-4 rounded-xl space-y-3 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {children}
    </div>
  );
}

function InlineEdit({
  value, placeholder, onSave, multiline = false, className = "", mono = false,
}: {
  value: string; placeholder: string; onSave: (v: string) => void;
  multiline?: boolean; className?: string; mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => { onSave(draft); setEditing(false); };

  const sharedStyle: React.CSSProperties = {
    color: "var(--primary)",
    fontFamily: mono ? "monospace" : "inherit",
  };

  if (editing) {
    const base = {
      ref: ref as any,
      className: `w-full bg-transparent border-b outline-none resize-none text-sm ${className}`,
      style: { ...sharedStyle, borderColor: "var(--primary)" },
      value: draft,
      placeholder,
      onChange: (e: React.ChangeEvent<any>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      },
    };
    return multiline ? <textarea rows={4} {...base} /> : <input {...base} />;
  }

  return (
    <span
      className={`cursor-text border-b border-transparent hover:border-dashed text-sm block ${className}`}
      style={{
        ...sharedStyle,
        color: value ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
        borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
        whiteSpace: multiline ? "pre-wrap" : undefined,
        minHeight: multiline ? "2.5rem" : undefined,
      }}
      onClick={() => setEditing(true)}
    >
      {value || placeholder}
    </span>
  );
}

function SelectField<T extends string>({
  value, options, labels, onChange,
}: {
  value: T; options: T[]; labels: Partial<Record<T, string>>; onChange: (v: T) => void;
}) {
  return (
    <select
      className="bg-transparent text-sm outline-none cursor-pointer"
      style={{
        color: "var(--primary)",
        borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
      }}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
    </select>
  );
}

function Checkbox({
  checked, label, onChange,
}: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm select-none" style={{ color: "var(--primary)" }}>
      <input type="checkbox" className="accent-current" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function TagsEditor({
  tags, placeholder, onChange,
}: { tags: string[]; placeholder: string; onChange: (r: string[]) => void }) {
  const [input, setInput] = useState("");
  const agregar = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((r) => (
          <span
            key={r}
            className="flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
          >
            {r}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== r))}>
              <X size={10} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-micro italic" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
            Sin rasgos aún
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-transparent text-sm outline-none border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
        />
        <button
          type="button"
          className="p-1.5 rounded transition-all"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
          onClick={agregar}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

type VocabEntry = { palabra: string; traduccion: string };

function VocabularioEditor({ vocabulario, onChange }: {
  vocabulario: VocabEntry[];
  onChange: (v: VocabEntry[]) => void;
}) {
  const [nueva, setNueva] = useState<VocabEntry>({ palabra: "", traduccion: "" });

  const agregar = () => {
    if (!nueva.palabra.trim()) return;
    onChange([...vocabulario, { palabra: nueva.palabra.trim(), traduccion: nueva.traduccion.trim() }]);
    setNueva({ palabra: "", traduccion: "" });
  };

  return (
    <div className="space-y-2">
      {vocabulario.length > 0 && (
        <div className="space-y-1">
          {vocabulario.map((e, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2 py-1.5 rounded group"
              style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}
            >
              <InlineEdit
                value={e.palabra} placeholder="palabra" mono className="flex-1 font-semibold"
                onSave={(v) => onChange(vocabulario.map((x, i) => i === idx ? { ...x, palabra: v } : x))}
              />
              <span style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>→</span>
              <InlineEdit
                value={e.traduccion} placeholder="traducción" className="flex-1"
                onSave={(v) => onChange(vocabulario.map((x, i) => i === idx ? { ...x, traduccion: v } : x))}
              />
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                style={{ color: "#ef4444" }}
                onClick={() => onChange(vocabulario.filter((_, i) => i !== idx))}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent text-sm outline-none border-b font-mono"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
          placeholder="palabra en el idioma…"
          value={nueva.palabra}
          onChange={(e) => setNueva((p) => ({ ...p, palabra: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") agregar(); }}
        />
        <span style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>→</span>
        <input
          className="flex-1 bg-transparent text-sm outline-none border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
          placeholder="traducción…"
          value={nueva.traduccion}
          onChange={(e) => setNueva((p) => ({ ...p, traduccion: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") agregar(); }}
        />
        <button
          type="button"
          className="p-1.5 rounded transition-all flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
          onClick={agregar}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Fonemas ───────────────────────────────────────────────────────────────

// ── Error banner ──────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
      style={{ background: "#ef444418", border: "1px solid #ef444433", color: "#ef4444" }}
    >
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ── Nuevo fonema form ─────────────────────────────────────────────────────

const ALTURAS_VOCAL = ["alta", "media-alta", "media", "media-baja", "baja"];
const POSTERIORIDADES_VOCAL = ["anterior", "central", "posterior"];

function NuevoFonemaForm({ tipo, onCrear }: {
  tipo: TipoFonema;
  onCrear: (campos: Omit<IdiomaFonema, "id" | "idioma_id" | "created_at">) => Promise<IdiomaFonema | null>;
}) {
  const [simbolo, setSimbolo] = useState("");
  // Consonante
  const [punto, setPunto] = useState("");
  const [modo, setModo] = useState("");
  const [sonoridad, setSonoridad] = useState<"sonora" | "sorda" | "">("");
  // Vocal
  const [altura, setAltura] = useState("");
  const [posterioridad, setPosterioridad] = useState("");
  const [redondeamiento, setRedondeamiento] = useState(false);
  // Otros (semivocal / tono)
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const reset = () => {
    setSimbolo(""); setPunto(""); setModo(""); setSonoridad("");
    setAltura(""); setPosterioridad(""); setRedondeamiento(false); setNotas("");
  };

  const submit = async () => {
    if (!simbolo.trim()) return;
    setGuardando(true);
    await onCrear({
      simbolo: simbolo.trim(),
      tipo,
      // Consonante
      punto_articulacion: tipo === "consonante" ? (punto || undefined) : undefined,
      modo_articulacion:  tipo === "consonante" ? (modo  || undefined) : undefined,
      sonoridad:          tipo === "consonante" ? ((sonoridad || undefined) as any) : undefined,
      // Vocal
      altura:             tipo === "vocal" ? (altura        || undefined) : undefined,
      posterioridad:      tipo === "vocal" ? (posterioridad || undefined) : undefined,
      redondeamiento:     tipo === "vocal" ? redondeamiento : undefined,
      // Otros
      notas: (tipo !== "consonante" && tipo !== "vocal") ? (notas || undefined) : undefined,
    });
    reset();
    setGuardando(false);
  };

  const borderStyle = {
    borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
    color: "var(--primary)",
  };

  return (
    <div
      className="flex flex-wrap items-end gap-2 p-3 rounded-lg"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
      }}
    >
      {/* Símbolo — siempre presente */}
      <div>
        <FieldLabel>Símbolo</FieldLabel>
        <input
          className="bg-transparent border-b text-sm font-mono outline-none w-16"
          style={{ ...borderStyle, borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          placeholder="ej: /k/"
          value={simbolo}
          onChange={(e) => setSimbolo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
      </div>

      {/* Consonante */}
      {tipo === "consonante" && (
        <>
          <div>
            <FieldLabel>Punto</FieldLabel>
            <select className="bg-transparent text-sm outline-none border-b cursor-pointer" style={borderStyle}
              value={punto} onChange={(e) => setPunto(e.target.value)}>
              <option value="">—</option>
              {PUNTOS_ARTICULACION.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Modo</FieldLabel>
            <select className="bg-transparent text-sm outline-none border-b cursor-pointer" style={borderStyle}
              value={modo} onChange={(e) => setModo(e.target.value)}>
              <option value="">—</option>
              {MODOS_ARTICULACION.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Sonoridad</FieldLabel>
            <select className="bg-transparent text-sm outline-none border-b cursor-pointer" style={borderStyle}
              value={sonoridad} onChange={(e) => setSonoridad(e.target.value as any)}>
              <option value="">—</option>
              <option value="sonora">Sonora</option>
              <option value="sorda">Sorda</option>
              <option value="mixta">Mixta</option>
            </select>
          </div>
        </>
      )}

      {/* Vocal */}
      {tipo === "vocal" && (
        <>
          <div>
            <FieldLabel>Altura</FieldLabel>
            <select className="bg-transparent text-sm outline-none border-b cursor-pointer" style={borderStyle}
              value={altura} onChange={(e) => setAltura(e.target.value)}>
              <option value="">—</option>
              {ALTURAS_VOCAL.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Posterioridad</FieldLabel>
            <select className="bg-transparent text-sm outline-none border-b cursor-pointer" style={borderStyle}
              value={posterioridad} onChange={(e) => setPosterioridad(e.target.value)}>
              <option value="">—</option>
              {POSTERIORIDADES_VOCAL.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <label
            className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
            style={{ color: "var(--primary)", alignSelf: "flex-end", paddingBottom: "2px" }}
          >
            <input type="checkbox" className="accent-current" checked={redondeamiento}
              onChange={(e) => setRedondeamiento(e.target.checked)} />
            Redondeada
          </label>
        </>
      )}

      {/* Otros (semivocal, tono, otro) */}
      {tipo !== "consonante" && tipo !== "vocal" && (
        <div>
          <FieldLabel>Notas</FieldLabel>
          <input
            className="bg-transparent border-b text-sm outline-none w-40"
            style={borderStyle}
            placeholder="descripción breve…"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
        </div>
      )}

      <button
        type="button"
        disabled={!simbolo.trim() || guardando}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-micro font-black transition-all disabled:opacity-40"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
        onClick={submit}
      >
        {guardando ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        Agregar
      </button>
    </div>
  );
}

function FonemaChip({ fonema, onEliminar }: {
  fonema: IdiomaFonema;
  onEliminar: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-mono cursor-default group"
      style={{
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        color: "var(--primary)",
      }}
      title={[fonema.punto_articulacion, fonema.modo_articulacion, fonema.sonoridad].filter(Boolean).join(" · ")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {fonema.simbolo}
      {hover && (
        <button
          type="button"
          className="ml-0.5 rounded hover:text-red-400 transition-colors"
          style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
          onClick={() => onEliminar(fonema.id)}
        >
          <X size={9} />
        </button>
      )}
    </span>
  );
}

function TabFonologia({ idiomaId, idioma, onGuardar }: {
  idiomaId: string;
  idioma: Idioma;
  onGuardar: (campos: Partial<Idioma>) => void;
}) {
  const { consonantes, vocales, otros, loading, error, crear, eliminar } = useFonemas(idiomaId);
  const [tipoNuevo, setTipoNuevo] = useState<TipoFonema>("consonante");

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error.message} />}
      {/* Notas libres */}
      <SectionCard>
        <FieldLabel>Notas fonológicas generales</FieldLabel>
        <p className="text-micro mb-2" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
          Estructura silábica, restricciones fonotácticas, acentuación, tonos…
        </p>
        <InlineEdit
          value={idioma.notas_fonologia ?? ""}
          placeholder="ej: sílabas (C)V(C), sin grupos consonánticos al inicio; acento en penúltima sílaba…"
          multiline
          onSave={(v) => onGuardar({ notas_fonologia: v })}
        />
      </SectionCard>

      {/* Inventario de consonantes */}
      <SectionCard>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Consonantes ({consonantes.length})</FieldLabel>
        </div>
        {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />}
        {!loading && (
          <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
            {consonantes.length === 0 && (
              <span className="text-micro italic" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                Sin consonantes registradas
              </span>
            )}
            {consonantes.map((f) => (
              <FonemaChip key={f.id} fonema={f} onEliminar={eliminar} />
            ))}
          </div>
        )}
        <NuevoFonemaForm tipo="consonante" onCrear={crear} />
      </SectionCard>

      {/* Inventario de vocales */}
      <SectionCard>
        <FieldLabel>Vocales ({vocales.length})</FieldLabel>
        {!loading && (
          <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
            {vocales.length === 0 && (
              <span className="text-micro italic" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                Sin vocales registradas
              </span>
            )}
            {vocales.map((f) => (
              <FonemaChip key={f.id} fonema={f} onEliminar={eliminar} />
            ))}
          </div>
        )}
        <NuevoFonemaForm tipo="vocal" onCrear={crear} />
      </SectionCard>

      {/* Otros fonemas (tonos, semivocales…) */}
      <SectionCard>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Semivocales / Tonos / Otros ({otros.length})</FieldLabel>
          <select
            className="bg-transparent text-micro outline-none border-b cursor-pointer"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
            value={tipoNuevo}
            onChange={(e) => setTipoNuevo(e.target.value as TipoFonema)}
          >
            <option value="semivocal">Semivocal</option>
            <option value="tono">Tono</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-1.5 min-h-[2rem] mb-2">
            {otros.length === 0 && (
              <span className="text-micro italic" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                Sin fonemas de este tipo registrados
              </span>
            )}
            {otros.map((f) => (
              <FonemaChip key={f.id} fonema={f} onEliminar={eliminar} />
            ))}
          </div>
        )}
        <NuevoFonemaForm tipo={tipoNuevo} onCrear={crear} />
      </SectionCard>

      {/* Vocabulario de muestra */}
      <SectionCard>
        <FieldLabel>Vocabulario de muestra</FieldLabel>
        <p className="text-micro mb-2" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
          Palabras representativas con traducción. Click para editar.
        </p>
        <VocabularioEditor
          vocabulario={idioma.vocabulario_muestra ?? []}
          onChange={(v) => onGuardar({ vocabulario_muestra: v })}
        />
      </SectionCard>

      {/* Rasgos gramaticales */}
      <SectionCard>
        <FieldLabel>Rasgos gramaticales / tipológicos</FieldLabel>
        <TagsEditor
          tags={idioma.rasgos_gramaticales ?? []}
          placeholder="ej: aglutinante, VSO, tonal, ergativo…"
          onChange={(r) => onGuardar({ rasgos_gramaticales: r })}
        />
      </SectionCard>
    </div>
  );
}

// ── Léxico ────────────────────────────────────────────────────────────────

function SignificadoRow({ sig, onGuardar, onEliminar }: {
  sig: IdiomaLexemaSignificado;
  onGuardar: (id: string, campos: Partial<IdiomaLexemaSignificado>) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <div
      className="pl-4 pr-2 py-2 rounded-lg space-y-1 group relative"
      style={{
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        borderLeft: "2px solid color-mix(in srgb, var(--primary) 15%, transparent)",
      }}
    >
      <InlineEdit
        value={sig.significado}
        placeholder="Significado…"
        className="font-medium"
        onSave={(v) => onGuardar(sig.id, { significado: v })}
      />
      <InlineEdit
        value={sig.contexto ?? ""}
        placeholder="Contexto de uso…"
        className="italic text-xs"
        onSave={(v) => onGuardar(sig.id, { contexto: v })}
      />
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel>Ejemplo</FieldLabel>
          <InlineEdit
            value={sig.ejemplo_uso ?? ""} placeholder="Ejemplo…" mono
            onSave={(v) => onGuardar(sig.id, { ejemplo_uso: v })}
          />
        </div>
        {sig.ejemplo_uso && (
          <div className="flex-1">
            <FieldLabel>Traducción del ejemplo</FieldLabel>
            <InlineEdit
              value={sig.ejemplo_traduccion ?? ""} placeholder="Traducción…"
              onSave={(v) => onGuardar(sig.id, { ejemplo_traduccion: v })}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "#ef4444" }}
        onClick={() => onEliminar(sig.id)}
      >
        <X size={11} />
      </button>
    </div>
  );
}

function LexemaRow({ lexema, onGuardar, onEliminar, onCrearSig, onGuardarSig, onEliminarSig }: {
  lexema: IdiomaLexema;
  onGuardar: (id: string, campos: Partial<IdiomaLexema>) => void;
  onEliminar: (id: string) => void;
  onCrearSig: (lexemaId: string, significado: string) => void;
  onGuardarSig: (lexemaId: string, sigId: string, campos: Partial<IdiomaLexemaSignificado>) => void;
  onEliminarSig: (lexemaId: string, sigId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [nuevoSig, setNuevoSig] = useState("");

  return (
    <div
      className="rounded-xl group"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      {/* Header compacto */}
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="font-mono font-bold text-sm flex-1 truncate" style={{ color: "var(--primary)" }}>
          {lexema.lema}
        </span>
        {lexema.pronunciacion && (
          <span className="text-micro italic" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
            /{lexema.pronunciacion}/
          </span>
        )}
        {lexema.categoria_gramatical && (
          <Badge label={CAT_GRAM_LABELS[lexema.categoria_gramatical] ?? lexema.categoria_gramatical} />
        )}
        {lexema.validado && <Badge label="✓" color="#4ade80" />}
        {lexema.es_prestamo && <Badge label="préstamo" color="#f59e0b" />}
        <span className="text-micro" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          {(lexema.significados?.length ?? 0)} sig.
        </span>
        {expanded ? <ChevronUp size={12} style={{ opacity: 0.5, flexShrink: 0 }} /> : <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
      </div>

      {/* Detalle */}
      {expanded && (
        <div className="px-3 pb-3 border-t space-y-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="pt-2 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Lema</FieldLabel>
              <InlineEdit value={lexema.lema} placeholder="Lema" mono className="font-semibold"
                onSave={(v) => onGuardar(lexema.id, { lema: v })} />
            </div>
            <div>
              <FieldLabel>Pronunciación (IPA o propia)</FieldLabel>
              <InlineEdit value={lexema.pronunciacion ?? ""} placeholder="/…/" mono
                onSave={(v) => onGuardar(lexema.id, { pronunciacion: v })} />
            </div>
            <div>
              <FieldLabel>Forma escrita</FieldLabel>
              <InlineEdit value={lexema.forma_superficial ?? ""} placeholder="Si difiere del lema…"
                onSave={(v) => onGuardar(lexema.id, { forma_superficial: v })} />
            </div>
            <div>
              <FieldLabel>Categoría gramatical</FieldLabel>
              <select
                className="bg-transparent text-sm outline-none cursor-pointer w-full"
                style={{ color: "var(--primary)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
                value={lexema.categoria_gramatical ?? ""}
                onChange={(e) => onGuardar(lexema.id, { categoria_gramatical: e.target.value as CategoriaGramatical || undefined })}
              >
                <option value="">— Ninguna —</option>
                {CATS_GRAM.map((c) => <option key={c} value={c}>{CAT_GRAM_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Etimología</FieldLabel>
            <InlineEdit value={lexema.etimologia ?? ""} placeholder="Origen de la palabra…" multiline
              onSave={(v) => onGuardar(lexema.id, { etimologia: v })} />
          </div>
          <div>
            <FieldLabel>Notas</FieldLabel>
            <InlineEdit value={lexema.notas ?? ""} placeholder="Notas adicionales…" multiline
              onSave={(v) => onGuardar(lexema.id, { notas: v })} />
          </div>
          <div className="flex gap-4 flex-wrap">
            <Checkbox checked={lexema.validado} label="Validado" onChange={(v) => onGuardar(lexema.id, { validado: v })} />
            <Checkbox checked={lexema.es_prestamo} label="Préstamo lingüístico" onChange={(v) => onGuardar(lexema.id, { es_prestamo: v })} />
          </div>

          {/* Significados */}
          <div>
            <FieldLabel>Significados ({lexema.significados?.length ?? 0})</FieldLabel>
            <div className="space-y-2">
              {(lexema.significados ?? []).map((s) => (
                <SignificadoRow
                  key={s.id} sig={s}
                  onGuardar={(id, campos) => onGuardarSig(lexema.id, id, campos)}
                  onEliminar={(id) => onEliminarSig(lexema.id, id)}
                />
              ))}
              {/* Nuevo significado */}
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-transparent text-sm outline-none border-b"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
                  placeholder="Nuevo significado…"
                  value={nuevoSig}
                  onChange={(e) => setNuevoSig(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nuevoSig.trim()) {
                      onCrearSig(lexema.id, nuevoSig.trim());
                      setNuevoSig("");
                    }
                  }}
                />
                <button
                  type="button"
                  className="p-1.5 rounded"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                  onClick={() => {
                    if (nuevoSig.trim()) { onCrearSig(lexema.id, nuevoSig.trim()); setNuevoSig(""); }
                  }}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded text-micro font-black transition-all"
              style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444433" }}
              onClick={() => onEliminar(lexema.id)}
            >
              Eliminar entrada
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabLexico({ idiomaId }: { idiomaId: string }) {
  const { lexemas, loading, crear, guardar, eliminar, crearSignificado, guardarSignificado, eliminarSignificado } = useLexemas(idiomaId);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoLema, setNuevoLema] = useState("");
  const [creando, setCreando] = useState(false);
  const [filtroCat, setFiltroCat] = useState<CategoriaGramatical | "">("");
  const [soloSinValidar, setSoloSinValidar] = useState(false);

  const filtrados = lexemas.filter((l) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || l.lema.toLowerCase().includes(q) ||
      (l.pronunciacion ?? "").toLowerCase().includes(q) ||
      (l.significados ?? []).some((s) => s.significado.toLowerCase().includes(q));
    const matchCat = !filtroCat || l.categoria_gramatical === filtroCat;
    const matchVal = !soloSinValidar || !l.validado;
    return matchQ && matchCat && matchVal;
  });

  const catUsadas = [...new Set(lexemas.map((l) => l.categoria_gramatical).filter(Boolean))] as CategoriaGramatical[];

  const handleCrear = async () => {
    if (!nuevoLema.trim()) return;
    setCreando(true);
    await crear(nuevoLema.trim());
    setNuevoLema("");
    setCreando(false);
  };

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda + filtros */}
      <SectionCard>
        <div className="flex gap-2">
          <div
            className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}
          >
            <Search size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar lema, significado…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && <button type="button" onClick={() => setBusqueda("")} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}><X size={11} /></button>}
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
            <input
              className="flex-1 bg-transparent text-sm outline-none border-b font-mono"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)", width: "120px" }}
              placeholder="Nuevo lema…"
              value={nuevoLema}
              onChange={(e) => setNuevoLema(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCrear(); }}
            />
            <button
              type="button"
              className="p-1 rounded transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
              onClick={handleCrear}
              disabled={creando}
            >
              {creando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            </button>
          </div>
        </div>

        {/* Filtros */}
        {catUsadas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: filtroCat === "" ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
                color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
              onClick={() => setFiltroCat("")}
            >
              Todos ({lexemas.length})
            </button>
            {catUsadas.map((c) => (
              <button
                key={c}
                type="button"
                className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{
                  background: filtroCat === c ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
                  color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                }}
                onClick={() => setFiltroCat(c)}
              >
                {CAT_GRAM_LABELS[c] ?? c} ({lexemas.filter((l) => l.categoria_gramatical === c).length})
              </button>
            ))}
            <button
              type="button"
              className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2"
              style={{
                background: soloSinValidar ? "#f59e0b22" : "transparent",
                color: soloSinValidar ? "#f59e0b" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                border: `1px solid ${soloSinValidar ? "#f59e0b44" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
              }}
              onClick={() => setSoloSinValidar((p) => !p)}
            >
              Sin validar
            </button>
          </div>
        )}
      </SectionCard>

      {/* Lista */}
      {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)" }} /></div>}
      {!loading && filtrados.length === 0 && (
        <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          <Book size={28} strokeWidth={1.5} className="mx-auto" />
          <p className="text-sm">{busqueda || filtroCat ? "Sin resultados" : "El diccionario está vacío"}</p>
          {!busqueda && !filtroCat && (
            <p className="text-micro">Usá el campo de arriba para agregar el primer lema</p>
          )}
        </div>
      )}
      <div className="space-y-2">
        {filtrados.map((l) => (
          <LexemaRow
            key={l.id}
            lexema={l}
            onGuardar={guardar}
            onEliminar={eliminar}
            onCrearSig={crearSignificado}
            onGuardarSig={guardarSignificado}
            onEliminarSig={eliminarSignificado}
          />
        ))}
      </div>

      {/* Estadísticas */}
      {lexemas.length > 0 && (
        <div
          className="flex gap-4 flex-wrap text-micro pt-1"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
        >
          <span>Total: {lexemas.length} lemas</span>
          <span>Validados: {lexemas.filter((l) => l.validado).length}</span>
          <span>Préstamos: {lexemas.filter((l) => l.es_prestamo).length}</span>
          <span>Significados: {lexemas.reduce((s, l) => s + (l.significados?.length ?? 0), 0)}</span>
        </div>
      )}
    </div>
  );
}

// ── Tab Culturas vinculadas ───────────────────────────────────────────────

function TabCulturas({ idiomaId }: { idiomaId: string }) {
  const { relaciones, loading, vincular, desvincular } = useCulturasIdioma(idiomaId);
  const { culturas } = useCulturas();
  const [culturaSelec, setCulturaSelec] = useState("");
  const [rolSelec, setRolSelec] = useState<CulturaIdioma["rol"]>("nativo");

  const vinculadas = new Set(relaciones.map((r) => r.cultura_id));
  const disponibles = culturas.filter((c) => !vinculadas.has(c.id));

  const handleVincular = async () => {
    if (!culturaSelec) return;
    await vincular(culturaSelec, rolSelec);
    setCulturaSelec("");
  };

  return (
    <div className="space-y-4">
      {/* Añadir vínculo */}
      <SectionCard>
        <FieldLabel>Vincular cultura</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <select
            className="flex-1 bg-transparent text-sm outline-none border-b cursor-pointer"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
            value={culturaSelec}
            onChange={(e) => setCulturaSelec(e.target.value)}
          >
            <option value="">— Seleccionar cultura —</option>
            {disponibles.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <SelectField
            value={rolSelec}
            options={["nativo", "comercio", "ritual", "extinto", "aprendido"] as CulturaIdioma["rol"][]}
            labels={ROL_IDIOMA_LABELS}
            onChange={(v) => setRolSelec(v)}
          />
          <button
            type="button"
            disabled={!culturaSelec}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-micro font-black disabled:opacity-40 transition-all"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
            onClick={handleVincular}
          >
            <Link2 size={11} /> Vincular
          </button>
        </div>
      </SectionCard>

      {/* Lista de culturas vinculadas */}
      {loading && <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)" }} /></div>}
      {!loading && relaciones.length === 0 && (
        <div className="text-center py-8 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          <Users size={28} strokeWidth={1.5} className="mx-auto" />
          <p className="text-sm">Ninguna cultura vinculada aún</p>
        </div>
      )}
      <div className="space-y-2">
        {relaciones.map((r) => (
          <div
            key={r.cultura_id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            {r.cultura?.color_emblema && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: r.cultura.color_emblema }}
              />
            )}
            <span className="text-sm font-semibold flex-1" style={{ color: "var(--primary)" }}>
              {r.cultura?.nombre ?? r.cultura_id}
            </span>
            <select
              className="bg-transparent text-sm outline-none border-b cursor-pointer"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}
              value={r.rol}
              onChange={(e) => vincular(r.cultura_id, e.target.value as CulturaIdioma["rol"])}
            >
              {(["nativo", "comercio", "ritual", "extinto", "aprendido"] as CulturaIdioma["rol"][]).map((v) => (
                <option key={v} value={v}>{ROL_IDIOMA_LABELS[v]}</option>
              ))}
            </select>
            <button
              type="button"
              className="p-1 rounded transition-all"
              style={{ color: "#ef4444" }}
              onClick={() => desvincular(r.cultura_id)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Fila de frase ─────────────────────────────────────────────────────────

function FraseRow({ frase, onGuardar, onEliminar }: {
  frase: IdiomaFrase;
  onGuardar: (id: string, campos: Partial<IdiomaFrase>) => void;
  onEliminar: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-lg group"
      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <Languages size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
        <span className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--primary)", fontFamily: "monospace" }}>
          {frase.frase_original || <span style={{ fontStyle: "italic", opacity: 0.5 }}>sin frase</span>}
        </span>
        {frase.traduccion && (
          <span className="text-micro truncate max-w-[120px]" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
            {frase.traduccion}
          </span>
        )}
        <Badge label={FRASE_CAT_LABELS[frase.categoria]} />
        {expanded ? <ChevronUp size={12} style={{ flexShrink: 0, opacity: 0.5 }} /> : <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />}
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="pt-2 space-y-2">
            <div>
              <FieldLabel>Frase original</FieldLabel>
              <InlineEdit value={frase.frase_original} placeholder="Frase en el idioma…" mono className="font-semibold"
                onSave={(v) => onGuardar(frase.id, { frase_original: v })} />
            </div>
            <div>
              <FieldLabel>Transliteración</FieldLabel>
              <InlineEdit value={frase.transliteracion ?? ""} placeholder="Cómo se pronuncia…" className="italic"
                onSave={(v) => onGuardar(frase.id, { transliteracion: v })} />
            </div>
            <div>
              <FieldLabel>Traducción</FieldLabel>
              <InlineEdit value={frase.traduccion ?? ""} placeholder="Significado en español…"
                onSave={(v) => onGuardar(frase.id, { traduccion: v })} />
            </div>
            <div>
              <FieldLabel>Contexto de uso</FieldLabel>
              <InlineEdit value={frase.contexto ?? ""} placeholder="ej: saludo formal entre guerreros…" multiline
                onSave={(v) => onGuardar(frase.id, { contexto: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <FieldLabel>Categoría</FieldLabel>
                <SelectField value={frase.categoria} options={FRASE_CATS} labels={FRASE_CAT_LABELS} onChange={(v) => onGuardar(frase.id, { categoria: v })} />
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded text-micro font-black transition-all"
                style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444433" }}
                onClick={() => onEliminar(frase.id)}
              >
                Eliminar frase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fila de regla ─────────────────────────────────────────────────────────

function ReglaRow({ regla, onGuardar, onEliminar }: {
  regla: IdiomaRegla;
  onGuardar: (id: string, campos: Partial<IdiomaRegla>) => void;
  onEliminar: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-lg group"
      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <span className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--primary)" }}>{regla.titulo}</span>
        <Badge label={REGLA_CAT_LABELS[regla.categoria]} />
        {expanded ? <ChevronUp size={12} style={{ flexShrink: 0, opacity: 0.5 }} /> : <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />}
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="pt-2 space-y-2">
            <div>
              <FieldLabel>Título</FieldLabel>
              <InlineEdit value={regla.titulo} placeholder="Nombre de la regla…" className="font-semibold"
                onSave={(v) => onGuardar(regla.id, { titulo: v })} />
            </div>
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <InlineEdit value={regla.descripcion ?? ""} placeholder="Explica la regla en detalle…" multiline
                onSave={(v) => onGuardar(regla.id, { descripcion: v })} />
            </div>
            <div>
              <FieldLabel>Ejemplo</FieldLabel>
              <InlineEdit value={regla.ejemplo ?? ""} placeholder="Ejemplo que ilustra la regla…" mono
                onSave={(v) => onGuardar(regla.id, { ejemplo: v })} />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <FieldLabel>Categoría</FieldLabel>
                <SelectField value={regla.categoria} options={REGLA_CATS} labels={REGLA_CAT_LABELS} onChange={(v) => onGuardar(regla.id, { categoria: v })} />
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded text-micro font-black transition-all"
                style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444433" }}
                onClick={() => onEliminar(regla.id)}
              >
                Eliminar regla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel derecho: detalle ────────────────────────────────────────────────

type DetalleTab = "info" | "fonologia" | "lexico" | "generador" | "frases" | "reglas" | "culturas";

const DETAIL_TABS: { key: DetalleTab; label: string; icon: React.ElementType }[] = [
  { key: "info",      label: "Info",      icon: FileText  },
  { key: "fonologia", label: "Fonología", icon: Mic       },
  { key: "lexico",    label: "Léxico",    icon: Book      },
  { key: "generador", label: "Generador", icon: Wand2     },
  { key: "frases",    label: "Frases",    icon: AlignLeft },
  { key: "reglas",    label: "Reglas",    icon: List      },
  { key: "culturas",  label: "Culturas",  icon: Globe     },
];

function IdiomaDetalle({ idiomaId, onBack, allIdiomas }: {
  idiomaId: string;
  onBack?: () => void;
  allIdiomas: Pick<Idioma, "id" | "nombre">[];
}) {
  const {
    idioma, frases, reglas, loading, saving, error: detalleError,
    guardar,
    crearFrase, guardarFrase, eliminarFrase,
    crearRegla, guardarRegla, eliminarRegla,
  } = useIdiomaDetalle(idiomaId);
  const { culturas } = useCulturas();

  const [tab, setTab] = useState<DetalleTab>("info");
  const [nuevaFrase, setNuevaFrase] = useState("");
  const [nuevaFraseCat, setNuevaFraseCat] = useState<FraseCategoria>("otro");
  const [nuevaRegla, setNuevaRegla] = useState("");
  const [nuevaReglaCat, setNuevaReglaCat] = useState<ReglaCategoria>("otro");
  const [filtroCat, setFiltroCat] = useState<ReglaCategoria | "">("");

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );
  if (!idioma) return null;

  const reglasFiltradas = filtroCat ? reglas.filter((r) => r.categoria === filtroCat) : reglas;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        {onBack && (
          <button
            type="button"
            className="flex items-center gap-1.5 text-micro font-black uppercase tracking-widest mb-3 transition-opacity hover:opacity-70"
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
            onClick={onBack}
          >
            <ArrowLeft size={11} /> Volver
          </button>
        )}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${TIPO_COLORS[idioma.tipo]}22` }}>
            <Languages size={20} style={{ color: TIPO_COLORS[idioma.tipo] }} />
          </div>
          <div className="flex-1 min-w-0">
            <InlineEdit value={idioma.nombre} placeholder="Nombre del idioma" className="text-lg font-bold"
              onSave={(v) => guardar({ nombre: v })} />
            <InlineEdit value={idioma.nombre_nativo ?? ""} placeholder="Nombre nativo (como lo llaman sus hablantes)" className="italic text-sm"
              onSave={(v) => guardar({ nombre_nativo: v })} />
          </div>
          {saving && <Loader2 size={14} className="animate-spin flex-shrink-0 mt-1" style={{ color: "var(--primary)" }} />}
        </div>
        <div className="flex gap-2 flex-wrap mt-2.5">
          <Badge label={TIPO_LABELS[idioma.tipo]} color={TIPO_COLORS[idioma.tipo]} />
          {idioma.familia_linguistica && <Badge label={idioma.familia_linguistica} />}
          {idioma.es_extinto && <Badge label="extinto" color="#6b7280" />}
          {idioma.tiene_escritura_propia && <Badge label="escritura propia" color="#818cf8" />}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex gap-0.5 px-4 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        {DETAIL_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-micro font-black uppercase tracking-widest transition-all whitespace-nowrap"
            style={{
              color: tab === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              borderBottom: tab === key ? "2px solid var(--primary)" : "2px solid transparent",
            }}
            onClick={() => setTab(key)}
          >
            <Icon size={11} />
            {label}
            {key === "frases" && frases.length > 0 && (
              <span className="px-1 rounded text-micro" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                {frases.length}
              </span>
            )}
            {key === "reglas" && reglas.length > 0 && (
              <span className="px-1 rounded text-micro" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                {reglas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {detalleError && <ErrorBanner message={detalleError.message} />}

        {/* INFO */}
        {tab === "info" && (
          <>
            <SectionCard>
              <FieldLabel>Descripción</FieldLabel>
              <InlineEdit
                value={idioma.descripcion ?? ""}
                placeholder="Describe el idioma, su historia, su propósito en Garlia…"
                multiline
                onSave={(v) => guardar({ descripcion: v })}
              />
            </SectionCard>

            <SectionCard>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Tipo</FieldLabel>
                  <SelectField
                    value={idioma.tipo}
                    options={["natural", "creado", "muerto", "pidgin", "sign", "ritual", "secreto"] as IdiomaTipo[]}
                    labels={TIPO_LABELS}
                    onChange={(v) => guardar({ tipo: v })}
                  />
                </div>
                <div>
                  <FieldLabel>Familia lingüística</FieldLabel>
                  <InlineEdit value={idioma.familia_linguistica ?? ""} placeholder="Proto-Garliano, Lenguas del Norte…"
                    onSave={(v) => guardar({ familia_linguistica: v })} />
                </div>
                <div>
                  <FieldLabel>Hablantes aprox.</FieldLabel>
                  <InlineEdit value={idioma.num_hablantes_aprox ?? ""} placeholder="Millones, algunos miles, extinto…"
                    onSave={(v) => guardar({ num_hablantes_aprox: v })} />
                </div>
                <div>
                  <FieldLabel>Idioma ancestro</FieldLabel>
                  <select
                    className="bg-transparent text-sm outline-none cursor-pointer w-full"
                    style={{ color: "var(--primary)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
                    value={idioma.idioma_padre_id ?? ""}
                    onChange={(e) => guardar({ idioma_padre_id: e.target.value || undefined })}
                  >
                    <option value="">— Ninguno —</option>
                    {allIdiomas.filter((i) => i.id !== idioma.id).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel>Cultura principal</FieldLabel>
                <select
                  className="bg-transparent text-sm outline-none cursor-pointer w-full"
                  style={{ color: "var(--primary)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
                  value={idioma.cultura_principal_id ?? ""}
                  onChange={(e) => guardar({ cultura_principal_id: e.target.value || undefined })}
                >
                  <option value="">— Ninguna —</option>
                  {culturas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </SectionCard>

            <SectionCard>
              <p className="text-micro font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                Escritura
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Sistema de escritura</FieldLabel>
                  <InlineEdit value={idioma.sistema_escritura ?? ""} placeholder="Runas Solares, Silabario Kor…"
                    onSave={(v) => guardar({ sistema_escritura: v })} />
                </div>
                <div>
                  <FieldLabel>Dirección</FieldLabel>
                  <SelectField
                    value={idioma.direccion_escritura}
                    options={["ltr", "rtl", "ttb", "btt", "boustrophedon"] as DireccionEscritura[]}
                    labels={DIR_LABELS}
                    onChange={(v) => guardar({ direccion_escritura: v })}
                  />
                </div>
              </div>
              <div className="flex gap-6 flex-wrap">
                <Checkbox checked={idioma.tiene_escritura_propia} label="Tiene escritura propia" onChange={(v) => guardar({ tiene_escritura_propia: v })} />
                <Checkbox checked={idioma.es_extinto} label="Idioma extinto" onChange={(v) => guardar({ es_extinto: v })} />
              </div>
            </SectionCard>
          </>
        )}

        {/* FONOLOGÍA */}
        {tab === "fonologia" && (
          <TabFonologia idiomaId={idiomaId} idioma={idioma} onGuardar={guardar} />
        )}

        {/* LÉXICO */}
        {tab === "lexico" && <TabLexico idiomaId={idiomaId} />}

        {/* GENERADOR */}
        {tab === "generador" && <GeneradorNombres idiomaId={idiomaId} />}

        {/* FRASES */}
        {tab === "frases" && (
          <>
            <SectionCard>
              <FieldLabel>Nueva frase</FieldLabel>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-transparent text-sm outline-none border-b font-mono"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
                  placeholder="Frase en el idioma…"
                  value={nuevaFrase}
                  onChange={(e) => setNuevaFrase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nuevaFrase.trim()) {
                      crearFrase(nuevaFrase.trim(), { categoria: nuevaFraseCat });
                      setNuevaFrase("");
                    }
                  }}
                />
                <SelectField value={nuevaFraseCat} options={FRASE_CATS} labels={FRASE_CAT_LABELS} onChange={setNuevaFraseCat} />
                <button
                  type="button"
                  className="p-1.5 rounded transition-all"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                  onClick={() => {
                    if (nuevaFrase.trim()) { crearFrase(nuevaFrase.trim(), { categoria: nuevaFraseCat }); setNuevaFrase(""); }
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </SectionCard>
            <div className="space-y-2">
              {frases.length === 0 ? (
                <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  <AlignLeft size={28} strokeWidth={1.5} className="mx-auto" />
                  <p className="text-sm">Aún no hay frases en el corpus</p>
                </div>
              ) : (
                frases.map((f) => <FraseRow key={f.id} frase={f} onGuardar={guardarFrase} onEliminar={eliminarFrase} />)
              )}
            </div>
          </>
        )}

        {/* REGLAS */}
        {tab === "reglas" && (
          <>
            <SectionCard>
              <FieldLabel>Nueva regla</FieldLabel>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-transparent text-sm outline-none border-b"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
                  placeholder="Título de la regla…"
                  value={nuevaRegla}
                  onChange={(e) => setNuevaRegla(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nuevaRegla.trim()) {
                      crearRegla(nuevaRegla.trim(), nuevaReglaCat);
                      setNuevaRegla("");
                    }
                  }}
                />
                <SelectField value={nuevaReglaCat} options={REGLA_CATS} labels={REGLA_CAT_LABELS} onChange={setNuevaReglaCat} />
                <button
                  type="button"
                  className="p-1.5 rounded transition-all"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                  onClick={() => {
                    if (nuevaRegla.trim()) { crearRegla(nuevaRegla.trim(), nuevaReglaCat); setNuevaRegla(""); }
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </SectionCard>

            {reglas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all"
                  style={{
                    background: filtroCat === "" ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
                    color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                  }}
                  onClick={() => setFiltroCat("")}
                >
                  Todas ({reglas.length})
                </button>
                {REGLA_CATS.filter((c) => reglas.some((r) => r.categoria === c)).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all"
                    style={{
                      background: filtroCat === c ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
                      color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                    onClick={() => setFiltroCat(c)}
                  >
                    {REGLA_CAT_LABELS[c]} ({reglas.filter((r) => r.categoria === c).length})
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {reglasFiltradas.length === 0 ? (
                <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  <List size={28} strokeWidth={1.5} className="mx-auto" />
                  <p className="text-sm">
                    {filtroCat ? `Sin reglas de tipo "${REGLA_CAT_LABELS[filtroCat]}"` : "Aún no hay reglas gramaticales"}
                  </p>
                </div>
              ) : (
                reglasFiltradas.map((r) => <ReglaRow key={r.id} regla={r} onGuardar={guardarRegla} onEliminar={eliminarRegla} />)
              )}
            </div>
          </>
        )}

        {/* CULTURAS */}
        {tab === "culturas" && <TabCulturas idiomaId={idiomaId} />}
      </div>
    </div>
  );
}

// ── Item de lista ─────────────────────────────────────────────────────────

function IdiomaListItem({ idioma, selected, onClick }: {
  idioma: Idioma; selected: boolean; onClick: () => void;
}) {
  const color = TIPO_COLORS[idioma.tipo];
  return (
    <button
      type="button"
      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all"
      style={{
        background: selected ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
        color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 70%, transparent)",
        borderRadius: "var(--radius-btn)",
        borderLeft: selected ? "3px solid var(--primary)" : "3px solid transparent",
      }}
      onClick={onClick}
    >
      <Languages size={14} style={{ marginTop: 2, flexShrink: 0, color }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{idioma.nombre}</p>
        {idioma.nombre_nativo && (
          <p className="text-micro truncate" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)", fontStyle: "italic" }}>
            {idioma.nombre_nativo}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge label={TIPO_LABELS[idioma.tipo]} color={color} />
          {idioma.es_extinto && <Badge label="extinto" color="#6b7280" />}
        </div>
      </div>
    </button>
  );
}

// ── Componente raíz ───────────────────────────────────────────────────────

export default function IdiomasSection() {
  const { idiomas, loading, error: listaError, crear, eliminar } = useIdiomas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<IdiomaTipo | "">("");

  const filtrados = idiomas.filter((i) => {
    const q = busqueda.toLowerCase();
    const matchQ = !q || i.nombre.toLowerCase().includes(q) ||
      (i.nombre_nativo ?? "").toLowerCase().includes(q) ||
      (i.familia_linguistica ?? "").toLowerCase().includes(q);
    const matchT = !filtroTipo || i.tipo === filtroTipo;
    return matchQ && matchT;
  });

  const tiposUsados = [...new Set(idiomas.map((i) => i.tipo))] as IdiomaTipo[];

  const handleCrear = async () => {
    if (!nuevoNombre.trim()) return;
    const nuevo = await crear(nuevoNombre.trim());
    if (nuevo) setSelectedId(nuevo.id);
    setNuevoNombre("");
    setCreando(false);
  };

  const handleEliminar = async (id: string) => {
    await eliminar(id);
    if (selectedId === id) setSelectedId(null);
    setConfirmarEliminar(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Lista izquierda ── */}
      <div
        className={`flex flex-col flex-shrink-0 overflow-hidden ${selectedId ? "hidden md:flex" : "flex"} md:flex`}
        style={{ width: "272px", borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages size={15} style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>Idiomas</span>
              <span
                className="text-micro font-black px-1.5 py-0.5 rounded"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
              >
                {idiomas.length}
              </span>
            </div>
            <button
              type="button"
              className="p-1.5 rounded transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
              onClick={() => setCreando(true)}
            >
              <Plus size={13} />
            </button>
          </div>

          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
          >
            <Search size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar idiomas…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda("")} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filtro por tipo */}
          {tiposUsados.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="text-micro px-1.5 py-0.5 rounded font-black"
                style={{
                  background: filtroTipo === "" ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                  color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                }}
                onClick={() => setFiltroTipo("")}
              >
                Todos
              </button>
              {tiposUsados.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="text-micro px-1.5 py-0.5 rounded font-black"
                  style={{
                    background: filtroTipo === t ? `${TIPO_COLORS[t]}22` : "transparent",
                    color: filtroTipo === t ? TIPO_COLORS[t] : "color-mix(in srgb, var(--primary) 50%, transparent)",
                    border: `1px solid ${filtroTipo === t ? `${TIPO_COLORS[t]}44` : "color-mix(in srgb, var(--primary) 12%, transparent)"}`,
                  }}
                  onClick={() => setFiltroTipo(filtroTipo === t ? "" : t)}
                >
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Crear nuevo */}
        {creando && (
          <div className="px-3 pb-2 flex gap-2 flex-shrink-0">
            <input
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none border-b"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              placeholder="Nombre del idioma…"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCrear();
                if (e.key === "Escape") { setCreando(false); setNuevoNombre(""); }
              }}
            />
            <button type="button" onClick={handleCrear} className="p-1 rounded" style={{ color: "#4ade80" }}>
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => { setCreando(false); setNuevoNombre(""); }}
              className="p-1 rounded"
              style={{ color: "#ef4444" }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {listaError && (
            <div className="px-1 py-2">
              <ErrorBanner message={listaError.message} />
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          )}
          {!loading && filtrados.length === 0 && (
            <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              <BookOpen size={28} strokeWidth={1.5} className="mx-auto" />
              <p className="text-sm">{busqueda || filtroTipo ? "Sin resultados" : "Ningún idioma aún"}</p>
            </div>
          )}
          {filtrados.map((idioma) => (
            <div key={idioma.id} className="relative group">
              <IdiomaListItem idioma={idioma} selected={selectedId === idioma.id} onClick={() => setSelectedId(idioma.id)} />
              {confirmarEliminar === idioma.id ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 z-10">
                  <button
                    type="button"
                    onClick={() => handleEliminar(idioma.id)}
                    className="px-2 py-0.5 rounded text-micro font-black"
                    style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444444" }}
                  >
                    Sí, borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminar(null)}
                    className="p-1 rounded"
                    style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#ef4444" }}
                  onClick={(e) => { e.stopPropagation(); setConfirmarEliminar(idioma.id); }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel de detalle ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedId ? (
          <IdiomaDetalle
            key={selectedId}
            idiomaId={selectedId}
            allIdiomas={idiomas.map(({ id, nombre }) => ({ id, nombre }))}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-3"
            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            <Languages size={40} strokeWidth={1.2} />
            <p className="text-sm">Seleccioná un idioma para editarlo</p>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all mt-1"
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
              onClick={() => setCreando(true)}
            >
              <Plus size={14} /> Crear primer idioma
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
