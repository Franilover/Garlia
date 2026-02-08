"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/api/supabase';
import { Music, Check, ChevronsUpDown, X } from 'lucide-react';

export const SelectorCancionesMusica = ({ idsSeleccionados = [], onChange }) => {
  const [todasLasCanciones, setTodasLasCanciones] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Cargamos todas las canciones disponibles en la DB
  useEffect(() => {
    const cargarCanciones = async () => {
      const { data, error } = await supabase
        .from('canciones')
        .select('id, titulo')
        .order('titulo', { ascending: true });
      
      if (!error) setTodasLasCanciones(data);
      setLoading(false);
    };
    cargarCanciones();
  }, []);

  const toggleCancion = (id) => {
    const nuevosIds = idsSeleccionados.includes(id)
      ? idsSeleccionados.filter(i => i !== id)
      : [...idsSeleccionados, id];
    onChange(nuevosIds); // Pasamos los IDs limpios al componente padre
  };

  if (loading) return <div className="animate-pulse h-10 bg-gray-100 rounded-xl" />;

  return (
    <div className="relative w-full space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 ml-2 italic">
        Vincular Canciones
      </label>
      
      {/* Selector Estilo Dropdown */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-white border-2 border-[#6B5E70]/10 rounded-[1.5rem] flex items-center justify-between cursor-pointer hover:border-[#6B5E70]/30 transition-all"
      >
        <div className="flex flex-wrap gap-2">
          {idsSeleccionados.length > 0 ? (
            idsSeleccionados.map(id => {
              const c = todasLasCanciones.find(item => item.id === id);
              return (
                <span key={id} className="bg-[#6B5E70] text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase italic">
                  {c?.titulo || 'Cargando...'}
                  <X size={10} onClick={(e) => { e.stopPropagation(); toggleCancion(id); }} className="hover:text-red-300" />
                </span>
              );
            })
          ) : (
            <span className="text-[#6B5E70]/30 text-xs italic">Selecciona una o más canciones...</span>
          )}
        </div>
        <ChevronsUpDown size={16} className="text-[#6B5E70]/30" />
      </div>

      {/* Lista Desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[150] w-full mt-2 bg-white border border-[#6B5E70]/10 rounded-[1.5rem] shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-2"
          >
            {todasLasCanciones.map((cancion) => (
              <div
                key={cancion.id}
                onClick={() => toggleCancion(cancion.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors mb-1 ${
                  idsSeleccionados.includes(cancion.id) 
                  ? 'bg-[#6B5E70]/10 text-[#6B5E70]' 
                  : 'hover:bg-gray-50 text-[#6B5E70]/60'
                }`}
              >
                <span className="text-[10px] font-black uppercase italic tracking-wider">
                  {cancion.titulo}
                </span>
                {idsSeleccionados.includes(cancion.id) && <Check size={14} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};;