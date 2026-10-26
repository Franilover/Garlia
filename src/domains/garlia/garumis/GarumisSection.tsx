"use client";

/**
 * GarumisSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Vista de un solo vistazo — mismo patrón que GeografiaJerarquica:
 *
 *   [Original: Orumi]
 *     [Garumi 1]  [Garumi 2]  [Garumi 3]
 *
 *   [Original: Varum]
 *     [Garumi 4]  [Garumi 5]
 *
 *   [Sin Original]
 *     [Garumi 6]
 *
 * Cada bloque-Original muestra:
 *  - título del Original con su rasgo_linaje como pill
 *  - grid de tarjetas de Garumi (sin clicks de editor)
 *  - cada tarjeta muestra: nombre, concepto, estado_evolutivo, manifestacion_rasgo_linaje
 *
 * Columnas reales en Supabase (corregidas):
 *   garumi_originales:  id, nombre, descripcion, rasgo_linaje, estado_documentacion
 *   garumis:            id, nombre, concepto, original_id, estado_evolutivo,
 *                       descripcion, estado_documentacion, manifestacion_rasgo_linaje
 *   garumi_rasgos:      id, garumi_id, nombre_rasgo, tipo_rasgo, descripcion
 *   garumi_evoluciones: id, especie_origen_id, especie_destino_id,
 *                       tipo_relacion, descripcion_cambio
 */

import { Leaf, Plus, Sparkles, GitMerge, Loader2 } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { GarumiEditorPortal, type GarumiEditorItem } from "./GarumiEditor";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Original {
  id: string;
  nombre: string;
  descripcion: string | null;
  rasgo_linaje: string | null;
  estado_documentacion: string;
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

// ── Tokens ────────────────────────────────────────────────────────────────────

const BORDER = "color-mix(in srgb, var(--primary) 10%, transparent)";
const BORDER_CARD = "color-mix(in srgb, var(--primary) 8%, transparent)";

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useOriginales() {
  const [data, setData] = useState<Original[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from("garumi_originales")
      .select("id, nombre, descripcion, rasgo_linaje, estado_documentacion")
      .order("nombre")
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Original[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  return { originales: data, loading };
}

function useGarumis() {
  const [data, setData] = useState<Garumi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from("garumis")
      .select("id, nombre, concepto, original_id, estado_evolutivo, descripcion, estado_documentacion, manifestacion_rasgo_linaje")
      .order("nombre")
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Garumi[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  return { garumis: data, loading, setGarumis: setData };
}

function useRasgos() {
  const [data, setData] = useState<Rasgo[]>([]);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from("garumi_rasgos")
      .select("id, garumi_id, nombre_rasgo, tipo_rasgo")
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Rasgo[]);
      });
    return () => { cancelado = true; };
  }, []);

  return { rasgos: data };
}

function useEvoluciones() {
  const [data, setData] = useState<Evolucion[]>([]);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from("garumi_evoluciones")
      .select(`
        id, especie_origen_id, especie_destino_id, tipo_relacion, descripcion_cambio,
        origen:garumis!garumi_evoluciones_especie_origen_id_fkey(nombre),
        destino:garumis!garumi_evoluciones_especie_destino_id_fkey(nombre)
      `)
      .then(({ data: rows }) => {
        if (cancelado) return;
        const mapped: Evolucion[] = (rows ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          especie_origen_id: r.especie_origen_id as string | null,
          especie_destino_id: r.especie_destino_id as string | null,
          tipo_relacion: r.tipo_relacion as string | null,
          descripcion_cambio: r.descripcion_cambio as string | null,
          origen_nombre: (r.origen as { nombre: string } | null)?.nombre ?? null,
          destino_nombre: (r.destino as { nombre: string } | null)?.nombre ?? null,
        }));
        setData(mapped);
      });
    return () => { cancelado = true; };
  }, []);

  return { evoluciones: data };
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

// ── Chips ─────────────────────────────────────────────────────────────────────

