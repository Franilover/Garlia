"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Node {
  id: string;
  type: "tag" | "nota";
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number;
}

interface Edge {
  source: string;
  target: string;
}

interface TagGraphProps {
  ensayos: any[];
  tagActivo?: string | null;
  onTagClick?: (tag: string) => void;
}

export function TagGraph({ ensayos, tagActivo, onTagClick }: TagGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    
    const tagMap = new Map<string, number>();
    ensayos.forEach(e => {
      e.tags?.forEach((t: string) => {
        tagMap.set(t, (tagMap.get(t) || 0) + 1);
      });
    });

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    
    tagMap.forEach((count, tag) => {
      nodes.push({
        id: `tag:${tag}`,
        type: "tag",
        label: tag,
        x: W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: H / 2 + (Math.random() - 0.5) * H * 0.6,
        vx: 0, vy: 0,
        radius: 8 + count * 3,
        connections: count,
      });
    });

    
    ensayos
      .filter(e => e.tags?.length > 0)
      .forEach(e => {
        nodes.push({
          id: `nota:${e.id}`,
          type: "nota",
          label: e.titulo || "Sin título",
          x: W / 2 + (Math.random() - 0.5) * W * 0.7,
          y: H / 2 + (Math.random() - 0.5) * H * 0.7,
          vx: 0, vy: 0,
          radius: 5,
          connections: e.tags.length,
        });

        e.tags.forEach((tag: string) => {
          edges.push({ source: `nota:${e.id}`, target: `tag:${tag}` });
        });
      });

    nodesRef.current = nodes;
    edgesRef.current = edges;

    
    const simulate = () => {
      const ns = nodesRef.current;
      const REPULSION = 800;
      const ATTRACTION = 0.04;
      const DAMPING = 0.85;
      const CENTER_PULL = 0.002;

      for (let i = 0; i < ns.length; i++) {
        
        ns[i].vx += (W / 2 - ns[i].x) * CENTER_PULL;
        ns[i].vy += (H / 2 - ns[i].y) * CENTER_PULL;

        
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          ns[i].vx += (dx / dist) * force;
          ns[i].vy += (dy / dist) * force;
          ns[j].vx -= (dx / dist) * force;
          ns[j].vy -= (dy / dist) * force;
        }
      }

      
      edgesRef.current.forEach(edge => {
        const src = ns.find(n => n.id === edge.source);
        const tgt = ns.find(n => n.id === edge.target);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        src.vx += dx * ATTRACTION;
        src.vy += dy * ATTRACTION;
        tgt.vx -= dx * ATTRACTION;
        tgt.vy -= dy * ATTRACTION;
      });

      
      ns.forEach(n => {
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x = Math.max(n.radius + 10, Math.min(W - n.radius - 10, n.x + n.vx));
        n.y = Math.max(n.radius + 10, Math.min(H - n.radius - 10, n.y + n.vy));
      });
    };

    const getColor = (type: string, active: boolean, hov: boolean) => {
      const style = getComputedStyle(document.documentElement);
      const accent = style.getPropertyValue("--accent").trim() || "#a78bfa";
      const primary = style.getPropertyValue("--primary").trim() || "#1a1a1a";

      if (type === "tag") {
        if (active) return accent;
        if (hov) return accent + "cc";
        return accent + "66";
      }
      if (hov) return primary + "cc";
      return primary + "44";
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ns = nodesRef.current;
      const hovId = hoveredRef.current;
      const style = getComputedStyle(document.documentElement);
      const accent = style.getPropertyValue("--accent").trim() || "#a78bfa";
      const primary = style.getPropertyValue("--primary").trim() || "#1a1a1a";

      
      edgesRef.current.forEach(edge => {
        const src = ns.find(n => n.id === edge.source);
        const tgt = ns.find(n => n.id === edge.target);
        if (!src || !tgt) return;

        const isHighlighted =
          hovId === src.id || hovId === tgt.id ||
          (tagActivo && (tgt.id === `tag:${tagActivo}` || src.id === `tag:${tagActivo}`));

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = isHighlighted
          ? accent + "88"
          : primary + "18";
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
        ctx.stroke();
      });

      
      ns.forEach(node => {
        const isHov = hovId === node.id;
        const isActive = tagActivo && node.id === `tag:${tagActivo}`;
        const isConnected = hovId
          ? edgesRef.current.some(e => (e.source === hovId && e.target === node.id) || (e.target === hovId && e.source === node.id))
          : false;

        
        if (node.type === "tag" && (isHov || isActive)) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius + 8);
          grd.addColorStop(0, accent + "44");
          grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.type === "tag") {
          ctx.fillStyle = (isActive || isHov) ? accent : (isConnected ? accent + "aa" : accent + "55");
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
        } else {
          ctx.fillStyle = (isHov || isConnected) ? primary + "cc" : primary + "33";
          ctx.strokeStyle = primary + "44";
          ctx.lineWidth = 0.8;
        }

        ctx.fill();
        ctx.stroke();

        
        if (node.type === "tag" || isHov || isConnected) {
          ctx.font = node.type === "tag"
            ? `bold ${Math.max(9, node.radius)}px monospace`
            : "9px monospace";
          ctx.fillStyle = node.type === "tag"
            ? (isActive || isHov ? primary : primary + "99")
            : primary + "88";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const label = node.type === "tag"
            ? `#${node.label.toUpperCase()}`
            : (node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label);

          ctx.fillText(label, node.x, node.y + node.radius + 12);
        }
      });
    };

    let frame = 0;
    const loop = () => {
      if (frame < 200) simulate();
      draw();
      frame++;
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animRef.current);
  }, [ensayos, tagActivo]);

  const getNodeAt = (x: number, y: number): Node | null => {
    for (const node of nodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 6) return node;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    const id = node?.id || null;
    hoveredRef.current = id;
    setHovered(id);
    canvasRef.current!.style.cursor = node ? "pointer" : "default";
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (!node) return;

    if (node.type === "tag") {
      const tag = node.id.replace("tag:", "");
      if (onTagClick) onTagClick(tag);
      else router.push(`/ensayos/tag/${encodeURIComponent(tag)}`);
    } else {
      const id = node.id.replace("nota:", "");
      router.push(`/ensayos?id=${id}`);
    }
  };

  const handleMouseLeave = () => {
    hoveredRef.current = null;
    setHovered(null);
  };

  return (
    <div className="relative w-full" style={{ height: 340 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ borderRadius: "var(--radius-card)" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      {hovered && (
        <div
          className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-widest px-2.5 py-1.5 pointer-events-none"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, var(--white-custom))",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "color-mix(in srgb, var(--primary) 50%, transparent)",
          }}
        >
          {hovered.startsWith("tag:") ? `#${hovered.replace("tag:", "")}` : nodesRef.current.find(n => n.id === hovered)?.label}
        </div>
      )}
    </div>
  );
}

export default TagGraph;