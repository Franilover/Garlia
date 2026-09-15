"use client";
import React from "react";

import MenuBase from "@/layout/MenuBase";

import { SECCIONES_BIBLIOTECA } from "./secciones";

/**
 * Hub de la Biblioteca (/garlia/biblioteca).
 *
 * Mismo patrón que menuWiki: MenuBase con una card por sección. Sólo navega,
 * no carga contenido — cada sección se encarga de lo suyo.
 */
export default function MenuBibliotecaPage() {
  const items = SECCIONES_BIBLIOTECA.map(
    ({ href, titulo, icon: Icon, pageKey }, i) => ({
      href,
      title: titulo,
      icon: <Icon />,
      pageKey,
      delay: 0.1 + i * 0.05,
    }),
  );

  return <MenuBase items={items} titulo="Biblioteca" />;
}
