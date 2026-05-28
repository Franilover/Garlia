// ─────────────────────────────────────────────────────────────────────────────
// type.ts
// ─────────────────────────────────────────────────────────────────────────────
// Incluye parseSnippetRaw (antes en parseSnippetRaw.ts) al final del archivo.
// Ya no es necesario importar desde "./parseSnippetRaw" — importar desde "./type".

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de listas / capítulos
// ─────────────────────────────────────────────────────────────────────────────

export interface CapituloLista {
  id:                 string;
  orden:              number;
  fecha_publicacion:  string;
  titulo_capitulo?:   string;
}

export interface CapituloScrollItem {
  id:                 string;
  orden:              number;
  titulo_capitulo:    string;
  contenido:          string;
  fecha_publicacion:  string;
  libros?:            { titulo?: string };
  personajes_ids?:    string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Árbol de archivos
// ─────────────────────────────────────────────────────────────────────────────

export interface FileEntry   { name: string; url: string; type: "image" }
export interface FolderEntry { name: string; type: "folder"; children: TreeNode[] }
export type TreeNode = FileEntry | FolderEntry;

// ─────────────────────────────────────────────────────────────────────────────
// Segmentos de contenido
// ─────────────────────────────────────────────────────────────────────────────

export type Segment =
  | { type: "text";    value: string }
  | { type: "cita";    content: string }
  | { type: "img";     url: string; caption?: string }
  | { type: "float";   word: string; url: string; caption?: string }
  | { type: "sound";   url: string; volume: number }
  | { type: "drop";    word: string; entidadTipo: "item" | "criatura" | "personaje"; entidadId: string; entidadNombre: string }
  | { type: "choice";  label: string; target: string }
  | { type: "use";     word: string; itemId: string; targetSuccess: string; targetFail?: string }
  | { type: "section"; id: string; label?: string }
  | { type: "gate";    itemId: string; tieneSegs: Segment[]; noTieneSegs: Segment[] };

export type SectionMap = Record<string, Segment[]>;

// ─────────────────────────────────────────────────────────────────────────────
// parseSections
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// extractGateBlocks — pre-extrae bloques [[gate|...]] multilinea
// ─────────────────────────────────────────────────────────────────────────────
//
// Formato:
//   [[gate|itemId|
//   Texto si TIENE el ítem. Puede tener **markdown**, [[choice|...]] etc.
//   ===
//   Texto si NO tiene el ítem.
//   ]]

function extractGateBlocks(texto: string): {
  resultado: string;
  gates: Map<string, { tieneTexto: string; noTieneTexto: string; itemId: string }>;
} {
  const gates = new Map<string, { tieneTexto: string; noTieneTexto: string; itemId: string }>();
  const gateRegex = /\[\[gate\|([^\|]+)\|([\s\S]+?)\]\]/g;
  let counter = 0;

  const resultado = texto.replace(gateRegex, (_, itemId, contenido) => {
    const separatorIdx = contenido.indexOf("===");
    const tieneTexto   = separatorIdx >= 0 ? contenido.slice(0, separatorIdx).trim() : contenido.trim();
    const noTieneTexto = separatorIdx >= 0 ? contenido.slice(separatorIdx + 3).trim() : "";
    const placeholder  = `\x00GATE_${counter}\x00`;
    gates.set(placeholder, { itemId: itemId.trim(), tieneTexto, noTieneTexto });
    counter++;
    return placeholder;
  });

  return { resultado, gates };
}

// ─────────────────────────────────────────────────────────────────────────────
// parseContenido
// ─────────────────────────────────────────────────────────────────────────────

export function parseContenido(texto: string): Segment[] {
  const { resultado, gates } = extractGateBlocks(texto);

  const regex = /\[\[(\w+)\|([\s\S]+?)\]\]|\x00GATE_\d+\x00/g;
  const segs: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(resultado)) !== null) {
    if (match.index > lastIndex) {
      segs.push({ type: "text", value: resultado.slice(lastIndex, match.index) });
    }

    const raw = match[0];

    if (raw.startsWith("\x00GATE_")) {
      const gate = gates.get(raw);
      if (gate) {
        segs.push({
          type:        "gate",
          itemId:      gate.itemId,
          tieneSegs:   parseContenido(gate.tieneTexto),
          noTieneSegs: parseContenido(gate.noTieneTexto),
        });
      }
      lastIndex = match.index + raw.length;
      continue;
    }

    const [, kind, rest] = match;
    const parts = rest.split("|").map((p: string) => p.trim());

    if      (kind === "cita")    segs.push({ type: "cita",    content: parts[0] });
    else if (kind === "img")     segs.push({ type: "img",     url: parts[0], caption: parts[1] });
    else if (kind === "float")   segs.push({ type: "float",   word: parts[0], url: parts[1], caption: parts[2] });
    else if (kind === "sound")   segs.push({ type: "sound",   url: parts[0], volume: parseFloat(parts[1] ?? "0.5") });
    else if (kind === "drop")    segs.push({
      type:          "drop",
      word:          parts[0] ?? "",
      entidadTipo:   (parts[1] ?? "personaje") as "item" | "criatura" | "personaje",
      entidadId:     parts[2] ?? "",
      entidadNombre: parts[3] ?? parts[0] ?? "",
    });
    else if (kind === "choice")  segs.push({ type: "choice",  label: parts[0], target: parts[1] });
    else if (kind === "section") segs.push({ type: "section", id: parts[0], label: parts[1] });
    else if (kind === "use")     segs.push({ type: "use",     word: parts[0], itemId: parts[1], targetSuccess: parts[2], targetFail: parts[3] });
    else segs.push({ type: "text", value: raw });

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < resultado.length) {
    segs.push({ type: "text", value: resultado.slice(lastIndex) });
  }

  return segs;
}

