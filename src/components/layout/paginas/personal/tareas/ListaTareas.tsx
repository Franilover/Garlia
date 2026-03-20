"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Trash2, Loader2 } from "lucide-react";

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
  <div className="bg-white border border-primary/10 rounded-[40px] p-6 shadow-xl shadow-primary/5 min-h-130 flex flex-col">
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
        className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/10 focus:bg-white rounded-2xl py-4 px-6 text-sm text-primary transition-all outline-none font-bold placeholder:text-primary/30"
      />
      <button
        onClick={onAdd}
        disabled={isAddingTarea || !nuevaTarea.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all"
      >
        {isAddingTarea ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
      </button>
    </div>

    <div className="space-y-3 flex-1 overflow-y-auto max-h-100 pr-2 custom-scrollbar">
      <AnimatePresence mode="popLayout">
        {tareas.map((t: any) => (
          <motion.div
            key={t.id} layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "flex items-center justify-between p-4 rounded-2xl border transition-all group",
              t.completada ? "bg-primary/5 border-transparent opacity-60" : "bg-white border-primary/10 shadow-sm"
            )}
          >
            <div
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => onToggle(t.id, t.completada)}
            >
              <div className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                t.completada ? "bg-primary border-primary" : "border-primary/20 group-hover:border-primary/40"
              )}>
                {t.completada && <Plus size={14} className="text-white rotate-45" strokeWidth={4} />}
              </div>
              <span className={cn("text-sm font-bold text-primary", t.completada && "line-through text-primary/40")}>
                "{t.titulo}"
              </span>
            </div>
            <button
              onClick={() => onDelete(t.id)}
              className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </div>
);