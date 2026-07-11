// ─────────────────────────────────────────────────────────────────────────────
// type.ts
// ─────────────────────────────────────────────────────────────────────────────
// Incluye parseSnippetRaw (antes en parseSnippetRaw.ts) al final del archivo.
// Ya no es necesario importar desde "./parseSnippetRaw" — importar desde "./type".

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de listas / capítulos
// ─────────────────────────────────────────────────────────────────────────────

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
  reinos_ids?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Árbol de archivos
// ─────────────────────────────────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  url: string;
  type: "image";
}
export interface FolderEntry {
  name: string;
  type: "folder";
  children: TreeNode[];
}
export type TreeNode = FileEntry | FolderEntry;

// ─────────────────────────────────────────────────────────────────────────────
// Segmentos de contenido
// ─────────────────────────────────────────────────────────────────────────────

export type Segment =
  | { type: "text"; value: string }
  | { type: "cita"; content: string }
  | { type: "img"; url: string; caption?: string }
  | { type: "float"; word: string; url: string; caption?: string }
  | { type: "sound"; url: string; volume: number }
  | {
      type: "drop";
      word: string;
      entidadTipo: "item" | "criatura" | "personaje";
      entidadId: string;
      entidadNombre: string;
    }
  | { type: "choice"; label: string; target: string }
  | {
      type: "use";
      word: string;
      itemId: string;
      targetSuccess: string;
      targetFail?: string;
    }
  | { type: "section"; id: string; label?: string }
  | {
      type: "gate";
      itemId: string;
      tieneSegs: Segment[];
      noTieneSegs: Segment[];
      /** id de sección destino si TIENE el ítem — opcional. Si está presente,
       *  el lector navega a esa sección en vez de (o después de) renderizar
       *  tieneSegs inline. Mismo formato de sufijo "-> id" que usa el editor. */
      tieneTarget?: string;
      /** id de sección destino si NO TIENE el ítem — opcional. */
      noTieneTarget?: string;
    }
  | {
      type: "flag-set";
      flagId: string;
      /** Valor a guardar. Booleano "true"/"false" o texto libre (ej: "hostil"). */
      valor: string;
    }
  | {
      type: "flag-if";
      flagId: string;
      /** Valor esperado contra el que se compara el flag guardado. */
      valorEsperado: string;
      /** Segmentos/target si el flag guardado === valorEsperado. */
      siSegs: Segment[];
      siTarget?: string;
      /** Segmentos/target si el flag guardado !== valorEsperado (incluye
       *  "nunca se seteó" — se trata como no-match). */
      noSegs: Segment[];
      noTarget?: string;
    };

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

// Misma regex que TARGET_LINE (definida más abajo, usada por el parser del
// editor) — debe mantenerse idéntica, porque acá parseamos el mismo formato
// de sufijo "-> id" directamente desde el markdown crudo del capítulo.
const GATE_TARGET_LINE = /(?:^|\n)\s*->\s*([a-z0-9-]+)\s*$/i;

function splitGateTargetSuffix(branchText: string): {
  text: string;
  target?: string;
} {
  const m = GATE_TARGET_LINE.exec(branchText);
  if (!m) return { text: branchText.trim() };
  return { text: branchText.slice(0, m.index).trim(), target: m[1].trim() };
}

