"use client";

/**
 * GeometriaBloque.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque "Geometría" dentro del detalle de una Estructura — hace visible
 * estructura → geometría → escala → volumen → densidad (pedido 2026-09-09).
 *
 *   Sin geometría:
 *     Geometría
 *     Forma        (selector, catálogo formas_geometricas)
 *     Estado       Sin geometría
 *
 *   Con forma elegida pero sin parámetros completos (o sin Ley canónica
 *   para esa forma):
 *     Geometría
 *     Forma        Prisma rectangular
 *     Parámetros   Longitud —   Ancho —   Grosor —
 *     Volumen      —
 *     Estado       Sin geometría / Pendiente
 *
 *   Con instancia calculada:
 *     Geometría
 *     Forma        Prisma rectangular
 *     Parámetros   Longitud 10   Ancho 4   Grosor 2
 *     Ley aplicada V = longitud × ancho × grosor
 *     Volumen      80 uL³
 *     Estado       Calculado
 *
 * El cálculo de volumen solo se hace en cliente para leyes puramente
 * multiplicativas (ej. "V = a × b × c", que cubre Prisma rectangular /
 * Plano / Línea / Cilindro con radio² etc. NO — cilindro y esfera llevan
 * π y exponentes, esos quedan "Pendiente" hasta que el cálculo real viva
 * en Supabase). No se inventa un número para fórmulas que este bloque no
 * sabe evaluar con certeza — mejor mostrar "Pendiente" que un volumen
 * incorrecto.
 */

