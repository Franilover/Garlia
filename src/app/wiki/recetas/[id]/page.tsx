"use client";
import React from "react";
import RecetasPage from "@/components/features/recetas";

// Este componente recibe 'params' automáticamente de Next.js
export default function DetalleRecetaPage({ params }: { params: { id: string } }) {
  return (
    <main>
      {/* Le pasamos el 'id' al componente de features.
        Tendremos que ir a 'features/recetas.tsx' y decirle:
        "Si recibes un ID, no muestres la lista, muestra solo esta receta".
      */}
      <RecetasPage selectedRecipeId={params.id} />
    </main>
  );
}