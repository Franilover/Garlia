"use client";
/**
 * IdiomasSection — Editor de Mundo · Culturas & Idiomas
 * ──────────────────────────────────────────────────────
 * Layout: lista izquierda fija + panel de detalle derecho con tabs.
 * Persiste todo en Supabase. Sigue el patrón de PizarronSection.
 *
 * Tabs del detalle:
 *   info       → metadatos, tipo, familia, escritura, cultura
 *   fonologia  → notas libres + vocabulario de muestra editable
 *   frases     → corpus de frases con transliteración y traducción
 *   reglas     → reglas gramaticales por categoría
 */
import {
  AlignLeft, ArrowLeft, Check, ChevronDown, ChevronUp,
  FileText, Globe, Languages, List, Loader2,
  Mic, Plus, Search, Trash2, X, BookOpen,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIdiomas, useIdiomaDetalle, useCulturas } from "./useIdiomas";
import type {
  Idioma, IdiomaFrase, IdiomaRegla,
  IdiomaTipo, FraseCategoria, ReglaCategoria,
  DireccionEscritura,
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
  ltr: "Izquierda → Derecha", rtl: "Derecha → Izquierda",
  ttb: "Arriba → Abajo", btt: "Abajo → Arriba", boustrophedon: "Boustrophedon",
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

/** Campo editable inline — click para editar, blur/enter para guardar */
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
  value: T; options: T[]; labels: Record<T, string>; onChange: (v: T) => void;
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
      {options.map((o) => <option key={o} value={o}>{labels[o]}</option>)}
    </select>
  );
}

