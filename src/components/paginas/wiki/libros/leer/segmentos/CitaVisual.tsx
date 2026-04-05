"use client";
import React from "react";

export function CitaVisual({ content }: { content: string }) {
  const dashIdx = content.lastIndexOf(" — ");
  const texto  = dashIdx !== -1 ? content.slice(0, dashIdx) : content;
  const fuente = dashIdx !== -1 ? content.slice(dashIdx + 3) : null;
  return (
    <div className="my-10 mx-0 relative">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full" style={{ background: "linear-gradient(to bottom, var(--accent), var(--color-primary, var(--primary)), var(--accent))" }} />
      <div className="absolute -top-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
      <div className="absolute -bottom-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-primary" />
      <div className="pl-7 py-2 bg-gradient-to-r from-primary/5 to-transparent rounded-r-2xl">
        <span className="block font-serif text-5xl leading-none mb-2 select-none" style={{ color: "var(--accent)", opacity: 0.5, fontStyle: "italic" }} aria-hidden>"</span>
        <p className="font-serif text-lg md:text-xl italic leading-[1.9] text-primary-dark/75">{texto}</p>
        {fuente && <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-primary/40">— {fuente}</p>}
      </div>
    </div>
  );
}