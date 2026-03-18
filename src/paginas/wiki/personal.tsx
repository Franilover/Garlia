"use client";
/**
 * COMPONENTE: components/paginas/personal/personal.tsx
 *
 * FIX: Era dependiente de que el padre pasara datos correctamente.
 * Ahora es self-contained — fetchea su propio perfil desde `perfiles`
 * y los descubrimientos directamente con el user del auth.
 *
 * El prop `datos` sigue siendo aceptado como fallback opcional.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ShieldCheck, X, Calendar, Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

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
    ? undefined
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
          ? <img src={imagen} alt={nombre} className="w-full h-full object-cover" />
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

        // ── 2. Perfil desde tabla `perfiles` ───────────────────────────────
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select("username, status, rol")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError) console.warn("[Personal] Error al cargar perfil:", perfilError.message);

        setPerfil({
          username:   perfilData?.username  ?? datosProp?.username ?? user.email?.split("@")[0] ?? "Aventurero",
          status:     perfilData?.status    ?? datosProp?.status,
          avatar_url: datosProp?.avatar_url, // no existe en tabla, usar solo si el padre la pasa
        });

        // ── 3. Inventario ──────────────────────────────────────────────────
        // Solo fetchear si el padre no lo pasó
        if (!datosProp?.inventario_usuario?.length) {
          const { data: invData, error: invError } = await supabase
            .from("inventario_usuario")
            .select("equipado, items(id, nombre, categoria, imagen_url)")
            .eq("perfil_id", user.id);
          if (invError) console.warn("[Personal] Error inventario:", invError.message);
          if (invData)  setInventario(invData as unknown as ItemInventario[]);
        }

        // ── 4. Descubrimientos desde las 3 tablas ─────────────────────────
        const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
          supabase
            .from("descubrimientos_items")
            .select("fecha_descubrimiento, items:item_id(id, nombre, categoria, imagen_url)")
            .eq("perfil_id", user.id),
          supabase
            .from("descubrimientos_criaturas")
            .select("fecha_descubrimiento, criaturas:criatura_id(id, nombre, habitat, alma)")
            .eq("perfil_id", user.id),
          supabase
            .from("descubrimientos_personajes")
            .select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url)")
            .eq("perfil_id", user.id),
        ]);

        // Logs de debug — quitar en producción si todo funciona
        if (itemsRes.error)     console.warn("[Personal] descubrimientos_items:", itemsRes.error.message);
        if (criaturasRes.error) console.warn("[Personal] descubrimientos_criaturas:", criaturasRes.error.message);
        if (personajesRes.error) console.warn("[Personal] descubrimientos_personajes:", personajesRes.error.message);

        // DEBUG — ver qué llega crudo de criaturas
        console.log("[Personal] criaturas raw:", JSON.stringify(criaturasRes.data?.slice(0, 2)));

        const planos: Descubrimiento[] = [
          ...(itemsRes.data ?? []).map((r: any) => ({
            tipo: "item" as const,
            entidad_id:           r.items?.id,
            fecha_descubrimiento: r.fecha_descubrimiento,
            nombre:      r.items?.nombre,
            imagen_url:  r.items?.imagen_url,
            categoria:   r.items?.categoria,
          })),
          ...(criaturasRes.data ?? []).map((r: any) => ({
            tipo: "criatura" as const,
            entidad_id:           r.criaturas?.id,
            fecha_descubrimiento: r.fecha_descubrimiento,
            nombre:      r.criaturas?.nombre,
            habitat:     r.criaturas?.habitat,
            alma:        r.criaturas?.alma,
          })),
          ...(personajesRes.data ?? []).map((r: any) => ({
            tipo: "personaje" as const,
            entidad_id:           r.personajes?.id,
            fecha_descubrimiento: r.fecha_descubrimiento,
            nombre:      r.personajes?.nombre,
            // Personajes usa img_url no imagen_url
            imagen_url:  r.personajes?.img_url,
            reino:       r.personajes?.reino,
            especie:     r.personajes?.especie,
          })),
        ];

        setDescubrimientos(planos);
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

      <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── HEADER ── */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-24 h-24 overflow-hidden flex items-center justify-center"
              style={{
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--primary) 10%, var(--bg-main))",
                border: "2px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              }}>
              {perfil?.avatar_url
                ? <img src={perfil.avatar_url} alt={perfil.username} className="w-full h-full object-cover" />
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
              {perfil?.username ?? "…"}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
              {perfil?.status ?? "Enciclopedia"}
            </p>
          </div>
        </section>

        {/* ── CONTADORES ── */}
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

        {/* ── TABS ── */}
        <nav className="flex justify-center gap-2 pb-4"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-2.5 transition-all duration-300"
              style={{
                borderRadius: "var(--radius-btn)",
                background: tab === t.id ? "var(--primary)" : "transparent",
                color:      tab === t.id ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                boxShadow:  tab === t.id ? "var(--shadow-card)" : "none",
                transform:  tab === t.id ? "scale(1.05)" : "scale(1)",
              }}>
              <t.icon size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* ── CONTENIDO ── */}
        <div className="min-h-40">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* INVENTARIO */}
              {tab === "items" && (
                <>
                  {inventario.map((item, i) => (
                    <EntidadCard key={`inv-${i}`}
                      imagen={item.items.imagen_url}
                      nombre={item.items.nombre}
                      sub={item.items.categoria}
                      icono={<Package size={20} />}
                      onClick={() => setModalEntidad({ tipo: "item_inv", data: item })}
                    />
                  ))}
                  {misItemsDesc.map((d, i) => (
                    <EntidadCard key={`desc-${i}`}
                      imagen={d.imagen_url}
                      nombre={d.nombre ?? "Objeto"}
                      sub={d.categoria ?? "Item"}
                      icono={<Package size={20} />}
                      onClick={() => setModalEntidad({ tipo: "item", data: d })}
                    />
                  ))}
                  {inventario.length === 0 && misItemsDesc.length === 0 && (
                    <EmptyTab label="Sin items registrados aún" />
                  )}
                </>
              )}

              {/* CRIATURAS */}
              {tab === "criaturas" && (
                misCriaturas.length > 0
                  ? misCriaturas.map((d, i) => (
                    <EntidadCard key={i}
                      imagen={d.imagen_url}
                      nombre={d.nombre ?? "Criatura Registrada"}
                      sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                      icono={<Sword size={20} />}
                      onClick={() => setModalEntidad({ tipo: "criatura", data: d })}
                    />
                  ))
                  : <EmptyTab label="Sin registros en el bestiario" />
              )}

              {/* PERSONAJES */}
              {tab === "personajes" && (
                misPersonajes.length > 0
                  ? misPersonajes.map((d, i) => (
                    <EntidadCard key={i}
                      imagen={d.imagen_url}
                      nombre={d.nombre ?? "Contacto Guardado"}
                      sub={`Visto el ${new Date(d.fecha_descubrimiento).toLocaleDateString("es-ES")}`}
                      icono={<User size={20} />}
                      onClick={() => setModalEntidad({ tipo: "personaje", data: d })}
                    />
                  ))
                  : <EmptyTab label="Sin registros en la agenda" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}