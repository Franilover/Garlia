"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Network, FileText } from "lucide-react";
import * as d3 from "d3";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NodoEnsayo {
  id: string;
  titulo: string;
  tags: string[];
  profundidad: 0 | 1 | 2; // 0 = centro, 1 = directos, 2 = secundarios
}

interface EnlaceTag {
  source: string;
  target: string;
  tagsComunes: string[];
}

interface DatosGrafo {
  nodos: NodoEnsayo[];
  enlaces: EnlaceTag[];
  todosLosTags: string[]; // todos los tags que aparecen en el grafo
}

// ─── Construcción del grafo (2 niveles de profundidad) ───────────────────────

function construirGrafo(ensayos: any[], centroId: string): DatosGrafo {
  const centro = ensayos.find(e => e.id === centroId);
  if (!centro) return { nodos: [], enlaces: [], todosLosTags: [] };

  const tagsCentro: string[] = centro.tags ?? [];
  const nodosMap = new Map<string, NodoEnsayo>();
  const enlacesMap = new Map<string, EnlaceTag>(); // key = "idA|idB" para deduplicar

  const addEnlace = (a: string, b: string, comunes: string[]) => {
    const key = [a, b].sort().join("|");
    if (!enlacesMap.has(key)) {
      enlacesMap.set(key, { source: a, target: b, tagsComunes: comunes });
    }
  };

  // Nodo centro (profundidad 0)
  nodosMap.set(centroId, { id: centroId, titulo: centro.titulo || "Sin título", tags: tagsCentro, profundidad: 0 });

  // Nivel 1: ensayos que comparten tag con el centro
  const nivel1Ids = new Set<string>();
  for (const e of ensayos) {
    if (e.id === centroId) continue;
    const eTags: string[] = e.tags ?? [];
    const comunes = eTags.filter(t => tagsCentro.includes(t));
    if (comunes.length === 0) continue;
    nivel1Ids.add(e.id);
    nodosMap.set(e.id, { id: e.id, titulo: e.titulo || "Sin título", tags: eTags, profundidad: 1 });
    addEnlace(centroId, e.id, comunes);
  }

  // Nivel 2: ensayos que comparten tag con algún nodo nivel 1 (pero no con el centro directamente)
  for (const e of ensayos) {
    if (e.id === centroId || nivel1Ids.has(e.id)) continue;
    const eTags: string[] = e.tags ?? [];

    for (const n1Id of nivel1Ids) {
      const n1 = nodosMap.get(n1Id)!;
      const comunes = eTags.filter(t => n1.tags.includes(t));
      if (comunes.length === 0) continue;

      if (!nodosMap.has(e.id)) {
        nodosMap.set(e.id, { id: e.id, titulo: e.titulo || "Sin título", tags: eTags, profundidad: 2 });
      }
      addEnlace(n1Id, e.id, comunes);
    }
  }

  // Enlaces laterales entre nodos del mismo nivel o entre nivel 1 y nivel 2
  const todosIds = [...nodosMap.keys()];
  for (let i = 0; i < todosIds.length; i++) {
    for (let j = i + 1; j < todosIds.length; j++) {
      const a = nodosMap.get(todosIds[i])!;
      const b = nodosMap.get(todosIds[j])!;
      // Solo conectar si no es enlace centro→nivel1 (ya está) y comparten tags
      if (a.profundidad === 0 || b.profundidad === 0) continue;
      const comunes = a.tags.filter(t => b.tags.includes(t));
      if (comunes.length > 0) addEnlace(a.id, b.id, comunes);
    }
  }

  const nodos = [...nodosMap.values()];
  const enlaces = [...enlacesMap.values()];

  // Recopilar todos los tags que aparecen en el grafo
  const tagSet = new Set<string>();
  nodos.forEach(n => n.tags.forEach(t => tagSet.add(t)));
  const todosLosTags = [...tagSet].sort();

  return { nodos, enlaces, todosLosTags };
}

// ─── CSS var hook ─────────────────────────────────────────────────────────────

function useCSSVar(name: string): string {
  const [val, setVal] = useState("");
  useEffect(() => {
    setVal(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }, [name]);
  return val;
}

// ─── Color determinístico por tag ─────────────────────────────────────────────

function hashColor(tag: string, opacity = 0.7): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return `hsla(${hue}, 50%, 62%, ${opacity})`;
}

