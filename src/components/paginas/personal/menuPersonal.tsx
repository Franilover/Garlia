"use client";
import { Star, Palette, Camera } from "lucide-react";
import MenuBase from "@/components/templates/MenuBase";

const ITEMS = [
  { href: "/personal/sobre-mi", title: "Sobre Mí", icon: <Star />,    pageKey: "sobre-mi", delay: 0.1 },
  { href: "/personal/dibujos",  title: "Dibujos",  icon: <Palette />, pageKey: "dibujos",  delay: 0.2 },
  { href: "/personal/fotos",    title: "Fotos",    icon: <Camera />,  pageKey: "fotos",    delay: 0.3 },
  { href: "/personal/galeria", title: "Galería", icon: <Star />, pageKey: "galeria", delay: 0.25 },
];

export default function PersonalMenuPage() {
  return <MenuBase titulo="Personal" items={ITEMS} />;
}