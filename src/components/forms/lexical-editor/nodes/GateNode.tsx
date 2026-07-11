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
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $getNodeByKey, DecoratorNode } from "lexical";
import React from "react";
import { DoorOpen } from "lucide-react";

import { snippetEditHandler } from "./sharedTypes";
import { SnippetChip } from "./SnippetChip";

export interface GatePayload {
  itemId: string;
  tieneTexto: string;
  noTieneTexto: string;
  /** id de sección destino si TIENE el ítem — opcional, retrocompatible.
   *  Se serializa como sufijo "-> id" al final del texto de la rama, mismo
   *  formato que consume storyGraph.ts (TARGET_LINE) para armar el grafo. */
  tieneTarget?: string;
  /** id de sección destino si NO TIENE el ítem — opcional. */
  noTieneTarget?: string;
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
  const gateChipText = (() => {
    const base = `Gate: ${payload.itemId.slice(0, 8)}…`;
    if (!payload.tieneTarget && !payload.noTieneTarget) return base;
    // Muestra ambos destinos con flechas cortas: ✓ para la rama "tiene",
    // ✗ para "no tiene". Si una rama no tiene target, se omite (esa rama
    // sigue siendo texto inline, sin salto).
    const partes = [
      payload.tieneTarget ? `✓${payload.tieneTarget}` : null,
      payload.noTieneTarget ? `✗${payload.noTieneTarget}` : null,
    ].filter(Boolean);
    return `${base} → ${partes.join(" ")}`;
  })();

  return (
    <SnippetChip
      icon={<DoorOpen size={10} />}
      maxTextWidth={220}
      text={gateChipText}
      title={
        payload.tieneTarget || payload.noTieneTarget
          ? `Gate — ítem: ${payload.itemId} · tiene→${payload.tieneTarget || "—"} · no→${payload.noTieneTarget || "—"}`
          : `Gate — ítem: ${payload.itemId} — sin destinos, ambas ramas quedan inline`
      }
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
      tieneTarget: s.tieneTarget,
      noTieneTarget: s.noTieneTarget,
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

// Misma regex que TARGET_LINE en storyGraph.ts — debe mantenerse idéntica,
// porque el grafo narrativo parsea el mismo formato de sufijo directamente
// desde el markdown crudo, sin pasar por este módulo.
const TARGET_LINE = /(?:^|\n)\s*->\s*([a-z0-9-]+)\s*$/i;

function splitTargetSuffix(branchText: string): {
  text: string;
  target: string | null;
} {
  const m = TARGET_LINE.exec(branchText);
  if (!m) return { text: branchText.trim(), target: null };
  return { text: branchText.slice(0, m.index).trim(), target: m[1].trim() };
}

export function gateRawToPayload(raw: string): GatePayload | null {
  const m = /^\[\[gate\|([^\|]+)\|([\s\S]*)\]\]$/.exec(raw);
  if (!m) return null;
  const itemId = m[1].trim();
  const contenido = m[2];
  const sepIdx = contenido.indexOf("===");
  const tieneRaw = sepIdx >= 0 ? contenido.slice(0, sepIdx) : contenido;
  const noTieneRaw = sepIdx >= 0 ? contenido.slice(sepIdx + 3) : "";
  const tiene = splitTargetSuffix(tieneRaw);
  const noTiene = splitTargetSuffix(noTieneRaw);
  return {
    itemId,
    tieneTexto: tiene.text,
    noTieneTexto: noTiene.text,
    tieneTarget: tiene.target ?? undefined,
    noTieneTarget: noTiene.target ?? undefined,
  };
}

export function gatePayloadToRaw(p: GatePayload): string {
  const tieneBloque = p.tieneTarget
    ? `${p.tieneTexto}\n-> ${p.tieneTarget}`
    : p.tieneTexto;
  const noTieneBloque = p.noTieneTarget
    ? `${p.noTieneTexto}\n-> ${p.noTieneTarget}`
    : p.noTieneTexto;
  return `[[gate|${p.itemId}|\n${tieneBloque}\n===\n${noTieneBloque}\n]]`;
}
