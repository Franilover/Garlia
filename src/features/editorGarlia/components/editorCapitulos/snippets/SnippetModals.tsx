"use client";
/**
 * SnippetModals.tsx
 * ─────────────────
 * Reemplaza SnippetToolbar.tsx (los 7 Modal*) y los 7 Form* de
 * SnippetCommandPalette.tsx con una sola familia de componentes.
 *
 * Cada modal acepta dos modos de presentación:
 *   - "overlay"  → usa ModalBase (fondo oscuro, centrado) — para toolbar
 *   - "inline"   → sin wrapper, renderiza directo — para embeber en palette
 *
 * API:
 *   <SnippetModal kind="drop" onInsert={fn} onClose={fn} initialRaw="..." />
 *
 * También exporta el dispatcher <SnippetModalDispatcher> para
 * useSnippetEditHandler y RichBlockEditor.
 */

import {
  X, ChevronRight as ChevronR, GitMerge, MousePointerClick, GitFork, Image,
} from "lucide-react";
import React, { useState, useEffect } from "react";

import { ModalBase, CampoInput } from "@/components/layout/EstudioTemplates";

import type { ModalKind }    from "./snippetDefs";
import { SoundPicker, EntidadPicker, SimpleImagePicker } from "./SnippetForms";
import { parseSnippetRaw } from "./type";
import { useEntidades }      from "./useEntidades";

// ─── Tipos comunes ────────────────────────────────────────────────────────────

export interface SnippetModalProps {
  onInsert:        (s: string) => void;
  onClose:         () => void;
  initialRaw?:     string;
  listaCapitulos?: { id: string; orden: number; titulo_capitulo: string }[];
  listaSecciones?: { id: string; label: string }[];
  /** "overlay" = usa ModalBase con fondo | "inline" = sin wrapper */
  mode?:           "overlay" | "inline";
}

// ─── Wrapper condicional ──────────────────────────────────────────────────────

