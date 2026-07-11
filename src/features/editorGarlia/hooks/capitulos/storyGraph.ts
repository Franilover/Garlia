// ─────────────────────────────────────────────────────────────────────────────
// storyGraph.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fase 1 del rediseño de Choice/Gate: modelo de datos del grafo narrativo.
//
// Hoy `listaSecciones` (en EditorCapitulos.tsx) hace un regex.matchAll suelto
// sobre `contenido` cada vez que se necesita la lista de secciones para el
// FormChoice. Este módulo generaliza esa idea: en vez de solo secciones,
// extrae TODA la estructura navegable de un capítulo (o de un libro entero)
// como nodos + conexiones, calculada a partir del contenido crudo.
//
// No depende de React ni de Lexical — es texto entra, grafo sale. Así se
// puede:
//   - reusar en el editor visual (Fase 3) sin reparsear
//   - reusar en un futuro linter/CI de libros ("¿hay secciones rotas?")
//   - testear con fixtures de texto plano
//
// Diseño de alcance (decidido con el usuario):
//   - Gate ahora puede llevar un target OPCIONAL por rama (tieneTarget /
//     noTieneTarget). Si falta, esa rama se sigue resolviendo inline como
//     hasta ahora (no es un nodo del grafo, no rompe capítulos existentes).
//   - Se ofrecen dos vistas: grafo por capítulo (buildChapterGraph) y grafo
//     de libro completo (buildBookGraph), reusando el mismo extractor base.

// ── Extracción de conexiones desde texto crudo ────────────────────────────────

export interface RawChoiceRef {
  kind: "choice";
  label: string;
  target: string;
  /** posición del match en el texto crudo, para ubicar su sección de origen */
  charIndex: number;
}

export interface RawGateRef {
  kind: "gate";
  itemId: string;
  tieneTarget: string | null;
  noTieneTarget: string | null;
  charIndex: number;
}

export interface RawFlagIfRef {
  kind: "flag-if";
  flagId: string;
  valorEsperado: string;
  siTarget: string | null;
  noTarget: string | null;
  charIndex: number;
}

export type RawConnectionRef = RawChoiceRef | RawGateRef | RawFlagIfRef;

/**
 * Extrae secciones ([[section|id|label]]) de un texto de capítulo.
 * Misma regex que `listaSecciones` en EditorCapitulos.tsx — se deja acá como
 * única fuente de verdad para no divergir entre el form viejo y el grafo.
 */
export interface RawSectionRef {
  id: string;
  label: string;
  charIndex: number;
}

export function extractSections(contenido: string): RawSectionRef[] {
  const matches = [
    ...contenido.matchAll(/\[\[section\|([^\|\]]+)(?:\|([^\]]+))?\]\]/g),
  ];
  return matches.map((m) => ({
    id: m[1].trim(),
    label: (m[2] ?? m[1]).trim(),
    charIndex: m.index ?? 0,
  }));
}

/**
 * Extrae choices ([[choice|label|target]]) de un texto de capítulo.
 */
export function extractChoices(contenido: string): RawChoiceRef[] {
  const matches = [
    ...contenido.matchAll(/\[\[choice\|([^\|\]]*)\|([^\]]*)\]\]/g),
  ];
  return matches
    .map((m) => ({
      kind: "choice" as const,
      label: m[1].trim(),
      target: m[2].trim(),
      charIndex: m.index ?? 0,
    }))
    .filter((c) => c.target); // sin target no hay arista, no vale la pena graficarlo
}

/**
 * Determina, para cada posición de caracter en `contenido`, dentro de qué
 * sección cae (o `null` si está antes de la primera sección — "inicio de
 * capítulo"). Se usa para que las aristas de choice/gate salgan del nodo
 * correcto en vez de siempre salir del inicio del capítulo.
 */
