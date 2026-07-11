"use client";

/**
 * EnsayosGosWidget
 * ───────────────────────────────────────────────────────────────────────────
 * Puente liviano entre Ensayos (/myself/escritorio, feature independiente de
 * notas tipo Obsidian) y el editor de Garlia: muestra en la tab "Inicio" los
 * ensayos etiquetados "GOS" (case-insensitive) y los abre en Ensayos al
 * clickear.
 *
 * Por qué un componente aparte y no meter esto en EntidadesPage/editorGarlia:
 * Ensayos es un feature totalmente independiente (su propia tabla Supabase
 * "ensayos", su propio shell en /myself/escritorio, su propio estado). Mezclar
 * su lógica acá rompería el mismo principio que ya sigue el resto del editor
 * de mundo ("si Criaturas tiene un bug, Personajes no se entera"). Este widget
 * es sólo lectura (useSupabaseData("ensayos")) + navegación — no hay estado
 * compartido ni importa nada de src/features/ensayos.
 *
 * Navegación: EnsayosShell lee el id activo de localStorage("ensayos-active-id")
 * al montar, y escucha el evento "ensayos-open" mientras está montado (mismo
 * mecanismo que ya usa GlobalCommandPalette → goEnsayo). Replicamos ese mismo
 * patrón acá en vez de inventar uno nuevo.
 */

import { FileText } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

interface EnsayoRow {
  id: string;
  titulo?: string;
  tags?: string[];
}

const ENSAYOS_ROUTE = "/myself/escritorio";

function abrirEnsayo(id: string, pathname: string, router: ReturnType<typeof useRouter>) {
  localStorage.setItem("ensayos-active-id", id);
  localStorage.removeItem("ensayos-at-home");
  if (pathname === ENSAYOS_ROUTE) {
    window.dispatchEvent(new CustomEvent("ensayos-open", { detail: { id } }));
  } else {
    router.push(ENSAYOS_ROUTE);
  }
}

export function EnsayosGosWidget() {
  const { data, loading } = useSupabaseData<EnsayoRow>("ensayos");
  const router = useRouter();
  const pathname = usePathname();

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
              onClick={() => abrirEnsayo(e.id, pathname, router)}
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
