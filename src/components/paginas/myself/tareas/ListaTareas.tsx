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
  <div className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-6 shadow-xl shadow-primary/5 flex-1 flex flex-col overflow-hidden">
    <div className="flex items-center gap-3 mb-8 px-2">
      <CheckSquare className="text-primary" size={20} />
      <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Lista de Pendientes</h2>
    </div>

    <div className="relative mb-8">
      <input
        type="text"
        value={nuevaTarea}
        onChange={(e) => setNuevaTarea(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder='"Añadir una tarea..."'
        className="w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/10 focus:bg-white-custom rounded-[var(--radius-btn)] py-4 px-6 text-sm text-foreground transition-all outline-none font-bold placeholder:text-primary/30"
      />
      <BtnIcon loading={isAddingTarea} disabled={!nuevaTarea.trim()} onClick={onAdd} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-btn)] w-10 h-10">
        <Plus size={20} />
      </BtnIcon>
    </div>

    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
      <AnimatePresence mode="popLayout">
        {tareas.map((t: any) => (
          <motion.div
            key={t.id} layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "flex items-center justify-between p-4 rounded-[var(--radius-btn)] border transition-all group",
              t.completada ? "bg-primary/5 border-[length:var(--border-width)] border-primary/5 opacity-60" : "bg-white-custom border-[length:var(--border-width)] border-primary/15 shadow-sm hover:border-primary/30"
            )}
          >
            <div
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => onToggle(t.id, t.completada)}
            >
              <div className={cn(
                "w-6 h-6 rounded-[var(--radius-input)] border-[length:var(--border-width)] flex items-center justify-center transition-all",
                t.completada ? "bg-primary border-primary" : "border-primary/30 group-hover:border-primary/60"
              )}>
                {t.completada && <Plus size={14} className="text-white rotate-45" strokeWidth={4} />}
              </div>
              <span className={cn("text-sm font-bold", t.completada ? "line-through text-primary/40" : "text-foreground")}>
                "{t.titulo}"
              </span>
            </div>
            <BtnIcon variant="danger" size="sm" onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 border-none hover:bg-red-50 w-8 h-8">
              <Trash2 size={16} />
            </BtnIcon>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </div>
);