"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cat, Star, Sword, User, Loader2, X, Users, Music2, ChevronRight, Feather, Shield, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";
import {
  ModalDetalle, EntidadCard, EmptyTab,
  type EntidadModal, type Descubrimiento, type ItemInventario,
} from "./personal/PersonalComponents";

/* ─────────────────────────────────────────────
   PERGAMINO THEME — CSS custom properties
   Inlined as a <style> block so no Tailwind
   config is required for these values.
───────────────────────────────────────────── */
const PARCHMENT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&display=swap');

  :root {
    --parch-bg:       #f2e8c9;
    --parch-mid:      #e8d9a8;
    --parch-dark:     #c9a96e;
    --parch-ink:      #2c1a0e;
    --parch-ink-mid:  #5c3d1e;
    --parch-ink-fade: #8b6340;
    --parch-red:      #8b1a1a;
    --parch-gold:     #b8860b;
    --parch-gold-lt:  #d4a843;
    --parch-shadow:   rgba(44,26,14,0.18);
    --parch-border:   #8b6340;
    --parch-radius:   2px;
  }

  .parch-paper {
    background-color: var(--parch-bg);
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E"),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 28px,
        rgba(44,26,14,0.035) 28px,
        rgba(44,26,14,0.035) 29px
      );
  }

  .parch-card {
    background-color: var(--parch-mid);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
    border: 1.5px solid var(--parch-dark);
    box-shadow: inset 0 0 40px rgba(44,26,14,0.08), 2px 4px 12px var(--parch-shadow);
    position: relative;
  }

  .parch-card::before {
    content: '';
    position: absolute;
    inset: 3px;
    border: 1px solid rgba(139,99,64,0.25);
    border-radius: 1px;
    pointer-events: none;
  }

  .parch-heading {
    font-family: 'Cinzel Decorative', serif;
    color: var(--parch-ink);
    letter-spacing: 0.04em;
  }

  .parch-subheading {
    font-family: 'Cinzel', serif;
    color: var(--parch-ink-mid);
    letter-spacing: 0.12em;
  }

  .parch-body {
    font-family: 'IM Fell English', serif;
    color: var(--parch-ink);
    font-style: italic;
  }

  .parch-label {
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--parch-ink-fade);
  }

  .parch-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0.75rem 0;
  }

  .parch-divider::before,
  .parch-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--parch-dark), transparent);
  }

  .parch-btn {
    font-family: 'Cinzel', serif;
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--parch-ink-mid);
    border: 1px solid var(--parch-dark);
    background: color-mix(in srgb, var(--parch-dark) 10%, transparent);
    padding: 4px 10px;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 1px;
  }

  .parch-btn:hover {
    background: color-mix(in srgb, var(--parch-dark) 22%, transparent);
    color: var(--parch-ink);
  }

  .parch-btn-primary {
    background: var(--parch-ink);
    color: var(--parch-bg);
    border-color: var(--parch-ink);
  }

  .parch-btn-primary:hover {
    background: var(--parch-ink-mid);
    color: var(--parch-bg);
  }

  .parch-seal {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--parch-red);
    border: 2px solid color-mix(in srgb, var(--parch-red) 60%, #000);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.15);
    position: relative;
  }

  .parch-seal::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.18);
  }

  .parch-tab-active {
    background: var(--parch-bg) !important;
    border-color: var(--parch-dark) !important;
    box-shadow: inset 0 0 20px rgba(44,26,14,0.06), 0 2px 8px var(--parch-shadow) !important;
  }

  .parch-tab-active .parch-tab-label { color: var(--parch-ink) !important; }
  .parch-tab-active .parch-tab-count {
    background: var(--parch-gold) !important;
    color: var(--parch-bg) !important;
  }

  .parch-item-card {
    background-color: var(--parch-bg);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
    border: 1px solid var(--parch-dark);
    transition: all 0.2s;
    cursor: pointer;
  }

  .parch-item-card:hover {
    border-color: var(--parch-ink-mid);
    box-shadow: 2px 4px 14px var(--parch-shadow);
    transform: translateY(-1px);
  }

  /* Scroll-end flourish */
  .parch-scroll-top {
    background: linear-gradient(180deg, #c9a96e 0%, #e8d9a8 100%);
    height: 28px;
    border-radius: 4px 4px 0 0;
    border: 1.5px solid var(--parch-border);
    border-bottom: none;
    position: relative;
    box-shadow: 0 -2px 8px rgba(44,26,14,0.12);
  }

  .parch-scroll-top::before {
    content: '— ✦ —';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    color: rgba(44,26,14,0.45);
    letter-spacing: 0.5em;
  }

  .parch-scroll-bottom {
    background: linear-gradient(0deg, #c9a96e 0%, #e8d9a8 100%);
    height: 28px;
    border-radius: 0 0 4px 4px;
    border: 1.5px solid var(--parch-border);
    border-top: none;
    box-shadow: 0 4px 10px rgba(44,26,14,0.15);
  }

  .parch-progress-segment {
    height: 6px;
    border-radius: 1px;
    transition: background 0.6s;
  }

  .parch-stat-bar-filled { background: var(--parch-gold); }
  .parch-stat-bar-empty  { background: color-mix(in srgb, var(--parch-dark) 20%, transparent); }

  .parch-ornament {
    color: var(--parch-gold);
    font-family: 'Cinzel Decorative', serif;
    opacity: 0.6;
  }

  .parch-fav-slot {
    background: color-mix(in srgb, var(--parch-dark) 8%, transparent);
    border: 1px dashed color-mix(in srgb, var(--parch-dark) 40%, transparent);
    border-radius: 2px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .parch-fav-slot:hover {
    background: color-mix(in srgb, var(--parch-dark) 15%, transparent);
    border-style: solid;
  }

  .parch-explorer-chip {
    background: color-mix(in srgb, var(--parch-dark) 10%, var(--parch-bg));
    border: 1px solid var(--parch-dark);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 2px;
  }

  .parch-explorer-chip:hover {
    background: color-mix(in srgb, var(--parch-dark) 22%, var(--parch-bg));
    transform: translateX(2px);
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

/* ── Inline SVG ornaments ─────────────────── */
function OrnamentCorner({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M2 2 L22 2 L22 4 L4 4 L4 22 L2 22 Z" fill="none" stroke="var(--parch-dark)" strokeWidth="1" />
      <circle cx="3" cy="3" r="1.5" fill="var(--parch-gold)" />
    </svg>
  );
}

function OrnamentFlourish() {
  return (
    <span style={{ fontFamily: "'Cinzel Decorative', serif", color: "var(--parch-gold)", fontSize: "0.7rem", opacity: 0.7 }}>
      ✦
    </span>
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

  const misPersonajes      = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas       = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc        = descubrimientos.filter(d => d.tipo === "item");
  const personajesConImagen = misPersonajes.filter(d => d.imagen_url);

  const handleSelectAvatar = async (imgUrl: string) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSavingAvatar(true);
    const { error } = await supabase.from("perfiles").update({ avatar_url: imgUrl }).eq("id", userId);
    if (!error) { setPerfil(prev => prev ? { ...prev, avatar_url: imgUrl } : prev); setShowAvatarPicker(false); }
    setSavingAvatar(false);
  };

  const handleSaveDesc = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSavingDesc(true);
    const { error } = await supabase.from("perfiles").update({ descripcion: descDraft }).eq("id", userId);
    if (!error) { setPerfil(prev => prev ? { ...prev, descripcion: descDraft } : prev); setEditingDesc(false); }
    setSavingDesc(false);
  };

  const handleSaveFavorito = async (tipo: 'personaje' | 'mascota', id: string, data: any) => {
    const userId = userIdRef.current;
    if (!userId) return;
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
    setCancionesPersonaje([]);
    setModalEntidad({ tipo: "personaje", data: d });
    if (!d.entidad_id) return;
    setCargandoCanciones(true);
    try {
      const { data, error } = await supabase.from("canciones").select("id, titulo, portada_url, info_cancion, personaje_id").eq("personaje_id", d.entidad_id).eq("visible", true);
      if (!error && data) setCancionesPersonaje(data);
    } catch (err) {
      console.warn("[Personal] Error cargando canciones:", err);
    } finally {
      setCargandoCanciones(false);
    }
  };

  const tabs = [
    { id: "personajes", label: "Agenda",     icon: User,       count: misPersonajes.length },
    { id: "criaturas",  label: "Bestiario",  icon: Cat,        count: misCriaturas.length },
    { id: "items",      label: "Inventario", icon: Sword,      count: inventario.length + misItemsDesc.length },
  ] as const;

  /* ── Loading state ─────────────────────── */
  if (cargando) return (
    <>
      <style>{PARCHMENT_STYLES}</style>
      <div className="parch-paper flex items-center justify-center min-h-60" style={{ minHeight: "60vh" }}>
        <div className="flex flex-col items-center gap-4">
          <ScrollText size={28} style={{ color: "var(--parch-gold)", opacity: 0.7 }} className="animate-pulse" />
          <span className="parch-label" style={{ letterSpacing: "0.4em" }}>Desenrollando el pergamino…</span>
        </div>
      </div>
    </>
  );

  /* ── RENDER ────────────────────────────── */
  return (
    <>
      <style>{PARCHMENT_STYLES}</style>

      {/* ── Modal: personaje con canciones ── */}
      {modalEntidad && modalEntidad.tipo !== "personaje" && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      <AnimatePresence>
        {modalEntidad && modalEntidad.tipo === "personaje" && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(20,10,4,0.6)" }}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[30rem]"
              style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Scroll top roller */}
              <div className="parch-scroll-top" />

              {/* Modal body */}
              <div className="parch-card flex flex-col flex-1 overflow-hidden" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none" }}>
                {/* Hero image */}
                {modalEntidad.data.imagen_url && (
                  <div className="relative" style={{ height: 200, overflow: "hidden", borderBottom: "1px solid var(--parch-dark)" }}>
                    <img src={modalEntidad.data.imagen_url} alt={modalEntidad.data.nombre}
                      className="w-full h-full object-contain"
                      style={{ background: "color-mix(in srgb, var(--parch-dark) 12%, var(--parch-bg))" }} />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(44,26,14,0.55) 0%, transparent 55%)" }} />
                    <button
                      onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
                      className="parch-btn absolute top-3 right-3"
                      style={{ padding: "4px 8px" }}>
                      <X size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                      <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "1.5rem", color: "var(--parch-bg)", lineHeight: 1.15 }}>
                        {modalEntidad.data.nombre ?? "Personaje"}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {modalEntidad.data.reino && (
                          <span className="parch-label" style={{ color: "color-mix(in srgb, var(--parch-bg) 70%, transparent)" }}>
                            {modalEntidad.data.reino}
                          </span>
                        )}
                        {modalEntidad.data.especie && (
                          <span className="parch-label" style={{ color: "color-mix(in srgb, var(--parch-bg) 70%, transparent)" }}>
                            · {modalEntidad.data.especie}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 py-5">
                  {!modalEntidad.data.imagen_url && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "1.4rem", color: "var(--parch-ink)" }}>
                          {modalEntidad.data.nombre ?? "Personaje"}
                        </h2>
                        <button onClick={() => { setModalEntidad(null); setCancionesPersonaje([]); }} className="parch-btn" style={{ padding: "3px 7px" }}>
                          <X size={11} />
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {modalEntidad.data.reino && <span className="parch-label">{modalEntidad.data.reino}</span>}
                        {modalEntidad.data.especie && <span className="parch-label">· {modalEntidad.data.especie}</span>}
                      </div>
                    </>
                  )}
                  {modalEntidad.data.descripcion && (
                    <p className="parch-body mb-5" style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--parch-ink-mid)" }}>
                      {modalEntidad.data.descripcion}
                    </p>
                  )}

                  <div className="parch-divider">
                    <span className="parch-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Music2 size={9} /> Canciones
                    </span>
                  </div>

                  {cargandoCanciones ? (
                    <div className="flex items-center gap-2 py-6 justify-center">
                      <Loader2 size={14} className="animate-spin" style={{ color: "var(--parch-gold)" }} />
                      <span className="parch-label">Buscando en el archivo…</span>
                    </div>
                  ) : cancionesPersonaje.length === 0 ? (
                    <p className="parch-body text-center py-6" style={{ fontSize: "0.82rem", color: "var(--parch-ink-fade)" }}>
                      "Este personaje no tiene canciones aún…"
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {cancionesPersonaje.map((cancion, i) => (
                        <Link key={cancion.id ?? i} href={`/wiki/canciones/${cancion.id}`}
                          className="group flex items-center gap-3 px-3 py-3 transition-all"
                          style={{
                            background: "color-mix(in srgb, var(--parch-dark) 6%, var(--parch-bg))",
                            border: "1px solid var(--parch-dark)",
                            borderRadius: "1px",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--parch-dark) 18%, var(--parch-bg))"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--parch-dark) 6%, var(--parch-bg))"; }}>
                          {cancion.portada_url && !cancion.portada_url.includes("placeholder") ? (
                            <div className="w-11 h-11 shrink-0 overflow-hidden" style={{ borderRadius: "1px", border: "1px solid var(--parch-dark)" }}>
                              <img src={cancion.portada_url} alt={cancion.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 shrink-0 flex items-center justify-center" style={{ borderRadius: "1px", background: "color-mix(in srgb, var(--parch-dark) 12%, transparent)", border: "1px solid var(--parch-dark)" }}>
                              <Music2 size={14} style={{ color: "var(--parch-gold)" }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="parch-body text-[12px] truncate block" style={{ fontStyle: "italic" }}>
                              {cancion.titulo ?? `Canción ${i + 1}`}
                            </span>
                            {cancion.info_cancion && (
                              <span className="parch-label truncate block mt-0.5">{cancion.info_cancion}</span>
                            )}
                          </div>
                          <ChevronRight size={12} style={{ color: "var(--parch-gold)", flexShrink: 0 }} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Scroll bottom roller */}
              <div className="parch-scroll-bottom" />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ── Avatar picker ────────────────── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(20,10,4,0.55)" }} />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-96"
              style={{ maxHeight: "80dvh", display: "flex", flexDirection: "column" }}>
              <div className="parch-scroll-top" />
              <div className="parch-card flex flex-col flex-1 overflow-hidden" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none" }}>
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--parch-dark)" }}>
                  <span className="parch-subheading" style={{ fontSize: "0.75rem" }}>Elegir efigie</span>
                  <button onClick={() => setShowAvatarPicker(false)} className="parch-btn" style={{ padding: "3px 7px" }}><X size={12} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {personajesConImagen.map((d, i) => (
                      <button key={i} onClick={() => handleSelectAvatar(d.imagen_url!)} disabled={savingAvatar}
                        className="aspect-square overflow-hidden transition-all"
                        style={{
                          border: perfil?.avatar_url === d.imagen_url ? "2px solid var(--parch-gold)" : "1px solid var(--parch-dark)",
                          borderRadius: "1px",
                          background: "color-mix(in srgb, var(--parch-dark) 10%, var(--parch-bg))",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--parch-ink)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = perfil?.avatar_url === d.imagen_url ? "var(--parch-gold)" : "var(--parch-dark)"; }}>
                        <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="parch-scroll-bottom" />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ── Personaje picker ─────────────── */}
      <AnimatePresence>
        {showPersonajePicker && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPersonajePicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(20,10,4,0.55)" }} />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-96"
              style={{ maxHeight: "80dvh", display: "flex", flexDirection: "column" }}>
              <div className="parch-scroll-top" />
              <div className="parch-card flex flex-col flex-1 overflow-hidden" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none" }}>
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--parch-dark)" }}>
                  <span className="parch-subheading" style={{ fontSize: "0.75rem" }}>Elegir personaje favorito</span>
                  <button onClick={() => setShowPersonajePicker(false)} className="parch-btn" style={{ padding: "3px 7px" }}><X size={12} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-3">
                  <p className="parch-label px-2 mb-3" style={{ fontSize: "0.55rem" }}>Solo personajes ya descubiertos</p>
                  {misPersonajes.length === 0 ? (
                    <p className="parch-body text-center py-8" style={{ fontSize: "0.82rem", color: "var(--parch-ink-fade)" }}>"Aún no has conocido a nadie…"</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {misPersonajes.map((p, i) => {
                        const isSel = perfil?.personaje_favorito_id === p.entidad_id;
                        return (
                          <button key={i}
                            onClick={() => handleSaveFavorito('personaje', p.entidad_id, { id: p.entidad_id, nombre: p.nombre, img_url: p.imagen_url })}
                            disabled={savingFav === 'personaje'}
                            className="flex flex-col items-center gap-1.5 p-2 transition-all"
                            style={{
                              border: isSel ? "2px solid var(--parch-gold)" : "1px solid var(--parch-dark)",
                              background: isSel ? "color-mix(in srgb, var(--parch-gold) 10%, var(--parch-bg))" : "transparent",
                              borderRadius: "1px",
                            }}>
                            <div className="w-14 h-14 overflow-hidden" style={{ borderRadius: "1px", background: "color-mix(in srgb, var(--parch-dark) 10%, transparent)" }}>
                              {p.imagen_url
                                ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-contain" />
                                : <User size={20} className="m-auto mt-2.5" style={{ color: "var(--parch-ink-fade)" }} />}
                            </div>
                            <span className="parch-label truncate w-full text-center" style={{ color: isSel ? "var(--parch-gold)" : "var(--parch-ink-fade)" }}>{p.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="parch-scroll-bottom" />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ── Mascota picker ───────────────── */}
      <AnimatePresence>
        {showMascotaPicker && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMascotaPicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(20,10,4,0.55)" }} />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-96"
              style={{ maxHeight: "80dvh", display: "flex", flexDirection: "column" }}>
              <div className="parch-scroll-top" />
              <div className="parch-card flex flex-col flex-1 overflow-hidden" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none" }}>
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--parch-dark)" }}>
                  <span className="parch-subheading" style={{ fontSize: "0.75rem" }}>Elegir mascota</span>
                  <button onClick={() => setShowMascotaPicker(false)} className="parch-btn" style={{ padding: "3px 7px" }}><X size={12} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-3">
                  <p className="parch-label px-2 mb-3" style={{ fontSize: "0.55rem" }}>Solo criaturas ya descubiertas</p>
                  {misCriaturas.length === 0 ? (
                    <p className="parch-body text-center py-8" style={{ fontSize: "0.82rem", color: "var(--parch-ink-fade)" }}>"Aún no has descubierto ninguna criatura…"</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {misCriaturas.map((c, i) => {
                        const isSel = perfil?.mascota_id === c.entidad_id;
                        return (
                          <button key={i}
                            onClick={() => handleSaveFavorito('mascota', c.entidad_id, { id: c.entidad_id, nombre: c.nombre, imagen_url: c.imagen_url })}
                            disabled={savingFav === 'mascota'}
                            className="flex flex-col items-center gap-1.5 p-2 transition-all"
                            style={{
                              border: isSel ? "2px solid var(--parch-gold)" : "1px solid var(--parch-dark)",
                              background: isSel ? "color-mix(in srgb, var(--parch-gold) 10%, var(--parch-bg))" : "transparent",
                              borderRadius: "1px",
                            }}>
                            <div className="w-14 h-14 overflow-hidden" style={{ borderRadius: "1px", background: "color-mix(in srgb, var(--parch-dark) 10%, transparent)" }}>
                              {c.imagen_url
                                ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-contain" />
                                : <Cat size={20} className="m-auto mt-2.5" style={{ color: "var(--parch-ink-fade)" }} />}
                            </div>
                            <span className="parch-label truncate w-full text-center" style={{ color: isSel ? "var(--parch-gold)" : "var(--parch-ink-fade)" }}>{c.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="parch-scroll-bottom" />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════
          MAIN LAYOUT — Parchment scroll
      ════════════════════════════════════ */}
      <div className="parch-paper w-full min-h-screen" style={{ paddingBottom: "5rem" }}>
        <div className="w-full max-w-7xl mx-auto">

          {/* ── HERO HEADER — decorative banner + avatar ── */}
          <div style={{ position: "relative" }}>

            {/* Top banner strip with aged texture */}
            <div style={{
              height: 112,
              background: "linear-gradient(180deg, #b8960c 0%, #c9a83c 40%, #e8d9a8 100%)",
              borderBottom: "2px solid var(--parch-border)",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Diagonal hatching pattern */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  rgba(44,26,14,0.06) 0px, rgba(44,26,14,0.06) 1px,
                  transparent 1px, transparent 18px
                )`,
              }} />
              {/* Corner ornaments */}
              <OrnamentCorner style={{ position: "absolute", top: 8, left: 8 }} />
              <OrnamentCorner style={{ position: "absolute", top: 8, right: 8, transform: "scaleX(-1)" }} />

              {/* Discovery count badge */}
              <div style={{
                position: "absolute", top: 12, right: 40,
                border: "1px solid rgba(44,26,14,0.35)",
                borderRadius: "1px",
                background: "rgba(242,232,201,0.82)",
                backdropFilter: "blur(4px)",
                padding: "5px 12px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Star size={9} style={{ color: "var(--parch-gold)" }} />
                <span className="parch-label" style={{ fontSize: "0.6rem" }}>
                  {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length} descubrimientos
                </span>
              </div>

              {/* Title in banner */}
              <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
                <span className="parch-label" style={{ fontSize: "0.5rem", letterSpacing: "0.5em", color: "rgba(44,26,14,0.5)" }}>
                  ✦ Crónica del Aventurero ✦
                </span>
              </div>
            </div>

            {/* Avatar + identity row */}
            <div className="px-6 md:px-10 flex items-end gap-5 md:gap-7"
              style={{ marginTop: "-56px", paddingBottom: "20px", position: "relative", zIndex: 2 }}>

              {/* Avatar with wax-seal style border */}
              <button
                onClick={() => setShowAvatarPicker(true)}
                title="Cambiar imagen de perfil"
                style={{
                  width: 108, height: 108,
                  borderRadius: "50%",
                  overflow: "visible",
                  border: "none",
                  background: "transparent",
                  flexShrink: 0,
                  cursor: "pointer",
                  position: "relative",
                }}>
                {/* Outer gold ring */}
                <div style={{
                  position: "absolute", inset: -4,
                  borderRadius: "50%",
                  background: "conic-gradient(from 0deg, var(--parch-gold), var(--parch-dark) 25%, var(--parch-gold) 50%, var(--parch-dark) 75%, var(--parch-gold))",
                  boxShadow: "0 4px 20px rgba(44,26,14,0.28)",
                }} />
                {/* Image container */}
                <div style={{
                  position: "absolute", inset: 3,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "color-mix(in srgb, var(--parch-dark) 14%, var(--parch-bg))",
                  border: "2px solid var(--parch-bg)",
                }}>
                  {perfil?.avatar_url
                    ? <img src={perfil.avatar_url} alt={perfil?.username} className="w-full h-full object-contain" />
                    : <User size={38} style={{ position: "absolute", inset: 0, margin: "auto", color: "var(--parch-ink-fade)" }} />}
                </div>
                {/* "Cambiar" hover overlay */}
                <div className="group-hover:opacity-100" style={{
                  position: "absolute", inset: 3, borderRadius: "50%",
                  background: "rgba(44,26,14,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0, transition: "opacity 0.2s",
                }}>
                  <span className="parch-label" style={{ color: "var(--parch-bg)", fontSize: "0.5rem" }}>Cambiar</span>
                </div>
              </button>

              {/* Name + title + status */}
              <div className="flex flex-col gap-1 pb-2">
                {perfil?.titulo && (
                  <div style={{
                    display: "inline-flex", width: "fit-content",
                    alignItems: "center", gap: 6,
                    padding: "2px 10px",
                    border: "1px solid var(--parch-gold)",
                    background: "color-mix(in srgb, var(--parch-gold) 10%, var(--parch-bg))",
                    borderRadius: "1px",
                  }}>
                    <Star size={7} style={{ color: "var(--parch-gold)" }} />
                    <span className="parch-label" style={{ color: "var(--parch-gold)", fontSize: "0.5rem" }}>{perfil.titulo}</span>
                  </div>
                )}
                <h1 style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: "clamp(1.5rem, 4vw, 2.4rem)",
                  color: "var(--parch-ink)",
                  lineHeight: 1.1,
                  letterSpacing: "0.02em",
                  textShadow: "1px 1px 0 rgba(139,99,64,0.2)",
                }}>
                  {perfil?.username ?? "…"}
                </h1>
                <p className="parch-body" style={{ fontSize: "0.8rem", color: "var(--parch-ink-fade)", fontStyle: "italic" }}>
                  {perfil?.status ?? "Enciclopedia"}
                </p>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════
              BODY — sidebar + content
          ════════════════════════════════ */}
          <div className="flex gap-5 items-start mt-2 px-4 md:px-8">

            {/* ── LEFT SIDEBAR ── */}
            <div className="w-full md:w-64 xl:w-72 shrink-0 md:sticky md:top-16 self-start flex flex-col gap-4 animate-in fade-in duration-500">

              {/* ── PANEL: Stats + Bio + Favoritos ── */}
              <div className="parch-card" style={{ borderRadius: "2px" }}>

                {/* Registro / Stats */}
                <div style={{ padding: "20px 20px 16px" }}>
                  <div className="parch-divider" style={{ marginTop: 0 }}>
                    <span className="parch-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <ScrollText size={8} /> Registro
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { icon: <User size={10} />,  label: "Amigos",    count: misPersonajes.length,                        max: 20 },
                      { icon: <Cat size={10} />,   label: "Criaturas", count: misCriaturas.length,                          max: 30 },
                      { icon: <Sword size={10} />, label: "Objetos",   count: inventario.length + misItemsDesc.length,      max: 50 },
                    ].map(({ icon, label, count, max }) => (
                      <div key={label}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--parch-ink-fade)" }}>
                            {icon}
                            <span className="parch-label">{label}</span>
                          </div>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.85rem", fontWeight: 700, color: "var(--parch-ink)" }}>
                            {count}
                          </span>
                        </div>
                        {/* Dotted progress bar */}
                        <div style={{ display: "flex", gap: 3 }}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i}
                              className={`parch-progress-segment flex-1 ${i < Math.round((count / max) * 10) ? "parch-stat-bar-filled" : "parch-stat-bar-empty"}`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--parch-dark)", margin: "0 16px", opacity: 0.3 }} />

                {/* Bio / Sobre mí */}
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Feather size={9} style={{ color: "var(--parch-gold)" }} />
                      <span className="parch-label">Sobre mí</span>
                    </div>
                    {!editingDesc ? (
                      <button className="parch-btn"
                        onClick={() => { setDescDraft(perfil?.descripcion ?? ''); setEditingDesc(true); }}>
                        Editar
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="parch-btn" onClick={() => setEditingDesc(false)}>Cancelar</button>
                        <button className="parch-btn parch-btn-primary" onClick={handleSaveDesc} disabled={savingDesc}>
                          {savingDesc ? "…" : "Guardar"}
                        </button>
                      </div>
                    )}
                  </div>

                  {editingDesc ? (
                    <textarea
                      value={descDraft}
                      onChange={e => setDescDraft(e.target.value)}
                      autoFocus rows={4}
                      placeholder="Escribe algo sobre ti…"
                      className="parch-body"
                      style={{
                        width: "100%", background: "transparent", outline: "none",
                        resize: "none", fontSize: "0.85rem", color: "var(--parch-ink)",
                        caretColor: "var(--parch-ink)", lineHeight: 1.7,
                        border: "1px dashed var(--parch-dark)", padding: 8, borderRadius: 1,
                      }}
                    />
                  ) : perfil?.descripcion ? (
                    <p className="parch-body" style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--parch-ink-mid)" }}>
                      {perfil.descripcion}
                    </p>
                  ) : (
                    <p className="parch-body" style={{ fontSize: "0.82rem", color: "var(--parch-ink-fade)", fontStyle: "italic" }}>
                      "Sin descripción aún… pulsa Editar."
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--parch-dark)", margin: "0 16px", opacity: 0.3 }} />

                {/* Favoritos grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  {/* Personaje favorito */}
                  <button onClick={() => setShowPersonajePicker(true)}
                    className="parch-fav-slot text-left"
                    style={{ margin: 12, marginRight: 6, borderRadius: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                      <Star size={7} style={{ color: "var(--parch-gold)" }} />
                      <span className="parch-label" style={{ fontSize: "0.5rem" }}>Fav. personaje</span>
                    </div>
                    {perfil?.personaje_favorito ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 36, height: 36, flexShrink: 0, overflow: "hidden", borderRadius: 1, border: "1px solid var(--parch-dark)", background: "color-mix(in srgb, var(--parch-dark) 8%, transparent)" }}>
                          {perfil.personaje_favorito.img_url
                            ? <img src={perfil.personaje_favorito.img_url} alt={perfil.personaje_favorito.nombre} className="w-full h-full object-contain" />
                            : <User size={14} style={{ margin: "auto", display: "block", marginTop: 10, color: "var(--parch-ink-fade)" }} />}
                        </div>
                        <span className="parch-body" style={{ fontSize: "0.72rem", textAlign: "left", lineHeight: 1.3 }}>{perfil.personaje_favorito.nombre}</span>
                      </div>
                    ) : (
                      <span className="parch-body" style={{ fontSize: "0.72rem", color: "var(--parch-ink-fade)" }}>Ninguno…</span>
                    )}
                  </button>

                  {/* Mascota */}
                  <button onClick={() => setShowMascotaPicker(true)}
                    className="parch-fav-slot text-left"
                    style={{ margin: 12, marginLeft: 6, borderRadius: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                      <Star size={7} style={{ color: "var(--parch-gold)" }} />
                      <span className="parch-label" style={{ fontSize: "0.5rem" }}>Mascota</span>
                    </div>
                    {perfil?.mascota ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 36, height: 36, flexShrink: 0, overflow: "hidden", borderRadius: 1, border: "1px solid var(--parch-dark)", background: "color-mix(in srgb, var(--parch-dark) 8%, transparent)" }}>
                          {perfil.mascota.imagen_url
                            ? <img src={perfil.mascota.imagen_url} alt={perfil.mascota.nombre} className="w-full h-full object-contain" />
                            : <Cat size={14} style={{ margin: "auto", display: "block", marginTop: 10, color: "var(--parch-ink-fade)" }} />}
                        </div>
                        <span className="parch-body" style={{ fontSize: "0.72rem", textAlign: "left", lineHeight: 1.3 }}>{perfil.mascota.nombre}</span>
                      </div>
                    ) : (
                      <span className="parch-body" style={{ fontSize: "0.72rem", color: "var(--parch-ink-fade)" }}>Ninguna…</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile explorers */}
              {otrosPerfiles.length > 0 && (
                <div className="lg:hidden">
                  <div className="parch-divider">
                    <span className="parch-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Users size={8} /> Exploradores
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {otrosPerfiles.map(p => (
                      <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                        <div className="parch-explorer-chip">
                          <div style={{ width: 20, height: 20, flexShrink: 0, overflow: "hidden", borderRadius: "50%", background: "color-mix(in srgb, var(--parch-dark) 12%, transparent)", border: "1px solid var(--parch-dark)" }}>
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                              : <User size={9} style={{ margin: "auto", display: "block", marginTop: 5, color: "var(--parch-ink-fade)" }} />}
                          </div>
                          <span className="parch-label" style={{ fontSize: "0.55rem" }}>{p.username}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="flex gap-5 flex-1 min-w-0 items-start">

              {/* Collection area */}
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

                {/* ── TABS ── */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {tabs.map(t => {
                    const isActive = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={isActive ? "parch-tab-active" : ""}
                        style={{
                          flex: 1,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: 5, padding: "12px 8px",
                          background: isActive ? undefined : "color-mix(in srgb, var(--parch-dark) 5%, var(--parch-bg))",
                          border: `1px solid ${isActive ? "var(--parch-dark)" : "color-mix(in srgb, var(--parch-dark) 30%, transparent)"}`,
                          borderRadius: "2px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          position: "relative",
                        }}>
                        {/* Top accent line when active */}
                        {isActive && (
                          <div style={{
                            position: "absolute", top: -1, left: 12, right: 12,
                            height: 2, background: "var(--parch-gold)", borderRadius: "0 0 2px 2px",
                          }} />
                        )}
                        <t.icon size={14} style={{ color: isActive ? "var(--parch-ink)" : "var(--parch-ink-fade)" }} />
                        <span className="parch-tab-label parch-label" style={{ color: isActive ? "var(--parch-ink)" : "var(--parch-ink-fade)" }}>
                          {t.label}
                        </span>
                        <div className="parch-tab-count" style={{
                          padding: "1px 7px",
                          background: isActive ? "var(--parch-gold)" : "color-mix(in srgb, var(--parch-dark) 14%, transparent)",
                          borderRadius: "1px",
                        }}>
                          <span style={{
                            fontFamily: "'Cinzel', serif", fontSize: "0.6rem", fontWeight: 700,
                            color: isActive ? "var(--parch-bg)" : "var(--parch-ink-fade)",
                          }}>{t.count}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ── COLLECTION PANEL ── */}
                <div className="parch-scroll-top" />
                <div className="parch-card" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none" }}>
                  {/* Panel header */}
                  <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid color-mix(in srgb, var(--parch-dark) 30%, transparent)" }}>
                    <div className="parch-divider" style={{ margin: 0 }}>
                      <OrnamentFlourish />
                      <span className="parch-label">
                        {tab === "personajes" ? "Agenda de Contactos" : tab === "criaturas" ? "Bestiario" : "Inventario de Objetos"}
                      </span>
                      <OrnamentFlourish />
                    </div>
                  </div>

                  {/* Grid */}
                  <div style={{ padding: "16px" }}>
                    <AnimatePresence mode="wait">
                      <MotionDiv
                        key={tab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.22 }}
                        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>

                        {/* ── ITEMS ── */}
                        {tab === "items" && (
                          inventario.length + misItemsDesc.length > 0
                            ? [...inventario.map(inv => ({ ...inv.items, equipado: inv.equipado, tipo: "inv" })), ...misItemsDesc].map((d: any, i) => (
                              <button
                                key={i}
                                onClick={() => d.tipo !== "inv" ? setModalEntidad({ tipo: "item", data: d }) : undefined}
                                className="parch-item-card text-left"
                                style={{ borderRadius: 1 }}>
                                <div style={{ height: 100, overflow: "hidden", borderBottom: "1px solid var(--parch-dark)", background: "color-mix(in srgb, var(--parch-dark) 6%, var(--parch-bg))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {d.imagen_url
                                    ? <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain" style={{ transition: "transform 0.5s" }} />
                                    : <Sword size={22} style={{ color: "var(--parch-gold)", opacity: 0.4 }} />}
                                </div>
                                <div style={{ padding: "8px 10px" }}>
                                  <p className="parch-body" style={{ fontSize: "0.72rem", lineHeight: 1.3, textTransform: "capitalize" }}>{d.nombre ?? "Objeto"}</p>
                                  {d.categoria && <p className="parch-label" style={{ fontSize: "0.48rem", marginTop: 3 }}>{d.categoria}</p>}
                                  {d.equipado && <p className="parch-label" style={{ fontSize: "0.48rem", color: "var(--parch-gold)", marginTop: 2 }}>✦ Equipado</p>}
                                </div>
                              </button>
                            ))
                            : <div style={{ gridColumn: "1 / -1" }}><EmptyTab label="Sin registros en el inventario" /></div>
                        )}

                        {/* ── CRIATURAS ── */}
                        {tab === "criaturas" && (
                          misCriaturas.length > 0
                            ? misCriaturas.map((d, i) => (
                              <button
                                key={i}
                                onClick={() => setModalEntidad({ tipo: "criatura", data: d })}
                                className="parch-item-card text-left"
                                style={{ borderRadius: 1 }}>
                                <div style={{ height: 100, overflow: "hidden", borderBottom: "1px solid var(--parch-dark)", background: "color-mix(in srgb, var(--parch-dark) 6%, var(--parch-bg))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {d.imagen_url
                                    ? <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain" />
                                    : <Cat size={22} style={{ color: "var(--parch-gold)", opacity: 0.4 }} />}
                                </div>
                                <div style={{ padding: "8px 10px" }}>
                                  <p className="parch-body" style={{ fontSize: "0.72rem", lineHeight: 1.3, textTransform: "capitalize" }}>{d.nombre ?? "Criatura"}</p>
                                  {d.habitat && <p className="parch-label" style={{ fontSize: "0.48rem", marginTop: 3 }}>{d.habitat}</p>}
                                </div>
                              </button>
                            ))
                            : <div style={{ gridColumn: "1 / -1" }}><EmptyTab label="Sin registros en el bestiario" /></div>
                        )}

                        {/* ── PERSONAJES ── */}
                        {tab === "personajes" && (
                          misPersonajes.length > 0
                            ? misPersonajes.map((d, i) => (
                              <button
                                key={i}
                                onClick={() => handleOpenPersonajeModal(d)}
                                className="parch-item-card text-left"
                                style={{ borderRadius: 1 }}>
                                <div style={{ height: 100, overflow: "hidden", borderBottom: "1px solid var(--parch-dark)", background: "color-mix(in srgb, var(--parch-dark) 6%, var(--parch-bg))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {d.imagen_url
                                    ? <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain" />
                                    : <User size={22} style={{ color: "var(--parch-gold)", opacity: 0.4 }} />}
                                </div>
                                <div style={{ padding: "8px 10px" }}>
                                  <p className="parch-body" style={{ fontSize: "0.72rem", lineHeight: 1.3, textTransform: "capitalize" }}>{d.nombre ?? "Contacto"}</p>
                                  {(d.reino || d.especie) && (
                                    <p className="parch-label" style={{ fontSize: "0.48rem", marginTop: 3 }}>{d.reino ?? d.especie}</p>
                                  )}
                                </div>
                              </button>
                            ))
                            : <div style={{ gridColumn: "1 / -1" }}><EmptyTab label="Sin registros en la agenda" /></div>
                        )}

                      </MotionDiv>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="parch-scroll-bottom" />
              </div>

              {/* ── Desktop sidebar: Exploradores ── */}
              {otrosPerfiles.length > 0 && (
                <aside className="hidden lg:flex flex-col gap-0 w-44 xl:w-52 shrink-0 sticky top-24 pt-0">

                  <div className="parch-divider" style={{ marginBottom: 10 }}>
                    <span className="parch-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Users size={8} /> Exploradores
                    </span>
                  </div>

                  <div className="parch-scroll-top" style={{ height: 20 }} />
                  <div className="parch-card" style={{ borderRadius: 0, borderTop: "none", borderBottom: "none" }}>
                    {otrosPerfiles.map((p, idx) => (
                      <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                        <MotionDiv
                          whileHover={{ x: 3 }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 12px", cursor: "pointer",
                            borderBottom: idx < otrosPerfiles.length - 1
                              ? "1px solid color-mix(in srgb, var(--parch-dark) 20%, transparent)"
                              : "none",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--parch-dark) 8%, transparent)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                          <div style={{
                            width: 28, height: 28, flexShrink: 0, overflow: "hidden",
                            borderRadius: "50%",
                            background: "color-mix(in srgb, var(--parch-dark) 10%, transparent)",
                            border: "1.5px solid var(--parch-dark)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                              : <User size={11} style={{ color: "var(--parch-ink-fade)" }} />}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="parch-subheading" style={{ fontSize: "0.6rem", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.username}
                            </p>
                            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                              {[
                                { icon: <Sword size={6} />, n: p.items_count },
                                { icon: <Cat size={6} />,   n: p.criaturas_count },
                                { icon: <User size={6} />,  n: p.personajes_count },
                              ].map(({ icon, n }, i) => (
                                <span key={i} style={{ display: "flex", alignItems: "center", gap: 2, color: "var(--parch-ink-fade)" }}>
                                  {icon}
                                  <span className="parch-label" style={{ fontSize: "0.48rem" }}>{n}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <span style={{ color: "var(--parch-gold)", fontSize: "0.7rem", flexShrink: 0 }}>›</span>
                        </MotionDiv>
                      </Link>
                    ))}
                  </div>
                  <div className="parch-scroll-bottom" style={{ height: 20 }} />
                </aside>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}