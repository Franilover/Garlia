"use client";
import React, { useState } from "react";
import { Palette, Heart, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SobreMi() {
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const FORMSPREE_ID = "xvzpjdgr";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST", body: data, headers: { "Accept": "application/json" }
      });
      if (response.ok) { setEnviado(true); form.reset(); }
      else alert("Hubo un error al enviar el mensaje.");
    } catch { alert("Error de conexión."); }
    finally { setLoading(false); }
  };

  const sectionTag = "text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 mb-8 opacity-40 text-primary";

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <main className="max-w-4xl mx-auto px-6 pb-32 pt-24 md:pt-40 font-sans">

        {/* CABECERA */}
        <header className="mb-24">
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none"
          >
            Sobre Mi
          </motion.h1>
          <div className="h-1.5 w-20 bg-primary mt-8 opacity-20 rounded-full" />
        </header>

        <div className="space-y-24">

          {/* SECCIÓN 1: MI ATELIER */}
          <section>
            <div className="card-main !bg-white-custom p-8 md:p-16">
              <h3 className={sectionTag}>
                <Heart size={14} /> Mi Atelier
              </h3>
              <p className="text-2xl md:text-3xl leading-snug font-light italic">
                Bienvenido a mi pequeño jardín digital. Este refleja temas que considero importantes a través de personajes basados en quienes han dejado una marca en mí.
              </p>
            </div>
          </section>

          {/* SECCIÓN 2: HERRAMIENTAS */}
          <section className="space-y-10">
            <h3 className={sectionTag}>
              <Palette size={14} /> Herramientas
            </h3>

            {/* Grid unificado — sin gap, bordes internos */}
            <div className="grid grid-cols-1 md:grid-cols-3 border border-primary/10 rounded-[2rem] overflow-hidden bg-white-custom shadow-sm">

              {/* ── Tarjeta 1: Digital ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="relative group flex flex-col justify-between p-10 border-b md:border-b-0 md:border-r border-primary/10 overflow-hidden cursor-default"
              >
                {/* Número decorativo de fondo */}
                <span className="absolute -top-3 -right-1 text-[7rem] font-black text-primary/[0.04] select-none leading-none pointer-events-none">
                  01
                </span>
                {/* Glow hover */}
                <div className="absolute inset-0 bg-primary/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div className="relative z-10 flex flex-col gap-8">
                  {/* Ícono */}
                  <div className="w-12 h-12 rounded-xl border border-primary/15 bg-bg-main flex items-center justify-center group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/60">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-black text-[9px] uppercase tracking-[0.35em] text-primary/30">Digital</p>
                    <h4 className="font-black text-xl leading-tight tracking-tight text-primary">Linux<br/>& Krita</h4>
                  </div>

                  <p className="text-[11px] leading-relaxed text-primary/40 font-medium">
                    Ilustración vectorial y rasterizada. Control total del entorno creativo.
                  </p>
                </div>

                {/* Línea inferior animada en hover */}
                <div className="relative z-10 mt-8 h-px bg-primary/10 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-primary/30 transition-all duration-700 ease-out" />
                </div>
              </motion.div>

              {/* ── Tarjeta 2: Análogo (destacada con fondo primary) ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="relative group flex flex-col justify-between p-10 border-b md:border-b-0 md:border-r border-primary/20 overflow-hidden cursor-default bg-primary"
              >
                <span className="absolute -top-3 -right-1 text-[7rem] font-black text-white/[0.06] select-none leading-none pointer-events-none">
                  02
                </span>
                <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div className="relative z-10 flex flex-col gap-8">
                  <div className="w-12 h-12 rounded-xl border border-white/20 bg-white/10 flex items-center justify-center group-hover:border-white/40 group-hover:scale-110 transition-all duration-300">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-black text-[9px] uppercase tracking-[0.35em]" style={{ color: "var(--btn-text)", opacity: 0.5 }}>
                      Análogo
                    </p>
                    <h4 className="font-black text-xl leading-tight tracking-tight" style={{ color: "var(--btn-text)" }}>
                      Acuarelas<br/>& Acrílico
                    </h4>
                  </div>

                  <p className="text-[11px] leading-relaxed font-medium" style={{ color: "var(--btn-text)", opacity: 0.5 }}>
                    Texturas orgánicas. El error como parte del proceso.
                  </p>
                </div>

                <div className="relative z-10 mt-8 h-px bg-white/10 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-white/30 transition-all duration-700 ease-out" />
                </div>
              </motion.div>

              {/* ── Tarjeta 3: Sonoro ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative group flex flex-col justify-between p-10 overflow-hidden cursor-default"
              >
                <span className="absolute -top-3 -right-1 text-[7rem] font-black text-primary/[0.04] select-none leading-none pointer-events-none">
                  03
                </span>
                <div className="absolute inset-0 bg-primary/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div className="relative z-10 flex flex-col gap-8">
                  {/* Barras de ecualizador animadas */}
                  <div className="w-12 h-12 rounded-xl border border-primary/15 bg-bg-main flex items-center justify-center group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300">
                    <div className="flex items-end gap-[3px]">
                      {[9, 15, 12, 18, 9].map((h, i) => (
                        <div
                          key={i}
                          className="w-[3px] bg-primary/40 rounded-full group-hover:bg-primary/70 transition-colors"
                          style={{
                            height: `${h}px`,
                            animation: `eq${i} 1.4s ease-in-out infinite`,
                            animationDelay: `${i * 0.18}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-black text-[9px] uppercase tracking-[0.35em] text-primary/30">Sonoro</p>
                    <h4 className="font-black text-xl leading-tight tracking-tight text-primary">Mucha<br/>Música</h4>
                  </div>

                  <p className="text-[11px] leading-relaxed text-primary/40 font-medium">
                    Cada proyecto nace de un estado de ánimo sonoro.
                  </p>
                </div>

                <div className="relative z-10 mt-8 h-px bg-primary/10 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-primary/30 transition-all duration-700 ease-out" />
                </div>
              </motion.div>

            </div>

            {/* Keyframes para barras de ecualizador */}
            <style>{`
              @keyframes eq0 { 0%,100%{height:9px}  50%{height:16px} }
              @keyframes eq1 { 0%,100%{height:15px} 50%{height:6px}  }
              @keyframes eq2 { 0%,100%{height:12px} 50%{height:18px} }
              @keyframes eq3 { 0%,100%{height:18px} 50%{height:8px}  }
              @keyframes eq4 { 0%,100%{height:9px}  50%{height:13px} }
            `}</style>
          </section>

          {/* SECCIÓN 3: GARDEN OF SINS */}
          <section className="space-y-8 border-t border-primary/10 pt-16">
            <h2 className="text-4xl md:text-6xl font-black italic text-primary uppercase tracking-tighter">Garden of Sins</h2>
            <div className="max-w-2xl space-y-6 text-lg md:text-xl leading-relaxed font-light opacity-90">
              <div className="p-8 bg-white-custom rounded-[2.5rem] border-l-8 border-primary shadow-sm italic font-medium">
                &quot;Cada flor de este jardín está basada en una experiencia o emoción que necesito quitarme de encima.&quot;
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}