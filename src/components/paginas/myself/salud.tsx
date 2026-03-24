"use client";

import { Dumbbell, ShoppingCart, UtensilsCrossed, Carrot } from "lucide-react";
import Secciones from "@/components/layout/Secciones";
import { PaginaEjercicios } from "@/components/features/myself/salud/ejerciciosComponent";
import ComprasPage from "@/components/features/myself/salud/Compras";
import { IngredientesPage } from "@/components/features/myself/salud/ingredientes";
import RecetasPage from "@/components/features/myself/salud/recetas";
import { AdminOnly } from "@/components/forms/AdminOnly";

export default function SaludPage() {
  return (
    <AdminOnly>
      <Secciones
        storageKey="salud-panel-activo"
        panels={[
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
        ]}
      />
    </AdminOnly>
  );
}