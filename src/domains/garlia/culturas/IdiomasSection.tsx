"use client";
/**
 * IdiomasSection
 * ─────────────────────────────────────────────────────────────────────────
 * Página principal de Culturas & Idiomas dentro del Editor de Mundo.
 * Layout: lista izquierda + detalle derecho (igual a otras secciones).
 *
 * Colocar en: domains/garlia/culturas/IdiomasSection.tsx
 */
import {
  BookOpen, Check, ChevronDown, Edit2, Globe, Languages,
  Loader2, Plus, Search, Trash2, X, Scroll, Book,
  AlignLeft, Mic, List, FileText, ArrowLeft,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIdiomas, useIdiomaDetalle, useCulturas } from "./useIdiomas";
import type {
  Idioma, IdiomaFrase, IdiomaRegla,
  IdiomaTipo, FraseCategoria, ReglaCategoria,
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

const FRASE_CATS: FraseCategoria[] = [
  "saludo", "despedida", "pregunta", "numero", "color", "tiempo",
  "ritual", "insulto", "piropo", "refrán", "otro",
];

const TAB_ICONS: Record<string, React.ElementType> = {
  info: FileText, frases: AlignLeft, reglas: List, fonologia: Mic,
};

// ── Helpers ───────────────────────────────────────────────────────────────

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
    <p className="text-micro font-black uppercase tracking-widest mb-1"
      style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
      {children}
    </p>
  );
}

