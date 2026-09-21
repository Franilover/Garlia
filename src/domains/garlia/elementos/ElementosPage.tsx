"use client";

/**
 * ElementosPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Vista de la sección "Tabla" (Tabla Química/Alquímica): grid de los 29
 * elementos + detalle inline al seleccionar uno (capas núcleo/media/externa
 * editables). Mismo patrón que RunasPage: sin navegar a otra ruta, toggle
 * de selección adentro de la misma página.
 *
 * Elementos y Compuestos se apilan verticalmente en una sola columna con
 * scroll (en vez de tabs que muestran una sección a la vez).
 */

import { Atom, Box, Dices, Download, Loader2, Package, Plus, Save, Trash2, Upload, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/infra/supabase/supabase";
import { SaveIndicator } from "@/domains/garlia/_shared/UIComponents";

import { CompuestosPage, CompuestoPanelFlotante } from "./CompuestosPage";
import { MaterialesPage, MaterialEditorFlotante } from "../materiales/MaterialesPage";
import { BreadcrumbJerarquia, type NivelBreadcrumb } from "../biologia/BreadcrumbJerarquia";

import EstructurasPage from "./EstructurasPage";
import ProcesosPage from "./ProcesosPage";
import FenomenosPage from "./FenomenosPage";

import { ReaccionesPage } from "./ReaccionesPage";
import { ElementoEditor } from "./ElementoEditor";
import {
  useCompuestosConElementos,
  sincronizarComponentesCompuesto,
} from "./useCompuestosConElementos";
import { useReacciones } from "./useReacciones";
import { useEstructuras } from "./useEstructuras";
import { useMateriales } from "../materiales/useMateriales";
import { CONFIG_MATERIAL_COMPONENTES, type MaterialComponente } from "../materiales/types";
import { CONFIG_ITEM_MATERIALES, type ItemMaterial } from "../items/types";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { useFormasGeometricas } from "./useGeometriaCatalogo";
import { ListaFormas } from "../fisica/GeometriasPage";
import { useProcesos } from "./useProcesos";
import { useFenomenos } from "./useFenomenos";
import { FilaAsimetrica } from "../_shared/FilaAsimetrica";
import { CabeceraSeccionConMenu } from "../_shared/CabeceraSeccionConMenu";
import { FiltroDropdown } from "../_shared/FiltroDropdown";
import { PROPIEDADES_ORDENABLES } from "../_shared/OrdenarPorPropiedadPopover";
import { useFiltrosEstructuras } from "./useFiltrosEstructuras";
import {
  etiquetaFuncion,
  FILTROS_VACIOS,
  funcionClave,
  hayFiltrosActivos,
  opcionesUnicas,
  type FiltrosEstructuras,
} from "./estructurasBiblioteca";
import {
  type EditorHeaderControls,
} from "../_shared/useEditorHeaderControls";
import {
  ELEMENT_FAMILIES,
  type Compuesto,
  type Elemento,
  type ElementFamily,
  type Reaccion,
} from "./types";

// ─── Descarga: todos los elementos de la Tabla Química en un solo JSON ─────
// Incluye también los compuestos (editables desde Supabase), para que el
// JSON exportado quede autocontenido con la tabla + las combinaciones.
export function descargarDatosElementos(
  elementos: Elemento[],
  compuestos: Compuesto[],
) {
  const payload = {
    exportado_en: new Date().toISOString(),
    elementos,
    compuestos,
  };
  descargarJSON(payload, "tabla-elementos");
}

// ─── Descarga: solo Elementos + Compuestos ─────────────────────────────────
function descargarElementosYCompuestos(elementos: Elemento[], compuestos: Compuesto[]) {
  const payload = {
    exportado_en: new Date().toISOString(),
    elementos,
    compuestos,
  };
  descargarJSON(payload, "elementos-compuestos");
}

function descargarJSON(payload: unknown, nombreBase: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombreBase}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Subida: leer un JSON con el mismo formato exportado y devolver los ───
// elementos nuevos listos para insertar. No toca Supabase directamente —
// eso lo hace el caller (ElementosSection), mismo espíritu que onCreate:
// esta función solo parsea/valida el archivo del usuario.
//
// Reglas de importación:
// - Solo se leen los campos válidos de Elemento (se ignora "id" si viene,
//   porque Supabase genera uno nuevo — igual que handleCreate en
//   ElementosSection, que tampoco manda id).
// - "numero_atomico" es obligatorio y debe ser único frente a lo ya
//   cargado en la tabla (evita pisar el elemento equivocado sin darse
//   cuenta al importar un lote como el de este chat).
// - Si el archivo trae "compuestos" se devuelven también, sueltos, para
//   que el caller decida si los sube.
export interface ImportacionElementos {
  elementosNuevos: Omit<Elemento, "id">[];
  /**
   * Elementos del archivo que coinciden (mismo número atómico) con uno ya
   * existente en la tabla: se actualizan (upsert) en vez de saltarse.
   * Incluye el id existente para poder hacer el UPDATE.
   */
  elementosActualizar: (Partial<Elemento> & { id: string })[];
  compuestos?: Compuesto[];
}

export function parsearArchivoElementosJSON(
  raw: string,
  elementosExistentes: Elemento[],
): ImportacionElementos {
  const data = JSON.parse(raw);
  const lista: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.elementos) ? data.elementos : null;
  if (!lista) {
    throw new Error('El JSON debe ser un arreglo de elementos, o un objeto con la clave "elementos".');
  }

  const porNumeroAtomico = new Map(elementosExistentes.map((e) => [e.numero_atomico, e]));
  const elementosNuevos: Omit<Elemento, "id">[] = [];
  const elementosActualizar: (Partial<Elemento> & { id: string })[] = [];

  for (const raw of lista) {
    const e = raw as Partial<Elemento>;
    if (typeof e.numero_atomico !== "number" || !e.nombre || !e.simbolo || !e.familia) {
      throw new Error(
        `Elemento inválido (falta numero_atomico, nombre, simbolo o familia): ${JSON.stringify(e).slice(0, 120)}`,
      );
    }
    const datos = {
      numero_atomico: e.numero_atomico,
      nombre: e.nombre,
      simbolo: e.simbolo,
      familia: e.familia,
      es_noble: e.es_noble ?? false,
      notas: e.notas ?? null,
      nucleo: e.nucleo ?? {},
      media: e.media ?? {},
      externa: e.externa ?? {},
      es_catalizador: e.es_catalizador ?? false,
    };

    const existente = porNumeroAtomico.get(e.numero_atomico);
    if (existente) {
      // Actualiza (upsert): mismo número atómico → sobrescribe el existente
      // con los datos del archivo, en vez de saltarlo.
      elementosActualizar.push({ id: existente.id, ...datos });
    } else {
      elementosNuevos.push(datos);
    }
    // También evita tratar dos filas del propio archivo con el mismo
    // número atómico como "nuevas" por separado — la segunda pasa a
    // actualizar la primera (aunque todavía no tenga id real, se resuelve
    // en el insert; este Map solo protege contra los ya existentes en DB).
  }

  return {
    elementosNuevos,
    elementosActualizar,
    compuestos: Array.isArray(data?.compuestos) ? data.compuestos : undefined,
  };
}

