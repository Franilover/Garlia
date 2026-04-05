"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { Btn, BtnIcon } from "@/components/ui";

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
}: Props) => (
  <div className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-5 shadow-xl shadow-primary/5 flex flex-col lg:flex-1 lg:overflow-hidden">
    {/* Título */}
    <div className="flex items-center gap-3 mb-5 px-1 shrink-0">
      <CheckSquare className="text-primary" size={18} />
      <h2 className="text-[11px] font-black uppercase tracking-widest text-primary/60">Pendientes</h2>
    </div>

    {/* Input nueva tarea */}
    <div className="relative mb-4 shrink-0">
      <input
        type="text"
        value={nuevaTarea}
        onChange={(e) => setNuevaTarea(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder="Añadir una tarea..."
        className="w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/10 focus:bg-white-custom rounded-[var(--radius-btn)] py-3 px-5 pr-14 text-sm text-foreground transition-all outline-none font-bold placeholder:text-primary/30"
      />
      <BtnIcon
        loading={isAddingTarea}
        disabled={!nuevaTarea.trim()}
        onClick={onAdd}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-btn)] w-9 h-9"
      >
        <Plus size={18} />
      </BtnIcon>
    </div>

    {/* Lista — scroll interno solo en desktop */}
    <div className="flex flex-col gap-2 lg:flex-1 lg:overflow-y-auto lg:min-h-0 pr-0.5">
      <AnimatePresence mode="popLayout">
        {tareas.map((t: any) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-[var(--radius-btn)] border transition-all group",
              t.completada
                ? "bg-primary/5 border-[length:var(--border-width)] border-primary/5 opacity-60"
                : "bg-white-custom border-[length:var(--border-width)] border-primary/15 shadow-sm hover:border-primary/30"
            )}
          >
            <div
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              onClick={() => onToggle(t.id, t.completada)}
            >
              {/* Checkbox */}
              <div className={cn(
                "w-5 h-5 rounded-[var(--radius-input)] border-[length:var(--border-width)] flex items-center justify-center transition-all shrink-0",
                t.completada
                  ? "bg-primary border-primary"
                  : "border-primary/30 group-hover:border-primary/60"
              )}>
                {t.completada && <Plus size={12} className="text-white rotate-45" strokeWidth={4} />}
              </div>
              <span className={cn(
                "text-sm font-bold truncate",
                t.completada ? "line-through text-primary/40" : "text-foreground"
              )}>
                {t.titulo}
              </span>
            </div>

            {/* Borrar */}
            <BtnIcon
              variant="danger"
              size="sm"
              onClick={() => onDelete(t.id)}
              className="opacity-0 group-hover:opacity-100 border-none hover:bg-red-50 w-7 h-7 shrink-0 ml-2"
            >
              <Trash2 size={14} />
            </BtnIcon>
          </motion.div>
        ))}
      </AnimatePresence>

      {tareas.length === 0 && (
        <p className="text-[10px] font-bold text-primary/20 italic text-center py-8">
          Sin pendientes por ahora.
        </p>
      )}
    </div>
  </div>
);