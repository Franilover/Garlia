"use client";
/**
 * RichBlockEditor
 * ───────────────
 * Editor de bloques inline compatible con el formato [[...]] existente.
 *
 * Parsea el contenido en segmentos alternados texto ↔ snippet.
 * Los bloques de texto son MarkdownEditor normales.
 * Los snippets son cards clicables que abren sus modales de edición.
 * Los separadores "+" entre bloques permiten insertar nuevos snippets o texto.
 *
 * Serializa de vuelta a [[...]] al guardar → 100% compatible con el
 * sistema de lectura/render existente.
 */

import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from "react";
import { nanoid } from "nanoid";

import { SnippetModalDispatcher } from "./SnippetModals";
import { KIND_DEFS, KIND_FALLBACK, SNIPPET_TYPES } from "./snippetDefs";
import type { SnippetKind, ModalKind } from "./snippetDefs";

import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";
import type { CommandItem as MdCommandItem, SnippetAction } from "@/components/forms/Markdown/MarkdownEditor";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS LOCALES
// ─────────────────────────────────────────────────────────────────────────────

interface TextBlock  { id: string; type: "text"; content: string }
interface SnipBlock  { id: string; type: "snippet"; kind: SnippetKind; raw: string }
type Block = TextBlock | SnipBlock;

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZACIÓN / DESERIALIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────

const SNIPPET_RE = /(\[\[[\s\S]*?\]\])/g;

function parse(raw: string): Block[] {
  const parts = raw.split(SNIPPET_RE);
  const blocks: Block[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const kind = part.slice(2, -2).split("|")[0].trim() as SnippetKind;
      blocks.push({ id: nanoid(8), type: "snippet", kind, raw: part });
    } else {
      const prev = blocks[blocks.length - 1];
      if (prev?.type === "text") { prev.content += part; }
      else { blocks.push({ id: nanoid(8), type: "text", content: part }); }
    }
  }
  if (blocks.length === 0 || blocks[blocks.length - 1].type === "snippet") {
    blocks.push({ id: nanoid(8), type: "text", content: "" });
  }
  return blocks;
}

