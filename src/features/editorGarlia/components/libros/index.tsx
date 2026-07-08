"use client";
import {
  ChevronDown,
  ChevronRight,
  UserCircle2,
  Loader2,
  Trash2,
  X,
  Clock,
  Hash,
  AlignLeft,
  BookMarked,
  Pencil,
  MoreHorizontal,
  Globe,
  Lock,
  Timer,
  Mic2,
  MapPin,
  Cat,
  Sword,
  Plus,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";

import type {
  Libro,
  Capitulo} from "@/components/forms/lexical-editor/types";
import {
  VISIBILIDAD_CONFIG,
  wordCount,
  readingTime,
  capUpdateMeta,
} from "@/components/forms/lexical-editor/types";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { SelectorFechaMundo } from "@/features/editorGarlia/components/calendario/SelectorFechaMundo";
import SimpleImagePicker from "@/features/editorGarlia/components/libros/snippets/forms/SimpleImagePicker";
import { usePersonajes } from "@/hooks/useEditorShared";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { useCapitulos, useReinos } from "@/features/editorGarlia/hooks/capitulos/useCapitulosEditor";
// ─── EstadisticasEscritura ────────────────────────────────────────────────────

export const EstadisticasEscritura = ({
  texto,
  compact = false,
}: {
  texto: string;
  compact?: boolean;
}) => {
  const palabras = wordCount(texto);
  const caracteres = texto.length;
  const lectura = readingTime(palabras);
  if (compact) {
    return (
      <span className="flex items-center gap-1.5 text-micro font-black uppercase tracking-widest text-primary/25">
        <Hash size={9} />
        {palabras.toLocaleString()}
        <span className="text-primary/15">·</span>
        <Clock size={9} />
        {lectura}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-4 text-micro font-black uppercase tracking-widest text-primary/25">
      <span className="flex items-center gap-1">
        <Hash size={9} />
        {palabras.toLocaleString()} pal.
      </span>
      <span className="hidden sm:flex items-center gap-1">
        <AlignLeft size={9} />
        {caracteres.toLocaleString()} car.
      </span>
      <span className="flex items-center gap-1">
        <Clock size={9} />
        {lectura}
      </span>
    </div>
  );
};

// ─── CapituloItem ─────────────────────────────────────────────────────────────

export const CapituloItem = ({
  cap,
  selected,
  onClick,
  onEdit,
  onDelete,
}: {
  cap: Capitulo;
  selected: boolean;
  onClick: () => void;
  onEdit: (cap: Capitulo) => void;
  onDelete: (id: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group"
      style={{
        background: selected
          ? "var(--primary)"
          : hovered
            ? "color-mix(in srgb, var(--primary) 5%, transparent)"
            : "transparent",
        cursor: "pointer",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-micro font-black tabular-nums transition-all"
        style={{
          background: selected
            ? "color-mix(in srgb, var(--bg-main) 15%, transparent)"
            : "color-mix(in srgb, var(--primary) 8%, transparent)",
          color: selected ? "var(--bg-main)" : "var(--primary)",
          opacity: selected ? 1 : 0.6,
        }}
      >
        {String(cap.orden).padStart(2, "0")}
      </div>

      <span
        className="flex-1 min-w-0 text-micro font-black uppercase italic tracking-tight truncate"
        style={{ color: selected ? "var(--bg-main)" : "var(--primary)" }}
      >
        {cap.titulo_capitulo}
      </span>

      <span className="shrink-0 flex items-center gap-1">
        {cap.status === "pending" && (
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              flexShrink: 0,
              background: selected
                ? "color-mix(in srgb, var(--bg-main) 60%, transparent)"
                : "var(--callout-info-border)",
            }}
            title="Pendiente de sync"
          />
        )}
        {cap.visibilidad === "oculto" && (
          <Lock
            size={7}
            style={{
              opacity: selected ? 0.5 : 0.25,
              color: selected ? "var(--bg-main)" : "var(--primary)",
            }}
          />
        )}
        {cap.visibilidad === "programado" &&
          cap.fecha_publicacion &&
          new Date(cap.fecha_publicacion) > new Date() && (
            <Timer
              size={7}
              style={{
                opacity: selected ? 0.5 : 0.25,
                color: selected ? "var(--bg-main)" : "var(--primary)",
              }}
            />
          )}
      </span>

      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          className="flex items-center justify-center rounded transition-all"
          style={{
            width: 18,
            height: 18,
            border: "none",
            background: menuOpen
              ? "color-mix(in srgb, var(--primary) 12%, transparent)"
              : "transparent",
            color: selected ? "var(--bg-main)" : "var(--primary)",
            opacity: hovered || menuOpen ? (selected ? 0.7 : 0.5) : 0,
            cursor: "pointer",
            transition: "opacity 0.1s, background 0.1s",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((m) => !m);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.background =
              "color-mix(in srgb, var(--primary) 14%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity =
              hovered || menuOpen ? (selected ? "0.7" : "0.5") : "0";
            e.currentTarget.style.background = menuOpen
              ? "color-mix(in srgb, var(--primary) 12%, transparent)"
              : "transparent";
          }}
        >
          <MoreHorizontal size={9} />
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              zIndex: 50,
              minWidth: 140,
              background: "var(--white-custom)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
              borderRadius: 8,
              boxShadow:
                "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
              padding: 3,
              overflow: "hidden",
            }}
          >
            <button
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 5,
                border: "none",
                background: "transparent",
                fontSize: 9,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "var(--text-on-card)",
                opacity: 0.65,
                cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onEdit(cap);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.background =
                  "color-mix(in srgb, var(--primary) 8%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.65";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Pencil size={10} /> Editar
            </button>
            <div
              style={{
                height: 1,
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                margin: "2px 6px",
              }}
            />
            <button
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 5,
                border: "none",
                background: "transparent",
                fontSize: 9,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "var(--accent)",
                opacity: 0.7,
                cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s",
              }}
              onClick={async (e) => {
                e.stopPropagation();
                setMenuOpen(false);
                const ok = await confirm({
                  message: `¿Eliminar "${cap.titulo_capitulo}"?`,
                  danger: true,
                });
                if (ok) onDelete(cap.id);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.background =
                  "color-mix(in srgb, var(--accent) 10%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Trash2 size={10} /> Eliminar
            </button>
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
};

// ─── LibroItem (sidebar mobile accordion) ────────────────────────────────────

export const LibroItem = ({
  libro,
  selectedCapId,
  onSelectCap,
  expanded,
  onToggle,
  onEditCap,
  onDeleteCap,
  onEditLibro,
  onDeleteLibro,
  onNuevoCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
  onDeleteLibro: (libroId: string) => void;
  onNuevoCap: (libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(expanded ? libro.id : null);
  const [rowHovered, setRowHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          position: "relative",
        }}
        onMouseEnter={() => setRowHovered(true)}
        onMouseLeave={() => setRowHovered(false)}
      >
        <button
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 7,
            textAlign: "left",
            background: expanded
              ? "color-mix(in srgb, var(--primary) 6%, transparent)"
              : "transparent",
            border: "1px solid",
            borderColor: expanded
              ? "color-mix(in srgb, var(--primary) 14%, transparent)"
              : "transparent",
            cursor: "pointer",
            transition: "background 0.12s, border-color 0.12s",
          }}
          onClick={onToggle}
          onMouseEnter={(e) => {
            if (!expanded)
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--primary) 4%, transparent)";
          }}
          onMouseLeave={(e) => {
            if (!expanded) e.currentTarget.style.background = "transparent";
          }}
        >
          <BookMarked
            size={11}
            style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 900,
              fontStyle: "italic",
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--primary)",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {libro.titulo}
          </span>
          {libro.estado && (
            <span
              style={{
                fontSize: 7,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                padding: "1px 5px",
                borderRadius: 3,
                border: "1px solid",
                flexShrink: 0,
                ...(libro.estado === "FINALIZADO"
                  ? {
                      borderColor:
                        "color-mix(in srgb, var(--callout-success-border) 40%, transparent)",
                      color: "var(--callout-success-title)",
                      background:
                        "color-mix(in srgb, var(--callout-success-border) 8%, transparent)",
                    }
                  : libro.estado === "EN PROCESO"
                    ? {
                        borderColor:
                          "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)",
                        color: "var(--callout-warning-title)",
                        background:
                          "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)",
                      }
                    : {
                        borderColor:
                          "color-mix(in srgb, var(--primary) 20%, transparent)",
                        color: "var(--primary)",
                        background: "transparent",
                        opacity: 0.4,
                      }),
              }}
            >
              {libro.estado === "EN PROCESO"
                ? "WIP"
                : libro.estado === "FINALIZADO"
                  ? "done"
                  : "…"}
            </span>
          )}
          {expanded ? (
            <ChevronDown
              size={10}
              style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }}
            />
          ) : (
            <ChevronRight
              size={10}
              style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }}
            />
          )}
        </button>

        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 5,
              border: "none",
              flexShrink: 0,
              background: menuOpen
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent",
              color: "var(--primary)",
              opacity: rowHovered || menuOpen ? 0.55 : 0,
              cursor: "pointer",
              transition: "opacity 0.1s, background 0.1s",
            }}
            title="Opciones del libro"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setMenuOpen((m) => !m);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--primary) 10%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity =
                rowHovered || menuOpen ? "0.55" : "0";
              e.currentTarget.style.background = menuOpen
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent";
            }}
          >
            <MoreHorizontal size={10} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 50,
                minWidth: 148,
                background: "var(--white-custom)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                borderRadius: 8,
                boxShadow:
                  "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
                padding: 3,
                overflow: "hidden",
              }}
            >
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: "transparent",
                  fontSize: 9,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--text-on-card)",
                  opacity: 0.65,
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEditLibro(libro);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--primary) 8%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.65";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Pencil size={10} /> Editar
              </button>
              <div
                style={{
                  height: 1,
                  background:
                    "color-mix(in srgb, var(--primary) 10%, transparent)",
                  margin: "2px 6px",
                }}
              />
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: "transparent",
                  fontSize: 9,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--accent)",
                  opacity: 0.7,
                  cursor: "pointer",
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  const ok = await confirm({
                    message: `¿Eliminar "${libro.titulo}" y todos sus capítulos?`,
                    danger: true,
                    confirmLabel: "Eliminar",
                  });
                  if (ok) onDeleteLibro(libro.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--accent) 10%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Trash2 size={10} /> Eliminar libro
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal />

      {expanded && (
        <div
          style={{
            marginLeft: 16,
            paddingLeft: 12,
            borderLeft:
              "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            marginTop: 4,
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px 0",
              }}
            >
              <Loader2
                className="animate-spin"
                size={12}
                style={{ color: "var(--primary)", opacity: 0.2 }}
              />
            </div>
          ) : capitulos.length === 0 ? (
            <p
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--primary)",
                opacity: 0.2,
                padding: "8px 6px",
              }}
            >
              Sin capítulos
            </p>
          ) : (
            capitulos.map((cap) => (
              <CapituloItem
                key={cap.id}
                cap={cap}
                selected={selectedCapId === cap.id}
                onClick={() => onSelectCap(libro.id, cap.id)}
                onDelete={(id) => onDeleteCap(id, libro.id)}
                onEdit={onEditCap}
              />
            ))
          )}
          <div style={{ paddingTop: 4, paddingBottom: 2 }}>
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "6px 0",
                borderRadius: 6,
                border:
                  "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
                background: "transparent",
                fontSize: 8,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "var(--primary)",
                opacity: 0.3,
                cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s, border-color 0.1s",
              }}
              onClick={() => onNuevoCap(libro.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.7";
                e.currentTarget.style.background =
                  "color-mix(in srgb, var(--primary) 4%, transparent)";
                e.currentTarget.style.borderColor =
                  "color-mix(in srgb, var(--primary) 30%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.3";
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor =
                  "color-mix(in srgb, var(--primary) 15%, transparent)";
              }}
            >
              <Plus size={9} /> Nuevo capítulo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LibroCard (mobile grid) ──────────────────────────────────────────────────

