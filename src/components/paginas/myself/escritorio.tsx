"use client";
import { Calendar, FileText, Cat, BookOpen, Music, Users } from "lucide-react";
import { Secciones } from "@/components/layout/Secciones";
import { GestionPersonal } from "@/components/features/tareas/tareas";
import EnsayosView from "@/components/paginas/myself/ensayos";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EstudioCapitulos from "@/components/features/myself/editor/editorCapitulos";
import EstudioLetras    from "@/components/features/myself/editor/editorLetras";
import EditorEntidades  from "@/components/features/myself/editor/editorEntidades";

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
          {
            id: "entidades",
            label: "Wiki",
            icon: Cat,
            content: <EditorEntidades />,
          },
        ]}
      />
    </AdminOnly>
  );
}