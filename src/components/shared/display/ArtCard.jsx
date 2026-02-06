"use client";
import React from "react";
import { GalleryItem } from "@/components/shared/display/gallery";

export const ArtCard = ({ src, title, subtitle, color, onClick }) => {
  return (
    <GalleryItem 
      src={src} 
      alt={title} 
      color={color} 
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-5">
        <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">
          {subtitle}
        </p>
        <h3 className="text-xl font-black text-white uppercase italic leading-none tracking-tighter">
          {title}
        </h3>
      </div>
    </GalleryItem>
  );
};