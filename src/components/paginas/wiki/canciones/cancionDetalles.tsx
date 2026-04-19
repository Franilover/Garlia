"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { AlertCircle, User, List, Music } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Btn, Loading } from "@/components/ui";
import {
  LinkSection,
  getLetra,
  type Seccion,
} from "@/components/paginas/wiki/canciones/CancionComponents";

interface Cancion {
  id: string;
  titulo: string;
  personaje?: string;
  estado: string;
  portada_url?: string;
  visible: boolean;
  links?: { titulo: string; url: string }[];
}

export default function CancionDetallesPage() {
  const params = useParams();
  const router = useRouter();
  const id     = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

  const [cancion,     setCancion]     = useState<Cancion | null>(null);
  const [secciones,   setSecciones]   = useState<Seccion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [errorAcceso, setErrorAcceso] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("canciones").select("*").eq("id", id).eq("visible", true).single(),
      supabase
        .from("secciones_cancion")
        .select("id, nombre_seccion, letra_es, letra_en, letra_jp, letra_romaji, orden")
        .eq("cancion_id", id)
        .order("orden", { ascending: true }),
    ]).then(([{ data: c, error: ec }, { data: s, error: es }]) => {
      if (ec || !c) { setErrorAcceso(true); return; }
      if (es) throw es;
      setCancion(c as Cancion);
      setSecciones((s || []) as Seccion[]);
    }).catch(() => setErrorAcceso(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading text="Cargando..." />;
  if (errorAcceso) return (
    <div className="h-screen flex items-center justify-center bg-bg-main flex-col gap-4 text-center px-6">
      <AlertCircle className="text-red-400" size={48} />
      <p className="text-primary uppercase text-[10px] tracking-widest italic font-black">Canción no encontrada</p>
      <Btn onClick={() => router.push("/wiki/canciones")} className="mt-4 rounded-full">Volver</Btn>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <br />
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4">

        {/* ── Sidebar ── */}
        <aside className="space-y-6">
          <MotionDiv
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10"
          >
            <SmartImage
              src={cancion?.portada_url || "/placeholder-cover.jpg"}
              alt={cancion?.titulo ?? ""}
              className="w-full h-full object-cover"
            />
          </MotionDiv>

          {cancion?.personaje && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10"
            >
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <User size={12} /> Personaje
              </h4>
              <p className="text-primary font-bold text-sm italic">{cancion.personaje}</p>
            </MotionDiv>
          )}

          <LinkSection links={cancion?.links} />
        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-primary italic tracking-tighter leading-[0.85] mb-6 uppercase">
              {cancion?.titulo}
            </h1>
          </MotionDiv>

          <div className="flex items-center mb-8 border-b border-primary/10 pb-4">
            <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
              <List size={16} /> Letra
            </h3>
          </div>

          {secciones.length > 0 ? (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white-custom border border-primary/5 rounded-[var(--radius-card)] p-10 md:p-14"
            >
              {secciones.map((sec, i) => {
                const texto = getLetra(sec, "es");
                if (!texto.trim()) return null;
                return (
                  <p
                    key={sec.id}
                    className={`text-primary text-xl md:text-2xl font-serif italic leading-[1.9] opacity-90 whitespace-pre-wrap ${i > 0 ? "mt-10" : ""}`}
                  >
                    {texto}
                  </p>
                );
              })}
            </MotionDiv>
          ) : (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 bg-primary/5 rounded-[var(--radius-card)] border border-dashed border-primary/10"
            >
              <Music size={48} className="mx-auto text-primary/20 mb-4" />
              <p className="text-primary/40 font-bold uppercase text-sm tracking-widest italic">Letra en proceso…</p>
            </MotionDiv>
          )}
        </main>
      </div>
    </div>
  );
}