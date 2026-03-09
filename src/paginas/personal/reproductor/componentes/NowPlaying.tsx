"use client";
import { Music } from "lucide-react";
import { Track } from "./types";

interface Props {
  track: Track | undefined;
  isPlaying: boolean;
  spinning: boolean;
}

export function NowPlaying({ track, isPlaying, spinning }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      {track && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 60%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 65%)",
        }} />
      )}

      {track ? (
        <div className="flex flex-col items-center gap-6 text-center px-8 relative z-10">
          {/* Vinyl */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 180, height: 180,
              borderRadius: "50%",
              background: "repeating-radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--primary) 8%, var(--bg-main)) 0px, color-mix(in srgb, var(--primary) 8%, var(--bg-main)) 1px, color-mix(in srgb, var(--primary) 4%, var(--bg-main)) 2px, color-mix(in srgb, var(--primary) 4%, var(--bg-main)) 5px)",
              border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              boxShadow: "0 0 60px color-mix(in srgb, var(--primary) 12%, transparent)",
              animation: spinning
                ? (isPlaying ? "spin 4s linear infinite" : "spin 4s linear infinite paused")
                : "none",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 50%, transparent)",
            }} />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-1"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              Reproduciendo
            </p>
            {track.artist !== "Desconocido" && (
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
              >
                {track.artist}
                {track.album !== "Desconocido" && ` · ${track.album}`}
              </p>
            )}
            <h2 className="font-black italic uppercase leading-tight"
              style={{
                fontSize: "clamp(1.2rem, 3vw, 2rem)",
                color: "var(--primary)",
                letterSpacing: "-0.02em",
                maxWidth: 480,
              }}
            >
              {track.name}
            </h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center px-8 relative z-10">
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "2px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "color-mix(in srgb, var(--primary) 20%, transparent)",
          }}>
            <Music size={28} />
          </div>
          <div>
            <p className="font-black italic uppercase"
              style={{ fontSize: "1.1rem", color: "color-mix(in srgb, var(--primary) 40%, transparent)", letterSpacing: "-0.01em" }}
            >
              Sin canción
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] mt-2"
              style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            >
              Abre una carpeta o arrastra archivos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}