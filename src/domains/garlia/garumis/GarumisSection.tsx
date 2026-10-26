"use client";

import { Layers, Loader2, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { GarumiEditorPortal, type GarumiEditorItem } from "./GarumiEditor";
import { GarumiElementosPortal } from "./GarumiElementoEditor";
import { OriginalEditorPortal, type OriginalItem } from "./OriginalEditor";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Original {
  id: string;
  nombre: string;
  descripcion: string | null;
  rasgo_linaje: string | null;
  estado_documentacion: string;
  numero_global: number | null;
}

interface Garumi {
  id: string;
  nombre: string;
  concepto: string | null;
  original_id: string | null;
  estado_evolutivo: string | null;
  descripcion: string | null;
  estado_documentacion: string;
  manifestacion_rasgo_linaje: string | null;
  numero_global: number | null;
  numero_origen: number | null;
}

interface Rasgo {
  id: string;
  garumi_id: string;
  nombre_rasgo: string;
  tipo_rasgo: string | null;
}

interface Evolucion {
  id: string;
  especie_origen_id: string | null;
  especie_destino_id: string | null;
  tipo_relacion: string | null;
  descripcion_cambio: string | null;
  origen_nombre?: string | null;
  destino_nombre?: string | null;
}

// Mapa garumi_id → nombres de elementos asignados (rol principal primero)
type ElementoMap = Record<string, string[]>;

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useOriginales() {
  const [data, setData] = useState<Original[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let off = false;
    void supabase
      .from("garumi_originales")
      .select("id, nombre, descripcion, rasgo_linaje, estado_documentacion, numero_global")
      .order("nombre")
      .then(({ data: rows }) => {
        if (off) return;
        setData((rows ?? []) as Original[]);
        setLoading(false);
      });
    return () => { off = true; };
  }, []);
  return { originales: data, loading };
}

function useGarumis() {
  const [data, setData] = useState<Garumi[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let off = false;
    void supabase
      .from("garumis")
      .select("id, nombre, concepto, original_id, estado_evolutivo, descripcion, estado_documentacion, manifestacion_rasgo_linaje, numero_global, numero_origen")
      .order("numero_global", { ascending: true, nullsFirst: false })
      .then(({ data: rows }) => {
        if (off) return;
        setData((rows ?? []) as Garumi[]);
        setLoading(false);
      });
    return () => { off = true; };
  }, []);
  return { garumis: data, loading, setGarumis: setData };
}

function useRasgos() {
  const [data, setData] = useState<Rasgo[]>([]);
  useEffect(() => {
    let off = false;
    void supabase
      .from("garumi_rasgos")
      .select("id, garumi_id, nombre_rasgo, tipo_rasgo")
      .then(({ data: rows }) => {
        if (off) return;
        setData((rows ?? []) as Rasgo[]);
      });
    return () => { off = true; };
  }, []);
  return { rasgos: data };
}

function useEvoluciones() {
  const [data, setData] = useState<Evolucion[]>([]);
  useEffect(() => {
    let off = false;
    void supabase
      .from("garumi_evoluciones")
      .select(`
        id, especie_origen_id, especie_destino_id, tipo_relacion, descripcion_cambio,
        origen:garumis!garumi_evoluciones_especie_origen_id_fkey(nombre),
        destino:garumis!garumi_evoluciones_especie_destino_id_fkey(nombre)
      `)
      .then(({ data: rows }) => {
        if (off) return;
        setData(
          (rows ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            especie_origen_id: r.especie_origen_id as string | null,
            especie_destino_id: r.especie_destino_id as string | null,
            tipo_relacion: r.tipo_relacion as string | null,
            descripcion_cambio: r.descripcion_cambio as string | null,
            origen_nombre: (r.origen as { nombre: string } | null)?.nombre ?? null,
            destino_nombre: (r.destino as { nombre: string } | null)?.nombre ?? null,
          }))
        );
      });
    return () => { off = true; };
  }, []);
  return { evoluciones: data };
}

