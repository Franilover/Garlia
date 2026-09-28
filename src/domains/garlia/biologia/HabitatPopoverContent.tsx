"use client";

/**
 * HabitatPopoverContent.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Menú flotante de un HÁBITAT (se abre al hacer click en el nombre de un
 * hábitat dentro de CriaturasJerarquica). Pensado para usarse dentro de
 * <PopoverFlotante>, igual que EcosistemaPopoverContent / BiomaPopoverContent.
 *
 *   ┌─ Gran Saltus › Dosel ────────────────────────── ✕ ┐
 *   │ Tipo: Dosel · dentro de: General                    │
 *   ├─ Habitantes ────────────────────────────────────────┤
 *   │ [Organismos | Criaturas]   🔍 buscar…               │
 *   │ ☑ Lignianos          compatible                     │
 *   │ ☐ Flor Gelida        sin evaluar                    │
 *   ├─ Ambiente (valores efectivos) ──────────────────────┤
 *   │ Temperatura media   288.15 uΘ   · heredado: bioma   │
 *   └─────────────────────────────────────────────────────┘
 *
 * SUPABASE MANDA: la compatibilidad, la herencia de factores y las unidades
 * vienen ya resueltas de las vistas canónicas (ver useHabitatHabitantes).
 * Este componente solo presenta y dispara añadir/quitar presencia.
 *
 * Compatibilidad = ADVERTENCIA, no bloqueo: la tabla de reglas empieza vacía
 * a propósito (todo es "sin_evaluar") y el canon lo decide el autor. Un
 * candidato "incompatible" se puede marcar igual, pero pide confirmación.
 */

import { AlertTriangle, Check, Layers, Loader2, Search, Sprout, Bug, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  type CandidatoHabitante,
  type CompatibilidadHabitat,
  type FactorEfectivo,
  type TipoParticipanteHabitat,
  useHabitatHabitantes,
} from "@/domains/garlia/biologia/useHabitatHabitantes";
import type { HabitatEcologico } from "@/domains/garlia/biologia/useMapaEcologico";

const ETIQUETA_COMPAT: Record<CompatibilidadHabitat, string> = {
  compatible: "Compatible",
  posible: "Posible",
  incompatible: "Incompatible",
  sin_evaluar: "Sin evaluar",
};

const ESTILO_COMPAT: Record<CompatibilidadHabitat, string> = {
  compatible: "bg-primary/10 text-primary/70 border-primary/20",
  posible: "bg-primary/5 text-primary/55 border-primary/10",
  incompatible: "bg-red-400/10 text-red-400 border-red-400/25",
  sin_evaluar: "bg-transparent text-primary/30 border-primary/10",
};

const ETIQUETA_FUENTE: Record<string, string> = {
  habitat: "propio",
  ecosistema: "del ecosistema",
  bioma: "del bioma",
};

function formatearValor(f: FactorEfectivo): string {
  if (f.falta_valor) return "—";
  if (f.opcion) return f.opcion;
  if (f.valor_numerico === null) return "—";
  // Hasta 4 decimales, sin ceros de relleno (0.80 → 0.8, 100000 → 100000).
  const txt = Number(f.valor_numerico.toFixed(4)).toString();
  return f.unidad_simbolo ? `${txt} ${f.unidad_simbolo}` : txt;
}

