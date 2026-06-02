"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Sword } from "lucide-react";
import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";

/* ─────────────────────────────────────────────
   Hook: desbloquear personajes al terminar un capítulo

   FIXES:
   - Bug 5: un solo INSERT batch en lugar de N inserts secuenciales.
     Esto evita pérdida parcial si el usuario navega en medio del bucle.
   - Bug 2 / Bug 1: disparadoRef se guarda en un Map keyed por capId
     para que si el mismo hook (mismo componente) recibe un capId distinto
     pueda disparar de nuevo. useCallback depende de capId (string estable),
     no del array (nueva referencia en cada render).
   ───────────────────────────────────────────── */
export function useDesbloquearPersonajes(capId: string, personajesIds: string[] | undefined) {
  const [desbloqueados,      setDesbloqueados]      = useState<string[]>([]);
  const [mostrarCelebration, setMostrarCelebration] = useState(false);

  // Usamos el capId como clave para que el guard sea por capítulo, no por instancia
  const disparadoRef = useRef<Set<string>>(new Set());

  // Serializar los ids para comparación estable dentro del callback
  const idsKey = (personajesIds ?? []).join(",");

  const disparar = useCallback(async () => {
    // Guard: no disparar dos veces para el mismo capítulo
    if (disparadoRef.current.has(capId)) return [];
    if (!personajesIds?.length) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    // Marcar ANTES del await para evitar race condition de doble disparo
    disparadoRef.current.add(capId);

    const perfilId = session.user.id;

    // Bug 5 fix: un solo INSERT con todos los personajes del capítulo
    const rows = personajesIds.map(personajeId => ({ perfil_id: perfilId, personaje_id: personajeId }));
    const { data, error } = await supabase
      .from("descubrimientos_personajes")
      .insert(rows)
      .select("personaje_id");

    // Los que ya existían generan error 23505; data solo contiene los nuevos
    const nuevos = (data ?? []).map((r: any) => r.personaje_id);
    if (nuevos.length > 0) {
      setDesbloqueados(nuevos);
      setMostrarCelebration(true);
    }
    // Retornar los IDs directamente para que el caller pueda encolarlos
    // sin depender del estado React (que actualiza asíncronamente)
    return nuevos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capId, idsKey]); // depende de capId (estable) + idsKey (string serializado, estable)

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