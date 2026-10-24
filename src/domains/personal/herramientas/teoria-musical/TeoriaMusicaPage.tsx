"use client";

import React, { useState } from "react";

// ── Datos ──────────────────────────────────────────────────────────────────────

const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTAS_ES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

const ESCALAS: Record<string, { label: string; intervalos: number[]; descripcion: string; uso: string }> = {
  pentatonica_menor: { label: "Pentatónica Menor", intervalos: [0, 3, 5, 7, 10], descripcion: "5 notas. La más usada en hip-hop y trap. Difícil sonar mal.", uso: "Hip-hop, trap, lo-fi. Empieza aquí." },
  pentatonica_mayor: { label: "Pentatónica Mayor", intervalos: [0, 2, 4, 7, 9], descripcion: "5 notas brillantes. Cualquier combinación funciona.", uso: "Pop, R&B, beats luminosos." },
  menor_natural:     { label: "Menor Natural",     intervalos: [0, 2, 3, 5, 7, 8, 10], descripcion: "Oscura y melancólica. La escala menor estándar.", uso: "Trap, hip-hop oscuro, R&B." },
  mayor:             { label: "Mayor",             intervalos: [0, 2, 4, 5, 7, 9, 11], descripcion: "Alegre y brillante. La escala más común.", uso: "Pop, electrónica, melodías principales." },
  blues:             { label: "Blues",             intervalos: [0, 3, 5, 6, 7, 10], descripcion: "Pentatónica menor con la 'blue note'. Cruda y con alma.", uso: "Hip-hop con groove, boom bap." },
  menor_armonica:    { label: "Menor Armónica",    intervalos: [0, 2, 3, 5, 7, 8, 11], descripcion: "Sabor exótico y dramático. 7mo elevado.", uso: "Cinematic, drill, beats oscuros." },
  dorico:            { label: "Dórico",            intervalos: [0, 2, 3, 5, 7, 9, 10], descripcion: "Menor con 6to elevado. Oscura pero con esperanza.", uso: "Funk, soul, hip-hop groovy." },
  frigio:            { label: "Frigio",            intervalos: [0, 1, 3, 5, 7, 8, 10], descripcion: "Muy oscuro, sabor flamenco. 2do bemol.", uso: "Drill, beats árabes/cinematics." },
  lidio:             { label: "Lidio",             intervalos: [0, 2, 4, 6, 7, 9, 11], descripcion: "Mayor con 4to elevado. Mágico y etéreo.", uso: "Videojuegos, cinematic, lo-fi dreamy." },
  mixolidio:         { label: "Mixolidio",         intervalos: [0, 2, 4, 5, 7, 9, 10], descripcion: "Mayor con 7mo bemol. Rockero y blues-y.", uso: "Funk, pop, riffs con groove." },
  menor_melodica:    { label: "Menor Melódica",    intervalos: [0, 2, 3, 5, 7, 9, 11], descripcion: "6to y 7mo elevados. Fluida y jazzística.", uso: "Neo-soul, jazz, melodías vocales." },
};

const ACORDES: Record<string, { label: string; intervalos: number[]; descripcion: string }> = {
  mayor:       { label: "Mayor",          intervalos: [0, 4, 7],     descripcion: "Estable, alegre." },
  menor:       { label: "Menor",          intervalos: [0, 3, 7],     descripcion: "Melancólico, suave." },
  disminuido:  { label: "Disminuido",     intervalos: [0, 3, 6],     descripcion: "Tenso, inestable." },
  aumentado:   { label: "Aumentado",      intervalos: [0, 4, 8],     descripcion: "Muy tenso." },
  maj7:        { label: "Mayor 7",        intervalos: [0, 4, 7, 11], descripcion: "Jazzístico, romántico." },
  m7:          { label: "Menor 7",        intervalos: [0, 3, 7, 10], descripcion: "R&B, lo-fi. Muy usado." },
  dom7:        { label: "Dominante 7",    intervalos: [0, 4, 7, 10], descripcion: "Blues, necesita resolver." },
  sus2:        { label: "Sus2",           intervalos: [0, 2, 7],     descripcion: "Flotante, abierto." },
  sus4:        { label: "Sus4",           intervalos: [0, 5, 7],     descripcion: "Pop moderno, suspensión." },
  m9:          { label: "Menor 9",        intervalos: [0, 3, 7, 10, 14], descripcion: "Neo-soul, R&B lujoso." },
};

