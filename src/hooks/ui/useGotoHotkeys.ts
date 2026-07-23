"use client";

import { useEffect, useRef } from "react";

/**
 * useGotoHotkeys — atajos estilo Gmail/Linear/Notion: presionar "g" y luego
 * una letra ejecuta una acción (típicamente, cambiar de sección sin navegar).
 *
 * Por qué "g + letra" y no un modificador (Ctrl+Alt+dígito, etc.):
 * Ctrl+Alt es el atajo de AltGr en varios layouts de teclado (incluido
 * español), así que el sistema operativo o el navegador a menudo se comen el
 * evento antes de que la app lo vea — es un atajo que "a veces no funciona"
 * de forma impredecible según el SO/layout del usuario. "g + letra" no choca
 * con ningún atajo de navegador/SO conocido y es el patrón que usan Gmail,
 * Linear, GitHub y Notion para exactamente este caso de uso.
 *
 * Seguridad ante inputs: como no hay modificador, cualquier letra suelta
 * podría interceptar texto que el usuario esté escribiendo. Por eso el hook
 * IGNORA el evento por completo si el foco actual está en un campo editable
 * (input, textarea, [contenteditable] — esto cubre el editor Lexical de
 * notas). Además, "g" debe soltarse y volver a presionarse: no hay timeout
 * abierto esperando la segunda tecla indefinidamente, así que escribir
 * "genial" en un campo no editable en un instante de descuido no dispara
 * nada raro salvo que además la app esperara letras sueltas ahí (no debería).
 *
 * Uso:
 * ```tsx
 * useGotoHotkeys({
 *   i: () => selectSection("inicio"),
 *   l: () => selectSection("libros"),
 * }, { enabled: isEscritorio });
 * ```
 */

type GotoActions = Record<string, () => void>;

interface UseGotoHotkeysOptions {
  /** Si es false, no registra el listener (ej. página distinta a la dueña del atajo). */
  enabled?: boolean;
  /** Ventana en ms entre presionar "g" y la letra siguiente. Default 900ms. */
  windowMs?: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useGotoHotkeys(
  actions: GotoActions,
  options: UseGotoHotkeysOptions = {},
) {
  const { enabled = true, windowMs = 900 } = options;

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // true mientras estamos "esperando la segunda tecla" tras una "g".
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const disarm = () => {
      armedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Nunca interceptar mientras el usuario escribe en un campo real
      // (inputs, textareas, o el contentEditable del editor de notas).
      if (isEditableTarget(e.target)) {
        disarm();
        return;
      }

      // Con cualquier modificador presionado no es este atajo (evita
      // interferir con Ctrl+G, Cmd+G "buscar siguiente", etc.).
      if (e.ctrlKey || e.metaKey || e.altKey) {
        disarm();
        return;
      }

      if (!armedRef.current) {
        if (e.key.toLowerCase() === "g") {
          armedRef.current = true;
          timerRef.current = setTimeout(disarm, windowMs);
        }
        return;
      }

      // Ya está "armado" (se presionó "g" hace poco): la siguiente letra
      // decide la acción, sea cual sea.
      const action = actionsRef.current[e.key.toLowerCase()];
      disarm();
      if (!action) return;

      e.preventDefault();
      e.stopPropagation();
      action();
    };

    window.addEventListener("keydown", handler, true);
    return () => {
      window.removeEventListener("keydown", handler, true);
      disarm();
    };
  }, [enabled, windowMs]);
}
