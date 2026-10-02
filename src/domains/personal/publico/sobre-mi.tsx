"use client";

import { Instagram, Youtube, Palette, NotebookPen, Download, Gamepad2, X, Smartphone, Monitor, Terminal } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";

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
  /** URL de descarga directa. null = no disponible aún → muestra "Pronto" */
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
        boxShadow: "0 20px 60px color-mix(in srgb, var(--primary) 18%, transparent), 0 4px 16px color-mix(in srgb, var(--primary) 8%, transparent)",
        padding: "1.5rem",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p
            className="font-black text-base leading-snug"
            style={{ color: "var(--primary)", letterSpacing: "-0.02em" }}
          >
            {title}
          </p>
          <p
            className="text-xs font-medium mt-0.5"
            style={{ color: "var(--primary)", opacity: 0.45 }}
          >
            {description}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 hover:opacity-60 ml-3 shrink-0"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
          }}
          aria-label="Cerrar"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Opciones de plataforma */}
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
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--primary) 12%, transparent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--primary) 6%, transparent)";
              }}
            >
              <span style={{ opacity: 0.7 }}>{p.icon}</span>
              <span className="font-black text-sm" style={{ letterSpacing: "-0.01em" }}>
                {p.label}
              </span>
              {p.tag && (
                <span
                  className="ml-auto text-micro font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    opacity: 0.7,
                  }}
                >
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
              <span className="font-black text-sm" style={{ letterSpacing: "-0.01em" }}>
                {p.label}
              </span>
              <span
                className="ml-auto text-micro font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
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
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  platforms: PlatformOption[];
  delay?: number;
};

function DownloadButton({ label, sublabel, icon, platforms, delay = 0 }: DownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <MotionDiv
      {...fade(delay)}
      className="relative flex-1"
      style={{ minWidth: 0 }}
    >
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="group w-full flex flex-col items-center gap-3 p-6 overflow-hidden cursor-pointer"
        style={{
          background: "var(--white-custom)",
          borderRadius: "var(--radius-card)",
          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${open ? "22%" : "10%"}, transparent)`,
          boxShadow: open
            ? "0 8px 32px color-mix(in srgb, var(--primary) 14%, transparent)"
            : "var(--shadow-card)",
          transition: "all 0.22s ease",
          outline: "none",
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div
          className="w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
          }}
        >
          {icon}
        </div>

        <div className="space-y-0.5">
          <p
            className="font-black text-sm leading-snug"
            style={{ color: "var(--primary)", letterSpacing: "-0.01em" }}
          >
            {label}
          </p>
          <p
            className="text-micro font-medium"
            style={{ color: "var(--primary)", opacity: 0.35 }}
          >
            {sublabel}
          </p>
        </div>

        <div
          className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 ease-out rounded-full ${open ? "w-full" : "w-0 group-hover:w-full"}`}
          style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        />
      </button>

      {open && (
        <DownloadPanel
          title={label}
          description={sublabel}
          platforms={platforms}
          onClose={() => setOpen(false)}
          anchorRef={btnRef}
        />
      )}
    </MotionDiv>
  );
}

// ── DATOS DE DESCARGA ─────────────────────────────────────────────────────────
// Para activar una plataforma: cambia null por la URL del Release asset.
// Para desactivarla: pon null → aparece automáticamente como "Pronto".

const WEBAPP_PLATFORMS: PlatformOption[] = [
  {
    label: "Android",
    icon: <Smartphone size={16} strokeWidth={1.5} />,
    // Publicado por el workflow release.yml del repo web (franiloverart/garlia-web o similar)
    // Una vez que corra el primer Action, la URL será siempre esta:
    url: null, // → "https://github.com/Franilover/TU_REPO_WEB/releases/latest/download/app.apk"
    tag: "APK",
  },
  {
    label: "Windows",
    icon: <Monitor size={16} strokeWidth={1.5} />,
    url: null,
  },
  {
    label: "Linux",
    icon: <Terminal size={16} strokeWidth={1.5} />,
    url: null,
  },
];

