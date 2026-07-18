/**
 * visionUtils
 * ───────────────────────────────────────────────────────────────────────────
 * Line-of-sight real (raycasting) para la niebla de guerra de /aventura.
 * Todo trabaja en las mismas coordenadas lógicas (px sin escalar por zoom)
 * que pos_x/pos_y en el resto del tablero.
 *
 * Algoritmo: "ray casting a los vértices" (variante simple de shadowcasting
 * en 2D, suficiente para formas rectangulares/circulares en un tablero
 * chico). Para cada obstáculo se sacan sus segmentos; para cada vértice de
 * cada segmento se disparan 3 rayos (al vértice, y levemente rotados a cada
 * lado) desde el origen de visión; se calcula la intersección más cercana
 * de cada rayo contra TODOS los segmentos; los puntos de impacto, ordenados
 * por ángulo, forman el polígono de "lo visible" — que se puede pintar
 * directo como un <polygon> y usarlo de máscara SVG.
 */

export interface Obstaculo {
  id: string;
  forma: "rect" | "circulo";
  pos_x: number;
  pos_y: number;
  ancho: number;
  alto: number;
}

interface Punto {
  x: number;
  y: number;
}

interface Segmento {
  a: Punto;
  b: Punto;
}

/** Circulo aproximado a un polígono de N lados — así reusa la misma
 *  lógica de segmentos que un rectángulo, sin caso especial en el resto
 *  del algoritmo. 16 lados alcanza para que se vea redondo a la escala
 *  del tablero. */
const LADOS_CIRCULO = 16;

function segmentosDeObstaculo(o: Obstaculo): Segmento[] {
  if (o.forma === "circulo") {
    const cx = o.pos_x + o.ancho / 2;
    const cy = o.pos_y + o.ancho / 2;
    const r = o.ancho / 2;
    const puntos: Punto[] = [];
    for (let i = 0; i < LADOS_CIRCULO; i++) {
      const ang = (i / LADOS_CIRCULO) * Math.PI * 2;
      puntos.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
    }
    return puntos.map((p, i) => ({ a: p, b: puntos[(i + 1) % puntos.length] }));
  }
  const x0 = o.pos_x;
  const y0 = o.pos_y;
  const x1 = o.pos_x + o.ancho;
  const y1 = o.pos_y + o.alto;
  const esquinas: Punto[] = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  return esquinas.map((p, i) => ({ a: p, b: esquinas[(i + 1) % esquinas.length] }));
}

/** Borde exterior del área visible total (el "mundo" del raycasting no
 *  puede ser infinito: se acota al lienzo, si no un rayo que no pega
 *  contra nada nunca terminaría de dibujarse). */