export const LibroCard = ({
  libro,
  selectedCapId,
  onSelectCap,
  onEditCap,
  onDeleteCap,
  onEditLibro,
  onDeleteLibro,
  onNuevoCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
  onDeleteLibro: (libroId: string) => void;
  onNuevoCap: (libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(libro.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();
  const isSelected = capitulos.some((c) => c.id === selectedCapId);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className="flex flex-col rounded-xl border overflow-hidden transition-all"
      style={{
        borderColor: isSelected
          ? "color-mix(in srgb, var(--primary) 25%, transparent)"
          : "color-mix(in srgb, var(--primary) 10%, transparent)",
        background: isSelected
          ? "color-mix(in srgb, var(--primary) 5%, transparent)"
          : "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 border-b shrink-0"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        {libro.portada_url ? (
          <Image
            alt=""
            className="w-4 h-4 rounded object-cover shrink-0 border border-primary/10"
            src={libro.portada_url}
          />
        ) : (
          <BookMarked className="text-primary/25 shrink-0" size={9} />
        )}
        <span
          className="flex-1 text-micro font-black uppercase italic tracking-tight text-primary/70 truncate leading-tight"
          title={libro.titulo}
        >
          {libro.titulo}
        </span>
        <div ref={menuRef} className="relative shrink-0">
          <button
            className="p-0.5 rounded text-primary/20 hover:text-primary transition-all"
            onClick={() => setMenuOpen((m) => !m)}
          >
            <MoreHorizontal size={9} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 50,
                minWidth: 130,
                background: "var(--white-custom)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                borderRadius: 8,
                boxShadow:
                  "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
                padding: 3,
                overflow: "hidden",
              }}
            >
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  borderRadius: 5,
                  border: "none",
                  background: "transparent",
                  fontSize: 8,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--text-on-card)",
                  opacity: 0.65,
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEditLibro(libro);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--primary) 8%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.65";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Pencil size={9} /> Editar
              </button>
              <div
                style={{
                  height: 1,
                  background:
                    "color-mix(in srgb, var(--primary) 10%, transparent)",
                  margin: "2px 5px",
                }}
              />
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  borderRadius: 5,
                  border: "none",
                  background: "transparent",
                  fontSize: 8,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--accent)",
                  opacity: 0.7,
                  cursor: "pointer",
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  const ok = await confirm({
                    message: `¿Eliminar "${libro.titulo}" y todos sus capítulos?`,
                    danger: true,
                    confirmLabel: "Eliminar",
                  });
                  if (ok) onDeleteLibro(libro.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--accent) 10%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Trash2 size={9} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal />

      <div className="px-1 pt-1 pb-0.5 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="animate-spin text-primary/20" size={11} />
          </div>
        ) : capitulos.length === 0 ? (
          <p className="text-micro text-primary/20 font-black uppercase tracking-widest px-1 py-2 text-center">
            Sin caps
          </p>
        ) : (
          capitulos.map((cap) => (
            <CapituloItem
              key={cap.id}
              cap={cap}
              selected={selectedCapId === cap.id}
              onClick={() => onSelectCap(libro.id, cap.id)}
              onDelete={(id) => onDeleteCap(id, libro.id)}
              onEdit={onEditCap}
            />
          ))
        )}
      </div>

      <div
        className="shrink-0 p-1 border-t"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
        }}
      >
        <button
          className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-primary/12 text-micro font-black uppercase tracking-widest text-primary/20 hover:text-primary/50 hover:border-primary/25 hover:bg-primary/3 transition-all"
          onClick={() => onNuevoCap(libro.id)}
        >
          <Plus size={8} /> Cap
        </button>
      </div>
    </div>
  );
};

