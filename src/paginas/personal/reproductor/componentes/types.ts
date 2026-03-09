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

export function parseTrackMeta(file: File): Omit<Track, "url" | "duration"> {
  // Intenta extraer artista y álbum del nombre del archivo
  // Formatos comunes: "Artista - Album - Cancion" o "Artista - Cancion"
  const base = file.name.replace(/\.[^.]+$/, "").replace(/^\d+[\.\s\-]+/, "");
  const parts = base.split(" - ").map(p => p.trim());

  if (parts.length >= 3) {
    return { artist: parts[0], album: parts[1], name: parts.slice(2).join(" - ") };
  } else if (parts.length === 2) {
    return { artist: parts[0], album: "Desconocido", name: parts[1] };
  }
  return { artist: "Desconocido", album: "Desconocido", name: base };
}

export function loadTracksFromFiles(files: File[]): Track[] {
  return [...files]
    .filter(f => /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(f => ({
      ...parseTrackMeta(f),
      url: URL.createObjectURL(f),
      duration: null,
    }));
}