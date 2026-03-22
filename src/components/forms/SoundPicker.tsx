"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Music, Folder, FolderOpen, ChevronRight, Check, Loader2, Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FileEntry   { name: string; url: string; type: "audio" }
interface FolderEntry { name: string; type: "folder"; children: TreeNode[] }
type TreeNode = FileEntry | FolderEntry;

interface SoundPickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (snippet: string) => void;
}

export function SoundPicker({ open, onClose, onInsert }: SoundPickerProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  
  
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/sonidos")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setTree(data.tree);
          setLoading(false);
        });
    } else {
      stopAudio();
    }
  }, [open]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
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

  const toggleFolder = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (nodes: TreeNode[], path = "") => {
    return nodes.map((node) => {
      const currentPath = `${path}/${node.name}`;
      if (node.type === "folder") {
        const isExp = expanded[currentPath];
        return (
          <div key={currentPath} className="select-none">
            <div 
              onClick={() => toggleFolder(currentPath)}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#6B5E70]/5 rounded-lg cursor-pointer transition-colors"
            >
              <ChevronRight size={14} className={cn("text-[#6B5E70]/40 transition-transform", isExp && "rotate-90")} />
              {isExp ? <FolderOpen size={16} className="text-[#6B5E70]/60" /> : <Folder size={16} className="text-[#6B5E70]/40" />}
              <span className="text-[11px] font-bold text-[#6B5E70]/70 uppercase tracking-tight">{node.name}</span>
            </div>
            {isExp && <div className="ml-4 border-l border-[#6B5E70]/10 pl-2 mt-1 mb-2">{renderTree(node.children, currentPath)}</div>}
          </div>
        );
      }
      
      const isSel = selected === node.url;
      return (
        <div 
          key={node.url}
          onClick={() => setSelected(node.url)}
          className={cn(
            "flex items-center justify-between py-1.5 px-3 rounded-lg cursor-pointer mb-1 transition-all",
            isSel ? "bg-[#6B5E70] text-white shadow-md shadow-[#6B5E70]/20" : "hover:bg-[#6B5E70]/5 text-[#6B5E70]/60"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Music size={14} className={isSel ? "text-white/80" : "text-[#6B5E70]/30"} />
            <span className="text-[10px] font-medium truncate uppercase tracking-widest">{node.name}</span>
          </div>
          {isSel && <Check size={12} className="text-white" />}
        </div>
      );
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl h-[500px] rounded-[32px] shadow-2xl border border-[#6B5E70]/10 flex flex-col overflow-hidden"
      >
        {}
        <div className="px-8 py-6 border-b border-[#6B5E70]/5 flex items-center justify-between bg-gradient-to-r from-white to-[#6B5E70]/5">
          <div>
            <h3 className="text-[#6B5E70] font-black text-xs uppercase tracking-[0.2em]">Biblioteca de Sonidos</h3>
            <p className="text-[10px] text-[#6B5E70]/40 font-bold uppercase mt-1">Solo para Franilover</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#6B5E70]/10 rounded-full transition-colors text-[#6B5E70]/40 hover:text-[#6B5E70]"><X size={20} /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          {}
          <div className="w-64 border-r border-[#6B5E70]/5 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-[#6B5E70]/20" /></div>
            ) : (
              renderTree(tree)
            )}
          </div>

          {}
          <div className="flex-1 bg-[#FDFCFD] p-8 flex flex-col items-center justify-center relative overflow-hidden">
            {selected ? (
              <div className="w-full max-w-xs space-y-8 relative z-10 text-center">
                <div className="flex justify-center">
                   <div className="w-20 h-20 rounded-full bg-[#6B5E70]/5 flex items-center justify-center text-[#6B5E70] animate-pulse">
                      <Music size={32} />
                   </div>
                </div>
                
                <div>
                  <p className="text-[10px] font-black text-[#6B5E70] uppercase tracking-widest truncate">{selected.split('/').pop()}</p>
                  <p className="text-[9px] text-[#6B5E70]/40 mt-1 uppercase">Ambientación Dinámica</p>
                </div>

                <div className="flex flex-col gap-6 bg-white p-6 rounded-[24px] shadow-sm border border-[#6B5E70]/5">
                   <button 
                    onClick={() => togglePreview(selected)}
                    className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-[#6B5E70] text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#6B5E70]/20"
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
                        type="range" min="0" max="1" step="0.1" 
                        value={volume} onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value);
                        }}
                        className="w-full accent-[#6B5E70] h-1 bg-[#6B5E70]/10 rounded-lg appearance-none cursor-pointer"
                     />
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-30">
                <Volume2 size={40} className="mx-auto text-[#6B5E70] mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6B5E70]">Selecciona un ambiente</p>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="px-8 py-4 border-t border-[#6B5E70]/5 flex items-center justify-between bg-white shrink-0">
          <p className="text-[9px] text-[#6B5E70]/30 font-bold uppercase">{selected ? "Audio listo para Franilover" : "Esperando selección"}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-[10px] font-black uppercase text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors">Cancelar</button>
            <button 
              onClick={handleInsert}
              disabled={!selected}
              className="px-6 py-2 bg-[#6B5E70] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#6B5E70]/20 hover:scale-105 active:scale-95 disabled:opacity-20 transition-all"
            >
              Insertar Sonido
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}