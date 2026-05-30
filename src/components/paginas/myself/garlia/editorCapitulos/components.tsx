"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown, ChevronRight, UserCircle2, Loader2, Trash2,
  X, Check, Clock, Hash, AlignLeft, Calendar, BookMarked, Pencil,
  MoreHorizontal, Globe, Lock, Timer, Mic2, MapPin, Cat, Sword,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SaveIndicator } from "@/components/templates/EstudioTemplates";
import SimpleImagePicker from "@/components/paginas/myself/garlia/editorCapitulos/snippets//forms/SimpleImagePicker";
import { usePersonajes } from "@/hooks/useEditorShared";
import { supabase } from "@/lib/api/client/supabase";
import {
  Libro, Capitulo,
  VISIBILIDAD_CONFIG,
  wordCount, readingTime,
  capUpdateMeta,
} from "./types";
import { useCapitulos, useReinos } from "./hooks";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";

// ─── EstadisticasEscritura ────────────────────────────────────────────────────

export const EstadisticasEscritura = ({ texto, compact = false }: { texto: string; compact?: boolean }) => {
  const palabras   = wordCount(texto);
  const caracteres = texto.length;
  const lectura    = readingTime(palabras);
  if (compact) {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/25">
        <Hash size={9}/>{palabras.toLocaleString()}
        <span className="text-primary/15">·</span>
        <Clock size={9}/>{lectura}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
      <span className="flex items-center gap-1"><Hash size={9}/>{palabras.toLocaleString()} pal.</span>
      <span className="hidden sm:flex items-center gap-1"><AlignLeft size={9}/>{caracteres.toLocaleString()} car.</span>
      <span className="flex items-center gap-1"><Clock size={9}/>{lectura}</span>
    </div>
  );
};

// ─── CapituloItem ─────────────────────────────────────────────────────────────

