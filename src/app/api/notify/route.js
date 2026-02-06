import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:fran@ateliervirtual.art',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const dataReceived = await request.json().catch(() => ({}));
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subs, error: dbError } = await supabase
      .from('suscriptores')
      .select('subscription_data')
      .not('subscription_data', 'is', null);

    if (dbError) throw dbError;

    const payload = JSON.stringify({
      title: dataReceived.title || "ð¨ Â¡Nuevo arte!",
      body: dataReceived.body || "Hay algo nuevo en el Atelier.",
      icon: "/icon.png",
      image: dataReceived.image,
      url: "/" 
    });

    const results = await Promise.all(
      (subs || []).map(sub => 
        webpush.sendNotification(sub.subscription_data, payload)
          .catch(err => console.error("Error envÃ­o:", err.endpoint))
      )
    );

    return NextResponse.json({ success: true, sent: results.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 