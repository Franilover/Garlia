"use client";

import React, { useState, useRef } from "react";

// ── Datos ──────────────────────────────────────────────────────────────────────

const NOTAS    = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTAS_ES = ["Do","Do#","Re","Re#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si"];

const ESCALAS: Record<string, { label: string; intervalos: number[]; descripcion: string; uso: string; tipo: "mayor" | "menor" | "pentatonica" | "modal" }> = {
  pentatonica_menor: { label: "Pentatónica Menor", intervalos: [0,3,5,7,10],       descripcion: "5 notas. Difícil sonar mal.",                       uso: "Hip-hop, trap, lo-fi",    tipo: "pentatonica" },
  pentatonica_mayor: { label: "Pentatónica Mayor", intervalos: [0,2,4,7,9],        descripcion: "5 notas brillantes.",                               uso: "Pop, R&B",               tipo: "pentatonica" },
  menor_natural:     { label: "Menor Natural",     intervalos: [0,2,3,5,7,8,10],   descripcion: "Oscura y melancólica. La estándar.",                 uso: "Trap, hip-hop, R&B",     tipo: "menor" },
  mayor:             { label: "Mayor",             intervalos: [0,2,4,5,7,9,11],   descripcion: "Alegre y brillante.",                               uso: "Pop, electrónica",       tipo: "mayor" },
  blues:             { label: "Blues",             intervalos: [0,3,5,6,7,10],     descripcion: "Pentatónica menor + blue note.",                     uso: "Hip-hop, boom bap",      tipo: "pentatonica" },
  menor_armonica:    { label: "Menor Armónica",    intervalos: [0,2,3,5,7,8,11],   descripcion: "Sabor exótico. 7mo elevado.",                       uso: "Cinematic, drill",       tipo: "menor" },
  dorico:            { label: "Dórico",            intervalos: [0,2,3,5,7,9,10],   descripcion: "Menor con 6to elevado. Oscura pero esperanzadora.",  uso: "Funk, soul, hip-hop",    tipo: "modal" },
  frigio:            { label: "Frigio",            intervalos: [0,1,3,5,7,8,10],   descripcion: "Muy oscuro. 2do bemol.",                            uso: "Drill, cinematic",       tipo: "modal" },
  lidio:             { label: "Lidio",             intervalos: [0,2,4,6,7,9,11],   descripcion: "Mayor con 4to elevado. Etéreo.",                    uso: "Videojuegos, lo-fi",     tipo: "modal" },
  mixolidio:         { label: "Mixolidio",         intervalos: [0,2,4,5,7,9,10],   descripcion: "Mayor con 7mo bemol. Groovy.",                      uso: "Funk, pop",              tipo: "modal" },
  menor_melodica:    { label: "Menor Melódica",    intervalos: [0,2,3,5,7,9,11],   descripcion: "6to y 7mo elevados. Jazzística.",                   uso: "Neo-soul, jazz",         tipo: "menor" },
};

const ACORDES: Record<string, { label: string; intervalos: number[]; descripcion: string }> = {
  mayor:      { label: "Mayor",       intervalos: [0,4,7],       descripcion: "Estable, alegre" },
  menor:      { label: "Menor",       intervalos: [0,3,7],       descripcion: "Melancólico" },
  maj7:       { label: "Mayor 7",     intervalos: [0,4,7,11],    descripcion: "Jazzístico, romántico" },
  m7:         { label: "Menor 7",     intervalos: [0,3,7,10],    descripcion: "R&B, lo-fi" },
  dom7:       { label: "Dominante 7", intervalos: [0,4,7,10],    descripcion: "Blues, tensión" },
  sus2:       { label: "Sus2",        intervalos: [0,2,7],       descripcion: "Flotante, abierto" },
  sus4:       { label: "Sus4",        intervalos: [0,5,7],       descripcion: "Pop moderno" },
  disminuido: { label: "Disminuido",  intervalos: [0,3,6],       descripcion: "Muy tenso" },
  aumentado:  { label: "Aumentado",   intervalos: [0,4,8],       descripcion: "Sobrenatural" },
  m9:         { label: "Menor 9",     intervalos: [0,3,7,10,14], descripcion: "Neo-soul, R&B lujoso" },
};

const PROGRESIONES = [
  { label: "I – V – vi – IV",    grados: ["I","V","vi","IV"],      descripcion: "La progresión pop más usada.",    genero: "Pop · EDM · hip-hop" },
  { label: "i – VI – III – VII", grados: ["i","VI","III","VII"],   descripcion: "La progresión de lo-fi y R&B.",  genero: "Lo-fi · R&B · pop" },
  { label: "i – VII – VI – VII", grados: ["i","VII","VI","VII"],   descripcion: "Loop menor clásico.",            genero: "Trap · oscuro" },
  { label: "i – iv – VII – III", grados: ["i","iv","VII","III"],   descripcion: "Cadencia andaluza. Épica.",      genero: "Drill · cinematic" },
  { label: "I – vi – IV – V",    grados: ["I","vi","IV","V"],      descripcion: "Rock and roll. Atemporal.",      genero: "Pop · indie · baladas" },
  { label: "I – IV – V – IV",    grados: ["I","IV","V","IV"],      descripcion: "Blues clásico. Simple y directa.", genero: "Blues · boom bap" },
];

const REAPER_TIPS = [
  { titulo: "Piano roll",          texto: "La columna izquierda es un piano. C = Do. El número es la octava (C4 = Do central). Arriba = agudo, abajo = grave." },
  { titulo: "Duración de notas",   texto: "El ancho de la nota = su duración. 1 beat = 1 tiempo. Un compás 4/4 tiene 4 beats." },
  { titulo: "Teclas blancas",      texto: "En Do Mayor o La Menor: solo teclas blancas. Son la misma escala, distinta raíz." },
  { titulo: "Quantize (Q)",        texto: "Presiona Q para cuadrar al grid. Para hip-hop deja un poco fuera para que suene humano." },
  { titulo: "Acordes",             texto: "Varias notas en la misma posición X = acorde. Se tocan simultáneamente." },
  { titulo: "Velocity",            texto: "Barra debajo del PR = intensidad. Hi-hats: 60-80. Kicks y snares: 100-127." },
  { titulo: "Flujo inicial",       texto: "1) BPM  2) Tonalidad  3) Drums  4) Bajo (pentatónica menor)  5) Melodía  6) Acordes." },
  { titulo: "Tonalidades fáciles", texto: "Empieza con Am (La menor) — sus teclas blancas son naturales y fáciles de ver." },
];

// ── Datos de práctica ──────────────────────────────────────────────────────────

type Mood = "oscuro" | "melancólico" | "relajado" | "alegre" | "épico" | "tenso" | "groovy" | "etéreo";
type Genero = "trap" | "lo-fi" | "hip-hop" | "drill" | "r&b" | "pop" | "cinematic" | "funk";

const MOODS: { key: Mood; label: string }[] = [
  { key: "oscuro",      label: "Oscuro" },
  { key: "melancólico", label: "Melancólico" },
  { key: "relajado",    label: "Relajado" },
  { key: "alegre",      label: "Alegre" },
  { key: "épico",       label: "Épico" },
  { key: "tenso",       label: "Tenso" },
  { key: "groovy",      label: "Groovy" },
  { key: "etéreo",      label: "Etéreo" },
];

const GENEROS: { key: Genero; label: string }[] = [
  { key: "trap",      label: "Trap" },
  { key: "lo-fi",     label: "Lo-fi" },
  { key: "hip-hop",   label: "Hip-hop" },
  { key: "drill",     label: "Drill" },
  { key: "r&b",       label: "R&B" },
  { key: "pop",       label: "Pop" },
  { key: "cinematic", label: "Cinematic" },
  { key: "funk",      label: "Funk" },
];

