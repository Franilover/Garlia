"use client";
import { useState, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import { supabase } from '@/api/client/supabase';
import { useLightbox } from '../LightboxProvider';

export const AdminControls = () => {
  const { selectedImg, updateGalleryItem, currentIndex, tableContext } = useLightbox();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (selectedImg) setNuevoTitulo(selectedImg.alt || "");
  }, [selectedImg]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(tableContext)
        .update({ titulo: nuevoTitulo })
        .eq('id', selectedImg.id);
      if (error) throw error;
      updateGalleryItem(currentIndex, nuevoTitulo);
      setEditMode(false);
    } catch (err) {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <h2 className="text-white text-[10px] font-black uppercase tracking-[0.4em]">{selectedImg.alt}</h2>;

  return (
    <div className="flex items-center gap-3">
      {editMode ? (
        <>
          <input 
            value={nuevoTitulo} 
            onChange={(e) => setNuevoTitulo(e.target.value)}
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-[10px] uppercase font-black"
          />
          <button onClick={handleUpdate} disabled={saving} className="text-green-400"><Save size={16}/></button>
          <button onClick={() => setEditMode(false)} className="text-red-400"><X size={16}/></button>
        </>
      ) : (
        <>
          <h2 className="text-white text-[10px] font-black uppercase tracking-[0.4em]">{selectedImg.alt}</h2>
          <button onClick={() => setEditMode(true)} className="p-1 hover:bg-white/10 rounded"><Edit3 size={14}/></button>
        </>
      )}
    </div>
  );
};