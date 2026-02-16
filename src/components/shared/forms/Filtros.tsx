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
    <div className="flex flex-wrap justify-center gap-4 items-end w-full max-w-4xl mx-auto">
      {Object.entries(config).map(([grupo, opciones]) => {
        const opcionesDropdown = [
          { value: "todos", label: "Todos" },
          ...opciones.map(opt => ({ value: opt, label: opt }))
        ];

        return (
          <div key={grupo} className="flex flex-col gap-2 min-w-[160px]">
            <label className="text-[10px] font-black text-[#6B5E70]/60 uppercase tracking-[0.15em] text-center">
              {grupo}
            </label>
            <Dropdown
              options={opcionesDropdown}
              value={filtrosActivos[grupo] || "todos"}
              onChange={(valor) => onChange(grupo, valor)}
            />
          </div>
        );
      })}
    </div>
  );
}