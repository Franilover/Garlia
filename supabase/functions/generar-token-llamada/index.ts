/**
 * generar-token-llamada
 * ─────────────────────────────────────────────────────────────────────────
 * Recibe un `llamada_id` (fila de la tabla `llamadas`), valida que quien
 * llama esté autenticado y sea participante de la conversación asociada, y
 * devuelve un token de LiveKit para conectarse a la sala (`room_name` de esa
 * llamada). Solo habilita publicar audio por ahora (ver callEngine.ts).
 *
 * ── Por qué seguía dando 503 en el OPTIONS ──────────────────────────────
 * La versión anterior importaba `livekit-server-sdk` desde esm.sh. Esa
 * librería tiene dependencias (`camelcase-keys`, `@bufbuild/protobuf`) con
 * problemas conocidos de interop CJS/ESM que esm.sh no siempre resuelve
 * bien para el runtime de Deno — cuando el import de nivel superior falla,
 * el worker de la Edge Function ni siquiera termina de arrancar, así que
 * NINGÚN request llega a ejecutarse (ni el OPTIONS del preflight), y
 * Supabase devuelve 503 sin headers CORS.
 *
 * Un token de LiveKit es, en el fondo, un JWT HS256 firmado con el API
 * secret con un claim `video` (grant). Acá lo generamos a mano con `djwt`
 * (Deno puro, sin dependencias npm), evitando el import problemático.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// ─── CORS ───────────────────────────────────────────────────────────────

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

interface GrantLiveKit {
  room: string;
  roomJoin: boolean;
  canPublish: boolean;
  canPublishSources: string[];
  canSubscribe: boolean;
}

async function generarTokenLiveKit(
  apiKey: string,
  apiSecret: string,
  identity: string,
  grant: GrantLiveKit,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = {
    iss: apiKey,
    sub: identity,
    nbf: getNumericDate(0),
    exp: getNumericDate(60 * 10), // 10 minutos
    jti: identity,
    video: grant,
  };
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

serve(async (req: Request) => {
  // El preflight se responde SIEMPRE primero, antes de tocar env vars, DB o
  // nada que pueda tirar una excepción.
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

    const jwt = await generarTokenLiveKit(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      user.id,
      {
        room: llamada.room_name,
        roomJoin: true,
        canPublish: true,
        canPublishSources: ["microphone"],
        canSubscribe: true,
      },
    );

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
