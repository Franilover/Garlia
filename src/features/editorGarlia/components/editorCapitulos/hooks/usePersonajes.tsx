"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Sword } from "lucide-react";
import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";

/* ─────────────────────────────────────────────
   Guard global: persiste aunque el componente se desmonte/remonte.
   Evita doble disparo en StrictMode, remounts y scroll rápido.
   ───────────────────────────────────────────── */
const _personajesDisparados = new Set<string>();

export function useDesbloquearPersonajes(capId: string, personajesIds: string[] | undefined) {
  const [desbloqueados,      setDesbloqueados]      = useState<string[]>([]);
  const [mostrarCelebration, setMostrarCelebration] = useState(false);

  // Ref local como segunda barrera (race condition dentro de la misma instancia)
  const disparandoRef = useRef(false);
  const idsKey = (personajesIds ?? []).join(",");

  const disparar = useCallback(async () => {
    // Guard global: sobrevive desmounts/remounts y StrictMode
    if (_personajesDisparados.has(capId)) return [];
    if (!personajesIds?.length) return [];
    // Guard local: bloquea si ya hay un await en vuelo en esta instancia
    if (disparandoRef.current) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    // Marcar en AMBOS guards antes del INSERT
    _personajesDisparados.add(capId);
    disparandoRef.current = true;

    try {
      const perfilId = session.user.id;

      // 1. Filtrar los que ya existen para saber cuáles son NUEVOS de verdad.
      const { data: existentes } = await supabase
        .from("descubrimientos_personajes")
        .select("personaje_id")
        .eq("perfil_id", perfilId)
        .in("personaje_id", personajesIds);

      const yaDesbloquedos = new Set((existentes ?? []).map((r: any) => r.personaje_id));
      const nuevosIds = personajesIds.filter(id => !yaDesbloquedos.has(id));

      // 2. Insertar solo los realmente nuevos (evita el 409).
      if (nuevosIds.length === 0) return [];

      const rows = nuevosIds.map(personajeId => ({ perfil_id: perfilId, personaje_id: personajeId }));
      const { data, error } = await supabase
        .from("descubrimientos_personajes")
        .insert(rows)
        .select("personaje_id");

      // Un error aquí es genuino (no un 409 esperado), lo propagamos.
      if (error) throw error;

      const nuevos = (data ?? []).map((r: any) => r.personaje_id);
      if (nuevos.length > 0) {
        setDesbloqueados(nuevos);
        setMostrarCelebration(true);
      }
      return nuevos;
    } catch (err) {
      // Solo quitar del guard si fue un error de red/DB real, para permitir reintento.
      _personajesDisparados.delete(capId);
      console.error("[useDesbloquearPersonajes]", err);
      return [];
    } finally {
      disparandoRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capId, idsKey]);

  const cerrar = useCallback(() => setMostrarCelebration(false), []);

  return { disparar, mostrarCelebration, desbloqueados, cerrar };
}

/* ─────────────────────────────────────────────
   Toast de personajes desbloqueados

   FIXES:
   - Bug 6: onClose se envuelve en ref interna para que el setTimeout
     no se recree si el padre pasa una nueva referencia de onClose.
   ───────────────────────────────────────────── */
export function PersonajesDesbloqueadosToast({ personajesIds, onClose }: {
  personajesIds: string[];
  onClose: () => void;
}) {
  const [personajes, setPersonajes] = useState<{ id: string; nombre: string; img_url?: string }[]>([]);

  // Bug 6 fix: ref estable para evitar recrear el timer
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!personajesIds.length) return;
    supabase
      .from("personajes")
      .select("id, nombre, img_url")
      .in("id", personajesIds)
      .then(({ data }) => { if (data) setPersonajes(data); });
  }, [personajesIds.join(",")]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 6000);
    return () => clearTimeout(t);
  }, []); // sin dependencias: el timer se crea una sola vez

  if (!personajes.length) return null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] w-[calc(100vw-2rem)] max-w-sm"
    >
      <div className="rounded-[var(--radius-card)] border border-primary/15 shadow-2xl overflow-hidden" style={{ background: "var(--white-custom)" }}>
        <div className="px-5 py-3 flex items-center justify-between border-b border-primary/8" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary italic flex items-center gap-2">
            <Sword size={11} />
            {personajes.length === 1 ? "Personaje desbloqueado" : `${personajes.length} personajes desbloqueados`}
          </span>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors">
            <X size={14} />
          </button>
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
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary/40">Añadido a tu agenda</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionDiv>
  );
}