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
 *   1. Crear material — combina 1-16 Materiales/Compuestos ya existentes.
 *   2. Mezclar — caso particular de (1): exactamente 2 materiales, A/B%.
 *   3. Crear item — tipo humano ("espada") + Materiales ya existentes.
 * (2026-09-18: se sacó el panel "Buscar" — ¿ya existe algo así? — que
 * corría fn_worldbuilder_sugerir_materiales sobre todo el catálogo antes de
 * crear. La RPC y el estado en useWorldbuilder [buscando/sugerencias/
 * buscarMateriales] siguen vivos por si se quiere reintroducir, pero ya no
 * tienen ningún caller en esta página.)
 * Todas comparten el mismo panel de "detectar intención" (chips ✓/✗
 * editables antes de ejecutar nada) y el mismo bloque de evaluación humana
 * al final — nunca se muestra una fórmula ni un número crudo como veredicto,
 * solo ✓/✗ con la posibilidad de expandir el detalle si el usuario lo pide.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Blend,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FlaskConical,
  Package,
  Sparkles,
  TestTube2,
  Wand2,
  XCircle,
} from "lucide-react";

import { useCompuestos } from "@/domains/garlia/elementos/useCompuestos";
import { useMateriales } from "@/domains/garlia/materiales/useMateriales";
import { LaboratorioPropiedadesSection } from "@/domains/garlia/materiales/LaboratorioPropiedadesSection";
import { LaboratorioOrisSection } from "@/domains/garlia/materiales/LaboratorioOrisSection";
import { useFormasGeometricas } from "@/domains/garlia/items/useFormasGeometricas";
import { supabase } from "@/infra/supabase/supabase";

import { useWorldbuilder } from "./useWorldbuilder";
import {
  EmptyRow,
  LoadingRow,
  PreviewPlantilla,
  SelectDropdown,
  SelectDropdownConCategoria,
  SelectorFormaGeometrica,
  SelectorIntenciones,
  StatusPill,
} from "./ui";
import type {
  ComponenteMaterial,
  CriterioEvaluado,
  EvaluacionWorldbuilder,
  IntencionHumana,
  ItemCreadoResultado,
  MaterialCreadoResultado,
  MaterialDeItem,
  TipoObjeto,
} from "./types";

/** Arma el string `p_intenciones` que esperan las RPC (crear_material,
 *  mezclar_materiales, crear_item, sugerir_materiales) a partir de las
 *  claves elegidas en el multi-select — el motor vuelve a correr
 *  fn_worldbuilder_detectar_intenciones sobre este texto, así que basta con
 *  unir por coma los `nombre` (o sinónimo[0]) de cada intención elegida,
 *  probado en vivo contra el motor. */
function armarTextoIntenciones(claves: Set<string>, catalogo: IntencionHumana[]): string {
  return catalogo
    .filter((i) => claves.has(i.clave))
    .map((i) => i.nombre)
    .join(", ");
}

/** Hook chico para manejar el set de intenciones seleccionadas por panel —
 *  cada panel tiene su propio estado independiente (Crear/Mezclar/Item no
 *  comparten selección entre sí). */
function useSeleccionIntenciones() {
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const toggle = (clave: string) =>
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  return { seleccionadas, toggle, limpiar: () => setSeleccionadas(new Set()) };
}