// ─── LibroColumna (desktop horizontal scroll) ─────────────────────────────────

export const LibroColumna = ({
  libro,
  selectedCapId,
  onSelectCap,
  onEditCap,
  onDeleteCap,
  onEditLibro,
  onDeleteLibro,
  onNuevoCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onEditLibro: (libro: Libro) => void;
  onDeleteLibro: (libroId: string) => void;
  onNuevoCap: (libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(libro.id);
  const [hdrHovered, setHdrHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();
  const isSelected = capitulos.some((c) => c.id === selectedCapId);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      style={{
        flexShrink: 0,
        width: 220,
        display: "flex",
        flexDirection: "column",
        borderRight:
          "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        overflow: "hidden",
        background: isSelected
          ? "color-mix(in srgb, var(--primary) 3%, var(--bg-main))"
          : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          padding: "10px 10px 8px",
          borderBottom:
            "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
        onMouseEnter={() => setHdrHovered(true)}
        onMouseLeave={() => setHdrHovered(false)}
      >
        {libro.portada_url ? (
          <Image
            alt=""
            src={libro.portada_url}
            style={{
              width: 22,
              height: 30,
              borderRadius: 3,
              objectFit: "cover",
              flexShrink: 0,
              border:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          />
        ) : (
          <div
            style={{
              width: 22,
              height: 30,
              borderRadius: 3,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <BookMarked
              size={10}
              style={{ color: "var(--primary)", opacity: 0.3 }}
            />
          </div>
        )}

        <span
          style={{
            flex: 1,
            fontSize: 9,
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 900,
            fontStyle: "italic",
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "var(--primary)",
            opacity: 0.8,
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as any,
          }}
          title={libro.titulo}
        >
          {libro.titulo}
        </span>

        {libro.estado && (
          <span
            style={{
              fontSize: 7,
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 900,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              padding: "1px 5px",
              borderRadius: 3,
              border: "1px solid",
              flexShrink: 0,
              ...(libro.estado === "FINALIZADO"
                ? {
                    borderColor:
                      "color-mix(in srgb, var(--callout-success-border) 40%, transparent)",
                    color: "var(--callout-success-title)",
                    background:
                      "color-mix(in srgb, var(--callout-success-border) 8%, transparent)",
                  }
                : libro.estado === "EN PROCESO"
                  ? {
                      borderColor:
                        "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)",
                      color: "var(--callout-warning-title)",
                      background:
                        "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)",
                    }
                  : {
                      borderColor:
                        "color-mix(in srgb, var(--primary) 20%, transparent)",
                      color: "var(--primary)",
                      background:
                        "color-mix(in srgb, var(--primary) 6%, transparent)",
                      opacity: 0.5,
                    }),
            }}
          >
            {libro.estado === "EN PROCESO"
              ? "WIP"
              : libro.estado === "FINALIZADO"
                ? "done"
                : "…"}
          </span>
        )}

        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: 4,
              border: "none",
              background: menuOpen
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent",
              color: "var(--primary)",
              opacity: hdrHovered || menuOpen ? 0.6 : 0,
              cursor: "pointer",
              flexShrink: 0,
              transition: "opacity 0.1s, background 0.1s",
            }}
            title="Opciones del libro"
            onClick={() => setMenuOpen((m) => !m)}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--primary) 10%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity =
                hdrHovered || menuOpen ? "0.6" : "0";
              e.currentTarget.style.background = menuOpen
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent";
            }}
          >
            <MoreHorizontal size={10} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 50,
                minWidth: 140,
                background: "var(--white-custom)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                borderRadius: 8,
                boxShadow:
                  "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
                padding: 3,
                overflow: "hidden",
              }}
            >
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: "transparent",
                  fontSize: 9,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--text-on-card)",
                  opacity: 0.65,
                  cursor: "pointer",
                  transition: "opacity 0.1s, background 0.1s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEditLibro(libro);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--primary) 8%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.65";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Pencil size={10} /> Editar
              </button>
              <div
                style={{
                  height: 1,
                  background:
                    "color-mix(in srgb, var(--primary) 10%, transparent)",
                  margin: "2px 6px",
                }}
              />
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: "transparent",
                  fontSize: 9,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--accent)",
                  opacity: 0.7,
                  cursor: "pointer",
                  transition: "opacity 0.1s, background 0.1s",
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  const ok = await confirm({
                    message: `¿Eliminar el libro "${libro.titulo}" y todos sus capítulos?`,
                    danger: true,
                    confirmLabel: "Eliminar",
                  });
                  if (ok) onDeleteLibro(libro.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--accent) 10%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Trash2 size={10} /> Eliminar libro
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 4px" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "16px 0",
            }}
          >
            <Loader2
              className="animate-spin"
              size={12}
              style={{ color: "var(--primary)", opacity: 0.2 }}
            />
          </div>
        ) : capitulos.length === 0 ? (
          <p
            style={{
              fontSize: 8,
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--primary)",
              opacity: 0.2,
              textAlign: "center",
              padding: "12px 6px",
            }}
          >
            Sin capítulos
          </p>
        ) : (
          capitulos.map((cap) => (
            <CapituloItem
              key={cap.id}
              cap={cap}
              selected={selectedCapId === cap.id}
              onClick={() => onSelectCap(libro.id, cap.id)}
              onDelete={(id) => onDeleteCap(id, libro.id)}
              onEdit={onEditCap}
            />
          ))
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "6px",
          borderTop:
            "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <button
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: "6px 0",
            borderRadius: 6,
            border:
              "1px dashed color-mix(in srgb, var(--primary) 18%, transparent)",
            background: "transparent",
            fontSize: 8,
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 900,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--primary)",
            opacity: 0.3,
            cursor: "pointer",
            transition: "opacity 0.1s, background 0.1s, border-color 0.1s",
          }}
          onClick={() => onNuevoCap(libro.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.75";
            e.currentTarget.style.background =
              "color-mix(in srgb, var(--primary) 5%, transparent)";
            e.currentTarget.style.borderColor =
              "color-mix(in srgb, var(--primary) 35%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.3";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor =
              "color-mix(in srgb, var(--primary) 18%, transparent)";
          }}
        >
          <Plus size={9} /> Nuevo cap
        </button>
      </div>
    </div>
  );
};

