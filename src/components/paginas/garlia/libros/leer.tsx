"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { ChevronLeft, List, ChevronRight } from "lucide-react";
import { Btn } from "@/components/ui";
import { librosQueries } from "@/lib/api/queries/garlia/libros";
import { db } from "@/lib/api/client/db";
import { motion, AnimatePresence } from "framer-motion";

import { CapituloLista, CapituloScrollItem } from "../../myself/garlia/editores/editorCapitulos/leer/type";
// ── NUEVO: helpers de slug ───────────────────────────────────────────────────
import { toSlug, esUUID } from "@/lib/utils/slugify";
import { LectorSkeleton }      from "../../myself/garlia/editores/editorCapitulos/leer/ui/LectorSkeleton";
import { IndexPanel }          from "../../myself/garlia/editores/editorCapitulos/leer/ui/IndexPanel";
import { CapituloScrollBlock } from "../../myself/garlia/editores/editorCapitulos/leer/CapituloScrollBlock";
import { Vignette }            from "../../myself/garlia/editores/editorCapitulos/leer/ui/LectorOrnamentos";

/* ─────────────────────────────────────────────
   Tipos
   ───────────────────────────────────────────── */
interface NarradorInfo {
  id: string;
  nombre: string;
  img_url?: string | null;
}

interface ReinoInfo {
  id: string;
  nombre: string;
  imagen_reino?: string | null;
}

interface Segmento {
  reino:    ReinoInfo | null;
  narrador: NarradorInfo | null;
  capitulos: CapituloScrollItem[];
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function normOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function buildSegmentos(caps: (CapituloScrollItem & { _reino?: ReinoInfo | null; _narrador?: NarradorInfo | null })[]): Segmento[] {
  const segs: Segmento[] = [];
  for (const cap of caps) {
    const reino    = cap._reino    ?? null;
    const narrador = cap._narrador ?? null;
    const key      = `${reino?.id ?? "null"}::${narrador?.id ?? "null"}`;
    const last     = segs[segs.length - 1];
    const lastKey  = last ? `${last.reino?.id ?? "null"}::${last.narrador?.id ?? "null"}` : null;
    if (last && lastKey === key) last.capitulos.push(cap);
    else segs.push({ reino, narrador, capitulos: [cap] });
  }
  return segs;
}

function segLabel(seg: Segmento): string {
  if (seg.reino && seg.narrador) return `${seg.reino.nombre} · ${seg.narrador.nombre}`;
  if (seg.reino)    return seg.reino.nombre;
  if (seg.narrador) return seg.narrador.nombre;
  return "";
}

function segImgUrl(seg: Segmento): string | null | undefined {
  return seg.reino?.imagen_reino ?? seg.narrador?.img_url ?? null;
}

/* ─────────────────────────────────────────────
   Helpers de slug de segmento
   ───────────────────────────────────────────── */

/** Genera el slug de un segmento con desambiguador numérico si el narrador/reino
 *  aparece más de una vez. Ej: "tori", "dorian", "tori-2" */
function slugSegmento(segmentos: Segmento[], index: number): string {
  const seg = segmentos[index];
  const nombre = seg.reino?.nombre ?? seg.narrador?.nombre ?? "capitulos";
  const slug = toSlug(nombre);

  const aparicionesAnteriores = segmentos
    .slice(0, index)
    .filter(s => toSlug(s.reino?.nombre ?? s.narrador?.nombre ?? "") === slug)
    .length;

  return aparicionesAnteriores === 0 ? slug : `${slug}-${aparicionesAnteriores + 1}`;
}

/** Dado un slug de segmento (ej: "tori-2"), devuelve el índice del segmento
 *  correspondiente en la lista. Retorna 0 si no encuentra nada. */
function resolverSegmentoDesdeSlug(segmentos: Segmento[], segSlug: string): number {
  // Parsear sufijo numérico: "tori-2" → base="tori", n=2; "tori" → base="tori", n=1
  const match = segSlug.match(/^(.*?)(?:-(\d+))?$/);
  const base  = match?.[1] ?? segSlug;
  const n     = match?.[2] ? parseInt(match[2], 10) : 1;

  let cuenta = 0;
  for (let i = 0; i < segmentos.length; i++) {
    const seg    = segmentos[i];
    const nombre = seg.reino?.nombre ?? seg.narrador?.nombre ?? "";
    if (toSlug(nombre) === base) {
      cuenta++;
      if (cuenta === n) return i;
    }
  }
  return 0;
}

/* ─────────────────────────────────────────────
   localStorage helpers
   ───────────────────────────────────────────── */
function cargarLeidos(libroId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`leidos:${libroId}`);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { }
  return new Set();
}

function guardarLeido(libroId: string, capId: string): void {
  try {
    const set = cargarLeidos(libroId);
    set.add(capId);
    localStorage.setItem(`leidos:${libroId}`, JSON.stringify([...set]));
  } catch { }
}

