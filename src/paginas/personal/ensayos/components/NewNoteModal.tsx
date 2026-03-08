"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { PenLine, X } from "lucide-react";

interface NewNoteModalProps {
  onConfirm: (titulo: string) => void;
  onClose: () => void;
}

export default function NewNoteModal({ onConfirm, onClose }: NewNoteModalProps) {
  const [titulo, setTitulo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (titulo.trim()) onConfirm(titulo.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed z-50 inset-x-4 top-[30%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-120"
        style={{
          background: "var(--white-custom)",
          borderRadius: "var(--radius-card)",
          border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          boxShadow: "var(--shadow-card, 0 24px 64px rgba(0,0,0,0.2))",
          padding: "28px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center"
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                borderRadius: "var(--radius-btn)",
                color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              }}
            >
              <PenLine size={15} />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
            >
              Nueva nota
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center transition-opacity opacity-40 hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Título del pensamiento..."
          className="w-full bg-transparent outline-none border-none text-xl font-serif italic mb-6"
          style={{ color: "var(--primary)" }}
        />

        <div className="h-px mb-5"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        />

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[11px] font-mono uppercase tracking-wide transition-all"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              borderRadius: "var(--radius-btn)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim()}
            className="px-5 py-2 text-[11px] font-mono uppercase tracking-wide transition-all disabled:opacity-30"
            style={{
              background: "var(--primary)",
              color: "var(--btn-text)",
              borderRadius: "var(--radius-btn)",
            }}
          >
            Crear nota →
          </button>
        </div>
      </motion.div>
    </>
  );
}