// ─── VisibilidadCapPicker ─────────────────────────────────────────────────────

export const VisibilidadCapPicker = ({
  capId,
  current,
  onChanged,
}: {
  capId: string;
  current: "publico" | "programado" | "oculto";
  onChanged: (v: "publico" | "programado" | "oculto") => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = async (v: "publico" | "programado" | "oculto") => {
    if (v === current || saving) return;
    setOpen(false);
    setSaving(true);
    try {
      await capUpdateMeta(capId, { visibilidad: v });
      onChanged(v);
    } catch {}
    setSaving(false);
  };

  const cfg = VISIBILIDAD_CONFIG[current];
  const Icon = cfg.icon;

  return (
    <div ref={ref} className="relative">
      <button
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-micro font-black uppercase tracking-wide transition-all disabled:opacity-40 ${cfg.color}`}
        disabled={saving}
        onClick={() => setOpen((o) => !o)}
      >
        {saving ? (
          <Loader2 className="animate-spin" size={8} />
        ) : (
          <Icon size={8} />
        )}
        {cfg.label}
        <ChevronDown size={7} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden"
          style={{
            background: "var(--bg-main)",
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            minWidth: 120,
          }}
        >
          {(["oculto", "programado", "publico"] as const).map((v) => {
            const c = VISIBILIDAD_CONFIG[v];
            const I = c.icon;
            return (
              <button
                key={v}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-micro font-black uppercase tracking-wide text-left transition-all hover:bg-primary/6"
                style={{
                  color:
                    current === v
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
                onClick={() => handleChange(v)}
              >
                <I size={9} />
                {c.label}
                {current === v && (
                  <Check
                    className="ml-auto"
                    size={8}
                    style={{ color: "var(--primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── SelectorVisibilidad ──────────────────────────────────────────────────────

export const SelectorVisibilidad = ({
  value,
  onChange,
  fechaPublicacion,
  onFechaChange,
  label = "Visibilidad",
}: {
  value: "publico" | "programado" | "oculto";
  onChange: (v: "publico" | "programado" | "oculto") => void;
  fechaPublicacion?: string;
  onFechaChange?: (v: string) => void;
  label?: string;
}) => (
  <div className="space-y-2">
    <label className="text-micro font-black uppercase tracking-widest text-primary/40">
      {label}
    </label>
    <div className="flex gap-2">
      {(["oculto", "programado", "publico"] as const).map((v) => {
        const cfg = VISIBILIDAD_CONFIG[v];
        const Icon = cfg.icon;
        const active = value === v;
        return (
          <button
            key={v}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-btn)] text-micro font-black uppercase tracking-wide border transition-all ${
              active
                ? cfg.color + " shadow-sm"
                : "border-primary/10 text-primary/30 hover:border-primary/25 hover:text-primary/60"
            }`}
            type="button"
            onClick={() => onChange(v)}
          >
            <Icon size={11} /> {cfg.label}
          </button>
        );
      })}
    </div>
    {value === "programado" && (
      <div className="mt-2">
        <label className="text-micro font-black uppercase tracking-widest text-primary/40">
          Fecha de publicación
        </label>
        <input
          className="mt-1 w-full bg-primary/5 border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-micro font-bold text-primary outline-none focus:border-primary/30 transition-colors"
          type="date"
          value={fechaPublicacion || ""}
          onChange={(e) => onFechaChange?.(e.target.value)}
        />
      </div>
    )}
  </div>
);

// ─── SelectorNarrador ─────────────────────────────────────────────────────────

export const SelectorNarrador = ({
  value,
  onChange,
  onNavigate,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  // Navegación opcional: muestra el lápiz junto al narrador seleccionado
  // para saltar directo a su ficha de personaje.
  onNavigate?: (id: string) => void;
}) => {
  const { personajes, loading } = usePersonajes();
  const items = personajes.map((p) => ({
    id: p.id,
    label: p.nombre,
    imgUrl: (p as any).img_url ?? null,
  }));
  return (
    <ComboSelector
      allowNone
      emptyText="Sin personajes"
      icon={<Mic2 size={10} />}
      items={items}
      loading={loading}
      mode="single"
      noneLabel="Ninguno"
      placeholder="Sin narrador…"
      value={value}
      onChange={onChange}
      onNavigate={onNavigate ? (id) => onNavigate(id) : undefined}
    />
  );
};
// ─── SelectorReino ────────────────────────────────────────────────────────────

export const SelectorReino = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { reinos, loading } = useReinos();
  const items = reinos.map((r) => ({
    id: r.id,
    label: r.nombre,
  }));
  return (
    <ComboSelector
      emptyText="Sin reinos"
      hint="(se desbloquean al terminar)"
      icon={<MapPin size={10} />}
      items={items}
      label="Reinos / Ubicaciones"
      loading={loading}
      mode="multi"
      placeholder="Añadir reinos…"
      value={value}
      onChange={onChange}
    />
  );
};
// ─── SelectorPersonajesCapitulo ───────────────────────────────────────────────

export const SelectorPersonajesCapitulo = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { personajes, loading } = usePersonajes();
  const items = personajes.map((p) => ({
    id: p.id,
    label: p.nombre,
    imgUrl: (p as any).img_url ?? null,
  }));
  return (
    <ComboSelector
      emptyText="Sin personajes"
      hint="(se desbloquean al terminar)"
      icon={<UserCircle2 size={10} />}
      items={items}
      label="Personajes que aparecen"
      loading={loading}
      mode="multi"
      placeholder="Añadir personajes…"
      value={value}
      onChange={onChange}
    />
  );
};

// ─── NarradorPill ─────────────────────────────────────────────────────────────

export const NarradorPill = ({ narradorId }: { narradorId: string }) => {
  const { personajes } = usePersonajes();
  const p = personajes.find((x) => x.id === narradorId);
  if (!p) return null;
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-micro font-black uppercase tracking-wide"
      style={{
        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
        color: "var(--accent)",
      }}
    >
      <Mic2 size={8} />
      {p.nombre}
    </span>
  );
};

// ─── SelectorImagenPortada ────────────────────────────────────────────────────

