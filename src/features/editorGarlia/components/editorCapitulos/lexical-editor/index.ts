/**
 * index.ts
 * ────────
 * Barrel de exports del editor Lexical.
 * Importa desde aquí en EditorCapitulos.tsx:
 *
 *   import { RichEditor } from "@/features/editorGarlia/components/editorCapitulos/lexical-editor";
 */
export { RichEditor } from "./RichEditor";
export type { RichEditorProps, ViewMode } from "./RichEditor";

// Nodos (útiles si necesitas crear/inspeccionar nodos fuera del editor)
export { $createDropNode, $isDropNode, dropPayloadToRaw, dropRawToPayload } from "./nodes/DropNode";
export { $createSoundNode, $isSoundNode, soundPayloadToRaw, soundRawToPayload } from "./nodes/SoundNode";
export { $createImgNode, $isImgNode, imgPayloadToRaw, imgRawToPayload } from "./nodes/ImgNode";
export { $createChoiceNode, $isChoiceNode, choicePayloadToRaw, choiceRawToPayload } from "./nodes/ChoiceNode";
export { $createUseNode, $isUseNode, usePayloadToRaw, useRawToPayload } from "./nodes/UseNode";
export { $createGateNode, $isGateNode, gatePayloadToRaw, gateRawToPayload } from "./nodes/GateNode";
export { $createSectionNode, $isSectionNode, sectionPayloadToRaw, sectionRawToPayload } from "./nodes/SectionNode";

// Serializador (por si necesitas convertir fuera del editor)
export { serializeRootToRaw, rawTextToLexicalTree, insertSnippetNode } from "./richTextSerializer";

// Tipos compartidos
export type { SnippetEditRequest, SnippetKind } from "./nodes/sharedTypes";
