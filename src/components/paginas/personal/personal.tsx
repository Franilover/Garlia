"use client";
/**
 * COMPONENTE: components/paginas/personal/personal.tsx
 * Corregido según las advertencias de TypeScript y Tailwind v4.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Descubrimiento {
  tipo: "item" | "criatura" | "personaje";
  entidad_id: string;
  fecha_descubrimiento: string; // 👈 CORREGIDO: Antes decía fecha_discovery
  nombre?: string; 
}

interface ItemInventario {
  equipado: boolean;
  items: { 
    id: string;
    nombre: string; 
    categoria: string;
    imagen_url?: string;
  };
}

interface PersonalProps {
  datos: {
    username: string;
    status: string;
    avatar_url?: string;
    descubrimientos?: Descubrimiento[];
    inventario_usuario?: ItemInventario[];
  };
}

export default function Personal({ datos }: PersonalProps) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("items");

  const { descubrimientos = [], inventario_usuario = [] } = datos;

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas = descubrimientos.filter(d => d.tipo === "criatura");
  const misItems = inventario_usuario;

  const tabs = [
    { id: "items", label: "Inventario", icon: Package },
    { id: "criaturas", label: "Bestiario", icon: Sword },
    { id: "personajes", label: "Agenda", icon: User },
  ] as const;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <section className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          {/* bg-linear-to-b es la nueva forma canónica de Tailwind v4 */}
          <div className="w-24 h-24 rounded-full bg-linear-to-b from-[#6B5E70]/20 to-[#6B5E70]/5 border-2 border-[#6B5E70]/10 flex items-center justify-center overflow-hidden">
            {datos.avatar_url ? (
              <img src={datos.avatar_url} alt={datos.username} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-[#6B5E70]/20" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white border border-[#6B5E70]/10 p-1.5 rounded-full shadow-sm">
            <Star size={12} className="text-amber-400 fill-amber-400" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-4xl font-black text-[#6B5E70] uppercase tracking-tighter">
            "{datos.username}"
          </h1>
          <p className="text-[10px] font-black text-[#6B5E70]/40 uppercase tracking-[0.3em]">
            "{datos.status || "Explorador de Franilover"}"
          </p>
        </div>
      </section>

      {/* TABS */}
      <nav className="flex justify-center gap-2 border-b border-[#6B5E70]/5 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300",
              tab === t.id 
                ? "bg-[#6B5E70] text-white shadow-lg shadow-[#6B5E70]/20 scale-105" 
                : "text-[#6B5E70]/40 hover:bg-[#6B5E70]/5"
            )}
          >
            <t.icon size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* CONTENIDO - min-h-75 es la forma corta de 300px en v4 */}
      <div className="min-h-75">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {tab === "items" && misItems.map((item, i) => (
              <div key={i} className="group p-4 rounded-2xl bg-white border border-[#6B5E70]/5 flex items-center gap-4 hover:border-[#6B5E70]/20 transition-all">
                <div className="w-12 h-12 bg-[#6B5E70]/5 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Package size={20} className="text-[#6B5E70]/30" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black text-[#6B5E70] uppercase tracking-tight">{item.items.nombre}</p>
                  <p className="text-[9px] text-[#6B5E70]/30 font-black uppercase">{item.items.categoria}</p>
                </div>
                {item.equipado && <ShieldCheck size={14} className="text-blue-400" />}
              </div>
            ))}

            {(tab === "criaturas" || tab === "personajes") && (
              (tab === "criaturas" ? misCriaturas : misPersonajes).length > 0 ? (
                (tab === "criaturas" ? misCriaturas : misPersonajes).map((d, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-[#6B5E70]/5 flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      tab === "criaturas" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                    )}>
                      {tab === "criaturas" ? <Sword size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[#6B5E70] uppercase tracking-tight">
                        {d.nombre ?? (tab === "criaturas" ? "Criatura Registrada" : "Contacto Guardado")}
                      </p>
                      <p className="text-[9px] text-[#6B5E70]/30 font-black uppercase">
                        Visto el {new Date(d.fecha_descubrimiento).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#6B5E70]/20 italic">
                  "Sin registros en esta categoría"
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}