"use client";

/**
 * GamePage — /myself/game
 * ──────────────────────────────────────────────────────────────────────────
 * Editor de contenido Godot. Dos tabs principales:
 *   MUNDO     → Biomas · Ecosistemas · Hábitats · Reinos
 *   ENTIDADES → Personajes · Criaturas (IA)
 *
 * Misma lógica de navegación que Myself Garlia: al entrar a Game
 * se muestra su propio layout con sub-secciones, ocultando las del resto.
 *
 * Regla: SUPABASE MANDA. Todo guarda directo; Godot lee.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Globe2,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Mountain,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  TreePine,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

interface Bioma {
  id: string;
  nombre: string;
  descripcion: string;
  afinidad: string;
  orden: number;
}

interface Ecosistema {
  id: string;
  nombre: string;
  clima: string;
  descripcion: string;
  tipo_entorno: string;
  bioma_id: string | null;
}

interface Habitat {
  id: string;
  nombre: string;
  descripcion: string | null;
  ecosistema_id: string;
  tipo_habitat_id: string;
  activo: boolean;
}

interface TipoHabitat {
  id: string;
  clave: string;
  nombre: string;
}

interface Reino {
  id: string;
  nombre: string;
  descripcion: string | null;
  publicado: boolean;
}

interface ReinoGame {
  id: string;
  reino_id: string;
  clave: string;
  nombre: string | null;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  propiedades: Record<string, unknown>;
}

interface PersonajeGame {
  id: string;
  nombre: string;
  criatura_id: string;
  activo: boolean;
  updated_at: string;
}

interface DialogoGame {
  id: string;
  personaje_id: string;
  clave: string;
  dialogo: Record<string, unknown>;
  activo: boolean;
}

interface Criatura {
  id: string;
  nombre: string;
  imagen_url: string | null;
  ia_config: Record<string, unknown>;
  dialogo: Record<string, unknown>;
}

type MainTab = "mundo" | "entidades";

type MundoSection = "biomas" | "ecosistemas" | "habitats" | "reinos";
type EntidadesSection = "personajes" | "criaturas";

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ text, active }: { text: string; active: boolean }) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: active
          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
          : "color-mix(in srgb, var(--primary) 6%, transparent)",
        color: active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 35%, transparent)",
      }}
    >
      {text}
    </span>
  );
}

function JsonEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);
  const prevStr = useRef(JSON.stringify(value));

  useEffect(() => {
    const s = JSON.stringify(value);
    if (s !== prevStr.current) {
      setRaw(JSON.stringify(value, null, 2));
      setError(null);
      prevStr.current = s;
    }
  }, [value]);

  const handleChange = (text: string) => {
    setRaw(text);
    try {
      onChange(JSON.parse(text));
      setError(null);
    } catch {
      setError("JSON inválido");
    }
  };

  return (
    <div className="flex flex-col gap-1 h-full">
      <textarea
        className="flex-1 font-mono text-xs p-3 rounded-xl resize-none outline-none"
        style={{
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          border: `1px solid ${
            error
              ? "var(--destructive, #ef4444)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)"
          }`,
          color: "var(--primary)",
          minHeight: "180px",
        }}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--destructive, #ef4444)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function SaveBtn({
  saving,
  saved,
  disabled,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: saved
          ? "color-mix(in srgb, var(--primary) 15%, transparent)"
          : "var(--primary)",
        color: saved ? "var(--primary)" : "var(--btn-text, #fff)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {saving ? (
        <Loader2 size={12} className="animate-spin" />
      ) : saved ? (
        <Check size={12} />
      ) : (
        <Save size={12} />
      )}
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}

// Lista lateral genérica
function SideList<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  onNew,
  newLabel,
  isNew,
  loading,
  renderItem,
  width = 240,
  searchPlaceholder = "Buscar…",
  filterFn,
}: {
  items: T[];
  selectedId: string | undefined;
  onSelect: (item: T) => void;
  onNew?: () => void;
  newLabel?: string;
  isNew?: boolean;
  loading: boolean;
  renderItem: (item: T, active: boolean) => React.ReactNode;
  width?: number;
  searchPlaceholder?: string;
  filterFn?: (item: T, q: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = query && filterFn ? items.filter((i) => filterFn(i, query)) : items;

  return (
    <div
      className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
      style={{
        width: `${width}px`,
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 3%, var(--bg-main))",
      }}
    >
      <div
        className="p-2 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
          style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--primary)" }}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {onNew && (
        <div
          className="p-2 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
        >
          <button
            type="button"
            onClick={onNew}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: isNew
                ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                : "color-mix(in srgb, var(--primary) 6%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Plus size={12} /> {newLabel ?? "Nuevo"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <p
            className="text-center py-8 text-xs"
            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            Sin resultados
          </p>
        ) : (
          filtered.map((item) => renderItem(item, item.id === selectedId))
        )}
      </div>
    </div>
  );
}

function SideItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors group"
      style={{
        background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
        color: active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 70%, transparent)",
        borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function EditorPanel({
  title,
  saveBtn,
  children,
  empty,
}: {
  title?: string;
  saveBtn?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div
        className="flex-1 rounded-2xl flex items-center justify-center"
        style={{ border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
          Seleccioná un ítem
        </p>
      </div>
    );
  }
  return (
    <div
      className="flex-1 rounded-2xl p-5 flex flex-col gap-4 min-h-0"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
      }}
    >
      {(title || saveBtn) && (
        <div className="flex items-center justify-between shrink-0">
          {title && (
            <h2 className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {title}
            </h2>
          )}
          {saveBtn}
        </div>
      )}
      {children}
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-semibold tracking-wide"
      style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
    >
      {label}
    </span>
  );
}

const inputStyle = {
  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
  color: "var(--primary)",
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="px-3 py-2 rounded-xl text-sm outline-none w-full"
      style={inputStyle}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="px-3 py-2 rounded-xl text-sm outline-none w-full resize-none"
      style={inputStyle}
      rows={props.rows ?? 3}
    />
  );
}

function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
) {
  return (
    <select
      {...props}
      className="px-3 py-2 rounded-xl text-sm outline-none w-full"
      style={inputStyle}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Biomas
// ─────────────────────────────────────────────────────────────────────────────

function BiomasSection() {
  const [items, setItems] = useState<Bioma[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Bioma | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [afinidad, setAfinidad] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("biomas").select("id,nombre,descripcion,afinidad,orden").order("orden");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (b: Bioma) => {
    setSelected(b); setIsNew(false); setSaved(false);
    setNombre(b.nombre); setDescripcion(b.descripcion); setAfinidad(b.afinidad);
  };
  const startNew = () => {
    setSelected(null); setIsNew(true); setSaved(false);
    setNombre(""); setDescripcion(""); setAfinidad("");
  };
  const save = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    if (isNew) {
      await supabase.from("biomas").insert({ nombre, descripcion, afinidad });
    } else if (selected) {
      await supabase.from("biomas").update({ nombre, descripcion, afinidad }).eq("id", selected.id);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar bioma?")) return;
    await supabase.from("biomas").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setIsNew(false); }
    await load();
  };

  return (
    <div className="flex gap-4 h-full min-h-0">
      <SideList
        items={items}
        selectedId={selected?.id}
        onSelect={pick}
        onNew={startNew}
        newLabel="Nuevo bioma"
        isNew={isNew}
        loading={loading}
        filterFn={(b, q) => b.nombre.toLowerCase().includes(q.toLowerCase())}
        renderItem={(b, active) => (
          <SideItem key={b.id} active={active} onClick={() => pick(b)}>
            <span className="flex-1 text-sm font-medium truncate">{b.nombre}</span>
            <Badge text={b.afinidad || "?"} active={active} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(b.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <Trash2 size={11} />
            </button>
          </SideItem>
        )}
      />

      {(selected || isNew) ? (
        <EditorPanel
          title={isNew ? "Nuevo bioma" : selected!.nombre}
          saveBtn={<SaveBtn saving={saving} saved={saved} disabled={!nombre.trim()} onClick={save} />}
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1"><FieldLabel label="Nombre" /><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><FieldLabel label="Afinidad" /><Input value={afinidad} onChange={(e) => setAfinidad(e.target.value)} placeholder="ej. fuego, agua…" /></label>
            <label className="flex flex-col gap-1"><FieldLabel label="Descripción" /><Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} /></label>
          </div>
        </EditorPanel>
      ) : (
        <EditorPanel empty />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Ecosistemas
// ─────────────────────────────────────────────────────────────────────────────

function EcosistemasSection() {
  const [items, setItems] = useState<Ecosistema[]>([]);
  const [biomas, setBiomas] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ecosistema | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [nombre, setNombre] = useState("");
  const [clima, setClima] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipoEntorno, setTipoEntorno] = useState("");
  const [biomaId, setBiomaId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ecosistemas").select("id,nombre,clima,descripcion,tipo_entorno,bioma_id").order("nombre");
    const { data: b } = await supabase.from("biomas").select("id,nombre").order("nombre");
    setItems(data ?? []);
    setBiomas(b ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (e: Ecosistema) => {
    setSelected(e); setIsNew(false); setSaved(false);
    setNombre(e.nombre); setClima(e.clima); setDescripcion(e.descripcion);
    setTipoEntorno(e.tipo_entorno); setBiomaId(e.bioma_id ?? "");
  };
  const startNew = () => {
    setSelected(null); setIsNew(true); setSaved(false);
    setNombre(""); setClima(""); setDescripcion(""); setTipoEntorno(""); setBiomaId("");
  };
  const save = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    const payload = { nombre, clima, descripcion, tipo_entorno: tipoEntorno, bioma_id: biomaId || null };
    if (isNew) await supabase.from("ecosistemas").insert(payload);
    else if (selected) await supabase.from("ecosistemas").update(payload).eq("id", selected.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar ecosistema?")) return;
    await supabase.from("ecosistemas").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setIsNew(false); }
    await load();
  };

  const biomaName = (id: string | null) => biomas.find((b) => b.id === id)?.nombre ?? "—";

  return (
    <div className="flex gap-4 h-full min-h-0">
      <SideList
        items={items}
        selectedId={selected?.id}
        onSelect={pick}
        onNew={startNew}
        newLabel="Nuevo ecosistema"
        isNew={isNew}
        loading={loading}
        width={260}
        filterFn={(e, q) => e.nombre.toLowerCase().includes(q.toLowerCase())}
        renderItem={(e, active) => (
          <SideItem key={e.id} active={active} onClick={() => pick(e)}>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{e.nombre}</span>
              <span className="text-xs truncate" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                {biomaName(e.bioma_id)}
              </span>
            </div>
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <Trash2 size={11} />
            </button>
          </SideItem>
        )}
      />

      {(selected || isNew) ? (
        <EditorPanel
          title={isNew ? "Nuevo ecosistema" : selected!.nombre}
          saveBtn={<SaveBtn saving={saving} saved={saved} disabled={!nombre.trim()} onClick={save} />}
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1"><FieldLabel label="Nombre" /><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FieldLabel label="Clima" /><Input value={clima} onChange={(e) => setClima(e.target.value)} /></label>
              <label className="flex flex-col gap-1 flex-1"><FieldLabel label="Tipo entorno" /><Input value={tipoEntorno} onChange={(e) => setTipoEntorno(e.target.value)} /></label>
            </div>
            <label className="flex flex-col gap-1">
              <FieldLabel label="Bioma" />
              <Select value={biomaId} onChange={(e) => setBiomaId(e.target.value)}>
                <option value="">— sin bioma —</option>
                {biomas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </Select>
            </label>
            <label className="flex flex-col gap-1"><FieldLabel label="Descripción" /><Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} /></label>
          </div>
        </EditorPanel>
      ) : <EditorPanel empty />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Hábitats
// ─────────────────────────────────────────────────────────────────────────────

function HabitatsSection() {
  const [items, setItems] = useState<Habitat[]>([]);
  const [ecosistemas, setEcosistemas] = useState<{ id: string; nombre: string }[]>([]);
  const [tipos, setTipos] = useState<TipoHabitat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Habitat | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ecosistemaId, setEcosistemaId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [activo, setActivo] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("habitats").select("id,nombre,descripcion,ecosistema_id,tipo_habitat_id,activo").order("nombre");
    const { data: e } = await supabase.from("ecosistemas").select("id,nombre").order("nombre");
    const { data: t } = await supabase.from("tipos_habitat").select("id,clave,nombre").order("nombre");
    setItems(data ?? []);
    setEcosistemas(e ?? []);
    setTipos(t ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (h: Habitat) => {
    setSelected(h); setIsNew(false); setSaved(false);
    setNombre(h.nombre); setDescripcion(h.descripcion ?? "");
    setEcosistemaId(h.ecosistema_id); setTipoId(h.tipo_habitat_id); setActivo(h.activo);
  };
  const startNew = () => {
    setSelected(null); setIsNew(true); setSaved(false);
    setNombre(""); setDescripcion(""); setEcosistemaId(""); setTipoId(""); setActivo(true);
  };
  const save = async () => {
    if (!nombre.trim() || !ecosistemaId || !tipoId) return;
    setSaving(true);
    const payload = { nombre, descripcion, ecosistema_id: ecosistemaId, tipo_habitat_id: tipoId, activo };
    if (isNew) await supabase.from("habitats").insert(payload);
    else if (selected) await supabase.from("habitats").update(payload).eq("id", selected.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar hábitat?")) return;
    await supabase.from("habitats").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setIsNew(false); }
    await load();
  };

  const ecoName = (id: string) => ecosistemas.find((e) => e.id === id)?.nombre ?? "—";

  return (
    <div className="flex gap-4 h-full min-h-0">
      <SideList
        items={items}
        selectedId={selected?.id}
        onSelect={pick}
        onNew={startNew}
        newLabel="Nuevo hábitat"
        isNew={isNew}
        loading={loading}
        width={260}
        filterFn={(h, q) => h.nombre.toLowerCase().includes(q.toLowerCase())}
        renderItem={(h, active) => (
          <SideItem key={h.id} active={active} onClick={() => pick(h)}>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{h.nombre}</span>
              <span className="text-xs truncate" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                {ecoName(h.ecosistema_id)}
              </span>
            </div>
            <Badge text={h.activo ? "on" : "off"} active={h.activo} />
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); remove(h.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <Trash2 size={11} />
            </button>
          </SideItem>
        )}
      />

      {(selected || isNew) ? (
        <EditorPanel
          title={isNew ? "Nuevo hábitat" : selected!.nombre}
          saveBtn={<SaveBtn saving={saving} saved={saved} disabled={!nombre.trim() || !ecosistemaId || !tipoId} onClick={save} />}
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1"><FieldLabel label="Nombre" /><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1">
                <FieldLabel label="Ecosistema" />
                <Select value={ecosistemaId} onChange={(e) => setEcosistemaId(e.target.value)}>
                  <option value="">— seleccionar —</option>
                  {ecosistemas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </Select>
              </label>
              <label className="flex flex-col gap-1 flex-1">
                <FieldLabel label="Tipo hábitat" />
                <Select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
                  <option value="">— seleccionar —</option>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </label>
            </div>
            <label className="flex flex-col gap-1"><FieldLabel label="Descripción" /><Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} /></label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span>
            </label>
          </div>
        </EditorPanel>
      ) : <EditorPanel empty />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO — Reinos  (canónico + game layer)
// ─────────────────────────────────────────────────────────────────────────────

function ReinosSection() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [reinosGame, setReinosGame] = useState<ReinoGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanon, setSelectedCanon] = useState<Reino | null>(null);
  const [gameRow, setGameRow] = useState<ReinoGame | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // game fields
  const [clave, setClave] = useState("");
  const [nombreGame, setNombreGame] = useState("");
  const [descripcionGame, setDescripcionGame] = useState("");
  const [activo, setActivo] = useState(true);
  const [orden, setOrden] = useState(0);
  const [propiedades, setPropiedades] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: r } = await supabase.from("reinos").select("id,nombre,descripcion,publicado").order("nombre");
    const { data: rg } = await supabase.from("reinos_game").select("*").order("orden");
    setReinos(r ?? []);
    setReinosGame(rg ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (r: Reino) => {
    setSelectedCanon(r); setSaved(false);
    const rg = reinosGame.find((g) => g.reino_id === r.id) ?? null;
    setGameRow(rg);
    setClave(rg?.clave ?? "");
    setNombreGame(rg?.nombre ?? "");
    setDescripcionGame(rg?.descripcion ?? "");
    setActivo(rg?.activo ?? true);
    setOrden(rg?.orden ?? 0);
    setPropiedades(rg?.propiedades ?? {});
  };

  const save = async () => {
    if (!selectedCanon || !clave.trim()) return;
    setSaving(true);
    const payload = {
      reino_id: selectedCanon.id,
      clave: clave.trim(),
      nombre: nombreGame || null,
      descripcion: descripcionGame || null,
      activo,
      orden,
      propiedades,
    };
    if (gameRow) {
      await supabase.from("reinos_game").update(payload).eq("id", gameRow.id);
    } else {
      const { data } = await supabase.from("reinos_game").insert(payload).select().single();
      setGameRow(data);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };

  return (
    <div className="flex gap-4 h-full min-h-0">
      <SideList
        items={reinos}
        selectedId={selectedCanon?.id}
        onSelect={pick}
        loading={loading}
        width={240}
        filterFn={(r, q) => r.nombre.toLowerCase().includes(q.toLowerCase())}
        renderItem={(r, active) => (
          <SideItem key={r.id} active={active} onClick={() => pick(r)}>
            <span className="flex-1 text-sm font-medium truncate">{r.nombre}</span>
            {reinosGame.some((g) => g.reino_id === r.id) && (
              <Badge text="game" active={active} />
            )}
          </SideItem>
        )}
      />

      {selectedCanon ? (
        <EditorPanel
          title={selectedCanon.nombre}
          saveBtn={<SaveBtn saving={saving} saved={saved} disabled={!clave.trim()} onClick={save} />}
        >
          <p className="text-xs shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            {selectedCanon.descripcion ?? "Sin descripción canónica"}
          </p>
          <div
            className="shrink-0 text-xs font-semibold uppercase tracking-wide pt-2 pb-1"
            style={{
              color: "var(--primary)",
              borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            Capa Game (reinos_game)
          </div>
          {!gameRow && (
            <p className="text-xs shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              Este reino todavía no tiene entrada en <code>reinos_game</code>. Al guardar se creará.
            </p>
          )}
          <div className="flex flex-col gap-3 overflow-y-auto flex-1">
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1"><FieldLabel label="Clave (Godot)" /><Input value={clave} onChange={(e) => setClave(e.target.value)} placeholder="ej. reino_norte" /></label>
              <label className="flex flex-col gap-1 w-20"><FieldLabel label="Orden" /><Input type="number" value={orden} onChange={(e) => setOrden(Number(e.target.value))} /></label>
            </div>
            <label className="flex flex-col gap-1"><FieldLabel label="Nombre game (override)" /><Input value={nombreGame} onChange={(e) => setNombreGame(e.target.value)} placeholder="Dejar vacío para usar el canónico" /></label>
            <label className="flex flex-col gap-1"><FieldLabel label="Descripción game" /><Textarea value={descripcionGame} onChange={(e) => setDescripcionGame(e.target.value)} rows={3} /></label>
            <label className="flex flex-col gap-1 flex-1 min-h-0">
              <FieldLabel label="Propiedades (JSON)" />
              <div style={{ minHeight: "100px" }}>
                <JsonEditor value={propiedades} onChange={setPropiedades} />
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo en Godot</span>
            </label>
          </div>
        </EditorPanel>
      ) : <EditorPanel empty />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTIDADES — Personajes (incluye Diálogos inline)
// ─────────────────────────────────────────────────────────────────────────────

type PersonajeNombre = { id: string; nombre: string };

function PersonajesSection() {
  const [personajes, setPersonajes] = useState<PersonajeGame[]>([]);
  const [criaturas, setCriaturas] = useState<{ id: string; nombre: string }[]>([]);
  const [dialogos, setDialogos] = useState<{ id: string; clave: string; dialogo: Record<string, unknown>; activo: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PersonajeGame | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingDialogo, setSavingDialogo] = useState(false);
  const [savedDialogo, setSavedDialogo] = useState(false);
  const [selectedDialogo, setSelectedDialogo] = useState<string | null>(null);
  const [dialogoJson, setDialogoJson] = useState<Record<string, unknown>>({});

  // form
  const [nombre, setNombre] = useState("");
  const [criaturaId, setCriaturaId] = useState("");
  const [activo, setActivo] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from("personajes_game").select("*").order("nombre");
    const { data: c } = await supabase.from("criaturas").select("id,nombre").order("nombre");
    setPersonajes(p ?? []);
    setCriaturas(c ?? []);
    setLoading(false);
  }, []);

  const loadDialogos = useCallback(async (personajeId: string) => {
    const { data } = await supabase
      .from("dialogos_game")
      .select("id,clave,dialogo,activo")
      .eq("personaje_id", personajeId)
      .order("clave");
    setDialogos(data ?? []);
    setSelectedDialogo(null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (p: PersonajeGame) => {
    setSelected(p); setIsNew(false); setSaved(false);
    setNombre(p.nombre); setCriaturaId(p.criatura_id); setActivo(p.activo);
    loadDialogos(p.id);
  };
  const startNew = () => {
    setSelected(null); setIsNew(true); setSaved(false);
    setNombre(""); setCriaturaId(criaturas[0]?.id ?? ""); setActivo(true);
    setDialogos([]); setSelectedDialogo(null);
  };
  const save = async () => {
    if (!nombre.trim() || !criaturaId) return;
    setSaving(true);
    if (isNew) {
      await supabase.from("personajes_game").insert({ nombre, criatura_id: criaturaId, activo });
    } else if (selected) {
      await supabase.from("personajes_game").update({ nombre, criatura_id: criaturaId, activo }).eq("id", selected.id);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar personaje?")) return;
    await supabase.from("personajes_game").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setIsNew(false); setDialogos([]); }
    await load();
  };
  const pickDialogo = (id: string, json: Record<string, unknown>) => {
    setSelectedDialogo(id); setDialogoJson(json); setSavedDialogo(false);
  };
  const saveDialogo = async () => {
    if (!selectedDialogo) return;
    setSavingDialogo(true);
    await supabase.from("dialogos_game").update({ dialogo: dialogoJson }).eq("id", selectedDialogo);
    setSavingDialogo(false); setSavedDialogo(true);
    setTimeout(() => setSavedDialogo(false), 2000);
    if (selected) loadDialogos(selected.id);
  };

  const criaturaNombre = (id: string) => criaturas.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Lista personajes */}
      <SideList
        items={personajes}
        selectedId={selected?.id}
        onSelect={pick}
        onNew={startNew}
        newLabel="Nuevo personaje"
        isNew={isNew}
        loading={loading}
        filterFn={(p, q) => p.nombre.toLowerCase().includes(q.toLowerCase())}
        renderItem={(p, active) => (
          <SideItem key={p.id} active={active} onClick={() => pick(p)}>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{p.nombre}</span>
              <span className="text-xs truncate" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                {criaturaNombre(p.criatura_id)}
              </span>
            </div>
            <Badge text={p.activo ? "on" : "off"} active={p.activo} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(p.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <Trash2 size={11} />
            </button>
          </SideItem>
        )}
      />

      {/* Panel derecho */}
      {(selected || isNew) ? (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Editor personaje */}
          <EditorPanel
            title={isNew ? "Nuevo personaje" : selected!.nombre}
            saveBtn={<SaveBtn saving={saving} saved={saved} disabled={!nombre.trim() || !criaturaId} onClick={save} />}
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1"><FieldLabel label="Nombre" /><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
              <label className="flex flex-col gap-1">
                <FieldLabel label="Criatura canónica" />
                <Select value={criaturaId} onChange={(e) => setCriaturaId(e.target.value)}>
                  <option value="">— seleccionar —</option>
                  {criaturas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                <span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>Activo</span>
              </label>
            </div>

            {/* Diálogos del personaje */}
            {selected && !isNew && (
              <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
                <div
                  className="text-xs font-semibold uppercase tracking-wide pt-2"
                  style={{
                    color: "var(--primary)",
                    borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  }}
                >
                  Diálogos ({dialogos.length})
                </div>
                {dialogos.length === 0 ? (
                  <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Sin diálogos</p>
                ) : (
                  dialogos.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => pickDialogo(d.id, d.dialogo)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors"
                      style={{
                        background:
                          selectedDialogo === d.id
                            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                            : "color-mix(in srgb, var(--primary) 4%, transparent)",
                        border: `1px solid ${
                          selectedDialogo === d.id
                            ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                            : "color-mix(in srgb, var(--primary) 8%, transparent)"
                        }`,
                      }}
                    >
                      <MessageCircle size={11} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
                      <span className="text-xs font-medium truncate" style={{ color: "var(--primary)" }}>{d.clave}</span>
                      <Badge text={d.activo ? "on" : "off"} active={d.activo} />
                    </button>
                  ))
                )}
              </div>
            )}
          </EditorPanel>

          {/* JSON editor de diálogo */}
          {selectedDialogo && (
            <div
              className="flex flex-col gap-3 min-h-0"
              style={{ width: "320px" }}
            >
              <div
                className="rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-0"
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
                }}
              >
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                    dialogo (JSON)
                  </span>
                  <div className="flex items-center gap-2">
                    <SaveBtn saving={savingDialogo} saved={savedDialogo} onClick={saveDialogo} />
                    <button
                      type="button"
                      onClick={() => setSelectedDialogo(null)}
                      style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <JsonEditor value={dialogoJson} onChange={setDialogoJson} />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : <EditorPanel empty />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTIDADES — Criaturas (IA + diálogo)
// ─────────────────────────────────────────────────────────────────────────────

function CriaturasSection() {
  const [criaturas, setCriaturas] = useState<Criatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Criatura | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iaConfig, setIaConfig] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<"ia" | "dialogo">("ia");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("criaturas").select("id,nombre,imagen_url,ia_config,dialogo").order("nombre");
    setCriaturas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (c: Criatura) => {
    setSelected(c); setSaved(false);
    setIaConfig(activeTab === "ia" ? (c.ia_config ?? {}) : (c.dialogo ?? {}));
  };

  useEffect(() => {
    if (selected) {
      setIaConfig(activeTab === "ia" ? (selected.ia_config ?? {}) : (selected.dialogo ?? {}));
      setSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const field = activeTab === "ia" ? "ia_config" : "dialogo";
    await supabase.from("criaturas").update({ [field]: iaConfig }).eq("id", selected.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setCriaturas((prev) => prev.map((c) => c.id === selected.id ? { ...c, [field]: iaConfig } : c));
    setSelected((prev) => prev ? { ...prev, [field]: iaConfig } : prev);
  };

  const hasIA = (c: Criatura) => Object.keys(c.ia_config ?? {}).length > 0;

  return (
    <div className="flex gap-4 h-full min-h-0">
      <SideList
        items={criaturas}
        selectedId={selected?.id}
        onSelect={pick}
        loading={loading}
        width={240}
        searchPlaceholder="Buscar criatura…"
        filterFn={(c, q) => c.nombre.toLowerCase().includes(q.toLowerCase())}
        renderItem={(c, active) => (
          <SideItem key={c.id} active={active} onClick={() => pick(c)}>
            <span className="flex-1 text-sm font-medium truncate">{c.nombre}</span>
            {hasIA(c) && <Bot size={10} style={{ color: "var(--primary)", flexShrink: 0 }} />}
          </SideItem>
        )}
      />

      {selected ? (
        <EditorPanel
          title={selected.nombre}
          saveBtn={<SaveBtn saving={saving} saved={saved} onClick={save} />}
        >
          {/* Tabs ia / dialogo */}
          <div
            className="flex shrink-0 gap-1 p-1 rounded-xl self-start"
            style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
          >
            {(["ia", "dialogo"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab ? "var(--primary)" : "transparent",
                  color: activeTab === tab ? "var(--btn-text, #fff)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                }}
              >
                {tab === "ia" ? "ia_config" : "dialogo"}
              </button>
            ))}
          </div>

          <p className="text-xs shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            {activeTab === "ia"
              ? "Configuración de IA — Godot la consume en runtime"
              : "Árbol de diálogo — Godot lo consume al hablar"}
          </p>

          <div className="flex-1 min-h-0">
            <JsonEditor value={iaConfig} onChange={setIaConfig} />
          </div>
        </EditorPanel>
      ) : (
        <div
          className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2"
          style={{ border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)" }}
        >
          <Bot size={24} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
          <p className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            Seleccioná una criatura
          </p>
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
            Las que tienen <Bot size={10} style={{ display: "inline" }} /> ya tienen ia_config
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de tabs y sub-secciones
// ─────────────────────────────────────────────────────────────────────────────

const MUNDO_SECCIONES: { key: MundoSection; label: string; icon: React.ElementType }[] = [
  { key: "biomas", label: "Biomas", icon: Mountain },
  { key: "ecosistemas", label: "Ecosistemas", icon: TreePine },
  { key: "habitats", label: "Hábitats", icon: MapPin },
  { key: "reinos", label: "Reinos", icon: Shield },
];

const ENTIDADES_SECCIONES: { key: EntidadesSection; label: string; icon: React.ElementType }[] = [
  { key: "personajes", label: "Personajes", icon: Users },
  { key: "criaturas", label: "Criaturas · IA", icon: Bot },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const [mainTab, setMainTab] = useState<MainTab>("mundo");
  const [mundoSection, setMundoSection] = useState<MundoSection>("biomas");
  const [entidadesSection, setEntidadesSection] = useState<EntidadesSection>("personajes");

  const mainTabs: { key: MainTab; label: string; icon: React.ElementType }[] = [
    { key: "mundo", label: "Mundo", icon: Globe2 },
    { key: "entidades", label: "Entidades", icon: Layers },
  ];

  const subSecciones = mainTab === "mundo" ? MUNDO_SECCIONES : ENTIDADES_SECCIONES;
  const activeSub = mainTab === "mundo" ? mundoSection : entidadesSection;
  const setActiveSub = (k: string) =>
    mainTab === "mundo"
      ? setMundoSection(k as MundoSection)
      : setEntidadesSection(k as EntidadesSection);

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ paddingLeft: "52px" }}
    >
      {/* ── Barra superior: TABS PRINCIPALES ── */}
      <div
        className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-0 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        {mainTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all rounded-t-lg"
            style={{
              background:
                mainTab === key
                  ? "color-mix(in srgb, var(--primary) 8%, var(--bg-main))"
                  : "transparent",
              color:
                mainTab === key
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
              borderBottom: mainTab === key
                ? "2px solid var(--primary)"
                : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            <Icon size={13} strokeWidth={mainTab === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Barra secundaria: sub-secciones ── */}
      <div
        className="shrink-0 flex items-center gap-0.5 px-4 py-2 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
        }}
      >
        {subSecciones.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSub(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background:
                activeSub === key
                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                  : "transparent",
              color:
                activeSub === key
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 45%, transparent)",
            }}
          >
            <Icon size={12} strokeWidth={activeSub === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {mainTab === "mundo" && (
          <>
            {mundoSection === "biomas" && <BiomasSection />}
            {mundoSection === "ecosistemas" && <EcosistemasSection />}
            {mundoSection === "habitats" && <HabitatsSection />}
            {mundoSection === "reinos" && <ReinosSection />}
          </>
        )}
        {mainTab === "entidades" && (
          <>
            {entidadesSection === "personajes" && <PersonajesSection />}
            {entidadesSection === "criaturas" && <CriaturasSection />}
          </>
        )}
      </div>
    </div>
  );
}
