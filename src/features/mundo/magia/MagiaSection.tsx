"use client";

/**
 * MagiaSection
 * ───────────────────────────────────────────────────────────────────────────
 * `EditorHechizos.tsx` ya maneja los 3 modos (hechizos/dones/runas) con un
 * solo componente parametrizado por `modo`. Acá solo agregamos las tabs
 * internas para elegir el tipo, conectadas a `selectMagiaTipo()` del store.
 */

import { ScrollText, Sparkles, Star } from "lucide-react";
import React from "react";

import { EditorHechizos } from "@/features/editorGarlia/views/EditorHechizos";

import { useMundoNavigation, type MagiaTipo } from "../store/useMundoNavigationStore";

interface Props {
  tipo: MagiaTipo;
  selectedId: string | null;
  navKey: number;
}

const TIPOS: { key: MagiaTipo; label: string; Icon: React.ElementType }[] = [
  { key: "hechizos", label: "Hechizos", Icon: Sparkles },
  { key: "dones", label: "Dones", Icon: Star },
  { key: "runas", label: "Runas", Icon: ScrollText },
];

export function MagiaSection({ tipo, selectedId, navKey }: Props) {
  const selectMagiaTipo = useMundoNavigation((s) => s.selectMagiaTipo);
  const openEntity = useMundoNavigation((s) => s.openEntity);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-primary/10">
        {TIPOS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectMagiaTipo(key)}
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors",
              tipo === key
                ? "bg-primary/10 text-primary"
                : "text-primary/40 hover:text-primary/70 hover:bg-primary/5",
            ].join(" ")}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <EditorHechizos
          key={`${tipo}-${navKey}`}
          modo={tipo}
          initialSelectedId={selectedId ?? undefined}
          onSelectedIdChange={(id) => {
            if (id) openEntity("magia", id, tipo);
          }}
        />
      </div>
    </div>
  );
}
