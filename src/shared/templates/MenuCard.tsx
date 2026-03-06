"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LucideProps } from "lucide-react";
import { useTheme } from "@/app/providers/ThemeProvider";

interface MenuCardProps {
  href: string;
  title: string;
  icon: React.ReactElement<LucideProps>;
  delay?: number;
  hasNewContent?: boolean;
  onClick?: () => void;
}

function ScribbleBorder() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: "-4px",
        width: "calc(100% + 8px)",
        height: "calc(100% + 8px)",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <rect
        x="4" y="4"
        width="calc(100% - 8px)" height="calc(100% - 8px)"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeDasharray="12 4 6 4"
        strokeLinecap="round"
        strokeLinejoin="round"
        rx="4"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="100" dur="6s" repeatCount="indefinite" />
      </rect>
      <rect
        x="7" y="7"
        width="calc(100% - 14px)" height="calc(100% - 14px)"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
        strokeDasharray="5 8 3 8"
        strokeLinecap="round"
        rx="3"
        opacity="0.5"
      >
        <animate attributeName="stroke-dashoffset" from="100" to="0" dur="9s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

export const MenuCard = ({ href, title, icon, delay = 0, hasNewContent, onClick }: MenuCardProps) => {
  const { theme } = useTheme();
  const isScribble = theme === "scribble";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className="h-full"
    >
      <Link href={href} className="group block relative h-full" onClick={onClick}>
        <div
          className="bg-white-custom border-primary/5 p-6 md:p-12 h-full flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] group-hover:-translate-y-3"
          style={{
            borderRadius: "var(--radius-card)",
            borderWidth: "var(--border-width)",
            borderStyle: "solid",
            boxShadow: isScribble ? "var(--shadow-card)" : "var(--shadow-card)",
            position: "relative",
          }}
        >
          {isScribble && <ScribbleBorder />}

          {hasNewContent && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 right-4 md:top-8 md:right-8 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20">
              <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
            </motion.div>
          )}

          <motion.div
            className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 text-primary flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white"
            style={{ borderRadius: "var(--radius-btn)" }}
            whileHover={{ rotate: [0, -10, 10, 0] }}
          >
            {React.cloneElement(icon, { size: 32, className: "md:w-[48px] md:h-[48px]" })}
          </motion.div>

          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-primary">
            {title}
          </h2>
        </div>
      </Link>
    </motion.div>
  );
};