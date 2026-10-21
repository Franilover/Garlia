"use client";

/**
 * HabitatPopoverContent.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Cuerpo del panel de un HÁBITAT (se abre al hacer click en el nombre de un
 * hábitat dentro de CriaturasJerarquica). Lo monta HabitatEditor dentro de
 * PanelFlotanteGlobal con `sinCabecera` (la barra superior la publica el
 * editor). Sin `sinCabecera` conserva la cabecera propia (uso en popover).
 * Ya no existen BiomaPopoverContent/EcosistemaPopoverContent: Bioma y
 * Ecosistema usan BiomaEditor/EcosistemaEditor.
 *
 * Layout de dos columnas — mismo patrón que PanelBioma/PanelEcosistema:
 * cuerpo (Ambiente) + barra lateral a la derecha con SeccionEntidad para
 * Criaturas y Organismos. Acá SÍ se puede añadir/quitar (a diferencia de
 * PanelEcosistema): el hábitat es el lugar canónico donde vive la presencia
 * real (ecosistema_participantes ⋈ ecosistema_participante_habitats).
 *
 *   ┌─ Gran Saltus › Dosel ─────────────────────┬─ Criaturas ──┐
 *   │ Ambiente (valores efectivos)               │ ☑ Lignianos  │
 *   │ Temperatura media   288.15 uΘ · bioma       │ ☐ Feerin     │
 *   │                                             ├─ Organismos ─┤
 *   │                                             │ ☑ Flor Gelida│
 *   └─────────────────────────────────────────────┴──────────────┘
 *
 * SUPABASE MANDA: la compatibilidad, la herencia de factores y las unidades
 * vienen ya resueltas de las vistas canónicas (ver useHabitatHabitantes).
 * Este componente solo presenta y dispara añadir/quitar presencia.
 *
 * Compatibilidad = ADVERTENCIA, no bloqueo: la tabla de reglas empieza vacía
 * a propósito (todo es "sin_evaluar") y el canon lo decide el autor. Un
 * candidato "incompatible" se puede marcar igual, pero pide confirmación
 * (acá, vía window.confirm — SeccionEntidad no tiene UI de confirmación
 * inline por fila).
 */

import { AlertTriangle, Bug, Layers, SlidersHorizontal, Sprout, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useMobileAsidePanel, useRegisterMobileAside } from "@/hooks/ui/useMobileAsidePanel";
import { SeccionEntidad } from "@/ui/SeccionEntidad";

import {
  type CandidatoHabitante,
  type FactorEfectivo,
  useHabitatHabitantes,
} from "@/domains/garlia/biologia/useHabitatHabitantes";
import type { HabitatEcologico } from "@/domains/garlia/biologia/useMapaEcologico";

/** Registra el aside de este panel en el store global (para que aparezca el
 *  botón "Entidades" en la barra del panel flotante) mientras esté montado.
 *  Mismo patrón que PanelBioma/PanelEcosistema. */
function RegistroAsideMovil() {
  useRegisterMobileAside();
  return null;
}

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

/** Adapta un candidato al formato { id, nombre } que espera SeccionEntidad.
 *  id = criatura_id u organismo_id (NO `clave`, que mezcla el prefijo
 *  tipo: — SeccionEntidad usa `id` tal cual para selectedIds/onToggle). */
function aEntidadBase(c: CandidatoHabitante): { id: string; nombre: string } {
  const id = (c.tipo_participante === "criatura" ? c.criatura_id : c.organismo_id) ?? c.clave;
  return { id, nombre: c.nombre };
}