/* ─────────────────────────────────────────────
   Barra de progreso VERTICAL — rail sobre borde derecho
   ───────────────────────────────────────────── */
function BarraProgresoVertical({ capIds }: { capIds: string[] }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (capIds.length === 0) return;
    const container = document.getElementById("lector-scroll-container");
    if (!container) return;

    const calc = () => {
      const first = document.getElementById(`cap-${capIds[0]}`);
      const last  = document.getElementById(`cap-${capIds[capIds.length - 1]}`);
      if (!first || !last) return;
      const top     = first.offsetTop;
      const bottom  = last.offsetTop + last.offsetHeight;
      const total   = bottom - top;
      const scrolled = container.scrollTop + container.clientHeight - top;
      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)));
    };
    calc();
    container.addEventListener("scroll", calc, { passive: true });
    return () => container.removeEventListener("scroll", calc);
  }, [capIds]);

  return (
    /* Ocupa todo el rail (su padre es position:absolute, top/bottom:0) */
    <div style={{ position: "absolute", inset: 0 }}>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          originY: 0,
          background: "linear-gradient(to bottom, var(--accent, var(--primary)), color-mix(in srgb, var(--primary) 60%, transparent))",
          borderRadius: 99,
        }}
        animate={{ height: `${progress}%` }}
        transition={{ duration: 0.18, ease: "linear" }}
      />
      {/* Dot indicador */}
      <motion.div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--primary)",
          opacity: 0.6,
          marginLeft: -1,
        }}
        animate={{ top: `${progress}%` }}
        transition={{ duration: 0.18, ease: "linear" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Tarjeta de transición entre segmentos
   ───────────────────────────────────────────── */
function SegmentoTransicion({
  actual,
  siguiente,
  onIr,
}: {
  actual: Segmento;
  siguiente: Segmento;
  onIr: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.25 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const labelActual = segLabel(actual)   || "Capítulos";
  const labelSig    = segLabel(siguiente) || "Capítulos";
  const imgActual   = segImgUrl(actual);
  const imgSig      = segImgUrl(siguiente);
  const tieneReinoYNarrador = siguiente.reino && siguiente.narrador;

  const Avatar = ({ label, img, dim }: { label: string; img?: string | null; dim?: boolean }) => (
    img ? (
      <img
        src={img} alt={label}
        className={`w-9 h-9 object-cover flex-shrink-0 ${dim ? "grayscale opacity-50" : "shadow-sm"}`}
        style={{
          borderRadius: "var(--radius-btn)",
          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${dim ? "10" : "20"}%, transparent)`,
        }}
      />
    ) : (
      <div
        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center text-xs font-black ${dim ? "text-primary/25" : "text-primary/60"}`}
        style={{
          borderRadius: "var(--radius-btn)",
          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${dim ? "10" : "20"}%, transparent)`,
          background: `color-mix(in srgb, var(--primary) ${dim ? "5" : "8"}%, transparent)`,
        }}
      >
        {label.charAt(0)}
      </div>
    )
  );

  return (
    <div ref={ref} className="max-w-2xl mx-auto px-6 py-20">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
              <span className="font-serif text-base italic" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>✦</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
            </div>

            <div
              style={{
                borderRadius: "var(--radius-card)",
                border: `var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)`,
                overflow: "hidden",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* Hero image del siguiente segmento */}
              {imgSig && (
                <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                  <img
                    src={imgSig} alt={labelSig}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom, transparent 20%, var(--bg-main, #fff) 100%)",
                  }} />
                  {/* Etiqueta "Siguiente" sobre la imagen */}
                  <div style={{
                    position: "absolute", top: 14, left: 16,
                    display: "flex", alignItems: "center", gap: 6,
                    background: "color-mix(in srgb, var(--bg-main) 85%, transparent)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 99, padding: "4px 12px",
                    border: `var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)`,
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--primary)", opacity: 0.4 }}>
                      A continuación
                    </span>
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 4%, var(--bg-main)), color-mix(in srgb, var(--accent) 3%, var(--bg-main)))",
                  padding: imgSig ? "0 0 0" : undefined,
                }}
              >
                {/* Transición: actual → siguiente */}
                <div className="flex items-stretch" style={{ borderBottom: `var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)` }}>
                  <div className="flex-1 p-5">
                    <div className="flex items-center gap-3">
                      <Avatar label={labelActual} img={imgActual} dim />
                      <p className="text-primary/30 font-black text-xs uppercase tracking-wide line-through decoration-primary/15">
                        {labelActual}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center px-3" style={{ borderLeft: `var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)` }}>
                    <ChevronRight size={14} className="text-primary/15" />
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-center gap-3">
                      {!imgSig && <Avatar label={labelSig} img={imgSig} />}
                      <div>
                        <p className="text-primary font-black text-sm uppercase tracking-tight leading-tight">
                          {siguiente.reino?.nombre ?? siguiente.narrador?.nombre}
                        </p>
                        {tieneReinoYNarrador && (
                          <p className="text-primary/40 font-bold text-[9px] uppercase tracking-widest italic mt-0.5">
                            {siguiente.narrador!.nombre}
                          </p>
                        )}
                        <p className="text-primary/25 font-bold text-[9px] uppercase tracking-wider mt-1">
                          {siguiente.capitulos.length} cap{siguiente.capitulos.length !== 1 ? "ítulos" : "ítulo"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-4">
                  <button
                    onClick={onIr}
                    className="w-full flex items-center justify-between p-4 transition-all group"
                    style={{
                      borderRadius: "var(--radius-btn)",
                      border: `var(--border-width) solid color-mix(in srgb, var(--primary) 18%, transparent)`,
                      background: `color-mix(in srgb, var(--primary) 5%, transparent)`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "var(--primary)";
                      e.currentTarget.style.borderColor = "var(--primary)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = `color-mix(in srgb, var(--primary) 5%, transparent)`;
                      e.currentTarget.style.borderColor = `color-mix(in srgb, var(--primary) 18%, transparent)`;
                    }}
                  >
                    <span className="font-black text-[11px] uppercase tracking-widest text-primary group-hover:text-[var(--btn-text)] transition-colors">
                      Continuar → {labelSig}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {imgSig && (
                        <img src={imgSig} alt={labelSig}
                          className="w-5 h-5 object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                          style={{ borderRadius: "var(--radius-btn)" }}
                        />
                      )}
                      <ChevronRight size={14} className="text-primary/50 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Hook: observa qué capítulos son visibles
   ───────────────────────────────────────────── */
function useScrollLeidos(libroId: string, capIds: string[]) {
  useEffect(() => {
    if (!libroId || capIds.length === 0) return;

    const lastId = capIds[capIds.length - 1];
    let obsNormal: IntersectionObserver | null = null;
    let obsUltimo: IntersectionObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const montar = () => {
      const faltantes = capIds.filter(cid => !document.getElementById(`cap-${cid}`));
      if (faltantes.length > 0) {
        timer = setTimeout(montar, 120);
        return;
      }

      obsNormal = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting)
              guardarLeido(libroId, entry.target.id.replace("cap-", ""));
        },
        { threshold: 0.4 }
      );

      obsUltimo = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting)
              guardarLeido(libroId, entry.target.id.replace("cap-", ""));
        },
        { threshold: 0.15 }
      );

      for (const capId of capIds) {
        const el = document.getElementById(`cap-${capId}`);
        if (!el) continue;
        if (capId === lastId) obsUltimo.observe(el);
        else obsNormal.observe(el);
      }
    };

    timer = setTimeout(montar, 80);

    return () => {
      if (timer) clearTimeout(timer);
      obsNormal?.disconnect();
      obsUltimo?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId, capIds.join(",")]);
}

/* ─────────────────────────────────────────────
   Personajes del segmento
   ───────────────────────────────────────────── */
function PersonajesPanel({ ids, border }: { ids: string[]; border: string }) {
  const [personajes, setPersonajes] = useState<{ id: string; nombre: string; img_url?: string | null }[]>([]);

  useEffect(() => {
    if (ids.length === 0) return;
    supabase
      .from("personajes")
      .select("id, nombre, img_url")
      .in("id", ids)
      .then(({ data }) => { if (data) setPersonajes(data); });
  }, [ids.join(",")]);

  if (personajes.length === 0) return null;

  return (
    <div style={{ paddingTop: 14, borderTop: border }}>
      <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.25, marginBottom: 10 }}>
        Personajes
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {personajes.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {p.img_url ? (
              <img
                src={p.img_url} alt={p.nombre}
                style={{ width: 24, height: 24, borderRadius: "var(--radius-btn, 4px)", objectFit: "cover", border, flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 24, height: 24, borderRadius: "var(--radius-btn, 4px)", border, flexShrink: 0,
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "var(--primary)", opacity: 0.4,
              }}>
                {p.nombre.charAt(0)}
              </div>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", opacity: 0.65, lineHeight: 1.2 }}>
              {p.nombre}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel lateral izquierdo — fijo, no scrollea
   ───────────────────────────────────────────── */
function PanelLateral({
  libroTitulo,
  segActualObj,
  capsParaMostrar,
  personajesIds,
  loading,
  esExtra,
  listaCapitulos,
  capIdActual,
  onVolver,
  onAbrirIndice,
  onSelectCap,
}: {
  libroTitulo?: string;
  segActualObj: Segmento | null;
  capsParaMostrar: CapituloScrollItem[];
  personajesIds: string[];
  loading?: boolean;
  esExtra?: boolean;
  listaCapitulos?: CapituloLista[];
  capIdActual?: string;
  onVolver: () => void;
  onAbrirIndice: () => void;
  onSelectCap?: (capId: string) => void;
}) {
  const border = "1px solid color-mix(in srgb, var(--primary) 10%, transparent)";
  const narrador = segActualObj?.narrador ?? null;
  const imgUrl   = segActualObj ? segImgUrl(segActualObj) : null;
  const [showCapList, setShowCapList] = useState(false);

  // ── Layout Extra: título + índice lista + botón leer ──
  if (esExtra) {
    return (
      <div
        style={{
          width: "clamp(220px, 22vw, 300px)",
          flexShrink: 0,
          height: "100vh",
          borderRight: border,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Botón volver */}
        <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
          <button
            onClick={onVolver}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "none", background: "none", cursor: "pointer",
              color: "var(--primary)", fontSize: 9,
              fontFamily: "var(--font-mono)", letterSpacing: "0.16em",
              textTransform: "uppercase", opacity: 0.25, transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.25")}
          >
            ← Volver
          </button>
        </div>

        {/* Título del libro */}
        {libroTitulo && (
          <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
            <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.3, marginBottom: 6 }}>
              Libro
            </p>
            <p style={{ fontSize: 13, fontWeight: 900, color: "var(--primary)", opacity: 0.8, lineHeight: 1.3, fontStyle: "italic", letterSpacing: "-0.02em", textTransform: "uppercase" }}>
              {libroTitulo}
            </p>
          </div>
        )}

        {/* Separador */}
        <div style={{ margin: "16px 20px 8px", height: 1, background: border.replace("1px solid ", "") }} />

        {/* Lista de capítulos */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 8px" }}>
              {[70, 90, 60, 80].map((w, i) => (
                <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 4, background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              ))}
            </div>
          ) : (listaCapitulos ?? []).map(cap => {
            const esActual = cap.id === capIdActual;
            return (
              <button
                key={cap.id}
                onClick={() => onSelectCap?.(cap.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 6, border: "none",
                  background: esActual ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  cursor: "pointer", transition: "background 0.12s",
                  color: esActual ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                  fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => { if (!esActual) e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                onMouseLeave={e => { if (!esActual) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 8, opacity: 0.4, marginRight: 6, fontVariantNumeric: "tabular-nums" }}>
                  {String(cap.orden).padStart(2, "0")}
                </span>
                {cap.titulo_capitulo}
              </button>
            );
          })}
        </div>

        {/* Botón Leer (scroll al cap actual) */}
        <div style={{ padding: "12px 16px", flexShrink: 0, borderTop: border }}>
          <button
            onClick={() => {
              if (capIdActual) document.getElementById(`cap-${capIdActual}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "10px 16px",
              border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
              borderRadius: "var(--radius-btn, 6px)",
              background: "transparent", cursor: "pointer",
              color: "var(--primary)", fontSize: 10,
              fontFamily: "var(--font-mono)", fontWeight: 900,
              letterSpacing: "0.14em", textTransform: "uppercase",
              opacity: 0.6, transition: "opacity 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.background = "transparent"; }}
          >
            <ChevronLeft size={11} style={{ transform: "rotate(180deg)" }} /> Leer
          </button>
        </div>

        {/* Barra de progreso */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderRadius: 99 }}>
          <BarraProgresoVertical capIds={capsParaMostrar.map(c => c.id)} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "clamp(220px, 22vw, 300px)",
        flexShrink: 0,
        height: "100vh",
        borderRight: border,
        display: "flex",
        flexDirection: "column",   // ← columna: foto arriba, metadatos abajo
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Foto del narrador / reino — oculta en modo lista ── */}
      {!showCapList && (
        <div
          style={{
            flex: "0 0 auto",
            maxHeight: "40%",
            width: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {imgUrl ? (
            <>
              <img
                src={imgUrl}
                alt={narrador?.nombre ?? ""}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 40%, var(--bg-main) 100%)",
                pointerEvents: "none",
              }} />
            </>
          ) : (
            <div style={{
              width: "100%",
              height: 120,
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 48, opacity: 0.08, fontFamily: "var(--font-serif, serif)", fontStyle: "italic" }}>
                {narrador?.nombre?.charAt(0) ?? ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Metadatos — ocupa el resto, scrollea si hay mucho contenido ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "20px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Placeholders de carga */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[80, 60, 100, 50].map((w, i) => (
              <div key={i} style={{
                height: i === 0 ? 14 : 10,
                width: `${w}%`,
                borderRadius: 4,
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                opacity: 0.5,
              }} />
            ))}
          </div>
        )}

        {/* En modo lista: mostrar solo capítulos (igual que esExtra) */}
        {showCapList ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
            {/* Título del libro */}
            {!loading && libroTitulo && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.3, marginBottom: 4 }}>
                  Libro
                </p>
                <p style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", opacity: 0.75, lineHeight: 1.3, fontStyle: "italic", letterSpacing: "-0.02em" }}>
                  {libroTitulo}
                </p>
              </div>
            )}
            {(listaCapitulos ?? []).map(cap => {
              const esActual = cap.id === capIdActual;
              return (
                <button
                  key={cap.id}
                  onClick={() => onSelectCap?.(cap.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 10px", borderRadius: 6, border: "none",
                    background: esActual ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                    cursor: "pointer", transition: "background 0.12s",
                    color: esActual ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                    fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { if (!esActual) e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                  onMouseLeave={e => { if (!esActual) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 8, opacity: 0.4, marginRight: 6, fontVariantNumeric: "tabular-nums" }}>
                    {String(cap.orden).padStart(2, "0")}
                  </span>
                  {cap.titulo_capitulo}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Título del libro */}
            {!loading && libroTitulo && (
              <div>
                <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.3, marginBottom: 4 }}>
                  Libro
                </p>
                <p style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", opacity: 0.75, lineHeight: 1.3, fontStyle: "italic", letterSpacing: "-0.02em" }}>
                  {libroTitulo}
                </p>
              </div>
            )}

            {/* Narrador */}
            {!loading && narrador && (
              <div style={{ paddingTop: 14, borderTop: border }}>
                <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.25, marginBottom: 6 }}>
                  Narrador
                </p>
                <p style={{ fontSize: 13, fontWeight: 900, color: "var(--primary)", opacity: 0.8, textTransform: "uppercase", letterSpacing: "-0.02em", fontStyle: "italic" }}>
                  {narrador.nombre}
                </p>
              </div>
            )}

            {/* Personajes que aparecen en los capítulos del segmento */}
            {!loading && personajesIds.length > 0 && (
              <PersonajesPanel ids={personajesIds} border={border} />
            )}
          </>
        )}

        {/* Acciones — pegadas al fondo gracias a marginTop: auto */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, paddingTop: 16, borderTop: border }}>
          <button
            onClick={() => setShowCapList(prev => !prev)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px",
              border, borderRadius: "var(--radius-btn, 6px)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--primary)",
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase",
              opacity: 0.5,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
          >
            <List size={11} />
            {showCapList ? "Info" : "Índice"}
          </button>

          <button
            onClick={onVolver}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px",
              border: "none", background: "none",
              cursor: "pointer",
              color: "var(--primary)",
              fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase",
              opacity: 0.25,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.25")}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* ── Barra de progreso vertical — rail fino sobre el borde derecho ── */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          borderRadius: 99,
        }}
      >
        <BarraProgresoVertical capIds={capsParaMostrar.map(c => c.id)} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Componente principal del lector
   ───────────────────────────────────────────── */
