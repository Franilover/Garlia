"use client";
import React from "react";
import { PenTool, Plus, Command } from "lucide-react";
import { MotionDiv } from "@/components/ui/Motion";

interface EmptyStateProps {
  onCrearEnsayo?: () => void;
}

export function EmptyState({ onCrearEnsayo }: EmptyStateProps) {
  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6"
    >
      {/* ASCII-style decorative border */}
      <div style={{ color: "rgba(255,255,255,0.06)", ...monoStyle, fontSize: 11, lineHeight: 1.4, userSelect: "none" }}>
        {"┌─────────────────────────────────┐"}<br />
        {"│                                 │"}<br />
        {"│                                 │"}<br />
        {"│                                 │"}<br />
        {"└─────────────────────────────────┘"}
      </div>

      <div style={{ position: "absolute" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.15)",
            margin: "0 auto 16px",
          }}
        >
          <PenTool size={20} />
        </div>
        <p
          style={{
            fontSize: 14,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.25)",
            marginBottom: 6,
          }}
        >
          ninguna nota seleccionada
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", ...monoStyle }}>
          selecciona una nota del panel o crea una nueva
        </p>

        {onCrearEnsayo && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={onCrearEnsayo}
              className="flex items-center gap-2"
              style={{
                fontSize: 11,
                padding: "7px 16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                ...monoStyle,
              }}
            >
              <Plus size={12} />
              nueva nota
              <kbd
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.25)",
                  ...monoStyle,
                }}
              >
                N
              </kbd>
            </button>
          </div>
        )}
      </div>
    </MotionDiv>
  );
}

export default EmptyState;