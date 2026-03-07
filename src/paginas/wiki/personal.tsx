"use client";
/**
 * COMPONENTE: components/paginas/personal/personal.tsx
 * Con modal flotante al hacer click en items, criaturas o personajes
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ShieldCheck, X, Calendar, Tag, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

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
  | { tipo: "item"; data: ItemInventario }
  | { tipo: "criatura" | "personaje"; data: Descubrimiento };

function ModalDetalle({
  entidad,
  onClose,
}: {
  entidad: EntidadModal;
  onClose: () => void;
}) {
  const isItem = entidad.tipo === "item";
  const isCriatura = entidad.tipo === "criatura";

  // Normalizar datos según tipo
  const nombre = isItem
    ? entidad.data.items.nombre
    : (entidad.data as Descubrimiento).nombre ?? (isCriatura ? "Criatura Desconocida" : "Contacto");
  const descripcion = isItem
    ? entidad.data.items.descripcion
    : (entidad.data as Descubrimiento).descripcion;
  const imagen = isItem
    ? entidad.data.items.imagen_url
    : ((entidad.data as Descubrimiento).imagen_url ?? (entidad.data as Descubrimiento).img_url);
  const fecha = isItem ? null : (entidad.data as Descubrimiento).fecha_descubrimiento;

  // Tags según tipo
  const tags: string[] = [];
  if (isItem) {
    if (entidad.data.items.categoria) tags.push(entidad.data.items.categoria);
    if (entidad.data.items.rareza) tags.push(entidad.data.items.rareza);
    if (entidad.data.equipado) tags.push("Equipado");
  } else {
    const d = entidad.data as Descubrimiento;
    if (d.categoria) tags.push(d.categoria);
    if (d.habitat) tags.push(d.habitat);
    if (d.alma) tags.push(`Alma ${d.alma}`);
    if (d.reino) tags.push(d.reino);
    if (d.especie) tags.push(d.especie);
  }

  const accentColor = isCriatura
    ? { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", tag: "bg-emerald-50 text-emerald-600" }
    : isItem
    ? { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", tag: "bg-blue-50 text-blue-600" }
    : { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", tag: "bg-amber-50 text-amber-600" };

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
        className="fixed inset-0 z-40 bg-[#6B5E70]/10 backdrop-blur-sm"
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
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-3xl bg-white border shadow-2xl shadow-[#6B5E70]/10 overflow-hidden",
            accentColor.border
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con imagen o placeholder */}
          <div className={cn("relative h-40 flex items-center justify-center", accentColor.bg)}>
            {imagen ? (
              <img
                src={imagen}
                alt={nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconComp size={48} className={cn("opacity-20", accentColor.text)} />
            )}

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
            >
              <X size={14} className="text-[#6B5E70]" />
            </button>

            {/* Badge tipo */}
            <div className={cn(
              "absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-white/80 backdrop-blur-sm",
              accentColor.text, accentColor.border
            )}>
              {entidad.tipo}
            </div>
          </div>

          {/* Contenido */}
          <div className="p-5 space-y-4">
            {/* Nombre */}
            <div>
              <h2 className="text-xl font-black text-[#6B5E70] uppercase tracking-tight leading-tight">
                {nombre}
              </h2>
              {fecha && (
                <p className="flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30">
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
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                      accentColor.tag
                    )}
                  >
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Descripción */}
            {descripcion ? (
              <p className="text-[11px] text-[#6B5E70]/60 leading-relaxed font-medium border-t border-[#6B5E70]/5 pt-3">
                {descripcion}
              </p>
            ) : (
              <p className="text-[11px] text-[#6B5E70]/20 italic font-black uppercase tracking-wider border-t border-[#6B5E70]/5 pt-3">
                "Sin descripción disponible"
              </p>
            )}

            {/* Indicador equipado (solo items) */}
            {isItem && entidad.data.equipado && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <ShieldCheck size={14} className="text-blue-400 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
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

  const { descubrimientos = [], inventario_usuario = [] } = datos;

  const misPersonajes = descubrimientos.filter((d) => d.tipo === "personaje");
  const misCriaturas = descubrimientos.filter((d) => d.tipo === "criatura");
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
            <div className="w-24 h-24 rounded-full bg-linear-to-b from-[#6B5E70]/20 to-[#6B5E70]/5 border-2 border-[#6B5E70]/10 flex items-center justify-center overflow-hidden">
              {datos.avatar_url ? (
                <img src={datos.avatar_url} alt={datos.username} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-[#6B5E70]/20" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white border border-[#6B5E70]/10 p-1.5 rounded-full shadow-sm">
              <Star size={12} className="text-amber-400 fill-amber-400" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-black text-[#6B5E70] uppercase tracking-tighter">
              "{datos.username}"
            </h1>
            <p className="text-[10px] font-black text-[#6B5E70]/40 uppercase tracking-[0.3em]">
              "{datos.status || "Explorador de Franilover"}"
            </p>
          </div>
        </section>

        {/* TABS */}
        <nav className="flex justify-center gap-2 border-b border-[#6B5E70]/5 pb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300",
                tab === t.id
                  ? "bg-[#6B5E70] text-white shadow-lg shadow-[#6B5E70]/20 scale-105"
                  : "text-[#6B5E70]/40 hover:bg-[#6B5E70]/5"
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
              {/* ── ITEMS ── */}
              {tab === "items" && misItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setModalEntidad({ tipo: "item", data: item })}
                  className="group p-4 rounded-2xl bg-white border border-[#6B5E70]/5 flex items-center gap-4 hover:border-[#6B5E70]/20 hover:shadow-md hover:shadow-[#6B5E70]/5 transition-all text-left cursor-pointer"
                >
                  <div className="w-12 h-12 bg-[#6B5E70]/5 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                    {item.items.imagen_url ? (
                      <img src={item.items.imagen_url} alt={item.items.nombre} className="w-full h-full object-contain" />
                    ) : (
                      <Package size={20} className="text-[#6B5E70]/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-[#6B5E70] uppercase tracking-tight">{item.items.nombre}</p>
                    <p className="text-[9px] text-[#6B5E70]/30 font-black uppercase">{item.items.categoria}</p>
                  </div>
                  {item.equipado && <ShieldCheck size={14} className="text-blue-400 shrink-0" />}
                </button>
              ))}

              {/* ── CRIATURAS / PERSONAJES ── */}
              {(tab === "criaturas" || tab === "personajes") && (
                (tab === "criaturas" ? misCriaturas : misPersonajes).length > 0 ? (
                  (tab === "criaturas" ? misCriaturas : misPersonajes).map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setModalEntidad({ tipo: d.tipo as "criatura" | "personaje", data: d })}
                      className="group p-4 rounded-2xl bg-white border border-[#6B5E70]/5 flex items-center gap-4 hover:border-[#6B5E70]/20 hover:shadow-md hover:shadow-[#6B5E70]/5 transition-all text-left cursor-pointer"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden",
                        tab === "criaturas" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                      )}>
                        {(d.imagen_url || d.img_url) ? (
                          <img src={d.imagen_url ?? d.img_url} alt={d.nombre} className="w-full h-full object-cover" />
                        ) : (
                          tab === "criaturas" ? <Sword size={20} /> : <User size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-[#6B5E70] uppercase tracking-tight">
                          {d.nombre ?? (tab === "criaturas" ? "Criatura Registrada" : "Contacto Guardado")}
                        </p>
                        <p className="text-[9px] text-[#6B5E70]/30 font-black uppercase">
                          Visto el {new Date(d.fecha_descubrimiento).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#6B5E70]/20 italic">
                    Sin registros en esta categoría
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