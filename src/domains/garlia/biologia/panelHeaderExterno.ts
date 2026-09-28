/**
 * panelHeaderExterno.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Contrato mínimo que PanelBioma/PanelEcosistema publican hacia afuera cuando
 * se usan con `headerExterno` (o sea, dentro de PanelFlotanteGlobal, que ya
 * tiene su propia barra superior única). Evita dibujar la barra interna
 * (volver/nombre/borrar/guardar) duplicada — mismo criterio que
 * useEditorHeaderControls para Flora/Mineral/Personaje/etc.
 */
export interface PanelHeaderExterno {
  /** Nombre actual (estado local no guardado del panel). */
  nombre: string;
  /** Actualiza el nombre local del panel (input controlado en el header global). */
  setNombre: (nombre: string) => void;
  /** Persiste nombre + campos editados del panel. */
  guardar: () => void;
  /** Abre la barra lateral de entidades (solo mobile). */
  sidebarMobile: () => void;
}
