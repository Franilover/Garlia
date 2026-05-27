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

// ── Extrae bloques [[gate|...]] completos antes de parsear línea a línea ──────
// Esto evita que la regex inline rompa el contenido multilinea del gate.
// Usa un delimitador === para separar las dos ramas (tiene / no tiene).
//
// Formato:
//   [[gate|itemId|
//   Texto si TIENE el ítem. Puede tener **markdown**, [[choice|...]] etc.
//   ===
//   Texto si NO tiene el ítem.
//   ]]
//
// El parser extrae el bloque completo, parte por ===, y llama a
// parseContenido recursivamente en cada mitad.

function extractGateBlocks(texto: string): {
  resultado: string;
  gates: Map<string, { tieneTexto: string; noTieneTexto: string; itemId: string }>;
} {
  const gates = new Map<string, { tieneTexto: string; noTieneTexto: string; itemId: string }>();
  // Regex que captura [[gate|itemId| ... ]] incluyendo saltos de línea
  // El contenido puede tener cualquier cosa menos otro [[gate (evita anidado por ahora)
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

export function parseContenido(texto: string): Segment[] {
  // Paso 1 — pre-extraer bloques gate multilinea
  const { resultado, gates } = extractGateBlocks(texto);

  // Paso 2 — parsear el resto con la regex inline normal
  const regex = /\[\[(\w+)\|([\s\S]+?)\]\]|\x00GATE_\d+\x00/g;
  const segs: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(resultado)) !== null) {
    // Texto literal antes del match
    if (match.index > lastIndex) {
      segs.push({ type: "text", value: resultado.slice(lastIndex, match.index) });
    }

    const raw = match[0];

    // ¿Es un placeholder de gate?
    if (raw.startsWith("\x00GATE_")) {
      const gate = gates.get(raw);
      if (gate) {
        segs.push({
          type:       "gate",
          itemId:     gate.itemId,
          tieneSegs:  parseContenido(gate.tieneTexto),
          noTieneSegs: parseContenido(gate.noTieneTexto),
        });
      }
      lastIndex = match.index + raw.length;
      continue;
    }

    // Snippet inline normal
    const [, kind, rest] = match;
    const parts = rest.split("|").map((p: string) => p.trim());

    if      (kind === "cita")    segs.push({ type: "cita",    content: parts[0] });
    else if (kind === "img")     segs.push({ type: "img",     url: parts[0], caption: parts[1] });
    else if (kind === "float")   segs.push({ type: "float",   word: parts[0], url: parts[1], caption: parts[2] });
    else if (kind === "sound")   segs.push({ type: "sound",   url: parts[0], volume: parseFloat(parts[1] ?? "0.5") });
    else if (kind === "drop")    segs.push({ type: "drop",    word: parts[0], entidadTipo: parts[1] as "item" | "criatura" | "personaje", entidadId: parts[2], entidadNombre: parts[3] ?? parts[0] });
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