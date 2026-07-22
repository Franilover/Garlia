"use client";

/**
 * PanelActualizacionApk
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel de admin en /myself/actualizaciones. Permite elegir un .apk generado
 * localmente, subirlo al bucket `apks` de Storage, y actualizar la fila
 * `app_version` — con eso, la próxima vez que alguien abra un APK viejo va
 * a ver el banner de "hay una actualización" (ver ActualizacionDisponible.tsx).
 *
 * Uso: envolver con <AdminOnly> (ya lo hace app/myself/actualizaciones/page.tsx).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Loader2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  obtenerVersionActual,
  subirNuevaVersion,
  type VersionActual,
} from "@/lib/api/client/updaterEngine";

export function PanelActualizacionApk() {
  const [actual, setActual] = useState<VersionActual | null>(null);
  const [cargandoActual, setCargandoActual] = useState(true);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [notas, setNotas] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const inputClase =
    "h-10 px-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-sm text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors w-full";

  useEffect(() => {
    obtenerVersionActual()
      .then(setActual)
      .catch((e) => console.warn("No se pudo leer la versión actual:", e))
      .finally(() => setCargandoActual(false));
  }, []);

  function manejarSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setArchivo(f);
    setError(null);
    setExito(false);

    // Si el nombre del archivo trae la versión (ej. garlia-0.2.0.apk), la
    // sugerimos en el campo — el admin la puede corregir igual.
    if (f) {
      const match = f.name.match(/(\d+\.\d+\.\d+)/);
      if (match && !version) setVersion(match[1]);
    }
  }

  async function manejarSubir() {
    if (!archivo) {
      setError("Elegí un archivo .apk primero.");
      return;
    }
    setError(null);
    setExito(false);
    setSubiendo(true);

    try {
      const nueva = await subirNuevaVersion({ file: archivo, version, notas });
      setActual(nueva);
      setExito(true);
      setArchivo(null);
      setNotas("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error subiendo el APK.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-serif italic text-lg text-primary mb-1">
          Actualización de la app
        </h3>
        <p className="text-xs text-primary/40">
          Subí un .apk nuevo acá. Los que tengan una versión anterior instalada van a
          ver un banner ofreciendo actualizar, sin que tengas que pasarles el archivo.
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
            <span className="text-primary/30 text-xs">
              Actualizado: {new Date(actual.updated_at).toLocaleString("es-AR")}
            </span>
          </div>
        ) : (
          <span className="text-primary/40">Todavía no se publicó ningún APK.</span>
        )}
      </div>

      {/* Formulario de subida */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-primary/50">Archivo .apk</span>
          <input
            ref={inputRef}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={manejarSeleccion}
            disabled={subiendo}
            className="text-sm text-primary/70 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:text-primary/80 file:cursor-pointer"
          />
          {archivo && (
            <span className="text-xs text-primary/40">
              {archivo.name} — {(archivo.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-primary/50">Versión (semver, ej. 0.2.0)</span>
          <input
            className={inputClase}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="0.2.0"
            disabled={subiendo}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-primary/50">Notas (opcional)</span>
          <textarea
            className={`${inputClase} h-20 resize-none py-2`}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Qué cambió en esta versión…"
            disabled={subiendo}
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
          onClick={manejarSubir}
          disabled={subiendo || !archivo}
          className="flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
        >
          {subiendo ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Subiendo…
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