// ─── Grafo D3 ─────────────────────────────────────────────────────────────────

function GrafoD3({
  datos,
  centroId,
  width,
  height,
  onClickNodo,
}: {
  datos: DatosGrafo;
  centroId: string;
  width: number;
  height: number;
  onClickNodo: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const primary = useCSSVar("--primary");
  const bgMain  = useCSSVar("--bg-main");

  useEffect(() => {
    if (!svgRef.current || !datos.nodos.length || !primary) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = width, H = height;
    const cx = W / 2, cy = H / 2;

    // Radios por profundidad — el centro fijo, anillos concéntricos
    const R = [0, Math.min(W, H) * 0.22, Math.min(W, H) * 0.42];

    // Posiciones iniciales en anillos
    const nivel1 = datos.nodos.filter(n => n.profundidad === 1);
    const nivel2 = datos.nodos.filter(n => n.profundidad === 2);

    const nodes = datos.nodos.map(n => {
      if (n.profundidad === 0) return { ...n, x: cx, y: cy, fx: cx, fy: cy };

      if (n.profundidad === 1) {
        const i = nivel1.indexOf(n);
        const total = nivel1.length;
        const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2;
        return { ...n, x: cx + R[1] * Math.cos(angle), y: cy + R[1] * Math.sin(angle) };
      }

      // profundidad 2
      const i = nivel2.indexOf(n);
      const total = nivel2.length;
      const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2 + (Math.PI / Math.max(total, 1));
      return { ...n, x: cx + R[2] * Math.cos(angle), y: cy + R[2] * Math.sin(angle) };
    }) as any[];

    const links = datos.enlaces.map(e => ({ ...e })) as any[];

    // Simulación — fuerzas distintas por profundidad para respetar los anillos
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => {
          const sp = d.source.profundidad as number;
          const tp = d.target.profundidad as number;
          if (sp === 0 || tp === 0) return R[1];             // centro → nivel1
          if (Math.abs(sp - tp) === 1) return R[2] - R[1];  // nivel1 → nivel2
          return 80;                                          // laterales
        })
        .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-180))
      .force("collision", d3.forceCollide((d: any) => d.profundidad === 0 ? 40 : 48))
      // Fuerza radial: atrae cada nodo a su anillo
      .force("radial", d3.forceRadial(
        (d: any) => R[d.profundidad as number] ?? R[2],
        cx, cy
      ).strength(0.55));

    // Zoom
    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.25, 3.5])
        .on("zoom", ev => g.attr("transform", ev.transform))
    );

    // ── Defs ──────────────────────────────────────────────────────────────────
    const defs = svg.append("defs");

    // Glow centro
    const glow = defs.append("filter").attr("id", "glow-centro")
      .attr("x", "-60%").attr("y", "-60%").attr("width", "220%").attr("height", "220%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Anillos guía (decorativos, muy tenues)
    [1, 2].forEach(lvl => {
      g.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", R[lvl])
        .attr("fill", "none")
        .attr("stroke", primary)
        .attr("stroke-opacity", 0.04)
        .attr("stroke-dasharray", "3 6");
    });

    // ── Links — LÍNEAS RECTAS ──────────────────────────────────────────────────
    const linkG = g.append("g").attr("class", "links");

    const linkEl = linkG.selectAll("g.link")
      .data(links)
      .join("g")
      .attr("class", "link");

    // Línea recta (sin curvas)
    const linea = linkEl.append("line")
      .attr("stroke-width", (d: any) => {
        const base = d.source.profundidad === 0 || d.target.profundidad === 0 ? 1.2 : 0.7;
        return base + d.tagsComunes.length * 0.5;
      })
      .attr("stroke", (d: any) => hashColor(d.tagsComunes[0], 0.3))
      .attr("stroke-dasharray", (d: any) => {
        // Líneas de nivel 2 son punteadas para diferenciar
        if (d.source.profundidad === 2 || d.target.profundidad === 2) return "4 4";
        return "none";
      });

    // Etiqueta del tag sobre la línea — solo para enlaces centro↔nivel1
    const labelLinea = linkEl.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -4)
      .attr("font-size", 7)
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.05em")
      .attr("fill", (d: any) => hashColor(d.tagsComunes[0], 0.55))
      .attr("pointer-events", "none")
      .attr("opacity", (d: any) =>
        d.source.profundidad === 0 || d.target.profundidad === 0 ? 1 : 0.6
      )
      .text((d: any) => {
        const tags = d.tagsComunes.slice(0, 2).map((t: string) => `#${t}`).join(" ");
        return tags;
      });

    // ── Nodos ─────────────────────────────────────────────────────────────────
    const nodeG = g.append("g").attr("class", "nodes");

    const nodoEl = nodeG.selectAll("g.nodo")
      .data(nodes)
      .join("g")
      .attr("class", "nodo")
      .style("cursor", (d: any) => d.profundidad === 0 ? "default" : "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end",   (ev, d) => {
            if (!ev.active) sim.alphaTarget(0);
            if (d.profundidad !== 0) { d.fx = null; d.fy = null; }
          })
      )
      .on("click", (_ev, d: any) => { if (d.profundidad !== 0) onClickNodo(d.id); });

    // Radio visual por profundidad
    const rVis = (d: any) => d.profundidad === 0 ? 28 : d.profundidad === 1 ? 20 : 15;

    // Sombra
    nodoEl.append("circle")
      .attr("r", (d: any) => rVis(d) + 3)
      .attr("fill", primary)
      .attr("opacity", 0.05)
      .attr("transform", "translate(1,2)");

    // Círculo fondo
    nodoEl.append("circle")
      .attr("r", rVis)
      .attr("fill", bgMain || "#fff")
      .attr("stroke", (d: any) => {
        if (d.profundidad === 0) return primary;
        return hashColor(d.tags[0] ?? "x", 0.55);
      })
      .attr("stroke-width", (d: any) => d.profundidad === 0 ? 1.8 : 1.1)
      .attr("filter", (d: any) => d.profundidad === 0 ? "url(#glow-centro)" : "none");

    // Ícono documento dentro del nodo
    nodoEl.each(function(d: any) {
      const el = d3.select(this);
      const s = rVis(d) * 0.5;
      el.append("rect")
        .attr("x", -s * 0.65).attr("y", -s * 0.8)
        .attr("width", s * 1.3).attr("height", s * 1.6)
        .attr("rx", 1.5)
        .attr("fill", primary)
        .attr("opacity", d.profundidad === 0 ? 0.22 : 0.1);
      [0.25, 0, 0.25].forEach((oy, i) => {
        el.append("line")
          .attr("x1", -s * 0.4).attr("y1", s * oy)
          .attr("x2", i === 2 ? s * 0.1 : s * 0.4).attr("y2", s * oy)
          .attr("stroke", primary)
          .attr("stroke-width", 0.8)
          .attr("stroke-opacity", d.profundidad === 0 ? 0.35 : 0.18);
      });
    });

    // Puntos de color por tag debajo del círculo
    nodoEl.each(function(d: any) {
      const el = d3.select(this);
      const r = rVis(d);
      const tags: string[] = d.tags.slice(0, 5);
      tags.forEach((tag, i) => {
        const x = (i - (tags.length - 1) / 2) * 5.5;
        el.append("circle")
          .attr("cx", x).attr("cy", r + 5)
          .attr("r", 2)
          .attr("fill", hashColor(tag, 0.75));
      });
    });

    // Nombre
    nodoEl.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => rVis(d) + (d.tags.length > 0 ? 15 : 10))
      .attr("font-size", (d: any) => d.profundidad === 0 ? 9 : d.profundidad === 1 ? 8 : 7)
      .attr("font-weight", (d: any) => d.profundidad === 0 ? "800" : "600")
      .attr("fill", primary)
      .attr("fill-opacity", (d: any) => d.profundidad === 0 ? 0.9 : d.profundidad === 1 ? 0.6 : 0.45)
      .attr("font-family", "var(--font-serif, serif)")
      .attr("font-style", "italic")
      .attr("pointer-events", "none")
      .text((d: any) => {
        const max = d.profundidad === 0 ? 20 : d.profundidad === 1 ? 16 : 13;
        return d.titulo.length > max ? d.titulo.slice(0, max - 1) + "…" : d.titulo;
      });

    // ── Tick ──────────────────────────────────────────────────────────────────
    sim.on("tick", () => {
      linea
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      labelLinea
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      nodoEl.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, [datos, centroId, width, height, primary, bgMain, onClickNodo]);

  return <svg ref={svgRef} width={width} height={height} className="w-full h-full" />;
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function GrafoEnsayos({
  ensayo,
  ensayos,
  onSelectEnsayo,
}: {
  ensayo: any;
  ensayos: any[];
  onSelectEnsayo: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos]     = useState<DatosGrafo | null>(null);
  const contenedorRef         = useRef<HTMLDivElement>(null);
  const [size, setSize]        = useState({ w: 700, h: 500 });

  const tags: string[] = ensayo.tags ?? [];

  useEffect(() => {
    if (!abierto) return;
    setDatos(construirGrafo(ensayos, ensayo.id));
  }, [abierto, ensayo.id, ensayos]);

  useEffect(() => {
    if (!abierto || !contenedorRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    obs.observe(contenedorRef.current);
    return () => obs.disconnect();
  }, [abierto]);

  const handleClickNodo = useCallback((id: string) => {
    onSelectEnsayo(id);
    setAbierto(false);
  }, [onSelectEnsayo]);

  // Contar relacionados directos e indirectos para el badge
  const nRelacionados = ensayos.filter(e =>
    e.id !== ensayo.id &&
    (e.tags ?? []).some((t: string) => tags.includes(t))
  ).length;

  if (tags.length === 0) return null;

  return (
    <>
      {/* ── Botón ── */}
      <button
        onClick={() => setAbierto(true)}
        title="Ver red de ensayos relacionados"
        style={{ fontFamily: "var(--font-mono)" }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all border-primary/10 text-primary/35 hover:bg-primary/8 hover:border-primary/25 hover:text-primary/70"
      >
        <Network size={10} />
        red
        {nRelacionados > 0 && (
          <span className="text-[8px] px-1 rounded bg-primary/10 text-primary/40">
            {nRelacionados}
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      {abierto && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-primary/10 backdrop-blur-sm"
          onClick={() => setAbierto(false)}
        >
          <div
            className="relative w-full max-w-5xl bg-bg-main rounded-2xl shadow-2xl border border-primary/15 flex flex-col overflow-hidden"
            style={{ height: "min(90vh, 680px)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-primary/[0.06] bg-primary/[0.02]">
              <div className="flex items-center gap-2">
                <Network size={11} className="text-primary/40" />
                <span style={{ fontFamily: "var(--font-mono)" }} className="text-[9px] font-black uppercase tracking-widest text-primary/50">
                  red de ensayos
                </span>
                <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }} className="text-[11px] text-primary/30">
                  — {ensayo.titulo || "Sin título"}
                </span>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-primary/30 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <X size={12} />
              </button>
            </div>

            {/* Leyenda */}
            <div className="shrink-0 flex items-center gap-4 px-4 py-2 border-b border-primary/[0.04] flex-wrap">
              {/* Profundidades */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border border-primary/40 bg-transparent" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">este ensayo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full border border-primary/20 bg-transparent" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">directos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full border border-dashed border-primary/15 bg-transparent" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">indirectos</span>
                </div>
              </div>

              {/* Tags presentes en el grafo */}
              {datos && datos.todosLosTags.slice(0, 8).map(tag => (
                <div key={tag} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: hashColor(tag, 0.75) }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 7 }} className="uppercase tracking-widest text-primary/30">
                    #{tag}
                  </span>
                </div>
              ))}

              <div className="ml-auto" style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>
                click para abrir · scroll zoom · arrastrá nodos
              </div>
            </div>

            {/* Grafo */}
            <div ref={contenedorRef} className="flex-1 min-h-0 overflow-hidden">
              {!datos ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={18} className="animate-spin text-primary/20" />
                </div>
              ) : datos.nodos.length <= 1 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <FileText size={28} className="text-primary/15" />
                  <p style={{ fontFamily: "var(--font-mono)" }} className="text-[9px] font-bold text-primary/20 uppercase tracking-widest italic">
                    ningún ensayo comparte estos tags
                  </p>
                </div>
              ) : (
                <GrafoD3
                  datos={datos}
                  centroId={ensayo.id}
                  width={size.w}
                  height={size.h}
                  onClickNodo={handleClickNodo}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GrafoEnsayos;