"use client";
import React, { useState, useRef, useEffect } from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { X } from "lucide-react";

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

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <>
      {/* Overlay */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Modal — centered, compact, command-palette style */}
      <MotionDiv
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed z-50"
        style={{
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(520px, calc(100vw - 32px))",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", ...monoStyle, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            nueva nota
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Input */}
        <div className="px-4 py-4">
          <input
            ref={inputRef}
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={handleKey}
            placeholder="título del pensamiento..."
            className="w-full bg-transparent outline-none border-none"
            style={{
              fontSize: 20,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "-0.02em",
            }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", ...monoStyle }}>
            <kbd style={{ padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>enter</kbd>
            {" "}confirmar · {" "}
            <kbd style={{ padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>esc</kbd>
            {" "}cancelar
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              style={{
                fontSize: 10,
                padding: "5px 12px",
                borderRadius: 5,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                ...monoStyle,
              }}
            >
              cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!titulo.trim()}
              style={{
                fontSize: 10,
                padding: "5px 14px",
                borderRadius: 5,
                border: "1px solid rgba(255,255,255,0.2)",
                background: titulo.trim() ? "rgba(255,255,255,0.1)" : "transparent",
                color: titulo.trim() ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)",
                cursor: titulo.trim() ? "pointer" : "not-allowed",
                ...monoStyle,
                transition: "all 0.1s",
              }}
            >
              crear →
            </button>
          </div>
        </div>
      </MotionDiv>
    </>
  );
}