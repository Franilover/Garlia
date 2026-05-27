"use client";
import React, { useState, useCallback } from "react";
import {
  X, Sword, Image, GitMerge, MousePointerClick,
  ChevronRight as ChevronR, Music2, GitFork,
} from "lucide-react";
import { ModalBase, CampoInput } from "@/components/templates/EstudioTemplates";
import { SoundPicker }      from "@/components/paginas/myself/garlia/editores/editorCapitulos/snippets/forms/SoundPicker";
import { EntidadPicker }    from "@/components/paginas/myself/garlia/editores/editorCapitulos/snippets/forms/EntidadPicker";
import SimpleImagePicker    from "@/components/paginas/myself/garlia/editores/editorCapitulos/snippets//forms/SimpleImagePicker";
import { useEntidades }     from "./useEntidades";
import { parseSnippetRaw } from "./parseSnippetRaw";

type SnippetProps = {
  onInsert:       (s: string) => void;
  onClose:        () => void;
  initialRaw?:    string;
  listaCapitulos?: { id: string; orden: number; titulo_capitulo: string }[];
};

export const ModalDrop = ({ onInsert, onClose, initialRaw }: SnippetProps) => {
  const init = parseSnippetRaw(initialRaw);
  const initialEntidadId = init?.kind === "drop" ? init.entidadId : undefined;
  const EP = EntidadPicker as React.ComponentType<any>;
  return <EP open onClose={onClose} onInsert={onInsert} initialEntidadId={initialEntidadId} />;
};

export const ModalSonido = ({ onInsert, onClose, initialRaw }: SnippetProps) => {
  const init = parseSnippetRaw(initialRaw);
  const initialSrc = init?.kind === "sound" ? init.src : undefined;
  const SP = SoundPicker as React.ComponentType<any>;
  return <SP open onClose={onClose} onInsert={onInsert} initialSrc={initialSrc} />;
};

export const ModalSection = ({ onInsert, onClose, initialRaw }: SnippetProps) => {
  const init       = parseSnippetRaw(initialRaw);
  const isSection  = init?.kind === "section";
  const [sectionId, setSectionId] = useState(isSection ? init.id    : "");
  const [label,     setLabel]     = useState(isSection ? init.label : "");

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
        <CampoInput label="ID (debe coincidir con targets)" value={sectionId}
          onChange={v => setSectionId(v.toLowerCase().replace(/\s+/g, "-"))}
          placeholder={autoId || "ej: cofre"} />
        {snippet && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-btn px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono">{snippet}</code>
          </div>
        )}
        <button type="button" onClick={() => { if (!autoId) return; onInsert(snippet); onClose(); }} disabled={!autoId}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-btn font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <ChevronR size={13} /> Insertar Sección
        </button>
      </div>
    </ModalBase>
  );
};

export const ModalChoice = ({ onInsert, onClose, initialRaw, listaCapitulos }: SnippetProps) => {
  const init     = parseSnippetRaw(initialRaw);
  const isChoice = init?.kind === "choice";
  const [label,  setLabel]  = useState(isChoice ? init.texto  : "");
  const [target, setTarget] = useState(isChoice ? init.target : "");

  const snippet = label.trim() && target.trim() ? `[[choice|${label.trim()}|${target.trim()}]]` : "";
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
        <CampoInput label="Texto del botón" value={label} onChange={setLabel} placeholder="ej: Inspeccionar pared, Huir…" autoFocus />
        <CampoInput label="ID de sección destino" value={target} onChange={setTarget} placeholder="ej: exito-pared (debe coincidir con la sección)" />
        {snippet && (
          <div className="bg-primary/8 border border-primary/20 rounded-btn px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono break-all">{snippet}</code>
          </div>
        )}
        <button type="button" onClick={handleInsert} disabled={!snippet}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-btn font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <GitMerge size={13} /> Insertar Choice
        </button>
      </div>
    </ModalBase>
  );
};