// Mapa mood+género → receta musical
type Receta = {
  escala: keyof typeof ESCALAS;
  escalaAlt?: keyof typeof ESCALAS;
  progresion: number;      // índice en PROGRESIONES
  progresionAlt?: number;
  bpmMin: number;
  bpmMax: number;
  notaMelodia: string[];   // notas clave de la melodía
  notaBajo: string[];      // notas clave del bajo
  consejo: string;
  consejo2?: string;
  acordesDestacados: number[]; // índices de grados diatónicos para usar primero
};

const RECETAS: Partial<Record<Mood, Partial<Record<Genero, Receta>>>> = {
  oscuro: {
    trap:      { escala:"menor_natural",  progresion:2, bpmMin:130, bpmMax:160, notaMelodia:[0,2,3,5],  notaBajo:[0,7],   consejo:"808 en la raíz o la quinta. Hi-hats triples.",             consejo2:"Deja silencio. Lo oscuro respira.", acordesDestacados:[0,2,5] },
    drill:     { escala:"frigio",         progresion:3, bpmMin:140, bpmMax:145, notaMelodia:[0,1,3,7],  notaBajo:[0,5],   consejo:"El 2do bemol (bII) es la nota firma del drill.",             consejo2:"Slide notes en el piano roll.",      acordesDestacados:[0,1,4] },
    cinematic: { escala:"menor_armonica", progresion:3, bpmMin:60,  bpmMax:90,  notaMelodia:[0,2,7,8],  notaBajo:[0,7,8], consejo:"El salto al 7mo elevado = drama instantáneo.",              consejo2:"Cuerdas largas + percusión mínima.", acordesDestacados:[0,3,4] },
    "r&b":     { escala:"menor_natural",  progresion:1, bpmMin:70,  bpmMax:95,  notaMelodia:[0,3,5,7],  notaBajo:[0,5,7], consejo:"Notas largas en la melodía. Deja que el silencio hable.",  consejo2:"m7 y m9 en los acordes.",            acordesDestacados:[0,3,5] },
  },
  melancólico: {
    "lo-fi":   { escala:"menor_natural",  progresion:1, bpmMin:70,  bpmMax:90,  notaMelodia:[0,3,5,7,10], notaBajo:[0,7], consejo:"Samples con vinilo. Humaniza el quantize.",               consejo2:"Usa la 7ma menor (10 semitonos) en la melodía.", acordesDestacados:[0,5,2,3] },
    "hip-hop": { escala:"pentatonica_menor", progresion:1, bpmMin:85, bpmMax:100, notaMelodia:[0,3,5,7], notaBajo:[0,5], consejo:"5 notas es todo lo que necesitas.",                        consejo2:"Loop corto. Repite con variaciones.",  acordesDestacados:[0,2,3] },
    pop:       { escala:"menor_natural",  progresion:0, bpmMin:90,  bpmMax:120, notaMelodia:[0,2,3,5,7], notaBajo:[0,7], consejo:"I–V–vi–IV: pop universal incluso en menor.",               consejo2:"Sube a mayor en el coro para contraste.",        acordesDestacados:[0,4,5,3] },
    trap:      { escala:"menor_natural",  progresion:2, bpmMin:130, bpmMax:150, notaMelodia:[0,3,5,8],  notaBajo:[0,5],  consejo:"La 6ta bemol (8 semitonos) es el sabor melancólico.",     consejo2:"808 largo que decae.",                acordesDestacados:[0,2,5] },
  },
  relajado: {
    "lo-fi":   { escala:"dorico",         progresion:1, bpmMin:65,  bpmMax:85,  notaMelodia:[0,2,3,5,9], notaBajo:[0,7], consejo:"Dórico tiene esa 6ta mayor que da esperanza sin perder suavidad.", consejo2:"Jazz chords: maj7 y m7.", acordesDestacados:[0,3,5] },
    "r&b":     { escala:"menor_melodica", progresion:1, bpmMin:70,  bpmMax:95,  notaMelodia:[0,2,3,7,9], notaBajo:[0,5,7], consejo:"La menor melódica tiene un sabor neo-soul único.",      consejo2:"Snare en 2 y 4, muy suave.",           acordesDestacados:[0,3,4] },
    "hip-hop": { escala:"pentatonica_menor", progresion:1, bpmMin:80, bpmMax:95, notaMelodia:[0,3,5,10], notaBajo:[0,7], consejo:"Pentatónica menor: no puedes sonar mal. Fluye.",           consejo2:"Sample de jazz encima.",              acordesDestacados:[0,2,4] },
    pop:       { escala:"mayor",          progresion:0, bpmMin:90,  bpmMax:115, notaMelodia:[0,2,4,7,9], notaBajo:[0,7], consejo:"Mayor + I–V–vi–IV = hit instantáneo.",                    consejo2:"Pre-coro en vi (relativo menor).",     acordesDestacados:[0,4,5,3] },
  },
  alegre: {
    pop:       { escala:"mayor",          progresion:0, bpmMin:100, bpmMax:130, notaMelodia:[0,2,4,7,9], notaBajo:[0,5,7], consejo:"I–V–vi–IV. El combo ganador del pop.",                  consejo2:"Duplica la melodía una octava arriba para brillo.", acordesDestacados:[0,4,5,3] },
    funk:      { escala:"mixolidio",      progresion:5, bpmMin:95,  bpmMax:120, notaMelodia:[0,2,4,7,9], notaBajo:[0,5],   consejo:"Mixolidio = mayor con 7ma bemol. Groovy y alegre.",       consejo2:"Funk = sincopa. Nota en el 'and' del tiempo.", acordesDestacados:[0,3,4] },
    "hip-hop": { escala:"pentatonica_mayor", progresion:0, bpmMin:85, bpmMax:100, notaMelodia:[0,2,4,7,9], notaBajo:[0,5], consejo:"Pentatónica mayor: todo suena bien. Sampleable.",       consejo2:"Break en el 3er tiempo para swing.",  acordesDestacados:[0,2,3] },
    "r&b":     { escala:"mayor",          progresion:4, bpmMin:90,  bpmMax:110, notaMelodia:[0,4,7,9],   notaBajo:[0,7],   consejo:"I–vi–IV–V: R&B clásico lleno de calidez.",               consejo2:"Falsetto en la melodía principal.",   acordesDestacados:[0,5,3,4] },
  },
  épico: {
    cinematic: { escala:"menor_armonica", progresion:3, bpmMin:60,  bpmMax:100, notaMelodia:[0,2,7,11],  notaBajo:[0,5,7], consejo:"El intervalo de 7ma mayor subiendo = tensión épica.",   consejo2:"Crescendo en capas: cuerdas → percusión → brass.", acordesDestacados:[0,4,3,1] },
    trap:      { escala:"menor_armonica", progresion:2, bpmMin:140, bpmMax:165, notaMelodia:[0,3,7,11],  notaBajo:[0,7],   consejo:"Menor armónica + 808 = épico moderno.",                  consejo2:"Hi-hats en semicorcheas, kick fuerte.", acordesDestacados:[0,4,3] },
    drill:     { escala:"frigio",         progresion:3, bpmMin:140, bpmMax:148, notaMelodia:[0,1,5,7],   notaBajo:[0,5],   consejo:"Frigio da esa sensación de peligro inminente.",          consejo2:"Coros densos, sin espacios.",          acordesDestacados:[0,1,3] },
    "hip-hop": { escala:"menor_natural",  progresion:3, bpmMin:88,  bpmMax:100, notaMelodia:[0,2,5,7],   notaBajo:[0,5,7], consejo:"Cadencia andaluza: i–iv–VII–III. Fuerza y historia.",   consejo2:"Muestra la escala completa en la melodía.", acordesDestacados:[0,3,2,4] },
  },
  tenso: {
    drill:     { escala:"frigio",         progresion:3, bpmMin:140, bpmMax:150, notaMelodia:[0,1,6,7],   notaBajo:[0,1],   consejo:"El tritono (6 semitonos) es la nota más tensa. Úsalo.",  consejo2:"Deja que la nota final quede sin resolver.", acordesDestacados:[0,1,4] },
    cinematic: { escala:"menor_armonica", progresion:3, bpmMin:50,  bpmMax:85,  notaMelodia:[0,6,7,11],  notaBajo:[0,6],   consejo:"Tritono + 7ma mayor = máxima tensión.",                  consejo2:"Pedal tone: nota fija en el bajo, todo encima cambia.", acordesDestacados:[0,4,6] },
    trap:      { escala:"menor_natural",  progresion:2, bpmMin:135, bpmMax:160, notaMelodia:[0,3,6,7],   notaBajo:[0,6],   consejo:"Blue note (6 semitonos) mete incomodidad al trap.",      consejo2:"Silencio repentino como técnica.",    acordesDestacados:[0,2,6] },
    "r&b":     { escala:"menor_melodica", progresion:1, bpmMin:75,  bpmMax:95,  notaMelodia:[0,3,6,9],   notaBajo:[0,6],   consejo:"Menor melódica tiene cromatismo natural.",               consejo2:"Cadencia sin resolver al final del loop.", acordesDestacados:[0,5,4] },
  },
  groovy: {
    funk:      { escala:"dorico",         progresion:1, bpmMin:95,  bpmMax:120, notaMelodia:[0,2,3,7,9], notaBajo:[0,5],   consejo:"Dórico + bajo sincopado = funk perfecto.",               consejo2:"La 6ta mayor de dórico (9 semitonos) es el secreto.", acordesDestacados:[0,3,4] },
    "r&b":     { escala:"mixolidio",      progresion:1, bpmMin:90,  bpmMax:110, notaMelodia:[0,2,4,9,10], notaBajo:[0,7],  consejo:"Mixolidio: mayor con 7ma rebajada. El soul lo usa todo.", consejo2:"Acorde de I7 (dominante 7) crea loop infinito.", acordesDestacados:[0,3,4] },
    "hip-hop": { escala:"pentatonica_menor", escalaAlt:"dorico", progresion:1, bpmMin:88, bpmMax:105, notaMelodia:[0,3,5,7], notaBajo:[0,5,7], consejo:"Alterna pentatónica menor con dórico para variedad.", consejo2:"Sample de soul o funk como base.", acordesDestacados:[0,2,3] },
    pop:       { escala:"mayor",          progresion:0, bpmMin:100, bpmMax:125, notaMelodia:[0,4,7,9],   notaBajo:[0,5,7], consejo:"Pop groovy = mayor + tempo medio + bajos marcados.",     consejo2:"Pre-coro en IV para subir energía.",  acordesDestacados:[0,4,3,5] },
  },
  etéreo: {
    "lo-fi":   { escala:"lidio",          progresion:1, bpmMin:60,  bpmMax:80,  notaMelodia:[0,2,6,9],   notaBajo:[0,7],   consejo:"Lidio tiene el #4 que flota. Es la nota mágica.",        consejo2:"Reverb largo. Las notas se disuelven.", acordesDestacados:[0,3,4] },
    cinematic: { escala:"lidio",          progresion:1, bpmMin:55,  bpmMax:80,  notaMelodia:[0,4,6,9,11], notaBajo:[0,7,4], consejo:"John Williams usa lidio para lo mágico.",               consejo2:"Instrumentos altos: flauta, piano en octava alta.", acordesDestacados:[0,3,4,5] },
    pop:       { escala:"mayor",          progresion:4, bpmMin:80,  bpmMax:105, notaMelodia:[0,4,7,11],  notaBajo:[0,7],   consejo:"Maj7 en cada acorde = pop etéreo instantáneo.",          consejo2:"Dejar el 7mo mayor sin resolver es clave.", acordesDestacados:[0,5,3,4] },
    "r&b":     { escala:"menor_melodica", progresion:1, bpmMin:70,  bpmMax:90,  notaMelodia:[0,2,3,9,11], notaBajo:[0,7],  consejo:"Menor melódica tiene alturas que se sienten fuera de lugar.", consejo2:"Falsetto + voicing abierto.",        acordesDestacados:[0,3,5] },
  },
};

