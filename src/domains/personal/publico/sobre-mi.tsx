"use client";

import { Instagram, Youtube, Palette, NotebookPen, Download, X, Smartphone, Monitor, Terminal, Globe, Gamepad2, Pencil, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useEffect, useCallback } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { MotionA, MotionDiv, MotionH1, MotionMain, MotionSection } from '@/ui/Motion';
import { ToastContainer } from "@/ui/ToastContainer";
import { useToast } from "@/hooks/ui/useToast";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] as any },
});

// ── TIPOS ──────────────────────────────────────────────────────────────────────

type PlatformOption = {
  label: string;
  icon: React.ReactNode;
  url: string | null;
  tag?: string;
};

type DownloadPanelProps = {
  title: string;
  description: string;
  platforms: PlatformOption[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

// ── PANEL FLOTANTE ─────────────────────────────────────────────────────────────

function DownloadPanel({ title, description, platforms, onClose, anchorRef }: DownloadPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Descargar ${title}`}
      className="absolute z-50 mt-3 left-1/2 -translate-x-1/2"
      style={{
        width: "min(320px, 90vw)",
        background: "var(--white-custom)",
        borderRadius: "var(--radius-card)",
        border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
        boxShadow: "var(--shadow-card)",
        padding: "1.5rem",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-black text-base leading-snug" style={{ color: "var(--primary)", letterSpacing: "-0.02em" }}>
            {title}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--primary)", opacity: 0.45 }}>
            {description}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 hover:opacity-60 ml-3 shrink-0"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}
          aria-label="Cerrar"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {platforms.map((p) => {
          const available = p.url !== null;
          return available ? (
            <a
              key={p.label}
              href={p.url!}
              download
              className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 no-underline"
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 12%, transparent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
            >
              <span style={{ opacity: 0.7 }}>{p.icon}</span>
              <span className="font-black text-sm" style={{ letterSpacing: "-0.01em" }}>{p.label}</span>
              {p.tag && (
                <span className="ml-auto text-micro font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", opacity: 0.7 }}>
                  {p.tag}
                </span>
              )}
              <Download size={13} style={{ marginLeft: p.tag ? "0" : "auto", opacity: 0.5 }} />
            </a>
          ) : (
            <div
              key={p.label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 6%, transparent)",
                color: "var(--primary)",
                opacity: 0.35,
                cursor: "not-allowed",
              }}
            >
              <span>{p.icon}</span>
              <span className="font-black text-sm" style={{ letterSpacing: "-0.01em" }}>{p.label}</span>
              <span className="ml-auto text-micro font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                Pronto
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── BOTÓN DE DESCARGA ─────────────────────────────────────────────────────────

type DownloadButtonProps = {
  icon: React.ReactNode;
  label: string;
  platforms: PlatformOption[];
  delay?: number;
};

function DownloadButton({ icon, label, platforms, delay = 0 }: DownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <MotionDiv {...fade(delay)} className="relative flex-1" style={{ minWidth: 0 }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer"
        style={{
          background: "var(--white-custom)",
          borderRadius: "var(--radius-card)",
          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${open ? "20%" : "10%"}, transparent)`,
          transition: "border-color 0.18s ease",
          outline: "none",
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--primary)", opacity: 0.5 }}>{icon}</span>
          <p className="font-black text-sm leading-snug" style={{ color: "var(--primary)", letterSpacing: "-0.01em" }}>
            {label}
          </p>
        </div>
        <Download size={13} strokeWidth={2} style={{ color: "var(--primary)", opacity: open ? 0.6 : 0.22, transition: "opacity 0.18s ease" }} />
      </button>

      {open && (
        <DownloadPanel
          title={label}
          description=""
          platforms={platforms}
          onClose={() => setOpen(false)}
          anchorRef={btnRef}
        />
      )}
    </MotionDiv>
  );
}

// ── BLOQUE DE TEXTO EDITABLE ──────────────────────────────────────────────────

