"use client";

import React, { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionTextarea } from "./SeccionTextarea";
import type { Seccion, IdiomaKey } from "../../types";

export const SeccionEditor = ({
  sec, idiomaA, idiomaB, splitMode, viewMode, countMode,
  onSaveField, onSaveNombre, onDelete, onDuplicate, onMoveUp, onMoveDown,
  isFirst, isLast,
}: {
  sec: Seccion;
  idiomaA: IdiomaKey;
  idiomaB: IdiomaKey;
  splitMode: boolean;
  viewMode: "edit" | "preview";
  countMode: "silabas" | "vocales";
  onSaveField: (id: string, updates: Partial<Seccion>) => Promise<void>;
  onSaveNombre: (id: string, nombre: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (sec: Seccion) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [nombre, setNombre] = useState(sec.nombre_seccion);
  const { confirm, ConfirmModal } = useConfirm();

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2">
        <GripVertical size={13} className="text-primary/15 shrink-0" />
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onBlur={() => nombre !== sec.nombre_seccion && onSaveNombre(sec.id, nombre)}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 bg-transparent text-[11px] font-black uppercase text-primary outline-none tracking-widest placeholder:text-primary/20 min-w-0 hover:bg-primary/5 focus:bg-primary/8 rounded-lg px-2 py-0.5 -mx-2 transition-colors"
          placeholder="NOMBRE DE SECCIÓN…"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onMoveUp}   disabled={isFirst} className="p-1 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary disabled:opacity-20 transition-all"><ChevronUp   size={12} /></button>
          <button onClick={onMoveDown} disabled={isLast}  className="p-1 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary disabled:opacity-20 transition-all"><ChevronDown size={12} /></button>
          <button
            onClick={() => onDuplicate(sec)}
            title="Duplicar sección"
            className="p-1 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary transition-all"
          ><Copy size={12} /></button>
          <button onClick={async () => {
            const ok = await confirm({ message: `¿Eliminar sección "${nombre}"?`, danger: true });
            if (ok) onDelete(sec.id);
          }} className="p-1 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
        </div>
      </div>

      <div className={`px-4 pb-4 ${splitMode ? "flex gap-3" : ""}`}>
        {/*
          En split mode:
          - columna izquierda (idiomaA) toma como referencia idiomaB
          - columna derecha  (idiomaB) toma como referencia idiomaA
          En modo simple no hay referencia automática.
        */}
        <SeccionTextarea
          sec={sec}
          idioma={idiomaA}
          refIdioma={splitMode ? idiomaB : undefined}
          onSave={onSaveField}
          nombreSeccion={nombre}
          viewMode={viewMode}
          countMode={countMode}
        />
        {splitMode && (
          <>
            <div className="w-px bg-primary/10 shrink-0 self-stretch" />
            <SeccionTextarea
              sec={sec}
              idioma={idiomaB}
              refIdioma={idiomaA}
              onSave={onSaveField}
              nombreSeccion={nombre}
              viewMode={viewMode}
              countMode={countMode}
            />
          </>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
};