"use client";

/**
 * PersonajeLineaDeTiempo.tsx
 * ──────────────────────────
 * Hook `useErasDelPersonaje` + componentes `EraItem` y `PersonajeLineaDeTiempo`.
 * Gestiona la línea de tiempo de eras de un personaje: crear, expandir,
 * editar rasgos/notas/etiqueta, y eliminar eras. También incluye el
 * selector de fecha de nacimiento inline cuando aún no está asignado.
 *
 * Ruta destino:
 *   src/features/editorGarlia/components/PersonajeLineaDeTiempo.tsx
 */

import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";
import {
  FechaMundoBadge,
  SelectorFechaMundo,
  useCalendario,
} from "@/features/editorGarlia/views/EditorLineaTiempo";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Era = {
  id: string;
  momento: number;
  label: string;
  rasgos: string[];
  notas: string;
  _saving?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcularEdad(
  diaAbsolutoEra: number,
  diaAbsolutoNacimiento: number,
  diasPorAnio: number,
): number {
  if (diasPorAnio <= 0) return 0;
  return Math.floor((diaAbsolutoEra - diaAbsolutoNacimiento) / diasPorAnio);
}

// ─── EraItem ──────────────────────────────────────────────────────────────────
function EraItem({
  era,
  isOpen,
  isLast,
  edad,
  onToggle,
  onDelete,
  onAddRasgo,
  onRemoveRasgo,
  onNotasChange,
  onLabelChange,
}: {
  era: Era;
  isOpen: boolean;
  isLast: boolean;
  edad: number | null;
  diasPorAnio: number;
  onToggle: () => void;
  onDelete: () => void;
  onAddRasgo: (r: string) => void;
  onRemoveRasgo: (r: string) => void;
  onNotasChange: (v: string) => void;
  onLabelChange: (v: string) => void;
}) {
  const [nuevoRasgo, setNuevoRasgo] = useState("");

  return (
    <div className={!isLast ? "border-b border-primary/[0.06]" : ""}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-primary/[0.03] transition-colors"
        type="button"
        onClick={onToggle}
      >
        <div
          className="shrink-0 flex flex-col items-center"
          style={{ width: 20 }}
        >
          <div className="w-2 h-2 rounded-full border-2 border-accent bg-bg-main shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <FechaMundoBadge diaAbsoluto={era.momento} />
            {edad !== null && edad >= 0 && (
              <span
                className="px-1.5 py-0 rounded-full text-[7px] font-black uppercase border tracking-widest"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent) 8%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--accent) 20%, transparent)",
                  color: "var(--accent)",
                }}
              >
                {edad} {edad === 1 ? "año" : "años"}
              </span>
            )}
            {era.label && (
              <span className="text-[8px] font-bold text-primary/35 italic truncate">
                {era.label}
              </span>
            )}
          </div>
          {!isOpen && era.rasgos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {era.rasgos.slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="px-1.5 py-0 rounded-full text-[7px] font-black uppercase border"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 5%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--primary) 12%, transparent)",
                    color:
                      "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                >
                  {r}
                </span>
              ))}
              {era.rasgos.length > 3 && (
                <span className="text-[7px] text-primary/25 font-black">
                  +{era.rasgos.length - 3}
                </span>
              )}
              {era.notas && (
                <span className="text-[7px] text-primary/20 italic truncate max-w-[80px]">
                  {era.notas.slice(0, 30)}…
                </span>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {era._saving && (
            <Loader2 className="animate-spin text-primary/30" size={8} />
          )}
          <ChevronDown
            className="text-primary/25 transition-transform"
            size={9}
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 ml-5 space-y-2.5 border-l-2 border-accent/20 ml-8">
          <div className="pt-1">
            <input
              className="w-full rounded-lg border px-2 py-1.5 text-[9px] font-bold outline-none transition-all placeholder:font-normal"
              maxLength={60}
              placeholder="Nombre del período (ej: Infancia, Exilio…)"
              style={{
                background: era.label
                  ? "color-mix(in srgb, var(--primary) 4%, transparent)"
                  : "transparent",
                borderColor: era.label
                  ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
              type="text"
              value={era.label}
              onChange={(e) => onLabelChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            {era.rasgos.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {era.rasgos.map((rasgo) => (
                  <span
                    key={rasgo}
                    className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border transition-all"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 6%, transparent)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color:
                        "color-mix(in srgb, var(--primary) 60%, transparent)",
                    }}
                  >
                    {rasgo}
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--accent)", lineHeight: 1 }}
                      type="button"
                      onClick={() => onRemoveRasgo(rasgo)}
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <input
                className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase outline-none transition-all placeholder:normal-case placeholder:font-normal"
                maxLength={40}
                placeholder="Añadir rasgo…"
                style={{
                  background: nuevoRasgo
                    ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                    : "transparent",
                  borderColor: nuevoRasgo
                    ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                    : "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
                type="text"
                value={nuevoRasgo}
                onChange={(e) => setNuevoRasgo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddRasgo(nuevoRasgo);
                    setNuevoRasgo("");
                  }
                  if (e.key === "Escape") setNuevoRasgo("");
                }}
              />
              <button
                className="shrink-0 flex items-center justify-center rounded-lg border transition-all disabled:opacity-20"
                disabled={!nuevoRasgo.trim()}
                style={{
                  width: 22,
                  height: 22,
                  background: nuevoRasgo.trim()
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "transparent",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 15%, transparent)",
                  color: "var(--primary)",
                }}
                type="button"
                onClick={() => {
                  onAddRasgo(nuevoRasgo);
                  setNuevoRasgo("");
                }}
              >
                <Plus size={9} />
              </button>
            </div>
          </div>

          <textarea
            className="w-full rounded-lg border px-2 py-1.5 text-[9px] leading-relaxed outline-none transition-all resize-none"
            placeholder="Notas sobre este momento…"
            rows={3}
            style={{
              background: era.notas
                ? "color-mix(in srgb, var(--primary) 4%, transparent)"
                : "transparent",
              borderColor: era.notas
                ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                : "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
            }}
            value={era.notas}
            onChange={(e) => onNotasChange(e.target.value)}
          />

          <div className="flex justify-end">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all"
              style={{
                color: "var(--accent)",
                borderColor:
                  "color-mix(in srgb, var(--accent) 20%, transparent)",
                background: "transparent",
              }}
              type="button"
              onClick={onDelete}
            >
              <Trash2 size={8} /> Eliminar era
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PersonajeLineaDeTiempo ───────────────────────────────────────────────────
export function PersonajeLineaDeTiempo({
  personajeId,
  fechaNacimiento,
  onFechaNacimientoChange,
}: {
  personajeId: string;
  fechaNacimiento?: number | null;
  onFechaNacimientoChange?: (dia: number | null) => void;
}) {
  const { cal } = useCalendario();
  const diasPorAnio = React.useMemo(() => {
    if (!cal?.estaciones?.length) return 0;
    return cal.estaciones.reduce((sum, e) => sum + (e.duracion_dias ?? 0), 0);
  }, [cal]);

  const [eras, setEras] = useState<Era[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newMomento, setNewMomento] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const [cumpleSelectorOpen, setCumpleSelectorOpen] = useState(false);
  const [cumpleDraft, setCumpleDraft] = useState<number | null>(null);
  const [savingCumple, setSavingCumple] = useState(false);

  // ── Guardar fecha de nacimiento inline ────────────────────────────────────
  const handleGuardarCumple = async () => {
    if (cumpleDraft == null) return;
    setSavingCumple(true);
    try {
      await (supabase as any)
        .from("personajes")
        .update({ fecha_nacimiento: cumpleDraft })
        .eq("id", personajeId);
      try {
        const existing = await (db as any)?.personajes?.get(personajeId);
        if (existing) {
          await (db as any)?.personajes?.put({
            ...existing,
            fecha_nacimiento: cumpleDraft,
          });
        }
      } catch {}
      onFechaNacimientoChange?.(cumpleDraft);
      setCumpleSelectorOpen(false);
      setCumpleDraft(null);
    } catch {}
    setSavingCumple(false);
  };

  // ── Cargar eras ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!personajeId) return;
    setLoading(true);

    const mapEraRow = (e: any): Era => ({
      id: e.id,
      momento: e.momento,
      label: e.label ?? "",
      rasgos: e.rasgos ?? [],
      notas: e.notas ?? "",
    });

    const run = async () => {
      try {
        if (db) {
          const local: any[] =
            (await (db as any).personaje_eras
              ?.where("personaje_id")
              .equals(personajeId)
              .toArray()) ?? [];
          if (local.length) {
            setEras(
              [...local]
                .sort((a, b) => (a.momento ?? 0) - (b.momento ?? 0))
                .map(mapEraRow),
            );
            setLoading(false);
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      try {
        const { data } = await (supabase as any)
          .from("personaje_eras")
          .select("id, momento, label, rasgos, notas")
          .eq("personaje_id", personajeId)
          .order("momento");
        if (data) {
          setEras(data.map(mapEraRow));
          setLoading(false);
          try {
            if (db && data.length > 0) {
              const rowsWithPid = data.map((e: any) => ({
                ...e,
                personaje_id: personajeId,
              }));
              await (db as any).personaje_eras?.bulkPut(rowsWithPid);
            }
          } catch {}
        }
      } catch {}
      setLoading(false);
    };

    run();
  }, [personajeId]);

  // ── Mutaciones de era ─────────────────────────────────────────────────────
  const updateEra = (id: string, patch: Partial<Era>) =>
    setEras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleAddEra = async () => {
    const num = parseInt(newMomento.trim(), 10);
    if (isNaN(num)) return;
    if (fechaNacimiento != null && num <= fechaNacimiento) return;
    setCreating(true);
    const { data, error } = await (supabase as any)
      .from("personaje_eras")
      .insert({
        personaje_id: personajeId,
        momento: num,
        label: newLabel.trim() || null,
        rasgos: [],
        notas: "",
      })
      .select("id, momento, label, rasgos, notas")
      .single();
    if (!error && data) {
      const era: Era = {
        id: data.id,
        momento: data.momento,
        label: data.label ?? "",
        rasgos: [],
        notas: "",
      };
      setEras((prev) => [...prev, era].sort((a, b) => a.momento - b.momento));
      setExpandedId(era.id);
      try {
        if (db)
          await (db as any).personaje_eras?.put({
            ...data,
            personaje_id: personajeId,
          });
      } catch {}
    }
    setNewMomento("");
    setNewLabel("");
    setAddingNew(false);
    setCreating(false);
  };

  const handleDeleteEra = async (id: string) => {
    setEras((prev) => prev.filter((e) => e.id !== id));
    await (supabase as any).from("personaje_eras").delete().eq("id", id);
    try {
      if (db) await (db as any).personaje_eras?.delete(id);
    } catch {}
  };

  const handleAddRasgo = async (era: Era, rasgo: string) => {
    const trimmed = rasgo.trim();
    if (!trimmed) return;
    const next = [...era.rasgos, trimmed];
    updateEra(era.id, { rasgos: next, _saving: true });
    await (supabase as any)
      .from("personaje_eras")
      .update({ rasgos: next })
      .eq("id", era.id);
    updateEra(era.id, { _saving: false });
  };

  const handleRemoveRasgo = async (era: Era, rasgo: string) => {
    const next = era.rasgos.filter((r) => r !== rasgo);
    updateEra(era.id, { rasgos: next, _saving: true });
    await (supabase as any)
      .from("personaje_eras")
      .update({ rasgos: next })
      .eq("id", era.id);
    updateEra(era.id, { _saving: false });
  };

  const notasTimers = React.useRef<Record<string, any>>({});
  const handleNotasChange = (era: Era, val: string) => {
    updateEra(era.id, { notas: val, _saving: true });
    clearTimeout(notasTimers.current[era.id]);
    notasTimers.current[era.id] = setTimeout(async () => {
      await (supabase as any)
        .from("personaje_eras")
        .update({ notas: val })
        .eq("id", era.id);
      updateEra(era.id, { _saving: false });
    }, 1200);
  };

  const labelTimers = React.useRef<Record<string, any>>({});
  const handleLabelChange = (era: Era, val: string) => {
    updateEra(era.id, { label: val, _saving: true });
    clearTimeout(labelTimers.current[era.id]);
    labelTimers.current[era.id] = setTimeout(async () => {
      await (supabase as any)
        .from("personaje_eras")
        .update({ label: val.trim() || null })
        .eq("id", era.id);
      updateEra(era.id, { _saving: false });
    }, 800);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      {/* Cabecera */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
        <Clock className="text-primary/25 shrink-0" size={8} />
        <span className="flex-1 text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
          Línea de tiempo
        </span>
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
          style={{
            borderColor: addingNew
              ? "color-mix(in srgb, var(--primary) 25%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
            background: addingNew
              ? "color-mix(in srgb, var(--primary) 8%, transparent)"
              : "transparent",
            color: addingNew
              ? "var(--primary)"
              : "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={() => {
            setAddingNew((v) => {
              if (!v && fechaNacimiento != null)
                setNewMomento(String(fechaNacimiento));
              return !v;
            });
          }}
        >
          <Plus size={8} /> Era
        </button>
      </div>

      {/* Formulario de nueva era */}
      {addingNew && (
        <div
          className="px-3 py-2.5 border-b border-primary/[0.06] space-y-2"
          style={{
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div className="space-y-1.5">
            <SelectorFechaMundo
              placeholder="Seleccionar fecha…"
              value={newMomento ? parseInt(newMomento, 10) : null}
              onChange={(dia) => setNewMomento(dia != null ? String(dia) : "")}
            />
            {fechaNacimiento != null &&
              newMomento &&
              parseInt(newMomento, 10) <= fechaNacimiento && (
                <p className="text-[8px] font-black uppercase tracking-widest text-accent/70 italic">
                  La era debe ser posterior al cumpleaños
                </p>
              )}
            <input
              className="w-full rounded-lg border px-2 py-1 text-[9px] outline-none transition-all"
              placeholder="Etiqueta (opcional)"
              style={{
                background: "transparent",
                borderColor:
                  "color-mix(in srgb, var(--primary) 18%, transparent)",
                color: "var(--primary)",
              }}
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddEra();
                if (e.key === "Escape") setAddingNew(false);
              }}
            />
          </div>
          <div className="flex gap-1.5 justify-end">
            <button
              className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-primary/35 border-primary/10 hover:text-primary hover:border-primary/25"
              type="button"
              onClick={() => setAddingNew(false)}
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
              disabled={
                !newMomento.trim() ||
                creating ||
                (fechaNacimiento != null &&
                  parseInt(newMomento, 10) <= fechaNacimiento)
              }
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 20%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={handleAddEra}
            >
              {creating ? (
                <Loader2 className="animate-spin" size={8} />
              ) : (
                <Check size={8} />
              )}{" "}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Lista de eras */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary/20" size={14} />
        </div>
      ) : (
        <div>
          {/* Nodo fijo: cumpleaños */}
          {fechaNacimiento != null && (
            <div className="border-b border-primary/[0.06]">
              <div className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
                <div
                  className="shrink-0 flex flex-col items-center"
                  style={{ width: 20 }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                    style={{
                      borderColor: "var(--accent)",
                      background: "var(--accent)",
                      boxShadow:
                        "0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <FechaMundoBadge diaAbsoluto={fechaNacimiento} />
                  <span
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{ color: "var(--accent)" }}
                  >
                    ✦ Nacimiento
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Empty states */}
          {eras.length === 0 && fechaNacimiento == null && (
            <div className="px-3 py-3 space-y-2">
              {!cumpleSelectorOpen ? (
                <button
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-[8px] font-black uppercase tracking-widest transition-all"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--accent) 30%, transparent)",
                    color: "color-mix(in srgb, var(--accent) 60%, transparent)",
                    background:
                      "color-mix(in srgb, var(--accent) 4%, transparent)",
                  }}
                  type="button"
                  onClick={() => setCumpleSelectorOpen(true)}
                >
                  <CalendarDays size={9} /> Asignar fecha de nacimiento
                </button>
              ) : (
                <div
                  className="space-y-2 p-2.5 rounded-xl border"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--accent) 20%, transparent)",
                    background:
                      "color-mix(in srgb, var(--accent) 4%, transparent)",
                  }}
                >
                  <p
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--accent) 60%, transparent)",
                    }}
                  >
                    ✦ Fecha de nacimiento
                  </p>
                  <SelectorFechaMundo
                    placeholder="Seleccionar cumpleaños…"
                    value={cumpleDraft}
                    onChange={(dia) => setCumpleDraft(dia)}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-primary/35 border-primary/10 hover:text-primary hover:border-primary/25"
                      type="button"
                      onClick={() => {
                        setCumpleSelectorOpen(false);
                        setCumpleDraft(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
                      disabled={cumpleDraft == null || savingCumple}
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 12%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--accent) 25%, transparent)",
                        color: "var(--accent)",
                      }}
                      type="button"
                      onClick={handleGuardarCumple}
                    >
                      {savingCumple ? (
                        <Loader2 className="animate-spin" size={8} />
                      ) : (
                        <Check size={8} />
                      )}{" "}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {eras.length === 0 && fechaNacimiento != null && (
            <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest text-center py-3 italic">
              Agrega una era para continuar la historia
            </p>
          )}

          {/* Banner de cumpleaños cuando hay eras pero no hay fecha */}
          {eras.length > 0 && fechaNacimiento == null && (
            <div
              className="mx-3 my-2 px-2.5 py-2 rounded-xl border border-dashed space-y-1.5"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--accent) 25%, transparent)",
                background: "color-mix(in srgb, var(--accent) 3%, transparent)",
              }}
            >
              {!cumpleSelectorOpen ? (
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all py-1"
                  style={{
                    color: "color-mix(in srgb, var(--accent) 55%, transparent)",
                  }}
                  type="button"
                  onClick={() => setCumpleSelectorOpen(true)}
                >
                  <CalendarDays size={9} /> Asignar fecha de nacimiento
                </button>
              ) : (
                <div className="space-y-2">
                  <p
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--accent) 60%, transparent)",
                    }}
                  >
                    ✦ Fecha de nacimiento
                  </p>
                  <SelectorFechaMundo
                    placeholder="Seleccionar cumpleaños…"
                    value={cumpleDraft}
                    onChange={(dia) => setCumpleDraft(dia)}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-primary/35 border-primary/10 hover:text-primary hover:border-primary/25"
                      type="button"
                      onClick={() => {
                        setCumpleSelectorOpen(false);
                        setCumpleDraft(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
                      disabled={cumpleDraft == null || savingCumple}
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 12%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--accent) 25%, transparent)",
                        color: "var(--accent)",
                      }}
                      type="button"
                      onClick={handleGuardarCumple}
                    >
                      {savingCumple ? (
                        <Loader2 className="animate-spin" size={8} />
                      ) : (
                        <Check size={8} />
                      )}{" "}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Eras */}
          {eras.map((era, idx) => (
            <EraItem
              key={era.id}
              diasPorAnio={diasPorAnio}
              edad={
                fechaNacimiento != null && diasPorAnio > 0
                  ? calcularEdad(era.momento, fechaNacimiento, diasPorAnio)
                  : null
              }
              era={era}
              isLast={idx === eras.length - 1}
              isOpen={expandedId === era.id}
              onAddRasgo={(r) => handleAddRasgo(era, r)}
              onDelete={() => handleDeleteEra(era.id)}
              onLabelChange={(v) => handleLabelChange(era, v)}
              onNotasChange={(v) => handleNotasChange(era, v)}
              onRemoveRasgo={(r) => handleRemoveRasgo(era, r)}
              onToggle={() =>
                setExpandedId(expandedId === era.id ? null : era.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
