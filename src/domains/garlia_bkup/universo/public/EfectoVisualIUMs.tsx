"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Ejes = {
  dinamica?: number;
  coherencia?: number;
  estabilidad?: number;
  informacion?: number;
  interaccion?: number;
  transformacion?: number;
};

type ParticulaPerfil = {
  id: string;
  nombre: string;
  formula: string | null;
  funcion_canonica: string | null;
  efecto_canonico: string | null;
  ejes_fundamentales: Ejes | null;
  cantidad_total: number;
};

type PerfilVisual = {
  estado: string;
  iums: { id: string; nombre: string }[];
  particulas: ParticulaPerfil[];
};

type Mota = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radio: number;
  vida: number;
  fase: number;
  color?: string;
};

const MAX_PARTICULAS = 64;

// ─── Derivar perfil visual desde fórmulas TASI ───────────────────────────────
//
// Cada letra de la fórmula (T/A/S/I) aporta al carácter visual.
// T = dinámica / movimiento      → velocidad, dirección, trayectorias
// A = masa / constitución        → peso, densidad, anillos sólidos
// S = emisión (Eterium)          → brillo, expansión, ondas hacia afuera
// I = recepción (Garin)          → contracción, absorción, pulsos hacia adentro
//
// Se promedia sobre todos los IUMs del canvas ponderando por cantidad_total.

interface PerfilTASI {
  T: number; // 0..1 — dominio de dinámica
  A: number; // 0..1 — dominio de masa
  S: number; // 0..1 — dominio de emisión
  I: number; // 0..1 — dominio de recepción
  // Carácter resultante (el más alto gana)
  caracter: "dinamico" | "masivo" | "emisor" | "receptor" | "mixto";
  // Color base derivado del carácter
  colorHSL: string;
  // Parámetros de animación derivados
  velocidadMota: number;    // multiplicador de velocidad
  radioAnillo: number;      // radio base de anillos
  opacidadAnillo: number;
  ondaExpansion: boolean;   // onda que se expande hacia afuera (S)
  ondaContraccion: boolean; // onda que se contrae hacia adentro (I)
  densidadMotas: number;    // 0..1
  estela: boolean;          // motas con estela (T alto)
  brilloCore: boolean;      // núcleo brillante (S alto)
  pulsoCentral: boolean;    // pulso en el centro (I alto)
}

function contarTASI(formula: string): { T: number; A: number; S: number; I: number } {
  const out = { T: 0, A: 0, S: 0, I: 0 };
  for (const c of formula) {
    if (c === "T") out.T++;
    if (c === "A") out.A++;
    if (c === "S") out.S++;
    if (c === "I") out.I++;
  }
  return out;
}

function derivarPerfilTASI(particulas: ParticulaPerfil[]): PerfilTASI {
  let T = 0, A = 0, S = 0, I = 0, total = 0;

  for (const p of particulas) {
    if (!p.formula) continue;
    const n = Math.max(1, p.cantidad_total);
    const letras = contarTASI(p.formula);
    T += letras.T * n;
    A += letras.A * n;
    S += letras.S * n;
    I += letras.I * n;
    total += (letras.T + letras.A + letras.S + letras.I) * n;
  }

  if (total === 0) {
    return {
      T: 0, A: 0, S: 0, I: 0,
      caracter: "mixto",
      colorHSL: "var(--primary)",
      velocidadMota: 1, radioAnillo: 28, opacidadAnillo: 0.25,
      ondaExpansion: false, ondaContraccion: false,
      densidadMotas: 0.5, estela: false, brilloCore: false, pulsoCentral: false,
    };
  }

  const tN = T / total;
  const aN = A / total;
  const sN = S / total;
  const iN = I / total;

  // Carácter: la letra dominante
  const max = Math.max(tN, aN, sN, iN);
  let caracter: PerfilTASI["caracter"] = "mixto";
  if (max > 0.45) {
    if (tN === max) caracter = "dinamico";
    else if (aN === max) caracter = "masivo";
    else if (sN === max) caracter = "emisor";
    else caracter = "receptor";
  }

  // Color base según carácter (CSS HSL para poder mezclarlo con --primary)
  // Se usan colores que contrasten con el tema oscuro típico
  const colorHSL =
    caracter === "dinamico"  ? "hsl(195, 80%, 65%)"  // cian eléctrico — movimiento
  : caracter === "masivo"    ? "hsl(45, 70%, 60%)"   // ámbar — peso
  : caracter === "emisor"    ? "hsl(285, 75%, 70%)"  // violeta — expansión Eterium
  : caracter === "receptor"  ? "hsl(145, 65%, 55%)"  // verde — absorción Garin
  : "var(--primary)";                                 // mixto — usa el primary del tema

  return {
    T: tN, A: aN, S: sN, I: iN,
    caracter,
    colorHSL,
    velocidadMota:    0.4 + tN * 2.2,
    radioAnillo:      18 + aN * 30,
    opacidadAnillo:   0.15 + aN * 0.35 + iN * 0.15,
    ondaExpansion:    sN > 0.2,
    ondaContraccion:  iN > 0.2,
    densidadMotas:    0.3 + tN * 0.7,
    estela:           tN > 0.35,
    brilloCore:       sN > 0.25,
    pulsoCentral:     iN > 0.25,
  };
}