function InlineEdit({
  value, placeholder, onSave, multiline = false, className = "",
}: {
  value: string; placeholder: string; onSave: (v: string) => void;
  multiline?: boolean; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => { onSave(draft); setEditing(false); };

  if (editing) {
    const sharedProps = {
      ref: ref as any,
      className: `w-full bg-transparent border-b outline-none resize-none text-sm ${className}`,
      style: {
        borderColor: "var(--primary)",
        color: "var(--primary)",
        fontFamily: "inherit",
      },
      value: draft,
      placeholder,
      onChange: (e: React.ChangeEvent<any>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      },
    };
    return multiline
      ? <textarea rows={3} {...sharedProps} />
      : <input {...sharedProps} />;
  }

  return (
    <span
      className={`cursor-text border-b border-transparent hover:border-dashed text-sm ${className}`}
      style={{
        color: value ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
        borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
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
      style={{ color: "var(--primary)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o} value={o}>{labels[o]}</option>
      ))}
    </select>
  );
}

// ── Panel izquierdo: lista ────────────────────────────────────────────────

function IdiomaListItem({
  idioma, selected, onClick,
}: {
  idioma: Idioma; selected: boolean; onClick: () => void;
}) {
  const color = idioma.tipo ? TIPO_COLORS[idioma.tipo] : undefined;
  return (
    <button
      type="button"
      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all"
      style={{
        background: selected
          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : "transparent",
        color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 70%, transparent)",
        borderRadius: "var(--radius-btn)",
        borderLeft: selected ? `3px solid var(--primary)` : "3px solid transparent",
      }}
      onClick={onClick}
    >
      <Languages size={14} style={{ marginTop: 2, flexShrink: 0, color: color ?? "currentColor" }} />
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

// ── Panel de detalle ──────────────────────────────────────────────────────

function FrasaRow({
  frase, onGuardar, onEliminar,
}: {
  frase: IdiomaFrase;
  onGuardar: (id: string, campos: Partial<IdiomaFrase>) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <div
      className="p-3 rounded-lg group"
      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <InlineEdit
            value={frase.frase_original}
            placeholder="Frase en el idioma…"
            className="font-semibold"
            onSave={(v) => onGuardar(frase.id, { frase_original: v })}
          />
          <InlineEdit
            value={frase.transliteracion ?? ""}
            placeholder="Transliteración…"
            className="italic"
            onSave={(v) => onGuardar(frase.id, { transliteracion: v })}
          />
          <InlineEdit
            value={frase.traduccion ?? ""}
            placeholder="Traducción…"
            onSave={(v) => onGuardar(frase.id, { traduccion: v })}
          />
        </div>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
          style={{ color: "#ef4444" }}
          onClick={() => onEliminar(frase.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="mt-2">
        <Badge label={frase.categoria} />
      </div>
    </div>
  );
}

function ReglaRow({
  regla, onGuardar, onEliminar,
}: {
  regla: IdiomaRegla;
  onGuardar: (id: string, campos: Partial<IdiomaRegla>) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <div
      className="p-3 rounded-lg group space-y-1.5"
      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <InlineEdit
          value={regla.titulo}
          placeholder="Título de la regla…"
          className="font-semibold"
          onSave={(v) => onGuardar(regla.id, { titulo: v })}
        />
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded flex-shrink-0"
          style={{ color: "#ef4444" }}
          onClick={() => onEliminar(regla.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <InlineEdit
        value={regla.descripcion ?? ""}
        placeholder="Descripción de la regla…"
        multiline
        onSave={(v) => onGuardar(regla.id, { descripcion: v })}
      />
      {regla.ejemplo && (
        <p className="text-micro italic px-2 py-1 rounded" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
          Ej: {regla.ejemplo}
        </p>
      )}
      <Badge label={regla.categoria} />
    </div>
  );
}

type DetalleTab = "info" | "frases" | "reglas" | "fonologia";

function IdiomaDetalle({ idiomaId, onBack }: { idiomaId: string; onBack?: () => void }) {
  const {
    idioma, frases, reglas, loading, saving,
    guardar, crearFrase, guardarFrase, eliminarFrase,
    crearRegla, guardarRegla, eliminarRegla,
  } = useIdiomaDetalle(idiomaId);
  const { culturas } = useCulturas();

  const [tab, setTab] = useState<DetalleTab>("info");
  const [nuevaFrase, setNuevaFrase] = useState("");
  const [nuevaRegla, setNuevaRegla] = useState("");

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );
  if (!idioma) return null;

  const tabs: { key: DetalleTab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Info", icon: FileText },
    { key: "fonologia", label: "Fonología", icon: Mic },
    { key: "frases", label: `Frases (${frases.length})`, icon: AlignLeft },
    { key: "reglas", label: `Reglas (${reglas.length})`, icon: List },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        {onBack && (
          <button type="button" className="flex items-center gap-1.5 text-micro font-black uppercase tracking-widest mb-3 transition-opacity hover:opacity-70"
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
            onClick={onBack}>
            <ArrowLeft size={11} /> Volver
          </button>
        )}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${TIPO_COLORS[idioma.tipo]}22` }}>
            <Languages size={18} style={{ color: TIPO_COLORS[idioma.tipo] }} />
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
              placeholder="Nombre nativo (cómo lo llaman sus hablantes)"
              className="italic text-sm"
              onSave={(v) => guardar({ nombre_nativo: v })}
            />
          </div>
          {saving && <Loader2 size={14} className="animate-spin flex-shrink-0 mt-1" style={{ color: "var(--primary)" }} />}
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          <Badge label={TIPO_LABELS[idioma.tipo]} color={TIPO_COLORS[idioma.tipo]} />
          {idioma.familia_linguistica && <Badge label={idioma.familia_linguistica} />}
          {idioma.es_extinto && <Badge label="extinto" color="#6b7280" />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 flex-shrink-0" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-micro font-black uppercase tracking-widest transition-all"
            style={{
              color: tab === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              borderBottom: tab === key ? "2px solid var(--primary)" : "2px solid transparent",
            }}
            onClick={() => setTab(key)}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Info ── */}
        {tab === "info" && (
          <>
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <InlineEdit
                value={idioma.descripcion ?? ""}
                placeholder="Descripción del idioma…"
                multiline
                onSave={(v) => guardar({ descripcion: v })}
              />
            </div>
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
                  placeholder="Proto-Garliano, Norte…"
                  onSave={(v) => guardar({ familia_linguistica: v })}
                />
              </div>
              <div>
                <FieldLabel>Hablantes aprox.</FieldLabel>
                <InlineEdit
                  value={idioma.num_hablantes_aprox ?? ""}
                  placeholder="Millones, miles, extinto…"
                  onSave={(v) => guardar({ num_hablantes_aprox: v })}
                />
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
            </div>

            <div>
              <FieldLabel>Sistema de escritura</FieldLabel>
              <InlineEdit
                value={idioma.sistema_escritura ?? ""}
                placeholder="Runas Solares, Silabario Kor…"
                onSave={(v) => guardar({ sistema_escritura: v })}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--primary)" }}>
                <input
                  type="checkbox"
                  className="accent-current"
                  checked={idioma.tiene_escritura_propia}
                  onChange={(e) => guardar({ tiene_escritura_propia: e.target.checked })}
                />
                Tiene escritura propia
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--primary)" }}>
                <input
                  type="checkbox"
                  className="accent-current"
                  checked={idioma.es_extinto}
                  onChange={(e) => guardar({ es_extinto: e.target.checked })}
                />
                Extinto
              </label>
            </div>

            {/* Rasgos gramaticales como tags */}
            <div>
              <FieldLabel>Rasgos gramaticales</FieldLabel>
              <RasgosEditor
                rasgos={idioma.rasgos_gramaticales ?? []}
                onChange={(r) => guardar({ rasgos_gramaticales: r })}
              />
            </div>
          </>
        )}

        {/* ── Fonología ── */}
        {tab === "fonologia" && (
          <div>
            <FieldLabel>Notas de fonología</FieldLabel>
            <InlineEdit
              value={idioma.notas_fonologia ?? ""}
              placeholder="Describe los sonidos, consonantes especiales, tonos, énfasis…"
              multiline
              onSave={(v) => guardar({ notas_fonologia: v })}
            />
          </div>
        )}

        {/* ── Frases ── */}
        {tab === "frases" && (
          <>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent text-sm outline-none border-b"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
                placeholder="Nueva frase en el idioma…"
                value={nuevaFrase}
                onChange={(e) => setNuevaFrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nuevaFrase.trim()) {
                    crearFrase(nuevaFrase.trim());
                    setNuevaFrase("");
                  }
                }}
              />
              <button
                type="button"
                className="p-1.5 rounded transition-all"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                onClick={() => { if (nuevaFrase.trim()) { crearFrase(nuevaFrase.trim()); setNuevaFrase(""); } }}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {frases.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  Agrega frases del corpus del idioma
                </p>
              )}
              {frases.map((f) => (
                <FrasaRow key={f.id} frase={f} onGuardar={guardarFrase} onEliminar={eliminarFrase} />
              ))}
            </div>
          </>
        )}

        {/* ── Reglas ── */}
        {tab === "reglas" && (
          <>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent text-sm outline-none border-b"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
                placeholder="Título de la nueva regla…"
                value={nuevaRegla}
                onChange={(e) => setNuevaRegla(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nuevaRegla.trim()) {
                    crearRegla(nuevaRegla.trim());
                    setNuevaRegla("");
                  }
                }}
              />
              <button
                type="button"
                className="p-1.5 rounded transition-all"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                onClick={() => { if (nuevaRegla.trim()) { crearRegla(nuevaRegla.trim()); setNuevaRegla(""); } }}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {reglas.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  Agrega reglas gramaticales
                </p>
              )}
              {reglas.map((r) => (
                <ReglaRow key={r.id} regla={r} onGuardar={guardarRegla} onEliminar={eliminarRegla} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Editor de rasgos como tags ────────────────────────────────────────────

function RasgosEditor({
  rasgos, onChange,
}: { rasgos: string[]; onChange: (r: string[]) => void }) {
  const [input, setInput] = useState("");

  const agregar = () => {
    const v = input.trim();
    if (v && !rasgos.includes(v)) { onChange([...rasgos, v]); }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {rasgos.map((r) => (
          <span key={r} className="flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
            {r}
            <button type="button" onClick={() => onChange(rasgos.filter((x) => x !== r))}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-transparent text-sm outline-none border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
          placeholder="ej: aglutinante, VSO, tonal…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
        />
        <button type="button"
          className="p-1.5 rounded transition-all"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
          onClick={agregar}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export default function IdiomasSection() {
  const { idiomas, loading, crear, eliminar } = useIdiomas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);

  const filtrados = idiomas.filter((i) =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.nombre_nativo ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.familia_linguistica ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleCrear = async () => {
    if (!nuevoNombre.trim()) return;
    const nuevo = await crear(nuevoNombre.trim());
    if (nuevo) { setSelectedId(nuevo.id); }
    setNuevoNombre("");
    setCreando(false);
  };

  const handleEliminar = async (id: string) => {
    await eliminar(id);
    if (selectedId === id) setSelectedId(null);
    setConfirmarEliminar(null);
  };

  // Mobile: mostrar lista o detalle
  const [mobileVista, setMobileVista] = useState<"lista" | "detalle">("lista");

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileVista("detalle");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Panel izquierdo: lista ── */}
      <div
        className={`flex flex-col flex-shrink-0 overflow-hidden ${selectedId ? "hidden md:flex" : "flex"} md:flex`}
        style={{
          width: "260px",
          borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        {/* Header lista */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages size={15} style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                Idiomas
              </span>
              <span className="text-micro font-black px-1.5 py-0.5 rounded"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
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
          <div className="flex items-center gap-2 px-2 py-1.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            <Search size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar idiomas…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
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
            <button type="button" onClick={handleCrear}
              className="p-1 rounded" style={{ color: "#4ade80" }}><Check size={13} /></button>
            <button type="button" onClick={() => { setCreando(false); setNuevoNombre(""); }}
              className="p-1 rounded" style={{ color: "#ef4444" }}><X size={13} /></button>
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
            <p className="text-sm text-center py-8" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              {busqueda ? "Sin resultados" : "Ningún idioma aún"}
            </p>
          )}
          {filtrados.map((idioma) => (
            <div key={idioma.id} className="relative group">
              <IdiomaListItem
                idioma={idioma}
                selected={selectedId === idioma.id}
                onClick={() => handleSelect(idioma.id)}
              />
              {confirmarEliminar === idioma.id ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => handleEliminar(idioma.id)}
                    className="px-2 py-0.5 rounded text-micro font-black"
                    style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444444" }}>
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmarEliminar(null)}
                    className="p-1 rounded" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
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

      {/* ── Panel derecho: detalle ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedId ? (
          <IdiomaDetalle
            key={selectedId}
            idiomaId={selectedId}
            onBack={() => { setSelectedId(null); setMobileVista("lista"); }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            <Languages size={36} strokeWidth={1.5} />
            <p className="text-sm">Seleccioná un idioma para editarlo</p>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
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
