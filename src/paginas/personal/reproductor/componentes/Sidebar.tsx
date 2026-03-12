"use client";
import { FolderOpen, Music, Search, List, User, Disc, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Track, VistaLibreria, fmt } from "./types";

interface Props {
  tracks: Track[];
  filtered: Track[];
  currentIdx: number;
  search: string;
  vista: VistaLibreria;
  loading: boolean;
  loadProgress: { done: number; total: number };
  isOpen: boolean;
  onToggle: () => void;
  onSearch: (v: string) => void;
  onVista: (v: VistaLibreria) => void;
  onOpenFolder: () => void;
  onPlayTrack: (idx: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const VISTAS: { id: VistaLibreria; label: string; icon: any }[] = [
  { id: "canciones", label: "Canciones", icon: List },
  { id: "artistas",  label: "Artistas",  icon: User },
  { id: "albums",    label: "Álbumes",   icon: Disc },
];

export function Sidebar({
  tracks, filtered, currentIdx, search, vista, loading, loadProgress, isOpen, onToggle,
  onSearch, onVista, onOpenFolder, onPlayTrack,
  fileInputRef, onFileInputChange,
}: Props) {

  const grouped = (vista === "artistas" || vista === "albums")
    ? filtered.reduce((acc, t) => {
        const key = vista === "artistas" ? t.artist : t.album;
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
      }, {} as Record<string, Track[]>)
    : null;

  const pct = loadProgress.total > 0
    ? Math.round((loadProgress.done / loadProgress.total) * 100)
    : 0;

  return (
    <aside
      className="flex flex-col h-full border-r relative"
      style={{
        width: isOpen ? 300 : 48,
        minWidth: isOpen ? 300 : 48,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)",
        background: "var(--bg-menu)",
        borderColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.flac,.wav,.ogg,.m4a,.aac,.opus"
        multiple
        // @ts-ignore
        webkitdirectory=""
        style={{ display: "none" }}
        onChange={onFileInputChange}
      />

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute z-10 flex items-center justify-center transition-all"
        style={{
          top: 16,
          right: isOpen ? 12 : "50%",
          transform: isOpen ? "none" : "translateX(50%)",
          transition: "right 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          width: 28, height: 28,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
        }}
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Contenido */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.15s ease",
          width: 300,
        }}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex flex-col gap-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.4em] pr-8"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Biblioteca
          </p>
          <button
            onClick={onOpenFolder}
            className="flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "var(--radius-btn)",
              color: "rgba(255,255,255,0.75)",
              cursor: "pointer",
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

        {/* Tabs vista */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {VISTAS.map(v => {
            const Icon = v.icon;
            const active = vista === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onVista(v.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[8px] font-black uppercase tracking-widest transition-all"
                style={{
                  color: active ? "var(--accent)" : "rgba(255,255,255,0.3)",
                  borderTop: "none", borderLeft: "none", borderRight: "none",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <Icon size={10} />
                <span>{v.label}</span>
              </button>
            );
          })}
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
              onChange={e => onSearch(e.target.value)}
              className="w-full bg-transparent outline-none border-none pl-5 text-[11px] tracking-wide uppercase"
              style={{
                color: "rgba(255,255,255,0.7)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                paddingBottom: 5,
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto py-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
        >
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {/* Barra de progreso */}
              {loadProgress.total > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] uppercase tracking-[0.2em]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Leyendo metadatos...
                    </p>
                    <p className="text-[9px] font-mono"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {loadProgress.done}/{loadProgress.total}
                    </p>
                  </div>
                  <div style={{
                    height: 2,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: "var(--accent)",
                      borderRadius: 2,
                      transition: "width 0.2s ease",
                    }} />
                  </div>
                </div>
              )}

              {/* Muestra canciones que ya llegaron mientras sigue cargando */}
              {tracks.length > 0 && (
                <div className="flex flex-col gap-0 mt-2">
                  {tracks.map((t, i) => {
                    const globalIdx = tracks.indexOf(t);
                    const isActive = globalIdx === currentIdx;
                    return (
                      <TrackRow
                        key={t.url}
                        track={t}
                        index={i + 1}
                        isActive={isActive}
                        onClick={() => onPlayTrack(globalIdx)}
                      />
                    );
                  })}
                </div>
              )}

              {tracks.length === 0 && (
                <div className="text-center mt-4">
                  <Loader2 size={18} className="animate-spin mx-auto mb-2"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                </div>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Music size={22} style={{ color: "rgba(255,255,255,0.12)", margin: "0 auto 10px" }} />
              <p className="text-[9px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {tracks.length ? "Sin resultados" : "Abre una carpeta"}
              </p>
            </div>
          ) : vista === "canciones" ? (
            filtered.map((t, i) => {
              const globalIdx = tracks.indexOf(t);
              const isActive = globalIdx === currentIdx;
              return (
                <TrackRow
                  key={t.url}
                  track={t}
                  index={i + 1}
                  isActive={isActive}
                  onClick={() => onPlayTrack(globalIdx)}
                />
              );
            })
          ) : (
            Object.entries(grouped!).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
              <div key={grupo}>
                <p className="px-5 pt-4 pb-1 text-[8px] font-black uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {grupo}
                </p>
                {items.map((t, i) => {
                  const globalIdx = tracks.indexOf(t);
                  const isActive = globalIdx === currentIdx;
                  return (
                    <TrackRow
                      key={t.url}
                      track={t}
                      index={i + 1}
                      isActive={isActive}
                      onClick={() => onPlayTrack(globalIdx)}
                      showArtist={vista === "albums"}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function TrackRow({ track, index, isActive, onClick, showArtist = false }: {
  track: Track; index: number; isActive: boolean; onClick: () => void; showArtist?: boolean;
}) {
  return (
    <div
      onClick={onClick}
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
      <span className="text-[9px] w-4 text-right flex-shrink-0" style={{ opacity: 0.4 }}>
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate tracking-wide">{track.name}</p>
        {showArtist && track.artist !== "Desconocido" && (
          <p className="text-[9px] truncate" style={{ opacity: 0.4 }}>{track.artist}</p>
        )}
      </div>
      <span className="text-[9px] flex-shrink-0" style={{ opacity: 0.4 }}>{fmt(track.duration)}</span>
    </div>
  );
}