export const CapituloItem = ({
  cap, selected, onClick, onEdit, onDelete,
}: {
  cap: Capitulo;
  selected: boolean;
  onClick: () => void;
  onEdit: (cap: Capitulo) => void;
  onDelete: (id: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered,  setHovered]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
        className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black tabular-nums transition-all"
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
        className="flex-1 min-w-0 text-[10px] font-black uppercase italic tracking-tight truncate"
        style={{ color: selected ? "var(--bg-main)" : "var(--primary)" }}
      >
        {cap.titulo_capitulo}
      </span>

      <span className="shrink-0 flex items-center gap-1">
        {cap.status === "pending" && (
          <span
            title="Pendiente de sync"
            style={{
              width: 4, height: 4, borderRadius: "50%", flexShrink: 0,
              background: selected ? "color-mix(in srgb, var(--bg-main) 60%, transparent)" : "var(--callout-info-border)",
            }}
          />
        )}
        {cap.visibilidad === "oculto" && (
          <Lock size={7} style={{ opacity: selected ? 0.5 : 0.25, color: selected ? "var(--bg-main)" : "var(--primary)" }} />
        )}
        {cap.visibilidad === "programado" && cap.fecha_publicacion && new Date(cap.fecha_publicacion) > new Date() && (
          <Timer size={7} style={{ opacity: selected ? 0.5 : 0.25, color: selected ? "var(--bg-main)" : "var(--primary)" }} />
        )}
      </span>

      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          className="flex items-center justify-center rounded transition-all"
          style={{
            width: 18, height: 18, border: "none",
            background: menuOpen ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
            color: selected ? "var(--bg-main)" : "var(--primary)",
            opacity: hovered || menuOpen ? (selected ? 0.7 : 0.5) : 0,
            cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 14%, transparent)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = hovered || menuOpen ? (selected ? "0.7" : "0.5") : "0"; e.currentTarget.style.background = menuOpen ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent"; }}
        >
          <MoreHorizontal size={9} />
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
            minWidth: 140, background: "var(--white-custom)",
            border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
            borderRadius: 8, boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
            padding: 3, overflow: "hidden",
          }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cap); }}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: "var(--text-on-card)", opacity: 0.65, cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.background = "transparent"; }}
            >
              <Pencil size={10} /> Editar
            </button>
            <div style={{ height: 1, background: "color-mix(in srgb, var(--primary) 10%, transparent)", margin: "2px 6px" }} />
            <button
              onClick={async e => {
                e.stopPropagation(); setMenuOpen(false);
                const ok = await confirm({ message: `¿Eliminar "${cap.titulo_capitulo}"?`, danger: true });
                if (ok) onDelete(cap.id);
              }}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: "var(--accent)", opacity: 0.7, cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
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
  libro, selectedCapId, onSelectCap, expanded, onToggle, onEditCap, onDeleteCap, onEditLibro, onDeleteLibro, onNuevoCap,
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
  const [menuOpen, setMenuOpen]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}
        onMouseEnter={() => setRowHovered(true)}
        onMouseLeave={() => setRowHovered(false)}
      >
        <button
          onClick={onToggle}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 7, textAlign: "left",
            background: expanded ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
            border: "1px solid",
            borderColor: expanded ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
            cursor: "pointer", transition: "background 0.12s, border-color 0.12s",
          }}
          onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; }}
          onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
        >
          <BookMarked size={11} style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }} />
          <span style={{
            flex: 1, fontSize: 10, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            fontStyle: "italic", textTransform: "uppercase" as const, letterSpacing: "0.06em",
            color: "var(--primary)", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {libro.titulo}
          </span>
          {libro.estado && (
            <span style={{
              fontSize: 7, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase" as const, letterSpacing: "0.08em",
              padding: "1px 5px", borderRadius: 3, border: "1px solid", flexShrink: 0,
              ...(libro.estado === "FINALIZADO"
                ? { borderColor: "color-mix(in srgb, var(--callout-success-border) 40%, transparent)", color: "var(--callout-success-title)", background: "color-mix(in srgb, var(--callout-success-border) 8%, transparent)" }
                : libro.estado === "EN PROCESO"
                ? { borderColor: "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)", color: "var(--callout-warning-title)", background: "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)" }
                : { borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", background: "transparent", opacity: 0.4 }),
            }}>
              {libro.estado === "EN PROCESO" ? "WIP" : libro.estado === "FINALIZADO" ? "done" : "…"}
            </span>
          )}
          {expanded
            ? <ChevronDown size={10} style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: "var(--primary)", opacity: 0.3, flexShrink: 0 }} />
          }
        </button>

        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setMenuOpen(m => !m); }}
            title="Opciones del libro"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 5, border: "none", flexShrink: 0,
              background: menuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
              color: "var(--primary)",
              opacity: rowHovered || menuOpen ? 0.55 : 0, cursor: "pointer",
              transition: "opacity 0.1s, background 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = rowHovered || menuOpen ? "0.55" : "0"; e.currentTarget.style.background = menuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent"; }}
          >
            <MoreHorizontal size={10} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
              minWidth: 148, background: "var(--white-custom)",
              border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
              borderRadius: 8, boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
              padding: 3, overflow: "hidden",
            }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onEditLibro(libro); }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                  fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em",
                  color: "var(--text-on-card)", opacity: 0.65, cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.background = "transparent"; }}
              >
                <Pencil size={10} /> Editar
              </button>
              <div style={{ height: 1, background: "color-mix(in srgb, var(--primary) 10%, transparent)", margin: "2px 6px" }} />
              <button
                onClick={async e => {
                  e.stopPropagation(); setMenuOpen(false);
                  const ok = await confirm({ message: `¿Eliminar "${libro.titulo}" y todos sus capítulos?`, danger: true, confirmLabel: "Eliminar" });
                  if (ok) onDeleteLibro(libro.id);
                }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                  fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em",
                  color: "var(--accent)", opacity: 0.7, cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 size={10} /> Eliminar libro
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal />

      {expanded && (
        <div style={{
          marginLeft: 16, paddingLeft: 12,
          borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          marginTop: 4,
        }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--primary)", opacity: 0.2 }} />
            </div>
          ) : capitulos.length === 0 ? (
            <p style={{
              fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.12em",
              color: "var(--primary)", opacity: 0.2, padding: "8px 6px",
            }}>Sin capítulos</p>
          ) : capitulos.map(cap => (
            <CapituloItem
              key={cap.id}
              cap={cap}
              selected={selectedCapId === cap.id}
              onClick={() => onSelectCap(libro.id, cap.id)}
              onEdit={onEditCap}
              onDelete={id => onDeleteCap(id, libro.id)}
            />
          ))}
          <div style={{ paddingTop: 4, paddingBottom: 2 }}>
            <button
              onClick={() => onNuevoCap(libro.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 5, padding: "6px 0", borderRadius: 6,
                border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
                background: "transparent",
                fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: "var(--primary)", opacity: 0.3, cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s, border-color 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 30%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.3"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 15%, transparent)"; }}
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
  libro, selectedCapId, onSelectCap, onEditCap, onDeleteCap, onEditLibro, onDeleteLibro, onNuevoCap,
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
  const isSelected = capitulos.some(c => c.id === selectedCapId);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b shrink-0"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {libro.portada_url ? (
          <img src={libro.portada_url} alt="" className="w-4 h-4 rounded object-cover shrink-0 border border-primary/10" />
        ) : (
          <BookMarked size={9} className="text-primary/25 shrink-0" />
        )}
        <span className="flex-1 text-[8px] font-black uppercase italic tracking-tight text-primary/70 truncate leading-tight" title={libro.titulo}>
          {libro.titulo}
        </span>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(m => !m)}
            className="p-0.5 rounded text-primary/20 hover:text-primary transition-all"
          >
            <MoreHorizontal size={9} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
              minWidth: 130, background: "var(--white-custom)",
              border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
              borderRadius: 8, boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
              padding: 3, overflow: "hidden",
            }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onEditLibro(libro); }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 8px", borderRadius: 5, border: "none", background: "transparent",
                  fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em",
                  color: "var(--text-on-card)", opacity: 0.65, cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.background = "transparent"; }}
              >
                <Pencil size={9} /> Editar
              </button>
              <div style={{ height: 1, background: "color-mix(in srgb, var(--primary) 10%, transparent)", margin: "2px 5px" }} />
              <button
                onClick={async e => {
                  e.stopPropagation(); setMenuOpen(false);
                  const ok = await confirm({ message: `¿Eliminar "${libro.titulo}" y todos sus capítulos?`, danger: true, confirmLabel: "Eliminar" });
                  if (ok) onDeleteLibro(libro.id);
                }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 8px", borderRadius: 5, border: "none", background: "transparent",
                  fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em",
                  color: "var(--accent)", opacity: 0.7, cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 size={9} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal />

      <div className="flex-1 overflow-y-auto max-h-28 px-1 pt-1 pb-0.5 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 size={11} className="animate-spin text-primary/20" /></div>
        ) : capitulos.length === 0 ? (
          <p className="text-[8px] text-primary/20 font-black uppercase tracking-widest px-1 py-2 text-center">Sin caps</p>
        ) : capitulos.map(cap => (
          <CapituloItem
            key={cap.id}
            cap={cap}
            selected={selectedCapId === cap.id}
            onClick={() => onSelectCap(libro.id, cap.id)}
            onEdit={onEditCap}
            onDelete={id => onDeleteCap(id, libro.id)}
          />
        ))}
      </div>

      <div className="shrink-0 p-1 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        <button
          onClick={() => onNuevoCap(libro.id)}
          className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-primary/12 text-[8px] font-black uppercase tracking-widest text-primary/20 hover:text-primary/50 hover:border-primary/25 hover:bg-primary/3 transition-all"
        >
          <Plus size={8} /> Cap
        </button>
      </div>
    </div>
  );
};