// ─── Crear motas iniciales ─────────────────────────────────────────────────

function crearMotas(ancho: number, alto: number, cantidad: number): Mota[] {
  return Array.from({ length: cantidad }, () => ({
    x: Math.random() * ancho,
    y: Math.random() * alto,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radio: 0.8 + Math.random() * 1.8,
    vida: Math.random(),
    fase: Math.random() * Math.PI * 2,
  }));
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * EfectoVisualIUMs
 *
 * Visualización derivada de los ejes canónicos Y la composición TASI real
 * de las partículas de los IUMs seleccionados.
 *
 * - El carácter visual (color, movimiento, ondas) se deriva de las fórmulas
 *   TASI reales de las partículas — no se inventa nada.
 * - T (dinámica) → velocidad, trayectorias, estelas
 * - A (masa) → anillos densos, peso visual
 * - S (emisión) → ondas expansivas, núcleo brillante
 * - I (recepción) → ondas contrácticas, pulso central
 *
 * No determina procesos ni altera la simulación: solo dibuja una lectura visual.
 */
export function EfectoVisualIUMs({
  iumIds,
  activo,
}: {
  iumIds: string[];
  activo: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [perfil, setPerfil] = useState<PerfilVisual | null>(null);
  const [error, setError] = useState(false);
  const idsClave = useMemo(
    () => [...new Set(iumIds)].sort(),
    [iumIds],
  );

  // ── Fetch del perfil desde Supabase ──────────────────────────────────────
  useEffect(() => {
    let vigente = true;
    if (!idsClave.length) { setPerfil(null); return; }
    setError(false);
    supabase.rpc("obtener_perfil_visual_iums_v1", {
      p_ium_ids: idsClave,
    }).then(({ data, error: rpcError }) => {
      if (!vigente) return;
      if (rpcError || !data || typeof data !== "object") {
        setError(true); setPerfil(null); return;
      }
      setPerfil(data as unknown as PerfilVisual);
    });
    return () => { vigente = false; };
  }, [idsClave]);

  // ── Ejes numéricos (para compatibilidad con animaciones existentes) ───────
  const ejes = useMemo(() => {
    const total = { dinamica: 0, coherencia: 0, estabilidad: 0, transformacion: 0 };
    for (const p of perfil?.particulas ?? []) {
      const n = Math.max(1, Math.min(6, Number(p.cantidad_total) || 1));
      total.dinamica     += (p.ejes_fundamentales?.dinamica     ?? 0) * n;
      total.coherencia   += (p.ejes_fundamentales?.coherencia   ?? 0) * n;
      total.estabilidad  += (p.ejes_fundamentales?.estabilidad  ?? 0) * n;
      total.transformacion += (p.ejes_fundamentales?.transformacion ?? 0) * n;
    }
    const divisor = Math.max(1, (perfil?.particulas ?? []).reduce((n, p) => n + Math.max(1, p.cantidad_total), 0));
    return {
      dinamica:      total.dinamica      / divisor,
      coherencia:    total.coherencia    / divisor,
      estabilidad:   total.estabilidad   / divisor,
      transformacion: total.transformacion / divisor,
    };
  }, [perfil]);

  // ── Perfil TASI derivado de las fórmulas reales ───────────────────────────
  const tasi = useMemo(
    () => derivarPerfilTASI(perfil?.particulas ?? []),
    [perfil],
  );

  // ── Loop de animación en Canvas ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activo || !perfil?.particulas?.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const host = canvas.parentElement;
    if (!host) return;

    let raf = 0;
    let width = 320;
    let height = 150;
    let motas: Mota[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(240, rect.width);
      height = 148;
      canvas.width  = Math.floor(width  * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width  = "100%";
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nMotas = reduceMotion
        ? 14
        : Math.min(MAX_PARTICULAS, Math.floor(12 + tasi.densidadMotas * 40));
      motas = crearMotas(width, height, nMotas);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Color base del perfil (puede ser CSS var o HSL)
    const colorBase = tasi.colorHSL;
    // Color secundario: mezcla suave para efectos de onda
    const colorSec  = tasi.caracter === "mixto"
      ? colorBase
      : "color-mix(in srgb, " + colorBase + " 60%, var(--primary))";

    const dibujar = (tiempo: number) => {
      ctx.clearRect(0, 0, width, height);
      const centroX = width  / 2;
      const centroY = height / 2;

      // ── Núcleo brillante (S alto) ──────────────────────────────────────
      if (tasi.brilloCore && !reduceMotion) {
        const pulso = 0.5 + Math.sin(tiempo / 600) * 0.5;
        const grad = ctx.createRadialGradient(centroX, centroY, 0, centroX, centroY, 22 + pulso * 8);
        grad.addColorStop(0, colorBase);
        grad.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.18 + pulso * 0.12;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centroX, centroY, 30 + pulso * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Pulso central (I alto) ─────────────────────────────────────────
      if (tasi.pulsoCentral) {
        const fase = reduceMotion ? 0 : (tiempo / 700) % (Math.PI * 2);
        const pulso = Math.sin(fase);
        ctx.beginPath();
        ctx.arc(centroX, centroY, 8 + Math.abs(pulso) * 6, 0, Math.PI * 2);
        ctx.strokeStyle = colorBase;
        ctx.globalAlpha = 0.35 + Math.abs(pulso) * 0.3;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Anillos (A alto / coherencia / estabilidad) ────────────────────
      const coherencia  = Math.min(1, Math.max(0, (ejes.coherencia  + 3) / 9));
      const estabilidad = Math.min(1, Math.max(0, (ejes.estabilidad + 3) / 9));
      if (tasi.A > 0.1 || coherencia > 0.08 || estabilidad > 0.08) {
        const nAnillos = tasi.A > 0.4 ? 3 : 2;
        for (let i = 0; i < nAnillos; i++) {
          const pulso = reduceMotion ? 0 : Math.sin(tiempo / (850 + i * 200)) * 2.5;
          const radio = tasi.radioAnillo + i * 14 + pulso * (i + 1) * 0.4;
          ctx.beginPath();
          ctx.arc(centroX, centroY, radio, 0, Math.PI * 2);
          ctx.strokeStyle = i === 0 ? colorBase : colorSec;
          ctx.globalAlpha = tasi.opacidadAnillo * (1 - i * 0.25);
          ctx.lineWidth = 1 + tasi.A * 1.5;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // ── Onda expansiva (S alto) ────────────────────────────────────────
      if (tasi.ondaExpansion && !reduceMotion) {
        const fase = (tiempo / 1100) % 1;
        const radioOnda = 15 + fase * (Math.min(width, height) * 0.45);
        ctx.beginPath();
        ctx.arc(centroX, centroY, radioOnda, 0, Math.PI * 2);
        ctx.strokeStyle = colorBase;
        ctx.globalAlpha = (1 - fase) * 0.22 * tasi.S;
        ctx.lineWidth = 1 + (1 - fase) * 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Onda contrástica (I alto) ─────────────────────────────────────
      if (tasi.ondaContraccion && !reduceMotion) {
        const fase = (tiempo / 950) % 1;
        const radioOnda = Math.min(width, height) * 0.4 * (1 - fase);
        ctx.beginPath();
        ctx.arc(centroX, centroY, radioOnda + 5, 0, Math.PI * 2);
        ctx.strokeStyle = colorBase;
        ctx.globalAlpha = fase * 0.2 * tasi.I;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Transformación: onda elíptica (eje ejes.transformacion) ───────
      const transformacion = Math.min(1.5, Math.abs(ejes.transformacion) / 8);
      if (transformacion > 0.08) {
        const fase = reduceMotion ? 0 : (tiempo / 900) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(
          centroX, centroY,
          42 + Math.sin(fase) * 4 * transformacion,
          18 + Math.cos(fase) * 3 * transformacion,
          fase * 0.18, 0, Math.PI * 2,
        );
        ctx.strokeStyle = colorSec;
        ctx.globalAlpha = 0.1 + transformacion * 0.1;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Motas (T alto = rápidas con estela; A alto = lentas y densas) ─
      for (const mota of motas) {
        if (!reduceMotion) {
          mota.x   += mota.vx * tasi.velocidadMota * 2;
          mota.y   += mota.vy * tasi.velocidadMota * 2 - tasi.T * 0.08;
          mota.fase += 0.02 + tasi.T * 0.03;
          // Wrap
          if (mota.x < -4) mota.x = width + 4;
          if (mota.x > width + 4) mota.x = -4;
          if (mota.y < -4) mota.y = height + 4;
          if (mota.y > height + 4) mota.y = -4;
        }

        const brillo = 0.18 + (Math.sin(mota.fase) + 1) * 0.16;

        // Estela para T dominante
        if (tasi.estela && !reduceMotion) {
          ctx.beginPath();
          ctx.moveTo(mota.x, mota.y);
          ctx.lineTo(
            mota.x - mota.vx * tasi.velocidadMota * 6,
            mota.y - mota.vy * tasi.velocidadMota * 6,
          );
          ctx.strokeStyle = colorBase;
          ctx.globalAlpha = brillo * 0.4;
          ctx.lineWidth = mota.radio * 0.7;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(mota.x, mota.y, mota.radio + tasi.S * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = colorBase;
        ctx.globalAlpha = brillo;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduceMotion) raf = requestAnimationFrame(dibujar);
    };

    dibujar(0);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [activo, perfil, ejes, tasi]);

  if (!activo) return null;

  // Etiqueta del carácter para mostrar en la UI
  const etiquetaCaracter: Record<PerfilTASI["caracter"], string> = {
    dinamico: "Dinámico · T",
    masivo:   "Masivo · A",
    emisor:   "Emisor · S",
    receptor: "Receptor · I",
    mixto:    "Mixto",
  };

  return (
    <section
      aria-label="Visualización de partículas de la conjuración"
      style={{
        width: "100%",
        overflow: "hidden",
        border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
        borderRadius: 12,
        background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
      }}
    >
      <div style={{
        padding: "8px 10px 0",
        display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800 }}>Resonancia de partículas</span>
        <span style={{ fontSize: 9, opacity: 0.65 }}>
          {perfil?.particulas?.length
            ? <>
                {etiquetaCaracter[tasi.caracter]}
                {" · "}
                {perfil.particulas.length} partícula{perfil.particulas.length !== 1 ? "s" : ""}
              </>
            : error
              ? "Datos no disponibles"
              : "Cargando…"
          }
        </span>
      </div>

      {/* Indicadores TASI */}
      {perfil?.particulas?.length ? (
        <div style={{
          display: "flex", gap: 6, padding: "4px 10px 0",
          alignItems: "center",
        }}>
          {(["T", "A", "S", "I"] as const).map((letra) => {
            const val = { T: tasi.T, A: tasi.A, S: tasi.S, I: tasi.I }[letra];
            if (val < 0.05) return null;
            return (
              <div key={letra} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{
                  fontSize: 7.5, fontWeight: 800,
                  color: tasi.caracter === {T:"dinamico",A:"masivo",S:"emisor",I:"receptor"}[letra]
                    ? tasi.colorHSL
                    : "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}>
                  {letra}
                </span>
                <div style={{
                  width: Math.round(val * 28),
                  height: 3,
                  borderRadius: 99,
                  background: tasi.caracter === {T:"dinamico",A:"masivo",S:"emisor",I:"receptor"}[letra]
                    ? tasi.colorHSL
                    : "color-mix(in srgb, var(--primary) 22%, transparent)",
                  transition: "width 0.5s ease",
                }} />
              </div>
            );
          })}
        </div>
      ) : null}

      <div style={{ width: "100%", minHeight: 148 }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>

      <p style={{ fontSize: 9, opacity: 0.55, padding: "0 10px 9px", margin: 0 }}>
        {tasi.caracter === "dinamico" && "Alta dinámica T — movimiento, trayectorias, impacto."}
        {tasi.caracter === "masivo"   && "Alta constitución A — estructura densa, anillos sólidos."}
        {tasi.caracter === "emisor"   && "Alta emisión S — expansión, ondas de Eterium."}
        {tasi.caracter === "receptor" && "Alta recepción I — absorción, pulsos de Garin."}
        {tasi.caracter === "mixto"    && "Composición mixta — múltiples fuerzas en equilibrio."}
      </p>
    </section>
  );
}
