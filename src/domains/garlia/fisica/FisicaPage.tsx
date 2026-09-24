"use client";

/**
 * FisicaPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Vista de la tab "Física" (Energías Universales).
 *
 * Layout de 2 columnas fijas (reemplaza el panel modal flotante anterior):
 *   - Columna izquierda: navegación — catálogos fijos (compactos), Oris
 *     agrupados por familia y Conceptos agrupados por bloque, todo en una
 *     lista scrolleable de filas clickeables.
 *   - Columna derecha: editor de lo seleccionado (Oris o Concepto), fijo
 *     y siempre visible junto a la lista — sin overlay ni modal, sin perder
 *     contexto de qué más hay para editar.
 *
 * En mobile (breakpoint sm) colapsa a una sola columna: se ve la lista, y
 * al seleccionar algo se reemplaza por el editor con un botón "volver".
 *
 * Todo el contenido variable (Oris, conceptos) vive en Supabase — tablas
 * "oris" y "fisica_conceptos", separadas de "elementos".
 */

import { ChevronLeft, Info, Save, Sparkles, Trash2, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { RichEditor } from "@/editor/lexical";
import { supabase } from "@/infra/supabase/supabase";
import { useConfirm } from "@/ui/ConfirmModal";
import { PopoverFlotante } from "@/domains/garlia/_shared/PopoverFlotante";
import { CabeceraSeccionConMenu } from "@/domains/garlia/_shared/CabeceraSeccionConMenu";

import { OrisEditor } from "./OrisEditor";
import { IumVisual, ParticulaVisual, type LetraATS, type GeometriaIum } from "./ParticulaVisual";
import { useGeometriaIums } from "./useGeometriaIums";
import {
  contextoHumanoAFilaEnergia,
  FISICA_CONCEPTOS_CONFIG,
  IUMS_CONFIG,
  iumAFilaIum,
  orisAFilaCatalogo,
  particulaAFilaCatalogo,
  particulaBaseAFilaCatalogo,
  particulasDeIum,
  polaridadAFilaCatalogo,
  type ContextoHumano,
  type FilaCatalogo,
  type FilaEnergia,
  type FilaIum,
  type FilaParticulaBase,
  type FilaPolaridad,
  type FisicaConcepto,
  type Ium,
  type Oris,
  type Particula,
  type ParticulaBase,
  type Polaridad,
} from "./types";
import { PanelEditorSubsistema } from "@/domains/garlia/runas/BloqueSubsistemasMagia";
import type { SubsistemaMagia } from "@/domains/garlia/runas/useSubsistemasMagia";

/** Adapta un SubsistemaMagia al shape FilaCatalogo — vive acá (no en
 *  types.ts de física) para no acoplar ese módulo al dominio "runas". */
function subsistemaAFilaCatalogo(s: SubsistemaMagia): FilaCatalogo {
  return { nombre: s.nombre || "Sin nombre", detalle: s.descripcion || "Sin descripción" };
}

interface Props {
  polaridades: Polaridad[];
  loadingPolaridades?: boolean;

  particulaBase: ParticulaBase[];
  loadingParticulaBase?: boolean;

  particulas: Particula[];
  loadingParticulas?: boolean;

  iums: Ium[];
  loadingIums?: boolean;
  /** Persiste cambios de nombre/detalle/extra de un Ium — mismo patrón que
   *  onActualizarOris: el caller (RunasPage) hace el setState local; el
   *  guardado real en Supabase corre dentro de IumEditor/IumPanelFlotante. */
  onActualizarIum?: (id: string, cambios: Partial<Ium>) => void;
  onEliminarIum?: (id: string) => void;

  oris: Oris[];
  loadingOris?: boolean;
  creatingOris?: boolean;
  onCreateOris?: () => void;
  onActualizarOris: (id: string, cambios: Partial<Oris>) => void;
  onEliminarOris?: (id: string) => void;
  seleccionarOrisId?: string | null;
  /**
   * Notifica cada vez que cambia el Oris abierto en el panel (o se
   * cierra, con null) — usado por RunasPage para persistir el último
   * Oris visto en useMagiaSeccionStore y reabrirlo tras un refresh.
   * Solo cubre el caso "oris" (no concepto/subsistema/todas-bases), que
   * es el único con deep-link de entrada hoy (seleccionarOrisId).
   */
  onOrisSeleccionadoChange?: (id: string | null) => void;

  conceptos: FisicaConcepto[];
  loadingConceptos?: boolean;
  onActualizarConcepto: (id: string, cambios: Partial<FisicaConcepto>) => void;

  /**
   * Inserta en Supabase un lote de Oris y/o conceptos nuevos (sin id) y
   * devuelve cuántos quedaron guardados en total. El botón "Subir JSON"
   * llama a esto tras parsear el archivo — mismo espíritu que
   * onImportarElementos en elementos/ElementosPage.tsx.
   */
  onImportarFisica?: (
    orisNuevos: Omit<Oris, "id">[],
    conceptosNuevos: Omit<FisicaConcepto, "id">[],
  ) => Promise<number>;
  /**
   * Actualiza en Supabase un lote de Oris y/o conceptos ya existentes
   * (coincidencia por nombre en Oris, por bloque+titulo en conceptos) —
   * upsert en vez de saltarlos. Devuelve cuántos quedaron actualizados
   * en total.
   */
  onActualizarVariosFisica?: (
    orisActualizar: (Partial<Oris> & { id: string })[],
    conceptosActualizar: (Partial<FisicaConcepto> & { id: string })[],
  ) => Promise<number>;

  /** Subsistemas de Magia — cuarto ítem de la barra lateral de Física. */
  subsistemas: SubsistemaMagia[];
  loadingSubsistemas?: boolean;
  creandoSubsistema?: boolean;
  onCrearSubsistema: (nombre: string) => Promise<SubsistemaMagia | null>;
  onActualizarSubsistema: (id: string, updates: Partial<SubsistemaMagia>) => void;
  onEliminarSubsistema: (id: string) => void;
  /** Se dispara al clickear una criatura dentro del editor de subsistema. */
  onSelectCriatura?: (id: string) => void;

  /** Energías (Eterium/Garin) — quinto ítem de la barra lateral de Física,
   *  después de Subsistemas. Fichas reales de "contexto_humano" (no
   *  catálogo propio de Física), filtradas por concepto — ver types.ts. */
  energias: ContextoHumano[];
  loadingEnergias?: boolean;
}

/**
 * Qué está activo en el editor de la columna derecha. "todas-bases" es la
 * pantalla por defecto: columna izquierda con los catálogos (Partícula
 * Base, Partículas, Iums, Oris, Subsistemas) y columna derecha con
 * Conceptos — sin sistema de grupos/tabs, todo vive en una sola vista.
 */
type Seleccion =
  | { tipo: "oris"; id: string }
  | { tipo: "concepto"; id: string }
  | { tipo: "subsistema"; id: string }
  | { tipo: "todas-bases" }
  | null;

// ─── Descarga: todo el contenido de Física en un solo JSON ────────────────
function descargarDatosFisica(
  particulaBase: ParticulaBase[],
  particulas: Particula[],
  iums: Ium[],
  oris: Oris[],
  conceptos: FisicaConcepto[],
) {
  const payload = {
    exportado_en: new Date().toISOString(),
    particula_base: particulaBase,
    particulas,
    iums,
    oris,
    conceptos,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fisica-energias-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Subida: leer un JSON con el mismo formato exportado (oris + conceptos)
// y devolver los registros nuevos listos para insertar. No toca Supabase
// directamente — eso lo hace el caller (BloqueFisica en RunasPage), mismo
// espíritu que parsearArchivoElementosJSON en elementos/ElementosPage.tsx.
export interface ImportacionFisica {
  orisNuevos: Omit<Oris, "id">[];
  /** Oris del archivo que coinciden por nombre con uno existente: se actualizan en vez de saltarse. */
  orisActualizar: (Partial<Oris> & { id: string })[];
  conceptosNuevos: Omit<FisicaConcepto, "id">[];
  /** Conceptos del archivo que coinciden por (bloque, titulo) con uno existente: se actualizan. */
  conceptosActualizar: (Partial<FisicaConcepto> & { id: string })[];
}

export function parsearArchivoFisicaJSON(
  raw: string,
  orisExistentes: Oris[],
  conceptosExistentes: FisicaConcepto[] = [],
): ImportacionFisica {
  const data = JSON.parse(raw);
  const listaOris: unknown[] = Array.isArray(data?.oris) ? data.oris : [];
  const listaConceptos: unknown[] = Array.isArray(data?.conceptos) ? data.conceptos : [];

  if (listaOris.length === 0 && listaConceptos.length === 0) {
    throw new Error('El JSON debe traer al menos una de las claves "oris" o "conceptos" con arreglos.');
  }

  const orisPorNombre = new Map(orisExistentes.map((o) => [o.nombre, o]));
  const orisNuevos: Omit<Oris, "id">[] = [];
  const orisActualizar: (Partial<Oris> & { id: string })[] = [];

  for (const item of listaOris) {
    const o = item as Partial<Oris>;
    if (!o.nombre || !o.familia) {
      throw new Error(`Oris inválido (falta nombre o familia): ${JSON.stringify(o).slice(0, 120)}`);
    }
    const datos = {
      orden: o.orden ?? 0,
      nombre: o.nombre,
      familia: o.familia,
      formula: o.formula ?? "",
      dominio: o.dominio ?? "",
      descripcion: o.descripcion ?? null,
      iums_composicion: o.iums_composicion ?? {},
    };
    const existente = orisPorNombre.get(o.nombre);
    if (existente) {
      orisActualizar.push({ id: existente.id, ...datos });
    } else {
      orisNuevos.push(datos);
    }
  }

  // Los conceptos no tienen un campo único natural — se identifican por la
  // combinación (bloque, titulo), igual que se agrupan visualmente.
  const conceptosPorClave = new Map(
    conceptosExistentes.map((c) => [`${c.bloque}\u0000${c.titulo}`, c]),
  );
  const conceptosNuevos: Omit<FisicaConcepto, "id">[] = [];
  const conceptosActualizar: (Partial<FisicaConcepto> & { id: string })[] = [];

  for (const item of listaConceptos) {
    const c = item as Partial<FisicaConcepto>;
    if (!c.titulo || !c.bloque) {
      throw new Error(`Concepto inválido (falta titulo o bloque): ${JSON.stringify(c).slice(0, 120)}`);
    }
    const datos = {
      orden: c.orden ?? 0,
      bloque: c.bloque,
      titulo: c.titulo,
      contenido: c.contenido ?? "",
    };
    const existente = conceptosPorClave.get(`${c.bloque}\u0000${c.titulo}`);
    if (existente) {
      conceptosActualizar.push({ id: existente.id, ...datos });
    } else {
      conceptosNuevos.push(datos);
    }
  }

  return { orisNuevos, orisActualizar, conceptosNuevos, conceptosActualizar };
}

// ─── Filas de navegación (columna izquierda) ───────────────────────────────


type ClaveCatalogo =
  | "polaridades"
  | "particula-base"
  | "particulas"
  | "iums"
  | "oris"
  | "subsistemas"
  | "energias";

function catalogosBases(
  polaridades: Polaridad[],
  particulaBase: ParticulaBase[],
  particulas: Particula[],
  iums: Ium[],
  oris: Oris[],
  subsistemas: SubsistemaMagia[],
  energias: ContextoHumano[],
): { key: ClaveCatalogo; titulo: string; filas: FilaCatalogo[] }[] {
  return [
    {
      key: "polaridades",
      titulo: "Polaridades",
      filas: polaridades.map(polaridadAFilaCatalogo),
    },
    {
      key: "particula-base",
      titulo: "TASI",
      filas: particulaBase.map(particulaBaseAFilaCatalogo),
    },
    {
      key: "particulas",
      titulo: "Partículas",
      filas: particulas.map(particulaAFilaCatalogo),
    },
    { key: "iums", titulo: "Iums", filas: iums.map(iumAFilaIum) },
    { key: "oris", titulo: "Oris", filas: oris.map(orisAFilaCatalogo) },
    { key: "subsistemas", titulo: "Subsistemas", filas: subsistemas.map(subsistemaAFilaCatalogo) },
    { key: "energias", titulo: "Energías", filas: energias.map(contextoHumanoAFilaEnergia) },
  ];
}

/** Texto de la Ley de Equivalencia Rotacional, mostrado en el popover junto
 *  a "Partículas · N" — mismo contenido que el registro en fisica_conceptos
 *  ("Partículas teóricas descartadas"), resumido para lectura rápida. */
const LEY_EQUIVALENCIA_ROTACIONAL = {
  titulo: "Ley de Equivalencia Rotacional",
  contenido:
    "Del espacio completo de 27 combinaciones de Tesis/Antítesis/Síntesis (3³), solo 11 son partículas distintas. " +
    "Las 16 restantes son rotaciones de esas 11 — la misma partícula vista desde otro punto de inicio de su ciclo " +
    "A→T→S (ej. ATA y TAT son rotaciones de TAA/ATT), igual que un espín ↑/↓ no son dos partículas sino dos estados " +
    "del mismo grado de libertad. Se exploraron como candidatas independientes y se descartaron el 12/08/2026 tras " +
    "confirmar que ningún elemento del mundo las usaba: las 11 originales ya cubren el espacio completo de clases " +
    "de equivalencia rotacional del sistema.",
};

/** Círculo simple para un polo (+/−) — mismo lenguaje visual que
 *  ParticulaVisual (círculo con borde + relleno tenue) pero sin letra
 *  A/T/S/I, ya que Polaridad no es parte de esa fórmula: el signo es el
 *  contenido. Mismo patrón que PoloCirculo en
 *  visualizador/MapaUniversalSection.tsx, reimplementado acá liviano para
 *  no acoplar fisica/ a visualizador/. */
function PoloVisual({ signo, size = 88 }: { signo: "+" | "-"; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)",
        color: "var(--primary)",
      }}
    >
      {signo}
    </div>
  );
}

