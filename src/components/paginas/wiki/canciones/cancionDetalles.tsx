"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { AlertCircle, Music, ExternalLink, ChevronLeft } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Btn, Loading } from "@/components/ui";
import { db } from "@/lib/api/client/db";
import {
  getLetra,
  type Seccion,
} from "@/components/paginas/wiki/canciones/CancionComponents";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 680px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

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
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [cancion, setCancion] = useState<Cancion | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!id) return;

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

      try {
        const [{ data: c, error: ec }, { data: s, error: es }] = await Promise.all([
          supabase
            .from("canciones")
            .select("*, personaje:personajes!personaje_id(id, nombre, img_url)")
            .eq("id", id)
            .eq("visible", true)
            .single(),
          supabase
            .from("secciones_cancion")
            .select("id, nombre_seccion, letra_es, letra_en, letra_jp, letra_romaji, orden")
            .eq("cancion_id", id)
            .order("orden", { ascending: true }),
        ]);
        if (ec || !c) {
          setErrorAcceso(true);
          setLoading(false);
          return;
        }
        if (es) throw es;
        setCancion(c as Cancion);
        setSecciones((s || []) as Seccion[]);
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

  if (errorAcceso)
    return (
      <div className="h-screen flex items-center justify-center bg-bg-main flex-col gap-4 text-center px-6">
        <AlertCircle className="text-red-400" size={48} />
        <p className="text-primary uppercase text-[10px] tracking-widest italic font-black">
          Canción no encontrada
        </p>
        <Btn onClick={() => router.push("/wiki/canciones")} className="mt-4 rounded-full">
          Volver
        </Btn>
      </div>
    );

  const personaje = normPersonaje(cancion?.personaje);
  const border = "1px solid var(--color-border, color-mix(in srgb, var(--primary) 12%, transparent))";

  if (isMobile) {
    return (
      <div
        style={{
          height: "100%",
          background: "var(--bg-main)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Hero: imagen a pantalla completa con overlay */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", flexShrink: 0 }}>
          <SmartImage
            src={cancion?.portada_url || "/placeholder-cover.jpg"}
            alt={cancion?.titulo ?? ""}
            className="w-full h-full object-cover"
          />
          {/* Degradado oscuro bottom */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 30%, color-mix(in srgb, var(--bg-main) 85%, transparent) 100%)",
              pointerEvents: "none",
            }}
          />
          {/* Botón volver flotante */}
          <button
            onClick={() => router.push("/wiki/canciones")}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: "color-mix(in srgb, var(--bg-main) 70%, transparent)",
              backdropFilter: "blur(8px)",
              border,
              borderRadius: "var(--radius-btn, 6px)",
              padding: "6px 10px 6px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              color: "var(--primary)",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            <ChevronLeft size={12} />
            Volver
          </button>
        </div>

        {/* Ficha: título + personaje + links */}
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            padding: "20px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Label + Título */}
          <div>
            <h1
              style={{
                fontSize: "clamp(1.6rem, 7vw, 2.2rem)",
                fontWeight: 900,
                color: "var(--primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                textTransform: "uppercase",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              {cancion?.titulo}
            </h1>
          </div>

          {/* Personaje */}
          {personaje && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {personaje.img_url && (
                <img
                  src={personaje.img_url}
                  alt={personaje.nombre}
                  style={{
                    width: 30,
                    height: 30,
                    objectFit: "cover",
                    borderRadius: "var(--radius-btn, 4px)",
                    border,
                    flexShrink: 0,
                  }}
                />
              )}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", opacity: 0.8, margin: 0 }}>
                  {personaje.nombre}
                </p>
              </div>
            </div>
          )}

          {/* Links — fila horizontal scrolleable */}
          {cancion?.links && cancion.links.length > 0 && (
            <div style={{ paddingTop: 14,  }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollbarWidth: "none",
                }}
              >
                {cancion.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 12px",
                      border,
                      borderRadius: "var(--radius-btn, 20px)",
                      textDecoration: "none",
                      color: "var(--primary)",
                      fontSize: 10.5,
                      fontWeight: 600,
                      opacity: 0.7,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {link.titulo}
                    <ExternalLink size={9} style={{ opacity: 0.5 }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </MotionDiv>

        {/* Separador con label "Letra" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "28px 24px 0",
            paddingBottom: 16,
          }}
        >
          <Music size={10} style={{ color: "var(--primary)", opacity: 0.3 }} />
          <span
            style={{
              fontSize: 8.5,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--primary)",
              opacity: 0.3,
            }}
          >
            Letra
          </span>
        </div>

        {/* Letra */}
        <div style={{ padding: "0 24px", flex: 1 }}>
          {secciones.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {secciones.map((sec, i) => {
                const texto = getLetra(sec, "es");
                if (!texto.trim()) return null;
                return (
                  <MotionDiv
                    key={sec.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
                    style={{ padding: "24px 0",  }}
                  >
                    {sec.nombre_seccion && (
                      <p
                        style={{
                          fontSize: 8,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--primary)",
                          opacity: 0.25,
                          marginBottom: 12,
                        }}
                      >
                        {sec.nombre_seccion}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: "1rem",
                        fontFamily: "var(--font-lora, serif)",
                        fontStyle: "italic",
                        lineHeight: 2.1,
                        color: "var(--primary)",
                        opacity: 0.85,
                        whiteSpace: "pre-wrap",
                        margin: 0,
                      }}
                    >
                      {texto}
                    </p>
                  </MotionDiv>
                );
              })}
              <div style={{ height: 60 }} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                height: "30vh",
              }}
            >
              <Music size={28} style={{ color: "var(--primary)", opacity: 0.12 }} />
              <p
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--primary)",
                  opacity: 0.2,
                }}
              >
                Letra en proceso
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-main)",
        display: "flex",
      }}
    >
      {/* ── Columna izquierda: 50%, scrolleable ── */}
      <MotionDiv
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          flex: "0 0 50%",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflowY: "auto",
          padding: "40px clamp(24px, 4vw, 56px)",
          gap: 28,
        }}
      >
        {/* Volver */}
        <div>
          <button
            onClick={() => router.push("/wiki/canciones")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--primary)",
              opacity: 0.3,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
          >
            ← Volver
          </button>
        </div>

        {/* Imagen de portada — centrada con márgenes */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "clamp(180px, 55%, 320px)",
              aspectRatio: "1 / 1",
              overflow: "hidden",
              position: "relative",
              borderRadius: "var(--radius-btn, 8px)",
              border,
              flexShrink: 0,
            }}
          >
            <SmartImage
              src={cancion?.portada_url || "/placeholder-cover.jpg"}
              alt={cancion?.titulo ?? ""}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Label + Título */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 2.8vw, 2rem)",
              fontWeight: 900,
              color: "var(--primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              textTransform: "uppercase",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            {cancion?.titulo}
          </h1>
        </div>

        {/* Personaje */}
        {personaje && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              paddingTop: 20,
            }}
          >
            {personaje.img_url && (
              <img
                src={personaje.img_url}
                alt={personaje.nombre}
                style={{
                  width: 32,
                  height: 32,
                  objectFit: "cover",
                  borderRadius: "var(--radius-btn, 4px)",
                  border,
                  flexShrink: 0,
                }}
              />
            )}
            <div>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--primary)",
                  opacity: 0.8,
                  margin: 0,
                }}
              >
                {personaje.nombre}
              </p>
            </div>
          </div>
        )}

        {/* Links */}
        {cancion?.links && cancion.links.length > 0 && (
          <div style={{ paddingTop: 20, }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cancion.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    border,
                    borderRadius: "var(--radius-btn, 6px)",
                    textDecoration: "none",
                    color: "var(--primary)",
                    fontSize: 11,
                    fontWeight: 600,
                    opacity: 0.7,
                    transition: "opacity 0.15s",
                    gap: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {link.titulo}
                  </span>
                  <ExternalLink size={10} style={{ flexShrink: 0, opacity: 0.5 }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </MotionDiv>

      {/* ── Columna derecha: letra, scrolleable ── */}
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          flex: 1,
          overflowY: "auto",
          height: "100%",
          padding: "48px clamp(24px, 4vw, 64px)",
        }}
      >
        {/* Header de sección */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 20,
          }}
        >
          <Music size={11} style={{ color: "var(--primary)", opacity: 0.3 }} />
          <span
            style={{
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--primary)",
              opacity: 0.3,
            }}
          >
            Letra
          </span>
        </div>

        {secciones.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {secciones.map((sec, i) => {
              const texto = getLetra(sec, "es");
              if (!texto.trim()) return null;
              return (
                <MotionDiv
                  key={sec.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                >
                  {sec.nombre_seccion && (
                    <p
                      style={{
                        fontSize: 8.5,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--primary)",
                        opacity: 0.25,
                        marginBottom: 14,
                      }}
                    >
                      {sec.nombre_seccion}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: "1.08rem",
                      fontFamily: "var(--font-lora, serif)",
                      fontStyle: "italic",
                      lineHeight: 2.1,
                      color: "var(--primary)",
                      opacity: 0.85,
                      whiteSpace: "pre-wrap",
                      margin: 0,
                    }}
                  >
                    {texto}
                  </p>
                </MotionDiv>
              );
            })}
            {/* Espacio final */}
            <div style={{ height: 80 }} />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              height: "50vh",
            }}
          >
            <Music size={32} style={{ color: "var(--primary)", opacity: 0.12 }} />
            <p
              style={{
                fontSize: 9.5,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--primary)",
                opacity: 0.2,
              }}
            >
              Letra en proceso
            </p>
          </div>
        )}
      </MotionDiv>
    </div>
  );
}