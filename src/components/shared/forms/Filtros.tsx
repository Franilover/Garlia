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
        // Detectamos si es el filtro especial de fotos
        const esFiltroFoto = grupo === "conFoto";
        
        // Definimos las opciones: si es conFoto son fijas, si no, vienen de la DB
        const opcionesDropdown = esFiltroFoto 
          ? [
              { value: "todos", label: "Mostrar Todos" },
              { value: "solo_con_foto", label: "Con Imagen" }
            ]
          : [
              { value: "todos", label: "Todos" },
              ...opciones.map(opt => ({ value: opt, label: opt }))
            ];

        return (
          <div key={grupo} className="flex flex-col gap-2 min-w-[160px]">
            {/* El label superior: 'Multimedia' para fotos, o el nombre capitalizado para el resto */}
            <label className="text-[10px] font-black text-[#6B5E70]/60 uppercase tracking-[0.15em] text-center">
              {esFiltroFoto ? "Multimedia" : grupo}
            </label>
            
            <Dropdown
              options={opcionesDropdown}
              // Buscamos el valor activo usando la clave correcta
              value={filtrosActivos[esFiltroFoto ? "conFoto" : grupo.toLowerCase()] || "todos"}
              onChange={(valor) => onChange(esFiltroFoto ? "conFoto" : grupo, valor)}
            />
          </div>
        );
      })}
    </div>
  );
}