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
 *   4. Panel lateral "Jugadores": todas las fichas_dnd de esta aventura,
 *      con acceso directo para el DM a editar sus stats (FUE/DES/CON/INT/
 *      SAB/CAR, HP, CA, velocidad, nivel, clase — bloqueadas para el
 *      jugador desde la migración 005) y su inventario (agregar/quitar
 *      objetos, también solo DM; el jugador solo puede equipar/desequipar).
 */

import {
  ArrowLeft,
  Compass,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { SelectorItemInventario } from "@/features/garlia/components/SelectorItemInventario";
import {
  statMod,
  useInventarioFichaResuelto,
  type FichaDnd,
} from "@/features/garlia/hooks/useFichasDnd";
import { supabase } from "@/lib/api/client/supabase";

import {
  buscarEntidades,
  TABLA_LABEL,
  useAventuraEntidades,
  useAventurasList,
  type AventuraEntidad,
  type ResultadoBusqueda,
} from "../hooks/aventuras/useAventuras";

export function AventuraSection() {
  const [aventuraActiva, setAventuraActiva] = useState<string | null>(null);

  if (aventuraActiva) {
    return (
      <AventuraDetalle aventuraId={aventuraActiva} onVolver={() => setAventuraActiva(null)} />
    );
  }

  return <AventuraIndice onSeleccionar={setAventuraActiva} />;
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
  const [fichaAbierta, setFichaAbierta] = useState<AventuraEntidad | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const jugadores = entidades.filter((e) => e.tabla === "fichas_dnd");

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

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ── Columna izquierda: buscador + entidades ─────────────────── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
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
                  {e.tabla === "fichas_dnd" && (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setFichaAbierta(e);
                      }}
                      className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/30 hover:bg-primary text-white transition-all"
                      title="Editar ficha de este jugador"
                    >
                      <Info size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>

        {/* ── Columna derecha: Jugadores ─────────────────────────────── */}
        <div className="w-64 shrink-0 min-h-0 flex flex-col border-l border-primary/10 overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-primary/10">
            <Users size={13} className="text-primary/50" />
            <h3 className="text-xs font-black uppercase tracking-widest text-primary/70">
              Jugadores
            </h3>
            <span className="ml-auto text-micro font-bold text-primary/35">{jugadores.length}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
            {jugadores.length === 0 ? (
              <p className="text-micro text-primary/30 italic px-1 py-4">
                Ningún jugador (ficha) añadido a esta aventura todavía. Búscalo arriba por su nombre.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {jugadores.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setFichaAbierta(j)}
                    className="w-full flex items-center gap-2 p-2 rounded-xl border border-primary/10 bg-primary/[0.02] hover:border-primary/25 text-left transition-all"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden bg-primary/5 relative">
                      {j.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={j.imagen_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Swords size={13} className="text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-primary/80 truncate">{j.nombre}</div>
                      <div className="text-micro text-primary/35 truncate">{j.descripcion || "Ver ficha"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {fichaAbierta && (
        <PanelFichaDM ficha={fichaAbierta} onCerrar={() => setFichaAbierta(null)} />
      )}
    </div>
  );
}

// ── Panel DM: ficha de un jugador (stats + inventario, editable) ────────

const STATS_KEYS: { key: keyof Pick<FichaDnd, "fuerza" | "destreza" | "constitucion" | "inteligencia" | "sabiduria" | "carisma">; label: string }[] = [
  { key: "fuerza", label: "FUE" },
  { key: "destreza", label: "DES" },
  { key: "constitucion", label: "CON" },
  { key: "inteligencia", label: "INT" },
  { key: "sabiduria", label: "SAB" },
  { key: "carisma", label: "CAR" },
];

function fmtMod(score: number): string {
  const m = statMod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

function PanelFichaDM({
  ficha,
  onCerrar,
}: {
  ficha: AventuraEntidad;
  onCerrar: () => void;
}) {
  const [datos, setDatos] = useState<FichaDnd | null>(null);
  const [borrador, setBorrador] = useState<Partial<FichaDnd>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const { items, loading: itemsLoading, quitar } = useInventarioFichaResuelto(ficha.entidad_id);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    supabase
      .from("fichas_dnd")
      .select("*")
      .eq("id", ficha.entidad_id)
      .single()
      .then(({ data }) => {
        if (!vivo) return;
        if (data) {
          setDatos(data as FichaDnd);
          setBorrador(data as FichaDnd);
        }
        setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [ficha.entidad_id]);

  const cambio = (key: keyof FichaDnd, value: string) => {
    setBorrador((prev) => ({ ...prev, [key]: value === "" ? 0 : Number(value) }));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const { fuerza, destreza, constitucion, inteligencia, sabiduria, carisma, hp_max, hp_actual, ca, velocidad, nivel, clase } =
        borrador;
      const { error } = await supabase
        .from("fichas_dnd")
        .update({ fuerza, destreza, constitucion, inteligencia, sabiduria, carisma, hp_max, hp_actual, ca, velocidad, nivel, clase })
        .eq("id", ficha.entidad_id);
      if (error) throw error;
      setDatos((prev) => (prev ? { ...prev, ...borrador } : prev));
    } finally {
      setGuardando(false);
    }
  };

  // Agrega un objeto directamente (el DM tiene permiso vía RLS/policy admin).
  const agregarObjeto = async (item: { id: string; nombre: string; imagen_url: string | null }) => {
    await supabase.from("fichas_dnd_inventario").insert({
      ficha_id: ficha.entidad_id,
      item_id: item.id,
      nombre: item.nombre,
      imagen_url: item.imagen_url ?? null,
      cantidad: 1,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onCerrar}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--white-custom)" }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-primary/10">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-serif italic text-primary truncate">{ficha.nombre}</h3>
            <span className="text-micro font-bold uppercase tracking-wide text-primary/35">
              Ficha del jugador — control del DM
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
          >
            <X size={13} className="text-primary/50" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
          {cargando || !datos ? (
            <div className="py-10 flex items-center justify-center text-primary/30">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : (
            <>
              {/* ── Vitales ────────────────────────────────────────────── */}
              <div>
                <h4 className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2 flex items-center gap-1.5">
                  <Shield size={11} /> Vitales, nivel y clase
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <CampoNumero label="HP máx" value={borrador.hp_max} onChange={(v) => cambio("hp_max", v)} />
                  <CampoNumero label="HP actual" value={borrador.hp_actual} onChange={(v) => cambio("hp_actual", v)} />
                  <CampoNumero label="CA" value={borrador.ca} onChange={(v) => cambio("ca", v)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <CampoNumero label="Velocidad" value={borrador.velocidad} onChange={(v) => cambio("velocidad", v)} />
                  <CampoNumero label="Nivel" value={borrador.nivel} onChange={(v) => cambio("nivel", v)} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-micro font-black uppercase tracking-widest text-primary/35 px-0.5">
                      Clase
                    </span>
                    <input
                      type="text"
                      value={(borrador.clase as string) ?? ""}
                      onChange={(e) => setBorrador((prev) => ({ ...prev, clase: e.target.value }))}
                      className="h-9 px-2 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-xs text-primary/80 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* ── Stats ──────────────────────────────────────────────── */}
              <div>
                <h4 className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2 flex items-center gap-1.5">
                  <Sparkles size={11} /> Stats
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {STATS_KEYS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl border border-primary/10 bg-primary/[0.02]"
                    >
                      <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                        {label}
                      </span>
                      <input
                        type="number"
                        value={(borrador[key] as number) ?? 10}
                        onChange={(e) => cambio(key, e.target.value)}
                        className="w-12 text-center bg-transparent outline-none text-lg font-black text-primary"
                      />
                      <span className="text-micro text-primary/30">
                        {fmtMod((borrador[key] as number) ?? 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="h-9 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 transition-opacity"
              >
                {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar cambios
              </button>

              {/* ── Inventario ─────────────────────────────────────────── */}
              <div>
                <h4 className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
                  Inventario
                </h4>
                <div className="mb-2.5">
                  <SelectorItemInventario onAgregar={agregarObjeto} />
                </div>
                {itemsLoading ? (
                  <div className="py-6 flex items-center justify-center text-primary/30">
                    <Loader2 className="animate-spin" size={16} />
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-primary/30 italic text-center py-4">
                    Este jugador no tiene objetos en su inventario.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/10 bg-primary/[0.02]"
                      >
                        {item.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imagen_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <span className="w-8 h-8 rounded bg-primary/5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-primary/80 truncate">
                            {item.nombre}
                            {!item.vinculoVivo && item.item_id === null && (
                              <span className="ml-1 text-micro text-primary/30 italic">(borrado)</span>
                            )}
                          </div>
                        </div>
                        {item.equipado && (
                          <span className="text-micro font-black uppercase text-primary/50">Equipado</span>
                        )}
                        {item.cantidad > 1 && (
                          <span className="text-micro text-primary/35">×{item.cantidad}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => quitar(item.id)}
                          className="shrink-0 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-primary/30 transition-all"
                          title="Quitar objeto"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-black uppercase tracking-widest text-primary/35 px-0.5">
        {label}
      </span>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-xs text-primary/80 text-center"
      />
    </div>
  );
}