function BloqueEditable({
  clave,
  valor,
  isAdmin,
  onSave,
  className,
  style,
}: {
  clave: string;
  valor: string;
  isAdmin: boolean;
  onSave: (clave: string, nuevoValor: string) => Promise<void>;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(valor);
  const [guardando, setGuardando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(valor); }, [valor]);

  useEffect(() => {
    if (editando && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editando]);

  const handleSave = async () => {
    setGuardando(true);
    await onSave(clave, draft);
    setGuardando(false);
    setEditando(false);
  };

  const handleCancel = () => {
    setDraft(valor);
    setEditando(false);
  };

  if (editando) {
    return (
      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          className="w-full resize-none rounded-xl px-4 py-3 text-base font-light italic leading-relaxed outline-none"
          style={{
            ...style,
            background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
            border: "2px solid color-mix(in srgb, var(--primary) 30%, transparent)",
            color: "var(--primary)",
            opacity: 1,
          }}
        />
        <div className="flex gap-2 mt-2 justify-end">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}
          >
            <X size={12} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={guardando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}
          >
            {guardando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group w-full">
      <p className={className} style={style}>
        {valor}
      </p>
      {isAdmin && (
        <button
          onClick={() => setEditando(true)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
          title="Editar texto"
        >
          <Pencil size={11} /> Editar
        </button>
      )}
    </div>
  );
}

// ── TOGGLE DE VISIBILIDAD (para admin) ────────────────────────────────────────

function VisibilityToggle({
  visible,
  onToggle,
  label,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      title={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all"
      style={{
        background: visible
          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
          : "color-mix(in srgb, var(--primary) 4%, transparent)",
        color: "var(--primary)",
        opacity: visible ? 1 : 0.5,
        border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
      }}
    >
      {visible ? <Eye size={11} /> : <EyeOff size={11} />}
      {visible ? "Visible" : "Oculto"}
    </button>
  );
}

// ── DATOS DE DESCARGA ─────────────────────────────────────────────────────────

const WEBAPP_PLATFORMS: PlatformOption[] = [
  { label: "Android", icon: <Smartphone size={16} strokeWidth={1.5} />, url: "https://github.com/Franilover/Garlia/releases/latest/download/app-universal-release.apk", tag: "APK" },
  { label: "Windows", icon: <Monitor size={16} strokeWidth={1.5} />, url: null },
  { label: "Linux", icon: <Terminal size={16} strokeWidth={1.5} />, url: "https://github.com/Franilover/Garlia/releases/latest/download/Garlia_amd64.AppImage" },
];

const JUEGO_PLATFORMS: PlatformOption[] = [
  { label: "Android", icon: <Smartphone size={16} strokeWidth={1.5} />, url: null, tag: "APK" },
  { label: "Windows", icon: <Monitor size={16} strokeWidth={1.5} />, url: "https://github.com/Franilover/Game/releases/latest/download/Garlia.exe" },
  { label: "Linux", icon: <Terminal size={16} strokeWidth={1.5} />, url: "https://github.com/Franilover/Game/releases/latest/download/Garlia.x86_64" },
];

// ── DEFINICIÓN DE REDES SOCIALES ──────────────────────────────────────────────

const SOCIALES_DEF = [
  {
    key: "instagram_dibujos",
    label: "Dibujos",
    handle: "@franiloverart",
    href: "https://www.instagram.com/franiloverart/",
    icon: <Instagram size={20} strokeWidth={1.5} style={{ opacity: 0.65 }} />,
  },
  {
    key: "instagram_fotos",
    label: "Fotos",
    handle: "@franilover",
    href: "https://www.instagram.com/franilover/",
    icon: <Instagram size={20} strokeWidth={1.5} style={{ opacity: 0.65 }} />,
  },
  {
    key: "youtube",
    label: "YouTube",
    handle: "@franilover",
    href: "https://youtube.com/@franilover",
    icon: <Youtube size={20} strokeWidth={1.5} style={{ opacity: 0.65 }} />,
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: "@franilover",
    href: "https://tiktok.com/@franilover",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" style={{ opacity: 0.65 }} viewBox="0 0 24 24" width="20">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    ),
  },
];

const DESCARGAS_DEF = [
  { key: "webapp", label: "WebApp", icon: <Globe size={15} strokeWidth={1.75} />, platforms: WEBAPP_PLATFORMS },
  { key: "juego", label: "Juego", icon: <Gamepad2 size={15} strokeWidth={1.75} />, platforms: JUEGO_PLATFORMS },
];

// ── CLAVES DE SUPABASE ────────────────────────────────────────────────────────
// sobre_mi_textos usa claves tipo:
//   "hero"                       → texto del bloque principal
//   "garden_of_sins"             → descripción de Garden of Sins
//   "social_instagram_dibujos_visible"  → "true" | "false"
//   "social_instagram_fotos_visible"
//   "social_youtube_visible"
//   "social_tiktok_visible"
//   "descarga_webapp_visible"
//   "descarga_juego_visible"

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export default function SobreMi() {
  const { isAdmin } = useAuth() as any;
  const { toasts, toast, dismiss } = useToast();

  // Textos editables
  const [textos, setTextos] = useState<Record<string, string>>({
    hero: "Bienvenido a mi pequeño jardín digital. Uso este espacio para compartir mis hobbys y proyectos: Mi mayor proyecto es \"Garden of Sins\" el cual puedes ver en el icono de la flor.",
    garden_of_sins: "Este proyecto comenzo como una forma de compartir experiencias que no era capas de expresar verbalmente y a la vez explorar nuevas formas de arte.\nLuego se convirtio en algo mas grande. Ya no era solo mi historia, era un mundo entero que necesitaba sacar de mi mente. \n\n Los personajes de este mundo surgieron en base a personas que han dejado una marca en mi. Y pese a que los temas de esta historia son recurrentes en la actualidad, y muchos aconteciemtos estan basados en ciertos periodos historicos todo lo contado en estas historias es ficticio.",
  });

  // Visibilidad de sociales y descargas
  const [visibilidad, setVisibilidad] = useState<Record<string, boolean>>({
    social_instagram_dibujos_visible: true,
    social_instagram_fotos_visible: true,
    social_youtube_visible: true,
    social_tiktok_visible: true,
    descarga_webapp_visible: true,
    descarga_juego_visible: true,
  });

  const [cargando, setCargando] = useState(true);

  // ── Cargar desde Supabase ─────────────────────────────────────────────────

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from("sobre_mi_textos")
        .select("clave, valor");

      if (error) {
        console.error("[SobreMi] Error cargando textos:", error);
        setCargando(false);
        return;
      }

      const nuevosTextos: Record<string, string> = { ...textos };
      const nuevaVisibilidad: Record<string, boolean> = { ...visibilidad };

      for (const row of data ?? []) {
        if (row.clave.endsWith("_visible")) {
          nuevaVisibilidad[row.clave] = row.valor === "true";
        } else {
          nuevosTextos[row.clave] = row.valor;
        }
      }

      setTextos(nuevosTextos);
      setVisibilidad(nuevaVisibilidad);
      setCargando(false);
    };

    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Guardar texto en Supabase ─────────────────────────────────────────────

  const guardarTexto = useCallback(async (clave: string, valor: string) => {
    const { error } = await supabase
      .from("sobre_mi_textos")
      .upsert({ clave, valor, updated_at: new Date().toISOString() }, { onConflict: "clave" });

    if (error) {
      toast.error("Error al guardar el texto.");
    } else {
      setTextos((prev) => ({ ...prev, [clave]: valor }));
      toast.success?.("Texto guardado ✓") ?? toast.error("");
    }
  }, [toast]);

  // ── Guardar visibilidad en Supabase ──────────────────────────────────────

  const toggleVisibilidad = useCallback(async (clave: string) => {
    const nuevoValor = !visibilidad[clave];
    setVisibilidad((prev) => ({ ...prev, [clave]: nuevoValor }));

    const { error } = await supabase
      .from("sobre_mi_textos")
      .upsert({ clave, valor: String(nuevoValor), updated_at: new Date().toISOString() }, { onConflict: "clave" });

    if (error) {
      // Revertir si falla
      setVisibilidad((prev) => ({ ...prev, [clave]: !nuevoValor }));
      toast.error("Error al cambiar la visibilidad.");
    }
  }, [visibilidad, toast]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const socialVisible = (key: string) => visibilidad[`social_${key}_visible`] ?? true;
  const descargaVisible = (key: string) => visibilidad[`descarga_${key}_visible`] ?? true;

  // Sociales visibles para el público
  const socialesPublicos = SOCIALES_DEF.filter((s) => isAdmin || socialVisible(s.key));
  const descargasPublicas = DESCARGAS_DEF.filter((d) => isAdmin || descargaVisible(d.key));

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--primary)", opacity: 0.3 }} />
      </div>
    );
  }

  return (
    <MotionMain
      animate={{ opacity: 1, y: 0 }}
      className="min-h-svh bg-bg-main"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full bg-bg-main min-h-screen selection:bg-primary/10">
        <main className="max-w-7xl mx-auto px-8 md:px-16 pb-40 pt-16 md:pt-24">

          {/* ── HERO ── */}
          <section className="mb-24 md:mb-32">
            <div className="flex flex-col md:flex-row md:gap-16 md:items-center">

              <div className="flex-1 min-w-0">
                <header className="mb-10 flex flex-col items-center text-center">
                  <div className="overflow-visible">
                    <MotionH1
                      animate={{ y: 0 }}
                      className="font-black italic uppercase leading-[0.9]"
                      initial={{ y: "110%" }}
                      style={{ color: "var(--primary)", fontSize: "clamp(2.8rem, 7vw, 6rem)", letterSpacing: "-0.02em" }}
                      transition={{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] as any }}
                    >
                      Sobre Mí
                    </MotionH1>
                  </div>
                </header>

                <MotionSection
                  {...fade(0.18)}
                  className="relative flex flex-col items-start text-left py-10 px-8 overflow-hidden"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 5%, var(--white-custom))",
                    borderRadius: "var(--radius-card)",
                    border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <BloqueEditable
                    clave="hero"
                    valor={textos.hero}
                    isAdmin={isAdmin}
                    onSave={guardarTexto}
                    className="text-xl md:text-2xl leading-[1.5] font-light italic"
                    style={{ color: "var(--primary)", opacity: 0.88 }}
                  />
                </MotionSection>
              </div>

              <MotionSection {...fade(0.24)} className="mt-10 md:mt-0 md:w-[28%] shrink-0">
                <div
                  className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.4em] mb-6"
                  style={{ color: "var(--primary)", opacity: 0.3 }}
                >
                  Explorar
                </div>

                <div className="flex flex-col gap-4">
                  {[
                    { href: "/personal/galeria", title: "Galería", icon: <Palette size={18} strokeWidth={1.5} /> },
                    { href: "/personal/ensayos", title: "Ensayos", icon: <NotebookPen size={18} strokeWidth={1.5} /> },
                  ].map((item, i) => (
                    <MotionDiv key={item.href} {...fade(0.28 + i * 0.07)} transition={{ duration: 0.22 }} whileHover={{ x: 4 }}>
                      <Link
                        href={item.href}
                        className="group relative flex items-center justify-center gap-3 p-5 overflow-hidden no-underline"
                        style={{
                          background: "var(--white-custom)",
                          borderRadius: "var(--radius-card)",
                          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        <div className="relative z-10 flex items-center gap-3" style={{ color: "var(--primary)" }}>
                          <span className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ opacity: 0.65 }}>
                            {item.icon}
                          </span>
                          <h4 className="font-black text-l leading-snug" style={{ letterSpacing: "-0.02em" }}>{item.title}</h4>
                        </div>
                        <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                      </Link>
                    </MotionDiv>
                  ))}
                </div>
              </MotionSection>

            </div>
          </section>

          {/* ── DIVIDER ── */}
          <MotionDiv {...fade(0.28)} className="flex items-center gap-5 mb-24 md:mb-32">
            <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
            <span className="text-xl font-black" style={{ color: "var(--primary)", opacity: 0.15 }}>⚝</span>
            <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
          </MotionDiv>

          {/* ── GARDEN OF SINS ── */}
          <MotionSection {...fade(0.3)} className="mb-24 md:mb-32">
            <div className="flex flex-col md:flex-row md:gap-16 md:items-center">

              <div className="shrink-0 mb-10 md:mb-0 text-center md:text-left">
                <h2
                  className="font-black italic uppercase leading-[0.9]"
                  style={{ color: "var(--primary)", fontSize: "clamp(2.4rem, 5.5vw, 5rem)", letterSpacing: "-0.02em" }}
                >
                  Garden<br />of Sins
                </h2>
              </div>

              <div className="flex-1 min-w-0 flex items-center">
                <MotionDiv
                  className="relative pl-8 py-6 pr-6 w-full"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                    borderRadius: "var(--radius-card)",
                    borderLeft: "3px solid color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                  transition={{ duration: 0.22 }}
                  whileHover={{ x: 4 }}
                >
                  <span
                    className="absolute top-3 left-5 text-5xl font-black leading-none select-none"
                    style={{ color: "var(--primary)", opacity: 0.08, fontFamily: "serif" }}
                  >&quot;</span>
                  <BloqueEditable
                    clave="garden_of_sins"
                    valor={textos.garden_of_sins}
                    isAdmin={isAdmin}
                    onSave={guardarTexto}
                    className="relative text-base md:text-lg font-light italic leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--primary)", opacity: 0.7 }}
                  />
                </MotionDiv>
              </div>

            </div>
          </MotionSection>

          {/* ── REDES SOCIALES + DESCARGAS ── */}
          <MotionSection {...fade(0.36)} className="flex flex-col md:flex-row md:gap-12 md:items-start gap-10">

            {/* Redes Sociales */}
            <div className="flex flex-col items-center text-center space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.4em]"
                  style={{ color: "var(--primary)", opacity: 0.3 }}
                >
                  Redes Sociales
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-4">
                {SOCIALES_DEF.map((social, i) => {
                  const visible = socialVisible(social.key);
                  // Si no es admin y está oculto, no renderizar
                  if (!isAdmin && !visible) return null;

                  return (
                    <div key={social.key} className="relative">
                      {isAdmin && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <VisibilityToggle
                            visible={visible}
                            onToggle={() => toggleVisibilidad(`social_${social.key}_visible`)}
                            label={social.label}
                          />
                        </div>
                      )}
                      <MotionA
                        href={social.href}
                        rel="noopener noreferrer"
                        target="_blank"
                        {...fade(0.38 + i * 0.06)}
                        className="group relative flex flex-col items-center gap-3 p-6 overflow-hidden cursor-pointer no-underline"
                        style={{
                          background: "var(--white-custom)",
                          borderRadius: "var(--radius-card)",
                          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${!visible && isAdmin ? "6%" : "10%"}, transparent)`,
                          boxShadow: "var(--shadow-card)",
                          opacity: !visible && isAdmin ? 0.4 : 1,
                          transition: "opacity 0.2s ease",
                        }}
                        transition={{ duration: 0.22 }}
                        whileHover={{ y: -4 }}
                      >
                        <div
                          className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                          style={{ borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}
                        >
                          {social.icon}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black text-sm leading-snug" style={{ color: "var(--primary)", letterSpacing: "-0.01em" }}>{social.label}</p>
                          <p className="text-micro font-medium" style={{ color: "var(--primary)", opacity: 0.35 }}>{social.handle}</p>
                        </div>
                        <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                      </MotionA>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Descargas */}
            <div className="flex flex-col items-center text-center space-y-6 md:w-52 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.4em]"
                  style={{ color: "var(--primary)", opacity: 0.3 }}
                >
                  Descargas
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                {DESCARGAS_DEF.map((descarga, i) => {
                  const visible = descargaVisible(descarga.key);
                  if (!isAdmin && !visible) return null;

                  return (
                    <div key={descarga.key} className="relative">
                      {isAdmin && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <VisibilityToggle
                            visible={visible}
                            onToggle={() => toggleVisibilidad(`descarga_${descarga.key}_visible`)}
                            label={descarga.label}
                          />
                        </div>
                      )}
                      <div style={{ opacity: !visible && isAdmin ? 0.4 : 1, transition: "opacity 0.2s ease" }}>
                        <DownloadButton
                          icon={descarga.icon}
                          label={descarga.label}
                          platforms={descarga.platforms}
                          delay={0.46 + i * 0.04}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </MotionSection>

        </main>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </MotionMain>
  );
}
