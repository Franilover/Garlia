"use client";

/**
 * EditorGeometriaItem.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Edita items.geometria_fisica a través de un SELECTOR DE FORMA, no de un
 * volumen numérico suelto — reemplaza la versión anterior de este mismo
 * archivo, que pedía "volumen declarado" a mano (número + unidad). Ese
 * diseño quedó descartado porque exigía que el worldbuilder entendiera
 * unidades del motor físico para poder crear un ítem, algo que no todos los
 * creadores del proyecto van a manejar.
 *
 * Modelo actual (verificado contra el proyecto real — migraciones
 * crear_formas_geometricas_defaults / autocompletar_geometria_por_forma_default):
 *   - El usuario solo elige una FORMA de una lista (ej. "Espada de una
 *     mano", "Esfera"...).
 *   - Al guardar {"forma": "<clave>"} en geometria_fisica, un trigger en
 *     Supabase (fn_item_fuente_recalcular_after) autocompleta las medidas
 *     que falten con el default de esa forma (formas_geometricas_defaults),
 *     y recién entonces calcula volumen/masa/densidad/etc.
 *   - Este componente SÍ permite ajustar las medidas manualmente (longitud,
 *     ancho, grosor, radio según la forma) para quien quiera precisión —
 *     pero es opcional, colapsado por defecto. Elegir solo la forma ya
 *     basta para tener un objeto físicamente calculable.
 *   - Nunca se le pide "volumen" al usuario: el volumen siempre es derivado
 *     por el motor a partir de la forma + medidas, jamás declarado a mano.
 *
 * Este componente sigue sin calcular nada — solo escribe la causa
 * (geometria_fisica.forma + medidas opcionales) y muestra el veredicto que
 * ya trae Supabase en propiedades_fisicas.volumen_comparacion, igual que
 * antes.
 */

import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { ComboSelector } from "@/ui/ComboSelector";
import { supabase } from "@/infra/supabase/supabase";

import { useFormasGeometricas, labelParametro, type FormaGeometrica } from "./useFormasGeometricas";

const ESTADO_COMPARACION_LABEL: Record<string, string> = {
  sin_volumen: "Sin forma elegida todavía",
  declarado_no_verificable: "Declarado, pero el motor no tiene con qué verificarlo aún",
  calculado_sin_declarado: "Volumen calculado a partir de la forma elegida",
  requiere_tolerancia: "Comparado contra el volumen del motor",
  unidades_incompatibles: "La unidad declarada no es compatible con la que usa el motor",
  no_verificable: "No verificable todavía",
};

function formatNumero(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number") return String(v);
  return Number.isInteger(v) ? String(v) : v.toFixed(4);
}

