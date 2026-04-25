"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/ui/Motion";
import { User, Sword, Cat, X, Loader2, Music2, ChevronRight, Star, Users } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import {
  ModalDetalle, EntidadCard, EmptyTab,
  type EntidadModal, type Descubrimiento, type ItemInventario,
} from "@/components/paginas/wiki/personal/PersonalComponents";

interface PerfilResumen {
  id: string;
  username: string;
  status?: string;
  avatar_url?: string;
  items_count: number;
  criaturas_count: number;
  personajes_count: number;
}

interface PerfilData {
  id: string;
  username: string;
  status?: string;
  avatar_url?: string;
  descripcion?: string;
  titulo?: string;
  personaje_favorito?: { id: string; nombre: string; img_url?: string } | null;
  mascota?: { id: string; nombre: string; imagen_url?: string } | null;
}

export default function PerfilPublico() {
  const params   = useParams();
  const username = params?.username as string;

  const [perfil, setPerfil]                     = useState<PerfilData | null>(null);
  const [inventario, setInventario]             = useState<ItemInventario[]>([]);
  const [descubrimientos, setDescubrimientos]   = useState<Descubrimiento[]>([]);
  const [otrosPerfiles, setOtrosPerfiles]       = useState<PerfilResumen[]>([]);
  const [cargando, setCargando]                 = useState(true);
  const [notFound, setNotFound]                 = useState(false);
  const [tab, setTab]                           = useState<"items" | "criaturas" | "personajes">("items");
  const [modalD, setModalD]                     = useState<EntidadModal | null>(null);
  const [modalPersonaje, setModalPersonaje]     = useState<Descubrimiento | null>(null);
  const [cancionesPersonaje, setCancionesPersonaje] = useState<any[]>([]);
  const [cargandoCanciones, setCargandoCanciones]   = useState(false);

  useEffect(() => {
    if (!username) return;
    async function cargar() {
      setCargando(true);

      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("id, username, status, avatar_url, descripcion, titulo, personajes:personaje_favorito_id(id, nombre, img_url), mascota:mascota_id(id, nombre, imagen_url)")
        .eq("username", username)
        .maybeSingle();

      if (!perfilData) { setNotFound(true); setCargando(false); return; }
      setPerfil(perfilData as unknown as PerfilData);

      const uid = perfilData.id;

      const { data: invData } = await supabase
        .from("inventario_usuario")
        .select("equipado, items(id, nombre, categoria, imagen_url, descripcion)")
        .eq("perfil_id", uid);
      if (invData) setInventario(invData as unknown as ItemInventario[]);

      const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
        supabase.from("descubrimientos_items")
          .select("fecha_descubrimiento, items:item_id(id, nombre, categoria, imagen_url, descripcion)")
          .eq("perfil_id", uid),
        supabase.from("descubrimientos_criaturas")
          .select("fecha_descubrimiento, criaturas:criatura_id(id, nombre, habitat, alma, imagen_url, descripcion)")
          .eq("perfil_id", uid),
        supabase.from("descubrimientos_personajes")
          .select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url, sobre)")
          .eq("perfil_id", uid),
      ]);

      setDescubrimientos([
        ...(itemsRes.data ?? []).map((r: any) => ({
          tipo: "item" as const,
          entidad_id:           r.items?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre:      r.items?.nombre,
          descripcion: r.items?.descripcion,
          imagen_url:  r.items?.imagen_url,
          categoria:   r.items?.categoria,
        })),
        ...(criaturasRes.data ?? []).map((r: any) => ({
          tipo: "criatura" as const,
          entidad_id:           r.criaturas?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre:      r.criaturas?.nombre,
          descripcion: r.criaturas?.descripcion,
          imagen_url:  r.criaturas?.imagen_url,
          habitat:     r.criaturas?.habitat,
          alma:        r.criaturas?.alma,
        })),
        ...(personajesRes.data ?? []).map((r: any) => ({
          tipo: "personaje" as const,
          entidad_id:           r.personajes?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre:      r.personajes?.nombre,
          descripcion: r.personajes?.sobre,
          imagen_url:  r.personajes?.img_url,
          reino:       r.personajes?.reino,
          especie:     r.personajes?.especie,
        })),
      ]);

      // Cargar otros perfiles para sidebar
      const { data: perfilesData } = await supabase
        .from("perfiles")
        .select("id, username, status, avatar_url")
        .neq("id", uid)
        .order("username");

      if (perfilesData && perfilesData.length > 0) {
        const counts = await Promise.all(perfilesData.map(async (p: any) => {
          const [i, c, pe] = await Promise.all([
            supabase.from("descubrimientos_items").select("id", { count: "exact", head: true }).eq("perfil_id", p.id),
            supabase.from("descubrimientos_criaturas").select("id", { count: "exact", head: true }).eq("perfil_id", p.id),
            supabase.from("descubrimientos_personajes").select("id", { count: "exact", head: true }).eq("perfil_id", p.id),
          ]);
          return {
            ...p,
            items_count:      i.count  ?? 0,
            criaturas_count:  c.count  ?? 0,
            personajes_count: pe.count ?? 0,
          } as PerfilResumen;
        }));
        setOtrosPerfiles(counts);
      }

      setCargando(false);
    }
    cargar();
  }, [username]);

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas  = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc  = descubrimientos.filter(d => d.tipo === "item");

  const handleOpenPersonajeModal = async (d: Descubrimiento) => {
    setCancionesPersonaje([]);
    setModalPersonaje(d);
    if (!d.entidad_id) return;
    setCargandoCanciones(true);
    try {
      const { data, error } = await supabase
        .from("canciones")
        .select("id, titulo, portada_url, info_cancion, links, cantante, idioma, duracion_segundos")
        .eq("personaje_id", d.entidad_id)
        .eq("visible", true);
      if (!error && data) setCancionesPersonaje(data);
      else console.warn("[PerfilPublico] Error canciones:", error);
    } catch (err) {
      console.warn("[PerfilPublico] Error cargando canciones:", err);
    } finally {
      setCargandoCanciones(false);
    }
  };

  const tabs = [
    { id: "items",      label: "Inventario", icon: Sword },
    { id: "criaturas",  label: "Bestiario",  icon: Cat   },
    { id: "personajes", label: "Agenda",     icon: User  },
  ] as const;

  /* ── Loading ── */
  if (cargando) return (
    <div className="flex items-center justify-center min-h-60">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={20} className="animate-spin"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
        <span className="text-[9px] font-black uppercase tracking-[0.3em]"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          Cargando perfil…
        </span>
      </div>
    </div>
  );

  /* ── Not found ── */
  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-60 gap-4">
      <p className="font-serif italic"
        style={{ fontSize: "0.9rem", color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
        "Explorador no encontrado"
      </p>
      <Link href="/wiki/personal"
        className="font-serif italic text-[9px] flex items-center gap-1.5 hover:opacity-70"
        style={{ color: "var(--primary)" }}>
        ← Volver a mi perfil
      </Link>
    </div>
  );

  return (
    <>
      {/* Modal items / criaturas */}
      {modalD && <ModalDetalle entidad={modalD} onClose={() => setModalD(null)} />}

      {/* Modal personaje con canciones — mismo diseño que personal.tsx */}
      <AnimatePresence>
        {modalPersonaje && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setModalPersonaje(null); setCancionesPersonaje([]); }}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.45)" }}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[30rem]"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "0 24px 64px color-mix(in srgb, var(--primary) 18%, transparent), 0 4px 16px color-mix(in srgb, var(--primary) 10%, transparent)",
                maxHeight: "88dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Hero imagen */}
              <div className="w-full shrink-0 overflow-hidden relative"
                style={{
                  height: modalPersonaje.imagen_url ? "200px" : "0px",
                  background: "color-mix(in srgb, var(--primary) 5%, var(--bg-main))",
                }}>
                {modalPersonaje.imagen_url && (
                  <img src={modalPersonaje.imagen_url} alt={modalPersonaje.nombre}
                    className="w-full h-full object-contain" />
                )}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, var(--white-custom) 0%, transparent 55%)" }} />

                {/* Botón cerrar */}
                <button
                  onClick={() => { setModalPersonaje(null); setCancionesPersonaje([]); }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    color: "var(--primary)",
                    background: "color-mix(in srgb, var(--white-custom) 85%, transparent)",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    backdropFilter: "blur(6px)",
                  }}>
                  <X size={13} />
                </button>

                {/* Nombre superpuesto si hay imagen */}
                {modalPersonaje.imagen_url && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                    <h2 className="font-serif italic capitalize leading-tight"
                      style={{ fontSize: "1.75rem", color: "var(--primary)", lineHeight: 1.15 }}>
                      {modalPersonaje.nombre ?? "Personaje"}
                    </h2>
                    {(modalPersonaje.reino || modalPersonaje.especie) && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {modalPersonaje.reino && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                            }}>
                            {modalPersonaje.reino}
                          </span>
                        )}
                        {modalPersonaje.especie && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                            }}>
                            {modalPersonaje.especie}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contenido scrollable */}
              <div className="overflow-y-auto flex-1 px-6 pb-6" style={{ paddingTop: "1.25rem" }}>

                {/* Nombre y tags si NO hay imagen */}
                {!modalPersonaje.imagen_url && (
                  <>
                    {/* Botón cerrar cuando no hay imagen */}
                    <button
                      onClick={() => { setModalPersonaje(null); setCancionesPersonaje([]); }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        color: "var(--primary)",
                        background: "color-mix(in srgb, var(--white-custom) 85%, transparent)",
                        borderRadius: "var(--radius-btn)",
                        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                      }}>
                      <X size={13} />
                    </button>
                    <div className="mb-4">
                      <h2 className="font-serif italic capitalize leading-tight mb-2"
                        style={{ fontSize: "1.75rem", color: "var(--primary)" }}>
                        {modalPersonaje.nombre ?? "Personaje"}
                      </h2>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {modalPersonaje.reino && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                            }}>
                            {modalPersonaje.reino}
                          </span>
                        )}
                        {modalPersonaje.especie && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                            }}>
                            {modalPersonaje.especie}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Descripción */}
                {modalPersonaje.descripcion && (
                  <p className="font-serif italic leading-relaxed mb-5"
                    style={{ fontSize: "0.88rem", color: "color-mix(in srgb, var(--foreground) 68%, transparent)", lineHeight: 1.7 }}>
                    {modalPersonaje.descripcion}
                  </p>
                )}

                {/* Divisor canciones */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  <div className="flex items-center gap-1.5">
                    <Music2 size={10} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
                    <span className="font-serif italic text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                      Canciones
                    </span>
                  </div>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                </div>

                {/* Canciones */}
                {cargandoCanciones ? (
                  <div className="flex items-center gap-2 py-5 justify-center">
                    <Loader2 size={13} className="animate-spin"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                    <span className="font-serif italic text-[9px]"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      Cargando canciones…
                    </span>
                  </div>
                ) : cancionesPersonaje.length === 0 ? (
                  <p className="font-serif italic text-[10px] py-4 text-center"
                    style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    "Este personaje no tiene canciones aún…"
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cancionesPersonaje.map((cancion, i) => (
                      <Link key={cancion.id ?? i} href={`/wiki/canciones/${cancion.id}`}
                        className="group flex items-center gap-3 px-3 py-3 transition-all"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                          border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                          borderRadius: "var(--radius-btn)",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 22%, transparent)";
                          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, var(--white-custom))";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)";
                          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, var(--white-custom))";
                        }}>
                        {cancion.portada_url && !cancion.portada_url.includes("placeholder") ? (
                          <div className="w-11 h-11 shrink-0 overflow-hidden"
                            style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                            <img src={cancion.portada_url} alt={cancion.titulo}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 shrink-0 flex items-center justify-center"
                            style={{
                              borderRadius: "var(--radius-btn)",
                              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                            }}>
                            <Music2 size={14} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-serif italic text-[12px] truncate block group-hover:underline"
                            style={{ color: "var(--primary)" }}>
                            {cancion.titulo ?? `Canción ${i + 1}`}
                          </span>
                          {cancion.info_cancion && (
                            <p className="font-serif italic text-[9px] truncate mt-0.5"
                              style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>
                              {cancion.info_cancion}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={12}
                          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", flexShrink: 0 }}
                          className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* Botón volver a mi perfil */}
      <Link href="/wiki/personal"
        className="fixed top-4 left-4 z-100 flex items-center justify-center w-9 h-9 transition-all hover:scale-110 group"
        style={{
          background: "var(--bg-menu)",
          borderRadius: "50%",
          border: "2px solid color-mix(in srgb, var(--menu-text) 20%, transparent)",
          boxShadow: "var(--shadow-card)",
        }}
        title="Volver a mi perfil">
        <X size={14} style={{ color: "var(--menu-text)", opacity: 0.7 }} />
      </Link>

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-20">

        {/* Contador total */}
        <div className="flex items-center gap-4 py-5 px-2">
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
          <span className="font-serif italic text-[10px] select-none"
            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
            {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length} descubrimientos
          </span>
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
        </div>

        {/* Layout principal */}
        <div className="flex flex-col md:flex-row gap-5 mb-6">

          {/* ── Card de perfil ── */}
          <div className="w-full md:w-56 xl:w-64 shrink-0 md:sticky md:top-16 self-start animate-in fade-in duration-500">
            <div className="mx-4 md:mx-0 relative"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
                outline: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                outlineOffset: "4px",
                border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
              }}>

              {/* Avatar */}
              <div className="text-center pt-5 pb-2 px-5">
                <div className="flex justify-center mb-3">
                  <div className="overflow-hidden flex items-center justify-center"
                    style={{
                      width: 84, height: 84,
                      borderRadius: "var(--radius-btn)",
                      background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
                      border: "2px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                    }}>
                    {perfil?.avatar_url
                      ? <img src={perfil.avatar_url} alt={perfil?.username} className="w-full h-full object-contain" />
                      : <User size={30} style={{ color: "color-mix(in srgb, var(--primary) 15%, transparent)" }} />}
                  </div>
                </div>

                <h1 className="font-serif italic leading-tight mb-1"
                  style={{ fontSize: "1.05rem", color: "var(--primary)", letterSpacing: "0.02em", textTransform: "capitalize" }}>
                  {perfil?.username}
                </h1>
                {perfil?.titulo && (
                  <p className="text-[7px] font-black uppercase tracking-widest mb-0.5"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    {perfil.titulo}
                  </p>
                )}
                <p className="font-serif italic text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                  {perfil?.status ?? "Explorador"}
                </p>
              </div>

              {/* Separador ornamental */}
              <div className="mx-5 my-3 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                <span className="text-[24px]" style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>⚝</span>
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
              </div>

              {/* Stats */}
              <div className="px-5 pb-4 space-y-2">
                {[
                  { icon: <Sword size={11} />, label: "Objetos",   count: inventario.length + misItemsDesc.length },
                  { icon: <Cat  size={11} />, label: "Bestias",   count: misCriaturas.length },
                  { icon: <User size={11} />, label: "Conocidos", count: misPersonajes.length },
                ].map(({ icon, label, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"
                      style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                      {icon}
                      <span className="font-serif italic text-[10px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 42%, transparent)" }}>
                        {label}
                      </span>
                    </div>
                    <span className="flex-1 mx-2 font-serif text-[10px] overflow-hidden text-center"
                      style={{ color: "color-mix(in srgb, var(--primary) 12%, transparent)", letterSpacing: "0.2em" }}>
                      . . . . . .
                    </span>
                    <span className="font-serif italic text-sm tabular-nums" style={{ color: "var(--primary)" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Separador */}
              <div className="mx-5 h-px" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />

              {/* Descripción */}
              <div className="px-5 py-4">
                <p className="font-serif italic text-[8px] mb-2"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Sobre {perfil?.username}
                </p>
                {perfil?.descripcion ? (
                  <p className="font-serif italic leading-relaxed"
                    style={{ fontSize: "0.82rem", color: "color-mix(in srgb, var(--foreground) 72%, transparent)" }}>
                    {perfil.descripcion}
                  </p>
                ) : (
                  <p className="font-serif italic text-[9px]"
                    style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    "Este explorador aún no ha escrito nada sobre sí mismo."
                  </p>
                )}
              </div>

              {/* Separador */}
              <div className="mx-5 h-px" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />

              {/* Personaje favorito + Mascota */}
              <div className="grid grid-cols-2">
                <div className="px-4 py-3">
                  <p className="font-serif italic text-[8px] mb-2"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    Personaje favorito
                  </p>
                  <div className="flex items-center gap-2.5">
                    {perfil?.personaje_favorito ? (
                      <>
                        <div className="w-9 h-9 shrink-0 overflow-hidden"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                          }}>
                          {perfil.personaje_favorito.img_url
                            ? <img src={perfil.personaje_favorito.img_url} alt={perfil.personaje_favorito.nombre}
                                className="w-full h-full object-contain" />
                            : <User size={16} className="m-auto mt-1.5"
                                style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                        </div>
                        <p className="font-serif italic text-[11px] leading-tight capitalize"
                          style={{ color: "var(--primary)" }}>
                          {perfil.personaje_favorito.nombre}
                        </p>
                      </>
                    ) : (
                      <p className="font-serif italic text-[9px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                        Ninguno elegido…
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3"
                  style={{ borderLeft: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <p className="font-serif italic text-[8px] mb-2"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    Mascota
                  </p>
                  <div className="flex items-center gap-2.5">
                    {perfil?.mascota ? (
                      <>
                        <div className="w-9 h-9 shrink-0 overflow-hidden"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                          }}>
                          {perfil.mascota.imagen_url
                            ? <img src={perfil.mascota.imagen_url} alt={perfil.mascota.nombre}
                                className="w-full h-full object-contain" />
                            : <Cat size={16} className="m-auto mt-1.5"
                                style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                        </div>
                        <p className="font-serif italic text-[11px] leading-tight capitalize"
                          style={{ color: "var(--primary)" }}>
                          {perfil.mascota.nombre}
                        </p>
                      </>
                    ) : (
                      <p className="font-serif italic text-[9px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                        Ninguna…
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Colección: tabs + grid ── */}
          <div className="flex-1 min-w-0">

            <div className="px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

              {/* Mobile tabs — dentro del mismo contenedor que el panel para que el borde se fusione */}
              <div className="flex md:hidden">
                {tabs.map(t => {
                  const isActive = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all duration-200"
                      style={{
                        background: isActive
                          ? tab === "items"     ? "color-mix(in srgb, var(--primary) 5%, var(--bg-main))"
                          : tab === "criaturas" ? "color-mix(in srgb, var(--primary) 6%, var(--bg-main))"
                          :                       "color-mix(in srgb, var(--primary) 4%, var(--bg-main))"
                          : "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                        color: isActive ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                        borderBottom: isActive ? "1px solid transparent" : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                        borderRadius: "var(--radius-btn) var(--radius-btn) 0 0",
                        marginBottom: isActive ? "-1px" : "0",
                        zIndex: isActive ? 1 : 0,
                        position: "relative",
                      }}>
                      {isActive && <Star size={8} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />}
                      <t.icon size={11} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Desktop tabs — estilo borde inferior activo */}
              <div className="hidden md:flex items-center justify-between mb-0">
                <div className="flex items-end gap-0"
                  style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                  {tabs.map(t => {
                    const isActive = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className="relative flex items-center gap-2 px-5 py-2.5 transition-all duration-200"
                        style={{
                          background: isActive ? "var(--white-custom)" : "transparent",
                          color: isActive ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
                          borderTop:    isActive ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                          borderLeft:   isActive ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                          borderRight:  isActive ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                          borderBottom: isActive ? "1px solid var(--white-custom)" : "1px solid transparent",
                          borderRadius: "4px 4px 0 0",
                          marginBottom: isActive ? "-1px" : "0",
                        }}>
                        {isActive && <Star size={8} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />}
                        <t.icon size={11} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Contador de entradas */}
                <div className="flex items-center gap-1.5 px-3 py-1.5"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    borderRadius: "2px",
                    background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                  }}>
                  <Star size={8} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] tabular-nums"
                    style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                    {tab === "items" ? inventario.length + misItemsDesc.length
                      : tab === "criaturas" ? misCriaturas.length
                      : misPersonajes.length} entradas
                  </span>
                </div>
              </div>

              {/* Panel de inventario — fondo tintado por tab */}
              <div
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderTop: "none",
                  borderRadius: "0 0 var(--radius-card) var(--radius-card)",
                  background: tab === "items"
                    ? "color-mix(in srgb, var(--primary) 3%, var(--bg-main))"
                    : tab === "criaturas"
                    ? "color-mix(in srgb, var(--primary) 4%, var(--bg-main))"
                    : "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
                  transition: "background 0.25s ease",
                  padding: "16px",
                }}>
                <AnimatePresence mode="wait">
                  <MotionDiv key={tab}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

                    {tab === "items" && (
                      <>
                        {inventario.map((item, i) => (
                          <EntidadCard key={`inv-${i}`}
                            imagen={item.items.imagen_url}
                            nombre={item.items.nombre}
                            sub={item.items.categoria}
                            icono={<Sword size={20} />}
                            onClick={() => setModalD({ tipo: "item_inv", data: item })} />
                        ))}
                        {misItemsDesc.map((d, i) => (
                          <EntidadCard key={`desc-${i}`}
                            imagen={d.imagen_url}
                            nombre={d.nombre ?? "Objeto"}
                            sub={d.categoria ?? "Item"}
                            icono={<Sword size={20} />}
                            onClick={() => setModalD({ tipo: "item", data: d })} />
                        ))}
                        {inventario.length === 0 && misItemsDesc.length === 0 && (
                          <EmptyTab label="Sin items registrados aún" />
                        )}
                      </>
                    )}

                    {tab === "criaturas" && (
                      misCriaturas.length > 0
                        ? misCriaturas.map((d, i) => (
                          <EntidadCard key={i}
                            imagen={d.imagen_url}
                            nombre={d.nombre ?? "Criatura"}
                            sub={d.habitat}
                            icono={<Cat size={20} />}
                            onClick={() => setModalD({ tipo: "criatura", data: d })} />
                        ))
                        : <EmptyTab label="Sin criaturas descubiertas" />
                    )}

                    {tab === "personajes" && (
                      misPersonajes.length > 0
                        ? misPersonajes.map((d, i) => (
                          <EntidadCard key={i}
                            imagen={d.imagen_url}
                            nombre={d.nombre ?? "Contacto"}
                            icono={<User size={20} />}
                            onClick={() => handleOpenPersonajeModal(d)} />
                        ))
                        : <EmptyTab label="Sin registros en la agenda" />
                    )}

                  </MotionDiv>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar desktop: Exploradores ── */}
        {otrosPerfiles.length > 0 && (
          <aside className="hidden lg:flex flex-col gap-0 w-44 xl:w-52 shrink-0 sticky top-24 pt-4 ml-auto -mt-6">

            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              <div className="flex items-center gap-1">
                <Star size={7} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
                <p className="text-[7px] font-black uppercase tracking-[0.3em]"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Exploradores
                </p>
              </div>
              <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
            </div>

            <div className="overflow-hidden"
              style={{
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-card)",
                background: "var(--white-custom)",
              }}>
              {otrosPerfiles.map((p, idx) => (
                <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                  <MotionDiv whileHover={{ x: 2 }}
                    className="flex items-center gap-2.5 px-3 py-3 cursor-pointer transition-colors"
                    style={{
                      borderBottom: idx < otrosPerfiles.length - 1
                        ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
                        : "none",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                    <div className="w-7 h-7 shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        borderRadius: "2px",
                        background: "color-mix(in srgb, var(--primary) 7%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                      }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                        : <User size={11} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-tight truncate capitalize"
                        style={{ color: "var(--primary)" }}>{p.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {[
                          { icon: <Sword size={6} />, n: p.items_count },
                          { icon: <Cat  size={6} />, n: p.criaturas_count },
                          { icon: <User size={6} />, n: p.personajes_count },
                        ].map(({ icon, n }, i) => (
                          <span key={i} className="flex items-center gap-0.5 text-[7px] font-black tabular-nums"
                            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                            {icon}{n}
                          </span>
                        ))}
                      </div>
                    </div>

                    <span className="text-[8px] shrink-0"
                      style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>›</span>
                  </MotionDiv>
                </Link>
              ))}
            </div>
          </aside>
        )}

      </div>
    </>
  );
}