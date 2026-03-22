"use client";

import React, { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, RefreshCw, Search, WifiOff, X } from "lucide-react";

export interface EstudioLayoutProps {
  
  titulo: string;
  icono: React.ReactNode;
  colapsadoLabel?: string;

  
  onRefetch?: () => void;

  
  busqueda?: string;
  onBusquedaChange?: (v: string) => void;
  busquedaPlaceholder?: string;

  
  headerExtra?: React.ReactNode;

  
  sidebarContent: React.ReactNode;

  
  isOffline?: boolean;
  footerLeft?: React.ReactNode;   
  footerRight?: React.ReactNode;  

  
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;

  
  children: React.ReactNode;
}

export function EstudioLayout({
  titulo,
  icono,
  colapsadoLabel,
  onRefetch,
  busqueda = "",
  onBusquedaChange,
  busquedaPlaceholder = "Buscar…",
  headerExtra,
  sidebarContent,
  isOffline = false,
  footerLeft,
  footerRight,
  sidebarOpen: externalOpen,
  onSidebarOpenChange,
  children,
}: EstudioLayoutProps) {
  
  const [internalOpen, setInternalOpen] = useState(true);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onSidebarOpenChange) onSidebarOpenChange(v);
    else setInternalOpen(v);
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">

      {}
      {!isOpen && (
        <div className="shrink-0 w-10 flex flex-col items-center pt-6 gap-4 border-r border-primary/10 bg-bg-main">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
            title="Abrir panel"
          >
            <PanelLeftOpen size={16} />
          </button>
          {colapsadoLabel && (
            <span
              className="text-[9px] font-black uppercase text-primary/15 tracking-[0.25em] select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {colapsadoLabel}
            </span>
          )}
        </div>
      )}

      {}
      {isOpen && (
        <aside className="w-72 shrink-0 flex flex-col border-r border-primary/10 bg-bg-main">

          {}
          <div className="px-5 pt-6 pb-4 border-b border-primary/10 shrink-0 space-y-3">

            {}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                {icono} {titulo}
              </h2>
              <div className="flex items-center gap-1">
                {onRefetch && (
                  <button
                    onClick={onRefetch}
                    title="Recargar"
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  title="Cerrar panel"
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>

            {}
            {onBusquedaChange && (
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" />
                <input
                  value={busqueda}
                  onChange={e => onBusquedaChange(e.target.value)}
                  placeholder={busquedaPlaceholder}
                  className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-9 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary/30 placeholder:text-primary/25 transition-colors"
                />
                {busqueda && (
                  <button
                    onClick={() => onBusquedaChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {}
            {headerExtra}
          </div>

          {}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {sidebarContent}
          </div>

          {}
          <div className="shrink-0 px-5 py-3 border-t border-primary/10 text-[9px] font-black uppercase tracking-widest flex justify-between items-center">
            {isOffline ? (
              <span className="flex items-center gap-1 text-amber-400">
                <WifiOff size={10} /> Sin conexión
              </span>
            ) : (
              <span className="text-primary/20">{footerLeft}</span>
            )}
            {footerRight && (
              <span className="text-primary/20">{footerRight}</span>
            )}
          </div>
        </aside>
      )}

      {}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {children}
      </main>

    </div>
  );
}

export default EstudioLayout;