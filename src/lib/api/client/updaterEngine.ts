/**
 * updaterEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sube un .apk nuevo al bucket público `apks` de Storage y actualiza la fila
 * `app_version` para que el banner de actualización (ActualizacionDisponible.tsx,
 * dentro de la app Tauri/Android) lo detecte.
 *
 * La escritura de `app_version` está bloqueada por RLS para el cliente normal
 * (ver migración 20260722_app_version.sql) — la policy de update se agrega acá
 * mismo, restringida a rol admin, para que esto funcione desde el panel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/api/client/supabase";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200MB, generoso para un APK

export interface VersionActual {
  version: string;
  url: string;
  notas: string | null;
  updated_at: string;
}

export async function obtenerVersionActual(): Promise<VersionActual | null> {
  const { data, error } = await supabase
    .from("app_version")
    .select("version, url, notas, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return data as VersionActual | null;
}

export async function subirNuevaVersion(params: {
  file: File;
  version: string;
  notas: string;
  onProgreso?: (pct: number) => void;
}): Promise<VersionActual> {
  const { file, version, notas } = params;

  if (!file.name.toLowerCase().endsWith(".apk")) {
    throw new Error("El archivo debe ser un .apk");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("El archivo supera los 200MB.");
  }
  if (!/^\d+\.\d+\.\d+$/.test(version.trim())) {
    throw new Error("La versión debe tener formato semver, ej. 0.2.0");
  }

  const nombreArchivo = `garlia-${version.trim()}.apk`;

  // upsert: si volvés a subir la misma versión (ej. corrigiendo un build),
  // pisa el archivo anterior en vez de fallar por "ya existe".
  const { error: errUpload } = await supabase.storage
    .from("apks")
    .upload(nombreArchivo, file, { upsert: true, contentType: "application/vnd.android.package-archive" });

  if (errUpload) throw errUpload;

  const { data: urlData } = supabase.storage.from("apks").getPublicUrl(nombreArchivo);

  const { data, error: errUpdate } = await supabase
    .from("app_version")
    .update({
      version: version.trim(),
      url: urlData.publicUrl,
      notas: notas.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("version, url, notas, updated_at")
    .single();

  if (errUpdate) throw errUpdate;

  return data as VersionActual;
}