// Función que devuelve la mejor receta dado mood+género, con fallback
function getReceta(mood: Mood, genero: Genero): Receta | null {
  return RECETAS[mood]?.[genero] ?? null;
}

// ── Acordes diatónicos ─────────────────────────────────────────────────────────

const DIATONIC_PATTERNS: Record<string, { calidad: string; tipo: "mayor" | "menor" | "disminuido" | "aumentado" }[]> = {
  mayor: [
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
  ],
  menor_natural: [
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
  ],
  menor_armonica: [
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Aumentado",  tipo: "aumentado" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Disminuido", tipo: "disminuido" },
  ],
  dorico: [
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Mayor",      tipo: "mayor" },
  ],
  frigio: [
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
  ],
  lidio: [
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Menor",      tipo: "menor" },
  ],
  mixolidio: [
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Mayor",      tipo: "mayor" },
  ],
  menor_melodica: [
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Menor",      tipo: "menor" },
    { calidad: "Aumentado",  tipo: "aumentado" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Mayor",      tipo: "mayor" },
    { calidad: "Disminuido", tipo: "disminuido" },
    { calidad: "Disminuido", tipo: "disminuido" },
  ],
};

const TRIAD_INTERVALS: Record<string, number[]> = {
  mayor:      [0, 4, 7],
  menor:      [0, 3, 7],
  disminuido: [0, 3, 6],
  aumentado:  [0, 4, 8],
};

const GRADO_LABELS_MAYOR = ["I","II","III","IV","V","VI","VII"];
const GRADO_LABELS_MENOR = ["i","ii°","III","iv","v","VI","VII"];

// ── Círculo de quintas ─────────────────────────────────────────────────────────

const CIRCLE_KEYS = [
  { note: "C",  idx: 0  },
  { note: "G",  idx: 7  },
  { note: "D",  idx: 2  },
  { note: "A",  idx: 9  },
  { note: "E",  idx: 4  },
  { note: "B",  idx: 11 },
  { note: "F#", idx: 6  },
  { note: "Db", idx: 1  },
  { note: "Ab", idx: 8  },
  { note: "Eb", idx: 3  },
  { note: "Bb", idx: 10 },
  { note: "F",  idx: 5  },
];

function relativeMinor(noteIdx: number): number { return (noteIdx + 9) % 12; }

// ── Intervalos de referencia ───────────────────────────────────────────────────

