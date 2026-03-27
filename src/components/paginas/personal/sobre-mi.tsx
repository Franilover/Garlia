"use client";
import React, { useState } from "react";
import { Palette, Heart, Monitor, Droplets, Music } from "lucide-react";
import { motion } from "framer-motion";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] as any },
});

const TOOLS = [
  { num: "01", label: "Digitales",  title: "Linux & Krita",       icon: Monitor },
  { num: "02", label: "Analogas",  title: "Acuarelas & Acrílico", icon: Droplets },
  { num: "03", label: "Extras",   title: "Mucha Música",         icon: Music },
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

        <header className="mb-24 md:mb-32">

          <motion.p
            {...fade(0)}
            className="text-[9px] font-black uppercase tracking-[0.45em] mb-8"
            style={{ color: "var(--primary)", opacity: 0.32 }}
          >
            — Jardín digital
          </motion.p>

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

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] as any }}
            className="mt-8 h-[2px] w-32 origin-left rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
          />
        </header>

        <div className="space-y-24 md:space-y-32">

          <motion.section
            {...fade(0.18)}
            className="relative flex flex-col items-center text-center py-16 md:py-20 px-8 md:px-16 overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, var(--white-custom))",
              borderRadius: "var(--radius-card)",
              border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
              className="mb-8 h-[1px] w-16 origin-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            />

            <div
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.5em] mb-6"
              style={{ color: "var(--primary)", opacity: 0.35 }}
            >
              <Heart size={10} strokeWidth={2.5} />
              Mi Atelier
              <Heart size={10} strokeWidth={2.5} />
            </div>

            <p
              className="text-2xl md:text-4xl leading-[1.4] font-light italic max-w-2xl"
              style={{ color: "var(--primary)", opacity: 0.88 }}
            >
              Bienvenido a mi pequeño jardín digital. Uso este espacio para compartir mis hobbys y
              proyectos: Mi mayor proyecto es "Garden of Sins" el cual puedes ver en el icono de la flor.
            </p>

            <div
              className="flex items-center gap-3 mt-10"
              style={{ color: "var(--primary)", opacity: 0.2 }}
            >
              <div className="h-px w-10" style={{ background: "currentColor" }} />
              <span className="text-[8px] font-black uppercase tracking-[0.5em]">2025</span>
              <div className="h-px w-10" style={{ background: "currentColor" }} />
            </div>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.65, ease: [0.16, 1, 0.3, 1] as any }}
              className="mt-8 h-[1px] w-16 origin-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            />

            <div
              className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            />
            <div
              className="absolute right-0 top-1/4 bottom-1/4 w-[3px] rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            />
          </motion.section>

          <motion.section {...fade(0.24)} className="flex flex-col items-center text-center">
            <div
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] mb-10"
              style={{ color: "var(--primary)", opacity: 0.3 }}
            >
              <Palette size={11} strokeWidth={2.5} /> Herramientas
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.num}
                    {...fade(0.28 + i * 0.07)}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="group relative flex items-center gap-4 p-6 overflow-hidden cursor-default"
                    style={{
                      background: "var(--white-custom)",
                      borderRadius: "var(--radius-card)",
                      border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      <Icon size={17} strokeWidth={1.5} style={{ opacity: 0.6 }} />
                    </div>

                    <div className="relative z-10 space-y-0.5 text-left">
                      <p
                        className="text-[8px] font-black uppercase tracking-[0.35em]"
                        style={{ color: "var(--primary)", opacity: 0.28 }}
                      >{tool.label}</p>
                      <h4
                        className="font-black text-base leading-snug"
                        style={{ color: "var(--primary)", letterSpacing: "-0.02em" }}
                      >{tool.title}</h4>
                    </div>

                    <div
                      className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
                      style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    />
                  </motion.div>
                );
              })}
            </div>

          </motion.section>

          <motion.section {...fade(0.3)} className="space-y-12 flex flex-col items-center text-center">

            <div className="flex items-center gap-5 w-full">
              <div
                className="h-px flex-1"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              />
              <span
                className="text-[8px] font-black uppercase tracking-[0.5em]"
                style={{ color: "var(--primary)", opacity: 0.15 }}
              >⚘</span>
              <div
                className="h-px flex-1"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              />
            </div>

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

            <motion.div
              whileHover={{ x: 6 }}
              transition={{ duration: 0.22 }}
              className="relative pl-8 py-6 pr-6 w-full max-w-2xl"
              style={{
                background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                borderRadius: "var(--radius-card)",
                borderLeft: "3px solid color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              <span
                className="absolute top-3 left-5 text-5xl font-black leading-none select-none"
                style={{ color: "var(--primary)", opacity: 0.08, fontFamily: "serif" }}
              >"</span>
              <p
                className="relative text-lg md:text-xl font-light italic leading-relaxed"
                style={{ color: "var(--primary)", opacity: 0.7 }}
              >
                Este proyecto comenzo como una forma de compartir experiencias que no era capas de expresar verbalmente
                y a la vez explorar nuevas formas de arte. 
                Luego se convirtio en algo mas grande. Ya no era solo mi historia, era un mundo entero que necesitaba 
                sacar de mi mente. <br /> Los personajes de este mundo surgieron en base a personas que han dejado una marca
                en mi. Y pese a que los temas de esta historia son recurrentes en la actualidad, y muchos aconteciemtos
                estan basados en ciertos periodos historicos todo lo contado en estas historias es ficticio.  
              </p>
            </motion.div>

          </motion.section>

        </div>
      </main>
    </div>
  );
}