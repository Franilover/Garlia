"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Book, Plus, Edit2, X, ChevronDown, EyeOff } from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";
import { SmartImage } from "@/components/display/SmartImage";

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  estado: string;
  created_at: string;
}

const Biblioteca = () => {
  const isAdmin = useIsAdmin();

  const { data: libros = [], loading, error, setData: setLibros } = useSupabaseData("libros", {
    order: { campo: "created_at", asc: false }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [libroAEditar, setLibroAEditar] = useState<Libro | null>(null);
  
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [editForm, setEditForm] = useState({ titulo: "", sinopsis: "", estado: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  
  const librosVisibles = (libros as Libro[]).filter(libro => 
    isAdmin || libro.estado !== "BORRADOR"
  );

  const handleAddLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    
    setIsUpdating(true);
    const { data: insertedData, error: insertError } = await supabase
      .from("libros")
      .insert([{ 
        titulo: nuevoTitulo.toUpperCase(),
        sinopsis: "Nueva crónica por escribir...",
        estado: "BORRADOR", 
        portada_url: "" 
      }])
      .select();

    if (!insertError && insertedData) {
      setLibros(prev => [insertedData[0], ...prev]);
      setNuevoTitulo("");
      setShowAddModal(false);
    } else {
      alert("Error al sellar el nuevo libro.");
    }
    setIsUpdating(false);
  };

  const handleEditClick = (e: React.MouseEvent, libro: Libro) => {
    e.preventDefault();
    e.stopPropagation();
    setLibroAEditar(libro);
    setEditForm({ 
      titulo: libro.titulo, 
      sinopsis: libro.sinopsis,
      estado: libro.estado 
    });
    setShowEditModal(true);
  };

  const handleUpdateLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libroAEditar || isUpdating) return;

    setIsUpdating(true);
    const { error: updateError } = await supabase
      .from("libros")
      .update({
        titulo: editForm.titulo.toUpperCase(),
        sinopsis: editForm.sinopsis,
        estado: editForm.estado
      })
      .eq("id", libroAEditar.id);

    if (!updateError) {
      setLibros(prev => prev.map(l => 
        l.id === libroAEditar.id 
          ? { ...l, ...editForm, titulo: editForm.titulo.toUpperCase() } 
          : l
      ));
      setShowEditModal(false);
      setLibroAEditar(null);
    } else {
      alert("Error al actualizar el tomo.");
    }
    setIsUpdating(false);
  };

  if (loading && libros.length === 0) return (
    <div className="h-screen flex items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        <div className="text-primary font-black uppercase text-[10px] tracking-[0.3em]">
          Abriendo Archivos...
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-4xl font-black text-primary italic tracking-tighter flex items-center gap-3 leading-none">
            <Book size={32} /> BIBLIOTECA
          </h1>
          <p className="text-primary/50 text-xs font-bold uppercase tracking-widest mt-2">
            Explora los relatos del mundo
          </p>
        </motion.div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {librosVisibles.map((libro, index) => (
          <motion.div
            key={libro.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`relative group ${libro.estado === "BORRADOR" ? "opacity-60" : ""}`}
          >
            <Link href={`/wiki/libros/${libro.id}`}>
              <div className="cursor-pointer relative">
                {isAdmin && (
                  <button
                    onClick={(e) => handleEditClick(e, libro)}
                    className="absolute top-4 right-4 z-30 bg-white-custom p-2 rounded-full shadow-lg border border-primary/10 text-primary hover:bg-primary hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                
                <motion.div whileHover={{ y: -10 }} className="relative aspect-[3/4] rounded-[var(--radius-card)] overflow-hidden shadow-xl border border-primary/10 bg-white-custom">
                  <SmartImage
                    src={libro.portada_url || "/placeholder-cover.jpg"}
                    alt={libro.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-6 left-6 z-20 bg-white-custom/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10 flex items-center gap-2">
                    {libro.estado === "BORRADOR" && <EyeOff size={10} className="text-primary" />}
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">
                      {libro.estado}
                    </span>
                  </div>
                </motion.div>

                <div className="mt-6 px-2">
                  <h2 className="text-primary font-black uppercase text-base group-hover:text-[var(--accent)] transition-colors leading-tight tracking-tight">
                    {libro.titulo}
                  </h2>
                  <p className="text-primary/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
                    &quot;{libro.sinopsis}&quot;
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {}
      <AnimatePresence>
        {showAddModal && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white-custom rounded-[var(--radius-card)] p-10 w-full max-w-sm shadow-2xl border border-primary/10">
              <h3 className="text-center text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Nuevo Tomo</h3>
              <form onSubmit={handleAddLibro} className="space-y-6">
                <input autoFocus type="text" placeholder="TÍTULO..." value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} className="w-full bg-bg-main border-b-2 border-primary/10 py-4 text-center text-sm font-black text-primary outline-none focus:border-primary uppercase" />
                <button type="submit" disabled={isUpdating} className="w-full bg-primary text-white py-4 rounded-[var(--radius-btn)] font-black uppercase text-[10px] active:scale-95 transition-transform disabled:opacity-50">
                  {isUpdating ? "Creando Borrador..." : "Crear"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditModal && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white-custom rounded-[var(--radius-card)] p-10 w-full max-w-md shadow-2xl border border-primary/10">
              <div className="flex justify-between items-center mb-6">
                <span className="text-primary font-black uppercase text-[10px] tracking-[0.3em] italic">Editar Registro</span>
                <button onClick={() => setShowEditModal(false)} className="text-primary/40 hover:text-primary"><X size={20} /></button>
              </div>

              <form onSubmit={handleUpdateLibro} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-primary/40 uppercase mb-2 block tracking-widest">Título</label>
                    <input type="text" value={editForm.titulo} onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))} className="w-full bg-bg-main border-b-2 border-primary/10 py-3 text-sm font-black text-primary outline-none focus:border-primary uppercase" />
                  </div>
                  
                  <div className="col-span-2 relative">
                    <label className="text-[9px] font-black text-primary/40 uppercase mb-2 block tracking-widest">Visibilidad y Estado</label>
                    <div className="relative">
                      <select 
                        value={editForm.estado} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, estado: e.target.value }))}
                        className="w-full bg-bg-main border-b-2 border-primary/10 py-3 text-sm font-black text-primary outline-none focus:border-primary appearance-none cursor-pointer uppercase"
                      >
                        <option value="BORRADOR">BORRADOR (OCULTO)</option>
                        <option value="EN PROCESO">EN PROCESO (PÚBLICO)</option>
                        <option value="FINALIZADO">FINALIZADO (PÚBLICO)</option>
                        <option value="PAUSADO">PAUSADO (PÚBLICO)</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-primary/40 uppercase mb-2 block tracking-widest">Sinopsis / Crónica</label>
                  <textarea rows={4} value={editForm.sinopsis} onChange={(e) => setEditForm(prev => ({ ...prev, sinopsis: e.target.value }))} className="w-full bg-bg-main border-[length:var(--border-width)] border-primary/10 p-4 rounded-[var(--radius-btn)] text-sm font-medium text-primary outline-none focus:border-primary italic" />
                </div>

                <button type="submit" disabled={isUpdating} className="w-full bg-primary text-white py-4 rounded-[var(--radius-btn)] font-black uppercase text-[10px] active:scale-95 transition-transform disabled:opacity-50">
                  {isUpdating ? "Actualizando..." : "Guardar Cambios"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Biblioteca;