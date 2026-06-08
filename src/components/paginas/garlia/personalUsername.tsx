"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/ui/Motion";
import { User, Sword, Cat, X, Loader2, Music2, ChevronRight, Star, MapPin } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import {
  ModalDetalle, EntidadCard, EmptyTab,
  type EntidadModal, type Descubrimiento, type ItemInventario,
} from "@/components/paginas/garlia/PersonalComponents";

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

interface PersonalUsernameProps {
  username: string;
}

export default function PersonalUsername({ username }: PersonalUsernameProps) {
  const [perfil, setPerfil]                         = useState<PerfilData | null>(null);
  const [inventario, setInventario]                 = useState<ItemInventario[]>([]);
  const [descubrimientos, setDescubrimientos]       = useState<Descubrimiento[]>([]);
  const [otrosPerfiles, setOtrosPerfiles]           = useState<PerfilResumen[]>([]);
  const [cargando, setCargando]                     = useState(true);
  const [notFound, setNotFound]                     = useState(false);
  const [tab, setTab]                               = useState<"items" | "criaturas" | "personajes" | "reinos">("personajes");
  const [modalD, setModalD]                         = useState<EntidadModal | null>(null);
  const [modalPersonaje, setModalPersonaje]         = useState<Descubrimiento | null>(null);
  const [cancionesPersonaje, setCancionesPersonaje] = useState<any[]>([]);
  const [cargandoCanciones, setCargandoCanciones]   = useState(false);
  const [reinos, setReinos]                         = useState<{ id: string; nombre: string; mapa_url?: string | null; descripcion?: string | null }[]>([]);
  const [ciudades, setCiudades]                     = useState<{ id: string; nombre: string; imagen_url?: string | null; descripcion?: string | null; reino_id?: string | null }[]>([]);
  const [ciudadesReino, setCiudadesReino]           = useState<typeof ciudades>([]);

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

      const [itemsRes, criaturasRes, personajesRes, reinosRes, ciudadesRes] = await Promise.all([
        supabase.from("descubrimientos_items")
          .select("fecha_descubrimiento, items:item_id(id, nombre, categoria, imagen_url, descripcion)")
          .eq("perfil_id", uid),
        supabase.from("descubrimientos_criaturas")
          .select("fecha_descubrimiento, criaturas:criatura_id(id, nombre, habitat, alma, imagen_url, descripcion)")
          .eq("perfil_id", uid),
        supabase.from("descubrimientos_personajes")
          .select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url, sobre)")
          .eq("perfil_id", uid),
        supabase.from("descubrimientos_reinos")
          .select("fecha_descubrimiento, reino_data:reino_id(id, nombre, mapa_url, descripcion)")
          .eq("perfil_id", uid),
        supabase.from("ciudades_desbloqueadas")
          .select("ciudad_data:ciudad_id(id, nombre, imagen_url, descripcion, reino_id)")
          .eq("user_id", uid),
      ]);

      const reinosData = (reinosRes.data ?? []).map((r: any) => ({
        id:          r.reino_data?.id,
        nombre:      r.reino_data?.nombre,
        mapa_url:    r.reino_data?.mapa_url,
        descripcion: r.reino_data?.descripcion,
      })).filter((r: any) => r.id);
      setReinos(reinosData);

      const ciudadesData = (ciudadesRes.data ?? []).map((r: any) => ({
        id:          r.ciudad_data?.id,
        nombre:      r.ciudad_data?.nombre,
        imagen_url:  r.ciudad_data?.imagen_url,
        descripcion: r.ciudad_data?.descripcion,
        reino_id:    r.ciudad_data?.reino_id ?? null,
      })).filter((l: any) => l.id);
      setCiudades(ciudadesData);

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
          return { ...p, items_count: i.count ?? 0, criaturas_count: c.count ?? 0, personajes_count: pe.count ?? 0 } as PerfilResumen;
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
    } catch (err) {
      console.warn("[PersonalUsername] Error cargando canciones:", err);
    } finally {
      setCargandoCanciones(false);
    }
  };

  const tabs = [
    { id: "personajes", label: "Agenda",     icon: User    },
    { id: "criaturas",  label: "Bestiario",  icon: Cat     },
    { id: "items",      label: "Inventario", icon: Sword   },
    { id: "reinos",     label: "Mapa",       icon: MapPin  },
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
      <Link href="/garlia/personal"
        className="font-serif italic text-[9px] flex items-center gap-1.5 hover:opacity-70"
        style={{ color: "var(--primary)" }}>
        ← Volver a mi perfil
      </Link>
    </div>
  );

  return (
    <>
      {/* Modales: items, criaturas, ciudades */}
      {modalD && modalD.tipo !== "reino" && (
        <ModalDetalle entidad={modalD} onClose={() => setModalD(null)} />
      )}

      {/* Modal custom para reinos con ciudades */}
      <AnimatePresence>
        {modalD && modalD.tipo === "reino" && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setModalD(null); setCiudadesReino([]); }}
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
                  height: (modalD.data.imagen_url || modalD.data.img_url) ? "220px" : "80px",
                  background: "color-mix(in srgb, var(--primary) 6%, var(--bg-main))",
                }}>
                {/* Mapa de fondo */}
                {modalD.data.imagen_url && (
                  <img src={modalD.data.imagen_url} alt={modalD.data.nombre}
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.35 }} />
                )}
                {/* Logo centrado encima */}
                {modalD.data.img_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={modalD.data.img_url} alt={`Logo ${modalD.data.nombre}`}
                      className="object-contain drop-shadow-lg transition-transform duration-700 hover:scale-105"
                      style={{ maxHeight: "140px", maxWidth: "60%" }} />
                  </div>
                )}
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, var(--white-custom) 0%, color-mix(in srgb, var(--white-custom) 20%, transparent) 50%, transparent 100%)"
                }} />
                <button
                  onClick={() => { setModalD(null); setCiudadesReino([]); }}
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
                {(modalD.data.imagen_url || modalD.data.img_url) && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                    <h2 className="font-serif italic capitalize leading-tight"
                      style={{ fontSize: "1.75rem", color: "var(--primary)", lineHeight: 1.15 }}>
                      {modalD.data.nombre ?? "Reino"}
                    </h2>
                  </div>
                )}
              </div>

              <div className="overflow-y-auto flex-1 px-6 pb-6" style={{ paddingTop: "1.25rem" }}>
                {!modalD.data.imagen_url && !modalD.data.img_url && (
                  <h2 className="font-serif italic capitalize leading-tight mb-4"
                    style={{ fontSize: "1.75rem", color: "var(--primary)" }}>
                    {modalD.data.nombre ?? "Reino"}
                  </h2>
                )}
                {modalD.data.descripcion && (
                  <p className="font-serif italic leading-relaxed mb-5"
                    style={{ fontSize: "0.88rem", color: "color-mix(in srgb, var(--foreground) 68%, transparent)", lineHeight: 1.7 }}>
                    {modalD.data.descripcion}
                  </p>
                )}

                {/* Sección de ciudades del reino */}
                {ciudadesReino.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
                        <span className="font-serif italic text-[9px] font-black uppercase tracking-widest"
                          style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                          Ciudades
                        </span>
                      </div>
                      <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                    </div>

                    <div className="flex flex-col gap-2">
                      {ciudadesReino.map((lugar, i) => (
                        <button
                          key={lugar.id ?? i}
                          onClick={() => {
                            setModalD(null);
                            setCiudadesReino([]);
                            setTimeout(() => setModalD({ tipo: "ciudad", data: {
                              tipo: "item",
                              entidad_id: lugar.id,
                              nombre: lugar.nombre,
                              imagen_url: lugar.imagen_url ?? undefined,
                              descripcion: lugar.descripcion ?? undefined,
                              fecha_descubrimiento: "",
                            }}), 120);
                          }}
                          className="group flex items-center gap-3 px-3 py-3 transition-all text-left w-full"
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
                          {lugar.imagen_url ? (
                            <div className="w-11 h-11 shrink-0 overflow-hidden"
                              style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                              <img src={lugar.imagen_url} alt={lugar.nombre}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 shrink-0 flex items-center justify-center"
                              style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                              <MapPin size={14} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-serif italic text-[12px] truncate block group-hover:underline"
                              style={{ color: "var(--primary)" }}>
                              {lugar.nombre}
                            </span>
                            {lugar.descripcion && (
                              <span className="text-[9px] font-black uppercase tracking-wider truncate block mt-0.5"
                                style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                                {lugar.descripcion.slice(0, 60)}{lugar.descripcion.length > 60 ? "…" : ""}
                              </span>
                            )}
                          </div>
                          <ChevronRight size={13} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", flexShrink: 0 }}
                            className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* Modal personaje */}
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
                boxShadow: "0 24px 64px color-mix(in srgb, var(--primary) 18%, transparent)",
                maxHeight: "88dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}>
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
                            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)", borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                            {modalPersonaje.reino}
                          </span>
                        )}
                        {modalPersonaje.especie && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)", borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
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
                {!modalPersonaje.imagen_url && (
                  <>
                    <button
                      onClick={() => { setModalPersonaje(null); setCancionesPersonaje([]); }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
                      style={{ color: "var(--primary)", background: "color-mix(in srgb, var(--white-custom) 85%, transparent)", borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                      <X size={13} />
                    </button>
                    <div className="mb-4">
                      <h2 className="font-serif italic capitalize leading-tight mb-2"
                        style={{ fontSize: "1.75rem", color: "var(--primary)" }}>
                        {modalPersonaje.nombre ?? "Personaje"}
                      </h2>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {modalPersonaje.reino && <span className="font-serif italic text-[9px] px-2 py-0.5" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>{modalPersonaje.reino}</span>}
                        {modalPersonaje.especie && <span className="font-serif italic text-[9px] px-2 py-0.5" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>{modalPersonaje.especie}</span>}
                      </div>
                    </div>
                  </>
                )}
                {modalPersonaje.descripcion && (
                  <p className="font-serif italic leading-relaxed mb-5"
                    style={{ fontSize: "0.88rem", color: "color-mix(in srgb, var(--foreground) 68%, transparent)", lineHeight: 1.7 }}>
                    {modalPersonaje.descripcion}
                  </p>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  <div className="flex items-center gap-1.5">
                    <Music2 size={10} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
                    <span className="font-serif italic text-[9px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>Canciones</span>
                  </div>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                </div>
                {cargandoCanciones ? (
                  <div className="flex items-center gap-2 py-5 justify-center">
                    <Loader2 size={13} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                    <span className="font-serif italic text-[9px]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Cargando canciones…</span>
                  </div>
                ) : cancionesPersonaje.length === 0 ? (
                  <p className="font-serif italic text-[10px] py-4 text-center" style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>"Este personaje no tiene canciones aún…"</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cancionesPersonaje.map((cancion, i) => (
                      <Link key={cancion.id ?? i} href={`/garlia/canciones/${cancion.id}`}
                        className="group flex items-center gap-3 px-3 py-3 transition-all"
                        style={{ background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", borderRadius: "var(--radius-btn)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 22%, transparent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, var(--white-custom))"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, var(--white-custom))"; }}>
                        {cancion.portada_url && !cancion.portada_url.includes("placeholder") ? (
                          <div className="w-11 h-11 shrink-0 overflow-hidden" style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                            <img src={cancion.portada_url} alt={cancion.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 shrink-0 flex items-center justify-center" style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                            <Music2 size={14} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-serif italic text-[12px] truncate block group-hover:underline" style={{ color: "var(--primary)" }}>{cancion.titulo ?? `Canción ${i + 1}`}</span>
                          {cancion.info_cancion && <p className="font-serif italic text-[9px] truncate mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>{cancion.info_cancion}</p>}
                        </div>
                        <ChevronRight size={12} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", flexShrink: 0 }} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* Botón volver */}
      <Link href="/garlia/personal"
        className="fixed top-4 left-4 z-[100] flex items-center justify-center w-9 h-9 transition-all hover:scale-110"
        style={{ background: "var(--bg-menu)", borderRadius: "50%", border: "2px solid color-mix(in srgb, var(--menu-text) 20%, transparent)", boxShadow: "var(--shadow-card)" }}
        title="Volver a mi perfil">
        <X size={14} style={{ color: "var(--menu-text)", opacity: 0.7 }} />
      </Link>

      {/* ═══════════════════════════════════════════
          HERO HEADER
      ═══════════════════════════════════════════ */}
      <div className="w-full animate-in fade-in duration-500">

        {/* Banda de color con degradado */}
        <div className="relative w-full overflow-hidden"
          style={{
            height: 96,
            background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, var(--bg-main)) 0%, color-mix(in srgb, var(--primary) 8%, var(--bg-main)) 60%, color-mix(in srgb, var(--primary) 4%, var(--bg-main)) 100%)",
            borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-[0.06]"
              style={{ background: "var(--primary)" }} />
            <div className="absolute top-2 right-1/4 w-24 h-24 rounded-full opacity-[0.04]"
              style={{ background: "var(--primary)" }} />
            <div className="absolute -bottom-6 left-1/3 w-32 h-32 rounded-full opacity-[0.04]"
              style={{ background: "var(--primary)" }} />
          </div>
        </div>

        {/* Zona identidad: avatar sobresaliente + nombre */}
        <div className="px-6 md:px-10 flex items-end gap-5 md:gap-7"
          style={{ marginTop: "-52px", paddingBottom: "20px" }}>

          {/* Avatar circular */}
          <div className="relative shrink-0"
            style={{
              width: 104, height: 104,
              borderRadius: "50%",
              overflow: "hidden",
              background: "color-mix(in srgb, var(--primary) 8%, var(--bg-main))",
              border: "3px solid var(--bg-main)",
              boxShadow: "0 4px 20px color-mix(in srgb, var(--primary) 14%, transparent)",
              flexShrink: 0,
            }}>
            {perfil?.avatar_url
              ? <img src={perfil.avatar_url} alt={perfil?.username} className="w-full h-full object-contain" />
              : <User size={38} className="absolute inset-0 m-auto" style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />}
          </div>

          {/* Nombre + título + status */}
          <div className="flex flex-col gap-1 pb-1" style={{ paddingTop: "56px" }}>
            <h1 className="font-serif italic leading-none capitalize"
              style={{ fontSize: "1.65rem", color: "var(--primary)", letterSpacing: "0.01em" }}>
              {perfil?.username}
            </h1>
            {perfil?.titulo && (
              <p className="text-[8px] font-black uppercase tracking-[0.28em]"
                style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                {perfil.titulo}
              </p>
            )}
            <p className="font-serif italic text-[10px]"
              style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
              {perfil?.status ?? "Explorador"}
            </p>
          </div>
        </div>

        {/* Separador decorativo */}
        <div className="px-6 md:px-10 flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
          <span className="text-[18px]" style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>⚝</span>
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
        </div>

        {/* Info rápida: descripción + fav + mascota */}
        <div className="px-6 md:px-10 pb-6 flex flex-wrap gap-6 items-start">

          {perfil?.descripcion && (
            <p className="font-serif italic leading-relaxed flex-1 min-w-[160px]"
              style={{ fontSize: "0.85rem", color: "color-mix(in srgb, var(--foreground) 62%, transparent)", maxWidth: 480 }}>
              {perfil.descripcion}
            </p>
          )}

          {perfil?.personaje_favorito && (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col gap-0.5">
                <p className="text-[7px] font-black uppercase tracking-[0.22em]"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Personaje favorito
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 overflow-hidden shrink-0"
                    style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                    {perfil.personaje_favorito.img_url
                      ? <img src={perfil.personaje_favorito.img_url} alt={perfil.personaje_favorito.nombre} className="w-full h-full object-contain" />
                      : <User size={14} className="m-auto mt-1" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                  </div>
                  <p className="font-serif italic text-[11px] capitalize" style={{ color: "var(--primary)" }}>
                    {perfil.personaje_favorito.nombre}
                  </p>
                </div>
              </div>
            </div>
          )}

          {perfil?.mascota && (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col gap-0.5">
                <p className="text-[7px] font-black uppercase tracking-[0.22em]"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Mascota
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 overflow-hidden shrink-0"
                    style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                    {perfil.mascota.imagen_url
                      ? <img src={perfil.mascota.imagen_url} alt={perfil.mascota.nombre} className="w-full h-full object-contain" />
                      : <Cat size={14} className="m-auto mt-1" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                  </div>
                  <p className="font-serif italic text-[11px] capitalize" style={{ color: "var(--primary)" }}>
                    {perfil.mascota.nombre}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats inline */}
          <div className="flex items-center gap-4 ml-auto self-end pb-0.5">
            {[
              { icon: <User size={10} />,  label: "Conocidos", count: misPersonajes.length },
              { icon: <Cat  size={10} />,  label: "Bestias",   count: misCriaturas.length },
              { icon: <Sword size={10} />, label: "Objetos",   count: inventario.length + misItemsDesc.length },
            ].map(({ icon, label, count }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="font-serif italic tabular-nums" style={{ fontSize: "1.05rem", color: "var(--primary)" }}>{count}</span>
                <div className="flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  {icon}
                  <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════
          CONTENIDO PRINCIPAL
      ═══════════════════════ */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-20">

        <div className="flex items-center gap-4 py-3 px-2">
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
          <span className="font-serif italic text-[10px] select-none"
            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
            {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length} descubrimientos
          </span>
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
        </div>

        <div className="flex flex-col md:flex-row gap-5 mb-6">

          {/* ── Colección: tabs + grid ── */}
          <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

            {/* Mobile tabs */}
            <div className="flex md:hidden w-full"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              {tabs.map(t => {
                const isActive = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all duration-200"
                    style={{
                      background: isActive ? "color-mix(in srgb, var(--primary) 2%, var(--bg-main))" : "transparent",
                      color: isActive ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
                      borderTop:    isActive ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                      borderLeft:   isActive ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                      borderRight:  isActive ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                      borderBottom: isActive ? "1px solid color-mix(in srgb, var(--primary) 2%, var(--bg-main))" : "1px solid transparent",
                      borderRadius: "4px 4px 0 0",
                      marginBottom: isActive ? "-1px" : "0",
                      zIndex: isActive ? 2 : 1,
                      position: "relative",
                    }}>
                    <t.icon size={11} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center justify-between mb-0">
              <div className="flex items-end gap-0 w-full"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                {tabs.map(t => {
                  const isActive = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="relative flex flex-1 items-center justify-center gap-2 px-5 py-2.5 transition-all duration-200"
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
                      <t.icon size={11} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5"
                style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: "2px", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <Star size={8} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                <span className="text-[8px] font-black uppercase tracking-[0.22em] tabular-nums"
                  style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                  {tab === "items" ? inventario.length + misItemsDesc.length : tab === "criaturas" ? misCriaturas.length : tab === "reinos" ? reinos.length : misPersonajes.length} entradas
                </span>
              </div>
            </div>

            {/* Panel colección */}
            <div style={{
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderTop: "none",
              borderRadius: "0 0 var(--radius-card) var(--radius-card)",
              background: tab === "items" ? "color-mix(in srgb, var(--primary) 3%, var(--bg-main))"
                : tab === "criaturas" ? "color-mix(in srgb, var(--primary) 4%, var(--bg-main))"
                : "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
              transition: "background 0.25s ease",
              padding: "16px",
            }}>
              <AnimatePresence mode="wait">
                <MotionDiv key={tab}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">

                  {tab === "items" && (
                    <>
                      {inventario.map((item, i) => (
                        <EntidadCard key={`inv-${i}`}
                          imagen={item.items.imagen_url} nombre={item.items.nombre} sub={item.items.categoria}
                          icono={<Sword size={20} />} onClick={() => setModalD({ tipo: "item_inv", data: item })} />
                      ))}
                      {misItemsDesc.map((d, i) => (
                        <EntidadCard key={`desc-${i}`}
                          imagen={d.imagen_url} nombre={d.nombre ?? "Objeto"} sub={d.categoria ?? "Item"}
                          icono={<Sword size={20} />} onClick={() => setModalD({ tipo: "item", data: d })} />
                      ))}
                      {inventario.length === 0 && misItemsDesc.length === 0 && <EmptyTab label="Sin items registrados aún" />}
                    </>
                  )}

                  {tab === "criaturas" && (
                    misCriaturas.length > 0
                      ? misCriaturas.map((d, i) => (
                        <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Criatura"} sub={d.habitat}
                          icono={<Cat size={20} />} onClick={() => setModalD({ tipo: "criatura", data: d })} />
                      ))
                      : <EmptyTab label="Sin criaturas descubiertas" />
                  )}

                  {tab === "personajes" && (
                    misPersonajes.length > 0
                      ? misPersonajes.map((d, i) => (
                          <button key={i}
                            onClick={() => handleOpenPersonajeModal(d)}
                            className="group relative flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md"
                            style={{
                              background: "var(--white-custom)",
                              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              aspectRatio: "3/4",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 22%, transparent)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}>
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
                              {d.imagen_url
                                ? <img src={d.imagen_url} alt={d.nombre}
                                    className="w-full h-full object-contain transition-transform duration-300"
                                    style={{ objectPosition: "center", transform: "scale(3)" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(3.3)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(3)"; }} />
                                : <User size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                            </div>
                            <div className="px-1.5 py-1.5"
                              style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                              <p className="font-serif italic text-[12px] leading-tight capitalize truncate text-center"
                                style={{ color: "var(--primary)" }}>
                                {d.nombre ?? "Contacto"}
                              </p>
                            </div>
                          </button>
                        ))
                      : <EmptyTab label="Sin registros en la agenda" />
                  )}

                  {tab === "reinos" && (
                    reinos.length > 0
                      ? reinos.map((r, i) => (
                          <button key={i}
                            onClick={() => {
                              setCiudadesReino(ciudades.filter(l => l.reino_id === r.id));
                              setModalD({ tipo: "reino", data: {
                                tipo: "item",
                                entidad_id: r.id,
                                nombre: r.nombre,
                                imagen_url: r.mapa_url ?? undefined,
                                descripcion: r.descripcion ?? undefined,
                                fecha_descubrimiento: "",
                              }});
                            }}
                            className="group relative overflow-hidden text-left transition-all duration-150"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                              borderRadius: "4px",
                              boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--primary) 6%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--primary) 10%, transparent)",
                              aspectRatio: "1 / 1",
                              display: "flex",
                              flexDirection: "column",
                              minHeight: "80px",
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 35%, transparent)";
                              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 7%, var(--white-custom))";
                              (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 color-mix(in srgb, var(--primary) 12%, transparent), 0 0 0 1px color-mix(in srgb, var(--primary) 20%, transparent)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 14%, transparent)";
                              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, var(--white-custom))";
                              (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 color-mix(in srgb, var(--primary) 6%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--primary) 10%, transparent)";
                            }}>
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2" style={{ minHeight: "64px", width: "100%" }}>
                              {r.mapa_url
                                ? <img src={r.mapa_url} alt={r.nombre}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" />
                                : <MapPin size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                            </div>
                            <div className="px-1.5 py-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                              <p className="font-serif italic text-[9px] leading-tight capitalize truncate text-center"
                                style={{ color: "var(--primary)" }}>
                                {r.nombre}
                              </p>
                            </div>
                          </button>
                        ))
                      : <EmptyTab label="Ningún reino descubierto aún" />
                  )}

                </MotionDiv>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Sidebar: Otros exploradores ── */}
          {otrosPerfiles.length > 0 && (
            <aside className="w-full md:w-44 xl:w-52 shrink-0 md:sticky md:top-16 self-start animate-in fade-in duration-500 delay-200">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                <div className="flex items-center gap-1">
                  <Star size={7} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
                  <p className="text-[7px] font-black uppercase tracking-[0.3em]"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Exploradores</p>
                </div>
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              </div>
              <div className="overflow-hidden"
                style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: "var(--radius-card)", background: "var(--white-custom)" }}>
                {otrosPerfiles.map((p, idx) => (
                  <Link key={p.id} href={`/garlia/personal/${p.username}`}>
                    <MotionDiv whileHover={{ x: 2 }}
                      className="flex items-center gap-2.5 px-3 py-3 cursor-pointer transition-colors"
                      style={{ borderBottom: idx < otrosPerfiles.length - 1 ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" : "none" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <div className="w-7 h-7 shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ borderRadius: "2px", background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
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
                      <span className="text-[8px] shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>›</span>
                    </MotionDiv>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}