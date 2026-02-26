import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  try {
    // 1. Ejecutamos las consultas por separado para identificar cuál falla
    const itemsReq = (!tipo || tipo === "item")
      ? supabase.from("items").select("id, nombre, imagen_url").order("nombre")
      : Promise.resolve({ data: [], error: null });

    const criaturasReq = (!tipo || tipo === "criatura")
      ? supabase.from("criaturas").select("id, nombre, img_url").order("nombre")
      : Promise.resolve({ data: [], error: null });

    const personajesReq = (!tipo || tipo === "personaje")
      ? supabase.from("personajes").select("id, nombre, img_url").order("nombre")
      : Promise.resolve({ data: [], error: null });

    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      itemsReq,
      criaturasReq,
      personajesReq
    ]);

    // 2. Logs detallados para que veas en Vercel exactamente qué tabla falla
    if (itemsRes.error) console.error("Error en tabla ITEMS:", itemsRes.error.message);
    if (criaturasRes.error) console.error("Error en tabla CRIATURAS:", criaturasRes.error.message);
    if (personajesRes.error) console.error("Error en tabla PERSONAJES:", personajesRes.error.message);

    // 3. Formateo de respuesta seguro
    const data = {
      items: (itemsRes.data || []).map((i: any) => ({
        ...i,
        tipo: "item"
      })),
      criaturas: (criaturasRes.data || []).map((c: any) => ({
        ...c,
        imagen_url: c.img_url || null,
        tipo: "criatura"
      })),
      personajes: (personajesRes.data || []).map((p: any) => ({
        ...p,
        imagen_url: p.img_url || null,
        tipo: "personaje"
      }))
    };

    return NextResponse.json({
      ok: true,
      data: data
    });

  } catch (err: any) {
    console.error("CRITICAL API ERROR:", err.message);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Error interno del servidor",
        detalle: err.message 
      }, 
      { status: 500 }
    );
  }
}