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
        ? supabase.from("criaturas").select("id, nombre, img_url, habitat, alma").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, img_url, ocupacion, visible").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Log errores para debug
    if (criaturasRes.error)  console.error("[/api/entidades] criaturas error:", criaturasRes.error.message);
    if (personajesRes.error) console.error("[/api/entidades] personajes error:", personajesRes.error.message);
    if (itemsRes.error)      console.error("[/api/entidades] items error:", itemsRes.error.message);

    const data = {
      items: (itemsRes.data || []).map((i: any) => ({
        ...i,
        tipo: "item"
      })),
      criaturas: (criaturasRes.data || []).map((c: any) => ({
        ...c,
        imagen_url: c.img_url,
        tipo: "criatura"
      })),
      personajes: (personajesRes.data || []).map((p: any) => ({
        ...p,
        imagen_url: p.img_url,
        tipo: "personaje"
      }))
    };

    // Log counts para debug
    console.log("[/api/entidades] counts — items:", data.items.length, "criaturas:", data.criaturas.length, "personajes:", data.personajes.length);

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[/api/entidades] catch:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}