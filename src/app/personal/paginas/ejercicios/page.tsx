"use client";

import { PaginaEjercicios } from "@/paginas/personal/ejercicios";
import { Dumbbell } from "lucide-react";

export default function EjerciciosPage() {
  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 mt-10 pb-32">
      <header className="mb-10">
        <h1 className="text-3xl font-black italic tracking-tighter text-primary flex items-center gap-3 uppercase">
          <Dumbbell className="opacity-40" size={28} />
          <span>Ejercicios <span className="text-primary/40 text-2xl">& Rutinas</span></span>
        </h1>
      </header>
      <PaginaEjercicios />
    </main>
  );
}