"use client";
import { Compass, BookText, Music, UserCircle2 } from "lucide-react";
import MenuBase from "@/components/templates/MenuBase";

const ITEMS = [
  { href: "/wiki/personal",  title: "Mi Personaje", icon: <UserCircle2 />, pageKey: "personajes", delay: 0.1 },
  { href: "/wiki/mapa",      title: "Mapa",         icon: <Compass />,    pageKey: "mapa",        delay: 0.2 },
  { href: "/wiki/libros",    title: "Libros",       icon: <BookText />,   pageKey: "libros",      delay: 0.3 },
  { href: "/wiki/canciones", title: "Canciones",    icon: <Music />,      pageKey: "canciones",   delay: 0.4 },
];

export default function WikiMenuPage() {
  return <MenuBase titulo="Jardin" items={ITEMS} />;
}