"use client";

import React, { useEffect, useState } from "react";
import { X, Image, Folder, FolderOpen, ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SimpleImagePickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function SimpleImagePicker({ onSelect, onClose }: SimpleImagePickerProps) {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dibujos")
      .then(r => r.json())
      .then(d => { if (d.ok) setTree(d.tree); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Listado de imágenes */}
      <div className="flex-1 overflow-y-auto p-4 border-b border-primary/5">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2">
            <Loader2 size={16} className="animate-spin text-primary/30" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Aquí podrías aplanar el árbol o mantener la navegación, 
                pero para simplificar, mostramos las imágenes directamente */}
            {tree.map((node: any, i: number) => (
              <button 
                key={i}
                onClick={() => setSelected(node.url)}
                className={cn(
                  "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                  selected === node.url ? "border-primary shadow-lg" : "border-transparent bg-bg-main"
                )}
              >
                <img src={node.url} className="w-full h-full object-cover" />
                {selected === node.url && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="text-white" size={24} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer con acción única */}
      <div className="p-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-primary/40">
          Cancelar
        </button>
        <button 
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-30"
        >
          Seleccionar imagen
        </button>
      </div>
    </div>
  );
}