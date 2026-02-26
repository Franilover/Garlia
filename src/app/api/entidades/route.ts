// app/api/entidades/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); // "item" | "criatura" | "personaje" | null

  try {
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria, descripcion, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat, alma, descripcion, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje") // 👈 Nueva consulta para personajes
        ? supabase.from("personajes").select("id, nombre, ocupacion, descripcion, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (criaturasRes.error) throw criaturasRes.error;
    if (personajesRes.error) throw personajesRes.error;

    return NextResponse.json({
      ok: true,
      items: itemsRes.data ?? [],
      criaturas: criaturasRes.data ?? [],
      personajes: personajesRes.data ?? [], // 👈 Enviamos los personajes al frontend
    });
  } catch (err) {
    console.error("[entidades API]", err);
    return NextResponse.json({ ok: false, items: [], criaturas: [], personajes: [], error: String(err) }, { status: 500 });
  }
}