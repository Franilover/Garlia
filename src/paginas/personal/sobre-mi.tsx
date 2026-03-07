"use client";
import React, { useState } from "react";
import { Palette, Heart } from "lucide-react";
import { motion } from "framer-motion";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] as any },
});

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

  const sectionTag = "text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2";

  return (
    <div className="w-full bg-bg-main min-h-screen text-foreground selection:bg-primary/10">
      <main className="max-w-3xl mx-auto px-6 pb-40 pt-24 md:pt-44">

        {/* ── CABECERA ── */}
        <header className="mb-28">
          <motion.p {...fade(0)} className={sectionTag} style={{ color: "var(--primary)", opacity: 0.3 }}>
            Jardín digital
          </motion.p>

          <motion.h1
            {...fade(0.08)}
            className="text-[clamp(3.5rem,12vw,7rem)] font-black italic tracking-tighter uppercase leading-[0.88] mt-6"
            style={{ color: "var(--primary)" }}
          >
            Sobre<br />Mí
          </motion.h1>

          {/* Línea animada al cargar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] as any }}
            className="mt-10 h-px w-24 origin-left"
            style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
          />
        </header>

        <div className="space-y-28">

          {/* ── § 1: MI ATELIER ── */}
          <motion.section {...fade(0.15)}>
            <p className={sectionTag} style={{ color: "var(--primary)", opacity: 0.3, marginBottom: "2rem" }}>
              <Heart size={11} /> Mi Atelier
            </p>
            <p
              className="text-2xl md:text-3xl leading-[1.45] font-light italic"
              style={{ color: "var(--primary)", opacity: 0.8 }}
            >
              Bienvenido a mi pequeño jardín digital. Refleja temas que considero importantes
              a través de personajes basados en quienes han dejado una marca en mí.
            </p>
          </motion.section>

          {/* ── § 2: HERRAMIENTAS ── */}
          <motion.section {...fade(0.2)}>
            <p className={sectionTag} style={{ color: "var(--primary)", opacity: 0.3, marginBottom: "2rem" }}>
              <Palette size={11} /> Herramientas
            </p>

            <div
              className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
              style={{
                borderRadius: "var(--radius-card)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              {/* — Digital — */}
              <Tool
                label="Digital"
                title="Linux & Krita"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                  </svg>
                }
                borderRight
              />

              {/* — Análogo (invertida) — */}
              <ToolInverted
                label="Análogo"
                title={"Acuarelas\n& Acrílico"}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                }
                borderRight
              />

              {/* — Sonoro — */}
              <Tool
                label="Sonoro"
                title="Mucha Música"
                icon={<EqBars />}
              />
            </div>
          </motion.section>

          {/* ── § 3: GARDEN OF SINS ── */}
          <motion.section {...fade(0.25)} className="space-y-10">
            {/* Divisor con número romano */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
              <span
                className="text-[8px] font-black uppercase tracking-[0.5em]"
                style={{ color: "var(--primary)", opacity: 0.18 }}
              >III</span>
              <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
            </div>

            <h2
              className="text-[clamp(2.5rem,8vw,5rem)] font-black italic uppercase tracking-tighter leading-[0.88]"
              style={{ color: "var(--primary)" }}
            >
              Garden<br />of Sins
            </h2>

            {/* Cita — borde lateral liviano, sin card pesada */}
            <motion.blockquote
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
              className="pl-5 py-1"
              style={{ borderLeft: "2px solid color-mix(in srgb, var(--primary) 28%, transparent)" }}
            >
              <p
                className="text-lg md:text-xl font-light italic leading-relaxed"
                style={{ color: "var(--primary)", opacity: 0.65 }}
              >
                "Cada flor de este jardín está basada en una experiencia o emoción
                que necesito quitarme de encima."
              </p>
            </motion.blockquote>
          </motion.section>

        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTES
───────────────────────────────────────────── */

function Tool({
  label, title, icon, borderRight = false,
}: {
  label: string;
  title: string;
  icon: React.ReactNode;
  borderRight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ backgroundColor: "color-mix(in srgb, var(--primary) 5%, var(--white-custom))" } as any}
      className="group flex flex-col gap-6 p-8 transition-colors duration-300"
      style={{
        background: "var(--white-custom)",
        borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
        ...(borderRight ? { borderRight: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)" } : {}),
      }}
    >
      {/* Ícono */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{
          background: "color-mix(in srgb, var(--primary) 7%, transparent)",
          color: "var(--primary)",
          opacity: 1,
        }}
      >
        <span style={{ opacity: 0.55 }}>{icon}</span>
      </div>

      {/* Texto */}
      <div>
        <p
          className="text-[8px] font-black uppercase tracking-[0.35em] mb-1.5"
          style={{ color: "var(--primary)", opacity: 0.28 }}
        >{label}</p>
        <h4
          className="font-black text-sm tracking-tight leading-snug whitespace-pre-line"
          style={{ color: "var(--primary)" }}
        >{title}</h4>
      </div>

      {/* Línea animada */}
      <div className="h-px w-full overflow-hidden mt-auto" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <div
          className="h-full w-0 group-hover:w-full transition-all duration-600 ease-out"
          style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
        />
      </div>
    </motion.div>
  );
}

function ToolInverted({
  label, title, icon, borderRight = false,
}: {
  label: string;
  title: string;
  icon: React.ReactNode;
  borderRight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ opacity: 0.9 } as any}
      className="group flex flex-col gap-6 p-8 transition-opacity duration-300"
      style={{
        background: "var(--primary)",
        ...(borderRight ? { borderRight: "var(--border-width) solid color-mix(in srgb, var(--btn-text) 10%, transparent)" } : {}),
        borderBottom: "var(--border-width) solid color-mix(in srgb, var(--btn-text) 10%, transparent)",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: "color-mix(in srgb, var(--btn-text) 10%, transparent)", color: "var(--btn-text)" }}
      >
        <span style={{ opacity: 0.65 }}>{icon}</span>
      </div>

      <div>
        <p
          className="text-[8px] font-black uppercase tracking-[0.35em] mb-1.5"
          style={{ color: "var(--btn-text)", opacity: 0.38 }}
        >{label}</p>
        <h4
          className="font-black text-sm tracking-tight leading-snug whitespace-pre-line"
          style={{ color: "var(--btn-text)" }}
        >{title}</h4>
      </div>

      <div
        className="h-px w-full mt-auto"
        style={{ background: "color-mix(in srgb, var(--btn-text) 12%, transparent)" }}
      />
    </motion.div>
  );
}

function EqBars() {
  return (
    <>
      <div className="flex items-end gap-[2.5px]" style={{ height: "14px" }}>
        {[5, 9, 7, 11, 6].map((h, i) => (
          <div
            key={i}
            className="w-[2.5px] rounded-full"
            style={{
              height: `${h}px`,
              background: "currentColor",
              animation: `_eq${i} ${1.2 + i * 0.1}s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes _eq0 { 0%,100%{height:5px}  50%{height:11px} }
        @keyframes _eq1 { 0%,100%{height:9px}  50%{height:4px}  }
        @keyframes _eq2 { 0%,100%{height:7px}  50%{height:13px} }
        @keyframes _eq3 { 0%,100%{height:11px} 50%{height:5px}  }
        @keyframes _eq4 { 0%,100%{height:6px}  50%{height:10px} }
      `}</style>
    </>
  );
}