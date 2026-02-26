import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usamos Service Role para asegurar lectura si hay RLS restrictivas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  try {
    // 💡 Consultas en paralelo con las columnas reales de tu DB
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, visible, imagen_url, ocupacion").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Verificamos si alguna tabla dio error
    if (itemsRes.error) throw new Error(`Error en 'items': ${itemsRes.error.message}`);
    if (criaturasRes.error) throw new Error(`Error en 'criaturas': ${criaturasRes.error.message}`);
    if (personajesRes.error) throw new Error(`Error en 'personajes': ${personajesRes.error.message}`);

    // 🔥 LA CLAVE: El Picker espera que todo esté dentro de "data"
    return NextResponse.json({
      ok: true,
      data: {
        items: itemsRes.data ?? [],
        criaturas: criaturasRes.data ?? [],
        personajes: personajesRes.data ?? [],
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