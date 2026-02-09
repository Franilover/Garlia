"use client";
import React from "react";
import RecetasPage from "@/components/features/recetas";
import { use } from "react"; // Importamos 'use' para desenvolver la promesa

// Definimos la interfaz correcta para Next.js 15/16
interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetalleRecetaPage({ params }: PageProps) {
  // 'use' desenvolverá la promesa de los params de forma segura en Client Components
  const resolvedParams = use(params);

  return (
    <main>
      <RecetasPage selectedRecipeId={resolvedParams.id} />
    </main>
  );
}