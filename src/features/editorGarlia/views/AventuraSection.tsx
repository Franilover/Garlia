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

import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Compass,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Maximize2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { MotionDiv } from "@/components/ui/Motion";

import {
  buscarEntidades,
  TABLA_LABEL,
  useAventuraEntidades,
  useAventurasList,
  type AventuraEntidad,
  type ResultadoBusqueda,
} from "../hooks/aventuras/useAventuras";
import {
  TableroAventura,
  TABLERO_CARD_SIZE,
  type TableroItem,
} from "../components/aventuras/TableroAventura";
import { PanelIdentidadesDM } from "../components/aventuras/PanelIdentidadesDM";

const AdminDescubrimientos = lazy(() => import("./editorRelaciones"));

type SubPanel = "aventuras" | "relaciones";

const SUB_PANELES: { key: SubPanel; label: string; Icon: React.ElementType }[] =
  [
    { key: "aventuras", label: "Aventuras", Icon: Compass },
    { key: "relaciones", label: "Relaciones", Icon: Heart },
  ];

// ── Tamaño de tarjeta del pizarrón: ajustable por el DM, persistido en el
// navegador (por aventura). Es una preferencia visual del DM, no afecta lo
// que ven los jugadores (el público siempre usa TABLERO_CARD_SIZE fijo). ──
const CARD_SCALE_MIN = 0.6;
const CARD_SCALE_MAX = 1.8;
const CARD_SCALE_KEY_PREFIX = "aventura-tablero-escala:";

