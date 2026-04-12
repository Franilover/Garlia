"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Clock, ChevronLeft } from "lucide-react";

const OPCIONES_POMODORO = [
  { label: "5 min",  valor: 5 },
  { label: "15 min", valor: 15 },
  { label: "25 min", valor: 25 },
  { label: "45 min", valor: 45 },
  { label: "60 min", valor: 60 },
];

const reproducirSonidoFin = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notas = [523, 659, 784, 1047];
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.4);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch (e) { console.warn("Audio no disponible", e); }
};

export const RelojDigital = ({ horario }: { horario: any[] }) => {
  const [hora, setHora] = useState(new Date());
  const [expandido, setExpandido] = useState(false);

  
  const [pomMinutos, setPomMinutos] = useState(25);
  const [pomPersonalizado, setPomPersonalizado] = useState("");
  const [pomSegundos, setPomSegundos] = useState(25 * 60);
  const [pomActivo, setPomActivo] = useState(false);
  const [pomTerminado, setPomTerminado] = useState(false);
  const [pomPantallaCompleta, setPomPantallaCompleta] = useState(false);

  
  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  
  useEffect(() => {
    if (!pomActivo) return;
    const interval = setInterval(() => {
      setPomSegundos(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPomActivo(false);
          setPomTerminado(true);
          reproducirSonidoFin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pomActivo]);

  const formatoHora = hora.toLocaleTimeString("es-CL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  const actividadActual = useMemo(() => {
    if (!horario || horario.length === 0) return null;
    const diaActual = hora.getDay();
    const ahoraStr = hora.toLocaleTimeString("es-CL", { hour12: false });
    return horario.find((item) =>
      item.dias_semana?.includes(diaActual) &&
      ahoraStr >= item.hora_inicio &&
      ahoraStr <= item.hora_fin
    );
  }, [hora, horario]);

  const seleccionarTiempo = (min: number) => {
    setPomMinutos(min);
    setPomSegundos(min * 60);
    setPomActivo(false);
    setPomTerminado(false);
  };

  const aplicarPersonalizado = () => {
    const val = parseInt(pomPersonalizado);
    if (!isNaN(val) && val > 0 && val <= 180) {
      seleccionarTiempo(val);
      setPomPersonalizado("");
    }
  };

  const togglePomodoro = () => {
    if (pomTerminado) {
      setPomSegundos(pomMinutos * 60);
      setPomTerminado(false);
    }
    setPomActivo(prev => !prev);
  };

  const resetPomodoro = () => {
    setPomActivo(false);
    setPomTerminado(false);
    setPomSegundos(pomMinutos * 60);
  };

  const pct = 1 - pomSegundos / (pomMinutos * 60);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const minDisplay = Math.floor(pomSegundos / 60).toString().padStart(2, "0");
  const secDisplay = (pomSegundos % 60).toString().padStart(2, "0");

  return (
    <div className="relative z-10 shrink-0">
      {}
      <motion.div
        layout
        onClick={() => setExpandido(e => !e)}
        className="flex flex-col sm:flex-row items-center gap-6 bg-white-custom text-primary px-6 py-4 rounded-[var(--radius-card)] shadow-xl shadow-primary/5 border border-primary/10 cursor-pointer hover:border-primary/30 transition-all select-none"
      >
        <div className="flex items-center gap-4">
          <Clock size={24} className={cn("text-primary/60", !expandido && "animate-pulse")} />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 italic">Tiempo Real</span>
            <span className="text-3xl font-black tracking-tighter tabular-nums italic text-primary">{formatoHora}</span>
          </div>
        </div>
        <div className="hidden sm:block h-10 w-px bg-primary/10 mx-2" />
        <div className="flex flex-col items-center sm:items-start flex-1">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 italic">Actividad Programada</span>
          <span className="text-sm font-black uppercase tracking-tight italic text-primary">
            {actividadActual ? actividadActual.actividad : "Tiempo Libre"}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <span className="text-[8px] font-black uppercase tracking-widest text-primary/30 italic">
            {expandido ? "Cerrar" : "Pomodoro"}
          </span>
          <motion.div animate={{ rotate: expandido ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronLeft size={14} className="text-primary/30 -rotate-90" />
          </motion.div>
        </div>
      </motion.div>

      {}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden relative z-10"
          >
            <div className="mt-2 bg-white-custom border border-primary/10 rounded-[var(--radius-card)] p-5 shadow-xl shadow-primary/5 flex flex-col sm:flex-row gap-6 items-center">

              {}
              <div className="flex flex-col items-center gap-1 shrink-0 bg-primary/4 rounded-[var(--radius-btn)] px-6 py-4 border border-primary/8">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/30 italic">Hora Actual</span>
                <span className="text-5xl font-black tracking-tighter tabular-nums text-primary italic leading-none">
                  {hora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
                <span className="text-base font-black tabular-nums text-primary/30 tracking-tight">
                  :{hora.toLocaleTimeString("es-CL", { second: "2-digit", hour12: false })}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 mt-1 text-center">
                  {actividadActual ? actividadActual.actividad : "Tiempo Libre"}
                </span>
              </div>

              <div className="hidden sm:block w-px h-32 bg-primary/8 shrink-0" />

              {}
              <div className="flex flex-col items-center gap-4 flex-1 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/30 italic">Pomodoro</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPomPantallaCompleta(true); }}
                    className="text-[8px] font-black uppercase tracking-widest text-primary/30 hover:text-primary border border-primary/10 hover:border-primary/30 px-2.5 py-1 rounded-[var(--radius-btn)] transition-all flex items-center gap-1"
                  >
                    ⛶ Enfocar
                  </button>
                </div>

                {}
                <div className="relative w-28 h-28 cursor-pointer" onClick={(e) => { e.stopPropagation(); togglePomodoro(); }}>
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-primary/10" />
                    <motion.circle
                      cx="44" cy="44" r={r} fill="none"
                      stroke="currentColor" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - pct)}
                      className={cn(pomTerminado ? "text-emerald-400" : pomActivo ? "text-primary" : "text-primary/30")}
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {pomTerminado ? (
                      <span className="text-xs font-black text-emerald-500 uppercase tracking-tight">¡Listo!</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black tabular-nums text-primary tracking-tighter leading-none">
                          {minDisplay}:{secDisplay}
                        </span>
                        <span className="text-[8px] font-black text-primary/30 uppercase tracking-widest">
                          {pomActivo ? "activo" : "pausa"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePomodoro(); }}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-[var(--radius-btn)] transition-all",
                      pomActivo ? "bg-red-50 text-red-500 border border-red-100" : "bg-primary text-white shadow-md shadow-primary/20 hover:scale-105"
                    )}
                  >
                    {pomTerminado ? "Reiniciar" : pomActivo ? "Pausar" : "Iniciar"}
                  </button>
                  {(pomActivo || pomSegundos !== pomMinutos * 60) && !pomTerminado && (
                    <button
                      onClick={(e) => { e.stopPropagation(); resetPomodoro(); }}
                      className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-[var(--radius-btn)] border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {}
                <div className="flex flex-wrap justify-center gap-1.5 w-full">
                  {OPCIONES_POMODORO.map(op => (
                    <button
                      key={op.valor}
                      onClick={(e) => { e.stopPropagation(); seleccionarTiempo(op.valor); }}
                      className={cn(
                        "text-[8px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-[var(--radius-btn)] transition-all",
                        pomMinutos === op.valor && !pomActivo
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-primary/30 hover:text-primary hover:bg-primary/5 border border-transparent"
                      )}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>

                {}
                <div className="flex items-center gap-2 w-full max-w-45" onClick={e => e.stopPropagation()}>
                  <input
                    type="number" min="1" max="180"
                    value={pomPersonalizado}
                    onChange={e => setPomPersonalizado(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && aplicarPersonalizado()}
                    placeholder="Min custom..."
                    className="flex-1 bg-primary/5 border border-primary/10 rounded-[var(--radius-btn)] px-3 py-1.5 text-[10px] font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20 w-full"
                  />
                  <button
                    onClick={aplicarPersonalizado}
                    className="bg-primary/10 text-primary px-2 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black hover:bg-primary hover:text-white transition-all"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {pomPantallaCompleta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
            style={{ backgroundColor: "var(--bg-menu)", color: "var(--menu-text)" }}
          >
            {/* Botón salir */}
            <button
              onClick={() => setPomPantallaCompleta(false)}
              className="absolute top-6 right-6 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-[var(--radius-btn)] transition-all"
              style={{
                color: "color-mix(in srgb, var(--menu-text) 40%, transparent)",
                border: "1px solid color-mix(in srgb, var(--menu-text) 15%, transparent)",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--menu-text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--menu-text) 40%, transparent)")}
            >
              ✕ Salir
            </button>

            {/* Hora actual */}
            <span
              className="absolute top-6 left-6 text-sm font-black tabular-nums tracking-tighter italic"
              style={{ color: "color-mix(in srgb, var(--menu-text) 20%, transparent)" }}
            >
              {formatoHora}
            </span>

            {/* Círculo temporizador */}
            <div
              className="relative cursor-pointer mb-8"
              style={{ width: "min(70vw, 400px)", height: "min(70vw, 400px)" }}
              onClick={togglePomodoro}
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100" cy="100" r="88" fill="none"
                  stroke="var(--menu-text)" strokeWidth="6" opacity="0.1"
                />
                <motion.circle
                  cx="100" cy="100" r="88"
                  fill="none" stroke="var(--menu-text)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - pct)}
                  opacity={pomTerminado ? 0 : 0.85}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
                {pomTerminado && (
                  <circle cx="100" cy="100" r="88" fill="none" stroke="#34d399" strokeWidth="6" opacity="0.9" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {pomTerminado ? (
                  <>
                    <span className="text-4xl font-black text-emerald-400 uppercase tracking-tight">¡Listo!</span>
                    <span
                      className="text-xs font-black uppercase tracking-widest"
                      style={{ color: "color-mix(in srgb, var(--menu-text) 40%, transparent)" }}
                    >
                      Sesión completada
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="font-black tabular-nums tracking-tighter leading-none italic"
                      style={{ fontSize: "min(18vw, 100px)", color: "var(--menu-text)" }}
                    >
                      {minDisplay}:{secDisplay}
                    </span>
                    <span
                      className="text-xs font-black uppercase tracking-[0.3em]"
                      style={{ color: "color-mix(in srgb, var(--menu-text) 35%, transparent)" }}
                    >
                      {pomActivo ? "concentrado" : "en pausa"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actividad programada */}
            {actividadActual && (
              <p
                className="text-[10px] font-black uppercase tracking-[0.3em] italic mb-6"
                style={{ color: "color-mix(in srgb, var(--menu-text) 25%, transparent)" }}
              >
                {actividadActual.actividad}
              </p>
            )}

            {/* Botones iniciar / pausar / reset */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={togglePomodoro}
                className="font-black uppercase tracking-widest px-8 py-3 rounded-[var(--radius-btn)] transition-all text-sm hover:scale-105 active:scale-95"
                style={pomActivo ? {
                  background: "color-mix(in srgb, var(--menu-text) 10%, transparent)",
                  color: "var(--menu-text)",
                  border: "1px solid color-mix(in srgb, var(--menu-text) 20%, transparent)",
                } : {
                  background: "var(--primary)",
                  color: "var(--btn-text)",
                  boxShadow: "0 8px 30px color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                {pomTerminado ? "Reiniciar" : pomActivo ? "Pausar" : "Iniciar"}
              </button>
              {(pomActivo || pomSegundos !== pomMinutos * 60) && !pomTerminado && (
                <button
                  onClick={resetPomodoro}
                  className="text-[9px] font-black uppercase tracking-widest px-4 py-3 rounded-[var(--radius-btn)] transition-all"
                  style={{
                    color: "color-mix(in srgb, var(--menu-text) 30%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--menu-text) 10%, transparent)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--menu-text)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--menu-text) 30%, transparent)")}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Selector de tiempo */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xs">
              {OPCIONES_POMODORO.map(op => (
                <button
                  key={op.valor}
                  onClick={() => seleccionarTiempo(op.valor)}
                  className="text-[9px] font-black uppercase tracking-wide px-3 py-2 rounded-[var(--radius-btn)] transition-all"
                  style={pomMinutos === op.valor ? {
                    background: "color-mix(in srgb, var(--menu-text) 12%, transparent)",
                    color: "var(--menu-text)",
                    border: "1px solid color-mix(in srgb, var(--menu-text) 25%, transparent)",
                  } : {
                    color: "color-mix(in srgb, var(--menu-text) 30%, transparent)",
                    border: "1px solid transparent",
                  }}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {/* Input personalizado */}
            <div className="flex items-center gap-2 mt-4">
              <input
                type="number" min="1" max="180"
                value={pomPersonalizado}
                onChange={e => setPomPersonalizado(e.target.value)}
                onKeyDown={e => e.key === "Enter" && aplicarPersonalizado()}
                placeholder="Min..."
                className="rounded-[var(--radius-btn)] px-3 py-2 text-[10px] font-bold outline-none w-24 text-center"
                style={{
                  background: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--menu-text) 15%, transparent)",
                  color: "var(--menu-text)",
                }}
              />
              <button
                onClick={aplicarPersonalizado}
                className="px-3 py-2 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide transition-all"
                style={{
                  background: "color-mix(in srgb, var(--menu-text) 10%, transparent)",
                  color: "var(--menu-text)",
                  border: "1px solid color-mix(in srgb, var(--menu-text) 15%, transparent)",
                }}
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};