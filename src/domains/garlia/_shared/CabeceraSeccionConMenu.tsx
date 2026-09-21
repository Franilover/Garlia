"use client";

/**
 * CabeceraSeccionConMenu.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Título clicable de sección (reemplazo del <Cabecera> estático de
 * FilaAsimetrica, y del título suelto de Elementos). Al hacer click abre un
 * menú flotante con hasta tres opciones:
 *
 *  - Añadir               → llama onAñadir() directo (mismo flujo que ya
 *                            existía por bloque: handleCreateCompuesto /
 *                            handleCreate elemento / crear estructura o
 *                            material nuevo).
 *  - Editar                → abre un modal centrado (mismo shell que el
 *                            resto de paneles flotantes del dominio) con la
 *                            lista de ítems: nombre a la izquierda
 *                            (editable inline, blur = guardar) y botón de
 *                            borrar a la derecha.
 *  - Seleccionar agrupación → submenú con "Por categorías" (vuelve al
 *                            agrupamiento normal) y "Por Propiedades", que
 *                            abre un segundo submenú para elegir CUÁL
 *                            propiedad (Dureza, Masa, etc.) — al elegirla se
 *                            ordenan de mayor a menor TODAS las categorías
 *                            del bloque a la vez (las categorías en sí no
 *                            cambian, ver `agrupacionActiva`/
 *                            `onSeleccionarAgrupacion`). Rediseño Química
 *                            2026-09-20: reemplaza al botón "ordenar todas
 *                            las secciones" que antes vivía aparte, en
 *                            OrdenarPorPropiedadPopover (columna de la
 *                            derecha, ícono ListOrdered) — ahora hay un
 *                            solo selector de orden por categoría (el de
 *                            OrdenarPorPropiedadPopover) y el disparador
 *                            "para todas a la vez" vive acá, en el título.
 *
 * Genérico por diseño: no sabe nada de Compuesto/Estructura/Material/
 * Elemento — solo recibe items: {id, nombre}[] y callbacks. Cada consumidor
 * (FilaAsimetrica por bloque, o el título de Elementos) le pasa su propio
 * onRenombrar/onEliminar/onAñadir ya conectados a su hook real.
 *
 * Si un bloque no pasa onAñadir/onRenombrar/onEliminar (ej. Estructuras y
 * Materiales antes de que existiera update/delete en el hook), esa opción
 * del menú/modal simplemente no se muestra — ver EstructurasPage/
 * MaterialesPage para cómo quedaron conectadas. Mismo criterio para
 * "Seleccionar agrupación": si el caller no pasa
 * propiedadesAgrupables/onSeleccionarAgrupacion, la opción no aparece — así
 * queda la base lista para Estructuras u otros bloques que todavía no la
 * conectaron.
 */

import { ChevronRight, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PopoverFlotante } from "./PopoverFlotante";
import { PROPIEDADES_ORDENABLES, type PropiedadOrdenable } from "./OrdenarPorPropiedadPopover";

export interface ItemEditable {
  id: string;
  nombre: string;
}

export interface CabeceraSeccionConMenuProps {
  titulo: string;
  items?: ItemEditable[];
  onAñadir?: () => void | Promise<void>;
  onRenombrar?: (id: string, nuevoNombre: string) => void | Promise<void>;
  onEliminar?: (id: string) => void | Promise<void>;
  añadiendo?: boolean;
  /**
   * Clave de la propiedad usada para agrupar/ordenar TODAS las categorías
   * de este bloque a la vez, o null si está agrupado "Por categorías" (el
   * modo normal, sin orden global). Si se omite junto con
   * onSeleccionarAgrupacion, la opción "Seleccionar agrupación" no aparece
   * en el menú.
   */
  agrupacionActiva?: string | null;
  /** Se llama con la clave elegida ("Por Propiedades → X") o null ("Por
   *  categorías"). El caller es responsable de aplicar ese valor como orden
   *  global sobre sus grupos — ver propiedadGlobal en
   *  OrdenarPorPropiedadPopover. */
  onSeleccionarAgrupacion?: (clave: string | null) => void;
  /**
   * Slot opcional de filtros (dropdowns) que se dibuja DEBAJO del título,
   * centrado. 2026-09-20: pedido para Estructuras — los filtros
   * Tipo/Función/Geometría/Tags viven bajo el título de la sección en vez de
   * dentro del contenido. Si se omite, la cabecera queda idéntica a antes
   * (solo título centrado) — Compuestos/Materiales/Geometrías no cambian.
   */
  filtros?: React.ReactNode;
}

/** Submenú "Seleccionar agrupación → Por Propiedades": lista de las mismas
 *  12 propiedades numéricas que ofrece OrdenarPorPropiedadPopover por
 *  sección, reutilizada acá para el disparador global. */
