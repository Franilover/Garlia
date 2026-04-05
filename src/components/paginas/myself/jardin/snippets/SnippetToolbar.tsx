"use client";
import React, { useState, useCallback } from "react";
import {
  X, Sword, Image, GitMerge, MousePointerClick,
  ChevronRight as ChevronR, Music2,
} from "lucide-react";
import { ModalBase, CampoInput } from "@/components/templates/EstudioTemplates";
import { SoundPicker }      from "@/components/forms/SoundPicker";
import { EntidadPicker }    from "@/components/forms/EntidadPicker";
import SimpleImagePicker    from "@/components/forms/SimpleImagePicker";
import { useEntidades }     from "./useEntidades";

// ─── Tipos compartidos ────────────────────────────────────────────────────────

type SnippetProps = {
  onInsert: (s: string) => void;
  onClose:  () => void;
};

type CapItem = { id: string; orden: number; titulo_capitulo: string };

// ─── ModalDrop ────────────────────────────────────────────────────────────────

export const ModalDrop = ({ onInsert, onClose }: SnippetProps) => (
  <EntidadPicker open onClose={onClose} onInsert={onInsert} />
);

// ─── ModalSonido ──────────────────────────────────────────────────────────────

export const ModalSonido = ({ onInsert, onClose }: SnippetProps) => (
  <SoundPicker open onClose={onClose} onInsert={onInsert} />
);

// ─── ModalSection ─────────────────────────────────────────────────────────────

export const ModalSection = ({ onInsert, onClose }: SnippetProps) => {
  const [sectionId, setSectionId] = useState("");
  const [label,     setLabel]     = useState("");

  const autoId  = sectionId || label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const snippet = label ? `[[section|${autoId}|${label}]]` : autoId ? `[[section|${autoId}]]` : "";

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <ChevronR size={12} className="text-violet-500" /> Nueva Sección
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-4">
        <CampoInput label="Nombre visible (opcional)" value={label} onChange={setLabel} placeholder="ej: Abrir el cofre" autoFocus />
        <CampoInput label="ID (debe coincidir con choice target)" value={sectionId}
          onChange={v => setSectionId(v.toLowerCase().replace(/\s+/g, "-"))}
          placeholder={autoId || "ej: cofre"} />
        {snippet && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-[var(--radius-btn)] px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono">{snippet}</code>
          </div>
        )}
        <button type="button" onClick={() => { if (!autoId) return; onInsert(snippet); onClose(); }} disabled={!autoId}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-[var(--radius-btn)] font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <ChevronR size={13} /> Insertar Sección
        </button>
      </div>
    </ModalBase>
  );
};

// ─── ModalChoice ──────────────────────────────────────────────────────────────

export const ModalChoice = ({ onInsert, onClose, listaCapitulos }: SnippetProps & { listaCapitulos: CapItem[] }) => {
  const [label,  setLabel]  = useState("");
  const [target, setTarget] = useState("");
  const [modo,   setModo]   = useState<"cap" | "section">("cap");

  const snippet    = label.trim() && target.trim() ? `[[choice|${label.trim()}|${target.trim()}]]` : "";
  const handleInsert = () => { if (!snippet) return; onInsert(snippet); onClose(); };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <GitMerge size={12} className="text-blue-500" /> Botón de Decisión
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-4">
        <div className="flex gap-1 bg-primary/5 p-1 rounded-[var(--radius-btn)]">
          {([["cap", "Capítulo"], ["section", "Sección interna"]] as const).map(([k, v]) => (
            <button key={k} type="button" onClick={() => { setModo(k); setTarget(""); }}
              className={`flex-1 py-1.5 rounded-[var(--radius-input)] text-[9px] font-black uppercase transition-all ${modo === k ? "bg-white-custom shadow text-primary" : "text-primary/40"}`}>
              {v}
            </button>
          ))}
        </div>
        <CampoInput label="Texto del botón" value={label} onChange={setLabel} placeholder="ej: Abrir el cofre, Huir…" autoFocus />
        {modo === "cap" ? (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Capítulo destino</label>
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="w-full bg-bg-main border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-[11px] text-primary outline-none">
              <option value="">— Seleccionar —</option>
              {listaCapitulos.map(c => <option key={c.id} value={c.id}>Cap. {c.orden} — {c.titulo_capitulo}</option>)}
            </select>
          </div>
        ) : (
          <CampoInput label="ID de sección" value={target} onChange={setTarget} placeholder="ej: cofre (debe coincidir con [[section|cofre]])" />
        )}
        {snippet && (
          <div className="bg-primary/8 border border-primary/20 rounded-[var(--radius-btn)] px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono break-all">{snippet}</code>
          </div>
        )}
        <button type="button" onClick={handleInsert} disabled={!snippet}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-[var(--radius-btn)] font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <GitMerge size={13} /> Insertar Choice
        </button>
      </div>
    </ModalBase>
  );
};

