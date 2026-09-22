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
 * Por ahora solo está construido el primer tramo (Polaridades → Elementos),
 * que es el que tiene datos reales completos en Supabase y frontend. Las
 * etapas siguientes (Compuestos en adelante) ya NO se dibujan como bloque
 * "Próximamente" en el body — solo quedan referenciadas, atenuadas, en la
 * barra lateral (ver sidebarItems.ts) hasta que tengan su propio contenido.
 *
 * Layout: contenido a la izquierda (ancho, sin acotar a max-w chico) +
 * barra lateral fija de índice a la derecha (solo desktop, lg+).
 */

import React from "react";

import EtapaPolaridades from "./EtapaPolaridades";
import EtapaElementos from "./EtapaElementos";
import { SidebarExplicacion } from "./SidebarExplicacion";

export default function ExplicacionPage() {
  return (
    <div className="mx-auto flex max-w-[1600px] items-start gap-10 px-2 lg:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-14 pt-4 pb-24">
          <EtapaPolaridades />
          <EtapaElementos />
        </div>
      </div>

      <SidebarExplicacion />
    </div>
  );
}
