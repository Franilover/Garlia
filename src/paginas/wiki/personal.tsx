"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ShieldCheck, X, Calendar, Tag, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

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
}

interface Descubrimiento {
  tipo: "item" | "criatura" | "personaje";
  entidad_id: string;
  fecha_descubrimiento: string;
  nombre?: string;
  descripcion?: string;
  imagen_url?: string;
  img_url?: string;
  categoria?: string;
  rareza?: string;
  habitat?: string;
  alma?: string;
  reino?: string;
  especie?: string;
}

interface ItemInventario {
  equipado: boolean;
  items: {
    id: string;
    nombre: string;
    categoria: string;
    imagen_url?: string;
    descripcion?: string;
  };
}

// Prop opcional — si el padre lo pasa bien úsalo, si no lo fetcheamos aquí
interface PersonalProps {
  datos?: {
    username?: string;
    status?: string;
    avatar_url?: string;
    descubrimientos?: Descubrimiento[];
    inventario_usuario?: ItemInventario[];
  };
}

// ─── MODAL FLOTANTE ───────────────────────────────────────────────────────────

type EntidadModal =
  | { tipo: "item_inv"; data: ItemInventario }
  | { tipo: "item" | "criatura" | "personaje"; data: Descubrimiento };

function ModalDetalle({ entidad, onClose }: { entidad: EntidadModal; onClose: () => void }) {
  const isItemInv  = entidad.tipo === "item_inv";
  const isItem     = isItemInv || entidad.tipo === "item";
  const isCriatura = entidad.tipo === "criatura";

  const nombre = isItemInv
    ? (entidad.data as ItemInventario).items.nombre
    : (entidad.data as Descubrimiento).nombre
      ?? (isCriatura ? "Criatura Desconocida" : entidad.tipo === "item" ? "Objeto" : "Contacto");

  const descripcion = isItemInv
    ? (entidad.data as ItemInventario).items.descripcion
    : (entidad.data as Descubrimiento).descripcion;

  const imagen = isItemInv
    ? (entidad.data as ItemInventario).items.imagen_url
    : ((entidad.data as Descubrimiento).imagen_url ?? (entidad.data as Descubrimiento).img_url);

  const fecha = isItemInv ? null : (entidad.data as Descubrimiento).fecha_descubrimiento;

  const tags: string[] = [];
  if (isItemInv) {
    const d = (entidad.data as ItemInventario).items;
    if (d.categoria) tags.push(d.categoria);
    if ((entidad.data as ItemInventario).equipado) tags.push("Equipado");
  } else {
    const d = entidad.data as Descubrimiento;
    if (d.categoria) tags.push(d.categoria);
    if (d.rareza)    tags.push(d.rareza!);
    if (d.habitat)   tags.push(d.habitat!);
    if (d.alma)      tags.push(`Alma ${d.alma}`);
    if (d.reino)     tags.push(d.reino!);
    if (d.especie)   tags.push(d.especie!);
  }

  const IconComp = isItem ? Package : isCriatura ? Sword : User;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-primary/10 backdrop-blur-sm"
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-sm overflow-hidden"
          style={{
            background: "var(--white-custom)",
            borderRadius: "var(--radius-card)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            boxShadow: "var(--shadow-card)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Imagen / placeholder */}
          <div className="relative h-40 flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
            {imagen
              ? <img src={imagen} alt={nombre} className="w-full h-full object-cover" />
              : <IconComp size={48} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
            }
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform"
              style={{
                background: "color-mix(in srgb, var(--white-custom) 80%, transparent)",
                borderRadius: "var(--radius-btn)",
                border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              }}>
              <X size={14} style={{ color: "var(--primary)" }} />
            </button>
            <div className="absolute bottom-3 left-3 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
              style={{
                background: "color-mix(in srgb, var(--white-custom) 80%, transparent)",
                borderRadius: "var(--radius-btn)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              }}>
              {entidad.tipo}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight leading-tight" style={{ color: "var(--primary)" }}>
                {nombre}
              </h2>
              {fecha && (
                <p className="flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  <Calendar size={10} />
                  Registrado el {new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span key={i}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      color: "color-mix(in srgb, var(--primary) 70%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      borderRadius: "var(--radius-btn)",
                    }}>
                    <Tag size={8} /> {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)" }}>
              {descripcion
                ? <p className="text-[11px] leading-relaxed font-medium" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>{descripcion}</p>
                : <p className="text-[11px] italic font-black uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>"Sin descripción disponible"</p>
              }
            </div>

            {isItemInv && (entidad.data as ItemInventario).equipado && (
              <div className="flex items-center gap-2 px-3 py-2"
                style={{
                  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}>
                <ShieldCheck size={14} style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }} />
                <span className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                  Actualmente equipado
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── CARD DE ENTIDAD ──────────────────────────────────────────────────────────

function EntidadCard({ imagen, nombre, sub, icono, onClick }: {
  imagen?: string; nombre: string; sub: string;
  icono: React.ReactNode; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="group p-4 flex items-center gap-4 text-left cursor-pointer transition-all w-full"
      style={{
        background: "var(--bg-main)",
        border: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)",
        borderRadius: "var(--radius-card)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "color-mix(in srgb, var(--primary) 20%, transparent)";
        el.style.boxShadow = "var(--shadow-card)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "color-mix(in srgb, var(--primary) 5%, transparent)";
        el.style.boxShadow = "none";
      }}
    >
      <div className="w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-transform"
        style={{
          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          borderRadius: "var(--radius-btn)",
          color: "color-mix(in srgb, var(--primary) 35%, transparent)",
        }}>
        {imagen
          ? <img src={imagen} alt={nombre} className="w-full h-full object-contain p-1" />
          : icono
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-tight truncate" style={{ color: "var(--primary)" }}>{nombre}</p>
        <p className="text-[9px] font-black uppercase" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>{sub}</p>
      </div>
    </button>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="col-span-full py-20 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] italic"
        style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
        "{label}"
      </p>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Personal({ datos: datosProp }: PersonalProps) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("items");
  const [modalEntidad, setModalEntidad] = useState<EntidadModal | null>(null);

  const [perfil, setPerfil]           = useState<Perfil | null>(null);
  const [inventario, setInventario]   = useState<ItemInventario[]>(datosProp?.inventario_usuario ?? []);
  const [descubrimientos, setDescubrimientos] = useState<Descubrimiento[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [otrosPerfiles, setOtrosPerfiles] = useState<PerfilResumen[]>([]);
  const userIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    async function cargarTodo() {
      setCargando(true);
      try {
        // ── 1. Usuario actual ──────────────────────────────────────────────
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn("[Personal] Sin sesión activa:", userError?.message);
          setCargando(false);
          return;
        }
        userIdRef.current = user.id;

        // ── 2. Perfil desde tabla `perfiles` ───────────────────────────────
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select("username, status, rol, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError) console.warn("[Personal] Error al cargar perfil:", perfilError.message);

        setPerfil({
          username:   perfilData?.username   ?? datosProp?.username ?? user.email?.split("@")[0] ?? "Aventurero",
          status:     perfilData?.status     ?? datosProp?.status,
          avatar_url: perfilData?.avatar_url ?? datosProp?.avatar_url,
        });

        // ── 3. Inventario ──────────────────────────────────────────────────
        // Solo fetchear si el padre no lo pasó
        if (!datosProp?.inventario_usuario?.length) {
          const { data: invData, error: invError } = await supabase
            .from("inventario_usuario")
            .select("equipado, items(id, nombre, categoria, imagen_url, descripcion)")
            .eq("perfil_id", user.id);
          if (invError) console.warn("[Personal] Error inventario:", invError.message);
          if (invData)  setInventario(invData as unknown as ItemInventario[]);
        }

        // ── 4. Descubrimientos desde las 3 tablas ─────────────────────────
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

        // ── 5. Otros perfiles (excluir el propio) ─────────────────────────
        const { data: perfilesData } = await supabase
          .from("perfiles")
          .select("id, username, status, avatar_url")
          .neq("id", user.id)
          .order("username");

        if (perfilesData && perfilesData.length > 0) {
          // Contar descubrimientos de cada perfil
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas  = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc  = descubrimientos.filter(d => d.tipo === "item");

  // Personajes desbloqueados que tienen imagen — candidatos para avatar
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

  const tabs = [
    { id: "items",      label: "Inventario", icon: Package },
    { id: "criaturas",  label: "Bestiario",  icon: Sword   },
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
      {modalEntidad && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      {/* ── AVATAR PICKER MODAL ── */}
      <AnimatePresence>
        {showAvatarPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />
            <motion.div
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
              {/* Header */}
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

              {/* Grid de personajes */}
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
                    {/* Opción quitar avatar */}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── LAYOUT CON SIDEBAR ── */}

      {/* ── LAYOUT PRINCIPAL ── */}
      {/* Desktop: [exploradores | ficha perfil | colección full-width] */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-20">

        {/* Banner con patrón decorativo */}
        <div className="relative w-full h-24 md:h-32 overflow-hidden"
          style={{ borderRadius: `var(--radius-card) var(--radius-card) 0 0`, background: "color-mix(in srgb, var(--primary) 7%, var(--bg-main))" }}>
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 50%)", backgroundSize: "16px 16px" }} />
          <div className="absolute bottom-0 left-0 right-0 h-12"
            style={{ background: "linear-gradient(to top, var(--bg-main), transparent)" }} />
          <div className="absolute top-3 right-5">
            <span className="text-[8px] font-black uppercase tracking-[0.3em]"
              style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
              {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length} descubrimientos
            </span>
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* COL 2 — ficha del perfil */}
          <div className="w-full md:w-60 xl:w-68 shrink-0 md:sticky md:top-16 -mt-10 animate-in fade-in duration-500">
            <div className="mx-4 md:mx-0"
              style={{
                background: "var(--white-custom)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
              }}>

              {/* Avatar */}
              <div className="flex justify-center pt-5 pb-3">
                <button onClick={() => setShowAvatarPicker(true)}
                  className="group relative overflow-hidden flex items-center justify-center transition-all"
                  style={{ width: 88, height: 88, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 8%, var(--bg-main))", border: "3px solid var(--white-custom)", boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent)" }}
                  title="Cambiar foto de perfil">
                  {perfil?.avatar_url
                    ? <img src={perfil.avatar_url} alt={perfil?.username} className="w-full h-full object-contain" />
                    : <User size={34} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "color-mix(in srgb, var(--primary) 55%, transparent)", borderRadius: "50%" }}>
                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--btn-text)" }}>Cambiar</span>
                  </div>
                </button>
              </div>

              <div className="text-center px-4 pb-4">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <h1 className="text-base font-black uppercase tracking-tighter leading-none" style={{ color: "var(--primary)" }}>
                    {perfil?.username ?? "…"}
                  </h1>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                  {perfil?.status ?? "Enciclopedia"}
                </p>
              </div>

              <div className="mx-4" style={{ height: 1, background: "color-mix(in srgb, var(--primary) 7%, transparent)" }} />

              {/* Stats */}
              <div className="px-4 py-4 space-y-2.5">
                {[
                  { icon: <Package size={12} />, label: "Items",      count: inventario.length + misItemsDesc.length },
                  { icon: <Sword size={12} />,   label: "Criaturas",  count: misCriaturas.length },
                  { icon: <User size={12} />,    label: "Personajes", count: misPersonajes.length },
                ].map(({ icon, label, count }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                      {icon}
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{label}</span>
                    </div>
                    <div className="flex-1 mx-1" style={{ height: 1, background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />
                    <span className="text-base font-black tabular-nums" style={{ color: "var(--primary)" }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* Tabs mobile — dentro de la ficha */}
              <div className="md:hidden px-4 pb-4">
                <div className="flex gap-1 mt-1">
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 flex items-center justify-center py-2 transition-all"
                      style={{ borderRadius: "var(--radius-btn)", background: tab === t.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 5%, transparent)", color: tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                      <t.icon size={12} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Exploradores en mobile */}
            {otrosPerfiles.length > 0 && (
              <div className="lg:hidden mt-4 mx-4 md:mx-0 space-y-2">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] px-1" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  <Users size={9} className="inline mr-1" /> Exploradores
                </p>
                {otrosPerfiles.map(p => (
                  <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                    <div className="flex items-center gap-2.5 px-3 py-2"
                      style={{ background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))", border: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)", borderRadius: "var(--radius-btn)" }}>
                      <div className="w-6 h-6 shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                        {p.avatar_url ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" /> : <User size={11} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: "var(--primary)" }}>{p.username}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* COL 3 — colección expandida */}
          <div className="flex-1 min-w-0 pt-2 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

            {/* Tabs desktop */}
            <div className="hidden md:flex items-center gap-2 mb-5">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2 transition-all duration-200"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: tab === t.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 5%, var(--white-custom))",
                    color: tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    border: tab === t.id ? "none" : "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    boxShadow: tab === t.id ? "var(--shadow-card)" : "none",
                  }}>
                  <t.icon size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Grid — 2 cols tablet, 3 cols desktop */}
            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

                {tab === "items" && (
                  <>
                    {inventario.map((item, i) => (
                      <EntidadCard key={`inv-${i}`} imagen={item.items.imagen_url} nombre={item.items.nombre}
                        sub={item.items.categoria} icono={<Package size={20} />}
                        onClick={() => setModalEntidad({ tipo: "item_inv", data: item })} />
                    ))}
                    {misItemsDesc.map((d, i) => (
                      <EntidadCard key={`desc-${i}`} imagen={d.imagen_url} nombre={d.nombre ?? "Objeto"}
                        sub={d.categoria ?? "Item"} icono={<Package size={20} />}
                        onClick={() => setModalEntidad({ tipo: "item", data: d })} />
                    ))}
                    {inventario.length === 0 && misItemsDesc.length === 0 && <EmptyTab label="Sin items registrados aún" />}
                  </>
                )}

                {tab === "criaturas" && (
                  misCriaturas.length > 0
                    ? misCriaturas.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Criatura"}
                        sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                        icono={<Sword size={20} />} onClick={() => setModalEntidad({ tipo: "criatura", data: d })} />
                    ))
                    : <EmptyTab label="Sin registros en el bestiario" />
                )}

                {tab === "personajes" && (
                  misPersonajes.length > 0
                    ? misPersonajes.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Contacto"}
                        sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                        icono={<User size={20} />} onClick={() => setModalEntidad({ tipo: "personaje", data: d })} />
                    ))
                    : <EmptyTab label="Sin registros en la agenda" />
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* COL 3 — otros exploradores derecha (solo lg+) */}
          {otrosPerfiles.length > 0 && (
            <aside className="hidden lg:flex flex-col gap-2 w-44 xl:w-52 shrink-0 sticky top-24 pt-4">
              <p className="text-[8px] font-black uppercase tracking-[0.25em] mb-1 px-1 flex items-center gap-1.5"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                <Users size={9} /> Exploradores
              </p>
              {otrosPerfiles.map(p => (
                <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                  <motion.div whileHover={{ x: 2 }}
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
                      <p className="text-[10px] font-black uppercase tracking-tight truncate transition-colors group-hover:text-[var(--accent)]"
                        style={{ color: "var(--primary)" }}>{p.username}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {[{ icon: <Package size={7} />, n: p.items_count }, { icon: <Sword size={7} />, n: p.criaturas_count }, { icon: <User size={7} />, n: p.personajes_count }].map(({ icon, n }, i) => (
                          <span key={i} className="flex items-center gap-0.5 text-[8px] font-black tabular-nums"
                            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>{icon} {n}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </aside>
          )}
      </div>
      </div>
    </>
  );
}