function ListaPropiedadesAgrupacion({
  propiedadActiva,
  onSeleccionar,
  onCerrar,
}: {
  propiedadActiva: string | null;
  onSeleccionar: (clave: string | null) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-1.5">
      <div className="px-1.5 pb-1 text-micro font-black uppercase tracking-[0.2em] text-primary/30">
        Todas las categorías · mayor primero
      </div>
      {PROPIEDADES_ORDENABLES.map((p: PropiedadOrdenable) => {
        const seleccionada = p.clave === propiedadActiva;
        return (
          <button
            key={p.clave}
            type="button"
            onClick={() => {
              onSeleccionar(p.clave);
              onCerrar();
            }}
            className={`rounded-md px-2 py-1 text-left text-micro font-bold transition-colors cursor-pointer ${
              seleccionada ? "bg-accent/15 text-accent" : "text-primary/70 hover:bg-primary/10"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function CabeceraSeccionConMenu({
  titulo,
  items,
  onAñadir,
  onRenombrar,
  onEliminar,
  añadiendo,
  agrupacionActiva = null,
  onSeleccionarAgrupacion,
  filtros,
}: CabeceraSeccionConMenuProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  // Segundo nivel: "Seleccionar agrupación" (Por categorías / Por Propiedades).
  const [submenuAgrupacionAncla, setSubmenuAgrupacionAncla] = useState<HTMLElement | null>(null);
  // Tercer nivel: lista de las 12 propiedades, colgando de "Por Propiedades".
  const [submenuPropiedadAncla, setSubmenuPropiedadAncla] = useState<HTMLElement | null>(null);
  const anclaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (anclaRef.current?.contains(target)) return;
      // Los submenús de "Seleccionar agrupación" (2do y 3er nivel) se
      // renderizan en un portal a document.body vía PopoverFlotante, así
      // que un click dentro de ellos NO está contenido en anclaRef — sin
      // este chequeo, elegir "Por categorías" o cualquier propiedad cerraba
      // este menú de golpe antes de que el propio onClick del botón llegue
      // a procesarse. data-popover-panel lo pone PopoverFlotante en su
      // contenedor raíz (ver PopoverFlotante.tsx).
      if ((target as HTMLElement)?.closest?.("[data-popover-panel]")) return;
      setMenuAbierto(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuAbierto]);

  const hayAgrupacion = Boolean(onSeleccionarAgrupacion);
  const hayAlgoQueMostrar = Boolean(onAñadir || onRenombrar || onEliminar || hayAgrupacion);
  const propiedadActivaLabel =
    PROPIEDADES_ORDENABLES.find((p) => p.clave === agrupacionActiva)?.label ?? null;

  const botonTitulo = (
    <button
      type="button"
      disabled={!hayAlgoQueMostrar}
      onClick={() => hayAlgoQueMostrar && setMenuAbierto((v) => !v)}
      className={`text-micro font-black uppercase tracking-widest text-primary/40 ${
        hayAlgoQueMostrar ? "hover:text-primary/70 cursor-pointer" : "cursor-default"
      } transition-colors`}
    >
      {titulo}
      {propiedadActivaLabel && (
        <span className="ml-1.5 normal-case tracking-normal text-accent">
          ↓ {propiedadActivaLabel}
        </span>
      )}
    </button>
  );

  const menuFlotante = (
    <div
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 min-w-[11rem] rounded-lg overflow-hidden shadow-xl text-left"
          style={{
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          {onAñadir && (
            <button
              type="button"
              disabled={añadiendo}
              onClick={async () => {
                setMenuAbierto(false);
                await onAñadir();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-micro font-bold normal-case tracking-normal text-primary/70 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {añadiendo ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
              Añadir
            </button>
          )}
          {(onRenombrar || onEliminar) && (
            <button
              type="button"
              onClick={() => {
                setMenuAbierto(false);
                setModalAbierto(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-micro font-bold normal-case tracking-normal text-primary/70 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <Pencil size={12} />
              Editar
            </button>
          )}
          {hayAgrupacion && (
            <button
              type="button"
              onClick={(e) => setSubmenuAgrupacionAncla(e.currentTarget)}
              className="w-full flex items-center gap-2 px-3 py-2 text-micro font-bold normal-case tracking-normal text-primary/70 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <Layers size={12} />
              Seleccionar agrupación
              <ChevronRight size={11} className="ml-auto opacity-50" />
            </button>
          )}
        </div>
  );

  return (
    <div className="px-3 pt-3 text-center">
      {/* Título arriba y centrado (pedido 2026-09-20). anclaRef vive en este
          wrapper —no en todo el bloque— para que el menú Añadir/Editar
          cuelgue centrado del título y un click en los filtros de abajo
          cuente como "afuera" y lo cierre. */}
      <div className="relative inline-block" ref={anclaRef}>
        {botonTitulo}
        {menuAbierto && menuFlotante}
      </div>

      {/* Filtros DEBAJO del título, centrados. Sin filtros la cabecera
          queda idéntica a antes (solo título). */}
      {filtros && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">{filtros}</div>
      )}

      {/* Segundo nivel: Por categorías (vuelve a null) / Por Propiedades
          (abre el tercer nivel con las 12 propiedades) — se ancla al botón
          "Seleccionar agrupación" de arriba. */}
      <PopoverFlotante
        anchor={submenuAgrupacionAncla}
        onClose={() => setSubmenuAgrupacionAncla(null)}
        width={190}
        maxHeight={380}
      >
        <div className="flex flex-col gap-0.5 p-1.5">
          <button
            type="button"
            onClick={() => {
              onSeleccionarAgrupacion?.(null);
              setSubmenuAgrupacionAncla(null);
              setMenuAbierto(false);
            }}
            className={`rounded-md px-2 py-1 text-left text-micro font-bold transition-colors cursor-pointer ${
              agrupacionActiva === null
                ? "bg-accent/15 text-accent"
                : "text-primary/70 hover:bg-primary/10"
            }`}
          >
            Por categorías
          </button>
          <button
            type="button"
            onClick={(e) => setSubmenuPropiedadAncla(e.currentTarget)}
            className={`w-full flex items-center gap-1 rounded-md px-2 py-1 text-left text-micro font-bold transition-colors cursor-pointer ${
              agrupacionActiva !== null
                ? "bg-accent/15 text-accent"
                : "text-primary/70 hover:bg-primary/10"
            }`}
          >
            Por Propiedades
            <ChevronRight size={11} className="ml-auto opacity-50" />
          </button>
        </div>
      </PopoverFlotante>

      {/* Tercer nivel: las 12 propiedades numéricas — se ancla al botón
          "Por Propiedades" de arriba. */}
      <PopoverFlotante
        anchor={submenuPropiedadAncla}
        onClose={() => setSubmenuPropiedadAncla(null)}
        width={200}
        maxHeight={380}
      >
        <ListaPropiedadesAgrupacion
          propiedadActiva={agrupacionActiva}
          onSeleccionar={(clave) => onSeleccionarAgrupacion?.(clave)}
          onCerrar={() => {
            setSubmenuPropiedadAncla(null);
            setSubmenuAgrupacionAncla(null);
            setMenuAbierto(false);
          }}
        />
      </PopoverFlotante>

      {modalAbierto && (
        <EditarListaModal
          titulo={titulo}
          items={items ?? []}
          onRenombrar={onRenombrar}
          onEliminar={onEliminar}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}

/** Modal centrado — mismo shell (createPortal a document.body, fixed
 *  inset-0 backdrop blur, contenedor rounded-2xl) que EstructuraPanelFlotante
 *  / CompuestoPanelFlotante / resto de paneles del dominio, para que el
 *  "Editar" se sienta consistente con el resto del panel admin. */
function EditarListaModal({
  titulo,
  items,
  onRenombrar,
  onEliminar,
  onClose,
}: {
  titulo: string;
  items: ItemEditable[];
  onRenombrar?: (id: string, nuevoNombre: string) => void | Promise<void>;
  onEliminar?: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, it.nombre])),
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  async function handleBlurRenombrar(id: string, valorOriginal: string) {
    const nuevoNombre = (valores[id] ?? "").trim();
    if (!onRenombrar || nuevoNombre === "" || nuevoNombre === valorOriginal) {
      setValores((prev) => ({ ...prev, [id]: valorOriginal }));
      return;
    }
    await onRenombrar(id, nuevoNombre);
  }

  async function handleEliminar(id: string) {
    if (!onEliminar) return;
    setBorrandoId(id);
    try {
      await onEliminar(id);
    } finally {
      setBorrandoId(null);
      setConfirmandoId(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 flex items-center justify-between gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <p className="text-micro font-black uppercase tracking-widest text-primary/60">
            Editar {titulo}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-primary/40 hover:text-primary/70 cursor-pointer p-1"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {items.length === 0 ? (
            <p className="py-6 text-micro text-primary/30 text-center">Sin ítems todavía.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
              >
                <input
                  value={valores[item.id] ?? item.nombre}
                  disabled={!onRenombrar}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  onBlur={() => handleBlurRenombrar(item.id, item.nombre)}
                  className="flex-1 min-w-0 bg-transparent text-micro text-primary/80 outline-none disabled:opacity-60 border-b border-transparent focus:border-primary/20 px-0.5 py-0.5"
                />
                {onEliminar &&
                  (confirmandoId === item.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={borrandoId === item.id}
                        onClick={() => handleEliminar(item.id)}
                        className="text-micro font-bold px-1.5 py-0.5 rounded bg-red-500 text-btn-text hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {borrandoId === item.id ? (
                          <Loader2 className="animate-spin" size={10} />
                        ) : (
                          "Confirmar"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoId(null)}
                        className="text-micro text-primary/40 hover:text-primary/70 px-1 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(item.id)}
                      className="shrink-0 text-primary/30 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Borrar"
                    >
                      <Trash2 size={13} />
                    </button>
                  ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
