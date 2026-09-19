"use client";

/**
 * EditorItem.tsx
 * ────────────────
 * View del editor de ítems. Solo orquesta: conecta hooks con
 * componentes, no contiene lógica de fetching ni duplicación.
 *
 * Componentes extraídos a components/items/:
 *   PickerImagenItemBtn  → botón mobile de imagen
 *   SelectorGrupoUnico   → reemplaza a SelectorCategoriaGrupo +
 *                          SelectorOrigenGrupo (eran duplicados)
 *
 * Hooks extraídos a hooks/:
 *   useGrupoSelector          → reemplaza useTiposDeGrupoItems +
 *                                useOrigenesDeGrupoItems (duplicados)
 *
 * Ruta destino:
 *   src/features/editorGarlia/views/EditorItem.tsx
 */


import { Atom, Beaker, Box, Bug, Dices, Package, UserRound, X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";

import type { WikiEntity } from "@/ui/Markdown/commandItems";
import { RichEditor } from "@/editor/lexical";
import { ComboSelector } from "@/ui/ComboSelector";
import { PanelReglasDnd } from "@/domains/garlia/items/PanelReglasDnd";
import { PanelFisicaObjeto } from "@/domains/garlia/items/PanelFisicaObjeto";
import { useItemMateriales } from "@/domains/garlia/items/useItemMateriales";
import { useMateriales } from "@/domains/garlia/materiales/useMateriales";
import { MaterialEditorFlotante } from "@/domains/garlia/materiales/MaterialesPage";
import { BreadcrumbJerarquia } from "@/domains/garlia/biologia/BreadcrumbJerarquia";
import { itemsQueries } from "@/domains/garlia/items/queries";
import { PickerImagenItemBtn } from "@/domains/garlia/items/PickerImagenItemBtn";
import { SelectorGrupoUnico } from "@/domains/garlia/items/SelectorGrupoUnico";
import { useCriaturasCatalogo } from "@/domains/garlia/criaturas/useCriaturasCatalogo";
import { dexiePut, dexieDelete } from "@/infra/sync/useOfflineSync";
import { supabase } from "@/infra/supabase/supabase";

import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { useReacciones } from "@/domains/garlia/elementos/useReacciones";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import { ElementoPanelFlotante } from "@/domains/garlia/elementos/ElementosPage";
import { ReaccionPanelFlotante } from "@/domains/garlia/elementos/ReaccionesPage";
import { CONFIG_MATERIAL_COMPONENTES, type MaterialComponente } from "@/domains/garlia/materiales/types";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { useItemHabilidadesReaccion } from "@/domains/garlia/_shared/useItemHabilidadesReaccion";

import { SelectorImagen } from "@/domains/garlia/_shared/UIComponents";
import { EditorHeaderBar } from "@/domains/garlia/_shared/EditorHeaderBar";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { useWikilink } from "@/domains/garlia/_shared/WikilinkContext";
import { type Item } from "@garlia/items";
import { type SaveStatus } from "@/ui/saveStatus";

export function EditorItem({
  item,
  tabla = "items",
  onSaved,
  onDeleted,
  entities = [],
  onSelectGrupo,
  onNavigateCriatura,
  onHeaderControlsChange,
}: {
  item: Item;
  tabla?: string;
  onSaved: (i: Item) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectGrupo?: (grupoId: string) => void;
  onNavigateCriatura?: (id: string) => void;
  /** Publica los controles de la barra superior (nombre, guardar, eliminar,
   *  dado D&D) hacia el contenedor — normalmente PanelFlotanteGlobal, que
   *  los renderiza en su propia barra en vez de que este editor dibuje la
   *  suya (evita la barra duplicada en la vista rápida). Si no se pasa,
   *  este editor dibuja su propia barra igual que antes (uso standalone). */
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const [form, setForm] = useState<Item>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [showModalDnd, setShowModalDnd] = useState(false);
  // Toggle "Científico ↔ Escritor". Ambos modos consumen los mismos
  // valores canónicos: el modo Escritor delega la interpretación a
  // Supabase mediante el intérprete humano único; el frontend no aplica
  // umbrales ni genera significados propios.
  const [modoVista, setModoVista] = useState<"quimica" | "humana">("quimica");
  const [editandoCompuestoId, setEditandoCompuestoId] = useState<string | null>(null);
  const [editandoReaccionId, setEditandoReaccionId] = useState<string | null>(null);
  const { onWikilink } = useWikilink();

  // Catálogo de criaturas para el selector "Criatura" (origen del ítem)
  const { criaturas: allCriaturas, loading: loadingCriaturas } = useCriaturasCatalogo();
  // Catálogo de elementos/compuestos — mismo patrón que Flora/Mineral
  const { items: elementos, setItems: setElementos } = useElementos();
  const { items: compuestos, setItems: setCompuestos } = useCompuestosConElementos();

  // Habilidades del item = N Reacciones del catálogo global de Química,
  // vinculadas N:N vía la tabla puente item_habilidades (item_id,
  // reaccion_id — múltiples filas por item). Editar una Reacción acá afecta
  // a todo lo que la use — Procesos de Flora/Minerales incluidos.
  const { items: reacciones, setItems: setReacciones } = useReacciones();
  const habilidades = useItemHabilidadesReaccion({
    itemId: item.id,
    catalogo: reacciones,
  });

  function onReaccionActualizadaLocal(id: string, updates: any) {
    setReacciones((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  // Persistencia directa de la Reacción/Habilidad en catálogo — usada por
  // el panel flotante (ReaccionPanelFlotante), que no sabe que se abrió
  // desde acá.
  async function persistirReaccion(id: string, cambios: any) {
    onReaccionActualizadaLocal(id, cambios);
    const { error } = await supabase.from("reacciones").update(cambios).eq("id", id);
    if (error) {
      console.error("[EditorItem] error guardando reacción:", error);
    }
  }

  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  // ── Refrescar solo los campos derivados por el motor (propiedades_fisicas/
  // estado_fisico) después de editar item_materiales. Supabase ya recalculó
  // y persistió esos campos vía trigger (trg_objeto_propiedades →
  // recalcular_objeto_propiedades, verificado contra el proyecto real) —
  // acá solo se vuelve a pedir el item con la query real ya existente
  // (itemsQueries.getById, misma que carga el editor la primera vez) para
  // que PanelFisicaObjeto deje de mostrar el valor anterior. No se toca
  // nada que el usuario esté editando en `form` en ese momento. ─────────────
  const refrescarPropiedadesFisicas = async () => {
    try {
      const actualizado = await itemsQueries.getById(form.id);
      if (!actualizado) return;
      setForm((f: Item) => ({
        ...f,
        propiedades_fisicas: actualizado.propiedades_fisicas,
        estado_fisico: actualizado.estado_fisico,
      }));
    } catch (err) {
      console.error("[EditorItem] error refrescando propiedades físicas:", err);
    }
  };

  // Cadena completa del breadcrumb superior: Elemento › Compuesto ›
  // Materiales › Objeto (mismo espíritu y mismos 2 saltos indirectos que ya
  // existen en el sentido contrario dentro de ElementoPanelFlotante —
  // ElementosPage.tsx, "objetosQueLoUsan" — pero acá arrancando desde el
  // Objeto en vez de terminar en él):
  //   Objeto → Materiales: composicion (item_materiales de este item) +
  //     materialesCatalogo, igual que ya usa PanelFisicaObjeto.
  //   Materiales → Compuestos: material_componentes filtrado por
  //     componente_tipo === "compuesto" y por los ids de esos materiales —
  //     mismo patrón que useMaterialComponentes.ts pero para varios
  //     materiales a la vez (por eso se usa useSupabaseData directo en vez
  //     del wrapper de un solo materialId, igual que ya hace
  //     materialesQueLoUsan en ElementosPage.tsx).
  //   Compuestos → Elementos: cada Compuesto de useCompuestosConElementos()
  //     ya trae .componentes: [{elemento_id, cantidad}] — no hace falta
  //     ningún fetch nuevo para este último salto.
  const { items: composicionParaBreadcrumb } = useItemMateriales(item.id);
  const { items: materialesCatalogo } = useMateriales();
  const materialesDelObjeto = composicionParaBreadcrumb
    .map((c) => materialesCatalogo.find((m) => m.id === c.material_id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  const { data: vinculosMaterialCompuesto } = useSupabaseData<MaterialComponente>(
    CONFIG_MATERIAL_COMPONENTES.tabla,
    { select: CONFIG_MATERIAL_COMPONENTES.select },
  );
  const compuestosDeMaterialesDelObjeto = (() => {
    const idsMateriales = new Set(materialesDelObjeto.map((m) => m.id));
    const idsCompuestos = new Set(
      vinculosMaterialCompuesto
        .filter((v) => v.componente_tipo === "compuesto" && idsMateriales.has(v.material_id))
        .map((v) => v.componente_id),
    );
    return compuestos.filter((c) => idsCompuestos.has(c.id));
  })();

  const elementosDeCompuestosDelObjeto = (() => {
    const idsElementos = new Set(
      compuestosDeMaterialesDelObjeto.flatMap((c) =>
        (c.componentes ?? []).map((comp) => comp.elemento_id),
      ),
    );
    return elementos.filter((e) => idsElementos.has(e.id));
  })();

  // Sub-panel de Elemento abierto desde el nivel "Elemento" del breadcrumb
  // — mismo patrón que materialAbiertoId de abajo.
  const [elementoAbiertoId, setElementoAbiertoId] = useState<string | null>(null);
  const elementoAbierto = elementos.find((e) => e.id === elementoAbiertoId) ?? null;
  // Sub-panel de Compuesto abierto desde el nivel "Compuesto" del
  // breadcrumb — reutiliza el mismo estado que ya abre CompuestoPanelFlotante
  // desde "Usado en compuestos"/Reacciones más abajo (editandoCompuestoId),
  // en vez de crear un segundo estado paralelo para el mismo panel.
  const [materialAbiertoId, setMaterialAbiertoId] = useState<string | null>(null);
  const materialAbierto =
    materialesCatalogo.find((m) => m.id === materialAbiertoId) ?? null;

  const field =
    (k: keyof Item) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f: Item) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const payload: any = {
        nombre: form.nombre,
        imagen_url: form.imagen_url || null,
        descripcion: form.descripcion,
        categoria: form.categoria,
        criatura_id: form.criatura_id ?? null,
        compuesto_id: form.compuesto_id ?? null,
        composicion: form.composicion ?? [],
        es_arma: form.es_arma ?? false,
        dado_dano: form.dado_dano || null,
        sutileza: form.sutileza ?? false,
        distancia: form.distancia ?? false,
        maestria: form.maestria || null,
        es_armadura: form.es_armadura ?? false,
        es_escudo: form.es_escudo ?? false,
        ca_base_armadura: form.ca_base_armadura ?? null,
        max_bono_dex_armadura: form.max_bono_dex_armadura ?? null,
      };
      const { error } = await supabase
        .from(tabla)
        .update(payload)
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut(tabla, form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  // La confirmación ya la pide el header compartido (EditorHeaderBar /
  // PanelFlotanteGlobal) de forma inline antes de llamar a onEliminar, así
  // que acá se borra directo — ver useEditorHeaderControls.ts.
  const del = async () => {
    await supabase.from(tabla).delete().eq("id", form.id);
    void dexieDelete(tabla, form.id);
    onDeleted(form.id);
  };

  // Botón de dado D&D — es específico de Item/Criatura, así que viaja como
  // "extra" dentro de los controles de header en vez de ser un campo fijo.
  const dadoDndBtn = (
    <button
      className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all"
      title="Reglas D&D 2024"
      type="button"
      onClick={() => setShowModalDnd(true)}
    >
      <Dices size={13} />
    </button>
  );

  // Toggle Científico ↔ Escritor — mismo componente visual que
  // ElementoEditor/CompuestoEditor/MaterialEditorFlotante, viaja junto al
  // dado D&D dentro de "extra".
  const modoVistaBtn = (
    <button
      type="button"
      onClick={() => setModoVista((m) => (m === "quimica" ? "humana" : "quimica"))}
      title={
        modoVista === "quimica"
          ? "Ver explicación en lenguaje llano de las propiedades"
          : "Ver valores y fórmulas técnicas"
      }
      aria-pressed={modoVista === "humana"}
      className={`shrink-0 flex items-center gap-1 px-2 h-6 rounded-md border text-micro font-black uppercase tracking-widest transition-all cursor-pointer ${
        modoVista === "humana"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5"
      }`}
    >
      {modoVista === "humana" ? <UserRound size={11} /> : <Beaker size={11} />}
      <span className="hidden sm:inline">{modoVista === "humana" ? "Escritor" : "Científico"}</span>
    </button>
  );

  const headerControls = {
    imagenUrl: form.imagen_url,
    IconoFallback: Package,
    nombre: form.nombre ?? "",
    placeholderNombre: "Nombre del objeto",
    onChangeNombre: (nombre: string) => setForm((f: Item) => ({ ...f, nombre })),
    status,
    onGuardar: save,
    onEliminar: del,
    extra: (
      <>
        {modoVistaBtn}
        {dadoDndBtn}
      </>
    ),
  };
  usePublishHeaderControls(headerControls, onHeaderControlsChange);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Barra superior: si hay un contenedor escuchando (panel flotante),
          los controles ya se publicaron arriba y este editor no dibuja su
          propia barra — evita la duplicación. Si se usa standalone, se
          sigue mostrando igual que siempre. */}
      {!onHeaderControlsChange && <EditorHeaderBar controls={headerControls} />}

      {/* Breadcrumb Elemento › Compuesto › Materiales › Objeto — mismo
          componente y mismo espíritu que el resto de la cadena (ver
          ElementoEditor.tsx, CompuestosPage.tsx, MaterialesPage.tsx,
          ElementosPage.tsx). "Objeto" es este editor (activo); "Materiales"
          son los materiales de su composición real (item_materiales);
          "Compuesto" son los compuestos que forman esos materiales
          (material_componentes); "Elemento" son los elementos que forman
          esos compuestos (compuesto.componentes) — misma cadena de 2 saltos
          indirectos que ya existe al revés en ElementoPanelFlotante. */}
      <div className="shrink-0 px-2.5 pt-2">
        <BreadcrumbJerarquia
          niveles={[
            {
              label: "Elemento",
              icono: <Atom size={10} />,
              activo: false,
              items: elementosDeCompuestosDelObjeto.map((e) => ({ id: e.id, nombre: e.nombre })),
              loading: false,
              onNavegar: setElementoAbiertoId,
            },
            {
              label: "Compuesto",
              icono: <Package size={10} />,
              activo: false,
              items: compuestosDeMaterialesDelObjeto.map((c) => ({ id: c.id, nombre: c.nombre })),
              loading: false,
              onNavegar: setEditandoCompuestoId,
            },
            {
              label: "Materiales",
              icono: <Box size={10} />,
              activo: false,
              items: materialesDelObjeto.map((m) => ({ id: m.id, nombre: m.nombre })),
              loading: false,
              onNavegar: setMaterialAbiertoId,
            },
            { label: "Objeto", icono: <Dices size={10} />, activo: true },
          ]}
        />
      </div>


      {/* ── Content ───────────────────────────────────────────────────────
          Misma distribución que ElementoEditor/CompuestoEditor (Química):
          padding p-2.5, gap-3 entre bloques, cuerpo con scroll propio, y
          cada sección agrupada en una tarjeta rounded-lg border
          border-primary/10, en vez del layout anterior (p-4, columnas
          sm:flex-row sueltas sin tarjetas). */}
      <div className="flex-1 min-h-0 p-2.5 flex flex-col gap-3 overflow-y-auto">
        {/* Imagen (columna fija) + Categoría/Criatura/Física (derecha) —
            mismo patrón que el bloque "Gráfico a la izquierda + Propiedades
            a la derecha" de CompuestoEditor. */}
        <div className="grid grid-cols-[minmax(11rem,14rem)_1fr] gap-3 items-start">
          <div className="rounded-lg border border-primary/10 p-1.5">
            {/* Mobile: imagen con botón flotante */}
            <div
              className="sm:hidden relative w-full rounded-md overflow-hidden bg-primary/3"
              style={{ aspectRatio: "1 / 1" }}
            >
              {form.imagen_url ? (
                <Image
                  alt={form.nombre}
                  className="w-full h-full object-cover"
                  src={form.imagen_url}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="text-primary/15" size={48} />
                </div>
              )}
              <div className="absolute top-2 right-2 z-10">
                <PickerImagenItemBtn
                  value={form.imagen_url ?? ""}
                  onChange={(url) =>
                    setForm((f: Item) => ({ ...f, imagen_url: url }))
                  }
                />
              </div>
            </div>
            {/* Desktop: selector normal */}
            <div className="hidden sm:block w-full">
              <SelectorImagen
                aspect="square"
                label="Imagen"
                placeholder={<Package className="opacity-20" size={20} />}
                value={form.imagen_url ?? ""}
                onChange={(url) =>
                  setForm((f: Item) => ({ ...f, imagen_url: url }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            <div className="rounded-lg border border-primary/10 p-2 grid grid-cols-2 gap-2">
              <SelectorGrupoUnico
                emptyLabel="Sin categoría"
                label="Categoría"
                noGruposLabel="No hay categorías de ítems creadas"
                subtipo="Tipo"
                value={form.categoria ?? null}
                onChange={(nombre) =>
                  setForm((f: Item) => ({ ...f, categoria: nombre ?? "" }))
                }
                onSelectGrupo={onSelectGrupo}
              />

              <ComboSelector
                allowNone
                icon={<Bug size={11} />}
                items={allCriaturas.map((c) => ({
                  id: c.id,
                  label: c.nombre,
                  imgUrl: c.imagen_url ?? null,
                }))}
                label="Criatura"
                loading={loadingCriaturas}
                mode="single"
                noneLabel="Sin criatura"
                placeholder="Vincular a una criatura…"
                value={form.criatura_id ?? null}
                onChange={(id) =>
                  setForm((f: Item) => ({ ...f, criatura_id: id }))
                }
                onNavigate={
                  onNavigateCriatura
                    ? (id) => onNavigateCriatura(id)
                    : undefined
                }
              />
            </div>

            {/* Física del objeto (Modelo físico canónico v218). La
                sección "Física del objeto"/"Geometría" es solo lectura:
                item_materiales es la fuente principal; compuesto_id es
                solo compatibilidad secundaria y nunca se suma. La
                composición de materiales sí es editable dentro de este
                panel (capa "Editar composición") — al cambiar algo,
                Supabase recalcula vía trigger y acá se vuelve a pedir el
                item con la misma query real que lo cargó. */}
            <div className="rounded-lg border border-primary/10 p-2">
              <PanelFisicaObjeto
                itemId={item.id}
                propiedadesFisicas={form.propiedades_fisicas}
                estadoFisico={form.estado_fisico}
                geometriaFisica={form.geometria_fisica}
                onRefrescarItem={refrescarPropiedadesFisicas}
                modo={modoVista}
              />
            </div>
          </div>
        </div>

        {/* Descripción. Se quitó el bloque "Propiedades físicas de los
            materiales" (MaterialesPropiedadesFisicasItem) que ocupaba la
            segunda columna; se deja la grid de 2 columnas con la segunda
            vacía para no tocar el resto del layout de la fila. */}
        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="rounded-lg border border-primary/10 p-2 flex flex-col gap-1.5">
            <label className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
              Descripción
            </label>
            <RichEditor
              minHeight="12.5rem"
              placeholder="Qué es, qué hace, su historia…"
              value={form.descripcion ?? ""}
              wikiEntities={entities}
              onChange={(v) => setForm((f: Item) => ({ ...f, descripcion: v }))}
              onWikilinkNavigate={onWikilink}
            />
          </div>

          <div />
        </div>
      </div>

      {showModalDnd && (
        <ModalReglasDnd
          form={form}
          nombre={form.nombre}
          onChange={(cambios) => setForm((f: Item) => ({ ...f, ...cambios }))}
          onClose={() => setShowModalDnd(false)}
        />
      )}

      {editandoCompuestoId && (
        <CompuestoPanelFlotante
          compuesto={compuestos.find((c) => c.id === editandoCompuestoId)!}
          elementos={elementos}
          todosLosCompuestos={compuestos}
          onCerrar={() => setEditandoCompuestoId(null)}
          onActualizar={(id, cambios) =>
            setCompuestos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)))
          }
        />
      )}

      {editandoReaccionId && (
        <ReaccionPanelFlotante
          reaccion={reacciones.find((r) => r.id === editandoReaccionId)!}
          compuestos={compuestos}
          elementos={elementos}
          onCerrar={() => setEditandoReaccionId(null)}
          onActualizar={persistirReaccion}
          onAbrirItem={(it) => setEditandoCompuestoId(it.tipo === "compuesto" ? it.id : null)}
        />
      )}
      {elementoAbierto && (
        <ElementoPanelFlotante
          elemento={elementoAbierto}
          todosLosElementos={elementos}
          onCerrar={() => setElementoAbiertoId(null)}
          onActualizar={(id, cambios) =>
            setElementos((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)))
          }
          compuestos={compuestos}
          onNavigateCompuesto={(compuestoId) => {
            setElementoAbiertoId(null);
            setEditandoCompuestoId(compuestoId);
          }}
        />
      )}

      {materialAbierto && (
        <MaterialEditorFlotante
          material={materialAbierto}
          onClose={() => setMaterialAbiertoId(null)}
        />
      )}
    </div>
  );
}
// Antes vivía inline en el cuerpo del editor; ahora se accede desde el botón
// de dado junto al nombre, así el editor queda enfocado en lore/descripción
// y las reglas mecánicas (D&D) quedan en un modal aparte.
function ModalReglasDnd({
  form,
  nombre,
  onChange,
  onClose,
}: {
  form: Item;
  nombre: string;
  onChange: (cambios: Partial<Item>) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center p-4"
      style={{
        background: "color-mix(in srgb, var(--primary) 30%, transparent)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Dices size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-micro font-black uppercase tracking-widest text-primary/40">
              Reglas D&D
            </p>
            <p className="text-xs font-bold text-primary truncate">{nombre || "Sin nombre"}</p>
          </div>
          <button
            className="shrink-0 p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
            type="button"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <PanelReglasDnd form={form} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
