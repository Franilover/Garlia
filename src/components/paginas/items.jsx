"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import DetalleMaestro from "@/components/recursos/boxes/detalles";
// Importamos el componente desde su nueva ubicación en boxes
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";

export default function Inventario() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODOS');

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    fetchItems();
  }, []);

  const categorias = useMemo(() => ['TODOS', ...new Set(items.map(i => i.categoria))], [items]);
  const filtrados = useMemo(() => filtro === 'TODOS' ? items : items.filter(i => i.categoria === filtro), [items, filtro]);

  const handleSelect = (item) => {
    setSelected(item);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const MiMenuInventario = (
    <header className="mb-16 text-center px-4 pt-10">
      <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase leading-none">
        Inventario
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
      
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        tags={[selected?.categoria]}
        mostrarMusica={false}
      />

      {loading ? (
        <div className="py-40 text-center opacity-20 font-black uppercase text-[10px] tracking-widest animate-pulse">
          "Abriendo Almacén..."
        </div>
      ) : (
        <GalleryGrid 
          isDetailOpen={!!selected} 
          headerContent={MiMenuInventario}
        >
          {filtrados.map(item => (
            <GalleryItem 
              key={item.id} 
              src={item.imagen_url} 
              contain={true} 
              onClick={() => handleSelect(item)}
            >
              <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">
                {item.categoria}
              </p>
              <h3 className="text-lg font-black text-white uppercase italic leading-none tracking-tighter">
                {item.nombre}
              </h3>
            </GalleryItem>
          ))}
          
          {filtrados.length === 0 && (
            <div className="col-span-full py-20 text-center text-primary/30 font-bold uppercase text-[10px] tracking-widest">
              "No hay objetos en esta sección"
            </div>
          )}
        </GalleryGrid>
      )}
    </main>
  );
}