"use client";
/**
 * SectionSyncPlugin.tsx
 * ──────────────────────
 * Mantiene sincronizados los ChoiceNode/UseNode con las SectionNode reales
 * del documento:
 *
 *   1. En cada update del editor, recolecta todas las SectionNode (id,
 *      label, nodeKey) y publica el índice a sectionIndexRegistry — de ahí
 *      lo consumen los chips (useSectionTarget) y los pickers (useAllSections)
 *      para saber en vivo qué destinos existen.
 *
 *   2. Detecta RENAMES: compara el índice anterior contra el nuevo por
 *      nodeKey (identidad estable del nodo, no por id). Si el mismo nodeKey
 *      cambió de id, es un rename — no un borrado+creación — y entonces
 *      reescribe automáticamente el target de todos los ChoiceNode/UseNode
 *      que apuntaban al id viejo, actualizando también el label cacheado
 *      que se muestra en el chip.
 *
 *   3. Los targets que quedan huérfanos (sección borrada, no renombrada) NO
 *      se tocan — el propio ChoiceNode/UseNode los detecta como "broken"
 *      en vivo vía useSectionTarget, sin necesidad de que este plugin
 *      intervenga. Bloquear el guardado no es el comportamiento deseado;
 *      el chip en rojo es suficiente advertencia.
 */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { useEffect, useRef } from "react";

import { $isChoiceNode } from "./nodes/ChoiceNode";
import { sectionIndexStore } from "./nodes/sectionIndexRegistry";
import { $isSectionNode } from "./nodes/SectionNode";
import type { SectionIndexEntry } from "./nodes/sharedTypes";
import { $isUseNode } from "./nodes/UseNode";

export function SectionSyncPlugin(): null {
  const [editor] = useLexicalComposerContext();
  // Índice anterior por nodeKey — para detectar renames entre updates.
  const prevByNodeKey = useRef<Map<string, SectionIndexEntry>>(new Map());

  useEffect(() => {
    const sync = () => {
      const nextByNodeKey = new Map<string, SectionIndexEntry>();
      const renames: { fromId: string; toId: string; label?: string }[] = [];

      editor.getEditorState().read(() => {
        const children = $getRoot().getChildren();
        // SectionNode es inline, puede estar en cualquier ElementNode hijo
        // del root — recorremos recursivamente en vez de asumir un nivel.
        const stack = [...children];
        while (stack.length) {
          const node = stack.pop()!;
          if ($isSectionNode(node)) {
            const payload = node.getPayload();
            const entry: SectionIndexEntry = {
              id: payload.id,
              label: payload.label,
              nodeKey: node.getKey(),
            };
            nextByNodeKey.set(entry.nodeKey, entry);

            const prev = prevByNodeKey.current.get(entry.nodeKey);
            if (prev && prev.id && prev.id !== entry.id) {
              renames.push({ fromId: prev.id, toId: entry.id, label: entry.label });
            }
          }
          const anyNode = node as unknown as {
            getChildren?: () => unknown[];
          };
          if (typeof anyNode.getChildren === "function") {
            stack.push(...(anyNode.getChildren() as typeof stack));
          }
        }
      });

      // Publica el índice nuevo para los chips/pickers, siempre.
      sectionIndexStore.setIndex(Array.from(nextByNodeKey.values()));
      prevByNodeKey.current = nextByNodeKey;

      // Si hubo renames, reescribe los Choice/Use que apuntaban al id viejo.
      if (renames.length > 0) {
        editor.update(() => {
          const root = $getRoot();
          const stack = [...root.getChildren()];
          while (stack.length) {
            const node = stack.pop()!;

            if ($isChoiceNode(node)) {
              const payload = node.getPayload();
              const rn = renames.find((r) => r.fromId === payload.target);
              if (rn) {
                node.setPayload({
                  ...payload,
                  target: rn.toId,
                  targetLabel: rn.label,
                });
              }
            } else if ($isUseNode(node)) {
              const payload = node.getPayload();
              const rnOk = renames.find((r) => r.fromId === payload.sectionOk);
              const rnFail = renames.find(
                (r) => r.fromId === payload.sectionFail,
              );
              if (rnOk || rnFail) {
                node.setPayload({
                  ...payload,
                  sectionOk: rnOk ? rnOk.toId : payload.sectionOk,
                  sectionOkLabel: rnOk
                    ? rnOk.label
                    : payload.sectionOkLabel,
                  sectionFail: rnFail ? rnFail.toId : payload.sectionFail,
                  sectionFailLabel: rnFail
                    ? rnFail.label
                    : payload.sectionFailLabel,
                });
              }
            }

            const anyNode = node as unknown as {
              getChildren?: () => unknown[];
            };
            if (typeof anyNode.getChildren === "function") {
              stack.push(...(anyNode.getChildren() as typeof stack));
            }
          }
        });
      }
    };

    sync(); // estado inicial al montar
    return editor.registerUpdateListener(() => sync());
  }, [editor]);

  return null;
}
