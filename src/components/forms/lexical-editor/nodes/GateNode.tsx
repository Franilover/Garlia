"use client";
/**
 * GateNode.tsx
 * ────────────
 * Nodo Lexical inline para [[gate|itemId|tieneTexto===noTieneTexto]].
 * Es el snippet más complejo porque contiene sub-texto con markup propio.
 * En el editor se muestra como chip (no anidamos otro editor dentro del gate),
 * al hacer click abre el panel FormGate con sus dos textareas.
 */
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import { $getNodeByKey, DecoratorNode } from "lexical";
import React from "react";

import { SnippetChip } from "./SnippetChip";
import { snippetEditHandler } from "./sharedTypes";

export interface GatePayload {
  itemId: string;
  tieneTexto: string;
  noTieneTexto: string;
}

export type SerializedGateNode = Spread<
  { type: "gate-snippet"; version: 1 } & GatePayload,
  SerializedLexicalNode
>;

function GateChipView({
  payload,
  nodeKey,
  editor,
}: {
  payload: GatePayload;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  return (
    <SnippetChip
      icon="🚪"
      text={`Gate: ${payload.itemId.slice(0, 8)}…`}
      title={`Gate — ítem: ${payload.itemId}`}
      onClick={() =>
        snippetEditHandler.current?.({
          kind: "gate",
          nodeKey,
          payload,
          replace: (next) =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isGateNode(node)) node.setPayload(next);
            }),
          remove: () =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isGateNode(node)) node.remove();
            }),
        })
      }
      onDelete={() =>
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isGateNode(node)) node.remove();
        })
      }
    />
  );
}

export class GateNode extends DecoratorNode<React.ReactNode> {
  __payload: GatePayload;

  static getType(): string {
    return "gate-snippet";
  }

  static clone(node: GateNode): GateNode {
    return new GateNode(node.__payload, node.__key);
  }

  constructor(payload: GatePayload, key?: NodeKey) {
    super(key);
    this.__payload = payload;
  }

  static importJSON(
    serialized: SerializedLexicalNode & Record<string, unknown>,
  ): GateNode {
    const s = serialized as unknown as SerializedGateNode;
    return $createGateNode({
      itemId: s.itemId,
      tieneTexto: s.tieneTexto,
      noTieneTexto: s.noTieneTexto,
    });
  }

  exportJSON(): SerializedGateNode {
    return { ...this.__payload, type: "gate-snippet", version: 1 };
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  setPayload(next: GatePayload): void {
    this.getWritable().__payload = next;
  }

  getPayload(): GatePayload {
    return this.__payload;
  }

  getTextContent(): string {
    return `[gate: ${this.__payload.tieneTexto.slice(0, 20)}]`;
  }

  isInline(): true {
    return true;
  }

  decorate(editor: LexicalEditor): React.ReactNode {
    return (
      <GateChipView editor={editor} nodeKey={this.getKey()} payload={this.__payload} />
    );
  }
}

export function $createGateNode(payload: GatePayload): GateNode {
  return new GateNode(payload);
}

export function $isGateNode(
  node: LexicalNode | null | undefined,
): node is GateNode {
  return node instanceof GateNode;
}

export function gateRawToPayload(raw: string): GatePayload | null {
  const m = /^\[\[gate\|([^\|]+)\|([\s\S]*)\]\]$/.exec(raw);
  if (!m) return null;
  const itemId = m[1].trim();
  const contenido = m[2];
  const sepIdx = contenido.indexOf("===");
  const tieneTexto =
    sepIdx >= 0 ? contenido.slice(0, sepIdx).trim() : contenido.trim();
  const noTieneTexto = sepIdx >= 0 ? contenido.slice(sepIdx + 3).trim() : "";
  return { itemId, tieneTexto, noTieneTexto };
}

export function gatePayloadToRaw(p: GatePayload): string {
  return `[[gate|${p.itemId}|\n${p.tieneTexto}\n===\n${p.noTieneTexto}\n]]`;
}
