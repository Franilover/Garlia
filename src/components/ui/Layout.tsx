"use client";
import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Text } from "@/components/ui/Tiopgrafia";

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  subtitle?: string;
  children:  React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-sm" }: ModalProps) {
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
            <button onClick={onClose} className="absolute top-5 right-5 text-primary/20 hover:text-primary transition-colors">
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children:   React.ReactNode;
  className?: string;
  onClick?:   () => void;
  hover?:     boolean;
  padding?:   "none" | "sm" | "md" | "lg";
}

export function Card({ children, className = "", onClick, hover, padding = "md" }: CardProps) {
  const pads = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
  const Tag  = onClick ? motion.button : motion.div;

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

// ─── PageHeader ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  icon?:     React.ReactNode;
  action?:   React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      className="flex items-end justify-between mb-10"
    >
      <div>
        <Text variant="xl" as="h1" className="text-primary flex items-center gap-3 leading-none">
          {icon} {title}
        </Text>
        {subtitle && (
          <Text variant="cap" className="mt-2">
            {subtitle}
          </Text>
        )}
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

// ─── BackBtn ──────────────────────────────────────────────────────────────────

interface BackBtnProps {
  onClick: () => void;
  label?:  string;
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
