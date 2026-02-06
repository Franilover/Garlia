"use client";
import React from 'react';
import { Sparkles, Footprints, ShieldCheck, Stars } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

export default function Personal({ datos }) {
  if (!datos) return null;

  // --- OPTIMIZACIÓN: Clases unificadas para secciones ---
  const sectionTitleStyle = "text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2";
  const emptyStateStyle = "text-primary/30 text-[10px] italic text-center py-10 uppercase font-black tracking-widest";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-10 w-full max-w-6xl mx-auto px-4 pb-20 pt-10"
    >
      
      {/* --- CABECERA DE PERFIL --- */}
      <section className="bg-white border border-primary/10 rounded-[3rem] p-12 md:p-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Decoración de fondo usando el color primario con muy baja opacidad */}
        <Stars className="absolute top-10 right-10 text-primary/5" size={120} />
        
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-bg-main border-4 border-primary/10 flex items-center justify-center shadow-inner">
            <Sparkles size={50} className="text-primary/40" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase leading-none">
          {datos.username}
        </h1>
        
        <div className="mt-6">
          <span className="bg-primary text-white py-1.5 px-8 text-[10px] font-black uppercase rounded-xl tracking-widest shadow-lg shadow-primary/20">
            {datos.status || "Explorador de Lore"}
          </span>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* --- SECCIÓN INVENTARIO --- */}
        <section className="card-main !bg-white/40 backdrop-blur-sm p-8 md:p-10">
          <div className="flex items-center gap-4 mb-8">
            <h2 className={sectionTitleStyle}>
              <ShieldCheck size={16} /> Inventario
            </h2>
            <div className="h-[1px] flex-1 bg-primary/10"></div>
          </div>
          
          <div className="space-y-3">
            {datos.inventario_usuario && datos.inventario_usuario.length > 0 ? (
              datos.inventario_usuario.map((slot, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex justify-between items-center p-5 rounded-2xl border transition-all duration-300",
                    slot.equipado 
                      ? 'bg-white border-primary shadow-lg scale-[1.02]' 
                      : 'bg-white/50 border-primary/5 opacity-60'
                  )}
                >
                  <div>
                    <span className="text-[8px] font-black uppercase text-primary/40 tracking-widest block mb-1">
                      {slot.items.tipo}
                    </span>
                    <p className="text-primary font-black text-sm uppercase italic leading-none">
                      {slot.items.nombre}
                    </p>
                  </div>
                  {slot.equipado && (
                    <div className="flex items-center gap-2 bg-primary px-3 py-1 rounded-full">
                       <span className="text-[8px] text-white font-black uppercase tracking-tighter">Equipado</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className={emptyStateStyle}>Mochila vacía</p>
            )}
          </div>
        </section>

        {/* --- SECCIÓN BESTIARIO / AVISTAMIENTOS --- */}
        <section className="card-main !bg-white/40 backdrop-blur-sm p-8 md:p-10">
          <div className="flex items-center gap-4 mb-8">
            <h2 className={sectionTitleStyle}>
              <Footprints size={16} /> Avistamientos
            </h2>
            <div className="h-[1px] flex-1 bg-primary/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {datos.descubrimientos && datos.descubrimientos.length > 0 ? (
              datos.descubrimientos.map((desc, i) => (
                <div 
                  key={i} 
                  className="char-card-base !aspect-auto bg-white p-6 text-center hover:shadow-lg transition-all"
                >
                  <div className="text-3xl mb-3 opacity-80 group-hover:scale-110 transition-transform">👾</div>
                  <h3 className="text-[9px] font-black text-primary uppercase tracking-widest leading-tight">
                    {desc.criaturas.nombre}
                  </h3>
                </div>
              ))
            ) : (
              <div className={cn("col-span-2", emptyStateStyle)}>
                Sin avistamientos registrados
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}