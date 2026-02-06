"use client";
import React from 'react';

export default function FiltrosMaestros({ config, filtrosActivos, onChange }) {
  return (
    <div className="max-w-5xl mx-auto mb-16 px-6 space-y-8">
      {Object.entries(config).map(([grupo, opciones]) => {
        
        // --- ESTA ES LA LÓGICA DE ORDEN ---
        const opcionesOrdenadas = [...opciones].sort((a, b) => {
          const valA = a.toLowerCase();
          const valB = b.toLowerCase();
          if (valA === 'todos') return -1; // "todos" va primero
          if (valB === 'todos') return 1;  // si b es "todos", a va después
          return valA.localeCompare(valB); // El resto en orden alfabético
        });

        return (
          <div key={grupo} className="flex flex-col items-center space-y-4">
            {Object.keys(config).length > 1 && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 italic">
                {grupo}
              </span>
            )}
            
            <div className="flex flex-wrap justify-center gap-2">
              {opcionesOrdenadas.map(opt => {
                const isActive = filtrosActivos[grupo]?.toLowerCase() === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    onClick={() => onChange(grupo, opt)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                      isActive 
                      ? 'bg-primary text-white shadow-lg scale-105 border-primary' 
                      : 'bg-white/50 text-primary/60 border-transparent hover:border-primary/20'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}