const PROGRESIONES = [
  { label: "I – V – vi – IV",   grados: ["I","V","vi","IV"],    descripcion: "La progresión pop más usada del mundo.",           genero: "Pop, EDM, hip-hop" },
  { label: "i – VII – VI – VII", grados: ["i","VII","VI","VII"], descripcion: "Menor clásica. Loop infinito que funciona siempre.", genero: "Trap, R&B oscuro" },
  { label: "i – VI – III – VII", grados: ["i","VI","III","VII"], descripcion: "La progresión de lo-fi y R&B moderno.",            genero: "Lo-fi, R&B, pop" },
  { label: "i – iv – VII – III", grados: ["i","iv","VII","III"], descripcion: "Cadencia andaluza. Sonido épico y flamenco.",       genero: "Drill, cinematic" },
  { label: "I – vi – IV – V",   grados: ["I","vi","IV","V"],    descripcion: "Rock and roll clásico. Atemporal.",                 genero: "Pop, indie, baladas" },
  { label: "I – IV – V – IV",   grados: ["I","IV","V","IV"],    descripcion: "Progresión blues. Simple y directa.",               genero: "Blues, boom bap" },
];

const REAPER_TIPS = [
  { titulo: "El piano roll",      texto: "La columna izquierda es un piano. C = Do. El número es la octava (C4 = Do central). Arriba = agudo, abajo = grave." },
  { titulo: "Duración de notas",  texto: "El ancho de la nota en el piano roll = su duración. 1 beat = 1 tiempo. Un compás de 4/4 tiene 4 beats." },
  { titulo: "Solo teclas blancas", texto: "En Do Mayor o La Menor Natural: solo usa las teclas BLANCAS. Son la misma escala, distinta raíz." },
  { titulo: "Quantize (Q)",       texto: "Presiona Q para cuadrar las notas al grid. Para hip-hop humano, deja un poco 'fuera'. Para electrónica: todo cuadrado." },
  { titulo: "Acordes en el PR",   texto: "Varias notas en la misma posición horizontal = acorde. Se tocan a la vez. Diferentes alturas Y = diferentes notas." },
  { titulo: "Velocity",           texto: "La barra debajo del PR = intensidad. Hi-hats: 60-80. Kicks y snares: 100-127. Varía para que suene humano." },
  { titulo: "Flujo recomendado",  texto: "1) Elige BPM. 2) Decide tonalidad. 3) Drums. 4) Bajo con pentatónica menor. 5) Melodía. 6) Acordes encima." },
  { titulo: "Tonalidades fáciles", texto: "Empieza con Am (La menor) o Cm (Do menor) — sus teclas blancas son naturales y fáciles de visualizar." },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildNotes(rootIdx: number, intervalos: number[]): string[] {
  return intervalos.map((s) => NOTAS[(rootIdx + s) % 12]);
}

// ── Estilos base ───────────────────────────────────────────────────────────────

const chip = (active: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: "var(--radius-btn)",
  border: `var(--border-width) solid ${active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
  background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
  color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  transition: "all 0.12s",
  fontFamily: "inherit",
  whiteSpace: "nowrap" as const,
});

const divider: React.CSSProperties = {
  height: "var(--border-width)",
  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
};

const label: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.25em",
  textTransform: "uppercase" as const,
  color: "color-mix(in srgb, var(--primary) 30%, transparent)",
  fontFamily: "inherit",
};

// ── Piano Visual ───────────────────────────────────────────────────────────────

function PianoVisual({ notes, root }: { notes: string[]; root: string }) {
  const WHITES = ["C","D","E","F","G","A","B"];
  const BLACK_POS = [0.67, 1.67, 0, 3.67, 4.67, 5.67, 0]; // offset multiplier
  const BLACK_NOTES = ["C#","D#",null,"F#","G#","A#",null];
  const noteSet = new Set(notes.flatMap((n) => [n]));

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ position: "relative", display: "inline-flex", height: 60, gap: 1, userSelect: "none" }}>
        {[0, 1].flatMap((oct) =>
          WHITES.map((n, i) => {
            const inScale = noteSet.has(n);
            const isRoot = n === root;
            return (
              <div
                key={`w-${oct}-${i}`}
                style={{
                  width: 22,
                  height: 60,
                  borderRadius: "0 0 3px 3px",
                  border: `var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)`,
                  background: isRoot
                    ? "var(--primary)"
                    : inScale
                    ? "color-mix(in srgb, var(--primary) 18%, var(--white-custom))"
                    : "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: 3,
                }}
              >
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 7, fontWeight: 900, color: isRoot ? "var(--bg-main)" : "var(--primary)", lineHeight: 1 }}>
                    {n}
                  </span>
                )}
              </div>
            );
          })
        )}
        {/* Black keys */}
        {[0, 1].flatMap((oct) =>
          BLACK_NOTES.map((n, i) => {
            if (!n) return null;
            const inScale = noteSet.has(n);
            const isRoot = n === root;
            const xOffsets = [14, 36, 0, 82, 104, 127, 0];
            const x = oct * 161 + xOffsets[i];
            return (
              <div
                key={`b-${oct}-${i}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: 0,
                  width: 14,
                  height: 37,
                  borderRadius: "0 0 2px 2px",
                  background: isRoot
                    ? "var(--primary)"
                    : inScale
                    ? "color-mix(in srgb, var(--primary) 55%, var(--bg-main))"
                    : "color-mix(in srgb, var(--primary) 70%, var(--bg-main))",
                  zIndex: 2,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: 3,
                }}
              >
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 5.5, fontWeight: 900, color: "color-mix(in srgb, var(--bg-main) 90%, transparent)", lineHeight: 1 }}>
                    {n}
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

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = "escalas" | "acordes" | "progresiones" | "reaper";
const TABS: { key: Tab; label: string }[] = [
  { key: "escalas",      label: "Escalas" },
  { key: "acordes",      label: "Acordes" },
  { key: "progresiones", label: "Progresiones" },
  { key: "reaper",       label: "Reaper" },
];

