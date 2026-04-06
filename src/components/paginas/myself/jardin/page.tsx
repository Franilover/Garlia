"use client";
import { Cat, BookOpen, Music, Map } from "lucide-react"; 
import { Secciones } from "@/components/layout/Secciones";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EstudioCapitulos from "@/components/paginas/myself/jardin/editorCapitulos";
import EstudioLetras    from "@/components/paginas/myself/jardin/editorLetras";
import EditorEntidades  from "@/components/paginas/myself/jardin/editorEntidades";
import EstudioReinos    from "@/components/paginas/myself/jardin/editorReinos"; 

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
          {
            // NUEVO PANEL AÑADIDO
            id: "reinos",
            label: "Mapas",
            icon: Map,
            content: <EstudioReinos />,
          },
        ]}
      />
    </AdminOnly>
  );
}