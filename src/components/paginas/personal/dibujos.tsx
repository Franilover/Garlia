"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useLightbox, LightboxProvider, LightboxVisual } from "@/components/shared/modal/lightbox";
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import Newsletter from "@/components/features/newsletter";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import { typography, components } from '@/lib/config/design-system';
import { ImagePicker, InsertResult } from "@/components/shared/ui/ImagePicker";
import { supabase } from "@/lib/api/client/supabase";
import { Plus, X, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── MODAL PARA AÑADIR DIBUJO ────────────────────────────────────────────────

const CATEGORIAS = ['fanart', 'original', 'bocetos'];

interface AddDrawingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddDrawingModal({ open, onClose, onSuccess }: AddDrawingModalProps) {
  const [step, setStep] = useState<'pick' | 'meta'>('pick');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetear al cerrar
  const handleClose = () => {
    setStep('pick'); setUrl(''); setTitulo(''); setCategoria(CATEGORIAS[0]);
    setSaving(false); setSaved(false); setError(null);
    onClose();
  };

  const handlePickerInsert = (result: string | InsertResult) => {
    const r = result as InsertResult;
    setUrl(r.url);
    // Si el nombre del archivo parece un título, lo pre-rellena
    const nombre = r.url.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') ?? '';
    setTitulo(nombre);
    setStep('meta');
  };

  const handleSave = async () => {
    if (!titulo.trim() || !url) return;
    setSaving(true); setError(null);
    try {
      const { error: err } = await supabase
        .from('dibujos')
        .insert({ url_imagen: url, titulo: titulo.trim(), categoria });
      if (err) throw err;
      setSaved(true);
      setTimeout(() => { onSuccess(); handleClose(); }, 1000);
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
      setSaving(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // Abrir picker inmediatamente cuando se abre el modal
  useEffect(() => {
    if (open && step === 'pick') setPickerOpen(true);
  }, [open]);

  return (
    <>
      {/* ImagePicker en modo URL (sin snippet) */}
      <ImagePicker
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); if (step === 'pick') handleClose(); }}
        onInsert={handlePickerInsert}
        showModeSelector={false}
      />

      {/* Modal de metadatos (paso 2) */}
      <AnimatePresence>
        {open && step === 'meta' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleClose} className="fixed inset-0 z-[60] bg-[#1A1218]/50 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
              style={{ boxShadow: "0 32px 80px rgba(44,38,46,0.18)" }}
            >
              {/* Preview de la imagen elegida */}
              <div className="relative bg-[#F7F3EE]" style={{ aspectRatio: "16/9" }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                {/* Botón para volver a elegir imagen */}
                <button
                  onClick={() => { setStep('pick'); setPickerOpen(true); }}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-[#6B5E70] hover:bg-white transition-all"
                >
                  Cambiar
                </button>
              </div>

              <div className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/40 mb-1.5">
                    Título
                  </label>
                  <input
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Nombre del dibujo…"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-[#6B5E70]/12 text-sm font-serif text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 placeholder:text-[#6B5E70]/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/40 mb-2">
                    Categoría
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIAS.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoria(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          categoria === cat
                            ? "bg-[#6B5E70] text-white"
                            : "border border-[#6B5E70]/15 text-[#6B5E70]/50 hover:bg-[#6B5E70]/8"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-[11px] text-red-400 font-bold">{error}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl border border-[#6B5E70]/10 text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/40 hover:bg-[#6B5E70]/5 transition-all">
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!titulo.trim() || saving || saved}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#6B5E70] text-white hover:bg-[#5a4e5f] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {saved
                      ? <><Check size={13} /> Guardado</>
                      : saving
                      ? <><Loader2 size={13} className="animate-spin" /> Guardando…</>
                      : 'Añadir a galería'
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── CONTENIDO PRINCIPAL ──────────────────────────────────────────────────────

function DrawingsContent() {
  const { openLightbox } = useLightbox();
  const [filtro, setFiltro] = useState('todos');
  const [isAdmin, setIsAdmin] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: dibujos, loading, error, refetch } = useSupabaseData('dibujos', {
    order: { campo: 'id', asc: false }
  });

  const categorias = ['todos', 'fanart', 'original', 'bocetos'];

  const filtrados = useMemo(() => (
    filtro === 'todos' ? dibujos : dibujos.filter(d => d.categoria === filtro)
  ), [dibujos, filtro]);

  const lbData = useMemo(() => (
    filtrados.map(d => ({ src: d.url_imagen, alt: d.titulo, id: d.id }))
  ), [filtrados]);

  // Verificar sesión de admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setIsAdmin(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const MiCabecera = (
    <header className="mb-12 text-center px-4 pt-16">
      <h1 className={typography.pageTitle}>Galería</h1>
      <div className={components.dividerThick} />
      <div className="mt-12">
        <FiltrosMaestros
          config={{ categorias }}
          filtrosActivos={{ categorias: filtro }}
          onChange={(grupo, valor) => setFiltro(valor)}
        />
      </div>
    </header>
  );

  if (error) return (
    <div className={typography.emptyState}>
      Error al conectar con el archivo: {error}
    </div>
  );

  return (
    <main className="min-h-screen bg-bg-main pb-20 font-sans">
      {loading ? (
        <div className={typography.loading}>Sincronizando Archivos...</div>
      ) : (
        <GalleryGrid headerContent={MiCabecera}>
          {filtrados.map((dibujo, index) => (
            <GalleryItem
              key={dibujo.id}
              src={dibujo.url_imagen}
              alt={dibujo.titulo}
              onClick={() => openLightbox(index, lbData, 'dibujos')}
            >
              <p className={typography.tag}>{dibujo.categoria}</p>
              <h3 className={typography.cardTitle}>{dibujo.titulo}</h3>
            </GalleryItem>
          ))}
          {filtrados.length === 0 && (
            <div className={`col-span-full ${typography.emptyState}`}>
              El lienzo está vacío por ahora
            </div>
          )}
        </GalleryGrid>
      )}

      <div className="mt-32">
        <Newsletter />
      </div>

      <LightboxVisual />

      {/* FAB de admin */}
      <AnimatePresence>
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setAddOpen(true)}
            className="fixed bottom-8 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#6B5E70] text-white shadow-2xl shadow-[#6B5E70]/30 hover:bg-[#5a4e5f] active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span className="text-[11px] font-black uppercase tracking-widest">Añadir dibujo</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal de añadir */}
      <AddDrawingModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => refetch?.()}
      />
    </main>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export default function Drawings() {
  return (
    <LightboxProvider>
      <DrawingsContent />
    </LightboxProvider>
  );
}