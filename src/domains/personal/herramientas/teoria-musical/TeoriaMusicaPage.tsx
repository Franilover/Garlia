"use client";

import React, { useState, useRef } from "react";

// ── Datos ──────────────────────────────────────────────────────────────────────

const NOTAS    = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTAS_ES = ["Do","Do#","Re","Re#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si"];

const ESCALAS: Record<string, { label: string; intervalos: number[]; descripcion: string; uso: string }> = {
  pentatonica_menor: { label: "Pentatónica Menor", intervalos: [0,3,5,7,10],       descripcion: "5 notas. Difícil sonar mal.",                  uso: "Hip-hop, trap, lo-fi" },
  pentatonica_mayor: { label: "Pentatónica Mayor", intervalos: [0,2,4,7,9],        descripcion: "5 notas brillantes.",                          uso: "Pop, R&B" },
  menor_natural:     { label: "Menor Natural",     intervalos: [0,2,3,5,7,8,10],   descripcion: "Oscura y melancólica. La estándar.",            uso: "Trap, hip-hop, R&B" },
  mayor:             { label: "Mayor",             intervalos: [0,2,4,5,7,9,11],   descripcion: "Alegre y brillante.",                          uso: "Pop, electrónica" },
  blues:             { label: "Blues",             intervalos: [0,3,5,6,7,10],     descripcion: "Pentatónica menor + blue note.",                uso: "Hip-hop, boom bap" },
  menor_armonica:    { label: "Menor Armónica",    intervalos: [0,2,3,5,7,8,11],   descripcion: "Sabor exótico. 7mo elevado.",                  uso: "Cinematic, drill" },
  dorico:            { label: "Dórico",            intervalos: [0,2,3,5,7,9,10],   descripcion: "Menor con 6to elevado. Oscura pero esperanzadora.", uso: "Funk, soul, hip-hop" },
  frigio:            { label: "Frigio",            intervalos: [0,1,3,5,7,8,10],   descripcion: "Muy oscuro. 2do bemol.",                       uso: "Drill, cinematic" },
  lidio:             { label: "Lidio",             intervalos: [0,2,4,6,7,9,11],   descripcion: "Mayor con 4to elevado. Etéreo.",                uso: "Videojuegos, lo-fi" },
  mixolidio:         { label: "Mixolidio",         intervalos: [0,2,4,5,7,9,10],   descripcion: "Mayor con 7mo bemol. Groovy.",                  uso: "Funk, pop" },
  menor_melodica:    { label: "Menor Melódica",    intervalos: [0,2,3,5,7,9,11],   descripcion: "6to y 7mo elevados. Jazzística.",               uso: "Neo-soul, jazz" },
};

const ACORDES: Record<string, { label: string; intervalos: number[]; descripcion: string }> = {
  mayor:      { label: "Mayor",       intervalos: [0,4,7],     descripcion: "Estable, alegre" },
  menor:      { label: "Menor",       intervalos: [0,3,7],     descripcion: "Melancólico" },
  maj7:       { label: "Mayor 7",     intervalos: [0,4,7,11],  descripcion: "Jazzístico, romántico" },
  m7:         { label: "Menor 7",     intervalos: [0,3,7,10],  descripcion: "R&B, lo-fi" },
  dom7:       { label: "Dominante 7", intervalos: [0,4,7,10],  descripcion: "Blues, tensión" },
  sus2:       { label: "Sus2",        intervalos: [0,2,7],     descripcion: "Flotante, abierto" },
  sus4:       { label: "Sus4",        intervalos: [0,5,7],     descripcion: "Pop moderno" },
  disminuido: { label: "Disminuido",  intervalos: [0,3,6],     descripcion: "Muy tenso" },
  aumentado:  { label: "Aumentado",   intervalos: [0,4,8],     descripcion: "Sobrenatural" },
  m9:         { label: "Menor 9",     intervalos: [0,3,7,10,14], descripcion: "Neo-soul, R&B lujoso" },
};

