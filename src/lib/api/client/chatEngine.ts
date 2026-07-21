/**
 * chatEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lógica de mensajería: conversaciones, mensajes, adjuntos y suscripciones
 * en tiempo real. No usa caché offline (Dexie) a propósito — los mensajes
 * necesitan estar siempre al día, así que van directo contra Supabase +
 * Realtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/api/client/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface PerfilResumen {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  contenido: string | null;
  adjunto_url: string | null;
  adjunto_tipo: "imagen" | "audio" | "archivo" | null;
  created_at: string;
  editado: boolean;
  eliminado: boolean;
}

export interface ConversacionResumen {
  id: string;
  es_grupo: boolean;
  nombre: string | null;
  ultimo_mensaje_at: string;
  otroParticipante: PerfilResumen | null; // solo relevante si !es_grupo
  ultimoMensaje: string | null;
  noLeidos: number;
}

// ─── Conversaciones ───────────────────────────────────────────────────────────

/**
 * Trae o crea una conversación 1 a 1 entre el usuario actual y `otroPerfilId`.
 * Evita duplicar conversaciones si ya existe una entre ambos.
 */
export async function obtenerOCrearConversacion1a1(
  otroPerfilId: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");
  if (user.id === otroPerfilId) {
    throw new Error("No podés iniciar una conversación con vos mismo.");
  }

  // Buscar conversaciones 1 a 1 donde participo, y ver si el otro también está.
  const { data: misConvs } = await supabase
    .from("conversacion_participantes")
    .select("conversacion_id, conversaciones!inner(es_grupo)")
    .eq("perfil_id", user.id)
    .eq("conversaciones.es_grupo", false);

  if (misConvs && misConvs.length > 0) {
    const ids = misConvs.map((c: any) => c.conversacion_id);
    const { data: coincidencia } = await supabase
      .from("conversacion_participantes")
      .select("conversacion_id")
      .in("conversacion_id", ids)
      .eq("perfil_id", otroPerfilId)
      .limit(1)
      .maybeSingle();

    if (coincidencia) return coincidencia.conversacion_id;
  }

  // No existe: crear conversación nueva + agregar ambos participantes.
  const { data: nuevaConv, error: errConv } = await supabase
    .from("conversaciones")
    .insert({ es_grupo: false, creado_por: user.id })
    .select("id")
    .single();
  if (errConv || !nuevaConv) throw errConv ?? new Error("No se pudo crear la conversación.");

  const { error: errPart } = await supabase.from("conversacion_participantes").insert([
    { conversacion_id: nuevaConv.id, perfil_id: user.id },
    { conversacion_id: nuevaConv.id, perfil_id: otroPerfilId },
  ]);
  if (errPart) throw errPart;

  return nuevaConv.id;
}

/**
 * Lista las conversaciones del usuario actual, ordenadas por actividad
 * reciente, con datos resumidos para pintar la lista (nombre del otro
 * participante, último mensaje, no leídos).
 */
export async function listarConversaciones(): Promise<ConversacionResumen[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: misParticipaciones } = await supabase
    .from("conversacion_participantes")
    .select(
      "conversacion_id, ultimo_leido_at, conversaciones!inner(id, es_grupo, nombre, ultimo_mensaje_at)",
    )
    .eq("perfil_id", user.id)
    .order("conversaciones(ultimo_mensaje_at)", { ascending: false });

  if (!misParticipaciones || misParticipaciones.length === 0) return [];

  const convIds = misParticipaciones.map((p: any) => p.conversacion_id);

  // Traer al "otro" participante de cada conversación 1 a 1, en un solo query.
  const { data: otrosParticipantes } = await supabase
    .from("conversacion_participantes")
    .select("conversacion_id, perfil_id, perfiles!inner(id, username, avatar_url)")
    .in("conversacion_id", convIds)
    .neq("perfil_id", user.id);

  const otroPorConv = new Map<string, PerfilResumen>();
  (otrosParticipantes ?? []).forEach((p: any) => {
    otroPorConv.set(p.conversacion_id, {
      id: p.perfiles.id,
      username: p.perfiles.username,
      avatar_url: p.perfiles.avatar_url,
    });
  });

  // Último mensaje + conteo de no leídos por conversación.
  const { data: ultimosMensajes } = await supabase
    .from("mensajes")
    .select("conversacion_id, contenido, created_at, remitente_id")
    .in("conversacion_id", convIds)
    .order("created_at", { ascending: false });

  const ultimoPorConv = new Map<string, { contenido: string | null; created_at: string }>();
  const noLeidosPorConv = new Map<string, number>();

  const leidoPorConv = new Map<string, string>();
  misParticipaciones.forEach((p: any) => leidoPorConv.set(p.conversacion_id, p.ultimo_leido_at));

  (ultimosMensajes ?? []).forEach((m: any) => {
    if (!ultimoPorConv.has(m.conversacion_id)) {
      ultimoPorConv.set(m.conversacion_id, { contenido: m.contenido, created_at: m.created_at });
    }
    const leido = leidoPorConv.get(m.conversacion_id);
    if (
      m.remitente_id !== user.id &&
      (!leido || new Date(m.created_at) > new Date(leido))
    ) {
      noLeidosPorConv.set(m.conversacion_id, (noLeidosPorConv.get(m.conversacion_id) ?? 0) + 1);
    }
  });

  return misParticipaciones
    .map((p: any) => {
      const conv = p.conversaciones;
      return {
        id: conv.id,
        es_grupo: conv.es_grupo,
        nombre: conv.nombre,
        ultimo_mensaje_at: conv.ultimo_mensaje_at,
        otroParticipante: otroPorConv.get(conv.id) ?? null,
        ultimoMensaje: ultimoPorConv.get(conv.id)?.contenido ?? null,
        noLeidos: noLeidosPorConv.get(conv.id) ?? 0,
      } as ConversacionResumen;
    })
    .sort(
      (a, b) => new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime(),
    );
}

