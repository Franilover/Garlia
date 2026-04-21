"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/ui/Motion";
import {
  User, Sword, Cat ,Package, Calendar, X, Tag, Loader2, Users} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";

interface PerfilData {
  id: string;
  username: string;
  status?: string;
  avatar_url?: string;
  descripcion?: string;
  personaje_favorito?: { id: string; nombre: string; img_url?: string } | null;
  mascota?: { id: string; nombre: string; imagen_url?: string } | null;
}

interface Descubrimiento {
  tipo: "item" | "criatura" | "personaje";
  entidad_id: string;
  fecha_descubrimiento: string;
  nombre?: string;
  descripcion?: string;
  imagen_url?: string;
  categoria?: string;
  habitat?: string;
  alma?: string;
  reino?: string;
  especie?: string;
}

interface ItemInventario {
  equipado: boolean;
  items: { id: string; nombre: string; categoria: string; imagen_url?: string };
}

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
      }}>
      <div className="w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-transform"
        style={{
          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          borderRadius: "var(--radius-btn)",
          color: "color-mix(in srgb, var(--primary) 35%, transparent)",
        }}>
        {imagen
          ? <img src={imagen} alt={nombre} className="w-full h-full object-contain p-1" />
          : icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black truncate capitalize"
          style={{ color: "var(--primary)" }}>{nombre}</p>
        <p className="text-[9px] font-black capitalize"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>{sub}</p>
      </div>
    </button>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="col-span-full py-16 text-center">
      <p className="font-serif italic"
        style={{ fontSize: "0.85rem", color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
        "{label}"
      </p>
    </div>
  );
}

function ModalDetalle({ d, onClose }: { d: Descubrimiento; onClose: () => void }) {
  const tags = [d.categoria, d.habitat, d.alma ? `Alma ${d.alma}` : null, d.reino, d.especie].filter(Boolean) as string[];
  return (
    <AnimatePresence>
      <MotionDiv key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.35)" }} />
      <MotionDiv key="md"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm overflow-hidden"
          style={{
            background: "var(--white-custom)",
            borderRadius: "var(--radius-card)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            boxShadow: "var(--shadow-card)",
          }}
          onClick={e => e.stopPropagation()}>
          <div className="relative h-40 flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
            {d.imagen_url
              ? <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain p-2" />
              : <User size={48} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center"
              style={{
                background: "color-mix(in srgb, var(--white-custom) 80%, transparent)",
                borderRadius: "var(--radius-btn)",
                border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              }}>
              <X size={14} style={{ color: "var(--primary)" }} />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <h2 className="text-xl font-black tracking-tight capitalize"
                style={{ color: "var(--primary)" }}>{d.nombre}</h2>
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
            {d.descripcion && (
              <p className="text-[11px] leading-relaxed font-medium pt-2"
                style={{
                  color: "color-mix(in srgb, var(--primary) 60%, transparent)",
                  borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)",
                }}>
                {d.descripcion}
              </p>
            )}
          </div>
        </div>
      </MotionDiv>
    </AnimatePresence>
  );
}

