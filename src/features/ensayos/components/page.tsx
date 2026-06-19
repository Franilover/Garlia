"use client";

import { Dumbbell, Calendar, FileText, ShoppingCart, UtensilsCrossed, Carrot } from "lucide-react";

import { AdminOnly } from "@/components/forms/AdminOnly";
import Secciones from "@/components/layout/Secciones";
import ComprasPage from "@/features/ensayos/views/compras";
import { PaginaEjercicios } from "@/features/ensayos/views/ejerciciosComponent";
import { IngredientesPage } from "@/features/ensayos/views/ingredientes";
import RecetasPage from "@/features/ensayos/views/recetas";

export default function SaludPage() {
  return (
    <AdminOnly>
      <Secciones
        panels={[
          {
            id: "ejercicios",
            label: "Ejercicios",
            icon: Dumbbell,
            content: (
              <main className="w-full p-4 md:p-8 mt-6 pb-32">
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
        storageKey="salud-panel-activo"
      />
    </AdminOnly>
  );
}