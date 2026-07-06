"use client";

/**
 * PersonajeEditor
 * ───────────────────────────────────────────────────────────────────────────
 * El formulario real (usePersonajeForm, PersonajeSidebarPanel, BloqueDones,
 * etc.) ya estaba bien factorizado en EditorPersonaje.tsx — no hace falta
 * reescribirlo. Lo único que cambia es cómo navega: antes recibía funciones
 * sueltas (onNavigate, onSelectPersonaje, onOpenGrupo...) que subían como
 * props desde el componente raíz de 2395 líneas. Ahora todas esas funciones
 * son una sola llamada a openEntity() del store.
 */

import { EditorPersonaje } from "@/features/editorGarlia/views/EditorPersonaje";

import { useMundoNavigation } from "../store/useMundoNavigationStore";

interface Personaje {
  id: string;
  nombre: string;
  [key: string]: any;
}

export function PersonajeEditor({ personaje }: { personaje: Personaje }) {
  const openEntity = useMundoNavigation((s) => s.openEntity);

  return (
    <EditorPersonaje
      item={personaje as any}
      onSaved={() => {
        /* useSupabaseData ya actualiza su cache local vía addRow/updateRow;
           no hace falta replicar el item en un estado padre paralelo. */
      }}
      onDeleted={() => openEntity("personajes", "")}
      onNavigate={(tab, nombre) => {
        // Navegar por nombre requiere resolver el id; delegado al mismo
        // resolver de wikilinks para no duplicar la búsqueda por nombre.
        window.dispatchEvent(
          new CustomEvent("mundo-navigate-by-name", { detail: { tab, nombre } }),
        );
      }}
      onSelectPersonaje={(id) => openEntity("personajes", id)}
      onOpenGrupo={(id) => openEntity("grupos", id)}
      onNavigateCiudad={(id) => openEntity("ciudades", id)}
      onSelectCancion={(id) => openEntity("letras", id)}
    />
  );
}