export const ModalUseItem = ({ onInsert, onClose, initialRaw, listaCapitulos }: SnippetProps) => {
  const init   = parseSnippetRaw(initialRaw);
  const isUse  = init?.kind === "use";
  const [palabra,      setPalabra]      = useState(isUse ? init.label  : "");
  const [busqueda,     setBusqueda]     = useState("");
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(
    isUse && (init as any).itemId ? { id: (init as any).itemId, nombre: (init as any).itemId } : null
  );
  const [targetOk,     setTargetOk]     = useState(isUse ? (init as any).sectionOk : "");
  const [targetFail,   setTargetFail]   = useState(isUse ? (init as any).sectionFail : "");
  const { items, loading } = useEntidades("item");
  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  React.useEffect(() => {
    if (!isUse || !(init as any)?.itemId || !items.length) return;
    const found = items.find(i => i.id === (init as any).itemId);
    if (found) setSelectedItem(found);
  }, [items, isUse, init]);

  const snippet = palabra.trim() && selectedItem && targetOk.trim()
    ? `[[use|${palabra.trim()}|${selectedItem.id}|${targetOk.trim()}${targetFail.trim() ? `|${targetFail.trim()}` : ""}]]`
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
        <CampoInput label="Palabra en el texto" value={palabra} onChange={setPalabra} placeholder="ej: usar llave, forzar cofre…" autoFocus />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Ítem requerido</label>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ítem…"
            className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30" />
          <div className="max-h-28 overflow-y-auto space-y-0.5 mt-1">
            {loading
              ? <p className="text-[9px] text-primary/30 p-2">Cargando…</p>
              : filtrados.map(item => (
                <button key={item.id} type="button" onClick={() => setSelectedItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-btn text-[11px] font-bold transition-all ${selectedItem?.id === item.id ? "bg-primary text-btn-text" : "hover:bg-primary/8 text-primary"}`}>
                  {item.nombre}
                </button>
              ))
            }
          </div>
        </div>
        <CampoInput label="ID Sección si TIENE el ítem *" value={targetOk} onChange={setTargetOk} placeholder="ej: abrir-cofre" />
        <CampoInput label="ID Sección si NO tiene (opcional)" value={targetFail} onChange={setTargetFail} placeholder="ej: falla-cofre" />
        
        {snippet && (
          <div className="bg-primary/8 border border-primary/20 rounded-btn px-3 py-2">
            <code className="text-[10px] text-primary/70 font-mono break-all">{snippet}</code>
          </div>
        )}
        <button type="button" onClick={() => { if (!snippet) return; onInsert(snippet); onClose(); }} disabled={!snippet}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-btn font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <MousePointerClick size={13} /> Insertar Use
        </button>
      </div>
    </ModalBase>
  );
};

export const ModalGate = ({ onInsert, onClose, initialRaw }: SnippetProps) => {
  const init   = parseSnippetRaw(initialRaw);
  const isGate = init?.kind === "gate";
  const [busqueda,     setBusqueda]     = useState("");
  const [selectedItem, setSelectedItem] = useState<{ id: string; nombre: string } | null>(
    isGate && (init as any).itemId ? { id: (init as any).itemId, nombre: (init as any).itemId } : null
  );
  const [tieneTexto,   setTieneTexto]   = useState(isGate ? (init as any).tieneTexto   ?? "" : "");
  const [noTieneTexto, setNoTieneTexto] = useState(isGate ? (init as any).noTieneTexto ?? "" : "");
  const { items, loading } = useEntidades("item");
  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  React.useEffect(() => {
    if (!isGate || !(init as any)?.itemId || !items.length) return;
    const found = items.find(i => i.id === (init as any).itemId);
    if (found) setSelectedItem(found);
  }, [items, init, isGate]);

  const snippet = selectedItem && tieneTexto.trim()
    ? `[[gate|${selectedItem.id}|\n${tieneTexto.trim()}\n===\n${noTieneTexto.trim()}\n]]`
    : "";

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <GitFork size={12} className="text-amber-500" /> Puerta de Ítem
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Ítem requerido *</label>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ítem…"
            className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30" />
          <div className="max-h-28 overflow-y-auto space-y-0.5 mt-1">
            {loading
              ? <p className="text-[9px] text-primary/30 p-2">Cargando…</p>
              : filtrados.map(item => (
                <button key={item.id} type="button" onClick={() => setSelectedItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-btn text-[11px] font-bold transition-all ${selectedItem?.id === item.id ? "bg-primary text-btn-text" : "hover:bg-primary/8 text-primary"}`}>
                  {item.nombre}
                </button>
              ))
            }
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            Texto si <span className="text-emerald-500">TIENE</span> el ítem *
          </label>
          <textarea
            value={tieneTexto} onChange={e => setTieneTexto(e.target.value)}
            placeholder={"El personaje saca la llave y abre la puerta...\nPodés usar **markdown**, [[choice|...]] etc."}
            rows={4}
            className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30 resize-none font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            Texto si <span className="text-rose-400">NO tiene</span> el ítem <span className="opacity-50">(opcional)</span>
          </label>
          <textarea
            value={noTieneTexto} onChange={e => setNoTieneTexto(e.target.value)}
            placeholder={"La puerta no cede. Le falta algo...\nDejá vacío para no mostrar nada."}
            rows={4}
            className="w-full bg-bg-main border border-primary/15 rounded-btn px-3 py-2 text-[11px] text-primary outline-none focus:border-primary/30 resize-none font-mono"
          />
        </div>

        {snippet && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-btn px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-500/60 mb-1">Preview</p>
            <pre className="text-[10px] text-primary/70 font-mono whitespace-pre-wrap break-all">{snippet}</pre>
          </div>
        )}

        <button type="button" onClick={() => { if (!snippet) return; onInsert(snippet); onClose(); }} disabled={!snippet}
          className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-btn font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all hover:opacity-80">
          <GitFork size={13} /> Insertar Gate
        </button>
      </div>
    </ModalBase>
  );
};

