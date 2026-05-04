"use client";
import React from "react";
import { MotionMain } from "@/components/ui/Motion";
import SobreMi from "@/components/paginas/personal/sobre-mi";

export default function Home() {
  return (
    <MotionMain 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-svh bg-bg-main"
    >
      <img 
        src="/marcos.svg" 
        alt="Bordes decorativos" 
        className="w-full max-w-2xl h-auto" 
      />
    </MotionMain>
  );
}