// ─── ModalUseItem ─────────────────────────────────────────────────────────────

export const ModalUseItem = ({ onInsert, onClose, listaCapitulos }: SnippetProps & { listaCapitulos: CapItem[] }) => {
  const [palabra,      setPalabra]      = useState("");
  const [busqueda,     setBusqueda]     = useState("");
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(null);
  const [targetOk,     setTargetOk]     = useState("");
  const [targetFail,   setTargetFail]   = useState("");
  const { items, loading } = useEntidades("item");
  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const snippet = palabra.trim() && selectedItem && targetOk
    ? `[[use|${palabra.trim()}|${selectedItem.id}|${targetOk}${targetFail ? `|${targetFail}` : ""}]]`
    : "";

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <MousePointerClick size={12} className="text-rose-500" /> Usar Ítem
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <CampoInput label="Palabra en el texto" value={palabra} onChange={setPalabra} placeholder="ej: usar llave, abrir cofre…" autoFocus />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Ítem requerido</label>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ítem…"
            className="w-full bg-bg-main border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30" />
          <div className="max-h-28 overflow-y-auto space-y-0.5 mt-1">
            {loading
              ? <p className="text-[9px] text-primary/30 p-2">Cargando…</p>
              : filtrados.map(item => (
                <button key={item.id} type="button" onClick={() => setSelectedItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all ${selectedItem?.id === item.id ? "bg-primary text-btn-text" : "hover:bg-primary/8 text-primary"}`}>
                  {item.nombre}
                </button>
              ))
            }
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Cap. si TIENE el ítem *</label>
          <select value={targetOk} onChange={e => setTargetOk(e.target.value)}
            className="w-full bg-bg-main border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-[11px] text-primary outline-none">
            <option value="">— Seleccionar —</option>
            {listaCapitulos.map(c => <option key={c.id} value={c.id}>Cap. {c.orden} — {c.titulo_capitulo}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Cap. si NO tiene <span className="opacity-50">(opcional)</span></label>
          <select value={targetFail} onChange={e => setTargetFail(e.target.value)}
            className="w-full bg-bg-main border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2 text-[11px] text-primary outline-none">
            <option value="">— Ninguno —</option>
            {listaCapitulos.map(c => <option key={c.id} value={c.id}>Cap. {c.orden} — {c.titulo_capitulo}</option>)}
          </select>
        </div>
        {snippet && (
          <div className="bg-primary/8 border border-primary/20 rounded-[var(--radius-btn)] px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono break-all">{snippet}</code>
          </div>
        )}
        <button type="button" onClick={() => { if (!snippet) return; onInsert(snippet); onClose(); }} disabled={!snippet}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-[var(--radius-btn)] font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <MousePointerClick size={13} /> Insertar Use
        </button>
      </div>
    </ModalBase>
  );
};

// ─── ModalImagen ──────────────────────────────────────────────────────────────

export const ModalImagen = ({ onInsert, onClose }: SnippetProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [caption,  setCaption]  = useState("");
  const [word,     setWord]     = useState("");
  const [mode,     setMode]     = useState<"img" | "float">("img");

  const handleInsert = () => {
    if (!selected) return;
    const snippet = mode === "img"
      ? (caption ? `[[img|${selected}|${caption}]]` : `[[img|${selected}]]`)
      : (caption ? `[[float|${word.trim() || "imagen"}|${selected}|${caption}]]` : `[[float|${word.trim() || "imagen"}|${selected}]]`);
    onInsert(snippet);
    onClose();
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <Image size={12} className="text-emerald-500" /> Imagen
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          {([{ k: "img", l: "Inline" }, { k: "float", l: "Flotante" }] as const).map(o => (
            <button key={o.k} type="button" onClick={() => setMode(o.k)}
              className={`flex-1 py-2 rounded-[var(--radius-btn)] text-[9px] font-black uppercase border transition-all ${mode === o.k ? "bg-primary text-btn-text border-primary" : "border-primary/15 text-primary/40 hover:border-primary/30"}`}>
              {o.l}
            </button>
          ))}
        </div>
        <SimpleImagePicker onSelect={url => setSelected(url)} onClose={onClose} />
        {selected && (
          <>
            {mode === "float" && <CampoInput label="Palabra en el texto" value={word} onChange={setWord} placeholder="ej: el castillo, Kael…" />}
            <CampoInput label="Caption (opcional)" value={caption} onChange={setCaption} placeholder="Descripción breve…" />
            <button type="button" onClick={handleInsert}
              className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-[var(--radius-btn)] font-black uppercase text-[10px] tracking-widest transition-all hover:opacity-80">
              <Image size={13} /> Insertar Imagen
            </button>
          </>
        )}
      </div>
    </ModalBase>
  );
};

// ─── SnippetToolbar ───────────────────────────────────────────────────────────

export const SnippetToolbar = ({
  textareaRef, value, onChange, listaCapitulos,
}: {
  textareaRef:    React.RefObject<HTMLTextAreaElement>;
  value:          string;
  onChange:       (v: string) => void;
  listaCapitulos: CapItem[];
}) => {
  const [openModal, setOpenModal] = useState<"drop" | "choice" | "use" | "section" | "sound" | "imagen" | null>(null);

  const insertAtCursor = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + snippet); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const next = value.slice(0, s) + snippet + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + snippet.length, s + snippet.length); }, 0);
  }, [textareaRef, value, onChange]);

  const btnCls = "flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide transition-all text-primary/50 hover:text-primary hover:bg-primary/8 border border-transparent hover:border-primary/10";

  const btns = [
    { key: "drop",    label: "Drop",     icon: <Sword size={11} /> },
    { key: "imagen",  label: "Imagen",   icon: <Image size={11} /> },
    { key: "choice",  label: "Choice",   icon: <GitMerge size={11} /> },
    { key: "use",     label: "Use Ítem", icon: <MousePointerClick size={11} /> },
    { key: "section", label: "Sección",  icon: <ChevronR size={11} /> },
    { key: "sound",   label: "Sonido",   icon: <Music2 size={11} /> },
  ] as const;

  const close = () => setOpenModal(null);

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap px-8 py-2 border-b border-primary/5"
        style={{ background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
        <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 mr-2">Snippets</span>
        {btns.map(b => (
          <button key={b.key} onClick={() => setOpenModal(b.key)} className={btnCls}>
            {b.icon} {b.label}
          </button>
        ))}
        <div className="w-px h-4 bg-primary/10 mx-1" />
        <button onClick={() => insertAtCursor("[[cita|Texto de la cita — Fuente]]")} className={btnCls}>« Cita</button>
        <button onClick={() => insertAtCursor("\n\n")} className={btnCls}>¶ Párrafo</button>
      </div>

      {openModal === "drop"    && <ModalDrop    onInsert={insertAtCursor} onClose={close} />}
      {openModal === "choice"  && <ModalChoice  onInsert={insertAtCursor} onClose={close} listaCapitulos={listaCapitulos} />}
      {openModal === "use"     && <ModalUseItem onInsert={insertAtCursor} onClose={close} listaCapitulos={listaCapitulos} />}
      {openModal === "section" && <ModalSection onInsert={insertAtCursor} onClose={close} />}
      {openModal === "sound"   && <ModalSonido  onInsert={insertAtCursor} onClose={close} />}
      {openModal === "imagen"  && <ModalImagen  onInsert={insertAtCursor} onClose={close} />}
    </>
  );
};