// ─── LibroColumna (desktop horizontal scroll) ─────────────────────────────────

export const LibroColumna = ({
  libro, selectedCapId, onSelectCap, onEditCap, onDeleteCap, onEditLibro, onDeleteLibro, onNuevoCap,
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
  const [menuOpen, setMenuOpen]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();
  const isSelected = capitulos.some(c => c.id === selectedCapId);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      style={{
        flexShrink: 0, width: 220, display: "flex", flexDirection: "column",
        borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        overflow: "hidden",
        background: isSelected ? "color-mix(in srgb, var(--primary) 3%, var(--bg-main))" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          padding: "10px 10px 8px",
          borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}
        onMouseEnter={() => setHdrHovered(true)}
        onMouseLeave={() => setHdrHovered(false)}
      >
        {libro.portada_url ? (
          <img src={libro.portada_url} alt="" style={{ width: 22, height: 30, borderRadius: 3, objectFit: "cover", flexShrink: 0, border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }} />
        ) : (
          <div style={{
            width: 22, height: 30, borderRadius: 3, flexShrink: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          }}>
            <BookMarked size={10} style={{ color: "var(--primary)", opacity: 0.3 }} />
          </div>
        )}

        <span style={{
          flex: 1, fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
          fontStyle: "italic", textTransform: "uppercase" as const, letterSpacing: "0.06em",
          color: "var(--primary)", opacity: 0.8, lineHeight: 1.3, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
        }} title={libro.titulo}>
          {libro.titulo}
        </span>

        {libro.estado && (
          <span style={{
            fontSize: 7, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            textTransform: "uppercase" as const, letterSpacing: "0.08em",
            padding: "1px 5px", borderRadius: 3, border: "1px solid", flexShrink: 0,
            ...(libro.estado === "FINALIZADO"
              ? { borderColor: "color-mix(in srgb, var(--callout-success-border) 40%, transparent)", color: "var(--callout-success-title)", background: "color-mix(in srgb, var(--callout-success-border) 8%, transparent)" }
              : libro.estado === "EN PROCESO"
              ? { borderColor: "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)", color: "var(--callout-warning-title)", background: "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)" }
              : { borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 6%, transparent)", opacity: 0.5 }),
          }}>
            {libro.estado === "EN PROCESO" ? "WIP" : libro.estado === "FINALIZADO" ? "done" : "…"}
          </span>
        )}

        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(m => !m)}
            title="Opciones del libro"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 20, height: 20, borderRadius: 4, border: "none",
              background: menuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
              color: "var(--primary)",
              opacity: hdrHovered || menuOpen ? 0.6 : 0,
              cursor: "pointer", flexShrink: 0, transition: "opacity 0.1s, background 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = hdrHovered || menuOpen ? "0.6" : "0"; e.currentTarget.style.background = menuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent"; }}
          >
            <MoreHorizontal size={10} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
              minWidth: 140, background: "var(--white-custom)",
              border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
              borderRadius: 8, boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 12%, transparent)",
              padding: 3, overflow: "hidden",
            }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onEditLibro(libro); }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                  fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em",
                  color: "var(--text-on-card)", opacity: 0.65, cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.background = "transparent"; }}
              >
                <Pencil size={10} /> Editar
              </button>
              <div style={{ height: 1, background: "color-mix(in srgb, var(--primary) 10%, transparent)", margin: "2px 6px" }} />
              <button
                onClick={async e => {
                  e.stopPropagation(); setMenuOpen(false);
                  const ok = await confirm({ message: `¿Eliminar el libro "${libro.titulo}" y todos sus capítulos?`, danger: true, confirmLabel: "Eliminar" });
                  if (ok) onDeleteLibro(libro.id);
                }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 10px", borderRadius: 5, border: "none", background: "transparent",
                  fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em",
                  color: "var(--accent)", opacity: 0.7, cursor: "pointer", transition: "opacity 0.1s, background 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
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
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--primary)", opacity: 0.2 }} />
          </div>
        ) : capitulos.length === 0 ? (
          <p style={{
            fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--primary)", opacity: 0.2, textAlign: "center", padding: "12px 6px",
          }}>Sin capítulos</p>
        ) : capitulos.map(cap => (
          <CapituloItem
            key={cap.id}
            cap={cap}
            selected={selectedCapId === cap.id}
            onClick={() => onSelectCap(libro.id, cap.id)}
            onEdit={onEditCap}
            onDelete={id => onDeleteCap(id, libro.id)}
          />
        ))}
      </div>

      <div style={{ flexShrink: 0, padding: "6px", borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <button
          onClick={() => onNuevoCap(libro.id)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 5, padding: "6px 0", borderRadius: 6,
            border: "1px dashed color-mix(in srgb, var(--primary) 18%, transparent)",
            background: "transparent",
            fontSize: 8, fontFamily: "var(--font-mono, monospace)", fontWeight: 900,
            textTransform: "uppercase" as const, letterSpacing: "0.1em",
            color: "var(--primary)", opacity: 0.3, cursor: "pointer",
            transition: "opacity 0.1s, background 0.1s, border-color 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 35%, transparent)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "0.3"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 18%, transparent)"; }}
        >
          <Plus size={9} /> Nuevo cap
        </button>
      </div>
    </div>
  );
};

