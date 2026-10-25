"use client";

/**
 * GarumisSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Columnas reales en Supabase (corregidas):
 *   garumi_originales:  id, nombre, descripcion, rasgo_linaje, estado_documentacion
 *   garumis:            id, nombre, concepto, original_id, estado_evolutivo,
 *                       descripcion, estado_documentacion, manifestacion_rasgo_linaje
 *   garumi_rasgos:      id, garumi_id, nombre_rasgo, tipo_rasgo, descripcion
 *   garumi_evoluciones: id, especie_origen_id, especie_destino_id,
 *                       tipo_relacion, descripcion_cambio
 */

import { Leaf, GitBranch, Plus, Sparkles, ChevronLeft, Loader2, GitMerge } from "lucide-react";
import React, { useEffect, useState } from "react";

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

interface Rasgo {
  id: string;
  nombre_rasgo: string;
  descripcion: string | null;
  tipo_rasgo: string | null;
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

interface Evolucion {
  id: string;
  especie_origen_id: string | null;
  especie_destino_id: string | null;
  tipo_relacion: string | null;
  descripcion_cambio: string | null;
  origen_nombre?: string | null;
  destino_nombre?: string | null;
  original_id?: string | null;
  original_nombre?: string | null;
}

type SubseccionKey = "catalogo" | "arbol" | "originales";

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

function useRasgosPorGarumi(garumiId: string | null) {
  const [data, setData] = useState<Rasgo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!garumiId) { setData([]); return; }
    let cancelado = false;
    setLoading(true);
    void supabase
      .from("garumi_rasgos")
      .select("id, nombre_rasgo, descripcion, tipo_rasgo")
      .eq("garumi_id", garumiId)
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Rasgo[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [garumiId]);

  return { rasgos: data, loading };
}

function useGarumis(originalId?: string | null) {
  const [data, setData] = useState<Garumi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    let query = supabase
      .from("garumis")
      .select("id, nombre, concepto, original_id, estado_evolutivo, descripcion, estado_documentacion, manifestacion_rasgo_linaje");
    if (originalId) query = query.eq("original_id", originalId);
    void query.order("nombre").then(({ data: rows }) => {
      if (cancelado) return;
      setData((rows ?? []) as Garumi[]);
      setLoading(false);
    });
    return () => { cancelado = true; };
  }, [originalId]);

  function actualizarLocal(g: GarumiEditorItem) {
    setData((prev) => prev.map((item) => item.id === g.id ? { ...item, ...g } : item));
  }
  function eliminarLocal(id: string) {
    setData((prev) => prev.filter((item) => item.id !== id));
  }

  return { garumis: data, loading, actualizarLocal, eliminarLocal };
}

function useEvoluciones() {
  const [data, setData] = useState<Evolucion[]>([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  return { evoluciones: data, loading };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={18} strokeWidth={2} className="animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <p className="py-8 text-center" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: 12 }}>
      {mensaje}
    </p>
  );
}

function RasgoChip({ nombre, tipo }: { nombre: string; tipo?: string | null }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 font-semibold"
      style={{
        borderRadius: "var(--radius-btn)",
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        color: "color-mix(in srgb, var(--primary) 70%, transparent)",
        fontSize: 10,
        letterSpacing: "0.04em",
      }}
    >
      {tipo && (
        <span style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", marginRight: 4 }}>
          {tipo} ·{" "}
        </span>
      )}
      {nombre}
    </span>
  );
}

// ── Helpers para convertir Garumi → GarumiEditorItem ──────────────────────────

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

// ── Tarjeta de Garumi reutilizable ────────────────────────────────────────────

