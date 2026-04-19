"use client";

import React, { useState } from "react";
import { Users, ChevronDown, Loader2, UserCircle2, X } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./types";
import { useUniqueValues } from "./hooks";
import { BarraAcciones, SelectorImagen } from "./UIComponents";
import { FormularioPersonaje } from "./EditorPersonaje";
import { Maximize2 } from "lucide-react";

// ─── OverlayEditorPersonaje ───────────────────────────────────────────────────

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
          form={form}
          setForm={setForm}
          status={status}
          onSave={save}
          onDelete={async () => {}}
          compacto
        />
      </div>
    </div>
  );
}

// ─── PanelPersonajes ──────────────────────────────────────────────────────────

export function PanelPersonajes({ personajes, loading, setPersonajes, titulo = "Personajes" }: {
  personajes: Personaje[];
  loading: boolean;
  setPersonajes: React.Dispatch<React.SetStateAction<Personaje[]>>;
  titulo?: string;
}) {
  const [editando,     setEditando]     = useState<Personaje | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const handleSaved = (updated: Personaje) => {
    setPersonajes(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditando(updated);
  };

  const ListaPersonajes = ({ mobile }: { mobile: boolean }) => (
    <>
      {loading ? (
        <div className={`flex items-center justify-center ${mobile ? "py-16" : "py-8"}`}>
          <Loader2 size={mobile ? 24 : 16} className="animate-spin text-primary/20" />
        </div>
      ) : personajes.length === 0 ? (
        <p className={`font-bold text-primary/20 uppercase tracking-widest text-center italic ${mobile ? "text-xs py-16" : "text-[9px] py-8"}`}>
          Sin personajes
        </p>
      ) : personajes.map(p => (
        <button key={p.id} onClick={() => setEditando(p)}
          className={`w-full flex items-center text-left hover:bg-primary/8 border border-transparent hover:border-primary/10 transition-all rounded-xl ${mobile ? "gap-3 px-3 py-3" : "gap-2 px-2 py-2"}`}>
          <div className={`shrink-0 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center ${mobile ? "w-10 h-10" : "w-7 h-7"}`}>
            {p.img_url
              ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
              : <UserCircle2 size={mobile ? 16 : 13} className="text-primary/20" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-primary/80 truncate ${mobile ? "text-sm" : "text-[11px]"}`}>{p.nombre}</p>
            <p className={`text-primary/35 truncate ${mobile ? "text-xs" : "text-[9px]"}`}>
              {[p.especie, p.reino].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ChevronDown size={mobile ? 15 : 12} className="-rotate-90 text-primary/20 shrink-0" />
        </button>
      ))}
    </>
  );

  return (
    <>
      {editando && (
        <OverlayEditorPersonaje
          personaje={editando}
          onSaved={handleSaved}
          onClose={() => setEditando(null)}
        />
      )}

      {/* Botón móvil */}
      <button
        onClick={() => setPanelAbierto(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-xl border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary transition-all"
        style={{ background: "color-mix(in srgb, var(--white-custom) 95%, transparent)", backdropFilter: "blur(10px)" }}
      >
        <Users size={13} />
        {titulo}
        {!loading && personajes.length > 0 && (
          <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded-full text-[9px]">{personajes.length}</span>
        )}
      </button>

      {/* Overlay lista móvil */}
      {panelAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg-main)" }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-primary/10"
            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
            <div className="flex items-center gap-2">
              <Users size={13} className="text-primary/50" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{titulo}</span>
              {!loading && personajes.length > 0 && (
                <span className="text-[9px] font-black text-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full">{personajes.length}</span>
              )}
            </div>
            <button onClick={() => setPanelAbierto(false)} className="text-primary/30 hover:text-primary transition-colors p-1">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <ListaPersonajes mobile={true} />
          </div>
        </div>
      )}

      {/* Panel desktop lateral */}
      <div className="hidden md:flex w-52 shrink-0 border-l border-primary/10 flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 px-3 py-2.5 border-b border-primary/8 flex items-center gap-2"
          style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
          <Users size={11} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{titulo}</span>
          {!loading && personajes.length > 0 && (
            <span className="ml-auto text-[9px] font-black text-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full">{personajes.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
          <ListaPersonajes mobile={false} />
        </div>
      </div>
    </>
  );
}
