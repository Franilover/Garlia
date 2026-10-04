"use client";

/**
 * GamePage — /myself/game
 * ──────────────────────────────────────────────────────────────────────────
 * Editor de contenido de Godot: una sola página con tres secciones
 * (Personajes, Diálogos, Criaturas·IA) seleccionables por tab.
 *
 * Regla: SUPABASE MANDA. Todo se guarda directo a Supabase; Godot lee.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";

// ── Tipos ─────────────────────────────────────────────────────────────────

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
  updated_at: string;
}

interface Criatura {
  id: string;
  nombre: string;
  imagen_url: string | null;
  ia_config: Record<string, unknown>;
  dialogo: Record<string, unknown>;
}

type Section = "personajes" | "dialogos" | "criaturas";

// ── Helpers ───────────────────────────────────────────────────────────────

function badge(text: string, active: boolean) {
  return (
    <span
      className="text-micro font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: active
          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
          : "color-mix(in srgb, var(--primary) 6%, transparent)",
        color: active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 40%, transparent)",
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

  // Sync when value changes from outside (new selection)
  const prevId = useRef<string | null>(null);
  const valueStr = JSON.stringify(value);
  useEffect(() => {
    if (prevId.current !== valueStr) {
      setRaw(JSON.stringify(value, null, 2));
      setError(null);
      prevId.current = valueStr;
    }
  }, [valueStr, value]);

  const handleChange = (text: string) => {
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch {
      setError("JSON inválido");
    }
  };

  return (
    <div className="flex flex-col gap-1 h-full">
      <textarea
        className="flex-1 font-mono text-xs p-3 rounded-xl resize-none outline-none transition-colors"
        style={{
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          border: `1px solid ${error ? "var(--destructive, #ef4444)" : "color-mix(in srgb, var(--primary) 12%, transparent)"}`,
          color: "var(--primary)",
          minHeight: "200px",
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

// ── Sección: Personajes ───────────────────────────────────────────────────

function PersonajesSection() {
  const [personajes, setPersonajes] = useState<PersonajeGame[]>([]);
  const [criaturas, setCriaturas] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PersonajeGame | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // form state
  const [nombre, setNombre] = useState("");
  const [criaturaId, setCriaturaId] = useState("");
  const [activo, setActivo] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("personajes_game")
      .select("*")
      .order("nombre");
    const { data: c } = await supabase
      .from("criaturas")
      .select("id, nombre")
      .order("nombre");
    setPersonajes(data ?? []);
    setCriaturas(c ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (p: PersonajeGame) => {
    setSelected(p);
    setNombre(p.nombre);
    setCriaturaId(p.criatura_id);
    setActivo(p.activo);
    setIsNew(false);
    setSaved(false);
  };

  const startNew = () => {
    setSelected(null);
    setNombre("");
    setCriaturaId(criaturas[0]?.id ?? "");
    setActivo(true);
    setIsNew(true);
    setSaved(false);
  };

  const save = async () => {
    if (!nombre.trim() || !criaturaId) return;
    setSaving(true);
    if (isNew) {
      await supabase.from("personajes_game").insert({
        nombre: nombre.trim(),
        criatura_id: criaturaId,
        activo,
      });
    } else if (selected) {
      await supabase
        .from("personajes_game")
        .update({ nombre: nombre.trim(), criatura_id: criaturaId, activo })
        .eq("id", selected.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar personaje?")) return;
    await supabase.from("personajes_game").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setIsNew(false); }
    await load();
  };

  const filtered = personajes.filter((p) =>
    p.nombre.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Lista */}
      <div
        className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
        style={{
          width: "240px",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, var(--bg-main))",
        }}
      >
        {/* Buscador */}
        <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Botón nuevo */}
        <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <button
            type="button"
            onClick={startNew}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: isNew
                ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                : "color-mix(in srgb, var(--primary) 6%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Plus size={12} /> Nuevo personaje
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              Sin resultados
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors group"
                style={{
                  background:
                    selected?.id === p.id
                      ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                      : "transparent",
                  color:
                    selected?.id === p.id
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 70%, transparent)",
                  borderLeft: selected?.id === p.id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                }}
              >
                <span className="flex-1 text-sm font-medium truncate">{p.nombre}</span>
                {badge(p.activo ? "on" : "off", p.activo)}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(p.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                >
                  <Trash2 size={11} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      {(selected || isNew) && (
        <div
          className="flex-1 rounded-2xl p-5 flex flex-col gap-4"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {isNew ? "Nuevo personaje" : selected?.nombre}
            </h2>
            <button
              type="button"
              onClick={save}
              disabled={saving || !nombre.trim() || !criaturaId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: saved
                  ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                  : "var(--primary)",
                color: saved ? "var(--primary)" : "var(--btn-text, #fff)",
                opacity: !nombre.trim() || !criaturaId ? 0.4 : 1,
              }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
              {saved ? "Guardado" : "Guardar"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                Nombre
              </span>
              <input
                className="px-3 py-2 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del personaje en el juego"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                Especie (criatura canónica)
              </span>
              <select
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
                value={criaturaId}
                onChange={(e) => setCriaturaId(e.target.value)}
              >
                <option value="">— seleccionar —</option>
                {criaturas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>
                Activo (visible para Godot)
              </span>
            </label>
          </div>
        </div>
      )}

      {!selected && !isNew && (
        <div
          className="flex-1 rounded-2xl flex items-center justify-center"
          style={{ border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)" }}
        >
          <p className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            Seleccioná un personaje o creá uno nuevo
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sección: Diálogos ─────────────────────────────────────────────────────

function DialogosSection() {
  const [dialogos, setDialogos] = useState<DialogoGame[]>([]);
  const [personajes, setPersonajes] = useState<PersonajeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DialogoGame | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // form
  const [clave, setClave] = useState("");
  const [personajeId, setPersonajeId] = useState("");
  const [activo, setActivo] = useState(true);
  const [dialogo, setDialogo] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: d } = await supabase.from("dialogos_game").select("*").order("clave");
    const { data: p } = await supabase.from("personajes_game").select("id, nombre").order("nombre");
    setDialogos(d ?? []);
    setPersonajes(p ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (d: DialogoGame) => {
    setSelected(d);
    setClave(d.clave);
    setPersonajeId(d.personaje_id);
    setActivo(d.activo);
    setDialogo(d.dialogo);
    setSaved(false);
  };

  const save = async () => {
    if (!clave.trim() || !personajeId) return;
    setSaving(true);
    await supabase
      .from("dialogos_game")
      .update({ clave: clave.trim(), personaje_id: personajeId, activo, dialogo })
      .eq("id", selected!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  };

  const nombrePersonaje = (id: string) =>
    personajes.find((p) => p.id === id)?.nombre ?? id.slice(0, 8);

  const filtered = dialogos.filter(
    (d) =>
      d.clave.toLowerCase().includes(query.toLowerCase()) ||
      nombrePersonaje(d.personaje_id).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Lista */}
      <div
        className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
        style={{
          width: "260px",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, var(--bg-main))",
        }}
      >
        <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar clave o personaje…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </div>
          ) : filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => select(d)}
              className="w-full flex flex-col px-3 py-2.5 text-left transition-colors"
              style={{
                background:
                  selected?.id === d.id
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                borderLeft: selected?.id === d.id
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
              }}
            >
              <span className="text-sm font-semibold truncate" style={{ color: selected?.id === d.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 80%, transparent)" }}>
                {d.clave}
              </span>
              <span className="text-xs truncate" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                {nombrePersonaje(d.personaje_id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div
          className="flex-1 rounded-2xl p-5 flex flex-col gap-4 min-h-0"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
          }}
        >
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold" style={{ color: "var(--primary)" }}>{selected.clave}</h2>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: saved ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--primary)",
                color: saved ? "var(--primary)" : "var(--btn-text, #fff)",
              }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
              {saved ? "Guardado" : "Guardar"}
            </button>
          </div>

          <div className="flex gap-3 shrink-0">
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>Clave</span>
              <input
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>Personaje</span>
              <select
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
                value={personajeId}
                onChange={(e) => setPersonajeId(e.target.value)}
              >
                {personajes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex-1 flex flex-col gap-1 min-h-0">
            <span className="text-xs font-semibold uppercase tracking-wider shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
              dialogo (JSON — lo consume Godot)
            </span>
            <div className="flex-1 min-h-0">
              <JsonEditor value={dialogo} onChange={setDialogo} />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 rounded-2xl flex items-center justify-center"
          style={{ border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)" }}
        >
          <p className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            Seleccioná un diálogo para editarlo
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sección: Criaturas · IA ───────────────────────────────────────────────

function CriaturasIASection() {
  const [criaturas, setCriaturas] = useState<Criatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Criatura | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iaConfig, setIaConfig] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<"ia" | "dialogo">("ia");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criaturas")
      .select("id, nombre, imagen_url, ia_config, dialogo")
      .order("nombre");
    setCriaturas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (c: Criatura) => {
    setSelected(c);
    setIaConfig(activeTab === "ia" ? c.ia_config : c.dialogo);
    setSaved(false);
  };

  useEffect(() => {
    if (selected) {
      setIaConfig(activeTab === "ia" ? selected.ia_config : selected.dialogo);
      setSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const field = activeTab === "ia" ? "ia_config" : "dialogo";
    await supabase
      .from("criaturas")
      .update({ [field]: iaConfig })
      .eq("id", selected.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Actualizar local
    setCriaturas((prev) =>
      prev.map((c) =>
        c.id === selected.id ? { ...c, [field]: iaConfig } : c
      )
    );
    setSelected((prev) => prev ? { ...prev, [field]: iaConfig } : prev);
  };

  const hasIaConfig = (c: Criatura) => Object.keys(c.ia_config ?? {}).length > 0;

  const filtered = criaturas.filter((c) =>
    c.nombre.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Lista */}
      <div
        className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
        style={{
          width: "240px",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, var(--bg-main))",
        }}
      >
        <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--primary)" }}
              placeholder="Buscar criatura…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </div>
          ) : filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
              style={{
                background:
                  selected?.id === c.id
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                borderLeft: selected?.id === c.id
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
              }}
            >
              <span className="flex-1 text-sm font-medium truncate" style={{ color: selected?.id === c.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 70%, transparent)" }}>
                {c.nombre}
              </span>
              {hasIaConfig(c) && (
                <Bot size={10} style={{ color: "var(--primary)", flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div
          className="flex-1 rounded-2xl p-5 flex flex-col gap-4 min-h-0"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {selected.nombre}
            </h2>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: saved ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--primary)",
                color: saved ? "var(--primary)" : "var(--btn-text, #fff)",
              }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
              {saved ? "Guardado" : "Guardar"}
            </button>
          </div>

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
                  background: activeTab === tab
                    ? "var(--primary)"
                    : "transparent",
                  color: activeTab === tab
                    ? "var(--btn-text, #fff)"
                    : "color-mix(in srgb, var(--primary) 50%, transparent)",
                }}
              >
                {tab === "ia" ? "ia_config" : "dialogo"}
              </button>
            ))}
          </div>

          {/* JSON editor */}
          <div className="flex-1 flex flex-col gap-1 min-h-0">
            <span className="text-xs font-semibold uppercase tracking-wider shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
              {activeTab === "ia"
                ? "Configuración de IA — Godot la consume en runtime"
                : "Árbol de diálogo — Godot lo consume al hablar"}
            </span>
            <div className="flex-1 min-h-0">
              <JsonEditor value={iaConfig} onChange={setIaConfig} />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-2"
          style={{ border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)" }}
        >
          <Bot size={24} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
          <p className="text-sm" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            Seleccioná una criatura para editar su IA
          </p>
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
            Las que tienen <Bot size={10} style={{ display: "inline" }} /> ya tienen ia_config
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "personajes", label: "Personajes", icon: Users },
  { key: "dialogos", label: "Diálogos", icon: MessageCircle },
  { key: "criaturas", label: "Criaturas · IA", icon: Bot },
];

export default function GamePage() {
  const [section, setSection] = useState<Section>("personajes");

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ paddingLeft: "52px" }} // offset sidebar desktop
    >
      {/* Header con tabs */}
      <div
        className="shrink-0 flex items-center gap-1 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
        }}
      >
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background:
                section === key
                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                  : "transparent",
              color:
                section === key
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
          >
            <Icon size={13} strokeWidth={section === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {section === "personajes" && <PersonajesSection />}
        {section === "dialogos" && <DialogosSection />}
        {section === "criaturas" && <CriaturasIASection />}
      </div>
    </div>
  );
}
