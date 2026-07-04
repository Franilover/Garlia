"use client";

/**
 * PersonajeHechizos.tsx
 * ──────────────────────
 * Hechizos disponibles (filtrados por grupos de la especie) con toggle
 * para asociarlos/desasociarlos del personaje.
 * La lógica de datos vive en useHechizosDelPersonaje.
 *
 * Solo se monta cuando `especieEsMagica` es true (ver PersonajeSidebarPanel).
 *
 * Ruta: src/features/editorGarlia/components/Personajes/PersonajeHechizos.tsx
 */

import { Sparkles } from "lucide-react";

import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { useHechizosDelPersonaje } from "@/features/editorGarlia/hooks/personajes/useHechizosDelPersonaje";

// ─── Componente ───────────────────────────────────────────────────────────────

export function PersonajeHechizos({
  personajeId,
  grupoIds,
}: {
  personajeId: string;
  grupoIds: string[];
}) {
  const { disponibles, selectedIds, loading, saving, toggle } =
    useHechizosDelPersonaje(personajeId, grupoIds);

  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <SeccionEntidad
        allEntities={disponibles}
        emptyLabel="Sin hechizos"
        fallbackIcon={<Sparkles size={10} />}
        icon={<Sparkles size={10} />}
        label="Hechizos"
        loading={loading}
        saving={saving}
        selectedIds={selectedIds}
        onToggle={toggle}
      />
    </div>
  );
}