function useTableroEscala(aventuraId: string) {
  const storageKey = `${CARD_SCALE_KEY_PREFIX}${aventuraId}`;
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const guardada = window.localStorage.getItem(storageKey);
    const valor = guardada ? Number(guardada) : 1;
    setEscala(
      Number.isFinite(valor)
        ? Math.min(CARD_SCALE_MAX, Math.max(CARD_SCALE_MIN, valor))
        : 1,
    );
  }, [storageKey]);

  const actualizar = useCallback(
    (nuevaEscala: number) => {
      const clamped = Math.min(
        CARD_SCALE_MAX,
        Math.max(CARD_SCALE_MIN, nuevaEscala),
      );
      setEscala(clamped);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, String(clamped));
      }
    },
    [storageKey],
  );

  return { escala, actualizar };
}

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
      {/* ── Sub-selector: Aventuras / Relaciones ─────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-b border-primary/10">
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
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
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
            <AventuraDetalle
              aventuraId={aventuraActiva}
              onVolver={() => setAventuraActiva(null)}
            />
          ) : (
            <AventuraIndice onSeleccionar={setAventuraActiva} />
          ))}

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

function AventuraIndice({
  onSeleccionar,
}: {
  onSeleccionar: (id: string) => void;
}) {
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
          {creando ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Plus size={13} />
          )}
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
                    if (
                      confirm(
                        `¿Eliminar "${a.nombre}" y todo su contenido asociado?`,
                      )
                    ) {
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
  const {
    entidades,
    loading,
    agregar,
    quitar,
    togglePublicado,
    moverPosicion,
  } = useAventuraEntidades(aventuraId);
  const aventura = aventuras.find((a) => a.id === aventuraId);

  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());
  const [seleccion, setSeleccion] = useState<AventuraEntidad | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { escala, actualizar: actualizarEscala } = useTableroEscala(aventuraId);

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
    // Guard sincrónico: evita el doble-click/carrera antes de que el
    // estado de React (pendientes/entidades) alcance a re-renderizar.
    if (pendientes.has(key) || yaAgregada(r.tabla, r.id)) return;
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
          {entidades.filter((e) => e.publicado).length === 1 ? "" : "s"} de{" "}
          {entidades.length}
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
          {buscando && (
            <Loader2 size={12} className="animate-spin text-primary/30" />
          )}
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
                      <img
                        src={r.imagen_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
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
                    <Loader2
                      size={12}
                      className="animate-spin text-primary/40"
                    />
                  ) : yaEsta ? (
                    <span className="text-micro font-bold text-primary/30">
                      Añadida
                    </span>
                  ) : (
                    <Plus size={13} className="text-primary/40" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tablero libre (izq) + Identidades en dropdowns (der) ──────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col p-4 gap-2 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-micro text-primary/35">
              Arrastrá las tarjetas para ordenarlas como quieras en el pizarrón.
              El ojo publica/oculta para los jugadores; la X quita del todo.
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <Maximize2 size={11} className="text-primary/35" />
              <input
                type="range"
                min={CARD_SCALE_MIN}
                max={CARD_SCALE_MAX}
                step={0.05}
                value={escala}
                onChange={(e) => actualizarEscala(Number(e.target.value))}
                className="w-24 accent-[var(--primary)]"
                title="Tamaño de las tarjetas (solo en tu vista de DM)"
              />
              <span className="text-micro font-bold tabular-nums text-primary/40 w-9">
                {Math.round(escala * 100)}%
              </span>
            </div>
          </div>
          {loading && entidades.length === 0 ? (
            <div className="py-16 flex items-center justify-center text-primary/30">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : (
            <TableroAventura
              editable
              emptyHint="Busca arriba y añade lo que quieras tener a mano para esta aventura."
              cardWidth={Math.round(TABLERO_CARD_SIZE.width * escala)}
              cardHeight={Math.round(TABLERO_CARD_SIZE.height * escala)}
              imageWidth={Math.round(TABLERO_CARD_SIZE.imageWidth * escala)}
              items={entidades.map(
                (e): TableroItem => ({
                  id: e.id,
                  nombre: e.nombre,
                  imagen_url: e.imagen_url,
                  subtitulo: TABLA_LABEL[e.tabla].singular,
                  pos_x: e.pos_x,
                  pos_y: e.pos_y,
                  destacado: e.publicado,
                }),
              )}
              renderBadge={(item) => {
                const e = entidades.find((x) => x.id === item.id);
                if (!e) return null;
                const isPending = pendientes.has(e.id);
                return (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleToggle(e);
                      }}
                      onPointerDown={(ev) => ev.stopPropagation()}
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        e.publicado
                          ? "bg-primary text-white"
                          : "bg-black/30 text-white/70"
                      }`}
                      title={
                        e.publicado
                          ? "Publicado (click para ocultar)"
                          : "Oculto (click para publicar)"
                      }
                    >
                      {isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : e.publicado ? (
                        <Eye size={11} />
                      ) : (
                        <EyeOff size={11} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        quitar(e.id);
                      }}
                      onPointerDown={(ev) => ev.stopPropagation()}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-black/30 hover:bg-red-500/70 text-white transition-colors"
                      title="Quitar de esta aventura"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              }}
              onMove={(id, x, y) => moverPosicion(id, x, y)}
              onClickItem={(id) => {
                const e = entidades.find((x) => x.id === id);
                if (e) setSeleccion(e);
              }}
            />
          )}
        </div>

        {/* ── Columna lateral: identidades como dropdowns ───────────── */}
        <div
          className="relative z-10 w-72 shrink-0 border-l border-primary/10 overflow-hidden"
          style={{ background: "var(--bg-main)" }}
        >
          <PanelIdentidadesDM />
        </div>
      </div>

      {/* ── Modal de detalle (misma vista que ve el jugador) ────────── */}
      <AnimatePresence>
        {seleccion && (
          <MotionDiv
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSeleccion(null)}
          >
            <MotionDiv
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6"
              exit={{ opacity: 0, scale: 0.96 }}
              initial={{ opacity: 0, scale: 0.96 }}
              style={{ background: "var(--white-custom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSeleccion(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <X size={14} className="text-primary/60" />
              </button>

              {seleccion.imagen_url && (
                <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-primary/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={seleccion.imagen_url}
                    alt={seleccion.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                {TABLA_LABEL[seleccion.tabla].singular}
              </span>
              <h2 className="font-serif italic text-2xl text-primary mb-3">
                {seleccion.nombre}
              </h2>

              {seleccion.descripcion ? (
                <p className="text-sm text-primary/70 whitespace-pre-wrap leading-relaxed">
                  {seleccion.descripcion}
                </p>
              ) : (
                <p className="text-sm text-primary/30 italic">
                  Sin descripción todavía.
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-black uppercase ${
                    seleccion.publicado
                      ? "bg-primary text-white"
                      : "bg-primary/10 text-primary/50"
                  }`}
                >
                  {seleccion.publicado ? (
                    <Eye size={10} />
                  ) : (
                    <EyeOff size={10} />
                  )}
                  {seleccion.publicado ? "Publicado" : "Oculto"}
                </span>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
