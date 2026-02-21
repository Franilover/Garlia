"use client";
import React, { useState } from "react";
import { Palette, Heart, Sparkles, Send, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SobreMi() {
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const FORMSPREE_ID = "xvzpjdgr"; 

  // Añadimos el tipo React.FormEvent para el formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const form = e.currentTarget; // currentTarget es más seguro para TS
    const data = new FormData(form);

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        setEnviado(true);
        form.reset();
      } else {
        alert("Hubo un error al enviar el mensaje.");
      }
    } catch (error) {
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const sectionTag = "text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 mb-8 opacity-40 text-primary";

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <main className="max-w-4xl mx-auto px-6 pb-32 pt-24 md:pt-40 font-sans">
        
        {/* CABECERA */}
        <header className="mb-24">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none"
          >
            Sobre <span className="font-serif font-light text-primary/60">Mi</span>
          </motion.h1>
          <div className="h-1.5 w-20 bg-primary mt-8 opacity-20 rounded-full" />
        </header>

        <div className="space-y-24">
          
          {/* SECCIÓN 1: MI ATELIER */}
          <section>
            <div className="card-main !bg-white p-8 md:p-16">
              <h3 className={sectionTag}>
                <Heart size={14} /> Mi Atelier
              </h3>
              <p className="text-2xl md:text-3xl leading-snug font-light italic">
                Bienvenido a mi pequeño <span className="font-bold text-primary">jardín digital</span>. Me encanta compartir mi arte y conectar con personas que disfrutan de este.
              </p>
            </div>
          </section>

          {/* SECCIÓN 2: HERRAMIENTAS */}
          <section className="space-y-10">
            <h3 className={sectionTag}>
              <Palette size={14} /> Herramientas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                "Linux y Krita",
                "Acuarelas y Acrílico",
                "Mucha música"
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-4 p-8 bg-white border border-primary/5 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                  <Sparkles size={16} className="text-primary/30" />
                  <span className="font-black text-[10px] uppercase tracking-[0.2em]">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN 3: GARDEN OF SINS */}
          <section className="space-y-8 border-t border-primary/10 pt-16">
            <h2 className="text-4xl md:text-6xl font-black italic text-primary uppercase tracking-tighter">Garden of Sins</h2>
            
            <div className="max-w-2xl space-y-6 text-lg md:text-xl leading-relaxed font-light opacity-90">
              <p>
                Este refleja temas que considero importantes a través de personajes basados en personas que han dejado una marca en mí.
              </p>
              <div className="p-8 bg-white rounded-[2.5rem] border-l-8 border-primary shadow-sm italic font-medium">
                &quot;Cada flor de este jardín está basada en una experiencia o emoción que necesito quitarme de encima.&quot;
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}