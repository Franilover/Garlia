"use client";

/**
 * TileCanvas
 * ──────────
 * Reemplaza CanvasMap en la vista "global" del mapa.
 * Recibe un array de tiles (cada uno con col, row, image_url) y los
 * compone sobre un canvas virtual de (maxCol+1)*TILE_SIZE × (maxRow+1)*TILE_SIZE.
 * Pan, zoom, markers, fog-of-war y eyedropper funcionan igual que antes.
 *
 * Props idénticas a CanvasMap excepto:
 *   imageSrc → tiles: MapTile[]
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type MapTile = {
  id: string;
  col: number;
  row: number;
  image_url: string | null;
  label?: string | null;
};

interface TileCanvasProps {
  tiles: MapTile[];
  tileSize?: number; // px por tile (default 1024)
  markers: any[];
  hiddenMarkers: any[];
  editMode: boolean;
  onMarkerClick: (marker: any) => void;
  onMapClick: (x: number, y: number) => void;
  selectedMarkerId?: string | null;
  isFirstOpen?: boolean;
  fondoColor?: string | null;
  eyedropperActive?: boolean;
  onEyedropperPick?: (color: string) => void;
  onOpenPanel?: () => void;
}

export function TileCanvas({
  tiles,
  tileSize = 1024,
  markers,
  hiddenMarkers,
  editMode,
  onMarkerClick,
  onMapClick,
  selectedMarkerId,
  isFirstOpen,
  fondoColor,
  eyedropperActive,
  onEyedropperPick,
  onOpenPanel,
}: TileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Imagen compuesta de todos los tiles (OffscreenCanvas)
  const compositeRef = useRef<OffscreenCanvas | null>(null);
  const compositeReadyRef = useRef(false);
  const [compositeReady, setCompositeReady] = useState(false);

  const camRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const pulseRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const hasShownCompassRef = useRef(false);
  const compassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCompass, setShowCompass] = useState(true);
  const [mapFading, setMapFading] = useState(false);
  const compassStartRef = useRef<number | null>(null);

  const fogCacheRef = useRef<{
    canvas: OffscreenCanvas;
    deep: OffscreenCanvas;
    iw: number;
    ih: number;
    bg: string;
  } | null>(null);

  const cssColorsRef = useRef({
    primary: "#6b4423",
    accent: "#c08040",
    bg: "#f0e6d0",
    fg: "#2a1304",
    bgMenu: "#3d2010",
    parchBg: "#3d2010",
    parchText: "#2a1304",
    whiteCustom: "#fdf6ee",
    isDark: false,
    labelBg: "#fdf6ee",
    labelText: "#2a1304",
  });

  // ── Calcular dimensiones totales del canvas virtual ──────────────────────
  // Usar rango real (max - min) para no generar espacio vacío si la grilla no empieza en 0
  const minCol = tiles.length > 0 ? Math.min(...tiles.map((t) => t.col)) : 0;
  const minRow = tiles.length > 0 ? Math.min(...tiles.map((t) => t.row)) : 0;
  const totalCols =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.col)) - minCol + 1 : 1;
  const totalRows =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.row)) - minRow + 1 : 1;
  const totalW = totalCols * tileSize;
  const totalH = totalRows * tileSize;

  // ── Leer CSS vars para theming ────────────────────────────────────────────
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (v: string) => s.getPropertyValue(v).trim();
      const bgMain = get("--bg-main") || "#f0e6d0";
      const wc = get("--white-custom") || "#fdf6ee";
      const fgColor = get("--foreground") || "#2a1304";
      const bgMenuColor = get("--bg-menu") || "#3d2010";
      const hexToLuma = (hex: string) => {
        const h = hex.replace("#", "");
        if (h.length < 6) return 0.5;
        const r = parseInt(h.slice(0, 2), 16) / 255;
        const g = parseInt(h.slice(2, 4), 16) / 255;
        const b = parseInt(h.slice(4, 6), 16) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const dark = hexToLuma(bgMain) < 0.35;
      cssColorsRef.current = {
        primary: get("--primary") || "#6b4423",
        accent: get("--accent") || "#c08040",
        bg: bgMain,
        fg: fgColor,
        bgMenu: bgMenuColor,
        parchBg: bgMenuColor,
        parchText: fgColor,
        whiteCustom: wc,
        isDark: dark,
        labelBg: dark ? bgMenuColor : wc,
        labelText: fgColor,
      };
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => obs.disconnect();
  }, []);

  // ── Componer todos los tiles en un OffscreenCanvas ────────────────────────
  useEffect(() => {
    compositeReadyRef.current = false;
    setCompositeReady(false);
    fogCacheRef.current = null;

    const tilesWithImage = tiles.filter((t) => t.image_url);
    if (tilesWithImage.length === 0) {
      // Sin imágenes: crear canvas vacío para que el fondo funcione
      const oc = new OffscreenCanvas(tileSize, tileSize);
      compositeRef.current = oc;
      compositeReadyRef.current = true;
      setCompositeReady(true);
      return;
    }

    // Normalizar: el tile con menor col/row arranca en 0,0
    // Esto permite empezar desde col=1 sin dejar espacio vacío a la izquierda
    const minCol = Math.min(...tilesWithImage.map((t) => t.col));
    const minRow = Math.min(...tilesWithImage.map((t) => t.row));

    const oc = new OffscreenCanvas(totalW, totalH);
    const octx = oc.getContext("2d")!;
    let loaded = 0;

    tilesWithImage.forEach((tile) => {
      const img = new window.Image();
      // crossOrigin solo para URLs externas — las rutas relativas (/dibujos/...) no lo necesitan
      if (tile.image_url!.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }
      img.src = tile.image_url!;
      const drawX = (tile.col - minCol) * tileSize;
      const drawY = (tile.row - minRow) * tileSize;
      img.onload = () => {
        octx.drawImage(img, drawX, drawY, tileSize, tileSize);
        loaded++;
        if (loaded === tilesWithImage.length) {
          compositeRef.current = oc;
          compositeReadyRef.current = true;
          setCompositeReady(true);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === tilesWithImage.length) {
          compositeRef.current = oc;
          compositeReadyRef.current = true;
          setCompositeReady(true);
        }
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tiles.map((t) => `${t.col}:${t.row}:${t.image_url}`).join("|"),
    tileSize,
    totalW,
    totalH,
  ]);

  // ── Centrar imagen al cargar ──────────────────────────────────────────────
  const centerImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !compositeRef.current) return;
    const iw = totalW;
    const ih = totalH;
    const scale = Math.min(canvas.width / iw, canvas.height / ih) * 0.95;
    camRef.current = {
      x: (canvas.width - iw * scale) / 2,
      y: (canvas.height - ih * scale) / 2,
      scale,
    };
  }, [totalW, totalH]);

  useEffect(() => {
    if (!compositeReady) return;
    if (compassTimerRef.current) clearTimeout(compassTimerRef.current);
    const shouldShowCompass = isFirstOpen && !hasShownCompassRef.current;
    if (shouldShowCompass) {
      hasShownCompassRef.current = true;
      setShowCompass(true);
      setMapFading(false);
    } else {
      setShowCompass(false);
      if (hasShownCompassRef.current) {
        setMapFading(true);
        setTimeout(() => setMapFading(false), 600);
      }
    }
    compassStartRef.current = null;
    centerImage();
    if (shouldShowCompass) {
      compassTimerRef.current = setTimeout(() => setShowCompass(false), 5000);
    }
    return () => {
      if (compassTimerRef.current) clearTimeout(compassTimerRef.current);
    };
  }, [compositeReady, centerImage, isFirstOpen]);

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const resize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const finalW = container.clientWidth;
        const finalH = container.clientHeight;
        if (canvas.width === finalW && canvas.height === finalH) return;
        canvas.width = finalW;
        canvas.height = finalH;
        centerImage();
      }, 150);
    };
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    centerImage();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [centerImage]);

  // ── Render loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(
      navigator.userAgent,
    );
    const FRAME_MS = isMobileDevice ? 34 : 16;
    let lastFrameTime = 0;

    const draw = (t: number) => {
      if (t - lastFrameTime < FRAME_MS) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = t;
      pulseRef.current = t;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { primary, accent, bg, fg, labelBg, labelText, isDark, bgMenu } =
        cssColorsRef.current;

      ctx.fillStyle = fondoColor || bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { x: cx, y: cy, scale } = camRef.current;
      const composite = compositeRef.current;

      if (composite && compositeReadyRef.current && !showCompass) {
        const iw = totalW * scale;
        const ih = totalH * scale;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Dibujar imagen compuesta ──────────────────────────────────────
        ctx.drawImage(composite, 0, 0, iw, ih);

        // ── Dibujar bordes de tiles (sutil) ──────────────────────────────
        ctx.strokeStyle = `rgba(${isDark ? "255,255,255" : "0,0,0"},0.06)`;
        ctx.lineWidth = 1 / scale;
        for (let c = 0; c <= totalCols; c++) {
          ctx.beginPath();
          ctx.moveTo(c * tileSize * scale, 0);
          ctx.lineTo(c * tileSize * scale, ih);
          ctx.stroke();
        }
        for (let r = 0; r <= totalRows; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * tileSize * scale);
          ctx.lineTo(iw, r * tileSize * scale);
          ctx.stroke();
        }

        // ── FOG OF WAR ────────────────────────────────────────────────────
        if (!editMode && hiddenMarkers.length > 0) {
          const cache = fogCacheRef.current;
          const FOG_W = Math.min(totalW, 1200);
          const FOG_H = Math.round(FOG_W * (totalH / totalW));
          const fogBg = fondoColor || bg;
          const needsRebuild =
            !cache ||
            cache.iw !== FOG_W ||
            cache.ih !== FOG_H ||
            cache.bg !== fogBg;
          if (needsRebuild) {
            const maxDim = Math.max(FOG_W, FOG_H);
            const clearRadius = maxDim * 0.05;
            const fadeRadius = maxDim * 0.12;
            const fogCanvas = new OffscreenCanvas(FOG_W, FOG_H);
            const fogCtx = fogCanvas.getContext("2d")!;
            fogCtx.fillStyle = fogBg;
            fogCtx.globalAlpha = 0.92;
            fogCtx.fillRect(0, 0, FOG_W, FOG_H);
            fogCtx.globalAlpha = 1;
            fogCtx.globalCompositeOperation = "destination-out";
            for (const m of markers) {
              const mx = (m.coord_x / 100) * FOG_W;
              const my = (m.coord_y / 100) * FOG_H;
              const grad = fogCtx.createRadialGradient(
                mx,
                my,
                clearRadius * 0.2,
                mx,
                my,
                fadeRadius,
              );
              grad.addColorStop(0, "rgba(0,0,0,1)");
              grad.addColorStop(0.45, "rgba(0,0,0,0.98)");
              grad.addColorStop(0.72, "rgba(0,0,0,0.7)");
              grad.addColorStop(0.88, "rgba(0,0,0,0.25)");
              grad.addColorStop(1, "rgba(0,0,0,0)");
              fogCtx.fillStyle = grad;
              fogCtx.beginPath();
              fogCtx.arc(mx, my, fadeRadius, 0, Math.PI * 2);
              fogCtx.fill();
            }
            fogCtx.globalCompositeOperation = "source-over";
            const deepCanvas = new OffscreenCanvas(FOG_W, FOG_H);
            const deepCtx = deepCanvas.getContext("2d")!;
            deepCtx.fillStyle = fogBg;
            deepCtx.globalAlpha = 0.55;
            deepCtx.fillRect(0, 0, FOG_W, FOG_H);
            fogCacheRef.current = {
              canvas: fogCanvas,
              deep: deepCanvas,
              iw: FOG_W,
              ih: FOG_H,
              bg: fogBg,
            };
          }
          const fc = fogCacheRef.current!;
          ctx.drawImage(fc.deep, 0, 0, iw, ih);
          ctx.drawImage(fc.canvas, 0, 0, iw, ih);
        }

        // ── Markers ───────────────────────────────────────────────────────
        const pulse = (Math.sin(t / 600) + 1) / 2;
        const allMarkers = editMode ? [...markers, ...hiddenMarkers] : markers;

        for (const m of allMarkers) {
          const mx = (m.coord_x / 100) * iw;
          const my = (m.coord_y / 100) * ih;
          const isSelected = m.id === selectedMarkerId;
          const isHidden = hiddenMarkers.some((h) => h.id === m.id);
          const markerColor = isHidden ? `rgba(120,120,120,0.5)` : accent;

          if (isSelected) {
            const r = 14 + pulse * 4;
            const grd = ctx.createRadialGradient(mx, my, 0, mx, my, r);
            grd.addColorStop(0, `${accent}55`);
            grd.addColorStop(1, `${accent}00`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(mx, my, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Dot
          ctx.beginPath();
          ctx.arc(mx, my, isSelected ? 6 : 5, 0, Math.PI * 2);
          ctx.fillStyle = markerColor;
          ctx.fill();
          ctx.strokeStyle = isDark
            ? `rgba(0,0,0,0.6)`
            : `rgba(255,255,255,0.8)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Label
          if (scale > 0.4 && !isHidden) {
            const label = m.nombre || m.name || "";
            if (label) {
              const fontSize = Math.max(9, Math.min(13, 11 / scale));
              ctx.font = `700 ${fontSize}px 'Cinzel', serif`;
              const tw = ctx.measureText(label).width;
              const pad = 5;
              const lx = mx - tw / 2 - pad;
              const ly = my + 10;
              ctx.fillStyle = `${labelBg}dd`;
              ctx.fillRect(lx, ly, tw + pad * 2, fontSize + 6);
              ctx.fillStyle = labelText;
              ctx.fillText(label, mx - tw / 2, ly + fontSize + 1);
            }
          }
        }
        ctx.restore();
      }

      // ── Compass ───────────────────────────────────────────────────────────
      if (showCompass) {
        if (!compassStartRef.current) compassStartRef.current = t;
        const elapsed = t - compassStartRef.current;
        const alpha = Math.min(1, elapsed / 400);
        const angle = (elapsed / 3000) * Math.PI * 2;
        const cx2 = canvas.width / 2;
        const cy2 = canvas.height / 2;
        const r = 48;
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.translate(cx2, cy2);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const x1 = Math.cos(a) * (r - 8);
          const y1 = Math.sin(a) * (r - 8);
          const x2 = Math.cos(a) * r;
          const y2 = Math.sin(a) * r;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(0, -r + 8);
        ctx.lineTo(4, -r + 18);
        ctx.lineTo(-4, -r + 18);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ── Fade overlay ──────────────────────────────────────────────────────
      if (mapFading) {
        ctx.fillStyle = fondoColor || bg;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compositeReady,
    showCompass,
    mapFading,
    editMode,
    fondoColor,
    selectedMarkerId,
    markers,
    hiddenMarkers,
    totalW,
    totalH,
    tileSize,
    totalCols,
    totalRows,
  ]);

  // ── Helpers de coordenadas ────────────────────────────────────────────────
  const canvasToMapPct = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x: cx, y: cy, scale } = camRef.current;
    const mx = (px - cx) / (totalW * scale);
    const my = (py - cy) / (totalH * scale);
    return { x: Math.round(mx * 100), y: Math.round(my * 100) };
  };

  const findMarkerAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x: cx, y: cy, scale } = camRef.current;
    const iw = totalW * scale;
    const ih = totalH * scale;
    const allMarkers = editMode ? [...markers, ...hiddenMarkers] : markers;
    for (const m of [...allMarkers].reverse()) {
      const mx = (m.coord_x / 100) * iw + cx;
      const my = (m.coord_y / 100) * ih + cy;
      if (Math.hypot(px - mx, py - my) < 12) return m;
    }
    return null;
  };

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoomAt = (clientX: number, clientY: number, delta: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ox = clientX - rect.left;
    const oy = clientY - rect.top;
    const cam = camRef.current;
    const newScale = Math.max(
      0.15,
      Math.min(8, cam.scale * (1 - delta * 0.001)),
    );
    const ratio = newScale / cam.scale;
    camRef.current = {
      scale: newScale,
      x: ox - (ox - cam.x) * ratio,
      y: oy - (oy - cam.y) * ratio,
    };
  };

  // ── Event handlers ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      isDragging.current = false;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        camX: camRef.current.x,
        camY: camRef.current.y,
      };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.hypot(dx, dy) > 4) isDragging.current = true;
      if (isDragging.current) {
        camRef.current = {
          ...camRef.current,
          x: dragStart.current.camX + dx,
          y: dragStart.current.camY + dy,
        };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) {
        if (eyedropperActive) {
          const canvas2 = canvasRef.current;
          if (!canvas2) return;
          const ctx2 = canvas2.getContext("2d");
          if (!ctx2) return;
          const rect = canvas2.getBoundingClientRect();
          const px = Math.round(e.clientX - rect.left);
          const py = Math.round(e.clientY - rect.top);
          const [r, g, b] = ctx2.getImageData(px, py, 1, 1).data;
          const hex =
            "#" +
            [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
          onEyedropperPick?.(hex);
          return;
        }
        const marker = findMarkerAt(e.clientX, e.clientY);
        if (marker) {
          onMarkerClick(marker);
        } else {
          const pct = canvasToMapPct(e.clientX, e.clientY);
          if (pct) onMapClick(pct.x, pct.y);
        }
      }
      isDragging.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastPinchDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const delta = (lastPinchDist.current - dist) * 3;
        zoomAt(midX, midY, delta);
        lastPinchDist.current = dist;
      }
    };

    const onTouchEnd = () => {
      lastPinchDist.current = null;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eyedropperActive, editMode, markers, hiddenMarkers, totalW, totalH]);

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  const zoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    zoomAt(canvas.width / 2, canvas.height / 2, -300);
  };
  const zoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    zoomAt(canvas.width / 2, canvas.height / 2, 300);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        cursor: eyedropperActive
          ? "crosshair"
          : isDragging.current
            ? "grabbing"
            : "grab",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 touch-none" />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        {[
          { label: "+", fn: zoomIn },
          { label: "−", fn: zoomOut },
        ].map(({ label, fn }) => (
          <button
            key={label}
            className="w-8 h-8 flex items-center justify-center border text-sm font-black transition-all"
            style={{
              background: "color-mix(in srgb, var(--primary) 80%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
              color: "var(--btn-text, #fff)",
              borderRadius: "2px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
            onClick={fn}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Open panel button (mobile) */}
      {onOpenPanel && (
        <button
          className="absolute bottom-4 left-4 z-10 w-9 h-9 flex items-center justify-center border md:hidden"
          style={{
            background: "color-mix(in srgb, var(--primary) 80%, transparent)",
            borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
            color: "var(--btn-text, #fff)",
            borderRadius: "2px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
          onClick={onOpenPanel}
        >
          <svg
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
        </button>
      )}

      {/* No tiles warning */}
      {tiles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p
            className="text-[11px] font-black uppercase tracking-widest opacity-30"
            style={{ color: "var(--foreground)" }}
          >
            Sin tiles configurados
          </p>
        </div>
      )}
    </div>
  );
}
