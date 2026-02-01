"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useLightbox } from "@/components/recursos/boxes/lightbox"; 
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import { supabase } from '@/lib/supabase';
import Newsletter from "@/components/recursos/boxes/newsletter";
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";

export default function Drawings() {
  const { openLightbox } = useLightbox();
  const [dibujos, setDibujos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  const categorias = ['todos', 'fanart', 'original', 'bocetos'];

  useEffect(() => {
    const fetchDibujos = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('dibujos')
        .select('id, url_imagen, titulo, categoria') 
        .order('id', { ascending: false });
      
      setDibujos(data || []);
      setLoading(false);
    };
    fetchDibujos();
  }, []);

  const filtrados = useMemo(() => (
    filtro === 'todos' ? dibujos : dibujos.filter(d => d.categoria === filtro)
  ), [dibujos, filtro]);

  const lbData = useMemo(() => (
    filtrados.map(d => ({ src: d.url_imagen, alt: d.titulo }))
  ), [filtrados]);

  // --- CABECERA UNIFICADA ---
  const MiCabecera = (
    <header className="mb-12 text-center px-4 pt-16">
      <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase leading-none">
        Galería
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
    <main className="min-h-screen bg-bg-main pb-20 font-sans">
      
      {loading ? (
        <div className="py-40 text-center text-primary/30 font-black uppercase text-[10px] tracking-widest animate-pulse">
          "Desplegando Arte..."
        </div>
      ) : (
        <GalleryGrid headerContent={MiCabecera}>
          {filtrados.map((dibujo, index) => (
            <GalleryItem
              key={dibujo.id}
              src={dibujo.url_imagen}
              alt={dibujo.titulo}
              onClick={() => openLightbox(index, lbData)}
            >
              <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">
                {dibujo.categoria}
              </p>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">
                {dibujo.titulo}
              </h3>
            </GalleryItem>
          ))}
          
          {filtrados.length === 0 && (
            <div className="col-span-full py-20 text-center text-primary/30 font-bold uppercase text-[10px] tracking-widest">
              "Sin registros en esta sección"
            </div>
          )}
        </GalleryGrid>
      )}

      <div className="mt-32">
        <Newsletter />
      </div>
    </main>
  );
}