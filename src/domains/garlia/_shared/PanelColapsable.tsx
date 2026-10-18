"use client";

/**
 * PanelColapsable.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Sistema unificado de paneles colapsables y dropdowns.
 *
 * Exporta dos primitivas:
 *
 *   1. `PanelColapsable`   — sección inline que se expande/colapsa
 *      (reemplaza BloqueColapsableAdmin, PanelLinks, CriaturaHabitat,
 *       BloqueGruposCriatura, BloqueSubsistemaMagicoCriatura, etc.)
 *
 *   2. `MenuDropdown`      — botón con menú flotante, click-outside + Escape
 *      (reemplaza FiltroDropdown, GrupoFiltroDropdown,
 *       DescargarDatosDropdown, AgrupacionPersonajesDropdown, etc.)
 *
 * Comportamientos unificados:
 *   - Un solo listener mousedown/Escape por instancia, montado/desmontado
 *     correctamente con el ciclo de vida del panel.
 *   - El menú se cierra SOLO al elegir una opción o al click-afuera.
 *     Abre/cierra el mismo panel sin afectar otros.
 *   - No hay estado "cerrar todo" global — cada instancia es independiente.
 *   - Transición de altura animada con CSS (no JS resize observer).
 *   - Chevron rota 180° al abrir.
 *   - Badge de conteo opcional en el header.
 *
 * ─── Uso rápido ──────────────────────────────────────────────────────────────
 *
 *   // Panel colapsable
 *   <PanelColapsable titulo="Hábitat" icono={<Globe size={12} />} count={3}>
 *     <p>Contenido...</p>
 *   </PanelColapsable>
 *
 *   // Panel que empieza abierto
 *   <PanelColapsable titulo="Sistemas" defaultOpen>
 *     ...
 *   </PanelColapsable>
 *
 *   // Panel controlado desde fuera
 *   <PanelColapsable titulo="Links" open={open} onOpenChange={setOpen}>
 *     ...
 *   </PanelColapsable>
 *
 *   // Dropdown genérico
 *   <MenuDropdown
 *     trigger={<button>Abrir</button>}
 *     align="left"              // "left" | "right" (default "left")
 *   >
 *     <MenuDropdown.Item onClick={...}>Opción 1</MenuDropdown.Item>
 *     <MenuDropdown.Item onClick={...} danger>Eliminar</MenuDropdown.Item>
 *     <MenuDropdown.Separator />
 *     <MenuDropdown.Item onClick={...} active>Seleccionado</MenuDropdown.Item>
 *   </MenuDropdown>
 *
 * ─── Migraciones típicas ──────────────────────────────────────────────────────
 *
 *   // ANTES (FiltroDropdown, GrupoFiltroDropdown, etc.):
 *   const [open, setOpen] = useState(false);
 *   const ref = useRef<HTMLDivElement>(null);
 *   useLayoutEffect(() => {
 *     if (!open) return;
 *     const h = (e: MouseEvent) => {
 *       if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
 *     };
 *     document.addEventListener("mousedown", h);
 *     return () => document.removeEventListener("mousedown", h);
 *   }, [open]);
 *   return (
 *     <div ref={ref} className="relative">
 *       <button onClick={() => setOpen(o => !o)}>...</button>
 *       {open && <div className="absolute ...">...</div>}
 *     </div>
 *   );
 *
 *   // DESPUÉS:
 *   return (
 *     <MenuDropdown trigger={<button>...</button>}>
 *       <MenuDropdown.Item onClick={...}>...</MenuDropdown.Item>
 *     </MenuDropdown>
 *   );
 */

import { ChevronDown } from "lucide-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Tokens internos (mismos valores que types.ts de Garlia)
// ─────────────────────────────────────────────────────────────────────────────

const HEADER_CLS =
  "flex items-center gap-2 w-full text-left text-micro font-black uppercase tracking-[0.15em] text-primary/40 hover:text-primary/70 transition-colors select-none";

const BADGE_CLS =
  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-micro font-black bg-primary/8 text-primary/50";

// ─────────────────────────────────────────────────────────────────────────────
// PanelColapsable
// ─────────────────────────────────────────────────────────────────────────────

interface PanelColapsableProps {
  /** Texto del header. Ignorado si se pasa `headerNode`. */
  titulo?: string;
  /**
   * Header completamente personalizado (reemplaza titulo + icono + count).
   * Útil cuando el header contiene botones propios (ej. ToggleMaestroAdmin).
   * El chevron de apertura se agrega automáticamente a la derecha.
   */
  headerNode?: React.ReactNode;
  /** Ícono Lucide (u otro ReactNode) a la izquierda del título. */
  icono?: React.ReactNode;
  /** Número que aparece como badge junto al título (0 = oculto). */
  count?: number;
  /** Arranca abierto (modo no controlado). */
  defaultOpen?: boolean;
  /** Para modo controlado: estado actual. */
  open?: boolean;
  /** Para modo controlado: callback de cambio. */
  onOpenChange?: (open: boolean) => void;
  /** Contenido que se muestra al expandir. */
  children: React.ReactNode;
  /** Clases extra para el wrapper externo. */
  className?: string;
  /** Separador superior (default: border-t border-primary/8). */
  border?: boolean;
  /** Padding horizontal del header (default: px-0). */
  paddingX?: string;
}

