"use client";

import React from "react";
import EntidadPageBase from "./GaleriaBase";
import { SmartImage } from "@/shared/display/SmartImage";
import { motion } from "framer-motion";
import { Mic2, PenTool, Globe, User, ChevronRight } from "lucide-react";

const FILTROS_CANCIONES = ["personaje", "cantante", "compositor", "idioma", "tema", "emocion"];

const getEstadoColor = (estado: string) => {
  const colores: Record<string, string> = {
    "TERMINADA": "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-700 border-emerald-300/30",
    "EN PROCESO": "bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-700 border-amber-300/30",
    "BORRADOR": "bg-gradient-to-r from-slate-500/20 to-slate-400/10 text-slate-600 border-slate-300/30"
  };
  return colores[estado] || colores["BORRADOR"];
};

const PLANTILLA_NUEVA_CANCION = {
  titulo: "", personaje: "", estado: "BORRADOR", visible: false,
  portada_url: "/placeholder-cover.jpg", cantante: "", compositor: "",
  idioma: "Español", tema: "", emocion: ""
};

const RenderCancionCard = (cancion: any, onClick: () => void, vistaFila: boolean) => {
  if (vistaFila) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        onClick={onClick}
        className="group relative flex items-center justify-between gap-4 bg-white-custom/50 hover:bg-white-custom/80 backdrop-blur-sm border border-primary/10 rounded-2xl px-6 py-4 transition-all cursor-pointer"
      >
        <h2 className="text-primary font-black uppercase text-sm italic truncate">{cancion.titulo}</h2>
        <ChevronRight size={14} className="text-primary/30" />
      </motion.div>
    );
  }

  return (
    <div className="relative group h-full">
      <motion.div
        whileHover={{ y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={onClick} className="cursor-pointer h-full flex flex-col"
      >
        <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-primary/10">
          <SmartImage src={cancion.portada_url || "/placeholder-cover.jpg"} alt={cancion.titulo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          <div className={`absolute top-6 left-6 z-20 backdrop-blur-md px-4 py-2 rounded-full border font-black text-[9px] uppercase shadow-lg ${getEstadoColor(cancion.estado)}`}>
            {cancion.estado}
          </div>
          {cancion.personaje && (
            <div className="absolute bottom-6 right-6 z-20 bg-white-custom/95 px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2">
              <User size={11} className="text-primary" />
              <span className="text-[9px] font-black text-primary uppercase italic">{cancion.personaje}</span>
            </div>
          )}
        </div>
        <div className="mt-6 flex-1 px-2">
          <h2 className="text-primary font-black uppercase text-lg group-hover:text-[#9A89A0] transition-colors leading-tight italic line-clamp-2">{cancion.titulo}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-primary/40 font-bold text-[8px] uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2"><Mic2 size={10} />{cancion.cantante || "N/A"}</span>
            <span className="flex items-center gap-2"><PenTool size={10} />{cancion.compositor || "N/A"}</span>
            <span className="flex items-center gap-2"><Globe size={10} />{cancion.idioma || "Español"}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function CancionesPage() {
  return (
    <EntidadPageBase
      tabla="canciones"
      titulo="Soliloquios"
      configFiltros={FILTROS_CANCIONES}
      renderCard={RenderCancionCard}
      mostrarMusica={true}
      plantillaNueva={PLANTILLA_NUEVA_CANCION}
      getCustomTags={(item) => [item.estado, item.idioma, item.tema]}
    />
  );
}