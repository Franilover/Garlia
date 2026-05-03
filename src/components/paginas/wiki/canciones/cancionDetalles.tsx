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

  const border = "1px solid var(--color-border, color-mix(in srgb, var(--primary) 12%, transparent))";

  return (
    <div className="h-screen overflow-y-auto bg-bg-main">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* ── Header compacto ── */}
        <MotionDiv
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 40 }}
        >
          {/* Portada + título en una fila */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, flexShrink: 0,
              border,
              borderRadius: "var(--radius-btn, 6px)",
              overflow: "hidden",
            }}>
              <SmartImage
                src={cancion?.portada_url || "/placeholder-cover.jpg"}
                alt={cancion?.titulo ?? ""}
                className="w-full h-full object-cover"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.4, marginBottom: 4 }}>
                Canción
              </p>
              <h1 style={{
                fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                fontWeight: 900,
                color: "var(--primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                textTransform: "uppercase",
                fontStyle: "italic",
              }}>
                {cancion?.titulo}
              </h1>
            </div>
          </div>

          {/* Metadatos en línea */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, borderTop: border, borderBottom: border }}>
            {/* Personaje */}
            {(() => {
              const p = normPersonaje(cancion?.personaje);
              if (!p) return null;
              return (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px 8px 0",
                  borderRight: border,
                  marginRight: 16,
                }}>
                  <User size={10} style={{ color: "var(--primary)", opacity: 0.35, flexShrink: 0 }} />
                  {p.img_url && (
                    <img
                      src={p.img_url} alt={p.nombre}
                      style={{ width: 20, height: 20, objectFit: "cover", borderRadius: "var(--radius-btn, 4px)", border, flexShrink: 0 }}
                    />
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", opacity: 0.7 }}>{p.nombre}</span>
                </div>
              );
            })()}

            {/* Links */}
            <div style={{ flex: 1, padding: "8px 0" }}>
              <LinkSection links={cancion?.links} />
            </div>
          </div>
        </MotionDiv>

        {/* ── Letra ── */}
        <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>

          {/* Label sección */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <List size={11} style={{ color: "var(--primary)", opacity: 0.3 }} />
            <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.35 }}>
              Letra
            </span>
          </div>

          {secciones.length > 0 ? (
            <div style={{ border, borderRadius: "var(--radius-card, 8px)", overflow: "hidden" }}>
              {secciones.map((sec, i) => {
                const texto = getLetra(sec, "es");
                if (!texto.trim()) return null;
                return (
                  <div
                    key={sec.id}
                    style={{
                      padding: "28px 32px",
                      borderTop: i > 0 ? border : undefined,
                    }}
                  >
                    {sec.nombre_seccion && (
                      <p style={{
                        fontSize: 9,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--primary)",
                        opacity: 0.3,
                        marginBottom: 12,
                      }}>
                        {sec.nombre_seccion}
                      </p>
                    )}
                    <p style={{
                      fontSize: "1.05rem",
                      fontFamily: "var(--font-lora, serif)",
                      fontStyle: "italic",
                      lineHeight: 2,
                      color: "var(--primary)",
                      opacity: 0.85,
                      whiteSpace: "pre-wrap",
                      margin: 0,
                    }}>
                      {texto}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              border, borderStyle: "dashed",
              borderRadius: "var(--radius-card, 8px)",
              padding: "64px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            }}>
              <Music size={28} style={{ color: "var(--primary)", opacity: 0.15 }} />
              <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.25 }}>
                Letra en proceso
              </p>
            </div>
          )}
        </MotionDiv>

      </div>
    </div>
  );
}