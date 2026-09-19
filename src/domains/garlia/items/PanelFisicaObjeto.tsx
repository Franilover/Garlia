"use client";

import { Loader2, Pencil, X } from "lucide-react";
import React, { useState } from "react";

import { useMateriales } from "@/domains/garlia/materiales/useMateriales";

import { useItemMateriales } from "./useItemMateriales";
import { SelectorMaterialesItem } from "./SelectorMaterialesItem";
import { EditorGeometriaItem } from "./EditorGeometriaItem";
import { useInterpretacionEscritor, type InterpretacionEscritor } from "@/domains/garlia/_shared/useInterpretacionEscritor";
import {
  useContratoPresentacion,
  type GrupoContrato,
} from "@/domains/garlia/_shared/useContratoPresentacion";

/** Intenta parsear un string como número (para valores de
 *  v_frontend_worldbuilder_propiedades_entidad, que llegan serializados
 *  como string aunque sean numéricos — jsonb/numeric de Postgres vía
 *  PostgREST). Si no es un número válido, se devuelve tal cual (para no
 *  romper strings genuinamente textuales, ej. clasificaciones). */
function normalizarNumero(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const n = Number(value);
  // Un string vacío o con espacios da Number("") = 0, hay que excluirlo
  // explícitamente para no convertir texto vacío en 0.
  if (value.trim() !== "" && Number.isFinite(n)) return n;
  return value;
}

function formatValue(value: unknown): string {
  const v = normalizarNumero(value);
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

/** Tarjeta compacta de una propiedad — mismo lenguaje visual que
 *  TarjetaPropiedadesFisicas de Química (elementos/GridPropiedadesCalculadas):
 *  sin borde ni fondo propios, solo tipografía micro y separación por
 *  espaciado, apoyándose en el contenedor exterior para el límite visual.
 *
 *  `modo` acompaña al toggle Científico ↔ Escritor del header de
 *  EditorItem. En modo "humana" muestra nivel + significado tal como los
 *  entrega el motor de interpretación de Supabase (vista
 *  v_frontend_escritor_propiedades_interpretadas, ver
 *  useInterpretacionEscritor) — sin umbrales ni textos propios acá. Si la
 *  propiedad no viene interpretada (ej. factor_geometrico), el valor
 *  técnico se sigue mostrando en modo "quimica"; el toggle a modo "humana"
 *  no oculta la celda acá (a diferencia de TarjetaPropiedad/
 *  fusionarInterpretaciones), pero tampoco inventa nivel/significado — solo
 *  cae a formatValue(value) porque `esHumana` requiere `interpretacion`
 *  presente (ver más abajo). */
function PropertyCell({
  label,
  value,
  modo = "quimica",
  interpretacion,
}: {
  label: string;
  value: unknown;
  modo?: "quimica" | "humana";
  interpretacion?: InterpretacionEscritor;
}) {
  // Modo Escritor: mismo diseño que Científico; solo cambia el valor por el
  // nivel del motor. La explicación queda como tooltip.
  const esHumana = modo === "humana" && !!interpretacion;
  return (
    <div
      title={esHumana ? (interpretacion?.significado ?? undefined) : undefined}
      className="flex items-center justify-between gap-1 min-w-0 px-2 py-1.5"
    >
      <span className="text-micro font-bold text-primary/50 truncate">{label}</span>
      <span
        className={`text-micro font-black text-primary/70 shrink-0 truncate max-w-[6.5rem] text-right ${
          esHumana ? "capitalize" : "tabular-nums"
        }`}
      >
        {esHumana ? interpretacion?.nivel : formatValue(value)}
      </span>
    </div>
  );
}

function SubGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/25 px-2">
      {children}
    </span>
  );
}

const ESTADO_LABEL: Record<string, string> = {
  calculable: "Calculado",
  sin_materiales: "Sin materiales",
  incompleto_geometria: "Falta geometría",
};

/**
 * Física canónica de un Objeto (documentacion_sistema "Modelo físico
 * canónico v218", orden 1001-1002).
 *
 * Un objeto no hereda propiedades de forma pasiva: Supabase las deriva de
 * item_materiales (fuente principal) + geometria_fisica del propio objeto.
 * `items.compuesto_id` es solo compatibilidad secundaria y nunca se suma a
 * esto.
 *
 * La sección "Física del objeto" es de SOLO LECTURA: no recalcula
 * masa/densidad/etc, solo muestra lo que ya viene en
 * items.propiedades_fisicas. La composición (SelectorMaterialesItem, más
 * abajo) sí es editable — pero solo edita la CAUSA (qué material, cuánta
 * cantidad/proporción), nunca el resultado. El frontend nunca calcula
 * propiedades físicas.
 *
 * Si el estado es "sin_materiales" o "incompleto_geometria", eso es falta
 * de datos constructivos del objeto — no un error del motor — y se muestra
 * así explícitamente, sin inventar valores ni tratarlo como cero.
 *
 * Diseño: minimalista, sin tarjetas anidadas con fondo/borde propio — cada
 * bloque (Física / Geometría / Materiales) es solo un título micro-label +
 * contenido, separado por gap-3 dentro de la tarjeta exterior que ya pone
 * EditorItem. Mismo criterio que ElementoEditor/CompuestoEditor de Química:
 * el contorno vive en el contenedor, no en cada sub-sección.
 */
