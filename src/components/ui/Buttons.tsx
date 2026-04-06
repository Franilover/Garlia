"use client";
import React from "react";
import { Loader2 } from "lucide-react";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?:   boolean;
  icon?:      React.ReactNode;
  size?:      "sm" | "md" | "lg";
  variant?:   "primary" | "ghost" | "danger" | "outline";
  fullWidth?: boolean;
}

export function Btn({
  children, loading, icon, size = "md", variant = "primary",
  fullWidth, className = "", disabled, ...props
}: BtnProps) {
  const sizes = {
    sm: "px-3 py-1.5 text-[9px]",
    md: "px-5 py-3 text-[10px]",
    lg: "px-8 py-4 text-[11px]",
  };
  const variants = {
    primary: "bg-primary text-btn-text hover:opacity-80",
    ghost:   "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10",
    danger:  "bg-red-50 text-red-400 border border-red-100 hover:bg-red-100",
    outline: "bg-transparent text-primary border border-primary/20 hover:border-primary/50",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest",
        "rounded-[var(--radius-btn)] transition-all active:scale-95 disabled:opacity-50",
        sizes[size], variants[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {loading
        ? <Loader2 size={12} className="animate-spin" />
        : icon && <span className="shrink-0">{icon}</span>
      }
      {children}
    </button>
  );
}

export function BtnIcon({
  children, size = "md", variant = "primary", loading, className = "", ...props
}: Omit<BtnProps, "icon" | "fullWidth">) {
  const sizes    = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const variants = {
    primary: "bg-primary text-btn-text hover:opacity-80 shadow-lg",
    ghost:   "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10",
    danger:  "bg-red-50 text-red-400 border border-red-100 hover:bg-red-100",
    outline: "bg-transparent text-primary border border-primary/20 hover:border-primary/50",
  };

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={[
        "flex items-center justify-center rounded-full",
        "transition-all active:scale-95 disabled:opacity-50",
        sizes[size], variants[variant!],
        className,
      ].join(" ")}
    >
      {loading
        ? <span className="w-4 h-4 border-[length:var(--border-width)] border-current border-t-transparent rounded-full animate-spin" />
        : children
      }
    </button>
  );
}
