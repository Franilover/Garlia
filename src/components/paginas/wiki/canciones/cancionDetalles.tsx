"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { AlertCircle, User, List, Music } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Btn, Loading } from "@/components/ui";
import { db } from "@/lib/api/client/db";
import {
  LinkSection,
  getLetra,
  type Seccion,
} from "@/components/paginas/wiki/canciones/CancionComponents";

interface PersonajeRef {
  id: string;
  nombre: string;
  img_url?: string | null;
}

interface Cancion {
  id: string;
  titulo: string;
  personaje_id?: string | null;
  personaje?: PersonajeRef | PersonajeRef[] | null;
  estado: string;
  portada_url?: string;
  visible: boolean;
  links?: { titulo: string; url: string }[];
}

function normPersonaje(v: PersonajeRef | PersonajeRef[] | null | undefined): PersonajeRef | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
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

    // Cargar desde Dexie primero para mostrar algo instantáneo
    (async () => {
      try {
        if (db) {
          const [cachedCancion, cachedSecciones] = await Promise.all([
            db.canciones.get(id),
            db.secciones_cancion.where("cancion_id").equals(id).sortBy("orden"),
          ]);
          if (cachedCancion) {
            setCancion(cachedCancion as unknown as Cancion);
            setLoading(false);
          }
          if (cachedSecciones && cachedSecciones.length > 0) {
            setSecciones(cachedSecciones as Seccion[]);
          }
        }
      } catch {}

      // Fetch completo en background (con join de personaje y secciones frescas)
      try {
        const [{ data: c, error: ec }, { data: s, error: es }] = await Promise.all([
          supabase.from("canciones")
            .select("*, personaje:personajes!personaje_id(id, nombre, img_url)")
            .eq("id", id).eq("visible", true).single(),
          supabase
            .from("secciones_cancion")
            .select("id, nombre_seccion, letra_es, letra_en, letra_jp, letra_romaji, orden")
            .eq("cancion_id", id)
            .order("orden", { ascending: true }),
        ]);
        if (ec || !c) { setErrorAcceso(true); setLoading(false); return; }
        if (es) throw es;
        setCancion(c as Cancion);
        setSecciones((s || []) as Seccion[]);
        // Guardar secciones en Dexie para próxima visita
        try {
          if (db && s && s.length > 0) await db.secciones_cancion.bulkPut(s as any);
        } catch {}
      } catch {
        setErrorAcceso(true);
      } finally {
        setLoading(false);
      }
    })();
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

        {}
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

          {(() => {
            const p = normPersonaje(cancion?.personaje);
            if (!p) return null;
            return (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10"
              >
                <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-3 flex items-center gap-2 italic">
                  <User size={12} /> Personaje
                </h4>
                <div className="flex items-center gap-3">
                  {p.img_url && (
                    <img
                      src={p.img_url}
                      alt={p.nombre}
                      className="w-10 h-10 object-cover rounded-[var(--radius-btn)] border border-primary/15 shrink-0"
                    />
                  )}
                  <p className="text-primary font-bold text-sm italic">{p.nombre}</p>
                </div>
              </MotionDiv>
            );
          })()}

          <LinkSection links={cancion?.links} />
        </aside>

        {}
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