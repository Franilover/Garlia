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
    // 💡 He ajustado los .select() basándome en tus archivos .ts reales
    const [itemsRes, criaturasRes, personajesRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, habitat").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "personaje")
        ? supabase.from("personajes").select("id, nombre, visible").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Verificamos cuál falló específicamente para darte un error claro
    if (itemsRes.error) throw new Error(`Error en tabla 'items': ${itemsRes.error.message}`);
    if (criaturasRes.error) throw new Error(`Error en tabla 'criaturas': ${criaturasRes.error.message}`);
    if (personajesRes.error) throw new Error(`Error en tabla 'personajes': ${personajesRes.error.message}`);

    return NextResponse.json({
      ok: true,
      data: {
        items: itemsRes.data ?? [],
        criaturas: criaturasRes.data ?? [],
        personajes: personajesRes.data ?? [],
      },
      // Lista plana para buscadores globales
      all: [
        ...(itemsRes.data?.map((i: any) => ({ ...i, tipo: "item" })) || []),
        ...(criaturasRes.data?.map((c: any) => ({ ...c, tipo: "criatura" })) || []),
        ...(personajesRes.data?.map((p: any) => ({ ...p, tipo: "personaje" })) || []),
      ]
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