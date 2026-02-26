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
    // 1. Ejecutamos las consultas en paralelo
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat, img_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, img_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    // 2. Logs de control en la consola de Vercel
    if (itemsRes.error) console.error("Error Items:", itemsRes.error.message);
    if (criaturasRes.error) console.error("Error Criaturas:", criaturasRes.error.message);
    if (personajesRes.error) console.error("Error Personajes:", personajesRes.error.message);

    // 3. Formateo de los datos para el componente EntidadPicker
    const data = {
      items: (itemsRes.data || []).map((i: any) => ({
        ...i,
        tipo: "item"
      })),
      criaturas: (criaturasRes.data || []).map((c: any) => ({
        ...c,
        imagen_url: c.img_url, // 👈 Importante: mapeamos img_url a imagen_url
        tipo: "criatura"
      })),
      personajes: (personajesRes.data || []).map((p: any) => ({
        ...p,
        imagen_url: p.img_url, // 👈 Importante: mapeamos img_url a imagen_url
        tipo: "personaje"
      }))
    };

    // 4. Retorno de la respuesta exitosa
    return NextResponse.json({
      ok: true,
      data: data
    });

  } catch (err: any) {
    console.error("DETALLE DEL ERROR:", err.message);
    return NextResponse.json(
      { 
        ok: false, 
        error: "Error de consistencia en base de datos", 
        detalle: err.message 
      },
      { status: 500 }
    );
  }
}