"use client";

import { User, Sword, Panda } from "lucide-react";
import Secciones from "@/components/layout/Secciones";
import Personajes from "@/components/paginas/wiki/info/personajes";
import Criaturas from "@/components/paginas/wiki/info/criaturas";

export default function WikiPage() {
  return (
    <Secciones
      storageKey="wiki-panel-activo"
      panels={[
        {
          id: "personajes",
          label: "Personajes",
          icon: User,
          content: <Personajes />,
        },
        {
          id: "criaturas",
          label: "Criaturas",
          icon: Panda,
          content: <Criaturas />,
        },
      ]}
    />
  );
}

