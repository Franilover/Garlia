"use client";
import React from "react";
import { motion } from "framer-motion";

export function CitaVisual({ content }: { content: string }) {
  const dashIdx = content.lastIndexOf(" — ");
  const texto   = dashIdx !== -1 ? content.slice(0, dashIdx) : content;
  const fuente  = dashIdx !== -1 ? content.slice(dashIdx + 3) : null;

  return (
    <div className="my-12 mx-0 relative">
      {/* Barra lateral con degradado */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
        style={{ background: "linear-gradient(to bottom, transparent, var(--accent), var(--primary), transparent)" }}
      />
      {/* Puntos decorativos en los extremos de la barra */}
      <div className="absolute -top-1 left-[-2.5px] w-[7px] h-[7px] rounded-full border-2"
        style={{ borderColor: "var(--accent)", background: "var(--bg-main)" }}
      />
      <div className="absolute -bottom-1 left-[-2.5px] w-[7px] h-[7px] rounded-full border-2"
        style={{ borderColor: "var(--primary)", background: "var(--bg-main)" }}
      />

      <div
        className="pl-8 py-3 rounded-r-2xl"
        style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 5%, transparent), transparent)" }}
      >
        {/* Comilla de apertura grande */}
        <span
          className="block font-serif leading-none mb-1 select-none"
          style={{
            fontSize: "4rem",
            color: "var(--accent)",
            opacity: 0.35,
            fontStyle: "italic",
            lineHeight: 1,
          }}
          aria-hidden
        >
          "
        </span>

        <p className="font-serif text-lg md:text-xl italic leading-[1.95] text-primary-dark/80">
          {texto}
        </p>

        {/* Comilla de cierre — alineada a la derecha */}
        <span
          className="block font-serif leading-none mt-1 text-right select-none pr-4"
          style={{
            fontSize: "3rem",
            color: "var(--primary)",
            opacity: 0.15,
            fontStyle: "italic",
            lineHeight: 1,
          }}
          aria-hidden
        >
          "
        </span>

        {fuente && (
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-6" style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]"
              style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
            >
              {fuente}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}