function segmentosDeBorde(w: number, h: number): Segmento[] {
  const esquinas: Punto[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  return esquinas.map((p, i) => ({ a: p, b: esquinas[(i + 1) % esquinas.length] }));
}

/** Intersección rayo (origen + dirección) contra segmento a-b. Devuelve la
 *  distancia t a lo largo del rayo, o null si no intersecta. */
function interseccionRayo(origen: Punto, dir: Punto, seg: Segmento): number | null {
  const r_px = origen.x;
  const r_py = origen.y;
  const r_dx = dir.x;
  const r_dy = dir.y;

  const s_px = seg.a.x;
  const s_py = seg.a.y;
  const s_dx = seg.b.x - seg.a.x;
  const s_dy = seg.b.y - seg.a.y;

  const denom = r_dx * s_dy - r_dy * s_dx;
  if (Math.abs(denom) < 1e-10) return null; // paralelos

  const t2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / denom;
  if (t2 < 0 || t2 > 1) return null; // fuera del segmento

  const t1 =
    r_dx !== 0 ? (s_px + s_dx * t2 - r_px) / r_dx : (s_py + s_dy * t2 - r_py) / r_dy;
  if (t1 < 0) return null; // detrás del origen

  return t1;
}

/**
 * Calcula el polígono de visibilidad desde `origen` contra la lista de
 * obstáculos, acotado al rectángulo [0,0,canvasW,canvasH].
 * Devuelve los vértices en orden angular, listos para un <polygon points="...">.
 */
export function calcularPoligonoVisibilidad(
  origen: Punto,
  obstaculos: Obstaculo[],
  canvasW: number,
  canvasH: number,
): Punto[] {
  const segmentos: Segmento[] = [
    ...segmentosDeBorde(canvasW, canvasH),
    ...obstaculos.flatMap(segmentosDeObstaculo),
  ];

  // Ángulos únicos a probar: cada vértice de cada segmento, +/- un épsilon
  // angular (así el rayo "roza" el borde del obstáculo en vez de pasar
  // justo por el vértice, donde el resultado es numéricamente inestable).
  const EPS = 0.00005;
  const angulos = new Set<number>();
  for (const seg of segmentos) {
    for (const p of [seg.a, seg.b]) {
      const ang = Math.atan2(p.y - origen.y, p.x - origen.x);
      angulos.add(ang - EPS);
      angulos.add(ang);
      angulos.add(ang + EPS);
    }
  }

  const puntosImpacto: (Punto & { ang: number })[] = [];
  for (const ang of angulos) {
    const dir = { x: Math.cos(ang), y: Math.sin(ang) };
    let mejorT = Infinity;
    for (const seg of segmentos) {
      const t = interseccionRayo(origen, dir, seg);
      if (t !== null && t < mejorT) mejorT = t;
    }
    if (mejorT === Infinity) continue;
    puntosImpacto.push({
      x: origen.x + dir.x * mejorT,
      y: origen.y + dir.y * mejorT,
      ang,
    });
  }

  puntosImpacto.sort((a, b) => a.ang - b.ang);
  return puntosImpacto.map((p) => ({ x: p.x, y: p.y }));
}

// ── Memoria de exploración: grilla de celdas ──────────────────────────────

/** Tamaño lógico (px) de cada celda de la grilla de exploración. Más chico
 *  = memoria más precisa pero más celdas guardadas; 48px alcanza y sobra
 *  para el tamaño de token/tarjeta del tablero. */
export const GRID_SIZE = 48;

export function celdaDe(x: number, y: number): string {
  return `${Math.floor(x / GRID_SIZE)},${Math.floor(y / GRID_SIZE)}`;
}

/** Punto está dentro del polígono de visibilidad (ray casting par/impar). */
function puntoEnPoligono(p: Punto, poligono: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const xi = poligono[i].x;
    const yi = poligono[i].y;
    const xj = poligono[j].x;
    const yj = poligono[j].y;
    const interseca =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (interseca) dentro = !dentro;
  }
  return dentro;
}

/** Todas las celdas de la grilla, dentro de un radio razonable del origen,
 *  cuyo centro cae dentro del polígono de visibilidad actual — son las
 *  que se agregan a la memoria de exploración de este jugador. */
export function celdasVisiblesEnPoligono(
  poligono: Punto[],
  canvasW: number,
  canvasH: number,
): string[] {
  if (poligono.length === 0) return [];
  const xs = poligono.map((p) => p.x);
  const ys = poligono.map((p) => p.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs) / GRID_SIZE) * GRID_SIZE);
  const maxX = Math.min(canvasW, Math.ceil(Math.max(...xs) / GRID_SIZE) * GRID_SIZE);
  const minY = Math.max(0, Math.floor(Math.min(...ys) / GRID_SIZE) * GRID_SIZE);
  const maxY = Math.min(canvasH, Math.ceil(Math.max(...ys) / GRID_SIZE) * GRID_SIZE);

  const celdas: string[] = [];
  for (let x = minX; x < maxX; x += GRID_SIZE) {
    for (let y = minY; y < maxY; y += GRID_SIZE) {
      const centro = { x: x + GRID_SIZE / 2, y: y + GRID_SIZE / 2 };
      if (puntoEnPoligono(centro, poligono)) {
        celdas.push(celdaDe(centro.x, centro.y));
      }
    }
  }
  return celdas;
}
