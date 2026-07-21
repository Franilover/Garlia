/**
 * generar-token-llamada
 * ─────────────────────────────────────────────────────────────────────────
 * Recibe un `llamada_id` (fila de la tabla `llamadas`), valida que quien
 * llama esté autenticado y sea participante de la conversación asociada, y
 * devuelve un token de LiveKit para conectarse a la sala (`room_name` de esa
 * llamada). Solo habilita publicar audio por ahora (ver callEngine.ts).
 *
 * ── Por qué fallaba con CORS/503 ────────────────────────────────────────
 * Esta función NO estaba en el repo — se había deployado suelta y nunca se
 * subió a git, así que no había forma de saber qué tenía. El síntoma típico
 * de "CORS preflight did not succeed / 503" casi siempre es que la función
 * se cae al arrancar (import roto, variable de entorno faltante leída con
 * `!` o similar que tira excepción a nivel de módulo) — cuando el proceso
 * ni siquiera levanta, Deno/Supabase no llega a responder el OPTIONS con
 * headers CORS, y el browser lo reporta como fallo de preflight en vez de
 * mostrar el 503 real. Esta versión:
 *   1) responde el preflight OPTIONS explícitamente, antes que nada,
 *   2) nunca lee env vars con `!` a nivel de módulo (usa una función que
 *      tira un error controlado, siempre con headers CORS puestos),
 *   3) envuelve todo en try/catch y SIEMPRE devuelve los headers CORS,
 *      incluso en las respuestas de error.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.9.2?target=deno&no-check";

// ─── CORS ───────────────────────────────────────────────────────────────

// Si en el futuro esto necesita restringirse a un origen puntual, mejor
// hacerlo con una whitelist explícita que caer en un 503 opaco por un typo.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function envRequerida(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) {
    throw new Error(`Falta configurar la variable de entorno ${nombre} en la Edge Function.`);
  }
  return valor;
}

serve(async (req: Request) => {
  // El preflight se responde SIEMPRE antes de tocar env vars, DB o nada que
  // pueda tirar una excepción — así el OPTIONS nunca puede convertirse en
  // un 503 sin headers.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta el header Authorization." }, 401);
    }

    const SUPABASE_URL = envRequerida("SUPABASE_URL");
    const SUPABASE_ANON_KEY = envRequerida("SUPABASE_ANON_KEY");
    const LIVEKIT_API_KEY = envRequerida("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = envRequerida("LIVEKIT_API_SECRET");
    const LIVEKIT_URL = envRequerida("LIVEKIT_URL"); // wss://tu-proyecto.livekit.cloud

    // Cliente "as user": respeta RLS, así el usuario solo puede leer llamadas
    // de conversaciones donde participa.
    const supabaseUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: errUser,
    } = await supabaseUsuario.auth.getUser();
    if (errUser || !user) {
      return jsonResponse({ error: "No autenticado." }, 401);
    }

    let body: { llamada_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body inválido, se esperaba JSON." }, 400);
    }

    const llamadaId = body.llamada_id;
    if (!llamadaId) {
      return jsonResponse({ error: "Falta llamada_id." }, 400);
    }

    // Trae la llamada + la conversación asociada. Si RLS no deja verla, o no
    // existe, esto devuelve null y ahí cortamos — no hace falta un query
    // aparte para chequear participación: si el usuario no es participante,
    // la política RLS de `llamadas`/`conversacion_participantes` ya la
    // filtra.
    const { data: llamada, error: errLlamada } = await supabaseUsuario
      .from("llamadas")
      .select("id, room_name, estado, conversacion_id")
      .eq("id", llamadaId)
      .maybeSingle();

    if (errLlamada || !llamada) {
      return jsonResponse(
        { error: "Llamada no encontrada o no tenés acceso." },
        404,
      );
    }

    const { data: participante } = await supabaseUsuario
      .from("conversacion_participantes")
      .select("perfil_id")
      .eq("conversacion_id", llamada.conversacion_id)
      .eq("perfil_id", user.id)
      .maybeSingle();

    if (!participante) {
      return jsonResponse(
        { error: "No sos participante de esta conversación." },
        403,
      );
    }

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: user.id,
      ttl: "10m",
    });
    token.addGrant({
      room: llamada.room_name,
      roomJoin: true,
      canPublish: true,
      canPublishSources: ["microphone"],
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return jsonResponse(
      { token: jwt, url: LIVEKIT_URL, roomName: llamada.room_name },
      200,
    );
  } catch (error) {
    console.error("generar-token-llamada:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Error interno." },
      500,
    );
  }
});
