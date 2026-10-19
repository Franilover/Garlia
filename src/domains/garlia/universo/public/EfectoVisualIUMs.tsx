"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

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
};

const MAX_PARTICULAS = 64;

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

/**
 * Visualización derivada de los ejes canónicos de las partículas.
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

  useEffect(() => {
    let vigente = true;
    if (!idsClave.length) {
      setPerfil(null);
      return;
    }
    setError(false);
    supabase.rpc("obtener_perfil_visual_iums_v1", {
      p_ium_ids: idsClave,
    }).then(({ data, error: rpcError }) => {
      if (!vigente) return;
      if (rpcError || !data || typeof data !== "object") {
        setError(true);
        setPerfil(null);
        return;
      }
      setPerfil(data as unknown as PerfilVisual);
    });
    return () => {
      vigente = false;
    };
  }, [idsClave]);

  const ejes = useMemo(() => {
    const total = { dinamica: 0, coherencia: 0, estabilidad: 0, transformacion: 0 };
    for (const particula of perfil?.particulas ?? []) {
      const n = Math.max(1, Math.min(6, Number(particula.cantidad_total) || 1));
      total.dinamica += (particula.ejes_fundamentales?.dinamica ?? 0) * n;
      total.coherencia += (particula.ejes_fundamentales?.coherencia ?? 0) * n;
      total.estabilidad += (particula.ejes_fundamentales?.estabilidad ?? 0) * n;
      total.transformacion += (particula.ejes_fundamentales?.transformacion ?? 0) * n;
    }
    const divisor = Math.max(1, (perfil?.particulas ?? []).reduce((n, p) => n + Math.max(1, p.cantidad_total), 0));
    return {
      dinamica: total.dinamica / divisor,
      coherencia: total.coherencia / divisor,
      estabilidad: total.estabilidad / divisor,
      transformacion: total.transformacion / divisor,
    };
  }, [perfil]);

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
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = "100%";
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motas = crearMotas(width, height, reduceMotion ? 18 : Math.min(MAX_PARTICULAS, 20 + perfil.particulas.length * 3));
    };

    const style = getComputedStyle(host);
    const color = style.getPropertyValue("--primary").trim() || "#b4befe";
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const dibujar = (tiempo: number) => {
      ctx.clearRect(0, 0, width, height);
      const centroX = width / 2;
      const centroY = height / 2;
      const energiaMovimiento = Math.min(1.8, Math.abs(ejes.dinamica) / 8);
      const coherencia = Math.min(1, Math.max(0, (ejes.coherencia + 3) / 9));
      const estabilidad = Math.min(1, Math.max(0, (ejes.estabilidad + 3) / 9));
      const transformacion = Math.min(1.5, Math.abs(ejes.transformacion) / 8);

      // Anillos: la intensidad visual responde a coherencia/estabilidad registradas.
      if (coherencia > 0.08 || estabilidad > 0.08) {
        const pulso = reduceMotion ? 0 : Math.sin(tiempo / 850) * 2.5;
        for (let i = 0; i < 2; i++) {
          const radio = 19 + i * 15 + pulso * (i + 1) * 0.45;
          ctx.beginPath();
          ctx.arc(centroX, centroY, radio, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (i === 0 ? coherencia : estabilidad) * 0.32;
          ctx.lineWidth = 1 + (i === 0 ? coherencia : estabilidad);
          ctx.stroke();
        }
      }

      // Transformación: ondas discretas; movimiento: motas con deriva.
      for (const mota of motas) {
        const velocidad = 0.25 + energiaMovimiento * 0.65;
        if (!reduceMotion) {
          mota.x += mota.vx * velocidad * 2;
          mota.y += mota.vy * velocidad * 2 - energiaMovimiento * 0.12;
          mota.fase += 0.025 + transformacion * 0.025;
          if (mota.x < -4) mota.x = width + 4;
          if (mota.x > width + 4) mota.x = -4;
          if (mota.y < -4) mota.y = height + 4;
          if (mota.y > height + 4) mota.y = -4;
        }
        const brillo = 0.22 + (Math.sin(mota.fase) + 1) * 0.19;
        ctx.beginPath();
        ctx.arc(mota.x, mota.y, mota.radio + transformacion * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = brillo;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (transformacion > 0.08) {
        const fase = reduceMotion ? 0 : (tiempo / 900) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(centroX, centroY, 42 + Math.sin(fase) * 4 * transformacion, 18 + Math.cos(fase) * 3 * transformacion, fase * 0.18, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.12 + transformacion * 0.12;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (!reduceMotion) raf = requestAnimationFrame(dibujar);
    };

    dibujar(0);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [activo, perfil, ejes]);

  if (!activo) return null;

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
      <div style={{ padding: "8px 10px 0", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 800 }}>Resonancia de partículas</span>
        <span style={{ fontSize: 9, opacity: 0.65 }}>
          {perfil?.particulas?.length ? `${perfil.particulas.length} partículas` : error ? "Datos no disponibles" : "Cargando…"}
        </span>
      </div>
      <div style={{ width: "100%", minHeight: 148 }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
      <p style={{ fontSize: 9, opacity: 0.62, padding: "0 10px 9px", margin: 0 }}>
        Movimiento, coherencia y transformación visualizados desde los ejes registrados.
      </p>
    </section>
  );
}
