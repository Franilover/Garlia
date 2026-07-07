"use client";

/**
 * PersonajeLineaDeTiempo.tsx
 * ──────────────────────────
 * UI de la línea de tiempo de eras de un personaje: crear, editar
 * rasgos/notas/etiqueta, eliminar eras, y selector de fecha de
 * nacimiento inline. Toda la lógica vive en useErasDelPersonaje.
 *
 * Cada era es un bloque compacto de una sola columna, siempre editable
 * (sin toggle de expandir/colapsar). Fecha + edad comparten la misma
 * fila que el nombre del período, y las notas solo ocupan una línea
 * hasta que el usuario les da foco o ya tienen contenido — así no hay
 * cajas vacías de varias líneas desperdiciando espacio.
 *
 * NOTA DE ARQUITECTURA: este componente depende de FechaMundoBadge,
 * SelectorFechaMundo y useCalendario, que hoy viven en
 * `features/editorGarlia/views/EditorLineaTiempo.tsx`. Un componente
 * NO puede importar de `views/` (regla de zona). Esas tres piezas
 * deberían moverse a `features/editorGarlia/components/CalendarioMundo.tsx`
 * (son reutilizables, no exclusivas de una pantalla) y la view
 * reexportarlas si necesita mantener compatibilidad. Mientras esa
 * extracción no se haga, este import es una violación pendiente —
 * señalada aquí a propósito en vez de ocultarla.
 *
 * Ruta: src/features/editorGarlia/components/personajes/PersonajeLineaDeTiempo.tsx
 */

import { CalendarPlus, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  FechaMundoBadge,
  SelectorFechaMundo,
  useCalendario,
} from "@/features/editorGarlia/components/shared/CalendarioMundo";
import {
  type Era,
  useErasDelPersonaje,
} from "@/features/editorGarlia/hooks/personajes/useErasDelPersonaje";
import { useGuardarCumpleanos } from "@/features/editorGarlia/hooks/personajes/useGuardarCumpleanos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularEdad(
  diaAbsolutoEra: number,
  diaAbsolutoNacimiento: number,
  diasPorAnio: number,
): number {
  if (diasPorAnio <= 0) return 0;
  return Math.floor((diaAbsolutoEra - diaAbsolutoNacimiento) / diasPorAnio);
}

const LINE_COLOR = "color-mix(in srgb, var(--primary) 10%, transparent)";
const FIELD_BG = "color-mix(in srgb, var(--primary) 3%, transparent)";

// ─── EraItem ──────────────────────────────────────────────────────────────────

function EraItem({
  era,
  edad,
  isLast,
  onDelete,
  onAddRasgo,
  onRemoveRasgo,
  onNotasChange,
  onLabelChange,
}: {
  era: Era;
  edad: number | null;
  isLast: boolean;
  diasPorAnio: number;
  onDelete: () => void;
  onAddRasgo: (r: string) => void;
  onRemoveRasgo: (r: string) => void;
  onNotasChange: (v: string) => void;
  onLabelChange: (v: string) => void;
}) {
  const [nuevoRasgo, setNuevoRasgo] = useState("");
  const [notasFocused, setNotasFocused] = useState(false);
  const notasExpandida = notasFocused || era.notas.length > 0;

  return (
    <div className="flex gap-2.5">
      {/* Riel vertical continuo + nodo */}
      <div className="shrink-0 flex flex-col items-center" style={{ width: 12 }}>
        <div
          className="rounded-full shrink-0"
          style={{
            width: 6,
            height: 6,
            marginTop: 8,
            border: "1.5px solid var(--accent)",
            background: "var(--bg-main)",
          }}
        />
        {!isLast && (
          <div className="flex-1 w-px mt-1" style={{ background: LINE_COLOR }} />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-2.5">
        {/* Fila única: fecha · edad · label · eliminar */}
        <div className="flex items-center gap-1.5">
          <span
            className="shrink-0 text-micro font-bold"
            style={{ color: "var(--primary)" }}
          >
            <FechaMundoBadge diaAbsoluto={era.momento} />
          </span>

          {edad !== null && edad >= 0 && (
            <span
              className="shrink-0 text-micro font-black tabular-nums"
              style={{ color: "color-mix(in srgb, var(--accent) 75%, transparent)" }}
            >
              · {edad} {edad === 1 ? "año" : "años"}
            </span>
          )}

          <input
            className="flex-1 min-w-0 rounded-md px-1.5 py-1 text-micro font-bold outline-none transition-colors placeholder:font-normal placeholder:text-primary/25"
            maxLength={60}
            placeholder="Nombre del período…"
            style={{ background: "transparent", color: "var(--primary)" }}
            type="text"
            value={era.label}
            onChange={(e) => onLabelChange(e.target.value)}
          />

          {era._saving && (
            <Loader2 className="animate-spin text-primary/25 shrink-0" size={9} />
          )}

          <button
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md text-primary/20 hover:text-accent transition-colors"
            title="Eliminar era"
            type="button"
            onClick={onDelete}
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Fila: rasgos inline (chips + input compacto que aparece al final) */}
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {era.rasgos.map((rasgo) => (
            <span
              key={rasgo}
              className="group flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded text-micro"
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              }}
            >
              {rasgo}
              <button
                className="opacity-30 hover:opacity-100 transition-opacity"
                type="button"
                onClick={() => onRemoveRasgo(rasgo)}
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <input
            className="min-w-[90px] flex-1 rounded px-1.5 py-0.5 text-micro outline-none transition-colors placeholder:text-primary/25"
            placeholder="+ rasgo…"
            style={{ background: "transparent", color: "var(--primary)" }}
            type="text"
            value={nuevoRasgo}
            onChange={(e) => setNuevoRasgo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nuevoRasgo.trim()) {
                e.preventDefault();
                onAddRasgo(nuevoRasgo);
                setNuevoRasgo("");
              }
              if (e.key === "Escape") setNuevoRasgo("");
            }}
          />
        </div>

        {/* Notas: una línea colapsada, crece solo si hay foco o contenido */}
        <textarea
          className="w-full mt-1 rounded-md px-1.5 py-1 text-micro leading-relaxed outline-none transition-all resize-none placeholder:text-primary/20"
          placeholder="Notas…"
          rows={notasExpandida ? 2 : 1}
          style={{
            background: notasExpandida ? FIELD_BG : "transparent",
            color: "var(--primary)",
          }}
          value={era.notas}
          onBlur={() => setNotasFocused(false)}
          onChange={(e) => onNotasChange(e.target.value)}
          onFocus={() => setNotasFocused(true)}
        />
      </div>
    </div>
  );
}