export function PanelColapsable({
  titulo,
  headerNode,
  icono,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className = "",
  border = false,
  paddingX = "",
}: PanelColapsableProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const toggle = useCallback(() => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }, [open, isControlled, onOpenChange]);

  // Sincroniza el estado interno cuando el padre cambia el modo controlado
  // en respuesta a datos externos (ej. maestro toggle en BloqueColapsableAdmin).
  useEffect(() => {
    if (isControlled) setInternalOpen(controlledOpen!);
  }, [isControlled, controlledOpen]);

  const borderCls = border ? "border-t border-primary/8" : "";

  return (
    <div className={`${borderCls} ${className}`}>
      {/* ── Header ── */}
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className={`${HEADER_CLS} py-2.5 ${paddingX}`}
      >
        {headerNode ? (
          // Header personalizado: el ReactNode ocupa el espacio flexible
          <span className="flex-1 flex items-center gap-2 min-w-0">{headerNode}</span>
        ) : (
          <>
            {icono && <span className="shrink-0 text-primary/35">{icono}</span>}
            <span className="flex-1 truncate">{titulo}</span>
            {count !== undefined && count > 0 && (
              <span className={BADGE_CLS}>{count}</span>
            )}
          </>
        )}
        <ChevronDown
          size={11}
          className="shrink-0 opacity-40 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* ── Contenido con animación de altura ── */}
      <div
        aria-hidden={!open}
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 200ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className={`pb-3 ${paddingX}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuDropdown
// ─────────────────────────────────────────────────────────────────────────────
// Context para que los Item hijos puedan cerrar el menú sin prop drilling.

const DropdownCtx = createContext<{ close: () => void } | null>(null);

interface MenuDropdownProps {
  /** El botón (u otro elemento) que abre/cierra el menú. */
  trigger: React.ReactNode;
  /** Alineación del panel respecto al trigger (default: "left"). */
  align?: "left" | "right";
  /** Ancho mínimo del panel (default: 160px). */
  minWidth?: number;
  children: React.ReactNode;
  /** Clases extra para el wrapper */
  className?: string;
}

function MenuDropdownRoot({
  trigger,
  align = "left",
  minWidth = 160,
  children,
  className = "",
}: MenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Click-outside + Escape — se registra solo cuando está abierto.
  useLayoutEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <DropdownCtx.Provider value={{ close }}>
      <div ref={ref} className={`relative shrink-0 ${className}`}>
        {/* Clona el trigger para inyectarle el onClick de toggle */}
        <div onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
          {trigger}
        </div>

        {open && (
          <div
            role="menu"
            className="absolute z-30 top-full mt-1 rounded-xl border shadow-lg overflow-hidden py-1"
            style={{
              [align === "right" ? "right" : "left"]: 0,
              minWidth,
              background: "var(--bg-main, #fff)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownCtx.Provider>
  );
}

// ─── MenuDropdown.Item ────────────────────────────────────────────────────────

interface MenuItemProps {
  onClick?: () => void;
  /** Resalta el ítem como seleccionado actualmente. */
  active?: boolean;
  /** Estilo destructivo (rojo). */
  danger?: boolean;
  /** Ícono a la izquierda. */
  icon?: React.ReactNode;
  /** Badge de conteo a la derecha. */
  count?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

function MenuItem({
  onClick,
  active = false,
  danger = false,
  icon,
  count,
  disabled = false,
  children,
}: MenuItemProps) {
  const ctx = useContext(DropdownCtx);

  const handle = () => {
    if (disabled) return;
    onClick?.();
    ctx?.close();
  };

  const color = danger
    ? "text-red-400/70 hover:text-red-400 hover:bg-red-400/5"
    : active
    ? "text-primary bg-primary/5 hover:bg-primary/8"
    : "text-primary/70 hover:text-primary hover:bg-primary/5";

  return (
    <button
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={handle}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
    >
      {icon && <span className="shrink-0 opacity-60">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {count !== undefined && <span className={BADGE_CLS}>{count}</span>}
    </button>
  );
}

// ─── MenuDropdown.Separator ───────────────────────────────────────────────────

function MenuSeparator() {
  return (
    <div
      role="separator"
      className="my-1 border-t"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
    />
  );
}

// ─── MenuDropdown.Label ───────────────────────────────────────────────────────

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-micro font-black uppercase tracking-[0.15em] text-primary/25 select-none">
      {children}
    </div>
  );
}

// ─── Ensamble con sub-componentes ─────────────────────────────────────────────

export const MenuDropdown = Object.assign(MenuDropdownRoot, {
  Item: MenuItem,
  Separator: MenuSeparator,
  Label: MenuLabel,
});
