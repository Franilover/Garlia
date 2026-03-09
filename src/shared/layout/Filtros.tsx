"use client";
import Dropdown from "@/shared/layout/forms/Dropdown";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

interface FiltrosMaestrosProps {
  config: Record<string, string[]>;
  filtrosActivos: Record<string, string>;
  onChange: (grupo: string, valor: string) => void;
}

export default function FiltrosMaestros({ config, filtrosActivos, onChange }: FiltrosMaestrosProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 items-end w-full max-w-4xl mx-auto">
      {Object.entries(config).map(([grupo, opciones]) => {
        const esFiltroFoto = grupo === "conFoto";
        const estaActivo = filtrosActivos["conFoto"] === "solo_con_foto";

        if (esFiltroFoto) {
          return (
            <button
              key={grupo}
              type="button"
              title={estaActivo ? "Mostrando solo con foto" : "Mostrar todos"}
              onClick={() => onChange("conFoto", estaActivo ? "todos" : "solo_con_foto")}
              className={cn(
                "h-[42px] w-[42px] flex items-center justify-center transition-all duration-300",
                estaActivo
                  ? "bg-primary text-white scale-105"
                  : "bg-white-custom text-primary/50 hover:text-primary"
              )}
              style={{
                borderRadius: "var(--radius-btn)",
                border: "var(--border-width) solid",
                borderColor: estaActivo ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                boxShadow: estaActivo ? "var(--shadow-card)" : "none",
              }}
            >
              <Camera size={20} strokeWidth={estaActivo ? 2.5 : 2} />
            </button>
          );
        }

        return (
          <div key={grupo} className="flex flex-col gap-2 min-w-[160px]">
            <label className="text-[10px] font-black text-primary/50 uppercase tracking-[0.15em] text-center">
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