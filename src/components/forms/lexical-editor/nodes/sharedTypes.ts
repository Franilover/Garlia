/**
 * sharedTypes.ts
 * ──────────────
 * Tipos y helpers compartidos entre todos los SnippetNode (drop, img, float,
 * sound, choice, use, gate, section). Cada nodo vive en su propio archivo
 * pero todos siguen el mismo contrato:
 *
 *   - $createXNode(payload)        → crea el nodo
 *   - $isXNode(node)                → type guard
 *   - xRawToPayload(raw)            → string "[[x|...]]" → payload
 *   - xPayloadToRaw(payload)        → payload → string "[[x|...]]"
 *
 * Esto permite que el editor principal (RichEditor.tsx) y el serializador
 * (richTextSerializer.ts) traten a todos los tipos de forma genérica.
 */

export type SnippetKind =
  | "drop"
  | "img"
  | "float"
  | "sound"
  | "choice"
  | "use"
  | "gate"
  | "flag"
  | "section";

/** Editor handler global: cada nodo decorador llama a esto al hacer click
 *  para abrir el panel de edición correspondiente (SnippetCommandPalette). */
export interface SnippetEditRequest<TPayload> {
  kind: SnippetKind;
  nodeKey: string;
  payload: TPayload;
  replace: (next: TPayload) => void;
  remove: () => void;
}

export type SnippetEditHandler = (req: SnippetEditRequest<any>) => void;

/** Registro global simple — se setea una vez desde RichEditor.tsx.
 *  Lexical DecoratorNode no soporta pasar props por el árbol de nodos,
 *  así que este es el punto de inyección del callback de edición. */
export const snippetEditHandler: { current: SnippetEditHandler | null } = {
  current: null,
};

/** Parsea las partes de un raw "[[kind|a|b|c]]", sin el kind. */
export function splitSnippetParts(raw: string): string[] {
  const inner = raw.startsWith("[[") && raw.endsWith("]]") ? raw.slice(2, -2) : raw;
  const parts = inner.split("|").map((p) => p.trim());
  return parts.slice(1); // descarta parts[0] que es el kind
}

export function getSnippetKind(raw: string): string {
  const inner = raw.startsWith("[[") && raw.endsWith("]]") ? raw.slice(2, -2) : raw;
  return inner.split("|")[0]?.trim() ?? "";
}

/** Regex que detecta cualquier snippet [[kind|...]] (no multilinea, los
 *  gate multilinea se manejan aparte con extractGateBlocks, igual que en
 *  tu type.ts actual). */
export const SNIPPET_REGEX = /\[\[(\w+)\|[^\]]*\]\]/g;

/** Regex específico para gate multilinea, igual al de tu type.ts actual. */
export const GATE_REGEX = /\[\[gate\|([^\|]+)\|([\s\S]+?)\]\]/g;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Estilo base compartido por todos los chips inline (drop, sound, etc). */
export const chipBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "0 6px 0 5px",
  height: 19,
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "var(--font-sans,system-ui)",
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
  verticalAlign: "middle",
  transition: "background .12s",
};

export function chipColorStyle(hovered: boolean): React.CSSProperties {
  return {
    background: hovered
      ? "color-mix(in srgb, var(--color-primary, var(--primary)) 18%, transparent)"
      : "color-mix(in srgb, var(--color-primary, var(--primary)) 9%, transparent)",
    border:
      "1px solid color-mix(in srgb, var(--color-primary, var(--primary)) 28%, transparent)",
    color: "var(--color-primary, var(--primary))",
  };
}

export const chipDotStyle: React.CSSProperties = {
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: "var(--color-primary, var(--primary))",
  opacity: 0.7,
  flexShrink: 0,
};

export const chipDeleteBtnStyle: React.CSSProperties = {
  marginLeft: 2,
  background: "none",
  border: "none",
  padding: "1px 2px",
  cursor: "pointer",
  color: "inherit",
  opacity: 0.65,
  fontSize: 12,
  lineHeight: 1,
  borderRadius: 3,
};