type ModoWorldbuilder = "crear" | "mezclar" | "item" | "laboratorio" | "oris";

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
}: {
  wb: ReturnType<typeof useWorldbuilder>;
  materiales: { id: string; nombre: string }[];
  compuestos: { id: string; nombre: string }[];
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const { seleccionadas, toggle } = useSeleccionIntenciones();
  const [componentes, setComponentes] = useState<ComponenteMaterial[]>([{ tipo: "material", id: "" }]);

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
        <SelectorIntenciones
          intenciones={wb.intenciones}
          seleccionadas={seleccionadas}
          onToggle={toggle}
          loading={wb.loadingCatalogo}
        />
      </div>

      <button
        type="button"
        disabled={!puedeCrear}
        onClick={() =>
          wb.crearMaterial({
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            componentes,
            intenciones: seleccionadas.size > 0 ? armarTextoIntenciones(seleccionadas, wb.intenciones) : undefined,
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
  const { seleccionadas, toggle } = useSeleccionIntenciones();

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
        <SelectorIntenciones
          intenciones={wb.intenciones}
          seleccionadas={seleccionadas}
          onToggle={toggle}
          loading={wb.loadingCatalogo}
        />
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
            intenciones: seleccionadas.size > 0 ? armarTextoIntenciones(seleccionadas, wb.intenciones) : undefined,
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
  materiales: { id: string; nombre: string; categoria?: string | null }[];
}) {
  const [nombre, setNombre] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoObjeto | null>(null);
  // "Otro" cubre el tipo que no está (todavía) en worldbuilder_tipos_objeto
  // — se manda como texto libre a fn_worldbuilder_crear_item igual que
  // antes, así no se pierde la posibilidad de pedir algo fuera del
  // catálogo, solo deja de ser la ÚNICA forma de elegir un tipo.
  const [tipoLibre, setTipoLibre] = useState("");
  const [usarTipoLibre, setUsarTipoLibre] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const { seleccionadas, toggle } = useSeleccionIntenciones();
  const [materialesItem, setMaterialesItem] = useState<MaterialDeItem[]>([]);

  // Forma geométrica — mismo modelo que items/EditorGeometriaItem.tsx, pero
  // opcional y controlado: por defecto el objeto usa la forma que ya trae
  // la plantilla del tipo elegido (crear_item_desde_plantilla_geometrica en
  // Supabase la fija sola), esto es solo para el worldbuilder que quiere
  // sobreescribirla (ej. una "Espada" con forma de cilindro en vez de la
  // hoja prismática por defecto). Como fn_worldbuilder_crear_item no acepta
  // geometría, se aplica con un update aparte DESPUÉS de crear el item.
  const { formas: formasGeometricas, loading: loadingFormas } = useFormasGeometricas();
  const [formaGeometrica, setFormaGeometrica] = useState<{ forma: string | null; medidas: Record<string, string> }>({
    forma: null,
    medidas: {},
  });
  const [guardandoForma, setGuardandoForma] = useState(false);

  const agregarMaterial = () => setMaterialesItem([...materialesItem, { id: "" }]);
  const quitarMaterial = (i: number) => setMaterialesItem(materialesItem.filter((_, idx) => idx !== i));
  const actualizarMaterial = (i: number, patch: Partial<MaterialDeItem>) =>
    setMaterialesItem(materialesItem.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const tipoTexto = usarTipoLibre ? tipoLibre.trim() : tipoSeleccionado?.nombre_humano ?? "";
  const puedeCrear = nombre.trim() && tipoTexto && !wb.creando;
  const resultado = wb.ultimaCreacion && "tipo" in wb.ultimaCreacion ? (wb.ultimaCreacion as ItemCreadoResultado) : null;

  async function crearConFormaOpcional() {
    const creado = await wb.crearItem({
      nombre: nombre.trim(),
      tipoTexto,
      descripcion: descripcion.trim() || undefined,
      materiales: materialesItem.filter((m) => m.id),
      intenciones: seleccionadas.size > 0 ? armarTextoIntenciones(seleccionadas, wb.intenciones) : undefined,
    });
    if (!creado || creado.estado === "requiere_plantilla" || !creado.id || !formaGeometrica.forma) return;

    // Sobreescritura de forma, igual patrón que EditorGeometriaItem.tsx:
    // se manda {forma, medidas...} y el trigger de Supabase recalcula
    // volumen/masa/densidad. No se llama a wb.crearItem de nuevo — es un
    // update directo sobre el item recién creado.
    setGuardandoForma(true);
    const forma = formasGeometricas.find((f) => f.clave === formaGeometrica.forma);
    const geometriaNueva: Record<string, unknown> = { forma: formaGeometrica.forma };
    if (forma) {
      for (const clave of forma.parametrosNumericos) {
        const n = Number(formaGeometrica.medidas[clave]);
        if (!Number.isNaN(n) && n > 0) geometriaNueva[clave] = n;
      }
      const unidad = forma.parametrosDefault["unidad_longitud"];
      if (unidad) geometriaNueva["unidad_longitud"] = unidad;
    }
    const { error } = await supabase.from("items").update({ geometria_fisica: geometriaNueva }).eq("id", creado.id);
    setGuardandoForma(false);
    if (error) {
      console.error("[PanelCrearItem] error guardando forma sobre item creado:", error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">Nombre</p>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del objeto"
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
          />
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">Tipo</p>
          {wb.loadingCatalogo ? (
            <p className="text-[10px] font-bold text-primary/35">Cargando catálogo de tipos…</p>
          ) : usarTipoLibre ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={tipoLibre}
                onChange={(e) => setTipoLibre(e.target.value)}
                placeholder="Describí el tipo (ej. yelmo, vara…)"
                className="w-full rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold text-primary/70 outline-none focus:border-primary/40"
              />
              <button
                type="button"
                onClick={() => setUsarTipoLibre(false)}
                className="text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60"
              >
                Volver al catálogo
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <SelectDropdown
                items={wb.tiposObjeto}
                active={tipoSeleccionado}
                getKey={(t) => t.id}
                getLabel={(t) => t.nombre_humano}
                onSelect={setTipoSeleccionado}
                placeholder="Elegir tipo…"
              />
              <button
                type="button"
                onClick={() => setUsarTipoLibre(true)}
                className="text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60"
              >
                No está en la lista
              </button>
            </div>
          )}
          {tipoSeleccionado && !usarTipoLibre ? (
            <div className="mt-2.5">
              <PreviewPlantilla parametros={tipoSeleccionado.parametros_base} />
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
            Forma (opcional)
          </p>
          <SelectorFormaGeometrica
            formas={formasGeometricas}
            loading={loadingFormas}
            valor={formaGeometrica}
            onChange={setFormaGeometrica}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
            Materiales (opcional)
          </p>
          <div className="flex flex-col gap-2">
            {materialesItem.map((m, i) => {
              const activo = materiales.find((mat) => mat.id === m.id) ?? null;
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <SelectDropdownConCategoria
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
                    className="w-24 rounded-md border border-primary/15 bg-transparent px-2 py-1.5 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
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
            Propiedades que busca (opcional)
          </p>
          <SelectorIntenciones
            intenciones={wb.intenciones}
            seleccionadas={seleccionadas}
            onToggle={toggle}
            loading={wb.loadingCatalogo}
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/35">
          Descripción (opcional)
        </p>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describí el objeto con el detalle que quieras…"
          rows={5}
          className="w-full resize-y rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-bold leading-5 text-primary/70 outline-none focus:border-primary/40"
        />
      </div>

      <button
        type="button"
        disabled={!puedeCrear || guardandoForma}
        onClick={() => void crearConFormaOpcional()}
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--bg-main)] transition-opacity disabled:opacity-30"
      >
        <Package size={13} />
        {wb.creando ? "Creando…" : guardandoForma ? "Ajustando forma…" : "Crear objeto"}
      </button>

      {resultado ? (
        resultado.estado === "requiere_plantilla" ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs font-bold text-amber-500">
            No reconocimos "{tipoTexto}" como un tipo de objeto todavía. Elegí uno del catálogo o pedí que se agregue
            este tipo.
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
                {/* No hay una convención de ruta confirmada en este export
                 * para "abrir este Item en su catálogo" (no se encontró
                 * ningún ?seleccionar=/id= existente en items/ ni un
                 * page.tsx de routing en este árbol) — se muestra el id
                 * real con copiar, en vez de inventar un link que podría
                 * apuntar a una ruta que no existe. Si el proyecto define
                 * una ruta de detalle de Item, reemplazar este bloque por
                 * un <a href> real a esa ruta. */}
                {resultado.id ? (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(resultado.id!)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-accent hover:underline"
                    title={resultado.id}
                  >
                    Copiar ID del objeto creado
                  </button>
                ) : null}
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

// ─── Nav por grupos, mismo lenguaje visual/estructural que VisualizadorPage
// (sidebar de acordeón a la izquierda, ~150px, sección a la derecha) — se
// agrega el grupo "Lab" con la misma LaboratorioPropiedadesSection que ya
// vive en el Visualizador (VIS-17), reusada tal cual: es 100% autocontenida
// (sus propios hooks/fetches a Supabase), sin props, así que no hace falta
// tocarla ni duplicarla — mismo componente, dos lugares donde se monta.
type GrupoWorldbuilder = "Crear" | "Lab";

type NavItemWorldbuilder = { key: ModoWorldbuilder; label: string; icon: React.ReactNode };

const NAV_GROUPS: { group: GrupoWorldbuilder; items: NavItemWorldbuilder[] }[] = [
  {
    group: "Crear",
    items: [
      { key: "crear", label: "Crear material", icon: <FlaskConical size={15} /> },
      { key: "mezclar", label: "Mezclar", icon: <Blend size={15} /> },
      { key: "item", label: "Crear objeto", icon: <Package size={15} /> },
    ],
  },
  {
    group: "Lab",
    items: [
      { key: "laboratorio", label: "Laboratorio", icon: <TestTube2 size={15} /> },
      { key: "oris", label: "Oris", icon: <Sparkles size={15} /> },
    ],
  },
];

export function WorldbuilderPage() {
  const wb = useWorldbuilder();
  const { items: materiales, loading: loadingMateriales } = useMateriales();
  const { items: compuestos, loading: loadingCompuestos } = useCompuestos();

  const [modo, setModo] = useState<ModoWorldbuilder>("crear");
  // Acordeón de sidebar — arranca expandiendo el grupo que contiene el modo
  // activo, mismo criterio que grupoExpandido en VisualizadorPage.
  const [grupoExpandido, setGrupoExpandido] = useState<GrupoWorldbuilder | null>(
    () => NAV_GROUPS.find((g) => g.items.some((i) => i.key === "crear"))?.group ?? NAV_GROUPS[0]?.group ?? null,
  );

  const materialesLite = useMemo(
    () => materiales.map((m) => ({ id: m.id, nombre: m.nombre, categoria: m.categoria ?? null })),
    [materiales],
  );
  const compuestosLite = useMemo(
    () => compuestos.map((c) => ({ id: c.id, nombre: c.nombre, categoria: c.categoria ?? null })),
    [compuestos],
  );

  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-primary">
      <div className="w-full py-8">
        <div className="grid gap-2 lg:grid-cols-[150px_minmax(0,1fr)]">
          <aside className="p-0 lg:sticky lg:top-6 lg:self-start">
            <nav className="space-y-1">
              {NAV_GROUPS.map((grupo) => {
                const expandido = grupoExpandido === grupo.group;
                const grupoActivo = grupo.items.some((i) => i.key === modo);
                return (
                  <div key={grupo.group}>
                    <button
                      type="button"
                      onClick={() => setGrupoExpandido(expandido ? null : grupo.group)}
                      className={`flex w-full items-center justify-between gap-2 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${
                        grupoActivo ? "text-primary/70" : "text-primary/30 hover:text-primary/55"
                      }`}
                    >
                      <span>{grupo.group}</span>
                      <ChevronRight
                        size={12}
                        className={`shrink-0 transition-transform ${expandido ? "rotate-90" : ""}`}
                      />
                    </button>
                    {expandido ? (
                      <div className="mb-2 space-y-1.5 pl-1">
                        {grupo.items.map((item) => {
                          const selected = item.key === modo;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setModo(item.key)}
                              className={`flex w-full items-center gap-2 py-2 text-left text-xs transition-colors ${
                                selected ? "font-black text-primary/90" : "font-medium text-primary/45 hover:text-primary/70"
                              }`}
                            >
                              {item.icon}
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 px-3 pb-16 sm:px-4">
            {wb.error ? (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-bold text-red-400">
                {wb.error}
              </div>
            ) : null}

            {modo === "laboratorio" ? (
              <LaboratorioPropiedadesSection />
            ) : modo === "oris" ? (
              <LaboratorioOrisSection />
            ) : loadingMateriales || loadingCompuestos ? (
              <LoadingRow>Cargando catálogo de materiales y compuestos…</LoadingRow>
            ) : (
              <>
                {modo === "crear" ? (
                  <PanelCrearMaterial wb={wb} materiales={materialesLite} compuestos={compuestosLite} />
                ) : null}
                {modo === "mezclar" ? <PanelMezclar wb={wb} materiales={materialesLite} /> : null}
                {modo === "item" ? <PanelCrearItem wb={wb} materiales={materialesLite} /> : null}
              </>
            )}

            {modo !== "laboratorio" ? (
              <div className="mt-6">
                <PanelHistorial wb={wb} />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

export default WorldbuilderPage;
