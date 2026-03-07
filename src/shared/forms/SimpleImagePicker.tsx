"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Folder, FolderOpen, ChevronRight, Check, Loader2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleImagePickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

type FileEntry   = { name: string; url: string; type: "image" };
type FolderEntry = { name: string; type: "folder"; children: TreeNode[] };
type TreeNode    = FileEntry | FolderEntry;

// Devuelve todas las imágenes de un nodo (recursivo)
function flattenImages(nodes: TreeNode[]): FileEntry[] {
  return nodes.flatMap(n =>
    n.type === "image" ? [n] : flattenImages(n.children)
  );
}

export default function SimpleImagePicker({ onSelect, onClose }: SimpleImagePickerProps) {
  const [tree, setTree]       = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  // Pila de carpetas: cada elemento es la lista de nodos de esa carpeta
  const [stack, setStack] = useState<{ name: string; nodes: TreeNode[] }[]>([]);

  useEffect(() => {
    fetch("/api/dibujos")
      .then(r => r.json())
      .then(d => { if (d.ok) setTree(d.tree); })
      .finally(() => setLoading(false));
  }, []);

  // Nodos actuales: raíz o carpeta abierta
  const currentNodes = stack.length > 0 ? stack[stack.length - 1].nodes : tree;

  const folders = useMemo(
    () => currentNodes.filter((n): n is FolderEntry => n.type === "folder"),
    [currentNodes]
  );
  const images = useMemo(
    () => currentNodes.filter((n): n is FileEntry => n.type === "image"),
    [currentNodes]
  );

  const openFolder = (folder: FolderEntry) => {
    setStack(prev => [...prev, { name: folder.name, nodes: folder.children }]);
  };

  const goBack = (index: number) => {
    setStack(prev => prev.slice(0, index));
  };

  return (
    <div className="flex flex-col" style={{ maxHeight: "60vh" }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-1 pb-3 flex-wrap">
        <button
          onClick={() => setStack([])}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
        >
          <Home size={12} /> Inicio
        </button>
        {stack.map((s, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={10} className="text-primary/20" />
            <button
              onClick={() => goBack(i + 1)}
              className="text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
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
            <Loader2 size={20} className="animate-spin text-primary/30" />
          </div>
        ) : (
          <>
            {/* Carpetas */}
            {folders.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder, i) => (
                  <button
                    key={i}
                    onClick={() => openFolder(folder)}
                    className="flex items-center gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 rounded-2xl transition-all text-left group"
                  >
                    <FolderOpen size={16} className="text-primary/40 group-hover:text-primary transition-colors shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 truncate">
                        {folder.name}
                      </p>
                      <p className="text-[9px] text-primary/30">
                        {flattenImages(folder.children).length} imágenes
                      </p>
                    </div>
                    <ChevronRight size={12} className="text-primary/20 ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Imágenes */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(img.url)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      selected === img.url
                        ? "border-primary shadow-lg scale-[0.97]"
                        : "border-transparent hover:border-primary/30"
                    )}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {selected === img.url && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Check className="text-white drop-shadow" size={22} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {folders.length === 0 && images.length === 0 && (
              <p className="text-center text-[11px] text-primary/30 py-10 uppercase tracking-widest">
                Carpeta vacía
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-30 transition-all hover:bg-primary/90"
        >
          Seleccionar
        </button>
      </div>
    </div>
  );
}