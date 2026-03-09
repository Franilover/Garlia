"use client";
import { useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Volume2 } from "lucide-react";
import { fmt } from "./types";

interface Props {
  isPlaying: boolean;
  shuffled: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  isDragging: boolean;
  onTogglePlay: () => void;
  onToggleShuffle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  progressRef: React.RefObject<HTMLDivElement>;
}

export function PlayerBar({
  isPlaying, shuffled, progress, currentTime, duration, volume, isDragging,
  onTogglePlay, onToggleShuffle, onPrev, onNext, onVolumeChange,
  onSeek, onDragStart, onDragMove, onDragEnd, progressRef,
}: Props) {
  return (
    <div
      className="flex flex-col justify-center gap-3 px-4 md:px-10"
      style={{
        height: 96,
        background: "var(--white-custom)",
        borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        boxShadow: "var(--shadow-card)",
        flexShrink: 0,
      }}
    >
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] w-9 text-right flex-shrink-0"
          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
        >
          {fmt(currentTime)}
        </span>
        <div
          ref={progressRef}
          className="flex-1 relative cursor-pointer"
          style={{ height: 3, background: "color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: 2 }}
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
        >
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: 2 }} />
          <div style={{
            position: "absolute", top: "50%", left: `${progress}%`,
            transform: "translate(-50%, -50%)",
            width: 10, height: 10, borderRadius: "50%", background: "var(--accent)",
          }} />
        </div>
        <span className="text-[9px] w-9 flex-shrink-0"
          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
        >
          {fmt(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center overflow-hidden">
        {/* Shuffle */}
        <div style={{ width: 80 }}>
          <button
            onClick={onToggleShuffle}
            className="transition-all p-1.5"
            style={{
              color: shuffled ? "var(--accent)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
              borderRadius: "var(--radius-btn)",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            <Shuffle size={15} />
          </button>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-5 flex-1">
          <button onClick={onPrev} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)"}
          >
            <SkipBack size={22} fill="currentColor" />
          </button>

          <button
            onClick={onTogglePlay}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--primary)", color: "var(--btn-text)",
              boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 35%, transparent)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.07)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>

          <button onClick={onNext} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)"}
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 min-w-0" style={{ width: 120, flexShrink: 0 }}>
          <Volume2 size={13} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
          <input
            type="range" min={0} max={1} step={0.01}
            value={volume}
            onChange={e => onVolumeChange(parseFloat(e.target.value))}
            style={{
              flex: 1, appearance: "none", height: 2,
              background: `linear-gradient(to right, var(--primary) ${volume * 100}%, color-mix(in srgb, var(--primary) 15%, transparent) ${volume * 100}%)`,
              borderRadius: 2, outline: "none", cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  );
}