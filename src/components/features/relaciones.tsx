"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/api/supabase';
import { Users, Plus, Trash2 } from 'lucide-react';

export default function Relaciones({ nombrePersonaje, editMode = false }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Cargar relaciones
  useEffect(() => {
    async function cargarRelaciones() {
      if (!nombrePersonaje) return;
      const { data, error } = await supabase
        .from('relaciones')
        .select('id, sus, son') 
        .eq('personaje', nombrePersonaje); 

      if (!error && data) {
        setLista(data);
      }
    }
    cargarRelaciones();
  }, [nombrePersonaje]);

  // 2. Manejar cambios en los inputs (solo localmente hasta que se guarde en el padre)
  const handleChange = (index, campo, valor) => {
    const nuevaLista = [...lista];
    if (campo === 'son') {
      // Guardamos temporalmente como array para que sea compatible
      nuevaLista[index][campo] = valor.split(',').map(s => s.trim());
    } else {
      nuevaLista[index][campo] = valor;
    }
    setLista(nuevaLista);
  };

  // 3. Añadir nueva fila de relación
  const añadirRelacion = () => {
    setLista([...lista, { sus: "VÍNCULO", son: [], personaje: nombrePersonaje }]);
  };

  // 4. Eliminar relación
  const eliminarRelacion = async (index, id) => {
    if (id) {
      await supabase.from('relaciones').delete().eq('id', id);
    }
    setLista(lista.filter((_, i) => i !== index));
  };

  if (lista.length === 0 && !editMode) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary/30">
          <Users size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Relaciones</span>
        </div>
        {editMode && (
          <button 
            onClick={añadirRelacion}
            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <Plus size={12} />
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3">
        {lista.map((rel, index) => (
          <div key={index} className="bg-white border-2 border-primary/5 p-4 rounded-3xl flex flex-col shadow-sm min-w-[140px] relative group">
            
            {editMode ? (
              /* --- MODO EDICIÓN --- */
              <div className="space-y-2">
                <button 
                  onClick={() => eliminarRelacion(index, rel.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={10} />
                </button>
                <input 
                  value={rel.sus}
                  onChange={(e) => handleChange(index, 'sus', e.target.value)}
                  className="text-[9px] font-bold uppercase text-slate-400 bg-transparent border-b border-primary/10 outline-none focus:border-primary w-full"
                  placeholder="Ej: AMIGOS"
                />
                <textarea 
                  value={Array.isArray(rel.son) ? rel.son.join(", ") : rel.son}
                  onChange={(e) => handleChange(index, 'son', e.target.value)}
                  className="text-xs font-black uppercase italic text-slate-800 bg-transparent outline-none w-full min-h-[40px] resize-none"
                  placeholder="Nombre 1, Nombre 2"
                />
              </div>
            ) : (
              /* --- MODO LECTURA --- */
              <>
                <span className="text-[9px] font-bold uppercase text-primary/40 tracking-wider mb-1">
                  {rel.sus}
                </span>
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}