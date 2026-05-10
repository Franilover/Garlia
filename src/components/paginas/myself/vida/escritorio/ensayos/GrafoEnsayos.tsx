"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Network, FileText } from "lucide-react";
import * as d3 from "d3";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoNodo = "ensayo" | "tag";

interface NodoGrafo {
  id: string;
  tipo: TipoNodo;
  titulo: string;       // título del ensayo o nombre del tag
  tags: string[];       // solo para ensayos
  profundidad: 0 | 1 | 2; // 0 = centro, 1 = tags, 2 = ensayos relacionados
}

interface EnlaceGrafo {
  source: string;
  target: string;
  tag: string; // el tag que genera la conexión
}

interface DatosGrafo {
  nodos: NodoGrafo[];
  enlaces: EnlaceGrafo[];
  tagsCentro: string[];
}

// ─── Construcción del grafo con tags como nodos intermedios ──────────────────

function construirGrafo(ensayos: any[], centroId: string): DatosGrafo {
  const centro = ensayos.find(e => e.id === centroId);
  if (!centro) return { nodos: [], enlaces: [], tagsCentro: [] };

  const tagsCentro: string[] = centro.tags ?? [];
  const nodosMap = new Map<string, NodoGrafo>();
  const enlaces: EnlaceGrafo[] = [];

  // Nodo centro (profundidad 0)
  nodosMap.set(centroId, {
    id: centroId,
    tipo: "ensayo",
    titulo: centro.titulo || "Sin título",
    tags: tagsCentro,
    profundidad: 0,
  });

  // Nodos de tags (profundidad 1): uno por cada tag del centro
  for (const tag of tagsCentro) {
    const tagId = `tag::${tag}`;
    nodosMap.set(tagId, {
      id: tagId,
      tipo: "tag",
      titulo: tag,
      tags: [],
      profundidad: 1,
    });
    // Enlace centro → tag
    enlaces.push({ source: centroId, target: tagId, tag });
  }

  // Nodos de ensayos relacionados (profundidad 2): comparten al menos un tag con el centro
  for (const e of ensayos) {
    if (e.id === centroId) continue;
    const eTags: string[] = e.tags ?? [];
    const tagsComunes = eTags.filter(t => tagsCentro.includes(t));
    if (tagsComunes.length === 0) continue;

    // Agregar el nodo ensayo si no existe
    if (!nodosMap.has(e.id)) {
      nodosMap.set(e.id, {
        id: e.id,
        tipo: "ensayo",
        titulo: e.titulo || "Sin título",
        tags: eTags,
        profundidad: 2,
      });
    }

    // Enlace tag → ensayo (por cada tag compartido)
    for (const tag of tagsComunes) {
      const tagId = `tag::${tag}`;
      enlaces.push({ source: tagId, target: e.id, tag });
    }
  }

  const nodos = [...nodosMap.values()];
  return { nodos, enlaces, tagsCentro };
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

    // Radios por profundidad
    const R = [0, Math.min(W, H) * 0.22, Math.min(W, H) * 0.43];

    const nivel1 = datos.nodos.filter(n => n.profundidad === 1); // tags
    const nivel2 = datos.nodos.filter(n => n.profundidad === 2); // ensayos relacionados

    const nodes = datos.nodos.map(n => {
      if (n.profundidad === 0) return { ...n, x: cx, y: cy, fx: cx, fy: cy };

      if (n.profundidad === 1) {
        const i = nivel1.findIndex(x => x.id === n.id);
        const total = nivel1.length;
        const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2;
        return { ...n, x: cx + R[1] * Math.cos(angle), y: cy + R[1] * Math.sin(angle) };
      }

      // profundidad 2
      const i = nivel2.findIndex(x => x.id === n.id);
      const total = nivel2.length;
      const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2 + (Math.PI / Math.max(total, 1));
      return { ...n, x: cx + R[2] * Math.cos(angle), y: cy + R[2] * Math.sin(angle) };
    }) as any[];

    const links = datos.enlaces.map(e => ({ ...e })) as any[];

    // Simulación
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => {
          const sp = d.source.profundidad as number;
          const tp = d.target.profundidad as number;
          if (sp === 0 || tp === 0) return R[1];
          return R[2] - R[1];
        })
        .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("collision", d3.forceCollide((d: any) => {
        if (d.profundidad === 0) return 38;
        if (d.profundidad === 1) return 32; // tags un poco más espacio
        return 44;
      }))
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

    // Glow tag (sutil, coloreado)
    const glowTag = defs.append("filter").attr("id", "glow-tag")
      .attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
    glowTag.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    const mergeTag = glowTag.append("feMerge");
    mergeTag.append("feMergeNode").attr("in", "blur");
    mergeTag.append("feMergeNode").attr("in", "SourceGraphic");

    // Anillos guía decorativos
    [1, 2].forEach(lvl => {
      g.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", R[lvl])
        .attr("fill", "none")
        .attr("stroke", primary)
        .attr("stroke-opacity", 0.04)
        .attr("stroke-dasharray", "3 6");
    });

    // ── Links ─────────────────────────────────────────────────────────────────
    const linkG = g.append("g").attr("class", "links");

    const linkEl = linkG.selectAll("g.link")
      .data(links)
      .join("g")
      .attr("class", "link");

    linkEl.append("line")
      .attr("stroke-width", (d: any) => {
        const sp = d.source.profundidad ?? 0;
        const tp = d.target.profundidad ?? 0;
        return (sp === 0 || tp === 0) ? 1.4 : 0.9;
      })
      .attr("stroke", (d: any) => hashColor(d.tag, 0.35))
      .attr("stroke-dasharray", (d: any) => {
        const sp = d.source.profundidad ?? 0;
        const tp = d.target.profundidad ?? 0;
        // Links de nivel 2 punteados
        return (sp === 2 || tp === 2) ? "4 4" : "none";
      });

    // ── Nodos ─────────────────────────────────────────────────────────────────
    const nodeG = g.append("g").attr("class", "nodes");

    const nodoEl = nodeG.selectAll("g.nodo")
      .data(nodes)
      .join("g")
      .attr("class", "nodo")
      .style("cursor", (d: any) => (d.profundidad === 0 || d.tipo === "tag") ? "default" : "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end",   (ev, d) => {
            if (!ev.active) sim.alphaTarget(0);
            if (d.profundidad !== 0) { d.fx = null; d.fy = null; }
          })
      )
      .on("click", (_ev, d: any) => {
        if (d.tipo === "ensayo" && d.profundidad !== 0) onClickNodo(d.id);
      });

    // ── Renderizado por tipo de nodo ──────────────────────────────────────────

    nodoEl.each(function(d: any) {
      const el = d3.select(this);

      if (d.tipo === "tag") {
        // Nodo tag: rombo coloreado
        const s = 14; // mitad del lado del rombo
        const tagCol = hashColor(d.titulo, 0.8);
        const tagColBg = hashColor(d.titulo, 0.12);

        // Sombra
        el.append("polygon")
          .attr("points", `0,${-(s+2)} ${s+2},0 0,${s+2} ${-(s+2)},0`)
          .attr("fill", primary)
          .attr("opacity", 0.06)
          .attr("transform", "translate(1,2)");

        // Fondo rombo
        el.append("polygon")
          .attr("points", `0,${-s} ${s},0 0,${s} ${-s},0`)
          .attr("fill", tagColBg)
          .attr("stroke", tagCol)
          .attr("stroke-width", 1.5)
          .attr("filter", "url(#glow-tag)");

        // Label del tag
        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", 7)
          .attr("font-weight", "800")
          .attr("letter-spacing", "0.08em")
          .attr("fill", tagCol)
          .attr("pointer-events", "none")
          .style("font-family", "var(--font-mono, monospace)")
          .text(`#${d.titulo.length > 8 ? d.titulo.slice(0, 7) + "…" : d.titulo}`);

        // Nombre debajo
        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", s + 10)
          .attr("font-size", 6.5)
          .attr("font-weight", "700")
          .attr("letter-spacing", "0.06em")
          .attr("fill", tagCol)
          .attr("fill-opacity", 0.7)
          .attr("pointer-events", "none")
          .style("font-family", "var(--font-mono, monospace)")
          .text(d.titulo.length > 10 ? d.titulo.slice(0, 9) + "…" : d.titulo);

      } else {
        // Nodo ensayo (centro o relacionado)
        const r = d.profundidad === 0 ? 28 : 20;
        const isCentro = d.profundidad === 0;

        // Sombra
        el.append("circle")
          .attr("r", r + 3)
          .attr("fill", primary)
          .attr("opacity", 0.05)
          .attr("transform", "translate(1,2)");

        // Círculo fondo
        el.append("circle")
          .attr("r", r)
          .attr("fill", bgMain || "#fff")
          .attr("stroke", isCentro ? primary : hashColor(d.tags[0] ?? "x", 0.55))
          .attr("stroke-width", isCentro ? 1.8 : 1.1)
          .attr("filter", isCentro ? "url(#glow-centro)" : "none");

        // Ícono documento
        const s2 = r * 0.5;
        el.append("rect")
          .attr("x", -s2 * 0.65).attr("y", -s2 * 0.8)
          .attr("width", s2 * 1.3).attr("height", s2 * 1.6)
          .attr("rx", 1.5)
          .attr("fill", primary)
          .attr("opacity", isCentro ? 0.22 : 0.1);
        [0.25, 0, -0.25].forEach(oy => {
          el.append("line")
            .attr("x1", -s2 * 0.4).attr("y1", s2 * oy)
            .attr("x2", s2 * 0.4).attr("y2", s2 * oy)
            .attr("stroke", primary)
            .attr("stroke-width", 0.8)
            .attr("stroke-opacity", isCentro ? 0.35 : 0.18);
        });

        // Puntos de tags (solo para el centro, muestra sus tags como dots de color)
        if (isCentro) {
          const tgs = d.tags.slice(0, 6);
          tgs.forEach((tag: string, i: number) => {
            const x = (i - (tgs.length - 1) / 2) * 5.5;
            el.append("circle")
              .attr("cx", x).attr("cy", r + 5)
              .attr("r", 2)
              .attr("fill", hashColor(tag, 0.75));
          });
        }

        // Nombre del ensayo
        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", r + (isCentro && d.tags.length > 0 ? 15 : 11))
          .attr("font-size", isCentro ? 9 : 8)
          .attr("font-weight", isCentro ? "800" : "600")
          .attr("fill", primary)
          .attr("fill-opacity", isCentro ? 0.9 : 0.6)
          .attr("font-family", "var(--font-serif, serif)")
          .attr("font-style", "italic")
          .attr("pointer-events", "none")
          .text(() => {
            const max = isCentro ? 20 : 16;
            return d.titulo.length > max ? d.titulo.slice(0, max - 1) + "…" : d.titulo;
          });
      }
    });

    // ── Tick ──────────────────────────────────────────────────────────────────
    const lineas = linkG.selectAll("line");
    sim.on("tick", () => {
      lineas
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

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

  // Contar ensayos relacionados para el badge
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border border-primary/40 bg-transparent" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">este ensayo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Rombo pequeño para los tags */}
                  <svg width="10" height="10" viewBox="-5 -5 10 10">
                    <polygon points="0,-4 4,0 0,4 -4,0" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary/40" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">tags</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full border border-dashed border-primary/20 bg-transparent" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">relacionados</span>
                </div>
              </div>

              {/* Tags del ensayo central con sus colores */}
              {tags.slice(0, 8).map(tag => (
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
              ) : datos.nodos.filter(n => n.profundidad === 2).length === 0 ? (
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