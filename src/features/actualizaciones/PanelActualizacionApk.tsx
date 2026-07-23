"use client";

/**
 * PanelActualizacionApk
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel de admin en /myself/actualizaciones. Ya no sube el .apk a Storage
 * (plan Free de Supabase limita a 50MB por archivo y el APK universal pesa
 * ~75MB). En cambio: subís el .apk a mano a un GitHub Release y acá pegás
 * la URL del asset — el panel solo actualiza la fila `app_version`, con eso
 * la próxima vez que alguien abra un APK viejo va a ver el banner de "hay
 * una actualización" (ver ActualizacionDisponible.tsx).
 *
 * Flujo para publicar:
 *   1. Generar el build en:
 *      src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
 *   2. Subirlo a un GitHub Release (gh release create/upload, o la web de GitHub).
 *   3. Copiar la URL del asset (termina en .apk) y pegarla acá abajo.
 *
 * Uso: envolver con <AdminOnly> (ya lo hace app/myself/actualizaciones/page.tsx).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Loader2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";

import {
  obtenerVersionActual,
  publicarNuevaVersion,
  type VersionActual,
} from "@/lib/api/client/updaterEngine";

export function PanelActualizacionApk() {
  const [actual, setActual] = useState<VersionActual | null>(null);
  const [cargandoActual, setCargandoActual] = useState(true);

  const [url, setUrl] = useState("");
  const [version, setVersion] = useState("");
  const [notas, setNotas] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const inputClase =
    "h-10 px-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-sm text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors w-full";

  useEffect(() => {
    obtenerVersionActual()
      .then(setActual)
      .catch((e) => console.warn("No se pudo leer la versión actual:", e))
      .finally(() => setCargandoActual(false));
  }, []);

  function manejarCambioUrl(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setUrl(v);
    setError(null);
    setExito(false);

    // Si la URL trae la versión (ej. .../releases/download/v0.2.0/...), la
    // sugerimos en el campo — el admin la puede corregir igual.
    const match = v.match(/(\d+\.\d+\.\d+)/);
    if (match && !version) setVersion(match[1]);
  }

  async function manejarPublicar() {
    if (!url.trim()) {
      setError("Pegá la URL del asset de GitHub Releases primero.");
      return;
    }
    setError(null);
    setExito(false);
    setPublicando(true);

    try {
      const nueva = await publicarNuevaVersion({ url, version, notas });
      setActual(nueva);
      setExito(true);
      setUrl("");
      setNotas("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error publicando la versión.");
      console.error(e);
    } finally {
      setPublicando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-serif italic text-lg text-primary mb-1">
          Actualización de la app
        </h3>
        <p className="text-xs text-primary/40">
          Subí el .apk a un GitHub Release y pegá acá la URL del asset. Los que
          tengan una versión anterior instalada van a ver un banner ofreciendo
          actualizar.
        </p>
      </div>

      {/* Versión publicada actualmente */}
      <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-sm">
        {cargandoActual ? (
          <span className="text-primary/40 flex items-center gap-2">
            <Loader2 className="animate-spin" size={14} /> Cargando versión actual…
          </span>
        ) : actual && actual.url ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-primary/80">
              Versión publicada: <strong>{actual.version}</strong>
            </span>
            {actual.notas && <span className="text-primary/40 text-xs">{actual.notas}</span>}
            <span className="text-primary/30 text-xs break-all">{actual.url}</span>
            <span className="text-primary/30 text-xs">
              Actualizado: {new Date(actual.updated_at).toLocaleString("es-AR")}
            </span>
          </div>
        ) : (
          <span className="text-primary/40">Todavía no se publicó ningún APK.</span>
        )}
      </div>

      {/* Formulario de publicación */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-primary/50">URL del asset en GitHub Releases</span>
          <input
            className={inputClase}
            value={url}
            onChange={manejarCambioUrl}
            placeholder="https://github.com/usuario/repo/releases/download/v0.2.0/app-universal-release.apk"
            disabled={publicando}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-primary/50">Versión (semver, ej. 0.2.0)</span>
          <input
            className={inputClase}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="0.2.0"
            disabled={publicando}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-primary/50">Notas (opcional)</span>
          <textarea
            className={`${inputClase} h-20 resize-none py-2`}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Qué cambió en esta versión…"
            disabled={publicando}
          />
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {exito && (
          <p className="text-xs text-green-600">
            Listo — la nueva versión ya está publicada.
          </p>
        )}

        <button
          type="button"
          onClick={manejarPublicar}
          disabled={publicando || !url.trim()}
          className="flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
        >
          {publicando ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Publicando…
            </>
          ) : (
            <>
              <UploadCloud size={16} /> Publicar actualización
            </>
          )}
        </button>
      </div>
    </div>
  );
}
