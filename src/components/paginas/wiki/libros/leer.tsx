"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { ChevronLeft, List } from "lucide-react";
import { Btn } from "@/components/ui";
import { librosQueries } from "@/lib/api/queries/wiki/libros";

// Subcomponentes extraídos
import { CapituloLista, CapituloScrollItem } from "./leer/types";
import { LectorSkeleton }      from "./leer/ui/LectorSkeleton";
import { IndexPanel }          from "./leer/ui/IndexPanel";
import { CapituloScrollBlock } from "./leer/CapituloScrollBlock";

export default function Lector() {
  const params = useParams();
  const id    = params?.id    as string;
  const capId = params?.capId as string;
  const router = useRouter();

  const [capitulos,      setCapitulos]      = useState<CapituloScrollItem[]>([]);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [showIndex,      setShowIndex]      = useState(false);
  const libroTitulo = capitulos[0]?.libros?.titulo;
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (loading || hasScrolled.current) return;
    hasScrolled.current = true;
    const hashCapId = typeof window !== "undefined" ? window.location.hash.replace("#cap-", "") : "";
    const targetId  = hashCapId || capId;
    setTimeout(() => {
      document.getElementById(`cap-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }, [loading, capId]);

  useEffect(() => {
    if (loading || !capId) return;
    document.getElementById(`cap-${capId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [capId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!capId || !id) return;
    librosQueries.getCapituloParaLectura(capId, id, true)
      .then(async (queryRes) => {
        if (queryRes.error || !queryRes.data) {
          setError(queryRes.error || "No se pudo cargar el capítulo");
          return;
        }
        const lista = queryRes.data.listaCapitulos;
        setListaCapitulos(lista);
        const { data: contenidos } = await supabase
          .from("capitulos")
          .select("id, orden, titulo_capitulo, contenido, fecha_publicacion, personajes_ids, libros(titulo)")
          .in("id", lista.map(c => c.id))
          .order("orden", { ascending: true });
        setCapitulos((contenidos as CapituloScrollItem[]) ?? []);
      })
      .catch((err) => { console.error("Error crítico en Lector:", err); setError("Error al abrir el pergamino"); })
      .finally(() => setLoading(false));
  }, [capId, id]);

  const handleNavigate = useCallback((targetCapId: string) => {
    const el = document.getElementById(`cap-${targetCapId}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); router.replace(`/wiki/libros/${id}/leer/${targetCapId}`, { scroll: false }); }
    else { router.push(`/wiki/libros/${id}/leer/${targetCapId}`); }
  }, [id, router]);

  const handleChapterSelect = useCallback((newCapId: string) => {
    const el = document.getElementById(`cap-${newCapId}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); router.replace(`/wiki/libros/${id}/leer/${newCapId}`, { scroll: false }); }
    else { router.push(`/wiki/libros/${id}/leer/${newCapId}`); }
  }, [id, router]);

  if (loading) return <LectorSkeleton />;
  if (error || capitulos.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">{error || "No hay capítulos disponibles"}</h2>
      <Btn variant="outline" size="sm" onClick={() => router.push(`/wiki/libros/${id}`)}>Volver al índice</Btn>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main text-primary-dark pb-24">
      <IndexPanel open={showIndex} onClose={() => setShowIndex(false)} lista={listaCapitulos} capIdActual={capId} libroTitulo={libroTitulo} onSelect={(newId) => { handleChapterSelect(newId); setShowIndex(false); }} />
      <nav className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push(`/wiki/libros/${id}`)} className="text-primary/40 hover:text-primary transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={() => setShowIndex(true)} className="text-primary/40 hover:text-primary transition-colors"><List size={20} /></button>
        </div>
      </nav>
      {capitulos.map((cap) => (
        <CapituloScrollBlock key={cap.id} cap={cap} onNavigate={handleNavigate} />
      ))}
      <footer className="max-w-2xl mx-auto px-6 pb-20 pt-4 flex flex-col items-center gap-6">
        <button onClick={() => router.push(`/wiki/libros/${id}`)} className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all">
          <List size={16} /> Volver al índice
        </button>
      </footer>
    </div>
  );
}