"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/api/supabase';
import { Users } from 'lucide-react';

export default function Relaciones({ nombrePersonaje }) {
  const [lista, setLista] = useState([]);

  useEffect(() => {
    async function cargarRelaciones() {
      if (!nombrePersonaje) return;
      
      const { data, error } = await supabase
        .from('relaciones')
        .select('sus, son') 
        .eq('personaje', nombrePersonaje); 

      if (!error && data) {
        setLista(data);
      }
    }
    cargarRelaciones();
  }, [nombrePersonaje]);

  if (lista.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-primary/30 mb-3">
        <Users size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">Relaciones</span>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {lista.map((rel, index) => (
          <div key={index} className="bg-white border-2 border-primary/5 px-4 py-2 rounded-2xl flex flex-col shadow-sm min-w-[80px]">
            {/* El vínculo (ej: AMIGOS) */}
            <span className="text-[9px] font-bold uppercase text-primary/40 tracking-wider mb-1">
              {rel.sus}
            </span>
            
            {/* Recorremos la lista de nombres en 'son' */}
            <div className="flex flex-col">
              {Array.isArray(rel.son) ? rel.son.map((nombre, i) => (
                <span key={i} className="text-xs font-black uppercase italic text-primary tracking-tighter leading-tight">
                  {nombre}
                </span>
              )) : (
                <span className="text-xs font-black uppercase italic text-primary tracking-tighter">
                  {rel.son}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}