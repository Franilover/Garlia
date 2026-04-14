"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Sword } from "lucide-react";
import { MotionDiv } from '@/components/ui/Motion';
import { supabase } from "@/lib/api/client/supabase";
import { CapituloScrollItem } from "../type";

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDesbloquearPersonajes(capId: string, personajesIds: string[] | undefined) {
  const [desbloqueados, setDesbloqueados] = useState<string[]>([]);
  const [mostrarCelebration, setMostrarCelebration] = useState(false);
  const disparadoRef = useRef(false);

  const disparar = useCallback(async () => {
    if (disparadoRef.current) return;
    if (!personajesIds?.length) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    disparadoRef.current = true;
    const perfilId = session.user.id;
    const nuevos: string[] = [];

    for (const personajeId of personajesIds) {
      const { error } = await supabase
        .from("descubrimientos_personajes")
        .insert({ perfil_id: perfilId, personaje_id: personajeId })
        .select()
        .single();
      if (!error) nuevos.push(personajeId);
    }

    if (nuevos.length > 0) {
      setDesbloqueados(nuevos);
      setMostrarCelebration(true);
    }
  }, [personajesIds]);

  const cerrar = useCallback(() => setMostrarCelebration(false), []);

  return { disparar, mostrarCelebration, desbloqueados, cerrar };
}

// ─── Toast visual ────────────────────────────────────────────────────────────

export function PersonajesDesbloqueadosToast({ personajesIds, onClose }: {
  personajesIds: string[];
  onClose: () => void;
}) {
  const [personajes, setPersonajes] = useState<{ id: string; nombre: string; img_url?: string }[]>([]);

  useEffect(() => {
    if (!personajesIds.length) return;
    supabase.from("personajes").select("id, nombre, img_url").in("id", personajesIds)
      .then(({ data }) => { if (data) setPersonajes(data); });
  }, [personajesIds]);

  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!personajes.length) return null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] w-[calc(100vw-2rem)] max-w-sm"
    >
      <div className="rounded-[var(--radius-card)] border border-primary/15 shadow-2xl overflow-hidden" style={{ background: "var(--white-custom)" }}>
        <div className="px-5 py-3 flex items-center justify-between border-b border-primary/8" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary italic flex items-center gap-2">
            <Sword size={11} />
            {personajes.length === 1 ? "Personaje desbloqueado" : `${personajes.length} personajes desbloqueados`}
          </span>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={14} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {personajes.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-btn)] overflow-hidden border border-primary/10 shrink-0 bg-primary/5">
                {p.img_url
                  ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-primary/20 text-xs font-black">{p.nombre[0]}</div>
                }
              </div>
              <div>
                <p className="text-sm font-black uppercase italic text-primary tracking-tight">{p.nombre}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary/40">Añadido a tu wiki</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionDiv>
  );
}

// ─── Separador final ──────────────────────────────────────────────────────────

export function FinCapituloSeparador({ cap, onVisible }: {
  cap: CapituloScrollItem;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedRef.current) {
          firedRef.current = true;
          onVisible();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className="mt-20 flex items-center gap-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      <span className="text-primary/20 font-serif italic text-2xl select-none">✦</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
    </div>
  );
}
