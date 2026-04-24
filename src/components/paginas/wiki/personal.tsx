"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cat, Star, Sword, User, Loader2, X, Users, Music2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";
import {
  ModalDetalle, EntidadCard, EmptyTab,
  type EntidadModal, type Descubrimiento, type ItemInventario,
} from "./personal/PersonalComponents";

interface PerfilResumen {
  id: string;
  username: string;
  status?: string;
  avatar_url?: string;
  items_count: number;
  criaturas_count: number;
  personajes_count: number;
}

interface Perfil {
  username: string;
  status?: string;
  avatar_url?: string;
  descripcion?: string;
  titulo?: string;
  personaje_favorito_id?: string;
  mascota_id?: string;
  personaje_favorito?: { id: string; nombre: string; img_url?: string } | null;
  mascota?: { id: string; nombre: string; imagen_url?: string } | null;
}

interface PersonalProps {
  datos?: {
    username?: string;
    status?: string;
    avatar_url?: string;
    descubrimientos?: Descubrimiento[];
    inventario_usuario?: ItemInventario[];
  };
}

export default function Personal({ datos: datosProp }: PersonalProps) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("items");
  const [modalEntidad, setModalEntidad] = useState<EntidadModal | null>(null);

  const [perfil, setPerfil]           = useState<Perfil | null>(null);
  const [inventario, setInventario]   = useState<ItemInventario[]>(datosProp?.inventario_usuario ?? []);
  const [descubrimientos, setDescubrimientos] = useState<Descubrimiento[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [showPersonajePicker, setShowPersonajePicker] = useState(false);
  const [showMascotaPicker, setShowMascotaPicker] = useState(false);
  const [savingFav, setSavingFav] = useState<'personaje' | 'mascota' | null>(null);
  const [otrosPerfiles, setOtrosPerfiles] = useState<PerfilResumen[]>([]);
  const [cancionesPersonaje, setCancionesPersonaje] = useState<any[]>([]);
  const [cargandoCanciones, setCargandoCanciones] = useState(false);
  const userIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    async function cargarTodo() {
      setCargando(true);
      try {
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn("[Personal] Sin sesión activa:", userError?.message);
          setCargando(false);
          return;
        }
        userIdRef.current = user.id;

        
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select("username, status, rol, avatar_url, descripcion, titulo, personaje_favorito_id, mascota_id, personajes:personaje_favorito_id(id, nombre, img_url), mascota:mascota_id(id, nombre, imagen_url)")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError) console.warn("[Personal] Error al cargar perfil:", perfilError.message);

        setPerfil({
          username:              perfilData?.username   ?? datosProp?.username ?? user.email?.split("@")[0] ?? "Aventurero",
          status:                perfilData?.status     ?? datosProp?.status,
          avatar_url:            perfilData?.avatar_url ?? datosProp?.avatar_url,
          descripcion:           perfilData?.descripcion,
          titulo:                perfilData?.titulo,
          personaje_favorito_id: perfilData?.personaje_favorito_id,
          mascota_id:            perfilData?.mascota_id,
          personaje_favorito:    (perfilData as any)?.personajes ?? null,
          mascota:               (perfilData as any)?.mascota ?? null,
        });

        
        
        if (!datosProp?.inventario_usuario?.length) {
          const { data: invData, error: invError } = await supabase
            .from("inventario_usuario")
            .select("equipado, items(id, nombre, categoria, imagen_url, descripcion)")
            .eq("perfil_id", user.id);
          if (invError) console.warn("[Personal] Error inventario:", invError.message);
          if (invData)  setInventario(invData as unknown as ItemInventario[]);
        }

        
        const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
          supabase
            .from("descubrimientos_items")
            .select("fecha_descubrimiento, items:item_id(id, nombre, categoria, imagen_url, descripcion)")
            .eq("perfil_id", user.id),
          supabase
            .from("descubrimientos_criaturas")
            .select("fecha_descubrimiento, criaturas:criatura_id(id, nombre, habitat, alma, imagen_url, descripcion)")
            .eq("perfil_id", user.id),
          supabase
            .from("descubrimientos_personajes")
            .select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url, sobre)")
            .eq("perfil_id", user.id),
        ]);

        if (itemsRes.error)      console.warn("[Personal] descubrimientos_items error:", itemsRes.error.message);
        if (criaturasRes.error)  console.warn("[Personal] descubrimientos_criaturas error:", criaturasRes.error.message);
        if (personajesRes.error) console.warn("[Personal] descubrimientos_personajes error:", personajesRes.error.message);

        const planos: Descubrimiento[] = [
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
            imagen_url:  r.personajes?.img_url,
            descripcion: r.personajes?.sobre,
            reino:       r.personajes?.reino,
            especie:     r.personajes?.especie,
          })),
        ];

        setDescubrimientos(planos);

        
        const { data: perfilesData } = await supabase
          .from("perfiles")
          .select("id, username, status, avatar_url")
          .neq("id", user.id)
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
              items_count:     i.count ?? 0,
              criaturas_count: c.count ?? 0,
              personajes_count: pe.count ?? 0,
            } as PerfilResumen;
          }));
          setOtrosPerfiles(counts);
        }
      } catch (err) {
        console.error("[Personal] Error inesperado:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarTodo();
  }, []); 

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas  = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc  = descubrimientos.filter(d => d.tipo === "item");

  
  const personajesConImagen = misPersonajes.filter(d => d.imagen_url);

  const handleSelectAvatar = async (imgUrl: string) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSavingAvatar(true);
    const { error } = await supabase
      .from("perfiles")
      .update({ avatar_url: imgUrl })
      .eq("id", userId);
    if (!error) {
      setPerfil(prev => prev ? { ...prev, avatar_url: imgUrl } : prev);
      setShowAvatarPicker(false);
    } else {
      console.warn("[Personal] Error guardando avatar:", error.message);
    }
    setSavingAvatar(false);
  };

  const handleSaveDesc = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSavingDesc(true);
    const { error } = await supabase
      .from("perfiles")
      .update({ descripcion: descDraft })
      .eq("id", userId);
    if (!error) {
      setPerfil(prev => prev ? { ...prev, descripcion: descDraft } : prev);
      setEditingDesc(false);
    }
    setSavingDesc(false);
  };

  const handleSaveFavorito = async (tipo: 'personaje' | 'mascota', id: string, data: any) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSavingFav(tipo);
    const col = tipo === 'personaje' ? 'personaje_favorito_id' : 'mascota_id';
    const { error } = await supabase.from("perfiles").update({ [col]: id }).eq("id", userId);
    if (!error) {
      setPerfil(prev => prev ? {
        ...prev,
        [col]: id,
        [tipo === 'personaje' ? 'personaje_favorito' : 'mascota']: data,
      } : prev);
      tipo === 'personaje' ? setShowPersonajePicker(false) : setShowMascotaPicker(false);
    }
    setSavingFav(null);
  };

  const handleOpenPersonajeModal = async (d: Descubrimiento) => {
    setCancionesPersonaje([]);
    setModalEntidad({ tipo: "personaje", data: d });
    if (!d.entidad_id) return;
    setCargandoCanciones(true);
    try {
      const { data, error } = await supabase
        .from("canciones")
        .select("id, titulo, portada_url, info_cancion, personaje_id")
        .eq("personaje_id", d.entidad_id)
        .eq("visible", true);
      if (!error && data) setCancionesPersonaje(data);
    } catch (err) {
      console.warn("[Personal] Error cargando canciones:", err);
    } finally {
      setCargandoCanciones(false);
    }
  };

  const tabs = [
    { id: "items",      label: "Inventario", icon: Sword },
    { id: "criaturas",  label: "Bestiario",  icon: Cat   },
    { id: "personajes", label: "Agenda",     icon: User    },
  ] as const;

  if (cargando) return (
    <div className="flex items-center justify-center min-h-60">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
        <span className="text-[9px] font-black uppercase tracking-[0.3em]"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          Cargando perfil…
        </span>
      </div>
    </div>
  );

  return (
    <>
      {modalEntidad && modalEntidad.tipo !== "personaje" && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      {/* Modal custom para personajes con canciones */}
      <AnimatePresence>
        {modalEntidad && modalEntidad.tipo === "personaje" && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.45)" }}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[26rem]"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                boxShadow: "var(--shadow-card)",
                maxHeight: "85dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header imagen */}
              {modalEntidad.data.imagen_url && (
                <div className="w-full h-36 shrink-0 overflow-hidden relative"
                  style={{ background: "color-mix(in srgb, var(--primary) 5%, var(--bg-main))" }}>
                  <img src={modalEntidad.data.imagen_url} alt={modalEntidad.data.nombre}
                    className="w-full h-full object-contain" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--white-custom) 0%, transparent 60%)" }} />
                </div>
              )}

              {/* Botón cerrar */}
              <button
                onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
                className="absolute top-3 right-3 z-10 p-1.5 transition-opacity hover:opacity-100"
                style={{
                  color: "var(--primary)", opacity: 0.45,
                  background: "color-mix(in srgb, var(--white-custom) 80%, transparent)",
                  borderRadius: "var(--radius-btn)",
                  backdropFilter: "blur(4px)",
                }}>
                <X size={14} />
              </button>

              {/* Contenido scrollable */}
              <div className="overflow-y-auto flex-1 px-5 pb-6" style={{ paddingTop: modalEntidad.data.imagen_url ? "0.75rem" : "1.25rem" }}>

                {/* Nombre y meta */}
                <div className="mb-3">
                  <h2 className="font-serif italic capitalize leading-tight"
                    style={{ fontSize: "1.1rem", color: "var(--primary)" }}>
                    {modalEntidad.data.nombre ?? "Personaje"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {modalEntidad.data.reino && (
                      <span className="font-serif italic text-[9px] px-2 py-0.5"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          borderRadius: "var(--radius-btn)",
                          color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                        }}>
                        {modalEntidad.data.reino}
                      </span>
                    )}
                    {modalEntidad.data.especie && (
                      <span className="font-serif italic text-[9px] px-2 py-0.5"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          borderRadius: "var(--radius-btn)",
                          color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                        }}>
                        {modalEntidad.data.especie}
                      </span>
                    )}
                  </div>
                </div>

                {/* Descripción */}
                {modalEntidad.data.descripcion && (
                  <p className="font-serif italic leading-relaxed mb-4"
                    style={{ fontSize: "0.85rem", color: "color-mix(in srgb, var(--foreground) 72%, transparent)" }}>
                    {modalEntidad.data.descripcion}
                  </p>
                )}

                {/* Divisor */}
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  <Music2 size={10} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                </div>

                {/* Canciones */}
                <div>
                  <p className="font-serif italic text-[9px] mb-3"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    Canciones
                  </p>

                  {cargandoCanciones ? (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 size={13} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                      <span className="font-serif italic text-[9px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                        Cargando canciones…
                      </span>
                    </div>
                  ) : cancionesPersonaje.length === 0 ? (
                    <p className="font-serif italic text-[10px] py-3 text-center"
                      style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                      "Este personaje no tiene canciones aún…"
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {cancionesPersonaje.map((cancion, i) => (
                        <Link key={cancion.id ?? i} href={`/wiki/canciones/${cancion.id}`}
                          className="group flex items-center gap-2.5 px-3 py-2.5 transition-all"
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
                          {cancion.portada_url && !cancion.portada_url.includes("placeholder") && (
                            <div className="w-10 h-10 shrink-0 overflow-hidden"
                              style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                              <img src={cancion.portada_url} alt={cancion.titulo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <Music2 size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
                            <span className="font-serif italic text-[11px] truncate group-hover:underline"
                              style={{ color: "var(--primary)" }}>
                              {cancion.titulo ?? `Canción ${i + 1}`}
                            </span>
                          </div>
                          <ChevronRight size={12} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", flexShrink: 0 }}
                            className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showAvatarPicker && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-96"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "var(--shadow-card)",
                maxHeight: "80dvh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {}
              <div className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>
                    Elegir foto de perfil
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5"
                    style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                    Personajes desbloqueados
                  </p>
                </div>
                <button onClick={() => setShowAvatarPicker(false)}
                  className="p-1.5 transition-opacity hover:opacity-100"
                  style={{ color: "var(--primary)", opacity: 0.4, borderRadius: "var(--radius-btn)" }}>
                  <X size={14} />
                </button>
              </div>

              {}
              <div className="overflow-y-auto flex-1 p-4">
                {personajesConImagen.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest italic"
                      style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                      "Desbloquea personajes leyendo para usar sus imágenes"
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {}
                    <button
                      onClick={() => handleSelectAvatar("")}
                      className="flex flex-col items-center gap-1.5 p-2 transition-all"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        border: !perfil?.avatar_url
                          ? "2px solid var(--accent)"
                          : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                      }}>
                      <div className="w-16 h-16 flex items-center justify-center"
                        style={{ borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                        <User size={24} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest"
                        style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                        Ninguna
                      </span>
                    </button>

                    {personajesConImagen.map((p, i) => {
                      const isSelected = perfil?.avatar_url === p.imagen_url;
                      return (
                        <button key={i}
                          onClick={() => handleSelectAvatar(p.imagen_url!)}
                          disabled={savingAvatar}
                          className="flex flex-col items-center gap-1.5 p-2 transition-all"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            border: isSelected
                              ? "2px solid var(--accent)"
                              : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                            background: isSelected
                              ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                              : "transparent",
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <div className="w-16 h-16 overflow-hidden"
                            style={{ borderRadius: "50%", border: isSelected ? "2px solid var(--accent)" : "none" }}>
                            <img src={p.imagen_url} alt={p.nombre}
                              className="w-full h-full object-contain" />
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest truncate w-full text-center"
                            style={{ color: isSelected ? "var(--accent)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                            {p.nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {savingAvatar && (
                <div className="flex items-center justify-center gap-2 py-3 shrink-0"
                  style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <Loader2 size={13} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                  <span className="text-[9px] font-black uppercase tracking-widest"
                    style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                    Guardando…
                  </span>
                </div>
              )}
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showPersonajePicker && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPersonajePicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.4)" }} />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-96"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "var(--shadow-card)",
                maxHeight: "80dvh",
                display: "flex",
                flexDirection: "column",
              }}>
              <div className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <p className="font-serif italic text-[11px]" style={{ color: "var(--primary)" }}>
                  Elegir personaje favorito
                </p>
                <button onClick={() => setShowPersonajePicker(false)}
                  className="p-1 transition-opacity hover:opacity-100"
                  style={{ color: "var(--primary)", opacity: 0.4, borderRadius: "var(--radius-btn)" }}>
                  <X size={14} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                <p className="font-serif italic text-[9px] px-2 mb-2"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Solo puedes elegir personajes que hayas desbloqueado
                </p>
                {misPersonajes.length === 0 ? (
                  <p className="font-serif italic text-[11px] text-center py-8"
                    style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                    "Aún no conoces ningún personaje…"
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {misPersonajes.map((p, i) => {
                      const isSelected = perfil?.personaje_favorito_id === p.entidad_id;
                      return (
                        <button key={i}
                          onClick={() => handleSaveFavorito('personaje', p.entidad_id, { id: p.entidad_id, nombre: p.nombre, img_url: p.imagen_url })}
                          disabled={savingFav === 'personaje'}
                          className="flex flex-col items-center gap-1.5 p-2 transition-all"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            border: isSelected ? "2px solid var(--accent)" : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                            background: isSelected ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
                          }}>
                          <div className="w-14 h-14 overflow-hidden"
                            style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                            {p.imagen_url
                              ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-contain" />
                              : <User size={20} className="m-auto mt-2.5" style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
                            }
                          </div>
                          <span className="font-serif italic text-[9px] truncate w-full text-center"
                            style={{ color: isSelected ? "var(--accent)" : "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                            {p.nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showMascotaPicker && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMascotaPicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.4)" }} />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-96"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "var(--shadow-card)",
                maxHeight: "80dvh",
                display: "flex",
                flexDirection: "column",
              }}>
              <div className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <p className="font-serif italic text-[11px]" style={{ color: "var(--primary)" }}>
                  Elegir mascota
                </p>
                <button onClick={() => setShowMascotaPicker(false)}
                  className="p-1 transition-opacity hover:opacity-100"
                  style={{ color: "var(--primary)", opacity: 0.4, borderRadius: "var(--radius-btn)" }}>
                  <X size={14} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                <p className="font-serif italic text-[9px] px-2 mb-2"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Solo puedes elegir criaturas que hayas descubierto
                </p>
                {misCriaturas.length === 0 ? (
                  <p className="font-serif italic text-[11px] text-center py-8"
                    style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                    "Aún no has descubierto ninguna criatura…"
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {misCriaturas.map((c, i) => {
                      const isSelected = perfil?.mascota_id === c.entidad_id;
                      return (
                        <button key={i}
                          onClick={() => handleSaveFavorito('mascota', c.entidad_id, { id: c.entidad_id, nombre: c.nombre, imagen_url: c.imagen_url })}
                          disabled={savingFav === 'mascota'}
                          className="flex flex-col items-center gap-1.5 p-2 transition-all"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            border: isSelected ? "2px solid var(--accent)" : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                            background: isSelected ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
                          }}>
                          <div className="w-14 h-14 overflow-hidden"
                            style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                            {c.imagen_url
                              ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-contain" />
                              : <Cat size={20} className="m-auto mt-2.5" style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
                            }
                          </div>
                          <span className="font-serif italic text-[9px] truncate w-full text-center"
                            style={{ color: isSelected ? "var(--accent)" : "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                            {c.nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {}

      {}
      {}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-20">

        {}
        <div className="flex items-center gap-4 py-5 px-2">
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
          <span className="font-serif italic text-[10px] select-none"
            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
            {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length} descubrimientos 
          </span>
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
        </div>

        {}

        {}
        <div className="flex flex-col md:flex-row gap-5 mb-6">

          {}
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

              <div className="text-center pt-5 pb-2 px-5">
                <div className="flex justify-center mb-3">
                  <button onClick={() => setShowAvatarPicker(true)}
                    className="group relative overflow-hidden flex items-center justify-center transition-all"
                    style={{
                      width: 84, height: 84,
                      borderRadius: "var(--radius-btn)",
                      background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
                      border: "2px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                    }}
                    title="Cambiar imagen">
                    {perfil?.avatar_url
                      ? <img src={perfil.avatar_url} alt={perfil?.username} className="w-full h-full object-contain" />
                      : <User size={30} style={{ color: "color-mix(in srgb, var(--primary) 15%, transparent)" }} />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                      <span className="font-serif italic text-[8px]" style={{ color: "var(--btn-text)" }}>Cambiar</span>
                    </div>
                  </button>
                </div>

                <h1 className="font-serif italic leading-tight mb-1"
                  style={{ fontSize: "1.05rem", color: "var(--primary)", letterSpacing: "0.02em", textTransform: "capitalize" }}>
                  {perfil?.username ?? "…"}
                </h1>
                <p className="font-serif italic text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                  {perfil?.status ?? "Enciclopedia"}
                </p>
              </div>

              <div className="mx-5 my-3 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                <span className="text-[24px]" style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>⚝</span>
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
              </div>

              <div className="px-5 pb-5 space-y-2">
                {[
                  { icon: <Sword size={11} />, label: "Objetos",   count: inventario.length + misItemsDesc.length },
                  { icon: <Cat size={11} />,   label: "Criaturas",   count: misCriaturas.length },
                  { icon: <User size={11} />,    label: "Amigos", count: misPersonajes.length },
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
            </div>
          </div>

          {}
          <div className="flex-1 min-w-0 flex flex-col gap-4 mx-4 md:mx-0 md:self-stretch">

            {}
            <div className="flex flex-col flex-1" style={{
              background: "var(--white-custom)",
              borderRadius: "var(--radius-card)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}>

              {}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <p className="font-serif italic text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  Sobre mí
                </p>
                {!editingDesc ? (
                  <button
                    onClick={() => { setDescDraft(perfil?.descripcion ?? ''); setEditingDesc(true); }}
                    className="font-serif italic text-[9px] px-2 py-1"
                    style={{
                      color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}>
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingDesc(false)}
                      className="font-serif italic text-[9px] px-2 py-1"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      Cancelar
                    </button>
                    <button onClick={handleSaveDesc} disabled={savingDesc}
                      className="font-serif italic text-[9px] px-3 py-1 disabled:opacity-50"
                      style={{ background: "var(--primary)", color: "var(--btn-text)", borderRadius: "var(--radius-btn)" }}>
                      {savingDesc ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                )}
              </div>
              <div className="mx-5 mb-3 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              <div className="px-5 pb-4">
                {editingDesc ? (
                  <textarea
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    autoFocus rows={4}
                    placeholder="Escribe algo sobre ti…"
                    className="w-full bg-transparent outline-none resize-none font-serif italic leading-relaxed"
                    style={{ fontSize: "0.9rem", color: "var(--foreground)", caretColor: "var(--primary)" }}
                  />
                ) : perfil?.descripcion ? (
                  <p className="font-serif italic leading-relaxed"
                    style={{ fontSize: "0.9rem", color: "color-mix(in srgb, var(--foreground) 75%, transparent)" }}>
                    {perfil.descripcion}
                  </p>
                ) : (
                  <p className="font-serif italic"
                    style={{ fontSize: "0.85rem", color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    "Sin descripción aún… pulsa Editar."
                  </p>
                )}
              </div>

              {}
              <div className="mx-5 h-px" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />

              {}
              <div className="grid grid-cols-2"
                style={{ borderTop: "none" }}>

                {}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-serif italic text-[8px]"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      Personaje Favorito
                    </p>
                    <button onClick={() => setShowPersonajePicker(true)}
                      className="font-serif italic text-[8px] px-1.5 py-0.5"
                      style={{
                        color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                        borderRadius: "var(--radius-btn)",
                        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      }}>
                      {perfil?.personaje_favorito ? "Cambiar" : "Elegir"}
                    </button>
                  </div>
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
                            ? <img src={perfil.personaje_favorito.img_url} alt={perfil.personaje_favorito.nombre} className="w-full h-full object-contain" />
                            : <User size={16} className="m-auto mt-1.5" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
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

                {}
                <div className="px-4 py-3"
                  style={{ borderLeft: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-serif italic text-[8px]"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      Mascota
                    </p>
                    <button onClick={() => setShowMascotaPicker(true)}
                      className="font-serif italic text-[8px] px-1.5 py-0.5"
                      style={{
                        color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                        borderRadius: "var(--radius-btn)",
                        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      }}>
                      {perfil?.mascota ? "Cambiar" : "Elegir"}
                    </button>
                  </div>
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
                            ? <img src={perfil.mascota.imagen_url} alt={perfil.mascota.nombre} className="w-full h-full object-contain" />
                            : <Cat size={16} className="m-auto mt-1.5" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                        </div>
                        <p className="font-serif italic text-[11px] leading-tight capitalize"
                          style={{ color: "var(--primary)" }}>
                          {perfil.mascota.nombre}
                        </p>
                      </>
                    ) : (
                      <p className="font-serif italic text-[9px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                        Ninguna elegida…
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {}
            {}
            {otrosPerfiles.length > 0 && (
              <div className="lg:hidden">
                <p className="font-serif italic text-[9px] mb-2 flex items-center gap-1.5"
                  style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                  <Users size={9} /> Otros exploradores
                </p>
                <div className="flex flex-wrap gap-2">
                  {otrosPerfiles.map(p => (
                    <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                      <div className="flex items-center gap-2 px-3 py-1.5"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                          border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                          borderRadius: "var(--radius-btn)",
                        }}>
                        <div className="w-5 h-5 shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                            : <User size={9} style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />}
                        </div>
                        <span className="font-serif italic text-[10px] capitalize" style={{ color: "var(--primary)" }}>{p.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {}
        <div className="md:hidden mb-4 mx-4">
          <div className="flex gap-1 p-1"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
              borderRadius: "var(--radius-btn)",
            }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 transition-all"
                style={{
                  borderRadius: "calc(var(--radius-btn) - 2px)",
                  background: tab === t.id ? "var(--primary)" : "transparent",
                  color: tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  boxShadow: tab === t.id ? "0 1px 6px color-mix(in srgb, var(--primary) 20%, transparent)" : "none",
                }}>
                <t.icon size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="flex gap-6 items-start">

          {}
          <div className="flex-1 min-w-0 pt-2 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

            {}
            <div className="hidden md:flex items-center gap-1.5 mb-5 p-1"
              style={{
                background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                borderRadius: "var(--radius-btn)",
                border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                width: "fit-content",
              }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2 transition-all duration-200"
                  style={{
                    borderRadius: "calc(var(--radius-btn) - 2px)",
                    background: tab === t.id ? "var(--primary)" : "transparent",
                    color: tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    boxShadow: tab === t.id ? "0 1px 6px color-mix(in srgb, var(--primary) 20%, transparent)" : "none",
                  }}>
                  <t.icon size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>

            {}
            <AnimatePresence mode="wait">
              <MotionDiv key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">

                {tab === "items" && (
                  <>
                    {inventario.map((item, i) => (
                      <EntidadCard key={`inv-${i}`} imagen={item.items.imagen_url} nombre={item.items.nombre}
                        sub={item.items.categoria} icono={<Sword size={20} />}
                        onClick={() => setModalEntidad({ tipo: "item_inv", data: item })} />
                    ))}
                    {misItemsDesc.map((d, i) => (
                      <EntidadCard key={`desc-${i}`} imagen={d.imagen_url} nombre={d.nombre ?? "Objeto"}
                        sub={d.categoria ?? "Item"} icono={<Sword size={20} />}
                        onClick={() => setModalEntidad({ tipo: "item", data: d })} />
                    ))}
                    {inventario.length === 0 && misItemsDesc.length === 0 && <EmptyTab label="Sin items registrados aún" />}
                  </>
                )}

                {tab === "criaturas" && (
                  misCriaturas.length > 0
                    ? misCriaturas.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Criatura"}
                        icono={<Cat size={20} />} onClick={() => setModalEntidad({ tipo: "criatura", data: d })} />
                    ))
                    : <EmptyTab label="Sin registros en el bestiario" />
                )}

                {tab === "personajes" && (
                  misPersonajes.length > 0
                    ? misPersonajes.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Contacto"}
                        icono={<User size={20} />} onClick={() => handleOpenPersonajeModal(d)} />
                    ))
                    : <EmptyTab label="Sin registros en la agenda" />
                )}

              </MotionDiv>
            </AnimatePresence>
          </div>

          {}
          {otrosPerfiles.length > 0 && (
            <aside className="hidden lg:flex flex-col gap-2 w-44 xl:w-52 shrink-0 sticky top-24 pt-4">
              <p className="font-serif italic text-[9px] mb-1 px-1 flex items-center gap-1.5 opacity-60"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                <Users size={9} /> Exploradores
              </p>
              {otrosPerfiles.map(p => (
                <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                  <MotionDiv whileHover={{ x: 2 }}
                    className="flex items-center gap-2.5 px-3 py-2.5 transition-all cursor-pointer group"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                      border: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
                      borderRadius: "var(--radius-btn)",
                    }}>
                    <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                        : <User size={13} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif italic text-[11px] truncate transition-colors group-hover:text-[var(--accent)] capitalize"
                        style={{ color: "var(--primary)" }}>{p.username}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 font-serif italic">
                        {[{ icon: <Sword size={7} />, n: p.items_count }, { icon: <Cat size={7} />, n: p.criaturas_count }, { icon: <User size={7} />, n: p.personajes_count }].map(({ icon, n }, i) => (
                          <span key={i} className="flex items-center gap-0.5 text-[8px] font-black tabular-nums"
                            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>{icon} {n}</span>
                        ))}
                      </div>
                    </div>
                  </MotionDiv>
                </Link>
              ))}
            </aside>
          )}

        </div>

      </div>
    </>
  );
}