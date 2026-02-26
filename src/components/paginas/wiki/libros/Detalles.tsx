"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { 
  ChevronLeft, Play, ListOrdered, Plus, Trash2, X, Edit3, Save, Calendar, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartImage } from "@/components/shared/display/SmartImage";

// --- INTERFACES ---
interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string;
  libro_id: string;
}

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  fecha_proximo_capitulo?: string;
}

export default function LibroDetalle() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [libro, setLibro] = useState<Libro | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [loadingLibro, setLoadingLibro] = useState(true);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(true);

  // --- MODALES ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditCapModal, setShowEditCapModal] = useState(false);

  // --- FORMULARIOS ---
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCap, setSelectedCap] = useState<Capitulo | null>(null);
  const [editCapTitle, setEditCapTitle] = useState("");
  const [editCapFecha, setEditCapFecha] = useState("");

  const closeModals = () => {
    if (!procesando) {
      setShowAddModal(false);
      setShowEditCapModal(false);
    }
  };

  // Recarga caps tras mutaciones
  const refetchCaps = useCallback(async (admin: boolean) => {
    if (!id) return;
    const hoy = new Date().toISOString().split('T')[0];
    let q = supabase
      .from("capitulos")
      .select("*")
      .eq("libro_id", id)
      .not("titulo_capitulo", "like", "[Ruta]%")
      .order("orden", { ascending: true });
    if (!admin) q = q.lte("fecha_publicacion", hoy);
    const { data } = await q;
    if (data) setCapitulos(data);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const hoy = new Date().toISOString().split('T')[0];

    // ✅ Las 4 queries se lanzan TODAS A LA VEZ sin esperar ninguna
    // Lanzamos caps para admin Y para público simultáneamente,
    // luego usamos la correcta según el resultado de auth
    Promise.all([
      supabase.auth.getSession(),
      supabase.from("libros").select("*").eq("id", id).single(),
      supabase.from("capitulos").select("*").eq("libro_id", id).not("titulo_capitulo", "like", "[Ruta]%").order("orden", { ascending: true }),
      supabase.from("capitulos").select("*").eq("libro_id", id).lte("fecha_publicacion", hoy).not("titulo_capitulo", "like", "[Ruta]%").order("orden", { ascending: true }),
    ]).then(([authRes, libroRes, capsAll, capsPublic]) => {
      const admin = !!authRes.data.session;

      setIsAdmin(admin);
      if (libroRes.data) setLibro(libroRes.data);
      setCapitulos((admin ? capsAll.data : capsPublic.data) ?? []);
    }).finally(() => {
      setLoadingLibro(false);
      setLoadingCaps(false);
    });
  }, [id]);

  // --- ACCIONES ---
  const handleCrearCapitulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || procesando) return;

    setProcesando(true);
    const { error } = await supabase.from("capitulos").insert([{
      libro_id: id,
      titulo_capitulo: nuevoTitulo.toUpperCase(),
      orden: capitulos.length + 1,
      contenido: "Nueva crónica...",
      fecha_publicacion: nuevaFecha
    }]);

    if (!error) {
      setNuevoTitulo("");
      setShowAddModal(false);
      await refetchCaps(isAdmin);
    } else {
      alert("Error al crear el capítulo");
    }
    setProcesando(false);
  };

  const handleUpdateCapitulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCapTitle.trim() || !selectedCap || procesando) return;

    setProcesando(true);
    const { error } = await supabase.from("capitulos").update({
      titulo_capitulo: editCapTitle.toUpperCase(),
      fecha_publicacion: editCapFecha
    }).eq("id", selectedCap.id);

    if (!error) {
      setShowEditCapModal(false);
      await refetchCaps(isAdmin);
    } else {
      alert("Error al actualizar");
    }
    setProcesando(false);
  };

  const deleteCapitulo = async () => {
    if (!selectedCap || !confirm("¿Eliminar permanentemente este capítulo?")) return;

    setProcesando(true);
    const { error } = await supabase.from("capitulos").delete().eq("id", selectedCap.id);
    if (!error) {
      setShowEditCapModal(false);
      await refetchCaps(isAdmin);
    } else {
      alert("No se pudo eliminar");
    }
    setProcesando(false);
  };

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <AnimatePresence>
        {(showAddModal || showEditCapModal) && (
          <div className="fixed inset-0 z-120 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModals}
              className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white-custom w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-primary/10"
            >
              <button onClick={closeModals} className="absolute top-8 right-8 text-primary/20 hover:text-primary">
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.3em] italic">
                  {showAddModal ? "Nuevo Capítulo" : "Gestionar Capítulo"}
                </h3>
              </div>

              <form onSubmit={showAddModal ? handleCrearCapitulo : handleUpdateCapitulo} className="space-y-6">
                <input
                  autoFocus
                  type="text"
                  placeholder="TÍTULO..."
                  value={showAddModal ? nuevoTitulo : editCapTitle}
                  onChange={(e) => showAddModal ? setNuevoTitulo(e.target.value) : setEditCapTitle(e.target.value)}
                  className="w-full bg-bg-main border-b-2 border-primary/10 py-4 text-center text-sm font-black text-primary outline-none focus:border-primary uppercase"
                />
                <div className="text-left">
                  <label className="text-[9px] font-black text-primary/40 uppercase ml-2 italic">Fecha de estreno</label>
                  <input
                    type="date"
                    value={showAddModal ? nuevaFecha : editCapFecha}
                    onChange={(e) => showAddModal ? setNuevaFecha(e.target.value) : setEditCapFecha(e.target.value)}
                    className="w-full bg-bg-main border-b-2 border-primary/10 py-3 text-center text-sm font-black text-primary outline-none"
                  />
                </div>

                {showAddModal ? (
                  <button type="submit" disabled={procesando} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-transform disabled:opacity-50">
                    {procesando ? "Sellando..." : "Revelar"}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button type="submit" disabled={procesando} className="bg-primary text-white py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                      <Save size={14} /> Guardar
                    </button>
                    <button type="button" onClick={deleteCapitulo} disabled={procesando} className="bg-red-50 text-red-400 py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 border border-red-100 active:scale-95 transition-transform disabled:opacity-50">
                      <Trash2 size={14} /> Borrar
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => router.push("/wiki/paginas/libros")} className="p-8 text-primary/40 hover:text-primary flex items-center gap-2 font-black text-[10px] uppercase group italic">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver
      </button>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        <aside>
          <div className="aspect-3/4 rounded-[2.5rem] overflow-hidden shadow-2xl border border-primary/10 bg-white-custom relative">
            {loadingLibro ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-primary/20" />
              </div>
            ) : (
              <SmartImage src={libro?.portada_url || "/placeholder-cover.jpg"} alt={libro?.titulo || "Libro"} className="w-full h-full" />
            )}
          </div>
          {!loadingLibro && libro?.fecha_proximo_capitulo && (
            <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <Calendar size={12} /> Próximo Capítulo
              </h4>
              <p className="text-primary font-bold text-sm">
                {new Date(libro.fecha_proximo_capitulo).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
              </p>
            </div>
          )}
        </aside>

        <main>
          <div className="mb-12">
            {loadingLibro ? (
              <div className="space-y-4">
                <div className="h-12 w-3/4 bg-primary/5 animate-pulse rounded-xl" />
                <div className="h-20 w-full bg-primary/5 animate-pulse rounded-xl" />
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-black text-primary italic tracking-tighter leading-[0.9] mb-6 uppercase">
                  {libro?.titulo}
                </h1>
                <p className="text-primary/70 leading-relaxed text-lg font-medium italic">&quot;{libro?.sinopsis}&quot;</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                <ListOrdered size={16} /> Índice
              </h3>
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Plus size={18} />
                </button>
              )}
            </div>

            <div className="grid gap-3">
              {loadingCaps ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="w-full h-24 bg-primary/5 animate-pulse rounded-3xl" />
                ))
              ) : capitulos.length === 0 ? (
                <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
                  Aún no hay capítulos publicados
                </p>
              ) : (
                capitulos.map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => router.push(`/wiki/paginas/libros/${id}/leer/${cap.id}`)}
                    className="w-full flex items-center justify-between p-6 bg-white-custom border border-primary/5 rounded-3xl hover:border-primary/20 transition-all text-left group"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-primary font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform">
                        {cap.orden}. {cap.titulo_capitulo}
                      </span>
                      <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                        {new Date(cap.fecha_publicacion) > new Date() ? "Programado: " : "Publicado: "}
                        {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    {isAdmin ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCap(cap);
                          setEditCapTitle(cap.titulo_capitulo);
                          setEditCapFecha(cap.fecha_publicacion || "");
                          setShowEditCapModal(true);
                        }}
                        className="bg-primary/5 p-2 rounded-xl text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <Edit3 size={16} />
                      </div>
                    ) : (
                      <Play size={14} fill="currentColor" className="text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}