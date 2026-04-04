"use client";

import { Dumbbell, Calendar, FileText, ShoppingCart, UtensilsCrossed, Carrot } from "lucide-react";
import Secciones from "@/components/layout/Secciones";
import { PaginaEjercicios } from "@/components/paginas/myself/vida/salud/ejerciciosComponent";
import ComprasPage from "@/components/paginas/myself/vida/salud/compras";
import ArmarioPage from "@/components/paginas/myself/vida/ropa";
import { IngredientesPage } from "@/components/paginas/myself/vida/salud/ingredientes";
import RecetasPage from "@/components/paginas/myself/vida/salud/recetas";
import { AdminOnly } from "@/components/forms/AdminOnly";
import { GestionPersonal } from "@/components/paginas/myself/vida/tareas/tareas";
import EnsayosView from "@/components/paginas/myself/ensayos";

export default function SaludPage() {
  return (
    <AdminOnly>
      <Secciones
        storageKey="salud-panel-activo"
        panels={[
          {
            id: "ensayos",
            label: "Ensayos",
            icon: FileText,
            content: <EnsayosView />,
          },
          {
            id: "agenda",
            label: "Agenda",
            icon: Calendar,
            content: (
              <main className="max-w-7xl mx-auto p-4 md:p-8 mt-6 pb-32">
                <GestionPersonal />
              </main>
            ),
          },
          {
            id: "ejercicios",
            label: "Ejercicios",
            icon: Dumbbell,
            content: (
              <main className="max-w-7xl mx-auto p-4 md:p-8 mt-6 pb-32">
                <PaginaEjercicios />
              </main>
            ),
          },
          {
            id: "recetas",
            label: "Recetas",
            icon: UtensilsCrossed,
            content: <RecetasPage />,
          },
          {
            id: "ingredientes",
            label: "Ingredientes",
            icon: Carrot,
            content: <IngredientesPage />,
          },
          {
            id: "compras",
            label: "Compras",
            icon: ShoppingCart,
            content: <ComprasPage />,
          },
          {
            id: "ropa",
            label: "Ropa",
            icon: ShoppingCart,
            content: <ArmarioPage />,
          },
        ]}
      />
    </AdminOnly>
  );
}