function Pill({
  children,
  muted,
  accent,
}: {
  children: React.ReactNode;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold"
      style={{
        borderRadius: "var(--radius-btn)",
        fontSize: 9,
        letterSpacing: "0.06em",
        background: accent
          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
          : "color-mix(in srgb, var(--primary) 6%, transparent)",
        border: `1px solid color-mix(in srgb, var(--primary) ${accent ? "20" : "10"}%, transparent)`,
        color: muted
          ? "color-mix(in srgb, var(--primary) 35%, transparent)"
          : "color-mix(in srgb, var(--primary) 65%, transparent)",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

// ── Tarjeta de Garumi ─────────────────────────────────────────────────────────

function TarjetaGarumi({
  garumi,
  rasgos,
  evoluciones,
  onClick,
}: {
  garumi: Garumi;
  rasgos: Rasgo[];
  evoluciones: Evolucion[];
  onClick: () => void;
}) {
  const rasgosPropios = rasgos.filter((r) => r.garumi_id === garumi.id);
  const evolDe = evoluciones.filter(
    (e) => e.especie_origen_id === garumi.id || e.especie_destino_id === garumi.id
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex flex-col gap-2 p-3 transition-all w-full"
      style={{
        borderRadius: "var(--radius-card)",
        border: `1px solid ${BORDER_CARD}`,
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "color-mix(in srgb, var(--primary) 6%, transparent)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "color-mix(in srgb, var(--primary) 16%, transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "color-mix(in srgb, var(--primary) 2%, transparent)";
        (e.currentTarget as HTMLElement).style.borderColor = BORDER_CARD;
      }}
    >
      {/* Nombre */}
      <div className="flex items-start justify-between gap-1.5">
        <p
          className="font-black uppercase tracking-widest leading-tight"
          style={{ fontSize: 11, color: "var(--primary)" }}
        >
          {garumi.nombre}
        </p>
        {garumi.estado_documentacion === "borrador" && (
          <Pill muted>borrador</Pill>
        )}
        {garumi.estado_documentacion === "canonico" && (
          <Pill accent>canónico</Pill>
        )}
      </div>

      {/* Concepto */}
      {garumi.concepto && (
        <p
          className="leading-snug"
          style={{
            fontSize: 10,
            color: "color-mix(in srgb, var(--primary) 50%, transparent)",
            fontStyle: "italic",
          }}
        >
          {garumi.concepto}
        </p>
      )}

      {/* Pills de meta */}
      <div className="flex flex-wrap gap-1">
        {garumi.estado_evolutivo && (
          <Pill>
            <Leaf size={7} />
            {garumi.estado_evolutivo}
          </Pill>
        )}
        {garumi.manifestacion_rasgo_linaje && (
          <Pill>
            <Sparkles size={7} />
            {garumi.manifestacion_rasgo_linaje}
          </Pill>
        )}
      </div>

      {/* Rasgos propios */}
      {rasgosPropios.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5" style={{ borderTop: `1px solid color-mix(in srgb, var(--primary) 6%, transparent)` }}>
          {rasgosPropios.map((r) => (
            <Pill key={r.id} muted>
              {r.tipo_rasgo && (
                <span style={{ opacity: 0.6 }}>{r.tipo_rasgo} ·</span>
              )}{" "}
              {r.nombre_rasgo}
            </Pill>
          ))}
        </div>
      )}

      {/* Evoluciones */}
      {evolDe.length > 0 && (
        <div
          className="flex flex-col gap-0.5 pt-0.5"
          style={{ borderTop: `1px solid color-mix(in srgb, var(--primary) 6%, transparent)` }}
        >
          {evolDe.map((e) => {
            const esOrigen = e.especie_origen_id === garumi.id;
            return (
              <div
                key={e.id}
                className="flex items-center gap-1"
                style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              >
                <GitMerge size={8} strokeWidth={1.5} className="shrink-0" />
                <span className="truncate">
                  {esOrigen
                    ? `→ ${e.destino_nombre ?? "?"}`
                    : `← ${e.origen_nombre ?? "?"}`}
                  {e.tipo_relacion && (
                    <span
                      className="ml-1 font-semibold uppercase"
                      style={{ letterSpacing: "0.06em", opacity: 0.7 }}
                    >
                      {e.tipo_relacion}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ── Bloque de Original ────────────────────────────────────────────────────────

function BloqueOriginal({
  original,
  garumis,
  rasgos,
  evoluciones,
  onAbrirEditor,
}: {
  original: Original | null; // null → bloque "Sin Original"
  garumis: Garumi[];
  rasgos: Rasgo[];
  evoluciones: Evolucion[];
  onAbrirEditor: (g: Garumi) => void;
}) {
  

  const label = original?.nombre ?? "Sin Original";
  const esBorrador = original?.estado_documentacion === "borrador";

  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ border: `1px solid ${BORDER}` }}
    >
      {/* Cabecera del bloque */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        {original ? (
          <Sparkles
            size={12}
            strokeWidth={2}
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)", flexShrink: 0 }}
          />
        ) : (
          <Leaf
            size={12}
            strokeWidth={2}
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }}
          />
        )}
        <span
          className="font-black uppercase tracking-widest"
          style={{ fontSize: 11, color: "var(--primary)" }}
        >
          {label}
        </span>

        {/* Rasgo de linaje */}
        {original?.rasgo_linaje && (
          <>
            <span
              style={{
                width: 1,
                alignSelf: "stretch",
                background: BORDER,
                flexShrink: 0,
              }}
            />
            <Pill accent>
              <Sparkles size={7} />
              {original.rasgo_linaje}
            </Pill>
          </>
        )}

        {esBorrador && (
          <Pill muted>borrador</Pill>
        )}

        {/* Descripción del Original */}
        {original?.descripcion && (
          <p
            className="flex-1 truncate"
            style={{
              fontSize: 10,
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              fontStyle: "italic",
            }}
          >
            {original.descripcion}
          </p>
        )}

        <span
          className="ml-auto font-semibold tabular-nums"
          style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          {garumis.length}
        </span>
      </div>

      {/* Grid de Garumis */}
      {garumis.length === 0 ? (
        <div
          className="px-4 py-4"
          style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 25%, transparent)", fontStyle: "italic" }}
        >
          Sin especies descendientes registradas.
        </div>
      ) : (
        <div
          className="p-3 grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          {garumis.map((g) => (
            <TarjetaGarumi
              key={g.id}
              garumi={g}
              rasgos={rasgos}
              evoluciones={evoluciones}
              onClick={() => onAbrirEditor(g)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function GarumisSection() {
  const { originales, loading: loadingOriginales } = useOriginales();
  const { garumis, loading: loadingGarumis, setGarumis } = useGarumis();
  const { rasgos } = useRasgos();
  const { evoluciones } = useEvoluciones();

  // Editor flotante
  const [garumiEditando, setGarumiEditando] = useState<Garumi | null>(null);

  const loading = loadingOriginales || loadingGarumis;

  // Garumis agrupados por original
  const garumisDeOriginal = (originalId: string) =>
    garumis.filter((g) => g.original_id === originalId);

  const garuminSinOriginal = garumis.filter(
    (g) => !g.original_id || !originales.some((o) => o.id === g.original_id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={18} strokeWidth={2} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg-main)" }}>
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Barra superior */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            className="flex items-center gap-2 px-4 transition-all"
            style={{
              height: 34,
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              border: `1px solid ${BORDER}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "color-mix(in srgb, var(--primary) 14%, transparent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "color-mix(in srgb, var(--primary) 8%, transparent)";
            }}
          >
            <Plus size={12} strokeWidth={2.5} />
            <span
              className="font-black uppercase tracking-widest"
              style={{ fontSize: 10 }}
            >
              Nuevo Garumi
            </span>
          </button>

          <span
            className="font-semibold tabular-nums"
            style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            {garumis.length} {garumis.length === 1 ? "especie" : "especies"} ·{" "}
            {originales.length} {originales.length === 1 ? "Original" : "Originales"}
          </span>
        </div>

        {/* Bloques por Original */}
        {originales.length === 0 && garumis.length === 0 ? (
          <div
            className="py-16 text-center"
            style={{ fontSize: 12, color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            No hay Garumis ni Originales registrados todavía.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {originales.map((original) => (
              <BloqueOriginal
                key={original.id}
                original={original}
                garumis={garumisDeOriginal(original.id)}
                rasgos={rasgos}
                evoluciones={evoluciones}
                onAbrirEditor={setGarumiEditando}
              />
            ))}

            {/* Bloque de huérfanos */}
            {garuminSinOriginal.length > 0 && (
              <BloqueOriginal
                key="sin-original"
                original={null}
                garumis={garuminSinOriginal}
                rasgos={rasgos}
                evoluciones={evoluciones}
                onAbrirEditor={setGarumiEditando}
              />
            )}
          </div>
        )}
      </div>

      {/* Editor flotante */}
      {garumiEditando && (
        <GarumiEditorPortal
          item={toEditorItem(garumiEditando)}
          originales={originales}
          onGuardado={(g) => {
            setGarumis((prev) =>
              prev.map((item) => (item.id === g.id ? { ...item, ...g } : item))
            );
            setGarumiEditando((prev) => (prev?.id === g.id ? { ...prev, ...g } : prev));
          }}
          onEliminado={(id) => {
            setGarumis((prev) => prev.filter((item) => item.id !== id));
            setGarumiEditando(null);
          }}
          onCerrar={() => setGarumiEditando(null)}
        />
      )}
    </div>
  );
}
