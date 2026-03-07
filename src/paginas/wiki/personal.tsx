"use client";
/**
 * COMPONENTE: components/paginas/personal/personal.tsx
 * Con modal flotante al hacer click en items, criaturas o personajes
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ShieldCheck, X, Calendar, Tag, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/client/supabase";

interface Descubrimiento {
  tipo: "item" | "criatura" | "personaje";
  entidad_id: string;
  fecha_descubrimiento: string;
  nombre?: string;
  // Campos opcionales extendidos que puede traer el join
  descripcion?: string;
  imagen_url?: string;
  img_url?: string;
  categoria?: string;
  habitat?: string;
  alma?: string;
  reino?: string;
  especie?: string;
  color_hex?: string;
}

interface ItemInventario {
  equipado: boolean;
  items: {
    id: string;
    nombre: string;
    categoria: string;
    imagen_url?: string;
    descripcion?: string;
    rareza?: string;
  };
}

interface PersonalProps {
  datos: {
    username: string;
    status: string;
    avatar_url?: string;
    descubrimientos?: Descubrimiento[];
    inventario_usuario?: ItemInventario[];
  };
}

// ─── MODAL FLOTANTE ────────────────────────────────────────────────────────────

type EntidadModal =
  | { tipo: "item_inv"; data: ItemInventario }
  | { tipo: "item" | "criatura" | "personaje"; data: Descubrimiento };

function ModalDetalle({
  entidad,
  onClose,
}: {
  entidad: EntidadModal;
  onClose: () => void;
}) {
  const isItemInv = entidad.tipo === "item_inv";
  const isItem = isItemInv || entidad.tipo === "item";
  const isCriatura = entidad.tipo === "criatura";

  // Normalizar datos según tipo
  const nombre = isItemInv
    ? (entidad.data as ItemInventario).items.nombre
    : (entidad.data as Descubrimiento).nombre ?? (isCriatura ? "Criatura Desconocida" : entidad.tipo === "item" ? "Objeto" : "Contacto");
  const descripcion = isItemInv
    ? (entidad.data as ItemInventario).items.descripcion
    : (entidad.data as Descubrimiento).descripcion;
  const imagen = isItemInv
    ? (entidad.data as ItemInventario).items.imagen_url
    : ((entidad.data as Descubrimiento).imagen_url ?? (entidad.data as Descubrimiento).img_url);
  const fecha = isItemInv ? null : (entidad.data as Descubrimiento).fecha_descubrimiento;

  // Tags según tipo
  const tags: string[] = [];
  if (isItemInv) {
    if ((entidad.data as ItemInventario).items.categoria) tags.push((entidad.data as ItemInventario).items.categoria);
    if ((entidad.data as ItemInventario).items.rareza) tags.push((entidad.data as ItemInventario).items.rareza!);
    if ((entidad.data as ItemInventario).equipado) tags.push("Equipado");
  } else {
    const d = entidad.data as Descubrimiento;
    if (d.categoria) tags.push(d.categoria);
    if (d.habitat) tags.push(d.habitat);
    if (d.alma) tags.push(`Alma ${d.alma}`);
    if (d.reino) tags.push(d.reino);
    if (d.especie) tags.push(d.especie);
  }

  const IconComp = isItem ? Package : isCriatura ? Sword : User;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-primary/10 backdrop-blur-sm"
      />

      {/* Panel flotante */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-sm rounded-3xl bg-bg-main border border-primary/15 shadow-2xl shadow-primary/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con imagen o placeholder */}
          <div className="relative h-40 flex items-center justify-center bg-primary/5">
            {imagen ? (
              <img
                src={imagen}
                alt={nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconComp size={48} className="text-primary/20" />
            )}

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/15 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
            >
              <X size={14} className="text-primary" />
            </button>

            {/* Badge tipo */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20 bg-bg-main/80 backdrop-blur-sm text-primary/60">
              {entidad.tipo}
            </div>
          </div>

          {/* Contenido */}
          <div className="p-5 space-y-4">
            {/* Nombre */}
            <div>
              <h2 className="text-xl font-black text-primary uppercase tracking-tight leading-tight">
                {nombre}
              </h2>
              {fecha && (
                <p className="flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase tracking-widest text-primary/30">
                  <Calendar size={10} />
                  Registrado el {new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/8 text-primary/70 border border-primary/10"
                  >
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Descripción */}
            {descripcion ? (
              <p className="text-[11px] text-primary/60 leading-relaxed font-medium border-t border-primary/5 pt-3">
                {descripcion}
              </p>
            ) : (
              <p className="text-[11px] text-primary/20 italic font-black uppercase tracking-wider border-t border-primary/5 pt-3">
                "Sin descripción disponible"
              </p>
            )}

            {/* Indicador equipado (solo items de inventario) */}
            {isItemInv && (entidad.data as ItemInventario).equipado && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                <ShieldCheck size={14} className="text-primary/50 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/50">
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

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export default function Personal({ datos }: PersonalProps) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("items");
  const [modalEntidad, setModalEntidad] = useState<EntidadModal | null>(null);
  const [descubrimientosRicos, setDescubrimientosRicos] = useState<Descubrimiento[]>([]);

  const { inventario_usuario = [] } = datos;

  // ── Fetch descubrimientos desde las 3 tablas separadas ──────────────────────
  useEffect(() => {
    async function cargarDescubrimientos() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
        supabase
          .from("descubrimientos_items")
          .select("fecha_descubrimiento, items:item_id(id, nombre, categoria, imagen_url, descripcion, rareza)")
          .eq("perfil_id", user.id),
        supabase
          .from("descubrimientos_criaturas")
          .select("fecha_descubrimiento, criaturas:criatura_id(id, nombre, habitat, alma, imagen_url, descripcion)")
          .eq("perfil_id", user.id),
        supabase
          .from("descubrimientos_personajes")
          .select("fecha_descubrimiento, personajes:personaje_id(id, nombre, reino, especie, img_url, descripcion)")
          .eq("perfil_id", user.id),
      ]);

      const planos: Descubrimiento[] = [
        ...(itemsRes.data ?? []).map((r: any) => ({
          tipo: "item" as const,
          entidad_id: r.items?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre:      r.items?.nombre,
          descripcion: r.items?.descripcion,
          imagen_url:  r.items?.imagen_url,
          categoria:   r.items?.categoria,
          rareza:      r.items?.rareza,
        })),
        ...(criaturasRes.data ?? []).map((r: any) => ({
          tipo: "criatura" as const,
          entidad_id: r.criaturas?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre:      r.criaturas?.nombre,
          descripcion: r.criaturas?.descripcion,
          imagen_url:  r.criaturas?.imagen_url,
          habitat:     r.criaturas?.habitat,
          alma:        r.criaturas?.alma,
        })),
        ...(personajesRes.data ?? []).map((r: any) => ({
          tipo: "personaje" as const,
          entidad_id: r.personajes?.id,
          fecha_descubrimiento: r.fecha_descubrimiento,
          nombre:      r.personajes?.nombre,
          descripcion: r.personajes?.descripcion,
          imagen_url:  r.personajes?.img_url,
          reino:       r.personajes?.reino,
          especie:     r.personajes?.especie,
        })),
      ];

      setDescubrimientosRicos(planos);
    }

    cargarDescubrimientos();
  }, []);

  const misPersonajes = descubrimientosRicos.filter((d) => d.tipo === "personaje");
  const misCriaturas = descubrimientosRicos.filter((d) => d.tipo === "criatura");
  const misItemsDesc = descubrimientosRicos.filter((d) => d.tipo === "item");
  const misItems = inventario_usuario;

  const tabs = [
    { id: "items", label: "Inventario", icon: Package },
    { id: "criaturas", label: "Bestiario", icon: Sword },
    { id: "personajes", label: "Agenda", icon: User },
  ] as const;

  return (
    <>
      {/* Modal flotante */}
      {modalEntidad && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* HEADER */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-linear-to-b from-primary/20 to-primary/5 border-2 border-primary/10 flex items-center justify-center overflow-hidden">
              {datos.avatar_url ? (
                <img src={datos.avatar_url} alt={datos.username} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-primary/20" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-bg-main border border-primary/10 p-1.5 rounded-full shadow-sm">
              <Star size={12} className="text-amber-400 fill-amber-400" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-black text-primary uppercase tracking-tighter">
              "{datos.username}"
            </h1>
            <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em]">
              "{datos.status || "Enciclopedia"}"
            </p>
          </div>
        </section>

        {/* TABS */}
        <nav className="flex justify-center gap-2 border-b border-primary/5 pb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300",
                tab === t.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "text-primary/40 hover:bg-primary/5"
              )}
            >
              <t.icon size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* CONTENIDO */}
        <div className="min-h-75">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* ── ITEMS (inventario_usuario) ── */}
              {tab === "items" && misItems.map((item, i) => (
                <button
                  key={`inv-${i}`}
                  onClick={() => setModalEntidad({ tipo: "item_inv", data: item })}
                  className="group p-4 rounded-2xl bg-bg-main border border-primary/5 flex items-center gap-4 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all text-left cursor-pointer"
                >
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                    {item.items.imagen_url ? (
                      <img src={item.items.imagen_url} alt={item.items.nombre} className="w-full h-full object-contain" />
                    ) : (
                      <Package size={20} className="text-primary/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-primary uppercase tracking-tight">{item.items.nombre}</p>
                    <p className="text-[9px] text-primary/30 font-black uppercase">{item.items.categoria}</p>
                  </div>
                  {item.equipado && <ShieldCheck size={14} className="text-primary/50 shrink-0" />}
                </button>
              ))}

              {/* ── ITEMS (desde descubrimientos via [[drop]]) ── */}
              {tab === "items" && misItemsDesc.map((d, i) => (
                <button
                  key={`desc-${i}`}
                  onClick={() => setModalEntidad({ tipo: "item", data: d })}
                  className="group p-4 rounded-2xl bg-bg-main border border-primary/5 flex items-center gap-4 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all text-left cursor-pointer"
                >
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                    {(d.imagen_url) ? (
                      <img src={d.imagen_url} alt={d.nombre} className="w-full h-full object-contain" />
                    ) : (
                      <Package size={20} className="text-primary/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-primary uppercase tracking-tight">{d.nombre ?? "Objeto"}</p>
                    <p className="text-[9px] text-primary/30 font-black uppercase">{d.categoria ?? "Item"}</p>
                  </div>
                </button>
              ))}

              {/* ── CRIATURAS / PERSONAJES ── */}
              {(tab === "criaturas" || tab === "personajes") && (
                (tab === "criaturas" ? misCriaturas : misPersonajes).length > 0 ? (
                  (tab === "criaturas" ? misCriaturas : misPersonajes).map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setModalEntidad({ tipo: d.tipo as "criatura" | "personaje", data: d })}
                      className="group p-4 rounded-2xl bg-bg-main border border-primary/5 flex items-center gap-4 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all text-left cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden bg-primary/8 text-primary/50">
                        {(d.imagen_url || d.img_url) ? (
                          <img src={d.imagen_url ?? d.img_url} alt={d.nombre} className="w-full h-full object-cover" />
                        ) : (
                          tab === "criaturas" ? <Sword size={20} /> : <User size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-primary uppercase tracking-tight">
                          {d.nombre ?? (tab === "criaturas" ? "Criatura Registrada" : "Contacto Guardado")}
                        </p>
                        <p className="text-[9px] text-primary/30 font-black uppercase">
                          Visto el {new Date(d.fecha_descubrimiento).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary/20 italic">
                    "Sin registros en esta categoría"
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}