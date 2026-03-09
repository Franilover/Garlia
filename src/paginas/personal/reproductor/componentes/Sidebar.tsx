"use client";
import { FolderOpen, Music, Search, List, User, Disc } from "lucide-react";
import { Track, VistaLibreria, fmt } from "./types";

interface Props {
  tracks: Track[];
  filtered: Track[];
  currentIdx: number;
  search: string;
  vista: VistaLibreria;
  onSearch: (v: string) => void;
  onVista: (v: VistaLibreria) => void;
  onOpenFolder: () => void;
  onPlayTrack: (idx: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const VISTAS: { id: VistaLibreria; label: string; icon: any }[] = [
  { id: "canciones", label: "Canciones", icon: List },
  { id: "artistas", label: "Artistas",  icon: User },
  { id: "albums",   label: "Álbumes",   icon: Disc },
];

export function Sidebar({
  tracks, filtered, currentIdx, search, vista,
  onSearch, onVista, onOpenFolder, onPlayTrack,
  fileInputRef, onFileInputChange,
}: Props) {

  // Agrupar por artista o álbum
  const grouped = (vista === "artistas" || vista === "albums")
    ? filtered.reduce((acc, t) => {
        const key = vista === "artistas" ? t.artist : t.album;
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
      }, {} as Record<string, Track[]>)
    : null;

  return (
    <aside
      className="flex flex-col h-full overflow-hidden border-r"
      style={{
        width: 300,
        background: "var(--bg-menu)",
        borderColor: "rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      {/* Input oculto para Firefox */}
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
          onClick={onOpenFolder}
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
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <Icon size={10} />
              <span className="hidden sm:inline">{v.label}</span>
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
        {filtered.length === 0 ? (
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