"use client";

import { User, Sword, Panda } from "lucide-react";
import Secciones from "@/shared/layout/Secciones";
import Personajes from "@/paginas/wiki/info/personajes";
import PureGridItems from "@/paginas/wiki/info/items";
import Criaturas from "@/paginas/wiki/info/criaturas";

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
        {
          id: "items",
          label: "Items",
          icon: Sword,
          content: <PureGridItems />,
        },
      ]}
    />
  );
}