function Wrap({ mode, onClose, children }: {
  mode: "overlay" | "inline";
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (mode === "overlay") return <ModalBase onClose={onClose}>{children}</ModalBase>;
  return <>{children}</>;
}

function ModalHeader({ icon, label, color, onClose, mode }: {
  icon: React.ReactNode; label: string; color: string;
  onClose: () => void; mode: "overlay" | "inline";
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
        <span style={{ color }}>{icon}</span> {label}
      </h3>
      <button className="text-primary/30 hover:text-primary" onClick={onClose}><X size={16} /></button>
    </div>
  );
}

// ─── Item picker reutilizable (usado por Use y Gate) ──────────────────────────

function ItemPicker({ selected, onSelect }: {
  selected: { id: string; nombre: string } | null;
  onSelect: (item: { id: string; nombre: string }) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const { items, loading } = useEntidades("item");
  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Ítem requerido *</label>
      <input
        className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30" placeholder="Buscar ítem…"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />
      <div className="max-h-28 overflow-y-auto space-y-0.5 mt-1">
        {loading
          ? <p className="text-[9px] text-primary/30 p-2">Cargando…</p>
          : filtrados.map(item => (
            <button key={item.id} className={`w-full text-left px-3 py-2 rounded-btn text-[11px] font-bold transition-all ${selected?.id === item.id ? "bg-primary text-btn-text" : "hover:bg-primary/8 text-primary"}`} type="button"
              onClick={() => onSelect(item)}>
              {item.nombre}
            </button>
          ))
        }
      </div>
    </div>
  );
}

// ─── Botón de insertar compartido ─────────────────────────────────────────────

function InsertBtn({ onClick, disabled, icon, label }: {
  onClick: () => void; disabled: boolean;
  icon: React.ReactNode; label: string;
}) {
  return (
    <button className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-btn font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80" disabled={disabled} type="button"
      onClick={onClick}>
      {icon} {label}
    </button>
  );
}

// ─── Modal Drop ───────────────────────────────────────────────────────────────

export function ModalDrop({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const EP = EntidadPicker as React.ComponentType<any>;
  return (
    <EP
      open
      initialEntidadId={init?.kind === "drop" ? init.entidadId : undefined}
      initialEntidadTipo={init?.kind === "drop" ? init.entidadTipo : undefined}
      onClose={onClose}
      onInsert={onInsert}
    />
  );
}

// ─── Modal Sonido ─────────────────────────────────────────────────────────────

export function ModalSonido({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const SP = SoundPicker as React.ComponentType<any>;
  return <SP open initialSrc={init?.kind === "sound" ? init.src : undefined} onClose={onClose} onInsert={onInsert} />;
}

// ─── Modal Sección ────────────────────────────────────────────────────────────

export function ModalSection({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const isSection = init?.kind === "section";
  const [sectionId, setSectionId] = useState(isSection ? init.id    : "");
  const [label,     setLabel]     = useState(isSection ? init.label : "");

  const autoId  = sectionId || label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const snippet = label ? `[[section|${autoId}|${label}]]` : autoId ? `[[section|${autoId}]]` : "";

  return (
    <Wrap mode={mode} onClose={onClose}>
      <ModalHeader color="#8b83e8" icon={<ChevronR size={12} />} label="Nueva Sección" mode={mode} onClose={onClose} />
      <div className="space-y-4">
        <CampoInput autoFocus label="Nombre visible (opcional)" placeholder="ej: Abrir el cofre" value={label} onChange={setLabel} />
        <CampoInput label="ID (debe coincidir con targets)" placeholder={autoId || "ej: cofre"}
          value={sectionId}
          onChange={v => setSectionId(v.toLowerCase().replace(/\s+/g, "-"))} />
        {snippet && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-btn px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono">{snippet}</code>
          </div>
        )}
        <InsertBtn disabled={!autoId}
          icon={<ChevronR size={13} />} label="Insertar Sección" onClick={() => { if (!autoId) return; onInsert(snippet); onClose(); }} />
      </div>
    </Wrap>
  );
}

// ─── Modal Choice ─────────────────────────────────────────────────────────────

export function ModalChoice({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const isChoice = init?.kind === "choice";
  const [label,  setLabel]  = useState(isChoice ? init.texto  : "");
  const [target, setTarget] = useState(isChoice ? init.target : "");

  const snippet = label.trim() && target.trim() ? `[[choice|${label.trim()}|${target.trim()}]]` : "";

  return (
    <Wrap mode={mode} onClose={onClose}>
      <ModalHeader color="#5aabf5" icon={<GitMerge size={12} />} label="Botón de Decisión" mode={mode} onClose={onClose} />
      <div className="space-y-4">
        <CampoInput autoFocus label="Texto del botón" placeholder="ej: Inspeccionar pared, Huir…" value={label} onChange={setLabel} />
        <CampoInput label="ID de sección destino" placeholder="ej: exito-pared" value={target} onChange={setTarget} />
        {snippet && (
          <div className="bg-primary/8 border border-primary/20 rounded-btn px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono break-all">{snippet}</code>
          </div>
        )}
        <InsertBtn disabled={!snippet}
          icon={<GitMerge size={13} />} label="Insertar Choice" onClick={() => { if (!snippet) return; onInsert(snippet); onClose(); }} />
      </div>
    </Wrap>
  );
}

// ─── Modal Use Ítem ───────────────────────────────────────────────────────────

export function ModalUseItem({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const isUse = init?.kind === "use";
  const [palabra,      setPalabra]      = useState(isUse ? init.label      : "");
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(null);
  const [targetOk,     setTargetOk]     = useState(isUse ? (init as any).sectionOk   : "");
  const [targetFail,   setTargetFail]   = useState(isUse ? (init as any).sectionFail : "");
  const { items } = useEntidades("item");

  // Resolver nombre del ítem cuando los datos cargan
  useEffect(() => {
    if (!isUse || !(init as any)?.itemId || !items.length) return;
    const found = items.find(i => i.id === (init as any).itemId);
    if (found) setSelectedItem(found);
  }, [items]);

  const snippet = palabra.trim() && selectedItem && targetOk.trim()
    ? `[[use|${palabra.trim()}|${selectedItem.id}|${targetOk.trim()}${targetFail.trim() ? `|${targetFail.trim()}` : ""}]]`
    : "";

  return (
    <Wrap mode={mode} onClose={onClose}>
      <ModalHeader color="#f07574" icon={<MousePointerClick size={12} />} label="Usar Ítem" mode={mode} onClose={onClose} />
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <CampoInput autoFocus label="Palabra en el texto" placeholder="ej: usar llave…" value={palabra} onChange={setPalabra} />
        <ItemPicker selected={selectedItem} onSelect={setSelectedItem} />
        <CampoInput label="ID Sección si TIENE el ítem *" placeholder="ej: abrir-cofre" value={targetOk} onChange={setTargetOk} />
        <CampoInput label="ID Sección si NO tiene (opcional)" placeholder="ej: falla-cofre" value={targetFail} onChange={setTargetFail} />
        {snippet && (
          <div className="bg-primary/8 border border-primary/20 rounded-btn px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono break-all">{snippet}</code>
          </div>
        )}
        <InsertBtn disabled={!snippet}
          icon={<MousePointerClick size={13} />} label="Insertar Use" onClick={() => { if (!snippet) return; onInsert(snippet); onClose(); }} />
      </div>
    </Wrap>
  );
}

// ─── Modal Gate ───────────────────────────────────────────────────────────────

export function ModalGate({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const isGate = init?.kind === "gate";
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(null);
  const [tieneTexto,   setTieneTexto]   = useState(isGate ? (init as any).tieneTexto   ?? "" : "");
  const [noTieneTexto, setNoTieneTexto] = useState(isGate ? (init as any).noTieneTexto ?? "" : "");
  const { items } = useEntidades("item");

  useEffect(() => {
    if (!isGate || !(init as any)?.itemId || !items.length) return;
    const found = items.find(i => i.id === (init as any).itemId);
    if (found) setSelectedItem(found);
  }, [items]);

  const snippet = selectedItem && tieneTexto.trim()
    ? `[[gate|${selectedItem.id}|\n${tieneTexto.trim()}\n===\n${noTieneTexto.trim()}\n]]`
    : "";

  return (
    <Wrap mode={mode} onClose={onClose}>
      <ModalHeader color="#e09a2a" icon={<GitFork size={12} />} label="Puerta de Ítem" mode={mode} onClose={onClose} />
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <ItemPicker selected={selectedItem} onSelect={setSelectedItem} />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            Texto si <span className="text-emerald-500">TIENE</span> el ítem *
          </label>
          <textarea className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30 resize-none font-mono" placeholder={"El personaje saca la llave...\nPodés usar **markdown**, [[choice|...]] etc."}
            rows={4}
            value={tieneTexto}
            onChange={e => setTieneTexto(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            Texto si <span className="text-rose-400">NO tiene</span> <span className="opacity-50">(opcional)</span>
          </label>
          <textarea className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30 resize-none font-mono" placeholder={"La puerta no cede...\nDejá vacío para no mostrar nada."}
            rows={4}
            value={noTieneTexto}
            onChange={e => setNoTieneTexto(e.target.value)} />
        </div>
        {snippet && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-btn px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-500/60 mb-1">Preview</p>
            <pre className="text-[10px] text-primary/70 font-mono whitespace-pre-wrap break-all">{snippet}</pre>
          </div>
        )}
        <InsertBtn disabled={!snippet}
          icon={<GitFork size={13} />} label="Insertar Gate" onClick={() => { if (!snippet) return; onInsert(snippet); onClose(); }} />
      </div>
    </Wrap>
  );
}

// ─── Modal Imagen / Float ─────────────────────────────────────────────────────

export function ModalImagen({ onInsert, onClose, initialRaw, mode = "overlay" }: SnippetModalProps) {
  const init = parseSnippetRaw(initialRaw);
  const isImg = init?.kind === "img" || init?.kind === "float";
  const [selected, setSelected] = useState<string | null>(isImg ? (init as any).url : null);
  const [caption,  setCaption]  = useState(isImg ? (init as any).alt : "");
  const [word,     setWord]     = useState(isImg && init?.kind === "float" ? (init as any).alt : "");
  const [imgMode,  setImgMode]  = useState<"img" | "float">(init?.kind === "float" ? "float" : "img");

  const handleInsert = () => {
    if (!selected) return;
    const snippet = imgMode === "img"
      ? (caption ? `[[img|${selected}|${caption}]]` : `[[img|${selected}]]`)
      : (caption ? `[[float|${word.trim() || "imagen"}|${selected}|${caption}]]` : `[[float|${word.trim() || "imagen"}|${selected}]]`);
    onInsert(snippet);
    onClose();
  };

  return (
    <Wrap mode={mode} onClose={onClose}>
      <ModalHeader color="#2dc896" icon={<Image size={12} />} label="Imagen" mode={mode} onClose={onClose} />
      <div className="space-y-4">
        <div className="flex gap-2">
          {([{ k: "img", l: "Inline" }, { k: "float", l: "Flotante" }] as const).map(o => (
            <button key={o.k} className={`flex-1 py-2 rounded-btn text-[9px] font-black uppercase border transition-all ${imgMode === o.k ? "bg-primary text-btn-text border-primary" : "border-primary/15 text-primary/40 hover:border-primary/30"}`} type="button"
              onClick={() => setImgMode(o.k)}>
              {o.l}
            </button>
          ))}
        </div>
        <SimpleImagePicker onClose={onClose} onSelect={url => setSelected(url)} />
        {selected && (
          <>
            {imgMode === "float" && <CampoInput label="Palabra en el texto" placeholder="ej: el castillo…" value={word} onChange={setWord} />}
            <CampoInput label="Caption (opcional)" placeholder="Descripción breve…" value={caption} onChange={setCaption} />
            <InsertBtn disabled={!selected} icon={<Image size={13} />} label="Insertar Imagen" onClick={handleInsert} />
          </>
        )}
      </div>
    </Wrap>
  );
}
export function SnippetModalDispatcher({
  kind, onInsert, onClose, initialRaw, listaCapitulos, listaSecciones, mode = "overlay",
}: SnippetModalProps & { kind: ModalKind | null }) {
  const shared: SnippetModalProps = { onInsert, onClose, initialRaw, listaCapitulos, listaSecciones, mode };
  switch (kind) {
    case "drop":    return <ModalDrop    {...shared} />;
    case "imagen":  return <ModalImagen  {...shared} />;
    case "choice":  return <ModalChoice  {...shared} />;
    case "use":     return <ModalUseItem {...shared} />;
    case "gate":    return <ModalGate    {...shared} />;
    case "section": return <ModalSection {...shared} />;
    case "sound":   return <ModalSonido  {...shared} />;
    default:        return null;
  }
}
