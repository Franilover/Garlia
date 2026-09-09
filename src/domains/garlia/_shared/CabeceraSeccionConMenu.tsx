"use client";

/**
 * CabeceraSeccionConMenu.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Título clicable de sección (reemplazo del <Cabecera> estático de
 * FilaAsimetrica, y del título suelto de Elementos). Al hacer click abre un
 * menú flotante con dos opciones:
 *
 *  - Añadir   → llama onAñadir() directo (mismo flujo que ya existía por
 *               bloque: handleCreateCompuesto / handleCreate elemento /
 *               crear estructura o material nuevo).
 *  - Editar   → abre un modal centrado (mismo shell que el resto de paneles
 *               flotantes del dominio) con la lista de ítems: nombre a la
 *               izquierda (editable inline, blur = guardar) y botón de
 *               borrar a la derecha.
 *
 * Genérico por diseño: no sabe nada de Compuesto/Estructura/Material/
 * Elemento — solo recibe items: {id, nombre}[] y callbacks. Cada consumidor
 * (FilaAsimetrica por bloque, o el título de Elementos) le pasa su propio
 * onRenombrar/onEliminar/onAñadir ya conectados a su hook real.
 *
 * Si un bloque no pasa onAñadir/onRenombrar/onEliminar (ej. Estructuras y
 * Materiales antes de que existiera update/delete en el hook), esa opción
 * del menú/modal simplemente no se muestra — ver EstructurasPage/
 * MaterialesPage para cómo quedaron conectadas.
 */

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
}

export function CabeceraSeccionConMenu({
  titulo,
  items,
  onAñadir,
  onRenombrar,
  onEliminar,
  añadiendo,
}: CabeceraSeccionConMenuProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const anclaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;
    function onDocClick(e: MouseEvent) {
      if (anclaRef.current && !anclaRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuAbierto]);

  const hayAlgoQueMostrar = Boolean(onAñadir || onRenombrar || onEliminar);

  return (
    <div className="px-3 pt-3 text-center relative" ref={anclaRef}>
      <button
        type="button"
        disabled={!hayAlgoQueMostrar}
        onClick={() => hayAlgoQueMostrar && setMenuAbierto((v) => !v)}
        className={`text-micro font-black uppercase tracking-widest text-primary/40 ${
          hayAlgoQueMostrar ? "hover:text-primary/70 cursor-pointer" : "cursor-default"
        } transition-colors`}
      >
        {titulo}
      </button>

      {menuAbierto && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 min-w-[9rem] rounded-lg overflow-hidden shadow-xl text-left"
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
        </div>
      )}

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
