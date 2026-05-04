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
<div className="flex flex-col items-center p-10 gap-8">
  <div className="text-primary">
    {/* Cambiamos font-caligrafia por font-decorativa */}
<div className="flex flex-col items-center p-10 gap-8">
  <div className="text-primary">
    {/* Cambiamos font-caligrafia por font-decorativa */}
    <h1 className="font-decorativa text-9xl leading-none">
      A B C D
    </h1>
  </div>
</div>
  </div>
</div>
    </MotionMain>
  );
}