// ── Vista Escalas ──────────────────────────────────────────────────────────────

function EscalasView() {
  const [rootIdx, setRootIdx] = useState(9); // A
  const [escalaKey, setEscalaKey] = useState<keyof typeof ESCALAS>("pentatonica_menor");
  const escala = ESCALAS[escalaKey];
  const notes = buildNotes(rootIdx, escala.intervalos);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, height: "100%" }}>
      {/* Left: escala selector */}
      <div style={{ borderRight: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)", overflowY: "auto" }}>
        <div style={{ padding: "12px 12px 8px", ...label }}>Escala</div>
        {Object.entries(ESCALAS).map(([key, val]) => (
          <button
            key={key}
            type="button"
            onClick={() => setEscalaKey(key as keyof typeof ESCALAS)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: key === escalaKey ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
              color: key === escalaKey ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
              borderLeft: `2px solid ${key === escalaKey ? "var(--primary)" : "transparent"}`,
              cursor: "pointer",
              border: "none",
              borderLeftWidth: 2,
              borderLeftStyle: "solid",
              borderLeftColor: key === escalaKey ? "var(--primary)" : "transparent",
              transition: "all 0.1s",
              fontFamily: "inherit",
            }}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Right: content */}
      <div style={{ overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Root selector */}
        <div>
          <div style={{ ...label, marginBottom: 8 }}>Raíz</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {NOTAS.map((n, i) => (
              <button key={n} type="button" style={chip(i === rootIdx)} onClick={() => setRootIdx(i)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={divider} />

        {/* Result row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>
              {NOTAS[rootIdx]} {escala.label} — {escala.intervalos.length} notas
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "var(--radius-btn)",
                      border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 18%, transparent)"}`,
                      background: i === 0 ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                      color: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {n}
                  </span>
                  <span style={{ ...label, fontSize: 8 }}>{NOTAS_ES[NOTAS.indexOf(n.split("/")[0])]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>Descripción</div>
            <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 60%, transparent)", lineHeight: 1.5, marginBottom: 8 }}>
              {escala.descripcion}
            </p>
            <div style={{ ...label, marginBottom: 4 }}>Uso</div>
            <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 45%, transparent)", lineHeight: 1.5 }}>
              {escala.uso}
            </p>
          </div>
        </div>

        <div style={divider} />

        {/* Piano */}
        <div>
          <div style={{ ...label, marginBottom: 8 }}>Piano — notas resaltadas</div>
          <PianoVisual notes={notes} root={NOTAS[rootIdx]} />
        </div>
      </div>
    </div>
  );
}

// ── Vista Acordes ──────────────────────────────────────────────────────────────

function AcordesView() {
  const [rootIdx, setRootIdx] = useState(9);

  return (
    <div style={{ overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ ...label, marginBottom: 8 }}>Raíz</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {NOTAS.map((n, i) => (
            <button key={n} type="button" style={chip(i === rootIdx)} onClick={() => setRootIdx(i)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={divider} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {Object.entries(ACORDES).map(([key, acorde]) => {
          const notes = buildNotes(rootIdx, acorde.intervalos);
          return (
            <div
              key={key}
              style={{
                padding: "12px 14px",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-btn)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--primary)", marginBottom: 4 }}>
                {NOTAS[rootIdx]} {acorde.label}
              </div>
              <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 35%, transparent)", marginBottom: 8 }}>
                {acorde.descripcion}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {notes.map((n, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "2px 7px",
                      border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      color: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                      background: i === 0 ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista Progresiones ─────────────────────────────────────────────────────────

function ProgresionesView() {
  return (
    <div style={{ overflowY: "auto", padding: "16px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
        {PROGRESIONES.map((prog, i) => (
          <div
            key={i}
            style={{
              padding: "14px 16px",
              border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "var(--radius-btn)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              {prog.grados.map((g, gi) => (
                <React.Fragment key={gi}>
                  <span
                    style={{
                      padding: "2px 7px",
                      border: "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 900,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--primary)",
                    }}
                  >
                    {g}
                  </span>
                  {gi < prog.grados.length - 1 && (
                    <span style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontWeight: 900 }}>—</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 60%, transparent)", lineHeight: 1.4, marginBottom: 6 }}>
              {prog.descripcion}
            </div>
            <div style={{ ...label, fontSize: 8 }}>{prog.genero}</div>
          </div>
        ))}
      </div>

      <div style={{ ...divider, margin: "16px 0" }} />

      {/* Grados explicados */}
      <div>
        <div style={{ ...label, marginBottom: 10 }}>Grados en Do Mayor como ejemplo</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[["I","C","Do"],["II","D","Re"],["III","E","Mi"],["IV","F","Fa"],["V","G","Sol"],["VI","A","La"],["VII","B","Si"]].map(([g, en, es]) => (
            <div key={g} style={{ padding: "6px 10px", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: "var(--radius-btn)", textAlign: "center" as const }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: "var(--primary)", fontFamily: "var(--font-mono, monospace)" }}>{g}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: "color-mix(in srgb, var(--primary) 60%, transparent)", marginTop: 2 }}>{en} / {es}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Vista Reaper ───────────────────────────────────────────────────────────────

function ReaperView() {
  return (
    <div style={{ overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {REAPER_TIPS.map((tip, i) => (
          <div
            key={i}
            style={{
              padding: "12px 14px",
              border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "var(--radius-btn)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--primary)", marginBottom: 6 }}>
              {tip.titulo}
            </div>
            <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 50%, transparent)", lineHeight: 1.5 }}>
              {tip.texto}
            </div>
          </div>
        ))}
      </div>

      <div style={divider} />

      {/* Referencia notas */}
      <div>
        <div style={{ ...label, marginBottom: 10 }}>Notas: inglés / español</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {NOTAS.map((n, i) => (
            <div
              key={i}
              style={{
                padding: "5px 10px",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-btn)",
                textAlign: "center" as const,
                minWidth: 52,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 900, color: "var(--primary)" }}>{n}</div>
              <div style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontWeight: 700 }}>{NOTAS_ES[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function TeoriaMusicaPage() {
  const [tab, setTab] = useState<Tab>("escalas");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-main)" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 16px",
          borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
          flexShrink: 0,
          height: 40,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "4px 12px",
              height: 28,
              borderRadius: "var(--radius-btn)",
              border: `var(--border-width) solid ${tab === t.key ? "var(--primary)" : "transparent"}`,
              background: tab === t.key ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
              color: tab === t.key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              transition: "all 0.12s",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "escalas"      && <EscalasView />}
        {tab === "acordes"      && <AcordesView />}
        {tab === "progresiones" && <ProgresionesView />}
        {tab === "reaper"       && <ReaperView />}
      </div>
    </div>
  );
}
