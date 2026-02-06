"use client";

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Loader2, ChevronRight, Compass } from 'lucide-react';
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { supabase } from '@/lib/api/supabase';

const Marker = ({ x, y, info, onClick }) => (
  <div 
    className="absolute z-20 flex flex-col items-center" 
    style={{ top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' }}
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
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);;

  const onUpdate = useCallback(({ x, y, scale }) => {
    if (mapRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      mapRef.current.style.setProperty("transform", value);
    }
  }, []);

  useEffect(() => {
    async function fetchReinos() {
      const { data, error } = await supabase.from('reinos').select('*');
      if (error) console.error(error);
      else setReinos(data);
      setLoading(false);
    }
    fetchReinos();
  }, []);

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    console.log(`📍 Coordenadas -> X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}`);
    if (puntoSeleccionado) setPuntoSeleccionado(null);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#6B5E70]">
      <Loader2 className="animate-spin mb-2" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Desplegando Mapa...</span>
    </div>
  );

  return (
    /* MAPA: Bordes rectos y sin sombras exteriores */
    <div className="relative w-full h-auto min-h-[500px] overflow-hidden bg-[#F8F5F2] border-b border-[#6B5E70]/10">
      
      <QuickPinchZoom 
        onUpdate={onUpdate} 
        maxZoom={5} 
        minZoom={0.5}
      >
        <div ref={mapRef} className="w-full h-full origin-top-left">
          <div 
            className="relative cursor-grab active:cursor-grabbing inline-block w-full" 
            onClick={handleMapClick}
          >
            <img 
              src="/dibujos/fanart/01.jpg" 
              alt="Mapa"
              className="w-full h-auto block pointer-events-none select-none"
              onLoad={() => window.dispatchEvent(new Event('resize'))}
            />

            {reinos.map((reino) => (
              <Marker 
                key={reino.id} 
                x={reino.coord_x} 
                y={reino.coord_y} 
                info={reino.nombre} 
                onClick={() => setPuntoSeleccionado(reino)} 
              />
            ))}
          </div>
        </div>
      </QuickPinchZoom>

      {/* TARJETA: Aquí mantenemos los bordes redondeados y el diseño elegante */}
      <AnimatePresence>
        {puntoSeleccionado && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="absolute bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-[650px] bg-white border border-[#6B5E70]/20 rounded-[2.5rem] z-50 overflow-hidden shadow-[0_20px_50px_rgba(107,94,112,0.3)]"
          >
            <div className="flex flex-col md:flex-row min-h-[240px]">
              
              {/* IMAGEN DEL REINO (Izquierda) */}
              <div className="w-full md:w-2/5 h-44 md:h-auto bg-[#6B5E70]/5 relative">
                {puntoSeleccionado.mapa_url ? (
                  <img src={puntoSeleccionado.mapa_url} className="w-full h-full object-cover" alt="Detalle" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-10">
                    <Compass size={40} className="text-[#6B5E70]" />
                  </div>
                )}
              </div>

              {/* CONTENIDO (Derecha) */}
              <div className="w-full md:w-3/5 p-8 relative flex flex-col justify-center">
                <button onClick={() => setPuntoSeleccionado(null)} className="absolute top-6 right-6 text-[#6B5E70]/30 hover:text-[#6B5E70]">
                  <X size={20} />
                </button>

                <div className="mb-2 flex items-center gap-2">
                   <div className="h-[1px] w-4 bg-[#6B5E70]/30" />
                   <span className="text-[8px] font-black text-[#6B5E70]/40 uppercase tracking-widest">Territorio de Omnisia</span>
                </div>

                <h3 className="text-[#6B5E70] font-black text-2xl uppercase tracking-tighter mb-2 leading-none">
                  {puntoSeleccionado.nombre}
                </h3>

                <p className="text-[#6B5E70]/70 text-xs md:text-sm italic leading-relaxed mb-6">
                  "{puntoSeleccionado.descripcion}"
                </p>
                
                <button className="w-fit bg-[#6B5E70] text-white text-[10px] font-black uppercase py-3 px-8 rounded-2xl flex items-center gap-3 hover:bg-[#5a4e5f] transition-all shadow-lg shadow-[#6B5E70]/20">
                  Explorar Reino <ChevronRight size={14} />
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}