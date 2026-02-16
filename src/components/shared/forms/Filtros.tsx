// components/shared/forms/Filtros.tsx
"use client";
import Dropdown from "./Dropdown";

interface FiltrosMaestrosProps {
  config: Record<string, string[]>;
  filtrosActivos: Record<string, string>;
  onChange: (grupo: string, valor: string) => void;
}

export default function FiltrosMaestros({
  config,
  filtrosActivos,
  onChange
}: FiltrosMaestrosProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {Object.entries(config).map(([grupo, opciones]) => {
        const opcionesDropdown = [
          { value: "todos", label: `Todos` },
          ...opciones.map(opt => ({ value: opt, label: opt }))
        ];

        return (
          <div key={grupo} className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-[#6B5E70]/50 uppercase tracking-widest px-1">
              {grupo}
            </label>
            <Dropdown
              options={opcionesDropdown}
              value={filtrosActivos[grupo] || "todos"}
              onChange={(valor) => onChange(grupo, valor)}
              className="min-w-[140px]"
            />
          </div>
        );
      })}
    </div>
  );
}