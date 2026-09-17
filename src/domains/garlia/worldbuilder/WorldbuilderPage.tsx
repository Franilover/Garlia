"use client";

/**
 * WorldbuilderPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * "CAPA HUMANA" sobre el motor Garlia (ver docx de diseño, fase 2026-09):
 * el worldbuilder escribe lo que quiere en lenguaje natural — nunca ve
 * dureza/rigidez/material_componentes/categorías internas — y el motor
 * (fn_worldbuilder_*, ya viven en Supabase) resuelve intención → criterios →
 * candidatos/creación → evaluación humana (✓ cumple / ✗ no cumple).
 *
 * Pestaña de nivel superior propia, junto a Runas/Química/Visualizador (ver
 * SECCIONES_MAGIA en runas/RunasPage.tsx) — no vive dentro de Lab porque el
 * público objetivo es distinto: worldbuilders sin conocimiento técnico del
 * motor, no quienes ya bucean fórmulas en Laboratorio/Interacción.
 *
 * Flujo de pantalla (deliberadamente en este orden):
 *   1. Buscar — "¿ya existe algo así?" (fn_worldbuilder_sugerir_materiales)
 *      SIEMPRE antes de crear, para no duplicar materiales con otro nombre.
 *   2. Crear material — combina 1-16 Materiales/Compuestos ya existentes.
 *   3. Mezclar — caso particular de (2): exactamente 2 materiales, A/B%.
 *   4. Crear item — tipo humano ("espada") + Materiales ya existentes.
 * Todas comparten el mismo panel de "detectar intención" (chips ✓/✗
 * editables antes de ejecutar nada) y el mismo bloque de evaluación humana
 * al final — nunca se muestra una fórmula ni un número crudo como veredicto,
 * solo ✓/✗ con la posibilidad de expandir el detalle si el usuario lo pide.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Beaker,
  Blend,
  CheckCircle2,
  ChevronDown,
  Clock,
  FlaskConical,
  Package,
  Search,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";

import { useCompuestos } from "@/domains/garlia/elementos/useCompuestos";
import { useMateriales } from "@/domains/garlia/materiales/useMateriales";

import { useWorldbuilder } from "./useWorldbuilder";
import { EmptyRow, LoadingRow, SelectDropdown, StatusPill } from "./ui";
import type {
  ComponenteMaterial,
  CriterioEvaluado,
  EvaluacionWorldbuilder,
  IntencionDetectada,
  ItemCreadoResultado,
  MaterialCreadoResultado,
  MaterialDeItem,
  MaterialSugerido,
} from "./types";

type ModoWorldbuilder = "buscar" | "crear" | "mezclar" | "item";

const MODOS: { key: ModoWorldbuilder; label: string; icon: React.ReactNode }[] = [
  { key: "buscar", label: "Buscar", icon: <Search size={13} /> },
  { key: "crear", label: "Crear material", icon: <FlaskConical size={13} /> },
  { key: "mezclar", label: "Mezclar", icon: <Blend size={13} /> },
  { key: "item", label: "Crear objeto", icon: <Package size={13} /> },
];

/** Chips de intención detectada — confirmación visual ANTES de ejecutar
 *  cualquier búsqueda/creación. Cada chip es togglable: el worldbuilder
 *  puede destildar una intención mal detectada sin reescribir el texto. */
