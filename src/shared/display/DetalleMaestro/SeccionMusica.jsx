"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "@/lib/api/client/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, Check, ChevronsUpDown, X, Music } from "lucide-react";

export const SelectorMusicaAdmin = ({ idsSeleccionados = [], onChange }) => {
  const [todas, setTodas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); // NUEVO: Control de montaje
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true); // Marcamos como montado para el Portal
    const cargar = async () => {
      try {
        const { data } = await supabase
          .from("canciones")
          .select("id, titulo")
          .order("titulo");
        
        if (data) setTodas(data);
      } catch (err) {
        console.error("Error cargando canciones:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const safeIds = useMemo(() => 
    Array.isArray(idsSeleccionados) 
      ? idsSeleccionados.filter(id => id !== null && id !== undefined) 
      : []
  , [idsSeleccionados]);
  
  const toggle = (id) => {
    const nuevos = safeIds.includes(id) 
      ? safeIds.filter(i => i !== id) 
      : [...safeIds, id];
    onChange(nuevos);
  };

  if (loading) return <div className="h-14 bg-primary/5 animate-pulse rounded-[var(--radius-card)] w-full" />;

  return (
    <div className="relative w-full">
      <div 
        ref={buttonRef}
        onClick={handleOpen} 
        className={`w-full p-5 bg-white-custom border ${isOpen ? "border-primary" : "border-primary/10"} rounded-[var(--radius-card)] flex items-center justify-between cursor-pointer shadow-inner transition-all hover:border-primary/30`}
      >
        <div className="flex flex-wrap gap-2">
          {safeIds.length > 0 ? (
            safeIds.map(id => {
              const item = todas.find(c => c && c.id === id);
              if (!item) return null;
              return (
                <span 
                  key={id} 
                  className="bg-primary text-btn-text text-[9px] font-black px-4 py-2 flex items-center gap-2 uppercase italic tracking-wider shadow-sm border border-primary/20" style={{borderRadius:"var(--radius-btn)"}}
                >
                  {item.titulo}
                  <X size={12} onClick={(e) => { e.stopPropagation(); toggle(id); }} className="hover:text-red-300 transition-colors cursor-pointer" />
                </span>
              );
            })
          ) : (
            <span className="text-primary/30 text-[10px] font-black uppercase italic tracking-[0.2em] ml-2">
              Seleccionar registros sonoros...
            </span>
          )}
        </div>
        <ChevronsUpDown size={18} className="text-primary/30" />
      </div>

      {/* FIX: Solo intentamos el Portal si estamos montados en el cliente */}
      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
            style={{ 
              position: "absolute", 
              top: coords.top + 10, 
              left: coords.left, 
              width: coords.width, 
              zIndex: 9999 
            }}
            className="bg-white-custom border border-primary/10 rounded-[var(--radius-card)] shadow-[0_25px_60px_rgba(0,0,0,0.2)] max-h-72 overflow-y-auto p-4 custom-scrollbar"
          >
            {todas.map(c => {
              if (!c?.id) return null; // Seguridad extra
              const isSelected = safeIds.includes(c.id);
              return (
                <div 
                  key={c.id} 
                  onClick={() => toggle(c.id)} 
                  className={`p-4 rounded-[var(--radius-btn)] cursor-pointer mb-1.5 flex justify-between items-center transition-all ${isSelected ? "bg-primary text-btn-text shadow-lg translate-x-1" : "hover:bg-primary/5 text-primary/60 hover:translate-x-1"}`}
                >
                  <span className="text-[11px] font-black uppercase italic tracking-tight">{c.titulo}</span>
                  {isSelected && <Check size={16} />}
                </div>
              );
            })}
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
};

export const SeccionMusica = ({ listaLinks = [] }) => {
  const cancionesValidas = useMemo(() => {
    // Blindaje contra listaLinks nulo o no array
    if (!listaLinks || !Array.isArray(listaLinks)) return [];

    return listaLinks.filter(cancion => 
      cancion !== null && 
      typeof cancion === "object" && 
      cancion.id !== undefined &&
      cancion.id !== null
    );
  }, [listaLinks]);

  if (cancionesValidas.length === 0) {
    return (
      <div className="p-16 border-[length:var(--border-width)] border-dashed border-primary/5 rounded-[var(--radius-card)] flex flex-col items-center justify-center opacity-20 italic">
        <Music size={40} className="mb-4 text-primary" />
        <span className="text-[12px] font-black uppercase tracking-[0.5em]">Sin canciones</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
      {cancionesValidas.map((cancion, index) => {
        // ID de respaldo por si acaso
        const key = cancion.id || `temp-${index}`;

        return (
          <Link key={key} href={`/wiki/canciones/${cancion.id}`} className="group no-underline">
            <motion.div 
              whileHover={{ scale: 1.05, y: -8 }} 
              className="relative flex flex-col items-center justify-center p-10 bg-white-custom border border-primary/5 rounded-[var(--radius-card)] aspect-square overflow-hidden shadow-sm hover:shadow-xl transition-all"
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10rem] font-black text-primary/5 italic select-none translate-y-4 group-hover:scale-110 transition-transform">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="relative z-10 text-5xl font-black text-primary/10 group-hover:text-primary transition-colors italic mb-2">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="relative z-10 text-center mt-2 px-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-primary/40 group-hover:text-primary/60 transition-colors line-clamp-2">
                  {cancion.titulo || "S/T"}
                </p>
              </div>
              <PlayCircle size={40} className="relative z-20 text-primary/20 group-hover:text-primary group-hover:scale-110 transition-all mt-auto" />
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};