// ─── VisibilidadCapPicker ─────────────────────────────────────────────────────

export const VisibilidadCapPicker = ({
  capId, current, onChanged,
}: {
  capId: string;
  current: "publico" | "programado" | "oculto";
  onChanged: (v: "publico" | "programado" | "oculto") => void;
}) => {
  const [saving, setSaving] = useState(false);

  const handleChange = async (v: "publico" | "programado" | "oculto") => {
    if (v === current || saving) return;
    setSaving(true);
    try {
      await capUpdateMeta(capId, { visibilidad: v });
      onChanged(v);
    } catch {}
    setSaving(false);
  };

  return (
    <span className="flex items-center gap-1">
      {(["oculto", "programado", "publico"] as const).map(v => {
        const cfg = VISIBILIDAD_CONFIG[v];
        const Icon = cfg.icon;
        const active = current === v;
        return (
          <button
            key={v}
            onClick={() => handleChange(v)}
            title={cfg.label}
            disabled={saving}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wide transition-all disabled:opacity-40 ${
              active ? cfg.color : "border-primary/10 text-primary/25 hover:border-primary/25 hover:text-primary/50"
            }`}
          >
            <Icon size={8} />
            {active && <span>{cfg.label}</span>}
          </button>
        );
      })}
    </span>
  );
};

// ─── SelectorVisibilidad ──────────────────────────────────────────────────────

export const SelectorVisibilidad = ({
  value, onChange, fechaPublicacion, onFechaChange, label = "Visibilidad",
}: {
  value: "publico" | "programado" | "oculto";
  onChange: (v: "publico" | "programado" | "oculto") => void;
  fechaPublicacion?: string;
  onFechaChange?: (v: string) => void;
  label?: string;
}) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">
      {label}
    </label>
    <div className="flex gap-2">
      {(["oculto", "programado", "publico"] as const).map((v) => {
        const cfg = VISIBILIDAD_CONFIG[v];
        const Icon = cfg.icon;
        const active = value === v;
        return (
          <button
            key={v} type="button"
            onClick={() => onChange(v)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide border transition-all ${
              active ? cfg.color + " shadow-sm" : "border-primary/10 text-primary/30 hover:border-primary/25 hover:text-primary/60"
            }`}
          >
            <Icon size={11} /> {cfg.label}
          </button>
        );
      })}
    </div>
    {value === "programado" && (
      <div className="mt-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Fecha de publicación</label>
        <input
          type="date"
          value={fechaPublicacion || ""}
          onChange={e => onFechaChange?.(e.target.value)}
          className="mt-1 w-full bg-primary/5 border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-[11px] font-bold text-primary outline-none focus:border-primary/30 transition-colors"
        />
      </div>
    )}
  </div>
);

