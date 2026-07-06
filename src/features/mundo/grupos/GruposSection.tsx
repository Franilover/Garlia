"use client";

/**
 * GruposSection
 * ───────────────────────────────────────────────────────────────────────────
 * A diferencia de personajes/criaturas/items/reinos/ciudades, `EditorGrupo.tsx`
 * ya expone `EditorGrupoStandalone` con su propia lista + editor interno
 * (usa `useGrupos()` para cargar todo). No hace falta separar lista/editor
 * acá — solo reconectar su navegación de miembros al store nuevo.
 */

import React from "react";

import { EditorGrupoStandalone } from "@/features/editorGarlia/views/EditorGrupo";

import { siblingsOf } from "../shared/mundoMenuGroups";
import { SiblingSectionTabs } from "../shared/SiblingSectionTabs";
import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface Props {
  selectedId: string | null;
  navKey: number;
}

const TABLA_TO_SECTION: Record<string, SectionKey> = {
  personajes: "personajes",
  criaturas: "criaturas",
  items: "items",
  hechizos: "hechizos",
  dones: "dones",
  runas: "runas",
};

export function GruposSection({ selectedId, navKey }: Props) {
  const openEntity = useMundoNavigation((s) => s.openEntity);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <EditorGrupoStandalone
        key={navKey}
        initialSelectedId={selectedId}
        renderSiblingTabs={() => (
          <SiblingSectionTabs active="grupos" items={siblingsOf("grupos")} />
        )}
        onClickMiembro={(id, tabla) => {
          const section = TABLA_TO_SECTION[tabla];
          if (!section) return;
          openEntity(section, id);
        }}
      />
    </div>
  );
}
