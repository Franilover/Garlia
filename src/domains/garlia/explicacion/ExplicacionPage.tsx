"use client";

/**
 * ExplicacionPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza a "Teorías" en /garlia/universo. Página en scroll largo que
 * explica CÓMO SURGE cada cosa en Garlia, tramo por tramo, con gráficos
 * animados reales (no el flujo del Visualizador — este es un componente
 * nuevo e independiente, pensado para enseñar, no para explorar datos).
 *
 * Ruta completa (documentada, construida en etapas):
 *   Polaridades → TASI → Partículas
 *   → Elementos → Compuestos → Estructuras
 *   → Materiales → Objetos
 *   → Células → Tejidos → Órganos → Sistemas → Organismos → Criaturas
 *   → Iums → Oris
 *
 * Por ahora está construido hasta Estructuras (Polaridades → Elementos →
 * Compuestos → Estructuras), estas dos últimas solo con su Bloque 1
 * (diagrama de la lógica, sin galería de datos reales todavía). Las
 * etapas siguientes (Materiales en adelante) ya NO se dibujan como bloque
 * "Próximamente" en el body — solo quedan referenciadas, atenuadas, en la
 * barra lateral (ver sidebarItems.ts) hasta que tengan su propio contenido.
 *
 * Layout: contenido a la izquierda (ancho, sin acotar a max-w chico) +
 * barra lateral fija de índice a la derecha (solo desktop, lg+).
 */

import React from "react";

import EtapaPolaridades from "./EtapaPolaridades";
import EtapaElementos from "./EtapaElementos";
import EtapaCompuestos from "./EtapaCompuestos";
import EtapaEstructuras from "./EtapaEstructuras";
import { SidebarExplicacion } from "./SidebarExplicacion";

export default function ExplicacionPage() {
  return (
    <div className="mx-auto flex max-w-[1600px] items-start gap-10 px-2 lg:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-14 pt-4 pb-24">
          <EtapaPolaridades />

          {/* Elementos y Compuestos en fila (desktop, lg+), Estructuras
              abajo ocupando todo el ancho. En móvil/tablet todo apilado. */}
          <div className="flex flex-col gap-14">
            <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:gap-6">
              <div className="lg:min-w-0 lg:flex-1">
                <EtapaElementos />
              </div>
              <div className="lg:min-w-0 lg:flex-1">
                <EtapaCompuestos />
              </div>
            </div>
            <EtapaEstructuras />
          </div>
        </div>
      </div>

      <SidebarExplicacion />
    </div>
  );
}
