"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cat, Star, Sword, User, Loader2, X, Users, Music2, ChevronRight, Package, ScrollText, BookOpen, Backpack } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";
import {
  ModalDetalle, EntidadCard, EmptyTab,
  type EntidadModal, type Descubrimiento, type ItemInventario,
} from "./personal/PersonalComponents";

/* ─────────────────────────────────────────
   ESTILOS RPG — inyectados como <style> global
   Se pueden mover a globals.css si se prefiere
───────────────────────────────────────── */
const RPG_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&display=swap');

  :root {
    --leather-dark:   #3d2008;
    --leather-mid:    #6b3a1f;
    --leather-light:  #a0622a;
    --leather-tan:    #c8904e;
    --leather-cream:  #f0dab8;
    --parchment:      #f5e6cc;
    --parchment-dark: #e8cda0;
    --parchment-deep: #d4aa72;
    --ink:            #2a1304;
    --ink-faded:      #5c3610;
    --metal-gold:     #c9a84c;
    --metal-dark:     #6b5423;
    --stitch:         rgba(160, 98, 42, 0.35);
    --shadow-bag:     0 8px 40px rgba(42, 19, 4, 0.45), 0 2px 8px rgba(42,19,4,0.3);
  }

  .rpg-bag-texture {
    background-color: var(--leather-dark);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E"),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255,255,255,0.018) 2px,
        rgba(255,255,255,0.018) 4px
      );
  }

  .rpg-parchment {
    background-color: var(--parchment);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E");
  }

  .rpg-item-slot {
    background-color: #c8904e18;
    background-image:
      linear-gradient(135deg, rgba(200,144,78,0.08) 25%, transparent 25%),
      linear-gradient(225deg, rgba(200,144,78,0.08) 25%, transparent 25%),
      linear-gradient(315deg, rgba(200,144,78,0.08) 25%, transparent 25%),
      linear-gradient(45deg,  rgba(200,144,78,0.08) 25%, transparent 25%);
    background-size: 12px 12px;
    border: 1.5px solid rgba(200,144,78,0.22);
    border-radius: 4px;
    transition: all 0.18s ease;
  }
  .rpg-item-slot:hover {
    border-color: rgba(200,144,78,0.55);
    background-color: rgba(200,144,78,0.14);
    box-shadow: 0 0 12px rgba(201,168,76,0.2), inset 0 0 8px rgba(201,168,76,0.06);
    transform: translateY(-2px);
  }
  .rpg-item-slot:hover .rpg-item-name {
    color: var(--metal-gold);
  }

  .rpg-tab-btn {
    font-family: 'Cinzel', serif;
    font-weight: 600;
    letter-spacing: 0.12em;
    font-size: 10px;
    text-transform: uppercase;
    padding: 10px 20px;
    border: 1.5px solid rgba(200,144,78,0.28);
    color: var(--leather-cream);
    background: rgba(42,19,4,0.5);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    transition: all 0.18s;
    position: relative;
    top: 1px;
    opacity: 0.6;
  }
  .rpg-tab-btn.active {
    background: var(--parchment);
    color: var(--ink);
    border-color: rgba(200,144,78,0.55);
    border-bottom: 1.5px solid var(--parchment);
    opacity: 1;
    z-index: 2;
  }
  .rpg-tab-btn:hover:not(.active) {
    opacity: 0.85;
    background: rgba(200,144,78,0.12);
  }

  /* Decorative stitching */
  .rpg-stitch-border {
    outline: 2px dashed var(--stitch);
    outline-offset: -6px;
  }

  /* Gold divider */
  .rpg-divider {
    height: 1.5px;
    background: linear-gradient(90deg, transparent, var(--metal-gold), transparent);
    opacity: 0.4;
    margin: 0 12px;
  }

  .rpg-buckle-before::before {
    content: '✦';
    font-size: 10px;
    color: var(--metal-gold);
    opacity: 0.7;
    margin-right: 8px;
  }
  .rpg-buckle-after::after {
    content: '✦';
    font-size: 10px;
    color: var(--metal-gold);
    opacity: 0.7;
    margin-left: 8px;
  }

  .rpg-stat-bar-fill {
    background: linear-gradient(90deg, var(--leather-mid), var(--metal-gold));
    border-radius: 2px;
    transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  }

  .rpg-picker-option {
    border: 1.5px solid rgba(200,144,78,0.22);
    border-radius: 6px;
    background: rgba(42,19,4,0.3);
    cursor: pointer;
    transition: all 0.18s;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .rpg-picker-option:hover {
    border-color: var(--metal-gold);
    background: rgba(201,168,76,0.12);
  }
  .rpg-picker-option.selected {
    border-color: var(--metal-gold);
    background: rgba(201,168,76,0.18);
    box-shadow: 0 0 10px rgba(201,168,76,0.25);
  }
`;

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

/* ─────────────────────────────────────────
   SUBCOMPONENTES INTERNOS
───────────────────────────────────────── */

/** Ranura de ítem — aspecto de celda RPG */
function ItemSlot({
  imagen_url,
  nombre,
  subtitulo,
  icon: Icon,
  onClick,
  equipado,
}: {
  imagen_url?: string;
  nombre: string;
  subtitulo?: string;
  icon: React.ElementType;
  onClick?: () => void;
  equipado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rpg-item-slot relative flex flex-col overflow-hidden text-left"
      style={{ background: equipado ? "rgba(201,168,76,0.10)" : undefined }}
    >
      {equipado && (
        <div className="absolute top-1.5 right-1.5 z-10 text-[7px] font-bold px-1.5 py-0.5"
          style={{
            fontFamily: "'Cinzel', serif",
            background: "var(--metal-gold)",
            color: "var(--ink)",
            borderRadius: "2px",
            letterSpacing: "0.08em",
          }}>
          EQ
        </div>
      )}
      {/* Marco imagen */}
      <div className="relative w-full overflow-hidden flex items-center justify-center"
        style={{
          height: 112,
          background: "rgba(42,19,4,0.25)",
          borderBottom: "1px solid rgba(200,144,78,0.18)",
        }}>
        {imagen_url
          ? <img src={imagen_url} alt={nombre}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              style={{ objectPosition: "center" }} />
          : <Icon size={28} style={{ color: "rgba(200,144,78,0.3)" }} />}
        {/* Esquinas decorativas */}
        <span className="absolute top-1 left-1 text-[8px]" style={{ color: "rgba(201,168,76,0.4)", lineHeight: 1 }}>◤</span>
        <span className="absolute top-1 right-1 text-[8px]" style={{ color: "rgba(201,168,76,0.4)", lineHeight: 1, transform: "scaleX(-1)" }}>◤</span>
        <span className="absolute bottom-1 left-1 text-[8px]" style={{ color: "rgba(201,168,76,0.4)", lineHeight: 1, transform: "scaleY(-1)" }}>◤</span>
        <span className="absolute bottom-1 right-1 text-[8px]" style={{ color: "rgba(201,168,76,0.4)", lineHeight: 1, transform: "scale(-1,-1)" }}>◤</span>
      </div>
      <div className="px-2.5 py-2.5">
        <p className="rpg-item-name text-[11px] leading-tight capitalize truncate transition-colors"
          style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "var(--leather-cream)" }}>
          {nombre}
        </p>
        {subtitulo && (
          <p className="text-[8px] uppercase tracking-widest mt-1 truncate"
            style={{ fontFamily: "'Cinzel', serif", color: "rgba(200,144,78,0.55)" }}>
            {subtitulo}
          </p>
        )}
      </div>
    </button>
  );
}

/** Sección vacía con estética de pergamino */
function EmptySlot({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3"
      style={{ color: "rgba(200,144,78,0.35)" }}>
      <Package size={28} strokeWidth={1.2} />
      <p className="text-[11px]" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic" }}>
        {label}
      </p>
    </div>
  );
}

export default function Personal({ datos: datosProp }: PersonalProps) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("personajes");
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
        if (userError || !user) { setCargando(false); return; }
        userIdRef.current = user.id;

        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("username, status, rol, avatar_url, descripcion, titulo, personaje_favorito_id, mascota_id, personajes:personaje_favorito_id(id, nombre, img_url), mascota:mascota_id(id, nombre, imagen_url)")
          .eq("id", user.id)
          .maybeSingle();

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
          const { data: invData } = await supabase
            .from("inventario_usuario")
            .select("equipado, items(id, nombre, categoria, imagen_url, descripcion)")
            .eq("perfil_id", user.id);
          if (invData) setInventario(invData as unknown as ItemInventario[]);
        }

        const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
          supabase.from("descubrimientos_items").select("fecha_descubrimiento, items:item_id(id, nombre, categoria, imagen_url, descripcion)").eq("perfil_id", user.id),
          supabase.from("descubrimientos_criaturas").select("fecha_descubrimiento, criaturas:criatura_id(id, nombre, habitat, alma, imagen_url, descripcion)").eq("perfil_id", user.id),
          supabase.from("descubrimientos_personajes").select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url, sobre)").eq("perfil_id", user.id),
        ]);

        const planos: Descubrimiento[] = [
          ...(itemsRes.data ?? []).map((r: any) => ({ tipo: "item" as const, entidad_id: r.items?.id, fecha_descubrimiento: r.fecha_descubrimiento, nombre: r.items?.nombre, descripcion: r.items?.descripcion, imagen_url: r.items?.imagen_url, categoria: r.items?.categoria })),
          ...(criaturasRes.data ?? []).map((r: any) => ({ tipo: "criatura" as const, entidad_id: r.criaturas?.id, fecha_descubrimiento: r.fecha_descubrimiento, nombre: r.criaturas?.nombre, descripcion: r.criaturas?.descripcion, imagen_url: r.criaturas?.imagen_url, habitat: r.criaturas?.habitat, alma: r.criaturas?.alma })),
          ...(personajesRes.data ?? []).map((r: any) => ({ tipo: "personaje" as const, entidad_id: r.personajes?.id, fecha_descubrimiento: r.fecha_descubrimiento, nombre: r.personajes?.nombre, imagen_url: r.personajes?.img_url, descripcion: r.personajes?.sobre, reino: r.personajes?.reino, especie: r.personajes?.especie })),
        ];
        setDescubrimientos(planos);

        const { data: perfilesData } = await supabase.from("perfiles").select("id, username, status, avatar_url").neq("id", user.id).order("username");
        if (perfilesData?.length) {
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
      } catch (err) {
        console.error("[Personal] Error:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarTodo();
  }, []);

  const misPersonajes       = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas        = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc        = descubrimientos.filter(d => d.tipo === "item");

  const handleSelectAvatar = async (imgUrl: string) => {
    const userId = userIdRef.current; if (!userId) return;
    setSavingAvatar(true);
    const { error } = await supabase.from("perfiles").update({ avatar_url: imgUrl }).eq("id", userId);
    if (!error) { setPerfil(prev => prev ? { ...prev, avatar_url: imgUrl } : prev); setShowAvatarPicker(false); }
    setSavingAvatar(false);
  };

  const handleSaveDesc = async () => {
    const userId = userIdRef.current; if (!userId) return;
    setSavingDesc(true);
    const { error } = await supabase.from("perfiles").update({ descripcion: descDraft }).eq("id", userId);
    if (!error) { setPerfil(prev => prev ? { ...prev, descripcion: descDraft } : prev); setEditingDesc(false); }
    setSavingDesc(false);
  };

  const handleSaveFavorito = async (tipo: 'personaje' | 'mascota', id: string, data: any) => {
    const userId = userIdRef.current; if (!userId) return;
    setSavingFav(tipo);
    const col = tipo === 'personaje' ? 'personaje_favorito_id' : 'mascota_id';
    const { error } = await supabase.from("perfiles").update({ [col]: id }).eq("id", userId);
    if (!error) {
      setPerfil(prev => prev ? { ...prev, [col]: id, [tipo === 'personaje' ? 'personaje_favorito' : 'mascota']: data } : prev);
      tipo === 'personaje' ? setShowPersonajePicker(false) : setShowMascotaPicker(false);
    }
    setSavingFav(null);
  };

  const handleOpenPersonajeModal = async (d: Descubrimiento) => {
    setCancionesPersonaje([]); setModalEntidad({ tipo: "personaje", data: d });
    if (!d.entidad_id) return;
    setCargandoCanciones(true);
    try {
      const { data, error } = await supabase.from("canciones").select("id, titulo, portada_url, info_cancion, personaje_id").eq("personaje_id", d.entidad_id).eq("visible", true);
      if (!error && data) setCancionesPersonaje(data);
    } finally { setCargandoCanciones(false); }
  };

  const tabs = [
    { id: "personajes", label: "Agenda",     icon: ScrollText, count: misPersonajes.length },
    { id: "criaturas",  label: "Bestiario",  icon: Cat,        count: misCriaturas.length },
    { id: "items",      label: "Inventario", icon: Package,    count: inventario.length + misItemsDesc.length },
  ] as const;

  /* ── Pantalla de carga ── */
  if (cargando) return (
    <div className="flex items-center justify-center min-h-60">
      <div className="flex flex-col items-center gap-4">
        <Backpack size={28} style={{ color: "var(--leather-tan)" }} className="animate-bounce" />
        <span className="text-[10px] uppercase tracking-[0.35em]"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--leather-tan)" }}>
          Abriendo mochila…
        </span>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     MODAL — PERSONAJE CON CANCIONES
  ══════════════════════════════════════════════════════ */
  const PersonajeModal = () => (
    <AnimatePresence>
      {modalEntidad && modalEntidad.tipo === "personaje" && (
        <>
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(42,19,4,0.72)" }} />

          <MotionDiv
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[30rem] rpg-stitch-border"
            style={{
              background: "var(--parchment)",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E\")",
              border: "2px solid var(--leather-mid)",
              borderRadius: "4px",
              boxShadow: "0 28px 80px rgba(42,19,4,0.65), 0 4px 20px rgba(42,19,4,0.4)",
              maxHeight: "88dvh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}>

            {/* Cabecera cuero */}
            <div className="relative shrink-0"
              style={{
                background: "var(--leather-dark)",
                borderBottom: "2px solid var(--leather-mid)",
                minHeight: modalEntidad.data.imagen_url ? 200 : "auto",
              }}>
              {modalEntidad.data.imagen_url && (
                <img src={modalEntidad.data.imagen_url} alt={modalEntidad.data.nombre}
                  className="w-full object-cover" style={{ maxHeight: 220, objectPosition: "top" }} />
              )}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(42,19,4,0.9) 30%, rgba(42,19,4,0.2) 100%)" }} />

              <button onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center transition-opacity hover:opacity-80 z-10"
                style={{
                  background: "var(--leather-dark)",
                  border: "1.5px solid rgba(200,144,78,0.4)",
                  borderRadius: "3px",
                  color: "var(--leather-cream)",
                }}>
                <X size={12} />
              </button>

              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <h2 className="leading-tight capitalize"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--leather-cream)", lineHeight: 1.15 }}>
                  {modalEntidad.data.nombre ?? "Personaje"}
                </h2>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {[modalEntidad.data.reino, modalEntidad.data.especie].filter(Boolean).map(tag => (
                    <span key={tag} style={{
                      fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 600,
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.35)",
                      borderRadius: "2px", padding: "2px 8px", color: "var(--metal-gold)",
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Cuerpo pergamino */}
            <div className="overflow-y-auto flex-1 px-5 pb-5 pt-4"
              style={{ background: "var(--parchment)" }}>
              {!modalEntidad.data.imagen_url && (
                <div className="mb-4">
                  <h2 className="capitalize" style={{ fontFamily: "'Cinzel', serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--ink)" }}>
                    {modalEntidad.data.nombre}
                  </h2>
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {[modalEntidad.data.reino, modalEntidad.data.especie].filter(Boolean).map(tag => (
                      <span key={tag} style={{
                        fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 600, letterSpacing: "0.15em",
                        textTransform: "uppercase", background: "rgba(107,58,31,0.10)",
                        border: "1px solid rgba(107,58,31,0.22)", borderRadius: "2px",
                        padding: "2px 8px", color: "var(--leather-mid)",
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {modalEntidad.data.descripcion && (
                <p className="leading-relaxed mb-5"
                  style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.9rem", color: "var(--ink-faded)", lineHeight: 1.7 }}>
                  {modalEntidad.data.descripcion}
                </p>
              )}

              {/* Divisor con ícono */}
              <div className="flex items-center gap-3 mb-4">
                <div className="rpg-divider flex-1" />
                <div className="flex items-center gap-1.5">
                  <Music2 size={10} style={{ color: "var(--metal-gold)" }} />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--leather-mid)" }}>
                    Canciones
                  </span>
                </div>
                <div className="rpg-divider flex-1" />
              </div>

              {cargandoCanciones ? (
                <div className="flex items-center gap-2 py-5 justify-center">
                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--leather-tan)" }} />
                  <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "11px", color: "var(--leather-tan)" }}>
                    Buscando canciones…
                  </span>
                </div>
              ) : cancionesPersonaje.length === 0 ? (
                <p className="py-4 text-center" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "11px", color: "rgba(107,58,31,0.4)" }}>
                  "Este personaje no tiene canciones aún…"
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {cancionesPersonaje.map((cancion, i) => (
                    <Link key={cancion.id ?? i} href={`/wiki/canciones/${cancion.id}`}
                      className="group flex items-center gap-3 px-3 py-3 transition-all"
                      style={{
                        background: "rgba(107,58,31,0.06)",
                        border: "1px solid rgba(107,58,31,0.15)",
                        borderRadius: "3px",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(107,58,31,0.13)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.4)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(107,58,31,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,58,31,0.15)"; }}>
                      {cancion.portada_url && !cancion.portada_url.includes("placeholder") ? (
                        <div className="w-11 h-11 shrink-0 overflow-hidden" style={{ borderRadius: "3px", border: "1px solid rgba(107,58,31,0.2)" }}>
                          <img src={cancion.portada_url} alt={cancion.titulo} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 shrink-0 flex items-center justify-center" style={{ borderRadius: "3px", background: "rgba(107,58,31,0.08)", border: "1px solid rgba(107,58,31,0.15)" }}>
                          <Music2 size={14} style={{ color: "rgba(107,58,31,0.4)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] truncate block group-hover:underline" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "var(--ink)" }}>
                          {cancion.titulo ?? `Canción ${i + 1}`}
                        </span>
                        {cancion.info_cancion && (
                          <span className="text-[8px] uppercase tracking-wider block mt-0.5 truncate" style={{ fontFamily: "'Cinzel', serif", color: "rgba(107,58,31,0.5)" }}>
                            {cancion.info_cancion}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={12} style={{ color: "rgba(107,58,31,0.35)", flexShrink: 0 }} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );

  /* ═══════════════════════════════════════════════════════
     MODAL — PICKER GENÉRICO (cuero oscuro)
  ══════════════════════════════════════════════════════ */
  const PickerModal = ({
    open, onClose, title, children
  }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
    <AnimatePresence>
      {open && (
        <>
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(42,19,4,0.65)" }} />
          <MotionDiv
            initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-[26rem] rpg-bag-texture"
            style={{
              border: "2px solid var(--leather-mid)",
              borderRadius: "4px",
              boxShadow: "var(--shadow-bag)",
              maxHeight: "80dvh",
              display: "flex",
              flexDirection: "column",
            }}>
            {/* Header hebilla */}
            <div className="flex items-center justify-between px-4 py-3.5 shrink-0"
              style={{ borderBottom: "1.5px solid rgba(200,144,78,0.25)" }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 flex items-center justify-center" style={{ color: "var(--metal-gold)" }}>⊡</div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 600, color: "var(--leather-cream)", letterSpacing: "0.12em" }}>
                  {title}
                </p>
              </div>
              <button onClick={onClose} className="transition-opacity hover:opacity-70"
                style={{ color: "var(--leather-cream)", opacity: 0.5, padding: "2px" }}>
                <X size={14} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">{children}</div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );

  /* ═══════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ══════════════════════════════════════════════════════ */
  return (
    <>
      {/* Estilos RPG */}
      <style>{RPG_STYLES}</style>

      {/* Modales genéricos */}
      {modalEntidad && modalEntidad.tipo !== "personaje" && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}
      <PersonajeModal />

      {/* Picker avatar */}
      <PickerModal open={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} title="Elegir emblema">
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "9px", color: "rgba(200,144,78,0.55)", padding: "0 4px 8px" }}>
          Elige la imagen que te representará en el mapa
        </p>
        {/* Picker de avatares — mantiene tu lógica original aquí */}
        {savingAvatar && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--metal-gold)" }} />
          </div>
        )}
      </PickerModal>

      {/* Picker personaje favorito */}
      <PickerModal open={showPersonajePicker} onClose={() => setShowPersonajePicker(false)} title="Elegir personaje favorito">
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "9px", color: "rgba(200,144,78,0.55)", padding: "0 4px 8px" }}>
          Solo puedes elegir personajes que hayas descubierto
        </p>
        {misPersonajes.length === 0 ? (
          <p className="text-center py-8" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "11px", color: "rgba(200,144,78,0.4)" }}>
            "Aún no has conocido a nadie…"
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {misPersonajes.map((c, i) => {
              const isSelected = perfil?.personaje_favorito_id === c.entidad_id;
              return (
                <button key={i}
                  onClick={() => handleSaveFavorito('personaje', c.entidad_id, { id: c.entidad_id, nombre: c.nombre, img_url: c.imagen_url })}
                  disabled={savingFav === 'personaje'}
                  className={`rpg-picker-option ${isSelected ? 'selected' : ''}`}>
                  <div className="w-14 h-14 overflow-hidden" style={{ borderRadius: "3px", background: "rgba(42,19,4,0.4)" }}>
                    {c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-contain" />
                      : <User size={20} className="m-auto mt-3" style={{ color: "rgba(200,144,78,0.3)" }} />}
                  </div>
                  <span className="text-[9px] truncate w-full text-center" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: isSelected ? "var(--metal-gold)" : "var(--leather-cream)" }}>
                    {c.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PickerModal>

      {/* Picker mascota */}
      <PickerModal open={showMascotaPicker} onClose={() => setShowMascotaPicker(false)} title="Elegir mascota">
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "9px", color: "rgba(200,144,78,0.55)", padding: "0 4px 8px" }}>
          Solo puedes elegir criaturas que hayas descubierto
        </p>
        {misCriaturas.length === 0 ? (
          <p className="text-center py-8" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "11px", color: "rgba(200,144,78,0.4)" }}>
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
                  className={`rpg-picker-option ${isSelected ? 'selected' : ''}`}>
                  <div className="w-14 h-14 overflow-hidden" style={{ borderRadius: "3px", background: "rgba(42,19,4,0.4)" }}>
                    {c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-contain" />
                      : <Cat size={20} className="m-auto mt-3" style={{ color: "rgba(200,144,78,0.3)" }} />}
                  </div>
                  <span className="text-[9px] truncate w-full text-center" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: isSelected ? "var(--metal-gold)" : "var(--leather-cream)" }}>
                    {c.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PickerModal>

      {/* ═══════════════════════════════════════════════════════
          LAYOUT PRINCIPAL — LA MOCHILA
      ══════════════════════════════════════════════════════ */}
      <div className="w-full max-w-7xl mx-auto pb-20">

        {/* ── SOLAPA SUPERIOR DE LA MOCHILA ── */}
        <div className="animate-in fade-in duration-700">
          <div className="relative w-full overflow-hidden rpg-bag-texture"
            style={{
              height: "108px",
              borderBottom: "3px solid var(--leather-mid)",
              boxShadow: "inset 0 -8px 24px rgba(42,19,4,0.35)",
            }}>
            {/* Costura superior */}
            <div className="absolute top-3 left-0 right-0"
              style={{ height: "1px", background: "repeating-linear-gradient(90deg, rgba(200,144,78,0.25) 0, rgba(200,144,78,0.25) 8px, transparent 8px, transparent 16px)" }} />

            {/* Hebilla central decorativa */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
              <div className="flex-1 h-px w-16" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5))" }} />
              <div className="flex items-center gap-2 px-4 py-1.5"
                style={{
                  border: "1.5px solid rgba(201,168,76,0.55)",
                  borderRadius: "3px",
                  background: "rgba(42,19,4,0.6)",
                  backdropFilter: "blur(4px)",
                }}>
                <Star size={8} style={{ color: "var(--metal-gold)" }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", fontWeight: 700, color: "var(--metal-gold)", letterSpacing: "0.28em" }}>
                  DIARIO
                </span>
                <Star size={8} style={{ color: "var(--metal-gold)" }} />
              </div>
              <div className="flex-1 h-px w-16" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.5), transparent)" }} />
            </div>

            {/* Badge descubrimientos — esquina superior derecha */}
            <div className="absolute top-4 right-5 flex items-center gap-1.5 px-3 py-1.5"
              style={{
                border: "1px solid rgba(201,168,76,0.38)",
                borderRadius: "2px",
                background: "rgba(42,19,4,0.55)",
                backdropFilter: "blur(6px)",
              }}>
              <Star size={8} style={{ color: "var(--metal-gold)", opacity: 0.9 }} />
              <span className="tabular-nums"
                style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", fontWeight: 700, color: "var(--metal-gold)" }}>
                {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length}
              </span>
              <span className="hidden sm:inline" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", color: "rgba(200,144,78,0.65)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                registros
              </span>
            </div>

            {/* Costura inferior */}
            <div className="absolute bottom-3 left-0 right-0"
              style={{ height: "1px", background: "repeating-linear-gradient(90deg, rgba(200,144,78,0.18) 0, rgba(200,144,78,0.18) 8px, transparent 8px, transparent 16px)" }} />
          </div>

          {/* ── ZONA DE IDENTIDAD — avatar + nombre ── */}
          <div className="px-6 md:px-10 flex items-end gap-5 md:gap-7"
            style={{ marginTop: "-52px", paddingBottom: "24px" }}>

            {/* Avatar — marco cuero */}
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="group relative shrink-0 transition-all duration-200 hover:scale-105"
              title="Cambiar imagen"
              style={{
                width: 108,
                height: 108,
                borderRadius: "6px",
                overflow: "hidden",
                background: "var(--leather-dark)",
                border: "3px solid var(--leather-mid)",
                boxShadow: "0 4px 20px rgba(42,19,4,0.55), inset 0 0 0 1px rgba(201,168,76,0.22)",
                flexShrink: 0,
              }}>
              {perfil?.avatar_url
                ? <img src={perfil.avatar_url} alt={perfil.username} className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex items-center justify-center rpg-bag-texture">
                    <User size={36} style={{ color: "rgba(200,144,78,0.35)" }} />
                  </div>
                )}
              {/* Overlay hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ background: "rgba(42,19,4,0.55)" }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", color: "var(--metal-gold)", letterSpacing: "0.15em" }}>CAMBIAR</span>
              </div>
              {/* Esquinas doradas */}
              {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(pos => (
                <div key={pos} className={`absolute ${pos} w-3 h-3 pointer-events-none`}
                  style={{ border: "1.5px solid var(--metal-gold)", opacity: 0.55,
                    ...(pos.includes("right") && !pos.includes("bottom") ? { borderLeft: "none", borderBottom: "none" }
                      : pos.includes("right") ? { borderLeft: "none", borderTop: "none" }
                      : pos.includes("bottom") ? { borderRight: "none", borderTop: "none" }
                      : { borderRight: "none", borderBottom: "none" }) }} />
              ))}
            </button>

            {/* Info de aventurero */}
            <div className="flex-1 min-w-0 pb-1">
              {perfil?.titulo && (
                <p className="mb-1 rpg-buckle-before rpg-buckle-after"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 600, color: "var(--metal-gold)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
                  {perfil.titulo}
                </p>
              )}
              <h1 className="truncate capitalize" style={{ fontFamily: "'Cinzel', serif", fontSize: "1.6rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 }}>
                {perfil?.username ?? "Aventurero"}
              </h1>
              {perfil?.status && (
                <p className="mt-1.5 italic" style={{ fontFamily: "'IM Fell English', serif", fontSize: "12px", color: "var(--ink-faded)" }}>
                  "{perfil.status}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── LAYOUT: sidebar izquierdo + contenido principal ── */}
        <div className="px-4 md:px-8 flex gap-6 flex-col lg:flex-row items-start animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

          {/* ╔══════════════════════════════════
              PANEL LATERAL — FICHA DEL AVENTURERO
          ═══════════════════════════════════╗ */}
          <aside className="w-full lg:w-56 xl:w-64 shrink-0 sticky top-24">
            <div style={{
              background: "var(--parchment)",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E\")",
              border: "2px solid var(--leather-mid)",
              borderRadius: "4px",
              boxShadow: "var(--shadow-bag)",
              overflow: "hidden",
            }}>

              {/* Cabecera ficha */}
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: "var(--leather-dark)", borderBottom: "2px solid var(--leather-mid)" }}>
                <BookOpen size={11} style={{ color: "var(--metal-gold)" }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, color: "var(--leather-cream)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
                  Ficha del viajero
                </span>
              </div>

              {/* Barras de progreso — registro */}
              <div className="px-4 py-4">
                <p className="mb-3 rpg-buckle-before rpg-buckle-after text-center"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.6)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
                  Registro
                </p>
                <div className="space-y-3.5">
                  {[
                    { icon: <User size={10} />,    label: "Amigos",    count: misPersonajes.length, max: 20 },
                    { icon: <Cat size={10} />,     label: "Criaturas", count: misCriaturas.length,  max: 30 },
                    { icon: <Sword size={10} />,   label: "Objetos",   count: inventario.length + misItemsDesc.length, max: 50 },
                  ].map(({ icon, label, count, max }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5"
                        style={{ color: "var(--leather-mid)" }}>
                        <div className="flex items-center gap-1.5">{icon}
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</span>
                        </div>
                        <span className="tabular-nums" style={{ fontFamily: "'Cinzel', serif", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>{count}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="flex-1 h-1.5 rounded-sm overflow-hidden"
                            style={{ background: "rgba(107,58,31,0.12)" }}>
                            {i < Math.round((count / max) * 10) && (
                              <div className="rpg-stat-bar-fill w-full h-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rpg-divider" />

              {/* Bio / Sobre mí */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.6)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
                    Sobre mí
                  </p>
                  {!editingDesc ? (
                    <button onClick={() => { setDescDraft(perfil?.descripcion ?? ''); setEditingDesc(true); }}
                      className="transition-all hover:opacity-80"
                      style={{
                        fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700,
                        color: "rgba(107,58,31,0.55)", letterSpacing: "0.12em", textTransform: "uppercase",
                        border: "1px solid rgba(107,58,31,0.22)", borderRadius: "2px",
                        padding: "3px 8px", background: "rgba(107,58,31,0.06)",
                      }}>
                      Editar
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditingDesc(false)} style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", color: "rgba(107,58,31,0.5)", letterSpacing: "0.1em" }}>
                        Cancelar
                      </button>
                      <button onClick={handleSaveDesc} disabled={savingDesc}
                        style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "var(--leather-cream)", background: "var(--leather-dark)", borderRadius: "2px", padding: "3px 8px", letterSpacing: "0.1em" }}>
                        {savingDesc ? "…" : "Guardar"}
                      </button>
                    </div>
                  )}
                </div>
                {editingDesc ? (
                  <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} autoFocus rows={4}
                    placeholder="Escribe algo sobre ti…"
                    className="w-full bg-transparent outline-none resize-none"
                    style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.85rem", color: "var(--ink)", caretColor: "var(--leather-mid)", lineHeight: 1.65 }} />
                ) : perfil?.descripcion ? (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.82rem", color: "var(--ink-faded)", lineHeight: 1.65 }}>
                    {perfil.descripcion}
                  </p>
                ) : (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.8rem", color: "rgba(107,58,31,0.35)" }}>
                    "Sin descripción… pulsa Editar."
                  </p>
                )}
              </div>

              <div className="rpg-divider" />

              {/* Favoritos */}
              <div className="grid grid-cols-2">
                {/* Personaje fav */}
                <button onClick={() => setShowPersonajePicker(true)}
                  className="text-left px-3 py-3.5 transition-colors group"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(107,58,31,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <p className="mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.55)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                    ✦ Aliado
                  </p>
                  <div className="flex items-center gap-2">
                    {perfil?.personaje_favorito ? (
                      <>
                        <div className="w-9 h-9 shrink-0 overflow-hidden" style={{ borderRadius: "3px", background: "rgba(107,58,31,0.08)", border: "1px solid rgba(107,58,31,0.2)" }}>
                          {perfil.personaje_favorito.img_url
                            ? <img src={perfil.personaje_favorito.img_url} alt={perfil.personaje_favorito.nombre} className="w-full h-full object-contain" />
                            : <User size={14} className="m-auto mt-1.5" style={{ color: "rgba(107,58,31,0.3)" }} />}
                        </div>
                        <p className="text-[10px] leading-tight capitalize" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "var(--ink)" }}>
                          {perfil.personaje_favorito.nombre}
                        </p>
                      </>
                    ) : (
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "9px", color: "rgba(107,58,31,0.3)" }}>
                        Ninguno…
                      </p>
                    )}
                  </div>
                </button>

                {/* Mascota */}
                <button onClick={() => setShowMascotaPicker(true)}
                  className="text-left px-3 py-3.5 transition-colors group"
                  style={{ borderLeft: "1px solid rgba(107,58,31,0.12)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(107,58,31,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <p className="mb-2" style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.55)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                    ✦ Mascota
                  </p>
                  <div className="flex items-center gap-2">
                    {perfil?.mascota ? (
                      <>
                        <div className="w-9 h-9 shrink-0 overflow-hidden" style={{ borderRadius: "3px", background: "rgba(107,58,31,0.08)", border: "1px solid rgba(107,58,31,0.2)" }}>
                          {perfil.mascota.imagen_url
                            ? <img src={perfil.mascota.imagen_url} alt={perfil.mascota.nombre} className="w-full h-full object-contain" />
                            : <Cat size={14} className="m-auto mt-1.5" style={{ color: "rgba(107,58,31,0.3)" }} />}
                        </div>
                        <p className="text-[10px] leading-tight capitalize" style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "var(--ink)" }}>
                          {perfil.mascota.nombre}
                        </p>
                      </>
                    ) : (
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "9px", color: "rgba(107,58,31,0.3)" }}>
                        Ninguna…
                      </p>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Exploradores (sidebar) */}
            {otrosPerfiles.length > 0 && (
              <div className="mt-4 hidden lg:block">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="rpg-divider flex-1" />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.45)", letterSpacing: "0.25em", textTransform: "uppercase" }}>
                    Exploradores
                  </span>
                  <div className="rpg-divider flex-1" />
                </div>
                <div style={{ border: "1.5px solid var(--leather-mid)", borderRadius: "4px", background: "var(--parchment)", overflow: "hidden", boxShadow: "var(--shadow-bag)" }}>
                  {otrosPerfiles.map((p, idx) => (
                    <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                      <MotionDiv whileHover={{ x: 3 }}
                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
                        style={{ borderBottom: idx < otrosPerfiles.length - 1 ? "1px solid rgba(107,58,31,0.1)" : "none" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(107,58,31,0.06)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <div className="w-7 h-7 shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ borderRadius: "3px", background: "rgba(107,58,31,0.08)", border: "1px solid rgba(107,58,31,0.18)" }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                            : <User size={11} style={{ color: "rgba(107,58,31,0.3)" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-tight truncate capitalize"
                            style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, color: "var(--ink)" }}>{p.username}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {[{ icon: <Sword size={6} />, n: p.items_count }, { icon: <Cat size={6} />, n: p.criaturas_count }, { icon: <User size={6} />, n: p.personajes_count }].map(({ icon, n }, i) => (
                              <span key={i} className="flex items-center gap-0.5 tabular-nums"
                                style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.4)" }}>
                                {icon}{n}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span style={{ fontSize: "10px", color: "rgba(107,58,31,0.35)" }}>›</span>
                      </MotionDiv>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ╔══════════════════════════════════
              CONTENIDO PRINCIPAL — LA MOCHILA
          ═══════════════════════════════════╗ */}
          <div className="flex-1 min-w-0">

            {/* Exploradores mobile */}
            {otrosPerfiles.length > 0 && (
              <div className="lg:hidden mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rpg-divider flex-1" />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: "7px", fontWeight: 700, color: "rgba(107,58,31,0.45)", letterSpacing: "0.25em" }}>
                    <Users size={7} className="inline mr-1" />Exploradores
                  </span>
                  <div className="rpg-divider flex-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {otrosPerfiles.map(p => (
                    <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 transition-all hover:opacity-80"
                        style={{ background: "var(--parchment)", border: "1.5px solid var(--leather-mid)", borderRadius: "3px", boxShadow: "0 2px 8px rgba(42,19,4,0.2)" }}>
                        <div className="w-5 h-5 shrink-0 overflow-hidden flex items-center justify-center" style={{ borderRadius: "2px", background: "rgba(107,58,31,0.1)" }}>
                          {p.avatar_url ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" /> : <User size={9} style={{ color: "rgba(107,58,31,0.3)" }} />}
                        </div>
                        <span className="text-[9px] uppercase tracking-wide capitalize" style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, color: "var(--ink)" }}>{p.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── TABS — solapa de la mochila ── */}
            <div className="flex items-end gap-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rpg-tab-btn flex items-center gap-2`}
                  style={tab === t.id ? {
                    background: "var(--parchment)",
                    color: "var(--ink)",
                    borderColor: "rgba(200,144,78,0.55)",
                    borderBottom: "1.5px solid var(--parchment)",
                    opacity: 1, zIndex: 2,
                  } : {}}>
                  <t.icon size={11} />
                  {t.label}
                  <span className="tabular-nums"
                    style={{
                      fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700,
                      background: tab === t.id ? "rgba(107,58,31,0.12)" : "rgba(255,255,255,0.06)",
                      color: tab === t.id ? "var(--ink)" : "var(--leather-cream)",
                      borderRadius: "2px", padding: "1px 6px",
                    }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ── PANEL DE INVENTARIO — pergamino ── */}
            <div className="rpg-stitch-border"
              style={{
                border: "2px solid rgba(200,144,78,0.5)",
                borderRadius: "0 6px 6px 6px",
                background: "var(--parchment)",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E\")",
                boxShadow: "var(--shadow-bag)",
                padding: "20px",
                minHeight: "320px",
                position: "relative",
                zIndex: 1,
              }}>

              {/* Decoración esquinas interiores */}
              {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map(pos => (
                <div key={pos} className={`absolute ${pos} w-4 h-4 pointer-events-none`}
                  style={{ border: "1.5px solid rgba(201,168,76,0.35)",
                    ...(pos.includes("right") && !pos.includes("bottom") ? { borderLeft: "none", borderBottom: "none" }
                      : pos.includes("right") ? { borderLeft: "none", borderTop: "none" }
                      : pos.includes("bottom") ? { borderRight: "none", borderTop: "none" }
                      : { borderRight: "none", borderBottom: "none" }) }} />
              ))}

              <AnimatePresence mode="wait">
                <MotionDiv key={tab}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">

                  {/* ── ITEMS ── */}
                  {tab === "items" && (
                    <>
                      {inventario.map((item, i) => (
                        <ItemSlot key={`inv-${i}`}
                          imagen_url={item.items.imagen_url}
                          nombre={item.items.nombre}
                          subtitulo={item.items.categoria}
                          icon={Sword}
                          equipado={item.equipado}
                          onClick={() => setModalEntidad({ tipo: "item_inv", data: item })} />
                      ))}
                      {misItemsDesc.map((d, i) => (
                        <ItemSlot key={`desc-${i}`}
                          imagen_url={d.imagen_url}
                          nombre={d.nombre ?? "Objeto"}
                          subtitulo={d.categoria}
                          icon={Sword}
                          onClick={() => setModalEntidad({ tipo: "item", data: d })} />
                      ))}
                      {inventario.length === 0 && misItemsDesc.length === 0 && (
                        <EmptySlot label="La mochila está vacía…" />
                      )}
                    </>
                  )}

                  {/* ── CRIATURAS ── */}
                  {tab === "criaturas" && (
                    misCriaturas.length > 0
                      ? misCriaturas.map((d, i) => (
                          <ItemSlot key={i}
                            imagen_url={d.imagen_url}
                            nombre={d.nombre ?? "Criatura"}
                            subtitulo={d.habitat}
                            icon={Cat}
                            onClick={() => setModalEntidad({ tipo: "criatura", data: d })} />
                        ))
                      : <EmptySlot label="Sin registros en el bestiario" />
                  )}

                  {/* ── PERSONAJES ── */}
                  {tab === "personajes" && (
                    misPersonajes.length > 0
                      ? misPersonajes.map((d, i) => (
                          <ItemSlot key={i}
                            imagen_url={d.imagen_url}
                            nombre={d.nombre ?? "Contacto"}
                            subtitulo={d.reino ?? d.especie}
                            icon={User}
                            onClick={() => handleOpenPersonajeModal(d)} />
                        ))
                      : <EmptySlot label="Sin registros en la agenda" />
                  )}

                </MotionDiv>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}