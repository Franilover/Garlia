/**
 * richTextSerializer.ts
 * ─────────────────────
 * Serialización BIDIRECCIONAL entre:
 *   - string raw con [[kind|...]] (lo que guardas en Supabase)
 *   - árbol de nodos Lexical (lo que vive en el editor en runtime)
 *
 * DESERIALIZAR (cargar): rawTextToEditorNodes()
 *   Se llama una vez al montar el editor con el contenido guardado.
 *   Parsea el string, detecta cada [[kind|...]] y crea el nodo Lexical
 *   correspondiente. El resto del texto queda como TextNode normal.
 *
 * SERIALIZAR (guardar): serializeRootToRaw()
 *   Se llama antes de mandar el contenido a Supabase.
 *   Recorre el árbol de nodos y reconstruye el string con [[kind|...]].
 *   El resultado es IDÉNTICO al formato actual — parseContenido() y
 *   SegmentRenderers (render de lectura) no cambian nada.
 *
 * Nodos soportados: drop, img, float, sound, choice, use, gate, section
 * (El nodo "cita" no es un snippet con modal — es markup puro [[cita|...]]
 *  que se maneja como TextNode y se renderiza en la vista de lectura.)
 */
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
  LexicalEditor,
  LexicalNode,
} from "lexical";
import { $isTableNode, $isTableRowNode, $isTableCellNode, $createTableNodeWithDimensions } from "@lexical/table";

import { $createChoiceNode, $isChoiceNode, choicePayloadToRaw, choiceRawToPayload } from "./nodes/ChoiceNode";
import { $createDropNode, $isDropNode, dropPayloadToRaw, dropRawToPayload } from "./nodes/DropNode";
import { $createGateNode, $isGateNode, gatePayloadToRaw, gateRawToPayload } from "./nodes/GateNode";
import { $createImgNode, $isImgNode, imgPayloadToRaw, imgRawToPayload } from "./nodes/ImgNode";
import { $createSectionNode, $isSectionNode, sectionPayloadToRaw, sectionRawToPayload } from "./nodes/SectionNode";
import { $createSoundNode, $isSoundNode, soundPayloadToRaw, soundRawToPayload } from "./nodes/SoundNode";
import { $createUseNode, $isUseNode, usePayloadToRaw, useRawToPayload } from "./nodes/UseNode";
import { $createWikilinkNode, $isWikilinkNode, wikilinkPayloadToRaw, wikilinkRawToPayload } from "./nodes/WikilinkNode";

// ─────────────────────────────────────────────────────────────────────────────
// Regex de detección de snippets
// Los gate son multilinea, los demás son single-line
// ─────────────────────────────────────────────────────────────────────────────

const GATE_RE = /\[\[gate\|[^\|]+\|[\s\S]+?\]\]/g;
const SNIPPET_RE = /\[\[(?:drop|img|float|sound|choice|use|section|cita)[^\]]*\]\]/g;
// Wikilinks: [[Nombre]] SIN "kind|" — debe evaluarse por separado porque
// no calza con el patrón "[[palabra|...]]" de los demás snippets. Excluye
// explícitamente los kind conocidos para no capturar snippets malformados
// como si fueran wikilinks.
const WIKILINK_RE = /\[\[(?!(?:drop|img|float|sound|choice|use|section|cita|gate)\|)([^\[\]|]+)\]\]/g;

// ─────────────────────────────────────────────────────────────────────────────
// Convierte un raw [[kind|...]] string → LexicalNode
// ─────────────────────────────────────────────────────────────────────────────

