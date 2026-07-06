"use client";

/**
 * LetrasSection
 * ───────────────────────────────────────────────────────────────────────────
 * `EditorLetras.tsx` (export default `EstudioLetras`) ya es autocontenido.
 */

import EstudioLetras from "@/features/editorGarlia/views/EditorLetras";

import { FloatingBackButton } from "../shared/FloatingBackButton";

export function LetrasSection() {
  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      <FloatingBackButton />
      <EstudioLetras />
    </div>
  );
}