export function SelectorImagenPortada({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-micro font-black uppercase tracking-widest text-primary/40">
        Portada
      </label>
      <div
        className="relative aspect-[2/3] w-28 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 cursor-pointer group"
        onClick={() => setOpen(true)}
      >
        {value ? (
          <>
            <Image
              alt="portada"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              src={value}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              <BookMarked className="text-white" size={16} />
              <span className="text-micro font-black uppercase text-white tracking-widest">
                Cambiar
              </span>
            </div>
            <button
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              <X className="text-white" size={9} />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/25 hover:text-primary/50 transition-colors">
            <BookMarked size={20} />
            <span className="text-micro font-black uppercase tracking-widest text-center px-1">
              Elegir portada
            </span>
          </div>
        )}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-micro font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <BookMarked size={11} /> Portada del libro
              </h3>
              <button
                className="text-primary/30 hover:text-primary transition-colors"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onClose={() => setOpen(false)}
              onSelect={(url) => {
                onChange(url);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── hooks internos de criaturas e items ─────────────────────────────────────

function useCriaturas() {
  const [criaturas, setCriaturas] = useState<
    { id: string; nombre: string; imagen_url?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      // 1️⃣ Dexie first
      try {
        const table = (db as any)["criaturas"];
        if (table) {
          const local = await table.orderBy("nombre").toArray();
          if (local.length > 0) {
            setCriaturas(local);
            setLoading(false);
          }
        }
      } catch {}

      // 2️⃣ Bail if offline
      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      // 3️⃣ Refresh from Supabase and update cache
      try {
        const { data } = await supabase
          .from("criaturas")
          .select("id, nombre, imagen_url")
          .order("nombre");
        if (data) {
          setCriaturas(data as any[]);
          try {
            const table = (db as any)["criaturas"];
            if (table) await table.bulkPut(data);
          } catch {}
        }
      } catch {}
      setLoading(false);
    })();
  }, []);
  return { criaturas, loading };
}

function useItems() {
  const [items, setItems] = useState<
    { id: string; nombre: string; imagen_url?: string; categoria?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      // 1️⃣ Dexie first
      try {
        const table = (db as any)["items"];
        if (table) {
          const local = await table.orderBy("nombre").toArray();
          if (local.length > 0) {
            setItems(local);
            setLoading(false);
          }
        }
      } catch {}

      // 2️⃣ Bail if offline
      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      // 3️⃣ Refresh from Supabase and update cache
      try {
        const { data } = await supabase
          .from("items")
          .select("id, nombre, imagen_url, categoria")
          .order("nombre");
        if (data) {
          setItems(data as any[]);
          try {
            const table = (db as any)["items"];
            if (table) await table.bulkPut(data);
          } catch {}
        }
      } catch {}
      setLoading(false);
    })();
  }, []);
  return { items, loading };
}

function useCiudades() {
  const [ciudades, setCiudades] = useState<
    {
      id: string;
      nombre: string;
      imagen_url?: string | null;
      reino_id?: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      // 1️⃣ Dexie first
      try {
        const table = (db as any)["ciudades"];
        if (table) {
          const local = await table.orderBy("nombre").toArray();
          if (local.length > 0) {
            setCiudades(local);
            setLoading(false);
          }
        }
      } catch {}

      // 2️⃣ Bail if offline
      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      // 3️⃣ Refresh from Supabase and update cache
      try {
        const { data } = await supabase
          .from("ciudades")
          .select("id, nombre, imagen_url, reino_id")
          .order("nombre");
        if (data) {
          setCiudades(data as any[]);
          try {
            const table = (db as any)["ciudades"];
            if (table) await table.bulkPut(data);
          } catch {}
        }
      } catch {}
      setLoading(false);
    })();
  }, []);
  return { ciudades, loading };
}

// ─── PanelPersonajesCapitulo (Personajes + Criaturas + Items en vertical) ─────

// ─── TW predefinidos ─────────────────────────────────────────────────────────
const TW_PREDEFINIDOS = [
  "Suicidio",
  "Trastornos Alimenticios",
  "Violencia",
  "Abuso Sexual",
  "Autolesiones",
  "Abuso de Sustancias",
  "Muerte",
  "Trauma",
];

