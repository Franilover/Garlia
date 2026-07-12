"use client";
/**
 * SectionNode.tsx
 * ───────────────
 * Nodo Lexical inline para [[section|id|label]].
 * Ancla/destino al que apuntan los ChoiceNode.
 */
import type {
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $getNodeByKey, $getRoot, DecoratorNode } from "lexical";
import React from "react";
import { Bookmark } from "lucide-react";

import { snippetEditHandler, useKnownSectionIdsVersion } from "./sharedTypes";
import { SnippetChip } from "./SnippetChip";

export interface SectionPayload {
  id: string;
  label?: string;
}

export type SerializedSectionNode = Spread<
  { type: "section-snippet"; version: 1 } & SectionPayload,
  SerializedLexicalNode
>;

function SectionChipView({
  payload,
  nodeKey,
  editor,
}: {
  payload: SectionPayload;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  useKnownSectionIdsVersion();
  const [refCount, setRefCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    editor.getEditorState().read(() => {
      let count = 0;
      const rootNode = $getRoot();
      const visit = (node: any) => {
        const type = node.getType?.();
        if (type === "choice-snippet") {
          const p = node.getPayload?.();
          if (p?.target === payload.id) count++;
        } else if (type === "use-snippet") {
          const p = node.getPayload?.();
          if (p?.sectionOk === payload.id || p?.sectionFail === payload.id) count++;
        } else if (type === "condicion-snippet") {
          const p = node.getPayload?.();
          if (p?.siTarget === payload.id || p?.noTarget === payload.id) count++;
        }
        const children = node.getChildren?.();
        if (children) children.forEach(visit);
      };
      visit(rootNode);
      setRefCount(count);
    });
  });

  return (
    <SnippetChip
      icon={<Bookmark size={10} />}
      text={
        refCount !== null
          ? `${payload.label ?? payload.id} · ${refCount} ref${refCount === 1 ? "" : "s"}`
          : (payload.label ?? payload.id)
      }
      title={`Sección — id: ${payload.id}`}
      onClick={() =>
        snippetEditHandler.current?.({
          kind: "section",
          nodeKey,
          payload,
          replace: (next) =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isSectionNode(node)) node.setPayload(next);
            }),
          remove: () =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isSectionNode(node)) node.remove();
            }),
        })
      }
      onDelete={() =>
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isSectionNode(node)) node.remove();
        })
      }
    />
  );
}

export class SectionNode extends DecoratorNode<React.ReactNode> {
  __payload: SectionPayload;

  static getType(): string {
    return "section-snippet";
  }

  static clone(node: SectionNode): SectionNode {
    return new SectionNode(node.__payload, node.__key);
  }

  constructor(payload: SectionPayload, key?: NodeKey) {
    super(key);
    this.__payload = payload;
  }

  static importJSON(
    serialized: SerializedLexicalNode & Record<string, unknown>,
  ): SectionNode {
    const s = serialized as unknown as SerializedSectionNode;
    return $createSectionNode({ id: s.id, label: s.label });
  }

  exportJSON(): SerializedSectionNode {
    return { ...this.__payload, type: "section-snippet", version: 1 };
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  setPayload(next: SectionPayload): void {
    this.getWritable().__payload = next;
  }

  getPayload(): SectionPayload {
    return this.__payload;
  }

  getTextContent(): string {
    return `[§${this.__payload.id}]`;
  }

  isInline(): true {
    return true;
  }

  decorate(editor: LexicalEditor): React.ReactNode {
    return (
      <SectionChipView editor={editor} nodeKey={this.getKey()} payload={this.__payload} />
    );
  }
}

export function $createSectionNode(payload: SectionPayload): SectionNode {
  return new SectionNode(payload);
}

export function $isSectionNode(
  node: LexicalNode | null | undefined,
): node is SectionNode {
  return node instanceof SectionNode;
}

export function sectionRawToPayload(raw: string): SectionPayload | null {
  const inner = raw.startsWith("[[") && raw.endsWith("]]") ? raw.slice(2, -2) : raw;
  const parts = inner.split("|").map((p) => p.trim());
  if (parts[0] !== "section") return null;
  return { id: parts[1] ?? "", label: parts[2] };
}

export function sectionPayloadToRaw(p: SectionPayload): string {
  return `[[section|${p.id}|${p.label ?? ""}]]`;
}