const JUEGO_PLATFORMS: PlatformOption[] = [
  {
    label: "Android",
    icon: <Smartphone size={16} strokeWidth={1.5} />,
    // Necesita preset Android en export_presets.cfg del repo Franilover/Game
    url: null, // → "https://github.com/Franilover/Game/releases/latest/download/Garlia.apk"
    tag: "APK",
  },
  {
    label: "Windows",
    icon: <Monitor size={16} strokeWidth={1.5} />,
    // Activar después del primer `git tag v0.1 && git push --tags` en Franilover/Game
    url: null, // → "https://github.com/Franilover/Game/releases/latest/download/Garlia.exe"
  },
  {
    label: "Linux",
    icon: <Terminal size={16} strokeWidth={1.5} />,
    url: null, // → "https://github.com/Franilover/Game/releases/latest/download/Garlia.x86_64"
  },
];

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export default function SobreMi() {
  const FORMSPREE_ID = "xvzpjdgr";
  const [_enviado, setEnviado] = useState(false);
  const [_loading, setLoading] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const _handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST", body: data, headers: { Accept: "application/json" },
      });
      if (res.ok) { setEnviado(true); form.reset(); }
      else toast.error("Hubo un error al enviar el mensaje.");
    } catch { toast.error("Error de conexión."); }
    finally { setLoading(false); }
  };

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
                    style={{
                      color: "var(--primary)",
                      fontSize: "clamp(2.8rem, 7vw, 6rem)",
                      letterSpacing: "-0.02em",
                    }}
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
                <p
                  className="text-xl md:text-2xl leading-[1.5] font-light italic"
                  style={{ color: "var(--primary)", opacity: 0.88 }}
                >
                  Bienvenido a mi pequeño jardín digital. Uso este espacio para compartir mis hobbys y
                  proyectos: Mi mayor proyecto es &quot;Garden of Sins&quot; el cual puedes ver en el icono de la flor.
                </p>
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
                  {
                    href: "/personal/galeria",
                    title: "Galería",
                    icon: <Palette size={18} strokeWidth={1.5} />,
                  },
                  {
                    href: "/personal/ensayos",
                    title: "Ensayos",
                    icon: <NotebookPen size={18} strokeWidth={1.5} />,
                  },
                ].map((item, i) => (
                  <MotionDiv
                    key={item.href}
                    {...fade(0.28 + i * 0.07)}
                    transition={{ duration: 0.22 }}
                    whileHover={{ x: 4 }}
                  >
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
                      <div
                        className="relative z-10 flex items-center gap-3"
                        style={{ color: "var(--primary)" }}
                      >
                        <span
                          className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                          style={{ opacity: 0.65 }}
                        >
                          {item.icon}
                        </span>
                        <h4
                          className="font-black text-l leading-snug"
                          style={{ letterSpacing: "-0.02em" }}
                        >{item.title}</h4>
                      </div>

                      <div
                        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
                        style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                      />
                    </Link>
                  </MotionDiv>
                ))}
              </div>
            </MotionSection>

          </div>
        </section>

        {/* ── DIVIDER ── */}
        <MotionDiv
          {...fade(0.28)}
          className="flex items-center gap-5 mb-24 md:mb-32"
        >
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
                style={{
                  color: "var(--primary)",
                  fontSize: "clamp(2.4rem, 5.5vw, 5rem)",
                  letterSpacing: "-0.02em",
                }}
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
                <p
                  className="relative text-base md:text-lg font-light italic leading-relaxed"
                  style={{ color: "var(--primary)", opacity: 0.7 }}
                >
                  Este proyecto comenzo como una forma de compartir experiencias que no era capas de expresar verbalmente
                  y a la vez explorar nuevas formas de arte.
                  Luego se convirtio en algo mas grande. Ya no era solo mi historia, era un mundo entero que necesitaba
                  sacar de mi mente. <br /><br /> Los personajes de este mundo surgieron en base a personas que han dejado una marca
                  en mi. Y pese a que los temas de esta historia son recurrentes en la actualidad, y muchos aconteciemtos
                  estan basados en ciertos periodos historicos todo lo contado en estas historias es ficticio.
                </p>
              </MotionDiv>
            </div>

          </div>
        </MotionSection>

        {/* ── REDES SOCIALES ── */}
        <MotionSection {...fade(0.36)} className="flex flex-col items-center text-center space-y-10">
          <div
            className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.4em]"
            style={{ color: "var(--primary)", opacity: 0.3 }}
          >
            Redes Sociales (Desactivadas)
          </div>

          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Dibujos",
                handle: "@franiloverart",
                href: "https://www.instagram.com/franiloverart/",
                icon: <Instagram size={20} strokeWidth={1.5} style={{ opacity: 0.65 }} />,
              },
              {
                label: "Fotos",
                handle: "@franilover",
                href: "https://www.instagram.com/franilover/",
                icon: <Instagram size={20} strokeWidth={1.5} style={{ opacity: 0.65 }} />,
              },
              {
                label: "YouTube",
                handle: "@franilover",
                href: "https://youtube.com/@franilover",
                icon: <Youtube size={20} strokeWidth={1.5} style={{ opacity: 0.65 }} />,
              },
              {
                label: "TikTok",
                handle: "@franilover",
                href: "https://tiktok.com/@franilover",
                icon: (
                  <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" style={{ opacity: 0.65 }} viewBox="0 0 24 24" width="20">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                ),
              },
            ].map((social, i) => (
              <MotionA
                key={social.label}
                href={social.href}
                rel="noopener noreferrer"
                target="_blank"
                {...fade(0.38 + i * 0.06)}
                className="group relative flex flex-col items-center gap-3 p-6 overflow-hidden cursor-pointer no-underline"
                style={{
                  background: "var(--white-custom)",
                  borderRadius: "var(--radius-card)",
                  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  boxShadow: "var(--shadow-card)",
                }}
                transition={{ duration: 0.22 }}
                whileHover={{ y: -4 }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {social.icon}
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-sm leading-snug" style={{ color: "var(--primary)", letterSpacing: "-0.01em" }}>{social.label}</p>
                  <p className="text-micro font-medium" style={{ color: "var(--primary)", opacity: 0.35 }}>{social.handle}</p>
                </div>
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
                  style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                />
              </MotionA>
            ))}
          </div>
        </MotionSection>

        {/* ── DESCARGAS ── */}
        <MotionSection {...fade(0.44)} className="mt-16 flex flex-col items-center space-y-6">
          <div
            className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.4em]"
            style={{ color: "var(--primary)", opacity: 0.3 }}
          >
            Descargas
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-4">
            <DownloadButton
              label="WebApp"
              sublabel="Agenda · Notas · Mundo"
              icon={<Download size={20} strokeWidth={1.5} />}
              platforms={WEBAPP_PLATFORMS}
              delay={0.46}
            />
            <DownloadButton
              label="El Juego"
              sublabel="Garden of Sins"
              icon={<Gamepad2 size={20} strokeWidth={1.5} />}
              platforms={JUEGO_PLATFORMS}
              delay={0.5}
            />
          </div>
        </MotionSection>

      </main>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
    </MotionMain>
  );
}
