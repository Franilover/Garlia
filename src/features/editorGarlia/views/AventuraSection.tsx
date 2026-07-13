"use client";

/**
 * AventuraSection
 * ───────────────────────────────────────────────────────────────────────────
 * Tab "Aventura" (primera, junto a Línea de Tiempo) en myself/garlia.
 *
 * Flujo:
 *   1. Lista de aventuras (ej "El Bosque Sombrío", "La Ciudad Portuaria").
 *      Se crean nuevas con un nombre.
 *   2. Al entrar a una aventura: buscador para AGREGAR entidades de
 *      cualquier tabla (criaturas, items, PNJs...) — esto solo las
 *      preselecciona, no las hace visibles a jugadores todavía.
 *   3. Cada entidad agregada tiene un toggle Publicar/Ocultar — así el DM
 *      va revelando una por una en vivo durante la sesión.
 */

import {
  ArrowLeft,
  Compass,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Plus,
  Scroll,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";

import {
  buscarEntidades,
  TABLA_LABEL,
  useAventuraEntidades,
  useAventurasList,
  type AventuraEntidad,
  type ResultadoBusqueda,
} from "../hooks/aventuras/useAventuras";

const EditorMisiones = lazy(() => import("./editorMisiones"));
const AdminDescubrimientos = lazy(() => import("./editorRelaciones"));

type SubPanel = "aventuras" | "misiones" | "relaciones";

const SUB_PANELES: { key: SubPanel; label: string; Icon: React.ElementType }[] = [
  { key: "aventuras", label: "Aventuras", Icon: Compass },
  { key: "misiones", label: "Misiones", Icon: Scroll },
  { key: "relaciones", label: "Relaciones", Icon: Heart },
];

function SubPanelFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-primary/30 py-16">
      <Loader2 className="animate-spin" size={18} />
    </div>
  );
}

