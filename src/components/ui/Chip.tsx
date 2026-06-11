"use client";
import React from "react";
import { cn } from "@/lib/utils/index";

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[9px] font-black uppercase px-2.5 py-1.5 rounded-full border transition-all whitespace-nowrap",
        active
          ? "bg-primary text-bg-main border-primary"
          : "border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

export function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
  colorDot,
}: {
  options: T[];
  selected: T[];
  onToggle: (v: T) => void;
  colorDot?: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
              active
                ? "bg-primary text-btn-text border-primary"
                : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
            )}
            style={{ borderRadius: "var(--radius-btn)" }}
          >
            {colorDot && (
              <span
                className="w-2 h-2 rounded-full shrink-0 border border-white/20"
                style={{ background: colorDot[opt] }}
              />
            )}
            {opt}
          </button>
        );
      })}
    </div>
  );
}