function buildSectionLocator(
  contenido: string,
): (charIndex: number) => string | null {
  const marks = [
    ...contenido.matchAll(/\[\[section\|([^\|\]]+)(?:\|([^\]]+))?\]\]/g),
  ].map((m) => ({ index: m.index ?? 0, id: m[1].trim() }));
  if (marks.length === 0) return () => null;
  return (charIndex: number) => {
    let current: string | null = null;
    for (const m of marks) {
      if (m.index <= charIndex) current = m.id;
      else break;
    }
    return current;
  };
}

/**
 * Inserta un `[[choice|label|targetId]]` al final del texto de una sección
 * (justo antes de que empiece la próxima `[[section|...]]`, o al final del
 * capítulo si es la última sección). Es la operación que dispara el
 * drag-to-connect del editor visual de grafo: arrastrar de un nodo A a un
 * nodo B agrega esta línea al final de la sección A — no intenta insertar
 * en medio del texto existente, para no arriesgar romper nada ya escrito.
 *
 * `sectionId` puede ser un id de sección real, o el capId (equivalente al
 * nodo raíz del capítulo) — en ese caso se inserta al final de todo el
 * contenido, antes de la primera sección declarada (si hay alguna, porque
 * el texto libre antes del primer [[section]] es efectivamente el inicio
 * del capítulo).
 */
export function insertChoiceAtEndOfSection(
  contenido: string,
  sectionId: string,
  capId: string,
  label: string,
  targetId: string,
): string {
  const sections = extractSections(contenido);
  const nuevaLinea = `\n\n[[choice|${label}|${targetId}]]`;

  if (sectionId === capId || sectionId === `cap:${capId}`) {
    // Nodo raíz del capítulo: insertamos antes de la primera sección
    // declarada (si hay), o al final de todo si no hay secciones aún.
    const primera = sections[0];
    if (!primera) return `${contenido}${nuevaLinea}`;
    return (
      contenido.slice(0, primera.charIndex).trimEnd() +
      nuevaLinea +
      "\n\n" +
      contenido.slice(primera.charIndex)
    );
  }

  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) {
    // Sección no encontrada en el texto (no debería pasar si el grafo está
    // sincronizado, pero por las dudas no rompemos nada — apendeamos al final).
    return `${contenido}${nuevaLinea}`;
  }

  const siguiente = sections[idx + 1];
  if (!siguiente) return `${contenido}${nuevaLinea}`;

  return (
    contenido.slice(0, siguiente.charIndex).trimEnd() +
    nuevaLinea +
    "\n\n" +
    contenido.slice(siguiente.charIndex)
  );
}

/**
 * Extrae gates. Formato ampliado (retrocompatible):
 *   [[gate|itemId|
 *   Texto si TIENE
 *   ===
 *   Texto si NO TIENE
 *   ]]
 * Los targets van como sufijo opcional al final de cada rama, en su propia
 * línea, con el prefijo "->": `-> id-de-seccion`. Si no está, la rama es
 * puramente textual como hoy (no genera arista).
 *
 * Ejemplo con targets:
 *   [[gate|llave-oxidada|
 *   Giras la llave y la puerta cede.
 *   -> sala-del-trono
 *   ===
 *   La cerradura no cede sin la llave correcta.
 *   -> pasillo-oscuro
 *   ]]
 */
const TARGET_LINE = /(?:^|\n)\s*->\s*([a-z0-9-]+)\s*$/i;

function extractTargetSuffix(branchText: string): {
  text: string;
  target: string | null;
} {
  const m = TARGET_LINE.exec(branchText);
  if (!m) return { text: branchText.trim(), target: null };
  return {
    text: branchText.slice(0, m.index).trim(),
    target: m[1].trim(),
  };
}