export function HabitatPopoverContent({
  habitat,
  onClose,
  onCambio,
  onSelectCriatura,
  sinCabecera = false,
}: {
  /** Hábitat tal como lo entrega v_habitats_ecosistemas_v1. */
  habitat: HabitatEcologico;
  onClose: () => void;
  /** true cuando lo monta HabitatEditor dentro de PanelFlotanteGlobal: la
   *  cabecera (breadcrumb, nombre, tipo, cerrar) la dibuja el contenedor
   *  con los controles publicados, así que acá se omite para no duplicarla.
   *  Habitantes y Ambiente quedan idénticos. */
  sinCabecera?: boolean;
  /** Se invoca tras añadir/quitar una presencia (refresca el mapa). */
  onCambio?: () => void;
  /** Abre el panel flotante de una criatura (click en el ícono junto al nombre). */
  onSelectCriatura?: (id: string) => void;
}) {
  const { candidatos, factores, loading, error, pendientes, añadir, quitar } =
    useHabitatHabitantes(habitat.habitat_id, habitat.ecosistema_id, onCambio);

  // Layout de dos columnas (cuerpo + barra lateral a la derecha), mismo
  // patrón que PanelBioma/PanelEcosistema: solo aplica cuando lo monta
  // HabitatEditor dentro de un panel flotante (sinCabecera=true).
  const layoutDosColumnas = sinCabecera;
  const [mobileSidebarLocal, setMobileSidebarLocal] = useState(false);
  const asideGlobalAbierto = useMobileAsidePanel((st) => st.open);
  const cerrarAsideGlobal = useMobileAsidePanel((st) => st.close);
  const mobileSidebarOpen = layoutDosColumnas ? asideGlobalAbierto : mobileSidebarLocal;
  const setMobileSidebarOpen = (v: boolean) =>
    layoutDosColumnas ? (v ? undefined : cerrarAsideGlobal()) : setMobileSidebarLocal(v);

  const criaturasCandidatas = useMemo(
    () => candidatos.filter((c) => c.tipo_participante === "criatura"),
    [candidatos],
  );
  const organismosCandidatos = useMemo(
    () => candidatos.filter((c) => c.tipo_participante === "organismo"),
    [candidatos],
  );
  const criaturasPresentesIds = criaturasCandidatas.filter((c) => c.es_presente).map((c) => c.criatura_id!);
  const organismosPresentesIds = organismosCandidatos
    .filter((c) => c.es_presente)
    .map((c) => c.organismo_id!);

  /** onToggle común para ambas SeccionEntidad: recibe el id (criatura_id u
   *  organismo_id) y busca el candidato correspondiente en la lista dada. */
  const hacerToggle =
    (lista: CandidatoHabitante[]) =>
    (id: string, add: boolean) => {
      const cand =
        lista.find((c) => c.criatura_id === id) ?? lista.find((c) => c.organismo_id === id);
      if (!cand) return;
      if (!add) {
        void quitar(cand);
        return;
      }
      if (cand.compatibilidad === "incompatible") {
        const ok = window.confirm(
          `${cand.nombre} está marcado como incompatible con este hábitat` +
            (cand.descripcion_compatibilidad ? `: ${cand.descripcion_compatibilidad}` : ".") +
            "\n\n¿Añadir de todos modos?",
        );
        if (!ok) return;
      }
      void añadir(cand);
    };

  const factoresConValor = factores.filter((f) => !f.falta_valor);
  const factoresFaltantes = factores.filter((f) => f.falta_valor);

  // ── Barra lateral — SeccionEntidad para Criaturas y Organismos ──────────
  // Acá SÍ se añade/quita (a diferencia de PanelEcosistema): el hábitat es
  // el lugar canónico de la presencia real.
  const sidebar = (
    <>
      <SeccionEntidad
        allEntities={criaturasCandidatas.map(aEntidadBase)}
        emptyLabel="Sin criaturas candidatas"
        fallbackIcon={<Bug size={14} strokeWidth={1} />}
        fill={false}
        icon={<Bug size={9} />}
        label="Criaturas"
        loading={loading}
        saving={pendientes.size > 0}
        selectedIds={criaturasPresentesIds}
        onEntityClick={onSelectCriatura}
        onToggle={hacerToggle(criaturasCandidatas)}
      />
      <div
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
        }}
      />
      <SeccionEntidad
        allEntities={organismosCandidatos.map(aEntidadBase)}
        emptyLabel="Sin organismos candidatos"
        fallbackIcon={<Sprout size={14} strokeWidth={1} />}
        fill={false}
        icon={<Sprout size={9} />}
        label="Organismos"
        loading={loading}
        saving={pendientes.size > 0}
        selectedIds={organismosPresentesIds}
        onToggle={hacerToggle(organismosCandidatos)}
      />
    </>
  );

  const cuerpo = (
    <>
      {/* ── Cabecera ─────────────────────────────────────────────────── */}
      {!sinCabecera && (
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
        <div className="flex items-center gap-1 shrink-0">
          {layoutDosColumnas && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              title="Entidades"
              aria-label="Entidades"
              className="sm:hidden p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            >
              <SlidersHorizontal size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      )}

      {/* Sin cabecera propia, la descripción (que vivía en ella) se conserva
          como primer bloque del cuerpo. */}
      {sinCabecera && habitat.descripcion_habitat && (
        <p className="mb-3 text-xs text-primary/60">{habitat.descripcion_habitat}</p>
      )}

      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-red-400/25 bg-red-400/5 px-2 py-1.5 text-micro font-bold text-red-400">
          <AlertTriangle size={11} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Ambiente (factores efectivos, solo lectura) ──────────────── */}
      <div>
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

      {/* Fuera del layout de dos columnas (uso legado en popover sin
          onHeaderControlsChange) las SeccionEntidad se apilan debajo, para
          no perder la función en ese modo. */}
      {!layoutDosColumnas && (
        <div className="mt-3 pt-3 border-t border-primary/10 flex flex-col gap-3">
          {sidebar}
        </div>
      )}
    </>
  );

  if (!layoutDosColumnas) {
    return <div className="flex flex-col h-full min-h-0">{cuerpo}</div>;
  }

  return (
    <div className="flex flex-1 h-full min-h-0">
      <RegistroAsideMovil />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">{cuerpo}</div>

      {/* ── Barra lateral — sección Entidad (Criaturas + Organismos) ──
          Mismo patrón visual que PanelBioma/PanelEcosistema: aside a la
          derecha en desktop, drawer en celular. */}
      <aside
        className="hidden sm:flex shrink-0 w-44 flex-col border-l overflow-y-auto overflow-x-hidden pl-0"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
          background: "color-mix(in srgb, var(--primary) 1%, transparent)",
          scrollbarWidth: "none",
        }}
      >
        {sidebar}
      </aside>

      {/* ── Barra lateral — mobile drawer ── mismo diseño que
          PanelBioma/PanelEcosistema (ancho 200px, header "Entidades"). */}
      {mobileSidebarOpen && (
        <div className="sm:hidden fixed inset-0 z-[10000] flex justify-end">
          <div
            className="absolute inset-0"
            style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "200px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
            >
              <span className="text-micro font-black uppercase tracking-[0.2em] flex items-center gap-1.5 text-primary/40">
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X size={13} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
