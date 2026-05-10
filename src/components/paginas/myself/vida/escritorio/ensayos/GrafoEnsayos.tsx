"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Network, FileText, ExternalLink, ChevronLeft } from "lucide-react";
import * as d3 from "d3";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoNodo = "ensayo" | "tag" | "tag-ensayo";

interface NodoGrafo {
  id: string;
  tipo: TipoNodo;
  titulo: string;
  tags: string[];
  profundidad: 0 | 1 | 2;
}

interface EnlaceGrafo {
  source: string;
  target: string;
  tag: string;
}

interface DatosGrafo {
  nodos: NodoGrafo[];
  enlaces: EnlaceGrafo[];
  tagsCentro: string[];
}

// Posición del tooltip flotante (en coordenadas SVG → pantalla)
interface TooltipInfo {
  id: string;
  titulo: string;
  x: number; // px pantalla
  y: number;
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

  // Mapa título normalizado → ensayo (para detectar colisiones tag↔ensayo)
  const ensayoPorTitulo = new Map<string, any>();
  for (const e of ensayos) {
    if (e.id === centroId) continue;
    const norm = (e.titulo || "").trim().toLowerCase();
    if (norm) ensayoPorTitulo.set(norm, e);
  }

  // Set de ids de ensayos que ya están fusionados en profundidad 1
  const fusionados = new Set<string>();

  // Nodos de tags (profundidad 1): uno por tag del centro.
  // Si la tag coincide con el título de otro ensayo → nodo "tag-ensayo" fusionado (clickeable)
  for (const tag of tagsCentro) {
    const tagId = `tag::${tag}`;
    const solapado = ensayoPorTitulo.get(tag.trim().toLowerCase());

    if (solapado) {
      fusionados.add(solapado.id);
      nodosMap.set(tagId, {
        id: tagId,
        tipo: "tag-ensayo" as TipoNodo,
        titulo: solapado.titulo || tag,
        tags: solapado.tags ?? [],
        profundidad: 1,
        ensayoId: solapado.id,
      } as any);
    } else {
      nodosMap.set(tagId, {
        id: tagId,
        tipo: "tag",
        titulo: tag,
        tags: [],
        profundidad: 1,
      });
    }
    enlaces.push({ source: centroId, target: tagId, tag });
  }

