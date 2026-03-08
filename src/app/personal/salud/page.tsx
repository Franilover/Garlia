"use client";

import { Dumbbell, ShoppingCart, UtensilsCrossed, Carrot } from "lucide-react";
import Secciones from "@/shared/layout/Secciones";
import { PaginaEjercicios } from "@/paginas/personal/salud/EjerciciosComponent";
import ComprasPage from "@/paginas/personal/salud/Compras";
import { IngredientesPage } from "@/paginas/personal/salud/ingredientes";
import RecetasPage from "@/paginas/personal/salud/recetas";

export default function SaludPage() {
  return (
    <Secciones
      title="Salud"
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
  );
}