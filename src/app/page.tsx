"use client";
import React from "react";
import { MotionMain } from "@/components/ui/Motion";
import SobreMi from "@/components/paginas/personal/sobre-mi";

// CORRECCIÓN: Añade 'default'
export default function Home() { 
  return (
    <MotionMain 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-svh bg-bg-main flex flex-col items-center"
    >
    <div className="font-[family:var(--font-calligraphic)] text-6xl text-primary mt-12 mb-4 select-none">
      f 
    </div>

    <SobreMi />

    <div className="font-[family:var(--font-calligraphic)] text-5xl text-accent/50 mt-10 mb-20 select-none">
      a b b b c
    </div>
    </MotionMain>
  );
}