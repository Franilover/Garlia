"use client";

import { Dumbbell, Calendar, FileText, ShoppingCart, UtensilsCrossed, Carrot } from "lucide-react";
import Secciones from "@/components/layout/Secciones";
import ArmarioPage from "@/components/paginas/myself/vida/ropa";
import { AdminOnly } from "@/components/forms/AdminOnly";
import { GestionPersonal } from "@/components/paginas/myself/vida/escritorio/tareas/tareas";
import EnsayosView from "@/components/paginas/myself/vida/escritorio/ensayos/page";

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