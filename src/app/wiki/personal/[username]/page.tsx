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
        .select("id, username, status, avatar_url")
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

      {/* Volver */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <Link href="/wiki/personal"
          className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-60 mb-6"
          style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
          <ChevronLeft size={12} /> Mi perfil
        </Link>
      </div>

      <div className="flex gap-8 items-start w-full max-w-4xl mx-auto px-4">

        {/* ── SIDEBAR otros perfiles ── */}
        {otrosPerfiles.length > 0 && (
          <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0 sticky top-24">
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-1"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              <Users size={11} /> Exploradores
            </p>
            {/* Mi perfil */}
            <Link href="/wiki/personal">
              <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                  borderRadius: "var(--radius-btn)",
                  color: "var(--accent)",
                }}>
                <User size={10} /> Mi perfil
              </div>
            </Link>
            {otrosPerfiles.map(p => {
              const isCurrentPage = p.username === username;
              return (
                <Link key={p.id} href={`/wiki/personal/${p.username}`}>
                  <motion.div whileHover={{ x: 3 }}
                    className="flex items-center gap-3 p-3 transition-all cursor-pointer"
                    style={{
                      background: isCurrentPage
                        ? "color-mix(in srgb, var(--primary) 8%, var(--white-custom))"
                        : "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                      border: isCurrentPage
                        ? "1px solid color-mix(in srgb, var(--primary) 20%, transparent)"
                        : "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                      borderRadius: "var(--radius-card)",
                    }}>
                    <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        borderRadius: "50%",
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        border: "1.5px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                        : <User size={14} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-tight truncate" style={{ color: "var(--primary)" }}>
                        {p.username}
                      </p>
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

        {/* ── PERFIL PRINCIPAL ── */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* Header */}
          <section className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="w-24 h-24 overflow-hidden flex items-center justify-center"
                style={{
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--primary) 10%, var(--bg-main))",
                  border: "2px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                }}>
                {perfil?.avatar_url
                  ? <img src={perfil.avatar_url} alt={perfil.username} className="w-full h-full object-contain" />
                  : <User size={40} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
                }
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5"
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "50%",
                }}>
                <Star size={12} className="text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase tracking-tighter" style={{ color: "var(--primary)" }}>
                {perfil?.username}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]"
                style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                {perfil?.status ?? "Explorador"}
              </p>
            </div>
          </section>

          {/* Contadores */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Items",      count: inventario.length + misItemsDesc.length },
              { label: "Criaturas",  count: misCriaturas.length },
              { label: "Personajes", count: misPersonajes.length },
            ].map(({ label, count }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-3"
                style={{
                  background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                  border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}>
                <span className="text-2xl font-black" style={{ color: "var(--primary)" }}>{count}</span>
                <span className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <nav className="flex justify-center gap-2 pb-4"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-5 py-2.5 transition-all duration-300"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: tab === t.id ? "var(--primary)" : "transparent",
                  color:      tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  transform:  tab === t.id ? "scale(1.05)" : "scale(1)",
                }}>
                <t.icon size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Contenido */}
          <div className="min-h-40">
            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {tab === "items" && (
                  <>
                    {inventario.map((item, i) => (
                      <EntidadCard key={`inv-${i}`}
                        imagen={item.items.imagen_url}
                        nombre={item.items.nombre}
                        sub={item.items.categoria}
                        icono={<Package size={20} />}
                        onClick={() => {}}
                      />
                    ))}
                    {misItemsDesc.map((d, i) => (
                      <EntidadCard key={`desc-${i}`}
                        imagen={d.imagen_url}
                        nombre={d.nombre ?? "Objeto"}
                        sub={d.categoria ?? "Item"}
                        icono={<Package size={20} />}
                        onClick={() => setModalD(d)}
                      />
                    ))}
                    {inventario.length === 0 && misItemsDesc.length === 0 && <EmptyTab label="Sin items aún" />}
                  </>
                )}
                {tab === "criaturas" && (
                  misCriaturas.length > 0
                    ? misCriaturas.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url}
                        nombre={d.nombre ?? "Criatura"} sub={d.habitat ?? "Criatura"}
                        icono={<Sword size={20} />} onClick={() => setModalD(d)} />
                    ))
                    : <EmptyTab label="Sin criaturas descubiertas" />
                )}
                {tab === "personajes" && (
                  misPersonajes.length > 0
                    ? misPersonajes.map((d, i) => (
                      <EntidadCard key={i} imagen={d.imagen_url}
                        nombre={d.nombre ?? "Personaje"} sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                        icono={<User size={20} />} onClick={() => setModalD(d)} />
                    ))
                    : <EmptyTab label="Sin personajes conocidos" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}