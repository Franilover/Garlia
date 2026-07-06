"use client";

/**
 * HechizosSection
 * ───────────────────────────────────────────────────────────────────────────
 * Wrapper delgado sobre EditorHechizos (que ya trae su propia columna de
 * lista + editor) fijando modo="hechizos". Sección independiente en el menú,
 * igual que Personajes/Criaturas — sin tabs ni barra extra.
 */

import React from "react";

import { EditorHechizos } from "@/features/editorGarlia/views/EditorHechizos";

import { siblingsOf } from "../shared/mundoMenuGroups";
import { SiblingSectionTabs } from "../shared/SiblingSectionTabs";
import { useMundoNavigation } from "../store/useMundoNavigationStore";

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function HechizosSection({ selectedId, navKey }: Props) {
  const openEntity = useMundoNavigation((s) => s.openEntity);

  return (
    <EditorHechizos
      key={navKey}
      modo="hechizos"
      initialSelectedId={selectedId ?? undefined}
      onSelectedIdChange={(id) => {
        if (id) openEntity("hechizos", id);
      }}
      renderSiblingTabs={() => (
        <SiblingSectionTabs active="hechizos" items={siblingsOf("hechizos")} />
      )}
    />
  );
}