export function extractGates(contenido: string): RawGateRef[] {
  const gateRegex = /\[\[gate\|([^\|]+)\|([\s\S]+?)\]\]/g;
  const gates: RawGateRef[] = [];
  let match: RegExpExecArray | null;
  while ((match = gateRegex.exec(contenido)) !== null) {
    const itemId = match[1].trim();
    const body = match[2];
    const sepIdx = body.indexOf("===");
    const tieneRaw = sepIdx >= 0 ? body.slice(0, sepIdx) : body;
    const noTieneRaw = sepIdx >= 0 ? body.slice(sepIdx + 3) : "";
    const tiene = extractTargetSuffix(tieneRaw);
    const noTiene = extractTargetSuffix(noTieneRaw);
    gates.push({
      kind: "gate",
      itemId,
      tieneTarget: tiene.target,
      noTieneTarget: noTiene.target,
      charIndex: match.index,
    });
  }
  return gates;
}

/**
 * Extrae condicionales de flag [[flag|if|flagId|valorEsperado|...===...]].
 * Mismo formato retrocompatible que gate: targets opcionales por rama, vía
 * sufijo "-> id". [[flag|set|...]] no genera arista — solo escribe estado,
 * no navega, así que no se extrae acá.
 */
export function extractFlagIfs(contenido: string): RawFlagIfRef[] {
  const flagIfRegex = /\[\[flag\|if\|([^\|]+)\|([^\|]*)\|([\s\S]+?)\]\]/g;
  const flagIfs: RawFlagIfRef[] = [];
  let match: RegExpExecArray | null;
  while ((match = flagIfRegex.exec(contenido)) !== null) {
    const flagId = match[1].trim();
    const valorEsperado = match[2].trim();
    const body = match[3];
    const sepIdx = body.indexOf("===");
    const siRaw = sepIdx >= 0 ? body.slice(0, sepIdx) : body;
    const noRaw = sepIdx >= 0 ? body.slice(sepIdx + 3) : "";
    const si = extractTargetSuffix(siRaw);
    const no = extractTargetSuffix(noRaw);
    flagIfs.push({
      kind: "flag-if",
      flagId,
      valorEsperado,
      siTarget: si.target,
      noTarget: no.target,
      charIndex: match.index,
    });
  }
  return flagIfs;
}

// ── Modelo de grafo ────────────────────────────────────────────────────────────

export type StoryNodeKind = "section" | "chapter-start" | "external";

export interface StoryNode {
  /** id de sección, o el capId prefijado con "cap:" para el nodo raíz del capítulo */
  id: string;
  label: string;
  kind: StoryNodeKind;
  /** capId al que pertenece este nodo (para el grafo de libro completo) */
  capId: string;
  capTitulo?: string;
  /** true si ninguna conexión apunta a este nodo */
  isOrphan: boolean;
}

export interface StoryEdge {
  id: string;
  type: "choice" | "gate-tiene" | "gate-notiene" | "flag-si" | "flag-no";
  from: string;
  to: string;
  label: string;
  /** true si `to` no corresponde a ningún nodo conocido — link roto */
  isBroken: boolean;
}

export interface StoryGraph {
  nodes: StoryNode[];
  edges: StoryEdge[];
  /** nodos sin conexiones entrantes (excluyendo el nodo raíz del capítulo/libro) */
  orphanNodes: StoryNode[];
  /** aristas cuyo destino no existe como sección */
  brokenEdges: StoryEdge[];
}

interface ChapterInput {
  capId: string;
  titulo: string;
  contenido: string;
}

/**
 * Construye el grafo a partir de una lista de capítulos (1 para vista por
 * capítulo, N para vista de libro completo). El nodo raíz de cada capítulo
 * (id = "cap:<capId>") representa "donde arranca el capítulo" — así un
 * choice/gate que target-ea el ID de OTRO capítulo (o su primera sección)
 * puede resolverse como salto entre capítulos en la vista de libro.
 */
