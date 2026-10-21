"use client";
import { Compass, BookText, BookOpen, Music, Sprout, UserCircle2 } from "lucide-react";

import MenuBase from "@/layout/MenuBase";

const ITEMS = [
  { href: "/garlia/universo/cuenta", title: "Mi Personaje", icon: <UserCircle2 />, pageKey: "personajes", delay: 0.1 },
  { href: "/garlia/aventura",  title: "Aventura",     icon: <BookOpen />,   pageKey: "aventura",    delay: 0.15 },
  { href: "/garlia/universo/mapa",   title: "Mapa",         icon: <Compass />,    pageKey: "mapa",        delay: 0.2 },
  { href: "/garlia/universo",  title: "Universo",     icon: <Sprout />,     pageKey: "universo",    delay: 0.25 },
  { href: "/garlia/libros",    title: "Libros",       icon: <BookText />,   pageKey: "libros",      delay: 0.3 },
  { href: "/garlia/canciones", title: "Canciones",    icon: <Music />,      pageKey: "canciones",   delay: 0.4 },
];

export default function WikiMenuPage() {
  return <MenuBase items={ITEMS} titulo="Jardin" />;
}