export function PanelFisicaObjeto({
  itemId,
  propiedadesFisicas,
  estadoFisico,
  geometriaFisica,
  onRefrescarItem,
  modo = "quimica",
}: {
  itemId: string;
  propiedadesFisicas?: (Record<string, unknown> & { estado?: string; fuente_fisica?: string }) | null;
  estadoFisico?: string | null;
  geometriaFisica?: Record<string, unknown> | null;
  /** Llamado tras agregar/editar/quitar un material. Supabase ya recalculó
   *  y persistió items.propiedades_fisicas (trigger trg_objeto_propiedades →
   *  recalcular_objeto_propiedades, verificado contra el proyecto real).
   *  Este panel no lo relee solo: el padre (EditorItem) decide cómo volver
   *  a pedir el `item` — misma query que ya usa para cargarlo la primera
   *  vez. Sin esto, la sección de física quedaría mostrando el valor
   *  anterior hasta recargar el editor entero. */
  onRefrescarItem?: () => void;
  /** "quimica" (default): valor técnico plano, como siempre. "humana":
   *  mismo lenguaje visual "chip" que TarjetaPropiedad en modo Escritor —
   *  ver botón Científico ↔ Escritor en el header de EditorItem. */
  modo?: "quimica" | "humana";
}) {
  const { items: materialesCatalogo, loading: loadingCatalogo } = useMateriales();
  const { items: composicion, loading: loadingComposicion } = useItemMateriales(itemId);
  const [editandoComposicion, setEditandoComposicion] = useState(false);

  // Capa humana (modo Escritor) desde el motor de Supabase, solo en modo
  // "humana". Claves ya alineadas con las de este panel (dureza, interaccion…).
  const { interpretaciones } = useInterpretacionEscritor("objeto", itemId, modo === "humana");

  // Grupos/propiedades/orden/nombres de Objeto en modo científico salen del
  // contrato de presentación — ya no de MAGNITUDES_OBJETO/GEOMETRIA_OBJETO/
  // PROPIEDADES_OBJETO (FE-018). Solo se piden los grupos declarados con
  // estrategia genérica (propiedad_clave no nulo); los grupos especializados
  // (Identificación, Geometría, Enlaces, Análisis estructural) siguen
  // teniendo su propio renderer más abajo (EditorGeometriaItem, Materiales).
  const { grupos: gruposContrato } = useContratoPresentacion("objeto", "cientifico");

  // FE-019 (piloto) — DESACTIVADO tras detectar valores de
  // v_frontend_worldbuilder_propiedades_entidad con precisión numeric
  // extendida (ej. "0.000225000...000") que rompían el formateo visual.
  // Se deja el hook importado/disponible para reactivar una vez validado
  // el shape real de la vista contra Supabase, pero por ahora Objeto usa
  // exclusivamente el jsonb propiedadesFisicas (ver aplicarValoresCientificos
  // más abajo, que queda sin invocar).
  const valoresCientificos: Record<string, string | null> = {};

  const propiedades = propiedadesFisicas ?? {};
  // OJO: items.estado_fisico ("calculado" | "pendiente" | ...) y
  // propiedades_fisicas.estado ("calculable" | "sin_materiales" |
  // "incompleto_geometria") son dos vocabularios distintos que responden
  // preguntas distintas (¿corrió el motor? vs. ¿hay datos suficientes?).
  // Para decidir qué mostrar acá, la fuente de verdad es SIEMPRE
  // propiedades.estado — nunca estadoFisico, que puede valer "calculado"
  // sin que eso signifique "calculable" en este vocabulario.
  const estado = (propiedades.estado as string | undefined) ?? estadoFisico ?? "sin_materiales";
  const esCalculable = estado === "calculable";
  const fuente = propiedades.fuente_fisica;

  return (
    <div className="flex flex-col gap-3">
      {/* Física — solo lectura, derivada de materiales + geometría. */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Física del objeto
          </span>
          <span
            className={`shrink-0 text-micro font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
              esCalculable ? "text-primary/40" : "text-amber-600/70"
            }`}
            title={
              fuente
                ? `Fuente física: ${fuente === "materiales" ? "materiales asociados" : fuente}`
                : undefined
            }
          >
            {ESTADO_LABEL[estado] ?? estado}
          </span>
        </div>

        {!esCalculable ? (
          <p className="text-micro text-primary/35 italic py-1">
            {estado === "incompleto_geometria"
              ? "Tiene materiales asociados pero falta geometría (volumen) para derivar densidad."
              : "Todavía no tiene composición material suficiente para derivar propiedades físicas."}
          </p>
        ) : (
          // Grupos, nombres y orden vienen del contrato
          // (v_frontend_contrato_presentacion_detalle, ver
          // useContratoPresentacion) — FE-018: ya no hay arrays locales
          // (MAGNITUDES_OBJETO/GEOMETRIA_OBJETO/PROPIEDADES_OBJETO)
          // decidiendo qué existe, cómo se llama o en qué grupo cae. Cada
          // grupo del contrato con `propiedad_clave` no nulo se pinta acá,
          // en el orden que trae `gruposContrato` (ya ordenado por
          // grupo_orden); solo se muestran las propiedades presentes en el
          // jsonb `propiedades_fisicas` de este objeto puntual. Los grupos
          // especializados (Identificación/Geometría/Enlaces/Análisis
          // estructural, propiedad_clave = null) no se listan acá: tienen
          // su propio renderer (EditorGeometriaItem más abajo, etc.), pero
          // su nombre/orden como sección igual proviene del contrato si se
          // necesita mostrarlos con encabezado propio.
          <div className="grid grid-cols-2 gap-3 items-start">
            {gruposContrato
              .filter((g: GrupoContrato) =>
                g.propiedades.some((p) => p.propiedad_clave && propiedades[p.propiedad_clave] !== undefined),
              )
              .map((g: GrupoContrato) => (
                <div key={g.grupo} className="flex flex-col gap-0.5">
                  <SubGroupLabel>{g.grupo_nombre}</SubGroupLabel>
                  {g.propiedades
                    .filter((p) => p.propiedad_clave && propiedades[p.propiedad_clave] !== undefined)
                    .map((p) => {
                      const clave = p.propiedad_clave as string;
                      // FE-019: valor de la vista canónica si está presente
                      // (incluyendo null explícito = "aplicable sin dato");
                      // si la vista no trae la clave, usa el valor del
                      // jsonb ya calculado por Supabase (fallback seguro).
                      const valor = clave in valoresCientificos ? valoresCientificos[clave] : propiedades[clave];
                      return (
                        <PropertyCell
                          key={clave}
                          label={p.propiedad_nombre ?? clave}
                          value={valor}
                          modo={modo}
                          interpretacion={interpretaciones[clave]}
                        />
                      );
                    })}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Geometría — hoy el motor solo lee geometria_fisica.volumen (+
          unidad_volumen) para compararlo contra el volumen que deriva de
          materiales/estructura. Editable acá; el resultado de la
          comparación (volumen_comparacion) es solo lectura, viene de
          propiedades_fisicas. */}
      <EditorGeometriaItem
        geometriaFisica={geometriaFisica}
        itemId={itemId}
        volumenComparacion={
          propiedades.volumen_comparacion as
            | { estado?: string; diferencia_si?: number | null; diferencia_relativa?: number | null }
            | undefined
        }
        onGuardado={onRefrescarItem}
      />

      {/* Materiales — composición declarada, origen de la física de arriba. */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Materiales
          </span>
          <button
            className="shrink-0 flex items-center gap-1 text-micro font-bold text-primary/40 hover:text-primary transition-colors"
            type="button"
            onClick={() => setEditandoComposicion((v) => !v)}
          >
            {editandoComposicion ? (
              <>
                <X size={11} /> Cerrar
              </>
            ) : (
              <>
                <Pencil size={11} /> Editar
              </>
            )}
          </button>
        </div>

        {/* Capa 1: composición declarada, solo lectura, compacta. Distinta
            conceptualmente de "Editar composición" — esta es la lectura de
            la causa ya guardada, no un formulario. Filas separadas por un
            divisor sutil en vez de bordes/fondo por fila. */}
        {!editandoComposicion && (
          loadingComposicion ? (
            <div className="flex items-center gap-2 py-2 text-micro text-primary/40">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando materiales…
            </div>
          ) : composicion.length === 0 ? (
            <p className="text-micro text-primary/35 italic py-1">
              Sin materiales asociados todavía.
            </p>
          ) : (
            <div className="flex flex-col">
              {composicion.map((fila) => {
                const material = materialesCatalogo.find((m) => m.id === fila.material_id);
                return (
                  <div
                    key={fila.id}
                    className="flex items-center justify-between gap-3 py-1.5 border-b border-primary/8 last:border-b-0"
                  >
                    <span className="text-xs font-bold text-primary/75 truncate">
                      {loadingCatalogo ? "…" : material?.nombre ?? fila.material_id.slice(0, 8)}
                    </span>
                    <div className="shrink-0 flex items-center gap-2 text-micro text-primary/40">
                      <span className="tabular-nums">× {formatValue(fila.cantidad)}</span>
                      {fila.proporcion !== null && (
                        <span className="tabular-nums">prop. {formatValue(fila.proporcion)}</span>
                      )}
                      {fila.rol && <span className="text-primary/30">{fila.rol}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Capa 2: edición — la CAUSA, nunca el resultado. Al cambiar algo
            acá, Supabase ya recalculó vía trigger; solo avisamos al padre
            para que vuelva a pedir el `item`. */}
        {editandoComposicion && (
          <SelectorMaterialesItem itemId={itemId} onComposicionCambiada={onRefrescarItem} />
        )}
      </section>
    </div>
  );
}

export default PanelFisicaObjeto;