// ─── SelectorNarrador ─────────────────────────────────────────────────────────

export const SelectorNarrador = ({
  value, onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) => {
  const { personajes, loading } = usePersonajes();
  const items = personajes.map(p => ({
    id: p.id,
    label: p.nombre,
    imgUrl: (p as any).img_url ?? null,
  }));
  return (
    <ComboSelector
      mode="single"
      items={items}
      value={value}
      onChange={onChange}
      label="Narrador / Protagonista del capítulo"
      icon={<Mic2 size={10} />}
      placeholder="Sin narrador asignado"
      emptyText="Sin personajes"
      loading={loading}
      allowNone
      noneLabel="Ninguno"
    />
  );
};
// ─── SelectorReino ────────────────────────────────────────────────────────────

export const SelectorReino = ({
  value, onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { reinos, loading } = useReinos();
  const items = reinos.map(r => ({
    id: r.id,
    label: r.nombre,
  }));
  return (
    <ComboSelector
      mode="multi"
      items={items}
      value={value}
      onChange={onChange}
      label="Reinos / Ubicaciones"
      icon={<MapPin size={10} />}
      hint="(se desbloquean al terminar)"
      placeholder="Añadir reinos…"
      emptyText="Sin reinos"
      loading={loading}
    />
  );
};
// ─── SelectorPersonajesCapitulo ───────────────────────────────────────────────

export const SelectorPersonajesCapitulo = ({
  value, onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { personajes, loading } = usePersonajes();
  const items = personajes.map(p => ({
    id: p.id,
    label: p.nombre,
    imgUrl: (p as any).img_url ?? null,
  }));
  return (
    <ComboSelector
      mode="multi"
      items={items}
      value={value}
      onChange={onChange}
      label="Personajes que aparecen"
      icon={<UserCircle2 size={10} />}
      hint="(se desbloquean al terminar)"
      placeholder="Añadir personajes…"
      emptyText="Sin personajes"
      loading={loading}
    />
  );
};

// ─── NarradorPill ─────────────────────────────────────────────────────────────

export const NarradorPill = ({ narradorId }: { narradorId: string }) => {
  const { personajes } = usePersonajes();
  const p = personajes.find(x => x.id === narradorId);
  if (!p) return null;
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wide"
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

export function SelectorImagenPortada({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Portada</label>
      <div
        onClick={() => setOpen(true)}
        className="relative aspect-[2/3] w-28 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 cursor-pointer group"
      >
        {value ? (
          <>
            <img src={value} alt="portada" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              <BookMarked size={16} className="text-white" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Cambiar</span>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={9} className="text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/25 hover:text-primary/50 transition-colors">
            <BookMarked size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center px-1">Elegir portada</span>
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
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <BookMarked size={11} /> Portada del libro
              </h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onSelect={url => { onChange(url); setOpen(false); }}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── hooks internos de criaturas e items ─────────────────────────────────────

function useCriaturas() {
  const [criaturas, setCriaturas] = useState<{ id: string; nombre: string; imagen_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre").then(({ data }) => {
      setCriaturas((data ?? []) as any[]);
      setLoading(false);
    });
  }, []);
  return { criaturas, loading };
}

function useItems() {
  const [items, setItems] = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("items").select("id, nombre, imagen_url, categoria").order("nombre").then(({ data }) => {
      setItems((data ?? []) as any[]);
      setLoading(false);
    });
  }, []);
  return { items, loading };
}

function useLugares() {
  const [lugares, setLugares] = useState<{ id: string; nombre: string; imagen_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("lugares").select("id, nombre, imagen_url").order("nombre").then(({ data }) => {
      setLugares((data ?? []) as any[]);
      setLoading(false);
    });
  }, []);
  return { lugares, loading };
}

// ─── PanelPersonajesCapitulo (Personajes + Criaturas + Items en vertical) ─────

export const PanelPersonajesCapitulo = ({
  capId,
  value,
  onChange,
  criaturas_ids = [],
  onCriaturasChange,
  items_ids = [],
  onItemsChange,
}: {
  capId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  criaturas_ids?: string[];
  onCriaturasChange?: (ids: string[]) => void;
  items_ids?: string[];
  onItemsChange?: (ids: string[]) => void;
}) => {
  const { personajes, loading: loadingP } = usePersonajes();
  const { criaturas, loading: loadingC }  = useCriaturas();
  const { items,     loading: loadingI }  = useItems();

  const [savingP, setSavingP] = useState(false);
  const [savingC, setSavingC] = useState(false);
  const [savingI, setSavingI] = useState(false);

  // ── Posición en línea de tiempo ───────────────────────────────────────────
  const [ordenLinea,     setOrdenLinea]     = useState<string>("");
  const [savingOrden,    setSavingOrden]    = useState(false);
  const ordenInputRef = useRef<HTMLInputElement>(null);

  // ── Reinos del capítulo ───────────────────────────────────────────────────
  const { reinos, loading: loadingReinos } = useReinos();
  const [reinosIds,   setReinosIds]   = useState<string[]>([]);
  const [savingReino, setSavingReino] = useState(false);
  const reinoRef = useRef<HTMLDivElement>(null);

  // ── Lugares del capítulo ──────────────────────────────────────────────────
  const { lugares, loading: loadingLugares } = useLugares();
  const [lugaresIds,  setLugaresIds]  = useState<string[]>([]);
  const [savingLugar, setSavingLugar] = useState(false);

  // ── Visibilidad del capítulo ──────────────────────────────────────────────
  const [visibilidad,   setVisibilidad]   = useState<"publico" | "programado" | "oculto">("oculto");
  const [savingVis,     setSavingVis]     = useState(false);
  const [fechaProg,     setFechaProg]     = useState<string>("");
  const [savingFecha,   setSavingFecha]   = useState(false);

  useEffect(() => {
    if (!capId) return;
    supabase
      .from("capitulos")
      .select("orden_linea_tiempo, reinos_ids, visibilidad, fecha_publicacion, lugares_ids")
      .eq("id", capId)
      .single()
      .then(({ data }) => {
        setOrdenLinea(data?.orden_linea_tiempo != null ? String(data.orden_linea_tiempo) : "");
        setReinosIds(data?.reinos_ids ?? []);
        setLugaresIds(data?.lugares_ids ?? []);
        setVisibilidad(data?.visibilidad ?? "oculto");
        setFechaProg(data?.fecha_publicacion ? data.fecha_publicacion.slice(0, 10) : "");
      });
  }, [capId]);

  const handleToggleReino = async (id: string, add: boolean) => {
    const next = add ? [...reinosIds, id] : reinosIds.filter(x => x !== id);
    setReinosIds(next);
    setSavingReino(true);
    try { await capUpdateMeta(capId, { reinos_ids: next } as any); } catch {}
    setSavingReino(false);
  };

  const handleToggleLugar = async (id: string, add: boolean) => {
    const next = add ? [...lugaresIds, id] : lugaresIds.filter(x => x !== id);
    setLugaresIds(next);
    setSavingLugar(true);
    try { await capUpdateMeta(capId, { lugares_ids: next } as any); } catch {}
    setSavingLugar(false);
  };

  const handleSaveVisibilidad = async (v: "publico" | "programado" | "oculto") => {
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

  const handleSaveFechaProg = async () => {
    if (!fechaProg) return;
    setSavingFecha(true);
    try { await capUpdateMeta(capId, { fecha_publicacion: fechaProg }); } catch {}
    setSavingFecha(false);
  };

  const handleSaveOrden = async () => {
    const val = ordenLinea.trim();
    const num = val === "" ? null : parseInt(val, 10);
    if (val !== "" && isNaN(num as number)) return;
    setSavingOrden(true);
    try {
      await capUpdateMeta(capId, { orden_linea_tiempo: num } as any);
    } catch {}
    setSavingOrden(false);
  };

  const handleTogglePersonaje = async (id: string, add: boolean) => {
    const next = add ? [...value, id] : value.filter(x => x !== id);
    onChange(next);
    setSavingP(true);
    try { await capUpdateMeta(capId, { personajes_ids: next }); } catch {}
    setSavingP(false);
  };

  const handleToggleCriatura = async (id: string, add: boolean) => {
    const next = add ? [...criaturas_ids, id] : criaturas_ids.filter(x => x !== id);
    onCriaturasChange?.(next);
    setSavingC(true);
    try { await capUpdateMeta(capId, { criaturas_ids: next } as any); } catch {}
    setSavingC(false);
  };

  const handleToggleItem = async (id: string, add: boolean) => {
    const next = add ? [...items_ids, id] : items_ids.filter(x => x !== id);
    onItemsChange?.(next);
    setSavingI(true);
    try { await capUpdateMeta(capId, { items_ids: next } as any); } catch {}
    setSavingI(false);
  };

  const dispatchOpen = (tabla: string, id: string) => {
    window.dispatchEvent(new CustomEvent("garlia-open-entity", { detail: { tabla, id } }));
  };

  return (
    <div
      className="hidden lg:flex flex-col shrink-0 border-l overflow-y-auto"
      style={{
        width: "180px",
        borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      {/* ── Posición en línea de tiempo ─────────────────────────────────── */}
      <div
        className="shrink-0 px-3 py-2.5 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Clock size={8} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          <span
            className="text-[8px] font-black uppercase tracking-[0.2em]"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
          >
            Línea de tiempo
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={ordenInputRef}
            type="number"
            value={ordenLinea}
            onChange={e => setOrdenLinea(e.target.value)}
            onBlur={handleSaveOrden}
            onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
            placeholder="Nº"
            className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-[10px] font-black text-center outline-none transition-all"
            style={{
              background: ordenLinea ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
              borderColor: ordenLinea
                ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                : "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: ordenLinea ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          />
          {savingOrden && (
            <Loader2 size={9} className="animate-spin shrink-0"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
          )}
          {!savingOrden && ordenLinea && (
            <Check size={9} className="shrink-0"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          )}
        </div>
        <p
          className="mt-1 text-[7px] leading-tight"
          style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
        >
          Nº de posición en la línea de tiempo del mundo
        </p>
      </div>

      {/* ── Reinos ──────────────────────────────────────────────────────── */}
      <div
        ref={reinoRef}
        className="shrink-0 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <SeccionEntidad
          label="Reinos"
          icon={<MapPin size={9} />}
          fallbackIcon={<MapPin size={10} />}
          emptyLabel="Sin reinos"
          capId={capId}
          allEntities={reinos.map(r => ({ id: r.id, nombre: r.nombre, imagen_url: (r as any).imagen_reino ?? undefined }))}
          selectedIds={reinosIds}
          loading={loadingReinos}
          saving={savingReino}
          onToggle={handleToggleReino}
        />
      </div>

      {/* ── Lugares ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <SeccionEntidad
          label="Lugares"
          icon={<MapPin size={9} />}
          fallbackIcon={<MapPin size={10} />}
          emptyLabel="Sin lugares"
          capId={capId}
          allEntities={lugares.map(l => ({ id: l.id, nombre: l.nombre, imagen_url: l.imagen_url ?? undefined }))}
          selectedIds={lugaresIds}
          loading={loadingLugares}
          saving={savingLugar}
          onToggle={handleToggleLugar}
        />
      </div>

      {/* ── Visibilidad ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-3 py-2.5 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          {visibilidad === "publico"
            ? <Globe size={8} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
            : visibilidad === "programado"
              ? <Timer size={8} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
              : <Lock size={8} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          }
          <span
            className="text-[8px] font-black uppercase tracking-[0.2em] flex-1"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
          >
            Visibilidad
          </span>
          {savingVis && (
            <Loader2 size={8} className="animate-spin shrink-0"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
          )}
        </div>
        <div className="flex gap-1">
          {(["oculto", "programado", "publico"] as const).map(v => {
            const cfg = VISIBILIDAD_CONFIG[v];
            const Icon = cfg.icon;
            const active = visibilidad === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => handleSaveVisibilidad(v)}
                title={cfg.label}
                disabled={savingVis}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border transition-all disabled:opacity-40"
                style={active ? {
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)",
                  color: "var(--primary)",
                } : {
                  background: "transparent",
                  borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              >
                <Icon size={9} />
                <span className="text-[6px] font-black uppercase tracking-wide leading-none">
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
        {visibilidad === "programado" && (
          <div className="mt-2 flex items-center gap-1">
            <Calendar size={8} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }} />
            <input
              type="date"
              value={fechaProg}
              onChange={e => setFechaProg(e.target.value)}
              onBlur={handleSaveFechaProg}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="flex-1 min-w-0 rounded-lg border px-1.5 py-1 text-[8px] font-black outline-none transition-all"
              style={{
                background: fechaProg ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
                borderColor: fechaProg
                  ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: fechaProg ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            />
            {savingFecha && (
              <Loader2 size={8} className="animate-spin shrink-0"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            )}
          </div>
        )}
      </div>

      <SeccionEntidad
        label="Personajes"
        icon={<UserCircle2 size={9} />}
        fallbackIcon={<UserCircle2 size={10} />}
        emptyLabel="Sin personajes"
        capId={capId}
        allEntities={personajes}
        selectedIds={value}
        loading={loadingP}
        saving={savingP}
        onToggle={handleTogglePersonaje}
        onEntityClick={(id) => dispatchOpen("personajes", id)} 
      />

      {/* Divisor */}
      <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />

      <SeccionEntidad
        label="Criaturas"
        icon={<Cat size={9} />}
        fallbackIcon={<Cat size={10} />}
        emptyLabel="Sin criaturas"
        capId={capId}
        allEntities={criaturas}
        selectedIds={criaturas_ids}
        loading={loadingC}
        saving={savingC}
        onToggle={handleToggleCriatura}
        onEntityClick={(id) => dispatchOpen("criaturas", id)} 
      />

      {/* Divisor */}
      <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />

      <SeccionEntidad
        label="Ítems"
        icon={<Sword size={9} />}
        fallbackIcon={<Sword size={10} />}
        emptyLabel="Sin ítems"
        capId={capId}
        allEntities={items}
        selectedIds={items_ids}
        loading={loadingI}
        saving={savingI}
        onToggle={handleToggleItem}
        onEntityClick={(id) => dispatchOpen("items", id)} 
      />
    </div>
  );
};

// ─── DialogSnippets ───────────────────────────────────────────────────────────

type DialogSnippet = {
  label: string;
  title: string;
  insert: string | ((sel: string) => string);
};

const DIALOG_SNIPPETS: DialogSnippet[] = [
  { label: "—",        title: "Guión de diálogo",          insert: "— " },
  { label: "— … —",   title: "Acotación entre guiones",   insert: (sel) => `— ${sel || "…"} —` },
  { label: "«»",       title: "Comillas angulares",        insert: (sel) => `«${sel || "…"}»` },
  { label: "—diálogo", title: "Línea de diálogo completa", insert: (sel) => `— ${sel || ""}` },
  { label: "…",        title: "Puntos suspensivos",        insert: "…" },
  { label: "–",        title: "Guión corto (en-dash)",    insert: "–" },
];

function insertAtCursor(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  snippet: DialogSnippet,
) {
  const start = ta.selectionStart ?? 0;
  const end   = ta.selectionEnd ?? 0;
  const sel   = value.slice(start, end);
  const ins   = typeof snippet.insert === "function" ? snippet.insert(sel) : snippet.insert;
  const next  = value.slice(0, start) + ins + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + ins.length;
    ta.setSelectionRange(pos, pos);
  });
}

export const DialogSnippets = ({
  textareaRef, value, onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="shrink-0 flex items-center gap-1 px-4 sm:px-8 py-1.5 border-b border-primary/5 flex-wrap">
    <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 mr-1">Diálogo</span>
    {DIALOG_SNIPPETS.map((s) => (
      <button
        key={s.label}
        title={s.title}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          if (textareaRef.current) insertAtCursor(textareaRef.current, value, onChange, s);
        }}
        className="px-2.5 py-1 rounded-lg border border-primary/10 text-[11px] font-mono text-primary/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all select-none"
      >
        {s.label}
      </button>
    ))}
  </div>
);