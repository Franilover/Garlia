/**
 * listar-apk-releases
 * ─────────────────────────────────────────────────────────────────────────
 * Lista los releases de GitHub que tengan un asset .apk, para que el panel
 * de admin (SelectorApk.tsx) los muestre en un selector en vez de tener que
 * copiar/pegar la URL a mano.
 *
 * Corre acá y no como ruta de Next porque el proyecto usa `output: "export"`
 * (necesario para el build estático que empaqueta Tauri) — un export
 * estático no puede servir rutas API dinámicas, así que la lógica
 * server-side vive en Supabase Edge Functions, igual que
 * generar-token-llamada.
 *
 * Protegido: valida el JWT del usuario (header Authorization) contra
 * Supabase y chequea perfiles.rol === 'admin'.
 *
 * Requiere estos secrets (Supabase Dashboard → Edge Functions → Secrets, o
 * `supabase secrets set`):
 *   GITHUB_TOKEN  → fine-grained PAT con "Contents: Read" sobre el repo
 *   GITHUB_REPO   → "usuario/repo"
 * (SUPABASE_URL y SUPABASE_ANON_KEY ya están disponibles automáticamente
 * en toda Edge Function.)
 * ─────────────────────────────────────────────────────────────────────────
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ─── CORS ───────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function envRequerida(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) {
    throw new Error(`Falta configurar la variable de entorno ${nombre} en la Edge Function.`);
  }
  return valor;
}

interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GithubRelease {
  tag_name: string;
  name: string | null;
  published_at: string;
  assets: GithubAsset[];
}

interface ApkReleaseOption {
  tag: string;
  titulo: string;
  publicadoEn: string;
  url: string;
  nombreArchivo: string;
  tamanioMB: number;
}

serve(async (req: Request) => {
  // El preflight se responde SIEMPRE primero, antes de tocar env vars, DB o
  // nada que pueda tirar una excepción.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta el header Authorization." }, 401);
    }

    const SUPABASE_URL = envRequerida("SUPABASE_URL");
    const SUPABASE_ANON_KEY = envRequerida("SUPABASE_ANON_KEY");

    // Cliente "as user": respeta RLS, lo usamos solo para identificar quién
    // llama y chequear su rol.
    const supabaseUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: errUser,
    } = await supabaseUsuario.auth.getUser();
    if (errUser || !user) {
      return jsonResponse({ error: "No autenticado." }, 401);
    }

    const { data: perfil, error: errPerfil } = await supabaseUsuario
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    if (errPerfil || !perfil || perfil.rol !== "admin") {
      return jsonResponse({ error: "No autorizado." }, 403);
    }

    const GITHUB_TOKEN = envRequerida("GITHUB_TOKEN");
    const GITHUB_REPO = envRequerida("GITHUB_REPO");

    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!resp.ok) {
      const cuerpo = await resp.text().catch(() => "");
      throw new Error(`GitHub respondió ${resp.status}: ${cuerpo.slice(0, 300)}`);
    }

    const releases = (await resp.json()) as GithubRelease[];

    const opciones: ApkReleaseOption[] = releases.flatMap((r) =>
      r.assets
        .filter((a) => a.name.toLowerCase().endsWith(".apk"))
        .map((a) => ({
          tag: r.tag_name,
          titulo: r.name || r.tag_name,
          publicadoEn: r.published_at,
          url: a.browser_download_url,
          nombreArchivo: a.name,
          tamanioMB: Math.round((a.size / (1024 * 1024)) * 10) / 10,
        })),
    );

    return jsonResponse({ ok: true, opciones }, 200);
  } catch (error) {
    console.error("listar-apk-releases:", error);
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Error interno." },
      500,
    );
  }
});