  // Nodos de ensayos relacionados (profundidad 2)
  for (const e of ensayos) {
    if (e.id === centroId) continue;
    if (fusionados.has(e.id)) continue; // ya representado en anillo 1
    const eTags: string[] = e.tags ?? [];
    const tagsComunes = eTags.filter(t => tagsCentro.includes(t));
    if (tagsComunes.length === 0) continue;

    if (!nodosMap.has(e.id)) {
      nodosMap.set(e.id, {
        id: e.id,
        tipo: "ensayo",
        titulo: e.titulo || "Sin título",
        tags: eTags,
        profundidad: 2,
      });
    }

    for (const tag of tagsComunes) {
      const tagId = `tag::${tag}`;
      const nodoTag = nodosMap.get(tagId) as any;
      // No enlazar desde un nodo fusionado hacia el propio ensayo que representa
      if (nodoTag && nodoTag.tipo === "tag-ensayo" && nodoTag.ensayoId === e.id) continue;
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
  selectedId,
  onSelectNodo,
}: {
  datos: DatosGrafo;
  centroId: string;
  width: number;
  height: number;
  selectedId: string | null;
  onSelectNodo: (info: TooltipInfo | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const primary = useCSSVar("--primary");
  const bgMain  = useCSSVar("--bg-main");

  // Ref para poder leer selectedId dentro del tick sin stale closure
  const selectedRef = useRef<string | null>(selectedId);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    if (!svgRef.current || !datos.nodos.length || !primary) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = width, H = height;
    const cx = W / 2, cy = H / 2;

    const R = [0, Math.min(W, H) * 0.22, Math.min(W, H) * 0.43];

    const nivel1 = datos.nodos.filter(n => n.profundidad === 1);
    const nivel2 = datos.nodos.filter(n => n.profundidad === 2);

    const nodes = datos.nodos.map(n => {
      if (n.profundidad === 0) return { ...n, x: cx, y: cy, fx: cx, fy: cy };
      if (n.profundidad === 1) {
        const i = nivel1.findIndex(x => x.id === n.id);
        const angle = (2 * Math.PI * i) / Math.max(nivel1.length, 1) - Math.PI / 2;
        return { ...n, x: cx + R[1] * Math.cos(angle), y: cy + R[1] * Math.sin(angle) };
      }
      const i = nivel2.findIndex(x => x.id === n.id);
      const angle = (2 * Math.PI * i) / Math.max(nivel2.length, 1) - Math.PI / 2 + (Math.PI / Math.max(nivel2.length, 1));
      return { ...n, x: cx + R[2] * Math.cos(angle), y: cy + R[2] * Math.sin(angle) };
    }) as any[];

    const links = datos.enlaces.map(e => ({ ...e })) as any[];

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
      .force("collision", d3.forceCollide((d: any) => d.profundidad === 0 ? 38 : d.profundidad === 1 ? 32 : 44))
      .force("radial", d3.forceRadial(
        (d: any) => R[d.profundidad as number] ?? R[2], cx, cy
      ).strength(0.55));

    // Zoom
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3.5])
      .on("zoom", ev => g.attr("transform", ev.transform));

    const g = svg.append("g");
    svg.call(zoomBehavior);

    // Click en fondo → deseleccionar
    svg.on("click", (ev) => {
      if (ev.target === svgRef.current) onSelectNodo(null);
    });

    // ── Defs ──────────────────────────────────────────────────────────────────
    const defs = svg.append("defs");

    const glow = defs.append("filter").attr("id", "glow-centro")
      .attr("x", "-60%").attr("y", "-60%").attr("width", "220%").attr("height", "220%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const glowSel = defs.append("filter").attr("id", "glow-selected")
      .attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
    glowSel.append("feGaussianBlur").attr("stdDeviation", "5").attr("result", "blur");
    const mergeSel = glowSel.append("feMerge");
    mergeSel.append("feMergeNode").attr("in", "blur");
    mergeSel.append("feMergeNode").attr("in", "SourceGraphic");

    const glowTag = defs.append("filter").attr("id", "glow-tag")
      .attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
    glowTag.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    const mergeTag = glowTag.append("feMerge");
    mergeTag.append("feMergeNode").attr("in", "blur");
    mergeTag.append("feMergeNode").attr("in", "SourceGraphic");

    // Anillos guía decorativos
    [1, 2].forEach(lvl => {
      g.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", R[lvl])
        .attr("fill", "none").attr("stroke", primary)
        .attr("stroke-opacity", 0.04).attr("stroke-dasharray", "3 6");
    });

    // ── Links ─────────────────────────────────────────────────────────────────
    const linkG = g.append("g").attr("class", "links");
    const linkEl = linkG.selectAll("g.link").data(links).join("g").attr("class", "link");

    const lineas = linkEl.append("line")
      .attr("stroke-width", (d: any) => (d.source.profundidad === 0 || d.target.profundidad === 0) ? 1.4 : 0.9)
      .attr("stroke", (d: any) => hashColor(d.tag, 0.35))
      .attr("stroke-dasharray", (d: any) => (d.source.profundidad === 2 || d.target.profundidad === 2) ? "4 4" : "none");

    // ── Nodos ─────────────────────────────────────────────────────────────────
    const nodeG = g.append("g").attr("class", "nodes");

    const nodoEl = nodeG.selectAll("g.nodo")
      .data(nodes)
      .join("g")
      .attr("class", "nodo")
      .style("cursor", (d: any) => (d.profundidad === 0 || (d.tipo === "tag" && d.tipo !== "tag-ensayo")) ? "default" : "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end",   (ev, d) => {
            if (!ev.active) sim.alphaTarget(0);
            if (d.profundidad !== 0) { d.fx = null; d.fy = null; }
          })
      )
      .on("click", (ev, d: any) => {
        ev.stopPropagation();
        // Ignorar: nodo centro o tag puro (sin ensayo asociado)
        if (d.profundidad === 0) return;
        if (d.tipo === "tag") return;

        // Para tag-ensayo usamos el ensayoId real; para ensayo normal usamos d.id
        const idParaAbrir = d.tipo === "tag-ensayo" ? d.ensayoId : d.id;

        const svgEl = svgRef.current!;
        const rect = svgEl.getBoundingClientRect();
        const transform = d3.zoomTransform(svgEl);
        const [sx, sy] = transform.apply([d.x, d.y]);

        onSelectNodo({
          id: idParaAbrir,
          titulo: d.titulo,
          x: rect.left + sx,
          y: rect.top + sy,
        });
      });

    // ── Renderizado por tipo de nodo ──────────────────────────────────────────
    nodoEl.each(function(d: any) {
      const el = d3.select(this);

      if (d.tipo === "tag" || d.tipo === "tag-ensayo") {
        const s = 14;
        const tagCol = hashColor(d.titulo, 0.8);
        const tagColBg = hashColor(d.titulo, 0.12);
        const esFusion = d.tipo === "tag-ensayo";

        el.append("polygon")
          .attr("points", `0,${-(s+2)} ${s+2},0 0,${s+2} ${-(s+2)},0`)
          .attr("fill", primary).attr("opacity", 0.06).attr("transform", "translate(1,2)");

        el.append("polygon")
          .attr("class", "tag-shape")
          .attr("points", `0,${-s} ${s},0 0,${s} ${-s},0`)
          .attr("fill", esFusion ? hashColor(d.titulo, 0.22) : tagColBg)
          .attr("stroke", tagCol)
          .attr("stroke-width", esFusion ? 2 : 1.5)
          .attr("stroke-dasharray", esFusion ? "none" : "none")
          .attr("filter", "url(#glow-tag)");

        // Icono de documento pequeño dentro del diamante si es fusion
        if (esFusion) {
          const fs = 5;
          el.append("rect")
            .attr("x", -fs * 0.65).attr("y", -fs * 0.85)
            .attr("width", fs * 1.3).attr("height", fs * 1.7)
            .attr("rx", 1).attr("fill", tagCol)
            .attr("opacity", 0.55).attr("pointer-events", "none");
          [0.2, -0.15].forEach(oy => {
            el.append("line")
              .attr("x1", -fs * 0.35).attr("y1", fs * oy)
              .attr("x2", fs * 0.35).attr("y2", fs * oy)
              .attr("stroke", tagColBg).attr("stroke-width", 0.8)
              .attr("pointer-events", "none");
          });
        }

        el.append("text")
          .attr("text-anchor", "middle").attr("dy", "0.35em")
          .attr("font-size", esFusion ? 0 : 7) // ocultar texto interno si hay icono
          .attr("font-weight", "800").attr("letter-spacing", "0.08em")
          .attr("fill", tagCol).attr("pointer-events", "none")
          .style("font-family", "var(--font-mono, monospace)")
          .text(esFusion ? "" : `#${d.titulo.length > 8 ? d.titulo.slice(0, 7) + "…" : d.titulo}`);

        el.append("text")
          .attr("text-anchor", "middle").attr("dy", s + 10)
          .attr("font-size", esFusion ? 7.5 : 6.5)
          .attr("font-weight", esFusion ? "700" : "700")
          .attr("letter-spacing", "0.06em")
          .attr("fill", tagCol).attr("fill-opacity", esFusion ? 0.95 : 0.7)
          .attr("pointer-events", "none")
          .style("font-family", esFusion ? "var(--font-serif, serif)" : "var(--font-mono, monospace)")
          .style("font-style", esFusion ? "italic" : "normal")
          .text(d.titulo.length > 13 ? d.titulo.slice(0, 12) + "…" : d.titulo);

      } else {
        const r = d.profundidad === 0 ? 28 : 20;
        const isCentro = d.profundidad === 0;

        el.append("circle")
          .attr("r", r + 3).attr("fill", primary).attr("opacity", 0.05).attr("transform", "translate(1,2)");

        el.append("circle")
          .attr("class", "ensayo-circle")
          .attr("r", r)
          .attr("fill", bgMain || "#fff")
          .attr("stroke", isCentro ? primary : hashColor(d.tags[0] ?? "x", 0.55))
          .attr("stroke-width", isCentro ? 1.8 : 1.1)
          .attr("filter", isCentro ? "url(#glow-centro)" : "none");

        const s2 = r * 0.5;
        el.append("rect")
          .attr("x", -s2 * 0.65).attr("y", -s2 * 0.8)
          .attr("width", s2 * 1.3).attr("height", s2 * 1.6)
          .attr("rx", 1.5).attr("fill", primary)
          .attr("opacity", isCentro ? 0.22 : 0.1).attr("pointer-events", "none");

        [0.25, 0, -0.25].forEach(oy => {
          el.append("line")
            .attr("x1", -s2 * 0.4).attr("y1", s2 * oy)
            .attr("x2", s2 * 0.4).attr("y2", s2 * oy)
            .attr("stroke", primary).attr("stroke-width", 0.8)
            .attr("stroke-opacity", isCentro ? 0.35 : 0.18)
            .attr("pointer-events", "none");
        });

        if (isCentro) {
          const tgs = d.tags.slice(0, 6);
          tgs.forEach((tag: string, i: number) => {
            const x = (i - (tgs.length - 1) / 2) * 5.5;
            el.append("circle").attr("cx", x).attr("cy", r + 5)
              .attr("r", 2).attr("fill", hashColor(tag, 0.75)).attr("pointer-events", "none");
          });
        }

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

    // Función para actualizar estilos visuales según selección
    const updateSelection = (selId: string | null) => {
      nodoEl.each(function(d: any) {
        if (d.profundidad === 0) return;
        const el = d3.select(this);

        if (d.tipo === "ensayo") {
          const isSelected = d.id === selId;
          el.select(".ensayo-circle")
            .attr("stroke-width", isSelected ? 2.2 : 1.1)
            .attr("stroke", isSelected ? primary : hashColor(d.tags[0] ?? "x", 0.55))
            .attr("filter", isSelected ? "url(#glow-selected)" : "none")
            .attr("stroke-opacity", isSelected ? 1 : 0.8);
        }

        if (d.tipo === "tag-ensayo") {
          const isSelected = d.ensayoId === selId;
          el.select(".tag-shape")
            .attr("stroke-width", isSelected ? 2.8 : 2)
            .attr("filter", isSelected ? "url(#glow-selected)" : "url(#glow-tag)");
        }
      });

      // Resaltar/atenuar links según selección
      lineas
        .attr("stroke-opacity", (d: any) => {
          if (!selId) return 1;
          const srcId = typeof d.source === "object" ? d.source.id : d.source;
          const tgtId = typeof d.target === "object" ? d.target.id : d.target;
          const srcEnsayoId = typeof d.source === "object" ? (d.source as any).ensayoId : undefined;
          const tgtEnsayoId = typeof d.target === "object" ? (d.target as any).ensayoId : undefined;
          return (srcId === selId || tgtId === selId || srcEnsayoId === selId || tgtEnsayoId === selId) ? 1 : 0.15;
        });
    };

    // ── Tick ──────────────────────────────────────────────────────────────────
    sim.on("tick", () => {
      lineas
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);

      nodoEl.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      // Actualizar tooltip position si hay uno seleccionado
      if (selectedRef.current) {
        const sel = nodes.find((n: any) =>
          n.id === selectedRef.current ||
          (n.tipo === "tag-ensayo" && n.ensayoId === selectedRef.current)
        );
        if (sel) {
          const svgEl = svgRef.current;
          if (svgEl) {
            const rect = svgEl.getBoundingClientRect();
            const transform = d3.zoomTransform(svgEl);
            const [sx, sy] = transform.apply([sel.x, sel.y]);
            onSelectNodo({
              id: (sel as any).tipo === "tag-ensayo" ? (sel as any).ensayoId : sel.id,
              titulo: sel.titulo,
              x: rect.left + sx,
              y: rect.top + sy,
            });
          }
        }
      }
    });

    // Aplicar selección inicial si hay una
    sim.on("end", () => updateSelection(selectedRef.current));

    // Al hacer zoom: actualizar selección visual Y reposicionar tooltip
    const reposicionarTooltip = () => {
      if (!selectedRef.current) return;
      const sel = nodes.find((n: any) =>
        n.id === selectedRef.current ||
        (n.tipo === "tag-ensayo" && n.ensayoId === selectedRef.current)
      );
      if (sel && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const transform = d3.zoomTransform(svgRef.current);
        const [sx, sy] = transform.apply([sel.x, sel.y]);
        onSelectNodo({
          id: (sel as any).tipo === "tag-ensayo" ? (sel as any).ensayoId : sel.id,
          titulo: sel.titulo,
          x: rect.left + sx,
          y: rect.top + sy,
        });
      }
    };
    zoomBehavior.on("zoom.sel", () => { updateSelection(selectedRef.current); reposicionarTooltip(); });

    return () => { sim.stop(); };
  }, [datos, centroId, width, height, primary, bgMain]);

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
  const [abierto, setAbierto]       = useState(false);
  const [datos, setDatos]           = useState<DatosGrafo | null>(null);
  const contenedorRef               = useRef<HTMLDivElement>(null);
  const [size, setSize]             = useState({ w: 700, h: 500 });

  // Historial de focos: pila de ids (el último es el centro actual)
  const [historial, setHistorial]   = useState<string[]>([]);
  const centroActual                = historial[historial.length - 1] ?? ensayo.id;

  // Nodo seleccionado (hover/click) con su posición en pantalla
  const [tooltip, setTooltip]       = useState<TooltipInfo | null>(null);

  const tags: string[] = ensayo.tags ?? [];

  // Reconstruir grafo cuando cambia el centro
  useEffect(() => {
    if (!abierto) return;
    setTooltip(null);
    setDatos(construirGrafo(ensayos, centroActual));
  }, [abierto, centroActual, ensayos]);

  // Al abrir, resetear historial al ensayo original
  useEffect(() => {
    if (abierto) setHistorial([ensayo.id]);
  }, [abierto, ensayo.id]);

  useEffect(() => {
    if (!abierto || !contenedorRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    obs.observe(contenedorRef.current);
    return () => obs.disconnect();
  }, [abierto]);

  // Ref para leer el tooltip sin stale closure dentro de botones
  const tooltipRef = useRef<TooltipInfo | null>(null);

  // Click en nodo → mostrar tooltip (no cambia el centro)
  const handleSelectNodo = useCallback((info: TooltipInfo | null) => {
    tooltipRef.current = info;
    setTooltip(info);
  }, []);

  // Botón "abrir" → lee desde ref para evitar stale closure
  const handleOpenNodo = useCallback(() => {
    const id = tooltipRef.current?.id;
    if (!id) return;
    onSelectEnsayo(id);
    setAbierto(false);
  }, [onSelectEnsayo]);

  // Botón "red" → re-centra el grafo; NO limpia el tooltip
  const handleEnfocarNodo = useCallback(() => {
    const id = tooltipRef.current?.id;
    if (!id) return;
    setHistorial(prev => [...prev, id]);
  }, []);

  // Botón atrás
  const handleAtras = useCallback(() => {
    setTooltip(null);
    setHistorial(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  const nRelacionados = ensayos.filter(e =>
    e.id !== ensayo.id &&
    (e.tags ?? []).some((t: string) => tags.includes(t))
  ).length;

  const ensayoCentro = ensayos.find(e => e.id === centroActual) ?? ensayo;
  const tagsCentro: string[] = ensayoCentro.tags ?? [];

  if (tags.length === 0) return null;

  return (
    <>
      {/* ── Botón trigger ── */}
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
                {/* Botón atrás si hay historial */}
                {historial.length > 1 && (
                  <button
                    onClick={handleAtras}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-primary/40 hover:text-primary/70 hover:bg-primary/8 transition-all"
                    title="Volver al ensayo anterior"
                  >
                    <ChevronLeft size={11} />
                  </button>
                )}
                <Network size={11} className="text-primary/40" />
                <span style={{ fontFamily: "var(--font-mono)" }} className="text-[9px] font-black uppercase tracking-widest text-primary/50">
                  red de ensayos
                </span>
                <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }} className="text-[11px] text-primary/30">
                  — {ensayoCentro.titulo || "Sin título"}
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
                  <svg width="10" height="10" viewBox="-5 -5 10 10">
                    <polygon points="0,-4 4,0 0,4 -4,0" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary/40" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">tags</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="-5 -5 10 10">
                    <polygon points="0,-4 4,0 0,4 -4,0" fill="rgba(100,150,255,0.25)" stroke="rgba(100,150,255,0.8)" strokeWidth="1.5" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">tag = ensayo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full border border-dashed border-primary/20 bg-transparent" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8 }} className="uppercase tracking-widest text-primary/35">relacionados</span>
                </div>
              </div>

              {tagsCentro.slice(0, 8).map(tag => (
                <div key={tag} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: hashColor(tag, 0.75) }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 7 }} className="uppercase tracking-widest text-primary/30">
                    #{tag}
                  </span>
                </div>
              ))}

              <div className="ml-auto" style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>
                click para enfocar · scroll zoom · arrastrá nodos
              </div>
            </div>

            {/* Grafo */}
            <div ref={contenedorRef} className="flex-1 min-h-0 overflow-hidden relative">
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
                <>
                  <GrafoD3
                    datos={datos}
                    centroId={centroActual}
                    width={size.w}
                    height={size.h}
                    selectedId={tooltip?.id ?? null}
                    onSelectNodo={handleSelectNodo}
                  />

                  {/* ── Tooltip flotante con botones "abrir" y "enfocar" ── */}
                  {tooltip && (
                    <div
                      className="fixed z-[100] pointer-events-none"
                      style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: "translate(-50%, calc(-100% - 32px))",
                      }}
                    >
                      <div
                        className="pointer-events-auto flex flex-col items-center gap-1"
                        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.18))" }}
                      >
                        {/* Tarjeta */}
                        <div
                          className="bg-bg-main border border-primary/20 rounded-xl px-3 py-2 flex flex-col items-center gap-1.5 min-w-[120px] max-w-[200px]"
                        >
                          <span
                            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
                            className="text-[10px] text-primary/75 font-semibold text-center leading-snug"
                          >
                            {tooltip.titulo}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleOpenNodo}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary/60 hover:bg-primary/20 hover:text-primary/90 border border-primary/15 transition-all"
                              style={{ fontFamily: "var(--font-mono)" }}
                              title="Abrir esta nota"
                            >
                              <ExternalLink size={8} />
                              abrir
                            </button>
                            <button
                              onClick={handleEnfocarNodo}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-transparent text-primary/40 hover:bg-primary/8 hover:text-primary/70 border border-primary/10 transition-all"
                              style={{ fontFamily: "var(--font-mono)" }}
                              title="Ver sus conexiones en el grafo"
                            >
                              <Network size={8} />
                              red
                            </button>
                          </div>
                        </div>
                        {/* Flecha apuntando al nodo */}
                        <svg width="12" height="7" viewBox="0 0 12 7" className="text-primary/20" style={{ marginTop: -1 }}>
                          <polygon points="0,0 12,0 6,7" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GrafoEnsayos;