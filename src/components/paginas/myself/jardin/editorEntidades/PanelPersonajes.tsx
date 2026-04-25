"use client";

import React, { useState } from "react";
import { Users, ChevronDown, Loader2, UserCircle2, X, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./types";
import { FormularioPersonaje } from "./EditorPersonaje";

// ─── Overlay editor (sin cambios funcionales) ─────────────────────────────────
export function OverlayEditorPersonaje({ personaje, onSaved, onClose }: {
  personaje: Personaje; onSaved: (p: Personaje) => void; onClose: () => void;
}) {
  const [form,   setForm]   = useState<Personaje>(personaje);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre: form.nombre, img_url: form.img_url || null,
        img_cuerpo_url: form.img_cuerpo_url || null,
        sobre: form.sobre, reino: form.reino, especie: form.especie,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col" style={{ background: "var(--bg-main)" }}>
      <ConfirmModal />
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-primary/10"
        style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
        >
          <ChevronDown size={12} className="rotate-90" /> Volver
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center shrink-0">
            {form.img_url
              ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
              : <UserCircle2 size={12} className="text-primary/25" />}
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 truncate">{form.nombre}</span>
        </div>
      </div>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <FormularioPersonaje
          form={form} setForm={setForm} status={status}
          onSave={save} onDelete={async () => {}} compacto
        />
      </div>
    </div>
  );
}

// ─── PanelPersonajes — ahora como chip + drawer lateral compacto ──────────────
// Desktop: chip flotante en top-right del editor → drawer slide-in desde la derecha
// Mobile: igual que antes (pantalla completa)
export function PanelPersonajes({ personajes, loading, setPersonajes, titulo = "Personajes" }: {
  personajes: Personaje[];
  loading: boolean;
  setPersonajes: React.Dispatch<React.SetStateAction<Personaje[]>>;
  titulo?: string;
}) {
  const [editando,    setEditando]    = useState<Personaje | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  const handleSaved = (updated: Personaje) => {
    setPersonajes(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditando(updated);
  };

  const PersonajeRow = ({ p }: { p: Personaje }) => (
    <button
      onClick={() => setEditando(p)}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/6 border border-transparent hover:border-primary/10 transition-all rounded-xl"
    >
      <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {p.img_url
          ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
          : <UserCircle2 size={13} className="text-primary/20" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-primary/80 truncate">{p.nombre}</p>
        <p className="text-[9px] text-primary/35 truncate">
          {[p.especie, p.reino].filter(Boolean).join(" · ")}
        </p>
      </div>
      <ChevronRight size={10} className="text-primary/20 shrink-0" />
    </button>
  );

  return (
    <>
      {/* Overlay editor de personaje */}
      {editando && (
        <OverlayEditorPersonaje
          personaje={editando}
          onSaved={handleSaved}
          onClose={() => setEditando(null)}
        />
      )}

      {/* ── Chip trigger (desktop) ──────────────────────────────────────────── */}
      <button
        onClick={() => setDrawerOpen(o => !o)}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border"
        style={drawerOpen ? {
          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
          color: "var(--primary)",
          borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
        } : {
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          color: "color-mix(in srgb, var(--primary) 45%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <Users size={10} />
        <span className="hidden sm:inline">{titulo}</span>
        {!loading && personajes.length > 0 && (
          <span
            className="px-1 py-0.5 rounded-full text-[8px] font-black"
            style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          >
            {personajes.length}
          </span>
        )}
      </button>

      {/* ── Drawer slide-in ──────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop sutil */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDrawerOpen(false)}
            style={{ background: "color-mix(in srgb, var(--foreground) 20%, transparent)" }}
          />

          {/* Panel */}
          <div
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-64 max-w-[80vw] shadow-2xl"
            style={{
              background: "var(--bg-main)",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              animation: "slideInRight 150ms ease-out",
            }}
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              <div className="flex items-center gap-2">
                <Users size={11} className="text-primary/40" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">{titulo}</span>
                {!loading && personajes.length > 0 && (
                  <span className="text-[9px] font-black text-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full">
                    {personajes.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={16} className="animate-spin text-primary/20" />
                </div>
              ) : personajes.length === 0 ? (
                <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center italic py-12">
                  Sin personajes en este reino
                </p>
              ) : personajes.map(p => (
                <PersonajeRow key={p.id} p={p} />
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}