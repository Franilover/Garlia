"use client";

/**
 * EnsayosGosWidget
 * ───────────────────────────────────────────────────────────────────────────
 * Puente entre Ensayos (feature independiente de notas tipo Obsidian) y el
 * editor de Garlia: muestra en la tab "Inicio" los ensayos etiquetados "GOS"
 * (case-insensitive). Al clickear uno, el padre (MundoHomeContent) abre
 * <EnsayoGosScreen /> — el editor de ensayos completo reusado DENTRO de
 * /myself/garlia — vía la prop onOpen, sin salir de la página.
 *
 * Es sólo lectura (useSupabaseData("ensayos")) — no hay estado compartido ni
 * importa nada de src/features/ensayos más que el tipo de fila.
 */

import { FileText } from "lucide-react";
import React, { useMemo } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

interface EnsayoRow {
  id: string;
  titulo?: string;
  tags?: string[];
}

interface Props {
  onOpen: (ensayoId: string) => void;
}

export function EnsayosGosWidget({ onOpen }: Props) {
  const { data, loading } = useSupabaseData<EnsayoRow>("ensayos");

  const gosEnsayos = useMemo(
    () =>
      (data ?? []).filter((e) =>
        (e.tags ?? []).some((t) => t.trim().toLowerCase() === "gos"),
      ),
    [data],
  );

  if (!loading && gosEnsayos.length === 0) return null;

  return (
    <div>
      <h2 className="text-micro font-black uppercase tracking-widest text-primary/30 mb-3">
        Ensayos · GOS
      </h2>
      {loading ? (
        <div className="text-xs text-primary/30">Cargando…</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {gosEnsayos.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpen(e.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/10 bg-primary/[0.02] hover:bg-primary/5 hover:border-primary/25 transition-colors text-xs font-semibold text-primary/80"
            >
              <FileText size={12} className="text-primary/40 shrink-0" />
              {e.titulo || "Sin título"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

