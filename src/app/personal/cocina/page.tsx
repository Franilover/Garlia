"use client";
import React from "react";
import { ChefHat, Utensils, CookingPot } from "lucide-react";
import EntidadPageBase from "@/shared/layout/GaleriaBase";
import { MenuCard } from "@/shared/templates/MenuCard"; 

const SECCIONES_COCINA = [
  {
    id: "recetas",
    nombre: "Recetas",
    href: "/personal/cocina/recetas",
    icon: <ChefHat />,
    delay: 0.1,
  },
  {
    id: "ingredientes",
    nombre: "Ingredientes",
    href: "/personal/cocina/ingredientes",
    icon: <Utensils />,
    delay: 0.2,
  },
];

export default function CocinaMenuPage() {
  return (
    <EntidadPageBase
      tabla="__static__"
      titulo="Cocina"
      tituloIcon={<CookingPot size={40} />}
      configFiltros={[]}
      permitirVistaFila={false}
      mostrarBusqueda={false}
      dataOverride={SECCIONES_COCINA}
      renderCard={(item, _onClick, _vistaFila, index) => (
        <MenuCard
          key={item.id}
          href={item.href}
          title={item.nombre}
          icon={item.icon}
          delay={item.delay}
        />
      )}
    />
  );
}