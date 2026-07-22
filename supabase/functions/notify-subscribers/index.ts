import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import WebPush from "https://esm.sh/web-push@3.6.6?target=deno&no-check"

// TODO(seguridad): estas claves VAPID están hardcodeadas y comprometidas por
// estar en el historial de git. Moverlas a `supabase secrets set` y leerlas
// con Deno.env.get (como ya se hace abajo con SUPABASE_SERVICE_ROLE_KEY), y
// rotar el par si este repo estuvo alguna vez expuesto públicamente.
const VAPID_PUBLIC_KEY = "BG-LnxDWcr_4PGYVPdRr_L4qAnvgSGsc18-NAZR23bz4O1MmV8SEsV8ew_RlvEaSKPjN3mS9LI4wa-96-dWPKIY";
const VAPID_PRIVATE_KEY = "mdE23gCH8qrbeZeMYoPKLa0biCZaPFCrNRm0mJgy2kw";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: subs, error: dbError } = await supabase
      .from('suscriptores')
      .select('subscription_data')
      .not('subscription_data', 'is', null);

    if (dbError) throw dbError;

    
    WebPush.setVapidDetails(
      "mailto:fran@ateliervirtual.art",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const notificationPayload = JSON.stringify({
      title: "🎨 ¡Nuevo dibujo!",
      body: "¡Pásate por el Atelier a ver lo nuevo!",
    });

    const sendPromises = (subs || []).map(async (sub: any) => {
      try {
        await WebPush.sendNotification(sub.subscription_data, notificationPayload);
        console.log("Enviado");
      } catch (err) {
        console.error("Error individual:", err.message);
      }
    });

    await Promise.all(sendPromises);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})