import { ChevronDown, Loader2, Ruler, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";

import { ComboSelector } from "@/ui/ComboSelector";

import { useEstructuraGeometria } from "@/domains/garlia/elementos/useEstructuraGeometria";
import {
  useFormasGeometricas,
  useLeyesGeometricas,
} from "@/domains/garlia/elementos/useGeometriaCatalogo";

const ESTADO_LABEL: Record<string, string> = {
  calculado: "Calculado",
  calculable: "Calculado",
  pendiente: "Pendiente",
};

/**
 * Evalúa fórmulas puramente multiplicativas de las claves de parámetro,
 * ej. "longitud × ancho × grosor" con parametros = {longitud, ancho,
 * grosor}. Devuelve null si la fórmula usa algo más que "×"/"*" entre
 * claves conocidas, o si falta algún parámetro — en esos casos el volumen
 * se deja "Pendiente" en vez de arriesgar un cálculo incorrecto.
 */
function evaluarFormulaMultiplicativa(
  formulaSimbolica: string,
  clavesParametros: string[],
  parametros: Record<string, number>,
): number | null {
  const ladoDerecho = formulaSimbolica.split("=")[1] ?? formulaSimbolica;
  const factores = ladoDerecho
    .split(/[×x*]/i)
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  if (factores.length === 0) return null;
  const clavesSet = new Set(clavesParametros.map((c) => c.toLowerCase()));
  if (!factores.every((f) => clavesSet.has(f))) return null;

  let resultado = 1;
  for (const factor of factores) {
    const claveReal = clavesParametros.find((c) => c.toLowerCase() === factor);
    const valor = claveReal ? parametros[claveReal] : undefined;
    if (valor === undefined || valor === null || Number.isNaN(valor)) return null;
    resultado *= valor;
  }
  return resultado;
}

export function GeometriaBloque({ estructuraId }: { estructuraId: string }) {
  const { geometria, loading, asignarForma, actualizarParametros, quitarGeometria } =
    useEstructuraGeometria(estructuraId);
  const { items: formas, loading: loadingFormas } = useFormasGeometricas();
  const { items: leyes } = useLeyesGeometricas();

  const [eligiendoForma, setEligiendoForma] = useState(false);
  const [guardandoForma, setGuardandoForma] = useState(false);
  const [quitando, setQuitando] = useState(false);

  const formaActual = useMemo(
    () => (geometria ? (formas.find((f) => f.id === geometria.geometria_id) ?? null) : null),
    [formas, geometria],
  );
  const leyAplicada = useMemo(
    () => (formaActual ? (leyes.find((l) => l.forma_id === formaActual.id) ?? null) : null),
    [leyes, formaActual],
  );

  async function handleElegirForma(formaId: string) {
    setGuardandoForma(true);
    try {
      const ley = leyes.find((l) => l.forma_id === formaId) ?? null;
      await asignarForma(formaId, ley?.id ?? null);
      setEligiendoForma(false);
    } finally {
      setGuardandoForma(false);
    }
  }

  async function handleCambiarParametro(clave: string, valorTexto: string) {
    if (!geometria) return;
    const valor = valorTexto.trim() === "" ? undefined : Number(valorTexto);
    const nuevosParametros = { ...geometria.parametros };
    if (valor === undefined || Number.isNaN(valor)) {
      delete nuevosParametros[clave];
    } else {
      nuevosParametros[clave] = valor;
    }

    let volumen: number | null = null;
    let estadoCalculo = "pendiente";
    if (formaActual && leyAplicada) {
      const clavesRequeridas = formaActual.parametros_requeridos.map((p) => p.clave);
      const todosPresentes = clavesRequeridas.every(
        (c) => nuevosParametros[c] !== undefined && !Number.isNaN(nuevosParametros[c]),
      );
      if (todosPresentes) {
        const calculado = evaluarFormulaMultiplicativa(
          leyAplicada.formula_simbolica,
          clavesRequeridas,
          nuevosParametros,
        );
        if (calculado !== null && calculado > 0) {
          volumen = calculado;
          estadoCalculo = "calculado";
        }
      }
    }

    await actualizarParametros(geometria.id, {
      parametros: nuevosParametros,
      volumen,
      estado_calculo: estadoCalculo,
    });
  }

  async function handleQuitar() {
    if (!geometria) return;
    setQuitando(true);
    try {
      await quitarGeometria(geometria.id);
    } finally {
      setQuitando(false);
    }
  }

  const estadoTexto = geometria
    ? (ESTADO_LABEL[geometria.estado_calculo] ?? geometria.estado_calculo)
    : "Sin geometría";

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2">
      <div className="flex items-center gap-1.5">
        <Ruler size={11} className="text-primary/30" />
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Geometría
        </span>
        {geometria && (
          <button
            type="button"
            disabled={quitando}
            onClick={handleQuitar}
            title="Quitar geometría"
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-primary/15 text-primary/30 hover:text-red-500 hover:border-red-500/35 hover:bg-red-500/5 transition-all cursor-pointer disabled:opacity-30 ml-auto"
          >
            {quitando ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 py-2 text-micro text-primary/40">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Forma */}
          <div className="flex flex-col gap-0.5">
            <span className="text-micro font-bold text-primary/35">Forma</span>
            {eligiendoForma ? (
              <ComboSelector
                icon={<ChevronDown size={11} />}
                items={formas.map((f) => ({ id: f.id, label: f.nombre }))}
                label=""
                loading={loadingFormas || guardandoForma}
                mode="single"
                placeholder="Elegir forma…"
                value={formaActual?.id ?? null}
                onChange={(id) => id && handleElegirForma(id)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEligiendoForma(true)}
                className="text-left text-xs font-bold text-primary/70 hover:text-primary transition-colors cursor-pointer"
              >
                {formaActual ? formaActual.nombre : "Elegir forma…"}
              </button>
            )}
          </div>

          {/* Parámetros — solo si hay forma elegida */}
          {formaActual && geometria && formaActual.parametros_requeridos.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-micro font-bold text-primary/35">Parámetros</span>
              <div className="flex flex-wrap gap-2">
                {formaActual.parametros_requeridos.map((p) => (
                  <label key={p.clave} className="flex items-center gap-1 text-micro">
                    <span className="text-primary/45 capitalize">{p.clave}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={geometria.parametros[p.clave] ?? ""}
                      placeholder="—"
                      onChange={(e) => handleCambiarParametro(p.clave, e.target.value)}
                      className="w-14 bg-transparent border-b border-primary/15 focus:border-primary/40 outline-none text-xs font-bold text-primary/80 text-right px-0.5"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Ley aplicada — solo si hay una ley canónica para la forma */}
          {leyAplicada && (
            <div className="flex flex-col gap-0.5">
              <span className="text-micro font-bold text-primary/35">Ley aplicada</span>
              <p className="text-micro font-mono text-primary/55">{leyAplicada.formula_simbolica}</p>
            </div>
          )}

          {/* Volumen */}
          {formaActual && (
            <div className="flex flex-col gap-0.5">
              <span className="text-micro font-bold text-primary/35">Volumen</span>
              <p className="text-xs font-black text-primary/80">
                {geometria?.volumen != null ? `${geometria.volumen} uL³` : "—"}
              </p>
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center gap-1.5">
            <span className="text-micro font-bold text-primary/35">Estado</span>
            <span className="text-micro font-bold rounded px-1.5 py-0.5 bg-primary/5 text-primary/55">
              {estadoTexto}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