interface Props {
  elementos: Elemento[];
  loading?: boolean;
  creating?: boolean;
  onCreate?: () => void;
  onActualizar: (id: string, cambios: Partial<Elemento>) => void;
  onEliminar?: (id: string) => void;
  /** Renombrado liviano (solo campo "nombre", persistido directo a
   *  Supabase) para el modal "Editar" del título de sección — ver
   *  CabeceraSeccionConMenu.tsx. Distinto de onActualizar (estado local). */
  onRenombrar?: (id: string, nuevoNombre: string) => void | Promise<void>;
  /**
   * Borra varios elementos de una: usada por la selección múltiple
   * (Shift+Click en el grid). Si no se pasa, se cae a llamar onEliminar
   * uno por uno.
   */
  onEliminarVarios?: (ids: string[]) => Promise<void>;
  /** Id a dejar seleccionado tras crear (mismo patrón que runaRecienCreadaId). */
  seleccionarId?: string | null;
  /**
   * Id de un COMPUESTO a abrir de entrada, desde afuera del componente —
   * mismo mecanismo que ya usa internamente "Usado en compuestos" del
   * editor de Elemento (ver compuestoAAbrir más abajo), expuesto ahora
   * como prop para que otras secciones (ej. el panel de auditoría) puedan
   * enlazar directo a un compuesto puntual vía openEntity("elementos", id).
   * Opcional: si no se pasa, el comportamiento es exactamente el de antes.
   */
  compuestoIdInicial?: string | null;
  /**
   * Inserta en Supabase un lote de elementos nuevos (sin id) y devuelve
   * cuántos quedaron guardados. El botón "Subir JSON" llama a esto tras
   * parsear el archivo — mismo espíritu que onCreate pero para varios a
   * la vez.
   */
  onImportarElementos?: (elementos: Omit<Elemento, "id">[]) => Promise<number>;
  /**
   * Actualiza en Supabase un lote de elementos ya existentes (con id) cuyo
   * número atómico coincidió con uno del archivo subido — hace upsert en
   * vez de saltarlos. Devuelve cuántos quedaron actualizados.
   */
  onActualizarVarios?: (elementos: (Partial<Elemento> & { id: string })[]) => Promise<number>;
  /**
   * Notifica cada vez que cambia el elemento abierto en el panel (o se
   * cierra, con null) — usado por RunasPage para persistir el último
   * elemento visto en useMagiaSeccionStore y reabrirlo tras un refresh.
   * Opcional: si no se pasa, el comportamiento es igual que antes.
   */
  onSeleccionarIdChange?: (id: string | null) => void;
}

/** Agrupa y ordena elementos por familia (Noble, Rígido, Intermedio, Reactivo,
 * Inerte) — mismo orden que ELEMENT_FAMILIES — con los elementos de cada
 * familia ordenados por número atómico. */
function agruparComoTablaPeriodica(elementos: Elemento[]): { familia: ElementFamily; elementos: Elemento[] }[] {
  const porFamilia = new Map<ElementFamily, Elemento[]>();
  for (const el of elementos) {
    if (!porFamilia.has(el.familia)) porFamilia.set(el.familia, []);
    porFamilia.get(el.familia)!.push(el);
  }
  return ELEMENT_FAMILIES.filter((familia) => porFamilia.has(familia)).map((familia) => ({
    familia,
    elementos: porFamilia.get(familia)!.sort((x, y) => x.numero_atomico - y.numero_atomico),
  }));
}

/**
 * Casilla tipo tabla periódica: símbolo (abreviatura) grande y centrado en
 * vez de imagen/ícono genérico, con número atómico arriba y las 3 capas
 * resumidas abajo — toda la info clave visible sin entrar al detalle.
 * Reemplaza a EntityCard/EntityCardGrid acá porque esas dos asumen
 * imagen-o-ícono + una sola línea de subtítulo, insuficiente para lo que
 * se quiere mostrar por elemento.
 */
