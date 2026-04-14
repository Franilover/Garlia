"use client";
import React, { useState, useEffect, useRef } from "react";
import { Music2 } from "lucide-react";
import { MotionDiv } from '@/components/ui/Motion';

export function SoundInline({ url, volume }: { url: string; volume: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const label = url.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "sonido";

  return (
    <span
      className="inline-flex items-center gap-2 mx-1 my-2 px-3 py-1.5 rounded-[var(--radius-btn)] border align-middle transition-all select-none cursor-pointer"
      style={{
        background:   playing ? "var(--color-primary, var(--primary))" : "rgba(var(--color-primary-rgb, 107,94,112), 0.06)",
        borderColor:  playing ? "var(--color-primary, var(--primary))" : "rgba(var(--color-primary-rgb, 107,94,112), 0.15)",
        color:        playing ? "white" : "rgba(107,94,112,0.6)",
      }}
      onClick={toggle} role="button"
      title={playing ? "Detener ambientación" : "Reproducir ambientación"}
    >
      {playing ? (
        <span className="inline-flex items-end gap-px h-3">
          {[0, 1, 2].map(i => (
            <motion.span key={i} className="w-px rounded-full bg-white-custom" style={{ display: "inline-block" }}
              animate={{ height: ["4px", "10px", "5px", "12px", "4px"][i % 5] }}
              transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          ))}
        </span>
      ) : <Music2 size={12} />}
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
    </span>
  );
}
