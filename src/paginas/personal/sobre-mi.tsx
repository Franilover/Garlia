"use client";
import React, { useState } from "react";
import { Palette, Heart, Monitor, Droplets, Music } from "lucide-react";
import { motion } from "framer-motion";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] as any },
});

/* ─── Datos de herramientas ─── */
const TOOLS = [
  {
    num: "01",
    label: "Digital",
    title: "Linux & Krita",
    icon: Monitor,
    desc: "Ilustración vectorial y rasterizada",
  },
  {
    num: "02",
    label: "Análogo",
    title: "Acuarelas & Acrílico",
    icon: Droplets,
    desc: "Textura orgánica, el error como proceso",
  },
  {
    num: "03",
    label: "Sonoro",
    title: "Mucha Música",
    icon: Music,
    desc: "Cada pieza nace de un estado de ánimo",
  },
];

export default function SobreMi() {
  const FORMSPREE_ID = "xvzpjdgr";
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST", body: data, headers: { Accept: "application/json" },
      });
      if (res.ok) { setEnviado(true); form.reset(); }
      else alert("Hubo un error al enviar el mensaje.");
    } catch { alert("Error de conexión."); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full bg-bg-main min-h-screen selection:bg-primary/10">
      <main className="max-w-4xl mx-auto px-6 pb-40 pt-20 md:pt-36">

        {/* ══════════════════════════════
            CABECERA
        ══════════════════════════════ */}
        <header className="mb-24 md:mb-32">

          <motion.p
            {...fade(0)}
            className="text-[9px] font-black uppercase tracking-[0.45em] mb-8"
            style={{ color: "var(--primary)", opacity: 0.32 }}
          >
            — Jardín digital
          </motion.p>

          {/* Título en una sola línea, nunca se corta */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] as any }}
              className="font-black italic uppercase leading-[0.85] whitespace-nowrap"
              style={{
                color: "var(--primary)",
                fontSize: "clamp(3rem, 10.5vw, 8rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Sobre Mí
            </motion.h1>
          </div>

          {/* Línea que crece desde la izquierda */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] as any }}
            className="mt-8 h-[2px] w-32 origin-left rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
          />
        </header>

        <div className="space-y-24 md:space-y-32">

          {/* ══════════════════════════════
              § 1 · MI ATELIER
          ══════════════════════════════ */}
          <motion.section {...fade(0.18)} className="grid md:grid-cols-[1fr_2fr] gap-12 md:gap-16 items-start">

            {/* Columna izquierda — etiqueta + ornamento */}
            <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-6 md:pt-2">
              <div
                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em]"
                style={{ color: "var(--primary)", opacity: 0.3 }}
              >
                <Heart size={11} strokeWidth={2.5} /> Mi Atelier
              </div>
              {/* Número decorativo solo en desktop */}
              <span
                className="hidden md:block text-[5rem] font-black leading-none select-none"
                style={{ color: "var(--primary)", opacity: 0.05, letterSpacing: "-0.05em" }}
              >I</span>
            </div>

            {/* Columna derecha — texto */}
            <div className="space-y-6">
              <p
                className="text-2xl md:text-3xl leading-[1.45] font-light italic"
                style={{ color: "var(--primary)", opacity: 0.85 }}
              >
                Bienvenido a mi pequeño jardín digital. Refleja temas que considero
                importantes a través de personajes basados en quienes han dejado
                una marca en mí.
              </p>
              {/* Detalle decorativo */}
              <div
                className="flex items-center gap-3 pt-2"
                style={{ color: "var(--primary)", opacity: 0.2 }}
              >
                <div className="h-px w-8" style={{ background: "currentColor" }} />
                <span className="text-[8px] font-black uppercase tracking-[0.4em]">2024</span>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════
              § 2 · HERRAMIENTAS
          ══════════════════════════════ */}
          <motion.section {...fade(0.24)}>
            <div
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] mb-10"
              style={{ color: "var(--primary)", opacity: 0.3 }}
            >
              <Palette size={11} strokeWidth={2.5} /> Herramientas
            </div>

            {/* Grid de cards — sin color invertido, totalmente adaptable */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.num}
                    {...fade(0.28 + i * 0.07)}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="group relative flex flex-col gap-5 p-7 overflow-hidden cursor-default"
                    style={{
                      background: "var(--white-custom)",
                      borderRadius: "var(--radius-card)",
                      border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    {/* Número enorme de fondo */}
                    <span
                      className="absolute -bottom-4 -right-2 text-[6rem] font-black leading-none select-none pointer-events-none transition-opacity duration-300 group-hover:opacity-100"
                      style={{ color: "var(--primary)", opacity: 0.04, letterSpacing: "-0.05em" }}
                    >
                      {tool.num}
                    </span>

                    {/* Ícono con fondo sutil */}
                    <div
                      className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      <Icon size={17} strokeWidth={1.5} style={{ opacity: 0.6 }} />
                    </div>

                    {/* Textos */}
                    <div className="relative z-10 space-y-1">
                      <p
                        className="text-[8px] font-black uppercase tracking-[0.35em]"
                        style={{ color: "var(--primary)", opacity: 0.28 }}
                      >{tool.label}</p>
                      <h4
                        className="font-black text-base leading-snug"
                        style={{ color: "var(--primary)", letterSpacing: "-0.02em" }}
                      >{tool.title}</h4>
                      <p
                        className="text-[11px] leading-relaxed pt-1"
                        style={{ color: "var(--primary)", opacity: 0.4 }}
                      >{tool.desc}</p>
                    </div>

                    {/* Acento de color en el borde inferior al hover */}
                    <div
                      className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
                      style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    />

                    {/* Barras de ecualizador solo en la tarjeta de música */}
                    {tool.num === "03" && (
                      <div className="absolute top-7 right-7 flex items-end gap-[3px] opacity-20 group-hover:opacity-40 transition-opacity">
                        {[5, 9, 7, 11, 6].map((h, j) => (
                          <div
                            key={j}
                            className="w-[2.5px] rounded-full"
                            style={{
                              height: `${h}px`,
                              background: "var(--primary)",
                              animation: `_eq${j} ${1.2 + j * 0.1}s ease-in-out infinite`,
                              animationDelay: `${j * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <style>{`
              @keyframes _eq0 { 0%,100%{height:5px}  50%{height:11px} }
              @keyframes _eq1 { 0%,100%{height:9px}  50%{height:4px}  }
              @keyframes _eq2 { 0%,100%{height:7px}  50%{height:13px} }
              @keyframes _eq3 { 0%,100%{height:11px} 50%{height:5px}  }
              @keyframes _eq4 { 0%,100%{height:6px}  50%{height:10px} }
            `}</style>
          </motion.section>

          {/* ══════════════════════════════
              § 3 · GARDEN OF SINS
          ══════════════════════════════ */}
          <motion.section {...fade(0.3)} className="space-y-12">

            {/* Divisor */}
            <div className="flex items-center gap-5">
              <div
                className="h-px flex-1"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              />
              <span
                className="text-[8px] font-black uppercase tracking-[0.5em]"
                style={{ color: "var(--primary)", opacity: 0.15 }}
              >✦</span>
              <div
                className="h-px flex-1"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              />
            </div>

            {/* Título grande — en dos líneas controladas */}
            <div className="space-y-0">
              <p
                className="text-[9px] font-black uppercase tracking-[0.4em] mb-5"
                style={{ color: "var(--primary)", opacity: 0.28 }}
              >— Proyecto principal</p>
              <h2
                className="font-black italic uppercase leading-[0.88]"
                style={{
                  color: "var(--primary)",
                  fontSize: "clamp(2.8rem, 9vw, 6.5rem)",
                  letterSpacing: "-0.03em",
                }}
              >
                Garden<br />of Sins
              </h2>
            </div>

            {/* Cita con card suave — más presencia que solo un borde */}
            <motion.div
              whileHover={{ x: 6 }}
              transition={{ duration: 0.22 }}
              className="relative pl-8 py-6 pr-6"
              style={{
                background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                borderRadius: "var(--radius-card)",
                borderLeft: "3px solid color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              {/* Comilla decorativa */}
              <span
                className="absolute top-3 left-5 text-5xl font-black leading-none select-none"
                style={{ color: "var(--primary)", opacity: 0.08, fontFamily: "serif" }}
              >"</span>
              <p
                className="relative text-lg md:text-xl font-light italic leading-relaxed"
                style={{ color: "var(--primary)", opacity: 0.7 }}
              >
                Cada flor de este jardín está basada en una experiencia
                o emoción que necesito quitarme de encima.
              </p>
            </motion.div>

          </motion.section>

        </div>
      </main>
    </div>
  );
}