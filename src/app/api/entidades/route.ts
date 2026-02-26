import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role para saltar el RLS si es necesario
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); 

  try {
    // 💡 IMPORTANTE: Si la columna imagen_url te dio error antes, 
    // asegúrate de que se llame así en todas las tablas.
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria, descripcion").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat, descripcion").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, ocupacion, descripcion").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Verificación de errores individual
    if (itemsRes.error) throw new Error(`Error en Items: ${itemsRes.error.message}`);
    if (criaturasRes.error) throw new Error(`Error en Criaturas: ${criaturasRes.error.message}`);
    if (personajesRes.error) throw new Error(`Error en Personajes: ${personajesRes.error.message}`);

    return NextResponse.json({
      ok: true,
      data: {
        items: itemsRes.data ?? [],
        criaturas: criaturasRes.data ?? [],
        personajes: personajesRes.data ?? [],
      },
      // 💡 También devolvemos una lista plana por si el componente la necesita
      all: [
        ...(itemsRes.data?.map(i => ({ ...i, tipo: "item" })) || []),
        ...(criaturasRes.data?.map(c => ({ ...c, tipo: "criatura" })) || []),
        ...(personajesRes.data?.map(p => ({ ...p, tipo: "personaje" })) || []),
      ]
    });

  } catch (err: any) {
    console.error("[entidades API]", err.message);
    return NextResponse.json(
      { ok: false, error: err.message }, 
      { status: 500 }
    );
  }
}