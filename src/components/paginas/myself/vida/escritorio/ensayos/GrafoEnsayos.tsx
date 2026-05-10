"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Network, FileText } from "lucide-react";
import * as d3 from "d3";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NodoEnsayo {
  id: string;
  titulo: string;
  tags: string[];
  esCentro?: boolean;
}

interface EnlaceTag {
  source: string;
  target: string;
  tagsComunes: string[];
}

interface DatosGrafo {
  nodos: NodoEnsayo[];
  enlaces: EnlaceTag[];
}

// ─── Construcción del grafo ───────────────────────────────────────────────────

function construirGrafo(ensayos: any[], ensayoCentroId: string): DatosGrafo {
  const centro = ensayos.find(e => e.id === ensayoCentroId);
  if (!centro) return { nodos: [], enlaces: [] };

  const tagsCentro: string[] = centro.tags ?? [];

  // Nodos: el centro + todos los que comparten al menos 1 tag con él
  const nodos: NodoEnsayo[] = [
    { id: centro.id, titulo: centro.titulo || "Sin título", tags: tagsCentro, esCentro: true },
  ];

  const enlaces: EnlaceTag[] = [];

  for (const e of ensayos) {
    if (e.id === ensayoCentroId) continue;
    const eTags: string[] = e.tags ?? [];
    const comunes = eTags.filter(t => tagsCentro.includes(t));
    if (comunes.length === 0) continue;

    nodos.push({ id: e.id, titulo: e.titulo || "Sin título", tags: eTags });
    enlaces.push({ source: ensayoCentroId, target: e.id, tagsComunes: comunes });
  }

  // También enlaces entre los nodos secundarios si comparten tags entre sí
  for (let i = 1; i < nodos.length; i++) {
    for (let j = i + 1; j < nodos.length; j++) {
      const a = nodos[i], b = nodos[j];
      const comunes = a.tags.filter(t => b.tags.includes(t));
      if (comunes.length > 0) {
        enlaces.push({ source: a.id, target: b.id, tagsComunes: comunes });
      }
    }
  }

  return { nodos, enlaces };
}

// ─── CSS var hook ─────────────────────────────────────────────────────────────