// ─── Mensajes ───────────────────────────────────────────────────────────────

export async function cargarMensajes(conversacionId: string): Promise<Mensaje[]> {
  const { data, error } = await supabase
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Mensaje[];
}

export async function enviarMensaje(
  conversacionId: string,
  contenido: string,
  adjunto?: { url: string; tipo: "imagen" | "audio" | "archivo" },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");
  if (!contenido.trim() && !adjunto) return;

  const { error } = await supabase.from("mensajes").insert({
    conversacion_id: conversacionId,
    remitente_id: user.id,
    contenido: contenido.trim() || null,
    adjunto_url: adjunto?.url ?? null,
    adjunto_tipo: adjunto?.tipo ?? null,
  });
  if (error) throw error;
}

export async function marcarComoLeido(conversacionId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("conversacion_participantes")
    .update({ ultimo_leido_at: new Date().toISOString() })
    .eq("conversacion_id", conversacionId)
    .eq("perfil_id", user.id);
}

/** Suscripción en vivo a mensajes nuevos de una conversación. */
export function suscribirseAMensajes(
  conversacionId: string,
  onNuevoMensaje: (mensaje: Mensaje) => void,
): RealtimeChannel {
  return supabase
    .channel(`mensajes:${conversacionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mensajes",
        filter: `conversacion_id=eq.${conversacionId}`,
      },
      (payload) => onNuevoMensaje(payload.new as Mensaje),
    )
    .subscribe();
}

/** Suscripción en vivo a nuevas conversaciones/actividad, para la lista general. */
export function suscribirseAConversaciones(
  perfilId: string,
  onCambio: () => void,
): RealtimeChannel {
  return supabase
    .channel(`conversaciones:${perfilId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mensajes" },
      () => onCambio(),
    )
    .subscribe();
}

// ─── Adjuntos ───────────────────────────────────────────────────────────────

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const TIPOS_AUDIO = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB, igual al límite del bucket

export async function subirAdjunto(
  conversacionId: string,
  file: File,
): Promise<{ url: string; tipo: "imagen" | "audio" | "archivo" }> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("El archivo supera el límite de 25MB.");
  }

  const tipo: "imagen" | "audio" | "archivo" = TIPOS_IMAGEN.includes(file.type)
    ? "imagen"
    : TIPOS_AUDIO.includes(file.type)
      ? "audio"
      : "archivo";

  const extension = file.name.split(".").pop() ?? "bin";
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
  const path = `${conversacionId}/${nombreArchivo}`;

  const { error } = await supabase.storage.from("mensajes-adjuntos").upload(path, file);
  if (error) throw error;

  // Bucket privado: generamos una URL firmada de larga duración (7 días).
  const { data, error: errUrl } = await supabase.storage
    .from("mensajes-adjuntos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (errUrl || !data) throw errUrl ?? new Error("No se pudo generar la URL del adjunto.");

  return { url: data.signedUrl, tipo };
}

// ─── Bloqueos ───────────────────────────────────────────────────────────────

export async function bloquearUsuario(perfilId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("bloqueos").insert({ bloqueador_id: user.id, bloqueado_id: perfilId });
}

export async function desbloquearUsuario(perfilId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("bloqueos")
    .delete()
    .eq("bloqueador_id", user.id)
    .eq("bloqueado_id", perfilId);
}

export async function estaBloqueado(perfilId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("bloqueos")
    .select("bloqueador_id")
    .eq("bloqueador_id", user.id)
    .eq("bloqueado_id", perfilId)
    .maybeSingle();
  return !!data;
}

// ─── Búsqueda de usuarios (para iniciar conversación) ────────────────────────

export async function buscarPerfiles(query: string): Promise<PerfilResumen[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("perfiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${query.trim()}%`)
    .limit(10);
  return (data ?? []) as PerfilResumen[];
}