/** Carga las asignaciones de elementos por Garumi, agrupadas en un mapa id→nombres[] */
function useElementosPorGarumi(): ElementoMap {
  const [mapa, setMapa] = useState<ElementoMap>({});
  useEffect(() => {
    let off = false;
    void supabase
      .from("garumi_elemento_asignaciones")
      .select(`
        garumi_id, rol,
        elemento:garumi_elementos!garumi_elemento_asignaciones_elemento_id_fkey(nombre)
      `)
      .then(({ data: rows }) => {
        if (off || !rows) return;
        const m: ElementoMap = {};
        // Ordenamos principal primero, resto después
        const ordenRol = (rol: string | null) =>
          rol === "principal" ? 0 : rol === "secundario" ? 1 : 2;
        const sorted = [...rows].sort((a, b) =>
          ordenRol((a as Record<string, unknown>).rol as string | null) -
          ordenRol((b as Record<string, unknown>).rol as string | null)
        );
        for (const r of sorted as Record<string, unknown>[]) {
          const gid = r.garumi_id as string;
          const nombre = (r.elemento as { nombre: string } | null)?.nombre;
          if (!nombre) continue;
          m[gid] = [...(m[gid] ?? []), nombre];
        }
        setMapa(m);
      });
    return () => { off = true; };
  }, []);
  return mapa;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function toEditorItem(g: Garumi): GarumiEditorItem {
  return {
    id: g.id,
    nombre: g.nombre,
    concepto: g.concepto,
    original_id: g.original_id,
    estado_evolutivo: g.estado_evolutivo,
    descripcion: g.descripcion,
    estado_documentacion: g.estado_documentacion,
    manifestacion_rasgo_linaje: g.manifestacion_rasgo_linaje,
  };
}

// ── Tarjeta de Garumi ─────────────────────────────────────────────────────────

function TarjetaGarumi({
  garumi,
  elementos,
  dim,
  onClick,
}: {
  garumi: Garumi;
  elementos: string[];
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex flex-col gap-0.5 py-2 px-2 transition-colors"
      style={{ opacity: dim ? 0.35 : 1 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
        if (dim) (e.currentTarget as HTMLElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        if (dim) (e.currentTarget as HTMLElement).style.opacity = "0.35";
      }}
    >
      {/* Número + nombre + pill */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {garumi.numero_global != null && (
          <span className="shrink-0 tabular-nums" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 22%, transparent)", minWidth: 20 }}>
            {String(garumi.numero_global).padStart(3, "0")}
          </span>
        )}
        <span className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
          {garumi.nombre}
        </span>
        {elementos.map((nombre) => (
          <span key={nombre} style={{
            fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            borderRadius: "var(--radius-btn)", padding: "0 5px", lineHeight: "16px",
          }}>{nombre}</span>
        ))}
      </div>
      {/* Concepto */}
      {garumi.concepto && (
        <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontStyle: "italic" }}>
          {garumi.concepto}
        </p>
      )}
    </button>
  );
}

// ── Bloque de Original ────────────────────────────────────────────────────────