function serialize(blocks: Block[]): string {
  return blocks.map(b => b.type === "text" ? b.content : b.raw).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL — delegado a SnippetModalDispatcher
// ─────────────────────────────────────────────────────────────────────────────

interface ModalState {
  kind:        ModalKind;
  initialRaw?: string;
  onInsert:    (s: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD MENU
// ─────────────────────────────────────────────────────────────────────────────

// ADD_ITEMS viene de SNIPPET_TYPES en snippetDefs.ts
const ADD_ITEMS = SNIPPET_TYPES.map(t => ({ ...t, color: KIND_DEFS[t.kind === "imagen" ? "img" : t.kind]?.text ?? "#aaa" }));

function AddMenu({ onPick, onClose }: { onPick:(k:ModalKind)=>void; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position:"absolute", zIndex:9999, top:"100%", left:0, marginTop:4,
      background:"var(--bg-menu, #1a1730)",
      border:"1px solid color-mix(in srgb, var(--color-primary,#7c6af7) 22%, transparent)",
      borderRadius:10, overflow:"hidden", minWidth:210,
      boxShadow:"0 12px 40px rgba(0,0,0,.5)",
      backdropFilter:"blur(12px)",
    }}>
      <div style={{
        padding:"5px 12px 4px",
        fontSize:8, fontFamily:"var(--font-mono)", letterSpacing:".15em",
        textTransform:"uppercase",
        color:"color-mix(in srgb, var(--color-primary,#7c6af7) 40%, transparent)",
        borderBottom:"1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
      }}>Insertar elemento</div>
      {ADD_ITEMS.map(item => (
        <button key={item.kind} type="button"
          onClick={() => { onPick(item.kind); onClose(); }}
          style={{
            width:"100%", display:"flex", alignItems:"center", gap:10,
            padding:"8px 12px", background:"none", border:"none",
            cursor:"pointer", textAlign:"left", transition:"background .1s",
            color:"color-mix(in srgb, var(--foreground) 72%, transparent)",
          }}
          onMouseEnter={e => (e.currentTarget.style.background="color-mix(in srgb,var(--color-primary,#7c6af7) 9%,transparent)")}
          onMouseLeave={e => (e.currentTarget.style.background="none")}
        >
          <span style={{ fontSize:15, width:22, textAlign:"center", color:item.color, flexShrink:0 }}>{item.icon}</span>
          <span style={{ fontSize:11, fontWeight:600 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEPARATOR (the + button between blocks)
// ─────────────────────────────────────────────────────────────────────────────

function BlockSeparator({ onAddSnippet, dimmed }: {
  onAddSnippet:(k:ModalKind)=>void;
  dimmed?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position:"relative", display:"flex", alignItems:"center",
        gap:6, padding:"4px 0",
        opacity: dimmed && !hovered && !showMenu ? 0 : 1,
        transition:"opacity .18s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex:1, height:1, background:"color-mix(in srgb,var(--color-primary,#7c6af7) 12%,transparent)" }} />
      <button type="button"
        onClick={() => setShowMenu(v => !v)}
        style={{
          width:20, height:20, borderRadius:"50%", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background: showMenu
            ? "color-mix(in srgb,var(--color-primary,#7c6af7) 22%,transparent)"
            : "color-mix(in srgb,var(--color-primary,#7c6af7) 8%,transparent)",
          border:"1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 28%,transparent)",
          color:"var(--color-primary,#7c6af7)",
          fontSize:14, lineHeight:1, cursor:"pointer",
          transition:"background .12s, transform .15s",
          transform: showMenu ? "rotate(45deg)" : "none",
        }}
        title="Insertar elemento"
      >+</button>
      <div style={{ flex:1, height:1, background:"color-mix(in srgb,var(--color-primary,#7c6af7) 12%,transparent)" }} />
      {showMenu && <AddMenu onPick={onAddSnippet} onClose={() => setShowMenu(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SNIPPET CARD
// ─────────────────────────────────────────────────────────────────────────────

function SnipCard({ block, onEdit, onDelete }: {
  block: SnipBlock;
  onEdit: (b: SnipBlock) => void;
  onDelete: (id: string) => void;
}) {
  const def = KIND_DEFS[block.kind] ?? KIND_FALLBACK;
  const summary = def.summary(block.raw);
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"7px 10px",
        borderRadius:8,
        background: hov
          ? def.bg.replace(/[\d.]+\)$/, s => String(Math.min(parseFloat(s)*2.4, 0.3))+")")
          : def.bg,
        border:`1px solid ${def.border}`,
        margin:"1px 0",
        transition:"background .15s, box-shadow .15s",
        boxShadow: hov ? `0 2px 14px ${def.border}` : "none",
        cursor:"pointer",
      }}
      onClick={() => onEdit(block)}
      title="Clic para editar"
    >
      {/* Icon badge */}
      <span style={{
        width:28, height:28, borderRadius:7, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: def.bg.replace(/[\d.]+\)$/, s => String(Math.min(parseFloat(s)*3,0.35))+")"),
        border:`1px solid ${def.border}`,
        fontSize:14, color:def.text,
      }}>{def.icon}</span>

      {/* Label + summary */}
      <div style={{ flex:1, minWidth:0, lineHeight:1.3 }}>
        <div style={{ fontSize:8, fontWeight:900, textTransform:"uppercase", letterSpacing:".12em", color:def.text, opacity:.65, marginBottom:2 }}>
          {def.label}
        </div>
        <div style={{ fontSize:12, fontWeight:600, color:def.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {summary || <span style={{ opacity:.35, fontStyle:"italic" }}>sin configurar</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:5, flexShrink:0, opacity: hov ? 1 : 0.4, transition:"opacity .15s" }}>
        <button type="button"
          onClick={e => { e.stopPropagation(); onEdit(block); }}
          style={{
            background:"none", border:`1px solid ${def.border}`,
            borderRadius:6, padding:"3px 9px",
            fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".07em",
            color:def.text, cursor:"pointer",
          }}
        >editar</button>
        <button type="button"
          onClick={e => { e.stopPropagation(); onDelete(block.id); }}
          style={{
            background:"none",
            border:"1px solid rgba(255,90,90,.25)",
            borderRadius:6, padding:"3px 7px",
            fontSize:12, color:"rgba(255,90,90,.55)", cursor:"pointer", lineHeight:1,
          }}
          onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,90,90,.95)";e.currentTarget.style.borderColor="rgba(255,90,90,.5)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,90,90,.55)";e.currentTarget.style.borderColor="rgba(255,90,90,.25)";}}
        >×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export interface RichBlockEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  defaultMode?: "edit" | "split";
  focusMode?: boolean;
  extraCommands?: MdCommandItem[];
  insertRef?: React.MutableRefObject<((text: string) => void) | null>;
  onSnippetAction?: (action: SnippetAction) => void;
  listaCapitulos?: { id: string; orden: number; titulo_capitulo: string }[];
}

export function RichBlockEditor({
  value, onChange, placeholder, defaultMode, focusMode,
  extraCommands, insertRef, onSnippetAction, listaCapitulos = [],
}: RichBlockEditorProps) {

  const [blocks, setBlocks] = useState<Block[]>(() => parse(value));
  const lastStrRef = useRef<string>(value);

  // External value sync (e.g. draft restore)
  useEffect(() => {
    if (value !== lastStrRef.current) {
      setBlocks(parse(value));
      lastStrRef.current = value;
    }
  }, [value]);

  // Central commit with function updater
  const commitFn = useCallback((fn: (prev: Block[]) => Block[]) => {
    setBlocks(prev => {
      const next = fn(prev);
      const s = serialize(next);
      lastStrRef.current = s;
      onChange(s);
      return next;
    });
  }, [onChange]);

  // Text block change
  const handleTextChange = useCallback((id: string, content: string) => {
    setBlocks(prev => {
      const next = prev.map(b => b.id === id ? { ...b, content } as TextBlock : b);
      const s = serialize(next);
      lastStrRef.current = s;
      onChange(s);
      return next;
    });
  }, [onChange]);

  // Delete any block
  const handleDelete = useCallback((id: string) => {
    commitFn(prev => {
      let next = prev.filter(b => b.id !== id);
      if (next.length === 0) next = [{ id:nanoid(8), type:"text", content:"" }];
      if (next[next.length-1].type === "snippet") next = [...next, { id:nanoid(8), type:"text", content:"" }];
      return next;
    });
  }, [commitFn]);

  // Modal state
  const [modal, setModal] = useState<ModalState | null>(null);
  const closeModal = useCallback(() => setModal(null), []);

  // Open insert-snippet-after modal
  const openInsertAfter = useCallback((afterId: string, kind: ModalKind) => {
    if (!kind) return;
    setModal({
      kind,
      onInsert: (raw: string) => {
        commitFn(prev => {
          const idx = prev.findIndex(b => b.id === afterId);
          const snip: SnipBlock = { id:nanoid(8), type:"snippet", kind:raw.slice(2,-2).split("|")[0].trim() as SnippetKind, raw };
          const after: TextBlock = { id:nanoid(8), type:"text", content:"" };
          const next = [...prev];
          next.splice(idx+1, 0, snip, after);
          return next;
        });
        closeModal();
      },
    });
  }, [commitFn, closeModal]);

  // Open edit-snippet modal
  const openEdit = useCallback((block: SnipBlock) => {
    const def  = KIND_DEFS[block.kind];
    const kind = def?.modal ?? null;
    if (!kind) return;
    setModal({
      kind, initialRaw: block.raw,
      onInsert: (raw: string) => {
        commitFn(prev => prev.map(b =>
          b.id === block.id
            ? { ...b, raw, kind:raw.slice(2,-2).split("|")[0].trim() as SnippetKind } as SnipBlock
            : b
        ));
        closeModal();
      },
    });
  }, [commitFn, closeModal]);

  // Extra commands for text blocks — include snippet insertion
  const makeExtraCmds = useCallback((blockId: string): MdCommandItem[] => [
    ...(extraCommands ?? []),
    { id:"add-drop",    label:"Drop",       description:"Entidad interactiva",    keywords:["drop","ent","add"], icon:"⚔",  action:()=>openInsertAfter(blockId,"drop") },
    { id:"add-choice",  label:"Choice",     description:"Botón de decisión",      keywords:["choi","dec","add"], icon:"🔀", action:()=>openInsertAfter(blockId,"choice") },
    { id:"add-use",     label:"Usar ítem",  description:"Interacción con ítem",   keywords:["use","item","add"], icon:"👆", action:()=>openInsertAfter(blockId,"use") },
    { id:"add-gate",    label:"Gate ítem",  description:"Puerta condicional",     keywords:["gate","puer","add"],icon:"🚪", action:()=>openInsertAfter(blockId,"gate") },
    { id:"add-section", label:"Sección",    description:"Ancla de navegación",    keywords:["sec","anc","add"],  icon:"›",  action:()=>openInsertAfter(blockId,"section") },
    { id:"add-img",     label:"Imagen",     description:"Imagen o flotante",      keywords:["img","foto","add"], icon:"🖼",  action:()=>openInsertAfter(blockId,"imagen") },
    { id:"add-sound",   label:"Sonido",     description:"Sonido o música",        keywords:["son","mus","add"],  icon:"♪",  action:()=>openInsertAfter(blockId,"sound") },
  ], [extraCommands, openInsertAfter]);

  return (
    <div style={{ display:"flex", flexDirection:"column" }}>

      {/* Leading separator */}
      <BlockSeparator
        onAddSnippet={k => {
          if (!k) return;
          setModal({
            kind: k,
            onInsert: (raw: string) => {
              commitFn(prev => {
                const snip: SnipBlock = { id:nanoid(8), type:"snippet", kind:raw.slice(2,-2).split("|")[0].trim() as SnippetKind, raw };
                const after: TextBlock = { id:nanoid(8), type:"text", content:"" };
                return [snip, after, ...prev];
              });
              closeModal();
            },
          });
        }}
        dimmed
      />

      {blocks.map((block, idx) => {
        if (block.type === "text") {
          return (
            <div key={block.id}>
              <TextBlockWrapper
                block={block}
                onChange={handleTextChange}
                extraCommands={makeExtraCmds(block.id)}
                onSnippetAction={onSnippetAction}
                placeholder={idx === 0 ? (placeholder ?? "Empieza a escribir…") : ""}
                defaultMode={defaultMode}
              />
              <BlockSeparator
                onAddSnippet={k => openInsertAfter(block.id, k)}
                dimmed
              />
            </div>
          );
        }

        return (
          <div key={block.id}>
            <SnipCard block={block as SnipBlock} onEdit={openEdit} onDelete={handleDelete} />
            <BlockSeparator
              onAddSnippet={k => openInsertAfter(block.id, k)}
              dimmed
            />
          </div>
        );
      })}

      {modal && (
        <SnippetModalDispatcher
          kind={modal.kind}
          initialRaw={modal.initialRaw}
          onInsert={modal.onInsert}
          onClose={closeModal}
          listaCapitulos={listaCapitulos}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT BLOCK WRAPPER (memo to prevent unnecessary re-renders)
// ─────────────────────────────────────────────────────────────────────────────

const TextBlockWrapper = React.memo(function TextBlockWrapper({
  block, onChange, extraCommands, onSnippetAction, placeholder, defaultMode,
}: {
  block: TextBlock;
  onChange: (id: string, content: string) => void;
  extraCommands: MdCommandItem[];
  onSnippetAction?: (action: SnippetAction) => void;
  placeholder?: string;
  defaultMode?: "edit" | "split";
}) {
  return (
    <MarkdownEditor
      value={block.content}
      onChange={v => onChange(block.id, v)}
      placeholder={placeholder}
      defaultMode={defaultMode ?? "split"}
      extraCommands={extraCommands}
      onSnippetAction={onSnippetAction}
    />
  );
});