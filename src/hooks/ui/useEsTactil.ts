"use client";

import { useEffect, useState } from "react";

/**
 * true si el dispositivo primario de puntero es táctil (mobile/tablet),
 * false en desktop con mouse. Usa `(pointer: coarse)` en vez de un ancho de
 * pantalla — más preciso: una ventana angosta en desktop (mouse) no cuenta
 * como táctil, y una tablet/mobile en horizontal sigue contando como tal.
 *
 * SSR-safe: arranca en `false` (asume desktop) y se corrige en el primer
 * efecto del cliente, evitando el error de hidratación de leer
 * `window.matchMedia` durante el render del servidor.
 */
export function useEsTactil(): boolean {
  const [esTactil, setEsTactil] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setEsTactil(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setEsTactil(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return esTactil;
}
