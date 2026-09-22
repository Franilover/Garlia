"use client";

/**
 * ToggleMaestroAdmin.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Botón visible solo para admins, junto al título de cada galería
 * (Partículas / Elementos), para ocultar o mostrar TODA la sección de
 * golpe en la página pública /garlia/universo/explicacion.
 */

import { Eye, EyeOff } from "lucide-react";

export function ToggleMaestroAdmin({
  visible,
  onToggle,
  etiqueta,
}: {
  visible: boolean;
  onToggle: () => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={visible ? `Ocultar toda la sección "${etiqueta}" al público` : `Mostrar toda la sección "${etiqueta}" al público`}
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer border"
      style={{
        color: visible ? "color-mix(in srgb, var(--primary) 55%, transparent)" : "#b45309",
        borderColor: visible ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, #b45309 40%, transparent)",
        background: visible ? "transparent" : "color-mix(in srgb, #b45309 8%, transparent)",
      }}
    >
      {visible ? <Eye size={11} /> : <EyeOff size={11} />}
      {visible ? "Visible" : "Oculta"}
    </button>
  );
}
