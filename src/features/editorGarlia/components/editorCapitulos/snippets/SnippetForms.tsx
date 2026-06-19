"use client";
/**
 * SnippetForms.tsx
 * ────────────────
 * Los tres pickers pesados que usan los modales de snippets.
 * Reemplaza los 3 archivos separados:
 *   - EntidadPicker.tsx
 *   - SoundPicker.tsx
 *   - SimpleImagePicker.tsx
 *
 * Actualizar imports en SnippetModals.tsx:
 *   - Antes:
 *       import { SoundPicker }       from ".../forms/SoundPicker";
 *       import { EntidadPicker }     from ".../forms/EntidadPicker";
 *       import SimpleImagePicker     from ".../forms/SimpleImagePicker";
 *   - Después:
 *       import { SoundPicker, EntidadPicker, SimpleImagePicker } from "./SnippetForms";
 */

import { AnimatePresence } from "framer-motion";
import {
  X, Music, Folder, FolderOpen, ChevronRight, Check, Loader2,
  Play, Pause, Volume2, Search, Package, Sword, User, Home,
} from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { cn } from "@/lib/utils/index";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartidos de árbol de archivos
// ─────────────────────────────────────────────────────────────────────────────

interface AudioFile  { name: string; url: string; type: "audio" }
interface ImageFile  { name: string; url: string; type: "image" }
interface FolderNode { name: string; type: "folder"; children: TreeNode[] }
type TreeNode = AudioFile | ImageFile | FolderNode;

// ─────────────────────────────────────────────────────────────────────────────
// EntidadPicker
// ─────────────────────────────────────────────────────────────────────────────

interface Entidad {
  id:          string;
  nombre:      string;
  tipo:        "item" | "criatura" | "personaje";
  subtipo?:    string;
  imagen_url?: string;
  descripcion?: string;
}

interface EntidadPickerProps {
  open:                boolean;
  onClose:             () => void;
  onInsert:            (snippet: string) => void;
  tipoFijo?:           "item" | "criatura" | "personaje";
  initialEntidadId?:   string;
  initialEntidadTipo?: string;
}

