"use client";

/**
 * DescubrimientosPage.tsx — Rediseño total
 * ─────────────────────────────────────────────────────────────────────────────
 * Muestra el estado canónico del sistema de maná cargado desde Supabase:
 *   1. Tabla periódica de Garlia — 67 elementos, agrupados por familia
 *   2. Compuestos — grid compacto con símbolo y clasificación
 *   3. Oris — 10 sistemas de acoplamiento, con familia y fórmula
 *   4. IUMs — 19 unidades de manifestación
 *   5. Procesos — 79 procesos canónicos
 *
 * Usa solo var(--primary), var(--bg-main), var(--warning) y mezclas con
 * color-mix para mantenerse 100% dentro del tema dinámico.
 */

import React, { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

// ─── tipos ───────────────────────────────────────────────────────────────────

interface Elemento {
  numero_atomico: number;
  nombre: string;
  simbolo: string;
  familia: string;
  es_noble: boolean;
}

interface Compuesto {
  id: string;
  nombre: string;
  simbolo: string | null;
  clasificacion: string | null;
  tipo_compuesto: string | null;
}

interface Ori {
  id: string;
  orden: number;
  nombre: string;
  familia: string;
  formula: string;
  dominio: string | null;
}

interface Ium {
  id: string;
  orden: number;
  nombre: string;
  detalle: string;
  extra: string | null;
}

interface Proceso {
  id: string;
  nombre: string;
  tipo: string | null;
  descripcion: string | null;
}

// ─── colores por familia de elemento ─────────────────────────────────────────

const FAMILIA_OPACITY: Record<string, string> = {
  Inerte: "0.55",
  Rígido: "0.75",
  Reactivo: "0.90",
  Intermedio: "0.70",
  Noble: "1",
};

const FAMILIA_BG: Record<string, string> = {
  Inerte: "color-mix(in srgb, var(--primary) 8%, var(--bg-main))",
  Rígido: "color-mix(in srgb, var(--primary) 13%, var(--bg-main))",
  Reactivo: "color-mix(in srgb, var(--primary) 20%, var(--bg-main))",
  Intermedio: "color-mix(in srgb, var(--primary) 15%, var(--bg-main))",
  Noble: "color-mix(in srgb, var(--primary) 28%, var(--bg-main))",
};

const CLASIFICACION_STYLE: Record<string, string> = {
  estable: "color-mix(in srgb, var(--primary) 90%, transparent)",
  metaestable: "color-mix(in srgb, var(--primary) 55%, transparent)",
  pendiente: "color-mix(in srgb, var(--primary) 30%, transparent)",
  inestable: "var(--warning)",
};

// ─── ORI familia colores ──────────────────────────────────────────────────────
const ORI_FAMILIA_BG: Record<string, string> = {
  Mecánica: "color-mix(in srgb, var(--primary) 15%, var(--bg-main))",
  Energética: "color-mix(in srgb, var(--primary) 22%, var(--bg-main))",
  Biológica: "color-mix(in srgb, var(--primary) 10%, var(--bg-main))",
};

// ─── hook de carga ────────────────────────────────────────────────────────────

function useCatalogos() {
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [compuestos, setCompuestos] = useState<Compuesto[]>([]);
  const [oris, setOris] = useState<Ori[]>([]);
  const [iums, setIums] = useState<Ium[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("elementos")
        .select("numero_atomico, nombre, simbolo, familia, es_noble")
        .order("numero_atomico"),
      supabase
        .from("compuestos")
        .select("id, nombre, simbolo, clasificacion, tipo_compuesto")
        .order("nombre"),
      supabase
        .from("oris")
        .select("id, orden, nombre, familia, formula, dominio")
        .order("orden"),
      supabase
        .from("iums")
        .select("id, orden, nombre, detalle, extra")
        .order("orden"),
      supabase
        .from("procesos")
        .select("id, nombre, tipo, descripcion")
        .order("nombre"),
    ]).then(([e, c, o, i, p]) => {
      setElementos((e.data as Elemento[]) ?? []);
      setCompuestos((c.data as Compuesto[]) ?? []);
      setOris((o.data as Ori[]) ?? []);
      setIums((i.data as Ium[]) ?? []);
      setProcesos((p.data as Proceso[]) ?? []);
      setCargando(false);
    });
  }, []);

  return { elementos, compuestos, oris, iums, procesos, cargando };
}