function BasesRowTitle({
  titulo,
  cantidad,
  mostrarInfo,
}: {
  titulo: string;
  cantidad: number;
  /** Si true, muestra el ícono de info con el popover de la Ley de
   *  Equivalencia Rotacional — solo aplica al bloque "Partículas". */
  mostrarInfo?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <div className="flex items-center gap-1">
      <p className="text-micro font-black uppercase tracking-[0.2em]">
        {titulo} · {cantidad}
      </p>
      {mostrarInfo && (
        <>
          <button
            type="button"
            onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
            title="Por qué son solo 11 partículas"
            className="flex items-center justify-center w-4 h-4 rounded-full text-primary/30 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
          >
            <Info size={11} />
          </button>
          <PopoverFlotante anchor={anchor} onClose={() => setAnchor(null)} width={340} maxHeight={280}>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                {LEY_EQUIVALENCIA_ROTACIONAL.titulo}
              </p>
              <p className="text-xs text-primary/70 leading-relaxed">
                {LEY_EQUIVALENCIA_ROTACIONAL.contenido}
              </p>
            </div>
          </PopoverFlotante>
        </>
      )}
    </div>
  );
}

function TodasLasBasesView({
  polaridades,
  particulaBase,
  particulas,
  iums,
  oris,
  subsistemas,
  energias,
  onCreateOris,
  creatingOris,
  onActualizarOris,
  onEliminarOris,
  onActualizarIum,
  onEliminarIum,
  onActualizarSubsistema,
  onEliminarSubsistema,
  onSelectCriatura,
  onCrearSubsistema,
  creandoSubsistema,
  geometriaDe,
}: {
  polaridades: Polaridad[];
  particulaBase: ParticulaBase[];
  particulas: Particula[];
  iums: Ium[];
  oris: Oris[];
  subsistemas: SubsistemaMagia[];
  energias: ContextoHumano[];
  onCreateOris?: () => void;
  creatingOris?: boolean;
  onActualizarOris: (id: string, cambios: Partial<Oris>) => void;
  onEliminarOris?: (id: string) => void;
  onActualizarIum: (id: string, cambios: Partial<Ium>) => void;
  onEliminarIum?: (id: string) => void;
  onActualizarSubsistema: (id: string, updates: Partial<SubsistemaMagia>) => void;
  onEliminarSubsistema: (id: string) => void;
  onSelectCriatura?: (id: string) => void;
  onCrearSubsistema: (nombre: string) => Promise<SubsistemaMagia | null>;
  creandoSubsistema?: boolean;
  /** Geometría real de cada Ium (useGeometriaIums), propagada a las
   *  BasesItemCard del bloque "iums". */
  geometriaDe?: (iumId: string) => { geometria: GeometriaIum };
}) {
  const catalogos = catalogosBases(polaridades, particulaBase, particulas, iums, oris, subsistemas, energias);

  const [nombreNuevoSubsistema, setNombreNuevoSubsistema] = useState("");
  const [creandoAbierto, setCreandoAbierto] = useState(false);
  // Cuando se crea un subsistema nuevo, abrimos su popover automáticamente
  // anclado a la fila donde estaba el input de creación (no hay tarjeta
  // propia todavía en ese frame) — se guarda el id para que BasesItemCard
  // lo detecte y se auto-abra apenas aparece en la lista.
  const [autoAbrirSubsistemaId, setAutoAbrirSubsistemaId] = useState<string | null>(null);

  const handleCrearSubsistema = async () => {
    const nombre = nombreNuevoSubsistema.trim();
    if (!nombre) return;
    const nuevo = await onCrearSubsistema(nombre);
    setNombreNuevoSubsistema("");
    setCreandoAbierto(false);
    if (nuevo) setAutoAbrirSubsistemaId(nuevo.id);
  };

  return (
    <div className="shrink-0 flex flex-col">
      <div className="p-2.5 flex flex-col gap-4">
        {/* Partícula Base / Partículas / Iums / Oris / Subsistemas — una
            sola fila, con el ancho de cada columna proporcional a su
            cantidad de ítems (flex-grow = total, con un piso de 1 para
            que ninguna quede en cero). Antes cada columna se llevaba un
            quinto fijo del ancho sea cual sea su tamaño real, y con
            cantidades muy dispares (3, 11, 11, 9, 2) las columnas cortas
            (Partícula Base, Subsistemas) dejaban un hueco vacío enorme
            debajo de sus 2-3 tarjetas mientras Partículas/Iums, con 11
            cada una, se quedaban angostas y muy altas. Ahora, además,
            cada tarjeta es una pill compacta en flex-wrap (mismo lenguaje
            visual que Compuestos/Estructuras/Materiales) en vez de una
            tarjeta ancha apilada verticalmente, así que una columna con
            pocos ítems reparte en una o dos líneas cortas en vez de
            ocupar todo el alto disponible en una lista de 1 columna. */}
        {/* Polaridades + TASI van apiladas en una
            sola columna angosta (ambas con muy pocos ítems: 2 y 3-4) en
            vez de cada una llevarse su propio ancho de columna en el
            flex-wrap — evita el hueco vacío enorme que dejaban al ir
            sueltas. Mismo criterio para Energías + Subsistemas (Energías
            arriba, Subsistemas abajo): también pocos ítems cada una.
            Partículas / Iums / Oris siguen en su propia columna
            proporcional a su cantidad de ítems, como antes. */}
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex flex-col gap-4 min-w-[180px]" style={{ flexGrow: 1, flexBasis: 0 }}>
            {catalogos
              .filter(({ key }) => key === "polaridades" || key === "particula-base")
              .map(({ key, titulo, filas }) => (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5 text-primary/50 pb-1.5">
                    <BasesRowTitle titulo={titulo} cantidad={filas.length} />
                  </div>
                  {filas.length === 0 ? (
                    <div className="py-4 text-micro text-primary/25 text-center border border-dashed border-primary/10 rounded-md">
                      Sin {titulo.toLowerCase()} todavía
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {filas.map((f, i) => (
                        <BasesItemCard key={f.nombre + i} fila={f} bloque={key} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {catalogos
            .filter(({ key }) => key !== "polaridades" && key !== "particula-base" && key !== "energias" && key !== "subsistemas")
            .map(({ key, titulo, filas }) => (
            <div
              key={key}
              className="flex flex-col gap-2 min-w-[180px]"
              style={{ flexGrow: Math.max(filas.length, 1), flexBasis: 0 }}
            >
              <div className="flex items-center justify-between gap-1.5 text-primary/50 pb-1.5">
                {key === "oris" ? (
                  <CabeceraSeccionConMenu
                    titulo={`${titulo} · ${filas.length}`}
                    items={oris.map((o) => ({ id: o.id, nombre: o.nombre }))}
                    onAñadir={onCreateOris}
                    añadiendo={creatingOris}
                    onRenombrar={(id, nuevoNombre) => onActualizarOris(id, { nombre: nuevoNombre })}
                    onEliminar={onEliminarOris}
                  />
                ) : (
                  <BasesRowTitle titulo={titulo} cantidad={filas.length} mostrarInfo={key === "particulas"} />
                )}
              </div>

              {filas.length === 0 ? (
                <div className="py-4 text-micro text-primary/25 text-center border border-dashed border-primary/10 rounded-md">
                  Sin {titulo.toLowerCase()} todavía
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {filas.map((f, i) => {
                    const original = key === "oris" ? oris[i] : null;
                    const originalIum = key === "iums" ? iums[i] : null;
                    return (
                      <BasesItemCard
                        key={f.nombre + i}
                        fila={f}
                        bloque={key}
                        original={key === "oris" ? (original as Oris) : undefined}
                        originalIum={key === "iums" ? (originalIum as Ium) : undefined}
                        onActualizarOris={onActualizarOris}
                        onEliminarOris={onEliminarOris}
                        onActualizarIum={onActualizarIum}
                        onEliminarIum={onEliminarIum}
                        geometriaDe={key === "iums" ? geometriaDe : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Energías + Subsistemas apiladas, mismo criterio que
              Polaridades/Partícula Base: Energías arriba, Subsistemas
              abajo. */}
          <div className="flex flex-col gap-4 min-w-[180px]" style={{ flexGrow: 1, flexBasis: 0 }}>
            {catalogos
              .filter(({ key }) => key === "energias" || key === "subsistemas")
              .map(({ key, titulo, filas }) => (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5 text-primary/50 pb-1.5">
                    <BasesRowTitle titulo={titulo} cantidad={filas.length} />
                  </div>
                  {filas.length === 0 ? (
                    <div className="py-4 text-micro text-primary/25 text-center border border-dashed border-primary/10 rounded-md">
                      Sin {titulo.toLowerCase()} todavía
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {filas.map((f, i) => {
                        const original = key === "subsistemas" ? subsistemas[i] : null;
                        return (
                          <BasesItemCard
                            key={f.nombre + i}
                            fila={f}
                            bloque={key}
                            originalSubsistema={key === "subsistemas" ? (original as SubsistemaMagia) : undefined}
                            onActualizarSubsistema={onActualizarSubsistema}
                            onEliminarSubsistema={onEliminarSubsistema}
                            onSelectCriatura={onSelectCriatura}
                            autoAbrir={
                              key === "subsistemas" && original
                                ? (original as SubsistemaMagia).id === autoAbrirSubsistemaId
                                : false
                            }
                            onAutoAbierto={() => setAutoAbrirSubsistemaId(null)}
                            oris={key === "subsistemas" ? oris : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Extrae la letra TASI de fundamento (S para Eterium, I para Garin) desde
 * propiedades_clave (clave="fundamento_tasi") — dato real de Supabase, no
 * hardcodeado, así que si mañana cambia el fundamento de un concepto acá
 * se sigue solo. Fallback a null si no está la propiedad o no es una letra
 * TASI válida — en ese caso no se dibuja el diagrama.
 */
function letraFundamentoDe(contexto: ContextoHumano): LetraATS | null {
  const prop = contexto.propiedades_clave?.find((p) => p.clave === "fundamento_tasi");
  const letra = prop?.valor?.trim().toUpperCase();
  return letra === "A" || letra === "T" || letra === "S" || letra === "I" ? letra : null;
}

/**
 * Diagrama de la letra de fundamento repetida, con dos layouts opuestos
 * según polaridad — no es un grid prolijo, la disposición ES el
 * significado:
 *   - S (Eterium, emisión + → −): las 9 se dibujan pegadas, tocándose,
 *     como imantadas hacia el centro — "atracción".
 *   - I (Garin, recepción − → +): las 9 se dispersan lejos unas de otras
 *     dentro del mismo lienzo, con posiciones irregulares (no una grilla
 *     regular) para leerse como que se empujan — "repulsión".
 * Posiciones fijas a mano (no una simulación física real) porque son
 * siempre 9 círculos del mismo tamaño en el mismo lienzo — alcanza con
 * dos layouts estáticos que se lean claramente distintos de un vistazo.
 */
const LIENZO = 220;
const R_CIRCULO = 42;

// S: 9 círculos apretados unos contra otros en un empaquetado hexagonal
// (3 filas de 3, offset alternado) — el radio de paso es casi igual al
// diámetro, así que se tocan entre sí.
const POSICIONES_ATRAIDAS: { x: number; y: number }[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 },  { x: 0, y: 0 },  { x: 1, y: 0 },
  { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
].map((p) => ({ x: p.x * R_CIRCULO * 1.05, y: p.y * R_CIRCULO * 1.05 }));

// I: 9 círculos empujados hacia los bordes/esquinas del lienzo, con
// separación irregular entre sí (nunca dos muy cerca) — sensación de
// "se repelen y no pueden juntarse".
const POSICIONES_REPELIDAS: { x: number; y: number }[] = [
  { x: -83, y: -83 }, { x: 0, y: -93 },  { x: 83, y: -79 },
  { x: -96, y: 5 },                       { x: 91, y: 13 },
  { x: -74, y: 86 },  { x: 9, y: 96 },   { x: 80, y: 80 },
  { x: -8, y: 0 },
];

function GridLetraFundamento({ letra }: { letra: LetraATS }) {
  const atraccion = letra === "S";
  const posiciones = atraccion ? POSICIONES_ATRAIDAS : POSICIONES_REPELIDAS;
  const size = atraccion ? R_CIRCULO * 1.15 : R_CIRCULO * 0.75;
  return (
    <div className="relative" style={{ width: LIENZO, height: LIENZO }}>
      {posiciones.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: LIENZO / 2 + p.x - size / 2,
            top: LIENZO / 2 + p.y - size / 2,
          }}
        >
          <ParticulaVisual formula={letra} size={size} />
        </div>
      ))}
    </div>
  );
}

/**
 * Contenido del popover de una Energía (Eterium/Garin): ficha completa de
 * "contexto_humano" — resumen, explicación simple, fórmula de referencia,
 * analogía y propiedades clave — en vez del layout genérico nombre/detalle
 * que usan Oris/Subsistemas/Partícula Base. Encabeza con el grid de la
 * letra de fundamento (S para Eterium, I para Garin) repetida, derivada de
 * propiedades_clave (no hardcodeada). Solo lectura: no hay edición desde
 * acá, la ficha vive y se edita en contexto_humano directamente.
 */
function EnergiaFichaContent({ contexto }: { contexto: ContextoHumano }) {
  const letraFundamento = letraFundamentoDe(contexto);
  return (
    <div className="flex flex-col md:flex-row gap-3">
      {letraFundamento && (
        <div className="shrink-0 flex items-center justify-center md:items-start md:justify-center pt-1">
          <GridLetraFundamento letra={letraFundamento} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary">{contexto.concepto}</p>
          {contexto.resumen && (
            <p className="mt-1 text-xs text-primary/70 leading-relaxed">{contexto.resumen}</p>
          )}
        </div>

        {contexto.explicacion_simple && (
          <p className="text-xs text-primary/70 leading-relaxed">{contexto.explicacion_simple}</p>
        )}

        {contexto.formula_referencia && (
          <p className="text-xs font-mono text-primary/60 bg-primary/5 rounded px-2 py-1 truncate">
            {contexto.formula_referencia}
          </p>
        )}

        {contexto.analogia_o_ejemplo && (
          <p className="text-xs text-primary/50 leading-relaxed italic">{contexto.analogia_o_ejemplo}</p>
        )}

        {contexto.propiedades_clave && contexto.propiedades_clave.length > 0 && (
          <div className="flex flex-col gap-1">
            {contexto.propiedades_clave.map((p, i) => (
              <div key={i} className="flex items-baseline gap-1.5 text-micro">
                <span className="text-primary/40 uppercase tracking-wide shrink-0">{p.clave}</span>
                <span className="text-primary/70 truncate">{p.valor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Panel flotante centrado del detalle de un Oris — mismo shell visual que
 * ElementoPanelFlotante/CompuestoPanelFlotante en Elementos/Compuestos
 * (modal grande "w-full h-full max-w-6xl" centrado en pantalla, backdrop
 * con blur, animación popIn, Escape para cerrar y bloqueo de scroll del
 * fondo), reemplazando el PopoverFlotante chico anclado que se usaba antes
 * para Oris. A diferencia de ElementoPanelFlotante, OrisEditor ya trae su
 * propio header interno (nombre, guardar, borrar) — no usa el patrón de
 * onHeaderControlsChange — así que el header de este shell queda fijo
 * (ícono + título "Oris" + botón cerrar) y OrisEditor se renderiza
 * `embedded` (sin su botón "volver" propio, ya que acá cerramos con la X
 * o Escape).
 */
function OrisPanelFlotante({
  oris,
  onCerrar,
  onActualizar,
  onEliminar,
}: {
  oris: Oris;
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Oris>) => void;
  onEliminar?: (id: string) => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [nombreLocal, setNombreLocal] = useState(oris.nombre ?? "");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setNombreLocal(oris.nombre ?? ""), [oris.id, oris.nombre]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <ConfirmModal />
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          >
            <Sparkles className="text-primary/50" size={12} />
          </div>

          <input
            value={nombreLocal}
            onChange={(e) => setNombreLocal(e.target.value)}
            onBlur={() => {
              if (nombreLocal !== oris.nombre) onActualizar(oris.id, { nombre: nombreLocal });
            }}
            placeholder="Nombre del Oris"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          <div className="shrink-0 flex items-center gap-1">
            {onEliminar && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Eliminar Oris",
                    message: `¿Eliminar "${nombreLocal}"? Esta acción no se puede deshacer.`,
                  });
                  if (ok) {
                    onEliminar(oris.id);
                    onCerrar();
                  }
                }}
                className="flex items-center justify-center w-6 h-6 rounded-md border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
                title="Eliminar"
              >
                <Trash2 size={11} />
              </button>
            )}
            <button
              type="button"
              disabled={guardando}
              onClick={async () => {
                setGuardando(true);
                try {
                  await onActualizar(oris.id, { nombre: nombreLocal });
                } finally {
                  setGuardando(false);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save size={10} />
              {guardando ? "…" : "Guardar"}
            </button>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <OrisEditor
            key={oris.id}
            oris={oris}
            embedded
            hideHeader
            nombreExterno={nombreLocal}
            onBack={onCerrar}
            onActualizar={onActualizar}
            onEliminar={
              onEliminar
                ? (id) => {
                    onEliminar(id);
                    onCerrar();
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Detalle editable de un Ium: nombre, detalle y extra, más su gráfico
 * (Partículas componentes vía IumVisual, solo lectura — la composición se
 * edita aparte, en iums_particulas). Mismo patrón de guardado que
 * OrisEditor (persist al perder foco), mismo estilo minimalista de
 * inputs/textarea (solo borde, sin fondo relleno).
 */
function IumEditor({
  ium,
  embedded,
  hideHeader,
  nombreExterno,
  onBack,
  onActualizar,
  onEliminar,
  geometriaDe,
}: {
  ium: Ium;
  embedded?: boolean;
  hideHeader?: boolean;
  nombreExterno?: string;
  onBack: () => void;
  onActualizar: (id: string, cambios: Partial<Ium>) => void;
  onEliminar?: (id: string) => void;
  geometriaDe?: (iumId: string) => { geometria: GeometriaIum };
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(ium);

  useEffect(() => setLocal(ium), [ium]);

  useEffect(() => {
    if (hideHeader && nombreExterno !== undefined) {
      setLocal((p) => (p.nombre === nombreExterno ? p : { ...p, nombre: nombreExterno }));
    }
  }, [hideHeader, nombreExterno]);

  const filaIum = useMemo(() => iumAFilaIum(local), [local]);

  async function persist(cambios: Partial<Ium>) {
    setSaving(true);
    try {
      const { error } = await supabase.from(IUMS_CONFIG.tabla).update(cambios).eq("id", ium.id);
      if (error) throw error;
      onActualizar(ium.id, cambios);
    } catch (e) {
      console.error("[IumEditor] error guardando:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />
      {!hideHeader && (
        <div
          style={{ background: "var(--bg-main)" }}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-primary/10"
        >
          {!embedded && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
          )}

          <input
            value={local.nombre ?? ""}
            onChange={(e) => setLocal((p) => ({ ...p, nombre: e.target.value }))}
            onBlur={() => persist({ nombre: local.nombre })}
            placeholder="Nombre del Ium"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          <div className="shrink-0 flex items-center gap-1">
            {onEliminar && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Eliminar Ium",
                    message: `¿Eliminar "${local.nombre}"? Esta acción no se puede deshacer.`,
                  });
                  if (ok) onEliminar(ium.id);
                }}
                className="flex items-center justify-center w-6 h-6 rounded-md border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
                title="Eliminar"
              >
                <Trash2 size={11} />
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => persist({ nombre: local.nombre, detalle: local.detalle, extra: local.extra })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save size={10} />
              {saving ? "…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 min-h-0 flex flex-row gap-3 overflow-y-auto ${embedded ? "p-2" : "p-2.5"}`}>
        {/* Columna izquierda: gráfico, solo lectura */}
        <div className="shrink-0 w-[280px] flex flex-col items-center gap-3 p-3">
          <IumVisual
            particulas={particulasDeIum(filaIum)}
            geometria={geometriaDe?.(ium.id).geometria}
            size={200}
          />
          {filaIum.composicion.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {filaIum.composicion.map(({ particula, cantidad }, i) => (
                <span
                  key={particula + i}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-primary/15 text-micro font-bold text-primary"
                >
                  {cantidad > 1 && <span className="text-primary/40">{cantidad}×</span>}
                  {particula}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: detalle + extra — mismo estilo minimalista que
            OrisEditor (solo borde, sin fondo relleno; texto grande y
            liviano). */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-micro uppercase tracking-wide text-primary/35">Detalle</label>
            <input
              value={local.detalle ?? ""}
              onChange={(e) => setLocal((p) => ({ ...p, detalle: e.target.value }))}
              onBlur={() => persist({ detalle: local.detalle })}
              placeholder="Descripción corta del Ium"
              className="bg-transparent rounded-md px-2 py-1.5 text-sm text-primary outline-none border border-primary/15 focus:border-primary/40 transition-colors placeholder:text-primary/25"
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-1">
            <label className="text-micro uppercase tracking-wide text-primary/35">Extra</label>
            <textarea
              value={local.extra ?? ""}
              onChange={(e) => setLocal((p) => ({ ...p, extra: e.target.value }))}
              onBlur={() => persist({ extra: local.extra })}
              rows={6}
              placeholder="Notas adicionales sobre este Ium…"
              className="flex-1 min-h-0 bg-transparent rounded-md px-2 py-1.5 text-sm text-primary outline-none border border-primary/15 focus:border-primary/40 transition-colors resize-none placeholder:text-primary/25"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel flotante centrado del detalle de un Ium — mismo shell que
 * OrisPanelFlotante (modal grande "w-full h-full max-w-6xl" centrado,
 * backdrop con blur, animación popIn, Escape para cerrar), reemplazando
 * el popover chico anclado que se usaba antes para Iums.
 */
function IumPanelFlotante({
  ium,
  onCerrar,
  onActualizar,
  onEliminar,
  geometriaDe,
}: {
  ium: Ium;
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Ium>) => void;
  onEliminar?: (id: string) => void;
  geometriaDe?: (iumId: string) => { geometria: GeometriaIum };
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [nombreLocal, setNombreLocal] = useState(ium.nombre ?? "");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setNombreLocal(ium.nombre ?? ""), [ium.id, ium.nombre]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <ConfirmModal />
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          >
            <Sparkles className="text-primary/50" size={12} />
          </div>

          <input
            value={nombreLocal}
            onChange={(e) => setNombreLocal(e.target.value)}
            onBlur={() => {
              if (nombreLocal !== ium.nombre) onActualizar(ium.id, { nombre: nombreLocal });
            }}
            placeholder="Nombre del Ium"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          <div className="shrink-0 flex items-center gap-1">
            {onEliminar && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Eliminar Ium",
                    message: `¿Eliminar "${nombreLocal}"? Esta acción no se puede deshacer.`,
                  });
                  if (ok) {
                    onEliminar(ium.id);
                    onCerrar();
                  }
                }}
                className="flex items-center justify-center w-6 h-6 rounded-md border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
                title="Eliminar"
              >
                <Trash2 size={11} />
              </button>
            )}
            <button
              type="button"
              disabled={guardando}
              onClick={async () => {
                setGuardando(true);
                try {
                  await onActualizar(ium.id, { nombre: nombreLocal });
                } finally {
                  setGuardando(false);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save size={10} />
              {guardando ? "…" : "Guardar"}
            </button>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <IumEditor
            key={ium.id}
            ium={ium}
            embedded
            hideHeader
            nombreExterno={nombreLocal}
            onBack={onCerrar}
            onActualizar={onActualizar}
            onEliminar={
              onEliminar
                ? (id) => {
                    onEliminar(id);
                    onCerrar();
                  }
                : undefined
            }
            geometriaDe={geometriaDe}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Tarjeta compacta de una fila de catálogo base (partícula, IUM, Oris,
 * Subsistema, etc.): muestra solo el nombre. Por defecto, al hacer click
 * abre un popover flotante anclado a la tarjeta con el detalle completo —
 * y, para Partícula Base/Partículas, su gráfico A/T/S arriba del detalle
 * vía ParticulaVisual. Para Iums y Oris, el click abre un panel flotante
 * (modal grande centrado, mismo diseño que Elementos/Compuestos) en vez
 * del popover chico anclado. Si se pasa `onClick`, ese comportamiento se
 * reemplaza y el click abre el editor completo en la columna derecha
 * (usado por Subsistemas, cuyo gráfico —si aplica— vive dentro de ese
 * editor, no acá).
 */
function BasesItemCard({
  fila,
  bloque,
  original,
  originalIum,
  originalSubsistema,
  onActualizarOris,
  onEliminarOris,
  onActualizarIum,
  onEliminarIum,
  onActualizarSubsistema,
  onEliminarSubsistema,
  onSelectCriatura,
  autoAbrir,
  onAutoAbierto,
  oris,
  geometriaDe,
}: {
  fila: FilaCatalogo;
  bloque: ClaveCatalogo;
  /** Fila cruda de Supabase — solo presente para "oris", donde hace falta
   *  el objeto completo (no el FilaCatalogo resumido) para abrir OrisEditor
   *  dentro del panel flotante. */
  original?: Oris;
  /** Ídem para "iums": objeto completo para abrir IumEditor dentro de su
   *  propio panel flotante. */
  originalIum?: Ium;
  /** Ídem para "subsistemas": objeto completo para abrir PanelEditorSubsistema
   *  dentro de su propio popover flotante. */
  originalSubsistema?: SubsistemaMagia;
  onActualizarOris?: (id: string, cambios: Partial<Oris>) => void;
  onEliminarOris?: (id: string) => void;
  onActualizarIum?: (id: string, cambios: Partial<Ium>) => void;
  onEliminarIum?: (id: string) => void;
  onActualizarSubsistema?: (id: string, updates: Partial<SubsistemaMagia>) => void;
  onEliminarSubsistema?: (id: string) => void;
  onSelectCriatura?: (id: string) => void;
  /** true en el primer render de la tarjeta de un subsistema recién creado
   *  desde el buscador de "Añadir subsistema" — no hay click del usuario
   *  todavía, así que la tarjeta se auto-abre usando su propio botón como
   *  ancla apenas se monta. */
  autoAbrir?: boolean;
  onAutoAbierto?: () => void;
  /** Catálogo de Oris — solo se usa cuando bloque === "subsistemas", para
   *  que PanelEditorSubsistema pueda resolver "canaliza" a un Oris real. */
  oris?: Oris[];
  /** Resuelve la geometría real (puntual/lineal/red/radial/flexible) de un
   *  Ium por su id — solo se pasa cuando bloque === "iums". Ver
   *  useGeometriaIums.ts. Sin esto, IumVisual cae a su criterio anterior
   *  (orbital genérico) para no romper el render. */
  geometriaDe?: (iumId: string) => { geometria: GeometriaIum };
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const conVisual =
    bloque === "polaridades" || bloque === "particula-base" || bloque === "particulas" || bloque === "iums";
  const esOris = bloque === "oris" && !!original;
  const esIum = bloque === "iums" && !!originalIum;
  const esSubsistema = bloque === "subsistemas" && !!originalSubsistema;
  const esEnergia = bloque === "energias";
  // Polaridades, TASI (particula-base) y Partículas se identifican en la
  // grilla solo por su gráfico (círculo +/−, o letra A/T/S/I de una o
  // varias posiciones), sin nombre en texto al lado — mismo ícono que ya
  // se usaba dentro del popover, ahora también como "chip" cerrado. El
  // resto de bloques sigue mostrando el nombre.
  const soloIcono = bloque === "polaridades" || bloque === "particula-base" || bloque === "particulas";

  useEffect(() => {
    if (autoAbrir && botonRef.current) {
      setAnchor(botonRef.current);
      onAutoAbierto?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAbrir]);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        title={fila.nombre}
        className={
          soloIcono
            ? `inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80 ${
                anchor ? "ring-2 ring-primary/30" : ""
              }`
            : `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-bold tracking-wide transition-colors truncate max-w-full ${
                anchor
                  ? "text-primary border border-primary/40 ring-2 ring-primary/30"
                  : "hover:bg-primary/10 text-primary/70 border border-primary/15"
              }`
        }
      >
        {soloIcono ? (
          bloque === "polaridades" ? (
            <PoloVisual signo={(fila as FilaPolaridad).signo} size={36} />
          ) : bloque === "particula-base" ? (
            <ParticulaVisual formula={(fila as FilaParticulaBase).letra} size={36} />
          ) : (
            // "particulas": particulaAFilaCatalogo pone la fórmula (ej. "SAT") en detalle.
            <ParticulaVisual formula={fila.detalle} size={36} />
          )
        ) : (
          <span className="truncate">{fila.nombre}</span>
        )}
      </button>
      {esOris ? (
        anchor && (
          <OrisPanelFlotante
            oris={original!}
            onCerrar={() => setAnchor(null)}
            onActualizar={onActualizarOris ?? (() => {})}
            onEliminar={onEliminarOris}
          />
        )
      ) : esIum ? (
        anchor && (
          <IumPanelFlotante
            ium={originalIum!}
            onCerrar={() => setAnchor(null)}
            onActualizar={onActualizarIum ?? (() => {})}
            onEliminar={onEliminarIum}
            geometriaDe={geometriaDe}
          />
        )
      ) : esSubsistema ? (
        <PopoverFlotante anchor={anchor} onClose={() => setAnchor(null)} width={420} maxHeight={560}>
          <PanelEditorSubsistema
            subsistema={originalSubsistema!}
            onVolver={() => setAnchor(null)}
            onSave={(updates) => onActualizarSubsistema?.(originalSubsistema!.id, updates)}
            onDelete={() => {
              onEliminarSubsistema?.(originalSubsistema!.id);
              setAnchor(null);
            }}
            onSelectCriatura={onSelectCriatura}
            oris={oris}
          />
        </PopoverFlotante>
      ) : esEnergia ? (
        <PopoverFlotante anchor={anchor} onClose={() => setAnchor(null)} width={620} maxHeight={560}>
          <EnergiaFichaContent contexto={(fila as FilaEnergia).contexto} />
        </PopoverFlotante>
      ) : (
        <PopoverFlotante
          anchor={anchor}
          onClose={() => setAnchor(null)}
          width={conVisual ? 420 : 280}
          maxHeight={340}
        >
          {conVisual ? (
            <div className="flex flex-col md:flex-row gap-3">
              <div className="shrink-0 flex items-center justify-center w-full md:w-[140px]">
                {bloque === "polaridades" ? (
                  <PoloVisual signo={(fila as FilaPolaridad).signo} size={88} />
                ) : bloque === "particula-base" ? (
                  <ParticulaVisual formula={(fila as FilaParticulaBase).letra} size={88} />
                ) : (
                  // "particulas": particulaAFilaCatalogo pone la fórmula (ej. "SAT") en detalle.
                  <ParticulaVisual formula={fila.detalle} size={88} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-primary">{fila.nombre}</p>
                <p className="text-xs text-primary/70 leading-relaxed">{fila.detalle}</p>
                {fila.extra && <p className="text-xs text-primary/40 leading-relaxed">{fila.extra}</p>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-primary">{fila.nombre}</p>
              <p className="text-xs text-primary/70 leading-relaxed">{fila.detalle}</p>
              {fila.extra && <p className="text-xs text-primary/40 leading-relaxed">{fila.extra}</p>}
            </div>
          )}
        </PopoverFlotante>
      )}
    </>
  );
}

/**
 * Detalle editable de un concepto, para la columna derecha. Mismo patrón
 * de header que OrisEditor (volver + guardado al perder foco / on change),
 * pero sin fila de metadatos — un concepto es solo título + contenido.
 */
function ConceptoEditor({
  concepto,
  onBack,
  onActualizar,
  onEliminar,
  embedded,
}: {
  concepto: FisicaConcepto;
  onBack: () => void;
  onActualizar: (id: string, cambios: Partial<FisicaConcepto>) => void;
  onEliminar?: (id: string) => void;
  /** Cuando se renderiza dentro de la vista de todos los conceptos (varios
   *  apilados): oculta el botón "volver" individual y usa un editor más
   *  bajo, ya que ahí se vuelve una sola vez desde el header general. */
  embedded?: boolean;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [local, setLocal] = useState(concepto);
  // Último `contenido` (y demás campos) que ESTE editor mandó a persist(),
  // justo antes de confirmar. Mismo patrón que lastSavedContentRef en
  // EditorCapitulos.tsx: sin esto, el useEffect de abajo no puede
  // distinguir un refresh externo real (otra pestaña, otro dispositivo)
  // del eco del propio persist() — que sube por onActualizar/
  // setConceptosLocal y vuelve como una nueva identidad de `concepto`,
  // pisando `local` con un valor potencialmente más viejo que lo que el
  // usuario ya siguió escribiendo mientras el guardado estaba en vuelo.
  // Esto es lo que causaba el salto de cursor al tipear.
  const lastSavedRef = useRef<FisicaConcepto>(concepto);

  useEffect(() => {
    if (
      concepto.id === lastSavedRef.current.id &&
      concepto.titulo === lastSavedRef.current.titulo &&
      concepto.contenido === lastSavedRef.current.contenido
    ) {
      // Eco del propio guardado: ya lo tenemos reflejado en `local`
      // (posiblemente con texto más nuevo que el usuario tipeó después de
      // que este guardado arrancara) — no lo pisamos.
      return;
    }
    setLocal(concepto);
    lastSavedRef.current = concepto;
  }, [concepto]);

  async function persist(cambios: Partial<FisicaConcepto>) {
    const { error } = await supabase
      .from("fisica_conceptos")
      .update(cambios)
      .eq("id", concepto.id);
    if (!error) {
      // Marcar ANTES de onActualizar: ese callback termina generando la
      // nueva prop `concepto` que dispara el useEffect de arriba — hace
      // falta que lastSavedRef ya refleje este guardado para que se
      // reconozca como eco propio.
      lastSavedRef.current = { ...lastSavedRef.current, ...cambios };
      onActualizar(concepto.id, cambios);
    }
  }

  // Debounce del guardado de contenido: antes, persist({contenido: v}) se
  // llamaba en CADA tecla (ver onChange de RichEditor más abajo), lo que
  // disparaba un UPDATE a Supabase por letra tipeada. Además de ser
  // innecesariamente costoso, con red variable el orden de resolución de
  // esos UPDATEs en paralelo no está garantizado — el mismo problema que
  // describe el comentario de doSave/isSavingRef en EditorCapitulos.tsx.
  // Un guardado que resuelve tarde y pisa uno más nuevo es otra vía posible
  // hacia el mismo síntoma (cursor saltando / texto retrocediendo).
  const persistContenidoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingContenidoRef = useRef<string | null>(null);
  function persistContenidoDebounced(v: string) {
    pendingContenidoRef.current = v;
    if (persistContenidoTimerRef.current) {
      clearTimeout(persistContenidoTimerRef.current);
    }
    persistContenidoTimerRef.current = setTimeout(() => {
      const val = pendingContenidoRef.current;
      pendingContenidoRef.current = null;
      if (val !== null) void persist({ contenido: val });
    }, 800);
  }
  useEffect(() => {
    return () => {
      if (persistContenidoTimerRef.current) {
        clearTimeout(persistContenidoTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={
        embedded
          ? "group flex flex-col gap-2 pb-6 border-b border-primary/10"
          : "flex-1 flex flex-col min-h-0 overflow-hidden"
      }
    >
      <ConfirmModal />
      <div
        className={
          embedded
            ? "shrink-0 flex items-center gap-1.5"
            : "shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-primary/10"
        }
        style={embedded ? undefined : { background: "var(--bg-main)" }}
      >
        {!embedded && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer"
          >
            <ChevronLeft size={12} />
          </button>
        )}

        {!embedded && (
          <span className="shrink-0 text-micro font-black uppercase tracking-widest text-primary/30 px-1.5 py-0.5 rounded border border-primary/15">
            {concepto.bloque}
          </span>
        )}

        <input
          value={local.titulo}
          onChange={(e) => setLocal((p) => ({ ...p, titulo: e.target.value }))}
          onBlur={() => persist({ titulo: local.titulo })}
          placeholder="Título del concepto"
          className={
            embedded
              ? "flex-1 min-w-0 bg-transparent text-sm font-black uppercase tracking-[0.1em] text-primary/70 outline-none placeholder:text-primary/25 placeholder:normal-case placeholder:font-normal"
              : "flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          }
        />

        {onEliminar && (
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: "Eliminar concepto",
                message: `¿Eliminar "${local.titulo || "Sin título"}"? Esta acción no se puede deshacer.`,
              });
              if (ok) onEliminar(concepto.id);
            }}
            className={
              embedded
                ? "shrink-0 flex items-center justify-center w-6 h-6 rounded text-primary/0 group-hover:text-primary/30 hover:!text-red-400 transition-all cursor-pointer"
                : "shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
            }
            title="Eliminar concepto"
          >
            <Trash2 size={embedded ? 12 : 11} />
          </button>
        )}
      </div>

      <div
        className={
          embedded
            ? "max-h-[40vh] overflow-y-auto"
            : "flex-1 min-h-0 overflow-y-auto p-2.5"
        }
      >
        <div className="text-sm">
          <RichEditor
            minHeight={embedded ? "6rem" : "16rem"}
            placeholder="Contenido del concepto…"
            value={local.contenido}
            onChange={(v) => {
              setLocal((p) => ({ ...p, contenido: v }));
              persistContenidoDebounced(v);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export function FisicaPage({
  polaridades,
  loadingPolaridades,
  particulaBase,
  loadingParticulaBase,
  particulas,
  loadingParticulas,
  iums,
  loadingIums,
  onActualizarIum,
  onEliminarIum,
  oris,
  loadingOris,
  creatingOris,
  onCreateOris,
  onActualizarOris,
  onEliminarOris,
  seleccionarOrisId,
  conceptos,
  loadingConceptos,
  onActualizarConcepto,
  onImportarFisica,
  onActualizarVariosFisica,
  subsistemas,
  loadingSubsistemas,
  creandoSubsistema,
  onCrearSubsistema,
  onActualizarSubsistema,
  onEliminarSubsistema,
  onSelectCriatura,
  onOrisSeleccionadoChange,
  energias,
  loadingEnergias,
}: Props) {
  // Geometría real de cada Ium (v_iums_geometria_canonica_v1) — una sola
  // carga acá arriba, reusada por todas las BasesItemCard de "iums" en vez
  // de que cada tarjeta dispare su propio fetch.
  const { geometriaDe } = useGeometriaIums();

  const [seleccion, setSeleccionRaw] = useState<Seleccion>(
    seleccionarOrisId ? { tipo: "oris", id: seleccionarOrisId } : null,
  );
  // Notifica hacia afuera (RunasPage → useMagiaSeccionStore) solo cuando
  // el Oris seleccionado cambia — no cuando se selecciona un concepto,
  // subsistema o "todas-bases", que no tienen deep-link propio hoy.
  const setSeleccion = (valor: Seleccion | ((actual: Seleccion) => Seleccion)) => {
    setSeleccionRaw((actual) => {
      const nuevo = typeof valor === "function" ? valor(actual) : valor;
      if (onOrisSeleccionadoChange) {
        if (nuevo?.tipo === "oris") onOrisSeleccionadoChange(nuevo.id);
        else if (actual?.tipo === "oris") onOrisSeleccionadoChange(null);
      }
      return nuevo;
    });
  };
  const [conceptosLocal, setConceptosLocal] = useState<FisicaConcepto[]>(conceptos);
  useEffect(() => setConceptosLocal(conceptos), [conceptos]);

  useEffect(() => {
    if (seleccionarOrisId) setSeleccion({ tipo: "oris", id: seleccionarOrisId });
  }, [seleccionarOrisId]);

  const [agregandoConceptoDe, setAgregandoConceptoDe] = useState<string | null>(null);
  const [creandoSeccion, setCreandoSeccion] = useState(false);
  const [nuevaSeccionNombre, setNuevaSeccionNombre] = useState("");
  const [mostrarInputSeccion, setMostrarInputSeccion] = useState(false);

  // ── Subida de JSON (mismo patrón que "Subir JSON" en Elementos) ─────────
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null);

  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || !onImportarFisica) return;

    setImportando(true);
    setMensajeImportacion(null);
    try {
      const texto = await archivo.text();
      const { orisNuevos, orisActualizar, conceptosNuevos, conceptosActualizar } = parsearArchivoFisicaJSON(
        texto,
        oris,
        conceptosLocal,
      );

      const partes: string[] = [];

      if (orisNuevos.length > 0 || conceptosNuevos.length > 0) {
        const insertados = await onImportarFisica(orisNuevos, conceptosNuevos);
        partes.push(`${insertados} registro${insertados === 1 ? "" : "s"} nuevo${insertados === 1 ? "" : "s"} importado${insertados === 1 ? "" : "s"}`);
      }

      if (orisActualizar.length > 0 || conceptosActualizar.length > 0) {
        if (onActualizarVariosFisica) {
          const actualizados = await onActualizarVariosFisica(orisActualizar, conceptosActualizar);
          partes.push(`${actualizados} registro${actualizados === 1 ? "" : "s"} existente${actualizados === 1 ? "" : "s"} actualizado${actualizados === 1 ? "" : "s"}`);
        } else {
          const total = orisActualizar.length + conceptosActualizar.length;
          partes.push(`${total} ya exist${total === 1 ? "e" : "en"} y no se actualiz${total === 1 ? "ó" : "aron"} (falta onActualizarVariosFisica)`);
        }
      }

      if (partes.length === 0) partes.push("El archivo no traía registros.");
      setMensajeImportacion(partes.join(" · "));
    } catch (err) {
      console.error("[FisicaPage] error importando JSON:", err);
      setMensajeImportacion(err instanceof Error ? `Error: ${err.message}` : "Error al leer el archivo.");
    } finally {
      setImportando(false);
    }
  }

  async function handleAgregarConcepto(bloque: string) {
    setAgregandoConceptoDe(bloque);
    try {
      const orden =
        Math.max(0, ...conceptosLocal.filter((c) => c.bloque === bloque).map((c) => c.orden)) + 1;
      const { data, error } = await supabase
        .from(FISICA_CONCEPTOS_CONFIG.tabla)
        .insert([{ bloque, titulo: "Nuevo concepto", contenido: "", orden }])
        .select()
        .single();
      if (error) throw error;
      const nuevo = data as FisicaConcepto;
      setConceptosLocal((prev) => [...prev, nuevo]);
      setSeleccion({ tipo: "concepto", id: nuevo.id });
    } catch (e) {
      console.error("[FisicaPage] error creando concepto:", e);
    } finally {
      setAgregandoConceptoDe(null);
    }
  }

  async function handleCrearSeccion() {
    const nombre = nuevaSeccionNombre.trim();
    if (!nombre) return;
    setCreandoSeccion(true);
    try {
      const { data, error } = await supabase
        .from(FISICA_CONCEPTOS_CONFIG.tabla)
        .insert([{ bloque: nombre, titulo: "Nuevo concepto", contenido: "", orden: 1 }])
        .select()
        .single();
      if (error) throw error;
      const nuevo = data as FisicaConcepto;
      setConceptosLocal((prev) => [...prev, nuevo]);
      setSeleccion({ tipo: "concepto", id: nuevo.id });
      setNuevaSeccionNombre("");
      setMostrarInputSeccion(false);
    } catch (e) {
      console.error("[FisicaPage] error creando sección:", e);
    } finally {
      setCreandoSeccion(false);
    }
  }

  async function handleEliminarConcepto(id: string) {
    try {
      const { error } = await supabase
        .from(FISICA_CONCEPTOS_CONFIG.tabla)
        .delete()
        .eq("id", id);
      if (error) throw error;
      setConceptosLocal((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("[FisicaPage] error eliminando concepto:", e);
    }
  }

  const orisActivo = useMemo(
    () => (seleccion?.tipo === "oris" ? oris.find((o) => o.id === seleccion.id) ?? null : null),
    [oris, seleccion],
  );

  const conceptoActivo = useMemo(
    () =>
      seleccion?.tipo === "concepto"
        ? conceptosLocal.find((c) => c.id === seleccion.id) ?? null
        : null,
    [conceptosLocal, seleccion],
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Panel flotante de Oris cuando se abre por deep-link
          (seleccionarOrisId), fuera del flujo de columnas — las tarjetas
          de la lista abren el mismo OrisPanelFlotante desde sí mismas
          (ver BasesItemCard), este es solo el caso sin tarjeta. */}
      {orisActivo && (
        <OrisPanelFlotante
          oris={orisActivo}
          onCerrar={() => setSeleccion({ tipo: "todas-bases" })}
          onActualizar={onActualizarOris}
          onEliminar={onEliminarOris}
        />
      )}

      {mensajeImportacion && (
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-primary/10 text-micro text-primary/60 bg-primary/[0.03]">
          <span className="min-w-0">{mensajeImportacion}</span>
          <button
            type="button"
            onClick={() => setMensajeImportacion(null)}
            className="shrink-0 text-primary/30 hover:text-primary/60 cursor-pointer"
            title="Cerrar"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Contenido: ocupa todo el ancho ahora que no hay columna lateral. */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0">
        {conceptoActivo ? (
          <ConceptoEditor
            concepto={conceptoActivo}
            onBack={() => setSeleccion({ tipo: "todas-bases" })}
            onActualizar={(id, cambios) => {
              setConceptosLocal((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
              );
              onActualizarConcepto(id, cambios);
            }}
            onEliminar={(id) => {
              handleEliminarConcepto(id);
              setSeleccion({ tipo: "todas-bases" });
            }}
          />
        ) : (
          // Antes acá había 2 columnas: catálogos base a la izquierda y
          // TodosLosConceptosView (RichEditor de fisica_conceptos) a la
          // derecha. Se quitó el bloque de conceptos — ver comentario en
          // los imports — así que ahora TodasLasBasesView ocupa todo el
          // ancho disponible.
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TodasLasBasesView
              polaridades={polaridades}
              particulaBase={particulaBase}
              particulas={particulas}
              iums={iums}
              oris={oris}
              subsistemas={subsistemas}
              energias={energias}
              onCreateOris={onCreateOris}
              creatingOris={creatingOris}
              onActualizarOris={onActualizarOris}
              onEliminarOris={onEliminarOris}
              onActualizarIum={onActualizarIum ?? (() => {})}
              onEliminarIum={onEliminarIum}
              onActualizarSubsistema={onActualizarSubsistema}
              onEliminarSubsistema={onEliminarSubsistema}
              onSelectCriatura={onSelectCriatura}
              onCrearSubsistema={onCrearSubsistema}
              creandoSubsistema={creandoSubsistema}
              geometriaDe={geometriaDe}
            />
          </div>
        )}
      </div>
    </div>
  );
}