export const ModalImagen = ({ onInsert, onClose, initialRaw }: SnippetProps) => {
  const init    = parseSnippetRaw(initialRaw);
  const isImg   = init?.kind === "img" || init?.kind === "float";
  const [selected, setSelected] = useState<string | null>(isImg ? (init as any).url   : null);
  const [caption,  setCaption]  = useState(              isImg ? (init as any).alt   : "");
  const [word,     setWord]     = useState(              isImg && init?.kind === "float" ? (init as any).alt : "");
  const [mode,     setMode]     = useState<"img" | "float">(init?.kind === "float" ? "float" : "img");

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
              className={`flex-1 py-2 rounded-btn text-[9px] font-black uppercase border transition-all ${mode === o.k ? "bg-primary text-btn-text border-primary" : "border-primary/15 text-primary/40 hover:border-primary/30"}`}>
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
              className="w-full flex items-center justify-center gap-2 bg-primary text-btn-text py-3 rounded-btn font-black uppercase text-[10px] tracking-widest transition-all hover:opacity-80">
              <Image size={13} /> Insertar Imagen
            </button>
          </>
        )}
      </div>
    </ModalBase>
  );
};

export const SnippetToolbar = ({
  textareaRef, value, onChange,
}: {
  textareaRef:    React.RefObject<HTMLTextAreaElement>;
  value:          string;
  onChange:       (v: string) => void;
}) => {
  const [openModal, setOpenModal] = useState<"drop" | "choice" | "use" | "section" | "sound" | "imagen" | "gate" | null>(null);

  const insertAtCursor = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + snippet); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const next = value.slice(0, s) + snippet + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + snippet.length, s + snippet.length); }, 0);
  }, [textareaRef, value, onChange]);

  const btnCls = "flex items-center gap-1 px-2.5 py-1.5 rounded-btn text-[9px] font-black uppercase tracking-wide transition-all text-primary/50 hover:text-primary hover:bg-primary/8 border border-transparent hover:border-primary/10";

  const btns = [
    { key: "drop",    label: "Drop",       icon: <Sword size={11} /> },
    { key: "imagen",  label: "Imagen",     icon: <Image size={11} /> },
    { key: "choice",  label: "Choice",     icon: <GitMerge size={11} /> },
    { key: "use",     label: "Use Ítem",   icon: <MousePointerClick size={11} /> },
    { key: "gate",    label: "Gate Ítem",  icon: <GitFork size={11} /> },
    { key: "section", label: "Sección",    icon: <ChevronR size={11} /> },
    { key: "sound",   label: "Sonido",     icon: <Music2 size={11} /> },
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
      {openModal === "choice"  && <ModalChoice  onInsert={insertAtCursor} onClose={close} />}
      {openModal === "use"     && <ModalUseItem onInsert={insertAtCursor} onClose={close} />}
      {openModal === "gate"    && <ModalGate    onInsert={insertAtCursor} onClose={close} />}
      {openModal === "section" && <ModalSection onInsert={insertAtCursor} onClose={close} />}
      {openModal === "sound"   && <ModalSonido  onInsert={insertAtCursor} onClose={close} />}
      {openModal === "imagen"  && <ModalImagen  onInsert={insertAtCursor} onClose={close} />}
    </>
  );
};