export function rawSnippetToNode(raw: string): LexicalNode | null {
  const inner = raw.startsWith("[[") && raw.endsWith("]]") ? raw.slice(2, -2) : raw;
  const kind = inner.split("|")[0]?.trim();

  switch (kind) {
    case "drop": {
      const p = dropRawToPayload(raw);
      return p ? $createDropNode(p) : null;
    }
    case "img": {
      const p = imgRawToPayload(raw);
      return p ? $createImgNode(p) : null;
    }
    case "float": {
      const p = imgRawToPayload(raw);
      return p ? $createImgNode(p) : null;
    }
    case "sound": {
      const p = soundRawToPayload(raw);
      return p ? $createSoundNode(p) : null;
    }
    case "choice": {
      const p = choiceRawToPayload(raw);
      return p ? $createChoiceNode(p) : null;
    }
    case "use": {
      const p = useRawToPayload(raw);
      return p ? $createUseNode(p) : null;
    }
    case "gate": {
      const p = gateRawToPayload(raw);
      return p ? $createGateNode(p) : null;
    }
    case "section": {
      const p = sectionRawToPayload(raw);
      return p ? $createSectionNode(p) : null;
    }
    // "cita" queda como texto plano — se maneja solo en lectura
    default: {
      // Los wikilinks no tienen "kind|" así que caen acá — reintentamos
      // como wikilink antes de rendirnos a texto plano.
      const wp = wikilinkRawToPayload(raw);
      if (wp) return $createWikilinkNode(wp);
      return $createTextNode(raw);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DESERIALIZAR: raw string → árbol Lexical
// Llama a esto dentro de editor.update(() => { rawTextToLexicalTree(text); })
// ─────────────────────────────────────────────────────────────────────────────

// Detecta un bloque de tabla markdown: línea "| ... |", seguida de línea
// separadora "|---|---|", seguida de N líneas de datos. Igual criterio que
// parseTableMd/tableRegex del MarkdownEditor.tsx original.
const TABLE_BLOCK_RE = /^(\|.+\|)\n(\|[-: |]+\|)\n((?:\|.+\|\n?)*)/;

function parseTableBlock(block: string): string[][] {
  const lines = block.split("\n").filter((l) => l.trim());
  const parseRow = (row: string) =>
    row.trim().split("|").slice(1, -1).map((c) => c.trim());
  const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
  return lines.filter((l) => !isSep(l)).map(parseRow);
}

export function rawTextToLexicalTree(raw: string): void {
  const root = $getRoot();
  root.clear();

  // Pre-procesamos gate multilinea primero (igual que extractGateBlocks en type.ts)
  const gates = new Map<string, string>();
  let gateCounter = 0;
  const withGatePlaceholders = raw.replace(GATE_RE, (match) => {
    const key = `\x00GATE${gateCounter++}\x00`;
    gates.set(key, match);
    return key;
  });

  // Pre-procesamos bloques de tabla: los sacamos del flujo línea por línea
  // y los reemplazamos por un placeholder que se resuelve a TableNode real
  // después — una tabla no es una línea, es un bloque multilinea con su
  // propia estructura de filas/celdas.
  const tables = new Map<string, string[][]>();
  let tableCounter = 0;
  const withPlaceholders = withGatePlaceholders.replace(
    new RegExp(TABLE_BLOCK_RE.source, "gm"),
    (match) => {
      const key = `\x00TABLE${tableCounter++}\x00`;
      tables.set(key, parseTableBlock(match));
      return key;
    },
  );

  // Dividimos por líneas para crear párrafos
  const lines = withPlaceholders.split("\n");

  for (const line of lines) {
    const tableMatch = /^\x00TABLE(\d+)\x00$/.exec(line.trim());
    if (tableMatch) {
      const rows = tables.get(`\x00TABLE${tableMatch[1]}\x00`);
      if (rows && rows.length) {
        const tableNode = $createTableNodeWithDimensions(
          rows.length,
          Math.max(...rows.map((r) => r.length)),
          true,
        );
        // Rellenamos el contenido celda por celda sobre el esqueleto que
        // $createTableNodeWithDimensions ya generó (celdas vacías).
        const rowNodes: LexicalNode[] = (tableNode as any).getChildren?.() ?? [];
        rowNodes.forEach((rowNode, ri) => {
          if (!$isTableRowNode(rowNode)) return;
          const cellNodes: LexicalNode[] = (rowNode as any).getChildren?.() ?? [];
          cellNodes.forEach((cellNode, ci) => {
            if (!$isTableCellNode(cellNode)) return;
            const text = rows[ri]?.[ci] ?? "";
            if (!text) return;
            const p = (cellNode as any).getChildren?.()[0];
            if (p && typeof p.append === "function") {
              p.append($createTextNode(text));
            }
          });
        });
        root.append(tableNode as any);
      }
      continue;
    }

    const paragraph = $createParagraphNode();
    root.append(paragraph);

    // En cada línea, separamos texto plano de snippets inline.
    // WIKILINK_RE va después de SNIPPET_RE en la alternancia para que
    // los snippets con "kind|" tengan prioridad de match — evita que un
    // "[[choice|..." roto se interprete parcialmente como wikilink.
    const combined = new RegExp(
      `\x00GATE\\d+\x00|${SNIPPET_RE.source}|${WIKILINK_RE.source}`,
      "g",
    );
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = combined.exec(line)) !== null) {
      if (match.index > lastIndex) {
        paragraph.append($createTextNode(line.slice(lastIndex, match.index)));
      }

      const token = match[0];
      // Recuperar raw del gate si era placeholder
      const rawToken = token.startsWith("\x00GATE")
        ? gates.get(token) ?? token
        : token;

      const node = rawSnippetToNode(rawToken);
      if (node) paragraph.append(node);

      lastIndex = match.index + token.length;
    }

    if (lastIndex < line.length) {
      paragraph.append($createTextNode(line.slice(lastIndex)));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZAR: árbol Lexical → raw string
// Llama a esto dentro de editor.read(() => { const raw = serializeRootToRaw(); })
// ─────────────────────────────────────────────────────────────────────────────

// Serializa una TableNode a markdown pipe-table: "| a | b |\n|---|---|\n|c|d|"
// — mismo formato que generaba serializeTableMd() en MarkdownEditor.tsx,
// para que parseContenido()/renderMarkdown() del lado de lectura no
// necesiten ningún cambio.
function serializeTableNode(tableNode: LexicalNode, walkInline: (n: LexicalNode) => string): string {
  const rowNodes: LexicalNode[] = (tableNode as any).getChildren?.() ?? [];
  const rows: string[][] = rowNodes
    .filter((r) => $isTableRowNode(r))
    .map((row) => {
      const cellNodes: LexicalNode[] = (row as any).getChildren?.() ?? [];
      return cellNodes
        .filter((c) => $isTableCellNode(c))
        .map((cell) => {
          const cellChildren: LexicalNode[] = (cell as any).getChildren?.() ?? [];
          return cellChildren.map(walkInline).join("").trim();
        });
    });

  if (!rows.length) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => [...r, ...Array(cols - r.length).fill("")]);
  const formatRow = (r: string[]) => "| " + r.join(" | ") + " |";
  const sep = "| " + Array(cols).fill("---").join(" | ") + " |";
  return [formatRow(padded[0]), sep, ...padded.slice(1).map(formatRow)].join("\n");
}

export function serializeRootToRaw(): string {
  const root = $getRoot();
  const lines: string[] = [];

  function walkNode(node: LexicalNode): string {
    if ($isDropNode(node))     return dropPayloadToRaw(node.getPayload());
    if ($isImgNode(node))      return imgPayloadToRaw(node.getPayload());
    if ($isSoundNode(node))    return soundPayloadToRaw(node.getPayload());
    if ($isChoiceNode(node))   return choicePayloadToRaw(node.getPayload());
    if ($isUseNode(node))      return usePayloadToRaw(node.getPayload());
    if ($isGateNode(node))     return gatePayloadToRaw(node.getPayload());
    if ($isSectionNode(node))  return sectionPayloadToRaw(node.getPayload());
    if ($isWikilinkNode(node)) return wikilinkPayloadToRaw(node.getPayload());
    if ($isTableNode(node))    return serializeTableNode(node, walkNode);

    if (node.getType() === "text") {
      return (node as any).getTextContent();
    }

    // Para párrafos y otros nodos contenedores, concatenamos sus hijos
    const children: LexicalNode[] = (node as any).getChildren?.() ?? [];
    return children.map(walkNode).join("");
  }

  const rootChildren: LexicalNode[] = (root as any).getChildren();
  for (const child of rootChildren) {
    if (child.getType() === "paragraph") {
      const children: LexicalNode[] = (child as any).getChildren?.() ?? [];
      lines.push(children.map(walkNode).join(""));
    } else if ($isTableNode(child)) {
      // La tabla es su propio bloque — no se mezcla con el join("\n") de
      // párrafos porque ya contiene sus propios saltos de línea internos.
      lines.push(walkNode(child));
    } else {
      lines.push(walkNode(child));
    }
  }

  return lines.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper para insertar un snippet en la posición del cursor actual
// ─────────────────────────────────────────────────────────────────────────────

export function insertSnippetNode(raw: string): void {
  const node = rawSnippetToNode(raw);
  if (node) $insertNodes([node]);
}
