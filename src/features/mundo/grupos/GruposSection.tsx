"use client";

/**
 * GruposSection
 * ───────────────────────────────────────────────────────────────────────────
 * A diferencia de personajes/criaturas/items/reinos/ciudades, `EditorGrupo.tsx`
 * ya expone `EditorGrupoStandalone` con su propia lista + editor interno
 * (usa `useGrupos()` para cargar todo). No hace falta separar lista/editor
 * acá — solo reconectar su navegación de miembros al store nuevo.
 */

import { X } from "lucide-react";
import React from "react";

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
  const goToMenu = useMundoNavigation((s) => s.goToMenu);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 border-b border-primary/10">
        <button
          type="button"
          onClick={goToMenu}
          className="p-1.5 rounded-lg text-primary/40 hover:bg-primary/10 hover:text-primary transition-colors"
          aria-label="Volver a secciones"
        >
          <X size={14} />
        </button>
        <span className="text-micro font-black uppercase tracking-widest text-primary/40">
          Grupos
        </span>
      </div>
      <div className="flex-1 flex min-h-0 overflow-hidden">
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
      </div>
    </div>
  );
}
