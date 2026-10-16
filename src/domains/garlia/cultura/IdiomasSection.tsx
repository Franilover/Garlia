"use client";
/**
 * IdiomasSection — Editor de Mundo · Idiomas  v5
 * ──────────────────────────────────────────────
 * 3 tabs en lugar de 9:
 *
 *   General   → Info + Escritura + Variedades + Familias + Relaciones + Períodos
 *               (todo lo que describe QUÉ es el idioma y su contexto)
 *
 *   Estructura → Fonología | Morfología | Gramática como FilaAsimetrica
 *               (todo lo que describe CÓMO funciona el idioma)
 *
 *   Léxico     → Diccionario con buscador propio
 *               (separado por volumen y flujo de trabajo distinto)
 */
import {
  AlignLeft, Book, BookOpen, Check, ChevronDown, ChevronUp,
  FileText, Globe, Languages, List, Loader2, Mic, Plus,
  Search, Trash2, X, Link2, Layers, PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { FilaAsimetrica }    from "@/domains/garlia/_shared/FilaAsimetrica";
import { TituloCategoria }   from "@/domains/garlia/_shared/TituloCategoria";
import {
  INPUT_CLS, LABEL_CLS,
  BTN_PRIMARY_CLS, BTN_GHOST_CLS, BTN_ICON_CLS,
  SECTION_TITLE_CLS,
} from "@/domains/garlia/_shared/types";

import {
  useIdiomas, useIdiomaDetalle, useFonemas, useLexemas,
  useMorfemas, useVariedades, useSistemasEscritura, usePerfilGramatical,
  usePeriodos, useFamilias, useSistemasEscrituraGlobal,
} from "./useIdiomas";
import type {
  Idioma, Lexema, PerfilGramatical,
  EstadoCanon, CategoriaGramatical, ClaseFonema, TipoVariedad,
} from "./types";

// ── Tokens visuales de estado ─────────────────────────────────────────────

const ESTADO_LABELS: Record<EstadoCanon, string> = {
  borrador: "Borrador", canon: "Cánon", revision: "En revisión", descartado: "Descartado",
};
const ESTADO_CLS: Record<EstadoCanon, { dot: string; badge: string }> = {
  borrador:   { dot: "bg-primary/30",  badge: "text-primary/50 bg-primary/8 border-primary/15" },
  canon:      { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  revision:   { dot: "bg-amber-400",   badge: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  descartado: { dot: "bg-red-400/70",  badge: "text-red-400/70 bg-red-400/8 border-red-400/15" },
};

const CAT_GRAM_LABELS: Record<CategoriaGramatical, string> = {
  sustantivo: "Sustantivo", verbo: "Verbo", adjetivo: "Adjetivo", adverbio: "Adverbio",
  pronombre: "Pronombre", preposicion: "Preposición", conjuncion: "Conjunción",
  interjeccion: "Interjección", articulo: "Artículo", numeral: "Numeral",
  particula: "Partícula", clasificador: "Clasificador", otro: "Otro",
};
const CATS_GRAM = Object.keys(CAT_GRAM_LABELS) as CategoriaGramatical[];

const CLASE_FONEMA_LABELS: Record<ClaseFonema, string> = {
  consonante: "Consonante", vocal: "Vocal", semivocal: "Semivocal", tono: "Tono", otro: "Otro",
};
const CLASES_FONEMA = Object.keys(CLASE_FONEMA_LABELS) as ClaseFonema[];

const TIPO_VARIEDAD_LABELS: Record<TipoVariedad, string> = {
  dialectal: "Dialectal", sociolecto: "Sociolecto", registro: "Registro",
  historica: "Histórica", otro: "Otro",
};

// ── Tabs (3) ──────────────────────────────────────────────────────────────

type TabId = "general" | "estructura" | "lexico";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general",    label: "General",    icon: <FileText size={13} /> },
  { id: "estructura", label: "Estructura", icon: <Layers   size={13} /> },
  { id: "lexico",     label: "Léxico",     icon: <Book     size={13} /> },
];

// ── Componente principal ──────────────────────────────────────────────────

export function IdiomasSection() {
  const { idiomas, loading: loadingLista, crear: crearIdioma, eliminar: eliminarIdioma } = useIdiomas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("general");
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const idiomasFiltrados = idiomas.filter((i) =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.endonimo ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  useEffect(() => { if (creando) inputRef.current?.focus(); }, [creando]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nuevo = await crearIdioma(nombre);
    if (nuevo) { setSelectedId(nuevo.id); setTab("general"); setSidebarOpen(false); }
    setCreando(false);
    setNuevoNombre("");
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Lista lateral ──────────────────────────────────────────── */}
      <aside className={`
        shrink-0 border-r border-primary/10 flex flex-col
        transition-all duration-200 ease-in-out overflow-hidden
        ${sidebarOpen ? "w-64" : "w-0 border-r-0"}
      `}>

        <div className="border-b border-primary/10">
          {/* Buscador + botón nuevo en la misma fila */}
          <div className="p-2 flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-input-bg min-w-0">
              <Search size={12} className="text-primary/30 shrink-0" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar idioma…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-primary/25"
              />
            </div>
            <button
              type="button"
              onClick={() => setCreando(true)}
              title="Nuevo idioma"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary/8 hover:bg-primary/20 transition-colors text-primary/60 hover:text-primary"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Formulario crear */}
        {creando && (
          <div className="px-2 py-2 border-b border-primary/10 bg-primary/4">
            <input
              ref={inputRef}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCrear();
                if (e.key === "Escape") { setCreando(false); setNuevoNombre(""); }
              }}
              placeholder="Nombre del idioma…"
              className={`${INPUT_CLS} mb-2`}
            />
            <div className="flex gap-1.5">
              <button onClick={handleCrear} className={`${BTN_PRIMARY_CLS} flex-1`}>Crear</button>
              <button onClick={() => { setCreando(false); setNuevoNombre(""); }} className={`${BTN_GHOST_CLS} flex-1`}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingLista && (
            <div className="flex justify-center py-6">
              <Loader2 size={15} className="text-primary/30 animate-spin" />
            </div>
          )}
          {!loadingLista && idiomasFiltrados.map((idioma: Idioma) => {
            const activo = selectedId === idioma.id;
            const estado = idioma.estado ?? "borrador";
            return (
              <button
                key={idioma.id}
                type="button"
                onClick={() => { setSelectedId(idioma.id); setTab("general"); setSidebarOpen(false); }}
                className={`
                  w-full px-3 py-2.5 text-left flex items-center justify-between gap-2
                  border-l-2 transition-colors
                  ${activo
                    ? "border-primary bg-primary/8 text-primary font-semibold"
                    : "border-transparent text-primary/60 hover:text-primary hover:bg-primary/5 font-medium"}
                `}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{idioma.nombre}</span>
                  {idioma.endonimo && (
                    <span className="block text-[11px] text-primary/35 truncate italic">{idioma.endonimo}</span>
                  )}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${ESTADO_CLS[estado].dot}`} />
              </button>
            );
          })}
          {!loadingLista && idiomasFiltrados.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-primary/30 italic">
              {busqueda ? "Sin resultados" : "No hay idiomas todavía"}
            </p>
          )}
        </div>
      </aside>

      {/* ── Panel de detalle ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedId ? (
          <DetalleIdioma
            idiomaId={selectedId}
            tab={tab}
            onTabChange={setTab}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onEliminar={async () => {
              await eliminarIdioma(selectedId);
              setSelectedId(null);
              setSidebarOpen(true);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toggle visible también en empty state */}
            <div className="px-3 pt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                title={sidebarOpen ? "Ocultar lista" : "Mostrar lista"}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/30 hover:text-primary/70 hover:bg-primary/8 transition-colors"
              >
                {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-primary/20">
                <Languages size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-xs">Seleccioná un idioma o creá uno nuevo</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Panel detalle ─────────────────────────────────────────────────────────

function DetalleIdioma({
  idiomaId, tab, onTabChange, onEliminar, sidebarOpen, onToggleSidebar,
}: {
  idiomaId: string;
  tab: TabId;
  onTabChange: (t: TabId) => void;
  onEliminar: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const det       = useIdiomaDetalle(idiomaId);
  const fonemas   = useFonemas(idiomaId);
  const lexemas   = useLexemas(idiomaId);
  const morfemas  = useMorfemas(idiomaId);
  const variedades = useVariedades(idiomaId);
  const escritura  = useSistemasEscritura(idiomaId);
  const perfil     = usePerfilGramatical(idiomaId);
  const periodos   = usePeriodos(idiomaId);
  const { familias: familiasDisp } = useFamilias();
  const { sistemas: sistemasDisp, crear: crearSistema } = useSistemasEscrituraGlobal();

  if (det.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={18} className="text-primary/40 animate-spin" />
      </div>
    );
  }
  if (!det.idioma) return null;

  const idioma: Idioma = det.idioma;
  const estado = idioma.estado ?? "borrador";

  return (
    <>
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-0 border-b border-primary/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 min-w-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              title={sidebarOpen ? "Ocultar lista" : "Mostrar lista"}
              className="mt-0.5 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-primary/30 hover:text-primary/70 hover:bg-primary/8 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          <div className="min-w-0">
            <h2 className="text-base font-black text-primary truncate">{idioma.nombre}</h2>
            {idioma.endonimo && (
              <p className="mt-0.5 text-xs text-primary/40 italic">{idioma.endonimo}</p>
            )}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ESTADO_CLS[estado].badge}`}>
                {ESTADO_LABELS[estado]}
              </span>
              {idioma.es_protolengua && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border text-violet-400 bg-violet-400/10 border-violet-400/20">
                  Protolengua
                </span>
              )}
            </div>
          </div>
          </div>
          <button onClick={onEliminar} className={BTN_ICON_CLS} title="Eliminar idioma">
            <Trash2 size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold
                border-b-2 transition-colors
                ${tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-primary/40 hover:text-primary/70"}
              `}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto min-w-0 w-0">
        {tab === "general"    && (
          <div className="p-5">
            <TabGeneral
              idioma={idioma}
              onGuardar={det.guardar}
              saving={det.saving}
              escritura={escritura}
              sistemasDisp={sistemasDisp}
              variedades={variedades}
              det={det}
              idiomaId={idiomaId}
              familiasDisp={familiasDisp}
              periodos={periodos}
            />
          </div>
        )}
        {tab === "estructura" && (
          <TabEstructura fonemas={fonemas} morfemas={morfemas} perfil={perfil} />
        )}
        {tab === "lexico"     && (
          <div className="p-5">
            <TabLexico lexemas={lexemas} />
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab General — Info + contexto
// ═══════════════════════════════════════════════════════════════════════════

function TabGeneral({
  idioma, onGuardar, saving,
  escritura, sistemasDisp,
  variedades,
  det, idiomaId, familiasDisp,
  periodos,
}: {
  idioma: Idioma;
  onGuardar: (c: Partial<Idioma>) => void;
  saving: boolean;
  escritura: ReturnType<typeof useSistemasEscritura>;
  sistemasDisp: ReturnType<typeof useSistemasEscrituraGlobal>["sistemas"];
  variedades: ReturnType<typeof useVariedades>;
  det: ReturnType<typeof useIdiomaDetalle>;
  idiomaId: string;
  familiasDisp: ReturnType<typeof useFamilias>["familias"];
  periodos: ReturnType<typeof usePeriodos>;
}) {
  const [local, setLocal] = useState<Partial<Idioma>>({});
  const merged = { ...idioma, ...local };
  const set = (k: keyof Idioma, v: unknown) => setLocal((p) => ({ ...p, [k]: v }));
  const guardar = () => { onGuardar(local); setLocal({}); };
  const dirty = Object.keys(local).length > 0;

  // Escritura: estado de vincular
  const [nuevaSistemaId, setNuevaSistemaId] = useState("");
  const vincularEscritura = async () => {
    if (!nuevaSistemaId) return;
    await escritura.vincular(nuevaSistemaId);
    setNuevaSistemaId("");
  };
  const sistemasNoVinculados = sistemasDisp.filter(
    (s) => !escritura.vinculaciones.some((v) => v.sistema_escritura_id === s.id)
  );

  // Variedades: estado de agregar
  const [nuevaVariedad, setNuevaVariedad] = useState({ nombre: "", tipo: "dialectal" as TipoVariedad });
  const agregarVariedad = async () => {
    const n = nuevaVariedad.nombre.trim();
    if (!n) return;
    await variedades.crear(n, nuevaVariedad.tipo);
    setNuevaVariedad({ nombre: "", tipo: "dialectal" });
  };

  // Períodos: estado de agregar
  const [nuevoPeriodo, setNuevoPeriodo] = useState("");
  const agregarPeriodo = async () => {
    const n = nuevoPeriodo.trim();
    if (!n) return;
    await periodos.crearPeriodo(n);
    setNuevoPeriodo("");
  };

  return (
    <div className="w-full flex gap-6 items-start">

      {/* ── Columna izquierda: Info básica ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre">
            <input value={merged.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="Endónimo">
            <input value={merged.endonimo ?? ""} onChange={(e) => set("endonimo", e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="Estado">
            <select value={merged.estado ?? "borrador"} onChange={(e) => set("estado", e.target.value)} className={INPUT_CLS}>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Fuente canon">
            <input value={merged.fuente_canon ?? ""} onChange={(e) => set("fuente_canon", e.target.value)} className={INPUT_CLS} />
          </Field>
          <div className="col-span-2">
            <Field label="Descripción">
              <textarea value={merged.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} rows={3} className={`${INPUT_CLS} resize-y`} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notas de documentación">
              <textarea value={merged.notas_documentacion ?? ""} onChange={(e) => set("notas_documentacion", e.target.value)} rows={2} className={`${INPUT_CLS} resize-y`} />
            </Field>
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-xs text-primary/60 cursor-pointer">
              <input type="checkbox" checked={merged.es_protolengua ?? false} onChange={(e) => set("es_protolengua", e.target.checked)} className="accent-primary" />
              Marcar como protolengua
            </label>
          </div>
        </div>

        {dirty && (
          <button onClick={guardar} disabled={saving} className={BTN_PRIMARY_CLS}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Guardar cambios
          </button>
        )}

        {/* ── Relaciones ── */}
        <div>
          <TituloCategoria titulo="Relaciones" total={det.relaciones.length} />
          <div className="mt-2 space-y-1.5">
            {det.relaciones.map((r) => {
              const esOrigen = r.idioma_origen_id === idiomaId;
              const otro = esOrigen ? r.idioma_destino : r.idioma_origen;
              return (
                <FilaContexto key={r.id} onEliminar={() => det.eliminarRelacion(r.id)}>
                  <span className="font-mono text-[11px] text-primary/30 mr-1">{esOrigen ? "→" : "←"}</span>
                  <span className="text-sm font-semibold text-primary">{otro?.nombre}</span>
                  <span className="text-[11px] text-primary px-1.5 py-0.5 rounded bg-primary/10 ml-2">{r.tipo}</span>
                  {r.descripcion && <span className="text-[11px] text-primary/35 ml-1">{r.descripcion}</span>}
                </FilaContexto>
              );
            })}
            {det.relaciones.length === 0 && <EstadoVacio text="Sin relaciones con otros idiomas." />}
          </div>
        </div>
      </div>

      {/* ── Columna derecha: contexto ── */}
      <div className="w-80 shrink-0 space-y-5">

        {/* Escritura */}
        <div>
          <TituloCategoria titulo="Escritura" total={escritura.vinculaciones.length} />
          <div className="mt-2 space-y-1.5">
            <div className="flex items-stretch rounded-lg overflow-hidden border border-primary/15 bg-input-bg">
              <select value={nuevaSistemaId} onChange={(e) => setNuevaSistemaId(e.target.value)}
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none text-primary/70">
                <option value="">— Vincular sistema —</option>
                {sistemasNoVinculados.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.tipo})</option>)}
              </select>
              <button onClick={vincularEscritura} disabled={!nuevaSistemaId}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors disabled:opacity-30 border-l border-primary/15">
                <Plus size={12} /> Vincular
              </button>
            </div>
            {escritura.vinculaciones.map((v) => (
              <FilaContexto key={v.id} onEliminar={() => escritura.desvincular(v.id)}>
                <span className="text-sm font-semibold text-primary">{v.sistema?.nombre}</span>
                <span className="text-xs text-primary/40 ml-2">{v.sistema?.tipo} · {v.sistema?.direccion?.replace(/_/g, " ")}</span>
              </FilaContexto>
            ))}
            {escritura.vinculaciones.length === 0 && !escritura.loading && <EstadoVacio text="Sin sistemas de escritura vinculados." />}
          </div>
        </div>

        {/* Variedades */}
        <div>
          <TituloCategoria titulo="Variedades" total={variedades.variedades.length} />
          <div className="mt-2 space-y-1.5">
            <div className="flex items-stretch rounded-lg overflow-hidden border border-primary/15 bg-input-bg">
              <input
                placeholder="Nueva variedad…"
                value={nuevaVariedad.nombre}
                onChange={(e) => setNuevaVariedad((p) => ({ ...p, nombre: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && agregarVariedad()}
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-primary/25"
              />
              <select value={nuevaVariedad.tipo} onChange={(e) => setNuevaVariedad((p) => ({ ...p, tipo: e.target.value as TipoVariedad }))}
                className="shrink-0 w-28 bg-transparent px-2 py-1.5 text-sm outline-none text-primary/70 border-l border-primary/15">
                {Object.entries(TIPO_VARIEDAD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={agregarVariedad}
                className="shrink-0 w-8 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors border-l border-primary/15">
                <Plus size={12} />
              </button>
            </div>
            {variedades.variedades.map((v) => (
              <FilaContexto key={v.id} onEliminar={() => variedades.eliminar(v.id)}>
                <span className="text-sm font-semibold text-primary">{v.nombre}</span>
                <span className="text-xs text-primary/40 ml-2">{TIPO_VARIEDAD_LABELS[v.tipo as TipoVariedad]}</span>
              </FilaContexto>
            ))}
            {variedades.variedades.length === 0 && !variedades.loading && <EstadoVacio text="Sin variedades registradas." />}
          </div>
        </div>

        {/* Familias */}
        <div>
          <TituloCategoria titulo="Familias lingüísticas" total={det.familias.length} />
          <div className="mt-2 space-y-1.5">
            {det.familias.map((f) => (
              <FilaContexto key={f.id} onEliminar={() => det.desvincularFamilia(f.id)}>
                <span className="text-sm font-semibold text-primary">{f.familia?.nombre}</span>
                <span className="text-[11px] text-primary/35 ml-2">{f.tipo_clasificacion}</span>
              </FilaContexto>
            ))}
            {det.familias.length === 0 && <EstadoVacio text="Sin familia lingüística asignada." />}
            {familiasDisp.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) det.vincularFamilia(e.target.value); e.currentTarget.value = ""; }}
                className={`${INPUT_CLS} mt-1`}
              >
                <option value="">+ Vincular familia…</option>
                {familiasDisp.filter((f) => !det.familias.some((df) => df.familia_id === f.id))
                  .map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Períodos */}
        <div>
          <TituloCategoria titulo="Períodos" total={periodos.periodos.length} />
          <div className="mt-2 space-y-1.5">
            <div className="flex items-stretch rounded-lg overflow-hidden border border-primary/15 bg-input-bg">
              <input
                placeholder="Nombre del período…"
                value={nuevoPeriodo}
                onChange={(e) => setNuevoPeriodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarPeriodo()}
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-primary/25"
              />
              <button onClick={agregarPeriodo}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors border-l border-primary/15">
                <Plus size={12} /> Agregar
              </button>
            </div>
            {periodos.periodos.map((p) => (
              <FilaContexto key={p.id} onEliminar={() => periodos.eliminarPeriodo(p.id)}>
                <span className="text-sm font-semibold text-primary">{p.nombre}</span>
                <span className="text-xs text-primary/35 ml-2">
                  {p.inicio_estimado ?? "?"} — {p.fin_estimado ?? "?"} {p.unidad_temporal}
                </span>
              </FilaContexto>
            ))}
            {periodos.periodos.length === 0 && !periodos.loading && <EstadoVacio text="Sin períodos definidos." />}
          </div>
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Estructura — Fonología | Morfología | Gramática (FilaAsimetrica)
// ═══════════════════════════════════════════════════════════════════════════

function TabEstructura({
  fonemas, morfemas, perfil,
}: {
  fonemas: ReturnType<typeof useFonemas>;
  morfemas: ReturnType<typeof useMorfemas>;
  perfil: ReturnType<typeof usePerfilGramatical>;
}) {
  return (
    <FilaAsimetrica
      bloques={[
        {
          key: "fonologia",
          titulo: "Fonología",
          total: fonemas.fonemas.length,
          contenido: <BloquesFonologia fonemas={fonemas} />,
        },
        {
          key: "morfologia",
          titulo: "Morfología",
          total: morfemas.morfemas.length,
          contenido: <BloquesMorfologia morfemas={morfemas} />,
        },
        {
          key: "gramatica",
          titulo: "Gramática",
          total: 0,
          contenido: <BloquesGramatica perfil={perfil} />,
        },
      ]}
    />
  );
}

// ── Fonología (bloque de FilaAsimetrica) ──────────────────────────────────

function BloquesFonologia({ fonemas: hook }: { fonemas: ReturnType<typeof useFonemas> }) {
  const [nuevo, setNuevo] = useState({ simbolo: "", ipa: "", clase: "consonante" as ClaseFonema });
  const [expandido, setExpandido] = useState<string | null>(null);

  const agregar = async () => {
    if (!nuevo.simbolo.trim() || !nuevo.ipa.trim()) return;
    await hook.crearFonema({ ...nuevo });
    setNuevo({ simbolo: "", ipa: "", clase: "consonante" });
  };

  const grupos: { label: string; items: typeof hook.fonemas }[] = [
    { label: "Consonantes", items: hook.consonantes },
    { label: "Vocales",     items: hook.vocales },
    { label: "Otros",       items: hook.otros },
  ];

  return (
    <div className="pr-4">
      {/* Prosodia */}
      {hook.prosodia && (
        <div className="mb-3 px-3 py-2 rounded-lg border border-primary/10 text-xs text-primary/60">
          <span className="font-bold text-primary/80">Prosodia: </span>
          {hook.prosodia.sistema_prosodico}
          {hook.prosodia.tono_distintivo && " · tono"}
          {hook.prosodia.duracion_distintiva && " · duración"}
        </div>
      )}

      {/* Form agregar */}
      <div className="flex items-stretch mb-4 rounded-lg overflow-hidden border border-primary/15 bg-input-bg">
        <input placeholder="Símbolo" value={nuevo.simbolo} onChange={(e) => setNuevo((p) => ({ ...p, simbolo: e.target.value }))}
          className="w-20 shrink-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-primary/25" />
        <input placeholder="IPA" value={nuevo.ipa} onChange={(e) => setNuevo((p) => ({ ...p, ipa: e.target.value }))}
          className="w-20 shrink-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-primary/25 border-l border-primary/15" />
        <select value={nuevo.clase} onChange={(e) => setNuevo((p) => ({ ...p, clase: e.target.value as ClaseFonema }))}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none text-primary/70 border-l border-primary/15">
          {CLASES_FONEMA.map((c) => <option key={c} value={c}>{CLASE_FONEMA_LABELS[c]}</option>)}
        </select>
        <button onClick={agregar}
          className="shrink-0 w-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors border-l border-primary/15">
          <Plus size={13} />
        </button>
      </div>

      {/* Grillas por grupo */}
      {grupos.map((g) => g.items.length > 0 && (
        <div key={g.label} className="mb-4">
          <p className={`${LABEL_CLS} mb-2`}>{g.label} ({g.items.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((f) => (
              <div
                key={f.id}
                onClick={() => setExpandido(expandido === f.id ? null : f.id)}
                className={`
                  flex flex-col px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors
                  ${expandido === f.id ? "border-primary/30" : "border-primary/10 hover:border-primary/25"}
                `}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-primary">{f.simbolo}</span>
                  <span className="font-mono text-[11px] text-primary/35">[{f.ipa}]</span>
                  <button onClick={(e) => { e.stopPropagation(); hook.eliminarFonema(f.id); }} className={BTN_ICON_CLS}>
                    <X size={10} />
                  </button>
                </div>
                {expandido === f.id && (
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-primary/50">
                    {f.punto_articulacion && <p>Punto: {f.punto_articulacion}</p>}
                    {f.modo_articulacion  && <p>Modo: {f.modo_articulacion}</p>}
                    {f.notas             && <p className="italic">{f.notas}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {hook.fonemas.length === 0 && !hook.loading && <EstadoVacio text="Sin fonemas. Agregá símbolos arriba." />}
    </div>
  );
}

// ── Morfología (bloque de FilaAsimetrica) ─────────────────────────────────

function BloquesMorfologia({ morfemas: hook }: { morfemas: ReturnType<typeof useMorfemas> }) {
  const [nueva, setNueva] = useState({ forma: "", tipo: "raiz" as Morfema["tipo"] });

  const TIPOS_LABEL: Record<string, string> = {
    raiz: "Raíz", prefijo: "Prefijo", sufijo: "Sufijo", infijo: "Infijo",
    circunfijo: "Circunfijo", clitico: "Clítico", otro: "Otro",
  };

  const agregar = async () => {
    if (!nueva.forma.trim()) return;
    await hook.crearMorfema(nueva.forma, nueva.tipo as any);
    setNueva({ forma: "", tipo: "raiz" });
  };

  const grupos = Object.keys(TIPOS_LABEL)
    .map((tipo) => ({ tipo, label: TIPOS_LABEL[tipo], items: hook.morfemas.filter((m) => m.tipo === tipo) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="px-2">
      <div className="flex items-stretch mb-4 rounded-lg overflow-hidden border border-primary/15 bg-input-bg">
        <input
          placeholder="Forma (ej: -ak)"
          value={nueva.forma}
          onChange={(e) => setNueva((p) => ({ ...p, forma: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-primary/25"
        />
        <select value={nueva.tipo} onChange={(e) => setNueva((p) => ({ ...p, tipo: e.target.value as any }))}
          className="shrink-0 w-28 bg-transparent px-2 py-1.5 text-sm outline-none text-primary/70 border-l border-primary/15">
          {Object.entries(TIPOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={agregar}
          className="shrink-0 w-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors border-l border-primary/15">
          <Plus size={13} />
        </button>
      </div>

      {grupos.map((g) => (
        <div key={g.tipo} className="mb-4">
          <p className={`${LABEL_CLS} mb-2`}>{g.label} ({g.items.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/10 hover:border-primary/25 transition-colors">
                <span className="font-mono text-sm font-semibold text-primary">{m.forma}</span>
                {m.significado && <span className="text-[11px] text-primary/40">{m.significado}</span>}
                <button onClick={() => hook.eliminarMorfema(m.id)} className={BTN_ICON_CLS}><X size={10} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hook.morfemas.length === 0 && !hook.loading && <EstadoVacio text="Sin morfemas registrados." />}
    </div>
  );
}

// ── Gramática (bloque de FilaAsimetrica) ──────────────────────────────────

function BloquesGramatica({ perfil: hook }: { perfil: ReturnType<typeof usePerfilGramatical> }) {
  const [local, setLocal] = useState<Partial<PerfilGramatical>>({});
  const p = hook.perfil;
  const merged = { ...p, ...local };
  const set = (k: keyof PerfilGramatical, v: unknown) => setLocal((prev) => ({ ...prev, [k]: v }));
  const guardar = () => { hook.guardar(local); setLocal({}); };
  const dirty = Object.keys(local).length > 0;

  return (
    <div className="pl-2 space-y-3">
      {!p && <p className="text-xs text-primary/40 italic">Completá algún campo para crear el perfil.</p>}

      {([
        ["orden_basico",               "Orden básico",         "SOV, SVO…"],
        ["orden_adjetivo_sustantivo",  "Adj · Sust",           "Adj-N o N-Adj"],
        ["tipo_adposicion",            "Adposición",           "pre/pos/ambigua"],
        ["estrategia_negacion",        "Negación",             "partícula, afijo…"],
        ["alineamiento",               "Alineamiento",         "nom-ac, erg-abs…"],
      ] as [keyof PerfilGramatical, string, string][]).map(([k, label, ph]) => (
        <div key={k} className="space-y-1">
          <label className={LABEL_CLS}>{label}</label>
          <input value={(merged[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={INPUT_CLS} />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
        {([
          ["genero_gramatical", "Género"],
          ["numero_gramatical", "Número"],
          ["caso_gramatical",   "Caso"],
          ["concordancia",      "Concordancia"],
        ] as [keyof PerfilGramatical, string][]).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-xs text-primary/60 cursor-pointer">
            <input type="checkbox" checked={(merged[k] as boolean | undefined) ?? false} onChange={(e) => set(k, e.target.checked)} className="accent-primary" />
            {label}
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLS}>Notas</label>
        <textarea value={merged.notas ?? ""} onChange={(e) => set("notas", e.target.value)} rows={3} className={`${INPUT_CLS} resize-y`} />
      </div>

      {dirty && (
        <button onClick={guardar} className={BTN_PRIMARY_CLS}><Check size={12} /> Guardar</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Léxico — Diccionario
// ═══════════════════════════════════════════════════════════════════════════

function TabLexico({ lexemas: hook }: { lexemas: ReturnType<typeof useLexemas> }) {
  const [nuevoLema, setNuevoLema] = useState("");
  const [nuevaCat, setNuevaCat] = useState<CategoriaGramatical>("sustantivo");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const agregar = async () => {
    const lema = nuevoLema.trim();
    if (!lema) return;
    const nuevo = await hook.crear(lema, nuevaCat);
    if (nuevo) setExpandido(nuevo.id);
    setNuevoLema("");
  };

  const filtrados = hook.lexemas.filter((l) =>
    l.lema.toLowerCase().includes(busqueda.toLowerCase()) ||
    (l.definicion_breve ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // Agrupar por categoría (orden canónico de CATS_GRAM)
  const grupos = CATS_GRAM
    .map((cat) => ({ cat, items: filtrados.filter((l) => l.categoria_gramatical === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Barra de acción */}
      <div className="flex items-stretch mb-3 rounded-lg overflow-hidden border border-primary/15 bg-input-bg">
        <input
          placeholder="Nuevo lema…"
          value={nuevoLema}
          onChange={(e) => setNuevoLema(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-primary/25"
        />
        <select value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value as CategoriaGramatical)}
          className="shrink-0 w-36 bg-transparent px-2 py-1.5 text-sm outline-none text-primary/70 border-l border-primary/15">
          {CATS_GRAM.map((c) => <option key={c} value={c}>{CAT_GRAM_LABELS[c]}</option>)}
        </select>
        <button onClick={agregar}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors border-l border-primary/15">
          <Plus size={12} /> Agregar
        </button>
      </div>

      {/* Buscador — aparece cuando hay suficientes entradas */}
      {hook.lexemas.length > 10 && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-input-bg mb-4">
          <Search size={12} className="text-primary/30 shrink-0" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Filtrar ${hook.lexemas.length} entradas…`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-primary/25"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-primary/30 hover:text-primary/70 transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Grupos por categoría */}
      <div className="space-y-6">
        {grupos.map(({ cat, items }) => (
          <div key={cat}>
            <TituloCategoria titulo={CAT_GRAM_LABELS[cat]} total={items.length} />
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
              {items.map((lex: Lexema) => (
                <div
                  key={lex.id}
                  className={`rounded-lg border transition-colors ${expandido === lex.id ? "border-primary/30" : "border-primary/10 hover:border-primary/25"}`}
                >
                  {/* Cabecera */}
                  <div
                    className="px-3.5 py-2.5 cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandido(expandido === lex.id ? null : lex.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-serif text-sm font-bold text-primary truncate">{lex.lema}</span>
                      {lex.transcripcion_ipa && (
                        <span className="font-mono text-[11px] text-primary/35 shrink-0">[{lex.transcripcion_ipa}]</span>
                      )}
                      {lex.definicion_breve && (
                        <span className="text-xs text-primary/35 truncate hidden sm:block">{lex.definicion_breve}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lex.sentidos && lex.sentidos.length > 0 && (
                        <span className="text-[11px] text-primary/30">{lex.sentidos.length} acep.</span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); hook.eliminar(lex.id); }} className={BTN_ICON_CLS}>
                        <Trash2 size={11} />
                      </button>
                      {expandido === lex.id
                        ? <ChevronUp size={13} className="text-primary/30" />
                        : <ChevronDown size={13} className="text-primary/30" />}
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {expandido === lex.id && (
                    <div className="px-3.5 pb-3.5 border-t border-primary/8 pt-3 space-y-3">
                      <div>
                        <label className={LABEL_CLS}>Definición breve</label>
                        <input
                          defaultValue={lex.definicion_breve ?? ""}
                          onBlur={(e) => { if (e.target.value !== (lex.definicion_breve ?? "")) hook.guardar(lex.id, { definicion_breve: e.target.value }); }}
                          className={INPUT_CLS}
                          placeholder="Glosa rápida…"
                        />
                      </div>
                      {(lex.sentidos ?? []).length > 0 && (
                        <div>
                          <p className={`${LABEL_CLS} mb-2`}>Acepciones</p>
                          {(lex.sentidos ?? []).map((s, i) => (
                            <div key={s.id} className="flex gap-2 items-start mb-2">
                              <span className="text-[11px] text-primary/30 pt-2 min-w-4 tabular-nums">{i + 1}.</span>
                              <div className="flex-1 space-y-1">
                                <input
                                  defaultValue={s.definicion}
                                  onBlur={(e) => { if (e.target.value !== s.definicion) hook.guardarSentido(lex.id, s.id, { definicion: e.target.value }); }}
                                  className={INPUT_CLS}
                                  placeholder="Definición…"
                                />
                                {s.uso_ejemplo && (
                                  <p className="text-[11px] text-primary/35 italic px-1">"{s.uso_ejemplo}"</p>
                                )}
                              </div>
                              <button onClick={() => hook.eliminarSentido(lex.id, s.id)} className={BTN_ICON_CLS}>
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hook.lexemas.length === 0 && !hook.loading && (
        <EstadoVacio text="El diccionario está vacío. Escribí el primer lema arriba." />
      )}
      {busqueda && filtrados.length === 0 && (
        <EstadoVacio text={`Sin resultados para "${busqueda}".`} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers compartidos
// ═══════════════════════════════════════════════════════════════════════════

/** Fila compacta para listas de contexto (escritura, variedades, familias, relaciones, períodos) */
function FilaContexto({ children, onEliminar }: { children: React.ReactNode; onEliminar: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-primary/10 hover:border-primary/25 transition-colors">
      <div className="flex items-center flex-wrap gap-1 min-w-0">{children}</div>
      <button onClick={onEliminar} className={`${BTN_ICON_CLS} shrink-0 ml-2`}><X size={11} /></button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

function EstadoVacio({ text }: { text: string }) {
  return <p className="py-4 text-center text-xs text-primary/25 italic">{text}</p>;
}

// Re-export type para evitar error de import unused
type Morfema = import("./types").Morfema;
