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
    // Ejecutamos las promesas y manejamos el error interno de cada una
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, img_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, img_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Logs de error en consola de servidor para depuración
    if (itemsRes.error) console.error("Error Items:", itemsRes.error.message);
    if (criaturasRes.error) console.error("Error Criaturas:", criaturasRes.error.message);
    if (personajesRes.error) console.error("Error Personajes:", personajesRes.error.message);

    // Mapeo seguro de datos
    const safeItems = itemsRes.data?.map((i: any) => ({ 
      ...i, 
      tipo: 'item' 
    })) || [];

    const safeCriaturas = criaturasRes.data?.map((c: any) => ({ 
      ...c, 
      imagen_url: c.img_url, // Normalizamos para el Picker
      tipo: 'criatura' 
    })) || [];

    const safePersonajes = personajesRes.data?.map((p: any) => ({ 
      ...p, 
      imagen_url: p.img_url, // Normalizamos para el Picker
      tipo: 'personaje' 
    })) || [];

    return NextResponse.json({
      ok: true,
      data: {
        items: safeItems,
        criaturas: safeCriaturas,
        personajes: safePersonajes
      }
    });

  } catch (err: any) {
    console.error("[entidades API Error]:", err.message);
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