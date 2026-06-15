"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { User, Shield, BookOpen, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Escuchar el atajo de teclado Ctrl+K (o Cmd+K en Mac)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      {/* Contenedor Principal de CMDK */}
      <Command 
        className="w-full max-w-xl bg-white-custom rounded-2xl border border-primary/15 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer click dentro
      >
        {/* Input de búsqueda */}
        <Command.Input 
          placeholder="¿A dónde quieres viajar en Garlia? (Buscar lunas, reinos, personajes...)" 
          className="w-full bg-transparent p-4 text-sm outline-none border-b border-primary/10 placeholder:text-primary/30"
        />

        <Command.List className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {/* Estado vacío */}
          <Command.Empty className="text-xs text-primary/40 p-4 text-center">
            No se encontraron hilos de lore con ese nombre.
          </Command.Empty>

          {/* Grupo: Navegación Rápida */}
          <Command.Group heading="Navegación" className="text-[10px] font-black uppercase tracking-wider text-primary/30 px-2 py-1">
            <Command.Item 
              onSelect={() => { router.push("/mapa"); setOpen(false); }}
              className="flex items-center gap-2 p-2 rounded-xl text-xs text-primary/70 hover:bg-primary/5 cursor-pointer aria-selected:bg-primary/5 aria-selected:text-primary transition-colors"
            >
              <MapPin size={14} />
              <span>Ver Mapa de Garlia</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => { router.push("/capitulos"); setOpen(false); }}
              className="flex items-center gap-2 p-2 rounded-xl text-xs text-primary/70 hover:bg-primary/5 cursor-pointer aria-selected:bg-primary/5 aria-selected:text-primary transition-colors"
            >
              <BookOpen size={14} />
              <span>Estudio de Capítulos</span>
            </Command.Item>
          </Command.Group>

          {/* Grupo: Lore Inyectado Dinámicamente */}
          <Command.Group heading="Accesos Directos a Entidades" className="text-[10px] font-black uppercase tracking-wider text-primary/30 px-2 py-1 mt-2">
            {/* Aquí podrías mapear personajes traídos con tu TanStack Query anterior */}
            <Command.Item 
              onSelect={() => { router.push("/editor?tab=personajes"); setOpen(false); }}
              className="flex items-center gap-2 p-2 rounded-xl text-xs text-primary/70 hover:bg-primary/5 cursor-pointer aria-selected:bg-primary/5 aria-selected:text-primary transition-colors"
            >
              <User size={14} />
              <span>Editar Personajes</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}