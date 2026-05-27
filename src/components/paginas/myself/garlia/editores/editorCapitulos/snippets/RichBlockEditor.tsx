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

import {
  ModalDrop, ModalSonido, ModalSection,
  ModalChoice, ModalUseItem, ModalGate, ModalImagen,
} from "./SnippetToolbar";

import { MarkdownEditor } from "@/components/forms/MarkdownEditor";
import type { CommandItem as MdCommandItem, SnippetAction } from "@/components/forms/MarkdownEditor";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type SnippetKind =
  | "drop" | "img" | "float" | "choice" | "use" | "gate" | "section" | "sound" | "cita";

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
      if (prev?.type === "text") {
        prev.content += part;
      } else {
        blocks.push({ id: nanoid(8), type: "text", content: part });
      }
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
// CONFIG VISUAL
// ─────────────────────────────────────────────────────────────────────────────

interface KindDef {
  label: string; icon: string;
  bg: string; border: string; text: string; dot: string;
  summary: (raw: string) => string;
}

const KIND_DEFS: Record<string, KindDef> = {
  drop:    { label:"Drop",    icon:"⚔",  bg:"rgba(127,119,221,.13)", border:"rgba(127,119,221,.4)",  text:"#a09af0", dot:"#7f77dd",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[4]??p[1]??""; } },
  img:     { label:"Img",     icon:"🖼",  bg:"rgba(29,158,117,.13)",  border:"rgba(29,158,117,.4)",   text:"#2dc896", dot:"#1d9e75",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[2]??p[1]??""; } },
  float:   { label:"Float",   icon:"🖼",  bg:"rgba(15,110,86,.13)",   border:"rgba(15,110,86,.4)",    text:"#14a87e", dot:"#0f6e56",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[1]??""; } },
  choice:  { label:"Choice",  icon:"🔀", bg:"rgba(55,138,221,.13)",  border:"rgba(55,138,221,.4)",   text:"#5aabf5", dot:"#378add",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[1]??""; } },
  use:     { label:"Use",     icon:"👆", bg:"rgba(226,75,74,.13)",   border:"rgba(226,75,74,.4)",    text:"#f07574", dot:"#e24b4a",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[1]??""; } },
  gate:    { label:"Gate",    icon:"🚪", bg:"rgba(186,117,23,.13)",  border:"rgba(186,117,23,.4)",   text:"#e09a2a", dot:"#ba7517",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[1]??""; } },
  section: { label:"Sección", icon:"›",  bg:"rgba(83,74,183,.13)",   border:"rgba(83,74,183,.4)",    text:"#8b83e8", dot:"#534ab7",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[2]??p[1]??""; } },
  sound:   { label:"Sonido",  icon:"♪",  bg:"rgba(212,83,126,.13)",  border:"rgba(212,83,126,.4)",   text:"#e87aaa", dot:"#d4537e",
             summary: r => { const p=r.slice(2,-2).split("|"); return p[1]??""; } },
  cita:    { label:"Cita",    icon:"«»", bg:"rgba(186,117,23,.10)",  border:"rgba(186,117,23,.3)",   text:"#e09a2a", dot:"#ba7517",
             summary: r => { const t=r.slice(2,-2).split("|").slice(1).join("|"); return t.length>28?t.slice(0,28)+"…":t; } },
};

const FALLBACK: KindDef = {
  label:"?", icon:"◆", bg:"rgba(128,128,128,.1)", border:"rgba(128,128,128,.3)",
  text:"#aaa", dot:"#888", summary: r => r.slice(2,-2).slice(0,20),
};

const KIND_TO_MODAL: Record<string, ModalKind> = {
  drop:"drop", img:"imagen", float:"imagen",
  choice:"choice", use:"use", gate:"gate", section:"section", sound:"sound",
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────

type ModalKind = "drop"|"imagen"|"choice"|"use"|"gate"|"section"|"sound"|null;

interface ModalState {
  kind: ModalKind;
  initialRaw?: string;
  onInsert: (s: string) => void;
}

function SnippetModal({ state, listaCapitulos, onClose }: {
  state: ModalState;
  listaCapitulos: { id: string; orden: number; titulo_capitulo: string }[];
  onClose: () => void;
}) {
  const shared = { onInsert: state.onInsert, onClose, initialRaw: state.initialRaw };
  switch (state.kind) {
    case "drop":    return <ModalDrop    {...shared} />;
    case "imagen":  return <ModalImagen  {...shared} />;
    case "choice":  return <ModalChoice  {...shared} listaCapitulos={listaCapitulos} />;
    case "use":     return <ModalUseItem {...shared} listaCapitulos={listaCapitulos} />;
    case "gate":    return <ModalGate    {...shared} />;
    case "section": return <ModalSection {...shared} />;
    case "sound":   return <ModalSonido  {...shared} />;
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD MENU
// ─────────────────────────────────────────────────────────────────────────────

const ADD_ITEMS: { kind: ModalKind; label: string; icon: string; color: string }[] = [
  { kind:"drop",    label:"Drop (entidad)",    icon:"⚔",  color:"#a09af0" },
  { kind:"choice",  label:"Choice (decisión)", icon:"🔀", color:"#5aabf5" },
  { kind:"use",     label:"Usar ítem",         icon:"👆", color:"#f07574" },
  { kind:"gate",    label:"Puerta de ítem",    icon:"🚪", color:"#e09a2a" },
  { kind:"section", label:"Sección / ancla",   icon:"›",  color:"#8b83e8" },
  { kind:"imagen",  label:"Imagen",            icon:"🖼",  color:"#2dc896" },
  { kind:"sound",   label:"Sonido / música",   icon:"♪",  color:"#e87aaa" },
];

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
  const def = KIND_DEFS[block.kind] ?? FALLBACK;
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
    const kind = KIND_TO_MODAL[block.kind] ?? null;
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
        <SnippetModal state={modal} listaCapitulos={listaCapitulos} onClose={closeModal} />
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