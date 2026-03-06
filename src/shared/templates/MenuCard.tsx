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

// Borde SVG que se mueve como trazado a mano
function ScribbleBorder({ size = "card" }: { size?: "card" | "icon" }) {
  const stroke = size === "card" ? 2 : 1.5;
  const offset = size === "card" ? 4 : 2;
  const dur1 = size === "card" ? "6s" : "4s";
  const dur2 = size === "card" ? "9s" : "6s";

  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: `-${offset}px`,
        width: `calc(100% + ${offset * 2}px)`,
        height: `calc(100% + ${offset * 2}px)`,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {/* Trazo principal - se desplaza */}
      <rect
        x={offset} y={offset}
        width={`calc(100% - ${offset * 2}px)`}
        height={`calc(100% - ${offset * 2}px)`}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeDasharray="12 4 6 4"
        strokeLinecap="round"
        strokeLinejoin="round"
        rx={size === "card" ? 4 : 2}
      >
        <animate attributeName="stroke-dashoffset" from="0" to="100" dur={dur1} repeatCount="indefinite" />
      </rect>
      {/* Trazo secundario - dirección opuesta, más tenue */}
      <rect
        x={offset + 3} y={offset + 3}
        width={`calc(100% - ${(offset + 3) * 2}px)`}
        height={`calc(100% - ${(offset + 3) * 2}px)`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke * 0.6}
        strokeDasharray="5 8 3 8"
        strokeLinecap="round"
        strokeLinejoin="round"
        rx={size === "card" ? 3 : 1}
        opacity="0.5"
      >
        <animate attributeName="stroke-dashoffset" from="100" to="0" dur={dur2} repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

export const MenuCard = ({ href, title, icon, delay = 0, hasNewContent, onClick }: MenuCardProps) => {
  const { theme } = useTheme();
  const isScribble = theme === "scribble";
  const isPixel = theme === "pixel";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, type: "spring", stiffness: 100 }}
      className="h-full"
    >
      <Link href={href} className="group block relative h-full" onClick={onClick}>
        <div
          className={`bg-white-custom p-6 md:p-12 h-full flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:-translate-y-3 ${
            isScribble
              ? "border-0"
              : "border-primary/5 group-hover:border-primary group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)]"
          }`}
          style={{
            borderRadius: "var(--radius-card)",
            borderWidth: isScribble ? 0 : "var(--border-width)",
            borderStyle: "solid",
            boxShadow: "var(--shadow-card)",
            position: "relative",
          }}
        >
          {/* Borde SVG animado — solo scribble */}
          {isScribble && <ScribbleBorder size="card" />}

          {hasNewContent && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute top-4 right-4 md:top-8 md:right-8 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20"
            >
              <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
            </motion.div>
          )}

          <motion.div
            className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 text-primary flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white"
            style={{ borderRadius: "var(--radius-btn)", position: "relative" }}
            whileHover={{ rotate: [0, -10, 10, 0] }}
          >
            {isScribble && <ScribbleBorder size="icon" />}
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