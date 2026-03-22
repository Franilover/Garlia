"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";

// ============================================================
// BOTONES
// ============================================================

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "danger" | "outline";
  fullWidth?: boolean;
}

export function Btn({
  children, loading, icon, size = "md", variant = "primary",
  fullWidth, className = "", disabled, ...props
}: BtnProps) {
  const sizes = {
    sm:  "px-3 py-1.5 text-[9px]",
    md:  "px-5 py-3 text-[10px]",
    lg:  "px-8 py-4 text-[11px]",
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

// Botón circular — para FABs y acciones icónicas
export function BtnIcon({
  children, size = "md", variant = "primary", className = "", ...props
}: Omit<BtnProps, "icon" | "fullWidth" | "loading">) {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  const variants = {
    primary: "bg-primary text-btn-text hover:opacity-80 shadow-lg",
    ghost:   "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10",
    danger:  "bg-red-50 text-red-400 border border-red-100 hover:bg-red-100",
    outline: "bg-transparent text-primary border border-primary/20 hover:border-primary/50",
  };

  return (
    <button
      {...props}
      className={[
        "flex items-center justify-center rounded-full",
        "transition-all active:scale-95 disabled:opacity-50",
        sizes[size], variants[variant!],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ============================================================
// INPUTS
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest block">
          {label}
        </label>
      )}
      <input
        {...props}
        className={[
          "input-brand",
          className,
        ].join(" ")}
      />
    </div>
  );
}

// Input de línea — estilo minimal, solo borde inferior
export function InputLine({ label, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest block italic">
          {label}
        </label>
      )}
      <input
        {...props}
        className={[
          "w-full bg-transparent border-b-2 border-primary/10 py-3",
          "text-sm font-black text-primary outline-none focus:border-primary",
          "transition-colors uppercase placeholder:normal-case placeholder:font-normal placeholder:text-primary/25",
          className,
        ].join(" ")}
      />
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest block">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={[
          "w-full bg-bg-main border border-primary/10 rounded-[var(--radius-btn)]",
          "p-4 text-sm font-medium text-primary outline-none focus:border-primary",
          "transition-colors italic resize-none",
          className,
        ].join(" ")}
      />
    </div>
  );
}

// ============================================================
// MODAL
// ============================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  open, onClose, title, subtitle, children, maxWidth = "max-w-sm"
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative bg-white-custom rounded-[var(--radius-card)] p-8 w-full ${maxWidth} shadow-2xl border border-primary/10 z-10`}
          >
            {(title || subtitle) && (
              <div className="mb-6">
                {title && (
                  <h3 className="text-center text-primary font-black uppercase text-[10px] tracking-[0.3em] italic">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-center text-primary/40 text-[9px] font-bold uppercase tracking-widest mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-primary/20 hover:text-primary transition-colors"
            >
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// BADGE / TAG
// ============================================================

interface BadgeProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ children, active, onClick, variant = "default" }: BadgeProps) {
  const variants = {
    default: active
      ? "bg-primary text-btn-text shadow-sm shadow-primary/20"
      : "bg-primary/8 text-primary/60 hover:bg-primary/12",
    success: "bg-green-50 text-green-600 border border-green-100",
    warning: "bg-amber-50 text-amber-600 border border-amber-100",
    danger:  "bg-red-50 text-red-500 border border-red-100",
    info:    "bg-blue-50 text-blue-500 border border-blue-100",
  };

  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      {...(onClick ? { onClick } : {})}
      className={[
        "inline-flex items-center px-3 py-1 rounded-[var(--radius-btn)]",
        "text-[9px] font-black uppercase tracking-widest transition-all",
        variants[variant],
        onClick ? "cursor-pointer active:scale-95" : "",
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

// ============================================================
// PAGE HEADER
// ============================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      className="flex items-end justify-between mb-10"
    >
      <div>
        <h1 className="text-4xl font-black text-primary italic tracking-tighter flex items-center gap-3 leading-none">
          {icon}
          {title}
        </h1>
        {subtitle && (
          <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-2 italic">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

// ============================================================
// LOADING
// ============================================================

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ text = "Cargando...", fullScreen = true }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? "min-h-[60vh]" : "py-16"}`}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={20} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
        <span className="text-[9px] font-black uppercase tracking-[0.3em]"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

interface EmptyStateProps {
  label: string;
  icon?: React.ReactNode;
}

export function EmptyState({ label, icon }: EmptyStateProps) {
  return (
    <div className="col-span-full py-20 flex flex-col items-center gap-3">
      {icon && (
        <div className="opacity-20">{icon}</div>
      )}
      <p className="text-[10px] font-black uppercase tracking-[0.3em] italic"
        style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
        "{label}"
      </p>
    </div>
  );
}

// ============================================================
// SECTION DIVIDER
// ============================================================

interface DividerProps {
  label?: string;
}

export function Divider({ label }: DividerProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
      {label && (
        <span className="text-[8px] font-black uppercase tracking-[0.4em]"
          style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
          {label}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
    </div>
  );
}

// ============================================================
// CARD BASE
// ============================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className = "", onClick, hover, padding = "md" }: CardProps) {
  const pads = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      {...(onClick ? { onClick } : {})}
      whileHover={hover || onClick ? { y: -2 } : undefined}
      className={[
        "card-main text-left transition-all duration-200",
        pads[padding],
        onClick ? "cursor-pointer w-full" : "",
        hover || onClick
          ? "hover:border-primary/20 hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

// ============================================================
// SELECT
// ============================================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest block">
          {label}
        </label>
      )}
      <select
        {...props}
        className={[
          "w-full bg-bg-main border-b-2 border-primary/10 py-3",
          "text-sm font-black text-primary outline-none focus:border-primary",
          "appearance-none cursor-pointer uppercase transition-colors",
          className,
        ].join(" ")}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// BACK BUTTON
// ============================================================

interface BackBtnProps {
  onClick: () => void;
  label?: string;
}

export function BackBtn({ onClick, label = "Volver" }: BackBtnProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 font-black text-[10px] uppercase italic text-primary/40 hover:text-primary transition-colors group p-4"
    >
      <span className="group-hover:-translate-x-1 transition-transform">←</span>
      {label}
    </button>
  );
}

// ============================================================
// STAT ROW (para perfiles, resúmenes)
// ============================================================

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

export function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>
        {icon}
        <span className="font-serif italic text-[10px]" style={{ color: "color-mix(in srgb, var(--primary) 42%, transparent)" }}>
          {label}
        </span>
      </div>
      <span className="flex-1 mx-2 font-serif text-[10px] overflow-hidden text-center"
        style={{ color: "color-mix(in srgb, var(--primary) 12%, transparent)", letterSpacing: "0.2em" }}>
        . . . . . .
      </span>
      <span className="font-serif italic text-sm tabular-nums" style={{ color: "var(--primary)" }}>
        {value}
      </span>
    </div>
  );
}