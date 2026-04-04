"use client";
import { Cat, BookOpen, Music, Users } from "lucide-react";
import { Secciones } from "@/components/layout/Secciones";
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