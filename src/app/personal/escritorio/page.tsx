"use client";

import { Calendar, FileText } from "lucide-react";
import { Secciones } from "@/shared/layout/Secciones";
import { GestionPersonal } from "@/paginas/personal/tareas";
import EnsayosView from "@/paginas/personal/ensayos/page";

export default function DashboardPage() {
  return (
    <Secciones
      panels={[
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
          id: "ensayos",
          label: "Ensayos",
          icon: FileText,
          content: <EnsayosView />,
        },
      ]}
    />
  );
}