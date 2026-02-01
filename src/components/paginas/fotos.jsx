"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useLightbox } from "@/components/recursos/boxes/lightbox"; 
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import { supabase } from '@/lib/supabase';
// Importamos el componente desde la carpeta boxes
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";

export default function Diario() {
  const { openLightbox } = useLightbox();
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  const categorias = ['todos', 'yo', 'amigos', 'animales', 'paisajes'];

  useEffect(() => {
    const fetchFotos = async () => {
      setLoading(true);
      const { data } = await supabase.from('diario_fotos').select('*').order('id', { ascending: false });
      setEntradas(data || []);
      setLoading(false);
    };
    fetchFotos();
  }, []);

  const filtradas = useMemo(() => (
    filtro === 'todos' ? entradas : entradas.filter(e => e.categoria === filtro)
  ), [entradas, filtro]);

  const lbData = useMemo(() => filtradas.map(e => ({ src: e.url_imagen, alt: e.fecha })), [filtradas]);

  // --- CABECERA UNIFICADA ---
  const MiCabeceraDiario = (
    <header className="mb-16 text-center pt-10">
      <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-primary uppercase">
        Diario
      </h1>
      <div className="h-1.5 w-24 bg-primary mx-auto mt-4 rounded-full opacity-20 mb-12" />
      
      <FiltrosMaestros 
        config={{ categorías: categorias }}
        filtrosActivos={{ categorías: filtro }}
        onChange={(grupo, valor) => setFiltro(valor)}
      />
    </header>
  );

  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
      
      {loading ? (
        <div className="py-40 text-center text-primary/30 font-black uppercase text-[10px] tracking-widest animate-pulse">
          "Cargando Memorias..."
        </div>
      ) : (
        <GalleryGrid headerContent={MiCabeceraDiario}>
          {filtradas.map((e, i) => (
            <GalleryItem key={e.id} src={e.url_imagen} onClick={() => openLightbox(i, lbData)}>
              <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">
                {e.categoria}
              </p>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">
                {e.fecha}
              </h3>
            </GalleryItem>
          ))}
          
          {filtradas.length === 0 && (
            <div className="col-span-full py-20 text-center text-primary/30 font-bold uppercase text-[10px] tracking-widest">
              "No hay fotos en esta categoría"
            </div>
          )}
        </GalleryGrid>
      )}
    </main>
  );
}