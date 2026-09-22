"use client";

/**
 * BloqueColapsableAdmin.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Envuelve el header (título + ToggleMaestroAdmin) y el contenido de una
 * galería admin. Cuando el maestro está OCULTO, arranca colapsado como un
 * dropdown cerrado — el admin ve solo la barra de título y debe hacer click
 * para desplegarlo y gestionar las excepciones individuales. Cuando el
 * maestro está VISIBLE, siempre queda expandido (no tiene sentido
 * colapsar algo que el público ya está viendo).
 */

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

export function BloqueColapsableAdmin({
  maestroVisible,
  header,
  children,
}: {
  maestroVisible: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [expandido, setExpandido] = useState(maestroVisible);

  // Si el maestro cambia de estado (toggle en vivo), sincroniza: al
  // apagarlo se colapsa solo; al encenderlo se expande solo.
  useEffect(() => {
    setExpandido(maestroVisible);
  }, [maestroVisible]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpandido((e) => !e)}
          className="flex items-center gap-1 cursor-pointer"
          title={expandido ? "Colapsar" : "Expandir para ver y gestionar"}
        >
          <ChevronRight
            size={12}
            className="opacity-40 transition-transform"
            style={{ transform: expandido ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          {header}
        </button>
      </div>
      {expandido && children}
      {!expandido && (
        <p className="text-[10px]" style={{ color: "color-mix(in srgb, #b45309 60%, transparent)" }}>
          Oculta al público · click para ver y gestionar excepciones
        </p>
      )}
    </div>
  );
}
