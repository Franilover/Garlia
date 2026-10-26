"use client";

/**
 * GarumiElementoEditor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel flotante con:
 *  - Lista lateral de todos los garumi_elementos
 *  - Editor derecho del elemento seleccionado
 * Mismo shell visual (ShellPortalFlotante) que GarumiEditor.
 */

import { Check, Loader2, Save, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/infra/supabase/supabase";
import { ShellPortalFlotante } from "./GarumiEditor";

// ── Tokens ────────────────────────────────────────────────────────────────────

const BORDER = "color-mix(in srgb, var(--primary) 8%, transparent)";
const BORDER_MED = "color-mix(in srgb, var(--primary) 12%, transparent)";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GarumiElemento {
  id: string;
  codigo: string;
  nombre: string;
  principio: string | null;
  descripcion: string | null;
  fenomenos: string | null;
  capacidades: string | null;
  limites: string | null;
  relaciones: string | null;
  estado_documentacion: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGarumiElementos() {
  const [data, setData] = useState<GarumiElemento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    void supabase
      .from("garumi_elementos")
      .select("id, codigo, nombre, principio, descripcion, fenomenos, capacidades, limites, relaciones, estado_documentacion")
      .order("nombre")
      .then(({ data: rows }) => {
        if (off) return;
        setData((rows ?? []) as GarumiElemento[]);
        setLoading(false);
      });
    return () => { off = true; };
  }, []);

  return { elementos: data, loading, setElementos: setData };
}

// ── Campo de texto reutilizable ───────────────────────────────────────────────

function Campo({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const base = {
    borderColor: BORDER,
    color: "color-mix(in srgb, var(--primary) 70%, transparent)",
    fontSize: 11,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col gap-1">
      <label
        className="font-black uppercase tracking-[0.18em]"
        style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="bg-transparent outline-none border-b resize-none placeholder:text-primary/20 leading-relaxed"
          style={base}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="bg-transparent outline-none border-b pb-0.5 placeholder:text-primary/20"
          style={base}
        />
      )}
    </div>
  );
}

// ── Panel de edición de un elemento ──────────────────────────────────────────

function EditorElemento({
  elemento,
  onGuardado,
  onEliminado,
}: {
  elemento: GarumiElemento;
  onGuardado: (e: GarumiElemento) => void;
  onEliminado: (id: string) => void;
}) {
  const [form, setForm] = useState<GarumiElemento>(elemento);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setForm(elemento);
    setStatus("idle");
    setConfirmando(false);
  }, [elemento.id]);

  const set = (k: keyof GarumiElemento) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v || null }));

  async function guardar() {
    setStatus("saving");
    const { error } = await supabase
      .from("garumi_elementos")
      .update({
        nombre: form.nombre,
        principio: form.principio || null,
        descripcion: form.descripcion || null,
        fenomenos: form.fenomenos || null,
        capacidades: form.capacidades || null,
        limites: form.limites || null,
        relaciones: form.relaciones || null,
        estado_documentacion: form.estado_documentacion,
      })
      .eq("id", form.id);
    if (error) { setStatus("error"); return; }
    setStatus("saved");
    onGuardado(form);
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function eliminar() {
    await supabase.from("garumi_elementos").delete().eq("id", form.id);
    onEliminado(form.id);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ borderLeft: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-2"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        {/* Código */}
        <span
          className="shrink-0 font-black uppercase tracking-widest px-2 py-0.5"
          style={{
            fontSize: 10,
            borderRadius: "var(--radius-btn)",
            border: `1px solid ${BORDER_MED}`,
            color: "color-mix(in srgb, var(--primary) 50%, transparent)",
          }}
        >
          {form.codigo}
        </span>

        {/* Nombre editable */}
        <input
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre del elemento"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
        />

        {/* Estado doc */}
        <select
          value={form.estado_documentacion}
          onChange={(e) => setForm((f) => ({ ...f, estado_documentacion: e.target.value }))}
          className="bg-transparent outline-none"
          style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", letterSpacing: "0.06em" }}
        >
          <option value="borrador">borrador</option>
          <option value="aprobado">aprobado</option>
          <option value="canon">canon</option>
        </select>

        {/* Status */}
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
        {confirmando ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase text-red-400 tracking-wide">¿Eliminar?</span>
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
              onClick={() => setConfirmando(false)}
              className="flex items-center justify-center w-6 h-6 text-primary/40 hover:text-primary transition-all"
              style={{ borderRadius: "var(--radius-btn)", border: `1px solid ${BORDER_MED}` }}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="flex items-center justify-center w-6 h-6 text-red-400/40 hover:text-red-400 transition-colors"
            style={{ borderRadius: "var(--radius-btn)" }}
          >
            <Trash2 size={11} />
          </button>
        )}

        {/* Guardar */}
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={status === "saving"}
          className="flex items-center gap-1 px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          style={{
            borderRadius: "var(--radius-btn)",
            background: "var(--primary)",
            color: "var(--btn-text, #fff)",
          }}
        >
          <Save size={10} /> Guardar
        </button>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
        <Campo label="Principio" value={form.principio ?? ""} onChange={set("principio")} />
        <Campo label="Descripción" value={form.descripcion ?? ""} onChange={set("descripcion")} multiline />
        <Campo label="Fenómenos" value={form.fenomenos ?? ""} onChange={set("fenomenos")} multiline />
        <Campo label="Capacidades" value={form.capacidades ?? ""} onChange={set("capacidades")} multiline />
        <Campo label="Límites" value={form.limites ?? ""} onChange={set("limites")} multiline />
        <Campo label="Relaciones" value={form.relaciones ?? ""} onChange={set("relaciones")} multiline />
      </div>
    </div>
  );
}

