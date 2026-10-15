"use client";
/**
 * GeneradorNombres.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Generador configurable de palabras y nombres basado en el inventario
 * fonémico almacenado en Supabase (tabla idiomas_fonemas).
 *
 * Características:
 *  • Usa exclusivamente los fonemas del idioma seleccionado.
 *  • Patrones silábicos configurables (CV, CVC, CVCC, etc.).
 *  • Semilla reproducible para resultados idempotentes.
 *  • Explica qué fonemas usó en cada palabra generada.
 *  • Permite guardar una propuesta como borrador al léxico.
 *  • Nunca guarda automáticamente como canon.
 *  • Detecta y avisa si el inventario fonémico está incompleto.
 */
import {
  Copy, Dice5, Info, Loader2, Plus,
  RefreshCw, Save, Settings2, Wand2,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { useFonemas, useLexemas } from "./useIdiomas";
import type { IdiomaFonema, CategoriaGramatical } from "./types";

// ── PRNG reproducible (mulberry32) ───────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Tipos internos ────────────────────────────────────────────────────────

type SyllablePattern = string; // ej: "CV", "CVC", "CVCC", "CCV"

export interface ResultadoGenerado {
  palabra: string;          // la palabra completa
  silabas: string[];        // sílabas individuales
  fonemasPorSilaba: string[][]; // qué fonema usó en cada posición
  patron: string;           // patrón silábico usado
}

interface ConfigGenerador {
  patrones: SyllablePattern[];
  minSilabas: number;
  maxSilabas: number;
  cantidad: number;
  categoria: CategoriaGramatical | "";
  semilla: number;
  // Opciones fonotácticas básicas
  permitirConsonantesIgualesAdyacentes: boolean;
}

const CONFIG_DEFAULT: ConfigGenerador = {
  patrones: ["CV", "CVC", "CVCC"],
  minSilabas: 1,
  maxSilabas: 3,
  cantidad: 10,
  categoria: "",
  semilla: 42,
  permitirConsonantesIgualesAdyacentes: false,
};

const CATS_GRAM: { value: CategoriaGramatical | ""; label: string }[] = [
  { value: "", label: "General" },
  { value: "sustantivo", label: "Sustantivo" },
  { value: "verbo", label: "Verbo" },
  { value: "adjetivo", label: "Adjetivo" },
  { value: "pronombre", label: "Pronombre" },
  { value: "partícula", label: "Partícula" },
];

const PATRONES_SUGERIDOS = [
  "V", "CV", "VC", "CVC", "CVV", "CCV", "CVCC", "CCVC", "CVVC",
];

// ── Algoritmo de generación ───────────────────────────────────────────────

function generarPalabras(
  consonantes: IdiomaFonema[],
  vocales: IdiomaFonema[],
  config: ConfigGenerador,
): ResultadoGenerado[] {
  if (consonantes.length === 0 && vocales.length === 0) return [];

  const rng = mulberry32(config.semilla);
  const resultados: ResultadoGenerado[] = [];

  for (let i = 0; i < config.cantidad; i++) {
    const nSilabas = randomInt(rng, config.minSilabas, config.maxSilabas);
    const silabas: string[] = [];
    const fonemasPorSilaba: string[][] = [];
    let valida = true;

    for (let s = 0; s < nSilabas; s++) {
      const patron = pick(rng, config.patrones);
      let silaba = "";
      const fonemasSilaba: string[] = [];

      for (const pos of patron) {
        if (pos === "C") {
          if (consonantes.length === 0) { valida = false; break; }
          const f = pick(rng, consonantes);

          // Restricción: no consonantes iguales adyacentes
          if (!config.permitirConsonantesIgualesAdyacentes) {
            const last = fonemasSilaba.at(-1) ?? silabas.at(-1)?.slice(-1);
            if (f.simbolo === last) {
              // reintento una vez con otro fonema diferente
              const alt = consonantes.find((c) => c.simbolo !== last);
              const elegido = alt ?? f;
              silaba += elegido.simbolo;
              fonemasSilaba.push(elegido.simbolo);
              continue;
            }
          }
          silaba += f.simbolo;
          fonemasSilaba.push(f.simbolo);
        } else if (pos === "V") {
          if (vocales.length === 0) { valida = false; break; }
          const f = pick(rng, vocales);
          silaba += f.simbolo;
          fonemasSilaba.push(f.simbolo);
        }
      }

      if (!valida) break;
      silabas.push(silaba);
      fonemasPorSilaba.push(fonemasSilaba);
    }

    if (valida && silabas.length > 0) {
      resultados.push({
        palabra: silabas.join(""),
        silabas,
        fonemasPorSilaba,
        patron: Array.from({ length: nSilabas }, (_, s) => {
          const p = config.patrones[Math.floor(rng() * config.patrones.length)];
          return p;
        }).join("-"),
      });
    }
  }

  return resultados;
}

// ── Componente badge de advertencia ──────────────────────────────────────

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-2 p-3 rounded-lg text-sm"
      style={{
        background: "#f59e0b18",
        border: "1px solid #f59e0b44",
        color: "#f59e0b",
      }}
    >
      <Info size={14} className="flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ── Fila de resultado ─────────────────────────────────────────────────────

function ResultadoRow({
  resultado,
  onGuardar,
}: {
  resultado: ResultadoGenerado;
  onGuardar: (palabra: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [expandir, setExpandir] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(resultado.palabra).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const guardar = () => {
    onGuardar(resultado.palabra);
    setGuardado(true);
  };

  return (
    <div
      className="group rounded-lg px-3 py-2 flex items-center gap-3 transition-all"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      <span
        className="flex-1 font-mono font-bold text-sm cursor-pointer"
        style={{ color: "var(--primary)" }}
        onClick={() => setExpandir((p) => !p)}
      >
        {resultado.palabra}
      </span>

      {/* Desglose silábico (al expandir) */}
      {expandir && (
        <div className="flex items-center gap-1 flex-wrap">
          {resultado.silabas.map((s, i) => (
            <span
              key={i}
              className="text-micro font-mono px-1.5 py-0.5 rounded"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                color: "color-mix(in srgb, var(--primary) 70%, transparent)",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Copiar"
          className="p-1.5 rounded transition-all"
          style={{ color: copiado ? "#4ade80" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}
          onClick={copiar}
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          title="Guardar como borrador en el léxico"
          className="p-1.5 rounded transition-all"
          style={{
            color: guardado ? "#4ade80" : "color-mix(in srgb, var(--primary) 50%, transparent)",
          }}
          onClick={guardar}
          disabled={guardado}
        >
          <Save size={12} />
        </button>
      </div>

      {guardado && (
        <span
          className="text-micro font-black"
          style={{ color: "#4ade80" }}
        >
          borrador
        </span>
      )}
    </div>
  );
}

// ── Panel de configuración ────────────────────────────────────────────────

function PanelConfig({
  config,
  onChange,
}: {
  config: ConfigGenerador;
  onChange: (c: ConfigGenerador) => void;
}) {
  const [nuevoPatron, setNuevoPatron] = useState("");

  const agregarPatron = (p: string) => {
    const v = p.toUpperCase().replace(/[^CV]/g, "");
    if (v && !config.patrones.includes(v)) {
      onChange({ ...config, patrones: [...config.patrones, v] });
    }
    setNuevoPatron("");
  };

  const quitarPatron = (p: string) =>
    onChange({ ...config, patrones: config.patrones.filter((x) => x !== p) });

  return (
    <div
      className="p-4 rounded-xl space-y-4"
      style={{
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {/* Patrones silábicos */}
      <div>
        <p
          className="text-micro font-black uppercase tracking-widest mb-2"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
        >
          Patrones silábicos (C = consonante, V = vocal)
        </p>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {config.patrones.map((p) => (
            <span
              key={p}
              className="flex items-center gap-1 text-micro font-mono font-bold px-2 py-0.5 rounded cursor-pointer"
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
              onClick={() => quitarPatron(p)}
              title="Clic para quitar"
            >
              {p} ×
            </span>
          ))}
        </div>

        {/* Sugerencias */}
        <div className="flex flex-wrap gap-1 mb-2">
          {PATRONES_SUGERIDOS.filter((p) => !config.patrones.includes(p)).map((p) => (
            <button
              key={p}
              type="button"
              className="text-micro font-mono px-1.5 py-0.5 rounded transition-all"
              style={{
                background: "transparent",
                color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
              onClick={() => agregarPatron(p)}
            >
              + {p}
            </button>
          ))}
        </div>

        {/* Patrón custom */}
        <div className="flex gap-2">
          <input
            className="w-24 bg-transparent text-sm font-mono outline-none border-b uppercase"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
              color: "var(--primary)",
            }}
            placeholder="CVCC…"
            value={nuevoPatron}
            onChange={(e) => setNuevoPatron(e.target.value.toUpperCase().replace(/[^CV]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") agregarPatron(nuevoPatron); }}
          />
          <button
            type="button"
            className="p-1.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
            onClick={() => agregarPatron(nuevoPatron)}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Sílabas y cantidad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-micro font-black uppercase tracking-widest mb-1"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            Sílabas mín.
          </p>
          <input
            type="number" min={1} max={6}
            className="w-20 bg-transparent text-sm outline-none border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
            value={config.minSilabas}
            onChange={(e) => onChange({ ...config, minSilabas: Math.max(1, +e.target.value) })}
          />
        </div>
        <div>
          <p className="text-micro font-black uppercase tracking-widest mb-1"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            Sílabas máx.
          </p>
          <input
            type="number" min={1} max={6}
            className="w-20 bg-transparent text-sm outline-none border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
            value={config.maxSilabas}
            onChange={(e) => onChange({ ...config, maxSilabas: Math.max(config.minSilabas, +e.target.value) })}
          />
        </div>
        <div>
          <p className="text-micro font-black uppercase tracking-widest mb-1"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            Palabras a generar
          </p>
          <input
            type="number" min={1} max={50}
            className="w-20 bg-transparent text-sm outline-none border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
            value={config.cantidad}
            onChange={(e) => onChange({ ...config, cantidad: Math.min(50, Math.max(1, +e.target.value)) })}
          />
        </div>
        <div>
          <p className="text-micro font-black uppercase tracking-widest mb-1"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            Categoría (léxico)
          </p>
          <select
            className="bg-transparent text-sm outline-none border-b cursor-pointer"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
            value={config.categoria}
            onChange={(e) => onChange({ ...config, categoria: e.target.value as CategoriaGramatical | "" })}
          >
            {CATS_GRAM.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Semilla */}
      <div>
        <p className="text-micro font-black uppercase tracking-widest mb-1"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          Semilla (misma semilla = mismos resultados)
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            className="w-28 bg-transparent text-sm outline-none border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}
            value={config.semilla}
            onChange={(e) => onChange({ ...config, semilla: +e.target.value })}
          />
          <button
            type="button"
            title="Semilla aleatoria"
            className="p-1.5 rounded"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}
            onClick={() => onChange({ ...config, semilla: Math.floor(Math.random() * 99999) })}
          >
            <Dice5 size={13} />
          </button>
        </div>
      </div>

      {/* Opciones fonotácticas */}
      <label
        className="flex items-center gap-2 cursor-pointer text-sm select-none"
        style={{ color: "var(--primary)" }}
      >
        <input
          type="checkbox"
          className="accent-current"
          checked={config.permitirConsonantesIgualesAdyacentes}
          onChange={(e) => onChange({ ...config, permitirConsonantesIgualesAdyacentes: e.target.checked })}
        />
        Permitir consonantes iguales adyacentes
      </label>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export function GeneradorNombres({ idiomaId }: { idiomaId: string }) {
  const { consonantes, vocales, loading: loadingFonemas } = useFonemas(idiomaId);
  const { crear: crearLexema } = useLexemas(idiomaId);

  const [config, setConfig] = useState<ConfigGenerador>(CONFIG_DEFAULT);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [resultados, setResultados] = useState<ResultadoGenerado[]>([]);
  const [generado, setGenerado] = useState(false);

  // Advertencias sobre el inventario
  const avisos: string[] = [];
  if (consonantes.length === 0 && vocales.length === 0)
    avisos.push("El inventario fonémico está vacío. Primero agregá fonemas en la pestaña Fonología.");
  else if (consonantes.length === 0 && config.patrones.some((p) => p.includes("C")))
    avisos.push("Los patrones contienen C (consonante) pero no hay consonantes registradas. Los resultados solo usarán vocales.");
  else if (vocales.length === 0 && config.patrones.some((p) => p.includes("V")))
    avisos.push("Los patrones contienen V (vocal) pero no hay vocales registradas.");
  if (config.patrones.length === 0)
    avisos.push("Seleccioná al menos un patrón silábico.");

  const puedeGenerar =
    avisos.every((a) => !a.includes("vacío") && !a.includes("al menos")) &&
    (consonantes.length > 0 || vocales.length > 0) &&
    config.patrones.length > 0;

  const generar = useCallback(() => {
    const res = generarPalabras(consonantes, vocales, config);
    setResultados(res);
    setGenerado(true);
  }, [consonantes, vocales, config]);

  const regenerar = () => {
    setConfig((c) => ({ ...c, semilla: Math.floor(Math.random() * 99999) }));
  };

  // Efecto: si cambia la semilla manualmente, regenerar
  const handleConfig = (c: ConfigGenerador) => {
    setConfig(c);
    setGenerado(false);
  };

  const guardarBorrador = useCallback(async (palabra: string) => {
    await crearLexema(palabra);
    // El lexema se crea con validado=false por defecto → es un borrador
  }, [crearLexema]);

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>
            Generador de palabras
          </p>
          <p
            className="text-micro"
            style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
          >
            {consonantes.length} consonantes · {vocales.length} vocales ·{" "}
            {config.patrones.join(", ")} · semilla {config.semilla}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-micro font-black transition-all"
            style={{
              background: mostrarConfig
                ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                : "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
            onClick={() => setMostrarConfig((p) => !p)}
          >
            <Settings2 size={11} /> Configurar
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-micro font-black transition-all"
            style={{
              background: "transparent",
              color: "color-mix(in srgb, var(--primary) 55%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
            onClick={() => { regenerar(); generar(); }}
            disabled={!puedeGenerar}
            title="Nueva semilla aleatoria"
          >
            <RefreshCw size={11} /> Otra semilla
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-micro font-black transition-all disabled:opacity-40"
            style={{
              background: "color-mix(in srgb, var(--primary) 15%, transparent)",
              color: "var(--primary)",
            }}
            onClick={generar}
            disabled={!puedeGenerar || loadingFonemas}
          >
            {loadingFonemas ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Wand2 size={11} />
            )}
            Generar
          </button>
        </div>
      </div>

      {/* Configuración expandible */}
      {mostrarConfig && (
        <PanelConfig config={config} onChange={handleConfig} />
      )}

      {/* Advertencias */}
      {avisos.map((a, i) => <Aviso key={i}>{a}</Aviso>)}

      {/* Resultados */}
      {generado && resultados.length === 0 && (
        <div
          className="text-center py-8"
          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
        >
          <Wand2 size={28} strokeWidth={1.5} className="mx-auto mb-2" />
          <p className="text-sm">No se pudo generar ninguna palabra con esta configuración.</p>
          <p className="text-micro mt-1">Revisá los patrones y el inventario fonémico.</p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="text-micro font-black uppercase tracking-widest"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            {resultados.length} palabras · hover para guardar como borrador
          </p>
          {resultados.map((r, i) => (
            <ResultadoRow
              key={`${r.palabra}-${i}`}
              resultado={r}
              onGuardar={guardarBorrador}
            />
          ))}
        </div>
      )}

      {!generado && avisos.length === 0 && (
        <div
          className="text-center py-8 space-y-2"
          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
        >
          <Wand2 size={32} strokeWidth={1.2} className="mx-auto" />
          <p className="text-sm">
            {consonantes.length + vocales.length} fonemas listos.{" "}
            Presioná <strong>Generar</strong> para crear palabras.
          </p>
        </div>
      )}
    </div>
  );
}
