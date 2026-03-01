"use client";
import React from "react";
import { GalleryItem } from "@/shared/display/gallery";

export const ArtCard = ({ src, title, subtitle, color, onClick }) => {
  return (
    <GalleryItem 
      src={src} 
      alt={title} 
      color={color} 
      onClick={onClick}
    >
      {/* Ajuste: He bajado la intensidad del gradiente aquí porque 
          GalleryItem ya tiene su propio overlay. 
          Así evitamos que la imagen se vea demasiado oscura.
      */}
      <div className="flex flex-col justify-end h-full">
        <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">
          {subtitle}
        </p>
        <h3 className="text-xl font-black text-white uppercase italic leading-none tracking-tighter">
          {title}
        </h3>
      </div>
    </GalleryItem>
  );
}