function Checkbox({
  checked, label, onChange,
}: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm select-none" style={{ color: "var(--primary)" }}>
      <input
        type="checkbox"
        className="accent-current"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// ── Rasgos gramaticales como tags ──────────────────────────────────────────

function RasgosEditor({ rasgos, onChange }: { rasgos: string[]; onChange: (r: string[]) => void }) {
  const [input, setInput] = useState("");
  const agregar = () => {
    const v = input.trim();
    if (v && !rasgos.includes(v)) onChange([...rasgos, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {rasgos.map((r) => (
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
            <button type="button" onClick={() => onChange(rasgos.filter((x) => x !== r))}>
              <X size={10} />
            </button>
          </span>
        ))}
        {rasgos.length === 0 && (
          <span className="text-micro italic" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
            Sin rasgos aún
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-transparent text-sm outline-none border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
          placeholder="ej: aglutinante, VSO, tonal, ergativo…"
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

// ── Vocabulario de muestra editable ───────────────────────────────────────

type VocabEntry = { palabra: string; traduccion: string };

function VocabularioEditor({
  vocabulario,
  onChange,
}: {
  vocabulario: VocabEntry[];
  onChange: (v: VocabEntry[]) => void;
}) {
  const [nueva, setNueva] = useState<VocabEntry>({ palabra: "", traduccion: "" });

  const agregar = () => {
    if (!nueva.palabra.trim()) return;
    onChange([...vocabulario, { palabra: nueva.palabra.trim(), traduccion: nueva.traduccion.trim() }]);
    setNueva({ palabra: "", traduccion: "" });
  };

  const actualizar = (idx: number, campo: keyof VocabEntry, val: string) => {
    const copia = vocabulario.map((e, i) => i === idx ? { ...e, [campo]: val } : e);
    onChange(copia);
  };

  const eliminar = (idx: number) => onChange(vocabulario.filter((_, i) => i !== idx));

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
                value={e.palabra}
                placeholder="palabra"
                mono
                className="flex-1 font-semibold"
                onSave={(v) => { actualizar(idx, "palabra", v); onChange(vocabulario.map((x, i) => i === idx ? { ...x, palabra: v } : x)); }}
              />
              <span style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>→</span>
              <InlineEdit
                value={e.traduccion}
                placeholder="traducción"
                className="flex-1"
                onSave={(v) => { onChange(vocabulario.map((x, i) => i === idx ? { ...x, traduccion: v } : x)); }}
              />
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                style={{ color: "#ef4444" }}
                onClick={() => eliminar(idx)}
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

// ── Fila de frase ─────────────────────────────────────────────────────────

function FraseRow({
  frase, onGuardar, onEliminar,
}: {
  frase: IdiomaFrase;
  onGuardar: (id: string, campos: Partial<IdiomaFrase>) => void;
  onEliminar: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg group"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {/* Header compacto */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
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

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="pt-2 space-y-2">
            <div>
              <FieldLabel>Frase original</FieldLabel>
              <InlineEdit
                value={frase.frase_original}
                placeholder="Frase en el idioma…"
                mono
                className="font-semibold"
                onSave={(v) => onGuardar(frase.id, { frase_original: v })}
              />
            </div>
            <div>
              <FieldLabel>Transliteración</FieldLabel>
              <InlineEdit
                value={frase.transliteracion ?? ""}
                placeholder="Cómo se pronuncia…"
                className="italic"
                onSave={(v) => onGuardar(frase.id, { transliteracion: v })}
              />
            </div>
            <div>
              <FieldLabel>Traducción</FieldLabel>
              <InlineEdit
                value={frase.traduccion ?? ""}
                placeholder="Significado en español…"
                onSave={(v) => onGuardar(frase.id, { traduccion: v })}
              />
            </div>
            <div>
              <FieldLabel>Contexto de uso</FieldLabel>
              <InlineEdit
                value={frase.contexto ?? ""}
                placeholder="ej: saludo formal entre guerreros…"
                multiline
                onSave={(v) => onGuardar(frase.id, { contexto: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <FieldLabel>Categoría</FieldLabel>
                <SelectField
                  value={frase.categoria}
                  options={FRASE_CATS}
                  labels={FRASE_CAT_LABELS}
                  onChange={(v) => onGuardar(frase.id, { categoria: v })}
                />
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

function ReglaRow({
  regla, onGuardar, onEliminar,
}: {
  regla: IdiomaRegla;
  onGuardar: (id: string, campos: Partial<IdiomaRegla>) => void;
  onEliminar: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg group"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--primary)" }}>
          {regla.titulo}
        </span>
        <Badge label={REGLA_CAT_LABELS[regla.categoria]} />
        {expanded ? <ChevronUp size={12} style={{ flexShrink: 0, opacity: 0.5 }} /> : <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="pt-2 space-y-2">
            <div>
              <FieldLabel>Título</FieldLabel>
              <InlineEdit
                value={regla.titulo}
                placeholder="Nombre de la regla…"
                className="font-semibold"
                onSave={(v) => onGuardar(regla.id, { titulo: v })}
              />
            </div>
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <InlineEdit
                value={regla.descripcion ?? ""}
                placeholder="Explica la regla en detalle…"
                multiline
                onSave={(v) => onGuardar(regla.id, { descripcion: v })}
              />
            </div>
            <div>
              <FieldLabel>Ejemplo</FieldLabel>
              <InlineEdit
                value={regla.ejemplo ?? ""}
                placeholder="Ejemplo que ilustra la regla…"
                mono
                onSave={(v) => onGuardar(regla.id, { ejemplo: v })}
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <FieldLabel>Categoría</FieldLabel>
                <SelectField
                  value={regla.categoria}
                  options={REGLA_CATS}
                  labels={REGLA_CAT_LABELS}
                  onChange={(v) => onGuardar(regla.id, { categoria: v })}
                />
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

type DetalleTab = "info" | "fonologia" | "frases" | "reglas";

const DETAIL_TABS: { key: DetalleTab; label: string; icon: React.ElementType }[] = [
  { key: "info",      label: "Info",      icon: FileText  },
  { key: "fonologia", label: "Fonología", icon: Mic       },
  { key: "frases",    label: "Frases",    icon: AlignLeft },
  { key: "reglas",    label: "Reglas",    icon: List      },
];

function IdiomaDetalle({
  idiomaId, onBack, allIdiomas,
}: {
  idiomaId: string;
  onBack?: () => void;
  allIdiomas: Pick<Idioma, "id" | "nombre">[];
}) {
  const {
    idioma, frases, reglas, loading, saving,
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

  const reglasFiltradas = filtroCat
    ? reglas.filter((r) => r.categoria === filtroCat)
    : reglas;

  const tabCounts: Partial<Record<DetalleTab, number>> = {
    frases: frases.length,
    reglas: reglas.length,
  };

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
          <div
            className="p-2.5 rounded-xl flex-shrink-0"
            style={{ background: `${TIPO_COLORS[idioma.tipo]}22` }}
          >
            <Languages size={20} style={{ color: TIPO_COLORS[idioma.tipo] }} />
          </div>
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={idioma.nombre}
              placeholder="Nombre del idioma"
              className="text-lg font-bold"
              onSave={(v) => guardar({ nombre: v })}
            />
            <InlineEdit
              value={idioma.nombre_nativo ?? ""}
              placeholder="Nombre nativo (como lo llaman sus hablantes)"
              className="italic text-sm"
              onSave={(v) => guardar({ nombre_nativo: v })}
            />
          </div>
          {saving && (
            <Loader2 size={14} className="animate-spin flex-shrink-0 mt-1" style={{ color: "var(--primary)" }} />
          )}
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
        className="flex gap-0.5 px-4 flex-shrink-0"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        {DETAIL_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-micro font-black uppercase tracking-widest transition-all"
            style={{
              color: tab === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              borderBottom: tab === key ? "2px solid var(--primary)" : "2px solid transparent",
            }}
            onClick={() => setTab(key)}
          >
            <Icon size={11} />
            {label}
            {tabCounts[key] !== undefined && (
              <span
                className="px-1 rounded text-micro"
                style={{
                  background: tab === key
                    ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                    : "color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                {tabCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

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
                  <InlineEdit
                    value={idioma.familia_linguistica ?? ""}
                    placeholder="Proto-Garliano, Lenguas del Norte…"
                    onSave={(v) => guardar({ familia_linguistica: v })}
                  />
                </div>
                <div>
                  <FieldLabel>Hablantes aprox.</FieldLabel>
                  <InlineEdit
                    value={idioma.num_hablantes_aprox ?? ""}
                    placeholder="Millones, algunos miles, extinto…"
                    onSave={(v) => guardar({ num_hablantes_aprox: v })}
                  />
                </div>
                <div>
                  <FieldLabel>Idioma ancestro</FieldLabel>
                  <select
                    className="bg-transparent text-sm outline-none cursor-pointer w-full"
                    style={{
                      color: "var(--primary)",
                      borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                    value={idioma.idioma_padre_id ?? ""}
                    onChange={(e) => guardar({ idioma_padre_id: e.target.value || undefined })}
                  >
                    <option value="">— Ninguno —</option>
                    {allIdiomas
                      .filter((i) => i.id !== idioma.id)
                      .map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel>Cultura principal</FieldLabel>
                <select
                  className="bg-transparent text-sm outline-none cursor-pointer w-full"
                  style={{
                    color: "var(--primary)",
                    borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                  }}
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
                  <InlineEdit
                    value={idioma.sistema_escritura ?? ""}
                    placeholder="Runas Solares, Silabario Kor…"
                    onSave={(v) => guardar({ sistema_escritura: v })}
                  />
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
                <Checkbox
                  checked={idioma.tiene_escritura_propia}
                  label="Tiene escritura propia"
                  onChange={(v) => guardar({ tiene_escritura_propia: v })}
                />
                <Checkbox
                  checked={idioma.es_extinto}
                  label="Idioma extinto"
                  onChange={(v) => guardar({ es_extinto: v })}
                />
              </div>
            </SectionCard>

            <SectionCard>
              <FieldLabel>Rasgos gramaticales</FieldLabel>
              <RasgosEditor
                rasgos={idioma.rasgos_gramaticales ?? []}
                onChange={(r) => guardar({ rasgos_gramaticales: r })}
              />
            </SectionCard>
          </>
        )}

        {/* FONOLOGÍA */}
        {tab === "fonologia" && (
          <>
            <SectionCard>
              <FieldLabel>Notas fonológicas</FieldLabel>
              <p className="text-micro mb-2" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                Describe el inventario de sonidos, consonantes especiales, vocales, tonos, acento y restricciones fonotácticas.
              </p>
              <InlineEdit
                value={idioma.notas_fonologia ?? ""}
                placeholder="Describe los sonidos del idioma… ej: tiene tres tonos (alto, medio, descendente); las sílabas siguen el patrón (C)V(C); los grupos consonánticos están prohibidos al inicio de sílaba…"
                multiline
                onSave={(v) => guardar({ notas_fonologia: v })}
              />
            </SectionCard>

            <SectionCard>
              <FieldLabel>Vocabulario de muestra</FieldLabel>
              <p className="text-micro mb-2" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                Palabras representativas del idioma con su traducción. Click en una celda para editar.
              </p>
              <VocabularioEditor
                vocabulario={idioma.vocabulario_muestra ?? []}
                onChange={(v) => guardar({ vocabulario_muestra: v })}
              />
            </SectionCard>
          </>
        )}

        {/* FRASES */}
        {tab === "frases" && (
          <>
            {/* Agregar frase */}
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
                <SelectField
                  value={nuevaFraseCat}
                  options={FRASE_CATS}
                  labels={FRASE_CAT_LABELS}
                  onChange={setNuevaFraseCat}
                />
                <button
                  type="button"
                  className="p-1.5 rounded transition-all"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                  onClick={() => {
                    if (nuevaFrase.trim()) {
                      crearFrase(nuevaFrase.trim(), { categoria: nuevaFraseCat });
                      setNuevaFrase("");
                    }
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </SectionCard>

            {/* Lista */}
            <div className="space-y-2">
              {frases.length === 0 ? (
                <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  <AlignLeft size={28} strokeWidth={1.5} className="mx-auto" />
                  <p className="text-sm">Aún no hay frases en el corpus</p>
                </div>
              ) : (
                frases.map((f) => (
                  <FraseRow key={f.id} frase={f} onGuardar={guardarFrase} onEliminar={eliminarFrase} />
                ))
              )}
            </div>
          </>
        )}

        {/* REGLAS */}
        {tab === "reglas" && (
          <>
            {/* Agregar regla */}
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
                      crearRegla(nuevaRegla.trim());
                      setNuevaRegla("");
                    }
                  }}
                />
                <SelectField
                  value={nuevaReglaCat}
                  options={REGLA_CATS}
                  labels={REGLA_CAT_LABELS}
                  onChange={setNuevaReglaCat}
                />
                <button
                  type="button"
                  className="p-1.5 rounded transition-all"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                  onClick={() => {
                    if (nuevaRegla.trim()) {
                      crearRegla(nuevaRegla.trim());
                      setNuevaRegla("");
                    }
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </SectionCard>

            {/* Filtro por categoría */}
            {reglas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all"
                  style={{
                    background: filtroCat === "" ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
                    color: "var(--primary)",
                    border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
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
                      color: "var(--primary)",
                      border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                    onClick={() => setFiltroCat(c)}
                  >
                    {REGLA_CAT_LABELS[c]} ({reglas.filter((r) => r.categoria === c).length})
                  </button>
                ))}
              </div>
            )}

            {/* Lista */}
            <div className="space-y-2">
              {reglasFiltradas.length === 0 ? (
                <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  <List size={28} strokeWidth={1.5} className="mx-auto" />
                  <p className="text-sm">
                    {filtroCat ? `Sin reglas de tipo "${REGLA_CAT_LABELS[filtroCat]}"` : "Aún no hay reglas gramaticales"}
                  </p>
                </div>
              ) : (
                reglasFiltradas.map((r) => (
                  <ReglaRow key={r.id} regla={r} onGuardar={guardarRegla} onEliminar={eliminarRegla} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Item de lista ─────────────────────────────────────────────────────────

function IdiomaListItem({
  idioma, selected, onClick,
}: { idioma: Idioma; selected: boolean; onClick: () => void }) {
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
          <p
            className="text-micro truncate"
            style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)", fontStyle: "italic" }}
          >
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
  const { idiomas, loading, crear, eliminar } = useIdiomas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);

  const filtrados = idiomas.filter(
    (i) =>
      i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.nombre_nativo ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.familia_linguistica ?? "").toLowerCase().includes(busqueda.toLowerCase()),
  );

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
        style={{
          width: "272px",
          borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages size={15} style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>Idiomas</span>
              <span
                className="text-micro font-black px-1.5 py-0.5 rounded"
                style={{
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 60%, transparent)",
                }}
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

          {/* Búsqueda */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
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
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          )}
          {!loading && filtrados.length === 0 && (
            <div className="text-center py-10 space-y-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              <BookOpen size={28} strokeWidth={1.5} className="mx-auto" />
              <p className="text-sm">{busqueda ? "Sin resultados" : "Ningún idioma aún"}</p>
            </div>
          )}
          {filtrados.map((idioma) => (
            <div key={idioma.id} className="relative group">
              <IdiomaListItem
                idioma={idioma}
                selected={selectedId === idioma.id}
                onClick={() => setSelectedId(idioma.id)}
              />
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