export function AventuraSection() {
  const [subPanel, setSubPanel] = useState<SubPanel>("aventuras");
  const [aventuraActiva, setAventuraActiva] = useState<string | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Sub-selector: Aventuras / Misiones / Relaciones ─────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-b border-primary/10 overflow-x-auto">
        {SUB_PANELES.map(({ key, label, Icon }) => {
          const active = subPanel === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSubPanel(key);
                if (key !== "aventuras") setAventuraActiva(null);
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-primary/50 hover:bg-primary/5 hover:text-primary/80"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Contenido del sub-panel activo ──────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {subPanel === "aventuras" &&
          (aventuraActiva ? (
            <AventuraDetalle aventuraId={aventuraActiva} onVolver={() => setAventuraActiva(null)} />
          ) : (
            <AventuraIndice onSeleccionar={setAventuraActiva} />
          ))}

        {subPanel === "misiones" && (
          <Suspense fallback={<SubPanelFallback />}>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EditorMisiones />
            </div>
          </Suspense>
        )}

        {subPanel === "relaciones" && (
          <Suspense fallback={<SubPanelFallback />}>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AdminDescubrimientos />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}

// ── Índice de aventuras ─────────────────────────────────────────────────

function AventuraIndice({ onSeleccionar }: { onSeleccionar: (id: string) => void }) {
  const { aventuras, loading, crear, eliminar } = useAventurasList();
  const [nombreNueva, setNombreNueva] = useState("");
  const [creando, setCreando] = useState(false);

  const handleCrear = async () => {
    const nombre = nombreNueva.trim();
    if (!nombre) return;
    setCreando(true);
    try {
      const nueva = await crear(nombre);
      setNombreNueva("");
      onSeleccionar(nueva.id);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <Compass size={13} className="text-primary/50" />
        <h2 className="text-xs font-black uppercase tracking-widest text-primary/70">
          Aventuras
        </h2>
      </div>

      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <input
          type="text"
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCrear()}
          placeholder="Nombre de la nueva aventura… ej. El Bosque Sombrío"
          className="flex-1 h-9 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-xs text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors"
        />
        <button
          type="button"
          disabled={!nombreNueva.trim() || creando}
          onClick={handleCrear}
          className="shrink-0 h-9 px-3 flex items-center gap-1.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 transition-opacity"
        >
          {creando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Crear
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading && aventuras.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : aventuras.length === 0 ? (
          <div className="py-16 text-center text-xs text-primary/30">
            Aún no has creado ninguna aventura.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {aventuras.map((a) => (
              <div
                key={a.id}
                className="group relative flex flex-col text-left overflow-hidden rounded-xl border border-primary/10 bg-primary/[0.02] hover:border-primary/25 transition-all"
              >
                <button
                  type="button"
                  onClick={() => onSeleccionar(a.id)}
                  className="flex-1 p-4 text-left"
                >
                  <h3 className="font-serif italic text-base text-primary truncate">
                    {a.nombre}
                  </h3>
                  <span className="text-micro text-primary/35">
                    Creada el{" "}
                    {new Date(a.created_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar "${a.nombre}" y todo su contenido asociado?`)) {
                      eliminar(a.id);
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 bg-black/5 hover:bg-red-500/10 hover:text-red-500 text-primary/30 transition-all"
                  title="Eliminar aventura"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detalle de una aventura ──────────────────────────────────────────────

function AventuraDetalle({
  aventuraId,
  onVolver,
}: {
  aventuraId: string;
  onVolver: () => void;
}) {
  const { aventuras } = useAventurasList();
  const { entidades, loading, agregar, quitar, togglePublicado } =
    useAventuraEntidades(aventuraId);
  const aventura = aventuras.find((a) => a.id === aventuraId);

  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const r = await buscarEntidades(query);
      setResultados(r);
      setBuscando(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const yaAgregada = (tabla: string, id: string) =>
    entidades.some((e) => e.tabla === tabla && e.entidad_id === id);

  const marcarPendiente = (key: string, activo: boolean) => {
    setPendientes((prev) => {
      const next = new Set(prev);
      if (activo) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleAgregar = async (r: ResultadoBusqueda) => {
    const key = `${r.tabla}:${r.id}`;
    marcarPendiente(key, true);
    try {
      await agregar(r.tabla, r.id);
    } finally {
      marcarPendiente(key, false);
    }
  };

  const handleToggle = async (e: AventuraEntidad) => {
    marcarPendiente(e.id, true);
    try {
      await togglePublicado(e);
    } finally {
      marcarPendiente(e.id, false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Cabecera ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <button
          type="button"
          onClick={onVolver}
          className="shrink-0 p-1.5 -ml-1.5 rounded-full hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft size={14} className="text-primary/50" />
        </button>
        <h2 className="text-xs font-black uppercase tracking-widest text-primary/70 truncate">
          {aventura?.nombre ?? "Aventura"}
        </h2>
        <span className="text-micro font-bold text-primary/35">
          {entidades.filter((e) => e.publicado).length} publicada
          {entidades.filter((e) => e.publicado).length === 1 ? "" : "s"} de {entidades.length}
        </span>
      </div>

      {/* ── Buscador para agregar ───────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-primary/10 relative">
        <div
          className="flex items-center gap-2 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] focus-within:border-primary/30 transition-colors"
          style={{ height: "34px" }}
        >
          <Search size={13} className="text-primary/35 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar criaturas, items, PNJs… para añadir a esta aventura"
            className="flex-1 bg-transparent outline-none text-xs text-primary/80 placeholder:text-primary/30"
          />
          {buscando && <Loader2 size={12} className="animate-spin text-primary/30" />}
          {query && !buscando && (
            <button type="button" onClick={() => setQuery("")}>
              <X size={12} className="text-primary/40" />
            </button>
          )}
        </div>

        {resultados.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 z-20 max-h-72 overflow-y-auto rounded-xl border border-primary/10 bg-[var(--white-custom)] shadow-lg">
            {resultados.map((r) => {
              const key = `${r.tabla}:${r.id}`;
              const yaEsta = yaAgregada(r.tabla, r.id);
              const isPending = pendientes.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={yaEsta || isPending}
                  onClick={() => handleAgregar(r)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/5 disabled:opacity-50 transition-colors"
                >
                  <div className="w-8 h-8 shrink-0 rounded-md overflow-hidden bg-primary/5">
                    {r.imagen_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imagen_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-primary/80 truncate">
                      {r.nombre}
                    </div>
                    <div className="text-micro text-primary/35">
                      {TABLA_LABEL[r.tabla].singular}
                    </div>
                  </div>
                  {isPending ? (
                    <Loader2 size={12} className="animate-spin text-primary/40" />
                  ) : yaEsta ? (
                    <span className="text-micro font-bold text-primary/30">Añadida</span>
                  ) : (
                    <Plus size={13} className="text-primary/40" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Entidades de esta aventura ──────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading && entidades.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : entidades.length === 0 ? (
          <div className="py-16 text-center text-xs text-primary/30">
            Busca arriba y añade lo que quieras tener a mano para esta aventura.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {entidades.map((e) => {
              const isPending = pendientes.has(e.id);
              return (
                <div
                  key={e.id}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all ${
                    e.publicado
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-primary/10 bg-primary/[0.02]"
                  }`}
                >
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggle(e)}
                    className="text-left disabled:opacity-60"
                  >
                    <div className="w-full h-20 shrink-0 overflow-hidden relative bg-primary/5">
                      {e.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imagen_url} alt={e.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-primary/15 text-micro font-black uppercase">
                          {TABLA_LABEL[e.tabla].singular}
                        </div>
                      )}
                      <div
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
                          e.publicado ? "bg-primary text-white" : "bg-black/30 text-white/70"
                        }`}
                      >
                        {isPending ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : e.publicado ? (
                          <Eye size={11} />
                        ) : (
                          <EyeOff size={11} />
                        )}
                      </div>
                    </div>
                    <div className="p-2 flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-primary/80 truncate">
                        {e.nombre}
                      </span>
                      <span className="text-micro font-bold uppercase tracking-wide text-primary/35">
                        {e.publicado ? "Publicado" : "Oculto"}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => quitar(e.id)}
                    className="absolute top-1.5 left-1.5 p-1 rounded-full opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-red-500/70 text-white transition-all"
                    title="Quitar de esta aventura"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
