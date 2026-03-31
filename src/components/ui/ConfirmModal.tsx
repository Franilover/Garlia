"use client";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Hook para reemplazar window.confirm() con un modal no bloqueante.
 *
 * Uso:
 *   const { confirm, ConfirmModal } = useConfirm();
 *
 *   const ok = await confirm({
 *     title: "¿Eliminar?",
 *     message: `¿Borrar "${nombre}" permanentemente?`,
 *     danger: true,
 *   });
 *   if (!ok) return;
 *
 *   // Renderizar en el JSX del componente:
 *   <ConfirmModal />
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleResponse = useCallback((value: boolean) => {
    state?.resolve(value);
    setState(null);
  }, [state]);

  const ConfirmModal = () => (
    <AnimatePresence>
      {state && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
            onClick={() => handleResponse(false)}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative bg-white-custom border border-primary/10 rounded-[var(--radius-card)] p-8 w-full max-w-sm shadow-2xl z-10"
          >
            {/* Icono */}
            <div className={`w-12 h-12 rounded-[var(--radius-btn)] flex items-center justify-center mb-5 ${
              state.danger
                ? "bg-red-50 text-red-500 border border-red-100"
                : "bg-primary/8 text-primary border border-primary/10"
            }`}>
              <AlertTriangle size={20} />
            </div>

            {/* Texto */}
            {state.title && (
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-2">
                {state.title}
              </h3>
            )}
            <p className="text-sm text-primary/70 font-medium leading-relaxed mb-8">
              {state.message}
            </p>

            {/* Botones */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleResponse(false)}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[var(--radius-btn)] border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
              >
                {state.cancelLabel ?? "Cancelar"}
              </button>
              <button
                onClick={() => handleResponse(true)}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[var(--radius-btn)] transition-all ${
                  state.danger
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
                    : "bg-primary text-btn-text hover:opacity-80"
                }`}
              >
                {state.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return { confirm, ConfirmModal };
}