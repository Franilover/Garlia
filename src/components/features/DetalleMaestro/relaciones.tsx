"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/api/supabase';
import { Users, Plus, Trash2, X } from 'lucide-react';

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
  datosRelaciones?: any[]; // <-- NUEVA PROP: Datos precargados
}

export default function Relaciones({ 
  nombrePersonaje, 
  editMode = false,
  onChange,
  datosRelaciones // <-- Recibimos los datos del padre
}: RelacionesProps) {
  const [lista, setLista] = useState<Relacion[]>([]);
  const [todosLosPersonajes, setTodosLosPersonajes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      if (!nombrePersonaje) return;
      
      // 1. LÓGICA DE OPTIMIZACIÓN: Si ya vienen los datos, no consultamos a Supabase
      if (datosRelaciones && datosRelaciones.length > 0) {
        const formateadas: Relacion[] = datosRelaciones.map(r => ({
          id: r.id,
          sus: r.sus,
          son: Array.isArray(r.son) ? r.son : [r.son],
          personaje: nombrePersonaje
        }));
        setLista(formateadas);
        setLoading(false);
      } else {
        // Solo si no hay datos precargados, hacemos el fetch (para compatibilidad)
        const { data: rels } = await supabase
          .from('relaciones')
          .select('id, sus, son')
          .eq('personaje', nombrePersonaje);
        
        if (rels) {
          const formateadas: Relacion[] = rels.map(r => ({
            id: r.id,
            sus: r.sus,
            son: Array.isArray(r.son) ? r.son : [r.son],
            personaje: nombrePersonaje
          }));
          setLista(formateadas);
        }
        setLoading(false);
      }

      // 2. Cargamos la lista de nombres para el selector (esto es rápido)
      const { data: perjs } = await supabase
        .from('personajes')
        .select('nombre');
      if (perjs) setTodosLosPersonajes(perjs.map(p => p.nombre));
    }

    cargarDatos();
  }, [nombrePersonaje, datosRelaciones]); // Escuchamos cambios en la prop

  useEffect(() => {
    if (editMode && onChange) {
      onChange(lista);
    }
  }, [lista, editMode, onChange]);

  // ... (Resto de funciones: agregarNombreARelacion, quitarNombreDeRelacion, eliminarFilaCompleta se mantienen igual)
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
      if (error) return;
    }
    setLista(lista.filter((_, i) => i !== index));
  };

  if (lista.length === 0 && !editMode) return null;

  return (
    <div className="w-full">
      {/* CABECERA CON BOTÓN AÑADIR */}
      <div className="flex items-center justify-between mb-8">        
        {editMode && (
          <button 
            type="button"
            onClick={() => setLista([...lista, { sus: "VÍNCULO", son: [], personaje: nombrePersonaje }])}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:scale-105 transition-all shadow-lg text-[10px] font-black uppercase tracking-widest"
          >
            <Plus size={14} /> Nuevo Vínculo
          </button>
        )}
      </div>
      
      {/* GRID DE RELACIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lista.map((rel, index) => (
          <div 
            key={index} 
            className={`relative group p-6 rounded-[2.5rem] transition-all duration-300 ${
              editMode 
                ? 'bg-white border-2 border-dashed border-primary/20 shadow-inner' 
                : 'bg-white border border-primary/5 shadow-sm hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {editMode ? (
              <div className="space-y-4">
                <button 
                  type="button"
                  onClick={() => eliminarFilaCompleta(index, rel.id)}
                  className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                >
                  <Trash2 size={14} />
                </button>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary/40 uppercase ml-1">Tipo de relación</label>
                  <input 
                    value={rel.sus}
                    onChange={(e) => {
                      const nl = [...lista];
                      nl[index].sus = e.target.value.toUpperCase();
                      setLista(nl);
                    }}
                    className="w-full text-xs font-black uppercase italic text-slate-800 bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 ring-primary/10"
                    placeholder="EJ: MEJOR AMIGO"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-primary/40 uppercase ml-1">Personajes vinculados</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl min-h-[40px]">
                    {rel.son.map((n, i) => (
                      <span key={i} className="bg-primary text-white text-[10px] px-3 py-1 rounded-lg flex items-center gap-2 font-black italic">
                        {n}
                        <button type="button" onClick={() => quitarNombreDeRelacion(index, n)} className="hover:text-red-200">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <select 
                  onChange={(e) => agregarNombreARelacion(index, e.target.value)}
                  className="w-full text-[10px] font-black uppercase bg-primary/5 p-3 rounded-xl outline-none cursor-pointer border-none text-primary"
                  value=""
                >
                  <option value="" disabled>+ Seleccionar Personaje</option>
                  {todosLosPersonajes
                    .filter(nombre => nombre !== nombrePersonaje && !rel.son.includes(nombre))
                    .map(nombre => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))
                  }
                </select>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 mb-3 border-b border-primary/5 pb-2">
                  {rel.sus}
                </span>
                <div className="flex flex-col gap-2">
                  {rel.son.map((nombre, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      <span className="text-xl font-black uppercase italic text-primary leading-none tracking-tighter">
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