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

import { $createChoiceNode, $isChoiceNode, choicePayloadToRaw, choiceRawToPayload } from "./nodes/ChoiceNode";
import { $createDropNode, $isDropNode, dropPayloadToRaw, dropRawToPayload } from "./nodes/DropNode";
import { $createGateNode, $isGateNode, gatePayloadToRaw, gateRawToPayload } from "./nodes/GateNode";
import { $createImgNode, $isImgNode, imgPayloadToRaw, imgRawToPayload } from "./nodes/ImgNode";
import { $createSectionNode, $isSectionNode, sectionPayloadToRaw, sectionRawToPayload } from "./nodes/SectionNode";
import { $createSoundNode, $isSoundNode, soundPayloadToRaw, soundRawToPayload } from "./nodes/SoundNode";
import { $createUseNode, $isUseNode, usePayloadToRaw, useRawToPayload } from "./nodes/UseNode";

// ─────────────────────────────────────────────────────────────────────────────
// Regex de detección de snippets
// Los gate son multilinea, los demás son single-line
// ─────────────────────────────────────────────────────────────────────────────

const GATE_RE = /\[\[gate\|[^\|]+\|[\s\S]+?\]\]/g;
const SNIPPET_RE = /\[\[(?:drop|img|float|sound|choice|use|section|cita)[^\]]*\]\]/g;

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
    default:
      return $createTextNode(raw);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DESERIALIZAR: raw string → árbol Lexical
// Llama a esto dentro de editor.update(() => { rawTextToLexicalTree(text); })
// ─────────────────────────────────────────────────────────────────────────────

export function rawTextToLexicalTree(raw: string): void {
  const root = $getRoot();
  root.clear();

  // Pre-procesamos gate multilinea primero (igual que extractGateBlocks en type.ts)
  const gates = new Map<string, string>();
  let counter = 0;
  const withGatePlaceholders = raw.replace(GATE_RE, (match) => {
    const key = `\x00GATE${counter++}\x00`;
    gates.set(key, match);
    return key;
  });

  // Dividimos por líneas para crear párrafos
  const lines = withGatePlaceholders.split("\n");

  for (const line of lines) {
    const paragraph = $createParagraphNode();
    root.append(paragraph);

    // En cada línea, separamos texto plano de snippets inline
    const combined = new RegExp(
      `\x00GATE\\d+\x00|${SNIPPET_RE.source}`,
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

export function serializeRootToRaw(): string {
  const root = $getRoot();
  const lines: string[] = [];

  function walkNode(node: LexicalNode): string {
    if ($isDropNode(node))    return dropPayloadToRaw(node.getPayload());
    if ($isImgNode(node))     return imgPayloadToRaw(node.getPayload());
    if ($isSoundNode(node))   return soundPayloadToRaw(node.getPayload());
    if ($isChoiceNode(node))  return choicePayloadToRaw(node.getPayload());
    if ($isUseNode(node))     return usePayloadToRaw(node.getPayload());
    if ($isGateNode(node))    return gatePayloadToRaw(node.getPayload());
    if ($isSectionNode(node)) return sectionPayloadToRaw(node.getPayload());

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
