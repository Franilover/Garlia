"use client";

import { useEffect, useRef } from "react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

/**
 * Una sección navegable con Alt+N dentro de una página.
 *
 * - `key`: dígito del atajo, "1".."9" (Alt+1 … Alt+9).
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

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Registra atajos Alt+1..Alt+9 para saltar entre secciones dentro de la
 * página actual. Cada página llama este hook con su propia lista de
 * secciones — los atajos son locales al componente que los define, así que
 * distintas páginas pueden reusar el mismo número de tecla para cosas
 * distintas sin chocar entre sí.
 *
 * Se usa Alt en vez de Ctrl porque Ctrl+1..9 son atajos NATIVOS del
 * navegador para cambiar de pestaña (Chrome, Edge, Firefox) — el navegador
 * los intercepta antes de que lleguen al DOM, así que ni `preventDefault()`
 * puede evitarlo. Alt+N no tiene ese conflicto.
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
      if (!e.altKey) return;
      // Ctrl/Meta o Shift junto a Alt suele ser otro atajo (ej. Alt+Shift+3
      // en algunos SO); solo interceptamos Alt "puro" + dígito.
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!/^[1-9]$/.test(e.key)) return;

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
        if (!el) return;
        const container = section.getScrollContainer?.();
        if (container) {
          const elRect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset =
            elRect.top - containerRect.top + container.scrollTop - 80;
          container.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
        } else {
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
