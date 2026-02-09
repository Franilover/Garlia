"use client";

import { typography } from "@/lib/config/design-system";

// Definimos la estructura exacta para evitar errores de TS
interface CriaturaDescubierta {
  criaturas: { nombre: string };
}

interface ItemInventario {
  equipado: boolean;
  items: { 
    nombre: string; 
    categoria: string; 
  };
}

interface PersonalProps {
  datos: {
    username: string;
    status: string;
    descubrimientos?: CriaturaDescubierta[];
    inventario_usuario?: ItemInventario[];
  };
}

export default function Personal({ datos }: PersonalProps) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER DEL PERFIL */}
      <section className="text-center space-y-2">
        <h1 className="text-4xl font-black text-[#6B5E70] uppercase tracking-tighter">
          "{datos.username}"
        </h1>
        <div className="inline-block px-4 py-1 bg-[#6B5E70]/5 rounded-full">
          <p className="text-[10px] font-bold text-[#6B5E70]/60 uppercase tracking-[0.2em]">
            "{datos.status || "Explorador Novato"}"
          </p>
        </div>
      </section>

      <hr className="border-[#6B5E70]/10" />

      {/* CONTENIDO PRINCIPAL: GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUMNA IZQUIERDA: DESCUBRIMIENTOS */}
        <div className="p-6 rounded-2xl bg-white/40 border border-[#6B5E70]/5 backdrop-blur-sm">
          <h3 className="text-[11px] font-black text-[#6B5E70]/40 uppercase tracking-widest mb-4">
            "Últimos Descubrimientos"
          </h3>
          <ul className="space-y-3">
            {datos.descubrimientos && datos.descubrimientos.length > 0 ? (
              datos.descubrimientos.map((d, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EFE8F7]" />
                  <span className="text-sm font-medium text-[#6B5E70]">
                    {d.criaturas.nombre}
                  </span>
                </li>
              ))
            ) : (
              <p className="text-xs italic text-[#6B5E70]/40">"Aún no hay descubrimientos..."</p>
            )}
          </ul>
        </div>

        {/* COLUMNA DERECHA: INVENTARIO EQUIPADO */}
        <div className="p-6 rounded-2xl bg-white/40 border border-[#6B5E70]/5 backdrop-blur-sm">
          <h3 className="text-[11px] font-black text-[#6B5E70]/40 uppercase tracking-widest mb-4">
            "Equipo Actual"
          </h3>
          <div className="space-y-3">
            {datos.inventario_usuario?.filter(item => item.equipado).map((item, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-[#6B5E70]/5">
                <span className="text-sm font-bold text-[#6B5E70]">
                  {item.items.nombre}
                </span>
                <span className="text-[9px] uppercase font-black text-[#6B5E70]/30 px-2 py-1 bg-white/50 rounded">
                  {item.items.categoria}
                </span>
              </div>
            )) || <p className="text-xs italic text-[#6B5E70]/40">"Sin equipo..."</p>}
          </div>
        </div>

      </div>

      <footer className="flex justify-center gap-12 pt-4">
        <div className="text-center">
          <p className="text-lg font-black text-[#6B5E70]">
            {datos.inventario_usuario?.length || 0}
          </p>
          <p className="text-[9px] font-bold text-[#6B5E70]/40 uppercase tracking-widest">"Items"</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-[#6B5E70]">
            {datos.descubrimientos?.length || 0}
          </p>
          <p className="text-[9px] font-bold text-[#6B5E70]/40 uppercase tracking-widest">"Criaturas"</p>
        </div>
      </footer>
    </div>
  );
}