const PROGRESIONES = [
  { label: "I – V – vi – IV",    grados: ["I","V","vi","IV"],      descripcion: "La progresión pop más usada.",             genero: "Pop · EDM · hip-hop" },
  { label: "i – VI – III – VII", grados: ["i","VI","III","VII"],   descripcion: "La progresión de lo-fi y R&B.",            genero: "Lo-fi · R&B · pop" },
  { label: "i – VII – VI – VII", grados: ["i","VII","VI","VII"],   descripcion: "Loop menor clásico.",                      genero: "Trap · oscuro" },
  { label: "i – iv – VII – III", grados: ["i","iv","VII","III"],   descripcion: "Cadencia andaluza. Épica.",                genero: "Drill · cinematic" },
  { label: "I – vi – IV – V",    grados: ["I","vi","IV","V"],      descripcion: "Rock and roll. Atemporal.",                genero: "Pop · indie · baladas" },
  { label: "I – IV – V – IV",    grados: ["I","IV","V","IV"],      descripcion: "Blues clásico. Simple y directa.",         genero: "Blues · boom bap" },
];

const REAPER_TIPS = [
  { titulo: "Piano roll",         texto: "La columna izquierda es un piano. C = Do. El número es la octava (C4 = Do central). Arriba = agudo, abajo = grave." },
  { titulo: "Duración de notas",  texto: "El ancho de la nota = su duración. 1 beat = 1 tiempo. Un compás 4/4 tiene 4 beats." },
  { titulo: "Teclas blancas",     texto: "En Do Mayor o La Menor: solo teclas blancas. Son la misma escala, distinta raíz." },
  { titulo: "Quantize (Q)",       texto: "Presiona Q para cuadrar al grid. Para hip-hop deja un poco fuera para que suene humano." },
  { titulo: "Acordes",            texto: "Varias notas en la misma posición X = acorde. Se tocan simultáneamente." },
  { titulo: "Velocity",           texto: "Barra debajo del PR = intensidad. Hi-hats: 60-80. Kicks y snares: 100-127." },
  { titulo: "Flujo inicial",      texto: "1) BPM  2) Tonalidad  3) Drums  4) Bajo (pentatónica menor)  5) Melodía  6) Acordes." },
  { titulo: "Tonalidades fáciles",texto: "Empieza con Am (La menor) — sus teclas blancas son naturales y fáciles de ver." },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildNotes(rootIdx: number, intervalos: number[]): string[] {
  return intervalos.map((s) => NOTAS[(rootIdx + s) % 12]);
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const S = {
  label: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    color: "color-mix(in srgb, var(--primary) 28%, transparent)",
  } as React.CSSProperties,

  divider: {
    height: "var(--border-width)",
    background: "color-mix(in srgb, var(--primary) 7%, transparent)",
  } as React.CSSProperties,

  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
};

function noteChip(active: boolean): React.CSSProperties {
  return {
    padding: "3px 8px",
    borderRadius: "var(--radius-btn)",
    border: `var(--border-width) solid ${active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
    background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
    color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    transition: "all 0.1s",
    fontFamily: "inherit",
    whiteSpace: "nowrap" as const,
    lineHeight: 1,
  };
}

// ── Piano ──────────────────────────────────────────────────────────────────────

function Piano({ notes, root }: { notes: string[]; root: string }) {
  const WHITES      = ["C","D","E","F","G","A","B"];
  const BLACK_NOTES = ["C#","D#",null,"F#","G#","A#",null];
  const BLACK_X     = [14, 36, 0, 82, 104, 127, 0];
  const noteSet     = new Set(notes);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", display: "inline-flex", height: 52, gap: 1, userSelect: "none" }}>
        {[0, 1].flatMap((oct) =>
          WHITES.map((n, i) => {
            const inScale = noteSet.has(n);
            const isRoot  = n === root;
            return (
              <div key={`w-${oct}-${i}`} style={{
                width: 20, height: 52, borderRadius: "0 0 3px 3px",
                border: S.border,
                background: isRoot   ? "var(--primary)"
                          : inScale  ? "color-mix(in srgb, var(--primary) 16%, var(--white-custom))"
                          :            "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3,
              }}>
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 6.5, fontWeight: 900, lineHeight: 1,
                    color: isRoot ? "var(--bg-main)" : "var(--primary)" }}>{n}</span>
                )}
              </div>
            );
          })
        )}
        {[0, 1].flatMap((oct) =>
          BLACK_NOTES.map((n, i) => {
            if (!n) return null;
            const inScale = noteSet.has(n);
            const isRoot  = n === root;
            return (
              <div key={`b-${oct}-${i}`} style={{
                position: "absolute", left: oct * 147 + BLACK_X[i], top: 0,
                width: 13, height: 33, borderRadius: "0 0 2px 2px", zIndex: 2,
                background: isRoot  ? "var(--primary)"
                          : inScale ? "color-mix(in srgb, var(--primary) 55%, var(--bg-main))"
                          :           "color-mix(in srgb, var(--primary) 68%, var(--bg-main))",
                display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3,
              }}>
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 5, fontWeight: 900, lineHeight: 1,
                    color: "color-mix(in srgb, var(--bg-main) 85%, transparent)" }}>{n}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TeoriaMusicaPage() {
  const [rootIdx,    setRootIdx]    = useState(9); // A
  const [escalaKey,  setEscalaKey]  = useState<keyof typeof ESCALAS>("pentatonica_menor");

  const escala  = ESCALAS[escalaKey];
  const scaleNotes = buildNotes(rootIdx, escala.intervalos);

  const refs = {
    escalas:      useRef<HTMLDivElement>(null),
    acordes:      useRef<HTMLDivElement>(null),
    progresiones: useRef<HTMLDivElement>(null),
    reaper:       useRef<HTMLDivElement>(null),
  };

  const scrollTo = (key: keyof typeof refs) => {
    refs[key].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const NAV = [
    { key: "escalas" as const,      label: "Escalas" },
    { key: "acordes" as const,      label: "Acordes" },
    { key: "progresiones" as const, label: "Progresiones" },
    { key: "reaper" as const,       label: "Reaper" },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg-main)" }}>

      {/* ── Sidebar izquierdo ────────────────────────────────────────────────── */}
      <aside style={{
        width: 168,
        flexShrink: 0,
        borderRight: S.border,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Nav anchors */}
        <div style={{ padding: "12px 10px 8px", borderBottom: S.border }}>
          {NAV.map((n) => (
            <button key={n.key} type="button" onClick={() => scrollTo(n.key)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "6px 8px", marginBottom: 1,
                borderRadius: "var(--radius-btn)", border: "none",
                background: "transparent",
                color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                fontSize: 10, fontWeight: 900, letterSpacing: "0.1em",
                textTransform: "uppercase" as const, cursor: "pointer",
                fontFamily: "inherit", transition: "color 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--primary) 40%, transparent)")}
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* Selector de escala */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          <div style={{ ...S.label, padding: "4px 8px 6px" }}>Escala</div>
          {Object.entries(ESCALAS).map(([key, val]) => (
            <button key={key} type="button" onClick={() => setEscalaKey(key as keyof typeof ESCALAS)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "6px 8px", marginBottom: 1,
                borderRadius: "var(--radius-btn)",
                border: "none",
                borderLeft: `2px solid ${key === escalaKey ? "var(--primary)" : "transparent"}`,
                background: key === escalaKey
                  ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                  : "transparent",
                color: key === escalaKey
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
                fontSize: 10, fontWeight: 900, letterSpacing: "0.05em",
                textTransform: "uppercase" as const, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.1s",
              }}
            >
              {val.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Contenido principal ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* Raíz — sticky */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          padding: "8px 20px",
          borderBottom: S.border,
          background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={S.label}>Raíz</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {NOTAS.map((n, i) => (
              <button key={n} type="button" style={noteChip(i === rootIdx)} onClick={() => setRootIdx(i)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* ── ESCALAS ──────────────────────────────────────────────────────── */}
        <section ref={refs.escalas} style={{ padding: "20px 20px 0" }}>
          <div style={{ ...S.label, marginBottom: 14 }}>Escalas</div>

          {/* Resultado: notas + descripción + piano en fila */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>

            {/* Notas */}
            <div>
              <div style={{ ...S.label, marginBottom: 8 }}>
                {NOTAS[rootIdx]} {escala.label} — {escala.intervalos.length} notas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {scaleNotes.map((n, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{
                      padding: "4px 8px", borderRadius: "var(--radius-btn)",
                      border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
                      background: i === 0 ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                      color: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                      fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" as const,
                    }}>
                      {n}
                    </span>
                    <span style={{ fontSize: 7.5, fontWeight: 700, color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}>
                      {NOTAS_ES[NOTAS.indexOf(n)]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descripción + uso */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.5, margin: 0 }}>
                {escala.descripcion}
              </p>
              <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 35%, transparent)", margin: 0 }}>
                {escala.uso}
              </p>
            </div>
          </div>

          {/* Piano */}
          <div style={{ marginBottom: 20 }}>
            <Piano notes={scaleNotes} root={NOTAS[rootIdx]} />
          </div>
        </section>

        <div style={{ ...S.divider, margin: "0 20px" }} />

        {/* ── ACORDES ──────────────────────────────────────────────────────── */}
        <section ref={refs.acordes} style={{ padding: "20px 20px 0" }}>
          <div style={{ ...S.label, marginBottom: 14 }}>Acordes — raíz: {NOTAS[rootIdx]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 20 }}>
            {Object.entries(ACORDES).map(([key, acorde]) => {
              const notes = buildNotes(rootIdx, acorde.intervalos);
              return (
                <div key={key} style={{
                  padding: "10px 12px",
                  border: S.border,
                  borderRadius: "var(--radius-btn)",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--primary)", marginBottom: 3 }}>
                    {NOTAS[rootIdx]} {acorde.label}
                  </div>
                  <div style={{ fontSize: 9.5, color: "color-mix(in srgb, var(--primary) 32%, transparent)", marginBottom: 7 }}>
                    {acorde.descripcion}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {notes.map((n, i) => (
                      <span key={i} style={{
                        padding: "2px 6px", borderRadius: 4,
                        border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 13%, transparent)"}`,
                        background: i === 0 ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                        color: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 48%, transparent)",
                        fontSize: 9, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const,
                      }}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ ...S.divider, margin: "0 20px" }} />

        {/* ── PROGRESIONES ─────────────────────────────────────────────────── */}
        <section ref={refs.progresiones} style={{ padding: "20px 20px 0" }}>
          <div style={{ ...S.label, marginBottom: 14 }}>Progresiones</div>

          {/* Referencia de grados */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
            {[["I","C"],["II","D"],["III","E"],["IV","F"],["V","G"],["VI","A"],["VII","B"]].map(([g, n]) => (
              <div key={g} style={{
                padding: "3px 8px", border: S.border,
                borderRadius: "var(--radius-btn)", textAlign: "center" as const,
              }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: "var(--primary)", fontFamily: "var(--font-mono, monospace)" }}>{g}</span>
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 30%, transparent)", marginLeft: 5 }}>{n}</span>
              </div>
            ))}
            <span style={{ ...S.label, alignSelf: "center", marginLeft: 4 }}>— en Do Mayor</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginBottom: 20 }}>
            {PROGRESIONES.map((prog, i) => (
              <div key={i} style={{ padding: "10px 12px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 7, flexWrap: "wrap" }}>
                  {prog.grados.map((g, gi) => (
                    <span key={gi} style={{
                      padding: "2px 7px", borderRadius: 4,
                      border: S.border,
                      fontSize: 9, fontWeight: 900,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--primary)",
                    }}>{g}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.4, marginBottom: 4 }}>
                  {prog.descripcion}
                </div>
                <div style={{ ...S.label, fontSize: 8 }}>{prog.genero}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ ...S.divider, margin: "0 20px" }} />

        {/* ── REAPER ───────────────────────────────────────────────────────── */}
        <section ref={refs.reaper} style={{ padding: "20px 20px 0" }}>
          <div style={{ ...S.label, marginBottom: 14 }}>Reaper</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginBottom: 20 }}>
            {REAPER_TIPS.map((tip, i) => (
              <div key={i} style={{ padding: "10px 12px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--primary)", marginBottom: 5 }}>
                  {tip.titulo}
                </div>
                <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 48%, transparent)", lineHeight: 1.5 }}>
                  {tip.texto}
                </div>
              </div>
            ))}
          </div>

          {/* Referencia notas */}
          <div style={{ ...S.label, marginBottom: 8 }}>Inglés / Español</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 24 }}>
            {NOTAS.map((n, i) => (
              <div key={i} style={{
                padding: "4px 8px", border: S.border,
                borderRadius: "var(--radius-btn)", textAlign: "center" as const, minWidth: 48,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: "var(--primary)" }}>{n}</div>
                <div style={{ fontSize: 8.5, color: "color-mix(in srgb, var(--primary) 30%, transparent)", fontWeight: 700 }}>{NOTAS_ES[i]}</div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