export function EntidadPicker({
  open, onClose, onInsert, tipoFijo, initialEntidadId, initialEntidadTipo,
}: EntidadPickerProps) {
  const resolvedInitialTipo =
    tipoFijo ??
    (initialEntidadTipo as "item" | "criatura" | "personaje" | undefined) ??
    "item";

  const [tab, setTab]           = useState<"item" | "criatura" | "personaje">(resolvedInitialTipo);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<Entidad | null>(null);
  const [palabra, setPalabra]   = useState("");

  useEffect(() => {
    if (!open) return;
    setTab(resolvedInitialTipo);
    setSelected(null);
    setQuery("");
    setPalabra("");
    setLoading(true);
    setError(null);

    fetch(`/api/entidades?tipo=${tipoFijo ?? ""}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error);

        const items = (d.data?.items ?? []).map((x: any) => ({
          id: x.id, nombre: x.nombre, tipo: "item" as const,
          subtipo: x.categoria || "Objeto", imagen_url: x.imagen_url, descripcion: x.descripcion,
        }));
        const criaturas = (d.data?.criaturas ?? []).map((x: any) => ({
          id: x.id, nombre: x.nombre, tipo: "criatura" as const,
          subtipo: x.habitat || "Criatura", imagen_url: x.img_url || x.imagen_url,
          descripcion: x.descripcion || x.sobre,
        }));
        const personajes = (d.data?.personajes ?? []).map((x: any) => ({
          id: x.id, nombre: x.nombre, tipo: "personaje" as const,
          subtipo: x.ocupacion || (x.visible ? "Poblador" : "Misterioso"),
          imagen_url: x.img_url || x.imagen_url, descripcion: x.descripcion || x.sobre,
        }));

        const todas = [...items, ...criaturas, ...personajes];
        setEntidades(todas);

        if (initialEntidadId) {
          const encontrada = todas.find(e => e.id === initialEntidadId);
          if (encontrada) setSelected(encontrada);
        }
      })
      .catch(e => { console.error("Error en Picker:", e); setError("Error al cargar entidades"); })
      .finally(() => setLoading(false));
  }, [open, tipoFijo, initialEntidadId, initialEntidadTipo]);

  const lista = entidades
    .filter(e => e.tipo === tab)
    .filter(e => !query || e.nombre.toLowerCase().includes(query.toLowerCase()));

  const handleInsert = () => {
    if (!selected || !palabra.trim()) return;
    onInsert(`[[drop|${palabra.trim()}|${selected.tipo}|${selected.id}|${selected.nombre}]]`);
    onClose();
  };

  const getIcon = (tipo: string, size = 14) => {
    if (tipo === "item") return <Package size={size} />;
    if (tipo === "criatura") return <Sword size={size} />;
    return <User size={size} />;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <MotionDiv
            animate={{ opacity: 1 }} className="fixed inset-0 z-[72] bg-primary-dark/50 backdrop-blur-sm" exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
          <MotionDiv
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed z-[73] inset-x-4 bottom-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[600px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            style={{ maxHeight: "85vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/8 shrink-0">
              <div>
                <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight">Easter Egg — Drop</h3>
                <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mt-0.5">
                  Vincula una palabra a una entidad
                </p>
              </div>
              <button
                className="w-8 h-8 rounded-xl bg-primary/6 hover:bg-primary/12 flex items-center justify-center text-primary/50 transition-all"
                onClick={onClose}
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Lista */}
              <div className="w-1/2 border-r border-primary/8 flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-primary/8 shrink-0">
                  {(["item", "criatura", "personaje"] as const).map(t => (
                    <button
                      key={t}
                      className={cn(
                        "flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all",
                        tab === t ? "text-primary border-b-2 border-primary" : "text-primary/30 hover:text-primary/60",
                      )}
                      onClick={() => { setTab(t); setSelected(null); }}
                    >
                      {getIcon(t, 12)} {t}s
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="px-3 py-2 border-b border-primary/8 shrink-0">
                  <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
                    <Search className="text-primary/30 shrink-0" size={13} />
                    <input
                      className="flex-1 bg-transparent text-[11px] font-semibold text-primary-dark outline-none"
                      placeholder="Buscar..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Resultados */}
                <div className="flex-1 overflow-y-auto py-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-24 gap-2 text-primary/30">
                      <Loader2 className="animate-spin" size={14} />
                      <span className="text-[10px] font-black uppercase">Cargando…</span>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-center text-[9px] text-red-400 font-bold uppercase italic leading-tight">{error}</div>
                  ) : lista.length === 0 ? (
                    <div className="p-8 text-center text-[9px] text-primary/20 font-black uppercase tracking-widest">Sin resultados</div>
                  ) : lista.map(e => (
                    <button
                      key={e.id}
                      className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all",
                        selected?.id === e.id ? "bg-primary/10 shadow-inner" : "hover:bg-primary/5")}
                      onClick={() => setSelected(e)}
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-primary/10 bg-primary/5 flex items-center justify-center">
                        {e.imagen_url
                          ? <img alt={e.nombre} className="w-full h-full object-cover" src={e.imagen_url} />
                          : getIcon(e.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-bold truncate",
                          selected?.id === e.id ? "text-primary" : "text-primary-dark")}>{e.nombre}</p>
                        <p className="text-[9px] text-primary/35 uppercase tracking-widest font-black">{e.subtipo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalle */}
              <div className="w-1/2 flex flex-col overflow-y-auto bg-primary/[0.01]">
                {selected ? (
                  <div className="p-5 flex flex-col gap-5 flex-1">
                    <div className="flex items-center gap-3 p-3 bg-white border border-primary/8 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center shrink-0">
                        {selected.imagen_url
                          ? <img alt="" className="w-full h-full object-cover" src={selected.imagen_url} />
                          : getIcon(selected.tipo, 16)}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-primary uppercase tracking-tight">{selected.nombre}</p>
                        <p className="text-[9px] text-primary/40 uppercase tracking-widest font-black">{selected.tipo}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-1">
                        Palabra en el texto
                      </label>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-primary/12 text-sm focus:outline-none focus:border-primary/30 transition-all bg-white shadow-sm"
                        placeholder="Ej: la espada antigua..."
                        value={palabra}
                        onChange={e => setPalabra(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-20">
                    {getIcon(tab, 24)}
                    <p className="text-[10px] font-black uppercase mt-2 italic">"Selecciona un {tab}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-primary/8 shrink-0 flex items-center justify-between bg-white">
              <button
                className="text-[10px] font-black uppercase text-primary/40 hover:text-primary/60 transition-colors"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase bg-primary text-white disabled:opacity-30 shadow-lg shadow-primary/20 transition-all active:scale-95"
                disabled={!selected || !palabra.trim()}
                onClick={handleInsert}
              >
                Insertar Drop
              </button>
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoundPicker
// ─────────────────────────────────────────────────────────────────────────────

interface SoundPickerProps {
  open:       boolean;
  onClose:    () => void;
  onInsert:   (snippet: string) => void;
  initialSrc?: string;
}

export function SoundPicker({ open, onClose, onInsert, initialSrc }: SoundPickerProps) {
  const [tree, setTree]         = useState<TreeNode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(initialSrc ?? null);
  const [volume, setVolume]     = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/sonidos")
        .then(res => res.json())
        .then(data => { if (data.ok) setTree(data.tree); setLoading(false); });
    } else {
      stopAudio();
    }
  }, [open]);

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
  };

  const togglePreview = (url: string) => {
    if (selected === url && isPlaying) {
      stopAudio();
    } else {
      if (!audioRef.current) audioRef.current = new Audio(url);
      else audioRef.current.src = url;
      audioRef.current.volume = volume;
      audioRef.current.play();
      setIsPlaying(true);
      setSelected(url);
    }
  };

  const handleInsert = () => {
    if (!selected) return;
    onInsert(`[[sound|${selected}|${volume.toFixed(1)}]]`);
    onClose();
  };

  const toggleFolder = (path: string) =>
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));

  const renderTree = (nodes: TreeNode[], path = ""): React.ReactNode => nodes.map(node => {
    const currentPath = `${path}/${node.name}`;
    if (node.type === "folder") {
      const isExp = expanded[currentPath];
      return (
        <div key={currentPath} className="select-none">
          <div
            className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#6B5E70]/5 rounded-lg cursor-pointer transition-colors"
            onClick={() => toggleFolder(currentPath)}
          >
            <ChevronRight className={cn("text-[#6B5E70]/40 transition-transform", isExp && "rotate-90")} size={14} />
            {isExp
              ? <FolderOpen className="text-[#6B5E70]/60" size={16} />
              : <Folder className="text-[#6B5E70]/40" size={16} />}
            <span className="text-[11px] font-bold text-[#6B5E70]/70 uppercase tracking-tight">{node.name}</span>
          </div>
          {isExp && (
            <div className="ml-4 border-l border-[#6B5E70]/10 pl-2 mt-1 mb-2">
              {renderTree(node.children, currentPath)}
            </div>
          )}
        </div>
      );
    }
    if (node.type !== "audio") return null;
    const isSel = selected === node.url;
    return (
      <div
        key={node.url}
        className={cn(
          "flex items-center justify-between py-1.5 px-3 rounded-lg cursor-pointer mb-1 transition-all",
          isSel ? "bg-[#6B5E70] text-white shadow-md shadow-[#6B5E70]/20" : "hover:bg-[#6B5E70]/5 text-[#6B5E70]/60",
        )}
        onClick={() => setSelected(node.url)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className={isSel ? "text-white/80" : "text-[#6B5E70]/30"} size={14} />
          <span className="text-[10px] font-medium truncate uppercase tracking-widest">{node.name}</span>
        </div>
        {isSel && <Check className="text-white" size={12} />}
      </div>
    );
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/20">
      <MotionDiv
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl h-[500px] rounded-[32px] shadow-2xl border border-[#6B5E70]/10 flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#6B5E70]/5 flex items-center justify-between bg-gradient-to-r from-white to-[#6B5E70]/5">
          <div>
            <h3 className="text-[#6B5E70] font-black text-xs uppercase tracking-[0.2em]">Biblioteca de Sonidos</h3>
            <p className="text-[10px] text-[#6B5E70]/40 font-bold uppercase mt-1">Solo para Franilover</p>
          </div>
          <button className="p-2 hover:bg-[#6B5E70]/10 rounded-full transition-colors text-[#6B5E70]/40 hover:text-[#6B5E70]" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Árbol */}
          <div className="w-64 border-r border-[#6B5E70]/5 overflow-y-auto p-4">
            {loading
              ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-[#6B5E70]/20" size={20} /></div>
              : renderTree(tree)}
          </div>

          {/* Preview */}
          <div className="flex-1 bg-[#FDFCFD] p-8 flex flex-col items-center justify-center">
            {selected ? (
              <div className="w-full max-w-xs space-y-8 text-center">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#6B5E70]/5 flex items-center justify-center text-[#6B5E70] animate-pulse">
                    <Music size={32} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#6B5E70] uppercase tracking-widest truncate">
                    {selected.split('/').pop()}
                  </p>
                  <p className="text-[9px] text-[#6B5E70]/40 mt-1 uppercase">Ambientación Dinámica</p>
                </div>
                <div className="flex flex-col gap-6 bg-white p-6 rounded-[24px] shadow-sm border border-[#6B5E70]/5">
                  <button
                    className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-[#6B5E70] text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#6B5E70]/20"
                    onClick={() => togglePreview(selected)}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isPlaying ? "Pausar" : "Escuchar Preview"}
                  </button>
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between items-center text-[9px] font-black text-[#6B5E70]/40 uppercase tracking-tighter">
                      <span>Volumen</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      className="w-full accent-[#6B5E70] h-1 bg-[#6B5E70]/10 rounded-lg appearance-none cursor-pointer" max="1" min="0" step="0.1" type="range"
                      value={volume}
                      onChange={e => {
                        setVolume(parseFloat(e.target.value));
                        if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-30">
                <Volume2 className="mx-auto text-[#6B5E70] mb-4" size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6B5E70]">Selecciona un ambiente</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-[#6B5E70]/5 flex items-center justify-between bg-white shrink-0">
          <p className="text-[9px] text-[#6B5E70]/30 font-bold uppercase">
            {selected ? "Audio listo para Franilover" : "Esperando selección"}
          </p>
          <div className="flex gap-3">
            <button className="px-5 py-2 text-[10px] font-black uppercase text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="px-6 py-2 bg-[#6B5E70] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#6B5E70]/20 hover:scale-105 active:scale-95 disabled:opacity-20 transition-all"
              disabled={!selected}
              onClick={handleInsert}
            >
              Insertar Sonido
            </button>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleImagePicker
// ─────────────────────────────────────────────────────────────────────────────

interface SimpleImagePickerProps {
  onSelect: (url: string) => void;
  onClose:  () => void;
}

function flattenImages(nodes: TreeNode[]): ImageFile[] {
  return nodes.flatMap(n =>
    n.type === "image" ? [n as ImageFile] : n.type === "folder" ? flattenImages(n.children) : [],
  );
}

export function SimpleImagePicker({ onSelect, onClose }: SimpleImagePickerProps) {
  const [tree, setTree]         = useState<TreeNode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [stack, setStack]       = useState<{ name: string; nodes: TreeNode[] }[]>([]);

  useEffect(() => {
    fetch("/api/dibujos")
      .then(r => r.json())
      .then(d => { if (d.ok) setTree(d.tree); })
      .finally(() => setLoading(false));
  }, []);

  const currentNodes = stack.length > 0 ? stack[stack.length - 1].nodes : tree;
  const folders = useMemo(() => currentNodes.filter((n): n is FolderNode => n.type === "folder"), [currentNodes]);
  const images  = useMemo(() => currentNodes.filter((n): n is ImageFile  => n.type === "image"),  [currentNodes]);

  const openFolder = (folder: FolderNode) =>
    setStack(prev => [...prev, { name: folder.name, nodes: folder.children }]);
  const goBack = (index: number) =>
    setStack(prev => prev.slice(0, index));

  return (
    <div className="flex flex-col" style={{ maxHeight: "60vh" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-1 pb-3 flex-wrap">
        <button
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-on-surface hover:text-on-surface transition-colors"
          type="button"
          onClick={() => setStack([])}
        >
          <Home size={12} /> Inicio
        </button>
        {stack.map((s, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="text-muted-on-surface opacity-40" size={10} />
            <button
              className="text-[10px] font-black uppercase tracking-widest text-muted-on-surface hover:text-on-surface transition-colors"
              type="button"
              onClick={() => goBack(i + 1)}
            >
              {s.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary/30" size={20} />
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder, i) => (
                  <button
                    key={i} className="flex items-center gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-all text-left group border border-primary/10 hover:border-primary/20"
                    style={{ borderRadius: "var(--radius-btn)" }}
                    type="button"
                    onClick={() => openFolder(folder)}
                  >
                    <FolderOpen className="text-primary/40 group-hover:text-primary/70 transition-colors shrink-0" size={16} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface truncate">
                        {folder.name}
                      </p>
                      <p className="text-[9px] text-muted-on-surface">
                        {flattenImages(folder.children).length} imágenes
                      </p>
                    </div>
                    <ChevronRight className="text-muted-on-surface opacity-40 ml-auto shrink-0" size={12} />
                  </button>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i} className={cn(
                      "relative aspect-square overflow-hidden border-2 transition-all",
                      selected === img.url
                        ? "border-primary shadow-lg scale-[0.97]"
                        : "border-transparent hover:border-primary/30",
                    )}
                    style={{ borderRadius: "var(--radius-btn)" }}
                    type="button"
                    onClick={() => setSelected(img.url)}
                  >
                    <img alt={img.name} className="w-full h-full object-cover" loading="lazy" src={img.url} />
                    {selected === img.url && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <div className="bg-primary rounded-full p-1 shadow">
                          <Check className="text-btn-text drop-shadow" size={16} />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {folders.length === 0 && images.length === 0 && (
              <p className="text-center text-[11px] text-muted-on-surface py-10 uppercase tracking-widest">
                Carpeta vacía
              </p>
            )}
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="pt-4 flex gap-3">
        <button
          className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-muted-on-surface hover:text-on-surface transition-colors" type="button"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="btn-brand flex-[2] py-4 text-xs uppercase tracking-widest disabled:opacity-30"
          disabled={!selected}
          type="button"
          onClick={() => selected && onSelect(selected)}
        >
          Seleccionar
        </button>
      </div>
    </div>
  );
}
