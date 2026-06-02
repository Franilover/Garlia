"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, MapPin } from "lucide-react";
import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";

/* ─────────────────────────────────────────────
   Hook: desbloquear reinos al terminar un capítulo

   FIXES aplicados (idénticos a usePersonajes):
   - Bug 5: INSERT batch en lugar de bucle secuencial
   - Bug 1: useCallback depende de capId + idsKey (strings estables)
   - Bug 2: disparadoRef es un Set keyed por capId
   - Bug 6: onClose en toast usa ref interna, timer se crea una sola vez
   ───────────────────────────────────────────── */
export function useDesbloquearReinos(capId: string, reinosIds: string[] | undefined) {
  const [desbloqueados,      setDesbloqueados]      = useState<string[]>([]);
  const [mostrarCelebration, setMostrarCelebration] = useState(false);

  const disparadoRef = useRef<Set<string>>(new Set());
  const idsKey = (reinosIds ?? []).join(",");

  const disparar = useCallback(async () => {
    if (disparadoRef.current.has(capId)) return [];
    if (!reinosIds?.length) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    disparadoRef.current.add(capId);

    const perfilId = session.user.id;
    const rows = reinosIds.map(reinoId => ({ perfil_id: perfilId, reino_id: reinoId }));
    const { data } = await supabase
      .from("descubrimientos_reinos")
      .insert(rows)
      .select("reino_id");

    const nuevos = (data ?? []).map((r: any) => r.reino_id);
    if (nuevos.length > 0) {
      setDesbloqueados(nuevos);
      setMostrarCelebration(true);
    }
    return nuevos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capId, idsKey]);

  const cerrar = useCallback(() => setMostrarCelebration(false), []);

  return { disparar, mostrarCelebration, desbloqueados, cerrar };
}

/* ─────────────────────────────────────────────
   Toast de reinos desbloqueados
   ───────────────────────────────────────────── */
export function ReinosDesbloqueadosToast({
  reinosIds,
  onClose,
}: {
  reinosIds: string[];
  onClose: () => void;
}) {
  const [reinos, setReinos] = useState<{ id: string; nombre: string; imagen_reino?: string | null }[]>([]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!reinosIds.length) return;
    supabase
      .from("reinos")
      .select("id, nombre, imagen_reino")
      .in("id", reinosIds)
      .then(({ data }) => { if (data) setReinos(data); });
  }, [reinosIds.join(",")]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!reinos.length) return null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] w-[calc(100vw-2rem)] max-w-sm"
    >
      <div
        className="rounded-[var(--radius-card)] border border-primary/15 shadow-2xl overflow-hidden"
        style={{ background: "var(--white-custom)" }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between border-b border-primary/8"
          style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary italic flex items-center gap-2">
            <MapPin size={11} />
            {reinos.length === 1 ? "Reino descubierto" : `${reinos.length} reinos descubiertos`}
          </span>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {reinos.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-btn)] overflow-hidden border border-primary/10 shrink-0 bg-primary/5">
                {r.imagen_reino
                  ? <img src={r.imagen_reino} alt={r.nombre} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-primary/20 text-xs font-black">{r.nombre[0]}</div>
                }
              </div>
              <div>
                <p className="text-sm font-black uppercase italic text-primary tracking-tight">{r.nombre}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary/40">Añadido a tu mapa</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionDiv>
  );
}