"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LucideProps } from "lucide-react";

interface MenuCardProps {
  href: string;
  title: string;
  // Cambiamos ReactNode por ReactElement para asegurar que sea un componente
  icon: React.ReactElement<LucideProps>; 
  delay?: number;
  hasNewContent?: boolean;
  onClick?: () => void;
}

export const MenuCard = ({ href, title, icon, delay = 0, hasNewContent, onClick }: MenuCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ delay, type: "spring", stiffness: 100 }}
    className="h-full"
  >
    <Link href={href} className="group block relative h-full" onClick={onClick}>
      <div
        className="indie-scribble bg-white-custom border-primary/5 p-6 md:p-12 h-full flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] group-hover:-translate-y-3"
        style={{ borderRadius: "var(--radius-card)", borderWidth: "var(--border-width)", borderStyle: "solid", boxShadow: "var(--shadow-card)" }}
      >
        {hasNewContent && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 right-4 md:top-8 md:right-8 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20">
            <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
          </motion.div>
        )}

        <motion.div
          className="indie-scribble w-16 h-16 md:w-24 md:h-24 bg-primary/10 text-primary flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white"
          style={{ borderRadius: "var(--radius-btn)" }}
          whileHover={{ rotate: [0, -10, 10, 0] }}
        >
          {React.cloneElement(icon, { 
            size: 32, 
            className: "md:w-[48px] md:h-[48px]" 
          })}
        </motion.div>
        
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-primary">
          {title}
        </h2>
      </div>
    </Link>
  </motion.div>
);