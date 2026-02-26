"use client";
/**
 * ESTE ES EL COMPONENTE (EL DISEÑO)
 * Ubicación: components/paginas/personal/personal.tsx
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalProps {
  datos: any;
}

export default function Personal({ datos }: PersonalProps) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("items");

  // --- LÓGICA DE ORGANIZACIÓN ---
  // Extraemos lo que la página nos envió
  const { descubrimientos = [], inventario_usuario = [], username, status } = datos;

  // Filtramos por tipo para mostrar en cada sección
  const misPersonajes = descubrimientos.filter((d: any) => d.tipo === "personaje");
  const misCriaturas = descubrimientos.filter((d: any) => d.tipo === "criatura");
  const misItems = inventario_usuario;

  const tabs = [
    { id: "items", label: "Inventario", icon: Package },
    { id: "criaturas", label: "Bestiario", icon: Sword },
    { id: "personajes", label: "Agenda", icon: User },
  ] as const;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-8">
      {/* Header del Perfil */}
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border-2 border-primary/10 flex items-center justify-center overflow-hidden">
                {datos.avatar_url ? (
                    <img src={datos.avatar_url} alt={username} className="w-full h-full object-cover" />
                ) : (
                    <User size={40} className="text-primary/20" />
                )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white border border-primary/10 p-1.5 rounded-full shadow-sm">
                <Star size={12} className="text-amber-400 fill-amber-400" />
            </div>
        </div>
        
        <div>
          <h1 className="text-xl font-serif text-primary italic font-medium">{username}</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 mt-1">
             {status || "Aventurero de Franilover"}
          </p>
        </div>
      </div>

      {/* Selector de Pestañas Estilo Juego */}
      <div className="flex justify-center gap-2 border-b border-primary/5 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
              tab === t.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                : "text-primary/40 hover:bg-primary/5"
            )}
          >
            <t.icon size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido Dinámico */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            {/* RENDER DE ITEMS */}
            {tab === "items" && misItems.map((item: any) => (
              <div key={item.items.id} className="p-4 rounded-2xl bg-white border border-primary/5 flex flex-col items-center gap-3 text-center group hover:border-primary/20 transition-all">
                <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package size={20} className="text-primary/30" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary/80 uppercase tracking-tight">{item.items.nombre}</p>
                  <p className="text-[9px] text-primary/30 font-bold uppercase">{item.items.categoria}</p>
                </div>
              </div>
            ))}

            {/* RENDER DE CRIATURAS (Bestiario) */}
            {tab === "criaturas" && misCriaturas.map((criatura: any) => (
              <div key={criatura.entidad_id} className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Sword size={20} className="text-emerald-500" />
                </div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">Entidad Descubierta</p>
                <p className="text-[8px] text-emerald-400 font-black uppercase">ID: {criatura.entidad_id.slice(0,8)}</p>
              </div>
            ))}

            {/* RENDER DE PERSONAJES (Agenda) */}
            {tab === "personajes" && misPersonajes.map((personaje: any) => (
              <div key={personaje.entidad_id} className="p-4 rounded-2xl bg-amber-50/30 border border-amber-100 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <User size={20} className="text-amber-500" />
                </div>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">Aliado Conocido</p>
                <p className="text-[8px] text-amber-400 font-black uppercase">Visto el {new Date(personaje.fecha_descubrimiento).toLocaleDateString()}</p>
              </div>
            ))}

            {/* Mensaje si está vacío */}
            {((tab === "items" && misItems.length === 0) || 
              (tab === "criaturas" && misCriaturas.length === 0) || 
              (tab === "personajes" && misPersonajes.length === 0)) && (
              <div className="col-span-full py-20 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/20 italic">
                  "Aún no has descubierto nada en esta categoría"
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}