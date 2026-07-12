"use client";
/**
 * RichEditor.tsx
 * ──────────────
 * Reemplaza el MarkdownEditor.tsx basado en <textarea> + SnippetOverlay.
 *
 * Diferencias clave:
 *   - Los snippets son NODOS REALES del documento (DropNode, SoundNode, etc.)
 *     → el chip ocupa su espacio real, el texto fluye alrededor de verdad
 *     → ya no hay overlay ni "trampa" de tapar texto con un div encima
 *   - Mismo formato de guardado: [[drop|...]], [[sound|...]], etc.
 *     → parseContenido(), ContenidoInteractivo, SegmentRenderers: sin cambios
 *   - Markdown shortcuts preservados (**, *, #, ##, etc.)
 *   - Modo preview genérico vía prop `renderPreview` — cada consumidor
 *     decide cómo renderizar. EditorCapitulos pasa ContenidoInteractivo
 *     (mismo componente del lector real) para resolver [[drop|...]] y
 *     similares; sin esa prop, cae a un fallback local de markdown
 *     plano (sin dependencia de features/ ni de markdownRenderer.ts).
 *   - SnippetCommandPalette existente conectado sin cambios
 *
 * Props compatibles con las del MarkdownEditor anterior para simplificar
 * la migración en EditorCapitulos.tsx.
 */
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListNode, ListItemNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $getRoot } from "lexical";
import type { EditorState, LexicalEditor } from "lexical";
import { Edit3, Eye, Columns2 } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AutoClosePlugin } from "./AutoClosePlugin";
import {
  FindReplacePlugin,
  initialFindReplaceState,
  type FindReplaceState,
} from "./FindReplacePlugin";
import { HeadingBackspacePlugin } from "./HeadingBackspacePlugin";
import { ListBackspacePlugin } from "./ListBackspacePlugin";
import {
  MarkdownCommandInsertPlugin,
  MarkdownCommandPalette,
  filterMarkdownCommands,
} from "./MarkdownCommandPalette";
import { ChoiceNode } from "./nodes/ChoiceNode";
import { DropNode } from "./nodes/DropNode";
import { FlagNode } from "./nodes/FlagNode";
import { CondicionNode } from "./nodes/CondicionNode";
import { ImgNode } from "./nodes/ImgNode";
import { SectionNode, $createSectionNode } from "./nodes/SectionNode";
import {
  snippetEditHandler,
  setKnownSectionIds,
  createMissingSectionHandler,
  type SnippetEditRequest,
} from "./nodes/sharedTypes";
import { SoundNode } from "./nodes/SoundNode";
import { UseNode } from "./nodes/UseNode";
import { WikilinkNode, wikilinkNavigateHandler } from "./nodes/WikilinkNode";
import {
  rawTextToLexicalTree,
  serializeRootToRaw,
  insertSnippetNode,
} from "./richTextSerializer";
import { SlashCommandPlugin, type SlashMatch } from "./SlashCommandPlugin";
import { TABLE_NODES, TablePlugin, insertTable } from "./TablePlugin";
import { TocPanel } from "./TocPlugin";
import { WikilinkMenuPanel, type WikiEntity } from "./WikilinkMenuPanel";
import { WikilinkPlugin, type WikilinkMatch } from "./WikilinkPlugin";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = "edit" | "preview" | "split";

export interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number | string;
  maxHeight?: number | string;
  /**
   * Si se pasa `mode` SIN `onModeChange`, el toggle interno de RichEditor
   * (Editar/Split/Preview) NO se renderiza — el padre controla el modo
   * por su cuenta (ej. EditorCapitulos usa el botón "Modo foco" para
   * alternar edit/split) y sin esto el toggle quedaba montado pero sin
   * efecto real: clickearlo solo actualizaba un estado interno invisible,
   * porque `mode` (prop) siempre ganaba sobre el estado interno.
   * Si además pasás `onModeChange`, el toggle sí se muestra y queda
   * sincronizado con tu estado externo (ver EditorEnsayo.tsx).
   */
  mode?: ViewMode;
  onModeChange?: (mode: ViewMode) => void;
  autoFocus?: boolean;
  /**
   * false deshabilita la edición (ContentEditable no editable) sin ocultar
   * el contenido — pensado para el estado "cargando datos reales del
   * capítulo todavía no llegaron" en EditorCapitulos. Evita que el usuario
   * pueda escribir sobre un editor cuyo `value` todavía no es el contenido
   * real del capítulo (lo cual, combinado con el guard de EditorCapitulos,
   * es la defensa completa contra el bug de "carga lenta → autosave vacío
   * pisa el capítulo real"). Default true (comportamiento normal).
   */
  editable?: boolean;
  /** Ref imperativo para insertar snippets desde EditorCapitulos */
  insertRef?: React.MutableRefObject<((raw: string) => void) | null>;
  /**
   * Ref imperativo para insertar una tabla en la posición del cursor.
   * El padre lo invoca desde su palette al elegir el comando "/tabla"
   * (o el item "table" de COMMAND_ITEMS si reutiliza ese menú).
   */
  insertTableRef?: React.MutableRefObject<
    ((rows?: number, cols?: number) => void) | null
  >;
  /** Handler de edición de un snippet existente → abre SnippetCommandPalette */
  onSnippetEdit?: (req: SnippetEditRequest<any>) => void;
  /**
   * Se llama cuando el usuario escribe "/" para abrir el menú de comandos.
   * El padre (EditorCapitulos) abre su <SnippetCommandPalette/> en
   * anchorRect. Al elegir un comando, debe llamar a removeSlashQuery()
   * (expuesto vía slashRemoveRef) antes de insertar el snippet, para
   * borrar el "/texto" que quedó escrito.
   */
  onOpenPalette?: (
    anchorRect: { top: number; left: number },
    query: string,
  ) => void;
  /** Se llama con null cuando el "/" deja de coincidir (se cierra el menú) */
  onClosePalette?: () => void;
  /**
   * Ref imperativo: el padre lo invoca cuando SnippetCommandPalette se
   * cierra por CUALQUIER motivo (click afuera, Escape, o tras insertar
   * un comando). Sin esto, el plugin de "/" queda "trabado" en estado
   * abierto para siempre después del primer uso, porque nada le avisa
   * que puede volver a escuchar.
   */
  closePaletteRef?: React.MutableRefObject<(() => void) | null>;
  /** Entidades para autocompletado de wikilinks (opcional) */
  wikiEntities?: { name: string; type: string }[];
  /**
   * Se llama cuando el usuario hace click en un wikilink [[Nombre]] ya
   * insertado en el editor (tanto en modo edición como en preview).
   * Sin esta prop, los wikilinks se renderizan pero no navegan a nada.
   */
  onWikilinkNavigate?: (target: string) => void;
  /**
   * false oculta TODO el toggle de modo (Editar/Split/Vista previa) —
   * pensado para editores de notas/ensayos donde el markdown ya se ve
   * formateado en modo edición (bold, listas, headers reales, no texto
   * crudo con asteriscos), así que ni Split ni Preview aportan nada
   * distinto de Edit. Default true porque EditorCapitulos (con
   * ContenidoInteractivo) sí lo necesita: preview ahí resuelve
   * drop/choice/gate, visualmente muy distinto del raw.
   */
  showSplitMode?: boolean;
  /**
   * Cómo renderizar el panel de "Preview"/"Split". RichEditor es
   * genérico — no todos los consumidores usan el formato [[kind|...]]
   * de snippets (drop/choice/gate/etc). Por defecto usa un fallback
   * local de markdown plano (bold/italic/code/wikilinks + soft-break
   * vs blank-line), sin dependencias de features/.
   *
   * EditorCapitulos debe pasar una función que use ContenidoInteractivo
   * (el mismo componente del lector real) para que el preview resuelva
   * [[drop|...]], [[choice|...]], etc. correctamente — con el fallback
   * genérico esos snippets se muestran como texto raw literal, porque
   * ese fallback solo entiende markdown normal y wikilinks simples.
   *
   *   // En EditorCapitulos.tsx:
   *   renderPreview={(raw) => (
   *     <ContenidoInteractivo texto={raw} onNavigate={() => {}} />
   *   )}
   *
   * Otros editores que solo necesiten markdown normal no pasan nada y
   * siguen funcionando igual que siempre.
   */
  renderPreview?: (raw: string) => React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config del composer (nodos registrados)
