// app/api/entidades/route.ts
// Devuelve items y criaturas desde Supabase para el picker del editor.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role para leer sin RLS
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); // "item" | "criatura" | null (ambos)

  try {
    const [itemsRes, criaturasRes] = await Promise.all([
      (!tipo || tipo === "item")
        ? supabase.from("items").select("id, nombre, categoria, descripcion, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
      (!tipo || tipo === "criatura")
        ? supabase.from("criaturas").select("id, nombre, tipo, descripcion, imagen_url").order("nombre")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (criaturasRes.error) throw criaturasRes.error;

    return NextResponse.json({
      ok: true,
      items: itemsRes.data ?? [],
      criaturas: criaturasRes.data ?? [],
    });
  } catch (err) {
    console.error("[entidades API]", err);
    return NextResponse.json({ ok: false, items: [], criaturas: [], error: String(err) }, { status: 500 });
  }
}