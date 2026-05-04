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
      <div className="flex flex-col items-center p-10 gap-4">
        {/* Prueba de fuego: Letras mayúsculas que forman el marco */}
        <h1 className="font-caligrafia text-8xl text-primary leading-none">
          A B C
        </h1>
        
        <p className="font-sans text-white/50">
          Si ves dibujos arriba, ¡la configuración de public + CSS funcionó!
        </p>

        {/* El adorno central '1' */}
        <span className="font-caligrafia text-6xl text-accent">
          1
        </span>
      </div>
    </MotionMain>
  );
}