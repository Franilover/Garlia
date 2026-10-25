"use client";
/**
 * ConstellationCanvas.tsx
 * ───────────────────────
 * Canvas 2D con estrellas que parpadean, sin dependencias externas.
 * Usa los CSS vars de tu ThemeProvider (--accent, --primary) para los colores,
 * por lo que respeta automáticamente el tema activo (light/dark, accent colors).
 *
 * Sin deps extra — copy-paste directo, 0 npm install.
 *
 * Uso básico:
 *   <section className="relative overflow-hidden min-h-[60vh]">
 *     <ConstellationCanvas />
 *     <h1 className="relative z-10">Garlia</h1>
 *   </section>
 *
 * Con conexiones entre estrellas cercanas (modo "red"):
 *   <ConstellationCanvas mode="network" starCount={60} />
 *
 * Paralaje suave al mover el mouse:
 *   <ConstellationCanvas parallax />
 */
import React, { useEffect, useRef } from "react";

interface ConstellationCanvasProps {
  /** Cantidad de estrellas. Default: 80 */
  starCount?: number;
  /** "stars" = solo estrellas | "network" = estrellas + líneas entre cercanas */
  mode?: "stars" | "network";
  /** Distancia máxima para dibujar líneas entre estrellas (modo "network") */
  linkDistance?: number;
  /** Paralaje suave cuando el mouse se mueve por la página. Default: false */
  parallax?: boolean;
  /** Velocidad de parpadeo (0 = sin parpadeo, 1 = rápido). Default: 0.008 */
  twinkleSpeed?: number;
  /** Clases extra para el canvas */
  className?: string;
}

export function ConstellationCanvas({
  starCount = 80,
  mode = "stars",
  linkDistance = 130,
  parallax = false,
  twinkleSpeed = 0.008,
  className = "",
}: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Leer los CSS vars del tema actual al montar
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim() || "#be97d1";
    const primary = style.getPropertyValue("--primary").trim() || "#67556d";

    // Parsear hex → rgb para poder usar con alpha
    function hexToRgb(hex: string): [number, number, number] {
      const clean = hex.replace("#", "");
      const n = parseInt(clean.length === 3
        ? clean.split("").map(c => c + c).join("")
        : clean, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    const [ar, ag, ab] = hexToRgb(accent);
    const [pr, pg, pb] = hexToRgb(primary);

    // Resize
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Estrellas
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: Math.random() * 1.6 + 0.4,
      alpha: Math.random(),
      dalpha: (Math.random() - 0.5) * twinkleSpeed * 2,
      // Para paralaje: posición "base" normalizada 0-1
      bx: Math.random(),
      by: Math.random(),
      // Factor de profundidad para paralaje (0.3–1 → las más lejanas se mueven menos)
      depth: Math.random() * 0.7 + 0.3,
      // Alterna entre accent y primary para variedad
      useAccent: Math.random() > 0.4,
    }));

    // Mouse para paralaje
    let mx = 0;
    let my = 0;
    const onMouseMove = (e: MouseEvent) => {
      // Normalizado -0.5 a 0.5
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    if (parallax) window.addEventListener("mousemove", onMouseMove);

    let raf: number;

    const tick = () => {
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);

      // Actualizar y dibujar estrellas
      for (const s of stars) {
        // Parpadeo
        s.alpha = Math.max(0.04, Math.min(0.95, s.alpha + s.dalpha));
        if (s.alpha <= 0.04 || s.alpha >= 0.95) s.dalpha *= -1;

        // Posición con paralaje opcional
        const px = parallax
          ? s.bx * w + mx * 30 * s.depth
          : s.x;
        const py = parallax
          ? s.by * h + my * 20 * s.depth
          : s.y;

        const [r, g, b] = s.useAccent ? [ar, ag, ab] : [pr, pg, pb];
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${s.alpha})`;
        ctx.fill();

        // Guardar posición calculada para las líneas
        (s as any)._px = px;
        (s as any)._py = py;
      }

      // Líneas entre estrellas cercanas (modo "network")
      if (mode === "network") {
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const si = stars[i] as any;
            const sj = stars[j] as any;
            const dx = si._px - sj._px;
            const dy = si._py - sj._py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < linkDistance) {
              const opacity = (1 - dist / linkDistance) * 0.12;
              ctx.beginPath();
              ctx.moveTo(si._px, si._py);
              ctx.lineTo(sj._px, sj._py);
              ctx.strokeStyle = `rgba(${pr},${pg},${pb},${opacity})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (parallax) window.removeEventListener("mousemove", onMouseMove);
    };
  }, [starCount, mode, linkDistance, parallax, twinkleSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