export default function PerfilPublico() {
  const params   = useParams();
  const username = params?.username as string;

  const [perfil, setPerfil]           = useState<PerfilData | null>(null);
  const [inventario, setInventario]   = useState<ItemInventario[]>([]);
  const [descubrimientos, setDescubrimientos] = useState<Descubrimiento[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [tab, setTab]                 = useState<"items" | "criaturas" | "personajes">("items");
  const [modalD, setModalD]           = useState<Descubrimiento | null>(null);

  useEffect(() => {
    if (!username) return;
    async function cargar() {
      setCargando(true);

      
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("id, username, status, avatar_url, descripcion, personajes:personaje_favorito_id(id, nombre, img_url), mascota:mascota_id(id, nombre, imagen_url)")
        .eq("username", username)
        .maybeSingle();

      if (!perfilData) { setNotFound(true); setCargando(false); return; }
      setPerfil(perfilData as unknown as PerfilData);

      const uid = perfilData.id;

      
      const { data: invData } = await supabase
        .from("inventario_usuario")
        .select("equipado, items(id, nombre, categoria, imagen_url)")
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
          entidad_id: r.items?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre: r.items?.nombre,
          descripcion: r.items?.descripcion,
          imagen_url: r.items?.imagen_url,
          categoria: r.items?.categoria,
        })),
        ...(criaturasRes.data ?? []).map((r: any) => ({
          tipo: "criatura" as const,
          entidad_id: r.criaturas?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre: r.criaturas?.nombre,
          descripcion: r.criaturas?.descripcion,
          imagen_url: r.criaturas?.imagen_url,
          habitat: r.criaturas?.habitat,
          alma: r.criaturas?.alma,
        })),
        ...(personajesRes.data ?? []).map((r: any) => ({
          tipo: "personaje" as const,
          entidad_id: r.personajes?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre: r.personajes?.nombre,
          descripcion: r.personajes?.sobre,
          imagen_url: r.personajes?.img_url,
          reino: r.personajes?.reino,
          especie: r.personajes?.especie,
        })),
      ]);

      setCargando(false);
    }
    cargar();
  }, [username]);

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas  = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc  = descubrimientos.filter(d => d.tipo === "item");

  const tabs = [
    { id: "items",      label: "Inventario", icon: Sword },
    { id: "criaturas",  label: "Bestiario",  icon: Cat   },
    { id: "personajes", label: "Agenda",     icon: User    },
  ] as const;

  if (cargando) return (
    <div className="flex items-center justify-center min-h-60">
      <Loader2 size={20} className="animate-spin"
        style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
    </div>
  );

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
      {modalD && <ModalDetalle d={modalD} onClose={() => setModalD(null)} />}

      {}
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
                <p className="font-serif italic text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                  {perfil?.status ?? "Explorador"}
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
                  { icon: < Cat size={11} />,   label: "Bestias",   count: misCriaturas.length },
                  { icon: <User size={11} />,    label: "Conocidos", count: misPersonajes.length },
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
          <div className="flex-1 min-w-0 mx-4 md:mx-0 md:self-stretch flex flex-col">
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
                  Sobre {perfil?.username}
                </p>
              </div>
              <div className="mx-5 mb-3 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              <div className="px-5 pb-4">
                {perfil?.descripcion ? (
                  <p className="font-serif italic leading-relaxed"
                    style={{ fontSize: "0.9rem", color: "color-mix(in srgb, var(--foreground) 75%, transparent)" }}>
                    {perfil.descripcion}
                  </p>
                ) : (
                  <p className="font-serif italic"
                    style={{ fontSize: "0.85rem", color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    "Este explorador aún no ha escrito nada sobre sí mismo."
                  </p>
                )}
              </div>

              {}
              <div className="mx-5 h-px" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />

              {}
              <div className="grid grid-cols-2">

                {}
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
                        Ninguna…
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
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
        <div className="px-4 md:px-0">

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

            <AnimatePresence mode="wait">
              <MotionDiv key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

                {tab === "items" && (
                  <>
                    {inventario.map((item, i) => (
                      <EntidadCard key={`inv-${i}`} imagen={item.items.imagen_url}
                        nombre={item.items.nombre} sub={item.items.categoria}
                        icono={<Sword size={20} />} onClick={() => {}} />
                    ))}
                    {misItemsDesc.map((d, i) => (
                      <EntidadCard key={`desc-${i}`} imagen={d.imagen_url}
                        nombre={d.nombre ?? "Objeto"} sub={d.categoria ?? "Item"}
                        icono={<Sword size={20} />} onClick={() => setModalD(d)} />
                    ))}
                    {inventario.length === 0 && misItemsDesc.length === 0 && <EmptyTab label="Sin items aún" />}
                  </>
                )}
                {tab === "criaturas" && (
                  misCriaturas.length > 0
                    ? misCriaturas.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url}
                        nombre={d.nombre ?? "Criatura"} sub={d.habitat ?? "Criatura"}
                        icono={<Cat size={20} />} onClick={() => setModalD(d)} />
                    ))
                    : <EmptyTab label="Sin criaturas descubiertas" />
                )}
                {tab === "personajes" && (
                  misPersonajes.length > 0
                    ? misPersonajes.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url}
                        nombre={d.nombre ?? "Personaje"}
                        sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                        icono={<User size={20} />} onClick={() => setModalD(d)} />
                    ))
                    : <EmptyTab label="Sin personajes conocidos" />
                )}

              </MotionDiv>
            </AnimatePresence>
        </div>

      </div>
    </>
  );
}