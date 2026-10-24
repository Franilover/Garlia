"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ChevronDown, ChevronRight, Info } from "lucide-react";

// ── Datos ──────────────────────────────────────────────────────────────────────

const NOTAS_CROMATICAS = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
const NOTAS_DISPLAY = ["Do", "Do#/Reb", "Re", "Re#/Mib", "Mi", "Fa", "Fa#/Solb", "Sol", "Sol#/Lab", "La", "La#/Sib", "Si"];

// Intervalos en semitonos para cada tipo de escala
const ESCALAS: Record<string, { label: string; intervalos: number[]; descripcion: string; uso: string; color: string }> = {
  mayor: {
    label: "Mayor",
    intervalos: [0, 2, 4, 5, 7, 9, 11],
    descripcion: "La escala más común. Suena alegre, brillante, positiva.",
    uso: "Pop, electrónica festiva, hip-hop melódico. En Reaper: úsala para melodías principales y drops energéticos.",
    color: "#f59e0b",
  },
  menor_natural: {
    label: "Menor Natural",
    intervalos: [0, 2, 3, 5, 7, 8, 10],
    descripcion: "La escala menor estándar. Suena oscura, melancólica, profunda.",
    uso: "Trap, hip-hop oscuro, lo-fi, R&B. La más usada en música electrónica moderna.",
    color: "#6366f1",
  },
  menor_armonica: {
    label: "Menor Armónica",
    intervalos: [0, 2, 3, 5, 7, 8, 11],
    descripcion: "Menor con el 7mo grado elevado. Tiene un sabor exótico y dramático.",
    uso: "Música cinematic, drill, beats con tensión. El intervalo aumentado (6ta→7ma) da ese sonido 'árabe'.",
    color: "#8b5cf6",
  },
  menor_melodica: {
    label: "Menor Melódica",
    intervalos: [0, 2, 3, 5, 7, 9, 11],
    descripcion: "Menor con el 6to y 7mo elevados. Suena fluida y jazz-influenced.",
    uso: "Melodías jazzísticas, neo-soul. Ideal para líneas vocales en Reaper.",
    color: "#a855f7",
  },
  pentatonica_mayor: {
    label: "Pentatónica Mayor",
    intervalos: [0, 2, 4, 7, 9],
    descripcion: "5 notas. Ninguna nota 'disonante' — todo suena bien juntos.",
    uso: "Ideal para empezar en Reaper: cualquier nota que toques sonará bien. Pop, country, R&B.",
    color: "#10b981",
  },
  pentatonica_menor: {
    label: "Pentatónica Menor",
    intervalos: [0, 3, 5, 7, 10],
    descripcion: "5 notas oscuras. Muy versátil y difícil de sonar mal.",
    uso: "La escala más usada en hip-hop, trap y lo-fi. Si estás empezando: úsala siempre.",
    color: "#14b8a6",
  },
  blues: {
    label: "Blues",
    intervalos: [0, 3, 5, 6, 7, 10],
    descripcion: "Pentatónica menor + la 'blue note' (tritono). Suena cruda y con alma.",
    uso: "Hip-hop con groove, boom bap, beats con feeling. Agrega tensión emocional.",
    color: "#3b82f6",
  },
  dorico: {
    label: "Dórico (Modo)",
    intervalos: [0, 2, 3, 5, 7, 9, 10],
    descripcion: "Menor pero con el 6to elevado. Suena oscura pero con algo de esperanza.",
    uso: "Muy popular en funk, soul, hip-hop. 'Smoke on the Water', muchos riffs de Drake.",
    color: "#ef4444",
  },
  frigio: {
    label: "Frigio (Modo)",
    intervalos: [0, 1, 3, 5, 7, 8, 10],
    descripcion: "Muy oscuro, con sabor flamenco y español. El 2do grado es bemol.",
    uso: "Drill, beats oscuros, música árabe. Da sensación de tensión extrema.",
    color: "#dc2626",
  },
  lidio: {
    label: "Lidio (Modo)",
    intervalos: [0, 2, 4, 6, 7, 9, 11],
    descripcion: "Mayor con el 4to elevado. Suena mágico, etéreo, de otro mundo.",
    uso: "Música de videojuegos, cinematic, lo-fi dreamy. El 'tritono' vs la raíz crea tensión hermosa.",
    color: "#f97316",
  },
  mixolidio: {
    label: "Mixolidio (Modo)",
    intervalos: [0, 2, 4, 5, 7, 9, 10],
    descripcion: "Mayor con el 7mo bemol. Suena rockero y blues-y pero brillante.",
    uso: "Funk, pop, rock. Muy usada en riffs. El 7mo rebajado le da groove.",
    color: "#eab308",
  },
};

