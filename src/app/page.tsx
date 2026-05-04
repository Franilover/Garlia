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
      <div className="flex flex-col items-center gap-6 p-10 bg-slate-900">
        
        {/* Prueba de Esquinas y Líneas */}
        <div className="text-amber-500">
          <p className="font-sans text-xs mb-2 text-white">Piezas de Marco (A B C):</p>
          <span className="font-caligrafia text-8xl leading-none">
            A B C
          </span>
        </div>

        {/* Prueba de Florones (Fleurons) */}
        <div className="text-amber-500">
          <p className="font-sans text-xs mb-2 text-white">Adornos centrales (D E F 1):</p>
          <span className="font-caligrafia text-8xl leading-none">
            D E F 1
          </span>
        </div>

      </div>
    </MotionMain>
  );
}