// ── Panel completo de elementos ───────────────────────────────────────────────

function PanelElementos({ onCerrar }: { onCerrar: () => void }) {
  const { elementos, loading, setElementos } = useGarumiElementos();
  const [seleccionado, setSeleccionado] = useState<GarumiElemento | null>(null);

  // Seleccionar el primero automáticamente
  useEffect(() => {
    if (!seleccionado && elementos.length > 0) {
      setSeleccionado(elementos[0]);
    }
  }, [elementos, seleccionado]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        borderRadius: "var(--radius-card)",
        border: `1px solid ${BORDER_MED}`,
        background: "var(--bg-main)",
      }}
    >
      {/* Header principal */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-2"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <span className="flex-1 text-sm font-black text-primary uppercase tracking-widest" style={{ fontSize: 11 }}>
          Elementos Garumi
        </span>
        <span style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
          {elementos.length} elementos
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="flex items-center justify-center w-7 h-7 text-primary/30 hover:text-primary transition-colors"
          style={{ borderRadius: "var(--radius-btn)" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Cuerpo: lista + editor */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Lista lateral */}
        <div
          className="shrink-0 flex flex-col overflow-y-auto"
          style={{ width: 180, borderRight: `1px solid ${BORDER}`, scrollbarWidth: "none" }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </div>
          ) : (
            elementos.map((el) => {
              const activo = seleccionado?.id === el.id;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setSeleccionado(el)}
                  className="flex flex-col gap-0.5 text-left px-3 py-2.5 transition-colors w-full"
                  style={{
                    background: activo
                      ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                      : "transparent",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <span
                    className="font-black uppercase tracking-widest"
                    style={{
                      fontSize: 10,
                      color: activo ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                    }}
                  >
                    {el.nombre}
                  </span>
                  <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 25%, transparent)", letterSpacing: "0.06em" }}>
                    {el.codigo}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Editor derecho */}
        <div className="flex-1 min-w-0">
          {seleccionado ? (
            <EditorElemento
              key={seleccionado.id}
              elemento={seleccionado}
              onGuardado={(updated) => {
                setElementos((prev) => prev.map((e) => e.id === updated.id ? updated : e));
                setSeleccionado(updated);
              }}
              onEliminado={(id) => {
                setElementos((prev) => prev.filter((e) => e.id !== id));
                setSeleccionado(null);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>
                Selecciona un elemento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Portal exportable ─────────────────────────────────────────────────────────

export function GarumiElementosPortal({ onCerrar }: { onCerrar: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <ShellPortalFlotante onCerrar={onCerrar}>
      <PanelElementos onCerrar={onCerrar} />
    </ShellPortalFlotante>,
    document.body,
  );
}
