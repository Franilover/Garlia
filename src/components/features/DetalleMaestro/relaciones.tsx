"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/api/supabase';
import { Plus, Trash2, X } from 'lucide-react';

interface Relacion {
  id?: string;
  sus: string;
  son: string[];
  personaje: string;
}

interface RelacionesProps {
  nombrePersonaje: string;
  editMode?: boolean;
  onChange?: (lista: Relacion[]) => void;
  datosRelaciones?: any[]; 
}

export default function Relaciones({ 
  nombrePersonaje, 
  editMode = false,
  onChange,
  datosRelaciones 
}: RelacionesProps) {
  const [lista, setLista] = useState<Relacion[]>([]);
  const [todosLosPersonajes, setTodosLosPersonajes] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (datosRelaciones && Array.isArray(datosRelaciones)) {
      const formateadas: Relacion[] = datosRelaciones.map(r => ({
        id: r.id,
        sus: r.sus || "VÍNCULO",
        son: Array.isArray(r.son) ? r.son : [],
        personaje: nombrePersonaje || ""
      }));
      setLista(formateadas);
    } else if (!editMode) {
      setLista([]);
    }
  }, [datosRelaciones, nombrePersonaje, editMode]);

  useEffect(() => {
    if (editMode && mounted) {
      const cargarNombres = async () => {
        try {
          const { data } = await supabase.from('personajes').select('nombre');
          if (data) setTodosLosPersonajes(data.map(p => p.nombre));
        } catch (err) {
          console.error("Error cargando personajes:", err);
        }
      };
      cargarNombres();
    }
  }, [editMode, mounted]);

  useEffect(() => {
    if (editMode && onChange && mounted) {
      onChange(lista);
    }
  }, [lista, editMode, onChange, mounted]);

  const agregarNombreARelacion = (index: number, nombreSeleccionado: string) => {
    const nuevaLista = [...lista];
    if (nuevaLista[index] && !nuevaLista[index].son.includes(nombreSeleccionado)) {
      nuevaLista[index].son = [...nuevaLista[index].son, nombreSeleccionado];
      setLista(nuevaLista);
    }
  };

  const quitarNombreDeRelacion = (indexRel: number, nombreAQuitar: string) => {
    const nuevaLista = [...lista];
    if (nuevaLista[indexRel]) {
      nuevaLista[indexRel].son = nuevaLista[indexRel].son.filter(n => n !== nombreAQuitar);
      setLista(nuevaLista);
    }
  };

  const eliminarFilaCompleta = (index: number) => {
    setLista(lista.filter((_, i) => i !== index));
  };

  if (!mounted) return null;
  if (lista.length === 0 && !editMode) return null;

  return (
    <div className="w-full">
      {editMode && (
        <div className="flex justify-start mb-8">
          <button 
            type="button"
            onClick={() => setLista([...lista, { sus: "NUEVO VÍNCULO", son: [], personaje: nombrePersonaje }])}
            className="flex items-center gap-2 px-6 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
          >
            <Plus size={14} /> "Añadir Vínculo"
          </button>
        </div>
      )}
      
      {/* GRID SIN BORDES NI CAJAS BLANCAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {lista.map((rel, index) => (
          <div 
            key={rel.id || `rel-${index}`} 
            className="relative flex flex-col transition-all duration-300"
          >
            {editMode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <input 
                    value={rel.sus}
                    onChange={(e) => {
                      const nl = [...lista];
                      nl[index].sus = e.target.value.toUpperCase();
                      setLista(nl);
                    }}
                    className="bg-transparent text-xs font-black uppercase italic outline-none text-primary/60"
                  />
                  <button 
                    type="button" 
                    onClick={() => eliminarFilaCompleta(index)}
                    className="text-primary/20 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {rel.son.map((n, i) => (
                    <span key={`${n}-${i}`} className="bg-primary/5 text-primary text-[10px] px-3 py-1 rounded-md flex items-center gap-2 font-black">
                      {n} 
                      <button type="button" onClick={() => quitarNombreDeRelacion(index, n)}><X size={10} /></button>
                    </span>
                  ))}
                </div>

                <select 
                  onChange={(e) => agregarNombreARelacion(index, e.target.value)}
                  className="w-full text-[10px] font-black uppercase bg-transparent p-2 border border-primary/10 rounded-lg outline-none text-primary/40"
                  value=""
                >
                  <option value="" disabled>+ Seleccionar</option>
                  {todosLosPersonajes
                    .filter(n => n !== nombrePersonaje && !rel.son.includes(n))
                    .map(n => <option key={`opt-${n}`} value={n}>{n}</option>)
                  }
                </select>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 mb-4 border-b border-primary/10 pb-2">
                  "{rel.sus}"
                </span>
                <div className="flex flex-col gap-3">
                  {rel.son.map((nombre, i) => (
                    <div key={`${nombre}-${i}`} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-2xl font-black uppercase italic text-primary leading-none tracking-tighter">
                        {nombre}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}