"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2, ChevronRight, Compass, ArrowLeft } from "lucide-react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { supabase } from "@/lib/api/supabase";

const Marker = ({ x, y, info, onClick }) => (
  <div 
    className="absolute z-20 flex flex-col items-center" 
    style={{ top: `${y}%`, left: `${x}%`, transform: "translate(-50%, -50%)" }}
  >
    <div className="mb-1 bg-[#6B5E70] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shadow-lg whitespace-nowrap pointer-events-none border border-white/20">
      {info}
    </div>
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="relative flex items-center justify-center cursor-pointer outline-none group"
    >
      <div className="absolute w-5 h-5 bg-[#6B5E70]/20 rounded-full animate-ping" />
      <div className="w-4 h-4 bg-[#6B5E70] rounded-full border-2 border-white shadow-md group-hover:bg-white transition-all flex items-center justify-center">
         <MapPin size={8} className="text-white group-hover:text-[#6B5E70]" />
      </div>
    </button>
  </div>
);

export default function MapaInteractivo() {
  const [reinos, setReinos] = useState([]);
  const [vistaActual, setVistaActual] = useState("global"); // "global" o "reino"
  const [reinoSeleccionado, setReinoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const onUpdate = useCallback(({ x, y, scale }) => {
    if (mapRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      mapRef.current.style.setProperty("transform", value);
    }
  }, []);

  useEffect(() => {
    async function fetchReinos() {
      const { data, error } = await supabase.from("reinos").select("*");
      if (error) console.error(error);
      else setReinos(data);
      setLoading(false);
    }
    fetchReinos();
  }, []);

  const handleReinoClick = (reino) => {
    setReinoSeleccionado(reino);
    setVistaActual("reino");
  };

  const volverAlGlobal = () => {
    setVistaActual("global");
    setReinoSeleccionado(null);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#6B5E70]">
      <Loader2 className="animate-spin mb-2" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Desplegando Mapa...</span>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row w-full min-h-[600px] bg-[#F8F5F2] overflow-hidden">
      
      {/* SECCIÓN DEL MAPA */}
      <div className={`relative transition-all duration-500 ease-in-out ${vistaActual === "reino" ? "w-full md:w-2/3" : "w-full"}`}>
        
        {/* Botón de Volver (Solo visible en vista de reino) */}
        <AnimatePresence>
          {vistaActual === "reino" && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={volverAlGlobal}
              className="absolute top-6 left-6 z-50 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-xl border border-[#6B5E70]/20 text-[#6B5E70] hover:scale-110 transition-transform"
            >
              <ArrowLeft size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <QuickPinchZoom onUpdate={onUpdate} maxZoom={5} minZoom={0.5}>
          <div ref={mapRef} className="w-full h-full origin-top-left">
            <div className="relative cursor-grab active:cursor-grabbing inline-block w-full">
              <img 
                // Si estamos en un reino, usamos su mapa específico, si no, el fanart global
                src={vistaActual === "reino" ? reinoSeleccionado.mapa_url : "/dibujos/fanart/mapa_mundial.jpg"} 
                alt="Mapa"
                className="w-full h-auto block pointer-events-none select-none"
                onLoad={() => window.dispatchEvent(new Event("resize"))}
              />

              {/* Renderizado de Marcadores Dinámico */}
              {vistaActual === "global" ? (
                // En el mapa global, los marcadores llevan a la vista de reino
                reinos.map((reino) => (
                  <Marker 
                    key={reino.id} 
                    x={reino.coord_x} 
                    y={reino.coord_y} 
                    info={reino.nombre} 
                    onClick={() => handleReinoClick(reino)} 
                  />
                ))
              ) : (
                /* Aquí podrías mapear puntos de interés específicos de ese reino
                   reinoSeleccionado.puntos_interes.map(...) 
                */
                null
              )}
            </div>
          </div>
        </QuickPinchZoom>
      </div>

      {/* SECCIÓN LATERAL DE DESCRIPCIÓN (Solo en vista de reino) */}
      <AnimatePresence>
        {vistaActual === "reino" && reinoSeleccionado && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full md:w-1/3 bg-white border-l border-[#6B5E70]/10 p-10 flex flex-col z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.05)]"
          >
            <div className="mb-4 flex items-center gap-2">
               <div className="h-1px w-8 bg-[#6B5E70]/30" />
               <span className="text-[10px] font-black text-[#6B5E70]/40 uppercase tracking-[0.2em]">Explorando Territorio</span>
            </div>

            <h2 className="text-[#6B5E70] font-black text-4xl uppercase tracking-tighter mb-6 leading-none">
              {reinoSeleccionado.nombre}
            </h2>

            <div className="space-y-6 flex-grow">
              <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/5">
                <p className="text-[#6B5E70] text-sm italic leading-relaxed">
                  "{reinoSeleccionado.descripcion}"
                </p>
              </div>
              
              {/* Espacio para más info: Clima, Población, etc. */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border border-[#6B5E70]/10 rounded-2xl">
                  <span className="block text-[8px] font-bold uppercase opacity-40">Coordenadas</span>
                  <span className="text-[10px] font-black text-[#6B5E70]">{reinoSeleccionado.coord_x}° / {reinoSeleccionado.coord_y}°</span>
                </div>
                <div className="text-center p-4 border border-[#6B5E70]/10 rounded-2xl">
                  <span className="block text-[8px] font-bold uppercase opacity-40">Orden</span>
                  <span className="text-[10px] font-black text-[#6B5E70]">Nivel {reinoSeleccionado.orden}</span>
                </div>
              </div>
            </div>

            <button className="mt-8 w-full bg-[#6B5E70] text-white text-[11px] font-black uppercase py-5 px-8 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#5a4e5f] transition-all shadow-lg shadow-[#6B5E70]/20">
              Ver personajes de este Reino <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}