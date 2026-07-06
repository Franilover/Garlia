"use client";

/**
 * RunasSection
 * ───────────────────────────────────────────────────────────────────────────
 * Wrapper delgado sobre EditorHechizos fijando modo="runas". Sección
 * independiente en el menú, igual que Personajes/Criaturas.
 */

import React from "react";

import { EditorHechizos } from "@/features/editorGarlia/views/EditorHechizos";

import { useMundoNavigation } from "../store/useMundoNavigationStore";

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function RunasSection({ selectedId, navKey }: Props) {
  const openEntity = useMundoNavigation((s) => s.openEntity);

  return (
    <EditorHechizos
      key={navKey}
      modo="runas"
      initialSelectedId={selectedId ?? undefined}
      onSelectedIdChange={(id) => {
        if (id) openEntity("runas", id);
      }}
    />
  );
}
