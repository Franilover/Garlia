"use client";

import { BookOpen, Music } from "lucide-react";
import Secciones from "@/shared/layout/Secciones";
import ChapterStudio from "@/paginas/wiki/Editor/EditorCapitulos";
import LyricStudio   from "@/paginas/wiki/Editor/EditorLetras";

export default function EditorPage() {
  return (
    <Secciones
      storageKey="editor-panel-activo"
      panels={[
        {
          id: "capitulos",
          label: "Capítulos",
          icon: BookOpen,
          content: <ChapterStudio />,
        },
        {
          id: "letras",
          label: "Letras",
          icon: Music,
          content: <LyricStudio />,
        },
      ]}
    />
  );
}