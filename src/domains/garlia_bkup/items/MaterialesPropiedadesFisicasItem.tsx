"use client";

/**
 * MaterialesPropiedadesFisicasItem.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque de solo lectura: propiedades físicas calculadas de cada Material
 * que compone el objeto (item_materiales → materiales.propiedades_calculadas).
 *
 * Distinto de PanelFisicaObjeto: ese panel muestra la física YA DERIVADA del
 * objeto entero (items.propiedades_fisicas, un solo jsonb agregado). Este
 * bloque muestra, material por material, el jsonb propio de cada Material en
 * el catálogo (mismo dato que ve MaterialesPage) — así se puede ver de dónde
 * viene cada propiedad del objeto sin abrir el catálogo aparte.
 *
 * No calcula nada: usa los mismos hooks/datos que ya carga PanelFisicaObjeto
 * (useItemMateriales + useMateriales) y el mismo componente de render que
 * usan Material/Estructura en sus propios catálogos (PropiedadesFisicasGenerico,
 * de _shared/GridPropiedadesCalculadas), para no duplicar ni reinventar el
 * lenguaje visual de "Propiedades físicas".
 *
 * Colocación: EditorItem lo monta al lado de Descripción (ver EditorItem.tsx),
 * como pidió el usuario — no dentro de PanelFisicaObjeto, para no mezclar la
 * física agregada del objeto con el desglose por material.
 */

import { Loader2 } from "lucide-react";
import React from "react";

import { useMateriales } from "@/domains/garlia/materiales/useMateriales";
import { PropiedadesFisicasGenerico } from "@/domains/garlia/_shared/GridPropiedadesCalculadas";

import { useItemMateriales } from "./useItemMateriales";

export function MaterialesPropiedadesFisicasItem({ itemId }: { itemId: string }) {
  const { items: materialesCatalogo, loading: loadingCatalogo } = useMateriales();
  const { items: composicion, loading: loadingComposicion } = useItemMateriales(itemId);

  const loading = loadingCatalogo || loadingComposicion;

  return (
    <div className="rounded-lg border border-primary/10 p-2 flex flex-col gap-1.5">
      <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
        Propiedades físicas de los materiales
      </span>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-micro text-primary/40">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando materiales…
        </div>
      ) : composicion.length === 0 ? (
        <p className="text-micro text-primary/35 italic py-1">
          Sin materiales asociados todavía — agrega materiales en "Física del
          objeto" para ver sus propiedades acá.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {composicion.map((fila) => {
            const material = materialesCatalogo.find((m) => m.id === fila.material_id);
            if (!material) {
              return (
                <p key={fila.id} className="text-micro text-primary/30 italic px-2">
                  Material {fila.material_id.slice(0, 8)} — no encontrado en el catálogo.
                </p>
              );
            }
            return (
              <div key={fila.id} className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-bold text-primary/75 truncate px-2">
                  {material.nombre}
                </span>
                <PropiedadesFisicasGenerico propiedades={material.propiedades_calculadas} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MaterialesPropiedadesFisicasItem;