const ACORDES_BASE: Record<string, { intervalos: number[]; label: string; descripcion: string }> = {
  mayor: { intervalos: [0, 4, 7], label: "Mayor (M)", descripcion: "Alegre, estable. Raíz + 3ra mayor + 5ta justa." },
  menor: { intervalos: [0, 3, 7], label: "Menor (m)", descripcion: "Melancólico, suave. Raíz + 3ra menor + 5ta justa." },
  disminuido: { intervalos: [0, 3, 6], label: "Disminuido (dim)", descripcion: "Tenso, inestable. Dos 3ras menores apiladas." },
  aumentado: { intervalos: [0, 4, 8], label: "Aumentado (aug)", descripcion: "Muy tenso, sobrenatural. 3ra mayor + 3ra mayor." },
  maj7: { intervalos: [0, 4, 7, 11], label: "Mayor 7 (Maj7)", descripcion: "Suave, jazzístico, romántico. Mayor con 7ma mayor." },
  m7: { intervalos: [0, 3, 7, 10], label: "Menor 7 (m7)", descripcion: "Melancólico y suave. Muy usado en R&B y lo-fi." },
  dom7: { intervalos: [0, 4, 7, 10], label: "Dominante 7 (7)", descripcion: "Tenso, necesita resolver. Muy usado en blues." },
  sus2: { intervalos: [0, 2, 7], label: "Sus2", descripcion: "Abierto, flotante. Sin 3ra — ni mayor ni menor." },
  sus4: { intervalos: [0, 5, 7], label: "Sus4", descripcion: "Suspensión. Muy usado en pop electrónico moderno." },
};

const PROGRESIONES: Array<{ label: string; grados: string[]; descripcion: string; ejemplos: string }> = [
  { label: "I – V – vi – IV", grados: ["1", "5", "6m", "4"], descripcion: "La progresión pop más usada del mundo. Funciona en cualquier tonalidad.", ejemplos: "Millones de canciones pop, EDM, hip-hop." },
  { label: "i – VII – VI – VII", grados: ["1m", "7", "6", "7"], descripcion: "Menor clásica. Muy usada en trap y hip-hop oscuro.", ejemplos: "Mucho trap moderno, Weeknd vibes." },
  { label: "i – iv – VII – III", grados: ["1m", "4m", "7", "3"], descripcion: "Cadencia andaluza invertida. Sonido flamenc/épico.", ejemplos: "Drill, cinematic, beats épicos." },
  { label: "I – IV – V – IV", grados: ["1", "4", "5", "4"], descripcion: "Progresión blues clásica. Simple y efectiva.", ejemplos: "Blues, rock, boom bap." },
  { label: "i – VI – III – VII", grados: ["1m", "6", "3", "7"], descripcion: "La 'loop de desamor'. Omnipresente en lo-fi y R&B.", ejemplos: "Lo-fi hip-hop, R&B moderno, pop melancólico." },
  { label: "I – vi – IV – V", grados: ["1", "6m", "4", "5"], descripcion: "La progresión del rock'n'roll de los 50s. Atemporal.", ejemplos: "Pop clásico, indie, pop baladas." },
];

