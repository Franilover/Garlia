"use client";

/**
 * GruposSection
 * ───────────────────────────────────────────────────────────────────────────
 * A diferencia de personajes/criaturas/items/reinos/ciudades, `EditorGrupo.tsx`
 * ya expone `EditorGrupoStandalone` con su propia lista + editor interno
 * (usa `useGrupos()` para cargar todo). No hace falta separar lista/editor
 * acá — solo reconectar su navegación de miembros al store nuevo.
 */

import { EditorGrupoStandalone } from "@/features/editorGarlia/views/EditorGrupo";

import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface Props {
  selectedId: string | null;
  navKey: number;
}

const TABLA_TO_SECTION: Record<string, SectionKey> = {
  personajes: "personajes",
  criaturas: "criaturas",
  items: "items",
  hechizos: "magia",
  dones: "magia",
  runas: "magia",
};

export function GruposSection({ selectedId, navKey }: Props) {
  const openEntity = useMundoNavigation((s) => s.openEntity);

  return (
    <EditorGrupoStandalone
      key={navKey}
      initialSelectedId={selectedId}
      onClickMiembro={(id, tabla) => {
        const section = TABLA_TO_SECTION[tabla];
        if (!section) return;
        const magiaTipo = ["hechizos", "dones", "runas"].includes(tabla)
          ? (tabla as "hechizos" | "dones" | "runas")
          : undefined;
        openEntity(section, id, magiaTipo);
      }}
    />
  );
}
