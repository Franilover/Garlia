import { parseBlob } from "music-metadata-browser";
import { db } from "@/lib/api/client/db";

export interface Track {
  name: string;
  artist: string;
  album: string;
  url: string;
  duration: number | null;
}

export type VistaLibreria = "canciones" | "artistas" | "albums";

export function fmt(s: number | null) {
  if (!s || !isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${ss}`;
}

// Lee metadatos de un archivo — intenta parseBlob, fallback a Audio nativo
export async function readTrackMeta(file: File): Promise<Track> {
  const url = URL.createObjectURL(file);
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/^\d+[\.\s\-]+/, "");

  try {
    // skipCovers evita leer la carátula completa — mucho más rápido en FLAC
    const meta = await parseBlob(file, { duration: true, skipCovers: true });
    const { title, artist, album } = meta.common;
    const duration = meta.format.duration;
    return {
      name:     title   || baseName,
      artist:   artist  || "Desconocido",
      album:    album   || "Desconocido",
      duration: duration ? Math.floor(duration) : null,
      url,
    };
  } catch {
    const duration = await new Promise<number | null>((resolve) => {
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
      audio.addEventListener("error", () => resolve(null));
      setTimeout(() => resolve(null), 5000);
    });
    return {
      name:     baseName,
      artist:   "Desconocido",
      album:    "Desconocido",
      duration: duration ? Math.floor(duration) : null,
      url,
    };
  }
}

// Procesa archivos en lotes con concurrencia limitada
// onProgress se llama cada vez que llega una canción nueva — permite mostrar progreso
async function processWithConcurrency(
  files: File[],
  concurrency: number,
  onProgress?: (track: Track, done: number, total: number) => void
): Promise<Track[]> {
  const results: Track[] = new Array(files.length);
  let index = 0;
  let done = 0;

  async function worker() {
    while (index < files.length) {
      const i = index++;
      results[i] = await readTrackMeta(files[i]);
      done++;
      onProgress?.(results[i], done, files.length);
    }
  }

  // Lanza N workers en paralelo
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// Carga todos los archivos con concurrencia limitada (8 a la vez)
// onProgress: callback opcional para mostrar canciones apenas llegan
export async function loadTracksFromFiles(
  files: File[],
  onProgress?: (track: Track, done: number, total: number) => void
): Promise<Track[]> {
  const audioFiles = [...files]
    .filter(f => /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 8 archivos en paralelo — buen balance entre velocidad y no saturar el navegador
  return processWithConcurrency(audioFiles, 8, onProgress);
}

// ─── Persistencia de carpeta via Dexie ───────────────────────────────────────

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    if (!db) return;
    await db.reproductor_handles.put({ key: "lastFolder", handle });
  } catch (e) {
    console.warn("[Reproductor] No se pudo guardar el handle de carpeta:", e);
  }
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!db) return null;
    const row = await db.reproductor_handles.get("lastFolder");
    return row?.handle ?? null;
  } catch {
    return null;
  }
}