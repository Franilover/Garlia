"use client";

import { Dumbbell, ShoppingCart, UtensilsCrossed, Carrot } from "lucide-react";
import Secciones from "@/components/layout/Secciones";
import { PaginaEjercicios } from "@/components/paginas/myself/EjerciciosComponent";
import ComprasPage from "@/components/paginas/myself/Compras";
import { IngredientesPage } from "@/components/paginas/myself/ingredientes";
import RecetasPage from "@/components/paginas/myself/recetas";
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