// ─────────────────────────────────────────────────────────────────────────────

const RICH_EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  LinkNode,
  DropNode,
  SoundNode,
  ImgNode,
  ChoiceNode,
  UseNode,
  CondicionNode,
  FlagNode,
  SectionNode,
  WikilinkNode,
  ...TABLE_NODES,
];

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: carga el contenido inicial desde el raw string
// ─────────────────────────────────────────────────────────────────────────────

function InitialContentPlugin({
  initialRaw,
  skipNextChangeRef,
}: {
  initialRaw: string;
  skipNextChangeRef: React.MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();
  const isFirstRun = useRef(true);

  useEffect(() => {
    // En vez de rastrear "quién emitió este valor" con una ref que puede
    // desincronizarse entre cambios de capítulo (causaba que el editor
    // quedara vacío al seleccionar un capítulo con contenido real),
    // comparamos directamente contra lo que el árbol de Lexical tiene
    // AHORA MISMO serializado. Si coincide, no tocamos nada (evita perder
    // cursor/foco mientras el usuario escribe). Si no coincide —porque es
    // la carga inicial, cambiaste de capítulo, o llegó un refresh remoto
    // con contenido distinto— recargamos el árbol completo.
    const currentSerialized = isFirstRun.current
      ? null
      : editor.read(() => serializeRootToRaw());

    if (!isFirstRun.current && currentSerialized === initialRaw) {
      return;
    }
    isFirstRun.current = false;

    // editor.update() dispara OnChangePlugin igual que si el usuario
    // hubiera tecleado — Lexical no distingue "cambio programático" de
    // "cambio del usuario". Sin este flag, cargar el contenido real del
    // capítulo (carga inicial, cambio de capítulo, o refresh remoto)
    // generaba un onChange(raw) fantasma que el padre (EditorCapitulos)
    // interpretaba como una edición real del usuario: seteaba
    // saveStatus="saving" y arrancaba el debounce de guardado, mostrando
    // "Guardando…" apenas se abría el capítulo aunque nadie hubiera
    // escrito nada todavía.
    skipNextChangeRef.current = true;

    editor.update(() => {
      rawTextToLexicalTree(initialRaw);
    });
  }, [editor, initialRaw, skipNextChangeRef]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: sincroniza editor.setEditable() con la prop `editable` de forma
// reactiva. initialConfig.editable solo cubre el primer mount — esto cubre
// cambios posteriores (ej: EditorCapitulos pasa editable={false} mientras
// el capítulo todavía está cargando, y luego lo habilita cuando cap llega).
// Con esto el usuario NO puede escribir en el editor mientras está en
// estado "cargando", cortando de raíz la posibilidad de que un onChange
// con contenido fantasma dispare un guardado que pise el capítulo real.
// ─────────────────────────────────────────────────────────────────────────────

function EditablePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: expone insertRef para que EditorCapitulos pueda insertar snippets
// ─────────────────────────────────────────────────────────────────────────────

function InsertSnippetPlugin({
  insertRef,
  slashRemoveRef,
}: {
  insertRef: React.MutableRefObject<((raw: string) => void) | null>;
  slashRemoveRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    insertRef.current = (raw: string) => {
      // Si había un "/query" pendiente de cuando se abrió la palette,
      // lo borramos antes de insertar el nodo del snippet elegido.
      slashRemoveRef.current?.();
      editor.update(() => insertSnippetNode(raw));
    };
  }, [editor, insertRef, slashRemoveRef]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: mantiene knownSectionIds sincronizado con las SectionNode reales
// del documento (para pintar destino válido/roto en choice/condicion/use),
// y registra el handler que crea una SectionNode faltante al final del
// documento cuando el autor hace click en "Crear sección faltante".
// ─────────────────────────────────────────────────────────────────────────────

function SectionGraphPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const syncSectionIds = () => {
      editor.getEditorState().read(() => {
        const ids = new Set<string>();
        const root = $getRoot();
        const visit = (node: any) => {
          if (node.getType?.() === "section-snippet") {
            const p = node.getPayload?.();
            if (p?.id) ids.add(p.id);
          }
          const children = node.getChildren?.();
          if (children) children.forEach(visit);
        };
        visit(root);
        setKnownSectionIds(ids);
      });
    };

    syncSectionIds();
    return editor.registerUpdateListener(() => syncSectionIds());
  }, [editor]);

  useEffect(() => {
    createMissingSectionHandler.current = (id: string) => {
      editor.update(() => {
        const root = $getRoot();
        root.append($createSectionNode({ id, label: id }));
      });
    };
    return () => {
      createMissingSectionHandler.current = null;
    };
  }, [editor]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: expone insertTableRef para que el padre inserte tablas desde /tabla
// ─────────────────────────────────────────────────────────────────────────────

function InsertTablePlugin({
  insertTableRef,
}: {
  insertTableRef?: React.MutableRefObject<
    ((rows?: number, cols?: number) => void) | null
  >;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!insertTableRef) return;
    insertTableRef.current = (rows = 3, cols = 3) => {
      insertTable(editor, rows, cols);
    };
    return () => {
      if (insertTableRef) insertTableRef.current = null;
    };
  }, [editor, insertTableRef]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle de modo — icon-only, sin caja ni bordes (igual que el mobile toggle
// de MarkdownEditor). Sin botones de formato: bold/italic/etc ya se aplican
// con los shortcuts de markdown (**, *, #...) vía MarkdownShortcutPlugin.
// ─────────────────────────────────────────────────────────────────────────────

function ModeTogglePlugin({
  mode,
  onModeChange,
}: {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  const items: { m: ViewMode; Icon: typeof Edit3; title: string }[] = [
    { m: "edit", Icon: Edit3, title: "Editar" },
    { m: "split", Icon: Columns2, title: "Split" },
    { m: "preview", Icon: Eye, title: "Vista previa" },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 2,
        padding: "3px 6px",
        flexShrink: 0,
      }}
    >
      {items.map(({ m, Icon, title }) => {
        const isActive = mode === m;
        return (
          <button
            key={m}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 20,
              background: "transparent",
              color: isActive
                ? "color-mix(in srgb, var(--foreground) 60%, transparent)"
                : "color-mix(in srgb, var(--foreground) 18%, transparent)",
              border: "none",
              cursor: "pointer",
              transition: "color 0.1s",
            }}
            title={title}
            type="button"
            onClick={() => onModeChange(m)}
          >
            <Icon size={9} />
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback de preview genérico (sin dominio, sin features/)
// ─────────────────────────────────────────────────────────────────────────────
// RichEditor es UI genérica (components/forms/lexical-editor/) y no debe
// importar de features/ (mismo principio que ya documentaba MarkdownEditor.tsx:
// "no debe conocer features/"). Por eso este fallback es local y chico, en vez
// de reusar ContenidoInteractivo (que vive en features/garlia/).
//
// Mismo criterio que el resto del sistema (editor Lexical y
// ContenidoInteractivo/TextoMarkdown): una línea en blanco separa párrafos
// reales; un solo "\n" dentro de un bloque es un salto de línea suave (<br/>),
// no un párrafo nuevo.
function applyInlinePlainMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g,
      (_, target: string, alias?: string) => {
        const label = (alias?.trim() || target.trim()).replace(/"/g, "&quot;");
        const safeTarget = target.trim().replace(/"/g, "&quot;");
        return `<a class="wikilink" data-wikilink="${safeTarget}" href="javascript:void(0)" title="Ir a: ${safeTarget}">${label}</a>`;
      },
    )
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/==(.+?)==/g, '<mark class="md-mark">$1</mark>');
}

function PlainMarkdownFallback({ value }: { value: string }) {
  const bloques = value.split(/\n{2,}/);
  return (
    <>
      {bloques.map((bloque, bi) => {
        if (bloque.trim() === "") {
          return (
            <p key={bi} aria-hidden style={{ margin: 0, minHeight: "1em" }} />
          );
        }
        const lineas = bloque.split("\n");
        return (
          <p key={bi} style={{ margin: "0 0 0.6em 0" }}>
            {lineas.map((linea, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                <span
                  dangerouslySetInnerHTML={{
                    __html: applyInlinePlainMarkdown(linea),
                  }}
                />
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RichEditor
// ─────────────────────────────────────────────────────────────────────────────

export function RichEditor({
  value,
  onChange,
  placeholder = "Escribe aquí…",
  minHeight = "12rem",
  maxHeight,
  mode: modeProp,
  onModeChange,
  autoFocus = false,
  editable = true,
  insertRef,
  insertTableRef,
  onSnippetEdit,
  onOpenPalette,
  onClosePalette,
  closePaletteRef,
  wikiEntities,
  onWikilinkNavigate,
  showSplitMode = true,
  renderPreview,
}: RichEditorProps) {
  const [internalMode, setInternalMode] = useState<ViewMode>("edit");
  const mode = modeProp ?? internalMode;
  const handleModeChange = onModeChange ?? setInternalMode;

  // Conecta el handler global de edición de snippets con la callback del padre
  useEffect(() => {
    snippetEditHandler.current = onSnippetEdit ?? null;
  }, [onSnippetEdit]);

  // Conecta el handler global de navegación de wikilinks — mismo patrón
  // que snippetEditHandler, necesario porque DecoratorNode no puede
  // recibir props del árbol de React directamente.
  useEffect(() => {
    wikilinkNavigateHandler.current = onWikilinkNavigate ?? null;
    return () => {
      wikilinkNavigateHandler.current = null;
    };
  }, [onWikilinkNavigate]);

  // ── Wikilink menu state ───────────────────────────────────────────────
  const [wikiMenu, setWikiMenu] = useState<{
    open: boolean;
    query: string;
    selectedIdx: number;
    pos: { top: number; left: number };
  }>({ open: false, query: "", selectedIdx: 0, pos: { top: 0, left: 0 } });
  const wikiMenuRef = useRef<HTMLDivElement>(null);
  const wikiInsertRef = useRef<((target: string) => void) | null>(null);
  const wikiNotifyClosedRef = useRef<(() => void) | null>(null);

  const normalizedWikiEntities: WikiEntity[] = wikiEntities ?? [];
  const filteredWikiEntities = wikiMenu.query
    ? normalizedWikiEntities.filter((e) =>
        e.name.toLowerCase().includes(wikiMenu.query.toLowerCase()),
      )
    : normalizedWikiEntities;

  const handleWikilinkMatch = useCallback((match: WikilinkMatch | null) => {
    if (match) {
      setWikiMenu({
        open: true,
        query: match.query,
        selectedIdx: 0,
        pos: match.anchorRect,
      });
    } else {
      setWikiMenu((m) => ({ ...m, open: false }));
    }
  }, []);

  const closeWikiMenu = useCallback(() => {
    setWikiMenu((m) => ({ ...m, open: false }));
    wikiNotifyClosedRef.current?.();
  }, []);

  const selectWikiEntity = useCallback((entity: WikiEntity) => {
    wikiInsertRef.current?.(entity.name);
    setWikiMenu((m) => ({ ...m, open: false }));
  }, []);

  // ── Find & Replace state ──────────────────────────────────────────────
  const [findReplace, setFindReplace] = useState<FindReplaceState>(
    initialFindReplaceState,
  );
  const [tocOpen, setTocOpen] = useState(false);

  // Ref interno para insertar snippets (si el padre no pasa el suyo)
  const internalInsertRef = useRef<((raw: string) => void) | null>(null);
  const activeInsertRef = insertRef ?? internalInsertRef;

  // Borra el "/query" pendiente del documento — InsertSnippetPlugin lo
  // invoca automáticamente antes de insertar el nodo elegido.
  const slashRemoveRef = useRef<(() => void) | null>(null);

  // Le avisa al plugin que la palette se cerró (por cualquier motivo)
  // para que vuelva a escuchar el próximo "/". Sin esto, tras la
  // primera apertura el plugin quedaba permanentemente en estado
  // "activo" y ya no detectaba nuevos "/".
  const notifyClosedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!closePaletteRef) return;
    closePaletteRef.current = () => {
      notifyClosedRef.current?.();
    };
    return () => {
      if (closePaletteRef) closePaletteRef.current = null;
    };
  }, [closePaletteRef]);

  // ── Panel de "/" para markdown (modo NORMAL, sin onOpenPalette) ──────
  // Modo libro (EditorCapitulos) pasa onOpenPalette y usa su propio
  // SnippetCommandPalette — este estado interno queda sin uso en ese
  // caso. Modo normal no pasa onOpenPalette, así que RichEditor abre
  // su propio panel de comandos markdown en vez de delegarlo al padre.
  const [mdPalette, setMdPalette] = useState<{
    open: boolean;
    query: string;
    pos: { top: number; left: number };
    selectedIdx: number;
  }>({ open: false, query: "", pos: { top: 0, left: 0 }, selectedIdx: 0 });
  const mdInsertRef = useRef<((itemId: string) => void) | null>(null);

  const filteredMdCommands = useMemo(
    () => filterMarkdownCommands(mdPalette.query),
    [mdPalette.query],
  );

  const handleSlashMatch = useCallback(
    (match: SlashMatch | null) => {
      if (onOpenPalette || onClosePalette) {
        // Modo libro: delega 100% al padre, comportamiento sin cambios.
        if (match) onOpenPalette?.(match.anchorRect, match.query);
        else onClosePalette?.();
        return;
      }
      // Modo normal: RichEditor maneja su propio panel de markdown.
      if (match) {
        // selectedIdx se resetea a 0 en cada match nuevo (typing "/" de
        // cero) pero SE CONSERVA si solo cambió la query mientras el
        // panel ya estaba abierto — clampeado abajo, en el useEffect.
        setMdPalette((s) => ({
          open: true,
          query: match.query,
          pos: match.anchorRect,
          selectedIdx: s.open ? s.selectedIdx : 0,
        }));
      } else {
        setMdPalette((s) => ({ ...s, open: false }));
      }
    },
    [onOpenPalette, onClosePalette],
  );

  // Si la query cambia y el índice seleccionado queda fuera de rango de
  // la lista filtrada (ej: escribiste más letras y ahora hay menos
  // resultados), lo clampeamos al último item válido.
  useEffect(() => {
    if (!mdPalette.open) return;
    const maxIdx = Math.max(0, filteredMdCommands.length - 1);
    if (mdPalette.selectedIdx > maxIdx) {
      setMdPalette((s) => ({ ...s, selectedIdx: maxIdx }));
    }
  }, [filteredMdCommands.length, mdPalette.open, mdPalette.selectedIdx]);

  const closeMdPalette = useCallback(() => {
    setMdPalette((s) => ({ ...s, open: false }));
    notifyClosedRef.current?.();
  }, []);

  const selectMdCommand = useCallback((itemId: string) => {
    slashRemoveRef.current?.();
    mdInsertRef.current?.(itemId);
    setMdPalette((s) => ({ ...s, open: false }));
    notifyClosedRef.current?.();
  }, []);

  const mdArrowDown = useCallback(() => {
    setMdPalette((s) => ({
      ...s,
      selectedIdx:
        filteredMdCommands.length > 0
          ? (s.selectedIdx + 1) % filteredMdCommands.length
          : 0,
    }));
  }, [filteredMdCommands.length]);

  const mdArrowUp = useCallback(() => {
    setMdPalette((s) => ({
      ...s,
      selectedIdx:
        filteredMdCommands.length > 0
          ? (s.selectedIdx - 1 + filteredMdCommands.length) %
            filteredMdCommands.length
          : 0,
    }));
  }, [filteredMdCommands.length]);

  const mdConfirmSelection = useCallback(() => {
    const item = filteredMdCommands[mdPalette.selectedIdx];
    if (item) selectMdCommand(item.id);
    else closeMdPalette();
  }, [
    filteredMdCommands,
    mdPalette.selectedIdx,
    selectMdCommand,
    closeMdPalette,
  ]);

  const initialConfig = useMemo(
    () => ({
      namespace: "agenda-next-rich-editor",
      nodes: RICH_EDITOR_NODES,
      editable,
      onError(error: Error) {
        console.error("Lexical error:", error);
      },
      theme: {
        paragraph: "mb-[0.4em] leading-[1.7]",
        heading: {
          h1: "text-2xl font-bold mt-6 mb-2",
          h2: "text-xl font-bold mt-5 mb-2",
          h3: "text-lg font-semibold mt-4 mb-1",
          h4: "text-base font-semibold mt-3 mb-1",
        },
        quote: "border-l-2 border-primary/30 pl-4 italic opacity-75 my-4",
        code: "font-mono text-[0.875em] bg-surface-1 px-1.5 py-0.5 rounded",
        list: {
          ul: "list-disc pl-6 my-2",
          ol: "list-decimal pl-6 my-2",
          listitem: "my-1",
        },
        text: {
          bold: "font-bold",
          italic: "italic",
          underline: "underline",
          strikethrough: "line-through",
          code: "font-mono text-[0.875em] bg-surface-1 px-1 rounded",
        },
        table: "border-collapse my-3 w-full",
        tableRow: "",
        tableCell:
          "border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] px-2 py-1 align-top",
        tableCellHeader:
          "border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] px-2 py-1 align-top font-bold bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const skipNextChangeRef = useRef(false);

  const handleChange = useCallback(
    (_state: EditorState, editor: LexicalEditor) => {
      if (skipNextChangeRef.current) {
        // Este onChange es el eco del editor.update() programático que
        // hizo InitialContentPlugin al cargar el contenido real del
        // capítulo — no una edición del usuario. Lo consumimos una sola
        // vez y no lo propagamos, para no disparar "Guardando…" al abrir.
        skipNextChangeRef.current = false;
        return;
      }
      editor.read(() => {
        const raw = serializeRootToRaw();
        onChange(raw);
      });
    },
    [onChange],
  );

  const editorStyle: React.CSSProperties = {
    minHeight,
    flex: 1,
    ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}),
    padding: "4px 8px 8px",
    outline: "none",
    fontSize: 11,
    lineHeight: 1.7,
    fontFamily: "var(--font-mono)",
    color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
    ...(editable
      ? null
      : { opacity: 0.5, cursor: "wait", pointerEvents: "none" }),
  };

  return (
    <div className="flex flex-col w-full h-full">
      <LexicalComposer initialConfig={initialConfig}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
          }}
        >
          <TocPanel
            open={tocOpen}
            onClose={() => setTocOpen(false)}
            onToggle={() => setTocOpen((o) => !o)}
          />
          {showSplitMode && (modeProp === undefined || onModeChange) && (
            <ModeTogglePlugin mode={mode} onModeChange={handleModeChange} />
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: mode === "split" ? "row" : "column",
            position: "relative",
          }}
        >
          {/* Panel de edición */}
          {mode !== "preview" && (
            <div
              style={{
                flex: 1,
                overflow: "auto",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <FindReplacePlugin
                state={findReplace}
                onStateChange={setFindReplace}
              />
              <RichTextPlugin
                ErrorBoundary={LexicalErrorBoundary}
                contentEditable={<ContentEditable style={editorStyle} />}
                placeholder={
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 8,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color:
                        "color-mix(in srgb, var(--foreground) 25%, transparent)",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {placeholder}
                  </div>
                }
              />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <HistoryPlugin />
              {autoFocus && <AutoFocusPlugin />}
              <InitialContentPlugin
                initialRaw={value}
                skipNextChangeRef={skipNextChangeRef}
              />
              <InsertSnippetPlugin
                insertRef={activeInsertRef}
                slashRemoveRef={slashRemoveRef}
              />
              <MarkdownCommandInsertPlugin insertRef={mdInsertRef} />
              <SectionGraphPlugin />
              <EditablePlugin editable={editable} />
              <SlashCommandPlugin
                isMenuOpen={mdPalette.open}
                notifyClosedRef={notifyClosedRef}
                removeMatchRef={slashRemoveRef}
                onArrowDown={mdArrowDown}
                onArrowUp={mdArrowUp}
                onConfirmSelection={mdConfirmSelection}
                onMatch={handleSlashMatch}
              />
              <WikilinkPlugin
                insertRef={wikiInsertRef}
                isMenuOpen={wikiMenu.open}
                notifyClosedRef={wikiNotifyClosedRef}
                onArrowDown={() =>
                  setWikiMenu((m) => ({
                    ...m,
                    selectedIdx:
                      filteredWikiEntities.length > 0
                        ? (m.selectedIdx + 1) % filteredWikiEntities.length
                        : 0,
                  }))
                }
                onArrowUp={() =>
                  setWikiMenu((m) => ({
                    ...m,
                    selectedIdx:
                      filteredWikiEntities.length > 0
                        ? (m.selectedIdx - 1 + filteredWikiEntities.length) %
                          filteredWikiEntities.length
                        : 0,
                  }))
                }
                onConfirmSelection={() => {
                  const entity = filteredWikiEntities[wikiMenu.selectedIdx];
                  if (entity) selectWikiEntity(entity);
                  else closeWikiMenu();
                }}
                onMatch={handleWikilinkMatch}
              />
              <TablePlugin />
              <ListPlugin />
              <InsertTablePlugin insertTableRef={insertTableRef} />
              <AutoClosePlugin />
              <HeadingBackspacePlugin />
              <ListBackspacePlugin />
              <OnChangePlugin onChange={handleChange} />

              {wikiMenu.open && normalizedWikiEntities.length > 0 && (
                <WikilinkMenuPanel
                  entities={normalizedWikiEntities}
                  menuRef={wikiMenuRef}
                  pos={wikiMenu.pos}
                  query={wikiMenu.query}
                  selectedIdx={wikiMenu.selectedIdx}
                  onClose={closeWikiMenu}
                  onHover={(idx) =>
                    setWikiMenu((m) => ({ ...m, selectedIdx: idx }))
                  }
                  onSelect={selectWikiEntity}
                />
              )}

              {mdPalette.open && (
                <MarkdownCommandPalette
                  pos={mdPalette.pos}
                  query={mdPalette.query}
                  selectedIdx={mdPalette.selectedIdx}
                  onClose={closeMdPalette}
                  onHover={(idx) =>
                    setMdPalette((s) => ({ ...s, selectedIdx: idx }))
                  }
                  onSelect={selectMdCommand}
                />
              )}
            </div>
          )}

          {/* Panel de preview — usa renderPreview del padre si lo pasa
              (p. ej. EditorCapitulos con ContenidoInteractivo para
              resolver [[drop|...]] etc.), si no cae al markdown plano
              estándar de siempre. */}
          {mode !== "edit" &&
            (renderPreview ? (
              <div
                className="prose-mundo"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  overflowY: "auto",
                  fontSize: "clamp(0.9rem, 2vw, 1rem)",
                  lineHeight: 1.8,
                }}
              >
                {renderPreview(value)}
              </div>
            ) : (
              <div
                className="prose-mundo"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  overflowY: "auto",
                  fontSize: "clamp(0.9rem, 2vw, 1rem)",
                  lineHeight: 1.8,
                }}
                onClick={(e) => {
                  // Mismo mecanismo que antes: los wikilinks se marcan con
                  // data-wikilink, acá solo conectamos el click a
                  // onWikilinkNavigate.
                  const a = (e.target as HTMLElement).closest(
                    "a[data-wikilink]",
                  );
                  if (!a) return;
                  e.preventDefault();
                  const target = a.getAttribute("data-wikilink");
                  if (target) onWikilinkNavigate?.(target);
                }}
              >
                <PlainMarkdownFallback value={value} />
              </div>
            ))}
        </div>
      </LexicalComposer>
    </div>
  );
}
