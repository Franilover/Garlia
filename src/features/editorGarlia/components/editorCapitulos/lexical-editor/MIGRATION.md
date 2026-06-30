# Migración: MarkdownEditor → RichEditor

## 1. Instalar dependencias

```bash
npm install lexical @lexical/react @lexical/markdown @lexical/rich-text @lexical/list @lexical/code @lexical/link @lexical/html
```

## 2. Copiar los archivos

Coloca la carpeta `lexical-editor/` en:
```
src/features/editorGarlia/components/editorCapitulos/lexical-editor/
```

Estructura final:
```
lexical-editor/
├── index.ts
├── RichEditor.tsx
├── richTextSerializer.ts
└── nodes/
    ├── sharedTypes.ts
    ├── SnippetChip.tsx
    ├── DropNode.tsx
    ├── SoundNode.tsx
    ├── ImgNode.tsx
    ├── ChoiceNode.tsx
    ├── UseNode.tsx
    ├── GateNode.tsx
    └── SectionNode.tsx
```

## 3. Cambios en EditorCapitulos.tsx

### Imports — reemplazar:
```tsx
// ANTES
import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";
import { makeSnippetOverlay } from "./snippets/SnippetOverlay";

// DESPUÉS
import { RichEditor } from "./lexical-editor";
import type { SnippetEditRequest } from "./lexical-editor";
```

### Eliminar el snippetOverlay — ya no se necesita:
```tsx
// ELIMINAR todo esto:
const snippetOverlay = useMemo(
  () => makeSnippetOverlay({ taRef: textareaRef, onChange, onEdit: ... }),
  [...],
);
```

### Reemplazar el <MarkdownEditor> por <RichEditor>:
```tsx
// ANTES
<MarkdownEditor
  value={value}
  onChange={onChange}
  insertRef={mdInsertRef}
  renderOverlay={snippetOverlay}
  textareaRef={textareaRef}
  ...
/>

// DESPUÉS
<RichEditor
  value={value}
  onChange={onChange}
  insertRef={mdInsertRef}
  onSnippetEdit={(req: SnippetEditRequest<any>) => {
    // Mismo flujo que antes: guardar el replace, abrir la palette
    pendingReplaceRef.current = (raw: string) => {
      req.replace(rawSnippetToPayload(req.kind, raw));
    };
    openPalette(snippetKindToInitialRaw(req.kind, req.payload));
  }}
  placeholder="Escribe el capítulo aquí…"
  minHeight="24rem"
/>
```

### Helper para convertir el payload de vuelta al raw:
```tsx
// Agrega esto en EditorCapitulos.tsx:
import { dropPayloadToRaw, soundPayloadToRaw, imgPayloadToRaw,
         choicePayloadToRaw, usePayloadToRaw, gatePayloadToRaw,
         sectionPayloadToRaw } from "./lexical-editor";

function snippetKindToInitialRaw(kind: string, payload: any): string {
  switch (kind) {
    case "drop":    return dropPayloadToRaw(payload);
    case "sound":   return soundPayloadToRaw(payload);
    case "img":
    case "float":   return imgPayloadToRaw(payload);
    case "choice":  return choicePayloadToRaw(payload);
    case "use":     return usePayloadToRaw(payload);
    case "gate":    return gatePayloadToRaw(payload);
    case "section": return sectionPayloadToRaw(payload);
    default:        return "";
  }
}
```

## 4. SnippetCommandPalette — sin cambios

La palette sigue funcionando igual:
- Recibe `initialRaw` para pre-llenar el formulario
- Llama `onInsert(raw)` al confirmar
- `EditorCapitulos` pasa ese raw a `insertRef.current(raw)` → se inserta como nodo Lexical

## 5. Lo que ya NO necesitas

Puedes eliminar (o dejar en desuso):
- `SnippetOverlay.tsx` — reemplazado por nodos reales
- `makeSnippetOverlay()` y su `useMemo` en EditorCapitulos
- `textareaRef` — ya no hay textarea

## 6. Lo que NO cambia

- `type.ts` (`parseContenido`, `parseSnippetRaw`) — íntegros
- `snippetDefs.ts` — íntegro
- `SnippetCommandPalette.tsx` — íntegro
- `SegmentRenderers.tsx` — íntegro
- `ContenidoInteractivo.tsx` — íntegro
- Base de datos / formato guardado — idéntico
