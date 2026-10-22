"use client";

/**
 * SimuladorIUM.tsx — Laboratorio visual de IUMs
 *
 * Canvas SVG libre:
 *  - Click izquierdo + drag → mover nodo
 *  - Click derecho sobre nodo → iniciar unión (arrastrar hasta otro nodo)
 *  - Auto-fit para que todos los nodos quepan sin scroll
 *
 * SUPABASE MANDA: no se inventa ningún IUM, proceso, ORIS ni resultado.
 *
 * Sistema de descubrimiento:
 *  - El jugador comienza sin saber qué hace cada IUM.
 *  - La función se revela tras una reacción exitosa (simulador_conocimiento_ium).
 *  - La composición también está oculta hasta entonces.
 *  - Cada simulación tiene un costo en Eterium (simulador_eterium_jugador).
 */

import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Network,
  Link2,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Search,

  Trash2,
  X,
  Zap,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/infra/supabase/supabase";
import {
  IumVisual,
  type GeometriaIum,
} from "@/domains/garlia/fisica/ParticulaVisual";
import {
  particulasDeIum,
  PARTICULA_QUIMICA_FORMULA,
  type FilaIum,
} from "@/domains/garlia/fisica/types";

// ─── Sistema de animación procedural basado en anim_traits de partículas ──────

const PI2 = Math.PI * 2;
const _lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const _ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const _rand = (a: number, b: number) => a + (b - a) * Math.random();

type AnimFn = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => void;

// Traits que vienen de Supabase columna particulas.anim_traits
interface AnimTrait {
  tipo: string;          // orbital|pulso|carga|stream|rayo|scan|morph|caos|chispa|simetria|enlace|convergencia|radial_out|nucleo|malla|flujo|onda|vortice|espiral
  velocidad: number;     // multiplicador de velocidad (0.3–3.5)
  amplitud: number;      // tamaño relativo del efecto (0.3–2.2)
  densidad: number;      // cantidad de elementos visuales (1–12)
  agitacion: number;     // caos añadido al conjunto (-0.3 a 1.0)
  color: string;         // hex
  forma: string;         // punto|linea|anillo|espiral
  pulsa: boolean;
  estela: boolean;
  direccion: string;     // orbital|fuera|centro|lateral|omnidireccional
  peso_visual: number;   // opacidad base relativa
  cantidad?: number;     // cantidad de esta partícula en el IUM (de iums_particulas)
}

// Reacción visual entre un par de partículas
interface ReaccionVisual {
  particula_a: string;
  particula_b: string;
  nombre_reaccion: string;
  efecto: {
    tipo: string;
    color: string;
    amplitud: number;
    densidad: number;
    velocidad: number;
    peso_visual: number;
  };
  modificadores?: {
    suprimir_caos?: boolean;
    escala_velocidad?: number;
  } | null;
}

// Dado un array de reacciones activas, renderiza sus efectos en el canvas (capa encima de traits base)
function renderReacciones(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  reacciones: ReaccionVisual[],
  intensidad: number = 1,
): void {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.4;

  for (const r of reacciones) {
    const ef = r.efecto;
    const alpha = Math.min(0.9, ef.peso_visual * 0.55 * intensidad);
    const spd = ef.velocidad;
    const amp = ef.amplitud;
    const dens = Math.max(1, Math.round(ef.densidad));
    const col = ef.color;

    ctx.save();
    ctx.globalAlpha = alpha;

    switch (ef.tipo) {
      case "vortice": {
        // Espiral que aspira hacia el centro
        for (let i = 0; i < dens; i++) {
          const ang = t * spd * 1.4 + (i / dens) * Math.PI * 2;
          const frac = (i / dens + t * spd * 0.15) % 1;
          const rr = R * amp * 0.7 * frac;
          const px = cx + Math.cos(ang) * rr;
          const py = cy + Math.sin(ang) * rr;
          ctx.beginPath(); ctx.arc(px, py, 2 + frac * 2, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        }
        break;
      }
      case "simetria": {
        // Anillo perfecto, lento, muy limpio
        for (let i = 0; i < dens; i++) {
          const ang = (i / dens) * Math.PI * 2 + t * spd * 0.2;
          const rr = R * amp * 0.65;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(cx, cy, R * amp * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = col + "44"; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      }
      case "scan": {
        // Línea que barre en arco
        const scanAng = (t * spd * 0.7) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * amp * 0.8, scanAng, scanAng + 0.4);
        ctx.closePath();
        ctx.fillStyle = col + "33"; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(scanAng) * R * amp * 0.8, cy + Math.sin(scanAng) * R * amp * 0.8);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      }
      case "pulso": {
        // Ondas concéntricas que salen del centro
        for (let i = 0; i < dens; i++) {
          const phase = ((t * spd * 0.5 + i / dens) % 1);
          const rr = phase * R * amp;
          const a2 = (1 - phase) * 0.6;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = col + Math.round(a2 * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 2; ctx.stroke();
        }
        break;
      }
      case "malla": {
        // Grid fino superpuesto al área central
        const paso = R * amp * 0.28;
        const xMin = cx - R * amp, xMax = cx + R * amp;
        const yMin = cy - R * amp, yMax = cy + R * amp;
        ctx.strokeStyle = col + "55"; ctx.lineWidth = 0.8;
        for (let x = xMin; x <= xMax; x += paso) {
          ctx.beginPath(); ctx.moveTo(x, yMin); ctx.lineTo(x, yMax); ctx.stroke();
        }
        for (let y = yMin; y <= yMax; y += paso) {
          ctx.beginPath(); ctx.moveTo(xMin, y); ctx.lineTo(xMax, y); ctx.stroke();
        }
        break;
      }
      case "orbital": {
        // Dos puntos orbitando a velocidad distinta (reacción de movimiento)
        for (let i = 0; i < Math.min(dens, 8); i++) {
          const ang = t * spd * (1 + i * 0.15) + (i / dens) * Math.PI * 2;
          const rr = R * amp * (0.3 + (i % 3) * 0.2);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 2 + i % 2, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        }
        break;
      }
      case "explosion":
      case "chispa": {
        // Partículas que salen disparadas desde el centro
        for (let i = 0; i < dens; i++) {
          const baseAng = (i / dens) * Math.PI * 2;
          const frac = ((t * spd * 0.6 + i * 0.13) % 1);
          const rr = frac * R * amp;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(baseAng) * rr, cy + Math.sin(baseAng) * rr, 1.5 + (1 - frac) * 2, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        }
        break;
      }
      case "onda": {
        // Onda expansiva suave
        const fase = (t * spd * 0.4) % 1;
        ctx.beginPath(); ctx.arc(cx, cy, fase * R * amp * 1.1, 0, Math.PI * 2);
        ctx.strokeStyle = col + Math.round((1 - fase) * 180).toString(16).padStart(2, "0");
        ctx.lineWidth = 2 + (1 - fase) * 3; ctx.stroke();
        break;
      }
      default: {
        // Fallback: puntos aleatorios fijos en radio
        for (let i = 0; i < dens; i++) {
          const ang = (i / dens) * Math.PI * 2 + t * spd * 0.3;
          const rr = R * amp * 0.5;
          ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 2, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

// Dado un array de traits (todas las partículas de todos los IUMs), genera una AnimFn compuesta
// Helper: dibuja una partícula con glow suave
function _glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
  g.addColorStop(0,    col + Math.round(a * 255).toString(16).padStart(2,"0"));
  g.addColorStop(0.35, col + Math.round(a * 160).toString(16).padStart(2,"0"));
  g.addColorStop(1,    col + "00");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, PI2); ctx.fill();
  ctx.fillStyle = col + Math.round(Math.min(1, a * 1.4) * 255).toString(16).padStart(2,"0");
  ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill();
}

// Helper: estela con gradiente entre dos puntos
function _trailLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, w: number, a: number) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, col + "00");
  g.addColorStop(1, col + Math.round(a * 200).toString(16).padStart(2,"0"));
  ctx.strokeStyle = g; ctx.lineWidth = w; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function buildTraitAnimFn(traits: AnimTrait[]): AnimFn {
  const agitacionGlobal = Math.max(-0.3,
    Math.min(1.5, traits.reduce((s, tr) => s + tr.agitacion * (tr.cantidad ?? 1), 0))
  );
  const caosBase = Math.max(0, agitacionGlobal);
  const TIPOS_INMUNES_CAOS = new Set(["simetria", "nucleo", "convergencia", "malla", "scan"]);

  return function traitAnimFn(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.4;

    for (const tr of traits) {
      const q    = tr.cantidad ?? 1;
      const spdQ = q > 1 ? Math.sqrt(q) : 1;
      const ampQ = 1 + (q - 1) * 0.3;
      const caosEfectivo = TIPOS_INMUNES_CAOS.has(tr.tipo) ? 0 : caosBase;
      const spd  = tr.velocidad * spdQ * (1 + caosEfectivo * 0.3);
      const amp  = tr.amplitud * ampQ;
      const dens = Math.round(tr.densidad * q);
      const col  = tr.color;
      const alpha = Math.min(0.95, (tr.peso_visual / Math.max(1, traits.length * 0.4)) * 1.8);

      ctx.save();
      ctx.globalAlpha = alpha;

      switch (tr.tipo) {

        case "orbital": {
          // Múltiples capas de órbita — cada tercio en radio diferente
          const capas = Math.ceil(dens / 4);
          for (let c = 0; c < capas; c++) {
            const rOrbit = R * amp * (0.22 + c * 0.18);
            const nInLayer = Math.min(4, dens - c * 4);
            const rotDir = c % 2 === 0 ? 1 : -0.65; // capas alternas en dirección opuesta
            for (let i = 0; i < nInLayer; i++) {
              const ang = t * spd * rotDir + (i / nInLayer) * PI2 + c * 1.1;
              const wobble = 1 + 0.06 * Math.sin(t * 1.8 + i + c);
              const px = cx + Math.cos(ang) * rOrbit * wobble;
              const py = cy + Math.sin(ang) * rOrbit * wobble;
              const sz = 2.8 - c * 0.4 + Math.sin(t * 2.5 + i) * 0.8;
              const pAlpha = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.3);
              if (tr.estela) {
                const steps = 8;
                for (let s = 1; s <= steps; s++) {
                  const angS = ang - rotDir * (s / steps) * 0.55;
                  const wobS = 1 + 0.06 * Math.sin(t * 1.8 + i + c - s * 0.1);
                  const sx = cx + Math.cos(angS) * rOrbit * wobS;
                  const sy = cy + Math.sin(angS) * rOrbit * wobS;
                  const sa = pAlpha * (1 - s / steps) * 0.55;
                  ctx.fillStyle = col + Math.round(sa * 255).toString(16).padStart(2,"0");
                  ctx.beginPath(); ctx.arc(sx, sy, sz * (1 - s / steps * 0.7), 0, PI2); ctx.fill();
                }
              }
              _glowDot(ctx, px, py, sz, col, pAlpha);
            }
          }
          // aro de referencia tenue
          ctx.beginPath(); ctx.arc(cx, cy, R * amp * 0.28, 0, PI2);
          ctx.strokeStyle = col + "1a"; ctx.lineWidth = 1; ctx.stroke();
          break;
        }

        case "pulso": {
          // Anillos que se expanden desde el centro — múltiples con grosor y fade
          for (let i = 0; i < dens; i++) {
            const phase = (t * spd * 0.42 + i / dens) % 1;
            const eased = _ease(phase);
            const r     = eased * R * amp * 1.05;
            const lw    = (3.5 + (1 - phase) * 4) * amp * 0.5;
            const a     = Math.pow(1 - phase, 1.6) * 0.75;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2);
            ctx.strokeStyle = col; ctx.lineWidth = lw;
            ctx.globalAlpha = alpha * a; ctx.stroke();
          }
          // Núcleo con doble glow
          const pulse = 0.82 + Math.sin(t * spd * 0.9) * 0.18;
          const nucR  = R * 0.22 * amp * pulse;
          const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR * 2.8);
          g1.addColorStop(0,   col + "ee"); g1.addColorStop(0.4, col + "77");
          g1.addColorStop(1,   col + "00");
          ctx.fillStyle = g1; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(cx, cy, nucR * 2.8, 0, PI2); ctx.fill();
          ctx.fillStyle = col + "ff"; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(cx, cy, nucR * 0.55, 0, PI2); ctx.fill();
          break;
        }

        case "carga": {
          // Partículas que aceleran hacia el centro (más grandes al llegar)
          for (let i = 0; i < dens; i++) {
            const baseAng = (i / dens) * PI2 + i * 0.4;
            const frac    = ((t * spd * 0.38 + i * 0.19) % 1);
            const eased   = _ease(frac);
            const r       = (1 - eased) * R * amp * 0.92;
            const px      = cx + Math.cos(baseAng) * r;
            const py      = cy + Math.sin(baseAng) * r;
            const sz      = 1.8 + eased * 3.2;
            const a       = 0.5 + eased * 0.5;
            if (tr.estela && frac > 0.05) {
              const frac2   = Math.max(0, frac - 0.12);
              const eased2  = _ease(frac2);
              const r2      = (1 - eased2) * R * amp * 0.92;
              _trailLine(ctx, cx + Math.cos(baseAng) * r2, cy + Math.sin(baseAng) * r2, px, py, col, sz * 0.5, a * 0.5);
            }
            _glowDot(ctx, px, py, sz, col, a);
          }
          // acumulación brillante en el centro
          const charge = 0.5 + 0.5 * Math.sin(t * spd * 1.1);
          const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3 * amp);
          gc.addColorStop(0, col + Math.round(charge * 180).toString(16).padStart(2,"0"));
          gc.addColorStop(1, col + "00");
          ctx.fillStyle = gc; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.3 * amp, 0, PI2); ctx.fill();
          break;
        }

        case "stream": {
          // Streams de datos en filas — puntos con cola corta y brillo variable
          const filas = Math.max(2, Math.round(dens / 3));
          for (let i = 0; i < dens; i++) {
            const fila  = i % filas;
            const frac  = ((t * spd * 0.38 + i / dens * 1.4) % 1);
            const px    = (frac - 0.5) * W * 0.88 + cx;
            const py    = cy + (fila - (filas - 1) / 2) * R * amp * 0.22;
            const sz    = 2.2 + Math.sin(t * 4 + i * 0.9) * 0.7;
            const a     = 0.35 + frac * 0.65;
            // cola
            if (frac > 0.06) {
              const tailLen = W * 0.055;
              ctx.strokeStyle = col; ctx.lineWidth = sz * 0.6;
              ctx.globalAlpha = alpha * a * 0.35;
              ctx.beginPath(); ctx.moveTo(px - tailLen, py); ctx.lineTo(px, py); ctx.stroke();
            }
            _glowDot(ctx, px, py, sz, col, a);
          }
          break;
        }

        case "rayo": {
          // Rayos con ramificaciones y brillo en el núcleo
          const n = Math.max(1, dens);
          for (let i = 0; i < n; i++) {
            const seed  = i * 1.618 + Math.floor(t * spd * 2.5) * 0.3;
            const ang   = (i / n) * PI2 + t * spd * 0.18 + seed * 0.05;
            const len   = R * amp * (0.55 + ((seed * 73.1) % 1) * 0.45);
            const flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 9.3 + i * 2.1));
            ctx.globalAlpha = alpha * flick;
            // tronco principal
            ctx.beginPath(); ctx.moveTo(cx, cy);
            let x = cx, y = cy;
            const segs = 6;
            const jitter = len * 0.13;
            for (let s = 1; s <= segs; s++) {
              const f  = s / segs;
              const jx = s < segs ? (Math.sin(seed * 13.7 + s * 7.1 + t * 15) * jitter) : 0;
              const jy = s < segs ? (Math.cos(seed * 11.3 + s * 5.7 + t * 12) * jitter) : 0;
              x = cx + Math.cos(ang) * len * f + jx;
              y = cy + Math.sin(ang) * len * f + jy;
              ctx.lineTo(x, y);
            }
            ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
            // ramificación en la mitad
            if (n <= 4) {
              const branchAng = ang + 0.45;
              const bLen = len * 0.38;
              const bx0 = cx + Math.cos(ang) * len * 0.5;
              const by0 = cy + Math.sin(ang) * len * 0.5;
              ctx.beginPath(); ctx.moveTo(bx0, by0);
              ctx.lineTo(bx0 + Math.cos(branchAng) * bLen, by0 + Math.sin(branchAng) * bLen);
              ctx.lineWidth = 0.9; ctx.stroke();
            }
            // punta brillante
            _glowDot(ctx, x, y, 2.5, col, flick * 0.9);
          }
          // núcleo de emisión
          const cGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
          cGlow.addColorStop(0, col + "cc"); cGlow.addColorStop(1, col + "00");
          ctx.fillStyle = cGlow; ctx.globalAlpha = alpha * 0.7;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, PI2); ctx.fill();
          break;
        }

        case "scan": {
          // Sonar con aro barredor y destellos de detección
          const barrerAng = t * spd * 0.9;
          // Ondas de ping
          for (let i = 0; i < dens; i++) {
            const phase = ((t * spd * 0.32 + i / dens) % 1);
            const r     = phase * R * 1.15 * amp;
            const a     = Math.pow(1 - phase, 1.4) * 0.55;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2);
            ctx.strokeStyle = col; ctx.lineWidth = 1.1;
            ctx.globalAlpha = alpha * a; ctx.stroke();
          }
          // Aro barredor con estela
          ctx.globalAlpha = alpha;
          const sweepR = R * amp * 0.88;
          const sweepGrad = ctx.createConicalGradient
            ? null // no existe, usamos aproximación
            : null;
          void sweepGrad;
          for (let s = 0; s < 22; s++) {
            const sa  = barrerAng - (s / 22) * 1.2;
            const sAlpha = (1 - s / 22) * 0.45;
            ctx.strokeStyle = col + Math.round(sAlpha * 255).toString(16).padStart(2,"0");
            ctx.lineWidth = 1.4 - s * 0.04;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, sweepR, sa, sa + 0.07);
            ctx.closePath(); ctx.stroke();
          }
          // Punto de barrido
          _glowDot(ctx, cx + Math.cos(barrerAng) * sweepR, cy + Math.sin(barrerAng) * sweepR, 3, col, 0.9);
          break;
        }

        case "morph": case "adaptacion": {
          // Forma orgánica que interpola suavemente entre polígonos
          const ladosBase = 3 + Math.abs(Math.sin(t * spd * 0.18)) * 4.5;
          const ladosA = Math.floor(ladosBase), ladosB = ladosA + 1;
          const blend  = ladosBase - ladosA;
          const nPts   = Math.max(ladosA, ladosB) * 6;
          ctx.beginPath();
          for (let i = 0; i <= nPts; i++) {
            const frac = i / nPts;
            const ang  = frac * PI2 + t * spd * 0.15;
            const rA   = R * amp * 0.44 * (0.82 + 0.18 * Math.cos(ladosA * ang + t * 0.7));
            const rB   = R * amp * 0.44 * (0.82 + 0.18 * Math.cos(ladosB * ang + t * 0.7));
            const r    = _lerp(rA, rB, blend) * (1 + 0.06 * Math.sin(t * 2.2 + i * 0.5));
            const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = alpha * 0.85; ctx.stroke();
          // relleno sutil
          ctx.fillStyle = col + "12"; ctx.globalAlpha = alpha; ctx.fill();
          // partículas flotando en la superficie
          for (let i = 0; i < Math.min(5, dens); i++) {
            const fa  = ((t * spd * 0.5 + i * 0.4) % PI2);
            const rr  = R * amp * 0.38 * (0.82 + 0.18 * Math.cos(ladosA * fa));
            _glowDot(ctx, cx + Math.cos(fa) * rr, cy + Math.sin(fa) * rr, 2.2, col, 0.7);
          }
          break;
        }

        case "caos": {
          // Partículas con trayectorias caóticas Lissajous — predecibles pero complejas
          for (let i = 0; i < dens; i++) {
            const s1 = i * 137.508 * 0.017;
            const s2 = i * 97.33  * 0.017;
            const fx = 1.3 + (i % 3) * 0.47;
            const fy = 1.7 + (i % 5) * 0.31;
            const px = cx + Math.sin(t * spd * fx + s1) * R * amp * 0.82;
            const py = cy + Math.cos(t * spd * fy + s2) * R * amp * 0.82;
            const sz = 2.2 + 1.2 * Math.abs(Math.sin(t * 4.1 + i));
            const a  = 0.45 + 0.55 * Math.abs(Math.sin(t * 2.3 + i * 0.8));
            _glowDot(ctx, px, py, sz, col, a);
          }
          // nebulosa de fondo
          const nebG = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * amp);
          nebG.addColorStop(0,   col + "00");
          nebG.addColorStop(0.5, col + "0a");
          nebG.addColorStop(1,   col + "00");
          ctx.fillStyle = nebG; ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath(); ctx.arc(cx, cy, R * amp, 0, PI2); ctx.fill();
          break;
        }

        case "chispa": {
          // Chispas con vida corta, trayectoria y fade real
          for (let i = 0; i < dens; i++) {
            const offset = i * (1 / dens) + i * 0.23;
            const lifeT  = (t * spd + offset) % 1;
            const born   = lifeT < 0.55;
            const life   = born ? lifeT / 0.55 : (1 - (lifeT - 0.55) / 0.45);
            const a      = Math.pow(life, 0.7) * 0.95;
            const ang    = (i / dens) * PI2 + i * 0.73 + Math.floor(t * spd + offset) * 1.61;
            const spread = R * amp * 0.68;
            const r      = lifeT * spread;
            const px     = cx + Math.cos(ang) * r;
            const py     = cy + Math.sin(ang) * r;
            const sz     = 2.8 * (1 - lifeT * 0.6);
            if (tr.estela) {
              const r2 = Math.max(0, r - spread * 0.18);
              _trailLine(ctx, cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, px, py, col, sz * 0.8, a * 0.55);
            }
            _glowDot(ctx, px, py, sz, col, a);
          }
          // Flash en el origen
          const flash = 0.3 + 0.7 * Math.abs(Math.sin(t * spd * 3.1));
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
          fg.addColorStop(0, col + Math.round(flash * 160).toString(16).padStart(2,"0"));
          fg.addColorStop(1, col + "00");
          ctx.fillStyle = fg; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, PI2); ctx.fill();
          break;
        }

        case "simetria": {
          // Mandala geométrico que rota muy lento — pétalos con glow
          const simetrias = Math.max(3, Math.round(dens * 0.9));
          const rot = t * spd * 0.08;
          for (let p = 0; p < simetrias; p++) {
            const ang = (p / simetrias) * PI2 + rot;
            const r1  = R * amp * 0.48;
            const r2  = R * amp * 0.22;
            const px1 = cx + Math.cos(ang) * r1;
            const py1 = cy + Math.sin(ang) * r1;
            // línea radial con gradiente
            _trailLine(ctx, cx, cy, px1, py1, col, 1.2, alpha * 0.45);
            // nodo exterior con glow
            _glowDot(ctx, px1, py1, 3.2, col, 0.8);
            // arco entre nodos adyacentes
            const angN = ((p + 1) / simetrias) * PI2 + rot;
            const px2  = cx + Math.cos(angN) * r1;
            const py2  = cy + Math.sin(angN) * r1;
            ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
            ctx.strokeStyle = col + "30"; ctx.lineWidth = 1; ctx.stroke();
            // círculo interior
            const px3 = cx + Math.cos(ang + Math.PI / simetrias) * r2;
            const py3 = cy + Math.sin(ang + Math.PI / simetrias) * r2;
            _glowDot(ctx, px3, py3, 1.8, col, 0.5);
          }
          // anillo exterior pulsante tenue
          const pulsoS = 1 + 0.04 * Math.sin(t * spd * 0.5);
          ctx.beginPath(); ctx.arc(cx, cy, R * amp * 0.52 * pulsoS, 0, PI2);
          ctx.strokeStyle = col + "22"; ctx.lineWidth = 1.5; ctx.stroke();
          // núcleo central
          _glowDot(ctx, cx, cy, 3.5, col, 0.6);
          break;
        }

        case "enlace": {
          // Pulsos viajando entre nodos opuestos — tipo señal de red
          const n = Math.max(2, Math.round(dens * 0.8));
          for (let i = 0; i < n; i++) {
            const ang  = (i / n) * PI2 + t * spd * 0.12;
            const px1  = cx + Math.cos(ang) * R * amp * 0.82;
            const py1  = cy + Math.sin(ang) * R * amp * 0.82;
            const px2  = cx + Math.cos(ang + Math.PI) * R * amp * 0.82;
            const py2  = cy + Math.sin(ang + Math.PI) * R * amp * 0.82;
            // línea de conexión tenue
            ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
            ctx.strokeStyle = col + "1e"; ctx.lineWidth = 1; ctx.stroke();
            // nodos
            _glowDot(ctx, px1, py1, 2.8, col, 0.7);
            _glowDot(ctx, px2, py2, 2.8, col, 0.7);
            // pulso viajando por la línea
            const frac = (t * spd * 0.55 + i * 0.37) % 1;
            const px = _lerp(px1, px2, frac);
            const py = _lerp(py1, py2, frac);
            const pA = Math.sin(frac * Math.PI) * 0.95;
            _glowDot(ctx, px, py, 3.5, col, pA);
          }
          break;
        }

        case "convergencia": {
          // Partículas convergiendo con aceleración easeIn y estela
          for (let i = 0; i < dens; i++) {
            const ang  = (i / dens) * PI2 + i * 0.53;
            const raw  = ((t * spd * 0.38 + i * 0.15) % 1);
            const frac = 1 - _ease(raw);           // entra rápido, llega despacio
            const r    = frac * R * amp * 0.92;
            const px   = cx + Math.cos(ang) * r;
            const py   = cy + Math.sin(ang) * r;
            const sz   = 2.2 + (1 - frac) * 2.5;
            const a    = 0.4 + frac * 0.6;
            if (tr.estela) {
              const raw2  = Math.max(0, raw - 0.15);
              const frac2 = 1 - _ease(raw2);
              const r2    = frac2 * R * amp * 0.92;
              _trailLine(ctx, cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, px, py, col, sz * 0.55, a * 0.5);
            }
            _glowDot(ctx, px, py, sz, col, a);
          }
          // acumulación en destino — pulso central creciente
          const accum = 0.45 + 0.55 * Math.abs(Math.sin(t * spd * 0.55));
          const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22 * amp);
          cg.addColorStop(0, col + Math.round(accum * 200).toString(16).padStart(2,"0"));
          cg.addColorStop(1, col + "00");
          ctx.fillStyle = cg; ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.22 * amp, 0, PI2); ctx.fill();
          break;
        }

        case "radial_out": {
          // Emisión radial con variación angular y fade elegante
          for (let i = 0; i < dens; i++) {
            const ang  = (i / dens) * PI2 + i * 0.41 + t * spd * 0.06;
            const raw  = ((t * spd * 0.38 + i * 0.15) % 1);
            const frac = _ease(raw);
            const r    = frac * R * amp * 1.08;
            const px   = cx + Math.cos(ang) * r;
            const py   = cy + Math.sin(ang) * r;
            const sz   = 3.0 * (1 - frac * 0.55);
            const a    = Math.pow(1 - frac, 1.3) * 0.9;
            if (tr.estela && frac > 0.08) {
              const raw2  = Math.max(0, raw - 0.12);
              const frac2 = _ease(raw2);
              const r2    = frac2 * R * amp * 1.08;
              _trailLine(ctx, cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, px, py, col, sz * 0.6, a * 0.5);
            }
            _glowDot(ctx, px, py, sz, col, a);
          }
          // flash de origen
          const orig = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18 * amp);
          orig.addColorStop(0, col + "99"); orig.addColorStop(1, col + "00");
          ctx.fillStyle = orig; ctx.globalAlpha = alpha * 0.7;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.18 * amp, 0, PI2); ctx.fill();
          break;
        }

        case "nucleo": {
          // Núcleo denso multicapa — corazón pulsante con anillos
          const beat = 0.5 * (1 + Math.sin(t * spd * 0.7));    // 0..1
          const beatR = 1 + beat * 0.14;
          // Capas de glow
          for (let layer = 3; layer >= 0; layer--) {
            const layerR = R * amp * (0.12 + layer * 0.14) * beatR;
            const layerA = (0.7 - layer * 0.15) * alpha;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, layerR);
            const hexA = Math.round(layerA * 255).toString(16).padStart(2,"0");
            g.addColorStop(0,   col + hexA);
            g.addColorStop(0.6, col + Math.round(layerA * 100).toString(16).padStart(2,"0"));
            g.addColorStop(1,   col + "00");
            ctx.fillStyle = g; ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.arc(cx, cy, layerR, 0, PI2); ctx.fill();
          }
          // Anillos concéntricos lentos
          for (let i = 0; i < dens; i++) {
            const rr = R * amp * (0.18 + i * 0.13) * beatR;
            const a  = Math.max(0, 0.45 - i * 0.1) * alpha;
            ctx.beginPath(); ctx.arc(cx, cy, rr, 0, PI2);
            ctx.strokeStyle = col + Math.round(a * 255).toString(16).padStart(2,"0");
            ctx.lineWidth = 1.2 - i * 0.15; ctx.stroke();
          }
          // Corazón brillante
          ctx.fillStyle = "#ffffff" + Math.round(beat * 0.5 * 255).toString(16).padStart(2,"0");
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.06 * amp, 0, PI2); ctx.fill();
          break;
        }

        case "malla": {
          // Red hexagonal en vez de cuadrícula — más orgánico y elegante
          const step = R * amp * 0.32;
          const drift = (t * spd * 6) % step;
          const pulse = 0.18 + 0.07 * Math.sin(t * spd * 0.4);
          ctx.strokeStyle = col; ctx.lineWidth = 0.9; ctx.globalAlpha = alpha * pulse;
          // líneas verticales
          for (let x = cx - R * 1.2 + drift; x < cx + R * 1.2 + step; x += step) {
            ctx.beginPath(); ctx.moveTo(x, cy - R * 1.1); ctx.lineTo(x, cy + R * 1.1); ctx.stroke();
          }
          // líneas diagonales (60°)
          for (let x = cx - R * 2 + drift; x < cx + R * 2 + step; x += step) {
            ctx.beginPath();
            ctx.moveTo(x - R * 1.1 / Math.tan(Math.PI / 3), cy - R * 1.1);
            ctx.lineTo(x + R * 1.1 / Math.tan(Math.PI / 3), cy + R * 1.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + R * 1.1 / Math.tan(Math.PI / 3), cy - R * 1.1);
            ctx.lineTo(x - R * 1.1 / Math.tan(Math.PI / 3), cy + R * 1.1);
            ctx.stroke();
          }
          // nodos de intersección brillantes (pocos)
          ctx.globalAlpha = alpha * 0.55;
          for (let i = 0; i < 6; i++) {
            const nx = cx + Math.cos((i / 6) * PI2 + drift * 0.1) * R * amp * 0.45;
            const ny = cy + Math.sin((i / 6) * PI2 + drift * 0.1) * R * amp * 0.45;
            _glowDot(ctx, nx, ny, 2, col, 0.6);
          }
          break;
        }

        case "flujo": {
          // Flujo laminar con curva senoidal suave — no solo recto
          for (let i = 0; i < dens; i++) {
            const frac  = ((t * spd * 0.42 + i / dens) % 1);
            const px    = (frac - 0.5) * W * 0.86 + cx;
            const row   = i % Math.max(2, Math.round(dens * 0.6));
            const rowY  = (row - (Math.round(dens * 0.6) - 1) / 2) * R * amp * 0.2;
            // ondulación suave de cada fila
            const wave  = Math.sin(frac * Math.PI * 2.5 + i * 0.8 + t * spd * 0.3) * R * amp * 0.06;
            const py    = cy + rowY + wave;
            const sz    = 2.5 + Math.sin(t * 3.5 + i * 1.1) * 0.7;
            const a     = 0.3 + _ease(frac) * 0.7;
            // cola con gradiente
            if (frac > 0.08) {
              const frac2 = Math.max(0, frac - 0.1);
              const px2   = (frac2 - 0.5) * W * 0.86 + cx;
              const wave2 = Math.sin(frac2 * Math.PI * 2.5 + i * 0.8 + t * spd * 0.3) * R * amp * 0.06;
              const py2   = cy + rowY + wave2;
              _trailLine(ctx, px2, py2, px, py, col, sz * 0.65, a * 0.5);
            }
            _glowDot(ctx, px, py, sz, col, a);
          }
          break;
        }

        case "onda": {
          // Ondas con perfil senoidal real en el borde del anillo
          for (let i = 0; i < dens; i++) {
            const phase = ((t * spd * 0.48 + i / dens) % 1);
            const r     = _ease(phase) * R * amp * 1.18;
            const a     = Math.sin(phase * Math.PI) * 0.85;
            const lw    = (2.5 + (1 - phase) * 3.5) * 0.7;
            // arco con variación de opacidad por segmento
            const segsW = 36;
            for (let s = 0; s < segsW; s++) {
              const angA = (s / segsW) * PI2;
              const angB = ((s + 1) / segsW) * PI2;
              // modulación de amplitud en el borde
              const mod  = 1 + 0.08 * Math.sin(s * 6 + t * spd * 2.5 + i * 1.3);
              ctx.beginPath();
              ctx.arc(cx, cy, r * mod, angA, angB);
              const segA = a * (0.6 + 0.4 * Math.sin(s * 3 + t * spd));
              ctx.strokeStyle = col; ctx.lineWidth = lw;
              ctx.globalAlpha = alpha * segA; ctx.stroke();
            }
          }
          // glow central si pulsa
          if (tr.pulsa) {
            const beat = 0.7 + 0.3 * Math.sin(t * spd * 1.4);
            const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.32);
            pg.addColorStop(0, col + Math.round(beat * 140).toString(16).padStart(2,"0"));
            pg.addColorStop(1, col + "00");
            ctx.fillStyle = pg; ctx.globalAlpha = alpha * beat;
            ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, PI2); ctx.fill();
          }
          break;
        }

        case "vortice": {
          // Vórtice con múltiples brazos espirales aspirantes
          const brazos = Math.max(2, Math.min(4, Math.round(dens / 3)));
          for (let b = 0; b < brazos; b++) {
            for (let i = 0; i < Math.ceil(dens / brazos); i++) {
              const totalI = i / Math.ceil(dens / brazos);
              const frac  = 1 - ((t * spd * 0.42 + totalI + b / brazos) % 1);
              const ang   = frac * PI2 * 2.8 + (b / brazos) * PI2 + t * spd * 0.4;
              const r     = frac * R * amp * 0.92;
              const px    = cx + Math.cos(ang) * r;
              const py    = cy + Math.sin(ang) * r;
              const sz    = 2.2 + (1 - frac) * 2;
              const a     = frac * 0.9;
              if (tr.estela && i > 0) {
                const frac2 = 1 - ((t * spd * 0.42 + Math.max(0, totalI - 0.08) + b / brazos) % 1);
                const ang2  = frac2 * PI2 * 2.8 + (b / brazos) * PI2 + t * spd * 0.4;
                const r2    = frac2 * R * amp * 0.92;
                _trailLine(ctx, cx + Math.cos(ang2) * r2, cy + Math.sin(ang2) * r2, px, py, col, sz * 0.65, a * 0.6);
              }
              _glowDot(ctx, px, py, sz, col, a);
            }
          }
          // sumidero central
          const sinkG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2 * amp);
          sinkG.addColorStop(0, col + "bb"); sinkG.addColorStop(1, col + "00");
          ctx.fillStyle = sinkG; ctx.globalAlpha = alpha * 0.8;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.2 * amp, 0, PI2); ctx.fill();
          break;
        }

        case "espiral": {
          // Espiral Arquímedes con grosor variable y partículas viajando sobre ella
          const vueltas = 2.2 + amp * 0.6;
          const nPts = 160;
          // Dibujar la espiral con grosor degradado
          for (let seg = 0; seg < nPts - 1; seg++) {
            const f0 = seg / nPts, f1 = (seg + 1) / nPts;
            const ang0 = f0 * PI2 * vueltas + t * spd * 0.35;
            const ang1 = f1 * PI2 * vueltas + t * spd * 0.35;
            const r0 = f0 * R * amp * 0.88, r1 = f1 * R * amp * 0.88;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang0) * r0, cy + Math.sin(ang0) * r0);
            ctx.lineTo(cx + Math.cos(ang1) * r1, cy + Math.sin(ang1) * r1);
            ctx.strokeStyle = col; ctx.lineWidth = 1.2 + f0 * 1.4;
            ctx.globalAlpha = alpha * (0.3 + f0 * 0.6); ctx.stroke();
          }
          // Partículas viajando por el brazo
          for (let i = 0; i < Math.min(5, dens); i++) {
            const frac = ((t * spd * 0.55 + i / Math.min(5, dens)) % 1);
            const travAng = frac * PI2 * vueltas + t * spd * 0.35;
            const travR   = frac * R * amp * 0.88;
            const tpx = cx + Math.cos(travAng) * travR;
            const tpy = cy + Math.sin(travAng) * travR;
            _glowDot(ctx, tpx, tpy, 3.2, col, 0.9);
          }
          // punta de la espiral
          const tipAng = PI2 * vueltas + t * spd * 0.35;
          _glowDot(ctx, cx + Math.cos(tipAng) * R * amp * 0.88, cy + Math.sin(tipAng) * R * amp * 0.88, 4, col, 1.0);
          break;
        }

        default:
          break;
      }

      ctx.restore();
    }

    // Glow central compuesto — mezcla los dos traits más pesados
    const sorted = [...traits].sort((a, b) => b.peso_visual - a.peso_visual);
    const dominante = sorted[0];
    const secundario = sorted[1];
    if (dominante) {
      ctx.save();
      // Capa base del dominante
      ctx.globalAlpha = 0.10;
      const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45);
      gc.addColorStop(0, dominante.color + "ff");
      gc.addColorStop(0.5, dominante.color + "66");
      gc.addColorStop(1, dominante.color + "00");
      ctx.fillStyle = gc;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, PI2); ctx.fill();
      // Capa secundaria desplazada si hay otro trait
      if (secundario) {
        ctx.globalAlpha = 0.06;
        const gc2 = ctx.createRadialGradient(cx - R * 0.08, cy + R * 0.06, 0, cx, cy, R * 0.35);
        gc2.addColorStop(0, secundario.color + "ff");
        gc2.addColorStop(1, secundario.color + "00");
        ctx.fillStyle = gc2;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, PI2); ctx.fill();
      }
      ctx.restore();
    }
  };
}

