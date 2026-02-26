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
    // 💡 Consultas simplificadas para evitar el Error 500 por columnas inexistentes
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

    // Revisar si hubo error en Supabase
    if (itemsRes.error) throw new Error(`Items: ${itemsRes.error.message}`);
    if (criaturasRes.error) throw new Error(`Criaturas: ${criaturasRes.error.message}`);
    if (personajesRes.error) throw new Error(`Personajes: ${personajesRes.error.message}`);

    // 🔥 LA ESTRUCTURA CORRECTA: d.ok y d.data
    return NextResponse.json({
      ok: true,
      data: {
        items: itemsRes.data || [],
        criaturas: criaturasRes.data || [],
        personajes: personajesRes.data || [],
      }
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