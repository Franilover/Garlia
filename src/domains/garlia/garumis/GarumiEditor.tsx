"use client";

/**
 * GarumiEditor
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel flotante editor para un Garumi individual.
 * Mismo layout, tokens y ShellPortalFlotante que EditorCriatura / EditorItem.
 *
 * Layout:
 *   ┌─────────────────── Header bar (nombre, guardar, eliminar) ───────────────┐
 *   ├─────────────┬────────────────────────────────────────────────────────────┤
 *   │  Identidad  │  Descripción                                               │
 *   │  (linaje,   │  (textarea libre)                                          │
 *   │   etapa,    │                                                            │
 *   │   nombre    │                                                            │
 *   │   científ.) │                                                            │
 *   ├─────────────┴────────────────────────────────────────────────────────────┤
 *   │  Rasgos (chips editables)                                                │
 *   ├──────────────────────────────────────────────────────────────────────────┤
 *   │  Evoluciones (origen → tipo → destino)                                   │
 *   └──────────────────────────────────────────────────────────────────────────┘
 */

import {
  GitMerge,
  Leaf,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Check,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/infra/supabase/supabase";

// ── Tokens ────────────────────────────────────────────────────────────────────

const BORDER = "color-mix(in srgb, var(--primary) 8%, transparent)";
const BORDER_MED = "color-mix(in srgb, var(--primary) 12%, transparent)";

// ── Tipos locales ─────────────────────────────────────────────────────────────

export interface GarumiEditorItem {
  id: string;
  nombre: string;
  nombre_cientifico: string | null;
  original_id: string | null;
  etapa_evolutiva: string | null;
  descripcion: string | null;
  estado: string;
}

interface Original {
  id: string;
  nombre: string;
}

interface Rasgo {
  id: string;
  nombre: string;
  tipo: string | null;
  descripcion: string | null;
}

interface Evolucion {
  id: string;
  garumi_origen_id: string | null;
  garumi_destino_id: string | null;
  original_id: string | null;
  tipo_evolucion: string | null;
  descripcion: string | null;
  origen_nombre?: string | null;
  destino_nombre?: string | null;
  original_nombre?: string | null;
}

// ── ShellPortalFlotante ───────────────────────────────────────────────────────
// Idéntico al de EditorCriatura: backdrop blur + centrado.

export function ShellPortalFlotante({
  children,
  onCerrar,
}: {
  children: React.ReactNode;
  onCerrar: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onMouseDown={onCerrar}
    >
      <div
        className="w-full h-full max-w-4xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Hook de rasgos ────────────────────────────────────────────────────────────

function useGarumiRasgosEditor(garumiId: string) {
  const [rasgos, setRasgos] = useState<Rasgo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    void supabase
      .from("garumi_rasgos")
      .select("id, nombre, tipo, descripcion")
      .eq("garumi_id", garumiId)
      .then(({ data }) => {
        if (cancelado) return;
        setRasgos((data ?? []) as Rasgo[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [garumiId]);

  async function agregarRasgo(nombre: string, tipo: string) {
    const { data } = await supabase
      .from("garumi_rasgos")
      .insert({ garumi_id: garumiId, nombre, tipo: tipo || null })
      .select("id, nombre, tipo, descripcion")
      .single();
    if (data) setRasgos((prev) => [...prev, data as Rasgo]);
  }

  async function eliminarRasgo(id: string) {
    await supabase.from("garumi_rasgos").delete().eq("id", id);
    setRasgos((prev) => prev.filter((r) => r.id !== id));
  }

  return { rasgos, loading, agregarRasgo, eliminarRasgo };
}

// ── Hook de evoluciones ───────────────────────────────────────────────────────

function useGarumiEvoluciones(garumiId: string) {
  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    void supabase
      .from("garumi_evoluciones")
      .select(`
        id, garumi_origen_id, garumi_destino_id, original_id, tipo_evolucion, descripcion,
        origen:garumis!garumi_evoluciones_garumi_origen_id_fkey(nombre),
        destino:garumis!garumi_evoluciones_garumi_destino_id_fkey(nombre),
        original:garumi_originales!garumi_evoluciones_original_id_fkey(nombre)
      `)
      .or(`garumi_origen_id.eq.${garumiId},garumi_destino_id.eq.${garumiId}`)
      .then(({ data }) => {
        if (cancelado) return;
        const mapped: Evolucion[] = (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          garumi_origen_id: r.garumi_origen_id as string | null,
          garumi_destino_id: r.garumi_destino_id as string | null,
          original_id: r.original_id as string | null,
          tipo_evolucion: r.tipo_evolucion as string | null,
          descripcion: r.descripcion as string | null,
          origen_nombre: (r.origen as { nombre: string } | null)?.nombre ?? null,
          destino_nombre: (r.destino as { nombre: string } | null)?.nombre ?? null,
          original_nombre: (r.original as { nombre: string } | null)?.nombre ?? null,
        }));
        setEvoluciones(mapped);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [garumiId]);

  return { evoluciones, loading };
}

// ── Subcomponentes internos ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 pt-2.5 pb-1.5"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
        {children}
      </span>
    </div>
  );
}

function RasgoChip({
  nombre,
  tipo,
  onEliminar,
}: {
  nombre: string;
  tipo?: string | null;
  onEliminar?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5"
      style={{
        borderRadius: "var(--radius-btn)",
        background: "color-mix(in srgb, var(--primary) 7%, transparent)",
        border: `1px solid ${BORDER_MED}`,
        fontSize: 10,
      }}
    >
      {tipo && (
        <span style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          {tipo} ·{" "}
        </span>
      )}
      <span style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>
        {nombre}
      </span>
      {onEliminar && (
        <button
          type="button"
          onClick={onEliminar}
          className="ml-0.5 text-primary/25 hover:text-red-400 transition-colors"
        >
          <X size={8} />
        </button>
      )}
    </span>
  );
}

function PanelRasgos({ garumiId }: { garumiId: string }) {
  const { rasgos, loading, agregarRasgo, eliminarRasgo } = useGarumiRasgosEditor(garumiId);
  const [agregando, setAgregando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("");

  async function confirmar() {
    if (!nuevoNombre.trim()) return;
    await agregarRasgo(nuevoNombre.trim(), nuevoTipo.trim());
    setNuevoNombre("");
    setNuevoTipo("");
    setAgregando(false);
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {loading ? (
        <p className="text-micro text-primary/25 italic">Cargando…</p>
      ) : rasgos.length === 0 && !agregando ? (
        <p className="text-micro text-primary/25 italic">Sin rasgos registrados.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rasgos.map((r) => (
            <RasgoChip
              key={r.id}
              nombre={r.nombre}
              tipo={r.tipo}
              onEliminar={() => void eliminarRasgo(r.id)}
            />
          ))}
        </div>
      )}

      {agregando ? (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            autoFocus
            placeholder="tipo…"
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
            className="w-20 shrink-0 bg-transparent text-micro text-primary/60 outline-none border-b border-primary/15 pb-0.5 placeholder:text-primary/20"
          />
          <input
            placeholder="nombre del rasgo…"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void confirmar(); if (e.key === "Escape") setAgregando(false); }}
            className="flex-1 bg-transparent text-micro text-primary/60 outline-none border-b border-primary/15 pb-0.5 placeholder:text-primary/20"
          />
          <button type="button" onClick={() => void confirmar()} className="shrink-0 text-primary/40 hover:text-primary transition-colors">
            <Check size={11} />
          </button>
          <button type="button" onClick={() => setAgregando(false)} className="shrink-0 text-primary/25 hover:text-primary/50 transition-colors">
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          className="flex items-center gap-1 self-start text-[9px] font-black uppercase tracking-widest text-primary/35 hover:text-primary transition-colors mt-1"
        >
          <Plus size={9} /> Agregar rasgo
        </button>
      )}
    </div>
  );
}

function PanelEvoluciones({ garumiId }: { garumiId: string }) {
  const { evoluciones, loading } = useGarumiEvoluciones(garumiId);

  if (loading) return (
    <div className="p-3">
      <p className="text-micro text-primary/25 italic">Cargando…</p>
    </div>
  );

  if (evoluciones.length === 0) return (
    <div className="p-3">
      <p className="text-micro text-primary/25 italic">Sin evoluciones registradas.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-1 p-3">
      {evoluciones.map((e) => {
        const esOrigen = e.garumi_origen_id === garumiId;
        return (
          <div
            key={e.id}
            className="flex items-center gap-2 px-2 py-1.5"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
              border: `1px solid ${BORDER}`,
            }}
          >
            {/* Origen */}
            <span
              className="text-micro font-semibold truncate min-w-0"
              style={{
                flex: "1 1 0",
                color: esOrigen
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 50%, transparent)",
                fontWeight: esOrigen ? 800 : 500,
              }}
            >
              {e.original_nombre && !e.garumi_origen_id ? (
                <span className="flex items-center gap-1">
                  <Sparkles size={9} className="shrink-0" style={{ color: "var(--primary)" }} />
                  {e.original_nombre}
                </span>
              ) : (
                e.origen_nombre ?? "—"
              )}
            </span>

            {/* Flecha + tipo */}
            <div className="shrink-0 flex items-center gap-1">
              <GitMerge size={11} strokeWidth={1.5} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
              {e.tipo_evolucion && (
                <span className="uppercase font-semibold" style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 30%, transparent)", letterSpacing: "0.08em" }}>
                  {e.tipo_evolucion}
                </span>
              )}
            </div>

            {/* Destino */}
            <span
              className="text-micro font-semibold truncate min-w-0 text-right"
              style={{
                flex: "1 1 0",
                color: !esOrigen
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 50%, transparent)",
                fontWeight: !esOrigen ? 800 : 500,
              }}
            >
              {e.destino_nombre ?? "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── GarumiEditor ──────────────────────────────────────────────────────────────

export function GarumiEditor({
  item,
  originales,
  onGuardado,
  onEliminado,
  onCerrar,
}: {
  item: GarumiEditorItem;
  originales: Original[];
  onGuardado: (g: GarumiEditorItem) => void;
  onEliminado: (id: string) => void;
  onCerrar: () => void;
}) {
  const [form, setForm] = useState<GarumiEditorItem>(item);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // Sync si cambia el item externamente
  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  const nombreOriginal = originales.find((o) => o.id === form.original_id)?.nombre ?? null;

  async function guardar() {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("garumis")
        .update({
          nombre: form.nombre,
          nombre_cientifico: form.nombre_cientifico || null,
          original_id: form.original_id || null,
          etapa_evolutiva: form.etapa_evolutiva || null,
          descripcion: form.descripcion || null,
        })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onGuardado(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  async function eliminar() {
    await supabase.from("garumis").delete().eq("id", form.id);
    onEliminado(form.id);
    onCerrar();
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        borderRadius: "var(--radius-card)",
        border: `1px solid ${BORDER_MED}`,
        background: "var(--bg-main)",
      }}
    >
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        {/* Icono */}
        <div
          className="shrink-0 w-8 h-8 flex items-center justify-center"
          style={{
            borderRadius: "var(--radius-btn)",
            border: `1px solid ${BORDER_MED}`,
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          }}
        >
          <Leaf size={15} strokeWidth={1.5} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
        </div>

        {/* Nombre editable */}
        <input
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre del Garumi"
          value={form.nombre ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
        />

        {/* Linaje badge */}
        {nombreOriginal && (
          <span
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 font-black uppercase tracking-widest"
            style={{
              fontSize: 9,
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 7%, transparent)",
              border: `1px solid ${BORDER_MED}`,
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
            }}
          >
            <Sparkles size={8} strokeWidth={2.5} />
            {nombreOriginal}
          </span>
        )}

        {/* Acciones */}
        <div className="shrink-0 flex items-center gap-1.5 ml-1">
          {/* Indicador de estado */}
          {status === "saving" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">Guardando…</span>
          )}
          {status === "saved" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-green-500/70">Guardado</span>
          )}
          {status === "error" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400/70">Error</span>
          )}

          {/* Eliminar */}
          {confirmandoEliminar ? (
            <div className="flex items-center gap-1.5">
              <span className="text-micro font-black uppercase text-red-400 tracking-wide">¿Eliminar?</span>
              <button
                type="button"
                onClick={() => void eliminar()}
                className="flex items-center justify-center w-6 h-6 bg-red-500 text-white hover:bg-red-600 transition-all"
                style={{ borderRadius: "var(--radius-btn)" }}
              >
                <Check size={11} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoEliminar(false)}
                className="flex items-center justify-center w-6 h-6 text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
                style={{ borderRadius: "var(--radius-btn)", border: `1px solid ${BORDER_MED}` }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoEliminar(true)}
              className="flex items-center gap-1 px-2 py-1 text-micro font-black uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                border: "1px solid color-mix(in srgb, rgb(239 68 68) 15%, transparent)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, rgb(239 68 68) 5%, transparent)";
                (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, rgb(239 68 68) 40%, transparent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, rgb(239 68 68) 15%, transparent)";
              }}
            >
              <Trash2 size={10} />
            </button>
          )}

          {/* Guardar */}
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={status === "saving"}
            className="flex items-center gap-1 px-3 py-1 text-micro font-black uppercase tracking-widest transition-all disabled:opacity-50"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "var(--primary)",
              color: "var(--btn-text, #fff)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
          >
            <Save size={10} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Cuerpo scrollable ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

        {/* Fila 1: Identidad | Descripción */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "200px 1fr",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {/* Col A: Identidad */}
          <div className="flex flex-col" style={{ borderRight: `1px solid ${BORDER}` }}>
            <SectionLabel>Identidad</SectionLabel>
            <div className="flex flex-col gap-3 p-3">

              {/* Nombre científico */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/25">
                  Nombre científico
                </label>
                <input
                  placeholder="ej. Garumia vespera…"
                  value={form.nombre_cientifico ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nombre_cientifico: e.target.value }))}
                  className="bg-transparent text-micro text-primary/70 outline-none border-b pb-0.5 placeholder:text-primary/20"
                  style={{ borderColor: BORDER }}
                />
              </div>

              {/* Etapa evolutiva */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/25">
                  Etapa evolutiva
                </label>
                <input
                  placeholder="larva, juvenil, adulto…"
                  value={form.etapa_evolutiva ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, etapa_evolutiva: e.target.value }))}
                  className="bg-transparent text-micro text-primary/70 outline-none border-b pb-0.5 placeholder:text-primary/20"
                  style={{ borderColor: BORDER }}
                />
              </div>

              {/* Linaje / Original */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/25">
                  Linaje (Original)
                </label>
                <select
                  value={form.original_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, original_id: e.target.value || null }))}
                  className="bg-transparent text-micro text-primary/70 outline-none border-b pb-0.5"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">Sin asignar</option>
                  {originales.map((o) => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/25">
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="bg-transparent text-micro text-primary/70 outline-none border-b pb-0.5"
                  style={{ borderColor: BORDER }}
                >
                  <option value="borrador">Borrador</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="canonico">Canónico</option>
                </select>
              </div>
            </div>
          </div>

          {/* Col B: Descripción */}
          <div className="flex flex-col">
            <SectionLabel>Descripción</SectionLabel>
            <div className="p-3 flex-1">
              <textarea
                placeholder="Aspecto físico, comportamiento, hábitat…"
                value={form.descripcion ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                className="w-full h-full min-h-[120px] bg-transparent text-micro text-primary/70 outline-none resize-none placeholder:text-primary/20 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Fila 2: Rasgos */}
        <div style={{ borderBottom: `1px solid ${BORDER}` }}>
          <SectionLabel>Rasgos</SectionLabel>
          <PanelRasgos garumiId={item.id} />
        </div>

        {/* Fila 3: Evoluciones */}
        <div>
          <SectionLabel>Evoluciones</SectionLabel>
          <PanelEvoluciones garumiId={item.id} />
        </div>

      </div>
    </div>
  );
}

// ── GarumiEditorPortal ────────────────────────────────────────────────────────
// Wrapper que monta el editor dentro de un ShellPortalFlotante via portal.

export function GarumiEditorPortal({
  item,
  originales,
  onGuardado,
  onEliminado,
  onCerrar,
}: {
  item: GarumiEditorItem;
  originales: Original[];
  onGuardado: (g: GarumiEditorItem) => void;
  onEliminado: (id: string) => void;
  onCerrar: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <ShellPortalFlotante onCerrar={onCerrar}>
      <GarumiEditor
        item={item}
        originales={originales}
        onGuardado={onGuardado}
        onEliminado={onEliminado}
        onCerrar={onCerrar}
      />
    </ShellPortalFlotante>,
    document.body,
  );
}
