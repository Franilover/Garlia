"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { Eye, EyeOff, Info } from "lucide-react";
import EstructurasPage from "@/domains/garlia/elementos/EstructurasPage";
import { MaterialesPage } from "@/domains/garlia/materiales/MaterialesPage";

import { useAuth } from "@/providers/AuthProvider";
import { useVisibilidadDescubrimientos } from "./useVisibilidadDescubrimientos";

/* ─── tipos ─────────────────────────────────────────────── */
interface Elemento {
  id: string;
  numero_atomico: number;
  simbolo: string;
  nombre: string;
  familia: string;
  es_noble?: boolean;
}
interface Particula {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
}
interface Ium {
  id: string;
  nombre: string;
  formula?: string;
  descripcion?: string;
}
interface Ori {
  id: string;
  nombre: string;
  familia?: string;
  formula_iums?: string;
}
interface Compuesto {
  id: string;
  nombre: string;
  formula?: string;
  clasificacion?: string;
  propiedad?: string;
}
interface Proceso {
  id: string;
  nombre: string;
  tipo?: string;
}

/* ─── colores por segmento TASI ──────────────────────────── */
const SEGMENT_FILL: Record<string, string> = {
  T: "color-mix(in srgb, var(--primary) 26%, var(--bg-main))",
  A: "color-mix(in srgb, var(--primary) 42%, var(--bg-main))",
  S: "color-mix(in srgb, var(--primary) 14%, var(--bg-main))",
  I: "color-mix(in srgb, var(--primary) 20%, var(--bg-main))",
};
const SEGMENT_STROKE: Record<string, string> = {
  T: "color-mix(in srgb, var(--primary) 45%, var(--bg-main))",
  A: "color-mix(in srgb, var(--primary) 60%, var(--bg-main))",
  S: "color-mix(in srgb, var(--primary) 32%, var(--bg-main))",
  I: "color-mix(in srgb, var(--primary) 38%, var(--bg-main))",
};
const SEGMENT_TEXT: Record<string, string> = {
  T: "color-mix(in srgb, var(--foreground) 85%, var(--primary))",
  A: "color-mix(in srgb, var(--foreground) 90%, var(--primary))",
  S: "color-mix(in srgb, var(--foreground) 80%, var(--primary))",
  I: "color-mix(in srgb, var(--foreground) 82%, var(--primary))",
};

