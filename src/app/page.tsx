"use client";
import React from "react";
import { motion } from "framer-motion";
import SobreMi from "@/components/features/personal/SobreMi"; // Ajusta esta ruta a donde tengas tu componente

export default function Home() {
  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-bg-main"
    >
      <SobreMi />
    </motion.main>
  );
}