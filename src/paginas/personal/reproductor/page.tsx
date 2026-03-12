"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Track, VistaLibreria, loadTracksFromFiles, saveDirectoryHandle, loadDirectoryHandle } from "./componentes/types";
import { Sidebar } from "./componentes/Sidebar";
import { NowPlaying } from "./componentes/NowPlaying";
import { PlayerBar } from "./componentes/PlayerBar";

export default function ReproductorPage() {
  const audioRef     = useRef<HTMLAudioElement>(null);
  const progressRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks]           = useState<Track[]>([]);
  const [filtered, setFiltered]       = useState<Track[]>([]);
  const [currentIdx, setCurrentIdx]   = useState(-1);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [shuffled, setShuffled]       = useState(false);
  const [progress, setProgress]       = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [volume, setVolume]           = useState(0.8);
  const [search, setSearch]           = useState("");
  const [isDragging, setIsDragging]   = useState(false);
  const [spinning, setSpinning]       = useState(false);
  const [vista, setVista]             = useState<VistaLibreria>("canciones");
  const [loading, setLoading]         = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const applyTracks = useCallback((loaded: Track[]) => {
    setTracks(loaded);
    setFiltered(loaded);
    setCurrentIdx(-1);
    setIsPlaying(false);
    setSpinning(false);
  }, []);

  // ── Cargar carpeta guardada al iniciar ────────────────────────────────────
  useEffect(() => {
    if (!("showDirectoryPicker" in window)) return;

    (async () => {
      const handle = await loadDirectoryHandle();
      if (!handle) return;

      // El navegador requiere confirmar permiso aunque ya se haya dado antes
      // Cast a any porque TypeScript no incluye queryPermission/requestPermission
      // en sus tipos de FileSystemDirectoryHandle por defecto
      try {
        const h = handle as any;
        const perm = await h.queryPermission({ mode: "read" });
        const granted =
          perm === "granted"
            ? "granted"
            : await h.requestPermission({ mode: "read" });

        if (granted !== "granted") return;

        setLoading(true);
        const files: File[] = [];
        for await (const entry of (handle as any).values()) {
          if (
            entry.kind === "file" &&
            /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(entry.name)
          ) {
            files.push(await entry.getFile());
          }
        }
        const loaded = await loadTracksFromFiles(files);
        applyTracks(loaded);
      } catch (e) {
        console.warn("[Reproductor] No se pudo restaurar la carpeta:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [applyTracks]);

  // ── Abrir carpeta ─────────────────────────────────────────────────────────
  const openFolder = useCallback(async () => {
    if ("showDirectoryPicker" in window) {
      try {
        const dir = await (window as any).showDirectoryPicker({ mode: "read" });

        // Guardar en Dexie para la próxima sesión
        await saveDirectoryHandle(dir);

        const files: File[] = [];
        for await (const entry of dir.values()) {
          if (
            entry.kind === "file" &&
            /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(entry.name)
          ) {
            files.push(await entry.getFile());
          }
        }
        setLoading(true);
        const loaded = await loadTracksFromFiles(files);
        applyTracks(loaded);
      } catch (e: any) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback para Firefox (no soporta showDirectoryPicker)
      fileInputRef.current?.click();
    }
  }, [applyTracks]);

  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setLoading(true);
    const loaded = await loadTracksFromFiles(files);
    applyTracks(loaded);
    setLoading(false);
    e.target.value = "";
  }, [applyTracks]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setLoading(true);
    const loaded = await loadTracksFromFiles([...e.dataTransfer.files]);
    applyTracks(loaded);
    setLoading(false);
  }, [applyTracks]);

  // ── Playback ──────────────────────────────────────────────────────────────
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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentIdx === -1 && tracks.length) { playTrack(0); return; }
    if (audio.paused) { audio.play(); setIsPlaying(true); setSpinning(true); }
    else              { audio.pause(); setIsPlaying(false); setSpinning(false); }
  }, [currentIdx, tracks, playTrack]);

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
    playTrack(currentIdx <= 0 ? tracks.length - 1 : currentIdx - 1);
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

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current!.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current?.duration) audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(tracks.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    ));
  }, [search, tracks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const audio = audioRef.current;
      if (e.code === "Space")      { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight" && audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      if (e.code === "ArrowLeft"  && audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
      if (e.code === "ArrowUp")   setVolume(v => Math.min(1, v + 0.05));
      if (e.code === "ArrowDown") setVolume(v => Math.max(0, v - 0.05));
      if (e.code === "KeyN") playNext();
      if (e.code === "KeyP") playPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, playNext, playPrev]);

  return (
    <div
      className="flex overflow-hidden bg-bg-main text-primary h-[calc(100svh-64px)] md:h-[calc(100svh-80px)]"
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <audio ref={audioRef} />

      <Sidebar
        tracks={tracks}
        filtered={filtered}
        currentIdx={currentIdx}
        search={search}
        vista={vista}
        loading={loading}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        onSearch={setSearch}
        onVista={setVista}
        onOpenFolder={openFolder}
        onPlayTrack={playTrack}
        fileInputRef={fileInputRef}
        onFileInputChange={onFileInputChange}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <NowPlaying
          track={tracks[currentIdx]}
          isPlaying={isPlaying}
          spinning={spinning}
        />
        <PlayerBar
          isPlaying={isPlaying}
          shuffled={shuffled}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isDragging={isDragging}
          progressRef={progressRef}
          onTogglePlay={togglePlay}
          onToggleShuffle={() => setShuffled(s => !s)}
          onPrev={playPrev}
          onNext={playNext}
          onVolumeChange={setVolume}
          onSeek={seek}
          onDragStart={e => { setIsDragging(true); seek(e); }}
          onDragMove={e => { if (isDragging) seek(e); }}
          onDragEnd={() => setIsDragging(false)}
        />
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