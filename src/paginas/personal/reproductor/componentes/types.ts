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
  try {
    const { parseBlob } = await import("music-metadata-browser");
    const meta = await parseBlob(file, { duration: true, skipCovers: true });
    const { title, artist, album } = meta.common;
    const duration = meta.format.duration;
    // Fallback al nombre del archivo si no hay metadatos
    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/^\d+[\.\s\-]+/, "");
    return {
      name:     title   || baseName,
      artist:   artist  || "Desconocido",
      album:    album   || "Desconocido",
      duration: duration ? Math.floor(duration) : null,
      url,
    };
  } catch {
    // Si falla la lectura de metadatos, usar nombre del archivo
    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/^\d+[\.\s\-]+/, "");
    return { name: baseName, artist: "Desconocido", album: "Desconocido", duration: null, url };
  }
}

// Carga todos los archivos leyendo sus metadatos reales
export async function loadTracksFromFiles(files: File[]): Promise<Track[]> {
  const audioFiles = [...files]
    .filter(f => /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Promise.all(audioFiles.map(f => readTrackMeta(f)));
}