function FilaHabitante({
  cand,
  pendiente,
  confirmando,
  onToggle,
  onConfirmar,
  onCancelar,
}: {
  cand: CandidatoHabitante;
  pendiente: boolean;
  confirmando: boolean;
  onToggle: () => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      className={`rounded-lg border transition-colors ${
        cand.es_presente ? "border-primary/20 bg-primary/[0.04]" : "border-transparent"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={cand.es_presente}
        disabled={pendiente}
        onClick={onToggle}
        title={cand.descripcion_compatibilidad ?? undefined}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60"
      >
        <span
          className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            cand.es_presente
              ? "bg-primary border-primary text-bg-main"
              : "border-primary/25 text-transparent"
          }`}
        >
          {pendiente ? (
            <Loader2 size={10} className="animate-spin text-primary/60" />
          ) : (
            <Check size={10} strokeWidth={3} />
          )}
        </span>
        <span className="flex-1 min-w-0 truncate text-xs font-semibold text-primary/80">
          {cand.nombre}
        </span>
        {cand.es_presente && cand.tipo_presencia && (
          <span className="shrink-0 text-micro text-primary/35">{cand.tipo_presencia}</span>
        )}
        <span
          className={`shrink-0 px-1.5 py-px rounded-full border text-micro font-bold uppercase tracking-wide ${ESTILO_COMPAT[cand.compatibilidad]}`}
        >
          {ETIQUETA_COMPAT[cand.compatibilidad]}
        </span>
      </button>

      {confirmando && (
        <div className="mx-2 mb-2 flex items-start gap-2 rounded-md border border-red-400/25 bg-red-400/5 px-2 py-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="text-micro font-bold text-red-400">
              {cand.nombre} está marcado como incompatible con este hábitat.
            </p>
            {cand.descripcion_compatibilidad && (
              <p className="mt-0.5 text-micro text-primary/50">{cand.descripcion_compatibilidad}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onConfirmar}
                className="text-micro font-black uppercase tracking-widest px-2 py-1 rounded bg-red-400/15 text-red-400 hover:bg-red-400/25 transition-colors"
              >
                Añadir de todos modos
              </button>
              <button
                type="button"
                onClick={onCancelar}
                className="text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HabitatPopoverContent({
  habitat,
  onClose,
  onCambio,
  onSelectCriatura,
}: {
  /** Hábitat tal como lo entrega v_habitats_ecosistemas_v1. */
  habitat: HabitatEcologico;
  onClose: () => void;
  /** Se invoca tras añadir/quitar una presencia (refresca el mapa). */
  onCambio?: () => void;
  /** Abre el panel flotante de una criatura (click en el ícono junto al nombre). */
  onSelectCriatura?: (id: string) => void;
}) {
  const { candidatos, factores, loading, error, pendientes, añadir, quitar } =
    useHabitatHabitantes(habitat.habitat_id, habitat.ecosistema_id, onCambio);

  const [tab, setTab] = useState<TipoParticipanteHabitat>("criatura");
  const [busqueda, setBusqueda] = useState("");
  const [soloPresentes, setSoloPresentes] = useState(false);
  /** Clave del candidato "incompatible" pendiente de confirmar. */
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const conteo = useMemo(() => {
    const c = { organismo: 0, criatura: 0, presentesOrganismo: 0, presentesCriatura: 0 };
    for (const x of candidatos) {
      c[x.tipo_participante] += 1;
      if (x.es_presente) {
        if (x.tipo_participante === "organismo") c.presentesOrganismo += 1;
        else c.presentesCriatura += 1;
      }
    }
    return c;
  }, [candidatos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return candidatos.filter(
      (c) =>
        c.tipo_participante === tab &&
        (!soloPresentes || c.es_presente) &&
        (!q || c.nombre.toLocaleLowerCase("es").includes(q)),
    );
  }, [candidatos, tab, busqueda, soloPresentes]);

  const alternar = (c: CandidatoHabitante) => {
    if (c.es_presente) {
      void quitar(c);
    } else if (c.compatibilidad === "incompatible") {
      setConfirmando(c.clave);
    } else {
      void añadir(c);
    }
  };

  const factoresConValor = factores.filter((f) => !f.falta_valor);
  const factoresFaltantes = factores.filter((f) => f.falta_valor);

  const TabBtn = ({
    valor,
    Icon,
    label,
    presentes,
    total,
  }: {
    valor: TipoParticipanteHabitat;
    Icon: React.ElementType;
    label: string;
    presentes: number;
    total: number;
  }) => (
    <button
      type="button"
      onClick={() => setTab(valor)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-micro font-black uppercase tracking-widest transition-colors ${
        tab === valor
          ? "bg-primary/10 text-primary"
          : "text-primary/40 hover:text-primary hover:bg-primary/5"
      }`}
    >
      <Icon size={11} />
      {label}
      <span className="font-bold text-primary/35">
        {presentes}/{total}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Cabecera ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.12em] text-primary/40 truncate">
            {habitat.bioma && <span className="truncate">{habitat.bioma}</span>}
            {habitat.bioma && <span>›</span>}
            <span className="truncate">{habitat.ecosistema ?? "Ecosistema"}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Layers size={13} className="shrink-0 text-accent/60" />
            <h3 className="text-sm font-black uppercase italic tracking-tight text-primary truncate">
              {habitat.habitat}
            </h3>
          </div>
          <p className="mt-0.5 text-micro text-primary/40">
            {habitat.tipo_habitat_nombre ?? "Hábitat"}
            {habitat.habitat_padre && <> · dentro de {habitat.habitat_padre}</>}
          </p>
          {habitat.descripcion_habitat && (
            <p className="mt-1.5 text-xs text-primary/60">{habitat.descripcion_habitat}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-red-400/25 bg-red-400/5 px-2 py-1.5 text-micro font-bold text-red-400">
          <AlertTriangle size={11} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Habitantes ───────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-0 flex-1">
        <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 mb-1.5">
          Habitantes
        </span>
        <div className="flex items-center gap-1 mb-2">
          <TabBtn
            valor="criatura"
            Icon={Bug}
            label="Criaturas"
            presentes={conteo.presentesCriatura}
            total={conteo.criatura}
          />
          <TabBtn
            valor="organismo"
            Icon={Sprout}
            label="Organismos"
            presentes={conteo.presentesOrganismo}
            total={conteo.organismo}
          />
          <button
            type="button"
            onClick={() => setSoloPresentes((v) => !v)}
            aria-pressed={soloPresentes}
            className={`ml-auto px-2 py-1 rounded-lg text-micro font-black uppercase tracking-widest transition-colors ${
              soloPresentes
                ? "bg-primary/10 text-primary"
                : "text-primary/35 hover:text-primary hover:bg-primary/5"
            }`}
          >
            Presentes
          </button>
        </div>

        <div className="relative mb-2">
          <Search
            size={12}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/30"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={tab === "criatura" ? "Buscar criatura…" : "Buscar organismo…"}
            className="w-full bg-primary/[0.04] border border-primary/10 rounded-lg pl-8 pr-7 py-1.5 text-micro font-semibold text-primary outline-none focus:border-primary/25 placeholder:text-primary/30 placeholder:font-normal"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              title="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary/60 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-[120px] max-h-64 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
          {loading ? (
            <div className="py-4 text-micro text-primary/30 text-center">Cargando…</div>
          ) : visibles.length === 0 ? (
            <div className="py-4 text-micro text-primary/25 text-center">
              {busqueda
                ? "Sin resultados"
                : soloPresentes
                  ? "Nadie presente todavía"
                  : "Sin candidatos"}
            </div>
          ) : (
            visibles.map((c) => (
              <div key={c.clave} className="flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  <FilaHabitante
                    cand={c}
                    pendiente={pendientes.has(c.clave)}
                    confirmando={confirmando === c.clave}
                    onToggle={() => alternar(c)}
                    onConfirmar={() => {
                      setConfirmando(null);
                      void añadir(c);
                    }}
                    onCancelar={() => setConfirmando(null)}
                  />
                </div>
                {c.tipo_participante === "criatura" && c.criatura_id && onSelectCriatura && (
                  <button
                    type="button"
                    onClick={() => onSelectCriatura(c.criatura_id!)}
                    title={`Abrir ${c.nombre}`}
                    className="shrink-0 mt-1.5 p-1 rounded text-primary/25 hover:text-accent hover:bg-primary/5 transition-colors"
                  >
                    <Bug size={11} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Ambiente (factores efectivos, solo lectura) ──────────────── */}
      <div className="mt-3 pt-3 border-t border-primary/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
            Ambiente
          </span>
          {factoresFaltantes.length > 0 && (
            <span
              className="text-micro font-bold text-amber-500"
              title={factoresFaltantes.map((f) => f.factor).join(", ")}
            >
              {factoresFaltantes.length} sin valor
            </span>
          )}
        </div>
        {loading ? null : factoresConValor.length === 0 ? (
          <p className="text-micro text-primary/25">Sin factores con valor</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
            {factoresConValor.map((f) => (
              <div key={f.factor_id} className="flex items-baseline justify-between gap-2 min-w-0">
                <dt className="truncate text-micro text-primary/50" title={f.factor}>
                  {f.factor}
                </dt>
                <dd
                  className="shrink-0 text-micro font-bold text-primary/75 tabular-nums"
                  title={f.fuente_nivel ? `Valor ${ETIQUETA_FUENTE[f.fuente_nivel] ?? f.fuente_nivel}` : undefined}
                >
                  {formatearValor(f)}
                  {f.fuente_nivel && f.fuente_nivel !== "habitat" && (
                    <span className="ml-1 font-normal text-primary/25">↑</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {factoresConValor.some((f) => f.fuente_nivel && f.fuente_nivel !== "habitat") && (
          <p className="mt-1.5 text-micro text-primary/25">↑ valor heredado del ecosistema o bioma</p>
        )}
      </div>
    </div>
  );
}