// ─── Selector de cumpleaños inline (reutilizado en 2 lugares del render) ──────

function SelectorCumple({
  draft,
  saving,
  onChange,
  onCancel,
  onGuardar,
}: {
  draft: number | null;
  saving: boolean;
  onChange: (dia: number | null) => void;
  onCancel: () => void;
  onGuardar: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex-1 min-w-0">
        <SelectorFechaMundo
          placeholder="Seleccionar cumpleaños…"
          value={draft}
          onChange={onChange}
        />
      </div>
      <div className="flex gap-1.5 justify-end shrink-0">
        <button
          className="px-2.5 py-1 rounded-lg text-micro text-primary/40 hover:text-primary transition-colors"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold transition-colors disabled:opacity-30"
          disabled={draft == null || saving}
          style={{
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            color: "var(--accent)",
          }}
          type="button"
          onClick={onGuardar}
        >
          {saving ? (
            <Loader2 className="animate-spin" size={10} />
          ) : (
            <Check size={10} />
          )}{" "}
          Guardar
        </button>
      </div>
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
  const diasPorAnio = useMemo(() => {
    if (!cal?.estaciones?.length) return 0;
    return cal.estaciones.reduce(
      (sum: number, e: { duracion_dias?: number }) =>
        sum + (e.duracion_dias ?? 0),
      0,
    );
  }, [cal]);

  const {
    eras,
    loading,
    creating,
    addEra,
    deleteEra,
    addRasgo,
    removeRasgo,
    changeNotas,
    changeLabel,
  } = useErasDelPersonaje(personajeId, fechaNacimiento);

  const { guardar: guardarCumple, saving: savingCumple } =
    useGuardarCumpleanos(personajeId, onFechaNacimientoChange);

  const [addingNew, setAddingNew] = useState(false);
  const [newMomento, setNewMomento] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const [cumpleSelectorOpen, setCumpleSelectorOpen] = useState(false);
  const [cumpleDraft, setCumpleDraft] = useState<number | null>(null);

  const handleAddEra = async () => {
    const num = parseInt(newMomento.trim(), 10);
    await addEra(num, newLabel);
    setNewMomento("");
    setNewLabel("");
    setAddingNew(false);
  };

  const handleGuardarCumple = async () => {
    if (cumpleDraft == null) return;
    const ok = await guardarCumple(cumpleDraft);
    if (ok) {
      setCumpleSelectorOpen(false);
      setCumpleDraft(null);
    }
  };

  const fechaInvalida =
    fechaNacimiento != null &&
    !!newMomento &&
    parseInt(newMomento, 10) <= fechaNacimiento;

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-micro font-bold uppercase tracking-wider text-primary/35">
          Línea de tiempo
        </span>
        <span className="flex-1" />
        <button
          className="flex items-center gap-1 text-micro font-bold transition-colors"
          style={{
            color: addingNew
              ? "var(--accent)"
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
          {addingNew ? <X size={11} /> : <Plus size={11} />} Era
        </button>
      </div>

      {/* Formulario de nueva era: compacto, en una fila */}
      {addingNew && (
        <div
          className="mb-2 p-2 rounded-lg space-y-1.5"
          style={{ background: FIELD_BG }}
        >
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <SelectorFechaMundo
                placeholder="Fecha…"
                value={newMomento ? parseInt(newMomento, 10) : null}
                onChange={(dia: number | null) =>
                  setNewMomento(dia != null ? String(dia) : "")
                }
              />
            </div>
            <input
              className="flex-1 min-w-0 rounded-md border px-2 py-1.5 text-micro outline-none transition-colors placeholder:text-primary/25"
              placeholder="Etiqueta (opcional)"
              style={{ background: "var(--bg-main)", borderColor: LINE_COLOR, color: "var(--primary)" }}
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddEra();
                if (e.key === "Escape") setAddingNew(false);
              }}
            />
          </div>
          {fechaInvalida && (
            <p className="text-micro text-accent/70">
              La era debe ser posterior al cumpleaños
            </p>
          )}
          <div className="flex gap-1.5 justify-end">
            <button
              className="px-2.5 py-1 rounded-lg text-micro text-primary/40 hover:text-primary transition-colors"
              type="button"
              onClick={() => setAddingNew(false)}
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold transition-colors disabled:opacity-30"
              disabled={!newMomento.trim() || creating || fechaInvalida}
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={handleAddEra}
            >
              {creating ? (
                <Loader2 className="animate-spin" size={10} />
              ) : (
                <Check size={10} />
              )}{" "}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary/20" size={14} />
        </div>
      ) : (
        <div>
          {/* Nodo fijo: cumpleaños */}
          {fechaNacimiento != null && (
            <div className="flex gap-2.5">
              <div className="shrink-0 flex flex-col items-center" style={{ width: 12 }}>
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: 7,
                    height: 7,
                    marginTop: 7,
                    background: "var(--accent)",
                    boxShadow:
                      "0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)",
                  }}
                />
                {eras.length > 0 && (
                  <div className="flex-1 w-px mt-1" style={{ background: LINE_COLOR }} />
                )}
              </div>
              <div className="flex items-center gap-1.5 pb-2.5">
                <span className="text-micro font-bold" style={{ color: "var(--primary)" }}>
                  <FechaMundoBadge diaAbsoluto={fechaNacimiento} />
                </span>
                <span className="text-micro font-bold" style={{ color: "var(--accent)" }}>
                  · Nacimiento
                </span>
              </div>
            </div>
          )}

          {/* Empty states */}
          {eras.length === 0 && fechaNacimiento == null && (
            <div className="space-y-2">
              {!cumpleSelectorOpen ? (
                <button
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed text-micro font-bold transition-colors"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
                    color: "color-mix(in srgb, var(--accent) 65%, transparent)",
                  }}
                  type="button"
                  onClick={() => setCumpleSelectorOpen(true)}
                >
                  <CalendarPlus size={12} /> Asignar fecha de nacimiento
                </button>
              ) : (
                <SelectorCumple
                  draft={cumpleDraft}
                  saving={savingCumple}
                  onCancel={() => {
                    setCumpleSelectorOpen(false);
                    setCumpleDraft(null);
                  }}
                  onChange={setCumpleDraft}
                  onGuardar={handleGuardarCumple}
                />
              )}
            </div>
          )}

          {eras.length === 0 && fechaNacimiento != null && (
            <p className="text-micro text-primary/25 pl-5 py-1">
              Agrega una era para continuar la historia
            </p>
          )}

          {/* Banner de cumpleaños cuando hay eras pero no hay fecha */}
          {eras.length > 0 && fechaNacimiento == null && (
            <div
              className="mb-2 px-2 py-1.5 rounded-lg border border-dashed"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
              }}
            >
              {!cumpleSelectorOpen ? (
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-micro font-bold transition-colors py-0.5"
                  style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}
                  type="button"
                  onClick={() => setCumpleSelectorOpen(true)}
                >
                  <CalendarPlus size={12} /> Asignar fecha de nacimiento
                </button>
              ) : (
                <SelectorCumple
                  draft={cumpleDraft}
                  saving={savingCumple}
                  onCancel={() => {
                    setCumpleSelectorOpen(false);
                    setCumpleDraft(null);
                  }}
                  onChange={setCumpleDraft}
                  onGuardar={handleGuardarCumple}
                />
              )}
            </div>
          )}

          {/* Eras — bloques compactos de una sola columna, siempre editables */}
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
              onAddRasgo={(r) => addRasgo(era, r)}
              onDelete={() => deleteEra(era.id)}
              onLabelChange={(v) => changeLabel(era, v)}
              onNotasChange={(v) => changeNotas(era, v)}
              onRemoveRasgo={(r) => removeRasgo(era, r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