const IUM_ANIM: Record<string, AnimFn> = {
  pondus(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const pulse = Math.sin(t * 0.9) * 3;
    const r = 14 + pulse;
    for (let i = 3; i >= 1; i--) {
      ctx.beginPath(); ctx.arc(cx, cy, r + i * 8, 0, PI2);
      ctx.strokeStyle = `rgba(232,168,50,${0.05 * i})`; ctx.lineWidth = 6; ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const ang = (t * 0.3 + i * (PI2 / 5));
      const dist = 26 + Math.sin(t * 1.2 + i) * 5;
      const px = cx + Math.cos(ang) * dist, py = cy + Math.sin(ang) * dist;
      const sz = 2 + Math.sin(t + i) * 1;
      const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 2);
      g.addColorStop(0, "rgba(232,168,50,0.9)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, sz * 2, 0, PI2); ctx.fill();
      ctx.fillStyle = "rgba(232,168,50,0.95)"; ctx.beginPath(); ctx.arc(px, py, sz, 0, PI2); ctx.fill();
    }
    const gc = ctx.createRadialGradient(cx, cy - 1, 0, cx, cy, r);
    gc.addColorStop(0, "rgba(255,210,120,0.95)"); gc.addColorStop(0.6, "rgba(232,168,50,0.8)"); gc.addColorStop(1, "rgba(150,90,10,0.6)");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2); ctx.fill();
  },
  velox(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < 10; i++) {
      const ang = (t * 2.4 + i * (PI2 / 10));
      const len = 18 + Math.sin(t * 3 + i) * 10;
      const alpha = 0.18 + Math.sin(t * 2 + i * 0.5) * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 5, cy + Math.sin(ang) * 5);
      ctx.lineTo(cx + Math.cos(ang) * (len + 12), cy + Math.sin(ang) * (len + 12));
      ctx.strokeStyle = `rgba(94,207,239,${alpha})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const flicker = 0.8 + Math.sin(t * 8) * 0.2;
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
    gc.addColorStop(0, `rgba(200,240,255,${flicker})`); gc.addColorStop(0.5, "rgba(94,207,239,0.9)"); gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, PI2); ctx.fill();
    ctx.fillStyle = "rgba(220,250,255,0.98)"; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, PI2); ctx.fill();
  },
  fluxor(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let wave = 0; wave < 3; wave++) {
      const phase = t * 1.8 + wave * (PI2 / 3);
      const alpha = 0.15 + Math.sin(t + wave) * 0.08;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y = cy + Math.sin((x / W) * PI2 * 1.5 + phase) * 12 * (1 - Math.abs(x - cx) / (W * 0.7));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(100,200,230,${alpha})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const frac = ((t * 0.6 + i * 0.25) % 1);
      const px = frac * W;
      const py = cy + Math.sin(frac * PI2 * 1.5 + t * 1.8) * 12 * (1 - Math.abs(px - cx) / (W * 0.7));
      const a = Math.sin(frac * Math.PI) * 0.85;
      ctx.fillStyle = `rgba(94,207,239,${a})`; ctx.beginPath(); ctx.arc(px, py, 3, 0, PI2); ctx.fill();
    }
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    gc.addColorStop(0, "rgba(130,220,255,0.9)"); gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, PI2); ctx.fill();
  },
  fulgor(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const flicker = Math.abs(Math.sin(t * 6)) * 0.7 + 0.3;
    function bolt(x0: number, y0: number, x1: number, y1: number, segs: number, alpha: number) {
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let s = 1; s < segs; s++) {
        const frac = s / segs;
        ctx.lineTo(_lerp(x0, x1, frac) + _rand(-6, 6), _lerp(y0, y1, frac) + _rand(-6, 6));
      }
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = `rgba(255,230,80,${alpha * flicker})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const ang = i * (PI2 / 5) + t * 0.5;
      bolt(cx, cy, cx + Math.cos(ang) * 36, cy + Math.sin(ang) * 36, 5, 0.6);
    }
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
    gc.addColorStop(0, `rgba(255,240,100,${flicker * 0.9})`);
    gc.addColorStop(0.5, `rgba(255,180,30,${flicker * 0.5})`);
    gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, PI2); ctx.fill();
    ctx.fillStyle = `rgba(255,250,200,${flicker})`; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, PI2); ctx.fill();
  },
  patrix(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const rows = 3, cols = 5;
    const bw = W / cols, bh = H / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bit = Math.sin(t * 2 + r * 1.3 + c * 0.9) > 0;
        const px = c * bw + bw / 2, py = r * bh + bh / 2;
        const dist = Math.hypot(px - cx, py - cy);
        const alpha = bit ? (0.5 + Math.sin(t * 1.5 + dist * 0.04) * 0.4) : 0.04;
        ctx.fillStyle = `rgba(180,160,255,${alpha})`;
        ctx.font = `700 ${bh * 0.4}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(bit ? "1" : "0", px, py);
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, PI2);
    ctx.strokeStyle = "rgba(180,160,255,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "rgba(200,180,255,0.15)"; ctx.fill();
  },
  tensia(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const tension = 0.6 + Math.sin(t * 1.2) * 0.4;
    for (let i = 0; i < 50; i++) {
      const ang = (i / 50) * PI2 * 3 + t * 0.5;
      const r = 5 + i * 0.38 * tension;
      const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
      const a = 0.05 + i * 0.01;
      ctx.fillStyle = `rgba(220,120,255,${Math.min(a, 0.7)})`;
      ctx.beginPath(); ctx.arc(px, py, 1.2, 0, PI2); ctx.fill();
    }
    const pr = 7 + tension * 6;
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
    gc.addColorStop(0, "rgba(240,150,255,0.95)"); gc.addColorStop(0.6, "rgba(180,80,220,0.7)"); gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, pr + 4, 0, PI2); ctx.fill();
  },
  formix(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const entropy = Math.sin(t * 0.6) * 0.3 + 0.5;
    for (let s = 0; s < 3; s++) {
      const sides = 3 + s * 2;
      const r = 10 + s * 8;
      const rot = t * 0.3 * (s % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const ang = (i / sides) * PI2 + rot;
        const jitter = s === 2 ? _rand(-entropy * 4, entropy * 4) : 0;
        const px = cx + Math.cos(ang) * (r + jitter), py = cy + Math.sin(ang) * (r + jitter);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(160,180,200,${0.6 - s * 0.12})`; ctx.lineWidth = 1.5 - s * 0.3; ctx.stroke();
    }
    ctx.fillStyle = "rgba(170,190,210,0.8)"; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, PI2); ctx.fill();
  },
  voluntas(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const pupil = 0.3 + Math.abs(Math.sin(t * 0.7)) * 0.4;
    ctx.beginPath(); ctx.ellipse(cx, cy, 22, 12, 0, 0, PI2);
    ctx.strokeStyle = "rgba(120,230,180,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8 * pupil + 3);
    gc.addColorStop(0, "rgba(20,20,40,0.98)"); gc.addColorStop(0.8, "rgba(80,200,150,0.6)"); gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.ellipse(cx, cy, 8 * pupil + 3, 8 * pupil + 3, 0, 0, PI2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, 8 * pupil + 7, 8 * pupil + 7, 0, 0, PI2);
    ctx.strokeStyle = `rgba(120,230,180,${0.4 + pupil * 0.5})`; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const ang = t * 1.5 + i * (PI2 / 4);
      const dist = 28 + Math.sin(t * 2 + i) * 4;
      ctx.fillStyle = `rgba(120,230,180,${0.3 + Math.sin(t * 2 + i) * 0.2})`;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.6, 2, 0, PI2); ctx.fill();
    }
  },
  sensia(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let w = 0; w < 4; w++) {
      const phase = (t * 0.8 + w * 0.4) % 1;
      const wr = phase * 36;
      const a = (1 - phase) * 0.35;
      ctx.beginPath(); ctx.arc(cx, cy, wr, 0, PI2);
      ctx.strokeStyle = `rgba(120,230,180,${a})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const ang = i * (PI2 / 6) + t * 0.2;
      const len = 15 + Math.sin(t * 2 + i) * 5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      ctx.strokeStyle = `rgba(120,230,180,${0.5 + Math.sin(t * 2 + i) * 0.3})`; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(120,230,180,0.9)"; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len, 2, 0, PI2); ctx.fill();
    }
    ctx.fillStyle = "rgba(160,255,200,0.9)"; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, PI2); ctx.fill();
  },
  metus(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const phase = (t * 0.5) % 1;
    function morphShape(sides1: number, sides2: number, frac: number, r: number, alpha: number) {
      ctx.beginPath();
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const ang = (i / steps) * PI2;
        const a1 = sides1 > 2 ? 1 / Math.cos(Math.PI / sides1) * Math.cos(ang % (PI2 / sides1) - Math.PI / sides1) : 1;
        const a2 = sides2 > 2 ? 1 / Math.cos(Math.PI / sides2) * Math.cos(ang % (PI2 / sides2) - Math.PI / sides2) : 1;
        const rr = r * (_lerp(Math.min(1, a1), Math.min(1, a2), frac));
        const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(200,140,80,${alpha})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = `rgba(200,140,80,${alpha * 0.15})`; ctx.fill();
    }
    const seg = (phase % 0.33) / 0.33;
    const stage = Math.floor(phase / 0.33);
    const shapes: [number, number, number][] = [[100, 3, 0], [3, 4, 1], [4, 100, 2]];
    morphShape(shapes[stage % 3][0], shapes[stage % 3][1], _ease(seg), 16, 0.8);
    for (let i = 0; i < 3; i++) {
      const ang = t * 4 + i * (PI2 / 3);
      ctx.fillStyle = `rgba(255,180,80,${0.4 + Math.sin(t * 5 + i) * 0.4})`;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * 22, cy + Math.sin(ang) * 22, 1.5, 0, PI2); ctx.fill();
    }
  },
  ruina(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < 14; i++) {
      const seed = i * 137.5;
      const cycle = ((t * 0.4 + seed * 0.01) % 1);
      const angle = seed * 0.1;
      const dist = 6 + cycle * 38;
      const px = cx + Math.cos(angle) * dist + Math.sin(t * 0.3 + seed) * 5;
      const py = cy - 12 + cycle * 40 + Math.sin(t * 0.5 + seed * 0.3) * 3;
      const sz = 2 - cycle * 1.5;
      const a = Math.sin(cycle * Math.PI) * 0.8;
      if (sz > 0.2) { ctx.fillStyle = `rgba(200,80,80,${a})`; ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz); }
    }
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, PI2);
    ctx.strokeStyle = `rgba(200,80,80,${0.4 + Math.sin(t * 2) * 0.2})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "rgba(200,80,80,0.1)"; ctx.fill();
  },
  radiatio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const beamAng = -Math.PI / 2 + Math.sin(t * 0.7) * 0.4;
    for (let b = 0; b < 3; b++) {
      const bAng = beamAng + (b - 1) * 0.15;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(bAng) * 50, cy + Math.sin(bAng) * 50);
      grad.addColorStop(0, "rgba(255,200,50,0.95)");
      grad.addColorStop(0.4, "rgba(255,150,30,0.6)");
      grad.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(bAng) * 50, cy + Math.sin(bAng) * 50);
      ctx.strokeStyle = grad; ctx.lineWidth = 3 - b * 0.8; ctx.stroke();
    }
    for (let w = 0; w < 3; w++) {
      const phase = ((t * 1.5 + w * 0.4) % 1);
      const wr = phase * 28;
      const a = (1 - phase) * 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, wr, beamAng - 0.5, beamAng + 0.5);
      ctx.strokeStyle = `rgba(255,200,50,${a})`; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,230,100,0.95)"; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, PI2); ctx.fill();
  },
  receptio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < 7; i++) {
      const phase = ((t * 0.7 + i * 0.14) % 1);
      const inv = 1 - phase;
      const ang = i * (PI2 / 7) + t * 0.3;
      const dist = inv * 38;
      const a = 0.5 + phase * 0.4;
      ctx.fillStyle = `rgba(68,200,122,${a})`; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 2.5 * inv + 0.8, 0, PI2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, PI2);
    ctx.strokeStyle = "rgba(68,200,122,0.4)"; ctx.lineWidth = 1.5; ctx.stroke();
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 9);
    gc.addColorStop(0, "rgba(100,230,150,0.9)"); gc.addColorStop(1, "rgba(40,160,80,0.3)");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, PI2); ctx.fill();
  },
  retentio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    const charge = 0.5 + Math.sin(t * 0.8) * 0.4;
    const ang6 = [0, 60, 120, 180, 240, 300].map(d => d * Math.PI / 180);
    const r = 10 + charge * 6;
    ctx.beginPath();
    ang6.forEach((a, i) => { const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
    ctx.closePath();
    ctx.fillStyle = `rgba(100,220,160,${0.15 + charge * 0.2})`; ctx.fill();
    ctx.strokeStyle = `rgba(100,220,160,${0.7 + charge * 0.2})`; ctx.lineWidth = 1.5; ctx.stroke();
    for (let l = 1; l <= 2; l++) {
      const lr = r + l * 7;
      ctx.beginPath();
      ang6.forEach((a, i) => { const px = cx + Math.cos(a) * lr, py = cy + Math.sin(a) * lr; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
      ctx.closePath();
      ctx.strokeStyle = `rgba(100,220,160,${0.12 - l * 0.04})`; ctx.lineWidth = 1; ctx.stroke();
    }
  },
  transmissio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    ctx.beginPath(); ctx.moveTo(4, cy - 6); ctx.lineTo(W - 4, cy - 6);
    ctx.strokeStyle = "rgba(80,200,255,0.2)"; ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, cy - 10); ctx.lineTo(W - 4, cy - 10);
    ctx.strokeStyle = "rgba(80,200,255,0.3)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, cy + 10); ctx.lineTo(W - 4, cy + 10);
    ctx.strokeStyle = "rgba(80,200,255,0.3)"; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const frac = ((t * 0.8 + i * 0.33) % 1);
      const px = 4 + frac * (W - 8);
      const g = ctx.createRadialGradient(px, cy, 0, px, cy, 8);
      g.addColorStop(0, "rgba(80,200,255,0.95)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, cy, 10, 0, PI2); ctx.fill();
      ctx.fillStyle = "rgba(200,240,255,0.98)"; ctx.beginPath(); ctx.arc(px, cy, 2.5, 0, PI2); ctx.fill();
    }
  },
  resonantia(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    ctx.beginPath();
    for (let i = 0; i <= 180; i++) {
      const tt = (i / 180) * PI2 * 3;
      const px = cx + Math.cos(1.0 * tt + t * 0.5) * 18;
      const py = cy + Math.sin(1.33 * tt + t * 0.4) * 15;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "rgba(200,100,255,0.4)"; ctx.lineWidth = 1.5; ctx.stroke();
    const tt2 = t * 1.5;
    const px = cx + Math.cos(1.0 * tt2) * 18;
    const py = cy + Math.sin(1.33 * tt2) * 15;
    const gc = ctx.createRadialGradient(px, py, 0, px, py, 8);
    gc.addColorStop(0, "rgba(220,130,255,0.95)"); gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(px, py, 10, 0, PI2); ctx.fill();
    ctx.fillStyle = "rgba(240,180,255,0.98)"; ctx.beginPath(); ctx.arc(px, py, 3, 0, PI2); ctx.fill();
  },
  inductio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < 6; i++) {
      const ang = i * (Math.PI / 6) + t * 0.4;
      ctx.beginPath(); ctx.arc(cx, cy, 32, ang, ang + Math.PI * 0.25);
      ctx.strokeStyle = `rgba(255,140,80,${0.3 + i * 0.05})`; ctx.lineWidth = 1.2; ctx.stroke();
    }
    const triggered = Math.floor(t * 2) % 3;
    for (let i = 0; i < 3; i++) {
      const px = cx + (i - 1) * 20;
      const phase = i <= triggered ? 1 : 0;
      const a = 0.3 + phase * 0.6;
      const r = 4 + phase * 4;
      ctx.fillStyle = `rgba(255,140,80,${a})`; ctx.beginPath(); ctx.arc(px, cy, r, 0, PI2); ctx.fill();
      if (i < 2) {
        ctx.beginPath(); ctx.moveTo(px + r, cy); ctx.lineTo(px + 20 - r, cy);
        ctx.strokeStyle = `rgba(255,140,80,${phase * 0.8})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  },
  percolatio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let l = 0; l < 3; l++) {
      const y = cy - 14 + l * 14;
      const pore = 2.5 - l * 0.5;
      for (let x = 10; x < W - 10; x += 14 - l * 2) {
        const open = Math.sin(t * 0.8 + x * 0.1 + l * 1.5) > 0.2;
        ctx.fillStyle = open ? "rgba(130,220,150,0.3)" : "rgba(130,220,150,0.07)";
        ctx.fillRect(x - pore, y - pore, pore * 2, pore * 2);
        if (open) { ctx.fillStyle = "rgba(130,220,150,0.6)"; ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); }
      }
      ctx.beginPath(); ctx.moveTo(6, y + 2); ctx.lineTo(W - 6, y + 2);
      ctx.strokeStyle = "rgba(130,220,150,0.15)"; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const frac = ((t * 0.5 + i * 0.5) % 1);
      const py = 4 + frac * (H - 8);
      const a = 0.7 + Math.sin(frac * Math.PI) * 0.2;
      ctx.fillStyle = `rgba(130,220,150,${a})`; ctx.beginPath(); ctx.arc(cx + (i - 0.5) * 14, py, 3, 0, PI2); ctx.fill();
    }
  },
  dispersio(ctx, W, H, t) {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < 20; i++) {
      const seed = i * 137.5;
      const phase = ((t * 0.6 + seed * 0.01) % 1);
      const angle = seed * 0.1 + phase * 0.5;
      const dist = Math.sin(phase * Math.PI) * 36;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const a = Math.sin(phase * Math.PI) * 0.7;
      const sz = 1.2 + Math.sin(phase * Math.PI) * 1.5;
      ctx.fillStyle = `rgba(160,210,255,${a})`; ctx.beginPath(); ctx.arc(px, py, sz, 0, PI2); ctx.fill();
    }
    const p = Math.sin(t * 1.2) * 0.3 + 0.7;
    const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10 * p);
    gc.addColorStop(0, "rgba(160,210,255,0.9)"); gc.addColorStop(1, "transparent");
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, 14 * p, 0, PI2); ctx.fill();
  },
};

// IUM_ANIM_KEY eliminado — las animaciones son ahora procedurales via animTraits de partículas

// ─── Componente canvas animado para el panel de IUMs ─────────────────────────

// ─── Canvas unificado — todas las animaciones IUM en un solo canvas compartido ─
// Fases internas:
//   "idle"   → cada nodo anima en su posición original
//   "moving" → cada nodo viaja hacia el centro (easing cubic), animFn sigue centrada en él
//   "final"  → todos convergieron; animación de explosión + mezcla de efectos en el centro

interface IumNodeAnim {
  nombre: string;
  cx: number;
  cy: number;
  delay: number;
  color: string;
  animTraits: AnimTrait[];
  composicion: { particula: string; cantidad: number }[];
  animConfig?: AnimConfig | null;
}

const _easeInOut = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

function IumMergedCanvas({
  nodes,
  width,
  height,
  fase,
  reaccionesDisponibles,
}: {
  nodes: IumNodeAnim[];
  width: number;
  height: number;
  fase: "idle" | "combinando" | "explosion" | "efecto" | null;
  reaccionesDisponibles: ReaccionVisual[];
}) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number>(0);
  // Todos los timestamps en ms reales (performance.now)
  const originRef     = useRef<number>(0);          // cuando se montó/reseteó
  const nodeStartRef  = useRef<number[]>([]);        // ms en que cada nodo se activó
  const moveStartRef  = useRef<number | null>(null); // ms en que empezó moving
  const finalStartRef = useRef<number | null>(null); // ms en que empezó final

  const MOVE_MS    = 2000; // duración del viaje al centro
  const FINAL_WAIT = 0;    // sin pausa — la superposición arranca al llegar

  const nodesKey = nodes.map(n => `${n.nombre}:${Math.round(n.cx)},${Math.round(n.cy)}:${n.animTraits.length}`).join("|");

  // Reset completo al cambiar composición
  useEffect(() => {
    const now = performance.now();
    originRef.current    = now;
    moveStartRef.current = null;
    finalStartRef.current = null;
    // Cada nodo se activa en su momento según delay (ms)
    nodeStartRef.current = nodes.map(n => now + n.delay * 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey]);

  // Capturar el momento en que la fase externa cambia a "combinando"
  const faseRef = useRef(fase);
  useEffect(() => {
    faseRef.current = fase;
    if (fase === "combinando") {
      // Iniciar moving si no está ya en curso
      if (moveStartRef.current === null) {
        moveStartRef.current  = performance.now();
        finalStartRef.current = null;
      }
    } else if (fase === null || fase === "idle") {
      moveStartRef.current  = null;
      finalStartRef.current = null;
    }
  }, [fase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(width  * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const destX = width  / 2;
    const destY = height / 2;

    function frame() {
      const now    = performance.now();
      ctx!.clearRect(0, 0, width, height);

      const mStart = moveStartRef.current;
      const fStart = finalStartRef.current;

      // ── FASE FINAL: animación procedural combinada de TODOS los traits ───────
      if (fStart !== null && now >= fStart) {
        const ftS = (now - fStart) / 1000;
        const fadeIn = Math.min(1, ftS / 0.4);

        // Recolectar todos los traits de todos los IUMs (con su cantidad)
        const allTraits: AnimTrait[] = nodes.flatMap(n => n.animTraits ?? []);

        // Calcular reacciones activas: pares de partículas presentes en cualquier nodo seleccionado
        const nombresParticulas = new Set<string>(
          nodes.flatMap(n => n.composicion.map(c => c.particula))
        );
        const reaccionesActivas = reaccionesDisponibles.filter(r =>
          nombresParticulas.has(r.particula_a) && nombresParticulas.has(r.particula_b)
        );
        // Filtrar por modificadores: suprimir_caos ya no aplica aquí, pero escala_velocidad sí
        const reaccionesRender = reaccionesActivas.map(r => {
          if (r.modificadores?.escala_velocidad) {
            return {
              ...r,
              efecto: { ...r.efecto, velocidad: r.efecto.velocidad * r.modificadores.escala_velocidad },
            };
          }
          return r;
        });

        if (allTraits.length > 0) {
          // Recoger config del primer nodo que tenga animConfig (todos deberían tenerlo)
          // Combinamos: si hay varios IUMs, promediar escala y velocidad
          const configs = nodes.map(n => n.animConfig).filter(Boolean) as AnimConfig[];
          const cfg: AnimConfig | null = configs.length > 0 ? {
            color_primario: configs[0].color_primario,
            color_blend:    configs.reduce((s, c) => s + c.color_blend,    0) / configs.length,
            escala:         configs.reduce((s, c) => s + c.escala,         0) / configs.length,
            velocidad_mult: configs.reduce((s, c) => s + c.velocidad_mult, 0) / configs.length,
            campo:          configs[0].campo,
            aura_color:     configs[0].aura_color,
            aura_opacidad:  configs.reduce((s, c) => s + c.aura_opacidad, 0) / configs.length,
            aura_radio:     configs.reduce((s, c) => s + c.aura_radio,    0) / configs.length,
            campo_pulso_hz: configs.reduce((s, c) => s + c.campo_pulso_hz,0) / configs.length,
            campo_rotacion: configs.reduce((s, c) => s + c.campo_rotacion, 0) / configs.length,
          } : null;

          // Modificar traits con velocidad_mult de la config
          const scaledTraits: AnimTrait[] = cfg
            ? allTraits.map(t => ({ ...t, velocidad: t.velocidad * cfg.velocidad_mult }))
            : allTraits;

          const S = 560 * (cfg?.escala ?? 1);
          const animFn = buildTraitAnimFn(scaledTraits);

          // ── Aura de fondo — el halo característico del IUM ──────────────────
          if (cfg?.aura_color && cfg.aura_opacidad > 0) {
            const auraR = cfg.aura_radio * (cfg.escala ?? 1);
            // Pulso del campo si campo_pulso_hz > 0
            const pulsoMult = cfg.campo_pulso_hz > 0
              ? 1 + 0.18 * Math.sin(ftS * cfg.campo_pulso_hz * Math.PI * 2)
              : 1;
            const grad = ctx!.createRadialGradient(destX, destY, 0, destX, destY, auraR * pulsoMult);
            grad.addColorStop(0,   cfg.aura_color + Math.round(cfg.aura_opacidad * 255 * 0.85).toString(16).padStart(2, "0"));
            grad.addColorStop(0.5, cfg.aura_color + Math.round(cfg.aura_opacidad * 255 * 0.40).toString(16).padStart(2, "0"));
            grad.addColorStop(1,   cfg.aura_color + "00");
            ctx!.save();
            ctx!.globalAlpha = fadeIn;
            ctx!.fillStyle = grad;
            ctx!.beginPath();
            ctx!.arc(destX, destY, auraR * pulsoMult, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.restore();
          }

          // ── Render principal con rotación del campo ──────────────────────────
          ctx!.save();
          ctx!.globalAlpha = fadeIn;
          ctx!.translate(destX, destY);
          // Rotación del campo (grados/s → radianes)
          if (cfg?.campo_rotacion) {
            ctx!.rotate((ftS * cfg.campo_rotacion * Math.PI) / 180);
          }
          ctx!.translate(-S / 2, -S / 2);
          animFn(ctx!, S, S, ftS);
          // Reacciones: fade-in tardío
          if (reaccionesRender.length > 0) {
            const reacFade = Math.min(1, Math.max(0, (ftS - 0.5) / 0.6));
            if (reacFade > 0) {
              ctx!.globalAlpha = fadeIn * reacFade;
              renderReacciones(ctx!, S, S, ftS, reaccionesRender, reacFade);
            }
          }
          ctx!.restore();
        }

        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // ── FASE MOVING: nodos viajan al centro ──────────────────────────────────
      if (mStart !== null) {
        const elapsed = now - mStart;

        // ¿Todos llegaron? Activar final tras pausa
        const allDone = nodes.every((n, i) => {
          const nodeElapsed = elapsed + Math.max(0, (nodeStartRef.current[i] - mStart));
          return nodeElapsed / MOVE_MS >= 1;
        });
        if (allDone && finalStartRef.current === null) {
          const maxNodeElapsed = nodes.reduce((mx, _, i) => {
            const ne = elapsed + Math.max(0, (nodeStartRef.current[i] - mStart));
            return Math.max(mx, ne);
          }, 0);
          if (maxNodeElapsed >= MOVE_MS) {
            finalStartRef.current = now + FINAL_WAIT;
          }
        }

        nodes.forEach((node, i) => {
          if (!node.animTraits?.length) return;
          const animFn = buildTraitAnimFn(node.animTraits);

          // El nodo con mayor delay (más alejado del núcleo) lleva más tiempo activo,
          // así que empieza a moverse antes
          const maxDelay  = Math.max(...nodes.map(n => n.delay));
          const nodeOffset = (maxDelay - node.delay) * 1000; // ms de retraso de inicio
          const nodeElapsed = Math.max(0, elapsed - nodeOffset);
          const raw  = Math.min(1, nodeElapsed / MOVE_MS);
          const prog = _easeInOut(raw);

          const curX  = node.cx + (destX - node.cx) * prog;
          const curY  = node.cy + (destY - node.cy) * prog;
          const alpha = raw < 0.85 ? 1 : 1 - (raw - 0.85) / 0.15;

          const localT = Math.max(0, (now - nodeStartRef.current[i])) / 1000;
          const cfg = node.animConfig;
          const nodeS = 180 * (cfg?.escala ?? 1);
          const scaledT = cfg?.velocidad_mult ? localT * cfg.velocidad_mult : localT;
          ctx!.save();
          ctx!.globalAlpha = alpha;
          // Aura del nodo mientras viaja
          if (cfg?.aura_color && cfg.aura_opacidad > 0) {
            const gr = ctx!.createRadialGradient(curX, curY, 0, curX, curY, nodeS * 0.55);
            gr.addColorStop(0,   cfg.aura_color + Math.round(cfg.aura_opacidad * 200).toString(16).padStart(2,"0"));
            gr.addColorStop(1,   cfg.aura_color + "00");
            ctx!.fillStyle = gr;
            ctx!.beginPath();
            ctx!.arc(curX, curY, nodeS * 0.55, 0, Math.PI * 2);
            ctx!.fill();
          }
          ctx!.translate(curX - nodeS / 2, curY - nodeS / 2);
          animFn(ctx!, nodeS, nodeS, scaledT);
          ctx!.restore();
        });

        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // ── FASE IDLE: el canvas no pinta nada — IumVisual ya muestra la animación en cada nodo ──

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, nodesKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AnimConfig {
  color_primario: string;
  color_blend: number;
  escala: number;
  velocidad_mult: number;
  campo: "circular" | "lineal" | "diagonal" | "espiral" | "caos";
  aura_color?: string | null;
  aura_opacidad: number;
  aura_radio: number;
  campo_pulso_hz: number;
  campo_rotacion: number;
}

interface IumCatalogo {
  id: string;
  orden: number;
  nombre: string;
  detalle: string;
  extra?: string | null;
  composicion: { particula: string; cantidad: number }[];
  geometria: GeometriaIum | undefined;
  animTraits: AnimTrait[];
  animConfig?: AnimConfig | null;
}

interface IumSalidaFuncional {
  id: string;
  ium_id: string;
  clave: string;
  nombre: string;
  tipo_salida: string;
  descripcion: string;
  formula?: string | null;
  estado: string;
  es_principal: boolean;
}

interface ConocimientoIum {
  ium_id: string;
  funcion_revelada: boolean;
  veces_en_reaccion_exitosa: number;
}

interface EteriumJugador {
  saldo: number;
  saldo_maximo: number;
}

interface ComponenteLab {
  uid: string;
  ium_id: string;
  ium_nombre: string;
  posicion: string;
  x: number;
  y: number;
}

interface EnlaceLab {
  uid: string;
  origen_uid: string;
  destino_uid: string;
  tipo_union: string;
}

interface OrisCandidato {
  oris_id?: string;
  oris?: string;
  rol?: string;
  prioridad?: number | null;
  estado_candidato?: string;
}

interface ProcesoCandidato {
  proceso_id?: string;
  proceso?: string;
  conjuracion_id?: string;
  conjuracion?: string;
  regla_clave?: string;
  estado_fundamento?: string;
  patrones_obligatorios?: number;
  patrones_coincidentes?: number;
  patrones_totales?: number;
  completo?: boolean;
  contexto_cubre_ley?: boolean;
  es_principal?: boolean;
  oris?: OrisCandidato[];
}

// Forma real devuelta por simular_organizacion_ium_v1
interface ResultadoSimulador {
  estado?: string;                       // "simulado" | "entrada_invalida"
  motivo?: string;                       // solo si entrada_invalida
  invalidos?: { ium_id?: string; motivo?: string }[];
  componentes?: unknown[];
  enlaces?: unknown[];
  salidas?: string[];
  procesos_candidatos?: ProcesoCandidato[];
  cantidad_procesos_candidatos?: number;
  proceso_principal?: string | null;
  conjuracion_principal?: string | null;
  desempate?: "patrones" | "contexto" | null;
  ambiguo?: boolean;
  [key: string]: unknown;
}


// Efecto visual por Oris — viene de oris_efecto_visual en Supabase
interface OrisEfectoVisual {
  oris_id: string;
  nombre_efecto: string;
  particula_forma: "circulo" | "rombo" | "triangulo" | "anillo" | "estrella" | "cruz";
  particula_color_hex: string | null;
  particula_color_secundario: string | null;
  particula_cantidad: number;
  particula_radio: number;
  movimiento: "convergente" | "divergente" | "orbital" | "oscilante" | "zigzag" | "espiral";
  velocidad_base: number;
  radio_orbita: number | null;
  glow_radio: number;
  glow_pulsa: boolean;
  glow_color_hex: string | null;
  tiene_estela: boolean;
  tiene_rayos: boolean;
  tiene_anillo_expansivo: boolean;
}

interface TopologiaOris {
  id: string;
  nombre: string;
  descripcion: string;
  capacidad_visual: string;
  activo: boolean;
  grafico_ascii: string;
  uniones: TopologiaUnion[];
}

interface TopologiaUnion {
  topologia_id: string;
  origen_posicion: string;
  destino_posicion: string;
  tipo_union: string;
  orden: number;
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

const POSICIONES = ["A", "B", "C", "D", "N", "M", "X", "Y", "Z"];
// Debe coincidir con tipos_union_ium_v1 (hoy solo "dirigida" tiene patrones que produzcan candidatos)
const TIPOS_UNION = ["dirigida", "reciproca", "acoplamiento"];

const NOMBRE_UNION: Record<string, string> = {
  dirigida: "Dirigida",
  reciproca: "Recíproca",
  acoplamiento: "Acoplamiento",
};

const MOTIVOS_INVALIDO: Record<string, string> = {
  ium_no_existe: "no es una pieza conocida",
  ium_sin_salida_funcional_principal: "todavía no sabe cómo participar en una reacción",
};

// Costos de Eterium por tipo de resultado (deben coincidir con la función en Supabase)
const COSTO_ETERIUM: Record<string, number> = {
  sin_resonancia: 1,
  resonancia_parcial: 2,
  reaccion_inestable: 5,
  proceso_exitoso: 10,
};

// Tamaño del nodo
const NODE_R = 44;      // radio del círculo de fondo
const LABEL_H = 34;     // espacio de texto debajo del visual
const VIS_SIZE = 72;    // tamaño del IumVisual
const VIS_R = VIS_SIZE / 2;

// Margen entre nodos al hacer auto-layout al agregar
const AUTO_COLS = 3;
const AUTO_STEP_X = 160;
const AUTO_STEP_Y = 180;
const AUTO_ORIGIN_X = 80;
const AUTO_ORIGIN_Y = 80;

let uidCounter = 0;
const genUID = () => `lab_${++uidCounter}_${Date.now()}`;

// ─── Hooks de datos ───────────────────────────────────────────────────────────

function useIumsCatalogo() {
  const [iums, setIums] = useState<IumCatalogo[]>([]);
  const [reacciones, setReacciones] = useState<ReaccionVisual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const { data: baseData } = await supabase
        .from("iums")
        .select("id, orden, nombre, detalle, extra")
        .order("orden");

      const { data: pRelData } = await supabase
        .from("iums_particulas")
        .select("ium_id, particula_id, cantidad");

      const { data: partData } = await supabase
        .from("particulas")
        .select("id, nombre, anim_traits");

      const { data: geoData } = await supabase
        .from("v_iums_geometria_canonica_v1")
        .select("ium_id, geometria");

      const { data: reacData } = await supabase
        .from("reacciones_visuales_particulas")
        .select("particula_a, particula_b, nombre_reaccion, efecto, modificadores");

      const { data: configData } = await supabase
        .from("iums_anim_config")
        .select("ium_id, color_primario, color_blend, escala, velocidad_mult, campo, aura_color, aura_opacidad, aura_radio, campo_pulso_hz, campo_rotacion");

      if (!vivo) return;

      // Mapa id → { nombre, anim_traits }
      const partMap = new Map<string, { nombre: string; traits: AnimTrait | null }>(
        (partData ?? []).map((p: { id: string; nombre: string; anim_traits: AnimTrait | null }) => [
          p.id, { nombre: p.nombre, traits: p.anim_traits ?? null }
        ]),
      );

      const composPorIum = new Map<string, { particula: string; cantidad: number }[]>();
      const traitsPorIum = new Map<string, AnimTrait[]>();

      for (const fila of pRelData ?? []) {
        const part = partMap.get(fila.particula_id);
        if (!part) continue;
        // composicion
        const arr = composPorIum.get(fila.ium_id) ?? [];
        arr.push({ particula: part.nombre, cantidad: fila.cantidad });
        composPorIum.set(fila.ium_id, arr);
        // traits
        if (part.traits) {
          const tarr = traitsPorIum.get(fila.ium_id) ?? [];
          tarr.push({ ...part.traits, cantidad: fila.cantidad });
          traitsPorIum.set(fila.ium_id, tarr);
        }
      }

      const geoPorIum = new Map<string, GeometriaIum>(
        (geoData ?? []).map((g: { ium_id: string; geometria: string }) => [
          g.ium_id,
          g.geometria as GeometriaIum,
        ]),
      );

      const configPorIum = new Map<string, AnimConfig>(
        (configData ?? []).map((c: AnimConfig & { ium_id: string }) => [c.ium_id, c])
      );

      const result: IumCatalogo[] = (baseData ?? []).map((i) => ({
        id: i.id,
        orden: i.orden,
        nombre: i.nombre,
        detalle: i.detalle,
        extra: i.extra,
        composicion: composPorIum.get(i.id) ?? [],
        geometria: geoPorIum.get(i.id),
        animTraits: traitsPorIum.get(i.id) ?? [],
        animConfig: configPorIum.get(i.id) ?? null,
      }));

      setIums(result);
      setReacciones((reacData ?? []) as ReaccionVisual[]);
      setLoading(false);
    }
    cargar();
    return () => { vivo = false; };
  }, []);

  return { iums, reacciones, loading };
}


function useTopologias() {
  const [topologias, setTopologias] = useState<TopologiaOris[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const [{ data: topoData }, { data: unionData }] = await Promise.all([
        supabase
          .from("topologias_oris")
          .select("id, nombre, descripcion, capacidad_visual, activo, grafico_ascii")
          .order("nombre"),
        supabase
          .from("topologia_uniones")
          .select("topologia_id, origen_posicion, destino_posicion, tipo_union, orden")
          .order("orden"),
      ]);
      if (!vivo) return;
      const unionesPorTopo = new Map<string, TopologiaUnion[]>();
      for (const u of unionData ?? []) {
        const arr = unionesPorTopo.get(u.topologia_id) ?? [];
        arr.push(u);
        unionesPorTopo.set(u.topologia_id, arr);
      }
      const result: TopologiaOris[] = (topoData ?? []).map((t) => ({
        ...t,
        uniones: unionesPorTopo.get(t.id) ?? [],
      }));
      setTopologias(result);
      setLoading(false);
    }
    cargar();
    return () => { vivo = false; };
  }, []);

  return { topologias, loading };
}

function useIumSalidas(iumIds: string[]) {
  const [salidas, setSalidas] = useState<IumSalidaFuncional[]>([]);
  useEffect(() => {
    if (!iumIds.length) { setSalidas([]); return; }
    supabase
      .from("ium_salidas_funcionales")
      .select("id, ium_id, clave, nombre, tipo_salida, descripcion, formula, estado, es_principal")
      .in("ium_id", iumIds)
      .order("es_principal", { ascending: false })
      .then(({ data }) => setSalidas(data ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(iumIds.slice().sort())]);
  return salidas;
}

// ─── Hook: conocimiento del jugador sobre los IUMs ─────────────────────────

function useConocimientoIums(perfilId: string | null) {
  const [conocimiento, setConocimiento] = useState<Map<string, ConocimientoIum>>(new Map());

  const cargar = useCallback(async () => {
    if (!perfilId) return;
    const { data } = await supabase
      .from("simulador_conocimiento_ium")
      .select("ium_id, funcion_revelada, veces_en_reaccion_exitosa")
      .eq("perfil_id", perfilId);
    if (data) {
      const mapa = new Map<string, ConocimientoIum>();
      for (const fila of data) mapa.set(fila.ium_id, fila);
      setConocimiento(mapa);
    }
  }, [perfilId]);

  useEffect(() => { cargar(); }, [cargar]);

  return { conocimiento, setConocimiento, recargar: cargar };
}

// ─── Hook: procesos/conjuraciones descubiertos (persiste en Supabase) ─────────

function useProcesosDescubiertos(perfilId: string | null) {
  const [procesos, setProcesos] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    if (!perfilId) return;
    // Leer del log los intentos exitosos con conjuracion_id, join a conjuraciones para obtener el nombre
    const { data } = await supabase
      .from("simulador_intentos_log")
      .select("conjuracion_id, conjuraciones(nombre)")
      .eq("perfil_id", perfilId)
      .eq("resultado_tipo", "proceso_exitoso")
      .not("conjuracion_id", "is", null);
    if (data) {
      const nombres = new Set<string>();
      for (const fila of data) {
        const nombre = (fila.conjuraciones as { nombre?: string } | null)?.nombre;
        if (nombre) nombres.add(nombre);
      }
      setProcesos(nombres);
    }
  }, [perfilId]);

  useEffect(() => { cargar(); }, [cargar]);

  return { procesos, setProcesos, recargar: cargar };
}

// ─── Hook: saldo de Eterium del jugador ────────────────────────────────────

function useEteriumJugador(perfilId: string | null) {
  const [eterium, setEterium] = useState<EteriumJugador>({ saldo: 100, saldo_maximo: 100 });

  const cargar = useCallback(async () => {
    if (!perfilId) return;
    const { data } = await supabase
      .from("simulador_eterium_jugador")
      .select("saldo, saldo_maximo")
      .eq("perfil_id", perfilId)
      .maybeSingle();
    if (data) setEterium(data);
  }, [perfilId]);

  useEffect(() => { cargar(); }, [cargar]);

  return { eterium, recargar: cargar };
}

// ─── Hook: rango de IUMs reales por topología (desde v_item_editor_configuraciones_v1) ─

interface TopoRange {
  minIumes: number; // mínimo de IUMs en cualquier config de esa topología
  maxIumes: number; // máximo de IUMs → hasta aquí puede expandirse con "+"
}

function useTopoConfigRange() {
  const [rangos, setRangos] = useState<Map<string, TopoRange>>(new Map());

  useEffect(() => {
    let vivo = true;
    supabase
      .from("v_item_editor_configuraciones_v1")
      .select("topologia_id, ium_count")
      .not("topologia_id", "is", null)
      .then(({ data }) => {
        if (!vivo || !data) return;
        const map = new Map<string, { min: number; max: number }>();
        for (const row of data) {
          const tid = row.topologia_id as string;
          const n   = Number(row.ium_count ?? 0);
          if (!n) continue;
          const prev = map.get(tid) ?? { min: n, max: n };
          map.set(tid, { min: Math.min(prev.min, n), max: Math.max(prev.max, n) });
        }
        const result = new Map<string, TopoRange>();
        for (const [tid, { min, max }] of map) {
          result.set(tid, { minIumes: min, maxIumes: max });
        }
        setRangos(result);
      });
    return () => { vivo = false; };
  }, []);

  return rangos;
}

// ─── Hook: rol del jugador (admin / user) ─────────────────────────────────────

function useRolJugador(perfilId: string | null) {
  const [esAdmin, setEsAdmin] = useState(false);
  useEffect(() => {
    if (!perfilId) return;
    supabase
      .from("perfiles")
      .select("rol")
      .eq("id", perfilId)
      .maybeSingle()
      .then(({ data }) => { if (data?.rol === "admin") setEsAdmin(true); });
  }, [perfilId]);
  return esAdmin;
}

// ─── Tipos para modo Admin ─────────────────────────────────────────────────────

interface ConfigAdmin {
  configuracion_id: string;
  proceso_id?: string;
  proceso?: string;
  conjuracion_id?: string;
  conjuracion?: string;
  oris_id?: string;
  oris?: string;
  nivel_dominio?: string | null;
  configuracion: string;
  topologia_id: string | null;
  topologia: string | null;
  n_iums: number;
  estado: string;
  descripcion: string | null;
}

interface ConfigAdminDetalle {
  componentes: { comp_id: string; ium_id: string; posicion: string; orden: number }[];
  enlaces: { origen_posicion: string; destino_posicion: string; tipo_union: string; orden: number }[];
}

// ─── Hook: configuraciones para admin ─────────────────────────────────────────

function useConfiguracionesAdmin(esAdmin: boolean) {
  const [configs, setConfigs] = useState<ConfigAdmin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!esAdmin) return;
    setLoading(true);

    async function cargar() {
      // 1. Obtener IDs de conjuraciones publicadas
      const { data: conjPublicadas } = await supabase
        .from("conjuraciones")
        .select("id")
        .eq("publicado", true);

      const idsPublicados = new Set((conjPublicadas ?? []).map((c: { id: string }) => c.id));

      // 2. Cargar todas las configs y filtrar solo las con conjuración publicada
      const { data } = await supabase
        .from("v_simulador_configs_admin_v1")
        .select("configuracion_id, conjuracion_id, conjuracion, oris_id, oris, nivel_dominio, proceso_id, proceso, configuracion, topologia_id, topologia, n_iums, estado, descripcion")
        .order("conjuracion");

      const filtradas = (data ?? []).filter(
        (cfg: ConfigAdmin) => cfg.conjuracion_id && idsPublicados.has(cfg.conjuracion_id),
      );

      setConfigs(filtradas as ConfigAdmin[]);
      setLoading(false);
    }

    cargar();
  }, [esAdmin]);

  return { configs, loading };
}

// ─── Helper: cargar detalle de una config (componentes + enlaces) ──────────────

async function cargarDetalleConfig(configId: string): Promise<ConfigAdminDetalle> {
  const [{ data: comps }, { data: enls }] = await Promise.all([
    supabase
      .from("proceso_configuracion_ium_componentes_v1")
      .select("id, ium_id, posicion, orden")
      .eq("configuracion_id", configId)
      .order("orden"),
    supabase
      .from("proceso_configuracion_ium_enlaces_v1")
      .select("origen_componente_id, destino_componente_id, tipo_union, orden")
      .eq("configuracion_id", configId)
      .order("orden"),
  ]);

  const compMap = new Map((comps ?? []).map((c: { id: string; ium_id: string; posicion: string; orden: number }) => [c.id, c]));

  const enlaces = (enls ?? []).flatMap((e: { origen_componente_id: string; destino_componente_id: string; tipo_union: string; orden: number }) => {
    const or  = compMap.get(e.origen_componente_id);
    const dst = compMap.get(e.destino_componente_id);
    if (!or || !dst) return [];
    return [{ origen_posicion: or.posicion, destino_posicion: dst.posicion, tipo_union: e.tipo_union, orden: e.orden }];
  });

  return {
    componentes: (comps ?? []).map((c: { id: string; ium_id: string; posicion: string; orden: number }) => ({ comp_id: c.id, ium_id: c.ium_id, posicion: c.posicion, orden: c.orden })),
    enlaces,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ARROW_COLOR = "color-mix(in srgb, var(--primary) 55%, transparent)";
const ARROW_ID = "sim-arrow-head";

function autoPos(index: number): { x: number; y: number } {
  const col = index % AUTO_COLS;
  const row = Math.floor(index / AUTO_COLS);
  return {
    x: AUTO_ORIGIN_X + col * AUTO_STEP_X,
    y: AUTO_ORIGIN_Y + row * AUTO_STEP_Y,
  };
}


// ─── Sistema de slots por topología ──────────────────────────────────────────
//
// Cada topología tiene sus posiciones canónicas en un espacio de 700×700 px.
// "nucleo" siempre al centro. El resto se distribuye alrededor.
// Coordenadas SVG (x=0..700, y=0..700).

const CANVAS_W = 700;
const CANVAS_H = 700;
const SLOT_SNAP_RADIUS = 80; // px SVG: si el nodo cae dentro, salta al slot

type SlotLayout = Record<string, { x: number; y: number }>;

const LAYOUT_2: SlotLayout = {
  a:      { x: 200, y: 350 },
  nucleo: { x: 500, y: 350 },
};
const LAYOUT_3_CHAIN: SlotLayout = {
  a:      { x: 130, y: 350 },
  nucleo: { x: 370, y: 350 },
  b:      { x: 610, y: 350 },
};
const LAYOUT_3_CONVERGE: SlotLayout = {
  a:      { x: 170, y: 200 },
  b:      { x: 530, y: 200 },
  nucleo: { x: 350, y: 440 },
};
const LAYOUT_4_CONVERGE: SlotLayout = {
  a:      { x: 155, y: 190 },
  b:      { x: 545, y: 190 },
  nucleo: { x: 350, y: 360 },
  c:      { x: 350, y: 560 },
};
const LAYOUT_4_STRUCT: SlotLayout = {
  a:      { x: 170, y: 210 },
  b:      { x: 530, y: 210 },
  nucleo: { x: 350, y: 410 },
  c:      { x: 580, y: 550 },
};
const LAYOUT_5_BRANCH: SlotLayout = {
  a:      { x: 130, y: 350 },
  nucleo: { x: 350, y: 350 },
  b:      { x: 570, y: 200 },
  c:      { x: 570, y: 480 },
  d:      { x: 570, y: 560 },
};
const LAYOUT_5_CYCLE: SlotLayout = {
  a:      { x: 190, y: 200 },
  b:      { x: 510, y: 200 },
  nucleo: { x: 510, y: 450 },
  c:      { x: 190, y: 450 },
  d:      { x: 510, y: 580 },
};
const LAYOUT_5_CHAIN: SlotLayout = {
  a:      { x: 100, y: 350 },
  nucleo: { x: 280, y: 350 },
  b:      { x: 460, y: 200 },
  d:      { x: 460, y: 480 },
  c:      { x: 640, y: 480 },
};
const LAYOUT_5_FEED: SlotLayout = {
  a:      { x: 190, y: 200 },
  b:      { x: 510, y: 200 },
  nucleo: { x: 510, y: 420 },
  c:      { x: 190, y: 420 },
  d:      { x: 640, y: 420 },
};

// Mapa nombre→layout. Las claves deben coincidir exactamente con t.nombre en Supabase.
const TOPO_LAYOUTS: Record<string, SlotLayout> = {
  "Convergencia nuclear":       LAYOUT_3_CONVERGE,
  "Convergencia con resolución": LAYOUT_4_CONVERGE,
  "Estructural":                LAYOUT_4_STRUCT,
  "Ramificación":               LAYOUT_5_BRANCH,
  "Ciclo con salida":           LAYOUT_5_CYCLE,
  "Cadena dinámica":            LAYOUT_5_CHAIN,
  "Retroalimentación":          LAYOUT_5_FEED,
};

// Slots mínimos que se muestran al seleccionar cada topología.
// Se basan en el MÍNIMO REAL de IUMs que usa cualquier proceso registrado en Supabase
// (v_item_editor_configuraciones_v1 → ium_count). Si no hay configs, se muestra el
// mínimo lógico de 2 slots para que el usuario descubra la estructura por sí mismo.
//
// Fuente (consultada contra Supabase ftdxthnizdosaaavjhah):
//   Convergencia nuclear     → min=3  (configs: 4)
//   Cadena dinámica          → min=3  (configs: 1, usa a/nucleo/b)
//   Estructural              → min=4  (configs: 3)
//   Ramificación             → min=5  (configs: 1 — topología completa)
//   Ciclo con salida         → sin configs → mínimo lógico 2
//   Convergencia c/ resoluc. → sin configs → mínimo lógico 2
//   Retroalimentación        → sin configs → mínimo lógico 2
const TOPO_SLOTS_INICIALES: Record<string, string[]> = {
  // 3 IUMs mínimos — se muestran los primeros 3 slots en el layout canónico
  "Convergencia nuclear":        ["a", "b", "nucleo"],
  "Cadena dinámica":             ["a", "nucleo", "b"],
  // 4 IUMs mínimos
  "Estructural":                 ["a", "b", "nucleo", "c"],
  // 5 IUMs mínimos — topología completa desde el inicio
  "Ramificación":                ["a", "nucleo", "b", "c", "d"],
  // Sin configs en Supabase → mínimo lógico (2 slots para exploración)
  "Ciclo con salida":            ["a", "nucleo"],
  "Convergencia con resolución": ["a", "nucleo"],
  "Retroalimentación":           ["a", "nucleo"],
};

// Normaliza nombre de posición canónica → clave del layout
const canonKey = (p: string) => p.toLowerCase().trim();

// Devuelve las coordenadas de todos los slots de una topología
function getSlotsActivos(topo: TopologiaOris): SlotLayout {
  const layout = TOPO_LAYOUTS[topo.nombre];
  if (!layout) return {};
  return layout;
}

// Dado (x,y) y los slots activos, devuelve el slot más cercano si está dentro del radio
function slotMasCercano(
  x: number, y: number, slots: SlotLayout, radioSVG: number,
): { key: string; x: number; y: number } | null {
  let best: { key: string; x: number; y: number; dist: number } | null = null;
  for (const [key, pos] of Object.entries(slots)) {
    const dist = Math.hypot(x - pos.x, y - pos.y);
    if (dist <= radioSVG && (!best || dist < best.dist)) {
      best = { key, x: pos.x, y: pos.y, dist };
    }
  }
  return best;
}

// Devuelve los slots NO visibles que están directamente conectados (vía uniones)
// a al menos un slot visible. Son las posiciones donde va el botón "+".
function getFrontierSlots(
  topo: TopologiaOris,
  slotsVisibles: Set<string>,
  layout: SlotLayout,
): Array<{ key: string; x: number; y: number }> {
  const visto = new Set<string>();
  const frontier: Array<{ key: string; x: number; y: number }> = [];
  for (const u of topo.uniones) {
    const orKey  = canonKey(u.origen_posicion);
    const dstKey = canonKey(u.destino_posicion);
    // Origen visible → destino aún oculto
    if (slotsVisibles.has(orKey) && !slotsVisibles.has(dstKey) && !visto.has(dstKey) && layout[dstKey]) {
      frontier.push({ key: dstKey, ...layout[dstKey] });
      visto.add(dstKey);
    }
    // Destino visible → origen aún oculto (topologías convergentes)
    if (slotsVisibles.has(dstKey) && !slotsVisibles.has(orKey) && !visto.has(orKey) && layout[orKey]) {
      frontier.push({ key: orKey, ...layout[orKey] });
      visto.add(orKey);
    }
  }
  return frontier;
}

// ─── Conexión SVG ─────────────────────────────────────────────────────────────

// Radio de recorte: el trazo arranca/termina en el borde del visual, no en el centro
const EDGE_OFFSET = 40; // px SVG ≈ VIS_R + un pequeño margen

// ── Color TASI por IUM — ilumina cada nodo con su carácter canónico ──────────
// T=dinámico (cian) · A=masivo (ámbar) · S=emisor (violeta) · I=receptor (verde)
function colorTASIdeIum(iumData: IumCatalogo | undefined): string {
  if (!iumData?.composicion?.length) return "var(--primary)";
  let T = 0, A = 0, S = 0, I = 0, total = 0;
  for (const c of iumData.composicion) {
    const formula = PARTICULA_QUIMICA_FORMULA[c.particula];
    if (!formula) continue;
    for (const ch of formula) {
      if (ch === "T") T += c.cantidad;
      else if (ch === "A") A += c.cantidad;
      else if (ch === "S") S += c.cantidad;
      else if (ch === "I") I += c.cantidad;
    }
    total += formula.length * c.cantidad;
  }
  if (total === 0) return "var(--primary)";
  const tN = T / total, aN = A / total, sN = S / total, iN = I / total;
  const max = Math.max(tN, aN, sN, iN);
  if (max < 0.35) return "var(--primary)";
  if (tN === max) return "hsl(195,80%,65%)";  // cian — dinámica T
  if (aN === max) return "hsl(45,70%,60%)";   // ámbar — masa A
  if (sN === max) return "hsl(285,75%,70%)";  // violeta — emisión S
  return "hsl(145,65%,55%)";                   // verde — recepción I
}

function ConnectionLine({
  x1, y1, x2, y2, tipo, label, onRemove, resonancia,
}: {
  x1: number; y1: number; x2: number; y2: number;
  tipo: string; label?: string; onRemove?: () => void;
  resonancia?: boolean;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Recortar ambos extremos para que la línea no entre en los círculos
  const ox = (dx / len) * EDGE_OFFSET;
  const oy = (dy / len) * EDGE_OFFSET;
  const sx = x1 + ox;
  const sy = y1 + oy;
  const ex = x2 - ox;
  const ey = y2 - oy;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const segLen = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) || 1;
  const perp = Math.min(40, segLen * 0.22);
  const cpx = mx - (dy / len) * perp;
  const cpy = my + (dx / len) * perp;
  const d = `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`;

  const strokeColor = resonancia
    ? "var(--accent,var(--primary))"
    : ARROW_COLOR;

  return (
    <g>
      <path d={d} fill="none" strokeWidth={12} stroke="transparent"
        style={{ cursor: "pointer" }}
        onClick={onRemove}
      />
      <path
        d={d}
        fill="none"
        strokeWidth={resonancia ? 2.5 : 1.5}
        strokeDasharray={tipo === "reciproca" ? "4 3" : tipo === "acoplamiento" ? "1.5 2.5" : undefined}
        markerEnd={`url(#${ARROW_ID})`}
        style={{
          stroke: strokeColor,
          pointerEvents: "none",
          filter: resonancia ? "drop-shadow(0 0 4px var(--accent,var(--primary)))" : undefined,
          transition: "stroke 0.4s, stroke-width 0.4s",
        }}
      />
      {label && (
        <text
          x={cpx}
          y={cpy - 5}
          fontSize={7.5}
          fontWeight={700}
          textAnchor="middle"
          style={{ fill: strokeColor, pointerEvents: "none", letterSpacing: "0.04em" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ─── Nodo IUM draggable ───────────────────────────────────────────────────────


function IumNodeSVG({
  comp,
  iumData,
  salidas,
  selected,
  linking,
  onMouseDownDrag,
  onContextMenu,
  onRemove,
  onMouseEnter,
  onMouseLeave,
  scale,
  reaccion,
  animDelay = 0,
  funcionRevelada,
  colorTASI,
}: {
  reaccion?: "exito" | "inestable" | null;
  animDelay?: number; // segundos — cuándo aparece la animación canvas (según topología)
  comp: ComponenteLab;
  iumData: IumCatalogo | undefined;
  salidas: IumSalidaFuncional[];
  selected: boolean;
  linking: boolean;
  onMouseDownDrag: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  scale: number;
  funcionRevelada: boolean;
  colorTASI?: string;
}) {
  const { x, y } = comp;
  const principal = funcionRevelada ? salidas.find((s) => s.es_principal) : undefined;

  const filaIum: FilaIum | undefined = iumData
    ? {
        id: iumData.id,
        nombre: iumData.nombre,
        detalle: iumData.detalle,
        extra: iumData.extra ?? undefined,
        composicion: iumData.composicion,
      }
    : undefined;
  const particulas = filaIum ? particulasDeIum(filaIum) : [];

  const visR = VIS_R;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "grab" }}
      onMouseDown={onMouseDownDrag}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {(linking || selected) && (
        <circle
          r={visR + 12}
          fill="none"
          stroke={linking ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)"}
          strokeWidth={linking ? 2 : 1}
          strokeDasharray={linking ? undefined : "3 3"}
          style={{ transition: "stroke 0.15s" }}
        />
      )}

      {reaccion && (
        <circle
          r={visR + 16}
          fill="none"
          strokeWidth={2.5}
          style={{
            stroke: reaccion === "exito"
              ? (colorTASI ?? "var(--accent,var(--primary))")
              : "var(--warning,#f59e0b)",
            animation: "destello 1.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      {reaccion === "exito" && colorTASI && (
        <circle
          r={visR + 26}
          fill="none"
          strokeWidth={1}
          style={{
            stroke: colorTASI,
            animation: "destello 1.8s ease-in-out infinite 0.4s",
            pointerEvents: "none",
            opacity: 0.4,
          }}
        />
      )}

      <circle
        r={visR + 6}
        style={{ fill: "none", stroke: "none" }}
      />

      <foreignObject
        x={-visR}
        y={-visR}
        width={VIS_SIZE}
        height={VIS_SIZE}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div style={{
          width: VIS_SIZE, height: VIS_SIZE,
          opacity: reaccion ? 0 : 1,
          transition: `opacity 0.35s ease ${animDelay}s`,
        }}>
          <IumVisual
            particulas={particulas}
            geometria={iumData?.geometria}
            size={VIS_SIZE}
            showToggle={false}
          />
        </div>
      </foreignObject>

      {/* Badge posición */}
      <circle
        cx={visR - 2}
        cy={-visR + 2}
        r={9}
        style={{ fill: "var(--primary)" }}
      />
      <text
        x={visR - 2}
        y={-visR + 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={7.5}
        fontWeight={900}
        style={{ fill: "var(--btn-text)", pointerEvents: "none" }}
      >
        {comp.posicion}
      </text>

      {/* Nombre */}
      <text
        x={0}
        y={visR + 18}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={9}
        fontWeight={700}
        style={{ fill: "var(--foreground)", pointerEvents: "none" }}
      >
        {comp.ium_nombre}
      </text>

      {/* Salida principal — solo si fue revelada */}
      {principal && (
        <text
          x={0}
          y={visR + 32}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={7.5}
          style={{
            fill: "var(--primary)",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          ↳ {principal.nombre}
        </text>
      )}

      {/* Indicador "función desconocida" */}
      {!funcionRevelada && (
        <text
          x={0}
          y={visR + 32}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={7.5}
          style={{
            fill: "color-mix(in srgb, var(--primary) 30%, transparent)",
            pointerEvents: "none",
            fontStyle: "italic",
          }}
        >
          ↳ comportamiento desconocido
        </text>
      )}

      {/* Botón eliminar */}
      <foreignObject
        x={visR + 4}
        y={-visR - 2}
        width={16}
        height={16}
        style={{ pointerEvents: "all" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Eliminar"
          style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            background: "var(--bg-main)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          }}
        >
          <X size={8} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
        </button>
      </foreignObject>
    </g>
  );
}

// ─── Badge de Eterium ─────────────────────────────────────────────────────────

function EteriumBadge({
  saldo, saldoMaximo, ultimoCosto, esAdmin, onReinicio,
}: {
  saldo: number; saldoMaximo: number; ultimoCosto: number | null;
  esAdmin?: boolean; onReinicio?: () => void;
}) {
  const pct = Math.max(0, Math.min(1, saldo / (saldoMaximo || 100)));
  const color = pct > 0.5 ? "var(--primary)" : pct > 0.2 ? "var(--warning,#f59e0b)" : "var(--error,#ef4444)";

  return (
    <div style={{
      position: "absolute", top: 12, left: 12, zIndex: 10,
      display: "flex", flexDirection: "column", gap: 3,
      background: "color-mix(in srgb, var(--bg-main) 85%, transparent)",
      border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
      borderRadius: 8, padding: "6px 10px", backdropFilter: "blur(6px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Zap size={9} style={{ color }} />
        <span style={{ fontSize: 9, fontWeight: 800, color }}>
          {Math.floor(saldo)} / {saldoMaximo}
        </span>
        <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontWeight: 400 }}>
          Eterium
        </span>
        {esAdmin && onReinicio && (
          <button
            onClick={onReinicio}
            title="Admin: reiniciar Eterium"
            style={{
              marginLeft: 3, padding: "1px 5px", borderRadius: 4,
              border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              cursor: "pointer", fontSize: 7, fontWeight: 700,
              color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              lineHeight: 1.4,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 18%, transparent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
          >
            ↺
          </button>
        )}
      </div>
      {/* Barra */}
      <div style={{ width: 90, height: 3, borderRadius: 99, background: "color-mix(in srgb, var(--primary) 12%, transparent)", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 99, background: color, transition: "width 0.5s ease" }} />
      </div>
      {ultimoCosto !== null && (
        <span style={{ fontSize: 7, color: "color-mix(in srgb, var(--primary) 38%, transparent)", animation: "aparecer 0.3s ease" }}>
          −{ultimoCosto} ⬡ último intento
        </span>
      )}
    </div>
  );
}

// ─── Modal de descubrimiento ──────────────────────────────────────────────────

function ModalDescubrimiento({
  iums,
  onCerrar,
}: {
  iums: { nombre: string; salida?: string }[];
  onCerrar: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "color-mix(in srgb, var(--bg-main) 60%, transparent)",
        padding: "20px 16px",
      }}
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
          borderRadius: 18, padding: "24px 22px",
          width: "100%", maxWidth: 340,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          animation: "modal-aparecer 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            Descubres:
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          {iums.map((ium, i) => (
            <div key={i} style={{
              background: "transparent",
              border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
              borderRadius: 10, padding: "8px 14px", textAlign: "left",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 2px" }}>{ium.nombre}</p>
              {ium.salida && (
                <p style={{ fontSize: 9, margin: 0, color: "var(--primary)", opacity: 0.8 }}>
                  ↳ {ium.salida}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onCerrar}
          style={{
            padding: "8px 24px", borderRadius: 999,
            background: "var(--primary)", color: "var(--btn-text)",
            border: "none", cursor: "pointer", fontSize: 10, fontWeight: 800,
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

// ─── Panel resultado ──────────────────────────────────────────────────────────

function ResultadoPanel({ resultado, nombreIum }: { resultado: ResultadoSimulador; nombreIum: (id?: string) => string }) {
  const candidatos = resultado.procesos_candidatos ?? [];
  const invalidos  = resultado.invalidos ?? [];
  const principal  = candidatos.find((p) => p.es_principal);
  const invalida   = resultado.estado !== undefined && resultado.estado !== "simulado";

  let tipo: "exito" | "inestable" | "nada" | "invalida" = "nada";
  if (invalida) tipo = "invalida";
  else if (resultado.proceso_principal || resultado.conjuracion_principal) tipo = "exito";
  else if (resultado.ambiguo || candidatos.length > 0) tipo = "inestable";

  const oris = Array.from(new Set((principal?.oris ?? []).map((o) => o.oris ?? o.oris_id).filter(Boolean))) as string[];

  // Feedback de resonancia parcial
  const coincidentes = principal?.patrones_coincidentes ?? candidatos[0]?.patrones_coincidentes ?? 0;
  const totales      = principal?.patrones_totales ?? candidatos[0]?.patrones_totales ?? 0;
  const hayResonanciaInfo = tipo === "nada" && totales > 0 && coincidentes > 0;

  const color =
    tipo === "exito" ? "var(--accent,var(--primary))"
    : tipo === "inestable" ? "var(--warning,#f59e0b)"
    : tipo === "invalida" ? "var(--error,#ef4444)"
    : "var(--primary)";

  return (
    <div style={{
      padding: "14px 12px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center",
      animation: "aparecer 0.45s ease-out",
    }}>
      {tipo === "exito" && (
        <>
          <p style={{ fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1.15 }}>{resultado.conjuracion_principal ?? resultado.proceso_principal}</p>
          {!!oris.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 2 }}>
              {oris.map((o) => (
                <span key={o} style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                  {o}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {tipo === "inestable" && (
        <>
          <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Reacción inestable</p>
          <p style={{ fontSize: 9, margin: 0, lineHeight: 1.5, color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
            La combinación vibra, pero no termina de decidirse. Algo debe inclinar la balanza.
          </p>
          {totales > 0 && (
            <p style={{ fontSize: 8, margin: 0, color: "color-mix(in srgb, var(--warning,#f59e0b) 80%, transparent)" }}>
              {coincidentes} de {totales} vínculos reconocidos
            </p>
          )}
        </>
      )}

      {tipo === "nada" && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
            {hayResonanciaInfo ? "Algo resuena… pero débilmente" : "No ocurre nada… todavía"}
          </p>
          <p style={{ fontSize: 9, margin: 0, lineHeight: 1.5, color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            {hayResonanciaInfo
              ? `${coincidentes} de ${totales} conexiones reconocidas. Algo falta.`
              : "Prueba otras piezas, otras uniones u otra forma."}
          </p>
        </>
      )}

      {tipo === "invalida" && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Hay piezas que aún no pueden reaccionar</p>
          {invalidos.map((inv, i) => (
            <p key={i} style={{ fontSize: 9, margin: 0, lineHeight: 1.5 }}>
              <strong>{nombreIum(inv.ium_id)}</strong> {MOTIVOS_INVALIDO[inv.motivo ?? ""] ?? "no puede participar"}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SimuladorIUM() {
  const { iums, reacciones, loading: loadingIums } = useIumsCatalogo();
  const { topologias } = useTopologias();
  const [busqueda, setBusqueda] = useState("");
  const [componentes, setComponentes] = useState<ComponenteLab[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceLab[]>([]);

  // Auth: obtener perfil del jugador
  const [perfilId, setPerfilId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setPerfilId(data?.user?.id ?? null);
    });
  }, []);

  // Sistema de descubrimiento
  const { conocimiento, setConocimiento, recargar: recargarConocimiento } = useConocimientoIums(perfilId);
  const { eterium, recargar: recargarEterium } = useEteriumJugador(perfilId);

  // Rango de IUMs por topología (mínimo y máximo de configs reales en Supabase)
  const topoRangos = useTopoConfigRange();

  // Modo admin
  const esAdmin = useRolJugador(perfilId);
  const { configs: configsAdmin, loading: loadingConfigs } = useConfiguracionesAdmin(esAdmin);
  const [adminPanelAbierto, setAdminPanelAbierto] = useState(false);
  const [adminCargando, setAdminCargando] = useState<string | null>(null); // config_id en carga

  // Modal de revelación
  const [revelaciones, setRevelaciones] = useState<{ nombre: string; salida?: string }[]>([]);

  // Panel de descubrimientos
  const [descubrimientosAbierto, setDescubrimientosAbierto] = useState(false);
  const { procesos: procesosDescubiertos, setProcesos: setProcesosDescubiertos, recargar: recargarProcesos } = useProcesosDescubiertos(perfilId);

  // Drag de nodo
  const dragging = useRef<{
    uid: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
    moved: boolean;
  } | null>(null);

  // Modo enlace (click derecho)
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [linkingMouse, setLinkingMouse] = useState<{ x: number; y: number } | null>(null);
  const [linkingOver, setLinkingOver] = useState<string | null>(null);
  const [linkingTipo, setLinkingTipo] = useState("dirigida");

  // Topología seleccionada
  const [topoSeleccionada, setTopoSeleccionada] = useState<TopologiaOris | null>(null);
  // Slots visibles en el canvas (null = todos visibles, solo aplica en modo topología)
  const [slotsVisibles, setSlotsVisibles] = useState<Set<string> | null>(null);

  // Modal tipo unión al soltar
  const [modalTipo, setModalTipo] = useState<{
    origenUid: string;
    destinoUid: string;
  } | null>(null);

  // Viewport transform (pan + zoom)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Simulador
  const [simulando, setSimulando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSimulador | null>(null);
  const [errorSim, setErrorSim] = useState<string | null>(null);

  // ── Efecto visual del Oris de la conjuración activa ──────────────────────
  // Se carga desde oris_efecto_visual en Supabase cuando hay resultado exitoso.
  const [orisEfecto, setOrisEfecto] = useState<OrisEfectoVisual | null>(null);

  // ── Secuencia de animación al lograr una conjuración ─────────────────────
  // "combinando" → IUMs siguen las flechas y se empujan hacia el núcleo, luego al centro
  // "explosion"  → destello radial (0.45 s)
  // "efecto"     → partículas continuas + nombre de conjuración
  const [faseAnimacion, setFaseAnimacion] = useState<"combinando" | "explosion" | "efecto" | null>(null);
  const animKey = useRef(0); // cambia con cada resultado exitoso → fuerza remount de SVG animations

  useEffect(() => {
    const exitoso = resultado?.estado === "simulado" &&
      (resultado.proceso_principal || resultado.conjuracion_principal);
    if (!exitoso) { setFaseAnimacion(null); setOrisEfecto(null); return; }

    // ── Cargar OrisEfectoVisual desde Supabase ───────────────────────────────
    (async () => {
      const candidatos = resultado.procesos_candidatos ?? [];
      const principal = candidatos.find((p) => p.es_principal) ?? candidatos[0];
      const conjuracionId = principal?.conjuracion_id;
      if (!conjuracionId) return;

      const { data: conjRow } = await supabase
        .from("conjuraciones")
        .select("oris_id")
        .eq("id", conjuracionId)
        .maybeSingle();
      const orisId = (conjRow as { oris_id: string | null } | null)?.oris_id;
      if (!orisId) return;

      const { data: efecto } = await supabase
        .from("oris_efecto_visual")
        .select("*")
        .eq("oris_id", orisId)
        .maybeSingle();

      if (efecto) setOrisEfecto(efecto as OrisEfectoVisual);
    })();


    // Calcular duración de la fase "combinando" dinámicamente según la profundidad del grafo
    // (misma lógica que en el render — debe mantenerse sincronizada)
    const DUR_SALTO = 0.85;
    const STAGGER_SALTO = 0.15;
    const inDeg = new Map<string, number>();
    for (const comp of componentes) inDeg.set(comp.uid, 0);
    for (const e of enlaces) inDeg.set(e.destino_uid, (inDeg.get(e.destino_uid) ?? 0) + 1);
    let finalUid2 = componentes[0]?.uid ?? "";
    let maxIn2 = -1;
    for (const comp of componentes) {
      const deg = inDeg.get(comp.uid) ?? 0;
      if (deg > maxIn2 || (deg === maxIn2 && comp.posicion === "N")) { maxIn2 = deg; finalUid2 = comp.uid; }
    }
    const invAdj2 = new Map<string, string[]>();
    for (const e of enlaces) {
      const arr = invAdj2.get(e.destino_uid) ?? [];
      arr.push(e.origen_uid);
      invAdj2.set(e.destino_uid, arr);
    }
    const dist2 = new Map<string, number>();
    const q2 = [finalUid2];
    dist2.set(finalUid2, 0);
    while (q2.length) {
      const cur = q2.shift()!;
      const d = dist2.get(cur)!;
      for (const src of (invAdj2.get(cur) ?? [])) {
        if (!dist2.has(src)) { dist2.set(src, d + 1); q2.push(src); }
      }
    }
    const maxDist2 = Math.max(...Array.from(dist2.values()), 0);
    const finalStart = maxDist2 * (DUR_SALTO * 0.7 + STAGGER_SALTO);
    const combDurMs = Math.round((finalStart + DUR_SALTO * 1.2 + 0.15) * 1000) + 100;

    animKey.current += 1;
    setFaseAnimacion("combinando");
    // explosion y efecto eliminados — el canvas IumMergedCanvas maneja el resultado final
  }, [resultado, componentes, enlaces]);
  const [avisoTopo, setAvisoTopo] = useState<string | null>(null);
  // Slot resaltado mientras arrastra en modo topología
  const [dragSlotPreview, setDragSlotPreview] = useState<{ key: string; x: number; y: number } | null>(null);
  const [slotDropdown, setSlotDropdown] = useState<{ key: string; posUI: string; x: number; y: number } | null>(null);
  const [busquedaSlot, setBusquedaSlot] = useState("");
  const [drawerIzq, setDrawerIzq] = useState(false);
  const [drawerDer, setDrawerDer] = useState(false);

  // IDs en canvas para saber qué salidas cargar
  const iumIds = useMemo(() => componentes.map((c) => c.ium_id), [componentes]);
  const salidas = useIumSalidas(iumIds);
  const iumMap = useMemo(() => new Map(iums.map((i) => [i.id, i])), [iums]);

  // ── Clasificar resultado para el costo de Eterium ────────────────────────
  const clasificarResultado = useCallback((res: ResultadoSimulador): string => {
    if (!res || res.estado !== "simulado") return "sin_resonancia";
    if (res.proceso_principal || res.conjuracion_principal) return "proceso_exitoso";
    const candidatos = res.procesos_candidatos ?? [];
    if (res.ambiguo || candidatos.length > 0) {
      const alguno = candidatos[0];
      if (alguno && (alguno.patrones_coincidentes ?? 0) > 0) return "reaccion_inestable";
    }
    // Ver si hay resonancia parcial (patrones coincidentes pero sin proceso)
    const tieneCoincidencias = candidatos.some((c) => (c.patrones_coincidentes ?? 0) > 0);
    return tieneCoincidencias ? "resonancia_parcial" : "sin_resonancia";
  }, []);

  // Último costo real cobrado (se actualiza después de cada simulación)
  const [ultimoCosto, setUltimoCosto] = useState<number | null>(null);

  // Si el jugador cambia la combinación, el resultado anterior deja de valer
  const firmaCombinacion = useMemo(
    () =>
      componentes.map((c) => `${c.ium_id}@${c.posicion}`).join("|") + "#" +
      enlaces.map((e) => `${e.origen_uid}>${e.destino_uid}:${e.tipo_union}`).join("|"),
    [componentes, enlaces],
  );
  useEffect(() => { setResultado(null); setErrorSim(null); setUltimoCosto(null); }, [firmaCombinacion]);

  const iumsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return q
      ? iums.filter((i) => i.nombre.toLowerCase().includes(q) || i.detalle.toLowerCase().includes(q))
      : iums;
  }, [iums, busqueda]);

  const posicionesUsadas = useMemo(() => componentes.map((c) => c.posicion), [componentes]);

  // ── Conversión coordenadas pantalla → SVG ─────────────────────────────────

  const screenToSVG = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: screenX, y: screenY };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    return {
      x: viewBox.x + (screenX - rect.left) * scaleX,
      y: viewBox.y + (screenY - rect.top) * scaleY,
    };
  }, [viewBox]);

  // ── Helper: cablear slots al añadir un componente en modo topología ─────────

  const cablearSlot = useCallback((newComp: ComponenteLab, compsPrevios: ComponenteLab[]) => {
    if (!topoSeleccionada) return;
    const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
    const todosComps = [...compsPrevios, newComp];
    const nuevosEnlaces: EnlaceLab[] = [];
    for (const u of topoSeleccionada.uniones) {
      const orPosUI  = toUI(u.origen_posicion);
      const dstPosUI = toUI(u.destino_posicion);
      if (orPosUI !== newComp.posicion && dstPosUI !== newComp.posicion) continue;
      const orComp  = orPosUI  === newComp.posicion ? newComp : todosComps.find((c) => c.posicion === orPosUI);
      const dstComp = dstPosUI === newComp.posicion ? newComp : todosComps.find((c) => c.posicion === dstPosUI);
      if (!orComp || !dstComp) continue;
      const yaExiste = enlaces.some((e) => e.origen_uid === orComp.uid && e.destino_uid === dstComp.uid);
      if (!yaExiste) {
        nuevosEnlaces.push({ uid: genUID(), origen_uid: orComp.uid, destino_uid: dstComp.uid, tipo_union: u.tipo_union });
      }
    }
    if (nuevosEnlaces.length) setEnlaces((prev) => [...prev, ...nuevosEnlaces]);
  }, [topoSeleccionada, enlaces]);

  // ── Agregar IUM ───────────────────────────────────────────────────────────

  const agregarIum = useCallback((ium: IumCatalogo) => {
    if (topoSeleccionada) {
      const layout = getSlotsActivos(topoSeleccionada);
      const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();

      // Solo slots VISIBLES y libres
      const visibles = slotsVisibles ?? new Set(Object.keys(layout));
      const slotsLibres = Object.keys(layout).filter(
        (k) => visibles.has(k) && !componentes.some((c) => c.posicion === toUI(k)),
      );

      if (slotsLibres.length) {
        const key = slotsLibres[0];
        const { x, y } = layout[key];
        const newComp: ComponenteLab = { uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre, posicion: toUI(key), x, y };
        setComponentes((prev) => [...prev, newComp]);
        cablearSlot(newComp, componentes);
      } else {
        // No hay slots visibles libres: expandir el siguiente frontier si no superamos el máximo real
        const rango = topoRangos.get(topoSeleccionada.id);
        const maxPermitido = rango ? rango.maxIumes : Object.keys(layout).length;
        if (visibles.size >= maxPermitido) return; // no expandir más allá del máximo con configs
        const frontier = getFrontierSlots(topoSeleccionada, visibles, layout);
        if (!frontier.length) return; // topología llena
        const { key, x, y } = frontier[0];
        setSlotsVisibles((prev) => new Set([...(prev ?? Object.keys(layout)), key]));
        const newComp: ComponenteLab = { uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre, posicion: toUI(key), x, y };
        setComponentes((prev) => [...prev, newComp]);
        cablearSlot(newComp, componentes);
      }
    } else {
      const idx = componentes.length;
      const { x, y } = autoPos(idx);
      const posLibre = POSICIONES.find((p) => !posicionesUsadas.includes(p)) ?? "X";
      setComponentes((prev) => [...prev, {
        uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre,
        posicion: posLibre, x, y,
      }]);
    }
  }, [componentes, posicionesUsadas, topoSeleccionada, slotsVisibles, cablearSlot, topoRangos]);

  // ── Auto-fit viewBox ──────────────────────────────────────────────────────

  const fitAll = useCallback(() => {
    const NODE_R = 52;
    const PADDING = 90;

    const fitPoints = (points: { x: number; y: number }[]) => {
      if (!points.length) return;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const rawMinX = Math.min(...xs) - NODE_R - PADDING;
      const rawMinY = Math.min(...ys) - NODE_R - PADDING;
      const rawMaxX = Math.max(...xs) + NODE_R + PADDING;
      const rawMaxY = Math.max(...ys) + NODE_R + PADDING;
      const rawW = rawMaxX - rawMinX;
      const rawH = rawMaxY - rawMinY;

      const svgEl = svgRef.current;
      const aspect = svgEl
        ? svgEl.clientWidth / Math.max(svgEl.clientHeight, 1)
        : 4 / 3;

      let finalW = rawW;
      let finalH = rawH;
      if (rawW / rawH > aspect) {
        finalH = rawW / aspect;
      } else {
        finalW = rawH * aspect;
      }
      const cx = (rawMinX + rawMaxX) / 2;
      const cy = (rawMinY + rawMaxY) / 2;
      setViewBox({ x: cx - finalW / 2, y: cy - finalH / 2, w: finalW, h: finalH });
    };

    // En modo topología: fitear siempre a los slots VISIBLES.
    // Cuando el usuario expande slots con "+", la cámara se reencuadra
    // sobre los visibles; si hay slotsVisibles null (todos) usa todos.
    if (topoSeleccionada) {
      const allSlots = getSlotsActivos(topoSeleccionada);
      const slotsFit = slotsVisibles
        ? Object.entries(allSlots)
            .filter(([k]) => slotsVisibles.has(k))
            .map(([, pos]) => pos)
        : Object.values(allSlots);
      if (slotsFit.length) { fitPoints(slotsFit); return; }
    }

    if (!componentes.length) {
      setViewBox({ x: 0, y: 0, w: 800, h: 600 });
      return;
    }
    fitPoints(componentes.map((c) => ({ x: c.x, y: c.y })));
  }, [componentes, topoSeleccionada, slotsVisibles]);

  useEffect(() => { fitAll(); }, [componentes.length, topoSeleccionada, slotsVisibles]);
  useEffect(() => {
    const fn = () => fitAll();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [fitAll]);

  // ── Drag de nodo ──────────────────────────────────────────────────────────

  const onNodeMouseDown = useCallback((uid: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const comp = componentes.find((c) => c.uid === uid);
    if (!comp) return;
    const svgPos = screenToSVG(e.clientX, e.clientY);
    dragging.current = {
      uid,
      startMouseX: svgPos.x,
      startMouseY: svgPos.y,
      startNodeX: comp.x,
      startNodeY: comp.y,
      moved: false,
    };
  }, [componentes, screenToSVG]);

  // ── Click derecho en nodo = iniciar enlace ─────────────────────────────────

  const onNodeContextMenu = useCallback((uid: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (linkingFrom) {
      if (linkingFrom !== uid) {
        setModalTipo({ origenUid: linkingFrom, destinoUid: uid });
      }
      setLinkingFrom(null);
      setLinkingMouse(null);
      setLinkingOver(null);
    } else {
      setLinkingFrom(uid);
      const svgPos = screenToSVG(e.clientX, e.clientY);
      setLinkingMouse(svgPos);
    }
  }, [linkingFrom, screenToSVG]);

  // ── Mouse move en SVG ─────────────────────────────────────────────────────

  const onSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svgPos = screenToSVG(e.clientX, e.clientY);

    const drag = dragging.current;
    if (drag) {
      const dx = svgPos.x - drag.startMouseX;
      const dy = svgPos.y - drag.startMouseY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
      const nx = drag.startNodeX + dx;
      const ny = drag.startNodeY + dy;
      const uid = drag.uid;

      if (topoSeleccionada) {
        const allSlots = getSlotsActivos(topoSeleccionada);
        const slotsSnap = slotsVisibles
          ? Object.fromEntries(Object.entries(allSlots).filter(([k]) => slotsVisibles.has(k)))
          : allSlots;
        const snap = slotMasCercano(nx, ny, slotsSnap, SLOT_SNAP_RADIUS * 1.8);
        setDragSlotPreview(snap);
        setComponentes((prev) =>
          prev.map((c) => c.uid === uid ? { ...c, x: nx, y: ny } : c),
        );
      } else {
        setComponentes((prev) =>
          prev.map((c) => c.uid === uid ? { ...c, x: nx, y: ny } : c),
        );
      }
    }

    if (linkingFrom) {
      setLinkingMouse(svgPos);
    }
  }, [screenToSVG, linkingFrom, topoSeleccionada]);

  // ── Mouse up ──────────────────────────────────────────────────────────────

  const onSVGMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const drag = dragging.current;
    dragging.current = null;

    if (drag && drag.moved && topoSeleccionada) {
      const allSlots = getSlotsActivos(topoSeleccionada);
      const slotsSnap = slotsVisibles
        ? Object.fromEntries(Object.entries(allSlots).filter(([k]) => slotsVisibles.has(k)))
        : allSlots;
      const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
      setComponentes((prev) => {
        const nodo = prev.find((c) => c.uid === drag.uid);
        if (!nodo) return prev;
        const snap = slotMasCercano(nodo.x, nodo.y, slotsSnap, SLOT_SNAP_RADIUS * 2.5);
        if (!snap) {
          return prev.map((c) => c.uid === drag.uid
            ? { ...c, x: drag.startNodeX, y: drag.startNodeY }
            : c);
        }
        const newPosUI = toUI(snap.key);
        const ocupante = prev.find((c) => c.uid !== drag.uid && c.posicion === newPosUI);
        return prev.map((c) => {
          if (c.uid === drag.uid) {
            return { ...c, posicion: newPosUI, x: snap.x, y: snap.y };
          }
          if (ocupante && c.uid === ocupante.uid) {
            return { ...c, posicion: nodo.posicion, x: drag.startNodeX, y: drag.startNodeY };
          }
          return c;
        });
      });
    }

    setDragSlotPreview(null);

    if (linkingFrom && !linkingOver) {
      setLinkingFrom(null);
      setLinkingMouse(null);
    }
  }, [linkingFrom, linkingOver, topoSeleccionada]);

  // ── Pan del canvas (arrastrar fondo) ──────────────────────────────────────

  const onCanvasMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest("[data-ium-node]")) return;
    setSlotDropdown(null); setBusquedaSlot("");
    setDescubrimientosAbierto(false);
    setAdminPanelAbierto(false);
    // Limpiar resultado al tocar área vacía del canvas
    setResultado(null);
    setErrorSim(null);
  }, []);

  // ── Cancelar enlace con Escape ────────────────────────────────────────────

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLinkingFrom(null);
        setLinkingMouse(null);
        setLinkingOver(null);
        setSlotDropdown(null);
        setBusquedaSlot("");
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // ── Confirmar enlace ──────────────────────────────────────────────────────

  const elegirIumEnSlot = useCallback((ium: IumCatalogo, slotKey: string, posUI: string, sx: number, sy: number) => {
    const newComp: ComponenteLab = { uid: genUID(), ium_id: ium.id, ium_nombre: ium.nombre, posicion: posUI, x: sx, y: sy };
    setComponentes((prev) => [...prev, newComp]);
    cablearSlot(newComp, componentes);
    setSlotDropdown(null);
    setBusquedaSlot("");
  }, [componentes, cablearSlot]);

  const confirmarEnlace = useCallback(() => {
    if (!modalTipo) return;
    setEnlaces((prev) => [...prev, {
      uid: genUID(),
      origen_uid: modalTipo.origenUid,
      destino_uid: modalTipo.destinoUid,
      tipo_union: linkingTipo,
    }]);
    setModalTipo(null);
    setLinkingTipo("dirigida");
  }, [modalTipo, linkingTipo]);

  // ── Aplicar topología ────────────────────────────────────────────────────────

  const aplicarTopologia = useCallback((topo: TopologiaOris) => {
    setTopoSeleccionada(topo);
    setResultado(null);
    setErrorSim(null);

    const canonToUI = (p: string) => (p === "nucleo" ? "N" : p.toUpperCase());
    const slots = getSlotsActivos(topo);
    const slotsOrden = Object.keys(slots);
    const nSlots = slotsOrden.length;
    const nNodos = componentes.length;

    const nuevosComps = componentes.map((c, i) => {
      if (i >= nSlots) return c;
      const key = slotsOrden[i];
      const { x, y } = slots[key];
      return { ...c, posicion: canonToUI(key), x, y };
    });

    const posMap = new Map<string, string>();
    nuevosComps.slice(0, nSlots).forEach((c, i) => {
      posMap.set(slotsOrden[i], c.uid);
    });

    const nuevosEnlaces: EnlaceLab[] = [];
    for (const u of topo.uniones) {
      const orUid  = posMap.get(u.origen_posicion);
      const dstUid = posMap.get(u.destino_posicion);
      if (orUid && dstUid) {
        nuevosEnlaces.push({ uid: genUID(), origen_uid: orUid, destino_uid: dstUid, tipo_union: u.tipo_union });
      }
    }

    setComponentes(nuevosComps);
    setEnlaces(nuevosEnlaces);

    // Inicializar slots visibles: mínimos de la topología ∪ slots ya ocupados
    const iniciales = new Set(
      TOPO_SLOTS_INICIALES[topo.nombre] ?? slotsOrden.slice(0, 2),
    );
    nuevosComps.slice(0, nSlots).forEach((_, i) => iniciales.add(slotsOrden[i]));
    setSlotsVisibles(iniciales);

    if (nNodos < nSlots) {
      const f = nSlots - nNodos;
      setAvisoTopo(`Faltan ${f} IUM${f !== 1 ? "s" : ""} para completar esta forma. Agrégalos desde la lista.`);
    } else if (nNodos > nSlots) {
      const f = nNodos - nSlots;
      setAvisoTopo(`${f} IUM${f !== 1 ? "s" : ""} se quedaron fuera: la forma solo tiene ${nSlots} huecos.`);
    } else {
      setAvisoTopo(null);
    }
  }, [componentes]);

  // ── Aplicar config de admin (carga IUMs + topología + enlaces desde Supabase) ──

  const aplicarConfigAdmin = useCallback(async (cfg: ConfigAdmin) => {
    setAdminCargando(cfg.configuracion_id);
    try {
      const detalle = await cargarDetalleConfig(cfg.configuracion_id);

      // 1. Aplicar topología si la config tiene una
      const topo = cfg.topologia_id
        ? topologias.find((t) => t.id === cfg.topologia_id) ?? null
        : null;

      const canonToUI = (p: string) => (p === "nucleo" || p === "N") ? "N" : p.toUpperCase();

      // 2. Construir componentes con coordenadas del layout
      const layout = topo ? getSlotsActivos(topo) : null;
      const getPos = (posicion: string): { x: number; y: number } => {
        if (layout) {
          const key = posicion.toLowerCase() === "n" ? "nucleo" : posicion.toLowerCase();
          const slot = layout[key];
          if (slot) return slot;
        }
        // fallback: auto layout si no hay topo o no encontró el slot
        return autoPos(detalle.componentes.findIndex((c) => c.posicion === posicion));
      };

      const nuevosComps: ComponenteLab[] = detalle.componentes.map((c) => {
        const { x, y } = getPos(c.posicion);
        return {
          uid: genUID(),
          ium_id: c.ium_id,
          ium_nombre: iumMap.get(c.ium_id)?.nombre ?? c.ium_id,
          posicion: canonToUI(c.posicion),
          x,
          y,
        };
      });

      // 3. Construir enlaces usando las posiciones
      const posToUid = new Map(nuevosComps.map((c) => [c.posicion, c.uid]));
      const nuevosEnlaces: EnlaceLab[] = detalle.enlaces.map((e) => ({
        uid: genUID(),
        origen_uid:  posToUid.get(canonToUI(e.origen_posicion))  ?? "",
        destino_uid: posToUid.get(canonToUI(e.destino_posicion)) ?? "",
        tipo_union:  e.tipo_union,
      })).filter((e) => e.origen_uid && e.destino_uid);

      // 4. Slots visibles: todos los que usa la config
      const slotsUsados = new Set(
        detalle.componentes.map((c) => c.posicion.toLowerCase() === "n" ? "nucleo" : c.posicion.toLowerCase())
      );

      setComponentes(nuevosComps);
      setEnlaces(nuevosEnlaces);
      setResultado(null);
      setErrorSim(null);
      setAvisoTopo(null);

      if (topo) {
        setTopoSeleccionada(topo);
        setSlotsVisibles(slotsUsados);
      } else {
        setTopoSeleccionada(null);
        setSlotsVisibles(null);
      }

      setAdminPanelAbierto(false);
    } finally {
      setAdminCargando(null);
    }
  }, [topologias, iumMap]);

  const limpiar = useCallback(() => {
    setComponentes([]); setEnlaces([]); setResultado(null); setErrorSim(null); setAvisoTopo(null); setTopoSeleccionada(null); setDragSlotPreview(null); setSlotsVisibles(null);
  }, []);

  // ── Simular ────────────────────────────────────────────────────────────────

  const simular = useCallback(async () => {
    if (!componentes.length) return;
    setResultado(null); setErrorSim(null);

    // Validar IUMs repetidos con enlaces
    const conteo = new Map<string, number>();
    componentes.forEach((c) => conteo.set(c.ium_id, (conteo.get(c.ium_id) ?? 0) + 1));
    const repetidos = new Set<string>();
    for (const e of enlaces) {
      for (const uid of [e.origen_uid, e.destino_uid]) {
        const c = componentes.find((x) => x.uid === uid);
        if (c && (conteo.get(c.ium_id) ?? 0) > 1) repetidos.add(c.ium_nombre);
      }
    }
    if (repetidos.size) {
      setErrorSim(`Cada IUM solo puede unirse una vez. Quita las copias repetidas de: ${[...repetidos].join(", ")}.`);
      return;
    }

    setSimulando(true);
    try {
      const payload = {
        p_componentes: componentes.map((c) => ({ ium_id: c.ium_id, posicion: c.posicion })),
        p_enlaces: enlaces.flatMap((e) => {
          const or  = componentes.find((c) => c.uid === e.origen_uid);
          const dst = componentes.find((c) => c.uid === e.destino_uid);
          if (!or || !dst) return [];
          return [{ origen: or.ium_id, destino: dst.ium_id, tipo_union: e.tipo_union }];
        }),
        p_contexto: {},
      };
      const { data, error: err } = await supabase.rpc("simular_organizacion_ium_v1" as never, payload as never);
      if (err) {
        console.error(err);
        setErrorSim("El laboratorio no respondió. Inténtalo de nuevo.");
        return;
      }

      const res = (data as ResultadoSimulador) ?? { estado: "sin_respuesta" };
      setResultado(res);

      // ── Registrar intento en Supabase ─────────────────────────────────────
      if (perfilId) {
        const tipoResultado = clasificarResultado(res);
        const candidatos = res.procesos_candidatos ?? [];
        const principal = candidatos.find((p) => p.es_principal) ?? candidatos[0];

        const { data: regData } = await supabase.rpc("registrar_intento_simulador" as never, {
          p_perfil_id:             perfilId,
          p_ium_ids:               componentes.map((c) => c.ium_id),
          p_configuracion:         payload as never,
          p_resultado_tipo:        tipoResultado,
          p_proceso_id:            null,
          p_conjuracion_id:        principal?.conjuracion_id ?? null,
          p_patrones_coincidentes: principal?.patrones_coincidentes ?? 0,
          p_patrones_totales:      principal?.patrones_totales ?? 0,
        } as never);

        // Guardar el costo real cobrado
        const regResult = regData as { nuevas_revelaciones?: string[]; costo_eterium?: number; saldo_restante?: number } | null;
        if (regResult?.costo_eterium !== undefined) setUltimoCosto(regResult.costo_eterium);

        // Procesar revelaciones
        if (regResult?.nuevas_revelaciones?.length) {
          // Buscar nombres y salidas de los IUMs revelados
          const reveladosInfo = regResult.nuevas_revelaciones.map((iumId) => {
            const iumDato = iumMap.get(iumId);
            const salidaPrincipal = salidas.find((s) => s.ium_id === iumId && s.es_principal);
            return {
              nombre: iumDato?.nombre ?? iumId,
              salida: salidaPrincipal?.nombre,
            };
          });
          setRevelaciones(reveladosInfo);
        }

        // Recargar estado de Eterium, conocimiento y procesos descubiertos desde Supabase
        await Promise.all([recargarEterium(), recargarConocimiento(), recargarProcesos()]);
      }

    } catch (e) {
      console.error(e);
      setErrorSim("El laboratorio no respondió. Inténtalo de nuevo.");
    } finally {
      setSimulando(false);
    }
  }, [componentes, enlaces, perfilId, clasificarResultado, iumMap, salidas, recargarEterium, recargarConocimiento, recargarProcesos]);

  // ── Scale actual ───────────────────────────────────────────────────────────

  const currentScale = 1;

  // ── Determinar resonancia por enlace (para resaltarlos en el canvas) ───────

  const enlacesConResonancia = useMemo(() => {
    if (!resultado || resultado.estado !== "simulado" || (!resultado.proceso_principal && !resultado.conjuracion_principal)) return new Set<string>();
    // Si hay proceso exitoso, todos los enlaces "brillan" — por ahora resaltamos todos
    return new Set(enlaces.map((e) => e.uid));
  }, [resultado, enlaces]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="sim-root">

      {/* ── Izquierda: catálogo ─────────────────────────────────────────────── */}
      <>
      {drawerIzq && <div onClick={() => setDrawerIzq(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "color-mix(in srgb, var(--bg-main) 50%, transparent)" }} />}
      <div className={`sim-panel-izq${drawerIzq ? " sim-panel-izq--open" : ""}`}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: "0 0 6px" }}>
            IUMs
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)", borderRadius: "var(--radius-btn)", padding: "3px 6px" }}>
            <Search size={9} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              style={{ border: "none", background: "transparent", fontSize: 10, color: "var(--foreground)", outline: "none", width: "100%" }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingIums ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (() => {
            const idsUsados = new Set(componentes.map((c) => c.ium_id));
            const usados = iumsFiltrados.filter((i) => idsUsados.has(i.id));
            const disponibles = iumsFiltrados.filter((i) => !idsUsados.has(i.id));
            return (
              <>
                {usados.map((ium) => {
                  const revelado = conocimiento.get(ium.id)?.funcion_revelada ?? false;
                  return (
                    <div
                      key={ium.id}
                      title={ium.detalle}
                      style={{ width: "100%", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, background: "color-mix(in srgb, var(--primary) 13%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--primary)" }}>
                          {ium.nombre}
                        </span>
                        {/* Composición — solo visible si fue revelado */}
                        {revelado && ium.composicion.length > 0 && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ium.composicion.map((c) => `${c.cantidad > 1 ? `${c.cantidad}×` : ""}${c.particula}`).join(" · ")}
                          </span>
                        )}
                        {!revelado && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 28%, transparent)", fontStyle: "italic" }}>
                            comportamiento desconocido
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {disponibles.map((ium) => {
                  const revelado = conocimiento.get(ium.id)?.funcion_revelada ?? false;
                  return (
                    <button
                      key={ium.id}
                      onClick={() => agregarIum(ium)}
                      title={ium.detalle}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 7%, transparent)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    >
                      <Plus size={8} style={{ flexShrink: 0, color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ium.nombre}
                        </span>
                        {/* Composición — solo si fue revelado */}
                        {revelado && ium.composicion.length > 0 && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 35%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ium.composicion.map((c) => `${c.cantidad > 1 ? `${c.cantidad}×` : ""}${c.particula}`).join(" · ")}
                          </span>
                        )}
                        {!revelado && (
                          <span style={{ fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 25%, transparent)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            ?
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {!iumsFiltrados.length && (
                  <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 28%, transparent)", textAlign: "center", padding: "12px 8px", margin: 0 }}>Sin resultados</p>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Centro: canvas libre ────────────────────────────────────────────── */}
      </>

      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", position: "relative" }}>
        {/* Badge de Eterium — siempre visible */}
        <EteriumBadge
          saldo={eterium.saldo}
          saldoMaximo={eterium.saldo_maximo}
          ultimoCosto={ultimoCosto}
          esAdmin={esAdmin}
          onReinicio={async () => {
            if (!perfilId) return;
            await supabase.rpc("admin_reiniciar_eterium" as never, { p_perfil_id: perfilId } as never);
            await recargarEterium();
          }}
        />

        {/* Grupo de botones flotantes: Descubrimientos + Probar — siempre visibles */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", alignItems: "center", gap: 6 }}>

              {/* Botón Descubrimientos */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDescubrimientosAbierto((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 999,
                    background: descubrimientosAbierto
                      ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                      : "color-mix(in srgb, var(--primary) 7%, transparent)",
                    color: "var(--primary)",
                    border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
                    cursor: "pointer",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  }}
                >
                  Descubrimientos
                  {/* Badge con total de revelados */}
                  {(() => {
                    const nIums = [...conocimiento.values()].filter((c) => c.funcion_revelada).length;
                    const nProc = procesosDescubiertos.size;
                    const total = nIums + nProc;
                    return total > 0 ? (
                      <span style={{
                        background: "var(--primary)", color: "var(--btn-text)",
                        borderRadius: 999, fontSize: 7, fontWeight: 800,
                        padding: "1px 5px", lineHeight: 1.5,
                      }}>
                        {total}
                      </span>
                    ) : null;
                  })()}
                </button>

                {/* Panel desplegable */}
                {descubrimientosAbierto && (
                  <div
                    style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0,
                      width: 240, maxHeight: 340, overflowY: "auto",
                      background: "var(--bg-main, #0a0a0a)",
                      border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                      borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      zIndex: 20,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* ── Procesos identificados (arriba) ── */}
                    <div style={{ padding: "8px 10px 4px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                      <p style={{ margin: 0, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                        Procesos identificados
                      </p>
                    </div>

                    {procesosDescubiertos.size === 0 ? (
                      <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 28%, transparent)", textAlign: "center", padding: "10px 12px", margin: 0, fontStyle: "italic" }}>
                        Aún no has completado ningún proceso.
                      </p>
                    ) : (
                      [...procesosDescubiertos].map((nombre) => (
                        <div key={nombre} style={{ padding: "6px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Zap size={8} style={{ color: "color-mix(in srgb, var(--accent,var(--primary)) 80%, transparent)", flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "color-mix(in srgb, var(--foreground) 85%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {nombre}
                          </p>
                        </div>
                      ))
                    )}

                    {/* ── IUMs revelados (abajo) ── */}
                    <div style={{ padding: "8px 10px 4px", borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                      <p style={{ margin: 0, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                        IUMs revelados
                      </p>
                    </div>

                    {(() => {
                      const revelados = iums.filter((i) => conocimiento.get(i.id)?.funcion_revelada);
                      if (!revelados.length) {
                        return (
                          <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 28%, transparent)", textAlign: "center", padding: "10px 12px", margin: 0, fontStyle: "italic" }}>
                            Ninguno todavía. Prueba combinaciones.
                          </p>
                        );
                      }
                      return revelados.map((ium) => {
                        const conocido = conocimiento.get(ium.id)!;
                        const salidaPpal = salidas.find((s) => s.ium_id === ium.id && s.es_principal);
                        return (
                          <div key={ium.id} style={{ padding: "6px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)", display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ium.nombre}
                              </p>
                              {salidaPpal && (
                                <p style={{ margin: "1px 0 0", fontSize: 8, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.4 }}>
                                  {salidaPpal.nombre}
                                </p>
                              )}
                              {conocido.veces_en_reaccion_exitosa > 0 && (
                                <p style={{ margin: "1px 0 0", fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                                  {conocido.veces_en_reaccion_exitosa}× en reacciones
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {/* Footer: reiniciar descubrimientos (solo admins) */}
                    {esAdmin && (
                      <div style={{ padding: "8px 10px", borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                        <button
                          onClick={() => {
                            setProcesosDescubiertos(new Set());
                            setConocimiento((prev) => {
                              const next = new Map(prev);
                              for (const [id, val] of next) next.set(id, { ...val, funcion_revelada: false, veces_en_reaccion_exitosa: 0 });
                              return next;
                            });
                            setDescubrimientosAbierto(false);
                          }}
                          style={{
                            width: "100%", padding: "5px 10px", borderRadius: 6, border: "none",
                            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                            color: "color-mix(in srgb, var(--primary) 70%, transparent)",
                            fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em",
                            textTransform: "uppercase", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 14%, transparent)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                        >
                          <RotateCcw size={8} />
                          Reiniciar descubrimientos
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botón Admin — solo visible para admins */}
              {esAdmin && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setAdminPanelAbierto((v) => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 12px", borderRadius: 999,
                      background: adminPanelAbierto
                        ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                        : "color-mix(in srgb, var(--primary) 7%, transparent)",
                      color: "var(--primary)",
                      border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
                      cursor: "pointer",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    }}
                    title="Modo admin: cargar configuración canónica"
                  >
                    <BookOpen size={10} />
                    Configs
                  </button>

                  {adminPanelAbierto && (
                    <div
                      style={{
                        position: "absolute", top: "calc(100% + 6px)", right: 0,
                        width: 280, maxHeight: 380, overflowY: "auto",
                        background: "var(--bg-main, #0a0a0a)",
                        border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                        borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        zIndex: 20,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div style={{ padding: "8px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ margin: 0, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                          Configuraciones canónicas
                        </p>
                        <button onClick={() => setAdminPanelAbierto(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
                          <X size={10} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                        </button>
                      </div>

                      {loadingConfigs ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                        </div>
                      ) : configsAdmin.length === 0 ? (
                        <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 30%, transparent)", textAlign: "center", padding: "14px 12px", margin: 0, fontStyle: "italic" }}>
                          No hay configuraciones disponibles.
                        </p>
                      ) : (() => {
                        // Agrupar por Oris → nivel_dominio → conjuración
                        type NivelMap = Map<string, ConfigAdmin[]>;
                        type OrisMap = Map<string, NivelMap>;
                        const porOris: OrisMap = new Map();
                        for (const cfg of configsAdmin) {
                          const orisKey = cfg.oris ?? "Sin Oris";
                          const nivelKey = cfg.nivel_dominio ?? "Sin nivel";
                          if (!porOris.has(orisKey)) porOris.set(orisKey, new Map());
                          const nivelMap = porOris.get(orisKey)!;
                          if (!nivelMap.has(nivelKey)) nivelMap.set(nivelKey, []);
                          nivelMap.get(nivelKey)!.push(cfg);
                        }
                        return [...porOris.entries()].map(([orisKey, nivelMap]) => (
                          <div key={orisKey}>
                            {/* Cabecera Oris */}
                            <div style={{ padding: "7px 10px 4px", borderTop: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", background: "color-mix(in srgb, var(--primary) 7%, transparent)", position: "sticky", top: 0, zIndex: 1 }}>
                              <p style={{ margin: 0, fontSize: 9, fontWeight: 900, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                {orisKey}
                              </p>
                            </div>
                            {[...nivelMap.entries()].map(([nivelKey, cfgs]) => (
                              <div key={nivelKey}>
                                {/* Sub-cabecera nivel dominio */}
                                <div style={{ padding: "4px 10px 3px 14px", borderTop: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                                  <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: "color-mix(in srgb, var(--primary) 60%, transparent)", letterSpacing: "0.06em", textTransform: "capitalize" }}>
                                    {nivelKey}
                                  </p>
                                </div>
                            {/* Configs de ese proceso */}
                                {cfgs.map((cfg) => {
                                  const cargando = adminCargando === cfg.configuracion_id;
                                  return (
                                    <button
                                      key={cfg.configuracion_id}
                                      onClick={() => aplicarConfigAdmin(cfg)}
                                      disabled={!!adminCargando}
                                      style={{
                                        width: "100%", textAlign: "left", border: "none",
                                        background: "none", cursor: adminCargando ? "wait" : "pointer",
                                        padding: "5px 10px 5px 20px",
                                        borderBottom: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)",
                                        display: "flex", alignItems: "flex-start", gap: 6,
                                        opacity: adminCargando && !cargando ? 0.5 : 1,
                                      }}
                                      onMouseEnter={(e) => { if (!adminCargando) (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                                    >
                                      {cargando
                                        ? <Loader2 size={8} style={{ animation: "spin 1s linear infinite", flexShrink: 0, marginTop: 2, color: "var(--primary)" }} />
                                        : <Play size={8} style={{ flexShrink: 0, marginTop: 2, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
                                      }
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {cfg.conjuracion ?? cfg.proceso ?? "Sin nombre"}
                                        </p>
                                        <p style={{ margin: "1px 0 0", fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {cfg.topologia ?? "Sin topología"} · {cfg.n_iums} IUMs
                                        </p>
                                        {cfg.descripcion && (
                                          <p style={{ margin: "1px 0 0", fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 30%, transparent)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                            {cfg.descripcion}
                                          </p>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        ));
                      })()}

                      {/* Footer */}
                      <div style={{ padding: "6px 10px", textAlign: "center", borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                        <p style={{ margin: 0, fontSize: 7.5, color: "color-mix(in srgb, var(--primary) 22%, transparent)", fontStyle: "italic" }}>
                          Solo visible para admins · aplica y luego pulsa Probar
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón Probar */}
              <button
                onClick={simular}
                disabled={!componentes.length || simulando}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 999,
                  background: "var(--primary)",
                  color: "var(--btn-text)",
                  border: "none",
                  cursor: componentes.length && !simulando ? "pointer" : "not-allowed",
                  opacity: componentes.length && !simulando ? 1 : 0.35,
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                }}
              >
                {simulando
                  ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Reaccionando…</>
                  : <><Play size={10} /> Probar</>}
              </button>
            </div>

            {/* Canvas/SVG área — placeholder si no hay nada aún */}
            {componentes.length === 0 && !topoSeleccionada ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <FlaskConical size={32} style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }} />
                <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)", textAlign: "center", maxWidth: 200, margin: 0, lineHeight: 1.6 }}>
                  Agrega IUMs desde el panel izquierdo.<br />
                  <span style={{ fontSize: 9 }}>Arrastra para mover · click derecho para unir</span>
                </p>
              </div>
            ) : (
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
            <svg
              ref={svgRef}
              style={{ flex: 1, display: "block", cursor: linkingFrom ? "crosshair" : "default", userSelect: "none" }}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              onMouseDown={(e) => { onCanvasMouseDown(e); }}
              onMouseMove={(e) => { onSVGMouseMove(e); }}
              onMouseUp={(e) => { onSVGMouseUp(e); }}
              onMouseLeave={() => { dragging.current = null; }}
              onContextMenu={(e) => {
                if (linkingFrom) { e.preventDefault(); setLinkingFrom(null); setLinkingMouse(null); setLinkingOver(null); }
              }}
            >
              <defs>
                <marker id={ARROW_ID} markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto">
                  <path d="M0,0.5 L0,5.5 L6,3 z" style={{ fill: ARROW_COLOR }} />
                </marker>
              </defs>

              {/* Uniones fantasma de la topología (solo entre slots visibles) */}
              {topoSeleccionada && !faseAnimacion && (() => {
                const slots = getSlotsActivos(topoSeleccionada);
                const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
                return topoSeleccionada.uniones
                  .filter((u) => {
                    if (!slotsVisibles) return true;
                    return (
                      slotsVisibles.has(canonKey(u.origen_posicion)) &&
                      slotsVisibles.has(canonKey(u.destino_posicion))
                    );
                  })
                  .map((u, i) => {
                  const orPos  = slots[u.origen_posicion];
                  const dstPos = slots[u.destino_posicion];
                  if (!orPos || !dstPos) return null;
                  const orComp  = componentes.find((c) => c.posicion === toUI(u.origen_posicion));
                  const dstComp = componentes.find((c) => c.posicion === toUI(u.destino_posicion));
                  if (orComp && dstComp) return null;
                  const x1 = orComp  ? orComp.x  : orPos.x;
                  const y1 = orComp  ? orComp.y  : orPos.y;
                  const x2 = dstComp ? dstComp.x : dstPos.x;
                  const y2 = dstComp ? dstComp.y : dstPos.y;
                  return (
                    <ConnectionLine
                      key={`topo-${i}`}
                      x1={x1} y1={y1}
                      x2={x2} y2={y2}
                      tipo={u.tipo_union}
                      label={u.tipo_union}
                    />
                  );
                });
              })()}

              {/* Conexiones existentes */}
              {!faseAnimacion && enlaces.map((e) => {
                const or  = componentes.find((c) => c.uid === e.origen_uid);
                const dst = componentes.find((c) => c.uid === e.destino_uid);
                if (!or || !dst) return null;
                return (
                  <ConnectionLine
                    key={e.uid}
                    x1={or.x} y1={or.y}
                    x2={dst.x} y2={dst.y}
                    tipo={e.tipo_union}
                    label={e.tipo_union}
                    resonancia={enlacesConResonancia.has(e.uid)}
                    onRemove={() => setEnlaces((prev) => prev.filter((x) => x.uid !== e.uid))}
                  />
                );
              })}

              {/* Línea de enlace en progreso */}
              {linkingFrom && linkingMouse && (() => {
                const from = componentes.find((c) => c.uid === linkingFrom);
                if (!from) return null;
                return (
                  <line
                    x1={from.x} y1={from.y}
                    x2={linkingMouse.x} y2={linkingMouse.y}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    style={{ stroke: "var(--primary)", pointerEvents: "none" }}
                  />
                );
              })()}

              {/* Grid de slots de topología (solo los visibles) */}
              {topoSeleccionada && !faseAnimacion && (() => {
                const allSlots = getSlotsActivos(topoSeleccionada);
                const slots = Object.entries(allSlots).filter(
                  ([k]) => !slotsVisibles || slotsVisibles.has(k),
                );
                const toUI = (k: string) => k === "nucleo" ? "N" : k.toUpperCase();
                return slots.map(([key, pos]) => {
                  const posUI = toUI(key);
                  const ocupado = componentes.some((c) => c.posicion === posUI);
                  const esDragPreview = dragSlotPreview?.key === key;
                  return (
                    <g key={key}
                      onClick={!ocupado ? (e) => {
                        e.stopPropagation();
                        setSlotDropdown(slotDropdown?.key === key ? null : { key, posUI, x: pos.x, y: pos.y });
                        setBusquedaSlot("");
                      } : undefined}
                      style={!ocupado ? { cursor: "pointer" } : undefined}
                    >
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={NODE_R + 10}
                        fill={slotDropdown?.key === key
                          ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                          : esDragPreview
                            ? "color-mix(in srgb, var(--primary) 16%, transparent)"
                            : "color-mix(in srgb, var(--primary) 4%, transparent)"}
                        stroke={slotDropdown?.key === key
                          ? "var(--primary)"
                          : esDragPreview
                            ? "color-mix(in srgb, var(--primary) 70%, transparent)"
                            : ocupado
                              ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                              : "color-mix(in srgb, var(--primary) 28%, transparent)"}
                        strokeWidth={slotDropdown?.key === key ? 2 : esDragPreview ? 2 : 1}
                        strokeDasharray={ocupado ? undefined : "4 3"}
                        style={{ transition: "fill 0.15s, stroke 0.15s" }}
                      />
                      <text
                        x={pos.x} y={pos.y - (NODE_R + 10) + 14}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 10, fontWeight: 800,
                          fill: slotDropdown?.key === key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                          pointerEvents: "none", userSelect: "none", letterSpacing: "0.12em",
                        }}
                      >
                        {posUI}
                      </text>
                      {!ocupado && (
                        <text
                          x={pos.x} y={pos.y + 6}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: 26, fontWeight: 200,
                            fill: slotDropdown?.key === key
                              ? "var(--primary)"
                              : "color-mix(in srgb, var(--primary) 28%, transparent)",
                            pointerEvents: "none", userSelect: "none",
                            transition: "fill 0.15s",
                          }}
                        >
                          +
                        </text>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Botones "+" en frontier slots — solo si hay configs que usen más IUMs que los visibles */}
              {topoSeleccionada && slotsVisibles && !faseAnimacion && (() => {
                const layout = getSlotsActivos(topoSeleccionada);
                // Si hay datos en Supabase, solo mostrar "+" hasta el máximo real de configs.
                // Si no hay datos (topología sin configs), siempre permitir explorar.
                const rango = topoRangos.get(topoSeleccionada.id);
                const maxPermitido = rango ? rango.maxIumes : Object.keys(layout).length;
                if (slotsVisibles.size >= maxPermitido) return null; // ya llegamos al máximo útil
                const frontier = getFrontierSlots(topoSeleccionada, slotsVisibles, layout);
                return frontier.map(({ key, x, y }) => (
                  <g
                    key={`frontier-${key}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlotsVisibles((prev) => new Set([...(prev ?? Object.keys(layout)), key]));
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Línea guía tenue hacia el frontier */}
                    {topoSeleccionada.uniones
                      .filter((u) => {
                        const orKey  = canonKey(u.origen_posicion);
                        const dstKey = canonKey(u.destino_posicion);
                        return (orKey === key && slotsVisibles.has(dstKey)) ||
                               (dstKey === key && slotsVisibles.has(orKey));
                      })
                      .map((u, i) => {
                        const orKey  = canonKey(u.origen_posicion);
                        const isOr   = orKey === key;
                        const peerKey = isOr ? canonKey(u.destino_posicion) : orKey;
                        const peerPos = layout[peerKey];
                        if (!peerPos) return null;
                        return (
                          <line
                            key={i}
                            x1={peerPos.x} y1={peerPos.y}
                            x2={x} y2={y}
                            strokeWidth={1}
                            strokeDasharray="3 5"
                            style={{ stroke: "color-mix(in srgb, var(--primary) 12%, transparent)", pointerEvents: "none" }}
                          />
                        );
                      })
                    }
                    {/* Círculo pequeño del botón */}
                    <circle
                      cx={x} cy={y}
                      r={22}
                      fill="color-mix(in srgb, var(--primary) 3%, transparent)"
                      stroke="color-mix(in srgb, var(--primary) 13%, transparent)"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                    />
                    <text
                      x={x} y={y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontSize: 18,
                        fontWeight: 300,
                        fill: "color-mix(in srgb, var(--primary) 20%, transparent)",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      +
                    </text>
                  </g>
                ));
              })()}

              {/* Nodos — visibles en combinando (la copia animada los reemplaza progresivamente),
                          ocultos en explosion/efecto */}
              {(() => {
                // ── Calcular animDelay por nodo según topología (BFS desde nodo final) ──
                // Los nodos más lejanos del núcleo se activan primero (delay menor).
                const reaccionActual = !resultado || resultado.estado !== "simulado" ? null
                  : (resultado.proceso_principal || resultado.conjuracion_principal) ? "exito"
                  : (resultado.ambiguo || (resultado.procesos_candidatos?.length ?? 0) > 0) ? "inestable"
                  : null;

                const animDelayPorUid = new Map<string, number>();
                if (reaccionActual && componentes.length > 0) {
                  // Calcular in-degree para encontrar el núcleo
                  const inDegAnim = new Map<string, number>();
                  for (const c of componentes) inDegAnim.set(c.uid, 0);
                  for (const e of enlaces) inDegAnim.set(e.destino_uid, (inDegAnim.get(e.destino_uid) ?? 0) + 1);
                  let finalUidAnim = componentes[0].uid;
                  let maxInAnim = -1;
                  for (const c of componentes) {
                    const deg = inDegAnim.get(c.uid) ?? 0;
                    if (deg > maxInAnim || (deg === maxInAnim && c.posicion === "N")) { maxInAnim = deg; finalUidAnim = c.uid; }
                  }
                  // BFS inverso desde el núcleo → distancia de cada nodo al núcleo
                  const invAdjAnim = new Map<string, string[]>();
                  for (const e of enlaces) {
                    const arr = invAdjAnim.get(e.destino_uid) ?? [];
                    arr.push(e.origen_uid);
                    invAdjAnim.set(e.destino_uid, arr);
                  }
                  const distAnim = new Map<string, number>();
                  const qAnim = [finalUidAnim];
                  distAnim.set(finalUidAnim, 0);
                  while (qAnim.length) {
                    const cur = qAnim.shift()!;
                    const d = distAnim.get(cur)!;
                    for (const src of (invAdjAnim.get(cur) ?? [])) {
                      if (!distAnim.has(src)) { distAnim.set(src, d + 1); qAnim.push(src); }
                    }
                  }
                  const maxDistAnim = Math.max(...Array.from(distAnim.values()), 0);
                  // Nodo más lejano del núcleo → delay 0 (se activa primero)
                  // Nodo núcleo → delay mayor (se activa último)
                  const DELAY_STEP = 0.22; // segundos entre niveles
                  for (const c of componentes) {
                    const dist = distAnim.get(c.uid) ?? 0;
                    animDelayPorUid.set(c.uid, (maxDistAnim - dist) * DELAY_STEP);
                  }
                }

                return componentes.map((comp) => (
                  <g
                    key={comp.uid}
                    data-ium-node="true"
                    style={{
                      opacity: faseAnimacion ? 0 : 1,
                      transition: "opacity 0.4s ease",
                      pointerEvents: faseAnimacion ? "none" : undefined,
                    }}
                  >
                    <IumNodeSVG
                      comp={comp}
                      iumData={iumMap.get(comp.ium_id)}
                      salidas={salidas.filter((s) => s.ium_id === comp.ium_id)}
                      selected={false}
                      linking={linkingFrom === comp.uid}
                      funcionRevelada={conocimiento.get(comp.ium_id)?.funcion_revelada ?? false}
                      reaccion={reaccionActual}
                      animDelay={animDelayPorUid.get(comp.uid) ?? 0}
                      colorTASI={colorTASIdeIum(iumMap.get(comp.ium_id))}
                      scale={currentScale}
                      onMouseDownDrag={(e) => onNodeMouseDown(comp.uid, e)}
                      onContextMenu={(e) => onNodeContextMenu(comp.uid, e)}
                      onRemove={() => {
                        setComponentes((prev) => prev.filter((c) => c.uid !== comp.uid));
                        setEnlaces((prev) => prev.filter((e) => e.origen_uid !== comp.uid && e.destino_uid !== comp.uid));
                      }}
                      onMouseEnter={() => setLinkingOver(comp.uid)}
                      onMouseLeave={() => setLinkingOver(null)}
                    />
                  </g>
                ));
              })()}

              {/* ── Overlay de animación de conjuración ─────────────────────────── */}
              {faseAnimacion && resultado && componentes.length > 0 && (() => {
                const cx = viewBox.x + viewBox.w / 2;
                const cy = viewBox.y + viewBox.h / 2;
                const nombreRes = resultado.conjuracion_principal ?? resultado.proceso_principal ?? "";
                // Duración base por "salto" en la cadena
                const DUR_SALTO = 0.85;
                const STAGGER_SALTO = 0.15;

                // ──────────────────────────────────────────────────────────────
                // FASE 1: "combinando" — IUMs siguen las flechas, se empujan
                //   hacia el nodo destino en orden topológico, luego el último
                //   (el que tiene in-degree = 0 como destino final / núcleo)
                //   vuela al centro.
                // ──────────────────────────────────────────────────────────────
                if (faseAnimacion === "combinando") {
                  // ── Calcular orden de animación siguiendo los enlaces ───────
                  // uid → uid destino directo según los enlaces
                  const uidPorPos = new Map(componentes.map((c) => [c.uid, c]));
                  // Para cada nodo: cuál es su destino inmediato según los enlaces
                  // (primer enlace saliente; si hay varios se toma el primero)
                  const destinoDirecto = new Map<string, string>(); // uid → uid destino
                  for (const e of enlaces) {
                    if (!destinoDirecto.has(e.origen_uid)) {
                      destinoDirecto.set(e.origen_uid, e.destino_uid);
                    }
                  }
                  // In-degree como destino: nodos a los que apuntan muchos
                  const inDegree = new Map<string, number>();
                  for (const comp of componentes) inDegree.set(comp.uid, 0);
                  for (const e of enlaces) inDegree.set(e.destino_uid, (inDegree.get(e.destino_uid) ?? 0) + 1);

                  // El nodo "acumulador final" es el que tiene mayor in-degree
                  // (todos los demás apuntan a él, directo o indirecto).
                  // Si hay empate, se prefiere el que se llame "N" (núcleo).
                  let finalUid = componentes[0].uid;
                  let maxIn = -1;
                  for (const comp of componentes) {
                    const deg = inDegree.get(comp.uid) ?? 0;
                    if (deg > maxIn || (deg === maxIn && comp.posicion === "N")) {
                      maxIn = deg;
                      finalUid = comp.uid;
                    }
                  }
                  const finalComp = uidPorPos.get(finalUid)!;

                  // Asignar wave (cuándo sale cada nodo) siguiendo cadena:
                  // Los nodos que apuntan al final van en wave 0.
                  // Los que apuntan a esos van en wave -1 (antes), etc.
                  // Usamos distancia desde cada nodo hasta finalUid.
                  const distHastaFinal = new Map<string, number>();
                  // BFS inverso desde finalUid
                  const invAdj = new Map<string, string[]>(); // uid → [uids que apuntan a él]
                  for (const e of enlaces) {
                    const arr = invAdj.get(e.destino_uid) ?? [];
                    arr.push(e.origen_uid);
                    invAdj.set(e.destino_uid, arr);
                  }
                  const queue = [finalUid];
                  distHastaFinal.set(finalUid, 0);
                  while (queue.length) {
                    const cur = queue.shift()!;
                    const d = distHastaFinal.get(cur)!;
                    for (const src of (invAdj.get(cur) ?? [])) {
                      if (!distHastaFinal.has(src)) {
                        distHastaFinal.set(src, d + 1);
                        queue.push(src);
                      }
                    }
                  }
                  // Nodos sin conexión (no llegan al final) — darles distancia máx+1
                  const maxDist = Math.max(...Array.from(distHastaFinal.values()), 0);
                  for (const comp of componentes) {
                    if (!distHastaFinal.has(comp.uid)) distHastaFinal.set(comp.uid, maxDist + 1);
                  }

                  // Tiempo de inicio de cada nodo: los más lejanos del final van primero
                  // wave = maxDist - dist (más lejano = wave 0)
                  const getStartTime = (uid: string) => {
                    const dist = distHastaFinal.get(uid) ?? 0;
                    return (maxDist - dist) * (DUR_SALTO * 0.7 + STAGGER_SALTO);
                  };

                  // Destino de cada nodo:
                  // - Todos los nodos no-finales convergen hacia finalComp (el núcleo)
                  // - El nodo final (núcleo) vuela al centro del canvas
                  // Esto hace que el movimiento sea visible — cada IUM cruza el canvas.
                  const getDestino = (uid: string): { tx: number; ty: number } => {
                    if (uid === finalUid) return { tx: cx, ty: cy };
                    return { tx: finalComp.x, ty: finalComp.y };
                  };

                  // Tiempo total de animación del nodo final (para calcular fade out)
                  const finalStartTime = getStartTime(finalUid);
                  const TOTAL_DUR = finalStartTime + DUR_SALTO + 0.15;

                  const ak = animKey.current;

                  return (
                    <g key={`comb-${ak}`} style={{ pointerEvents: "none" }}>

                      {componentes.map((comp) => {
                        const { tx, ty }  = getDestino(comp.uid);
                        const esFinal     = comp.uid === finalUid;
                        const rotG        = esFinal ? 720 : 360;
                        const durS        = esFinal ? DUR_SALTO * 1.2 : DUR_SALTO;
                        const startTime   = getStartTime(comp.uid);
                        const durEfectiva = `${durS.toFixed(2)}s`;
                        const delay       = `${startTime.toFixed(2)}s`;
                        const color       = colorTASIdeIum(iumMap.get(comp.ium_id));
                        const nombre      = comp.ium_nombre.slice(0, 2).toUpperCase();

                        // Estela curva
                        const dx2  = tx - comp.x;
                        const dy2  = ty - comp.y;
                        const d2   = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
                        const midX = comp.x + dx2*0.5 - (dy2/d2)*28;
                        const midY = comp.y + dy2*0.5 + (dx2/d2)*28;

                        return (
                          <g key={comp.uid}>
                            {/* Estela */}
                            <path
                              d={`M ${comp.x} ${comp.y} Q ${midX} ${midY} ${tx} ${ty}`}
                              fill="none" stroke={color}
                              strokeWidth={1.5} strokeDasharray="3 5" opacity={0}
                            >
                              <animate attributeName="opacity"
                                values="0;0.6;0.8;0" keyTimes="0;0.08;0.6;1"
                                dur={durEfectiva} begin={delay} fill="freeze" />
                            </path>

                            {/* ── Nodo animado — 100% SMIL ──────────────────────────
                                g exterior: animateTransform type="translate" mueve el nodo
                                  de su posición original al destino. SIN transform atributo
                                  en el g → el animateTransform no tiene que "sumarse" a nada.
                                  <animate opacity> hace fade in/out del nodo completo.
                                g interior: animateTransform type="rotate" gira sobre (0,0)
                                  que es el centro del nodo (los círculos son cx=0 cy=0).
                            ──────────────────────────────────────────────────────── */}
                            <g>
                              <animateTransform
                                attributeName="transform"
                                type="translate"
                                from={`${comp.x} ${comp.y}`}
                                to={`${tx} ${ty}`}
                                dur={durEfectiva}
                                begin={delay}
                                fill="freeze"
                                calcMode="spline"
                                keySplines="0.4 0 0.2 1"
                                keyTimes="0;1"
                              />
                              <animate attributeName="opacity"
                                values="0;1;1;0"
                                keyTimes="0;0.04;0.82;1"
                                dur={durEfectiva} begin={delay} fill="freeze" />

                              <g>
                                <animateTransform
                                  attributeName="transform"
                                  type="rotate"
                                  from="0 0 0"
                                  to={`${rotG} 0 0`}
                                  dur={durEfectiva}
                                  begin={delay}
                                  fill="freeze"
                                />
                                {/* Halo */}
                                <circle cx={0} cy={0} r={VIS_R + 10}
                                  fill="none" strokeWidth={1.5} stroke={color} opacity={0.7}>
                                  <animate attributeName="r"
                                    values={`${VIS_R+10};${VIS_R+20};0`}
                                    keyTimes="0;0.7;1"
                                    dur={durEfectiva} begin={delay} fill="freeze" />
                                  <animate attributeName="opacity"
                                    values="0.7;0.3;0"
                                    keyTimes="0;0.7;1"
                                    dur={durEfectiva} begin={delay} fill="freeze" />
                                </circle>
                                {/* Círculo */}
                                <circle cx={0} cy={0} r={VIS_R} fill={color}>
                                  <animate attributeName="r"
                                    values={`${VIS_R};${esFinal ? VIS_R*1.3 : VIS_R*1.1};0`}
                                    keyTimes="0;0.82;1"
                                    dur={durEfectiva} begin={delay} fill="freeze" />
                                  <animate attributeName="opacity"
                                    values="1;1;0"
                                    keyTimes="0;0.82;1"
                                    dur={durEfectiva} begin={delay} fill="freeze" />
                                </circle>
                                {/* Texto */}
                                <text x={0} y={0}
                                  textAnchor="middle" dominantBaseline="central"
                                  fontSize={14} fontWeight={900}
                                  fill="var(--bg-main)">
                                  {nombre}
                                  <animate attributeName="opacity"
                                    values="1;1;0" keyTimes="0;0.75;1"
                                    dur={durEfectiva} begin={delay} fill="freeze" />
                                </text>
                                {/* Partículas orbitales */}
                                {[0,1,2].map((pi) => (
                                  <circle key={pi}
                                    cx={Math.cos((pi/3)*Math.PI*2)*(VIS_R+8)}
                                    cy={Math.sin((pi/3)*Math.PI*2)*(VIS_R+8)}
                                    r={2.5} fill={color}>
                                    <animate attributeName="opacity"
                                      values="1;0.5;0" keyTimes="0;0.7;1"
                                      dur={durEfectiva} begin={delay} fill="freeze" />
                                  </circle>
                                ))}
                                {/* Pulso de absorción al llegar */}
                                {!esFinal && (
                                  <circle cx={0} cy={0} r={0}
                                    fill="none" stroke={color} strokeWidth={2} opacity={0}>
                                    <animate attributeName="r"
                                      values={`0;${VIS_R*1.8}`} dur="0.3s"
                                      begin={`${(startTime + DUR_SALTO * 0.85).toFixed(2)}s`}
                                      fill="freeze" />
                                    <animate attributeName="opacity"
                                      values="0.8;0" dur="0.3s"
                                      begin={`${(startTime + DUR_SALTO * 0.85).toFixed(2)}s`}
                                      fill="freeze" />
                                  </circle>
                                )}
                              </g>
                            </g>
                          </g>
                        );
                      })}
                      {/* Indicador "cargando" en el acumulador mientras recibe */}
                      {maxDist > 0 && (() => {
                        const absorbStart = getStartTime(componentes.find((c) =>
                          (distHastaFinal.get(c.uid) ?? 0) === 1
                        )?.uid ?? "");
                        const absorbEnd = finalStartTime;
                        const absorbDur = Math.max(0.2, absorbEnd - absorbStart);
                        return (
                          <circle cx={finalComp.x} cy={finalComp.y} r={VIS_R + 6}
                            fill="none" stroke={colorTASIdeIum(iumMap.get(finalComp.ium_id))}
                            strokeWidth={2} opacity={0}
                          >
                            <animate attributeName="opacity"
                              values="0;0.6;0.9;0.6;0"
                              dur={`${absorbDur}s`}
                              begin={`${absorbStart.toFixed(2)}s`}
                              fill="freeze"
                            />
                            <animate attributeName="r"
                              values={`${VIS_R + 4};${VIS_R + 10};${VIS_R + 14};${VIS_R + 10};${VIS_R + 4}`}
                              dur={`${absorbDur}s`}
                              begin={`${absorbStart.toFixed(2)}s`}
                              fill="freeze"
                            />
                          </circle>
                        );
                      })()}
                    </g>
                  );
                }

                // FASES 2 y 3 eliminadas — el canvas IumMergedCanvas maneja todo lo posterior
                if (faseAnimacion === "explosion" || faseAnimacion === "efecto") return null;

                if (false && faseAnimacion === "explosion") {
                  // Colores únicos de los IUMs en el canvas
                  const coloresIums = [...new Set(componentes.map((c) => colorTASIdeIum(iumMap.get(c.ium_id))))];
                  return (
                    <g key={`exp-${animKey.current}`} style={{ pointerEvents: "none" }}>
                      {/* Flash central */}
                      <circle cx={cx} cy={cy} r={4} fill="white">
                        <animate attributeName="r"   values="4;55;80"  dur="0.45s" fill="freeze" calcMode="spline" keySplines="0 0 0.2 1;0 0 0.5 1" />
                        <animate attributeName="opacity" values="1;0.6;0" dur="0.45s" fill="freeze" />
                      </circle>
                      {/* Anillos expansivos por cada color TASI */}
                      {coloresIums.map((color, ri) => (
                        <circle key={ri} cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={2.5}>
                          <animate attributeName="r"
                            values={`5;${60 + ri * 18};${90 + ri * 18}`}
                            dur="0.45s"
                            begin={`${ri * 0.04}s`}
                            fill="freeze"
                            calcMode="spline"
                            keySplines="0 0 0.2 1;0 0 0.5 1"
                          />
                          <animate attributeName="opacity"
                            values="0.9;0.5;0"
                            dur="0.45s"
                            begin={`${ri * 0.04}s`}
                            fill="freeze"
                          />
                          <animate attributeName="stroke-width"
                            values="2.5;1.5;0.5"
                            dur="0.45s"
                            begin={`${ri * 0.04}s`}
                            fill="freeze"
                          />
                        </circle>
                      ))}
                      {/* Rayos radiales */}
                      {Array.from({ length: 8 }, (_, i) => {
                        const ang = (i / 8) * Math.PI * 2;
                        const x2 = cx + Math.cos(ang) * 70;
                        const y2 = cy + Math.sin(ang) * 70;
                        return (
                          <line key={i} x1={cx} y1={cy} x2={cx} y2={cy}
                            stroke={coloresIums[i % coloresIums.length] ?? "var(--primary)"}
                            strokeWidth={1.5}
                          >
                            <animate attributeName="x2" values={`${cx};${x2}`} dur="0.3s" begin={`${i * 0.015}s`} fill="freeze" />
                            <animate attributeName="y2" values={`${cy};${y2}`} dur="0.3s" begin={`${i * 0.015}s`} fill="freeze" />
                            <animate attributeName="opacity" values="1;0.6;0" dur="0.45s" fill="freeze" />
                          </line>
                        );
                      })}
                    </g>
                  );
                }

                // ──────────────────────────────────────────────────────────────
                // FASE 3: "efecto" — el canvas IumMergedCanvas ya muestra las
                // animFn superpuestas en el centro; no se pinta nada en SVG aquí.
                // ──────────────────────────────────────────────────────────────
                if (faseAnimacion === "efecto") return null;

                // (código de respaldo, ya no se alcanza)
                const ef: OrisEfectoVisual = orisEfecto ?? {
                  oris_id: "",
                  nombre_efecto: "",
                  particula_forma: "circulo",
                  particula_color_hex: colorTASIdeIum(iumMap.get(componentes[0]?.ium_id)),
                  particula_color_secundario: null,
                  particula_cantidad: 12,
                  particula_radio: 3,
                  movimiento: "convergente",
                  velocidad_base: 1.0,
                  radio_orbita: 90,
                  glow_radio: 20,
                  glow_pulsa: true,
                  glow_color_hex: null,
                  tiene_estela: false,
                  tiene_rayos: false,
                  tiene_anillo_expansivo: false,
                };

                const color1 = ef.particula_color_hex ?? colorTASIdeIum(iumMap.get(componentes[0]?.ium_id));
                const color2 = ef.particula_color_secundario ?? color1;
                const glowColor = ef.glow_color_hex ?? color1;
                const N = ef.particula_cantidad;
                const R = ef.particula_radio;
                const orbR = ef.radio_orbita ?? 90;
                const velMul = ef.velocidad_base;
                const glowR = ef.glow_radio;
                const glowDur = `${(2.4 / velMul).toFixed(2)}s`;

                // Genera el SVG de una partícula según su forma
                const renderParticula = (
                  idx: number,
                  px: number, py: number,          // posición de inicio
                  destX: number, destY: number,    // destino
                  midX: number, midY: number,      // punto de control de curva (para zigzag/espiral)
                  durS: number,
                  delayS: number,
                  pColor: string,
                ) => {
                  const dur   = `${durS.toFixed(2)}s`;
                  const delay = `${delayS.toFixed(2)}s`;
                  const rc    = R + (idx % 3) * 0.5;

                  const animCxCy = (
                    <>
                      <animate attributeName="cx"
                        values={`${px};${midX};${destX}`}
                        keyTimes="0;0.5;1"
                        dur={dur} begin={delay} repeatCount="indefinite"
                        calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1" />
                      <animate attributeName="cy"
                        values={`${py};${midY};${destY}`}
                        keyTimes="0;0.5;1"
                        dur={dur} begin={delay} repeatCount="indefinite"
                        calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1" />
                    </>
                  );
                  const animOp = (
                    <animate attributeName="opacity"
                      values="0;1;0.8;0" keyTimes="0;0.08;0.75;1"
                      dur={dur} begin={delay} repeatCount="indefinite" />
                  );

                  switch (ef.particula_forma) {
                    case "rombo": {
                      return (
                        <polygon key={idx}
                          points={`${px},${py - rc} ${px + rc},${py} ${px},${py + rc} ${px - rc},${py}`}
                          fill={pColor}
                        >
                          <animate attributeName="points"
                            values={`${px},${py-rc} ${px+rc},${py} ${px},${py+rc} ${px-rc},${py};${midX},${midY-rc} ${midX+rc},${midY} ${midX},${midY+rc} ${midX-rc},${midY};${destX},${destY-rc} ${destX+rc},${destY} ${destX},${destY+rc} ${destX-rc},${destY}`}
                            keyTimes="0;0.5;1"
                            dur={dur} begin={delay} repeatCount="indefinite"
                            calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1" />
                          {animOp}
                        </polygon>
                      );
                    }
                    case "triangulo": {
                      const h = rc * 1.3;
                      return (
                        <polygon key={idx}
                          points={`${px},${py-h} ${px+h*0.9},${py+h*0.6} ${px-h*0.9},${py+h*0.6}`}
                          fill={pColor}
                        >
                          <animate attributeName="points"
                            values={`${px},${py-h} ${px+h*0.9},${py+h*0.6} ${px-h*0.9},${py+h*0.6};${midX},${midY-h} ${midX+h*0.9},${midY+h*0.6} ${midX-h*0.9},${midY+h*0.6};${destX},${destY-h} ${destX+h*0.9},${destY+h*0.6} ${destX-h*0.9},${destY+h*0.6}`}
                            keyTimes="0;0.5;1"
                            dur={dur} begin={delay} repeatCount="indefinite"
                            calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1" />
                          {animOp}
                        </polygon>
                      );
                    }
                    case "anillo": {
                      return (
                        <circle key={idx} r={rc} fill="none" stroke={pColor} strokeWidth={1.6}>
                          {animCxCy}{animOp}
                          <animate attributeName="r" values={`${rc};${rc*1.5};${rc*0.8}`}
                            dur={dur} begin={delay} repeatCount="indefinite" />
                        </circle>
                      );
                    }
                    case "estrella": {
                      // Cruz de 4 líneas que simula estrella
                      return (
                        <g key={idx}>
                          <line x1={0} y1={0} x2={0} y2={0}
                            stroke={pColor} strokeWidth={2} strokeLinecap="round">
                            <animate attributeName="x1" values={`${px-rc};${midX-rc};${destX-rc}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y1" values={`${py};${midY};${destY}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="x2" values={`${px+rc};${midX+rc};${destX+rc}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y2" values={`${py};${midY};${destY}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            {animOp}
                          </line>
                          <line x1={0} y1={0} x2={0} y2={0}
                            stroke={pColor} strokeWidth={2} strokeLinecap="round">
                            <animate attributeName="x1" values={`${px};${midX};${destX}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y1" values={`${py-rc};${midY-rc};${destY-rc}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="x2" values={`${px};${midX};${destX}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y2" values={`${py+rc};${midY+rc};${destY+rc}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            {animOp}
                          </line>
                        </g>
                      );
                    }
                    case "cruz": {
                      return (
                        <g key={idx}>
                          <line stroke={pColor} strokeWidth={1.5} strokeLinecap="round">
                            <animate attributeName="x1" values={`${px-rc*0.8};${midX-rc*0.8};${destX-rc*0.8}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y1" values={`${py};${midY};${destY}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="x2" values={`${px+rc*0.8};${midX+rc*0.8};${destX+rc*0.8}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y2" values={`${py};${midY};${destY}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            {animOp}
                          </line>
                          <line stroke={pColor} strokeWidth={1.5} strokeLinecap="round">
                            <animate attributeName="x1" values={`${px};${midX};${destX}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y1" values={`${py-rc*0.8};${midY-rc*0.8};${destY-rc*0.8}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="x2" values={`${px};${midX};${destX}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            <animate attributeName="y2" values={`${py+rc*0.8};${midY+rc*0.8};${destY+rc*0.8}`} keyTimes="0;0.5;1" dur={dur} begin={delay} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.6 1"/>
                            {animOp}
                          </line>
                        </g>
                      );
                    }
                    default: { // circulo
                      return (
                        <circle key={idx} r={rc} fill={pColor}>
                          {animCxCy}{animOp}
                          <animate attributeName="r" values={`${rc};${rc*1.5};${rc*0.6}`}
                            dur={dur} begin={delay} repeatCount="indefinite" />
                        </circle>
                      );
                    }
                  }
                };

                // Calcula origen/destino/mid según el movimiento del Oris
                const buildParticulas = () => {
                  return Array.from({ length: N }, (_, idx) => {
                    const ang = (idx / N) * Math.PI * 2;
                    const compIdx = idx % componentes.length;
                    const srcX = componentes[compIdx]?.x ?? cx;
                    const srcY = componentes[compIdx]?.y ?? cy;
                    const pColor = idx % 2 === 0 ? color1 : color2;
                    const durS = (1.2 + (idx % 5) * 0.17) / velMul;
                    const delayS = (idx * 0.11) % 1.6;

                    switch (ef.movimiento) {
                      case "divergente": {
                        // Centro → afuera en espiral
                        const tx = cx + Math.cos(ang) * orbR;
                        const ty = cy + Math.sin(ang) * orbR;
                        const mx = cx + Math.cos(ang + 0.5) * (orbR * 0.5);
                        const my = cy + Math.sin(ang + 0.5) * (orbR * 0.5);
                        return renderParticula(idx, cx, cy, tx, ty, mx, my, durS, delayS, pColor);
                      }
                      case "orbital": {
                        // Órbita circular alrededor del centro
                        const startAng = ang;
                        const midAng   = startAng + Math.PI;
                        const endAng   = startAng + Math.PI * 2;
                        const ox  = cx + Math.cos(startAng) * orbR;
                        const oy  = cy + Math.sin(startAng) * orbR;
                        const mx2 = cx + Math.cos(midAng) * orbR;
                        const my2 = cy + Math.sin(midAng) * orbR;
                        const ex  = cx + Math.cos(endAng) * orbR;
                        const ey  = cy + Math.sin(endAng) * orbR;
                        return renderParticula(idx, ox, oy, ex, ey, mx2, my2, durS * 2, delayS, pColor);
                      }
                      case "oscilante": {
                        // Se acercan y alejan entre orbR y orbR*0.3
                        const tx2  = cx + Math.cos(ang) * (orbR * 0.25);
                        const ty2  = cy + Math.sin(ang) * (orbR * 0.25);
                        const ox2  = cx + Math.cos(ang) * orbR;
                        const oy2  = cy + Math.sin(ang) * orbR;
                        // mid = punto medio con desvío perpendicular
                        const perpAng = ang + Math.PI / 2;
                        const mx3 = (ox2 + tx2) / 2 + Math.cos(perpAng) * 20;
                        const my3 = (oy2 + ty2) / 2 + Math.sin(perpAng) * 20;
                        return renderParticula(idx, ox2, oy2, tx2, ty2, mx3, my3, durS, delayS, pColor);
                      }
                      case "zigzag": {
                        // Origen → punto zigzag lateral → centro
                        const lateral = (idx % 2 === 0 ? 1 : -1);
                        const perpAng2 = Math.atan2(cy - srcY, cx - srcX) + Math.PI / 2;
                        const mx4 = (srcX + cx) / 2 + Math.cos(perpAng2) * lateral * 35;
                        const my4 = (srcY + cy) / 2 + Math.sin(perpAng2) * lateral * 35;
                        const jx  = Math.cos(ang) * 4;
                        const jy  = Math.sin(ang) * 4;
                        return renderParticula(idx, srcX, srcY, cx + jx, cy + jy, mx4, my4, durS, delayS, pColor);
                      }
                      case "espiral": {
                        // Convergente pero con punto de control girado ~90° desde el origen
                        const baseAng  = Math.atan2(srcY - cy, srcX - cx);
                        const spiralAng = baseAng + (idx % 2 === 0 ? 1 : -1) * (Math.PI * 0.6);
                        const spiralR   = Math.hypot(srcX - cx, srcY - cy) * 0.55;
                        const mx5 = cx + Math.cos(spiralAng) * spiralR;
                        const my5 = cy + Math.sin(spiralAng) * spiralR;
                        const jx2 = Math.cos(ang) * 4;
                        const jy2 = Math.sin(ang) * 4;
                        return renderParticula(idx, srcX, srcY, cx + jx2, cy + jy2, mx5, my5, durS, delayS, pColor);
                      }
                      default: { // convergente
                        const midFrac  = 0.5;
                        const mx6 = srcX + (cx - srcX) * midFrac;
                        const my6 = srcY + (cy - srcY) * midFrac;
                        const jx3 = Math.cos(ang) * 5;
                        const jy3 = Math.sin(ang) * 5;
                        return renderParticula(idx, srcX, srcY, cx + jx3, cy + jy3, mx6, my6, durS, delayS, pColor);
                      }
                    }
                  });
                };

                return (
                  <g key={`efecto-${animKey.current}`} style={{ pointerEvents: "none" }}>

                    {/* Glow central */}
                    <circle cx={cx} cy={cy} r={glowR * 0.6} fill={glowColor} opacity={0.55}>
                      {ef.glow_pulsa && <>
                        <animate attributeName="r"
                          values={`${glowR*0.5};${glowR};${glowR*0.5}`}
                          dur={glowDur} repeatCount="indefinite" />
                        <animate attributeName="opacity"
                          values="0.35;0.85;0.35"
                          dur={glowDur} repeatCount="indefinite" />
                      </>}
                    </circle>

                    {/* Anillo expansivo (si lo tiene) */}
                    {ef.tiene_anillo_expansivo && (
                      <circle cx={cx} cy={cy} r={0} fill="none" stroke={glowColor} strokeWidth={1.2} opacity={0.6}>
                        <animate attributeName="r"
                          values={`0;${orbR * 0.9};0`}
                          dur={`${(3.5 / velMul).toFixed(2)}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity"
                          values="0.8;0.2;0"
                          dur={`${(3.5 / velMul).toFixed(2)}s`} repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Rayos de energía al centro (si los tiene) */}
                    {ef.tiene_rayos && Array.from({ length: 6 }, (_, i) => {
                      const rayAng = (i / 6) * Math.PI * 2;
                      const rx = cx + Math.cos(rayAng) * orbR * 0.8;
                      const ry = cy + Math.sin(rayAng) * orbR * 0.8;
                      return (
                        <line key={i}
                          x1={cx} y1={cy} x2={rx} y2={ry}
                          stroke={i % 2 === 0 ? color1 : color2}
                          strokeWidth={1}
                          strokeDasharray="3 5"
                          opacity={0.4}
                        >
                          <animate attributeName="opacity"
                            values="0;0.6;0" keyTimes="0;0.5;1"
                            dur={`${(1.8 / velMul + i * 0.12).toFixed(2)}s`}
                            begin={`${(i * 0.18).toFixed(2)}s`}
                            repeatCount="indefinite" />
                          <animate attributeName="x2"
                            values={`${cx};${rx};${cx}`}
                            dur={`${(1.8 / velMul + i * 0.12).toFixed(2)}s`}
                            begin={`${(i * 0.18).toFixed(2)}s`}
                            repeatCount="indefinite" />
                          <animate attributeName="y2"
                            values={`${cy};${ry};${cy}`}
                            dur={`${(1.8 / velMul + i * 0.12).toFixed(2)}s`}
                            begin={`${(i * 0.18).toFixed(2)}s`}
                            repeatCount="indefinite" />
                        </line>
                      );
                    })}

                    {/* Partículas */}
                    {buildParticulas()}

                    {/* Nombre de la conjuración */}
                    <text
                      x={cx} y={cy + glowR + 16}
                      textAnchor="middle" dominantBaseline="hanging"
                      fontSize={13} fontWeight={800}
                      style={{ fill: "var(--foreground)", letterSpacing: "0.05em" }}
                    >
                      {nombreRes}
                      <animate attributeName="opacity" values="0;1" dur="0.4s" fill="freeze" />
                    </text>
                    <text
                      x={cx} y={cy + glowR + 34}
                      textAnchor="middle" dominantBaseline="hanging"
                      fontSize={8}
                      style={{ fill: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                    >
                      Toca el tablero para limpiar
                      <animate attributeName="opacity" values="0;0.8" dur="0.8s" fill="freeze" />
                    </text>
                  </g>
                );
              })()}
            </svg>

            {/* ── Overlay unificado — un solo canvas para todas las animaciones ── */}
            {(() => {
              const reaccionActual = !resultado || resultado.estado !== "simulado" ? null
                : (resultado.proceso_principal || resultado.conjuracion_principal) ? "exito"
                : (resultado.ambiguo || (resultado.procesos_candidatos?.length ?? 0) > 0) ? "inestable"
                : null;

              if (!reaccionActual || !svgRef.current) return null;

              const svgEl   = svgRef.current;
              const ctm     = svgEl.getScreenCTM();
              const divEl   = svgEl.parentElement!;
              const divRect = divEl.getBoundingClientRect();
              if (!ctm) return null;

              // BFS topológico → delay por nodo
              const inDegOv = new Map<string, number>();
              for (const c of componentes) inDegOv.set(c.uid, 0);
              for (const e of enlaces) inDegOv.set(e.destino_uid, (inDegOv.get(e.destino_uid) ?? 0) + 1);
              let finalUidOv = componentes[0]?.uid ?? "";
              let maxInOv = -1;
              for (const c of componentes) {
                const deg = inDegOv.get(c.uid) ?? 0;
                if (deg > maxInOv || (deg === maxInOv && c.posicion === "N")) { maxInOv = deg; finalUidOv = c.uid; }
              }
              const invAdjOv = new Map<string, string[]>();
              for (const e of enlaces) {
                const arr = invAdjOv.get(e.destino_uid) ?? [];
                arr.push(e.origen_uid);
                invAdjOv.set(e.destino_uid, arr);
              }
              const distOv = new Map<string, number>();
              const qOv = [finalUidOv];
              distOv.set(finalUidOv, 0);
              while (qOv.length) {
                const cur = qOv.shift()!;
                const d = distOv.get(cur)!;
                for (const src of (invAdjOv.get(cur) ?? [])) {
                  if (!distOv.has(src)) { distOv.set(src, d + 1); qOv.push(src); }
                }
              }
              const maxDistOv = Math.max(...Array.from(distOv.values()), 0);

              const nodes: IumNodeAnim[] = componentes.map((comp) => {
                const svgPt = svgEl.createSVGPoint();
                svgPt.x = comp.x; svgPt.y = comp.y;
                const screenPt = svgPt.matrixTransform(ctm!);
                const distVal  = distOv.get(comp.uid) ?? 0;
                const iumData  = iumMap.get(comp.ium_id);
                return {
                  nombre:     iumData?.nombre ?? "",
                  cx:         screenPt.x - divRect.left,
                  cy:         screenPt.y - divRect.top,
                  delay:      (maxDistOv - distVal) * 0.22,
                  color:      colorTASIdeIum(iumData),
                  animTraits: iumData?.animTraits ?? [],
                  composicion: iumData?.composicion ?? [],
                  animConfig: iumData?.animConfig ?? null,
                };
              });

              // D: calcular reacciones activas para mostrar nombres en overlay
              const nombresParticulasActivas = new Set<string>(
                nodes.flatMap(n => n.composicion.map(c => c.particula))
              );
              const reaccionesActivasNombres = reacciones.filter(r =>
                nombresParticulasActivas.has(r.particula_a) && nombresParticulasActivas.has(r.particula_b)
              );
              const mostrarOverlay = (faseAnimacion === "explosion" || faseAnimacion === "efecto") && reaccionesActivasNombres.length > 0;

              return (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15, overflow: "visible" }}>
                  <IumMergedCanvas
                    nodes={nodes}
                    width={divRect.width}
                    height={divRect.height}
                    fase={faseAnimacion ?? "idle"}
                    reaccionesDisponibles={reacciones}
                  />
                  {/* D: nombres de reacciones activas — fade-in tardío sobre el canvas */}
                  {mostrarOverlay && (
                    <div style={{
                      position: "absolute",
                      bottom: 28,
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      animation: "reaccNombres 0.7s ease 0.6s both",
                      pointerEvents: "none",
                    }}>
                      <style>{`
                        @keyframes reaccNombres {
                          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                        }
                      `}</style>
                      {reaccionesActivasNombres.map((r, i) => (
                        <span key={i} style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: r.efecto?.color ?? "var(--primary)",
                          background: "color-mix(in srgb, var(--bg-main) 72%, transparent)",
                          padding: "2px 8px",
                          borderRadius: 99,
                          border: `1px solid color-mix(in srgb, ${r.efecto?.color ?? "var(--primary)"} 30%, transparent)`,
                          whiteSpace: "nowrap",
                          backdropFilter: "blur(4px)",
                          opacity: 0.92,
                        }}>
                          {r.nombre_reaccion}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
            )}
      </div>

      {/* ── Derecha: resultados ─────────────────────────────────────────────── */}
      <>
      {drawerDer && <div onClick={() => setDrawerDer(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "color-mix(in srgb, var(--bg-main) 50%, transparent)" }} />}
      <div className={`sim-panel-der${drawerDer ? " sim-panel-der--open" : ""}`}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--primary) 40%, transparent)", margin: 0, flex: 1 }}>
            Organización
          </p>
          <button className="sim-btn-close-drawer" onClick={() => setDrawerDer(false)}
            style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <X size={14} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Selector de topología */}
          <div>
            <button
              onClick={() => { setTopoSeleccionada(null); setEnlaces([]); setAvisoTopo(null); setSlotsVisibles(null); }}
              style={{
                width: "100%", textAlign: "left", border: "1px solid",
                borderColor: !topoSeleccionada
                  ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                background: !topoSeleccionada
                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : "transparent",
                cursor: "pointer", padding: "5px 9px", borderRadius: "var(--radius-btn)",
                fontSize: 9, fontStyle: "italic", marginBottom: 4,
                color: !topoSeleccionada ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                fontWeight: !topoSeleccionada ? 700 : 400,
              }}
            >
              Libre — sin forma fija
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {topologias.map((t) => {
                const activa = topoSeleccionada?.id === t.id;
                const rango  = topoRangos.get(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => aplicarTopologia(t)}
                    style={{
                      width: "100%", textAlign: "left", border: "1px solid",
                      borderColor: activa
                        ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                        : "color-mix(in srgb, var(--primary) 12%, transparent)",
                      background: activa
                        ? "color-mix(in srgb, var(--primary) 9%, transparent)"
                        : "transparent",
                      cursor: "pointer", padding: "5px 9px",
                      borderRadius: "var(--radius-btn)",
                      opacity: t.activo ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (!activa) (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
                    }}
                    onMouseLeave={(e) => {
                      if (!activa) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "space-between" }}>
                      <span style={{ fontSize: 9, fontWeight: activa ? 800 : 400, color: activa ? "var(--primary)" : "var(--foreground)" }}>
                        {t.nombre}
                      </span>
                      {rango ? (
                        <span style={{
                          fontSize: 7.5, fontWeight: 600, flexShrink: 0,
                          color: activa
                            ? "color-mix(in srgb, var(--primary) 70%, transparent)"
                            : "color-mix(in srgb, var(--primary) 35%, transparent)",
                        }}>
                          {rango.minIumes === rango.maxIumes
                            ? `${rango.minIumes} IUMs`
                            : `${rango.minIumes}–${rango.maxIumes} IUMs`}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uniones */}
          {enlaces.length > 0 && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "color-mix(in srgb, var(--primary) 38%, transparent)", margin: "0 0 4px" }}>
                Uniones ({enlaces.length})
              </p>
              {enlaces.map((e) => {
                const or  = componentes.find((c) => c.uid === e.origen_uid);
                const dst = componentes.find((c) => c.uid === e.destino_uid);
                return (
                  <div key={e.uid} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, fontSize: 9 }}>
                    <span style={{ fontWeight: 700 }}>{or?.posicion}</span>
                    <span style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>→</span>
                    <span style={{ fontWeight: 700 }}>{dst?.posicion}</span>
                    <select
                      value={e.tipo_union}
                      onChange={(ev) => setEnlaces((prev) => prev.map((x) => x.uid === e.uid ? { ...x, tipo_union: ev.target.value } : x))}
                      style={{ fontSize: 8, background: "transparent", border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)", borderRadius: 3, color: "var(--foreground)", padding: "1px 3px" }}
                    >
                      {TIPOS_UNION.map((t) => <option key={t} value={t}>{NOMBRE_UNION[t] ?? t}</option>)}
                    </select>
                    <button onClick={() => setEnlaces((prev) => prev.filter((x) => x.uid !== e.uid))}
                      style={{ border: "none", background: "none", cursor: "pointer", padding: 0, marginLeft: "auto" }}>
                      <X size={8} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal tipo de unión ──────────────────────────────────────────────── */}
      </>

      {/* ── Modal añadir IUM a slot ─────────────────────────────────────────── */}
      {slotDropdown && (() => {
        const { key, posUI, x: sx, y: sy } = slotDropdown;
        const iumsDisponibles = iums.filter((u) => {
          const ya = componentes.some((c) => c.ium_id === u.id);
          const q = busquedaSlot.toLowerCase().trim();
          return !ya && (!q || u.nombre.toLowerCase().includes(q) || u.detalle.toLowerCase().includes(q));
        });
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--bg-main) 60%, transparent)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => { setSlotDropdown(null); setBusquedaSlot(""); }}
          >
            <div
              style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", width: 260, maxHeight: 380 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)" }}>{posUI}</span>
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 45%, transparent)", flex: 1 }}>Elige un IUM</span>
                <button
                  onClick={() => { setSlotDropdown(null); setBusquedaSlot(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
                >
                  <X size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                </button>
              </div>
              <div style={{ padding: "7px 12px", borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
                <Search size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
                <input
                  autoFocus
                  value={busquedaSlot}
                  onChange={(e) => setBusquedaSlot(e.target.value)}
                  placeholder="Buscar..."
                  style={{ border: "none", background: "transparent", fontSize: 10, outline: "none", width: "100%", color: "var(--foreground)" }}
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {iumsDisponibles.length === 0 && (
                  <p style={{ fontSize: 9, textAlign: "center", padding: "14px 12px", margin: 0, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    {componentes.length >= (Object.keys(getSlotsActivos(topoSeleccionada!)).length) ? "Topología llena" : "Sin resultados"}
                  </p>
                )}
                {iumsDisponibles.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => elegirIumEnSlot(u, key, posUI, sx, sy)}
                    style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "7px 14px", display: "flex", flexDirection: "column", gap: 2 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 7%, transparent)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{u.nombre}</span>
                    <span style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 38%, transparent)", fontStyle: "italic" }}>
                      {conocimiento.get(u.id)?.funcion_revelada ? "conocido" : "desconocido"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {modalTipo && (() => {
        const or  = componentes.find((c) => c.uid === modalTipo.origenUid);
        const dst = componentes.find((c) => c.uid === modalTipo.destinoUid);
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--bg-main) 72%, transparent)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setModalTipo(null)}
          >
            <div
              style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "var(--radius-card)", padding: 16, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={11} />
                <span style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>Nueva unión</span>
                <button onClick={() => setModalTipo(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
              </div>
              <p style={{ fontSize: 9, margin: 0, color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                <strong style={{ color: "var(--foreground)" }}>{or?.posicion} {or?.ium_nombre}</strong>
                {" → "}
                <strong style={{ color: "var(--foreground)" }}>{dst?.posicion} {dst?.ium_nombre}</strong>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tipo de unión</label>
                <select value={linkingTipo} onChange={(e) => setLinkingTipo(e.target.value)}
                  style={{ fontSize: 10, padding: "4px 6px", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", borderRadius: "var(--radius-btn)", background: "transparent", color: "var(--foreground)" }}>
                  {TIPOS_UNION.map((t) => <option key={t} value={t}>{NOMBRE_UNION[t] ?? t}</option>)}
                </select>
              </div>
              <button onClick={confirmarEnlace}
                style={{ padding: "6px 0", borderRadius: "var(--radius-btn)", background: "var(--primary)", color: "var(--btn-text)", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                Confirmar unión
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── FABs móvil ─────────────────────────────────────────────────────── */}
      <button
        className="sim-fab-izq"
        onClick={() => { setDrawerIzq(true); setDrawerDer(false); }}
        title="IUMs"
        style={{ display: "none" }}
      >
        <Plus size={20} />
      </button>
      <button
        className="sim-fab-der"
        onClick={() => { setDrawerDer(true); setDrawerIzq(false); }}
        title="Organización"
        style={{ display: "none" }}
      >
        <Network size={18} />
      </button>

      {/* ── Toast de error (reemplaza el modal flotante) ─────────────────────── */}
      {errorSim && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 700, display: "flex", alignItems: "center", gap: 8,
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--error,#ef4444) 40%, transparent)",
            borderRadius: 10, padding: "8px 14px",
            animation: "aparecer 0.25s ease",
            boxShadow: "0 4px 18px color-mix(in srgb, var(--bg-main) 30%, transparent)",
          }}
        >
          <AlertTriangle size={13} style={{ color: "var(--error,#ef4444)", flexShrink: 0 }} />
          <span style={{ fontSize: 10, maxWidth: 280 }}>{errorSim}</span>
          <button
            onClick={() => setErrorSim(null)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1, display: "flex", marginLeft: 4 }}
          >
            <X size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
          </button>
        </div>
      )}

      {/* ── Toast resultado no exitoso ────────────────────────────────────────── */}
      {resultado && resultado.estado === "simulado" &&
       !resultado.proceso_principal && !resultado.conjuracion_principal && (
        <div
          onClick={() => setResultado(null)}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 700, cursor: "pointer",
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
            borderRadius: 10, padding: "8px 14px",
            animation: "aparecer 0.25s ease",
          }}
        >
          <ResultadoPanel resultado={resultado} nombreIum={(id) => (id ? iumMap.get(id)?.nombre ?? id : "Un IUM")} />
        </div>
      )}

      {/* ── Modal de descubrimiento (revelación de función) ──────────────────── */}
      {revelaciones.length > 0 && (
        <ModalDescubrimiento
          iums={revelaciones}
          onCerrar={() => setRevelaciones([])}
        />
      )}

      <style>{`
        /* ── Layout ── */
        .sim-root {
          --sim-nav: 56px; --sim-top: 61px;
          display: grid; grid-template-columns: 190px 1fr 260px; height: calc(100vh - 80px); overflow: hidden;
        }
        .sim-panel-izq { border-right: 1px solid color-mix(in srgb, var(--primary) 12%, transparent); display: flex; flex-direction: column; overflow: hidden; }
        .sim-panel-der { display: flex; flex-direction: column; overflow: hidden; }
        /* ── FABs móvil (base ocultos) ── */
        .sim-fab-izq, .sim-fab-der {
          position: fixed; bottom: 24px; z-index: 500;
          width: 50px; height: 50px; border-radius: 50%;
          background: var(--primary); color: var(--btn-text);
          border: none; cursor: pointer;
          align-items: center; justify-content: center;
          transition: transform .15s ease;
        }
        .sim-fab-izq:active, .sim-fab-der:active { transform: scale(0.93); }
        .sim-fab-izq { left: 16px; }
        .sim-fab-der { right: 16px; }
        /* ── Móvil ── */
        @media (max-width: 700px) {
          .sim-root { grid-template-columns: 1fr; height: calc(100vh - var(--sim-top) - var(--sim-nav)); height: calc(100dvh - var(--sim-top) - var(--sim-nav)); margin-bottom: -5rem; }
          .sim-panel-izq { position: fixed; inset: 0 auto var(--sim-nav) 0; width: min(80vw,300px); z-index: 400; background: var(--bg-main); border-right: 1px solid color-mix(in srgb,var(--primary) 18%,transparent); transform: translateX(-105%); transition: transform .25s ease; }
          .sim-panel-izq--open { transform: translateX(0); }
          .sim-panel-der { position: fixed; inset: 0 0 var(--sim-nav) auto; width: min(85vw,320px); z-index: 400; background: var(--bg-main); border-left: 1px solid color-mix(in srgb,var(--primary) 18%,transparent); transform: translateX(105%); transition: transform .25s ease; }
          .sim-panel-der--open { transform: translateX(0); }
          .sim-btn-close-drawer { display: flex !important; }
          .sim-fab-izq, .sim-fab-der { display: flex !important; bottom: calc(var(--sim-nav) + 16px); }

        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes aparecer { from { opacity: 0; transform: translateY(6px) scale(0.97) translateX(-50%); } to { opacity: 1; transform: translateY(0) scale(1) translateX(-50%); } }
        @keyframes latido { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes destello { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.95; } }
        @keyframes modal-aparecer { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: none; } }
        @keyframes sim-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