function extractGateBlocks(texto: string): {
  resultado: string;
  gates: Map<
    string,
    {
      tieneTexto: string;
      noTieneTexto: string;
      itemId: string;
      tieneTarget?: string;
      noTieneTarget?: string;
    }
  >;
} {
  const gates = new Map<
    string,
    {
      tieneTexto: string;
      noTieneTexto: string;
      itemId: string;
      tieneTarget?: string;
      noTieneTarget?: string;
    }
  >();
  const gateRegex = /\[\[gate\|([^\|]+)\|([\s\S]+?)\]\]/g;
  let counter = 0;

  const resultado = texto.replace(gateRegex, (_, itemId, contenido) => {
    const separatorIdx = contenido.indexOf("===");
    const tieneRaw =
      separatorIdx >= 0 ? contenido.slice(0, separatorIdx) : contenido;
    const noTieneRaw =
      separatorIdx >= 0 ? contenido.slice(separatorIdx + 3) : "";
    const tiene = splitGateTargetSuffix(tieneRaw);
    const noTiene = splitGateTargetSuffix(noTieneRaw);
    const placeholder = `\x00GATE_${counter}\x00`;
    gates.set(placeholder, {
      itemId: itemId.trim(),
      tieneTexto: tiene.text,
      noTieneTexto: noTiene.text,
      tieneTarget: tiene.target,
      noTieneTarget: noTiene.target,
    });
    counter++;
    return placeholder;
  });

  return { resultado, gates };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractFlagIfBlocks — pre-extrae bloques [[flag|if|...]] multilinea
// ─────────────────────────────────────────────────────────────────────────────
//
// Formato:
//   [[flag|if|flagId|valorEsperado|
//   Texto si el flag guardado === valorEsperado.
//   -> seccion-si (opcional)
//   ===
//   Texto si NO coincide (incluye "nunca se seteó").
//   -> seccion-no (opcional)
//   ]]
//
// [[flag|set|flagId|valor]] es single-line y se resuelve más abajo en
// parseContenido junto a los demás snippets de una línea — no necesita
// pre-extracción porque no tiene cuerpo multilinea con "===".

function extractFlagIfBlocks(texto: string): {
  resultado: string;
  flagIfs: Map<
    string,
    {
      flagId: string;
      valorEsperado: string;
      siTexto: string;
      noTexto: string;
      siTarget?: string;
      noTarget?: string;
    }
  >;
} {
  const flagIfs = new Map<
    string,
    {
      flagId: string;
      valorEsperado: string;
      siTexto: string;
      noTexto: string;
      siTarget?: string;
      noTarget?: string;
    }
  >();
  // "if" en el separador de kind|op distingue este bloque multilinea de
  // [[flag|set|...]], que es single-line y no debe caer en esta regex.
  const flagIfRegex = /\[\[flag\|if\|([^\|]+)\|([^\|]*)\|([\s\S]+?)\]\]/g;
  let counter = 0;

  const resultado = texto.replace(
    flagIfRegex,
    (_, flagId, valorEsperado, contenido) => {
      const separatorIdx = contenido.indexOf("===");
      const siRaw =
        separatorIdx >= 0 ? contenido.slice(0, separatorIdx) : contenido;
      const noRaw =
        separatorIdx >= 0 ? contenido.slice(separatorIdx + 3) : "";
      const si = splitGateTargetSuffix(siRaw);
      const no = splitGateTargetSuffix(noRaw);
      const placeholder = `\x00FLAGIF_${counter}\x00`;
      flagIfs.set(placeholder, {
        flagId: flagId.trim(),
        valorEsperado: valorEsperado.trim(),
        siTexto: si.text,
        noTexto: no.text,
        siTarget: si.target,
        noTarget: no.target,
      });
      counter++;
      return placeholder;
    },
  );

  return { resultado, flagIfs };
}

// ─────────────────────────────────────────────────────────────────────────────
// parseContenido
// ─────────────────────────────────────────────────────────────────────────────

export function parseContenido(texto: string): Segment[] {
  const { resultado: sinGates, gates } = extractGateBlocks(texto);
  const { resultado, flagIfs } = extractFlagIfBlocks(sinGates);

  const regex =
    /\[\[(\w+)\|([\s\S]+?)\]\]|\x00GATE_\d+\x00|\x00FLAGIF_\d+\x00/g;
  const segs: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(resultado)) !== null) {
    if (match.index > lastIndex) {
      segs.push({
        type: "text",
        value: resultado.slice(lastIndex, match.index),
      });
    }

    const raw = match[0];

    if (raw.startsWith("\x00GATE_")) {
      const gate = gates.get(raw);
      if (gate) {
        segs.push({
          type: "gate",
          itemId: gate.itemId,
          tieneSegs: parseContenido(gate.tieneTexto),
          noTieneSegs: parseContenido(gate.noTieneTexto),
          tieneTarget: gate.tieneTarget,
          noTieneTarget: gate.noTieneTarget,
        });
      }
      lastIndex = match.index + raw.length;
      continue;
    }

    if (raw.startsWith("\x00FLAGIF_")) {
      const flagIf = flagIfs.get(raw);
      if (flagIf) {
        segs.push({
          type: "flag-if",
          flagId: flagIf.flagId,
          valorEsperado: flagIf.valorEsperado,
          siSegs: parseContenido(flagIf.siTexto),
          noSegs: parseContenido(flagIf.noTexto),
          siTarget: flagIf.siTarget,
          noTarget: flagIf.noTarget,
        });
      }
      lastIndex = match.index + raw.length;
      continue;
    }

    const [, kind, rest] = match;
    const parts = rest.split("|").map((p: string) => p.trim());

    if (kind === "cita") segs.push({ type: "cita", content: parts[0] });
    else if (kind === "img")
      segs.push({ type: "img", url: parts[0], caption: parts[1] });
    else if (kind === "float")
      segs.push({
        type: "float",
        word: parts[0],
        url: parts[1],
        caption: parts[2],
      });
    else if (kind === "sound")
      segs.push({
        type: "sound",
        url: parts[0],
        volume: parseFloat(parts[1] ?? "0.5"),
      });
    else if (kind === "drop")
      segs.push({
        type: "drop",
        word: parts[0] ?? "",
        entidadTipo: (parts[1] ?? "personaje") as
          | "item"
          | "criatura"
          | "personaje",
        entidadId: parts[2] ?? "",
        entidadNombre: parts[3] ?? parts[0] ?? "",
      });
    else if (kind === "choice")
      segs.push({ type: "choice", label: parts[0], target: parts[1] });
    else if (kind === "section")
      segs.push({ type: "section", id: parts[0], label: parts[1] });
    else if (kind === "flag" && parts[0] === "set")
      segs.push({
        type: "flag-set",
        flagId: parts[1] ?? "",
        valor: parts[2] ?? "",
      });
    else if (kind === "use")
      segs.push({
        type: "use",
        word: parts[0],
        itemId: parts[1],
        targetSuccess: parts[2],
        targetFail: parts[3],
      });
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
  | { kind: "drop"; entidadId: string; entidadTipo: string; label: string }
  | { kind: "img"; url: string; alt: string; float: boolean }
  | { kind: "float"; url: string; alt: string; float: true }
  | { kind: "choice"; texto: string; target: string }
  | {
      kind: "use";
      itemId: string;
      label: string;
      sectionOk: string;
      sectionFail: string;
    }
  | {
      kind: "gate";
      itemId: string;
      tieneTexto: string;
      noTieneTexto: string;
      tieneTarget?: string;
      noTieneTarget?: string;
    }
  | { kind: "section"; id: string; label: string }
  | { kind: "sound"; src: string; label: string }
  | { kind: "flag-set"; flagId: string; valor: string }
  | {
      kind: "flag-if";
      flagId: string;
      valorEsperado: string;
      siTexto: string;
      noTexto: string;
      siTarget?: string;
      noTarget?: string;
    }
  | { kind: "unknown"; parts: string[] };

export function parseSnippetRaw(raw: string | undefined): ParsedSnippet | null {
  if (!raw) return null;

  const inner =
    raw.startsWith("[[") && raw.endsWith("]]") ? raw.slice(2, -2) : raw;

  const parts = inner.split("|").map((p) => p.trim());
  const kind = parts[0];

  switch (kind) {
    case "drop":
      // [[drop|palabra|tipo|id|nombre]]
      return {
        kind: "drop",
        label: parts[1] ?? "",
        entidadTipo: parts[2] ?? "",
        entidadId: parts[3] ?? "",
      };
    case "img":
      return {
        kind: "img",
        url: parts[1] ?? "",
        alt: parts[2] ?? "",
        float: false,
      };
    case "float":
      return {
        kind: "float",
        url: parts[1] ?? "",
        alt: parts[2] ?? "",
        float: true,
      };
    case "choice":
      // [[choice|Texto del botón|sectionId]]
      return { kind: "choice", texto: parts[1] ?? "", target: parts[2] ?? "" };
    case "use":
      // [[use|Palabra|itemId|sectionOk|sectionFail]]
      return {
        kind: "use",
        itemId: parts[2] ?? "",
        label: parts[1] ?? "",
        sectionOk: parts[3] ?? "",
        sectionFail: parts[4] ?? "",
      };
    case "gate": {
      // El split naive por "|" no sirve acá: el cuerpo del gate usa "===" como
      // separador entre ramas y puede contener texto libre. Re-derivamos del
      // raw completo, igual que gateRawToPayload en GateNode.tsx.
      const gm = /^\[\[gate\|([^\|]+)\|([\s\S]*)\]\]$/.exec(raw);
      if (!gm) return { kind: "gate", itemId: "", tieneTexto: "", noTieneTexto: "" };
      const itemId = gm[1].trim();
      const contenido = gm[2];
      const sepIdx = contenido.indexOf("===");
      const tieneRaw = sepIdx >= 0 ? contenido.slice(0, sepIdx) : contenido;
      const noTieneRaw = sepIdx >= 0 ? contenido.slice(sepIdx + 3) : "";
      const targetLine = /(?:^|\n)\s*->\s*([a-z0-9-]+)\s*$/i;
      const splitTarget = (branch: string) => {
        const tm = targetLine.exec(branch);
        if (!tm) return { text: branch.trim(), target: undefined as string | undefined };
        return { text: branch.slice(0, tm.index).trim(), target: tm[1].trim() };
      };
      const tiene = splitTarget(tieneRaw);
      const noTiene = splitTarget(noTieneRaw);
      return {
        kind: "gate",
        itemId,
        tieneTexto: tiene.text,
        noTieneTexto: noTiene.text,
        tieneTarget: tiene.target,
        noTieneTarget: noTiene.target,
      };
    }
    case "section":
      return { kind: "section", id: parts[1] ?? "", label: parts[2] ?? "" };
    case "sound":
      return { kind: "sound", src: parts[1] ?? "", label: parts[2] ?? "" };
    case "flag": {
      // [[flag|set|flagId|valor]] — single-line, split naive alcanza.
      if (parts[1] === "set") {
        return {
          kind: "flag-set",
          flagId: parts[2] ?? "",
          valor: parts[3] ?? "",
        };
      }
      // [[flag|if|flagId|valorEsperado|\nsiTexto\n===\nnoTexto\n]] — igual
      // que gate, el cuerpo puede tener "|" y "===" libres, así que
      // re-derivamos del raw completo en vez de confiar en el split naive.
      const fm =
        /^\[\[flag\|if\|([^\|]+)\|([^\|]*)\|([\s\S]*)\]\]$/.exec(raw);
      if (!fm)
        return {
          kind: "flag-if",
          flagId: "",
          valorEsperado: "",
          siTexto: "",
          noTexto: "",
        };
      const flagId = fm[1].trim();
      const valorEsperado = fm[2].trim();
      const contenido = fm[3];
      const sepIdx = contenido.indexOf("===");
      const siRaw = sepIdx >= 0 ? contenido.slice(0, sepIdx) : contenido;
      const noRaw = sepIdx >= 0 ? contenido.slice(sepIdx + 3) : "";
      const targetLine = /(?:^|\n)\s*->\s*([a-z0-9-]+)\s*$/i;
      const splitTarget = (branch: string) => {
        const tm = targetLine.exec(branch);
        if (!tm)
          return { text: branch.trim(), target: undefined as string | undefined };
        return { text: branch.slice(0, tm.index).trim(), target: tm[1].trim() };
      };
      const si = splitTarget(siRaw);
      const no = splitTarget(noRaw);
      return {
        kind: "flag-if",
        flagId,
        valorEsperado,
        siTexto: si.text,
        noTexto: no.text,
        siTarget: si.target,
        noTarget: no.target,
      };
    }
    default:
      return { kind: "unknown", parts };
  }
}
