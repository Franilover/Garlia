"use client";
import Dropdown from "./Dropdown";
import { cn } from "@/lib/utils";
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

        if (esFiltroFoto) {
          return (
            <div key={grupo} className="flex flex-col gap-2">
              {/* Hemos quitado el label superior aquí */}
              <button
                type="button"
                title={estaActivo ? "Mostrando solo con foto" : "Mostrar todos"}
                onClick={() => onChange("conFoto", estaActivo ? "todos" : "solo_con_foto")}
                className={cn(
                  "h-[42px] w-[42px] rounded-xl flex items-center justify-center transition-all duration-300 border",
                  estaActivo 
                    ? "bg-[#6B5E70] border-[#6B5E70] text-white shadow-md scale-105" 
                    : "bg-white border-[#E5E7EB] text-[#6B5E70] hover:border-[#6B5E70]/30 hover:bg-gray-50"
                )}
              >
                <Camera size={20} strokeWidth={estaActivo ? 2.5 : 2} />
              </button>
            </div>
          );
        }

        return (
          <div key={grupo} className="flex flex-col gap-2 min-w-[160px]">
            <label className="text-[10px] font-black text-[#6B5E70]/60 uppercase tracking-[0.15em] text-center">
              {grupo}
            </label>
            <Dropdown
              options={[
                { value: "todos", label: "Todos" },
                ...opciones.map(opt => ({ value: opt, label: opt }))
              ]}
              value={filtrosActivos[grupo.toLowerCase()] || "todos"}
              onChange={(valor) => onChange(grupo, valor)}
            />
          </div>
        );
      })}
    </div>
  );
}