function TarjetaGarumi({
  garumi,
  nombreOriginal,
  activa,
  onClick,
}: {
  garumi: Garumi;
  nombreOriginal: string | null;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex flex-col gap-1.5 p-3.5 transition-all"
      style={{
        borderRadius: "var(--radius-card)",
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
        background: activa
          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
      onMouseEnter={(e) => {
        if (activa) return;
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
      }}
      onMouseLeave={(e) => {
        if (activa) return;
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
      }}
    >
      <p className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
        {garumi.nombre}
      </p>
      {garumi.concepto && (
        <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)", fontStyle: "italic" }}>
          {garumi.concepto}
        </p>
      )}
      <div className="flex flex-wrap gap-1 mt-0.5">
        {nombreOriginal && <RasgoChip nombre={nombreOriginal} tipo="linaje" />}
        {garumi.estado_evolutivo && <RasgoChip nombre={garumi.estado_evolutivo} tipo="etapa" />}
      </div>
    </button>
  );
}

// ── Sub-vistas ────────────────────────────────────────────────────────────────

function VistaCatalogo({
  originales,
  onAbrirEditor,
}: {
  originales: Original[];
  onAbrirEditor: (g: Garumi) => void;
}) {
  const [filtroOriginal, setFiltroOriginal] = useState<string | null>(null);
  const { garumis, loading } = useGarumis(filtroOriginal);

  const nombreOriginal = (id: string | null) =>
    originales.find((o) => o.id === id)?.nombre ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[{ id: null, nombre: "Todos" }, ...originales].map((o) => (
          <button
            key={o.id ?? "todos"}
            type="button"
            onClick={() => setFiltroOriginal(o.id)}
            className="px-3 py-1 font-black uppercase tracking-widest transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              fontSize: 10,
              background: filtroOriginal === o.id
                ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                : "color-mix(in srgb, var(--primary) 5%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          >
            {o.nombre}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : garumis.length === 0 ? (
        <EmptyState mensaje="No hay Garumis registrados todavía." />
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {garumis.map((g) => (
            <TarjetaGarumi
              key={g.id}
              garumi={g}
              nombreOriginal={nombreOriginal(g.original_id)}
              activa={false}
              onClick={() => onAbrirEditor(g)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VistaOriginales({
  originales,
  loading,
  onAbrirEditor,
}: {
  originales: Original[];
  loading: boolean;
  onAbrirEditor: (g: Garumi) => void;
}) {
  const [activoId, setActivoId] = useState<string | null>(null);
  const { rasgos: rasgosActivo, loading: loadingRasgos } = useRasgosPorGarumi(activoId);
  const { garumis: descendientes } = useGarumis(activoId);

  if (loading) return <Spinner />;
  if (originales.length === 0) return <EmptyState mensaje="No hay Originales registrados." />;

  return (
    <div className="flex flex-col gap-3">
      {originales.map((o) => {
        const abierto = activoId === o.id;
        return (
          <div
            key={o.id}
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
              background: abierto
                ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                : "color-mix(in srgb, var(--primary) 2%, transparent)",
              overflow: "hidden",
              transition: "background 0.15s",
            }}
          >
            <button
              type="button"
              onClick={() => setActivoId(abierto ? null : o.id)}
              className="flex items-center justify-between px-4 py-3 w-full text-left"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={13} strokeWidth={2} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span className="font-black uppercase tracking-widest" style={{ fontSize: 12, color: "var(--primary)" }}>
                  {o.nombre}
                </span>
                {o.estado_documentacion === "borrador" && (
                  <span className="font-semibold uppercase" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                    Borrador
                  </span>
                )}
              </div>
              <ChevronLeft
                size={13}
                strokeWidth={2}
                style={{
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                  transform: abierto ? "rotate(-90deg)" : "rotate(180deg)",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              />
            </button>

            {abierto && (
              <div className="px-4 pb-4 flex flex-col gap-3">
                {o.descripcion && (
                  <p className="leading-relaxed" style={{ fontSize: 12, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                    {o.descripcion}
                  </p>
                )}

                {o.rasgo_linaje && (
                  <div>
                    <p className="font-black uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                      Rasgo de linaje
                    </p>
                    <RasgoChip nombre={o.rasgo_linaje} />
                  </div>
                )}

                {/* Rasgos del Original — cargados via garumi_id del propio Original si existe */}
                {rasgosActivo.length > 0 && (
                  <div>
                    <p className="font-black uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                      Rasgos del Original
                    </p>
                    {loadingRasgos ? (
                      <Spinner />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {rasgosActivo.map((r) => <RasgoChip key={r.id} nombre={r.nombre_rasgo} tipo={r.tipo_rasgo} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* Descendientes */}
                {descendientes.length > 0 && (
                  <div>
                    <p className="font-black uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                      Especies descendientes ({descendientes.length})
                    </p>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                      {descendientes.map((d) => (
                        <TarjetaGarumi
                          key={d.id}
                          garumi={d}
                          nombreOriginal={null}
                          activa={false}
                          onClick={() => onAbrirEditor(d)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VistaArbol({
  originales,
  loadingOriginales,
  onAbrirEditor,
}: {
  originales: Original[];
  loadingOriginales: boolean;
  onAbrirEditor: (g: Garumi) => void;
}) {
  const { evoluciones, loading } = useEvoluciones();
  const [filtroOriginal, setFiltroOriginal] = useState<string | null>(null);
  const { garumis } = useGarumis();

  // Sin original_id en evoluciones, filtramos por nombre de origen/destino en garumis del linaje
  const garumisDelLinaje = filtroOriginal
    ? garumis.filter((g) => g.original_id === filtroOriginal).map((g) => g.nombre)
    : null;

  const evolucionesFiltradas = garumisDelLinaje
    ? evoluciones.filter(
        (e) =>
          (e.origen_nombre && garumisDelLinaje.includes(e.origen_nombre)) ||
          (e.destino_nombre && garumisDelLinaje.includes(e.destino_nombre))
      )
    : evoluciones;

  function abrirPorNombre(nombre: string | null | undefined) {
    if (!nombre) return;
    const g = garumis.find((x) => x.nombre === nombre);
    if (g) onAbrirEditor(g);
  }

  return (
    <div className="flex flex-col gap-4">
      {!loadingOriginales && originales.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[{ id: null, nombre: "Todos los linajes" }, ...originales].map((o) => (
            <button
              key={o.id ?? "todos"}
              type="button"
              onClick={() => setFiltroOriginal(o.id)}
              className="px-3 py-1 font-black uppercase tracking-widest transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                fontSize: 10,
                background: filtroOriginal === o.id
                  ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                  : "color-mix(in srgb, var(--primary) 5%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
              }}
            >
              {o.nombre}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : evolucionesFiltradas.length === 0 ? (
        <EmptyState mensaje="No hay evoluciones registradas todavía." />
      ) : (
        <div className="flex flex-col gap-2">
          {evolucionesFiltradas.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 11%, transparent)",
                background: "color-mix(in srgb, var(--primary) 2%, transparent)",
              }}
            >
              {/* Origen — clickeable */}
              <div className="flex flex-col gap-0.5 min-w-0" style={{ flex: "1 1 0" }}>
                {e.origen_nombre && (
                  <button
                    type="button"
                    onClick={() => abrirPorNombre(e.origen_nombre)}
                    className="font-semibold truncate text-left hover:underline transition-all"
                    style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}
                  >
                    {e.origen_nombre}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <GitMerge size={13} strokeWidth={1.5} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                {e.tipo_relacion && (
                  <span className="font-semibold uppercase" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", letterSpacing: "0.06em" }}>
                    {e.tipo_relacion}
                  </span>
                )}
              </div>

              {/* Destino — clickeable */}
              <div className="flex flex-col gap-0.5 min-w-0" style={{ flex: "1 1 0" }}>
                {e.destino_nombre && (
                  <button
                    type="button"
                    onClick={() => abrirPorNombre(e.destino_nombre)}
                    className="font-black uppercase tracking-widest truncate text-left hover:underline transition-all"
                    style={{ fontSize: 11, color: "var(--primary)" }}
                  >
                    {e.destino_nombre}
                  </button>
                )}
                {e.descripcion_cambio && (
                  <span className="truncate" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                    {e.descripcion_cambio}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subsecciones config ───────────────────────────────────────────────────────

const SUBSECCIONES: { key: SubseccionKey; label: string; descripcion: string; Icon: React.ElementType }[] = [
  {
    key: "catalogo",
    label: "Catálogo",
    descripcion: "Fichas de todas las especies Garumi con filtros por Original, etapa evolutiva y capacidades.",
    Icon: Leaf,
  },
  {
    key: "arbol",
    label: "Árbol de linajes",
    descripcion: "Visualización de cada Original y sus descendientes, con líneas evolutivas y ramificaciones.",
    Icon: GitBranch,
  },
  {
    key: "originales",
    label: "Originales",
    descripcion: "Fichas de Orumi, Varum y Nyru: naturaleza, rasgos de linaje y especies descendientes.",
    Icon: Sparkles,
  },
];

// ── Componente principal ──────────────────────────────────────────────────────

export function GarumisSection() {
  const [subseccion, setSubseccion] = useState<SubseccionKey | null>(null);
  const { originales, loading: loadingOriginales } = useOriginales();

  const [garumiEditando, setGarumiEditando] = useState<Garumi | null>(null);

  function abrirEditor(g: Garumi) {
    setGarumiEditando(g);
  }

  function cerrarEditor() {
    setGarumiEditando(null);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg-main)" }}>
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Breadcrumb */}
        {subseccion && (
          <div className="flex items-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => setSubseccion(null)}
              className="flex items-center gap-1.5 transition-all"
              style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              <ChevronLeft size={12} strokeWidth={2.5} />
              Garumis
            </button>
            <span style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", fontSize: 11 }}>›</span>
            <span className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
              {SUBSECCIONES.find((s) => s.key === subseccion)?.label}
            </span>
          </div>
        )}

        {/* Menú principal */}
        {!subseccion && (
          <>
            <div className="mb-5">
              <button
                type="button"
                className="flex items-center gap-2 px-4 transition-all"
                style={{
                  height: 36,
                  borderRadius: "var(--radius-btn)",
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "var(--primary)",
                  border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 16%, transparent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span className="text-micro font-black uppercase tracking-widest">Nuevo Garumi</span>
              </button>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {SUBSECCIONES.map(({ key, label, descripcion, Icon }) => (
                <button
                  key={key}
                  type="button"
                  className="text-left flex flex-col gap-2 p-4 transition-all"
                  style={{
                    borderRadius: "var(--radius-card)",
                    border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; }}
                  onClick={() => setSubseccion(key)}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} strokeWidth={2} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
                      {label}
                    </span>
                  </div>
                  <p style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", fontSize: 11, lineHeight: 1.5 }}>
                    {descripcion}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Contenido de subsección */}
        {subseccion === "catalogo" && (
          <VistaCatalogo originales={originales} onAbrirEditor={abrirEditor} />
        )}
        {subseccion === "originales" && (
          <VistaOriginales originales={originales} loading={loadingOriginales} onAbrirEditor={abrirEditor} />
        )}
        {subseccion === "arbol" && (
          <VistaArbol originales={originales} loadingOriginales={loadingOriginales} onAbrirEditor={abrirEditor} />
        )}

      </div>

      {/* ── Editor flotante ─────────────────────────────────────────────── */}
      {garumiEditando && (
        <GarumiEditorPortal
          item={toEditorItem(garumiEditando)}
          originales={originales}
          onGuardado={(g) => {
            setGarumiEditando((prev) => (prev?.id === g.id ? { ...prev, ...g } : prev));
          }}
          onEliminado={() => {
            setGarumiEditando(null);
          }}
          onCerrar={cerrarEditor}
        />
      )}
    </div>
  );
}
