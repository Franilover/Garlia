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
  const pendientes = tareas?.filter((t: any) => !t.completada) ?? [];
  const completadas = tareas?.filter((t: any) => t.completada) ?? [];

  return (
    <div className="
      bg-white-custom border border-primary/10
      rounded-[var(--radius-card)] shadow-xl shadow-primary/5
      flex flex-col h-full overflow-hidden
    ">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-primary/6 shrink-0">
        <CheckSquare className="text-primary/50" size={14} />
        <h2 className="text-[10px] font-black uppercase tracking-widest text-primary/50 flex-1">
          Pendientes
        </h2>
        {pendientes.length > 0 && (
          <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {pendientes.length}
          </span>
        )}
      </div>

      {/* Input añadir */}
      <div className="px-3 py-3 border-b border-primary/6 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="Nueva tarea..."
            className="
              w-full bg-primary/4 border border-transparent
              focus:border-primary/15 focus:bg-white-custom
              rounded-[var(--radius-btn)] py-2.5 px-3.5 pr-11
              text-xs text-foreground font-semibold
              transition-all outline-none placeholder:text-primary/25
            "
          />
          <BtnIcon
            loading={isAddingTarea}
            disabled={!nuevaTarea.trim()}
            onClick={onAdd}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--radius-btn)] w-7 h-7"
          >
            <Plus size={14} />
          </BtnIcon>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="flex flex-col flex-1 overflow-y-auto min-h-0 px-3 py-2 gap-1">
        <AnimatePresence mode="popLayout">
          {/* Pendientes */}
          {pendientes.map((t: any) => (
            <TareaItem key={t.id} tarea={t} onToggle={onToggle} onDelete={onDelete} />
          ))}

          {/* Separador completadas */}
          {completadas.length > 0 && pendientes.length > 0 && (
            <div key="sep" className="flex items-center gap-2 py-2 shrink-0">
              <div className="flex-1 h-px bg-primary/8" />
              <span className="text-[8px] font-black uppercase tracking-widest text-primary/20">
                Listas
              </span>
              <div className="flex-1 h-px bg-primary/8" />
            </div>
          )}

          {/* Completadas */}
          {completadas.map((t: any) => (
            <TareaItem key={t.id} tarea={t} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </AnimatePresence>

        {tareas?.length === 0 && (
          <p className="text-[10px] font-bold text-primary/20 italic text-center py-10">
            Sin pendientes.
          </p>
        )}
      </div>
    </div>
  );
};

/* ── Fila individual de tarea ── */
const TareaItem = ({
  tarea: t,
  onToggle,
  onDelete,
}: {
  tarea: any;
  onToggle: (id: string, completada: boolean) => void;
  onDelete: (id: string) => void;
}) => (
  <MotionDiv
    layout
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96 }}
    className={cn(
      "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-btn)] border transition-all group shrink-0",
      t.completada
        ? "bg-transparent border-transparent opacity-50"
        : "bg-white-custom border-primary/10 shadow-sm hover:border-primary/25"
    )}
  >
    {/* Checkbox */}
    <button
      onClick={() => onToggle(t.id, t.completada)}
      className={cn(
        "w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all shrink-0",
        t.completada
          ? "bg-primary border-primary"
          : "border-primary/30 hover:border-primary/70"
      )}
    >
      {t.completada && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>

    {/* Texto */}
    <span className={cn(
      "text-xs font-semibold flex-1 min-w-0 truncate",
      t.completada ? "line-through text-primary/30" : "text-foreground"
    )}>
      {t.titulo}
    </span>

    {/* Eliminar */}
    <button
      onClick={() => onDelete(t.id)}
      className="opacity-0 group-hover:opacity-100 text-primary/20 hover:text-red-400 transition-all w-5 h-5 flex items-center justify-center shrink-0"
    >
      <Trash2 size={12} />
    </button>
  </MotionDiv>
);