"use client";
import { AnimatePresence } from "framer-motion";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import React from "react";

import { BtnIcon } from "@/components/ui";
import { MotionDiv } from "@/components/ui/Motion";
import { cn } from "@/lib/utils/index";

interface Props {
  tareas: any[];
  nuevaTarea: string;
  setNuevaTarea: (v: string) => void;
  isAddingTarea: boolean;
  onAdd: () => void;
  onToggle: (id: string, completada: boolean) => void;
  onDelete: (id: string) => void;
}

export const ListaTareas = ({
  tareas, nuevaTarea, setNuevaTarea,
  isAddingTarea, onAdd, onToggle, onDelete,
}: Props) => {
  const pendientes  = tareas?.filter((t: any) => !t.completada) ?? [];
  const completadas = tareas?.filter((t: any) =>  t.completada) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/8 shrink-0">
        <CheckSquare className="text-primary/40" size={12} />
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-on-card)]/40 flex-1">
          Pendientes
        </span>
        {pendientes.length > 0 && (
          <span className="text-[8px] font-black bg-primary/10 dark:bg-primary/20 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
            {pendientes.length}
          </span>
        )}
      </div>

      {/* Input nueva tarea */}
      <div className="px-3 py-2.5 border-b border-primary/8 shrink-0">
        <div className="relative">
          <input
            className="
              w-full bg-primary/5 dark:bg-primary/10
              border border-transparent
              focus:border-primary/15 focus:bg-[var(--white-custom)]
              rounded-[var(--radius-btn)] py-2 px-3 pr-9
              text-[11px] text-[var(--input-text)] font-semibold
              transition-all outline-none placeholder:text-[var(--input-text)]/40
            "
            placeholder="Nueva tarea..."
            type="text"
            value={nuevaTarea}
            onChange={e => setNuevaTarea(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onAdd()}
          />
          <BtnIcon
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[var(--radius-btn)] w-7 h-7"
            disabled={!nuevaTarea.trim()}
            loading={isAddingTarea}
            onClick={onAdd}
          >
            <Plus size={12} />
          </BtnIcon>
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col flex-1 overflow-y-auto min-h-0 px-2.5 py-2 gap-0.5">
        <AnimatePresence mode="popLayout">
          {pendientes.map((t: any) => (
            <TareaItem key={t.id} tarea={t} onDelete={onDelete} onToggle={onToggle} />
          ))}

          {completadas.length > 0 && pendientes.length > 0 && (
            <div key="sep" className="flex items-center gap-2 py-2 shrink-0">
              <div className="flex-1 h-px bg-primary/8" />
              <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-on-card)]/25">listas</span>
              <div className="flex-1 h-px bg-primary/8" />
            </div>
          )}

          {completadas.map((t: any) => (
            <TareaItem key={t.id} tarea={t} onDelete={onDelete} onToggle={onToggle} />
          ))}
        </AnimatePresence>

        {!tareas?.length && (
          <p className="text-[9px] font-medium text-[var(--text-on-card)]/20 italic text-center py-8">
            Sin pendientes.
          </p>
        )}
      </div>
    </div>
  );
};

const TareaItem = ({
  tarea: t, onToggle, onDelete,
}: {
  tarea: any;
  onToggle: (id: string, completada: boolean) => void;
  onDelete: (id: string) => void;
}) => (
  <MotionDiv
    layout
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-btn)] transition-all group shrink-0 cursor-default",
      t.completada ? "opacity-40" : "hover:bg-primary/5 dark:hover:bg-primary/10"
    )}
    exit={{ opacity: 0, scale: 0.97 }}
    initial={{ opacity: 0, y: 4 }}
  >
    {/* Checkbox */}
    <button
      className={cn(
        "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer",
        t.completada
          ? "bg-primary border-primary"
          : "border-primary/30 hover:border-primary/70 dark:border-primary/40 dark:hover:border-primary/80"
      )}
      onClick={() => onToggle(t.id, t.completada)}
    >
      {t.completada && (
        <svg fill="none" height="5" viewBox="0 0 7 5" width="7">
          <path d="M1 2.5L2.8 4L6 1" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </svg>
      )}
    </button>

    {/* Texto */}
    <span className={cn(
      "text-[11px] font-semibold flex-1 min-w-0 truncate",
      t.completada
        ? "line-through text-[var(--text-on-card)]/25"
        : "text-[var(--text-on-card)]/80 "
    )}>
      {t.titulo}
    </span>

    {/* Eliminar */}
    <button
      className="opacity-0 group-hover:opacity-100 text-[var(--text-on-card)]/20 hover:text-red-400 transition-all shrink-0"
      onClick={() => onDelete(t.id)}
    >
      <Trash2 size={10} />
    </button>
  </MotionDiv>
);