"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle,
  Volume2, FolderOpen, Music, Search
} from "lucide-react";

interface Track {
  name: string;
  url: string;
  duration: number | null;
}

function fmt(s: number | null) {
  if (!s || !isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${ss}`;
}

function loadTracksFromFiles(files: File[]): Track[] {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  return sorted.map(f => ({
    name: f.name.replace(/\.[^.]+$/, "").replace(/^\d+[\.\s\-]+/, ""),
    url: URL.createObjectURL(f),
    duration: null,
  }));
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [filtered, setFiltered] = useState<Track[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [spinning, setSpinning] = useState(false);

  // ── Cargar duraciones async ───────────────────────────────────────────────
  const loadDurations = useCallback((loaded: Track[]) => {
    loaded.forEach((t, i) => {
      const a = new Audio(t.url);
      a.addEventListener("loadedmetadata", () => {
        setTracks(prev => prev.map((p, pi) => pi === i ? { ...p, duration: a.duration } : p));
        setFiltered(prev => prev.map((p, pi) => pi === i ? { ...p, duration: a.duration } : p));
      });
    });
  }, []);

  const applyTracks = useCallback((loaded: Track[]) => {
    setTracks(loaded);
    setFiltered(loaded);
    setCurrentIdx(-1);
    setIsPlaying(false);
    loadDurations(loaded);
  }, [loadDurations]);

  // ── Open folder (Chrome/Edge) con fallback a input file (Firefox) ─────────
  const openFolder = useCallback(async () => {
    // Chrome/Edge: File System Access API
    if ("showDirectoryPicker" in window) {
      try {
        const dir = await (window as any).showDirectoryPicker({ mode: "read" });
        const files: File[] = [];
        for await (const entry of dir.values()) {
          if (entry.kind === "file" && /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(entry.name)) {
            files.push(await entry.getFile());
          }
        }
        applyTracks(loadTracksFromFiles(files));
      } catch (e: any) {
        if (e.name !== "AbortError") console.error(e);
      }
    } else {
      // Firefox: fallback a input file con webkitdirectory
      fileInputRef.current?.click();
    }
  }, [applyTracks]);

  // ── Handler del input file (Firefox fallback) ─────────────────────────────
  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files || [])].filter(f =>
      /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name)
    );
    if (!files.length) return;
    applyTracks(loadTracksFromFiles(files));
    e.target.value = ""; // reset para permitir reabrir la misma carpeta
  }, [applyTracks]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f =>
      /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name)
    );
    if (!files.length) return;
    applyTracks(loadTracksFromFiles(files));
  }, [applyTracks]);

  // ── Play track ────────────────────────────────────────────────────────────
  const playTrack = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio || !tracks[idx]) return;
    audio.src = tracks[idx].url;
    audio.volume = volume;
    audio.play();
    setCurrentIdx(idx);
    setIsPlaying(true);
    setSpinning(true);
  }, [tracks, volume]);

  // ── Toggle play/pause ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentIdx === -1 && tracks.length) { playTrack(0); return; }
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
      setSpinning(true);
    } else {
      audio.pause();
      setIsPlaying(false);
      setSpinning(false);
    }
  }, [currentIdx, tracks, playTrack]);

  // ── Next / Prev ───────────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (!tracks.length) return;
    const idx = shuffled
      ? Math.floor(Math.random() * tracks.length)
      : (currentIdx + 1) % tracks.length;
    playTrack(idx);
  }, [tracks, shuffled, currentIdx, playTrack]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const idx = currentIdx <= 0 ? tracks.length - 1 : currentIdx - 1;
    playTrack(idx);
  }, [tracks, currentIdx, playTrack]);

  // ── Audio events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (isDragging) return;
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", playNext);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", playNext);
    };
  }, [isDragging, playNext]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current!.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
    }
    setProgress(pct * 100);
  };

  // ── Volume ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(tracks.filter(t => t.name.toLowerCase().includes(q)));
  }, [search, tracks]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const audio = audioRef.current;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight" && audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      if (e.code === "ArrowLeft" && audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
      if (e.code === "ArrowUp") setVolume(v => Math.min(1, v + 0.05));
      if (e.code === "ArrowDown") setVolume(v => Math.max(0, v - 0.05));
      if (e.code === "KeyN") playNext();
      if (e.code === "KeyP") playPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, playNext, playPrev]);

  const currentTrack = tracks[currentIdx];

  return (
    <div
      className="flex h-screen overflow-hidden bg-bg-main text-primary"
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <audio ref={audioRef} />

      {/* Input oculto para Firefox (webkitdirectory permite seleccionar carpeta) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.flac,.wav,.ogg,.m4a,.aac,.opus"
        multiple
        // @ts-ignore — webkitdirectory no está en los tipos de TS pero funciona en todos los browsers
        webkitdirectory=""
        style={{ display: "none" }}
        onChange={onFileInputChange}
      />

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col h-full overflow-hidden border-r"
        style={{
          width: 300,
          background: "var(--bg-menu)",
          borderColor: "rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex flex-col gap-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.4em]"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Biblioteca
          </p>
          <button
            onClick={openFolder}
            className="flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "var(--radius-btn)",
              color: "rgba(255,255,255,0.75)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,1)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
            }}
          >
            <FolderOpen size={13} />
            Abrir carpeta
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative flex items-center">
            <Search size={11} className="absolute left-0 pointer-events-none"
              style={{ color: "rgba(255,255,255,0.25)" }}
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none border-none pl-5 text-[11px] tracking-wide uppercase"
              style={{
                color: "rgba(255,255,255,0.7)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                paddingBottom: 5,
              }}
            />
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto py-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Music size={22} style={{ color: "rgba(255,255,255,0.12)", margin: "0 auto 10px" }} />
              <p className="text-[9px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {tracks.length ? "Sin resultados" : "Abre una carpeta"}
              </p>
            </div>
          ) : filtered.map((t, i) => {
            const globalIdx = tracks.indexOf(t);
            const isActive = globalIdx === currentIdx;
            return (
              <div
                key={t.url}
                onClick={() => playTrack(globalIdx)}
                className="flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-all"
                style={{
                  background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                  borderLeft: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
                  color: isActive ? "var(--accent)" : "rgba(255,255,255,0.55)",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
                  }
                }}
              >
                <span className="text-[9px] w-4 text-right flex-shrink-0"
                  style={{ opacity: 0.4 }}
                >{i + 1}</span>
                <span className="text-[11px] truncate flex-1 tracking-wide">{t.name}</span>
                <span className="text-[9px] flex-shrink-0" style={{ opacity: 0.4 }}>{fmt(t.duration)}</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Now playing */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">

          {/* Ambient glow */}
          {currentTrack && (
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 60%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 65%)",
              }}
            />
          )}

          {currentTrack ? (
            <div className="flex flex-col items-center gap-6 text-center px-8 relative z-10">
              {/* Vinyl disc */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: 180, height: 180,
                  borderRadius: "50%",
                  background: "repeating-radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--primary) 8%, var(--bg-main)) 0px, color-mix(in srgb, var(--primary) 8%, var(--bg-main)) 1px, color-mix(in srgb, var(--primary) 4%, var(--bg-main)) 2px, color-mix(in srgb, var(--primary) 4%, var(--bg-main)) 5px)",
                  border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                  boxShadow: "0 0 60px color-mix(in srgb, var(--primary) 12%, transparent), 0 0 0 1px color-mix(in srgb, var(--primary) 8%, transparent)",
                  animation: spinning ? (isPlaying ? "spin 4s linear infinite" : "spin 4s linear infinite paused") : "none",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 16px color-mix(in srgb, var(--accent) 50%, transparent)",
                }} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-3"
                  style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                >
                  Reproduciendo
                </p>
                <h2 className="font-black italic uppercase leading-tight"
                  style={{
                    fontSize: "clamp(1.2rem, 3vw, 2rem)",
                    color: "var(--primary)",
                    letterSpacing: "-0.02em",
                    maxWidth: 480,
                  }}
                >
                  {currentTrack.name}
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

        {/* ── Player bar ── */}
        <div
          className="flex flex-col justify-center gap-3 px-10"
          style={{
            height: 96,
            background: "var(--white-custom)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            boxShadow: "var(--shadow-card)",
            flexShrink: 0,
          }}
        >
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] w-9 text-right flex-shrink-0"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            >
              {fmt(currentTime)}
            </span>
            <div
              ref={progressRef}
              className="flex-1 relative cursor-pointer group"
              style={{ height: 3, background: "color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: 2 }}
              onMouseDown={e => { setIsDragging(true); seek(e); }}
              onMouseMove={e => { if (isDragging) seek(e); }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--accent)",
                borderRadius: 2,
              }} />
              <div style={{
                position: "absolute",
                top: "50%", left: `${progress}%`,
                transform: "translate(-50%, -50%)",
                width: 10, height: 10,
                borderRadius: "50%",
                background: "var(--accent)",
              }} />
            </div>
            <span className="text-[9px] w-9 flex-shrink-0"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            >
              {fmt(duration)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center">
            <div style={{ width: 80 }}>
              <button
                onClick={() => setShuffled(s => !s)}
                className="transition-all p-1.5"
                style={{
                  color: shuffled ? "var(--accent)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}
              >
                <Shuffle size={15} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-5 flex-1">
              <button
                onClick={playPrev}
                className="transition-all"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)"}
              >
                <SkipBack size={22} fill="currentColor" />
              </button>

              <button
                onClick={togglePlay}
                className="flex items-center justify-center transition-all"
                style={{
                  width: 44, height: 44,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "var(--btn-text)",
                  boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 35%, transparent)",
                  border: "none",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.07)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>

              <button
                onClick={playNext}
                className="transition-all"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)"}
              >
                <SkipForward size={22} fill="currentColor" />
              </button>
            </div>

            <div className="flex items-center gap-2" style={{ width: 120 }}>
              <Volume2 size={13} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
              <input
                type="range" min={0} max={1} step={0.01}
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="flex-1"
                style={{
                  appearance: "none", height: 2,
                  background: `linear-gradient(to right, var(--primary) ${volume * 100}%, color-mix(in srgb, var(--primary) 15%, transparent) ${volume * 100}%)`,
                  borderRadius: 2, outline: "none", cursor: "pointer",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}