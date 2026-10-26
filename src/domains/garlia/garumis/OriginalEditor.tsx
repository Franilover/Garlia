"use client";

/**
 * OriginalEditor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel flotante editor para un Original (Orumi, Varum, Nyru…).
 * Mismo shell (ShellPortalFlotante), tokens y layout que GarumiEditor.
 *
 * Columnas reales en garumi_originales:
 *   id, nombre, descripcion, rasgo_linaje, estado_documentacion
 */

import { Check, Dna, Save, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/infra/supabase/supabase";
import { ShellPortalFlotante } from "./GarumiEditor";

// ── Tokens ────────────────────────────────────────────────────────────────────

const BORDER     = "color-mix(in srgb, var(--primary) 8%, transparent)";
const BORDER_MED = "color-mix(in srgb, var(--primary) 12%, transparent)";

// ── Tipo público ──────────────────────────────────────────────────────────────

export interface OriginalItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  rasgo_linaje: string | null;
  estado_documentacion: string;
}

// ── SectionLabel (mismo patrón que GarumiEditor) ─────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
        {children}
      </span>
    </div>
  );
}

// ── Editor interno ────────────────────────────────────────────────────────────

function OriginalEditor({
  item,
  onGuardado,
  onEliminado,
  onCerrar,
}: {
  item: OriginalItem;
  onGuardado: (o: OriginalItem) => void;
  onEliminado: (id: string) => void;
  onCerrar: () => void;
}) {
  const [form, setForm]   = useState<OriginalItem>(item);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setForm(item);
    setStatus("idle");
    setConfirmando(false);
  }, [item.id]);

  async function guardar() {
    setStatus("saving");
    const { error } = await supabase
      .from("garumi_originales")
      .update({
        nombre:               form.nombre,
        descripcion:          form.descripcion          || null,
        rasgo_linaje:         form.rasgo_linaje         || null,
        estado_documentacion: form.estado_documentacion,
      })
      .eq("id", form.id);
    if (error) { setStatus("error"); return; }
    setStatus("saved");
    onGuardado(form);
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function eliminar() {
    await supabase.from("garumi_originales").delete().eq("id", form.id);
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
          <Dna size={15} strokeWidth={1.5} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
        </div>

        {/* Nombre editable */}
        <input
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre del Original"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
        />

        {/* Estado doc badge */}
        <span
          className="shrink-0 font-black uppercase tracking-widest px-2 py-0.5"
          style={{
            fontSize: 9,
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 7%, transparent)",
            border: `1px solid ${BORDER_MED}`,
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          Original
        </span>

        {/* Acciones */}
        <div className="shrink-0 flex items-center gap-1.5 ml-1">
          {status === "saving" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">Guardando…</span>
          )}
          {status === "saved" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-green-500/70">Guardado</span>
          )}
          {status === "error" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-red-400/70">Error</span>
          )}

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
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-all"
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

          <button
            type="button"
            onClick={() => void guardar()}
            disabled={status === "saving"}
            className="flex items-center gap-1 px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
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

              {/* Rasgo de linaje */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/25">
                  Rasgo de linaje
                </label>
                <input
                  placeholder="ej. bioluminiscencia…"
                  value={form.rasgo_linaje ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, rasgo_linaje: e.target.value }))}
                  className="bg-transparent text-[11px] text-primary/70 outline-none border-b pb-0.5 placeholder:text-primary/20"
                  style={{ borderColor: BORDER }}
                />
              </div>

              {/* Estado documentación */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/25">
                  Estado
                </label>
                <select
                  value={form.estado_documentacion}
                  onChange={(e) => setForm((f) => ({ ...f, estado_documentacion: e.target.value }))}
                  className="bg-transparent text-[11px] text-primary/70 outline-none border-b pb-0.5"
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
                placeholder="Origen, naturaleza, rol en el linaje Garumi…"
                value={form.descripcion ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                className="w-full h-full min-h-[120px] bg-transparent text-[11px] text-primary/70 outline-none resize-none placeholder:text-primary/20 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="px-3 py-3">
          <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)", fontStyle: "italic", lineHeight: 1.5 }}>
            El Original transmite su rasgo de linaje a todos sus descendientes, pero no determina su forma. Los Garumis asociados a este Original aparecen en la sección principal.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Portal exportable ─────────────────────────────────────────────────────────

export function OriginalEditorPortal({
  item,
  onGuardado,
  onEliminado,
  onCerrar,
}: {
  item: OriginalItem;
  onGuardado: (o: OriginalItem) => void;
  onEliminado: (id: string) => void;
  onCerrar: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <ShellPortalFlotante onCerrar={onCerrar}>
      <OriginalEditor
        item={item}
        onGuardado={onGuardado}
        onEliminado={onEliminado}
        onCerrar={onCerrar}
      />
    </ShellPortalFlotante>,
    document.body,
  );
}
