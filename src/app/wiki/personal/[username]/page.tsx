"use client";
/**
 * PÁGINA: /wiki/personal/[username]
 * Vista pública del perfil de otro usuario — solo lectura.
 * Ruta: src/app/wiki/personal/[username]/page.tsx
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ChevronLeft, Loader2, Tag, Calendar, X, Users } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface PerfilData {
  id: string;
  username: string;
  status?: string;
  avatar_url?: string;
  descripcion?: string;
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

// ─── CARD ─────────────────────────────────────────────────────────────────────

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

// ─── MODAL DETALLE (simplificado — solo lectura) ───────────────────────────────

function ModalDetalle({ d, onClose }: { d: Descubrimiento; onClose: () => void }) {
  const tags = [d.categoria, d.habitat, d.alma ? `Alma ${d.alma}` : null, d.reino, d.especie].filter(Boolean) as string[];
  return (
    <AnimatePresence>
      <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.35)" }} />
      <motion.div key="md"
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-sm overflow-hidden"
          style={{
            background: "var(--white-custom)",
            borderRadius: "var(--radius-card)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            boxShadow: "var(--shadow-card)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="relative h-40 flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
            {d.imagen_url
              ? <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain p-2" />
              : <User size={48} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
            }
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center"
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
              {d.tipo}
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: "var(--primary)" }}>{d.nombre}</h2>
              <p className="flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase tracking-widest"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                <Calendar size={10} />
                Registrado el {new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
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
      </motion.div>
    </AnimatePresence>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function PerfilPublico() {
  const params  = useParams();
  const router  = useRouter();
  const username = params?.username as string;

  const [perfil, setPerfil]           = useState<PerfilData | null>(null);
  const [inventario, setInventario]   = useState<ItemInventario[]>([]);
  const [descubrimientos, setDescubrimientos] = useState<Descubrimiento[]>([]);
  const [otrosPerfiles, setOtrosPerfiles] = useState<PerfilData[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [tab, setTab]                 = useState<"items" | "criaturas" | "personajes">("items");
  const [modalD, setModalD]           = useState<Descubrimiento | null>(null);

  useEffect(() => {
    if (!username) return;
    async function cargar() {
      setCargando(true);

      // 1. Perfil por username
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("id, username, status, avatar_url, descripcion")
        .eq("username", username)
        .maybeSingle();

      if (!perfilData) { setNotFound(true); setCargando(false); return; }
      setPerfil(perfilData);

      const uid = perfilData.id;

      // 2. Inventario
      const { data: invData } = await supabase
        .from("inventario_usuario")
        .select("equipado, items(id, nombre, categoria, imagen_url)")
        .eq("perfil_id", uid);
      if (invData) setInventario(invData as unknown as ItemInventario[]);

      // 3. Descubrimientos
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

      // 4. Otros perfiles para el sidebar
      const { data: otros } = await supabase
        .from("perfiles")
        .select("id, username, status, avatar_url")
        .neq("id", uid)
        .order("username");
      if (otros) setOtrosPerfiles(otros);

      setCargando(false);
    }
    cargar();
  }, [username]);

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas  = descubrimientos.filter(d => d.tipo === "criatura");
  const misItemsDesc  = descubrimientos.filter(d => d.tipo === "item");

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

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-60 gap-4">
      <p className="text-[10px] font-black uppercase tracking-widest italic"
        style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
        "Explorador no encontrado"
      </p>
      <Link href="/wiki/personal"
        className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-opacity hover:opacity-70"
        style={{ color: "var(--primary)" }}>
        <ChevronLeft size={12} /> Volver
      </Link>
    </div>
  );

  return (
    <>
      {modalD && <ModalDetalle d={modalD} onClose={() => setModalD(null)} />}

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-20">

        {/* ── Separador ornamental ── */}
        <div className="flex items-center gap-4 py-5 px-2">
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
          <span className="font-serif italic text-[10px] select-none"
            style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
            ✦ {inventario.length + misItemsDesc.length + misCriaturas.length + misPersonajes.length} descubrimientos ✦
          </span>
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
        </div>

        {/* Zona superior: ficha + descripción */}
        <div className="flex flex-col md:flex-row gap-5 mb-6">

          {/* COL 1 — ficha perfil */}
          <div className="w-full md:w-56 xl:w-64 shrink-0 self-start animate-in fade-in duration-500">
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
                <p className="font-serif italic tracking-[0.4em] mb-3 text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>── ✦ ──</p>
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
                  style={{ fontSize: "1.05rem", color: "var(--primary)", letterSpacing: "0.02em" }}>
                  {perfil?.username}
                </h1>
                <p className="font-serif italic text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
                  {perfil?.status ?? "Explorador"}
                </p>
              </div>
              <div className="mx-5 my-3 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                <span className="text-[8px]" style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>◆</span>
                <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { icon: <Package size={11} />, label: "Objetos",   count: inventario.length + misItemsDesc.length },
                  { icon: <Sword size={11} />,   label: "Bestias",   count: misCriaturas.length },
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
              {/* Tabs mobile */}
              <div className="md:hidden px-4 pb-4"
                style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", paddingTop: "0.75rem" }}>
                <div className="flex gap-1 mt-2">
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 flex items-center justify-center py-2 transition-all"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        background: tab === t.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                        color: tab === t.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 32%, transparent)",
                        border: tab === t.id ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" : "1px solid transparent",
                      }}>
                      <t.icon size={12} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Descripción — solo lectura */}
          <div className="flex-1 min-w-0 mx-4 md:mx-0">
            <div className="h-full"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                boxShadow: "var(--shadow-card)",
                minHeight: "180px",
              }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <p className="font-serif italic text-[9px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  ✦ Sobre {perfil?.username}
                </p>
              </div>
              <div className="mx-5 mb-3 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              <div className="px-5 pb-5">
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
            </div>
          </div>
        </div>

        {/* Zona inferior: colección + sidebar */}
        <div className="flex gap-6 items-start">

          {/* COL 2 — colección */}
          <div className="flex-1 min-w-0 pt-2 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {/* Tabs desktop */}
            <div className="hidden md:flex items-center gap-2 mb-5">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2 transition-all duration-200 font-serif italic"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: tab === t.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 5%, var(--white-custom))",
                    color: tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    border: tab === t.id ? "none" : "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    boxShadow: tab === t.id ? "var(--shadow-card)" : "none",
                  }}>
                  <t.icon size={12} />
                  <span className="text-[10px] font-serif italic">{t.label}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {tab === "items" && (
                  <>
                    {inventario.map((item, i) => (
                      <EntidadCard key={`inv-${i}`} imagen={item.items.imagen_url} nombre={item.items.nombre}
                        sub={item.items.categoria} icono={<Package size={20} />} onClick={() => {}} />
                    ))}
                    {misItemsDesc.map((d, i) => (
                      <EntidadCard key={`desc-${i}`} imagen={d.imagen_url} nombre={d.nombre ?? "Objeto"}
                        sub={d.categoria ?? "Item"} icono={<Package size={20} />} onClick={() => setModalD(d)} />
                    ))}
                    {inventario.length === 0 && misItemsDesc.length === 0 && <EmptyTab label="Sin items aún" />}
                  </>
                )}
                {tab === "criaturas" && (
                  misCriaturas.length > 0
                    ? misCriaturas.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Criatura"}
                        sub={d.habitat ?? "Criatura"} icono={<Sword size={20} />} onClick={() => setModalD(d)} />
                    ))
                    : <EmptyTab label="Sin criaturas descubiertas" />
                )}
                {tab === "personajes" && (
                  misPersonajes.length > 0
                    ? misPersonajes.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url} nombre={d.nombre ?? "Personaje"}
                        sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                        icono={<User size={20} />} onClick={() => setModalD(d)} />
                    ))
                    : <EmptyTab label="Sin personajes conocidos" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* COL 3 — otros exploradores (derecha, solo lg+) */}
          {otrosPerfiles.length > 0 && (
            <aside className="hidden lg:flex flex-col gap-2 w-44 xl:w-52 shrink-0 sticky top-24 pt-2">
              <p className="font-serif italic text-[9px] mb-1 px-1 flex items-center gap-1.5 opacity-60"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                <Users size={9} /> Exploradores
              </p>
              {/* Mi perfil */}
              <Link href="/wiki/personal">
                <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest"
                  style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: "var(--radius-btn)", color: "var(--accent)" }}>
                  <User size={9} /> Mi perfil
                </div>
              </Link>
              {otrosPerfiles.map(p => {
                const isCurrent = p.username === username;
                return (
                  <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                    <motion.div whileHover={{ x: -2 }}
                      className="flex items-center gap-2.5 px-3 py-2.5 transition-all cursor-pointer group"
                      style={{
                        background: isCurrent ? "color-mix(in srgb, var(--primary) 8%, var(--white-custom))" : "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                        border: isCurrent ? "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" : "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
                        borderRadius: "var(--radius-btn)",
                      }}>
                      <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                          : <User size={13} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif italic text-[11px] truncate transition-colors group-hover:text-[var(--accent)]"
                          style={{ color: isCurrent ? "var(--accent)" : "var(--primary)" }}>{p.username}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest truncate"
                          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                          {p.status ?? "Explorador"}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </aside>
          )}
      </div>
      </div>
    </>
  );
}