export function buildStoryGraph(chapters: ChapterInput[]): StoryGraph {
  const nodes: StoryNode[] = [];
  const nodeIds = new Set<string>();
  const edges: StoryEdge[] = [];

  // 1. nodo raíz por capítulo + nodos de sección
  for (const ch of chapters) {
    const rootId = `cap:${ch.capId}`;
    nodes.push({
      id: rootId,
      label: ch.titulo || "(sin título)",
      kind: "chapter-start",
      capId: ch.capId,
      capTitulo: ch.titulo,
      isOrphan: false, // el inicio de capítulo nunca se marca huérfano
    });
    nodeIds.add(rootId);
    // el propio capId también resuelve al inicio del capítulo, para permitir
    // que un target escriba directamente el capId sin conocer su rootId interno
    nodeIds.add(ch.capId);

    for (const sec of extractSections(ch.contenido)) {
      nodes.push({
        id: sec.id,
        label: sec.label,
        kind: "section",
        capId: ch.capId,
        capTitulo: ch.titulo,
        isOrphan: true, // se recalcula abajo una vez tengamos todas las aristas
      });
      nodeIds.add(sec.id);
    }
  }

  // 2. aristas: choices y gates de cada capítulo, ubicando su sección de
  //    origen real por posición en el texto (fallback: inicio del capítulo)
  let edgeCounter = 0;
  for (const ch of chapters) {
    const locateSection = buildSectionLocator(ch.contenido);
    const rootId = `cap:${ch.capId}`;

    for (const c of extractChoices(ch.contenido)) {
      const from = locateSection(c.charIndex) ?? rootId;
      edges.push({
        id: `e${edgeCounter++}`,
        type: "choice",
        from,
        to: c.target,
        label: c.label || "(sin texto)",
        isBroken: !nodeIds.has(c.target),
      });
    }
    for (const g of extractGates(ch.contenido)) {
      const from = locateSection(g.charIndex) ?? rootId;
      if (g.tieneTarget) {
        edges.push({
          id: `e${edgeCounter++}`,
          type: "gate-tiene",
          from,
          to: g.tieneTarget,
          label: `tiene ${g.itemId}`,
          isBroken: !nodeIds.has(g.tieneTarget),
        });
      }
      if (g.noTieneTarget) {
        edges.push({
          id: `e${edgeCounter++}`,
          type: "gate-notiene",
          from,
          to: g.noTieneTarget,
          label: `no tiene ${g.itemId}`,
          isBroken: !nodeIds.has(g.noTieneTarget),
        });
      }
    }
    for (const f of extractFlagIfs(ch.contenido)) {
      const from = locateSection(f.charIndex) ?? rootId;
      if (f.siTarget) {
        edges.push({
          id: `e${edgeCounter++}`,
          type: "flag-si",
          from,
          to: f.siTarget,
          label: `${f.flagId}=${f.valorEsperado}`,
          isBroken: !nodeIds.has(f.siTarget),
        });
      }
      if (f.noTarget) {
        edges.push({
          id: `e${edgeCounter++}`,
          type: "flag-no",
          from,
          to: f.noTarget,
          label: `${f.flagId}≠${f.valorEsperado}`,
          isBroken: !nodeIds.has(f.noTarget),
        });
      }
    }
  }

  // 3. recalcular huérfanas: cualquier nodo de tipo "section" sin arista entrante
  const targetsWithIncoming = new Set(edges.map((e) => e.to));
  for (const n of nodes) {
    if (n.kind === "section") {
      n.isOrphan = !targetsWithIncoming.has(n.id);
    }
  }

  const orphanNodes = nodes.filter((n) => n.isOrphan);
  const brokenEdges = edges.filter((e) => e.isBroken);

  return { nodes, edges, orphanNodes, brokenEdges };
}

/** Grafo de un solo capítulo — reemplazo directo de `listaSecciones` con más info. */
export function buildChapterGraph(
  capId: string,
  titulo: string,
  contenido: string,
): StoryGraph {
  return buildStoryGraph([{ capId, titulo, contenido }]);
}

/** Grafo del libro completo — requiere todos los capítulos con su contenido. */
export function buildBookGraph(
  chapters: { id: string; titulo_capitulo: string; contenido: string }[],
): StoryGraph {
  return buildStoryGraph(
    chapters.map((c) => ({
      capId: c.id,
      titulo: c.titulo_capitulo,
      contenido: c.contenido,
    })),
  );
}
