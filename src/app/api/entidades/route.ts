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
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria, imagen_url") // Aquí es imagen_url
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat, img_url") // Aquí es img_url
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, visible, img_url") // Aquí es img_url
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemsRes.error || criaturasRes.error || personajesRes.error) {
      throw new Error("Fallo en una de las consultas de Supabase");
    }

    return NextResponse.json({
      ok: true,
      data: {
        // Normalizamos los datos para que el frontend siempre vea "imagen_url"
        items: itemsRes.data?.map(i => ({ ...i, tipo: 'item' })) || [],
        criaturas: criaturasRes.data?.map(c => ({ ...c, imagen_url: c.img_url, tipo: 'criatura' })) || [],
        personajes: personajesRes.data?.map(p => ({ ...p, imagen_url: p.img_url, tipo: 'personaje' })) || [],
      }
    });

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Error de consistencia", detalle: err.message },
      { status: 500 }
    );
  }
}