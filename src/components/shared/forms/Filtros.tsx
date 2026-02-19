"use client";
import Dropdown from "./Dropdown";
import { cn } from "@/lib/utils";
// Si no usas Lucide, puedes usar un emoji como 📷
import { Camera } from "lucide-react"; 

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
        const esFiltroFoto = grupo === "conFoto";
        const estaActivo = filtrosActivos["conFoto"] === "solo_con_foto";

        // Si es el filtro de foto, renderizamos el Botón con Icono
        if (esFiltroFoto) {
          return (
            <div key={grupo} className="flex flex-col gap-2 items-center">
              <label className="text-[10px] font-black text-[#6B5E70]/60 uppercase tracking-[0.15em] text-center">
                Multimedia
              </label>
              <button
                onClick={() => onChange("conFoto", estaActivo ? "todos" : "solo_con_foto")}
                className={cn(
                  "h-[42px] w-[160px] rounded-xl flex items-center justify-center gap-2 transition-all duration-300 border",
                  estaActivo 
                    ? "bg-[#6B5E70] border-[#6B5E70] text-white shadow-md" 
                    : "bg-white border-[#E5E7EB] text-[#6B5E70] hover:border-[#6B5E70]/30"
                )}
              >
                <Camera size={18} className={cn(estaActivo ? "text-white" : "text-[#6B5E70]/50")} />
                <span className="text-[13px] font-bold tracking-tight">
                  {estaActivo ? "CON FOTO" : "TODOS"}
                </span>
              </button>
            </div>
          );
        }

        // Si es un filtro normal, renderizamos el Dropdown original
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
              value={filtrosActivos[grupo.toLowerCase()] || "todos"}
              onChange={(valor) => onChange(grupo, valor)}
            />
          </div>
        );
      })}
    </div>
  );
}