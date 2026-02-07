"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/api/supabase';
import { Users, Plus, Trash2, X } from 'lucide-react';

interface Relacion {
  id?: string;
  sus: string;
  son: string[];
  personaje: string; // Este es el campo que causaba el conflicto
}

export default function Relaciones({ 
  nombrePersonaje, 
  editMode = false 
}: { 
  nombrePersonaje: string; 
  editMode?: boolean; 
}) {
  const [lista, setLista] = useState<Relacion[]>([]);
  const [todosLosPersonajes, setTodosLosPersonajes] = useState<string[]>([]);

  // 1. Cargar datos iniciales
  useEffect(() => {
    async function cargarDatos() {
      if (!nombrePersonaje) return;
      
      const { data: rels } = await supabase
        .from('relaciones')
        .select('id, sus, son')
        .eq('personaje', nombrePersonaje);
      
      if (rels) {
        // CORRECCIÓN AQUÍ: Añadimos 'personaje: nombrePersonaje' manualmente
        // para cumplir con la interfaz Relacion.
        const formateadas: Relacion[] = rels.map(r => ({
          id: r.id,
          sus: r.sus,
          son: Array.isArray(r.son) ? r.son : [r.son],
          personaje: nombrePersonaje // <-- Esto soluciona el error 2345
        }));
        setLista(formateadas);
      }

      const { data: perjs } = await supabase
        .from('personajes')
        .select('nombre');
      if (perjs) setTodosLosPersonajes(perjs.map(p => p.nombre));
    }
    cargarDatos();
  }, [nombrePersonaje]);

  // 2. Funciones de manejo
  const agregarNombreARelacion = (index: number, nombreSeleccionado: string) => {
    const nuevaLista = [...lista];
    if (!nuevaLista[index].son.includes(nombreSeleccionado)) {
      nuevaLista[index].son = [...nuevaLista[index].son, nombreSeleccionado];
      setLista(nuevaLista);
    }
  };

  const quitarNombreDeRelacion = (indexRel: number, nombreAQuitar: string) => {
    const nuevaLista = [...lista];
    nuevaLista[indexRel].son = nuevaLista[indexRel].son.filter(n => n !== nombreAQuitar);
    setLista(nuevaLista);
  };

  const eliminarFilaCompleta = async (index: number, id?: string) => {
    if (id) {
      const { error } = await supabase.from('relaciones').delete().eq('id', id);
      if (error) {
        console.error("Error al borrar relación:", error);
        return;
      }
    }
    setLista(lista.filter((_, i) => i !== index));
  };

  if (lista.length === 0 && !editMode) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary/30">
          <Users size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Relaciones</span>
        </div>
        {editMode && (
          <button 
            type="button"
            onClick={() => setLista([...lista, { sus: "VÍNCULO", son: [], personaje: nombrePersonaje }])}
            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <Plus size={12} />
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3">
        {lista.map((rel, index) => (
          <div 
            key={index} 
            className="bg-white border-2 border-primary/5 p-4 rounded-3xl flex flex-col shadow-sm min-w-50 relative group"
          >
            {editMode ? (
              <div className="space-y-3">
                <button 
                  type="button"
                  onClick={() => eliminarFilaCompleta(index, rel.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 size={10} />
                </button>

                <input 
                  value={rel.sus}
                  onChange={(e) => {
                    const nl = [...lista];
                    nl[index].sus = e.target.value;
                    setLista(nl);
                  }}
                  className="text-[9px] font-bold uppercase text-slate-400 bg-transparent border-b border-primary/10 outline-none w-full"
                  placeholder="VÍNCULO"
                />

                <div className="flex flex-wrap gap-1">
                  {rel.son.map((n, i) => (
                    <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      {n}
                      <button 
                        type="button" 
                        onClick={() => quitarNombreDeRelacion(index, n)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={8} />
                      </button>
                    </span>
                  ))}
                </div>

                <select 
                  onChange={(e) => agregarNombreARelacion(index, e.target.value)}
                  className="w-full text-xs font-black uppercase italic text-slate-800 bg-slate-50 p-2 rounded-xl outline-none cursor-pointer border-none"
                  value=""
                >
                  <option value="" disabled>+ Añadir Personaje</option>
                  {todosLosPersonajes
                    .filter(nombre => nombre !== nombrePersonaje)
                    .map(nombre => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))
                  }
                </select>
              </div>
            ) : (
              <>
                <span className="text-[9px] font-bold uppercase text-primary/40 mb-1">{rel.sus}</span>
                <div className="flex flex-col">
                  {rel.son.map((nombre, i) => (
                    <span key={i} className="text-xs font-black uppercase italic text-primary leading-tight">
                      {nombre}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}