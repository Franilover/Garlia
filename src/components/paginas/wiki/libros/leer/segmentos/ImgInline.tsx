"use client";
import React from "react";

export function ImgInline({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="my-12 -mx-6 md:-mx-12">
      <div className="relative overflow-hidden rounded-[var(--radius-btn)] md:rounded-[var(--radius-card)] shadow-xl shadow-[var(--foreground)]/10">
        <img src={url} alt={caption ?? ""} className="w-full object-cover" style={{ maxHeight: 520 }} />
        {caption && <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[var(--bg-menu)]/60 to-transparent" />}
      </div>
      {caption && <figcaption className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary/35">{caption}</figcaption>}
    </figure>
  );
}
