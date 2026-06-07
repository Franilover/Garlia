"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cat, Star, Sword, User, Loader2, X, Users, Music2, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";
import {
  ModalDetalle, EntidadCard, EmptyTab,
  type EntidadModal, type Descubrimiento, type ItemInventario,
} from "./PersonalComponents";

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
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes" | "reinos">("personajes");
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
  const [ciudadesReino, setCiudadesReino] = useState<typeof ciudades>([]);
  const [lugaresReino, setLugaresReino] = useState<typeof lugares>([]);
  const [reinos, setReinos] = useState<{ id: string; nombre: string; mapa_url?: string | null; logo_url?: string | null; descripcion?: string | null }[]>([]);
  const [ciudades, setCiudades] = useState<{ id: string; nombre: string; imagen_url?: string | null; descripcion?: string | null; reino_id?: string | null }[]>([]);
  const [lugares, setLugares] = useState<{ id: string; nombre: string; imagen_url?: string | null; descripcion?: string | null; reino_id?: string | null }[]>([]);
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

        const [itemsRes, criaturasRes, personajesRes, reinosRes, ciudadesRes, lugaresRes] = await Promise.all([
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
          supabase
            .from("descubrimientos_reinos")
            .select("fecha_descubrimiento, reino_data:reino_id(id, nombre, mapa_url, logo_url, descripcion)")
            .eq("perfil_id", user.id),
          supabase
            .from("ciudades_desbloqueadas")
            .select("ciudades:ciudad_id(id, nombre, imagen_url, descripcion, reino_id)")
            .eq("user_id", user.id),
          supabase
            .from("lugares_desbloqueados")
            .select("lugares:lugar_id(id, nombre, imagen_url, descripcion, reino_id)")
            .eq("user_id", user.id),
        ]);

        if (itemsRes.error)      console.warn("[Personal] descubrimientos_items error:", itemsRes.error.message);
        if (criaturasRes.error)  console.warn("[Personal] descubrimientos_criaturas error:", criaturasRes.error.message);
        if (personajesRes.error) console.warn("[Personal] descubrimientos_personajes error:", personajesRes.error.message);
        if (reinosRes.error)     console.warn("[Personal] descubrimientos_reinos error:", reinosRes.error.message);
        if (ciudadesRes.error)    console.warn("[Personal] ciudades_desbloqueadas error:", ciudadesRes.error.message);
        if (lugaresRes.error)    console.warn("[Personal] lugares error:", lugaresRes.error.message);

        const reinosData = (reinosRes.data ?? []).map((r: any) => ({
          id:           r.reino_data?.id,
          nombre:       r.reino_data?.nombre,
          mapa_url:     r.reino_data?.mapa_url,
          logo_url:     r.reino_data?.logo_url,
          descripcion:  r.reino_data?.descripcion,
        })).filter(r => r.id);
        setReinos(reinosData);

        const ciudadesData = (ciudadesRes.data ?? []).map((r: any) => ({
          id:          r.ciudades?.id,
          nombre:      r.ciudades?.nombre,
          imagen_url:  r.ciudades?.imagen_url,
          descripcion: r.ciudades?.descripcion,
          reino_id:    r.ciudades?.reino_id ?? null,
        })).filter(l => l.id);
        setCiudades(ciudadesData);

        const lugaresData = (lugaresRes.data ?? []).map((r: any) => ({
          id:          r.lugares?.id,
          nombre:      r.lugares?.nombre,
          imagen_url:  r.lugares?.imagen_url ?? null,
          descripcion: r.lugares?.descripcion ?? null,
          reino_id:    r.lugares?.reino_id ?? null,
        })).filter(l => l.id);
        setLugares(lugaresData);

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

  // Refrescar reinos, ciudades y descubrimientos cuando el usuario vuelve a esta pestaña
  // (por ejemplo, después de leer un capítulo que desbloqueó algo nuevo).
  useEffect(() => {
    const refrescarDescubrimientos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [personajesRes, reinosRes, ciudadesRes] = await Promise.all([
        supabase
          .from("descubrimientos_personajes")
          .select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url, sobre)")
          .eq("perfil_id", user.id),
        supabase
          .from("descubrimientos_reinos")
          .select("fecha_descubrimiento, reino_data:reino_id(id, nombre, mapa_url, logo_url, descripcion)")
          .eq("perfil_id", user.id),
        supabase
          .from("ciudades_desbloqueadas")
          .select("ciudades:ciudad_id(id, nombre, imagen_url, descripcion, reino_id)")
          .eq("user_id", user.id),
      ]);

      if (reinosRes.data) {
        const reinosData = reinosRes.data.map((r: any) => ({
          id:           r.reino_data?.id,
          nombre:       r.reino_data?.nombre,
          mapa_url:     r.reino_data?.mapa_url,
          logo_url:     r.reino_data?.logo_url,
          descripcion:  r.reino_data?.descripcion,
        })).filter((r: any) => r.id);
        setReinos(reinosData);
      }

      if (ciudadesRes.data) {
        const ciudadesData = ciudadesRes.data.map((r: any) => ({
          id:          r.ciudades?.id,
          nombre:      r.ciudades?.nombre,
          imagen_url:  r.ciudades?.imagen_url,
          descripcion: r.ciudades?.descripcion,
          reino_id:    r.ciudades?.reino_id ?? null,
        })).filter((l: any) => l.id);
        setCiudades(ciudadesData);
      }

      if (personajesRes.data) {
        setDescubrimientos(prev => [
          ...prev.filter(d => d.tipo !== "personaje"),
          ...personajesRes.data!.map((r: any) => ({
            tipo: "personaje" as const,
            entidad_id:           r.personajes?.id,
            fecha_descubrimiento: r.fecha_descubrimiento,
            nombre:    r.personajes?.nombre,
            img_url:   r.personajes?.img_url,
            reino:     r.personajes?.reino,
            especie:   r.personajes?.especie,
          })),
        ]);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refrescarDescubrimientos();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    { id: "personajes", label: "Agenda",     icon: User,    count: misPersonajes.length },
    { id: "criaturas",  label: "Bestiario",  icon: Cat,     count: misCriaturas.length },
    { id: "items",      label: "Inventario", icon: Sword,   count: inventario.length + misItemsDesc.length },
    { id: "reinos",     label: "Mapa",       icon: MapPin,  count: reinos.length + lugares.filter(l => !l.reino_id).length },
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
      {modalEntidad && modalEntidad.tipo !== "personaje" && modalEntidad.tipo !== "reino" && (
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
                  height: modalEntidad.data.imagen_url ? "220px" : "80px",
                  background: "color-mix(in srgb, var(--primary) 6%, var(--bg-main))",
                }}>
                {modalEntidad.data.imagen_url && (
                  <img src={modalEntidad.data.imagen_url} alt={modalEntidad.data.nombre}
                    className="w-full h-full object-contain transition-transform duration-700 hover:scale-105" />
                )}
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, var(--white-custom) 0%, color-mix(in srgb, var(--white-custom) 30%, transparent) 45%, transparent 100%)"
                }} />
                <button
                  onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
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
                {modalEntidad.data.imagen_url && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                    <h2 className="font-serif italic capitalize leading-tight"
                      style={{ fontSize: "1.75rem", color: "var(--primary)", lineHeight: 1.15 }}>
                      {modalEntidad.data.nombre ?? "Personaje"}
                    </h2>
                    {(modalEntidad.data.reino || modalEntidad.data.especie) && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {modalEntidad.data.reino && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                            }}>
                            {modalEntidad.data.reino}
                          </span>
                        )}
                        {modalEntidad.data.especie && (
                          <span className="font-serif italic text-[9px] px-2 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                              borderRadius: "var(--radius-btn)",
                              color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                            }}>
                            {modalEntidad.data.especie}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-y-auto flex-1 px-6 pb-6" style={{ paddingTop: "1.25rem" }}>
                {!modalEntidad.data.imagen_url && (
                  <div className="mb-4">
                    <h2 className="font-serif italic capitalize leading-tight mb-2"
                      style={{ fontSize: "1.75rem", color: "var(--primary)" }}>
                      {modalEntidad.data.nombre ?? "Personaje"}
                    </h2>
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                )}
                {modalEntidad.data.descripcion && (
                  <p className="font-serif italic leading-relaxed mb-5"
                    style={{ fontSize: "0.88rem", color: "color-mix(in srgb, var(--foreground) 68%, transparent)", lineHeight: 1.7 }}>
                    {modalEntidad.data.descripcion}
                  </p>
                )}
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
                {cargandoCanciones ? (
                  <div className="flex items-center gap-2 py-5 justify-center">
                    <Loader2 size={13} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
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
                      <Link key={cancion.id ?? i} href={`/garlia/canciones/${cancion.id}`}
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
                            <span className="text-[9px] font-black uppercase tracking-wider truncate block mt-0.5"
                              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                              {cancion.info_cancion}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={13} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", flexShrink: 0 }}
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

      {/* Modal custom para reinos con ciudades */}
      <AnimatePresence>
        {modalEntidad && modalEntidad.tipo === "reino" && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setModalEntidad(null); setCiudadesReino([]); setLugaresReino([]); }}
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
                  height: (modalEntidad.data.imagen_url || modalEntidad.data.img_url) ? "220px" : "80px",
                  background: "color-mix(in srgb, var(--primary) 6%, var(--bg-main))",
                }}>
                {/* Mapa de fondo */}
                {modalEntidad.data.imagen_url && (
                  <img src={modalEntidad.data.imagen_url} alt={modalEntidad.data.nombre}
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.35 }} />
                )}
                {/* Logo centrado encima */}
                {modalEntidad.data.img_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={modalEntidad.data.img_url} alt={`Logo ${modalEntidad.data.nombre}`}
                      className="object-contain drop-shadow-lg transition-transform duration-700 hover:scale-105"
                      style={{ maxHeight: "140px", maxWidth: "60%" }} />
                  </div>
                )}
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, var(--white-custom) 0%, color-mix(in srgb, var(--white-custom) 20%, transparent) 50%, transparent 100%)"
                }} />
                <button
                  onClick={() => { setModalEntidad(null); setCiudadesReino([]); setLugaresReino([]); }}
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
                {(modalEntidad.data.imagen_url || modalEntidad.data.img_url) && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                    <h2 className="font-serif italic capitalize leading-tight"
                      style={{ fontSize: "1.75rem", color: "var(--primary)", lineHeight: 1.15 }}>
                      {modalEntidad.data.nombre ?? "Reino"}
                    </h2>
                  </div>
                )}
              </div>

              <div className="overflow-y-auto flex-1 px-6 pb-6" style={{ paddingTop: "1.25rem" }}>
                {!modalEntidad.data.imagen_url && !modalEntidad.data.img_url && (
                  <h2 className="font-serif italic capitalize leading-tight mb-4"
                    style={{ fontSize: "1.75rem", color: "var(--primary)" }}>
                    {modalEntidad.data.nombre ?? "Reino"}
                  </h2>
                )}
                {modalEntidad.data.descripcion && (
                  <p className="font-serif italic leading-relaxed mb-5"
                    style={{ fontSize: "0.88rem", color: "color-mix(in srgb, var(--foreground) 68%, transparent)", lineHeight: 1.7 }}>
                    {modalEntidad.data.descripcion}
                  </p>
                )}

                {/* Sección de ciudades y lugares del reino — oculta si no hay ninguno */}
                {(ciudadesReino.length > 0 || lugaresReino.length > 0) && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
                        <span className="font-serif italic text-[9px] font-black uppercase tracking-widest"
                          style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                          Lugares
                        </span>
                      </div>
                      <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                    </div>

                    <div className="flex flex-col gap-2">
                      {[...ciudadesReino, ...lugaresReino].map((lugar, i) => (
                        <button
                          key={lugar.id ?? i}
                          onClick={() => {
                            setModalEntidad(null);
                            setCiudadesReino([]);
                            setLugaresReino([]);
                            setTimeout(() => setModalEntidad({ tipo: "ciudad", data: {
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
                              style={{
                                borderRadius: "var(--radius-btn)",
                                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                              }}>
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

      {/* Avatar picker */}
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

      {/* Personaje favorito picker */}
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

      {/* Mascota picker */}
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

      {/* ══════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════ */}
      <div className="w-full max-w-7xl mx-auto pb-20">

        {/* ── HERO HEADER — banda decorativa + avatar circular prominente ── */}
        <div className="animate-in fade-in duration-700">

          {/* Banda de color/patrón superior */}
          <div className="relative w-full overflow-hidden"
            style={{
              height: "96px",
              background: `color-mix(in srgb, var(--primary) 7%, var(--bg-main))`,
              borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}>
            {/* Patrón decorativo */}
            <div className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  color-mix(in srgb, var(--primary) 4%, transparent) 0px,
                  color-mix(in srgb, var(--primary) 4%, transparent) 1px,
                  transparent 1px,
                  transparent 24px
                )`,
              }} />
            {/* Badge descubrimientos — esquina superior derecha */}
            <div className="absolute top-4 right-4 md:right-10 flex items-center gap-1.5 px-3 py-1.5"
              style={{
                border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                borderRadius: "2px",
                background: "color-mix(in srgb, var(--white-custom) 75%, transparent)",
                backdropFilter: "blur(6px)",
              }}>
              <Star size={8} style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }} />
              <span className="text-[9px] font-black uppercase tracking-[0.22em] tabular-nums"
                style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length}
              </span>
              <span className="text-[7px] font-black uppercase tracking-[0.2em] hidden sm:inline"
                style={{ color: "color-mix(in srgb, var(--primary) 36%, transparent)" }}>
                descubrimientos
              </span>
            </div>
          </div>

          {/* Zona de identidad: avatar que sobresale + nombre a la derecha */}
          <div className="px-6 md:px-10 flex items-end gap-5 md:gap-7"
            style={{ marginTop: "-52px", paddingBottom: "20px" }}>

            {/* Avatar circular grande — sobresale sobre la banda */}
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="group relative shrink-0 transition-opacity hover:opacity-90"
              title="Cambiar imagen"
              style={{
                width: 104,
                height: 104,
                borderRadius: "50%",
                overflow: "hidden",
                background: "color-mix(in srgb, var(--primary) 8%, var(--bg-main))",
                flexShrink: 0,
              }}>
              {perfil?.avatar_url
                ? <img src={perfil.avatar_url} alt={perfil?.username}
                    className="w-full h-full object-contain" />
                : <User size={38} className="absolute inset-0 m-auto"
                    style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />}
              {/* Overlay hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                <span className="text-[7px] font-black uppercase tracking-widest"
                  style={{ color: "var(--btn-text)" }}>Cambiar</span>
              </div>
            </button>

            {/* Nombre + título + status */}
            <div className="flex flex-col gap-1 pb-1" style={{ paddingTop: "56px" }}>
              {perfil?.titulo && (
                <div className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                    borderRadius: "2px",
                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                  }}>
                  <Star size={7} style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }} />
                  <span className="text-[7px] font-black uppercase tracking-[0.22em]"
                    style={{ color: "color-mix(in srgb, var(--primary) 48%, transparent)" }}>
                    {perfil.titulo}
                  </span>
                </div>
              )}
              <h1 className="font-serif italic leading-none capitalize"
                style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)", color: "var(--primary)", letterSpacing: "0.01em" }}>
                {perfil?.username ?? "…"}
              </h1>
              <p className="font-serif italic"
                style={{ fontSize: "0.83rem", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                {perfil?.status ?? "Enciclopedia"}
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            BODY — sidebar + content
        ══════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row gap-6 items-start mt-6 px-4 md:px-8">

          {/* ── LEFT SIDEBAR ── */}
          <div className="w-full md:w-64 xl:w-72 shrink-0 md:sticky md:top-16 self-start flex flex-col gap-4 animate-in fade-in duration-500">

            {/* ── PANEL UNIFICADO: Stats + Bio + Favoritos ── */}
            <div className="overflow-hidden"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              }}>

              {/* Stats HUD */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  <p className="text-[7px] font-black uppercase tracking-[0.3em]"
                    style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                    Registro
                  </p>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                </div>
                <div className="space-y-3.5">
                  {[
                    { icon: <User size={10} />,   label: "Amigos",   count: misPersonajes.length, max: 20 },
                    { icon: <Cat size={10} />,    label: "Criaturas", count: misCriaturas.length, max: 30 },
                    { icon: <Sword size={10} />,  label: "Objetos",   count: inventario.length + misItemsDesc.length, max: 50 },
                    { icon: <MapPin size={10} />, label: "Ciudades",   count: reinos.length + ciudades.length, max: 30 },
                  ].map(({ icon, label, count, max }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5"
                          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                          {icon}
                          <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
                        </div>
                        <span className="text-[13px] font-black tabular-nums" style={{ color: "var(--primary)" }}>
                          {count}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="flex-1 h-1 transition-all duration-700"
                            style={{
                              background: i < Math.round((count / max) * 10)
                                ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                                : "color-mix(in srgb, var(--primary) 8%, transparent)",
                              borderRadius: "1px",
                            }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              {/* Bio / Sobre mí */}
              <div>
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Star size={8} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                    <p className="text-[8px] font-black uppercase tracking-[0.22em]"
                      style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                      Sobre mí
                    </p>
                  </div>
                  {!editingDesc ? (
                    <button
                      onClick={() => { setDescDraft(perfil?.descripcion ?? ''); setEditingDesc(true); }}
                      className="text-[7px] font-black uppercase tracking-wider px-2.5 py-1 transition-all hover:opacity-80"
                      style={{
                        color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                        borderRadius: "2px",
                        border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                      }}>
                      Editar
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditingDesc(false)}
                        className="text-[7px] font-black uppercase tracking-wider px-2 py-1"
                        style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                        Cancelar
                      </button>
                      <button onClick={handleSaveDesc} disabled={savingDesc}
                        className="text-[7px] font-black uppercase tracking-wider px-2.5 py-1 disabled:opacity-50 transition-opacity"
                        style={{ background: "var(--primary)", color: "var(--btn-text)", borderRadius: "2px" }}>
                        {savingDesc ? "…" : "Guardar"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  {editingDesc ? (
                    <textarea
                      value={descDraft}
                      onChange={e => setDescDraft(e.target.value)}
                      autoFocus rows={4}
                      placeholder="Escribe algo sobre ti…"
                      className="w-full bg-transparent outline-none resize-none font-serif italic leading-relaxed"
                      style={{ fontSize: "0.85rem", color: "var(--foreground)", caretColor: "var(--primary)" }}
                    />
                  ) : perfil?.descripcion ? (
                    <p className="font-serif italic leading-relaxed"
                      style={{ fontSize: "0.85rem", color: "color-mix(in srgb, var(--foreground) 70%, transparent)", lineHeight: 1.65 }}>
                      {perfil.descripcion}
                    </p>
                  ) : (
                    <p className="font-serif italic"
                      style={{ fontSize: "0.82rem", color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                      "Sin descripción aún… pulsa Editar."
                    </p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              {/* Favoritos */}
              <div className="grid grid-cols-2">
                {/* Personaje favorito */}
                <button
                  onClick={() => setShowPersonajePicker(true)}
                  className="text-left px-4 py-4 transition-colors group"
                  style={{ borderRadius: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="flex items-center gap-1 mb-2.5">
                    <Star size={7} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
                    <p className="text-[7px] font-black uppercase tracking-[0.18em]"
                      style={{ color: "color-mix(in srgb, var(--primary) 32%, transparent)" }}>
                      Fav. personaje
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {perfil?.personaje_favorito ? (
                      <>
                        <div className="w-10 h-10 shrink-0 overflow-hidden"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          }}>
                          {perfil.personaje_favorito.img_url
                            ? <img src={perfil.personaje_favorito.img_url} alt={perfil.personaje_favorito.nombre} className="w-full h-full object-contain" />
                            : <User size={16} className="m-auto mt-1.5" style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />}
                        </div>
                        <p className="font-serif italic text-[11px] leading-tight capitalize"
                          style={{ color: "var(--primary)" }}>
                          {perfil.personaje_favorito.nombre}
                        </p>
                      </>
                    ) : (
                      <p className="font-serif italic text-[9px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
                        Ninguno…
                      </p>
                    )}
                  </div>
                </button>

                {/* Mascota */}
                <button
                  onClick={() => setShowMascotaPicker(true)}
                  className="text-left px-4 py-4 transition-colors group"
                  style={{
                    borderLeft: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    borderRadius: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="flex items-center gap-1 mb-2.5">
                    <Star size={7} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
                    <p className="text-[7px] font-black uppercase tracking-[0.18em]"
                      style={{ color: "color-mix(in srgb, var(--primary) 32%, transparent)" }}>
                      Mascota
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {perfil?.mascota ? (
                      <>
                        <div className="w-10 h-10 shrink-0 overflow-hidden"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          }}>
                          {perfil.mascota.imagen_url
                            ? <img src={perfil.mascota.imagen_url} alt={perfil.mascota.nombre} className="w-full h-full object-contain" />
                            : <Cat size={16} className="m-auto mt-1.5" style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />}
                        </div>
                        <p className="font-serif italic text-[11px] leading-tight capitalize"
                          style={{ color: "var(--primary)" }}>
                          {perfil.mascota.nombre}
                        </p>
                      </>
                    ) : (
                      <p className="font-serif italic text-[9px]"
                        style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
                        Ninguna…
                      </p>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile explorers */}
            {otrosPerfiles.length > 0 && (
              <div className="lg:hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  <p className="text-[7px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    <Users size={8} /> Exploradores
                  </p>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {otrosPerfiles.map(p => (
                    <Link key={p.id} href={`/garlia/personal/${p.username}`}>
                      <div className="flex items-center gap-2 px-3 py-2 transition-all hover:opacity-80"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                          border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          borderRadius: "2px",
                        }}>
                        <div className="w-5 h-5 shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                            : <User size={9} style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wide capitalize" style={{ color: "var(--primary)" }}>{p.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT: Collection grid + desktop sidebar ── */}
          <div className="flex flex-col md:flex-row gap-6 w-full min-w-0 items-start">

            {/* Grid area */}
            <div className="w-full md:flex-1 md:min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

              {/* ── TABS Mobile ── */}
              <div className="flex md:hidden w-full"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                {tabs.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
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

              {/* ── TABS Desktop ── */}
              <div className="hidden md:flex items-end gap-0 w-full"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                {tabs.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className="relative flex flex-1 items-center justify-center gap-1.5 py-2.5 transition-all duration-200"
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
                      }}>
                      <t.icon size={11} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inventory panel */}
              <div style={{
                borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderTop: "0px solid transparent",
                borderRadius: "0 0 var(--radius-card) var(--radius-card)",
                background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
                padding: "16px",
                position: "relative",
                zIndex: 1,
                minHeight: "240px",
                width: "100%",
              }}>
                <AnimatePresence mode="wait">
                  <MotionDiv key={tab}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">

                    {tab === "items" && (
                      <>
                        {inventario.map((item, i) => (
                          <button
                            key={`inv-${i}`}
                            onClick={() => setModalEntidad({ tipo: "item_inv", data: item })}
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
                            {/* Imagen */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2" style={{ minHeight: "64px", width: "100%" }}>
                              {item.items.imagen_url
                                ? <img src={item.items.imagen_url} alt={item.items.nombre}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125"
                                    style={{ objectPosition: "center" }} />
                                : <Sword size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                            </div>
                            {/* Nombre en franja inferior */}
                            <div className="px-1.5 py-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                              <p className="font-serif italic text-[9px] leading-tight capitalize truncate text-center"
                                style={{ color: "var(--primary)" }}>
                                {item.items.nombre}
                              </p>
                            </div>
                          </button>
                        ))}
                        {misItemsDesc.map((d, i) => (
                          <button
                            key={`desc-${i}`}
                            onClick={() => setModalEntidad({ tipo: "item", data: d })}
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
                            }}>                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2" style={{ minHeight: "64px", width: "100%" }}>
                              {d.imagen_url
                                ? <img src={d.imagen_url} alt={d.nombre}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125"
                                    style={{ objectPosition: "center" }} />
                                : <Sword size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                            </div>
                            <div className="px-1.5 py-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                              <p className="font-serif italic text-[9px] leading-tight capitalize truncate text-center"
                                style={{ color: "var(--primary)" }}>
                                {d.nombre ?? "Objeto"}
                              </p>
                            </div>
                          </button>
                        ))}
                        {inventario.length === 0 && misItemsDesc.length === 0 && <div className="col-span-full"><EmptyTab label="Sin items registrados aún" /></div>}
                      </>
                    )}

                    {tab === "criaturas" && (
                      misCriaturas.length > 0
                        ? misCriaturas.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => setModalEntidad({ tipo: "criatura", data: d })}
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
                            }}>                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2" style={{ minHeight: "64px", width: "100%" }}>
                              {d.imagen_url
                                ? <img src={d.imagen_url} alt={d.nombre}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-125"
                                    style={{ objectPosition: "center" }} />
                                : <Cat size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                            </div>
                            <div className="px-1.5 py-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                              <p className="font-serif italic text-[9px] leading-tight capitalize truncate text-center"
                                style={{ color: "var(--primary)" }}>
                                {d.nombre ?? "Criatura"}
                              </p>
                            </div>
                          </button>
                        ))
                        : <div className="col-span-full"><EmptyTab label="Sin registros en el bestiario" /></div>
                    )}

                    {tab === "personajes" && (
                      misPersonajes.length > 0
                        ? misPersonajes.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => handleOpenPersonajeModal(d)}
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
                            }}>                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2" style={{ minHeight: "64px", width: "100%" }}>
                              {d.imagen_url
                                ? <img src={d.imagen_url} alt={d.nombre}
                                    className="w-full h-full object-contain transition-transform duration-300"
                                    style={{ objectPosition: "center", transform: "scale(3)" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(3.3)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(3)"; }} />
                                : <User size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                            </div>
                            <div className="px-1.5 py-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                              <p className="font-serif italic text-[12px] leading-tight capitalize truncate text-center"
                                style={{ color: "var(--primary)" }}>
                                {d.nombre ?? "Contacto"}
                              </p>
                            </div>
                          </button>
                        ))
                        : <div className="col-span-full"><EmptyTab label="Sin registros en la agenda" /></div>
                    )}

                    {tab === "reinos" && (
                      reinos.length > 0
                        ? reinos.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setCiudadesReino(ciudades.filter(l => l.reino_id === r.id));
                              setLugaresReino(lugares.filter(l => l.reino_id === r.id));
                              setModalEntidad({ tipo: "reino", data: {
                                tipo: "item",
                                entidad_id: r.id,
                                nombre: r.nombre,
                                imagen_url: r.mapa_url ?? undefined,
                                img_url: r.logo_url ?? undefined,
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
                        : <div className="col-span-full"><EmptyTab label="Ningún reino descubierto aún" /></div>
                    )}

                    {/* Lugares — aparecen como tarjetas independientes al lado de los reinos */}
                    {tab === "reinos" && lugares.filter(l => !l.reino_id).map((l, i) => (
                      <button
                        key={`lugar-${i}`}
                        onClick={() => setModalEntidad({ tipo: "ciudad", data: {
                          tipo: "item",
                          entidad_id: l.id,
                          nombre: l.nombre,
                          imagen_url: l.imagen_url ?? undefined,
                          descripcion: l.descripcion ?? undefined,
                          fecha_descubrimiento: "",
                        }})}
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
                          {l.imagen_url
                            ? <img src={l.imagen_url} alt={l.nombre}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                            : <MapPin size={22} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />}
                        </div>
                        <div className="px-1.5 py-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                          <p className="font-serif italic text-[9px] leading-tight capitalize truncate text-center"
                            style={{ color: "var(--primary)" }}>
                            {l.nombre}
                          </p>
                        </div>
                      </button>
                    ))}

                  </MotionDiv>
                </AnimatePresence>
              </div>
            </div>

            {/* Desktop sidebar - Exploradores */}
            {otrosPerfiles.length > 0 && (
              <aside className="hidden lg:flex flex-col gap-0 w-44 xl:w-52 shrink-0 sticky top-24 pt-0">

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
                    <Link key={p.id} href={`/garlia/personal/${p.username}`}>
                      <MotionDiv whileHover={{ x: 2 }}
                        className="flex items-center gap-2.5 px-3 py-3 cursor-pointer transition-colors"
                        style={{
                          borderBottom: idx < otrosPerfiles.length - 1
                            ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
                            : "none",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                        <div className="w-7 h-7 shrink-0 overflow-hidden flex items-center justify-center relative"
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
                              { icon: <Cat size={6} />, n: p.criaturas_count },
                              { icon: <User size={6} />, n: p.personajes_count }
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
        </div>

      </div>
    </>
  );
}