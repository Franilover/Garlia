"use client";

import React, { useState } from "react";
import { Mic2, Calendar, LayoutGrid, AlignJustify, ChevronRight } from "lucide-react";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { SmartImage } from "@/shared/display/SmartImage";

interface CancionCardProps {
  cancion: any;
  onClick: () => void;
  vistaFila: boolean;
}

function CancionCard({ cancion, onClick, vistaFila }: CancionCardProps) {
  if (!cancion) return null;

  if (vistaFila) {
    return (
      <div 
        onClick={onClick}
        className="group relative bg-bg-card border border-primary/5 rounded-2xl p-4 hover:border-primary/20 transition-all cursor-pointer flex items-center gap-4"
      >
        <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-primary/5">
          <SmartImage
            src={cancion.url_portada}
            alt={cancion.titulo}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black uppercase tracking-tight truncate">{cancion.titulo}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-primary/40 font-bold uppercase tracking-widest flex items-center gap-1">
              <Mic2 size={10} /> {cancion.artista || "Fran"}
            </span>
            <span className="text-[10px] text-primary/40 font-bold uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} /> {cancion.anio || "2024"}
            </span>
          </div>
        </div>

        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={18} className="text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="group relative bg-bg-card border border-primary/5 rounded-4xl overflow-hidden hover:border-primary/20 transition-all cursor-pointer shadow-sm hover:shadow-xl"
    >
      <div className="aspect-square overflow-hidden relative">
        <SmartImage
          src={cancion.url_portada}
          alt={cancion.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
          <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] bg-primary px-4 py-2 rounded-full shadow-lg">
            Ver Detalles
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-black uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors">
            {cancion.titulo}
          </h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-3 py-1 bg-primary/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary/60">
            {cancion.genero || "Pop"}
          </span>
          <span className="px-3 py-1 bg-primary/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary/60">
            {cancion.idioma || "Español"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CancionesPage() {
  const [vistaGrid, setVistaGrid] = useState(true);

  return (
    <div className="min-h-screen bg-bg-main">
      <div className="fixed top-24 right-8 z-40 flex bg-bg-card/80 backdrop-blur-md border border-primary/10 p-1 rounded-2xl shadow-xl">
        <button
          onClick={() => setVistaGrid(true)}
          className={`p-3 rounded-xl transition-all ${vistaGrid ? "bg-primary text-white shadow-lg" : "text-primary/40 hover:text-primary"}`}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          onClick={() => setVistaGrid(false)}
          className={`p-3 rounded-xl transition-all ${!vistaGrid ? "bg-primary text-white shadow-lg" : "text-primary/40 hover:text-primary"}`}
        >
          <AlignJustify size={16} />
        </button>
      </div>

      <EntidadPageBase
        tabla="canciones"
        titulo="Canciones"
        configFiltros={["genero", "idioma", "estado"]}
        mostrarMusica={true}
        renderCard={(item, onClick) => (
          <CancionCard 
            key={item?.id || Math.random()} 
            cancion={item} 
            onClick={onClick}
            vistaFila={!vistaGrid}
          />
        )}
        plantillaNueva={{
          titulo: "",
          artista: "Fran",
          url_portada: "",
          genero: "Pop",
          idioma: "Español",
          estado: "BORRADOR",
          letra: "",
          anio: new Date().getFullYear().toString()
        }}
        getCustomTags={(item) => [
          item?.estado || "S/E",
          item?.genero || "S/G"
        ]}
      />
    </div>
  );
}