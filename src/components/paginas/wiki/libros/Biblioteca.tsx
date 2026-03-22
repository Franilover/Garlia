"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Book, Plus, Edit2, ChevronDown, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";
import { SmartImage } from "@/components/display/SmartImage";
import { Btn, BtnIcon, Modal, InputLine, Textarea, Select, Loading, PageHeader } from "@/components/ui";

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  estado: string;
  created_at: string;
}

const ESTADOS_OPTIONS = [
  { value: "BORRADOR",    label: "BORRADOR (OCULTO)" },
  { value: "EN PROCESO",  label: "EN PROCESO (PÚBLICO)" },
  { value: "FINALIZADO",  label: "FINALIZADO (PÚBLICO)" },
  { value: "PAUSADO",     label: "PAUSADO (PÚBLICO)" },
];

const Biblioteca = () => {
  const isAdmin = useIsAdmin();
  const { data: libros = [], loading, setData: setLibros } = useSupabaseData("libros", {
    order: { campo: "created_at", asc: false }
  });

  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [libroAEditar, setLibroAEditar]   = useState<Libro | null>(null);
  const [nuevoTitulo, setNuevoTitulo]     = useState("");
  const [editForm, setEditForm]           = useState({ titulo: "", sinopsis: "", estado: "" });
  const [isUpdating, setIsUpdating]       = useState(false);

  const librosVisibles = (libros as Libro[]).filter(libro =>
    isAdmin || libro.estado !== "BORRADOR"
  );

  const handleAddLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    setIsUpdating(true);
    const { data: insertedData, error } = await supabase
      .from("libros")
      .insert([{ titulo: nuevoTitulo.toUpperCase(), sinopsis: "Nueva crónica por escribir...", estado: "BORRADOR", portada_url: "" }])
      .select();
    if (!error && insertedData) {
      setLibros(prev => [insertedData[0], ...prev]);
      setNuevoTitulo("");
      setShowAddModal(false);
    }
    setIsUpdating(false);
  };

  const handleEditClick = (e: React.MouseEvent, libro: Libro) => {
    e.preventDefault(); e.stopPropagation();
    setLibroAEditar(libro);
    setEditForm({ titulo: libro.titulo, sinopsis: libro.sinopsis, estado: libro.estado });
    setShowEditModal(true);
  };

  const handleUpdateLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libroAEditar || isUpdating) return;
    setIsUpdating(true);
    const { error } = await supabase.from("libros")
      .update({ titulo: editForm.titulo.toUpperCase(), sinopsis: editForm.sinopsis, estado: editForm.estado })
      .eq("id", libroAEditar.id);
    if (!error) {
      setLibros(prev => prev.map(l =>
        l.id === libroAEditar.id ? { ...l, ...editForm, titulo: editForm.titulo.toUpperCase() } : l
      ));
      setShowEditModal(false);
    }
    setIsUpdating(false);
  };

  if (loading && libros.length === 0) return <Loading text="Abriendo archivos..." />;

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <div className="max-w-6xl mx-auto pt-16 px-6">
        <PageHeader
          title="Biblioteca"
          subtitle="Explora los relatos del mundo"
          icon={<Book size={32} />}
          action={isAdmin && (
            <BtnIcon size="lg" onClick={() => setShowAddModal(true)}>
              <Plus size={24} />
            </BtnIcon>
          )}
        />
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
                  <SmartImage src={libro.portada_url || "/placeholder-cover.jpg"} alt={libro.titulo} className="w-full h-full object-cover" />
                  <div className="absolute top-6 left-6 z-20 bg-white-custom/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10 flex items-center gap-2">
                    {libro.estado === "BORRADOR" && <EyeOff size={10} className="text-primary" />}
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">{libro.estado}</span>
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

      <Modal open={showAddModal && isAdmin} onClose={() => setShowAddModal(false)} title="Nuevo Tomo">
        <form onSubmit={handleAddLibro} className="space-y-6">
          <InputLine
            autoFocus
            placeholder="TÍTULO..."
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            className="text-center"
          />
          <Btn type="submit" loading={isUpdating} fullWidth size="lg">
            Crear
          </Btn>
        </form>
      </Modal>

      <Modal open={showEditModal && isAdmin} onClose={() => setShowEditModal(false)} title="Editar Registro" maxWidth="max-w-md">
        <form onSubmit={handleUpdateLibro} className="space-y-5">
          <InputLine
            label="Título"
            value={editForm.titulo}
            onChange={(e) => setEditForm(p => ({ ...p, titulo: e.target.value }))}
          />
          <div className="relative">
            <label className="text-[9px] font-black text-primary/40 uppercase mb-2 block tracking-widest">Visibilidad</label>
            <div className="relative">
              <select
                value={editForm.estado}
                onChange={(e) => setEditForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full bg-bg-main border-b-2 border-primary/10 py-3 text-sm font-black text-primary outline-none focus:border-primary appearance-none cursor-pointer uppercase"
              >
                {ESTADOS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
            </div>
          </div>
          <Textarea
            label="Sinopsis"
            rows={4}
            value={editForm.sinopsis}
            onChange={(e) => setEditForm(p => ({ ...p, sinopsis: e.target.value }))}
          />
          <Btn type="submit" loading={isUpdating} fullWidth size="lg">
            Guardar Cambios
          </Btn>
        </form>
      </Modal>
    </div>
  );
};

export default Biblioteca;