export default function Lector() {
  const params = useParams();
  const slugParam = params?.id    as string;
  // capId puede ser un UUID de capítulo O un slug de segmento (ej: "tori", "tori-2")
  const capIdParam = params?.capId as string;
  const router    = useRouter();

  // id es el UUID real del libro, resuelto a partir del slug
  const [id, setId] = useState<string>("");
  // capId es siempre el UUID real del capítulo activo
  const [capId, setCapId] = useState<string>("");

  const [capitulos,      setCapitulos]      = useState<CapituloScrollItem[]>([]);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [segmentos,      setSegmentos]      = useState<Segmento[]>([]);
  const [segActivo,      setSegActivo]      = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [showIndex,      setShowIndex]      = useState(false);
  const [esExtra,        setEsExtra]        = useState(false);

  // ── Flujo único: resolver libro + cargar caps en paralelo cuando es posible ──
  useEffect(() => {
    if (!slugParam || !capIdParam) return;
    setLoading(true);

    const run = async () => {
      const hoy = new Date().toISOString();

      // 1. Resolver UUID del libro Y verificar categoría en paralelo
      let libroId: string;
      if (esUUID(slugParam)) {
        const { data } = await supabase
          .from("libros").select("id, titulo, categoria").eq("id", slugParam).single();
        if (!data) { setError("Libro no encontrado"); return; }
        const slug = toSlug(data.titulo);
        router.replace(`/garlia/libros/${slug}/leer/${capIdParam}`, { scroll: false });
        libroId = data.id;
        if (data.categoria?.toLowerCase() === "extra") setEsExtra(true);
      } else {
        // Buscar por slug — Dexie primero (0 RTT), Supabase como fallback
        let encontrado: { id: string; titulo: string; categoria?: string } | null = null;

        try {
          if (db?.libros) {
            const dexieLibros = await db.libros.toArray() as any[];
            encontrado = dexieLibros.find((l: any) => toSlug(l.titulo ?? "") === slugParam) ?? null;
          }
        } catch {}

        if (!encontrado) {
          const { data: todos } = await supabase
            .from("libros").select("id, titulo, categoria");
          if (!todos) { setError("Libro no encontrado"); return; }
          // Cachear en Dexie para la próxima
          try { await db?.libros?.bulkPut(todos as any[]); } catch {}
          encontrado = todos.find(l => toSlug(l.titulo) === slugParam) ?? null;
        }

        if (!encontrado) { setError("Libro no encontrado"); return; }
        libroId = encontrado.id;
        if (encontrado.categoria?.toLowerCase() === "extra") setEsExtra(true);
      }
      setId(libroId);

      // 2. Cargar caps — si capIdParam es UUID usamos getCapituloParaLectura,
      //    si es slug cargamos directo por libro_id (sin roundtrip extra)
      type CapRaw = {
        id: string; orden: number; titulo_capitulo: string; contenido: string;
        fecha_publicacion: string; personajes_ids: string[];
        libros: { titulo: string } | { titulo: string }[] | null;
        narrador: NarradorInfo | NarradorInfo[] | null;
        reino: ReinoInfo | ReinoInfo[] | null;
      };

      let rawList: CapRaw[] = [];

      
      if (esUUID(capIdParam)) {
        // UUID de capítulo: cargar todos los caps del libro directamente
        const { data: contenidos, error: capsError } = await supabase
          .from("capitulos")
          .select(`id, orden, titulo_capitulo, contenido, fecha_publicacion, personajes_ids,
            libros(titulo), narrador:personajes!narrador_id(id, nombre, img_url),
            reino:reinos!reino_id(id, nombre, imagen_reino)`)
          .eq("libro_id", libroId)
          .or(`visibilidad.eq.publico,and(visibilidad.eq.programado,fecha_publicacion.lte.${hoy.split("T")[0]})`)
          .not("titulo_capitulo", "like", "[Ruta]%")
          .order("orden", { ascending: true });
        if (capsError) { setError(capsError.message); return; }
        rawList = (contenidos as unknown as CapRaw[]) ?? [];
      } else {
        // Slug de segmento: una sola query por libro_id
        const { data: contenidos } = await supabase
          .from("capitulos")
          .select(`id, orden, titulo_capitulo, contenido, fecha_publicacion, personajes_ids,
            libros(titulo), narrador:personajes!narrador_id(id, nombre, img_url),
            reino:reinos!reino_id(id, nombre, imagen_reino)`)
          .eq("libro_id", libroId)
          .or(`visibilidad.eq.publico,and(visibilidad.eq.programado,fecha_publicacion.lte.${hoy.split("T")[0]})`)
          .not("titulo_capitulo", "like", "[Ruta]%")
          .order("orden", { ascending: true });
        rawList = (contenidos as unknown as CapRaw[]) ?? [];
      }

      const capsValidas = rawList.map(c => ({
        id: c.id, orden: c.orden, titulo_capitulo: c.titulo_capitulo,
        contenido: c.contenido, fecha_publicacion: c.fecha_publicacion,
        personajes_ids: c.personajes_ids, libro_id: libroId,
        libros: normOne(c.libros) ?? undefined,
        _narrador: normOne(c.narrador),
        _reino: normOne(c.reino),
      }));

      cachearEnDexie(capsValidas);

      const listaCapitulosData = capsValidas.map(c => ({
        id: c.id, orden: c.orden,
        titulo_capitulo: c.titulo_capitulo,
        fecha_publicacion: c.fecha_publicacion,
      }));

      const segs = buildSegmentos(capsValidas as any);

      // 3. Resolver segmento y capítulo activo
      let si = 0;
      let capIdActivo = "";

      if (esUUID(capIdParam)) {
        si = segs.findIndex(s => s.capitulos.some(c => c.id === capIdParam));
        if (si === -1) si = 0;
        capIdActivo = capIdParam;
        // Canonicalizar URL: UUID → slug de segmento
        const segSlug = slugSegmento(segs, si);
        router.replace(`/garlia/libros/${slugParam}/leer/${segSlug}`, { scroll: false });
      } else {
        si = resolverSegmentoDesdeSlug(segs, capIdParam);
        capIdActivo = segs[si]?.capitulos[0]?.id ?? capsValidas[0]?.id ?? "";
      }

      const capActivo = capsValidas.find(c => c.id === capIdActivo);
      if (capActivo) setActiveCapTitle(`${capActivo.orden}. ${capActivo.titulo_capitulo}`);

      // Setear todo de golpe para evitar renders intermedios
      setListaCapitulos(listaCapitulosData);
      setCapitulos(capsValidas as unknown as CapituloScrollItem[]);
      setSegmentos(segs);
      setSegActivo(si);
      setCapId(capIdActivo);
    };

    run()
      .catch(async (err) => {
        console.error("Error crítico en Lector:", err);
        // Intentar desde caché Dexie
        try {
          const table = await getDexieTable();
          if (table) {
            const todos = (await table.toArray()) as any[];
            const cached = todos.filter((c: any) => !c.deleted && c.libro_id === id && c.contenido);
            if (cached.length > 0) {
              const capsValidas = cached.map((c: any) => ({
                id: c.id, orden: c.orden, titulo_capitulo: c.titulo_capitulo,
                contenido: c.contenido, fecha_publicacion: c.fecha_publicacion,
                personajes_ids: c.personajes_ids, libro_id: id,
                libros: c.libros, _narrador: c._narrador, _reino: c._reino,
              }));
              const segs = buildSegmentos(capsValidas as any);
              const lista = capsValidas.map(c => ({ id: c.id, orden: c.orden, titulo_capitulo: c.titulo_capitulo, fecha_publicacion: c.fecha_publicacion }));
              const si = esUUID(capIdParam)
                ? Math.max(0, segs.findIndex(s => s.capitulos.some(c => c.id === capIdParam)))
                : resolverSegmentoDesdeSlug(segs, capIdParam);
              const capIdActivo = esUUID(capIdParam) ? capIdParam : (segs[si]?.capitulos[0]?.id ?? "");
              setListaCapitulos(lista);
              setCapitulos(capsValidas as unknown as CapituloScrollItem[]);
              setSegmentos(segs);
              setSegActivo(si);
              setCapId(capIdActivo);
              return;
            }
          }
        } catch { }
        setError("Error al abrir el pergamino");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, capIdParam]);

  const libroTitulo = capitulos[0]?.libros?.titulo;
  const hasScrolled = useRef(false);

  // Título del capítulo actualmente visible en pantalla
  const [activeCapTitle, setActiveCapTitle] = useState<string | null>(null);

  const usaSegmentos    = segmentos.length > 1;
  const segActualObj    = usaSegmentos ? segmentos[segActivo]     ?? null : null;
  const segSiguiente    = usaSegmentos ? segmentos[segActivo + 1] ?? null : null;
  const capsParaMostrar = usaSegmentos ? (segActualObj?.capitulos ?? []) : capitulos;
  // En modo Extra solo se renderiza el capítulo activo, no todos en scroll
  const capsARenderizar = esExtra
    ? capsParaMostrar.filter(c => c.id === capId)
    : capsParaMostrar;

  useEffect(() => {
    const ids = capsARenderizar.map(c => c.id);
    if (ids.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cap = capsARenderizar.find(c => `cap-${c.id}` === entry.target.id);
            if (cap) setActiveCapTitle(`${cap.orden}. ${cap.titulo_capitulo}`);
          }
        }
      },
      { threshold: 0.15, rootMargin: "-10% 0px -60% 0px" }
    );
    const timerId = setTimeout(() => {
      for (const id of ids) {
        const el = document.getElementById(`cap-${id}`);
        if (el) obs.observe(el);
      }
    }, 300);
    return () => { clearTimeout(timerId); obs.disconnect(); };
  }, [capsARenderizar]);

  /* IDs únicos de personajes de todos los caps del segmento */
  const personajesIds = Array.from(
    new Set(capsParaMostrar.flatMap(c => c.personajes_ids ?? []))
  );

  useScrollLeidos(id, capsParaMostrar.map(c => c.id));

  useEffect(() => {
    if (loading || hasScrolled.current) return;
    hasScrolled.current = true;
    const hashCapId = typeof window !== "undefined" ? window.location.hash.replace("#cap-", "") : "";
    const targetId  = hashCapId || capId;
    setTimeout(() => {
      document.getElementById(`cap-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }, [loading, capId]);

  useEffect(() => {
    if (loading || !capId) return;
    document.getElementById(`cap-${capId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [capId]); // eslint-disable-line

  const getDexieTable = async () => {
    try {
      if (!db || !(db as any).capitulos) return null;
      return (db as any).capitulos;
    } catch { return null; }
  };

  const cachearEnDexie = async (rows: any[]) => {
    const table = await getDexieTable();
    if (!table || rows.length === 0) return;
    try {
      const ids      = rows.map(r => r.id);
      const existing = await table.bulkGet(ids) as (any | undefined)[];
      const merged   = rows.map((row, i) => {
        const prev    = existing[i];
        const contenido = row.contenido ?? prev?.contenido ?? "";
        return { ...prev, ...row, contenido, status: "synced" };
      });
      await table.bulkPut(merged);
    } catch (e) { console.warn("[Dexie] Error cacheando caps:", e); }
  };

  /** Navega dentro del segmento activo (scroll) — actualiza URL con slug del segmento */
  const handleNavigate = useCallback((targetCapId: string) => {
    const si = segmentos.findIndex(s => s.capitulos.some(c => c.id === targetCapId));
    const segSlug = si !== -1 ? slugSegmento(segmentos, si) : slugSegmento(segmentos, segActivo);
    const el = document.getElementById(`cap-${targetCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(`/garlia/libros/${slugParam}/leer/${segSlug}`, { scroll: false });
    } else {
      router.push(`/garliaia/libros/${slugParam}/leer/${segSlug}`);
    }
    setCapId(targetCapId);
  }, [slugParam, router, segmentos, segActivo]);

  /** Selecciona un capítulo desde el índice: si cambia de segmento navega con slug nuevo */
  const handleChapterSelect = useCallback((newCapId: string) => {
    const si = segmentos.findIndex(s => s.capitulos.some(c => c.id === newCapId));
    const segSlug = si !== -1 ? slugSegmento(segmentos, si) : slugSegmento(segmentos, segActivo);
    if (si !== -1 && si !== segActivo) {
      // Cambia de segmento → navegar con slug del segmento destino
      router.push(`/garlia/libros/${slugParam}/leer/${segSlug}`);
      return;
    }
    const el = document.getElementById(`cap-${newCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(`/garlia/libros/${slugParam}/leer/${segSlug}`, { scroll: false });
    } else {
      router.push(`/garliaia/libros/${slugParam}/leer/${segSlug}`);
    }
    setCapId(newCapId);
  }, [slugParam, router, segmentos, segActivo]);

  /** Al pasar al siguiente segmento, usa el slug del narrador/reino en la URL */
  const irAlSiguienteSegmento = useCallback((si: number) => {
    const sigIndex = si + 1;
    const sig = segmentos[sigIndex];
    if (!sig?.capitulos[0]) return;

    const segActual = segmentos[si];
    if (segActual) {
      for (const cap of segActual.capitulos) guardarLeido(id, cap.id);
    }

    const segSlug = slugSegmento(segmentos, sigIndex);
    router.push(`/garlia/libros/${slugParam}/leer/${segSlug}`);
  }, [segmentos, id, slugParam, router]);

  if (!loading && (error || capitulos.length === 0)) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">
        {error || "No hay capítulos disponibles"}
      </h2>
      <Btn variant="outline" size="sm" onClick={() => router.push(`/garlia/libros/${slugParam}`)}>
        Volver al índice
      </Btn>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-main)",
      }}
    >
      {/* ── Barra superior fija en móvil ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-12 border-b border-primary/8 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--bg-main) 92%, transparent)" }}
      >
        <button
          onClick={() => router.push(`/garlia/libros/${slugParam}`)}
          className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors font-black text-[9px] uppercase tracking-widest"
        >
          <ChevronLeft size={14} /> Volver
        </button>
        {libroTitulo && (
          <span className="text-primary/50 font-black text-[9px] uppercase tracking-wider italic truncate max-w-[45%] text-center">
            {libroTitulo}
          </span>
        )}
        <button
          onClick={() => setShowIndex(true)}
          className="flex items-center gap-1.5 text-primary/40 hover:text-primary transition-colors font-black text-[9px] uppercase tracking-widest"
        >
          <List size={13} /> Índice
        </button>
      </div>

      {/* ── Columna izquierda: panel fijo — oculto en móvil ── */}
      <div className="hidden md:contents">
        <PanelLateral
          libroTitulo={libroTitulo}
          segActualObj={segActualObj}
          capsParaMostrar={capsParaMostrar}
          personajesIds={personajesIds}
          loading={loading}
          esExtra={esExtra}
          listaCapitulos={listaCapitulos}
          capIdActual={capId}
          onVolver={() => router.push(`/garlia/libros/${slugParam}`)}
          onAbrirIndice={() => setShowIndex(true)}
          onSelectCap={(newId) => { handleChapterSelect(newId); }}
        />
      </div>

      {/* ── Columna derecha: texto scrolleable ── */}
      <div
        id="lector-scroll-container"
        style={{
          flex: 1,
          height: "100vh",
          overflowY: "auto",
          position: "relative",
        }}
        className="bg-bg-main text-primary-dark"
      >
        <Vignette />

        {/* Indicador flotante de capítulo activo (aparece al scroll) */}
        {activeCapTitle && (
          <div
            className="hidden md:flex sticky top-0 z-30 items-center gap-3 px-8 py-2.5 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg-main) 90%, transparent), transparent)" }}
          >
            <span
              className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25 italic truncate max-w-sm"
            >
              {activeCapTitle}
            </span>
          </div>
        )}

        {/* Padding top en móvil para compensar la barra fija */}
        <div className="md:hidden h-12" />

        <IndexPanel
          open={showIndex}
          onClose={() => setShowIndex(false)}
          lista={listaCapitulos}
          capIdActual={capId}
          libroTitulo={libroTitulo}
          onSelect={(newId) => { handleChapterSelect(newId); setShowIndex(false); }}
        />

        {/* Capítulos */}
        {!loading && capsARenderizar.map((cap) => (
          <CapituloScrollBlock key={cap.id} cap={cap} onNavigate={handleNavigate} esExtra={esExtra} />
        ))}

        {/* Transición o fin del libro */}
        {segSiguiente ? (
          <SegmentoTransicion
            actual={segActualObj!}
            siguiente={segSiguiente}
            onIr={() => irAlSiguienteSegmento(segActivo)}
          />
        ) : (
          <footer className="max-w-2xl mx-auto px-6 pb-20 pt-4 flex flex-col items-center gap-6">
            {!esExtra && (
              <>
                <div className="flex items-center gap-4 w-full max-w-xs">
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }} />
                  <span className="font-serif text-base" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>— Fin —</span>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }} />
                </div>
                <button
                  onClick={() => router.push(`/garlia/libros/${slugParam}`)}
                  className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <List size={16} /> Volver al índice
                </button>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}