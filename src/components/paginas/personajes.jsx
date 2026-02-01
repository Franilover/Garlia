"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import DetalleMaestro from "@/components/recursos/boxes/detalles";
// Importación unificada
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";

export default function PersonajesGrid() {
  const [personajes, setPersonajes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Mantenemos los estados de filtro individuales
  const [filtroReino, setFiltroReino] = useState('todos');
  const [filtroEspecie, setFiltroEspecie] = useState('todos');

  useEffect(() => {
    const fetchChars = async () => {
      setLoading(true);
      const { data } = await supabase.from('personajes').select('*').order('id', { ascending: true });
      setPersonajes(data || []);
      setLoading(false);
    };
    fetchChars();
  }, []);

  const reinos = useMemo(() => ['todos', ...new Set(personajes.map(p => p.reino))], [personajes]);
  const especies = useMemo(() => ['todos', ...new Set(personajes.map(p => p.especie))], [personajes]);

  const filtrados = useMemo(() => {
    return personajes.filter(p => {
      const matchReino = filtroReino === 'todos' || p.reino === filtroReino;
      const matchEspecie = filtroEspecie === 'todos' || p.especie === filtroEspecie;
      return matchReino && matchEspecie;
    });
  }, [personajes, filtroReino, filtroEspecie]);

  const handleSelect = (p) => {
    setSelected(p);
    window.scrollTo({ top: 0, behavior: 'instant' }); 
  };

  // Manejador de cambios para el componente FiltrosMaestros
  const handleFiltroChange = (grupo, valor) => {
    if (grupo === 'Reinos') setFiltroReino(valor);
    if (grupo === 'Especies') setFiltroEspecie(valor);
  };

  // --- CABECERA REFACTORIZADA ---
  const MiMenuDeFiltros = (
    <header className="mb-16 text-center px-4 pt-10">
      <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-primary uppercase leading-none mb-12">
        Personajes
      </h1>
      
      <FiltrosMaestros 
        config={{
          Reinos: reinos,
          Especies: especies
        }}
        filtrosActivos={{
          Reinos: filtroReino,
          Especies: filtroEspecie
        }}
        onChange={handleFiltroChange}
      />
    </header>
  );

  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
      
      <DetalleMaestro 
        isOpen={!!selected} 
        onClose={() => setSelected(null)} 
        data={selected}
        tags={selected ? [selected.reino, selected.especie] : []}
        mostrarMusica={true}
      />

      {loading ? (
        <div className="text-center font-black uppercase text-[10px] tracking-widest opacity-20 py-40 animate-pulse">
          "Indexando..."
        </div>
      ) : (
        <GalleryGrid 
          isDetailOpen={!!selected} 
          headerContent={MiMenuDeFiltros}
        >
          {filtrados.map(p => (
            <GalleryItem 
              key={p.id} 
              src={p.img_url} 
              color={p.color_hex} 
              onClick={() => handleSelect(p)}
            >
              <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">
                {p.reino} • {p.especie}
              </p>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                {p.nombre}
              </h3>
            </GalleryItem>
          ))}
        </GalleryGrid>
      )}
    </main>
  );
}