function useCSSVar(name: string): string {
  const [val, setVal] = useState("");
  useEffect(() => {
    setVal(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }, [name]);
  return val;
}

// ─── Colores por tag ──────────────────────────────────────────────────────────

function hashColor(tag: string, opacity = 0.7): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return `hsla(${hue}, 55%, 60%, ${opacity})`;
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
  const accent  = useCSSVar("--accent");

  useEffect(() => {
    if (!svgRef.current || !datos.nodos.length || !primary) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = width, H = height;
    const cx = W / 2, cy = H / 2;

    // Posiciones iniciales
    const nodes = datos.nodos.map((n, i) => {
      if (n.esCentro) return { ...n, x: cx, y: cy, fx: cx, fy: cy };
      const angle = (2 * Math.PI * (i - 1)) / Math.max(datos.nodos.length - 1, 1);
      const r = Math.min(W, H) * 0.3;
      return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }) as any[];

    const links = datos.enlaces.map(e => ({ ...e })) as any[];

    // Simulación
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(d => 160 - (d as any).tagsComunes.length * 12)
        .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("collision", d3.forceCollide(55))
      .force("center", d3.forceCenter(cx, cy).strength(0.03));

    // Grupo con zoom
    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.35, 3])
        .on("zoom", ev => g.attr("transform", ev.transform))
    );

    // ── Defs ──────────────────────────────────────────────────────────────────
    const defs = svg.append("defs");

    // Glow filter para el nodo centro
    const filt = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filt.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    filt.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).join("feMergeNode").attr("in", d => d);

    // ── Links ─────────────────────────────────────────────────────────────────
    const linkG = g.append("g");

    // Una línea por tag compartido (desplazadas levemente para visualizar múltiples)
    const linkEl = linkG.selectAll("g.link")
      .data(links)
      .join("g")
      .attr("class", "link");

    // Línea principal (grosor = cantidad de tags comunes)
    const linea = linkEl.append("line")
      .attr("stroke-width", (d: any) => 0.8 + d.tagsComunes.length * 0.6)
      .attr("stroke", (d: any) => hashColor(d.tagsComunes[0], 0.35))
      .attr("stroke-dasharray", (d: any) => d.tagsComunes.length > 1 ? "none" : "5 4");

    // Etiquetas de tags sobre la línea (los primeros 2)
    const labelLinea = linkEl.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("font-size", 7)
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.06em")
      .attr("fill", (d: any) => hashColor(d.tagsComunes[0], 0.6))
      .attr("pointer-events", "none")
      .text((d: any) => d.tagsComunes.slice(0, 2).map((t: string) => `#${t}`).join(" "));

    // ── Nodos ─────────────────────────────────────────────────────────────────
    const nodeG = g.append("g");

    const nodoEl = nodeG.selectAll("g.nodo")
      .data(nodes)
      .join("g")
      .attr("class", "nodo")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end",   (ev, d) => { if (!ev.active) sim.alphaTarget(0); if (!d.esCentro) { d.fx = null; d.fy = null; } })
      )
      .on("click", (_ev, d: any) => { if (!d.esCentro) onClickNodo(d.id); });

    // Sombra
    nodoEl.append("circle")
      .attr("r", (d: any) => d.esCentro ? 32 : 24)
      .attr("fill", primary)
      .attr("opacity", 0.06)
      .attr("transform", "translate(1,2)");

    // Círculo fondo
    nodoEl.append("circle")
      .attr("r", (d: any) => d.esCentro ? 28 : 20)
      .attr("fill", bgMain || "#fff")
      .attr("stroke", (d: any) => d.esCentro ? primary : hashColor(d.tags[0] ?? "x", 0.5))
      .attr("stroke-width", (d: any) => d.esCentro ? 2 : 1.2)
      .attr("filter", (d: any) => d.esCentro ? "url(#glow)" : "none");

    // Ícono de documento
    nodoEl.each(function(d: any) {
      const el = d3.select(this);
      const s = d.esCentro ? 10 : 8;
      // Silueta simple de documento
      el.append("rect")
        .attr("x", -s * 0.65).attr("y", -s * 0.8)
        .attr("width", s * 1.3).attr("height", s * 1.6)
        .attr("rx", 2)
        .attr("fill", primary)
        .attr("opacity", d.esCentro ? 0.25 : 0.12);
      el.append("line")
        .attr("x1", -s * 0.4).attr("y1", -s * 0.25)
        .attr("x2",  s * 0.4).attr("y2", -s * 0.25)
        .attr("stroke", primary).attr("stroke-width", 1).attr("stroke-opacity", d.esCentro ? 0.4 : 0.25);
      el.append("line")
        .attr("x1", -s * 0.4).attr("y1", 0)
        .attr("x2",  s * 0.4).attr("y2", 0)
        .attr("stroke", primary).attr("stroke-width", 1).attr("stroke-opacity", d.esCentro ? 0.4 : 0.25);
      el.append("line")
        .attr("x1", -s * 0.4).attr("y1", s * 0.25)
        .attr("x2",  s * 0.1).attr("y2", s * 0.25)
        .attr("stroke", primary).attr("stroke-width", 1).attr("stroke-opacity", d.esCentro ? 0.4 : 0.25);
    });

    // Tags del nodo como pequeños puntos de color debajo del círculo
    nodoEl.each(function(d: any) {
      const el = d3.select(this);
      const r = d.esCentro ? 28 : 20;
      const tags: string[] = d.tags.slice(0, 4);
      const total = tags.length;
      tags.forEach((tag, i) => {
        const x = (i - (total - 1) / 2) * 6;
        el.append("circle")
          .attr("cx", x).attr("cy", r + 6)
          .attr("r", 2.5)
          .attr("fill", hashColor(tag, 0.7));
      });
    });

    // Nombre del nodo
    nodoEl.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => {
        const r = d.esCentro ? 28 : 20;
        const tagOffset = (d.tags.length > 0 ? 10 : 0);
        return r + tagOffset + 12;
      })
      .attr("font-size", (d: any) => d.esCentro ? 9 : 8)
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.02em")
      .attr("fill", primary)
      .attr("fill-opacity", (d: any) => d.esCentro ? 0.85 : 0.55)
      .attr("font-family", "var(--font-serif, serif)")
      .attr("font-style", "italic")
      .text((d: any) => d.titulo.length > 18 ? d.titulo.slice(0, 17) + "…" : d.titulo);

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
  }, [datos, centroId, width, height, primary, bgMain, accent, onClickNodo]);

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
  const [size, setSize]        = useState({ w: 700, h: 480 });

  const tags: string[] = ensayo.tags ?? [];

  // Reconstruir grafo cuando cambia el ensayo o los ensayos
  useEffect(() => {
    if (!abierto) return;
    setDatos(construirGrafo(ensayos, ensayo.id));
  }, [abierto, ensayo.id, ensayos]);

  // Medir contenedor
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

  // Cuántos ensayos relacionados hay
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
            className="relative w-full max-w-4xl bg-bg-main rounded-2xl shadow-2xl border border-primary/15 flex flex-col overflow-hidden"
            style={{ height: "min(88vh, 640px)" }}
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

            {/* Leyenda de tags */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-primary/[0.04] flex-wrap">
              {tags.map(tag => (
                <div key={tag} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: hashColor(tag, 0.7) }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="font-bold uppercase tracking-widest text-primary/40">
                    #{tag}
                  </span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1 text-primary/20" style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontStyle: "italic" }}>
                Click en un nodo para abrir · Scroll para zoom
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