// ─── componentes ─────────────────────────────────────────────────────────────

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[11px] font-black uppercase tracking-widest mb-3 mt-8 first:mt-0"
      style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
    >
      {children}
    </h2>
  );
}

function Contador({ n, label }: { n: number; label: string }) {
  return (
    <span
      className="ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-0.5"
      style={{
        background: "color-mix(in srgb, var(--primary) 10%, transparent)",
        color: "color-mix(in srgb, var(--primary) 55%, transparent)",
      }}
    >
      {n} {label}
    </span>
  );
}

// ─── Tabla Periódica ──────────────────────────────────────────────────────────

const FAMILIAS = ["Inerte", "Rígido", "Reactivo", "Intermedio", "Noble"];

function TablaPeriodica({ elementos }: { elementos: Elemento[] }) {
  const porFamilia = FAMILIAS.map((f) => ({
    familia: f,
    items: elementos.filter((e) => e.familia === f),
  }));

  return (
    <div>
      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FAMILIAS.map((f) => (
          <span
            key={f}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: FAMILIA_BG[f] ?? "transparent", border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)" }}
            />
            <span style={{ color: `color-mix(in srgb, var(--primary) ${FAMILIA_OPACITY[f] ? parseFloat(FAMILIA_OPACITY[f]) * 100 : 60}%, transparent)` }}>
              {f}
            </span>
          </span>
        ))}
      </div>

      {/* Grid general */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1">
        {elementos.map((el) => (
          <div
            key={el.numero_atomico}
            title={`${el.nombre} · ${el.familia}${el.es_noble ? " · Noble" : ""}`}
            className="relative flex flex-col items-center justify-center gap-0 aspect-square transition-transform hover:scale-105 cursor-default"
            style={{
              background: FAMILIA_BG[el.familia] ?? "color-mix(in srgb, var(--primary) 10%, var(--bg-main))",
              borderRadius: "var(--radius-btn, 6px)",
              border: el.es_noble
                ? "1.5px solid color-mix(in srgb, var(--primary) 50%, transparent)"
                : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              boxShadow: el.es_noble
                ? "0 0 6px color-mix(in srgb, var(--primary) 18%, transparent)"
                : "none",
            }}
          >
            <span
              className="text-[8px] font-bold leading-none"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            >
              {el.numero_atomico}
            </span>
            <span
              className="text-[11px] font-black leading-tight"
              style={{ color: `color-mix(in srgb, var(--primary) ${FAMILIA_OPACITY[el.familia] ? parseFloat(FAMILIA_OPACITY[el.familia]) * 100 : 70}%, transparent)` }}
            >
              {el.simbolo}
            </span>
            <span
              className="text-[7px] font-medium leading-none line-clamp-1 px-0.5 text-center w-full"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              {el.nombre}
            </span>
          </div>
        ))}
      </div>

      {/* Por familia */}
      <div className="mt-6 space-y-4">
        {porFamilia.map(({ familia, items }) => (
          <div key={familia}>
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              {familia} <span className="opacity-60">— {items.length}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {items.map((el) => (
                <span
                  key={el.numero_atomico}
                  title={el.nombre}
                  className="text-[10px] font-bold px-1.5 py-0.5"
                  style={{
                    borderRadius: "var(--radius-btn, 6px)",
                    background: FAMILIA_BG[familia] ?? "transparent",
                    border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 80%, transparent)",
                  }}
                >
                  {el.simbolo}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compuestos ───────────────────────────────────────────────────────────────

function TablaCompuestos({ compuestos }: { compuestos: Compuesto[] }) {
  const [filtro, setFiltro] = useState<string>("todos");
  const clases = ["todos", "estable", "metaestable", "pendiente", "inestable"];
  const filtrados =
    filtro === "todos" ? compuestos : compuestos.filter((c) => c.clasificacion === filtro);

  return (
    <div>
      {/* Filtro */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {clases.map((c) => {
          const activo = filtro === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFiltro(c)}
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 transition-colors"
              style={{
                borderRadius: "var(--radius-btn, 6px)",
                border: activo
                  ? "1px solid color-mix(in srgb, var(--primary) 40%, transparent)"
                  : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                background: activo
                  ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                  : "transparent",
                color: activo
                  ? "color-mix(in srgb, var(--primary) 85%, transparent)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              {c === "todos" ? `todos (${compuestos.length})` : `${c} (${compuestos.filter((x) => x.clasificacion === c).length})`}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
        {filtrados.map((c) => (
          <div
            key={c.id}
            title={`${c.nombre} · ${c.clasificacion ?? "?"} · ${c.tipo_compuesto ?? "?"}`}
            className="flex flex-col gap-0.5 p-2"
            style={{
              borderRadius: "var(--radius-btn, 6px)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
            }}
          >
            <span
              className="text-[11px] font-black"
              style={{
                color: CLASIFICACION_STYLE[c.clasificacion ?? "pendiente"] ?? "color-mix(in srgb, var(--primary) 50%, transparent)",
              }}
            >
              {c.simbolo && c.simbolo !== "??" ? c.simbolo : "—"}
            </span>
            <span
              className="text-[9px] font-medium leading-tight line-clamp-2"
              style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}
            >
              {c.nombre}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Oris ─────────────────────────────────────────────────────────────────────

function TablaOris({ oris }: { oris: Ori[] }) {
  const porFamilia: Record<string, Ori[]> = {};
  for (const o of oris) {
    if (!porFamilia[o.familia]) porFamilia[o.familia] = [];
    porFamilia[o.familia].push(o);
  }

  return (
    <div className="space-y-6">
      {Object.entries(porFamilia).map(([familia, items]) => (
        <div key={familia}>
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            {familia}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-1 p-3"
                style={{
                  borderRadius: "var(--radius-btn, 6px)",
                  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  background: ORI_FAMILIA_BG[familia] ?? "color-mix(in srgb, var(--primary) 10%, var(--bg-main))",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black tabular-nums"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                  >
                    {String(o.orden).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[13px] font-black"
                    style={{ color: "var(--primary)" }}
                  >
                    {o.nombre}
                  </span>
                </div>
                {o.dominio && (
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
                  >
                    {o.dominio}
                  </span>
                )}
                <span
                  className="text-[9px] font-mono leading-tight mt-0.5"
                  style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                >
                  {o.formula}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── IUMs ─────────────────────────────────────────────────────────────────────

function TablaIums({ iums }: { iums: Ium[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {iums.map((ium) => (
        <div
          key={ium.id}
          className="flex flex-col gap-1 p-3"
          style={{
            borderRadius: "var(--radius-btn, 6px)",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            background: "color-mix(in srgb, var(--primary) 6%, var(--bg-main))",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-black tabular-nums"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              {String(ium.orden).padStart(2, "0")}
            </span>
            <span
              className="text-[13px] font-black"
              style={{ color: "var(--primary)" }}
            >
              {ium.nombre}
            </span>
          </div>
          <span
            className="text-[9px] font-mono"
            style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
          >
            {ium.detalle}
          </span>
          {ium.extra && (
            <span
              className="text-[9px] font-medium leading-tight"
              style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
            >
              {ium.extra}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Procesos ─────────────────────────────────────────────────────────────────

function TablaProcesos({ procesos }: { procesos: Proceso[] }) {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = procesos.filter(
    (p) =>
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.tipo ?? "").toLowerCase().includes(busqueda.toLowerCase()),
  );

  const porTipo: Record<string, Proceso[]> = {};
  for (const p of filtrados) {
    const key = p.tipo ?? "Sin tipo";
    if (!porTipo[key]) porTipo[key] = [];
    porTipo[key].push(p);
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar proceso…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full max-w-xs mb-4 px-3 py-1.5 text-[11px] font-medium outline-none"
        style={{
          borderRadius: "var(--radius-btn, 6px)",
          border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
          color: "color-mix(in srgb, var(--primary) 80%, transparent)",
        }}
      />

      <div className="space-y-4">
        {Object.entries(porTipo).map(([tipo, items]) => (
          <div key={tipo}>
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              {tipo} <span className="opacity-50">— {items.length}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {items.map((p) => (
                <span
                  key={p.id}
                  title={p.descripcion ?? p.nombre}
                  className="text-[10px] font-bold px-2 py-0.5 cursor-default"
                  style={{
                    borderRadius: "var(--radius-btn, 6px)",
                    border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    background: "color-mix(in srgb, var(--primary) 5%, var(--bg-main))",
                    color: "color-mix(in srgb, var(--primary) 70%, transparent)",
                  }}
                >
                  {p.nombre}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

type Tab = "elementos" | "compuestos" | "oris" | "iums" | "procesos";

const TABS: { id: Tab; label: string }[] = [
  { id: "elementos", label: "Elementos" },
  { id: "compuestos", label: "Compuestos" },
  { id: "oris", label: "Oris" },
  { id: "iums", label: "IUMs" },
  { id: "procesos", label: "Procesos" },
];

// ─── Page principal ───────────────────────────────────────────────────────────

export default function DescubrimientosPage() {
  const { elementos, compuestos, oris, iums, procesos, cargando } = useCatalogos();
  const [tab, setTab] = useState<Tab>("elementos");

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p
          className="text-[11px] font-black uppercase tracking-widest"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Cargando catálogos…
        </p>
      </div>
    );
  }

  const counts: Record<Tab, number> = {
    elementos: elementos.length,
    compuestos: compuestos.length,
    oris: oris.length,
    iums: iums.length,
    procesos: procesos.length,
  };

  return (
    <div className="space-y-0">
      {/* Tabs */}
      <div
        className="flex flex-wrap gap-1 mb-6 p-1"
        style={{
          borderRadius: "var(--radius-btn, 6px)",
          background: "color-mix(in srgb, var(--primary) 5%, var(--bg-main))",
          border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        {TABS.map(({ id, label }) => {
          const activo = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors"
              style={{
                borderRadius: "calc(var(--radius-btn, 6px) - 2px)",
                background: activo
                  ? "color-mix(in srgb, var(--primary) 20%, var(--bg-main))"
                  : "transparent",
                border: activo
                  ? "1px solid color-mix(in srgb, var(--primary) 25%, transparent)"
                  : "1px solid transparent",
                color: activo
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 45%, transparent)",
              }}
            >
              {label}
              <span
                className="text-[9px] font-bold tabular-nums"
                style={{
                  color: activo
                    ? "color-mix(in srgb, var(--primary) 60%, transparent)"
                    : "color-mix(in srgb, var(--primary) 30%, transparent)",
                }}
              >
                {counts[id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {tab === "elementos" && (
        <div>
          <Titulo>
            Tabla Periódica de Garlia
            <Contador n={elementos.length} label="elementos" />
          </Titulo>
          <TablaPeriodica elementos={elementos} />
        </div>
      )}

      {tab === "compuestos" && (
        <div>
          <Titulo>
            Compuestos Canónicos
            <Contador n={compuestos.length} label="compuestos" />
          </Titulo>
          <TablaCompuestos compuestos={compuestos} />
        </div>
      )}

      {tab === "oris" && (
        <div>
          <Titulo>
            Oris — Sistemas de Acoplamiento
            <Contador n={oris.length} label="oris" />
          </Titulo>
          <TablaOris oris={oris} />
        </div>
      )}

      {tab === "iums" && (
        <div>
          <Titulo>
            IUMs — Unidades de Manifestación
            <Contador n={iums.length} label="iums" />
          </Titulo>
          <TablaIums iums={iums} />
        </div>
      )}

      {tab === "procesos" && (
        <div>
          <Titulo>
            Procesos Canónicos
            <Contador n={procesos.length} label="procesos" />
          </Titulo>
          <TablaProcesos procesos={procesos} />
        </div>
      )}
    </div>
  );
}
