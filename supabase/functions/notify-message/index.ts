// notify-message
// ─────────────────────────────────────────────────────────────────────────
// Notificación push dirigida a UN destinatario puntual cuando le llega un
// mensaje nuevo. A diferencia de notify-subscribers (que manda un broadcast
// fijo a la lista global `suscriptores`), esta función:
//   - recibe conversacionId / mensajeId / remitenteId por body
//   - resuelve quién es el/los otro/s participante/s de la conversación
//   - les manda push solo a ELLOS, usando sus subs en
//     `perfil_push_subscriptions` (no a `suscriptores`, que es anónima)
//
// Pensada para invocarse desde `enviarMensaje` en el cliente (fire-and-forget)
// o, mejor todavía, desde un trigger de Postgres en `mensajes` (AFTER INSERT)
// vía pg_net, para que funcione incluso si el remitente cierra la app antes
// de que la promesa del fetch termine. Documentado abajo.
//
// Variables de entorno requeridas (Supabase secrets, NO hardcodear):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ya provistas por la plataforma)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  -> setear con:
//     supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import WebPush from "https://esm.sh/web-push@3.6.6?target=deno&no-check"

interface NotifyMessageBody {
  conversacionId: string;
  mensajeId: string;
  remitenteId: string;
}

serve(async (req) => {
  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en los secrets del proyecto.");
    }

    const body = (await req.json().catch(() => ({}))) as Partial<NotifyMessageBody>;
    const { conversacionId, mensajeId, remitenteId } = body;
    if (!conversacionId || !mensajeId || !remitenteId) {
      return new Response(
        JSON.stringify({ error: "Faltan conversacionId, mensajeId o remitenteId." }),
        { status: 400 },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Destinatarios: todos los participantes de la conversación excepto quien mandó.
    const { data: participantes, error: errPart } = await supabase
      .from("conversacion_participantes")
      .select("perfil_id, perfiles!inner(username)")
      .eq("conversacion_id", conversacionId)
      .neq("perfil_id", remitenteId);
    if (errPart) throw errPart;

    const destinatarioIds = (participantes ?? []).map((p: any) => p.perfil_id);
    if (destinatarioIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, enviados: 0 }), { status: 200 });
    }

    const { data: mensaje } = await supabase
      .from("mensajes")
      .select("contenido, adjunto_tipo")
      .eq("id", mensajeId)
      .maybeSingle();

    const { data: remitente } = await supabase
      .from("perfiles")
      .select("username")
      .eq("id", remitenteId)
      .maybeSingle();

    const { data: subs, error: errSubs } = await supabase
      .from("perfil_push_subscriptions")
      .select("subscription_data, endpoint")
      .in("perfil_id", destinatarioIds);
    if (errSubs) throw errSubs;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, enviados: 0 }), { status: 200 });
    }

    WebPush.setVapidDetails("mailto:fran@ateliervirtual.art", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const cuerpo = mensaje?.contenido?.trim()
      ? mensaje.contenido
      : mensaje?.adjunto_tipo === "imagen"
        ? "📷 Foto"
        : mensaje?.adjunto_tipo === "audio"
          ? "🎤 Audio"
          : mensaje?.adjunto_tipo === "archivo"
            ? "📎 Archivo"
            : "Nuevo mensaje";

    const payload = JSON.stringify({
      title: remitente?.username ? `${remitente.username}` : "Nuevo mensaje",
      body: cuerpo,
      url: `/personal/mensajes/${conversacionId}`,
    });

    let enviados = 0;
    const expirados: string[] = [];

    await Promise.all(
      subs.map(async (sub: any) => {
        try {
          await WebPush.sendNotification(sub.subscription_data, payload);
          enviados++;
        } catch (err: any) {
          // 404/410 = la suscripción ya no existe del lado del browser; la limpiamos.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expirados.push(sub.endpoint);
          } else {
            console.error("Error enviando push individual:", err?.message ?? err);
          }
        }
      }),
    );

    if (expirados.length > 0) {
      await supabase.from("perfil_push_subscriptions").delete().in("endpoint", expirados);
    }

    return new Response(JSON.stringify({ ok: true, enviados }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
})