export function EditorGeometriaItem({
  itemId,
  geometriaFisica,
  volumenComparacion,
  onGuardado,
}: {
  itemId: string;
  geometriaFisica?: Record<string, unknown> | null;
  /** propiedades_fisicas.volumen_comparacion — resultado del motor, solo
   *  lectura. No se calcula ni se interpreta acá más allá de mostrar el
   *  estado y las diferencias tal cual vienen. */
  volumenComparacion?: {
    estado?: string;
    diferencia_si?: number | null;
    diferencia_relativa?: number | null;
  } | null;
  /** Se llama después de guardar geometria_fisica. La causa ya quedó
   *  persistida y Supabase ya recalculó vía trigger — esto solo avisa al
   *  padre para que vuelva a pedir el `item` si quiere reflejar el nuevo
   *  volumen_comparacion/propiedades_fisicas. */
  onGuardado?: () => void;
}) {
  const { formas, loading: loadingFormas } = useFormasGeometricas();

  const formaGuardada = typeof geometriaFisica?.forma === "string" ? geometriaFisica.forma : null;
  const [formaSeleccionada, setFormaSeleccionada] = useState<string | null>(formaGuardada);
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [mostrarMedidas, setMostrarMedidas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar de item (o cargar por primera vez), sincronizamos el estado
  // local con lo guardado — mismo criterio que el resto del editor: no
  // pisar lo que el usuario está tipeando salvo que cambie el item.
  useEffect(() => {
    setFormaSeleccionada(formaGuardada);
    setMostrarMedidas(false);
    setError(null);
  }, [itemId, formaGuardada]);

  const formaActual: FormaGeometrica | undefined = formas.find((f) => f.clave === formaSeleccionada);

  // Al elegir/cambiar de forma, precargamos el input de medidas con lo ya
  // guardado si existe, o con el default de esa forma si no — así "Ajustar
  // medidas" nunca aparece vacío ni con un 0 confuso.
  useEffect(() => {
    if (!formaActual) {
      setMedidas({});
      return;
    }
    const fuente = formaSeleccionada === formaGuardada ? (geometriaFisica ?? {}) : formaActual.parametrosDefault;
    const iniciales: Record<string, string> = {};
    for (const clave of formaActual.parametrosNumericos) {
      const valor = (fuente as Record<string, unknown>)[clave];
      const num = typeof valor === "number" ? valor : (formaActual.parametrosDefault[clave] as number);
      iniciales[clave] = String(num);
    }
    setMedidas(iniciales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formaActual?.clave]);

  async function guardarForma(nuevaForma: string) {
    setError(null);
    setFormaSeleccionada(nuevaForma);
    setGuardando(true);
    try {
      // Solo se manda la forma — el trigger en Supabase completa las
      // medidas que falten con el default de esa forma. No se calcula ni
      // se asume ningún número acá.
      const geometriaNueva = { forma: nuevaForma };
      const { error: errorSupabase } = await supabase
        .from("items")
        .update({ geometria_fisica: geometriaNueva })
        .eq("id", itemId);

      if (errorSupabase) {
        console.error("[EditorGeometriaItem] error guardando forma:", errorSupabase);
        setError("No se pudo guardar la forma. Intenta de nuevo.");
        setFormaSeleccionada(formaGuardada);
        return;
      }
      onGuardado?.();
    } finally {
      setGuardando(false);
    }
  }

  async function guardarMedidas() {
    if (!formaActual) return;
    setError(null);

    const geometriaNueva: Record<string, unknown> = { forma: formaActual.clave };
    for (const clave of formaActual.parametrosNumericos) {
      const texto = medidas[clave] ?? "";
      const n = Number(texto);
      if (texto.trim() === "" || Number.isNaN(n) || n <= 0) {
        setError(`${labelParametro(clave)} debe ser un número mayor que 0.`);
        return;
      }
      geometriaNueva[clave] = n;
    }
    // La unidad de longitud es siempre la misma en todo el sistema hoy — se
    // copia del default de la forma en vez de pedírsela al usuario (ver
    // useFormasGeometricas: nunca se muestra este valor en la UI).
    const unidad = formaActual.parametrosDefault["unidad_longitud"];
    if (unidad) geometriaNueva["unidad_longitud"] = unidad;

    setGuardando(true);
    try {
      const { error: errorSupabase } = await supabase
        .from("items")
        .update({ geometria_fisica: geometriaNueva })
        .eq("id", itemId);

      if (errorSupabase) {
        console.error("[EditorGeometriaItem] error guardando medidas:", errorSupabase);
        setError("No se pudo guardar. Intenta de nuevo.");
        return;
      }
      onGuardado?.();
    } finally {
      setGuardando(false);
    }
  }

  const estado = volumenComparacion?.estado;

  return (
    <section className="flex flex-col gap-1.5">
      <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
        Forma
      </span>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <ComboSelector
            allowNone={false}
            items={formas.map((f) => ({ id: f.clave, label: f.nombre }))}
            label=""
            loading={loadingFormas}
            mode="single"
            placeholder="Elegir forma del objeto…"
            value={formaSeleccionada}
            onChange={(clave) => {
              if (clave) void guardarForma(clave);
            }}
          />
        </div>
        {guardando && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary/40" />}
      </div>

      {formaActual?.descripcion && (
        <p className="text-micro text-primary/45 leading-relaxed">
          {formaActual.descripcion}
        </p>
      )}

      {!formaSeleccionada && !loadingFormas && (
        <p className="text-micro text-primary/35 italic py-0.5">
          Elige una forma para que el motor pueda calcular el volumen y derivar
          la densidad del objeto. No hace falta ninguna medida — se usa un
          tamaño típico de referencia que después puedes ajustar.
        </p>
      )}

      {formaActual && formaActual.parametrosNumericos.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            className="self-start text-micro font-bold text-primary/40 hover:text-primary transition-colors"
            type="button"
            onClick={() => setMostrarMedidas((v) => !v)}
          >
            {mostrarMedidas ? "Ocultar medidas" : "Ajustar medidas (opcional)"}
          </button>

          {mostrarMedidas && (
            <div className="flex items-end gap-3 flex-wrap py-1">
              {formaActual.parametrosNumericos.map((clave) => (
                <label key={clave} className="flex flex-col gap-0.5">
                  <span className="text-micro font-bold text-primary/40">
                    {labelParametro(clave)}
                  </span>
                  <input
                    className="w-16 bg-transparent px-0 py-1 text-sm font-black text-primary outline-none border-0 border-b border-primary/15 focus:border-primary/40 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    min={0}
                    step="any"
                    type="number"
                    value={medidas[clave] ?? ""}
                    onChange={(e) => setMedidas((m) => ({ ...m, [clave]: e.target.value }))}
                    onBlur={guardarMedidas}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </label>
              ))}
              <span className="text-micro text-primary/30 pb-1.5">
                Medidas de referencia, no una unidad real — solo importan entre sí.
              </span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-micro text-red-500">{error}</p>}

      {/* Veredicto del motor — solo lectura, nunca reinterpretado. */}
      {estado && (
        <div className="text-micro text-primary/45">
          <p>{ESTADO_COMPARACION_LABEL[estado] ?? estado}</p>
          {estado === "requiere_tolerancia" && (
            <div className="mt-0.5 flex gap-3 text-primary/35">
              <span>Diferencia: {formatNumero(volumenComparacion?.diferencia_si)}</span>
              <span>
                Relativa:{" "}
                {volumenComparacion?.diferencia_relativa != null
                  ? `${(volumenComparacion.diferencia_relativa * 100).toFixed(1)}%`
                  : "—"}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default EditorGeometriaItem;