function ElementoCasilla({
  elemento,
  seleccionado,
  enSeleccionMultiple,
  onClick,
}: {
  elemento: Elemento;
  seleccionado?: boolean;
  /** true si esta casilla está marcada dentro de una selección múltiple (Shift+Click). */
  enSeleccionMultiple?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Click: ver detalle · Shift+Click: agregar/quitar de la selección múltiple · Familia: ${elemento.familia}`}
      className={`group flex flex-col items-stretch gap-0.5 p-1.5 border-r border-b transition-colors text-left ${
        enSeleccionMultiple || seleccionado
          ? "border-primary/10 bg-primary/10 ring-1 ring-inset ring-primary/40"
          : "border-primary/10 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-micro font-black text-primary/30 tabular-nums">
          #{elemento.numero_atomico}
        </span>
        {elemento.es_noble && (
          <span
            title="Noble"
            className="w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0 mt-0.5"
          />
        )}
      </div>

      <span className="text-base font-black text-center leading-none py-0.5 text-primary">
        {elemento.simbolo || "??"}
      </span>

      <span className="text-micro font-bold text-primary/80 truncate text-center leading-tight">
        {elemento.nombre}
      </span>
    </button>
  );
}

/**
 * Panel flotante centrado del detalle de un Elemento — mismo comportamiento
 * visual que PanelFlotanteGlobal usa para Personaje/Criatura (modal grande
 * centrado en pantalla con backdrop blur, animación popIn, Escape para
 * cerrar y bloqueo de scroll del fondo). Se mantiene local a Química (en
 * vez de sumarse al store global usePanelFlotante) porque ElementoEditor
 * necesita onActualizar/onEliminar, que son propios de esta página.
 */
export function ElementoPanelFlotante({
  elemento,
  todosLosElementos,
  onCerrar,
  onActualizar,
  onEliminar,
  compuestos,
  onNavigateCompuesto,
}: {
  elemento: Elemento;
  todosLosElementos: Elemento[];
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Elemento>) => void;
  onEliminar?: (id: string) => void;
  /** Catálogo de compuestos, para mostrar en qué compuestos se usa este
   *  elemento (columna junto a Notas dentro de ElementoEditor). */
  compuestos?: Compuesto[];
  /** Navega al panel flotante de un Compuesto donde se usa este elemento. */
  onNavigateCompuesto?: (compuestoId: string) => void;
}) {
  const [headerControls, setHeaderControls] = useState<EditorHeaderControls | null>(null);
  // Compuesto abierto desde el nivel "Compuesto" de la barra superior
  // (Elementos › Compuestos › Materiales) — mismo patrón exacto que el
  // breadcrumb interno de CompuestoEditor: navegar acá abre el mismo
  // CompuestoPanelFlotante que "Usado en compuestos" ya abre más abajo en
  // ElementoEditor (vía onNavigateCompuesto).
  const [compuestoAbiertoId, setCompuestoAbiertoId] = useState<string | null>(null);
  // Material abierto desde el nivel "Materiales" de la misma barra
  // superior — un salto directo Elemento → Material, sin tener que pasar
  // primero por el sub-panel de Compuesto.
  const [materialAbiertoId, setMaterialAbiertoId] = useState<string | null>(null);

  // Catálogo de Materiales — useSupabaseData cachea vía Dexie, así que
  // instanciarlo acá no repite fetch si ya se cargó en Materiales/Química
  // (mismo criterio documentado para celulasCatalogo en CompuestoEditor).
  const { items: materiales } = useMateriales();

  // Compuestos donde se usa este elemento — mismo cálculo que
  // compuestosQueLoUsan en ElementoEditor, para poblar el nivel
  // "Compuestos" de la barra superior sin duplicar el fetch acá.
  const compuestosQueLoUsan = useMemo(
    () =>
      (compuestos ?? []).filter((c) =>
        (c.componentes ?? []).some((comp) => comp.elemento_id === elemento.id),
      ),
    [compuestos, elemento.id],
  );

  // Materiales hechos con alguno de esos compuestos — nivel "Materiales"
  // de la barra superior, un salto más allá de "Usado en compuestos".
  // Mismo patrón que useMaterialesDeCompuesto.ts (camino inverso vía la
  // tabla puente material_componentes), pero para varios compuestos a la
  // vez en vez de uno solo — no se creó un hook nuevo para esto porque acá
  // ya se necesitan ambas fuentes (materiales.items + vínculos crudos) sin
  // el wrapper de "un solo compuestoId".
  const { data: vinculosMaterialCompuesto } = useSupabaseData<MaterialComponente>(
    CONFIG_MATERIAL_COMPONENTES.tabla,
    { select: CONFIG_MATERIAL_COMPONENTES.select },
  );
  const materialesQueLoUsan = useMemo(() => {
    const idsCompuestos = new Set(compuestosQueLoUsan.map((c) => c.id));
    const idsMateriales = new Set(
      vinculosMaterialCompuesto
        .filter((v) => v.componente_tipo === "compuesto" && idsCompuestos.has(v.componente_id))
        .map((v) => v.material_id),
    );
    return materiales.filter((m) => idsMateriales.has(m.id));
  }, [vinculosMaterialCompuesto, compuestosQueLoUsan, materiales]);

  // Objetos que usan alguno de esos materiales en su composición — nivel
  // "Objetos" de la barra superior, un salto más allá de "Materiales".
  // Mismo patrón indirecto que materialesQueLoUsan de arriba (tabla puente
  // + filtro por ids ya resueltos), pero sobre item_materiales en vez de
  // material_componentes, y sin catálogo de Items cacheado (no existe un
  // useItems() en este paquete) — se resuelve id+nombre con un fetch
  // puntual, igual que useObjetosDeMaterial.ts.
  const { data: vinculosItemMaterial } = useSupabaseData<ItemMaterial>(
    CONFIG_ITEM_MATERIALES.tabla,
    { select: CONFIG_ITEM_MATERIALES.select },
  );
  const idsObjetosQueLoUsan = useMemo(() => {
    const idsMateriales = new Set(materialesQueLoUsan.map((m) => m.id));
    return Array.from(
      new Set(
        vinculosItemMaterial
          .filter((v) => idsMateriales.has(v.material_id))
          .map((v) => v.item_id),
      ),
    );
  }, [vinculosItemMaterial, materialesQueLoUsan]);
  const [objetosQueLoUsan, setObjetosQueLoUsan] = useState<{ id: string; nombre: string }[]>([]);
  const [loadingObjetosQueLoUsan, setLoadingObjetosQueLoUsan] = useState(false);
  useEffect(() => {
    let cancelado = false;
    if (idsObjetosQueLoUsan.length === 0) {
      setObjetosQueLoUsan([]);
      return;
    }
    setLoadingObjetosQueLoUsan(true);
    supabase
      .from("items")
      .select("id, nombre")
      .in("id", idsObjetosQueLoUsan)
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          console.error("[ElementoPanelFlotante] error cargando objetos:", error);
          setObjetosQueLoUsan([]);
        } else {
          setObjetosQueLoUsan((data as { id: string; nombre: string }[] | null) ?? []);
        }
        setLoadingObjetosQueLoUsan(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idsObjetosQueLoUsan]);
  // Item no tiene panel apilable propio — usePanelFlotante reemplaza en vez
  // de apilar (ver usePanelFlotanteStore.ts). Clic en "Objetos" cierra este
  // panel entero (onCerrar, igual que hace el nivel Objeto en
  // MaterialEditorFlotante) y deja solo el panel global del Item.
  const abrirPanelGlobalDesdeElemento = usePanelFlotante((s) => s.abrir);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 ${
        compuestoAbiertoId || materialAbiertoId ? "invisible pointer-events-none" : ""
      }`}
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          {headerControls ? (
            <>
              {headerControls.prefix}
              <input
                className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
                placeholder={headerControls.placeholderNombre}
                value={headerControls.nombre ?? ""}
                onChange={(e) => headerControls.onChangeNombre(e.target.value)}
                onBlur={headerControls.onBlurNombre}
              />
              {headerControls.extra}
              <div className="shrink-0 flex items-center gap-1.5">
                <SaveIndicator status={headerControls.status} />
                <button
                  type="button"
                  onClick={headerControls.onEliminar}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-micro font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
                >
                  <Trash2 size={10} />
                </button>
                <button
                  type="button"
                  disabled={headerControls.status === "saving"}
                  onClick={headerControls.onGuardar}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-micro font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  <Save size={10} /> Guardar
                </button>
              </div>
            </>
          ) : (
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
              }}
            >
              <Atom className="text-primary/50" size={12} />
            </div>
          )}
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Barra superior Elementos > Compuestos > Materiales > Objetos —
            mismo componente y mismo espíritu que el breadcrumb interno de
            CompuestoEditor (Elemento > Compuesto > Material > Objeto), pero
            acá arriba del todo porque este es el primer nivel de la
            cadena: "Elementos" activo, "Compuestos" navega a los compuestos
            que usan este elemento (mismo cálculo que "Usado en compuestos"
            en ElementoEditor), "Materiales" salta directo a los materiales
            hechos con alguno de esos compuestos, "Objetos" un salto más
            allá: los objetos que usan alguno de esos materiales en su
            composición (item_materiales). "Objetos" cierra este panel del
            todo y abre el panel global del Item (no hay ItemPanelFlotante
            apilable — ver usePanelFlotanteStore.ts). */}
        <div className="shrink-0 px-3 pt-2">
          <BreadcrumbJerarquia
            niveles={[
              { label: "Elementos", icono: <Atom size={10} />, activo: true },
              {
                label: "Compuestos",
                icono: <Package size={10} />,
                activo: false,
                items: compuestosQueLoUsan.map((c) => ({ id: c.id, nombre: c.nombre })),
                loading: false,
                onNavegar: setCompuestoAbiertoId,
              },
              {
                label: "Materiales",
                icono: <Box size={10} />,
                activo: false,
                items: materialesQueLoUsan.map((m) => ({ id: m.id, nombre: m.nombre })),
                loading: false,
                onNavegar: setMaterialAbiertoId,
              },
              {
                label: "Objetos",
                icono: <Dices size={10} />,
                activo: false,
                items: objetosQueLoUsan,
                loading: loadingObjetosQueLoUsan,
                onNavegar: (id) => {
                  onCerrar();
                  abrirPanelGlobalDesdeElemento("item", id);
                },
              },
            ]}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <ElementoEditor
            key={elemento.id}
            elemento={elemento}
            todosLosElementos={todosLosElementos}
            onBack={onCerrar}
            onActualizar={onActualizar}
            onEliminar={
              onEliminar
                ? (id) => {
                    onEliminar(id);
                  }
                : undefined
            }
            onHeaderControlsChange={setHeaderControls}
            compuestos={compuestos}
            onNavigateCompuesto={
              onNavigateCompuesto
                ? (compuestoId) => onNavigateCompuesto(compuestoId)
                : setCompuestoAbiertoId
            }
          />
        </div>
      </div>

      {/* Sub-panel del Compuesto elegido desde el nivel "Compuestos" de la
         barra superior (o desde "Usado en compuestos" si el caller no pasa
         su propio onNavigateCompuesto) — mismo CompuestoPanelFlotante que
         usa el resto del catálogo, apilado encima de este panel. */}
      {compuestoAbiertoId &&
        (() => {
          const compuestoActivo = (compuestos ?? []).find((c) => c.id === compuestoAbiertoId);
          if (!compuestoActivo) return null;
          return (
            <CompuestoPanelFlotante
              compuesto={compuestoActivo}
              elementos={todosLosElementos}
              todosLosCompuestos={compuestos ?? []}
              onCerrar={() => setCompuestoAbiertoId(null)}
              // El catálogo de compuestos llega acá de solo lectura (prop
              // "compuestos", sin setter) — mismo caso ya resuelto en
              // MaterialEditorFlotante → CompuestoPanelFlotante (ver ese
              // archivo): los campos editables del compuesto siguen
              // persistiendo en Supabase igual (CompuestoEditor.persist
              // no depende de este callback), solo no se refleja en este
              // array local hasta que el catálogo se vuelva a cargar.
              onActualizar={() => {}}
            />
          );
        })()}

      {/* Sub-panel del Material elegido desde el nivel "Materiales" de la
         barra superior — mismo MaterialEditorFlotante que usa el resto del
         catálogo, con su propio breadcrumb standalone (Elemento > Compuesto
         > Materiales) para seguir navegando desde ahí. */}
      {materialAbiertoId &&
        (() => {
          const materialActivo = materiales.find((m) => m.id === materialAbiertoId);
          if (!materialActivo) return null;
          return (
            <MaterialEditorFlotante material={materialActivo} onClose={() => setMaterialAbiertoId(null)} />
          );
        })()}
    </div>,
    document.body,
  );
}

// ─── Dropdown genérico para el botón "Descargar" ───────────────────────────
// Botón icon-only que al hacer click despliega un menú con las opciones de
// descarga. Se cierra al elegir una opción o al hacer click afuera.
function DropdownDescargar({
  opciones,
}: {
  opciones: { key: string; label: string; onClick: () => void }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function handleClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Descargar datos"
        className="flex items-center justify-center p-1.5 rounded-md border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer"
      >
        <Download size={14} />
      </button>

      {abierto && (
        <div
          style={{ background: "var(--white-custom, var(--bg-main))" }}
          className="absolute right-0 top-full mt-1 z-20 min-w-[10rem] rounded-md border border-primary/15 shadow-lg overflow-hidden"
        >
          {opciones.map((op) => (
            <button
              key={op.key}
              type="button"
              onClick={() => {
                op.onClick();
                setAbierto(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-micro font-black uppercase tracking-wide text-primary/60 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
            >
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ElementosPage({
  elementos,
  loading,
  creating,
  onCreate,
  onActualizar,
  onEliminar,
  onRenombrar,
  onEliminarVarios,
  seleccionarId,
  onImportarElementos,
  onActualizarVarios,
  onSeleccionarIdChange,
  compuestoIdInicial,
}: Props) {
  const [seleccionadoId, setSeleccionadoIdRaw] = useState<string | null>(null);
  const setSeleccionadoId = (
    valor: string | null | ((actual: string | null) => string | null),
  ) => {
    setSeleccionadoIdRaw((actual) => {
      const nuevo = typeof valor === "function" ? valor(actual) : valor;
      onSeleccionarIdChange?.(nuevo);
      return nuevo;
    });
  };
  // Al clickear un compuesto en "Usado en compuestos" desde el editor de un
  // Elemento: cierra el panel de Elemento y fuerza la apertura de este
  // compuesto en CompuestosPage (más abajo en la misma página).
  const [compuestoAAbrir, setCompuestoAAbrir] = useState<string | null>(
    compuestoIdInicial ?? null,
  );
  const [seleccionMultiple, setSeleccionMultiple] = useState<Set<string>>(new Set());
  const [eliminandoVarios, setEliminandoVarios] = useState(false);

  function toggleSeleccionMultiple(id: string) {
    setSeleccionMultiple((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClickCasilla(id: string, e: React.MouseEvent) {
    if (e.shiftKey) {
      // Shift+Click: no abre el panel de detalle, solo marca/desmarca
      // para el borrado en lote.
      toggleSeleccionMultiple(id);
      return;
    }
    // Click normal: comportamiento de siempre (abrir/cerrar detalle),
    // y limpia cualquier selección múltiple activa para no mezclar modos.
    setSeleccionMultiple(new Set());
    setSeleccionadoId((actual) => (actual === id ? null : id));
  }

  async function handleEliminarSeleccionMultiple() {
    const ids = Array.from(seleccionMultiple);
    if (ids.length === 0) return;
    const confirmado = window.confirm(
      `¿Eliminar ${ids.length} elemento${ids.length === 1 ? "" : "s"}? Esta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    setEliminandoVarios(true);
    try {
      if (onEliminarVarios) {
        await onEliminarVarios(ids);
      } else if (onEliminar) {
        // Fallback: sin batch delete disponible, se borra uno por uno.
        for (const id of ids) {
          await onEliminar(id);
        }
      }
      setSeleccionMultiple(new Set());
    } catch (e) {
      console.error("[ElementosPage] error eliminando selección múltiple:", e);
    } finally {
      setEliminandoVarios(false);
    }
  }
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null);

  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si se reintenta
    if (!archivo || !onImportarElementos) return;

    setImportando(true);
    setMensajeImportacion(null);
    try {
      const texto = await archivo.text();
      const { elementosNuevos, elementosActualizar } = parsearArchivoElementosJSON(texto, elementos);

      if (elementosNuevos.length === 0 && elementosActualizar.length === 0) {
        setMensajeImportacion("El archivo no traía elementos.");
        return;
      }

      const partes: string[] = [];

      if (elementosNuevos.length > 0) {
        const insertados = await onImportarElementos(elementosNuevos);
        partes.push(`${insertados} elemento${insertados === 1 ? "" : "s"} nuevo${insertados === 1 ? "" : "s"} subido${insertados === 1 ? "" : "s"}.`);
      }

      if (elementosActualizar.length > 0) {
        if (onActualizarVarios) {
          const actualizados = await onActualizarVarios(elementosActualizar);
          partes.push(`${actualizados} elemento${actualizados === 1 ? "" : "s"} existente${actualizados === 1 ? "" : "s"} actualizado${actualizados === 1 ? "" : "s"}.`);
        } else {
          partes.push(`${elementosActualizar.length} ya existían y no se actualizaron (falta onActualizarVarios).`);
        }
      }

      setMensajeImportacion(partes.join(" "));
    } catch (err) {
      console.error("[ElementosPage] error importando JSON:", err);
      setMensajeImportacion(err instanceof Error ? `Error: ${err.message}` : "Error al leer el archivo.");
    } finally {
      setImportando(false);
    }
  }
  // ── Compuestos: ahora apiladas verticalmente debajo de
  // Elementos en este mismo bloque "Química", sin selector de tabs ─────────
  // Fase 2 del rediseño: useCompuestosConElementos reconstruye
  // "componentes" desde la tabla relacional compuesto_elementos en vez de
  // leer compuestos.componentes (jsonb, @deprecated). Mismo shape de
  // retorno (items/setItems/loading) que useCompuestos — el resto de esta
  // página y CompuestosPage no necesitan cambios.
  const {
    items: compuestos,
    setItems: setCompuestos,
    loading: loadingCompuestos,
  } = useCompuestosConElementos();
  const [creatingCompuesto, setCreatingCompuesto] = useState(false);
  const [compuestoRecienCreadoId, setCompuestoRecienCreadoId] = useState<string | null>(null);

  async function handleCreateCompuesto() {
    setCreatingCompuesto(true);
    try {
      // Fase 2: ya no se manda componentes: [] al jsonb (deprecado) — el
      // compuesto nace sin composición y se completa por
      // sincronizarComponentesCompuesto cuando el usuario agrega elementos
      // desde el editor (ver CompuestoEditor.persist).
      const { data, error } = await supabase
        .from("compuestos")
        .insert([{ nombre: "Nuevo compuesto", simbolo: "??" }])
        .select()
        .single();
      if (error) throw error;
      const nuevoCompuesto = { ...(data as Compuesto), componentes: [] };
      setCompuestos((prev) => [...prev, nuevoCompuesto]);
      setCompuestoRecienCreadoId(nuevoCompuesto.id);
    } catch (e) {
      console.error("[ElementosPage] error creando compuesto:", e);
    } finally {
      setCreatingCompuesto(false);
    }
  }

  async function handleEliminarCompuesto(id: string) {
    try {
      const { error } = await supabase.from("compuestos").delete().eq("id", id);
      if (error) throw error;
      setCompuestos((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("[ElementosPage] error eliminando compuesto:", e);
    }
  }

  // Renombrar desde el modal "Editar" del título de sección (ver
  // CabeceraSeccionConMenu) — antes el único renombrado de Compuesto vivía
  // adentro de CompuestoEditor (persist con onBlur, requiere abrir el panel
  // flotante completo). Este es más liviano: solo el campo "nombre".
  async function handleRenombrarCompuesto(id: string, nuevoNombre: string) {
    try {
      const { error } = await supabase
        .from("compuestos")
        .update({ nombre: nuevoNombre })
        .eq("id", id);
      if (error) throw error;
      setCompuestos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, nombre: nuevoNombre } : c)),
      );
    } catch (e) {
      console.error("[ElementosPage] error renombrando compuesto:", e);
    }
  }

  // Laboratorio: crea un compuesto ya con componentes definidos (unión de
  // los de dos compuestos existentes) — usado por CompuestosPage.
  async function handleCrearCompuestoConComponentes(
    datos: Pick<Compuesto, "nombre" | "simbolo" | "componentes">,
  ) {
    setCreatingCompuesto(true);
    try {
      // Fase 2 del rediseño: el insert base ya NO manda componentes al
      // jsonb — se crea la fila "vacía" y la composición real se escribe
      // en compuesto_elementos vía sincronizarComponentesCompuesto, mismo
      // criterio que CompuestoEditor.persist(). El Laboratorio (origen de
      // este flujo) sigue mandando "componentes" en datos porque el tipo
      // Pick<Compuesto,...> no cambió — solo cambia dónde termina viviendo.
      const { componentes, ...datosBase } = datos;
      const { data, error } = await supabase
        .from("compuestos")
        .insert([datosBase])
        .select()
        .single();
      if (error) throw error;

      const nuevoCompuesto = data as Compuesto;

      if (componentes && componentes.length > 0) {
        const ok = await sincronizarComponentesCompuesto(nuevoCompuesto.id, componentes);
        if (!ok) throw new Error("no se pudo guardar la composición del compuesto nuevo");
      }

      setCompuestos((prev) => [...prev, { ...nuevoCompuesto, componentes: componentes ?? [] }]);
      setCompuestoRecienCreadoId(nuevoCompuesto.id);
    } catch (e) {
      console.error("[ElementosPage] error creando compuesto combinado:", e);
    } finally {
      setCreatingCompuesto(false);
    }
  }

  // ── Conteos para decidir el layout de FilaAsimetrica (ver
  // _shared/FilaAsimetrica.tsx) — no se usa el resto de lo que devuelven
  // estos hooks acá, cada subpágina (EstructurasPage/MaterialesPage/
  // ProcesosPage/FenomenosPage) sigue haciendo su propio fetch/render;
  // esto solo lee el total para elegir 3 columnas iguales vs 2/3+1/3.
  // También trae crearEstructura/renombrarEstructura/eliminarEstructura y
  // crearMaterial/renombrarMaterial/eliminarMaterial (2026-08-28 y
  // 2026-09-09) para el menú del título de sección — ver
  // CabeceraSeccionConMenu.tsx. Nota: esta es una instancia separada de
  // useSupabaseData de la que usan EstructurasPage/MaterialesPage
  // internamente (mismo patrón preexistente que ya tenían estas dos líneas
  // solo para el conteo); el hook está suscrito a cambios en la tabla, así
  // que ambas instancias convergen.
  const {
    items: estructurasParaConteo,
    crearEstructura,
    renombrarEstructura,
    eliminarEstructura,
  } = useEstructuras();

  // ── Filtros de la biblioteca de Estructuras (canon 2026-09-20). El estado
  // vive ACÁ (no en EstructurasPage) porque los dropdowns se dibujan junto al
  // título "Estructuras" — fuera del contenido — pero actúan sobre el grid de
  // adentro, así que se le bajan a EstructurasPage como props. Las opciones
  // se calculan sobre el catálogo COMPLETO (no el filtrado) para que no
  // desaparezcan al combinar dropdowns.
  const [filtrosEstructuras, setFiltrosEstructuras] =
    useState<FiltrosEstructuras>(FILTROS_VACIOS);
  const {
    tagsEnUso: tagsFiltro,
    formasEnUso: formasFiltro,
    tagIdsPorEstructura,
    formaIdPorEstructura,
  } = useFiltrosEstructuras();
  const relacionesFiltroEstructuras = useMemo(
    () => ({ tagIdsPorEstructura, formaIdPorEstructura }),
    [tagIdsPorEstructura, formaIdPorEstructura],
  );
  const opcionesTipoEstructura = useMemo(
    () =>
      opcionesUnicas(estructurasParaConteo, (e) => e.tipo, (v) =>
        v === "patron_estructural" ? "Patrón estructural" : etiquetaFuncion(v.replace(/_/g, " ")),
      ),
    [estructurasParaConteo],
  );
  const opcionesFuncionEstructura = useMemo(
    () => opcionesUnicas(estructurasParaConteo, (e) => funcionClave(e.funcion), etiquetaFuncion),
    [estructurasParaConteo],
  );
  const opcionesGeometriaEstructura = useMemo(
    () =>
      formasFiltro.map((f) => ({
        value: f.id,
        label: f.nombre,
        count: estructurasParaConteo.filter((e) => formaIdPorEstructura.get(e.id) === f.id)
          .length,
      })),
    [formasFiltro, estructurasParaConteo, formaIdPorEstructura],
  );
  const opcionesTagEstructura = useMemo(
    () =>
      tagsFiltro.map((t) => ({
        value: t.id,
        label: t.nombre,
        count: estructurasParaConteo.filter((e) => tagIdsPorEstructura.get(e.id)?.has(t.id))
          .length,
      })),
    [tagsFiltro, estructurasParaConteo, tagIdsPorEstructura],
  );
  const setFiltroEstructura = (campo: keyof FiltrosEstructuras) => (valor: string | null) =>
    setFiltrosEstructuras((prev) => ({ ...prev, [campo]: valor }));

  const {
    items: materialesParaConteo,
    crearMaterial,
    renombrarMaterial,
    eliminarMaterial,
  } = useMateriales();
  // Geometrías (cuarto grid, pedido 2026-09-09; "Añadir" agregado
  // 2026-09-09 también, a diferencia de Estructuras/Materiales que ya
  // traían el suyo desde antes): Formas ahora es creable a mano desde el
  // panel admin igual que Estructuras/Materiales — ver crearForma en
  // useGeometriaCatalogo.ts.
  const {
    items: formasParaConteo,
    crearForma,
    renombrarForma,
    eliminarForma,
  } = useFormasGeometricas();
  const [creatingEstructura, setCreatingEstructura] = useState(false);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [creatingForma, setCreatingForma] = useState(false);

  // ── Propiedad por la que se ordenan TODAS las categorías de Compuestos
  // o de Materiales a la vez, o null en modo "Por categorías" normal.
  // Antes se elegía desde "Seleccionar agrupación" en el menú del título
  // (CabeceraSeccionConMenu); ahora es un FiltroDropdown "Propiedad" junto
  // al título (ver bloques "compuestos"/"materiales" de FilaAsimetrica más
  // abajo), mismo estilo que los dropdowns de Estructuras (rediseño Química
  // 2026-09-20). Estado propio por bloque — elegir en Compuestos no toca
  // Materiales y viceversa. ──────────────────────────────────────────────
  const [agrupacionCompuestos, setAgrupacionCompuestos] = useState<string | null>(null);
  const [agrupacionMateriales, setAgrupacionMateriales] = useState<string | null>(null);

  async function handleCrearEstructura() {
    setCreatingEstructura(true);
    try {
      await crearEstructura();
    } finally {
      setCreatingEstructura(false);
    }
  }

  async function handleCrearMaterial() {
    setCreatingMaterial(true);
    try {
      await crearMaterial();
    } finally {
      setCreatingMaterial(false);
    }
  }

  async function handleCrearForma() {
    setCreatingForma(true);
    try {
      await crearForma();
    } finally {
      setCreatingForma(false);
    }
  }

  const { items: procesosParaConteo } = useProcesos();
  const { items: fenomenosParaConteo } = useFenomenos();

  // ── Reacciones: catálogo de recetas reutilizables de consume/produce,
  // apilado debajo de Grupos de Compuestos ────────────────────────────────
  const {
    items: reacciones,
    setItems: setReacciones,
    loading: loadingReacciones,
  } = useReacciones();
  const [creatingReaccion, setCreatingReaccion] = useState(false);

  async function handleCreateReaccion() {
    setCreatingReaccion(true);
    try {
      const { data, error } = await supabase
        .from("reacciones")
        .insert([{ nombre: "Nueva reacción" }])
        .select()
        .single();
      if (error) throw error;
      setReacciones((prev) => [...prev, data as Reaccion]);
    } catch (e) {
      console.error("[ElementosPage] error creando reacción:", e);
    } finally {
      setCreatingReaccion(false);
    }
  }

  async function handleEliminarReaccion(id: string) {
    try {
      const { error } = await supabase.from("reacciones").delete().eq("id", id);
      if (error) throw error;
      setReacciones((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("[ElementosPage] error eliminando reacción:", e);
    }
  }

  // ── Procesos: mismo patrón simple (ad-hoc, sin crear/renombrar/eliminar
  // en el hook) que Reacciones arriba — a diferencia de Estructuras/
  // Materiales/Formas, cuyos hooks (useEstructuras/useMateriales/
  // useFormasGeometricas) ya exponían esas 3 funciones desde antes de que
  // Procesos tuviera edición. Se agregó acá en vez de en useProcesos.ts
  // para no tocar la firma de ese hook, usada también por
  // ReaccionesPage/ReaccionPanelFlotante (bloque "Usado en procesos").
  const [creatingProceso, setCreatingProceso] = useState(false);

  async function handleCreateProceso() {
    setCreatingProceso(true);
    try {
      const { error } = await supabase.from("procesos").insert([{ nombre: "Nuevo proceso" }]);
      if (error) throw error;
      // No hace falta actualizar procesosParaConteo a mano: useProcesos()
      // usa useSupabaseData, suscrito a cambios de la tabla — la nueva fila
      // llega sola por esa vía (mismo comentario que la nota de arriba
      // sobre "ambas instancias convergen").
    } catch (e) {
      console.error("[ElementosPage] error creando proceso:", e);
    } finally {
      setCreatingProceso(false);
    }
  }

  async function handleEliminarProceso(id: string) {
    try {
      const { error } = await supabase.from("procesos").delete().eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("[ElementosPage] error eliminando proceso:", e);
    }
  }

  const activoId = seleccionadoId ?? seleccionarId ?? null;
  const activo = useMemo(
    () => elementos.find((e) => e.id === activoId) ?? null,
    [elementos, activoId],
  );

  const elementosFiltrados = elementos;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      {/* Elementos */}
      <div className="flex flex-col">
        <CabeceraSeccionConMenu
          titulo="Elementos"
          items={elementos}
          onAñadir={onCreate}
          añadiendo={creating}
          onRenombrar={onRenombrar}
          onEliminar={onEliminar}
        />
        <div className="flex relative">
        <div className="flex-1 p-3 flex flex-col gap-3">
        {seleccionMultiple.size > 0 && (
          <div className="text-micro font-black uppercase tracking-wide bg-primary/10 border border-primary/20 rounded-md px-2 py-1.5 flex items-center justify-between gap-2">
            <span className="text-primary/70">
              {seleccionMultiple.size} elemento{seleccionMultiple.size === 1 ? "" : "s"} seleccionado
              {seleccionMultiple.size === 1 ? "" : "s"}
              <span className="font-normal normal-case tracking-normal text-primary/40">
                {" "}
                — Shift+Click para agregar o quitar más
              </span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSeleccionMultiple(new Set())}
                className="text-primary/40 hover:text-primary/70 cursor-pointer px-1.5 py-0.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminandoVarios || (!onEliminarVarios && !onEliminar)}
                onClick={handleEliminarSeleccionMultiple}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-btn-text bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {eliminandoVarios ? <Loader2 className="animate-spin" size={10} /> : <Trash2 size={10} />}
                Eliminar seleccionados
              </button>
            </div>
          </div>
        )}

        {mensajeImportacion && (
          <div className="text-micro text-primary/60 bg-primary/5 border border-primary/15 rounded-md px-2 py-1.5 flex items-center justify-between gap-2">
            <span>{mensajeImportacion}</span>
            <button
              type="button"
              onClick={() => setMensajeImportacion(null)}
              className="text-primary/30 hover:text-primary/60 cursor-pointer shrink-0"
              title="Cerrar"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {loading && elementos.length === 0 ? (
          <div className="py-6 text-micro text-primary/30 text-center">Cargando…</div>
        ) : elementos.length === 0 ? (
          <div className="py-6 text-micro text-primary/25 text-center">
            Todavía no hay elementos cargados.
          </div>
        ) : (
          <div
            className="grid gap-0 border-t border-l border-primary/10"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}
          >
            {elementosFiltrados.map((el) => (
              <ElementoCasilla
                key={el.id}
                elemento={el}
                seleccionado={el.id === activoId}
                enSeleccionMultiple={seleccionMultiple.has(el.id)}
                onClick={(e) => handleClickCasilla(el.id, e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel flotante centrado: mismo patrón que PanelFlotanteGlobal usa
          para Personaje/Criatura (ver usePanelFlotanteStore) — modal grande
          centrado en pantalla con backdrop blur, en vez de drawer lateral.
          Se cierra con click en el backdrop, Escape, o el botón X. */}
      {activo && (
        <ElementoPanelFlotante
          elemento={activo}
          todosLosElementos={elementos}
          onCerrar={() => setSeleccionadoId(null)}
          onActualizar={onActualizar}
          onEliminar={
            onEliminar
              ? (id) => {
                  onEliminar(id);
                  setSeleccionadoId(null);
                }
              : undefined
          }
          compuestos={compuestos}
          onNavigateCompuesto={(compuestoId) => {
            setSeleccionadoId(null);
            setCompuestoAAbrir(compuestoId);
          }}
        />
      )}
        </div>
      </div>

      {/* Compuestos en su propia fila completa (pedido 2026-09-20: antes
          compartía grid 2×2 con Estructuras/Materiales/Geometrías vía
          FilaAsimetrica — ahora ocupa todo el ancho horizontal, aparte, así
          las tarjetas cuadradas nuevas tienen más columnas para acomodarse
          en vez de competir por espacio con los otros 3 bloques). Se sigue
          usando FilaAsimetrica (con un solo bloque) para no duplicar el
          armado de CabeceraSeccionConMenu — con un bloque el layout
          simétrico de FilaAsimetrica ya da una sola columna a ancho
          completo. */}
      <FilaAsimetrica
        bloques={[
          {
            key: "compuestos",
            titulo: "Compuestos",
            total: compuestos.length,
            items: compuestos,
            onAñadir: handleCreateCompuesto,
            añadiendo: creatingCompuesto,
            onRenombrar: handleRenombrarCompuesto,
            onEliminar: handleEliminarCompuesto,
            // "Seleccionar agrupación" (menú del título) se reemplaza acá
            // por un FiltroDropdown de Propiedad, junto a los de Estructuras
            // (pedido 2026-09-20) — mismo valor (agrupacionCompuestos) y
            // mismo efecto (ordenGlobal más abajo), solo cambia la UI.
            filtros: (
              <FiltroDropdown
                etiqueta="Propiedad"
                opciones={PROPIEDADES_ORDENABLES.map((p) => ({ value: p.clave, label: p.label }))}
                value={agrupacionCompuestos}
                onChange={setAgrupacionCompuestos}
              />
            ),
            contenido: (
              <CompuestosPage
                compuestos={compuestos}
                elementos={elementos}
                loading={loadingCompuestos}
                creating={creatingCompuesto}
                onCreate={handleCreateCompuesto}
                onCrearConComponentes={handleCrearCompuestoConComponentes}
                onActualizar={(id, cambios) =>
                  setCompuestos((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
                  )
                }
                onEliminar={handleEliminarCompuesto}
                seleccionarId={compuestoAAbrir ?? compuestoRecienCreadoId}
                onSeleccionarIdConsumido={() => {
                  setCompuestoAAbrir(null);
                  setCompuestoRecienCreadoId(null);
                }}
                ordenGlobal={agrupacionCompuestos}
              />
            ),
          },
        ]}
      />

      {/* Estructuras / Materiales / Geometrías — layout adaptativo (ver
          _shared/FilaAsimetrica.tsx) entre estos 3 bloques, ya separados de
          Compuestos (arriba, fila propia). Geometrías reusa ListaFormas de
          fisica/GeometriasPage.tsx en vez de la fila Formas/Variables/Leyes
          completa — acá solo mostramos el catálogo de Formas, que es lo
          accionable a nivel Química; Variables/Leyes quedan en la sección
          Física → Geometrías dedicada. */}
      <FilaAsimetrica
        bloques={[
          {
            key: "estructuras",
            titulo: "Estructuras",
            total: estructurasParaConteo.length,
            items: estructurasParaConteo,
            onAñadir: handleCrearEstructura,
            añadiendo: creatingEstructura,
            onRenombrar: renombrarEstructura,
            onEliminar: eliminarEstructura,
            // Base lista para más adelante: EstructurasPage todavía no
            // agrupa por categoría/propiedad, así que no se pasa
            // agrupacionActiva/onSeleccionarAgrupacion — la opción
            // "Seleccionar agrupación" simplemente no aparece en su menú
            // hasta que EstructurasPage lo soporte.
            //
            // filtros: dropdowns Tipo / Función / Geometría / Tags A LA
            // IZQUIERDA del título (pedido 2026-09-20) — ver
            // CabeceraSeccionConMenu.filtros. Actúan sobre todo el grid.
            filtros: (
              <div className="flex flex-wrap items-center gap-1.5">
                <FiltroDropdown
                  etiqueta="Tipo"
                  opciones={opcionesTipoEstructura}
                  value={filtrosEstructuras.tipo}
                  onChange={setFiltroEstructura("tipo")}
                />
                <FiltroDropdown
                  etiqueta="Función"
                  opciones={opcionesFuncionEstructura}
                  value={filtrosEstructuras.funcion}
                  onChange={setFiltroEstructura("funcion")}
                />
                <FiltroDropdown
                  etiqueta="Geometría"
                  opciones={opcionesGeometriaEstructura}
                  value={filtrosEstructuras.geometria}
                  onChange={setFiltroEstructura("geometria")}
                />
                <FiltroDropdown
                  etiqueta="Tags"
                  opciones={opcionesTagEstructura}
                  value={filtrosEstructuras.tag}
                  onChange={setFiltroEstructura("tag")}
                />
                {hayFiltrosActivos(filtrosEstructuras) && (
                  <button
                    type="button"
                    onClick={() => setFiltrosEstructuras(FILTROS_VACIOS)}
                    title="Quitar todos los filtros"
                    className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-micro font-bold text-primary/40 hover:text-primary/70 transition-colors cursor-pointer"
                  >
                    <X size={10} /> Limpiar
                  </button>
                )}
              </div>
            ),
            contenido: (
              <EstructurasPage
                filtros={filtrosEstructuras}
                relaciones={relacionesFiltroEstructuras}
              />
            ),
          },
          {
            key: "materiales",
            titulo: "Materiales",
            total: materialesParaConteo.length,
            items: materialesParaConteo,
            onAñadir: handleCrearMaterial,
            añadiendo: creatingMaterial,
            onRenombrar: renombrarMaterial,
            onEliminar: eliminarMaterial,
            // Mismo criterio que Compuestos arriba: dropdown de Propiedad
            // en vez de "Seleccionar agrupación" en el menú del título.
            filtros: (
              <FiltroDropdown
                etiqueta="Propiedad"
                opciones={PROPIEDADES_ORDENABLES.map((p) => ({ value: p.clave, label: p.label }))}
                value={agrupacionMateriales}
                onChange={setAgrupacionMateriales}
              />
            ),
            contenido: <MaterialesPage ordenGlobal={agrupacionMateriales} />,
          },
          {
            key: "geometrias",
            titulo: "Geometrías",
            total: formasParaConteo.length,
            items: formasParaConteo,
            onAñadir: handleCrearForma,
            añadiendo: creatingForma,
            onRenombrar: renombrarForma,
            onEliminar: eliminarForma,
            contenido: <ListaFormas />,
          },
        ]}
      />

      <FilaAsimetrica
        bloques={[
          {
            key: "reacciones",
            titulo: "Reacciones",
            total: reacciones.length,
            contenido: (
              <ReaccionesPage
                reacciones={reacciones}
                compuestos={compuestos}
                elementos={elementos}
                loading={loadingReacciones}
                creating={creatingReaccion}
                onCreate={handleCreateReaccion}
                onEliminar={handleEliminarReaccion}
                onActualizar={(id, cambios) =>
                  setReacciones((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)),
                  )
                }
              />
            ),
          },
          {
            key: "procesos",
            titulo: "Procesos",
            total: procesosParaConteo.length,
            contenido: (
              <ProcesosPage
                creating={creatingProceso}
                onCreate={handleCreateProceso}
                onEliminar={handleEliminarProceso}
              />
            ),
          },
          {
            key: "fenomenos",
            titulo: "Fenómenos",
            total: fenomenosParaConteo.length,
            contenido: <FenomenosPage />,
          },
        ]}
      />
    </div>
  );
}
