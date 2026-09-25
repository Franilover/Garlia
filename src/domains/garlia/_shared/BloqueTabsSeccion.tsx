"use client";

/**
 * BloqueTabsSeccion.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Generalización de BloqueTabsProcesos (que vivía inline en
 * elementos/ElementosPage.tsx, para Procesos/Reacciones/Fenómenos): tabs de
 * ancho completo donde solo una sección está visible a la vez, con las
 * demás como título clicable al lado.
 *
 * Pedido 2026-09-25: además de cambiar de tab, el título de la sección
 * ACTIVA es ahora el mismo botón-con-menú de CabeceraSeccionConMenu
 * (Añadir/Editar/Seleccionar agrupación) — antes, al pasar Procesos/
 * Reacciones/Fenómenos a tabs, ese menú se había perdido (quedó solo
 * título+contador). Ahora cada tab recibe el mismo shape de props que un
 * bloque de FilaAsimetrica (items/onAñadir/onRenombrar/onEliminar/
 * añadiendo/agrupación/filtros) y por debajo arma su propio
 * CabeceraSeccionConMenu — mismo componente, mismo comportamiento, que
 * FilaAsimetrica usa para Compuestos/Estructuras/Materiales.
 *
 * Los tabs INACTIVOS muestran solo texto + contador (clic = cambiar de
 * tab, no abre menú) — abrir su menú de Añadir/Editar requiere primero
 * activarlos, mismo criterio que "seleccionar antes de operar".
 *
 * Los `filtros` de la sección activa (dropdowns, toggles) se dibujan
 * DEBAJO de la fila de tabs, centrados — mismo lugar que ocupan hoy bajo
 * el título en CabeceraSeccionConMenu standalone.
 *
 * Usado por:
 *  - elementos/ElementosPage.tsx → Compuestos | Estructuras | Materiales
 *  - elementos/ElementosPage.tsx → Procesos | Reacciones | Fenómenos
 *  - biologia/BiologiaPage.tsx   → Células | Tejidos | Órganos | Sistemas
 *                                  | Organismos
 */

import React, { useState } from "react";

import { CabeceraSeccionConMenu, type ItemEditable } from "./CabeceraSeccionConMenu";

export interface TabSeccion {
  key: string;
  titulo: string;
  total: number;
  contenido: React.ReactNode;
  /** Mismo contrato que Bloque en FilaAsimetrica.tsx — ver ese archivo y
   *  CabeceraSeccionConMenu.tsx para el detalle de cada prop. Si se omiten
   *  todas, el título de este tab activo queda sin menú (igual que un
   *  bloque de FilaAsimetrica sin items/onAñadir/onRenombrar/onEliminar). */
  items?: ItemEditable[];
  onAñadir?: () => void | Promise<void>;
  onRenombrar?: (id: string, nuevoNombre: string) => void | Promise<void>;
  onEliminar?: (id: string) => void | Promise<void>;
  añadiendo?: boolean;
  agrupacionActiva?: string | null;
  onSeleccionarAgrupacion?: (clave: string | null) => void;
  filtros?: React.ReactNode;
}

export function BloqueTabsSeccion({
  tabs,
  tabInicial,
}: {
  tabs: TabSeccion[];
  /** key del tab que arranca activo — default: el primero de la lista. */
  tabInicial?: string;
}) {
  const [tabActivo, setTabActivo] = useState<string>(tabInicial ?? tabs[0]?.key);
  const activo = tabs.find((t) => t.key === tabActivo) ?? tabs[0];

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span aria-hidden className="h-px flex-1 bg-primary/15" />
        <div className="flex items-center gap-3">
          {tabs.map((tab) =>
            tab.key === activo.key ? (
              // Tab activo: título real con menú Añadir/Editar/Agrupación
              // (CabeceraSeccionConMenu, align="left" para no forzar su
              // centrado propio dentro de esta fila de tabs en línea). El
              // contador va en un <span> hermano aparte (no dentro de
              // `titulo`) para no ensuciar el string que también usa el
              // modal "Editar {titulo}" de CabeceraSeccionConMenu.
              <div key={tab.key} className="flex items-center gap-1.5">
                <CabeceraSeccionConMenu
                  titulo={tab.titulo}
                  items={tab.items}
                  onAñadir={tab.onAñadir}
                  onRenombrar={tab.onRenombrar}
                  onEliminar={tab.onEliminar}
                  añadiendo={tab.añadiendo}
                  agrupacionActiva={tab.agrupacionActiva}
                  onSeleccionarAgrupacion={tab.onSeleccionarAgrupacion}
                  align="left"
                />
                <span className="text-micro tabular-nums font-bold text-primary/60">
                  {tab.total}
                </span>
              </div>
            ) : (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTabActivo(tab.key)}
                className="flex items-center gap-1.5 text-micro font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary/70 transition-colors cursor-pointer"
              >
                {tab.titulo}
                <span className="tabular-nums font-bold tracking-normal opacity-60">
                  {tab.total}
                </span>
              </button>
            ),
          )}
        </div>
        <span aria-hidden className="h-px flex-1 bg-primary/15" />
      </div>

      {/* Filtros de la sección activa — mismo lugar que ocupaban bajo el
          título en CabeceraSeccionConMenu standalone (ver FilaAsimetrica). */}
      {activo.filtros && (
        <div className="mb-2 px-1 flex flex-wrap items-center justify-center gap-1.5">
          {activo.filtros}
        </div>
      )}

      {activo.contenido}
    </div>
  );
}
