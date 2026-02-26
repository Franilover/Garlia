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
        ? supabase.from("items").select("id, nombre, categoria, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat, img_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, img_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemsRes.error) throw new Error(`Items: ${itemsRes.error.message}`);
    if (criaturasRes.error) throw new Error(`Criaturas: ${criaturasRes.error.message}`);
    if (personajesRes.error) throw new Error(`Personajes: ${personajesRes.error.message}`);

    return NextResponse.json({
      ok: true,
      data: {
        items: itemsRes.data?.map((i: any) => ({ ...i, tipo: "item" })) || [],
        criaturas: criaturasRes.data?.map((c: any) => ({ 
          ...c, 
          imagen_url: c.img_url, 
          tipo: "criatura" 
        })) || [],
        personajes: personajesRes.data?.map((p: any) => ({ 
          ...p, 
          imagen_url: p.img_url, 
          tipo: "personaje" 
        })) || [],
      }
    });

  } catch (err: any) {
    console.error("DETALLE DEL ERROR:", err.message);
    return NextResponse.json(
      { ok: false, error: "Error de consistencia en base de datos", detalle: err.message },
      { status: 500 }
    );
  }
}