const REAPER_TIPS = [
  { titulo: "Ver las notas en el piano roll", texto: "En Reaper, cuando abres el piano roll de un clip MIDI, el lado izquierdo es un piano. La nota 'C' (Do) es la tecla blanca justo debajo del grupo de 2 teclas negras. C4 = Do central." },
  { titulo: "¿Cuánto durar cada nota?", texto: "En el piano roll, el ancho de cada nota = su duración. Una nota que ocupa 1 beat suena 1 tiempo. Cuartos de compás = 4 beats = 1 compás (dependiendo del tempo)." },
  { titulo: "Cómo poner las notas de una escala", texto: "Si estás en Do Mayor: solo usa las teclas BLANCAS del piano roll (C D E F G A B). Si estás en La Menor Natural: también solo teclas blancas. Son la misma escala, diferente raíz." },
  { titulo: "Quantize = cuadrar las notas", texto: "En Reaper puedes presionar Q para 'cuadrar' las notas al grid. Útil para que todo quede en tiempo. Para hip-hop a veces se deja un poco 'fuera' para que suene más humano." },
  { titulo: "Chord mode en el piano roll", texto: "Para agregar acordes: selecciona varias notas al mismo tiempo (misma posición X, diferente altura Y en el piano roll). Toca simultáneamente = acorde." },
  { titulo: "Velocidad de las notas", texto: "La barra de abajo en el piano roll = velocity (intensidad). Más alto = más fuerte. Para drum patterns: los hi-hats suelen tener velocity baja (~60-80), los kicks y snares alta (~100-127)." },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildScale(rootIndex: number, intervalos: number[]): string[] {
  return intervalos.map((semitono) => {
    const idx = (rootIndex + semitono) % 12;
    return NOTAS_CROMATICAS[idx];
  });
}

function buildChord(rootIndex: number, intervalos: number[]): string[] {
  return intervalos.map((semitono) => {
    const idx = (rootIndex + semitono) % 12;
    return NOTAS_CROMATICAS[idx];
  });
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  defaultOpen = false,
  color = "var(--primary)",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        background: "var(--white-custom)",
      }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 transition-all"
        style={{
          background: open
            ? `color-mix(in srgb, ${color} 6%, transparent)`
            : "transparent",
          color: "var(--primary)",
        }}
        onClick={() => setOpen((p) => !p)}
      >
        <span className="flex items-center gap-2.5 font-black text-xs uppercase tracking-widest">
          {icon}
          {title}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotaChip({ nota, highlight = false }: { nota: string; highlight?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center font-black text-micro uppercase"
      style={{
        minWidth: 44,
        padding: "4px 8px",
        borderRadius: 6,
        border: `1px solid ${highlight ? "var(--primary)" : "color-mix(in srgb, var(--primary) 18%, transparent)"}`,
        background: highlight
          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
          : "color-mix(in srgb, var(--primary) 4%, transparent)",
        color: highlight ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
      }}
    >
      {nota}
    </span>
  );
}

// ── Vista de Escalas ───────────────────────────────────────────────────────────

function EscalasView() {
  const [rootIndex, setRootIndex] = useState(0);
  const [escalaKey, setEscalaKey] = useState<keyof typeof ESCALAS>("pentatonica_menor");

  const escala = ESCALAS[escalaKey];
  const notas = buildScale(rootIndex, escala.intervalos);

  return (
    <div className="space-y-5">
      {/* Selector de raíz */}
      <div>
        <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
          Raíz / Tónica
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NOTAS_CROMATICAS.map((nota, i) => (
            <button
              key={nota}
              type="button"
              className="font-black text-micro uppercase transition-all"
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${i === rootIndex ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
                background: i === rootIndex
                  ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                  : "transparent",
                color: i === rootIndex ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              onClick={() => setRootIndex(i)}
            >
              {nota}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de escala */}
      <div>
        <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
          Tipo de escala
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ESCALAS).map(([key, val]) => (
            <button
              key={key}
              type="button"
              className="font-black text-micro uppercase transition-all"
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${key === escalaKey ? val.color : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
                background: key === escalaKey
                  ? `color-mix(in srgb, ${val.color} 15%, transparent)`
                  : "transparent",
                color: key === escalaKey ? val.color : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              onClick={() => setEscalaKey(key as keyof typeof ESCALAS)}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado */}
      <div
        style={{
          borderRadius: "var(--radius-card)",
          padding: "16px 20px",
          border: `1px solid ${escala.color}30`,
          background: `color-mix(in srgb, ${escala.color} 5%, transparent)`,
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p
              className="font-black text-sm uppercase tracking-widest"
              style={{ color: escala.color }}
            >
              {NOTAS_CROMATICAS[rootIndex]} {escala.label}
            </p>
            <p className="text-xs text-primary/50 mt-1">{escala.descripcion}</p>
          </div>
          <span
            className="shrink-0 text-micro font-black uppercase tracking-widest px-2 py-1 rounded"
            style={{
              border: `1px solid ${escala.color}40`,
              color: escala.color,
              background: `color-mix(in srgb, ${escala.color} 10%, transparent)`,
            }}
          >
            {escala.intervalos.length} notas
          </span>
        </div>

        {/* Notas de la escala */}
        <div className="flex flex-wrap gap-2 mb-4">
          {notas.map((nota, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <NotaChip nota={nota} highlight={i === 0} />
              <span
                className="text-micro font-black"
                style={{ color: i === 0 ? escala.color : "color-mix(in srgb, var(--primary) 25%, transparent)" }}
              >
                {i === 0 ? "raíz" : `${escala.intervalos[i]}st`}
              </span>
            </div>
          ))}
        </div>

        {/* Piano visual */}
        <PianoVisual notas={notas} rootNota={NOTAS_CROMATICAS[rootIndex]} color={escala.color} />

        {/* Uso en Reaper */}
        <div
          className="mt-4 rounded-lg px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-1">
            🎹 En Reaper
          </p>
          <p className="text-xs text-primary/60">{escala.uso}</p>
        </div>
      </div>
    </div>
  );
}

// ── Piano Visual ───────────────────────────────────────────────────────────────

function PianoVisual({ notas, rootNota, color }: { notas: string[]; rootNota: string; color: string }) {
  // Representar 2 octavas del piano cromático
  const BLANCAS = ["C", "D", "E", "F", "G", "A", "B"];
  const NEGRAS: (string | null)[] = ["C#/Db", "D#/Eb", null, "F#/Gb", "G#/Ab", "A#/Bb", null];

  const octavas = [0, 1];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative inline-flex" style={{ height: 72, userSelect: "none" }}>
        {octavas.flatMap((oct) =>
          BLANCAS.map((nota, i) => {
            const notaFull = nota;
            const inScale = notas.some((n) => n.split("/").some((part) => part === notaFull));
            const isRoot = rootNota.split("/").some((part) => part === nota);
            const keyIdx = oct * 7 + i;

            return (
              <div
                key={`${oct}-${nota}`}
                className="relative inline-flex items-end justify-center pb-1.5"
                style={{
                  width: 26,
                  height: 72,
                  border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                  borderRadius: "0 0 4px 4px",
                  background: isRoot
                    ? color
                    : inScale
                    ? `color-mix(in srgb, ${color} 25%, white)`
                    : "color-mix(in srgb, var(--bg-main) 50%, white)",
                  zIndex: 1,
                  cursor: "default",
                  marginRight: i === 6 ? 1 : 0,
                }}
              >
                {(inScale || isRoot) && (
                  <span
                    className="text-micro font-black"
                    style={{
                      fontSize: 8,
                      color: isRoot ? "white" : color,
                      lineHeight: 1,
                    }}
                  >
                    {nota}
                  </span>
                )}
              </div>
            );
          })
        )}
        {/* Teclas negras */}
        {octavas.flatMap((oct) =>
          NEGRAS.map((nota, i) => {
            if (!nota) return null;
            const inScale = notas.some((n) => n === nota);
            const isRoot = nota === rootNota;
            // Posición X relativa a las teclas blancas
            const offsets = [1, 2, 0, 4, 5, 6, 0];
            const xPos = (oct * 7 + offsets[i]) * 26 - 9;

            return (
              <div
                key={`${oct}-black-${nota}`}
                className="absolute top-0 inline-flex items-end justify-center pb-1"
                style={{
                  left: xPos,
                  width: 18,
                  height: 44,
                  borderRadius: "0 0 3px 3px",
                  background: isRoot
                    ? color
                    : inScale
                    ? `color-mix(in srgb, ${color} 60%, #111)`
                    : "#1a1a2e",
                  zIndex: 2,
                  cursor: "default",
                }}
              >
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 6, color: "rgba(255,255,255,0.8)", fontWeight: 900 }}>
                    {nota.split("/")[0]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Vista de Acordes ───────────────────────────────────────────────────────────

function AcordesView() {
  const [rootIndex, setRootIndex] = useState(0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
          Raíz del acorde
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NOTAS_CROMATICAS.map((nota, i) => (
            <button
              key={nota}
              type="button"
              className="font-black text-micro uppercase transition-all"
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${i === rootIndex ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
                background: i === rootIndex
                  ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                  : "transparent",
                color: i === rootIndex ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              onClick={() => setRootIndex(i)}
            >
              {nota}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(ACORDES_BASE).map(([key, acorde]) => {
          const notas = buildChord(rootIndex, acorde.intervalos);
          return (
            <div
              key={key}
              style={{
                borderRadius: "var(--radius-card)",
                padding: "14px 16px",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                background: "color-mix(in srgb, var(--primary) 3%, transparent)",
              }}
            >
              <p className="font-black text-xs text-primary uppercase tracking-wider mb-1">
                {NOTAS_CROMATICAS[rootIndex]} {acorde.label}
              </p>
              <p className="text-micro text-primary/40 mb-3">{acorde.descripcion}</p>
              <div className="flex flex-wrap gap-1.5">
                {notas.map((nota, i) => (
                  <NotaChip key={i} nota={nota} highlight={i === 0} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista de Progresiones ──────────────────────────────────────────────────────

function ProgresionesView() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg px-4 py-3 flex items-start gap-2.5"
        style={{
          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <Info size={13} className="shrink-0 mt-0.5 text-primary/40" />
        <p className="text-xs text-primary/55">
          Los <strong>grados</strong> son la posición de un acorde dentro de la escala. I = tónica (raíz), IV = cuarto grado, V = quinto grado. Los números romanos en minúscula (i, iv) = acordes menores.
          Ejemplo en Do Mayor: I=Do, II=Re, III=Mi, IV=Fa, V=Sol, VI=La, VII=Si.
        </p>
      </div>

      <div className="space-y-3">
        {PROGRESIONES.map((prog, i) => (
          <div
            key={i}
            style={{
              borderRadius: "var(--radius-card)",
              padding: "16px 20px",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="font-black text-sm text-primary tracking-wider">{prog.label}</p>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {prog.grados.map((g, gi) => (
                  <span
                    key={gi}
                    className="font-black text-micro uppercase px-2 py-1 rounded"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                      background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      color: "var(--primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-primary/50 mb-1">{prog.descripcion}</p>
            <p className="text-micro text-primary/35 font-black uppercase tracking-widest">
              ↳ {prog.ejemplos}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vista de Tips Reaper ───────────────────────────────────────────────────────

function ReaperTipsView() {
  return (
    <div className="space-y-3">
      <div
        className="rounded-lg px-4 py-3"
        style={{
          background: "color-mix(in srgb, #10b981 8%, transparent)",
          border: "1px solid color-mix(in srgb, #10b981 20%, transparent)",
        }}
      >
        <p className="text-xs font-black text-emerald-600 mb-1 uppercase tracking-widest">Flujo recomendado para empezar</p>
        <ol className="text-xs text-primary/60 space-y-1 list-decimal list-inside">
          <li>Elige un BPM (lo-fi: 70-90, trap: 130-145, boom bap: 85-100)</li>
          <li>Decide una tonalidad — empieza con <strong>La menor (A minor)</strong> o <strong>Do Mayor (C major)</strong></li>
          <li>Haz el loop de drums primero (kick, snare, hi-hat)</li>
          <li>Pon el bajo usando solo la <strong>pentatónica menor</strong> de tu tonalidad</li>
          <li>Agrega una melodía o sample encima — misma escala</li>
          <li>Construye acordes para la progresión (i – VI – III – VII es seguro)</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REAPER_TIPS.map((tip, i) => (
          <div
            key={i}
            style={{
              borderRadius: "var(--radius-card)",
              padding: "14px 16px",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
          >
            <p className="font-black text-xs text-primary uppercase tracking-wider mb-2">
              {tip.titulo}
            </p>
            <p className="text-xs text-primary/55 leading-relaxed">{tip.texto}</p>
          </div>
        ))}
      </div>

      {/* Referencia de teclas piano roll */}
      <div
        style={{
          borderRadius: "var(--radius-card)",
          padding: "16px 20px",
          border: "1px solid color-mix(in srgb, #6366f1 20%, transparent)",
          background: "color-mix(in srgb, #6366f1 5%, transparent)",
        }}
      >
        <p className="font-black text-xs uppercase tracking-widest mb-3" style={{ color: "#6366f1" }}>
          🎹 Mapa del piano roll (Do/C central = C4)
        </p>
        <div className="overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {NOTAS_CROMATICAS.map((nota, i) => {
              const esNegra = nota.includes("/");
              return (
                <div
                  key={i}
                  className="flex flex-col items-center"
                  style={{ minWidth: esNegra ? 32 : 36 }}
                >
                  <div
                    className="flex items-end justify-center text-center pb-1"
                    style={{
                      height: 48,
                      width: esNegra ? 28 : 34,
                      borderRadius: "0 0 4px 4px",
                      border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                      background: esNegra
                        ? "color-mix(in srgb, var(--primary) 60%, transparent)"
                        : "color-mix(in srgb, var(--primary) 8%, white)",
                      fontSize: 7,
                      fontWeight: 900,
                      color: esNegra ? "rgba(255,255,255,0.9)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                    }}
                  >
                    {nota.split("/")[0]}
                  </div>
                  <span style={{ fontSize: 7, marginTop: 3, color: "color-mix(in srgb, var(--primary) 30%, transparent)", fontWeight: 700 }}>
                    {i}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-micro text-primary/25 font-black mt-2">
            ↑ El número debajo = semitono (0-11). En Reaper, las notas en el piano roll van de arriba (agudo) a abajo (grave).
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TeoriaMusicaPage() {
  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: "var(--bg-main)" }}
    >
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <Music size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="font-black text-primary uppercase tracking-widest text-sm">
                Teoría Musical
              </h1>
              <p className="text-micro text-primary/40 font-black uppercase tracking-widest">
                Guía para hacer instrumentales en Reaper
              </p>
            </div>
          </div>
          <p className="text-xs text-primary/50 leading-relaxed mt-4">
            Todo lo que necesitas saber para entender qué notas poner en el piano roll, qué significan las escalas y cómo construir progresiones de acordes. Pensado para producción musical desde cero.
          </p>
        </div>

        {/* Secciones */}
        <SectionCard
          title="Escalas — Qué notas usar"
          icon={<Music size={13} />}
          defaultOpen
          color="#6366f1"
        >
          <EscalasView />
        </SectionCard>

        <SectionCard
          title="Acordes — Notas simultáneas"
          icon={<span style={{ fontSize: 13 }}>🎵</span>}
          color="#f59e0b"
        >
          <AcordesView />
        </SectionCard>

        <SectionCard
          title="Progresiones — El orden de los acordes"
          icon={<span style={{ fontSize: 13 }}>🔄</span>}
          color="#10b981"
        >
          <ProgresionesView />
        </SectionCard>

        <SectionCard
          title="Tips para Reaper — Dónde poner las notas"
          icon={<span style={{ fontSize: 13 }}>🎛️</span>}
          color="#3b82f6"
        >
          <ReaperTipsView />
        </SectionCard>

        {/* Referencia rápida de notas */}
        <SectionCard
          title="Referencia rápida — Nombres de notas"
          icon={<span style={{ fontSize: 13 }}>📋</span>}
          color="#a855f7"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-micro font-black uppercase tracking-widest text-primary/30 pb-2 pr-4">Inglés (Reaper)</th>
                  <th className="text-left text-micro font-black uppercase tracking-widest text-primary/30 pb-2 pr-4">Español</th>
                  <th className="text-left text-micro font-black uppercase tracking-widest text-primary/30 pb-2">Semitono</th>
                </tr>
              </thead>
              <tbody>
                {NOTAS_CROMATICAS.map((nota, i) => (
                  <tr key={i} style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                    <td className="py-2 pr-4 font-black text-primary">{nota}</td>
                    <td className="py-2 pr-4 text-primary/60">{NOTAS_DISPLAY[i]}</td>
                    <td className="py-2 text-primary/30 font-mono">{i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="mt-4 rounded-lg px-4 py-3"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <p className="text-xs text-primary/50">
              En Reaper (y cualquier DAW), las notas se muestran como <strong>C, D, E, F, G, A, B</strong> con <strong>#</strong> (sostenido) o <strong>b</strong> (bemol).
              C# y Db son la misma tecla negra del piano. Los números después (C4, A3) indican la octava — C4 es el Do central.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