function BloqueOriginal({
  original,
  garumis,
  evoluciones,
  elementoMap,
  onAbrirEditor,
  onAbrirOriginal,
}: {
  original: Original | null;
  garumis: Garumi[];
  evoluciones: Evolucion[];
  elementoMap: ElementoMap;
  onAbrirEditor: (g: Garumi) => void;
  onAbrirOriginal: (o: Original) => void;
}) {
  return (
    <div className="flex flex-col gap-0">
      {/* Cabecera */}
      <div
        className="flex items-baseline gap-3 px-1 pb-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <button
          type="button"
          onClick={() => original && onAbrirOriginal(original)}
          disabled={!original}
          className="flex items-center gap-2 font-black uppercase tracking-widest transition-colors disabled:cursor-default"
          style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", padding: 0, cursor: original ? "pointer" : "default" }}
          onMouseEnter={(e) => { if (original) (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          {original?.numero_global != null && (
            <span className="tabular-nums" style={{ fontSize: 9, fontWeight: 400, color: "color-mix(in srgb, var(--primary) 30%, transparent)", letterSpacing: "0.04em" }}>
              {String(original.numero_global).padStart(3, "0")}
            </span>
          )}
          {original?.nombre ?? "Sin Original"}
        </button>

        {original?.rasgo_linaje && (
          <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 40%, transparent)", letterSpacing: "0.07em" }}>
            {original.rasgo_linaje}
          </span>
        )}

        {original?.descripcion && (
          <span
            className="flex-1 truncate"
            style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 30%, transparent)", fontStyle: "italic" }}
          >
            {original.descripcion}
          </span>
        )}

        <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
          {garumis.length}
        </span>
      </div>

      {/* Columnas evolutivas */}
      {garumis.length === 0 ? (
        <p className="py-4 px-1" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 20%, transparent)", fontStyle: "italic" }}>
          Sin especies registradas.
        </p>
      ) : (() => {
        // Build evolution chains: base → evolved
        // A "base" is a garumi that is NOT the destination of any evolution within this group
        const ids = new Set(garumis.map((g) => g.id));
        const isDestino = new Set(
          evoluciones
            .filter((e) => e.especie_destino_id && ids.has(e.especie_destino_id))
            .map((e) => e.especie_destino_id!)
        );
        // Bases: not a destination of any evolution
        const bases = garumis.filter((g) => !isDestino.has(g.id));
        // For each base, find its direct evolved form (if any)
        const destinoDeBase = (baseId: string): Garumi | null => {
          const rel = evoluciones.find((e) => e.especie_origen_id === baseId && e.especie_destino_id && ids.has(e.especie_destino_id));
          return rel ? (garumis.find((g) => g.id === rel.especie_destino_id) ?? null) : null;
        };
        // Sort bases by numero_global
        const sortedBases = [...bases].sort((a, b) => (a.numero_global ?? 999) - (b.numero_global ?? 999));
        return (
          <div className="pt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="grid gap-x-1 gap-y-0" style={{ gridTemplateColumns: `repeat(${sortedBases.length}, minmax(160px, 1fr))` }}>
              {/* Row 1: bases */}
              {sortedBases.map((base) => (
                <div key={base.id} style={{ borderLeft: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <TarjetaGarumi
                    garumi={base}
                    elementos={elementoMap[base.id] ?? []}
                    onClick={() => onAbrirEditor(base)}
                  />
                </div>
              ))}
              {/* Row 2: evolutions (or empty slot) */}
              {sortedBases.map((base) => {
                const evo = destinoDeBase(base.id);
                return (
                  <div key={base.id + "-evo"} style={{ borderLeft: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                    {evo ? (
                      <TarjetaGarumi
                        garumi={evo}
                        elementos={elementoMap[evo.id] ?? []}
                        onClick={() => onAbrirEditor(evo)}
                        dim
                      />
                    ) : (
                      <div className="py-2 px-2" style={{ minHeight: 36 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function GarumisSection() {
  const { originales, loading: loadingO } = useOriginales();
  const { garumis, loading: loadingG, setGarumis } = useGarumis();
  const { rasgos } = useRasgos();
  const { evoluciones } = useEvoluciones();
  const elementoMap = useElementosPorGarumi();

  const [editando, setEditando] = useState<Garumi | null>(null);
  const [editandoOriginal, setEditandoOriginal] = useState<Original | null>(null);
  const [verElementos, setVerElementos] = useState(false);

  const garumisDeOriginal = (id: string) =>
    garumis.filter((g) => g.original_id === id);

  const huerfanos = garumis.filter(
    (g) => !g.original_id || !originales.some((o) => o.id === g.original_id)
  );

  if (loadingO || loadingG) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={16} strokeWidth={2} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg-main)" }}>
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Barra superior */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button
            type="button"
            className="flex items-center gap-1.5 transition-colors"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              borderRadius: "var(--radius-btn)",
              padding: "5px 10px",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--primary)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "color-mix(in srgb, var(--primary) 50%, transparent)")
            }
          >
            <Plus size={11} strokeWidth={2.5} />
            Nuevo Garumi
          </button>

          {/* Botón Elementos */}
          <button
            type="button"
            onClick={() => setVerElementos(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              borderRadius: "var(--radius-btn)",
              padding: "5px 10px",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--primary)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "color-mix(in srgb, var(--primary) 50%, transparent)")
            }
          >
            <Layers size={11} strokeWidth={2} />
            Elementos
          </button>

          <span style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)", letterSpacing: "0.05em" }}>
            {garumis.length} {garumis.length === 1 ? "especie" : "especies"} · {originales.length} originales
          </span>
        </div>

        {/* Bloques */}
        {originales.length === 0 && garumis.length === 0 ? (
          <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            No hay Garumis ni Originales todavía.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {originales.map((o) => (
              <BloqueOriginal
                key={o.id}
                original={o}
                garumis={garumisDeOriginal(o.id)}
                evoluciones={evoluciones}
                elementoMap={elementoMap}
                onAbrirEditor={setEditando}
                onAbrirOriginal={setEditandoOriginal}
              />
            ))}
            {huerfanos.length > 0 && (
              <BloqueOriginal
                key="sin-original"
                original={null}
                garumis={huerfanos}
                evoluciones={evoluciones}
                elementoMap={elementoMap}
                onAbrirEditor={setEditando}
                onAbrirOriginal={setEditandoOriginal}
              />
            )}
          </div>
        )}
      </div>

      {/* Editor flotante de Garumi */}
      {editando && (
        <GarumiEditorPortal
          item={toEditorItem(editando)}
          originales={originales}
          onGuardado={(g) => {
            setGarumis((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...g } : x)));
            setEditando((prev) => (prev?.id === g.id ? { ...prev, ...g } : prev));
          }}
          onEliminado={(id) => {
            setGarumis((prev) => prev.filter((x) => x.id !== id));
            setEditando(null);
          }}
          onCerrar={() => setEditando(null)}
        />
      )}

      {/* Editor flotante de Original */}
      {editandoOriginal && (
        <OriginalEditorPortal
          item={editandoOriginal as OriginalItem}
          onGuardado={(o) => {
            // update originales list via prop — propagate upward via a local re-read
            setEditandoOriginal((prev) => prev?.id === o.id ? { ...prev, ...o } : prev);
          }}
          onEliminado={() => setEditandoOriginal(null)}
          onCerrar={() => setEditandoOriginal(null)}
        />
      )}

      {/* Panel de elementos */}
      {verElementos && (
        <GarumiElementosPortal onCerrar={() => setVerElementos(false)} />
      )}
    </div>
  );
}
