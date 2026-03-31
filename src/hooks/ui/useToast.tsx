"use client";
import { useState, useCallback } from "react";

export type ToastType = "error" | "success" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 0;

/**
 * Hook liviano para mostrar toasts sin dependencias externas.
 *
 * Uso:
 *   const { toasts, toast } = useToast();
 *   toast.error("El nombre es obligatorio");
 *   toast.success("Guardado correctamente");
 *
 * Renderizar <ToastContainer toasts={toasts} onDismiss={dismiss} /> en el componente raíz.
 */
export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss, duration]);

  const toast = {
    error:   (msg: string) => add(msg, "error"),
    success: (msg: string) => add(msg, "success"),
    warning: (msg: string) => add(msg, "warning"),
    info:    (msg: string) => add(msg, "info"),
  };

  return { toasts, toast, dismiss };
}