// ─────────────────────────────────────────────────────────────────────────────
// parseSnippetRaw  (antes en parseSnippetRaw.ts)
// ─────────────────────────────────────────────────────────────────────────────
// Extrae los valores iniciales de un snippet raw `[[kind|…]]`
// para pre-poblar los modales cuando el usuario hace clic en ✎.

export type ParsedSnippet =
  | { kind: "drop";    entidadId: string; entidadTipo: string; label: string }
  | { kind: "img";     url: string; alt: string; float: boolean }
  | { kind: "float";   url: string; alt: string; float: true }
  | { kind: "choice";  texto: string; target: string }
  | { kind: "use";     itemId: string; label: string; sectionOk: string; sectionFail: string }
  | { kind: "gate";    itemId: string; tieneTexto: string; noTieneTexto: string }
  | { kind: "section"; id: string; label: string }
  | { kind: "sound";   src: string; label: string }
  | { kind: "unknown"; parts: string[] };

export function parseSnippetRaw(raw: string | undefined): ParsedSnippet | null {
  if (!raw) return null;

  const inner = raw.startsWith("[[") && raw.endsWith("]]")
    ? raw.slice(2, -2)
    : raw;

  const parts = inner.split("|").map(p => p.trim());
  const kind  = parts[0];

  switch (kind) {
    case "drop":
      // [[drop|palabra|tipo|id|nombre]]
      return { kind: "drop", label: parts[1] ?? "", entidadTipo: parts[2] ?? "", entidadId: parts[3] ?? "" };
    case "img":
      return { kind: "img", url: parts[1] ?? "", alt: parts[2] ?? "", float: false };
    case "float":
      return { kind: "float", url: parts[1] ?? "", alt: parts[2] ?? "", float: true };
    case "choice":
      // [[choice|Texto del botón|sectionId]]
      return { kind: "choice", texto: parts[1] ?? "", target: parts[2] ?? "" };
    case "use":
      // [[use|Palabra|itemId|sectionOk|sectionFail]]
      return { kind: "use", itemId: parts[2] ?? "", label: parts[1] ?? "", sectionOk: parts[3] ?? "", sectionFail: parts[4] ?? "" };
    case "gate":
      return { kind: "gate", itemId: parts[1] ?? "", tieneTexto: parts[2] ?? "", noTieneTexto: parts[3] ?? "" };
    case "section":
      return { kind: "section", id: parts[1] ?? "", label: parts[2] ?? "" };
    case "sound":
      return { kind: "sound", src: parts[1] ?? "", label: parts[2] ?? "" };
    default:
      return { kind: "unknown", parts };
  }
}