function ChipsIntenciones({
  detectando,
  intenciones,
  activas,
  onToggle,
}: {
  detectando: boolean;
  intenciones: IntencionDetectada[];
  activas: Set<string>;
  onToggle: (clave: string) => void;
}) {
  if (detectando) {
    return <p className="text-[10px] font-bold text-primary/35">Detectando lo que pediste…</p>;
  }
  if (intenciones.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-primary/35">Entendí:</span>
      {intenciones.map((it) => {
        const on = activas.has(it.clave);
        return (
          <button
            key={it.clave}
            type="button"
            onClick={() => onToggle(it.clave)}
            title={it.descripcion}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black transition-colors ${
              on
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-primary/10 text-primary/30 line-through"
            }`}
          >
            {on ? <CheckCircle2 size={10} /> : null}
            {it.nombre}
          </button>
        );
      })}
    </div>
  );
}

/** Fila de un criterio evaluado — nunca muestra la fórmula, solo el
 *  nombre de la intención + ✓/✗. El valor numérico crudo queda oculto
 *  detrás de un detalle opcional para quien quiera verlo. */
function FilaCriterio({ c }: { c: CriterioEvaluado }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/10 px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs font-bold text-primary/70 capitalize">
        {c.cumple ? (
          <CheckCircle2 size={13} className="text-emerald-500" />
        ) : (
          <XCircle size={13} className="text-red-400" />
        )}
        {c.intencion}
      </span>
      <span className="text-[10px] font-bold text-primary/30">{c.propiedad}</span>
    </div>
  );
}

/** Bloque de evaluación humana — ✓/✗ por intención, nunca la fórmula. Se
 *  reutiliza tal cual al mostrar resultado de creación Y en cualquier vista
 *  de detalle de un Material/Item ya existente (mismo componente, no una
 *  versión "resumida" post-creación y otra distinta en el catálogo). */
function BloqueEvaluacion({ evaluacion }: { evaluacion: EvaluacionWorldbuilder }) {
  const cumple = evaluacion.estado === "cumple" || (evaluacion.criterios.length > 0 && evaluacion.criterios.every((c) => c.cumple));
  return (
    <div className="rounded-xl border border-primary/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">Evaluación</p>
        <StatusPill tone={cumple ? "success" : "warning"}>
          {cumple ? "Cumple lo pedido" : "Todavía no cumple del todo"}
        </StatusPill>
      </div>
      {evaluacion.criterios.length === 0 ? (
        <p className="text-xs text-primary/40">No se detectó ninguna intención para evaluar.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {evaluacion.criterios.map((c, i) => (
            <FilaCriterio key={`${c.intencion}-${c.propiedad}-${i}`} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tarjeta de detalle de propiedades — colapsada por defecto, para quien
 *  quiera "ver los números" sin que sea lo primero que aparece. */
function DetallePropiedades({ propiedades }: { propiedades: Record<string, unknown> }) {
  const claves7 = ["estabilidad", "rigidez", "flexibilidad", "dureza", "conductividad", "transparencia", "interaccion"];
  const entradas = Object.entries(propiedades).filter(([k, v]) => claves7.includes(k) && typeof v === "number");
  if (entradas.length === 0) return null;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary/35">
        Ver propiedades físicas
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {entradas.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-md border border-primary/10 bg-primary/5 px-2 py-1.5">
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-primary/35">{k}</span>
            <span className="text-micro font-black text-primary/70">{(v as number).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Tarjeta de un material sugerido por la búsqueda — clic para usarlo como
 *  componente en "Crear material"/"Mezclar" sin tener que retipear el id. */
function TarjetaMaterialSugerido({
  sugerido,
  onUsar,
}: {
  sugerido: MaterialSugerido;
  onUsar?: () => void;
}) {
  const cumplidos = sugerido.criterios.filter((c) => c.cumple).length;
  return (
    <div className="rounded-xl border border-primary/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-primary/85">{sugerido.nombre}</p>
          <p className="text-[10px] font-bold capitalize text-primary/35">{sugerido.categoria.replace(/_/g, " ")}</p>
        </div>
        <StatusPill tone={sugerido.puntuacion >= 0.99 ? "success" : sugerido.puntuacion > 0 ? "warning" : "default"}>
          {cumplidos}/{sugerido.criterios.length} criterios
        </StatusPill>
      </div>
      <div className="mt-2.5 flex flex-col gap-1">
        {sugerido.criterios.map((c, i) => (
          <FilaCriterio key={`${c.intencion}-${c.propiedad}-${i}`} c={c} />
        ))}
      </div>
      {onUsar ? (
        <button
          type="button"
          onClick={onUsar}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/55 transition-colors hover:border-primary/30 hover:text-primary/85"
        >
          Usar como base
        </button>
      ) : null}
    </div>
  );
}

/** Panel "Buscar" — primer paso del flujo: ¿ya existe algo así? */
function PanelBuscar({
  wb,
  onUsarComoBase,
}: {
  wb: ReturnType<typeof useWorldbuilder>;
  onUsarComoBase: (materialId: string) => void;
}) {
  const [texto, setTexto] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-black text-primary/80">¿Qué estás buscando?</p>
        <p className="mt-1.5 text-[11px] leading-5 text-primary/45">
          Describí lo que necesitás en tus palabras — por ejemplo "algo duro y resistente" o "un material
          transparente y liviano". Te mostramos qué ya existe antes de crear algo nuevo.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            wb.detectarIntenciones(e.target.value);
          }}
          rows={2}
          placeholder="quiero algo duro y resistente…"
          className="w-full resize-none rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/85 outline-none transition-colors placeholder:text-primary/25 focus:border-primary/40"
        />
        <div className="flex items-center justify-between gap-3">
          <ChipsIntenciones
            detectando={wb.detectando}
            intenciones={wb.intencionesDetectadas}
            activas={new Set(wb.intencionesDetectadas.map((i) => i.clave))}
            onToggle={() => {
              /* Solo lectura acá — el filtro real de qué intenciones usar
                 se resuelve del lado del texto, no de un estado propio,
                 para no duplicar la fuente de verdad del motor. */
            }}
          />
          <button
            type="button"
            disabled={!texto.trim() || wb.buscando}
            onClick={() => wb.buscarMateriales(texto)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--bg-main)] transition-opacity disabled:opacity-30"
          >
            <Search size={12} />
            {wb.buscando ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </div>

      {wb.buscando ? <LoadingRow>Evaluando todo el catálogo…</LoadingRow> : null}

      {wb.sugerencias ? (
        wb.sugerencias.resultados.length === 0 ? (
          <EmptyRow>
            No encontramos nada parecido todavía — probá con "Crear material" o "Mezclar" para hacer uno nuevo.
          </EmptyRow>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">
              {wb.sugerencias.resultados.length} candidatos encontrados
            </p>
            {wb.sugerencias.resultados.map((r) => (
              <TarjetaMaterialSugerido key={r.id} sugerido={r} onUsar={() => onUsarComoBase(r.id)} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

/** Selector de componentes (Material o Compuesto) para "Crear material" —
 *  cada fila es {tipo, id, proporcion?}, mismo shape que espera la RPC. */
function SelectorComponentes({
  componentes,
  setComponentes,
  materiales,
  compuestos,
}: {
  componentes: ComponenteMaterial[];
  setComponentes: (c: ComponenteMaterial[]) => void;
  materiales: { id: string; nombre: string }[];
  compuestos: { id: string; nombre: string }[];
}) {
  const agregar = () => setComponentes([...componentes, { tipo: "material", id: "" }]);
  const quitar = (i: number) => setComponentes(componentes.filter((_, idx) => idx !== i));
  const actualizar = (i: number, patch: Partial<ComponenteMaterial>) =>
    setComponentes(componentes.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="flex flex-col gap-2.5">
      {componentes.map((c, i) => {
        const items = c.tipo === "material" ? materiales : compuestos;
        const activo = items.find((it) => it.id === c.id) ?? null;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-primary/15 p-0.5">
              {(["material", "compuesto"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => actualizar(i, { tipo: t, id: "" })}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-black capitalize transition-colors ${
                    c.tipo === t ? "bg-primary/10 text-primary/90" : "text-primary/35 hover:text-primary/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <SelectDropdown
              items={items}
              active={activo}
              getKey={(it) => it.id}
              getLabel={(it) => it.nombre}
              onSelect={(it) => actualizar(i, { id: it.id })}
              placeholder={`Elegir ${c.tipo}…`}
            />
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              value={c.proporcion ?? ""}
              onChange={(e) => actualizar(i, { proporcion: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="% (opcional)"
              className="w-28 rounded-md border border-primary/15 bg-transparent px-2 py-1.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
            />
            {componentes.length > 1 ? (
              <button
                type="button"
                onClick={() => quitar(i)}
                className="text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-red-400"
              >
                Quitar
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        onClick={agregar}
        disabled={componentes.length >= 16}
        className="w-fit text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary/70 disabled:opacity-30"
      >
        + Agregar componente
      </button>
      <p className="text-[10px] text-primary/30">
        Si no indicás porcentajes, se reparten en partes iguales. Si los indicás, deben sumar 100% entre todos.
      </p>
    </div>
  );
}

/** Resultado de una creación/mezcla — mismo shape en ambas
 *  (MaterialCreadoResultado), mismo componente para no duplicar la vista. */
function ResultadoMaterialCreado({ resultado }: { resultado: MaterialCreadoResultado }) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">Creado</p>
          <p className="text-sm font-black text-primary/90">{resultado.nombre}</p>
          <p className="text-[10px] font-bold capitalize text-primary/40">{resultado.categoria.replace(/_/g, " ")}</p>
        </div>
        <Sparkles size={18} className="text-accent" />
      </div>
      <div className="mt-4">
        <BloqueEvaluacion evaluacion={resultado.evaluacion} />
      </div>
      <DetallePropiedades propiedades={resultado.propiedades} />
    </div>
  );
}

/** Panel "Crear material" — combina 1-16 Materiales/Compuestos ya
 *  existentes bajo un nombre nuevo, categoría/propiedades automáticas. */
function PanelCrearMaterial({
  wb,
  materiales,
  compuestos,
  baseInicialId,
}: {
  wb: ReturnType<typeof useWorldbuilder>;
  materiales: { id: string; nombre: string }[];
  compuestos: { id: string; nombre: string }[];
  baseInicialId: string | null;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [intencionesTexto, setIntencionesTexto] = useState("");
  const [componentes, setComponentes] = useState<ComponenteMaterial[]>([{ tipo: "material", id: "" }]);

  useEffect(() => {
    if (baseInicialId) setComponentes([{ tipo: "material", id: baseInicialId }]);
  }, [baseInicialId]);

  const puedeCrear = nombre.trim() && componentes.every((c) => c.id) && !wb.creando;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-black text-primary/80">Crear un material nuevo</p>
        <p className="mt-1.5 text-[11px] leading-5 text-primary/45">
          Combiná Materiales o Compuestos que ya existen bajo un nombre propio. La categoría y las propiedades se
          calculan automáticamente — no hace falta tocar ningún número.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del material"
          className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
        />
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
          className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/70 outline-none focus:border-primary/40"
        />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">Componentes</p>
        <SelectorComponentes
          componentes={componentes}
          setComponentes={setComponentes}
          materiales={materiales}
          compuestos={compuestos}
        />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
          ¿Qué querés que tenga? (opcional)
        </p>
        <textarea
          value={intencionesTexto}
          onChange={(e) => {
            setIntencionesTexto(e.target.value);
            wb.detectarIntenciones(e.target.value);
          }}
          rows={2}
          placeholder="quiero que sea duro y resistente…"
          className="w-full resize-none rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/85 outline-none placeholder:text-primary/25 focus:border-primary/40"
        />
        <div className="mt-1.5">
          <ChipsIntenciones
            detectando={wb.detectando}
            intenciones={wb.intencionesDetectadas}
            activas={new Set(wb.intencionesDetectadas.map((i) => i.clave))}
            onToggle={() => {}}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!puedeCrear}
        onClick={() =>
          wb.crearMaterial({
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            componentes,
            intenciones: intencionesTexto.trim() || undefined,
          })
        }
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--bg-main)] transition-opacity disabled:opacity-30"
      >
        <Wand2 size={13} />
        {wb.creando ? "Creando…" : "Crear material"}
      </button>

      {wb.ultimaCreacion && "categoria" in wb.ultimaCreacion ? (
        <ResultadoMaterialCreado resultado={wb.ultimaCreacion as MaterialCreadoResultado} />
      ) : null}
    </div>
  );
}

/** Panel "Mezclar" — caso particular de crear material: exactamente 2
 *  materiales en proporción A/B (el flujo "70% Feliros + 30% Cuero" del
 *  docx de diseño). */
function PanelMezclar({
  wb,
  materiales,
}: {
  wb: ReturnType<typeof useWorldbuilder>;
  materiales: { id: string; nombre: string }[];
}) {
  const [nombre, setNombre] = useState("");
  const [materialAId, setMaterialAId] = useState("");
  const [materialBId, setMaterialBId] = useState("");
  const [porcentajeA, setPorcentajeA] = useState(50);
  const [intencionesTexto, setIntencionesTexto] = useState("");

  const materialA = materiales.find((m) => m.id === materialAId) ?? null;
  const materialB = materiales.find((m) => m.id === materialBId) ?? null;
  const puedeMezclar = nombre.trim() && materialAId && materialBId && materialAId !== materialBId && !wb.creando;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-black text-primary/80">Mezclar dos materiales</p>
        <p className="mt-1.5 text-[11px] leading-5 text-primary/45">
          Elegí dos materiales y una proporción — por ejemplo 70% de uno y 30% del otro. El resultado se calcula
          automáticamente, categoría incluida.
        </p>
      </div>

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del nuevo material"
        className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
      />

      <div className="flex flex-col gap-3 rounded-xl border border-primary/10 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <SelectDropdown
            items={materiales}
            active={materialA}
            getKey={(m) => m.id}
            getLabel={(m) => m.nombre}
            onSelect={(m) => setMaterialAId(m.id)}
            placeholder="Material A…"
          />
          <StatusPill>{porcentajeA}%</StatusPill>
        </div>

        <input
          type="range"
          min={1}
          max={99}
          value={porcentajeA}
          onChange={(e) => setPorcentajeA(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <SelectDropdown
            items={materiales}
            active={materialB}
            getKey={(m) => m.id}
            getLabel={(m) => m.nombre}
            onSelect={(m) => setMaterialBId(m.id)}
            placeholder="Material B…"
          />
          <StatusPill>{100 - porcentajeA}%</StatusPill>
        </div>
        {materialAId && materialAId === materialBId ? (
          <p className="text-[10px] font-bold text-red-400">Elegí dos materiales distintos.</p>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
          ¿Qué querés que tenga? (opcional)
        </p>
        <textarea
          value={intencionesTexto}
          onChange={(e) => {
            setIntencionesTexto(e.target.value);
            wb.detectarIntenciones(e.target.value);
          }}
          rows={2}
          placeholder="quiero que sea flexible y transparente…"
          className="w-full resize-none rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/85 outline-none placeholder:text-primary/25 focus:border-primary/40"
        />
        <div className="mt-1.5">
          <ChipsIntenciones
            detectando={wb.detectando}
            intenciones={wb.intencionesDetectadas}
            activas={new Set(wb.intencionesDetectadas.map((i) => i.clave))}
            onToggle={() => {}}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!puedeMezclar}
        onClick={() =>
          wb.mezclarMateriales({
            nombre: nombre.trim(),
            materialAId,
            materialBId,
            proporcionA: porcentajeA / 100,
            intenciones: intencionesTexto.trim() || undefined,
          })
        }
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--bg-main)] transition-opacity disabled:opacity-30"
      >
        <Blend size={13} />
        {wb.creando ? "Mezclando…" : "Mezclar"}
      </button>

      {wb.ultimaCreacion && "categoria" in wb.ultimaCreacion ? (
        <ResultadoMaterialCreado resultado={wb.ultimaCreacion as MaterialCreadoResultado} />
      ) : null}
    </div>
  );
}

/** Panel "Crear objeto" — tipo humano ("espada") + Materiales ya
 *  existentes. Si el tipo no se resuelve, el motor devuelve
 *  requiere_plantilla SIN crear nada — se lo mostramos tal cual, sin
 *  intentar adivinar qué quiso decir. */
function PanelCrearItem({
  wb,
  materiales,
}: {
  wb: ReturnType<typeof useWorldbuilder>;
  materiales: { id: string; nombre: string }[];
}) {
  const [nombre, setNombre] = useState("");
  const [tipoTexto, setTipoTexto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [intencionesTexto, setIntencionesTexto] = useState("");
  const [materialesItem, setMaterialesItem] = useState<MaterialDeItem[]>([]);

  const agregarMaterial = () => setMaterialesItem([...materialesItem, { id: "" }]);
  const quitarMaterial = (i: number) => setMaterialesItem(materialesItem.filter((_, idx) => idx !== i));
  const actualizarMaterial = (i: number, patch: Partial<MaterialDeItem>) =>
    setMaterialesItem(materialesItem.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const puedeCrear = nombre.trim() && tipoTexto.trim() && !wb.creando;
  const resultado = wb.ultimaCreacion && "tipo" in wb.ultimaCreacion ? (wb.ultimaCreacion as ItemCreadoResultado) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-black text-primary/80">Crear un objeto</p>
        <p className="mt-1.5 text-[11px] leading-5 text-primary/45">
          Describí qué tipo de objeto querés ("espada", "casco", "medallón"…) y con qué materiales — la geometría
          queda completamente escondida.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del objeto"
          className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
        />
        <input
          type="text"
          value={tipoTexto}
          onChange={(e) => setTipoTexto(e.target.value)}
          placeholder="Tipo de objeto (espada, casco…)"
          className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/70 outline-none focus:border-primary/40"
        />
      </div>

      <input
        type="text"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/70 outline-none focus:border-primary/40"
      />

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
          Materiales (opcional)
        </p>
        <div className="flex flex-col gap-2">
          {materialesItem.map((m, i) => {
            const activo = materiales.find((mat) => mat.id === m.id) ?? null;
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <SelectDropdown
                  items={materiales}
                  active={activo}
                  getKey={(mat) => mat.id}
                  getLabel={(mat) => mat.nombre}
                  onSelect={(mat) => actualizarMaterial(i, { id: mat.id })}
                  placeholder="Elegir material…"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={m.proporcion ?? ""}
                  onChange={(e) =>
                    actualizarMaterial(i, { proporcion: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  placeholder="% (opcional)"
                  className="w-28 rounded-md border border-primary/15 bg-transparent px-2 py-1.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
                />
                <button
                  type="button"
                  onClick={() => quitarMaterial(i)}
                  className="text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-red-400"
                >
                  Quitar
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={agregarMaterial}
            className="w-fit text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary/70"
          >
            + Agregar material
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
          ¿Qué querés que tenga? (opcional)
        </p>
        <textarea
          value={intencionesTexto}
          onChange={(e) => {
            setIntencionesTexto(e.target.value);
            wb.detectarIntenciones(e.target.value);
          }}
          rows={2}
          placeholder="quiero que sea duro…"
          className="w-full resize-none rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/85 outline-none placeholder:text-primary/25 focus:border-primary/40"
        />
        <div className="mt-1.5">
          <ChipsIntenciones
            detectando={wb.detectando}
            intenciones={wb.intencionesDetectadas}
            activas={new Set(wb.intencionesDetectadas.map((i) => i.clave))}
            onToggle={() => {}}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!puedeCrear}
        onClick={() =>
          wb.crearItem({
            nombre: nombre.trim(),
            tipoTexto: tipoTexto.trim(),
            descripcion: descripcion.trim() || undefined,
            materiales: materialesItem.filter((m) => m.id),
            intenciones: intencionesTexto.trim() || undefined,
          })
        }
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--bg-main)] transition-opacity disabled:opacity-30"
      >
        <Package size={13} />
        {wb.creando ? "Creando…" : "Crear objeto"}
      </button>

      {resultado ? (
        resultado.estado === "requiere_plantilla" ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs font-bold text-amber-500">
            No reconocimos "{tipoTexto}" como un tipo de objeto todavía. Probá con otra palabra (espada, casco,
            medallón…) o pedí que se agregue este tipo al catálogo.
          </div>
        ) : (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">Creado</p>
                <p className="text-sm font-black text-primary/90">{resultado.nombre}</p>
                <p className="text-[10px] font-bold capitalize text-primary/40">
                  {resultado.tipo?.nombre} · {resultado.categoria?.replace(/_/g, " ")}
                </p>
              </div>
              <Sparkles size={18} className="text-accent" />
            </div>
            {resultado.evaluacion ? (
              <div className="mt-4">
                <BloqueEvaluacion evaluacion={resultado.evaluacion} />
              </div>
            ) : null}
            {resultado.propiedades_fisicas ? (
              <DetallePropiedades propiedades={resultado.propiedades_fisicas} />
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

/** Historial reciente (worldbuilder_creaciones) — trazabilidad: "¿por qué
 *  esto terminó siendo X?" siempre reconstruible, colapsado por defecto
 *  para no competir visualmente con el flujo de creación. */
function PanelHistorial({ wb }: { wb: ReturnType<typeof useWorldbuilder> }) {
  useEffect(() => {
    wb.refetchCreaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <details className="rounded-2xl border border-primary/10 p-4">
      <summary className="flex cursor-pointer items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
        <Clock size={12} />
        Historial reciente
        <ChevronDown size={12} className="ml-auto" />
      </summary>
      <div className="mt-3">
        {wb.loadingCreaciones ? (
          <LoadingRow />
        ) : wb.creaciones.length === 0 ? (
          <EmptyRow>Todavía no hay creaciones registradas.</EmptyRow>
        ) : (
          <div className="flex flex-col gap-1.5">
            {wb.creaciones.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-primary/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-primary/70">
                    {c.entidad_tipo === "material" ? "Material" : "Objeto"} · {c.entrada_humana || "(sin descripción)"}
                  </p>
                  <p className="truncate text-[10px] text-primary/35">{new Date(c.created_at).toLocaleString()}</p>
                </div>
                <StatusPill tone={c.estado === "creado" ? "success" : c.estado === "no_cumple" ? "warning" : "default"}>
                  {c.estado}
                </StatusPill>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export function WorldbuilderPage() {
  const wb = useWorldbuilder();
  const { items: materiales, loading: loadingMateriales } = useMateriales();
  const { items: compuestos, loading: loadingCompuestos } = useCompuestos();

  const [modo, setModo] = useState<ModoWorldbuilder>("buscar");
  const [baseInicialId, setBaseInicialId] = useState<string | null>(null);

  const materialesLite = useMemo(() => materiales.map((m) => ({ id: m.id, nombre: m.nombre })), [materiales]);
  const compuestosLite = useMemo(() => compuestos.map((c) => ({ id: c.id, nombre: c.nombre })), [compuestos]);

  return (
    <div className="mx-auto max-w-5xl px-3 pb-16 pt-4 sm:px-4">
      <div className="mb-5 flex items-center gap-2.5">
        <Beaker size={18} className="text-accent" />
        <div>
          <p className="text-sm font-black text-primary/90">Worldbuilder</p>
          <p className="text-[11px] font-bold text-primary/40">
            Creá materiales y objetos describiendo lo que querés — sin fórmulas.
          </p>
        </div>
      </div>

      <div className="mb-5 inline-flex flex-wrap rounded-lg border border-primary/10 p-1">
        {MODOS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setModo(m.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
              modo === m.key ? "bg-primary/10 text-primary/90" : "text-primary/40 hover:text-primary/60"
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {wb.error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-bold text-red-400">
          {wb.error}
        </div>
      ) : null}

      {loadingMateriales || loadingCompuestos ? (
        <LoadingRow>Cargando catálogo de materiales y compuestos…</LoadingRow>
      ) : (
        <>
          {modo === "buscar" ? (
            <PanelBuscar
              wb={wb}
              onUsarComoBase={(id) => {
                setBaseInicialId(id);
                setModo("crear");
              }}
            />
          ) : null}
          {modo === "crear" ? (
            <PanelCrearMaterial
              wb={wb}
              materiales={materialesLite}
              compuestos={compuestosLite}
              baseInicialId={baseInicialId}
            />
          ) : null}
          {modo === "mezclar" ? <PanelMezclar wb={wb} materiales={materialesLite} /> : null}
          {modo === "item" ? <PanelCrearItem wb={wb} materiales={materialesLite} /> : null}
        </>
      )}

      <div className="mt-6">
        <PanelHistorial wb={wb} />
      </div>
    </div>
  );
}

export default WorldbuilderPage;
