import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
        ? supabase.from("criaturas").select("id, nombre, imagen_url, habitat, alma, descripcion").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, img_url, reino, especie, sobre").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    const data = {
      items: (itemsRes.data || []).map((i: any) => ({
        ...i,
        tipo: "item",
      })),
      criaturas: (criaturasRes.data || []).map((c: any) => ({
        ...c,
        
        tipo: "criatura",
      })),
      personajes: (personajesRes.data || []).map((p: any) => ({
        ...p,
        imagen_url: p.img_url,       
        descripcion: p.sobre,        
        tipo: "personaje",
      })),
    };

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}