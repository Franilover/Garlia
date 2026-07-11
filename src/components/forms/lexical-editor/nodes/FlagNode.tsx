"use client";
/**
 * FlagNode.tsx
 * ────────────
 * Nodo Lexical inline para el sistema de flags narrativos. Cubre dos
 * variantes bajo un mismo nodo (como gate cubre tiene/no-tiene):
 *
 *   - "set": [[flag|set|flagId|valor]] — escribe flagId=valor cuando el
 *     lector pasa por ahí. Single-line, no navega, no tiene ramas.
 *   - "if":  [[flag|if|flagId|valorEsperado|
 *            Texto si coincide.
 *            -> target-si (opcional)
 *            ===
 *            Texto si NO coincide (incluye "nunca se seteó").
 *            -> target-no (opcional)
 *            ]]
 *     Multilinea, igual forma que gate: compara el valor guardado contra
 *     valorEsperado en vez de "¿tiene este item?".
 *
 * `valor`/`valorEsperado` son texto libre — "true"/"false" para el caso
 * booleano, o cualquier string (ej. "hostil") para el caso de texto libre.
 */
import type {
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $getNodeByKey, DecoratorNode } from "lexical";
import React from "react";
import { Flag } from "lucide-react";

import { snippetEditHandler } from "./sharedTypes";
import { SnippetChip } from "./SnippetChip";

export interface FlagPayload {
  op: "set" | "if";
  flagId: string;
  /** Usado solo por "set": el valor a guardar. */
  valor?: string;
  /** Usado solo por "if": el valor contra el que se compara. */
  valorEsperado?: string;
  /** Usado solo por "if": texto de la rama si coincide. */
  siTexto?: string;
  /** Usado solo por "if": texto de la rama si NO coincide. */
  noTexto?: string;
  /** Usado solo por "if": sección destino si coincide — opcional. */
  siTarget?: string;
  /** Usado solo por "if": sección destino si NO coincide — opcional. */
  noTarget?: string;
}

export type SerializedFlagNode = Spread<
  { type: "flag-snippet"; version: 1 } & FlagPayload,
  SerializedLexicalNode
>;

function FlagChipView({
  payload,
  nodeKey,
  editor,
}: {
  payload: FlagPayload;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const flagChipText = (() => {
    if (payload.op === "set") {
      return `Flag: ${payload.flagId} = ${payload.valor || "(vacío)"}`;
    }
    const base = `Flag: ${payload.flagId}=${payload.valorEsperado || "?"}`;
    if (!payload.siTarget && !payload.noTarget) return base;
    const partes = [
      payload.siTarget ? `✓${payload.siTarget}` : null,
      payload.noTarget ? `✗${payload.noTarget}` : null,
    ].filter(Boolean);
    return `${base} → ${partes.join(" ")}`;
  })();

  const title =
    payload.op === "set"
      ? `Setea flag "${payload.flagId}" = "${payload.valor || ""}" al pasar por acá`
      : payload.siTarget || payload.noTarget
        ? `Si ${payload.flagId}=${payload.valorEsperado} → ${payload.siTarget || "—"} · si no → ${payload.noTarget || "—"}`
        : `Si ${payload.flagId}=${payload.valorEsperado} — sin destinos, ambas ramas quedan inline`;

  return (
    <SnippetChip
      icon={<Flag size={10} />}
      maxTextWidth={220}
      text={flagChipText}
      title={title}
      onClick={() =>
        snippetEditHandler.current?.({
          kind: "flag",
          nodeKey,
          payload,
          replace: (next) =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isFlagNode(node)) node.setPayload(next);
            }),
          remove: () =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isFlagNode(node)) node.remove();
            }),
        })
      }
      onDelete={() =>
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isFlagNode(node)) node.remove();
        })
      }
    />
  );
}

export class FlagNode extends DecoratorNode<React.ReactNode> {
  __payload: FlagPayload;

  static getType(): string {
    return "flag-snippet";
  }

  static clone(node: FlagNode): FlagNode {
    return new FlagNode(node.__payload, node.__key);
  }

  constructor(payload: FlagPayload, key?: NodeKey) {
    super(key);
    this.__payload = payload;
  }