const INTERVALOS_REF = [
  { semis: 0,  nombre: "Unísono",       abrev: "P1", tipo: "perfecto",   ejemplo: "Do → Do",  descripcion: "La misma nota. Base de todo.", cancion: "Nota repetida" },
  { semis: 1,  nombre: "2da menor",     abrev: "m2", tipo: "disonante",  ejemplo: "Do → Do#", descripcion: "Muy tenso. Horror movie.", cancion: "Psicosis (Herrmann)" },
  { semis: 2,  nombre: "2da mayor",     abrev: "M2", tipo: "suave",      ejemplo: "Do → Re",  descripcion: "Paso natural. Escalar.", cancion: "Happy Birthday (inicio)" },
  { semis: 3,  nombre: "3ra menor",     abrev: "m3", tipo: "consonante", ejemplo: "Do → Mib", descripcion: "Melancólico. Base menor.", cancion: "Smoke on the Water" },
  { semis: 4,  nombre: "3ra mayor",     abrev: "M3", tipo: "consonante", ejemplo: "Do → Mi",  descripcion: "Cálido y brillante. Base mayor.", cancion: "When the Saints..." },
  { semis: 5,  nombre: "4ta justa",     abrev: "P4", tipo: "perfecto",   ejemplo: "Do → Fa",  descripcion: "Estable. Suspenso resuelto.", cancion: "Here Comes the Bride" },
  { semis: 6,  nombre: "Tritono",       abrev: "TT", tipo: "disonante",  ejemplo: "Do → Fa#", descripcion: "El diablo. Máxima tensión.", cancion: "The Simpsons (tema)" },
  { semis: 7,  nombre: "5ta justa",     abrev: "P5", tipo: "perfecto",   ejemplo: "Do → Sol", descripcion: "El más estable. Power chord.", cancion: "Star Wars (fanfarria)" },
  { semis: 8,  nombre: "6ta menor",     abrev: "m6", tipo: "consonante", ejemplo: "Do → Lab", descripcion: "Nostálgico. Romántico oscuro.", cancion: "The Entertainer" },
  { semis: 9,  nombre: "6ta mayor",     abrev: "M6", tipo: "consonante", ejemplo: "Do → La",  descripcion: "Alegre y abierto.", cancion: "My Way (Sinatra)" },
  { semis: 10, nombre: "7ma menor",     abrev: "m7", tipo: "suave",      ejemplo: "Do → Sib", descripcion: "Bluesero. Lo-fi. Groovy.", cancion: "Somewhere Over the Rainbow" },
  { semis: 11, nombre: "7ma mayor",     abrev: "M7", tipo: "disonante",  ejemplo: "Do → Si",  descripcion: "Jazzístico. Elegante.", cancion: "Take On Me (A-ha)" },
  { semis: 12, nombre: "Octava",        abrev: "P8", tipo: "perfecto",   ejemplo: "Do → Do'", descripcion: "La misma nota, arriba.", cancion: "Somewhere Over the Rainbow (inicio)" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildNotes(rootIdx: number, intervalos: number[]): string[] {
  return intervalos.map((s) => NOTAS[(rootIdx + s) % 12]);
}

function getDiatonicChords(rootIdx: number, escalaKey: string) {
  const escala = ESCALAS[escalaKey];
  if (!escala || escala.intervalos.length !== 7) return null;
  const pattern = DIATONIC_PATTERNS[escalaKey];
  if (!pattern) return null;
  const isMenor = ["menor_natural","menor_armonica","menor_melodica"].includes(escalaKey);
  const gradoLabels = isMenor ? GRADO_LABELS_MENOR : GRADO_LABELS_MAYOR;
  return escala.intervalos.map((intervalo, i) => {
    const notaRaiz = (rootIdx + intervalo) % 12;
    const { calidad, tipo } = pattern[i];
    const triada = TRIAD_INTERVALS[tipo] || [0,4,7];
    const notas = triada.map(s => NOTAS[(notaRaiz + s) % 12]);
    return { grado: gradoLabels[i], nota: NOTAS[notaRaiz], calidad, tipo, notas };
  });
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
    padding: "3px 8px", borderRadius: "var(--radius-btn)",
    border: `var(--border-width) solid ${active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
    background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
    color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
    cursor: "pointer", fontSize: 10, fontWeight: 900, letterSpacing: "0.07em",
    textTransform: "uppercase" as const, transition: "all 0.1s",
    fontFamily: "inherit", whiteSpace: "nowrap" as const, lineHeight: 1,
  };
}

// ── Piano ──────────────────────────────────────────────────────────────────────

function Piano({ notes, root, highlight }: { notes: string[]; root: string; highlight?: Set<string> }) {
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
            const isHL    = highlight?.has(n);
            return (
              <div key={`w-${oct}-${i}`} style={{
                width: 20, height: 52, borderRadius: "0 0 3px 3px", border: S.border,
                background: isRoot ? "var(--primary)" : isHL ? "color-mix(in srgb, var(--primary) 30%, var(--white-custom))" : inScale ? "color-mix(in srgb, var(--primary) 16%, var(--white-custom))" : "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
                display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3,
              }}>
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 6.5, fontWeight: 900, lineHeight: 1, color: isRoot ? "var(--bg-main)" : "var(--primary)" }}>{n}</span>
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
            const isHL    = highlight?.has(n);
            return (
              <div key={`b-${oct}-${i}`} style={{
                position: "absolute", left: oct * 147 + BLACK_X[i], top: 0,
                width: 13, height: 33, borderRadius: "0 0 2px 2px", zIndex: 2,
                background: isRoot ? "var(--primary)" : isHL ? "color-mix(in srgb, var(--primary) 40%, var(--bg-main))" : inScale ? "color-mix(in srgb, var(--primary) 55%, var(--bg-main))" : "color-mix(in srgb, var(--primary) 68%, var(--bg-main))",
                display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3,
              }}>
                {(inScale || isRoot) && (
                  <span style={{ fontSize: 5, fontWeight: 900, lineHeight: 1, color: "color-mix(in srgb, var(--bg-main) 85%, transparent)" }}>{n}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Círculo de Quintas SVG ─────────────────────────────────────────────────────

function CirculoQuintas({ rootIdx, onSelect }: { rootIdx: number; onSelect: (idx: number) => void }) {
  const cx = 160, cy = 160, R_outer = 140, R_mid = 100, R_inner = 65;
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <svg viewBox="0 0 320 320" style={{ width: "100%", maxWidth: 320, display: "block" }}>
      <circle cx={cx} cy={cy} r={R_outer + 8} fill="color-mix(in srgb, var(--primary) 3%, transparent)" stroke="color-mix(in srgb, var(--primary) 8%, transparent)" strokeWidth={1} />
      {CIRCLE_KEYS.map((key, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const angleNext = ((i + 1) * 30 - 90) * (Math.PI / 180);
        const midAngle = (i * 30 - 75) * (Math.PI / 180);
        const x1o = cx + R_outer * Math.cos(angle + 0.04); const y1o = cy + R_outer * Math.sin(angle + 0.04);
        const x2o = cx + R_outer * Math.cos(angleNext - 0.04); const y2o = cy + R_outer * Math.sin(angleNext - 0.04);
        const x1m = cx + R_mid * Math.cos(angle + 0.05); const y1m = cy + R_mid * Math.sin(angle + 0.05);
        const x2m = cx + R_mid * Math.cos(angleNext - 0.05); const y2m = cy + R_mid * Math.sin(angleNext - 0.05);
        const isRoot = key.idx === rootIdx;
        const isNeighbor = CIRCLE_KEYS[(i + 1) % 12].idx === rootIdx || CIRCLE_KEYS[(i + 11) % 12].idx === rootIdx;
        const isHov = hovered === i;
        const relIdx = relativeMinor(key.idx); const isRelRoot = relIdx === rootIdx; const relNote = NOTAS[relIdx];
        const txM = cx + (R_outer + R_mid) / 2 * Math.cos(midAngle); const tyM = cy + (R_outer + R_mid) / 2 * Math.sin(midAngle);
        const x1mi = cx + R_mid * Math.cos(angle + 0.05); const y1mi = cy + R_mid * Math.sin(angle + 0.05);
        const x2mi = cx + R_mid * Math.cos(angleNext - 0.05); const y2mi = cy + R_mid * Math.sin(angleNext - 0.05);
        const x1in = cx + R_inner * Math.cos(angle + 0.07); const y1in = cy + R_inner * Math.sin(angle + 0.07);
        const x2in = cx + R_inner * Math.cos(angleNext - 0.07); const y2in = cy + R_inner * Math.sin(angleNext - 0.07);
        const txm = cx + (R_mid + R_inner) / 2 * Math.cos(midAngle); const tym = cy + (R_mid + R_inner) / 2 * Math.sin(midAngle);
        const segFill = isRoot ? "var(--primary)" : isNeighbor ? "color-mix(in srgb, var(--primary) 14%, transparent)" : isHov ? "color-mix(in srgb, var(--primary) 9%, transparent)" : "color-mix(in srgb, var(--primary) 4%, transparent)";
        const minorFill = isRelRoot ? "color-mix(in srgb, var(--primary) 28%, transparent)" : isHov ? "color-mix(in srgb, var(--primary) 7%, transparent)" : "color-mix(in srgb, var(--primary) 2%, transparent)";
        return (
          <g key={key.note} style={{ cursor: "pointer" }} onClick={() => onSelect(key.idx)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <path d={`M ${x1m} ${y1m} A ${R_mid} ${R_mid} 0 0 1 ${x2m} ${y2m} L ${x2o} ${y2o} A ${R_outer} ${R_outer} 0 0 0 ${x1o} ${y1o} Z`} fill={segFill} stroke="color-mix(in srgb, var(--primary) 10%, transparent)" strokeWidth={0.5} />
            <text x={txM} y={tyM} textAnchor="middle" dominantBaseline="middle" fontSize={isRoot ? 11 : 10} fontWeight={900} fill={isRoot ? "var(--bg-main)" : isNeighbor ? "var(--primary)" : "color-mix(in srgb, var(--primary) 70%, transparent)"} style={{ fontFamily: "inherit", userSelect: "none", letterSpacing: "0.03em" }}>{key.note}</text>
            <path d={`M ${x1in} ${y1in} A ${R_inner} ${R_inner} 0 0 1 ${x2in} ${y2in} L ${x2mi} ${y2mi} A ${R_mid} ${R_mid} 0 0 0 ${x1mi} ${y1mi} Z`} fill={minorFill} stroke="color-mix(in srgb, var(--primary) 8%, transparent)" strokeWidth={0.5} />
            <text x={txm} y={tym} textAnchor="middle" dominantBaseline="middle" fontSize={8} fontWeight={700} fill={isRelRoot ? "var(--primary)" : "color-mix(in srgb, var(--primary) 42%, transparent)"} style={{ fontFamily: "inherit", userSelect: "none" }}>{relNote}m</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={R_inner - 4} fill="var(--bg-main)" stroke="color-mix(in srgb, var(--primary) 8%, transparent)" strokeWidth={1} />
      {["CÍRCULO","DE","QUINTAS"].map((t, i) => (
        <text key={t} x={cx} y={cy - 8 + i * 12} textAnchor="middle" fontSize={9} fontWeight={900} fill="color-mix(in srgb, var(--primary) 40%, transparent)" style={{ fontFamily: "inherit", letterSpacing: "0.1em" }}>{t}</text>
      ))}
    </svg>
  );
}

// ── Tab Práctica ───────────────────────────────────────────────────────────────

function TabPractica({ rootIdx, setRootIdx }: { rootIdx: number; setRootIdx: (i: number) => void }) {
  const [mood,   setMood]   = useState<Mood | null>(null);
  const [genero, setGenero] = useState<Genero | null>(null);
  const [bpm,    setBpm]    = useState(90);

  const receta = mood && genero ? getReceta(mood, genero) : null;

  // Notas de la receta
  const escalaRec = receta ? ESCALAS[receta.escala] : null;
  const escalaRecNotas = escalaRec ? buildNotes(rootIdx, escalaRec.intervalos) : [];
  const diatRec = receta ? getDiatonicChords(rootIdx, receta.escala) : null;
  const progRec = receta != null ? PROGRESIONES[receta.progresion] : null;

  // Notas de melodía destacadas (índices de intervalo → notas reales)
  const notasMelodia = receta ? receta.notaMelodia.map(i => NOTAS[(rootIdx + i) % 12]) : [];
  const notasBajo    = receta ? receta.notaBajo.map(i => NOTAS[(rootIdx + i) % 12])    : [];
  const hlSet = new Set([...notasMelodia, ...notasBajo]);

  // BPM limitado a rango sugerido si hay receta
  const bpmMin = receta?.bpmMin ?? 60;
  const bpmMax = receta?.bpmMax ?? 200;

  // Si el BPM actual está fuera del rango sugerido mostramos aviso
  const bpmFuera = receta && (bpm < bpmMin || bpm > bpmMax);

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

      {/* Raíz sticky */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "8px 20px", borderBottom: S.border, background: "color-mix(in srgb, var(--bg-main) 90%, transparent)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={S.label}>Raíz</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {NOTAS.map((n, i) => (
            <button key={n} type="button" style={noteChip(i === rootIdx)} onClick={() => setRootIdx(i)}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 20px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Mood */}
        <div>
          <div style={{ ...S.label, marginBottom: 8 }}>Mood</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {MOODS.map(m => (
              <button key={m.key} type="button"
                onClick={() => setMood(mood === m.key ? null : m.key)}
                style={{
                  padding: "6px 12px", borderRadius: "var(--radius-btn)", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const,
                  transition: "all 0.12s",
                  background: mood === m.key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 7%, transparent)",
                  color: mood === m.key ? "var(--bg-main)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                  outline: mood === m.key ? "none" : `var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)`,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Género */}
        <div>
          <div style={{ ...S.label, marginBottom: 8 }}>Género</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GENEROS.map(g => (
              <button key={g.key} type="button"
                onClick={() => setGenero(genero === g.key ? null : g.key)}
                style={{
                  padding: "7px 14px", borderRadius: "var(--radius-btn)", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 900, letterSpacing: "0.05em",
                  transition: "all 0.12s",
                  background: genero === g.key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 7%, transparent)",
                  color: genero === g.key ? "var(--bg-main)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                  outline: genero === g.key ? "none" : `var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)`,
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* BPM */}
        <div>
          <div style={{ ...S.label, marginBottom: 8 }}>BPM</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input type="range" min={50} max={200} value={bpm} onChange={e => setBpm(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--primary)", cursor: "pointer" }} />
            <span style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)", minWidth: 44, textAlign: "center" as const, fontFamily: "var(--font-mono, monospace)" }}>{bpm}</span>
            {receta && (
              <span style={{ fontSize: 9, color: bpmFuera ? "color-mix(in srgb, #f00 60%, var(--primary))" : "color-mix(in srgb, var(--primary) 35%, transparent)", fontWeight: 700, whiteSpace: "nowrap" as const }}>
                {bpmFuera ? "fuera" : "ok"}<br />{bpmMin}–{bpmMax}
              </span>
            )}
          </div>
        </div>

        {/* ── Sin selección ── */}
        {(!mood || !genero) && (
          <div style={{ padding: "16px 20px", border: S.border, borderRadius: "var(--radius-btn)" }}>
            <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 30%, transparent)", letterSpacing: "0.06em" }}>
              — selecciona mood + género
            </div>
          </div>
        )}

        {/* ── Sin receta para esa combo ── */}
        {mood && genero && !receta && (
          <div style={{ padding: "14px 16px", border: S.border, borderRadius: "var(--radius-btn)" }}>
            <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 40%, transparent)", letterSpacing: "0.04em" }}>
              {mood} + {genero} — sin receta. Prueba otra combinación.
            </div>
          </div>
        )}

        {/* ── RECETA ── */}
        {receta && escalaRec && (
          <>
            {/* Header de la receta */}
            <div style={{ padding: "14px 18px", border: `var(--border-width) solid var(--primary)`, borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--primary)", letterSpacing: "0.04em", marginBottom: 4 }}>
                {NOTAS[rootIdx]} {escalaRec.label}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 9, color: "color-mix(in srgb, var(--primary) 38%, transparent)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                <span>{mood}</span>
                <span>·</span>
                <span>{genero}</span>
                <span>·</span>
                <span>{bpmMin}–{bpmMax} BPM</span>
              </div>
              <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 50%, transparent)", lineHeight: 1.5 }}>
                {escalaRec.descripcion}
              </div>
            </div>

            {/* Notas de la escala + piano */}
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {escalaRecNotas.map((n, i) => {
                  const isMelody = notasMelodia.includes(n);
                  const isBass   = notasBajo.includes(n);
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{
                        padding: "5px 9px", borderRadius: "var(--radius-btn)",
                        border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : isMelody ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`,
                        background: i === 0 ? "var(--primary)" : isMelody ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                        color: i === 0 ? "var(--bg-main)" : isMelody ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                        fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" as const,
                      }}>{n}</span>
                      <span style={{ fontSize: 7, fontWeight: 700, color: "color-mix(in srgb, var(--primary) 22%, transparent)", letterSpacing: "0.04em" }}>
                        {isMelody && isBass ? "mel+bajo" : isMelody ? "melodía" : isBass ? "bajo" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Piano notes={escalaRecNotas} root={NOTAS[rootIdx]} highlight={hlSet} />
            </div>

            {/* Notas de melodía + bajo en dos columnas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "12px 14px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                <div style={{ ...S.label, marginBottom: 8 }}>Notas de melodía</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {notasMelodia.map((n, i) => (
                    <span key={i} style={{ padding: "4px 9px", borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: `var(--border-width) solid var(--primary)`, fontSize: 11, fontWeight: 900, color: "var(--primary)", letterSpacing: "0.06em" }}>{n}</span>
                  ))}
                </div>

              </div>
              <div style={{ padding: "12px 14px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                <div style={{ ...S.label, marginBottom: 8 }}>Notas de bajo / 808</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {notasBajo.map((n, i) => (
                    <span key={i} style={{ padding: "4px 9px", borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 7%, transparent)", border: S.border, fontSize: 11, fontWeight: 900, color: "color-mix(in srgb, var(--primary) 70%, transparent)", letterSpacing: "0.06em" }}>{n}</span>
                  ))}
                </div>

              </div>
            </div>

            {/* Acordes recomendados (diatónicos destacados) */}
            {diatRec && (
              <div>
                <div style={{ ...S.label, marginBottom: 10 }}>Acordes para esta canción</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 7 }}>
                  {receta.acordesDestacados.map((gradoIdx, rank) => {
                    const ch = diatRec[gradoIdx];
                    if (!ch) return null;
                    const isMain = rank === 0;
                    return (
                      <div key={gradoIdx} style={{
                        padding: "10px 12px", borderRadius: "var(--radius-btn)",
                        border: `var(--border-width) solid ${isMain ? "var(--primary)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
                        background: isMain ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: "var(--primary)", fontFamily: "var(--font-mono, monospace)" }}>{ch.grado}</span>
                          {isMain && <span style={{ fontSize: 7.5, fontWeight: 700, color: "color-mix(in srgb, var(--primary) 45%, transparent)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>principal</span>}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "var(--primary)", marginBottom: 5 }}>{ch.nota} {ch.calidad}</div>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {ch.notas.map((n, ni) => (
                            <span key={ni} style={{ fontSize: 8.5, fontWeight: 900, padding: "1px 5px", borderRadius: 3, border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${ni === 0 ? "30" : "10"}%, transparent)`, color: ni === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{n}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progresión recomendada */}
            {progRec && (
              <div style={{ padding: "14px 16px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                <div style={{ ...S.label, marginBottom: 8 }}>Progresión de acordes</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {progRec.grados.map((g, i) => {
                    // Resolver grado a nota real
                    const gradoToIdx: Record<string, number> = { "I":0,"II":1,"III":2,"IV":3,"V":4,"VI":5,"VII":6, "i":0,"ii°":1,"iii":2,"iv":3,"v":4,"vi":5,"vii":6 };
                    const dIdx = gradoToIdx[g] ?? 0;
                    const ch = diatRec?.[dIdx];
                    return (
                      <div key={i} style={{ textAlign: "center" as const }}>
                        <div style={{ padding: "4px 10px", borderRadius: "var(--radius-btn)", border: `var(--border-width) solid var(--primary)`, background: "color-mix(in srgb, var(--primary) 8%, transparent)", fontSize: 11, fontWeight: 900, color: "var(--primary)", fontFamily: "var(--font-mono, monospace)" }}>{g}</div>
                        {ch && <div style={{ fontSize: 8, color: "color-mix(in srgb, var(--primary) 35%, transparent)", marginTop: 2, fontWeight: 700 }}>{ch.nota}</div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)", lineHeight: 1.5 }}>{progRec.descripcion}</div>
              </div>
            )}

            {/* Consejos */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "12px 14px", border: S.border, borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <div style={{ ...S.label, marginBottom: 6 }}>Consejo clave</div>
                <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 60%, transparent)", lineHeight: 1.6 }}>{receta.consejo}</div>
              </div>
              {receta.consejo2 && (
                <div style={{ padding: "12px 14px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                  <div style={{ ...S.label, marginBottom: 6 }}>Detalle de producción</div>
                  <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 60%, transparent)", lineHeight: 1.6 }}>{receta.consejo2}</div>
                </div>
              )}
            </div>

            {/* Flujo sugerido */}
            <div style={{ padding: "14px 16px", border: S.border, borderRadius: "var(--radius-btn)" }}>
              <div style={{ ...S.label, marginBottom: 10 }}>Flujo sugerido en Reaper</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  `BPM: ${bpm}`,
                  `Raíz: ${NOTAS[rootIdx]}`,
                  `Escala: ${escalaRec.label}`,
                  `Drums primero`,
                  `Bajo: ${notasBajo.join(" – ")}`,
                  `Melodía: ${notasMelodia.join(" – ")}`,
                  `Acordes: ${receta.acordesDestacados.slice(0,3).map(i => diatRec?.[i]?.nota + " " + diatRec?.[i]?.calidad).join(" → ")}`,
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", border: `var(--border-width) solid var(--primary)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "var(--primary)", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 55%, transparent)", fontWeight: 600 }}>{step}</span>
                    {i < 6 && <span style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontSize: 10 }}>›</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TeoriaMusicaPage() {
  const [activeTab, setActiveTab] = useState<"teoria" | "practica">("teoria");
  const [rootIdx,   setRootIdx]   = useState(9); // A
  const [escalaKey, setEscalaKey] = useState<keyof typeof ESCALAS>("pentatonica_menor");

  // Transposición
  const [transFromNote,  setTransFromNote]  = useState(5);
  const [transFromScale, setTransFromScale] = useState<"mayor" | "menor">("mayor");
  const [transToNote,    setTransToNote]    = useState(9);
  const [transToScale,   setTransToScale]   = useState<"mayor" | "menor">("menor");

  // Intervalo seleccionado
  const [selInterval, setSelInterval] = useState<number | null>(null);

  const escala       = ESCALAS[escalaKey];
  const scaleNotes   = buildNotes(rootIdx, escala.intervalos);
  const diatonicChords = getDiatonicChords(rootIdx, escalaKey);

  function toAbsolute(noteIdx: number, tipo: "mayor" | "menor"): number {
    return tipo === "menor" ? (noteIdx + 3) % 12 : noteIdx;
  }
  const fromAbs = toAbsolute(transFromNote, transFromScale);
  const toAbs   = toAbsolute(transToNote, transToScale);
  let semitones = toAbs - fromAbs;
  if (semitones > 6)  semitones -= 12;
  if (semitones < -6) semitones += 12;
  const semAbs      = Math.abs(semitones);
  const dirText     = semitones > 0 ? `▲ sube ${semAbs} semitono${semAbs !== 1 ? "s" : ""}` : semitones < 0 ? `▼ baja ${semAbs} semitono${semAbs !== 1 ? "s" : ""}` : "Misma tonalidad";
  const reaperAction = semitones !== 0 ? `Shift+↑/↓ × ${semAbs}` : "Sin cambios";

  const refs = {
    escalas:       useRef<HTMLDivElement>(null),
    acordes:       useRef<HTMLDivElement>(null),
    diatonicos:    useRef<HTMLDivElement>(null),
    circulo:       useRef<HTMLDivElement>(null),
    transposicion: useRef<HTMLDivElement>(null),
    intervalos:    useRef<HTMLDivElement>(null),
    progresiones:  useRef<HTMLDivElement>(null),
    reaper:        useRef<HTMLDivElement>(null),
  };
  const scrollTo = (key: keyof typeof refs) => refs[key].current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const NAV_TEORIA = [
    { key: "escalas" as const,       label: "Escalas" },
    { key: "acordes" as const,       label: "Acordes" },
    { key: "diatonicos" as const,    label: "Diatónicos" },
    { key: "circulo" as const,       label: "Círculo" },
    { key: "transposicion" as const, label: "Transposición" },
    { key: "intervalos" as const,    label: "Intervalos" },
    { key: "progresiones" as const,  label: "Progresiones" },
    { key: "reaper" as const,        label: "Reaper" },
  ];

  const tipoColor: Record<string, string> = {
    mayor:      "var(--primary)",
    menor:      "color-mix(in srgb, var(--primary) 55%, transparent)",
    disminuido: "color-mix(in srgb, var(--primary) 35%, transparent)",
    aumentado:  "color-mix(in srgb, var(--primary) 45%, transparent)",
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg-main)", flexDirection: "column" }}>

      {/* ── Tabs de nivel superior ──────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: S.border, background: "var(--bg-main)", flexShrink: 0 }}>
        {([
          { key: "teoria",   label: "Teoría" },
          { key: "practica", label: "Práctica" },
        ] as const).map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "12px 24px", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" as const,
              background: "transparent", transition: "all 0.12s",
              color: activeTab === tab.key ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
              borderBottom: `2px solid ${activeTab === tab.key ? "var(--primary)" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Cuerpo ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── SIDEBAR — solo en teoría ── */}
        {activeTab === "teoria" && (
          <aside style={{ width: 168, flexShrink: 0, borderRight: S.border, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 10px 8px", borderBottom: S.border }}>
              {NAV_TEORIA.map(n => (
                <button key={n.key} type="button" onClick={() => scrollTo(n.key)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", marginBottom: 1, borderRadius: "var(--radius-btn)", border: "none", background: "transparent", color: "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", transition: "color 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--primary) 40%, transparent)")}
                >{n.label}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              <div style={{ ...S.label, padding: "4px 8px 6px" }}>Escala</div>
              {Object.entries(ESCALAS).map(([key, val]) => (
                <button key={key} type="button" onClick={() => setEscalaKey(key as keyof typeof ESCALAS)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", marginBottom: 1, borderRadius: "var(--radius-btn)", border: "none", borderLeft: `2px solid ${key === escalaKey ? "var(--primary)" : "transparent"}`, background: key === escalaKey ? "color-mix(in srgb, var(--primary) 7%, transparent)" : "transparent", color: key === escalaKey ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: 10, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s" }}
                >{val.label}</button>
              ))}
            </div>
          </aside>
        )}

        {/* ── TAB PRÁCTICA ── */}
        {activeTab === "practica" && (
          <TabPractica rootIdx={rootIdx} setRootIdx={setRootIdx} />
        )}

        {/* ── TAB TEORÍA ── */}
        {activeTab === "teoria" && (
          <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

            {/* Raíz sticky */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "8px 20px", borderBottom: S.border, background: "color-mix(in srgb, var(--bg-main) 90%, transparent)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={S.label}>Raíz</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {NOTAS.map((n, i) => (
                  <button key={n} type="button" style={noteChip(i === rootIdx)} onClick={() => setRootIdx(i)}>{n}</button>
                ))}
              </div>
            </div>

            {/* ── ESCALAS ── */}
            <section ref={refs.escalas} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 14 }}>Escalas</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                <div>
                  <div style={{ ...S.label, marginBottom: 8 }}>{NOTAS[rootIdx]} {escala.label} — {escala.intervalos.length} notas</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {scaleNotes.map((n, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ padding: "4px 8px", borderRadius: "var(--radius-btn)", border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)"}`, background: i === 0 ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{n}</span>
                        <span style={{ fontSize: 7.5, fontWeight: 700, color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}>{NOTAS_ES[NOTAS.indexOf(n)]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.5, margin: 0 }}>{escala.descripcion}</p>
                  <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 35%, transparent)", margin: 0 }}>{escala.uso}</p>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}><Piano notes={scaleNotes} root={NOTAS[rootIdx]} /></div>
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── ACORDES ── */}
            <section ref={refs.acordes} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 14 }}>Acordes — raíz: {NOTAS[rootIdx]}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 20 }}>
                {Object.entries(ACORDES).map(([key, acorde]) => {
                  const notes = buildNotes(rootIdx, acorde.intervalos);
                  return (
                    <div key={key} style={{ padding: "10px 12px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--primary)", marginBottom: 3 }}>{NOTAS[rootIdx]} {acorde.label}</div>
                      <div style={{ fontSize: 9.5, color: "color-mix(in srgb, var(--primary) 32%, transparent)", marginBottom: 7 }}>{acorde.descripcion}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {notes.map((n, i) => (
                          <span key={i} style={{ padding: "2px 6px", borderRadius: 4, border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 13%, transparent)"}`, background: i === 0 ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 48%, transparent)", fontSize: 9, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{n}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── DIATÓNICOS ── */}
            <section ref={refs.diatonicos} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 6 }}>Acordes diatónicos</div>
              <p style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", margin: "0 0 16px", lineHeight: 1.5 }}>Los 7 acordes que <em>nacen</em> de la escala {NOTAS[rootIdx]} {escala.label}.</p>
              {diatonicChords ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 7, marginBottom: 20 }}>
                  {diatonicChords.map((ch, i) => (
                    <div key={i} style={{ padding: "10px 12px", border: `var(--border-width) solid ${i === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`, borderRadius: "var(--radius-btn)", background: i === 0 ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "var(--primary)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1 }}>{ch.grado}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>{i + 1}°</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: tipoColor[ch.tipo], marginBottom: 5, letterSpacing: "0.04em" }}>{ch.nota} {ch.calidad}</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {ch.notas.map((n, ni) => (<span key={ni} style={{ fontSize: 8.5, fontWeight: 900, padding: "1px 5px", borderRadius: 3, border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${ni === 0 ? "30" : "10"}%, transparent)`, color: ni === 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)", letterSpacing: "0.04em" }}>{n}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "14px 16px", marginBottom: 20, border: S.border, borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: 10.5 }}>
                  Solo aplica a escalas de 7 notas. La escala actual tiene {escala.intervalos.length} notas.
                </div>
              )}
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── CÍRCULO ── */}
            <section ref={refs.circulo} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 6 }}>Círculo de quintas</div>
              <p style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", margin: "0 0 16px", lineHeight: 1.5 }}>Toca cualquier tonalidad para cambiar la raíz global. Vecinas = fácil de mezclar.</p>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start", marginBottom: 20 }}>
                <CirculoQuintas rootIdx={rootIdx} onSelect={setRootIdx} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ padding: "12px 14px", border: `var(--border-width) solid var(--primary)`, borderRadius: "var(--radius-btn)", background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                    <div style={{ ...S.label, marginBottom: 6 }}>Activa</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--primary)", marginBottom: 4 }}>{NOTAS[rootIdx]} Mayor</div>
                    <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 55%, transparent)", marginBottom: 8 }}>Relativa menor: <strong style={{ color: "var(--primary)" }}>{NOTAS[relativeMinor(rootIdx)]} menor</strong></div>
                    <div style={{ fontSize: 9.5, color: "color-mix(in srgb, var(--primary) 35%, transparent)", lineHeight: 1.6 }}>
                      Vecina ↑: <strong>{CIRCLE_KEYS[(CIRCLE_KEYS.findIndex(k => k.idx === rootIdx) + 1) % 12]?.note}</strong><br />
                      Vecina ↓: <strong>{CIRCLE_KEYS[(CIRCLE_KEYS.findIndex(k => k.idx === rootIdx) + 11) % 12]?.note}</strong>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                    <div style={{ ...S.label, marginBottom: 6 }}>¿Para qué sirve?</div>
                    <div style={{ fontSize: 9.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", lineHeight: 1.6 }}>
                      Vecinas → modulación suave.<br />Relativa → mismo pool de notas, distinto mood.<br />Opuestas → máximo contraste.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── TRANSPOSICIÓN ── */}
            <section ref={refs.transposicion} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 6 }}>Transposición rápida</div>
              <p style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", margin: "0 0 16px", lineHeight: 1.5 }}>¿Sample en otra tonalidad? Calcula cuántos semitones mover en Reaper.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 16 }}>
                {/* Desde */}
                <div style={{ padding: "14px 16px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                  <div style={{ ...S.label, marginBottom: 10 }}>Desde</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 10 }}>
                    {NOTAS.map((n, i) => (<button key={n} type="button" onClick={() => setTransFromNote(i)} style={noteChip(i === transFromNote)}>{n}</button>))}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["mayor","menor"] as const).map(t => (<button key={t} type="button" onClick={() => setTransFromScale(t)} style={{ ...noteChip(transFromScale === t), textTransform: "capitalize" as const }}>{t}</button>))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: "var(--primary)" }}>{NOTAS[transFromNote]} {transFromScale === "mayor" ? "Mayor" : "Menor"}</div>
                </div>
                <div style={{ textAlign: "center" as const, color: "color-mix(in srgb, var(--primary) 30%, transparent)", fontSize: 20 }}>→</div>
                {/* Hasta */}
                <div style={{ padding: "14px 16px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                  <div style={{ ...S.label, marginBottom: 10 }}>Hasta</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 10 }}>
                    {NOTAS.map((n, i) => (<button key={n} type="button" onClick={() => setTransToNote(i)} style={noteChip(i === transToNote)}>{n}</button>))}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["mayor","menor"] as const).map(t => (<button key={t} type="button" onClick={() => setTransToScale(t)} style={{ ...noteChip(transToScale === t), textTransform: "capitalize" as const }}>{t}</button>))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: "var(--primary)" }}>{NOTAS[transToNote]} {transToScale === "mayor" ? "Mayor" : "Menor"}</div>
                </div>
              </div>
              <div style={{ padding: "14px 18px", marginBottom: 20, border: `var(--border-width) solid ${semitones !== 0 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`, borderRadius: "var(--radius-btn)", background: semitones !== 0 ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ ...S.label, marginBottom: 4 }}>Resultado</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "var(--primary)", marginBottom: 2 }}>{dirText}</div>
                  {semitones !== 0 && <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>Intervalo: {INTERVALOS_REF[semAbs]?.nombre}</div>}
                </div>
                <div>
                  <div style={{ ...S.label, marginBottom: 4 }}>En Reaper</div>
                  <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.6 }}>
                    {reaperAction}
                    {semitones !== 0 && <><br /><span style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontSize: 9 }}>O: F2 → Pitch adjust: {semitones > 0 ? "+" : ""}{semitones}</span></>}
                  </div>
                </div>
              </div>
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── INTERVALOS ── */}
            <section ref={refs.intervalos} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 6 }}>Referencia de intervalos</div>
              <p style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 45%, transparent)", margin: "0 0 14px", lineHeight: 1.5 }}>Distancia entre dos notas. Haz clic para ver la canción de referencia.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6, marginBottom: 20 }}>
                {INTERVALOS_REF.map(iv => {
                  const tipoMap: Record<string,string> = { perfecto: "var(--primary)", consonante: "color-mix(in srgb, var(--primary) 65%, transparent)", suave: "color-mix(in srgb, var(--primary) 48%, transparent)", disonante: "color-mix(in srgb, var(--primary) 32%, transparent)" };
                  const isSel = selInterval === iv.semis;
                  return (
                    <div key={iv.semis} onClick={() => setSelInterval(isSel ? null : iv.semis)} style={{ padding: "10px 12px", border: `var(--border-width) solid ${isSel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`, borderRadius: "var(--radius-btn)", background: isSel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent", cursor: "pointer", transition: "all 0.1s" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: tipoMap[iv.tipo], fontFamily: "var(--font-mono, monospace)", lineHeight: 1 }}>{iv.abrev}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>+{iv.semis}st</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: tipoMap[iv.tipo], marginLeft: "auto", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{iv.tipo}</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "var(--primary)", marginBottom: 3 }}>{iv.nombre}</div>
                      <div style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 30%, transparent)", marginBottom: 5, fontFamily: "var(--font-mono, monospace)" }}>{iv.ejemplo}</div>
                      <div style={{ fontSize: 9.5, color: "color-mix(in srgb, var(--primary) 50%, transparent)", lineHeight: 1.45 }}>{iv.descripcion}</div>
                      {isSel && <div style={{ marginTop: 6, padding: "5px 8px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderRadius: 4, fontSize: 9, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.5 }}>{iv.cancion}</div>}
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── PROGRESIONES ── */}
            <section ref={refs.progresiones} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 14 }}>Progresiones</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                {[["I","C"],["II","D"],["III","E"],["IV","F"],["V","G"],["VI","A"],["VII","B"]].map(([g, n]) => (
                  <div key={g} style={{ padding: "3px 8px", border: S.border, borderRadius: "var(--radius-btn)", textAlign: "center" as const }}>
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
                      {prog.grados.map((g, gi) => (<span key={gi} style={{ padding: "2px 7px", borderRadius: 4, border: S.border, fontSize: 9, fontWeight: 900, fontFamily: "var(--font-mono, monospace)", color: "var(--primary)" }}>{g}</span>))}
                    </div>
                    <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 55%, transparent)", lineHeight: 1.4, marginBottom: 4 }}>{prog.descripcion}</div>
                    <div style={{ ...S.label, fontSize: 8 }}>{prog.genero}</div>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ ...S.divider, margin: "0 20px" }} />

            {/* ── REAPER ── */}
            <section ref={refs.reaper} style={{ padding: "20px 20px 0" }}>
              <div style={{ ...S.label, marginBottom: 14 }}>Reaper</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginBottom: 20 }}>
                {REAPER_TIPS.map((tip, i) => (
                  <div key={i} style={{ padding: "10px 12px", border: S.border, borderRadius: "var(--radius-btn)" }}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--primary)", marginBottom: 5 }}>{tip.titulo}</div>
                    <div style={{ fontSize: 10.5, color: "color-mix(in srgb, var(--primary) 48%, transparent)", lineHeight: 1.5 }}>{tip.texto}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...S.label, marginBottom: 8 }}>Inglés / Español</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 24 }}>
                {NOTAS.map((n, i) => (
                  <div key={i} style={{ padding: "4px 8px", border: S.border, borderRadius: "var(--radius-btn)", textAlign: "center" as const, minWidth: 48 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "var(--primary)" }}>{n}</div>
                    <div style={{ fontSize: 8.5, color: "color-mix(in srgb, var(--primary) 30%, transparent)", fontWeight: 700 }}>{NOTAS_ES[i]}</div>
                  </div>
                ))}
              </div>
            </section>

          </main>
        )}
      </div>
    </div>
  );
}
