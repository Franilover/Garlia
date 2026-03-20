"use client";

import { Calendar, FileText, BookOpen, Music } from "lucide-react";
import { Secciones } from "@/components/layout/Secciones";
import { GestionPersonal } from "@/components/layout/paginas/myself/tareas";
import EnsayosView from "@/components/layout/paginas/myself/ensayos/page";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EstudioCapitulos from "@/components/layout/paginas/myself/Editor/EditorCapitulos";
import EstudioLetras    from "@/components/layout/paginas/myself/Editor/EditorLetras";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <Secciones
        storageKey="dashboard-panel-activo"
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
          {
            id: "capitulos",
            label: "Capítulos",
            icon: BookOpen,
            content: <EstudioCapitulos />,
          },
          {
            id: "letras",
            label: "Letras",
            icon: Music,
            content: <EstudioLetras />,
          },
        ]}
      />
    </AdminOnly>
  );
}