  static importJSON(
    serialized: SerializedLexicalNode & Record<string, unknown>,
  ): FlagNode {
    const s = serialized as unknown as SerializedFlagNode;
    return $createFlagNode({
      op: s.op,
      flagId: s.flagId,
      valor: s.valor,
      valorEsperado: s.valorEsperado,
      siTexto: s.siTexto,
      noTexto: s.noTexto,
      siTarget: s.siTarget,
      noTarget: s.noTarget,
    });
  }

  exportJSON(): SerializedFlagNode {
    return { ...this.__payload, type: "flag-snippet", version: 1 };
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  setPayload(next: FlagPayload): void {
    this.getWritable().__payload = next;
  }

  getPayload(): FlagPayload {
    return this.__payload;
  }

  getTextContent(): string {
    return `[flag: ${this.__payload.flagId}]`;
  }

  isInline(): true {
    return true;
  }

  decorate(editor: LexicalEditor): React.ReactNode {
    return (
      <FlagChipView editor={editor} nodeKey={this.getKey()} payload={this.__payload} />
    );
  }
}

export function $createFlagNode(payload: FlagPayload): FlagNode {
  return new FlagNode(payload);
}

export function $isFlagNode(
  node: LexicalNode | null | undefined,
): node is FlagNode {
  return node instanceof FlagNode;
}

// Misma regex que TARGET_LINE en storyGraph.ts/GateNode.tsx — debe
// mantenerse idéntica en los tres lugares, porque el grafo narrativo
// parsea el mismo formato de sufijo directamente desde el markdown crudo.
const TARGET_LINE = /(?:^|\n)\s*->\s*([a-z0-9-]+)\s*$/i;

function splitTargetSuffix(branchText: string): {
  text: string;
  target: string | null;
} {
  const m = TARGET_LINE.exec(branchText);
  if (!m) return { text: branchText.trim(), target: null };
  return { text: branchText.slice(0, m.index).trim(), target: m[1].trim() };
}

export function flagRawToPayload(raw: string): FlagPayload | null {
  // [[flag|set|flagId|valor]] — single-line.
  const setMatch = /^\[\[flag\|set\|([^\|]*)\|([^\]]*)\]\]$/.exec(raw);
  if (setMatch) {
    return { op: "set", flagId: setMatch[1].trim(), valor: setMatch[2].trim() };
  }
  // [[flag|if|flagId|valorEsperado|...===...]] — multilinea, mismo patrón
  // que gateRawToPayload: el cuerpo puede contener "|" y "===" libres.
  const ifMatch =
    /^\[\[flag\|if\|([^\|]+)\|([^\|]*)\|([\s\S]*)\]\]$/.exec(raw);
  if (!ifMatch) return null;
  const flagId = ifMatch[1].trim();
  const valorEsperado = ifMatch[2].trim();
  const contenido = ifMatch[3];
  const sepIdx = contenido.indexOf("===");
  const siRaw = sepIdx >= 0 ? contenido.slice(0, sepIdx) : contenido;
  const noRaw = sepIdx >= 0 ? contenido.slice(sepIdx + 3) : "";
  const si = splitTargetSuffix(siRaw);
  const no = splitTargetSuffix(noRaw);
  return {
    op: "if",
    flagId,
    valorEsperado,
    siTexto: si.text,
    noTexto: no.text,
    siTarget: si.target ?? undefined,
    noTarget: no.target ?? undefined,
  };
}

export function flagPayloadToRaw(p: FlagPayload): string {
  if (p.op === "set") {
    return `[[flag|set|${p.flagId}|${p.valor ?? ""}]]`;
  }
  const siBloque = p.siTarget
    ? `${p.siTexto ?? ""}\n-> ${p.siTarget}`
    : (p.siTexto ?? "");
  const noBloque = p.noTarget
    ? `${p.noTexto ?? ""}\n-> ${p.noTarget}`
    : (p.noTexto ?? "");
  return `[[flag|if|${p.flagId}|${p.valorEsperado ?? ""}|\n${siBloque}\n===\n${noBloque}\n]]`;
}
