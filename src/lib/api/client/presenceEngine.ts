/**
 * presenceEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Estado "en línea" y "escribiendo…", al estilo WhatsApp. Todo vive en
 * Supabase Realtime (Presence + Broadcast), sin tablas nuevas:
 *
 *   - "En línea": un único canal global (`presencia:global`) donde cada
 *     usuario logueado hace `track()` mientras tiene la app abierta. El
 *     estado de presencia de Realtime ya resuelve la desconexión sola
 *     (cuando se cierra la pestaña / se cae la conexión, Supabase lo saca
 *     del `presenceState()` automáticamente).
 *
 *   - "Escribiendo…": un broadcast efímero por conversación, sobre el mismo
 *     canal `mensajes:<conversacion_id>` que ya usa chatEngine para las
 *     inserciones. No se persiste en ningún lado — si el que lee no está
 *     conectado en ese momento, simplemente no lo ve, e igual que en
 *     WhatsApp el indicador tiene un timeout corto por si el evento de
 *     "paró de escribir" se pierde (typing se apaga solo a los 4s).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/api/client/supabase";

// ─── Presencia global ("en línea") ─────────────────────────────────────────

let canalPresenciaGlobal: RealtimeChannel | null = null;

/**
 * Se conecta al canal de presencia global y empieza a trackear al usuario
 * actual como "en línea". Se debe llamar una sola vez (desde un componente
 * montado siempre, como el layout raíz) y se limpia con la función que
 * devuelve. Si se llama más de una vez, reutiliza el mismo canal.
 */
export function conectarPresencia(perfilId: string): () => void {
  if (!canalPresenciaGlobal) {
    canalPresenciaGlobal = supabase.channel("presencia:global", {
      config: { presence: { key: perfilId } },
    });
    canalPresenciaGlobal.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await canalPresenciaGlobal?.track({ online_at: new Date().toISOString() });
      }
    });
  }

  return () => {
    if (canalPresenciaGlobal) {
      supabase.removeChannel(canalPresenciaGlobal);
      canalPresenciaGlobal = null;
    }
  };
}

/**
 * Suscribe un callback a cambios en quién está en línea. Devuelve una
 * función de limpieza. Requiere que `conectarPresencia` ya se haya llamado
 * (si no, el set siempre viene vacío).
 */
export function suscribirseAPresencia(onCambio: (idsEnLinea: Set<string>) => void): () => void {
  if (!canalPresenciaGlobal) {
    onCambio(new Set());
    return () => {};
  }

  const leerEstado = () => {
    const estado = canalPresenciaGlobal?.presenceState() ?? {};
    onCambio(new Set(Object.keys(estado)));
  };

  canalPresenciaGlobal.on("presence", { event: "sync" }, leerEstado);
  canalPresenciaGlobal.on("presence", { event: "join" }, leerEstado);
  canalPresenciaGlobal.on("presence", { event: "leave" }, leerEstado);

  // Estado inicial, por si ya había datos al momento de suscribirse.
  leerEstado();

  return () => {
    canalPresenciaGlobal?.off("presence", { event: "sync" } as any);
    canalPresenciaGlobal?.off("presence", { event: "join" } as any);
    canalPresenciaGlobal?.off("presence", { event: "leave" } as any);
  };
}

// ─── "Escribiendo…" por conversación ───────────────────────────────────────

interface SenalEscribiendo {
  perfilId: string;
  escribiendo: boolean;
}

/**
 * Se suscribe a los eventos de "escribiendo" de una conversación puntual.
 * Usa el mismo canal `mensajes:<conversacionId>` que chatEngine, así no
 * duplicamos conexiones — Supabase permite tener varios listeners (postgres
 * changes + broadcast) sobre el mismo canal.
 */
export function suscribirseAEscribiendo(
  conversacionId: string,
  onCambio: (senal: SenalEscribiendo) => void,
): RealtimeChannel {
  const canal = supabase.channel(`mensajes:${conversacionId}`);
  canal
    .on("broadcast", { event: "escribiendo" }, (payload) => {
      onCambio(payload.payload as SenalEscribiendo);
    })
    .subscribe();
  return canal;
}

/** Avisa a la conversación que el usuario actual está (o dejó de estar) escribiendo. */
export async function emitirEscribiendo(
  conversacionId: string,
  perfilId: string,
  escribiendo: boolean,
): Promise<void> {
  const canal = supabase.channel(`mensajes:${conversacionId}`);
  await new Promise<void>((resolve) => {
    canal.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await canal.send({
    type: "broadcast",
    event: "escribiendo",
    payload: { perfilId, escribiendo } as SenalEscribiendo,
  });
  await supabase.removeChannel(canal);
}
