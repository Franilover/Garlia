// ─── Tipos compartidos del lector ─────────────────────────────────────────────

export interface CapituloLista {
  id: string;
  orden: number;
  fecha_publicacion: string;
  titulo_capitulo?: string;
}

export interface CapituloScrollItem {
  id: string;
  orden: number;
  titulo_capitulo: string;
  contenido: string;
  fecha_publicacion: string;
  libros?: { titulo?: string };
  personajes_ids?: string[];
}

export interface FileEntry  { name: string; url: string; type: "image" }
export interface FolderEntry { name: string; type: "folder"; children: TreeNode[] }
export type TreeNode = FileEntry | FolderEntry;

export type Segment =
  | { type: "text";   value: string }
  | { type: "cita";   content: string }
  | { type: "img";    url: string; caption?: string }
  | { type: "float";  word: string; url: string; caption?: string }
  | { type: "sound";  url: string; volume: number }
  | { type: "drop";   word: string; entidadTipo: "item" | "criatura" | "personaje"; entidadId: string; entidadNombre: string }
  | { type: "choice"; label: string; target: string }
  | { type: "use";    word: string; itemId: string; targetSuccess: string; targetFail?: string }
  | { type: "section"; id: string; label?: string };

export type SectionMap = Record<string, Segment[]>;

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseSections(segs: Segment[]): SectionMap {
  const map: SectionMap = { "": [] };
  let current = "";
  for (const seg of segs) {
    if (seg.type === "section") {
      current = seg.id;
      if (!map[current]) map[current] = [];
    } else {
      map[current].push(seg);
    }
  }
  return map;
}

export function parseContenido(texto: string): Segment[] {
  const regex = /\[\[(\w+)\|([\s\S]+?)\]\]/g;
  const segs: Segment[] = [];
  let lastIndex = 0, match: RegExpExecArray | null;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) segs.push({ type: "text", value: texto.slice(lastIndex, match.index) });
    const [, kind, rest] = match;
    const parts = rest.split("|").map(p => p.trim());
    if (kind === "cita")    segs.push({ type: "cita", content: parts[0] });
    else if (kind === "img")    segs.push({ type: "img", url: parts[0], caption: parts[1] });
    else if (kind === "float")  segs.push({ type: "float", word: parts[0], url: parts[1], caption: parts[2] });
    else if (kind === "sound")  segs.push({ type: "sound", url: parts[0], volume: parseFloat(parts[1] ?? "0.5") });
    else if (kind === "drop")   segs.push({ type: "drop", word: parts[0], entidadTipo: parts[1] as "item" | "criatura" | "personaje", entidadId: parts[2], entidadNombre: parts[3] ?? parts[0] });
    else if (kind === "choice") segs.push({ type: "choice", label: parts[0], target: parts[1] });
    else if (kind === "section") segs.push({ type: "section", id: parts[0], label: parts[1] });
    else if (kind === "use")    segs.push({ type: "use", word: parts[0], itemId: parts[1], targetSuccess: parts[2], targetFail: parts[3] });
    else segs.push({ type: "text", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < texto.length) segs.push({ type: "text", value: texto.slice(lastIndex) });
  return segs;
}