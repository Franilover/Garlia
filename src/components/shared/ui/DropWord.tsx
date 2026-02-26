"use client";
// components/shared/ui/DropWord.tsx
// Palabra interactiva en el lector que otorga un item o criatura al usuario al hacer click.
// Sintaxis en el texto: [[drop|palabra|tipo|id|Nombre Entidad]]

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Package, Sparkles, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { cn } from "@/lib/utils";

interface DropWordProps {
  word: string;
  tipo: "item" | "criatura";
  entidadId: string;
  entidadNombre: string;
}

type DropState = "idle" | "loading" | "success" | "already" | "error" | "no_auth";

export function DropWord({ word, tipo, entidadId, entidadNombre }: DropWordProps) {
  const [state, setState] = useState<DropState>("idle");
  const [open, setOpen] = useState(false);

  const handleClick = async () => {
    if (state === "success" || state === "already") return;
    setOpen(true);
    setState("loading");

    // Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState("no_auth");
      return;
    }

    const userId = session.user.id;

    try {
      if (tipo === "item") {
        // Verificar si ya lo tiene
        const { data: existing } = await supabase
          .from("inventario_usuario")
          .select("id")
          .eq("user_id", userId)
          .eq("item_id", entidadId)
          .maybeSingle();

        if (existing) {
          setState("already");
          return;
        }

        const { error } = await supabase
          .from("inventario_usuario")
          .insert({ user_id: userId, item_id: entidadId, equipado: false });

        if (error) throw error;

      } else {
        // Verificar si ya lo descubrió
        const { data: existing } = await supabase
          .from("descubrimientos")
          .select("id")
          .eq("user_id", userId)
          .eq("criatura_id", entidadId)
          .maybeSingle();

        if (existing) {
          setState("already");
          return;
        }

        const { error } = await supabase
          .from("descubrimientos")
          .insert({ user_id: userId, criatura_id: entidadId });

        if (error) throw error;
      }

      setState("success");
    } catch (err) {
      console.error("[DropWord]", err);
      setState("error");
    }
  };

  const Icon = tipo === "item" ? Package : Sword;

  const messages: Record<DropState, { title: string; sub: string; color: string }> = {
    idle:    { title: "", sub: "", color: "" },
    loading: { title: "Sellando...", sub: "", color: "text-primary" },
    success: {
      title: tipo === "item" ? "¡Item obtenido!" : "¡Criatura descubierta!",
      sub: `${entidadNombre} ha sido añadido a tu perfil`,
      color: "text-emerald-500",
    },
    already: {
      title: "Ya lo tienes",
      sub: `${entidadNombre} ya está en tu perfil`,
      color: "text-primary/60",
    },
    error:   { title: "Error", sub: "No se pudo registrar", color: "text-red-400" },
    no_auth: { title: "Inicia sesión", sub: "Necesitas una cuenta para guardar este hallazgo", color: "text-amber-500" },
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "relative inline font-serif cursor-pointer group",
          (state === "success" || state === "already") && "cursor-default"
        )}
      >
        <span style={{
          backgroundImage: `linear-gradient(${state === "success" ? "#10b981" : "#C4A882"}, ${state === "success" ? "#10b981" : "#C4A882"})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 1px",
          backgroundPosition: "0 100%",
          paddingBottom: "1px",
        }}>
          {word}
        </span>
        {/* Indicador de drop */}
        <span className={cn(
          "absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full transition-colors",
          state === "success" ? "bg-emerald-400" : "bg-[#C4A882]/60 group-hover:bg-[#C4A882] animate-pulse"
        )} />
      </button>

      {/* Popup de feedback */}
      <AnimatePresence>
        {open && state !== "idle" && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (state !== "loading") setOpen(false); }}
              className="fixed inset-0 z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }}
              className="fixed z-[81] left-1/2 -translate-x-1/2 top-1/3 w-72 bg-white-custom rounded-3xl shadow-2xl overflow-hidden"
              style={{ boxShadow: "0 24px 64px rgba(44,38,46,0.22)" }}
            >
              {/* Header decorativo */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#C4A882] via-primary to-[#C4A882]" />

              <div className="p-6 flex flex-col items-center text-center gap-4">
                {state === "loading" ? (
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                    <Loader2 size={24} className="text-primary/40 animate-spin" />
                  </div>
                ) : state === "success" ? (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 16, stiffness: 300, delay: 0.1 }}
                    className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100"
                  >
                    <Icon size={24} className="text-emerald-500" />
                  </motion.div>
                ) : state === "already" ? (
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                    <Check size={24} className="text-primary/40" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <Sparkles size={24} className="text-amber-400" />
                  </div>
                )}

                {state !== "loading" && (
                  <>
                    <div>
                      <p className={cn("font-black uppercase text-[11px] tracking-widest", messages[state].color)}>
                        {messages[state].title}
                      </p>
                      {messages[state].sub && (
                        <p className="text-[10px] text-primary/40 mt-1 font-medium italic">
                          {messages[state].sub}
                        </p>
                      )}
                    </div>

                    {state === "success" && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full"
                      >
                        <Icon size={11} className="text-primary/50" />
                        <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
                          {entidadNombre}
                        </span>
                      </motion.div>
                    )}

                    <button
                      onClick={() => setOpen(false)}
                      className="text-[9px] font-black uppercase tracking-widest text-primary/25 hover:text-primary/50 transition-colors mt-1"
                    >
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}