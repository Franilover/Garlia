"use client";

import { useEffect, useRef } from "react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

/**
 * Una sección navegable con el dígito N (sin modificador) dentro de una página.
 *
 * - `key`: dígito del atajo, "1".."9".
 * - `ref`: elemento al que hacer scroll. Opcional si la sección solo cambia
 *   de tab/pestaña sin necesitar scroll (ej. ya se ve entera).
 * - `getElement`: alternativa a `ref` para secciones que exponen su nodo DOM
 *   vía imperative handle (ej. `miRef.current?.getElement()`) en vez de un
 *   `React.RefObject` directo. Se evalúa en el momento del scroll, así que
 *   siempre lee el valor más reciente.
 * - `onActivate`: se ejecuta ANTES del scroll — úsalo para cambiar de tab,
 *   expandir un panel colapsado, limpiar overlays, etc. Si la sección
 *   necesita esperar a que React re-renderice tras el cambio de tab antes
 *   de que el `ref` exista/sea visible, el hook igual espera unos frames
 *   antes de hacer scroll (ver `settleDelayMs`).
 * - `getScrollContainer`: opcional, contenedor scrollable custom (si no,
 *   usa `scrollIntoView` sobre el elemento).
 * - `settleDelayMs`: ms a esperar tras `onActivate` antes de calcular el
 *   scroll (por defecto 60ms — suficiente para un re-render de cambio de tab,
 *   o más si además se expande contenido colapsado que sigue cargando).
 */
export interface SectionHotkey {
  key: string;
  ref?: React.RefObject<HTMLElement | null>;
  getElement?: () => HTMLElement | null;
  onActivate?: () => void;
  getScrollContainer?: () => HTMLElement | null;
  settleDelayMs?: number;
}

export interface UseSectionHotkeysOptions {
  /** Si es false, el hook no registra el listener (ej. mientras un modal está abierto). */
  enabled?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * True si el elemento (o alguno de sus ancestros) es un campo donde escribir
 * un dígito debe insertar texto en vez de disparar un atajo: inputs,
 * textareas, `[contenteditable]` (ej. editores rich-text como el
 * `MarkdownEditor`), y cualquier cosa con `role="textbox"`.
 */
function isEditableElement(el: HTMLElement | null): boolean {
  let node: HTMLElement | null = el;
  while (node) {
    const tag = node.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (node.isContentEditable) return true;
    const role = node.getAttribute("role");
    if (role === "textbox" || role === "combobox") return true;
    node = node.parentElement;
  }
  return false;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Registra atajos 1..9 (sin modificador) para saltar entre secciones dentro
 * de la página actual. Cada página llama este hook con su propia lista de
 * secciones — los atajos son locales al componente que los define, así que
 * distintas páginas pueden reusar el mismo número de tecla para cosas
 * distintas sin chocar entre sí.
 *
 * Como los dígitos "pelados" (sin Alt/Ctrl) son teclas normales, el hook
 * IGNORA el evento por completo mientras el foco está en un campo editable
 * (input, textarea, `[contenteditable]`, o cualquier elemento con
 * `role="textbox"`) para no pisar la escritura normal — si el usuario está
 * tipeando un "3" en un textarea, ese "3" se escribe y no navega.
 *
 * Ejemplo:
 * ```tsx
 * const lineaTiempoRef = useRef<HTMLDivElement>(null);
 * const capitulosRef = useRef<HTMLDivElement>(null);
 *
 * useSectionHotkeys([
 *   { key: "1", ref: lineaTiempoRef },
 *   {
 *     key: "2",
 *     ref: capitulosRef,
 *     onActivate: () => setTab("capitulos"), // cambia de tab antes de hacer scroll
 *   },
 * ]);
 * ```
 */
export function useSectionHotkeys(
  sections: SectionHotkey[],
  options: UseSectionHotkeysOptions = {},
) {
  const { enabled = true } = options;

  // Ref para no tener que re-registrar el listener cada vez que `sections`
  // cambia de identidad (ej. por refs recreados en cada render).
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Dígito "pelado": sin Alt/Ctrl/Meta/Shift. Si viene con algún
      // modificador es otro atajo (del navegador, del SO, etc.) y no nos
      // interesa.
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!/^[1-9]$/.test(e.key)) return;

      // No interceptar mientras el foco está en un campo editable: ahí el
      // dígito debe escribirse normalmente, no navegar de sección.
      const target = e.target as HTMLElement | null;
      const activeEl =
        (target && isEditableElement(target)) ||
        (document.activeElement instanceof HTMLElement &&
          isEditableElement(document.activeElement));
      // eslint-disable-next-line no-console
      console.log("[useSectionHotkeys] key:", e.key, {
        target,
        activeElement: document.activeElement,
        blockedByEditable: activeEl,
        sectionsCount: sectionsRef.current.length,
        keys: sectionsRef.current.map((s) => s.key),
      });
      if (activeEl) return;

      const section = sectionsRef.current.find((s) => s.key === e.key);
      if (!section) return;

      e.preventDefault();
      e.stopPropagation();

      section.onActivate?.();

      const delay = section.settleDelayMs ?? (section.onActivate ? 60 : 0);

      const resolveElement = () =>
        section.ref?.current ?? section.getElement?.() ?? null;

      const scrollToSection = () => {
        const el = resolveElement();
        const container = section.getScrollContainer?.();
        // eslint-disable-next-line no-console
        console.log("[useSectionHotkeys] scrollToSection", {
          key: section.key,
          el,
          container,
          hasRef: !!section.ref,
          hasGetElement: !!section.getElement,
          hasGetScrollContainer: !!section.getScrollContainer,
        });
        if (!el) return;
        if (container) {
          const elRect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset =
            elRect.top - containerRect.top + container.scrollTop - 80;
          console.log("[useSectionHotkeys] scrolling container", {
            elRect,
            containerRect,
            offset,
            scrollTopBefore: container.scrollTop,
          });
          container.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
          setTimeout(() => {
            console.log(
              "[useSectionHotkeys] scrollTop after scrollTo (100ms later):",
              container.scrollTop,
            );
          }, 100);
        } else {
          console.log("[useSectionHotkeys] scrollIntoView fallback");
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      // Reintentamos el scroll varias veces durante una ventana corta: si
      // `onActivate` expande una sección colapsada, su contenido (imágenes,
      // chips) puede seguir determinando su altura final por un momento,
      // desalineando un cálculo hecho una sola vez.
      const attempts = [0, 120, 300, 550];
      attempts.forEach((extra) => {
        setTimeout(() => {
          requestAnimationFrame(() => requestAnimationFrame(scrollToSection));
        }, delay + extra);
      });
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled]);
}
