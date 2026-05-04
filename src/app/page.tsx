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
    <div className="flex flex-col items-center gap-10 p-10 bg-bg-main min-h-screen">
      
      {/* PRUEBA 1: MAYÚSCULAS (Suelen ser las esquinas y bordes principales) */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2 font-sans">Prueba con Mayúsculas (A B C D E):</p>
        <span className="font-caligrafia text-8xl text-primary block">
          A B C D E
        </span>
      </div>

      {/* PRUEBA 2: MINÚSCULAS (Suelen ser adornos más finos o conectores) */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2 font-sans">Prueba con Minúsculas (a b c d e):</p>
        <span className="font-caligrafia text-8xl text-accent block">
          a b c d e
        </span>
      </div>

      {/* PRUEBA 3: EL NÚMERO 1 (Único número con dibujo) */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2 font-sans">Prueba con el número 1:</p>
        <span className="font-caligrafia text-8xl text-white block">
          1
        </span>
      </div>

    </div>
    </MotionMain>
  );
}