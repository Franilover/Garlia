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

// Lee metadatos ID3 reales del archivo (título, artista, álbum, duración)
export async function readTrackMeta(file: File): Promise<Track> {
  const url = URL.createObjectURL(file);
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/^\d+[\.\s\-]+/, "");

  // Intenta con music-metadata-browser (paquete instalado localmente)
  try {
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
    // Fallback: duración vía Audio nativo del navegador
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

// Carga todos los archivos leyendo sus metadatos reales
export async function loadTracksFromFiles(files: File[]): Promise<Track[]> {
  const audioFiles = [...files]
    .filter(f => /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Promise.all(audioFiles.map(f => readTrackMeta(f)));
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