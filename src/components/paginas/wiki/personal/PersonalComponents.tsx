"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, ShieldCheck, X, Calendar, Tag } from "lucide-react";

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export interface Descubrimiento {
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

export interface ItemInventario {
  equipado: boolean;
  items: {
    id: string;
    nombre: string;
    categoria: string;
    imagen_url?: string;
    descripcion?: string;
  };
}

export type EntidadModal =
  | { tipo: "item_inv"; data: ItemInventario }
  | { tipo: "item" | "criatura" | "personaje"; data: Descubrimiento };

// ─── ModalDetalle ─────────────────────────────────────────────────────────────

export function ModalDetalle({ entidad, onClose }: { entidad: EntidadModal; onClose: () => void }) {
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
      <MotionDiv
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-primary/10 backdrop-blur-sm"
      />
      <MotionDiv
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
          {/* Imagen / header */}
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
      </MotionDiv>
    </AnimatePresence>
  );
}

// ─── EntidadCard ──────────────────────────────────────────────────────────────

export function EntidadCard({ imagen, nombre, sub, icono, onClick }: {
  imagen?: string;
  nombre: string;
  sub: string;
  icono: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="group text-left cursor-pointer w-full overflow-hidden"
      style={{
        background: "var(--white-custom)",
        border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "color-mix(in srgb, var(--primary) 30%, transparent)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "var(--shadow-card)";
      }}
    >
      <div className="hidden md:flex w-full items-center justify-center overflow-hidden"
        style={{
          height: "120px",
          background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
          color: "color-mix(in srgb, var(--primary) 20%, transparent)",
        }}>
        {imagen
          ? <img src={imagen} alt={nombre} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
          : <div className="opacity-30 group-hover:opacity-50 transition-opacity">{icono}</div>
        }
      </div>
      <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-1 p-3 md:px-3 md:pt-2 md:pb-3">
        <div className="md:hidden w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden"
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
        <div className="flex-1 min-w-0 md:w-full">
          <p className="text-[11px] font-black uppercase tracking-tight truncate" style={{ color: "var(--primary)" }}>{nombre}</p>
          <p className="text-[9px] font-black uppercase mt-0.5" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>{sub}</p>
        </div>
      </div>
    </button>
  );
}

// ─── EmptyTab ─────────────────────────────────────────────────────────────────

export function EmptyTab({ label }: { label: string }) {
  return (
    <div className="col-span-full py-20 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] italic"
        style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
        "{label}"
      </p>
    </div>
  );
}