/* ─── SVG partícula (3 segmentos 120°) ─────────────────── */
function ParticleSVG({ codigo }: { codigo: string }) {
  const r = 16, cx = 18, cy = 18;
  const letters = (codigo ?? "").slice(0, 3).split("");
  if (letters.length !== 3) return null;
  const segments = [
    { startDeg: -90, endDeg: 30,  letter: letters[0] },
    { startDeg: 30,  endDeg: 150, letter: letters[1] },
    { startDeg: 150, endDeg: 270, letter: letters[2] },
  ];
  function polar(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function segPath(s: number, e: number) {
    const p1 = polar(s), p2 = polar(e);
    return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y} Z`;
  }
  function labelPos(s: number, e: number) {
    const mid = (s + e) / 2;
    const rad = (mid * Math.PI) / 180;
    return { x: cx + r * 0.6 * Math.cos(rad), y: cy + r * 0.6 * Math.sin(rad) };
  }
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" role="img">
      {segments.map((seg, i) => {
        const lp = labelPos(seg.startDeg, seg.endDeg);
        return (
          <g key={i}>
            <path
              d={segPath(seg.startDeg, seg.endDeg)}
              strokeWidth="1.8"
              style={{
                fill: SEGMENT_FILL[seg.letter] ?? SEGMENT_FILL.T,
                stroke: SEGMENT_STROKE[seg.letter] ?? SEGMENT_STROKE.T,
              }}
            />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize="5.76" fontWeight="900"
              style={{ fill: SEGMENT_TEXT[seg.letter] ?? SEGMENT_TEXT.T }}
            >
              {seg.letter}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="1.8"
        style={{ stroke: "var(--bg-main)" }} opacity="0.001" />
    </svg>
  );
}

/* ─── SVG partícula simple (1 letra) ───────────────────── */
function SimpleParticleSVG({ letter }: { letter: string }) {
  const idx = ["T", "A", "S", "I"].indexOf(letter);
  const fills   = [26, 42, 14, 20];
  const strokes = [45, 60, 32, 38];
  const fill      = idx >= 0 ? `color-mix(in srgb, var(--primary) ${fills[idx]}%, var(--bg-main))` : SEGMENT_FILL.T;
  const stroke    = idx >= 0 ? `color-mix(in srgb, var(--primary) ${strokes[idx]}%, var(--bg-main))` : SEGMENT_STROKE.T;
  const textFill  = idx >= 0 ? SEGMENT_TEXT[letter] : SEGMENT_TEXT.T;
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" role="img">
      <circle cx="18" cy="18" r="16" strokeWidth="1.8" style={{ fill, stroke }} />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central"
        fontSize="5.76" fontWeight="900" style={{ fill: textFill }}>
        {letter}
      </text>
    </svg>
  );
}

/* ─── CabeceraSección ───────────────────────────────────── */
function CabeceraSeccion({ titulo, total, info }: { titulo: string; total?: number; info?: string }) {
  return (
    <div
      className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/70 truncate">
          {titulo}
        </span>
        {total !== undefined && (
          <span className="text-micro tabular-nums font-bold text-primary/30">{total}</span>
        )}
        {info && (
          <button
            type="button" title={info}
            className="flex items-center justify-center w-4 h-4 rounded-full text-primary/30 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer shrink-0"
          >
            <Info size={11} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Divisor de grupo ──────────────────────────────────── */
function Divider({ label, count }: { label: string; count?: number }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 px-1">
      <span aria-hidden className="h-px flex-1 bg-primary/15" />
      <span className="flex min-w-0 max-w-[80%] items-center gap-1.5 text-micro font-black uppercase tracking-[0.2em] text-accent/70">
        <span className="truncate">{label}</span>
        {count !== undefined && (
          <span className="shrink-0 tabular-nums font-bold tracking-normal opacity-60">{count}</span>
        )}
      </span>
      <span aria-hidden className="h-px flex-1 bg-primary/15" />
    </div>
  );
}

/* ─── Casilla de Elemento ───────────────────────────────── */
function ElementoCasilla({ el }: { el: Elemento }) {
  return (
    <button
      type="button"
      title={`${el.nombre} · Familia: ${el.familia}`}
      className="group flex flex-col items-stretch gap-0.5 p-1.5 border-r border-b transition-colors text-left border-primary/10 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between">
        <span className="text-micro font-black text-primary/30 tabular-nums">
          #{el.numero_atomico}
        </span>
        {el.es_noble && (
          <span title="Noble" className="w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0 mt-0.5" />
        )}
      </div>
      <span className="text-base font-black text-center leading-none py-0.5 text-primary">
        {el.simbolo}
      </span>
      <span className="text-micro font-bold text-primary/80 truncate text-center leading-tight">
        {el.nombre}
      </span>
    </button>
  );
}

/* ─── Casilla de Compuesto ──────────────────────────────── */
function CompuestoCasilla({ c }: { c: Compuesto }) {
  return (
    <button
      type="button"
      title={c.nombre}
      className="group flex flex-col items-stretch gap-0.5 p-1.5 border-r border-b transition-colors text-left border-primary/10 hover:bg-primary/5"
    >
      {c.formula && (
        <span className="text-sm font-black text-center leading-none py-0.5 text-primary/70 truncate">
          {c.formula}
        </span>
      )}
      <span className="text-micro font-bold text-primary/80 truncate text-center leading-tight">
        {c.nombre}
      </span>
    </button>
  );
}

/* ─── Pill genérico ─────────────────────────────────────── */
function Pill({ label, title }: { label: string; title?: string }) {
  return (
    <button
      type="button"
      title={title ?? label}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-bold tracking-wide transition-colors truncate max-w-full hover:bg-primary/10 text-primary/70 border border-primary/15"
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ─── Toggle individual admin (Eye/EyeOff sobre un ítem) ── */
function ToggleItemAdmin({
  visible,
  onToggle,
  title,
}: {
  visible: boolean;
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={visible ? `Ocultar "${title}" al público` : `Mostrar "${title}" al público`}
      className="absolute top-0.5 right-0.5 z-10 flex items-center justify-center w-5 h-5 rounded-full border transition-all opacity-0 group-hover:opacity-100"
      style={{
        color: visible
          ? "color-mix(in srgb, var(--primary) 55%, transparent)"
          : "var(--warning)",
        borderColor: visible
          ? "color-mix(in srgb, var(--primary) 20%, transparent)"
          : "color-mix(in srgb, var(--warning) 40%, transparent)",
        background: visible
          ? "var(--bg-main)"
          : "color-mix(in srgb, var(--warning) 8%, var(--bg-main))",
      }}
    >
      {visible ? <Eye size={10} /> : <EyeOff size={10} />}
    </button>
  );
}

/* ─── Toggle maestro admin (para cabeceras de sección) ─── */
function ToggleMaestroAdmin({
  visible,
  onToggle,
  etiqueta,
}: {
  visible: boolean;
  onToggle: () => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        visible
          ? `Ocultar toda la sección "${etiqueta}" al público`
          : `Mostrar toda la sección "${etiqueta}" al público`
      }
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer border"
      style={{
        color: visible
          ? "color-mix(in srgb, var(--primary) 55%, transparent)"
          : "var(--warning)",
        borderColor: visible
          ? "color-mix(in srgb, var(--primary) 20%, transparent)"
          : "color-mix(in srgb, var(--warning) 40%, transparent)",
        background: visible
          ? "transparent"
          : "color-mix(in srgb, var(--warning) 8%, transparent)",
      }}
    >
      {visible ? <Eye size={11} /> : <EyeOff size={11} />}
      {visible ? "Visible" : "Oculta"}
    </button>
  );
}

/* ─── constantes ────────────────────────────────────────── */
const TASI = [
  { letter: "T", title: "T — Movimiento" },
  { letter: "A", title: "A — Masa y resistencia" },
  { letter: "S", title: "S — Emisión" },
  { letter: "I", title: "I — Recepción" },
];
const POLARIDADES = ["+", "-"];
const POLARIDAD_TITLES = ["Polo emisor", "Polo receptor"];

/* ═══════════════════════════════════════════════════════ */
export default function DescubrimientosPage() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "admin";

  const [particulas, setParticulas] = useState<Particula[]>([]);
  const [iums,       setIums]       = useState<Ium[]>([]);
  const [oris,       setOris]       = useState<Ori[]>([]);
  const [elementos,  setElementos]  = useState<Elemento[]>([]);
  const [compuestos, setCompuestos] = useState<Compuesto[]>([]);
  const [procesos,   setProcesos]   = useState<Proceso[]>([]);
  const [loading,    setLoading]    = useState(true);

  /* hooks de visibilidad por tipo */
  const visParticula = useVisibilidadDescubrimientos("particula");
  const visIum       = useVisibilidadDescubrimientos("ium");
  const visOri       = useVisibilidadDescubrimientos("ori");
  const visElemento  = useVisibilidadDescubrimientos("elemento");
  const visCompuesto = useVisibilidadDescubrimientos("compuesto");
  const visProceso   = useVisibilidadDescubrimientos("proceso");

  useEffect(() => {
    async function fetchAll() {
      const [pRes, iRes, oRes, eRes, cRes, prRes] = await Promise.all([
        supabase.from("particulas").select("*").order("nombre"),
        supabase.from("iums").select("*").order("nombre"),
        supabase.from("oris").select("*").order("nombre"),
        supabase.from("elementos").select("*").order("numero_atomico"),
        supabase.from("compuestos").select("*").order("nombre"),
        supabase.from("procesos").select("*").order("nombre"),
      ]);
      if (pRes.data)  setParticulas(pRes.data);
      if (iRes.data)  setIums(iRes.data);
      if (oRes.data)  setOris(oRes.data);
      if (eRes.data)  setElementos(eRes.data);
      if (cRes.data)  setCompuestos(cRes.data);
      if (prRes.data) setProcesos(prRes.data);
      setLoading(false);
    }
    fetchAll();
  }, []);

  /* agrupaciones */
  const compuestosPorPropiedad = compuestos.reduce<Record<string, Compuesto[]>>((acc, c) => {
    const key = c.propiedad ?? "Sin clasificar";
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  const procesosPorTipo = procesos.reduce<Record<string, Proceso[]>>((acc, p) => {
    const key = p.tipo ?? "General";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const orisPorFamilia = oris.reduce<Record<string, Ori[]>>((acc, o) => {
    const key = o.familia ?? "General";
    (acc[key] ??= []).push(o);
    return acc;
  }, {});

  /* items filtrados para vista pública */
  const particulasVisibles  = esAdmin ? particulas  : visParticula.filtrarVisibles(particulas);
  const iumsVisibles        = esAdmin ? iums        : visIum.filtrarVisibles(iums);
  const orisVisibles        = esAdmin ? oris        : visOri.filtrarVisibles(oris);
  const elementosVisibles   = esAdmin ? elementos   : visElemento.filtrarVisibles(elementos);
  const compuestosVisibles  = esAdmin ? compuestos  : visCompuesto.filtrarVisibles(compuestos);
  const procesosVisibles    = esAdmin ? procesos    : visProceso.filtrarVisibles(procesos);

  const compuestosVisiPorPropiedad = compuestosVisibles.reduce<Record<string, Compuesto[]>>((acc, c) => {
    const key = c.propiedad ?? "Sin clasificar";
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  const procesosVisiPorTipo = procesosVisibles.reduce<Record<string, Proceso[]>>((acc, p) => {
    const key = p.tipo ?? "General";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const orisVisiPorFamilia = orisVisibles.reduce<Record<string, Ori[]>>((acc, o) => {
    const key = o.familia ?? "General";
    (acc[key] ??= []).push(o);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-primary/30 text-micro font-black uppercase tracking-widest">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

      {/* ── Física: Polaridades / TASI / Partículas / IUMs / Oris ── */}
      <div className="flex flex-col border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <div className="p-2.5 flex flex-wrap gap-3 items-start">

          {/* Polaridades + TASI — columna angosta apilada (sin toggle: son constantes del sistema) */}
          <div className="flex flex-col gap-4 min-w-[180px]" style={{ flexGrow: 1, flexBasis: 0 }}>
            {/* Polaridades */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-primary/50 pb-1.5">
                <p className="text-micro font-black uppercase tracking-[0.2em]">
                  Polaridades · {POLARIDADES.length}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {POLARIDADES.map((p, i) => (
                  <button key={p} type="button" title={POLARIDAD_TITLES[i]}
                    className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                  >
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full border-2 font-black"
                      style={{
                        width: 36, height: 36, fontSize: "14.4px",
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      {p}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TASI */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-primary/50 pb-1.5">
                <p className="text-micro font-black uppercase tracking-[0.2em]">
                  TASI · {TASI.length}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {TASI.map((t) => (
                  <button key={t.letter} type="button" title={t.title}
                    className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                  >
                    <SimpleParticleSVG letter={t.letter} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Partículas */}
          {(esAdmin || visParticula.maestroVisible) && (
            <div
              className="flex flex-col gap-2 min-w-[180px]"
              style={{ flexGrow: Math.max(particulas.length, 1), flexBasis: 0 }}
            >
              <div className="flex items-center justify-between gap-1.5 text-primary/50 pb-1.5">
                <p className="text-micro font-black uppercase tracking-[0.2em]">
                  Partículas · {esAdmin ? particulas.length : particulasVisibles.length}
                </p>
                {esAdmin && (
                  <ToggleMaestroAdmin
                    visible={visParticula.maestroVisible}
                    onToggle={visParticula.toggleMaestro}
                    etiqueta="Partículas"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {(esAdmin ? particulas : particulasVisibles).map((p) => {
                  const vis = visParticula.esVisible(p.id);
                  return (
                    <div key={p.id} className="relative group">
                      <button
                        type="button" title={p.nombre}
                        className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                        style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}
                      >
                        <ParticleSVG codigo={p.codigo} />
                      </button>
                      {esAdmin && (
                        <ToggleItemAdmin
                          visible={vis}
                          onToggle={() => visParticula.toggleIndividual(p.id)}
                          title={p.nombre}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {esAdmin && !visParticula.maestroVisible && (
                <p className="text-[10px] mt-0.5" style={{ color: "color-mix(in srgb, var(--warning) 60%, transparent)" }}>
                  Oculta al público · hover para gestionar excepciones
                </p>
              )}
            </div>
          )}

          {/* IUMs */}
          {(esAdmin || visIum.maestroVisible) && iums.length > 0 && (
            <div
              className="flex flex-col gap-2 min-w-[180px]"
              style={{ flexGrow: Math.max(iums.length, 1), flexBasis: 0 }}
            >
              <div className="flex items-center justify-between gap-1.5 text-primary/50 pb-1.5">
                <p className="text-micro font-black uppercase tracking-[0.2em]">
                  IUMs · {esAdmin ? iums.length : iumsVisibles.length}
                </p>
                {esAdmin && (
                  <ToggleMaestroAdmin
                    visible={visIum.maestroVisible}
                    onToggle={visIum.toggleMaestro}
                    etiqueta="IUMs"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {(esAdmin ? iums : iumsVisibles).map((iu) => {
                  const vis = visIum.esVisible(iu.id);
                  return (
                    <div key={iu.id} className="relative group">
                      <span style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}>
                        <Pill label={iu.nombre} title={iu.formula ?? iu.nombre} />
                      </span>
                      {esAdmin && (
                        <ToggleItemAdmin
                          visible={vis}
                          onToggle={() => visIum.toggleIndividual(iu.id)}
                          title={iu.nombre}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {esAdmin && !visIum.maestroVisible && (
                <p className="text-[10px] mt-0.5" style={{ color: "color-mix(in srgb, var(--warning) 60%, transparent)" }}>
                  Oculta al público · hover para gestionar excepciones
                </p>
              )}
            </div>
          )}

          {/* Oris */}
          {(esAdmin || visOri.maestroVisible) && oris.length > 0 && (
            <div
              className="flex flex-col gap-2 min-w-[180px]"
              style={{ flexGrow: Math.max(oris.length, 1), flexBasis: 0 }}
            >
              <div className="flex items-center justify-between gap-1.5 text-primary/50 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-micro font-black uppercase tracking-[0.2em]">
                    Oris · {esAdmin ? oris.length : orisVisibles.length}
                  </p>
                  <button
                    type="button"
                    title="Abrir Simulador de requerimiento de Eterium"
                    className="flex items-center justify-center w-4 h-4 rounded-full text-primary/30 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  >
                    <Info size={11} aria-hidden />
                  </button>
                </div>
                {esAdmin && (
                  <ToggleMaestroAdmin
                    visible={visOri.maestroVisible}
                    onToggle={visOri.toggleMaestro}
                    etiqueta="Oris"
                  />
                )}
              </div>
              {Object.keys(esAdmin ? orisPorFamilia : orisVisiPorFamilia).length > 1
                ? Object.entries(esAdmin ? orisPorFamilia : orisVisiPorFamilia).map(([fam, list]) => (
                    <div key={fam} className="mb-1">
                      <p className="text-micro font-bold uppercase tracking-[0.15em] text-primary/30 mb-1">{fam}</p>
                      <div className="flex flex-wrap gap-1">
                        {list.map((o) => {
                          const vis = visOri.esVisible(o.id);
                          return (
                            <div key={o.id} className="relative group">
                              <span style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}>
                                <Pill label={o.nombre} title={o.formula_iums ?? o.nombre} />
                              </span>
                              {esAdmin && (
                                <ToggleItemAdmin
                                  visible={vis}
                                  onToggle={() => visOri.toggleIndividual(o.id)}
                                  title={o.nombre}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                : (
                  <div className="flex flex-wrap gap-1">
                    {(esAdmin ? oris : orisVisibles).map((o) => {
                      const vis = visOri.esVisible(o.id);
                      return (
                        <div key={o.id} className="relative group">
                          <span style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}>
                            <Pill label={o.nombre} title={o.formula_iums ?? o.nombre} />
                          </span>
                          {esAdmin && (
                            <ToggleItemAdmin
                              visible={vis}
                              onToggle={() => visOri.toggleIndividual(o.id)}
                              title={o.nombre}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              {esAdmin && !visOri.maestroVisible && (
                <p className="text-[10px] mt-0.5" style={{ color: "color-mix(in srgb, var(--warning) 60%, transparent)" }}>
                  Oculta al público · hover para gestionar excepciones
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Elementos ── */}
      {(esAdmin || visElemento.maestroVisible) && elementos.length > 0 && (
        <div className="flex flex-col border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div
            className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/70">
                Elementos
              </span>
              <span className="text-micro tabular-nums font-bold text-primary/30">
                {esAdmin ? elementos.length : elementosVisibles.length}
              </span>
            </div>
            {esAdmin && (
              <ToggleMaestroAdmin
                visible={visElemento.maestroVisible}
                onToggle={visElemento.toggleMaestro}
                etiqueta="Elementos"
              />
            )}
          </div>
          {esAdmin && !visElemento.maestroVisible && (
            <p className="text-[10px] px-3 py-1" style={{ color: "color-mix(in srgb, var(--warning) 60%, transparent)" }}>
              Oculta al público · hover sobre cada casilla para gestionar excepciones
            </p>
          )}
          <div
            className="grid gap-0 border-t border-l border-primary/10"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}
          >
            {(esAdmin ? elementos : elementosVisibles).map((el) => {
              const vis = visElemento.esVisible(el.id);
              return (
                <div key={el.id} className="relative group" style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}>
                  <ElementoCasilla el={el} />
                  {esAdmin && (
                    <ToggleItemAdmin
                      visible={vis}
                      onToggle={() => visElemento.toggleIndividual(el.id)}
                      title={el.nombre}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Compuestos ── */}
      {(esAdmin || visCompuesto.maestroVisible) && compuestos.length > 0 && (
        <div className="flex flex-col border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div
            className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/70">
                Compuestos
              </span>
              <span className="text-micro tabular-nums font-bold text-primary/30">
                {esAdmin ? compuestos.length : compuestosVisibles.length}
              </span>
            </div>
            {esAdmin && (
              <ToggleMaestroAdmin
                visible={visCompuesto.maestroVisible}
                onToggle={visCompuesto.toggleMaestro}
                etiqueta="Compuestos"
              />
            )}
          </div>
          {esAdmin && !visCompuesto.maestroVisible && (
            <p className="text-[10px] px-3 py-1" style={{ color: "color-mix(in srgb, var(--warning) 60%, transparent)" }}>
              Oculta al público · hover para gestionar excepciones
            </p>
          )}
          <div className="p-3 flex flex-col gap-4">
            {Object.entries(esAdmin ? compuestosPorPropiedad : compuestosVisiPorPropiedad).map(([prop, list]) => (
              <div key={prop}>
                <Divider label={prop} count={list.length} />
                <div
                  className="grid gap-0 border-t border-l border-primary/10"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}
                >
                  {list.map((c) => {
                    const vis = visCompuesto.esVisible(c.id);
                    return (
                      <div key={c.id} className="relative group" style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}>
                        <CompuestoCasilla c={c} />
                        {esAdmin && (
                          <ToggleItemAdmin
                            visible={vis}
                            onToggle={() => visCompuesto.toggleIndividual(c.id)}
                            title={c.nombre}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Procesos ── */}
      {(esAdmin || visProceso.maestroVisible) && procesos.length > 0 && (
        <div className="flex flex-col">
          <div
            className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/70">
                Procesos
              </span>
              <span className="text-micro tabular-nums font-bold text-primary/30">
                {esAdmin ? procesos.length : procesosVisibles.length}
              </span>
            </div>
            {esAdmin && (
              <ToggleMaestroAdmin
                visible={visProceso.maestroVisible}
                onToggle={visProceso.toggleMaestro}
                etiqueta="Procesos"
              />
            )}
          </div>
          {esAdmin && !visProceso.maestroVisible && (
            <p className="text-[10px] px-3 py-1" style={{ color: "color-mix(in srgb, var(--warning) 60%, transparent)" }}>
              Oculta al público · hover para gestionar excepciones
            </p>
          )}
          <div className="p-3 flex flex-col gap-4">
            {Object.entries(esAdmin ? procesosPorTipo : procesosVisiPorTipo).map(([tipo, list]) => (
              <div key={tipo}>
                <Divider label={tipo} count={list.length} />
                <div
                  className="grid gap-0 border-t border-l border-primary/10"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
                >
                  {list.map((p) => {
                    const vis = visProceso.esVisible(p.id);
                    return (
                      <div key={p.id} className="relative group" style={{ opacity: esAdmin && !vis ? 0.35 : 1 }}>
                        <button
                          type="button"
                          title={p.nombre}
                          className="w-full flex flex-col items-center justify-center gap-0.5 p-1.5 border-r border-b transition-colors text-center border-primary/10 hover:bg-primary/5"
                        >
                          <span className="text-sm font-black leading-tight text-primary/70 line-clamp-3">
                            {p.nombre}
                          </span>
                        </button>
                        {esAdmin && (
                          <ToggleItemAdmin
                            visible={vis}
                            onToggle={() => visProceso.toggleIndividual(p.id)}
                            title={p.nombre}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Estructuras ── */}
      <div className="flex flex-col border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <CabeceraSeccion titulo="Estructuras" />
        <EstructurasPage />
      </div>

      {/* ── Materiales ── */}
      <div className="flex flex-col border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <CabeceraSeccion titulo="Materiales" />
        <MaterialesPage />
      </div>

    </div>
  );
}
