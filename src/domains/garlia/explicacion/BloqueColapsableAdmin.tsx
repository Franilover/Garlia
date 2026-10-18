"use client";

/**
 * BloqueColapsableAdmin.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Envuelve el header (título + ToggleMaestroAdmin) y el contenido de una
 * galería admin. Cuando el maestro está OCULTO, arranca colapsado. Cuando
 * está VISIBLE, siempre queda expandido.
 *
 * Migrado a PanelColapsable (modo controlado con headerNode) —
 * sincronización y animación de altura unificadas.
 */

import React from "react";

import { PanelColapsable } from "@/domains/garlia/_shared/PanelColapsable";

export function BloqueColapsableAdmin({
  maestroVisible,
  header,
  children,
}: {
  maestroVisible: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PanelColapsable
      headerNode={header}
      open={maestroVisible}
    >
      {children}
      {!maestroVisible && (
        <p
          className="text-[10px] mt-1"
          style={{ color: "color-mix(in srgb, #b45309 60%, transparent)" }}
        >
          Oculta al público · click para ver y gestionar excepciones
        </p>
      )}
    </PanelColapsable>
  );
}
