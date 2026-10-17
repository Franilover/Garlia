import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { translateText, type Lexeme, type Morpheme, type MorphRule, type LexicalSense, type GrammarProfile } from "./engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido. Usa POST." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Faltan SUPABASE_URL o una clave privilegiada de servidor.");
    return json({ error: "El motor no está configurado correctamente." }, 500);
  }
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Debes iniciar sesión para usar el traductor experimental." }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "La sesión no es válida o ha caducado." }, 401);

  const { data: profile, error: profileError } = await admin.from("perfiles").select("rol").eq("id", authData.user.id).maybeSingle();
  if (profileError) {
    console.error("No se pudo verificar el rol del traductor.", profileError.message);
    return json({ error: "No se pudieron verificar los permisos de la cuenta." }, 500);
  }
  if (!profile || !["editor", "admin"].includes(profile.rol ?? "")) {
    return json({ error: "El traductor experimental requiere permisos de editor o administrador." }, 403);
  }

  let body: { text?: unknown };
  try { body = await req.json(); } catch { return json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, 400); }
  if (typeof body.text !== "string" || !body.text.trim()) return json({ error: "Envía un texto no vacío en el campo text." }, 400);
  const text = body.text.trim();
  if (text.length > 2000) return json({ error: "El texto supera el máximo de 2000 caracteres." }, 413);

  try {
    const { data: language, error: languageError } = await admin.from("idiomas").select("id,nombre,estado").ilike("nombre", "Aoris").maybeSingle();
    if (languageError) throw new Error(`No se pudo consultar idiomas: ${languageError.message}`);
    if (!language) return json({ error: "No existe el idioma Aoris en la tabla idiomas." }, 503);

    const [lexemeResult, morphemeResult, ruleResult, senseResult, grammarResult] = await Promise.all([
      admin.from("lexemas").select("id,lema,categoria_gramatical,definicion_breve,estado,transcripcion_ipa").eq("idioma_id", language.id).neq("estado", "archivado").order("lema").limit(2000),
      admin.from("morfemas").select("forma,tipo,significado,estado").eq("idioma_id", language.id).neq("estado", "archivado").order("forma").limit(1000),
      admin.from("reglas_morfologicas").select("nombre,tipo_operacion,categoria_objetivo,descripcion,estado,orden_aplicacion").eq("idioma_id", language.id).neq("estado", "archivado").order("orden_aplicacion").limit(1000),
      admin.from("sentidos_lexicos").select("lexema_id,definicion,uso_ejemplo,restricciones_uso,estado").neq("estado", "archivado").limit(3000),
      admin.from("perfiles_gramaticales").select("orden_basico,orden_adjetivo_sustantivo,estrategia_negacion,estrategia_interrogacion,notas,estado").eq("idioma_id", language.id).is("variedad_id", null).neq("estado", "archivado").maybeSingle(),
    ]);
    const errors = [lexemeResult.error, morphemeResult.error, ruleResult.error, senseResult.error, grammarResult.error].filter(Boolean);
    if (errors.length) throw new Error(errors.map((e) => e?.message).join("; "));

    const lexemes = (lexemeResult.data ?? []) as Lexeme[];
    const morphemes = (morphemeResult.data ?? []) as Morpheme[];
    const rules = (ruleResult.data ?? []) as MorphRule[];
    const senses = (senseResult.data ?? []) as LexicalSense[];
    const grammar = (grammarResult.data ?? null) as GrammarProfile | null;
    if (!lexemes.length) return json({ error: "Aoris no tiene lexemas disponibles para el motor." }, 503);

    const result = translateText(text, lexemes, morphemes, senses, rules, grammar, language.estado ?? null);
    return json({
      ...result, engine_version: "aoris-es-v1", target_language: language.nombre, language_state: language.estado ?? null,
      diagnostics: {
        ...result.diagnostics, lexical_senses_loaded: senses.length, grammatical_profile_state: grammar?.estado ?? null,
        draft_lexemes_used: lexemes.filter((item) => item.estado !== "canon").length,
        draft_morphemes_used: morphemes.filter((item) => item.estado !== "canon").length,
        draft_rules_loaded: rules.filter((item) => item.estado !== "canon").length,
      },
    });
  } catch (error) {
    console.error("Error en el motor Español → Aoris:", error);
    return json({ error: "No se pudo completar la traducción. Revisa el estado del motor lingüístico." }, 500);
  }
});
