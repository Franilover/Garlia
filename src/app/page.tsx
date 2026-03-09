"use client";
import React from "react";
import { motion } from "framer-motion";
import SobreMi from "@/paginas/personal/sobre-mi";

export default function Home() {
  return (
    <motion.main 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-svh bg-bg-main"
    >
      <SobreMi />
    </motion.main>
  );
}