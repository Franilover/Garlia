"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React from "react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { BtnIcon } from "@/components/ui";

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
    /* Sin border/shadow propios — el bloque padre los provee */
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/6 shrink-0">
        <CheckSquare size={12} className="text-primary/30" />
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/35 flex-1">
          Pendientes
        </span>
        {pendientes.length > 0 && (
          <span className="text-[8px] font-black bg-primary/8 text-primary/60 px-1.5 py-0.5 rounded-full tabular-nums">
            {pendientes.length}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-b border-primary/6 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={nuevaTarea}
            onChange={e => setNuevaTarea(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onAdd()}
            placeholder="Nueva tarea..."
            className="
              w-full bg-primary/4 border border-transparent
              focus:border-primary/12 focus:bg-white-custom
              rounded-[var(--radius-btn)] py-2 px-3 pr-9
              text-[11px] text-foreground font-semibold
              transition-all outline-none placeholder:text-primary/20
            "
          />
          <BtnIcon
            loading={isAddingTarea}
            disabled={!nuevaTarea.trim()}
            onClick={onAdd}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[var(--radius-btn)] w-7 h-7"
          >
            <Plus size={12} />
          </BtnIcon>
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col flex-1 overflow-y-auto min-h-0 px-2.5 py-2 gap-0.5">
        <AnimatePresence mode="popLayout">
          {pendientes.map((t: any) => (
            <TareaItem key={t.id} tarea={t} onToggle={onToggle} onDelete={onDelete} />
          ))}

          {completadas.length > 0 && pendientes.length > 0 && (
            <div key="sep" className="flex items-center gap-2 py-2 shrink-0">
              <div className="flex-1 h-px bg-primary/6" />
              <span className="text-[7px] font-black uppercase tracking-widest text-primary/20">listas</span>
              <div className="flex-1 h-px bg-primary/6" />
            </div>
          )}

          {completadas.map((t: any) => (
            <TareaItem key={t.id} tarea={t} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </AnimatePresence>

        {!tareas?.length && (
          <p className="text-[9px] font-medium text-primary/15 italic text-center py-8">
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
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.97 }}
    className={cn(
      "flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-btn)] transition-all group shrink-0 cursor-default",
      t.completada ? "opacity-40" : "hover:bg-primary/4"
    )}
  >
    {/* Checkbox */}
    <button
      onClick={() => onToggle(t.id, t.completada)}
      className={cn(
        "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer",
        t.completada ? "bg-primary border-primary" : "border-primary/25 hover:border-primary/60"
      )}
    >
      {t.completada && (
        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
          <path d="M1 2.5L2.8 4L6 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>

    {/* Texto */}
    <span className={cn(
      "text-[11px] font-semibold flex-1 min-w-0 truncate",
      t.completada ? "line-through text-primary/25" : "text-foreground/80"
    )}>
      {t.titulo}
    </span>

    {/* Eliminar */}
    <button
      onClick={() => onDelete(t.id)}
      className="opacity-0 group-hover:opacity-100 text-primary/15 hover:text-red-400 transition-all shrink-0"
    >
      <Trash2 size={10} />
    </button>
  </MotionDiv>
);