// ─── SeccionTriggerWarnings ───────────────────────────────────────────────────
const SeccionTriggerWarnings = ({
  capId,
  initialValues,
}: {
  capId: string;
  initialValues: string[];
}) => {
  const [activos, setActivos] = useState<string[]>(initialValues);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync cuando cambia de capítulo
  useEffect(() => {
    setActivos(initialValues);
  }, [initialValues.join(",")]);

  const save = async (next: string[]) => {
    setActivos(next);
    setSaving(true);
    try {
      await capUpdateMeta(capId, { trigger_warnings: next } as any);
    } catch {}
    setSaving(false);
  };

  const toggle = (tw: string) => {
    const next = activos.includes(tw)
      ? activos.filter((x) => x !== tw)
      : [...activos, tw];
    void save(next);
  };

  const addCustom = () => {
    const v = custom.trim();
    if (!v || activos.includes(v)) {
      setCustom("");
      setAdding(false);
      return;
    }
    void save([...activos, v]);
    setCustom("");
    setAdding(false);
  };

  return (
    <div
      className="shrink-0 px-3 py-2.5 border-b"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-1 mb-2">
        <span style={{ fontSize: 11, lineHeight: 1 }}>⚠️</span>
        <span
          className="text-micro font-black uppercase tracking-[0.2em] flex-1"
          style={{
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          Trigger Warnings
        </span>
        {saving && (
          <Loader2
            className="animate-spin shrink-0"
            size={8}
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          />
        )}
      </div>

      {/* Lista de predefinidos */}
      <div className="flex flex-col gap-0.5">
        {TW_PREDEFINIDOS.map((tw) => {
          const on = activos.includes(tw);
          return (
            <button
              key={tw}
              className="flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded transition-all"
              style={{
                background: on
                  ? "color-mix(in srgb, var(--callout-warning-border) 12%, transparent)"
                  : "transparent",
              }}
              onClick={() => toggle(tw)}
            >
              <div
                className="shrink-0 flex items-center justify-center rounded"
                style={{
                  width: 11,
                  height: 11,
                  border: `1px solid ${on ? "var(--callout-warning-border)" : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
                  background: on
                    ? "var(--callout-warning-border)"
                    : "transparent",
                  transition: "all 0.12s",
                }}
              >
                {on && <Check size={7} style={{ color: "var(--bg-main)" }} />}
              </div>
              <span
                className="text-micro font-bold"
                style={{
                  color: on
                    ? "var(--callout-warning-title)"
                    : "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
              >
                {tw}
              </span>
            </button>
          );
        })}

        {/* TW custom que no son predefinidos */}
        {activos
          .filter((tw) => !TW_PREDEFINIDOS.includes(tw))
          .map((tw) => (
            <button
              key={tw}
              className="flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded transition-all"
              style={{
                background:
                  "color-mix(in srgb, var(--callout-warning-border) 12%, transparent)",
              }}
              onClick={() => toggle(tw)}
            >
              <div
                className="shrink-0 flex items-center justify-center rounded"
                style={{
                  width: 11,
                  height: 11,
                  border: "1px solid var(--callout-warning-border)",
                  background: "var(--callout-warning-border)",
                  transition: "all 0.12s",
                }}
              >
                <Check size={7} style={{ color: "var(--bg-main)" }} />
              </div>
              <span
                className="text-micro font-bold flex-1 truncate"
                style={{ color: "var(--callout-warning-title)" }}
              >
                {tw}
              </span>
              <X
                size={8}
                style={{
                  color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                  flexShrink: 0,
                }}
              />
            </button>
          ))}
      </div>

      {/* Añadir personalizado */}
      {adding ? (
        <div className="flex items-center gap-1 mt-1.5">
          <input
            ref={inputRef}
            autoFocus
            className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-micro font-bold outline-none border transition-all"
            placeholder="Ej: Acoso…"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--primary) 20%, transparent)",
              color: "var(--primary)",
            }}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustom();
              if (e.key === "Escape") {
                setCustom("");
                setAdding(false);
              }
            }}
          />
          <button
            className="p-1 rounded"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
            }}
            onClick={addCustom}
          >
            <Check size={9} />
          </button>
          <button
            className="p-1 rounded"
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
            onClick={() => {
              setCustom("");
              setAdding(false);
            }}
          >
            <X size={9} />
          </button>
        </div>
      ) : (
        <button
          className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed text-micro font-black uppercase tracking-widest transition-all"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
          onClick={() => setAdding(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--primary)";
            e.currentTarget.style.borderColor =
              "color-mix(in srgb, var(--primary) 30%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color =
              "color-mix(in srgb, var(--primary) 30%, transparent)";
            e.currentTarget.style.borderColor =
              "color-mix(in srgb, var(--primary) 14%, transparent)";
          }}
        >
          <Plus size={8} /> Añadir
        </button>
      )}
    </div>
  );
};

export const PanelPersonajesCapitulo = ({
  capId,
  value,
  onChange,
  criaturas_ids = [],
  onCriaturasChange,
  items_ids = [],
  onItemsChange,
  mobileOpen = false,
  onMobileClose,
}: {
  capId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  criaturas_ids?: string[];
  onCriaturasChange?: (ids: string[]) => void;
  items_ids?: string[];
  onItemsChange?: (ids: string[]) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) => {
  const { personajes, loading: loadingP } = usePersonajes();
  const { criaturas, loading: loadingC } = useCriaturas();
  const { items, loading: loadingI } = useItems();

  const [savingP, setSavingP] = useState(false);
  const [savingC, setSavingC] = useState(false);
  const [savingI, setSavingI] = useState(false);

  // ── Orden del capítulo ───────────────────────────────────────────────────
  const [ordenCap, setOrdenCap] = useState<string>("");
  const [_savingOrdenCap, setSavingOrdenCap] = useState(false);

  // ── Posición en línea de tiempo ───────────────────────────────────────────
  const [ordenLinea, setOrdenLinea] = useState<string>("");
  const [savingOrden, setSavingOrden] = useState(false);
  const _ordenInputRef = useRef<HTMLInputElement>(null);

  // ── Reinos del capítulo ───────────────────────────────────────────────────
  const { reinos, loading: loadingReinos } = useReinos();
  const [reinosIds, setReinosIds] = useState<string[]>([]);
  const [savingReino, setSavingReino] = useState(false);
  const reinoRef = useRef<HTMLDivElement>(null);

  // ── Ciudades del capítulo ─────────────────────────────────────────────────
  const { ciudades, loading: loadingCiudades } = useCiudades();
  const [ciudadesIds, setCiudadesIds] = useState<string[]>([]);
  const [savingCiudad, setSavingCiudad] = useState(false);

  // ── Visibilidad del capítulo ──────────────────────────────────────────────
  const [visibilidad, setVisibilidad] = useState<
    "publico" | "programado" | "oculto"
  >("oculto");
  const [savingVis, setSavingVis] = useState(false);
  const [_dropVis, setDropVis] = useState(false);
  const dropVisRef = useRef<HTMLDivElement>(null);
  const [fechaProg, setFechaProg] = useState<string>("");
  const [_savingFecha, setSavingFecha] = useState(false);

  // ── Narrador del capítulo ─────────────────────────────────────────────────
  const [narradorId, setNarradorId] = useState<string | null>(null);
  const [savingNarr, setSavingNarr] = useState(false);

  // ── Era del narrador en la línea de tiempo del capítulo ─────────────────
  // Muestra la era de personaje_eras cuyo momento <= orden_linea_tiempo del cap
  const [eraActual, setEraActual] = useState<{
    momento: number;
    label: string;
    rasgos: string[];
    notas: string;
  } | null>(null);
  const [loadingEra, setLoadingEra] = useState(false);

  useEffect(() => {
    if (!capId) return;
    let cancelled = false;

    const cargar = async () => {
      const apply = (data: any) => {
        if (!data || cancelled) return;
        if (data.orden != null) setOrdenCap(String(data.orden));
        setOrdenLinea(
          data.dia_absoluto != null ? String(data.dia_absoluto) : "",
        );
        setReinosIds(data.reinos_ids ?? []);
        setCiudadesIds(data.ciudades_ids ?? []);
        setVisibilidad(data.visibilidad ?? "oculto");
        setFechaProg(
          data.fecha_publicacion ? data.fecha_publicacion.slice(0, 10) : "",
        );
        setNarradorId(data.narrador_id ?? null);
      };

      // 1. Dexie primero — respuesta instantánea
      try {
        const local = await (db as any).capitulos?.get(capId);
        if (local) apply(local);
      } catch {}

      // 2. Supabase en background para asegurar datos frescos
      if (!navigator.onLine || cancelled) return;
      try {
        const { data } = await supabase
          .from("capitulos")
          .select(
            "orden, dia_absoluto, reinos_ids, visibilidad, fecha_publicacion, ciudades_ids, narrador_id",
          )
          .eq("id", capId)
          .single();
        apply(data);
        // Actualizar Dexie con los datos frescos
        if (data) {
          try {
            await (db as any).capitulos?.update(capId, data);
          } catch {}
        }
      } catch {}
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [capId]);

  const handleToggleReino = async (id: string, add: boolean) => {
    const next = add ? [...reinosIds, id] : reinosIds.filter((x) => x !== id);
    setReinosIds(next);
    setSavingReino(true);
    try {
      await capUpdateMeta(capId, { reinos_ids: next } as any);
    } catch {}
    setSavingReino(false);
  };

  const handleToggleCiudad = async (id: string, add: boolean) => {
    const next = add
      ? [...ciudadesIds, id]
      : ciudadesIds.filter((x) => x !== id);
    setCiudadesIds(next);
    setSavingCiudad(true);
    try {
      await capUpdateMeta(capId, { ciudades_ids: next } as any);
    } catch {}
    setSavingCiudad(false);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropVisRef.current && !dropVisRef.current.contains(e.target as Node))
        setDropVis(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const _handleSaveVisibilidad = async (
    v: "publico" | "programado" | "oculto",
  ) => {
    if (v === visibilidad || savingVis) return;
    setVisibilidad(v);
    setSavingVis(true);
    try {
      await capUpdateMeta(capId, { visibilidad: v });
      if (v !== "programado") {
        setFechaProg("");
        await capUpdateMeta(capId, { fecha_publicacion: null as any });
      }
    } catch {}
    setSavingVis(false);
  };

  const _handleSaveFechaProg = async () => {
    if (!fechaProg) return;
    setSavingFecha(true);
    try {
      await capUpdateMeta(capId, { fecha_publicacion: fechaProg });
    } catch {}
    setSavingFecha(false);
  };

  const handleSaveNarrador = async (id: string | null) => {
    setNarradorId(id);
    setSavingNarr(true);
    setEraActual(null);
    try {
      await capUpdateMeta(capId, { narrador_id: id } as any);
    } catch {}
    setSavingNarr(false);
  };

  // Cargar la era del narrador más cercana (<=) al dia_absoluto del capítulo
  useEffect(() => {
    if (!narradorId) {
      setEraActual(null);
      return;
    }
    const momento = ordenLinea.trim() ? parseInt(ordenLinea.trim(), 10) : null;
    let cancelled = false;
    setLoadingEra(true);

    const cargar = async () => {
      const apply = (data: any) => {
        if (!data || cancelled) return;
        setEraActual({
          momento: data.momento,
          label: data.label ?? "",
          rasgos: data.rasgos ?? [],
          notas: data.notas ?? "",
        });
        setLoadingEra(false);
      };

      // 1. Dexie primero
      try {
        let eras: any[] =
          (await (db as any).personaje_eras
            ?.where("personaje_id")
            .equals(narradorId)
            .toArray()) ?? [];
        if (eras.length) {
          // Filtrar <= momento y tomar el mayor
          if (momento != null && !isNaN(momento)) {
            eras = eras.filter((e: any) => e.momento <= momento);
          }
          eras.sort((a: any, b: any) => b.momento - a.momento);
          if (eras[0]) apply(eras[0]);
        }
      } catch {}

      // 2. Supabase en background
      if (!navigator.onLine || cancelled) {
        if (!cancelled) setLoadingEra(false);
        return;
      }
      try {
        let query = (supabase as any)
          .from("personaje_eras")
          .select("id, personaje_id, momento, label, rasgos, notas")
          .eq("personaje_id", narradorId)
          .order("momento", { ascending: false });
        if (momento != null && !isNaN(momento))
          query = query.lte("momento", momento);
        const { data } = await query.limit(1).maybeSingle();
        if (!cancelled) {
          apply(data);
          // Cachear todas las eras del narrador en Dexie para la próxima vez
          const { data: todas } = await (supabase as any)
            .from("personaje_eras")
            .select("id, personaje_id, momento, label, rasgos, notas")
            .eq("personaje_id", narradorId);
          if (todas?.length) {
            try {
              await (db as any).personaje_eras?.bulkPut(todas);
            } catch {}
          }
        }
      } catch {
        if (!cancelled) setLoadingEra(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [narradorId, ordenLinea]);

  const _handleSaveOrdenCap = async () => {
    const num = parseInt(ordenCap.trim(), 10);
    if (isNaN(num) || num < 1) return;
    setSavingOrdenCap(true);
    try {
      await capUpdateMeta(capId, { orden: num });
    } catch {}
    setSavingOrdenCap(false);
  };

  const _handleSaveOrden = async () => {
    const val = ordenLinea.trim();
    const num = val === "" ? null : parseInt(val, 10);
    if (val !== "" && isNaN(num as number)) return;
    setSavingOrden(true);
    try {
      await capUpdateMeta(capId, { dia_absoluto: num } as any);
    } catch {}
    setSavingOrden(false);
  };

  const handleTogglePersonaje = async (id: string, add: boolean) => {
    const next = add ? [...value, id] : value.filter((x) => x !== id);
    onChange(next);
    setSavingP(true);
    try {
      await capUpdateMeta(capId, { personajes_ids: next });
    } catch {}
    setSavingP(false);
  };

  const handleToggleCriatura = async (id: string, add: boolean) => {
    const next = add
      ? [...criaturas_ids, id]
      : criaturas_ids.filter((x) => x !== id);
    onCriaturasChange?.(next);
    setSavingC(true);
    try {
      await capUpdateMeta(capId, { criaturas_ids: next } as any);
    } catch {}
    setSavingC(false);
  };

  const handleToggleItem = async (id: string, add: boolean) => {
    const next = add ? [...items_ids, id] : items_ids.filter((x) => x !== id);
    onItemsChange?.(next);
    setSavingI(true);
    try {
      await capUpdateMeta(capId, { items_ids: next } as any);
    } catch {}
    setSavingI(false);
  };

  const dispatchOpen = (tabla: string, id: string) => {
    window.dispatchEvent(
      new CustomEvent("garlia-open-entity", { detail: { tabla, id } }),
    );
  };

  // Contenido compartido entre desktop y drawer mobile
  const innerContent = (
    <>
      {/* ── Narrador ────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-3 py-2.5 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Mic2
            size={8}
            style={{
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          />
          <span
            className="text-micro font-black uppercase tracking-[0.2em] flex-1"
            style={{
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            Narrador
          </span>
          {savingNarr && (
            <Loader2
              className="animate-spin shrink-0"
              size={8}
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            />
          )}
        </div>
        <SelectorNarrador
          value={narradorId}
          onChange={handleSaveNarrador}
          onNavigate={(id) => dispatchOpen("personajes", id)}
        />
      </div>

      {/* ── Era del narrador en la línea de tiempo ──────────────────────── */}
      {narradorId && (
        <div
          className="shrink-0 px-3 py-2.5 border-b space-y-2"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {loadingEra ? (
            <div className="flex justify-center py-2">
              <Loader2 className="animate-spin text-primary/20" size={10} />
            </div>
          ) : eraActual ? (
            <>
              {/* Etiqueta del momento */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--accent)" }}
                />
                <span
                  className="text-micro font-black tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {eraActual.momento}
                </span>
                {eraActual.label && (
                  <span className="text-micro font-bold text-primary/35 italic truncate">
                    {eraActual.label}
                  </span>
                )}
              </div>

              {/* Chips de rasgos */}
              {eraActual.rasgos.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {eraActual.rasgos.map((rasgo) => (
                    <span
                      key={rasgo}
                      className="px-2 py-0.5 rounded-full text-micro font-black uppercase tracking-wide border"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 6%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--primary) 14%, transparent)",
                        color:
                          "color-mix(in srgb, var(--primary) 55%, transparent)",
                      }}
                    >
                      {rasgo}
                    </span>
                  ))}
                </div>
              )}

              {/* Notas */}
              {eraActual.notas && (
                <p
                  className="text-micro leading-relaxed"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                >
                  {eraActual.notas}
                </p>
              )}
            </>
          ) : (
            <p
              className="text-micro font-black uppercase tracking-widest text-center py-1 italic"
              style={{
                color: "color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
            >
              {ordenLinea
                ? "Sin era registrada en este momento"
                : "Asigna un nº de línea de tiempo para ver la era"}
            </p>
          )}
        </div>
      )}

      {/* ── Posición en línea de tiempo ─────────────────────────────────── */}
      <div
        className="shrink-0 px-3 py-2.5 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Clock
            size={8}
            style={{
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          />
          <span
            className="text-micro font-black uppercase tracking-[0.2em]"
            style={{
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            Línea de tiempo
          </span>
        </div>
        <div className="space-y-1.5">
          {/* Selector de fecha del calendario del mundo */}
          {(() => {
            const diaActual = ordenLinea.trim()
              ? parseInt(ordenLinea.trim(), 10)
              : null;
            return (
              <div className="relative">
                {savingOrden && (
                  <Loader2
                    className="animate-spin absolute right-2 top-2 z-10 text-primary/30"
                    size={8}
                  />
                )}
                <SelectorFechaMundo
                  placeholder="Sin fecha en la línea de tiempo"
                  value={diaActual}
                  onChange={async (dia) => {
                    setOrdenLinea(dia != null ? String(dia) : "");
                    setSavingOrden(true);
                    try {
                      await capUpdateMeta(capId, { dia_absoluto: dia } as any);
                    } catch {}
                    setSavingOrden(false);
                  }}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Reinos ──────────────────────────────────── */}
      <div
        ref={reinoRef}
        className="shrink-0 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <SeccionEntidad
          allEntities={reinos.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            imagen_url: (r as any).imagen_reino ?? undefined,
          }))}
          capId={capId}
          emptyLabel="Sin territorio"
          fallbackIcon={<Globe size={10} />}
          icon={<Globe size={9} />}
          label="Territorio"
          loading={loadingReinos}
          saving={savingReino}
          selectedIds={reinosIds}
          onEntityClick={(id) => dispatchOpen("reinos", id)}
          onToggle={(id, add) => handleToggleReino(id, add)}
        />
      </div>

      {/* ── Ciudades   */}
      <div
        className="shrink-0 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <SeccionEntidad
          allEntities={ciudades
            .filter((c) => !reinosIds.length || reinosIds.includes(c.reino_id!))
            .map((c) => ({
              id: c.id,
              nombre: c.nombre,
              imagen_url: c.imagen_url ?? undefined,
            }))}
          capId={capId}
          emptyLabel={
            reinosIds.length > 0
              ? "Sin ciudades en estos reinos"
              : "Sin ciudades"
          }
          fallbackIcon={<MapPin size={10} />}
          icon={<MapPin size={9} />}
          label={
            reinosIds.length > 0 ? `Ciudades (${reinosIds.length})` : "Ciudades"
          }
          loading={loadingCiudades}
          saving={savingCiudad}
          selectedIds={ciudadesIds}
          onEntityClick={(id) => dispatchOpen("ciudades", id)}
          onToggle={(id, add) => handleToggleCiudad(id, add)}
        />
      </div>

      <SeccionEntidad
        allEntities={personajes}
        capId={capId}
        emptyLabel="Sin personajes"
        fallbackIcon={<UserCircle2 size={10} />}
        icon={<UserCircle2 size={9} />}
        label="Personajes"
        loading={loadingP}
        saving={savingP}
        selectedIds={value}
        onEntityClick={(id) => dispatchOpen("personajes", id)}
        onToggle={handleTogglePersonaje}
      />

      {/* Divisor */}
      <div
        style={{
          height: "1px",
          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      />

      <SeccionEntidad
        allEntities={criaturas}
        capId={capId}
        emptyLabel="Sin criaturas"
        fallbackIcon={<Cat size={10} />}
        icon={<Cat size={9} />}
        label="Criaturas"
        loading={loadingC}
        saving={savingC}
        selectedIds={criaturas_ids}
        onEntityClick={(id) => dispatchOpen("criaturas", id)}
        onToggle={handleToggleCriatura}
      />

      {/* Divisor */}
      <div
        style={{
          height: "1px",
          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      />

      <SeccionEntidad
        allEntities={items}
        capId={capId}
        emptyLabel="Sin ítems"
        fallbackIcon={<Sword size={10} />}
        icon={<Sword size={9} />}
        label="Ítems"
        loading={loadingI}
        saving={savingI}
        selectedIds={items_ids}
        onEntityClick={(id) => dispatchOpen("items", id)}
        onToggle={handleToggleItem}
      />
    </>
  );

  return (
    <>
      {/* Desktop: panel fijo lateral */}
      <div
        className="hidden lg:flex flex-col shrink-0 border-l overflow-y-auto"
        style={{
          width: "180px",
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        {innerContent}
      </div>

      {/* Mobile: drawer desde la derecha */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
            onClick={onMobileClose}
          />
          {/* Panel */}
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "220px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            {/* Header del drawer */}
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/40 flex items-center gap-1.5">
                <SlidersHorizontal size={9} />
                Metadatos
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={onMobileClose}
              >
                <X size={14} />
              </button>
            </div>
            {innerContent}
          </div>
        </div>
      )}
    </>
  );
};

// ─── DialogSnippets ───────────────────────────────────────────────────────────

type DialogSnippet = {
  label: string;
  title: string;
  insert: string | ((sel: string) => string);
};

const DIALOG_SNIPPETS: DialogSnippet[] = [
  { label: "—", title: "Guión de diálogo", insert: "— " },
  {
    label: "— … —",
    title: "Acotación entre guiones",
    insert: (sel) => `— ${sel || "…"} —`,
  },
  {
    label: "«»",
    title: "Comillas angulares",
    insert: (sel) => `«${sel || "…"}»`,
  },
  {
    label: "—diálogo",
    title: "Línea de diálogo completa",
    insert: (sel) => `— ${sel || ""}`,
  },
  { label: "…", title: "Puntos suspensivos", insert: "…" },
  { label: "–", title: "Guión corto (en-dash)", insert: "–" },
];

function insertAtCursor(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  snippet: DialogSnippet,
) {
  const start = ta.selectionStart ?? 0;
  const end = ta.selectionEnd ?? 0;
  const sel = value.slice(start, end);
  const ins =
    typeof snippet.insert === "function" ? snippet.insert(sel) : snippet.insert;
  const next = value.slice(0, start) + ins + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + ins.length;
    ta.setSelectionRange(pos, pos);
  });
}

export const DialogSnippets = ({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="shrink-0 flex items-center gap-1 px-4 sm:px-8 py-1.5 border-b border-primary/5 flex-wrap">
    <span className="text-micro font-black uppercase tracking-widest text-primary/20 mr-1">
      Diálogo
    </span>
    {DIALOG_SNIPPETS.map((s) => (
      <button
        key={s.label}
        className="px-2.5 py-1 rounded-lg border border-primary/10 text-micro font-mono text-primary/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all select-none"
        title={s.title}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          if (textareaRef.current)
            insertAtCursor(textareaRef.current, value, onChange, s);
        }}
      >
        {s.label}
      </button>
    ))}
  </div>
);
