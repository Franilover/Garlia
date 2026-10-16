"use client";
/**
 * IdiomasSection — Editor de Mundo · Idiomas  v5
 * ──────────────────────────────────────────────
 * Rediseño: colores dinámicos via Tailwind (text-primary, bg-input-bg,
 * border-primary/15, etc.) en lugar de hex hardcodeados. Misma estética
 * minimalista y funcional del resto del proyecto.
 *
 * Tabs del detalle:
 *   info        → nombre, endónimo, descripción, tipo, estado, fuente
 *   fonologia   → inventario fonémico + patrón silábico + prosodia
 *   lexico      → lexemas con sentidos y formas léxicas
 *   morfologia  → morfemas
 *   gramatica   → perfil gramatical
 *   escritura   → sistemas de escritura vinculados
 *   variedades  → variedades lingüísticas
 *   relaciones  → relaciones con otros idiomas + familias
 *   periodos    → períodos lingüísticos
 */
import {
  AlignLeft, Book, BookOpen, Check, ChevronDown, ChevronUp,
  FileText, Globe, Languages, List, Loader2, Mic, Plus,
  Search, Trash2, X, Link2,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useIdiomas, useIdiomaDetalle, useFonemas, useLexemas,
  useMorfemas, useVariedades, useSistemasEscritura, usePerfilGramatical,
  usePeriodos, useFamilias, useSistemasEscrituraGlobal,
} from "./useIdiomas";
import type {
  Idioma, FonemaIdioma, Lexema, SentidoLexico,
  PerfilGramatical, VariedadLinguistica, IdiomaEscritura,
  EstadoCanon, CategoriaGramatical, ClaseFonema, TipoVariedad,
} from "./types";
import {
  INPUT_CLS, LABEL_CLS,
  BTN_PRIMARY_CLS, BTN_GHOST_CLS, BTN_DANGER_CLS, BTN_ICON_CLS,
  SECTION_TITLE_CLS,
} from "@/domains/garlia/_shared/types";

// ── Constantes de label ───────────────────────────────────────────────────

const ESTADO_LABELS: Record<EstadoCanon, string> = {
  borrador: "Borrador", canon: "Cánon", revision: "En revisión", descartado: "Descartado",
};

// Clases Tailwind semánticas por estado (sin hex hardcodeado)
const ESTADO_CLS: Record<EstadoCanon, { dot: string; badge: string }> = {
  borrador:   { dot: "bg-primary/30",     badge: "text-primary/50 bg-primary/8 border-primary/15" },
  canon:      { dot: "bg-emerald-400",    badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  revision:   { dot: "bg-amber-400",      badge: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  descartado: { dot: "bg-red-400/70",     badge: "text-red-400/70 bg-red-400/8 border-red-400/15" },
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

type TabId = "info" | "fonologia" | "lexico" | "morfologia" | "gramatica" | "escritura" | "variedades" | "relaciones" | "periodos";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "info",       label: "Info",       icon: <FileText size={13} /> },
  { id: "fonologia",  label: "Fonología",  icon: <Mic size={13} /> },
  { id: "lexico",     label: "Léxico",     icon: <Book size={13} /> },
  { id: "morfologia", label: "Morfología", icon: <AlignLeft size={13} /> },
  { id: "gramatica",  label: "Gramática",  icon: <List size={13} /> },
  { id: "escritura",  label: "Escritura",  icon: <BookOpen size={13} /> },
  { id: "variedades", label: "Variedades", icon: <Globe size={13} /> },
  { id: "relaciones", label: "Relaciones", icon: <Link2 size={13} /> },
  { id: "periodos",   label: "Períodos",   icon: <AlignLeft size={13} /> },
];

// ── Componente principal ──────────────────────────────────────────────────

export function IdiomasSection() {
  const { idiomas, loading: loadingLista, crear: crearIdioma, eliminar: eliminarIdioma } = useIdiomas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("info");
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const idiomasFiltrados = idiomas.filter((i) =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.endonimo ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  useEffect(() => {
    if (creando) inputRef.current?.focus();
  }, [creando]);

  const handleCrear = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nuevo = await crearIdioma(nombre);
    if (nuevo) { setSelectedId(nuevo.id); setTab("info"); }
    setCreando(false);
    setNuevoNombre("");
  };

  return (
    <div className="flex h-full">
      {/* ── Lista lateral ──────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-primary/10 flex flex-col">

        {/* Header buscador */}
        <div className="border-b border-primary/10">
          <div className="p-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-input-bg">
              <Search size={12} className="text-primary/30 shrink-0" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar idioma…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-primary/25"
              />
            </div>
          </div>
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/8 hover:bg-primary/15 transition-colors text-xs font-semibold text-primary/70 hover:text-primary"
            >
              <Plus size={13} /> Nuevo idioma
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
              <button
                onClick={() => { setCreando(false); setNuevoNombre(""); }}
                className={`${BTN_GHOST_CLS} flex-1`}
              >
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
                onClick={() => { setSelectedId(idioma.id); setTab("info"); }}
                className={`
                  w-full px-3 py-2.5 text-left flex items-center justify-between gap-2
                  border-l-2 transition-colors
                  ${activo
                    ? "border-primary bg-primary/8 text-primary font-semibold"
                    : "border-transparent text-primary/60 hover:text-primary hover:bg-primary/5 font-medium"
                  }
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedId ? (
          <DetalleIdioma
            idiomaId={selectedId}
            tab={tab}
            onTabChange={setTab}
            onEliminar={async () => {
              await eliminarIdioma(selectedId);
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-primary/20">
              <Languages size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-xs">Seleccioná un idioma o creá uno nuevo</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Panel detalle ─────────────────────────────────────────────────────────

function DetalleIdioma({
  idiomaId, tab, onTabChange, onEliminar,
}: {
  idiomaId: string;
  tab: TabId;
  onTabChange: (t: TabId) => void;
  onEliminar: () => void;
}) {
  const det = useIdiomaDetalle(idiomaId);
  const fonemas = useFonemas(idiomaId);
  const lexemas = useLexemas(idiomaId);
  const morfemas = useMorfemas(idiomaId);
  const variedades = useVariedades(idiomaId);
  const escritura = useSistemasEscritura(idiomaId);
  const perfil = usePerfilGramatical(idiomaId);
  const periodos = usePeriodos(idiomaId);
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
      {/* Header del detalle */}
      <div className="px-5 pt-4 pb-0 border-b border-primary/10">
        <div className="flex items-start justify-between mb-3">
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
          <button
            onClick={onEliminar}
            className={BTN_ICON_CLS}
            title="Eliminar idioma"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold whitespace-nowrap
                border-b-2 transition-colors
                ${tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-primary/40 hover:text-primary/70"
                }
              `}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por tab */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "info"       && <TabInfo idioma={idioma} onGuardar={det.guardar} saving={det.saving} />}
        {tab === "fonologia"  && <TabFonologia fonemas={fonemas} />}
        {tab === "lexico"     && <TabLexico lexemas={lexemas} />}
        {tab === "morfologia" && <TabMorfologia morfemas={morfemas} idiomaId={idiomaId} />}
        {tab === "gramatica"  && <TabGramatica perfil={perfil} />}
        {tab === "escritura"  && <TabEscritura escritura={escritura} sistemasDisp={sistemasDisp} crearSistema={crearSistema} />}
        {tab === "variedades" && <TabVariedades variedades={variedades} />}
        {tab === "relaciones" && (
          <TabRelaciones det={det} idiomaId={idiomaId} familiasDisp={familiasDisp} todosLosIdiomas={[]} />
        )}
        {tab === "periodos"   && <TabPeriodos periodos={periodos} />}
      </div>
    </>
  );
}

// ── Tab Info ──────────────────────────────────────────────────────────────

function TabInfo({ idioma, onGuardar, saving }: {
  idioma: Idioma;
  onGuardar: (c: Partial<Idioma>) => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState<Partial<Idioma>>({});
  const merged = { ...idioma, ...local };
  const set = (k: keyof Idioma, v: unknown) => setLocal((p) => ({ ...p, [k]: v }));
  const guardar = () => { onGuardar(local); setLocal({}); };
  const dirty = Object.keys(local).length > 0;

  return (
    <div className="max-w-lg space-y-4">
      <Field label="Nombre">
        <input value={merged.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} className={INPUT_CLS} />
      </Field>
      <Field label="Endónimo (nombre en el propio idioma)">
        <input value={merged.endonimo ?? ""} onChange={(e) => set("endonimo", e.target.value)} className={INPUT_CLS} />
      </Field>
      <Field label="Descripción">
        <textarea value={merged.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} rows={4} className={`${INPUT_CLS} resize-y`} />
      </Field>
      <Field label="Estado">
        <select value={merged.estado ?? "borrador"} onChange={(e) => set("estado", e.target.value)} className={INPUT_CLS}>
          {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="¿Es protolengua?">
        <label className="flex items-center gap-2 text-xs text-primary/60 cursor-pointer">
          <input type="checkbox" checked={merged.es_protolengua ?? false} onChange={(e) => set("es_protolengua", e.target.checked)} className="accent-primary" />
          Marcar como protolengua
        </label>
      </Field>
      <Field label="Fuente canon">
        <input value={merged.fuente_canon ?? ""} onChange={(e) => set("fuente_canon", e.target.value)} className={INPUT_CLS} />
      </Field>
      <Field label="Notas de documentación">
        <textarea value={merged.notas_documentacion ?? ""} onChange={(e) => set("notas_documentacion", e.target.value)} rows={3} className={`${INPUT_CLS} resize-y`} />
      </Field>

      {dirty && (
        <button onClick={guardar} disabled={saving} className={BTN_PRIMARY_CLS}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Guardar cambios
        </button>
      )}
    </div>
  );
}

// ── Tab Fonología ─────────────────────────────────────────────────────────

function TabFonologia({ fonemas: hook }: { fonemas: ReturnType<typeof useFonemas> }) {
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
    <div>
      <SeccionHeader title="Inventario fonémico" count={hook.fonemas.length} />

      {/* Prosodia */}
      {hook.prosodia && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-primary/60">
          <span className="font-bold text-primary/80">Prosodia: </span>
          {hook.prosodia.sistema_prosodico}
          {hook.prosodia.tono_distintivo && " · tono distintivo"}
          {hook.prosodia.duracion_distintiva && " · duración distintiva"}
        </div>
      )}

      {/* Agregar fonema */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <input
          placeholder="Símbolo (ej: kh)"
          value={nuevo.simbolo}
          onChange={(e) => setNuevo((p) => ({ ...p, simbolo: e.target.value }))}
          className={`${INPUT_CLS} w-32`}
        />
        <input
          placeholder="IPA (ej: x)"
          value={nuevo.ipa}
          onChange={(e) => setNuevo((p) => ({ ...p, ipa: e.target.value }))}
          className={`${INPUT_CLS} w-32`}
        />
        <select
          value={nuevo.clase}
          onChange={(e) => setNuevo((p) => ({ ...p, clase: e.target.value as ClaseFonema }))}
          className={`${INPUT_CLS} w-36`}
        >
          {CLASES_FONEMA.map((c) => <option key={c} value={c}>{CLASE_FONEMA_LABELS[c]}</option>)}
        </select>
        <button onClick={agregar} className={BTN_PRIMARY_CLS}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      {/* Grupos de fonemas */}
      {grupos.map((g) => g.items.length > 0 && (
        <div key={g.label} className="mb-5">
          <p className={`${LABEL_CLS} mb-2`}>{g.label} ({g.items.length})</p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {g.items.map((f) => (
              <div
                key={f.id}
                onClick={() => setExpandido(expandido === f.id ? null : f.id)}
                className={`
                  px-3 py-2 rounded-lg border cursor-pointer transition-colors
                  ${expandido === f.id
                    ? "border-primary/30 bg-primary/8"
                    : "border-primary/10 bg-primary/4 hover:bg-primary/8"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-sm font-bold text-primary">{f.simbolo}</span>
                    <span className="font-mono text-xs text-primary/40">[{f.ipa}]</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); hook.eliminarFonema(f.id); }}
                    className={BTN_ICON_CLS}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                {expandido === f.id && (
                  <div className="mt-2 space-y-0.5 text-[11px] text-primary/50">
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

      {hook.fonemas.length === 0 && !hook.loading && (
        <EstadoVacio text="No hay fonemas registrados. Agregá consonantes y vocales arriba." />
      )}
    </div>
  );
}

// ── Tab Léxico ────────────────────────────────────────────────────────────

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

  return (
    <div>
      <SeccionHeader title="Diccionario / Léxico" count={hook.lexemas.length} />

      {/* Nuevo lexema */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Nuevo lema…"
          value={nuevoLema}
          onChange={(e) => setNuevoLema(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className={`${INPUT_CLS} flex-1 min-w-36`}
        />
        <select value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value as CategoriaGramatical)} className={`${INPUT_CLS} w-40`}>
          {CATS_GRAM.map((c) => <option key={c} value={c}>{CAT_GRAM_LABELS[c]}</option>)}
        </select>
        <button onClick={agregar} className={BTN_PRIMARY_CLS}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      {/* Buscador */}
      {hook.lexemas.length > 10 && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-input-bg mb-3">
          <Search size={12} className="text-primary/30 shrink-0" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar léxico…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-primary/25"
          />
        </div>
      )}

      {/* Lista lexemas */}
      <div className="flex flex-col gap-1">
        {filtrados.map((lex: Lexema) => (
          <div
            key={lex.id}
            className={`rounded-lg border transition-colors ${expandido === lex.id ? "border-primary/20 bg-primary/5" : "border-primary/8 bg-primary/3"}`}
          >
            <div
              className="px-3.5 py-2.5 cursor-pointer flex items-center justify-between"
              onClick={() => setExpandido(expandido === lex.id ? null : lex.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-serif text-sm font-bold text-primary truncate">{lex.lema}</span>
                {lex.transcripcion_ipa && (
                  <span className="font-mono text-[11px] text-primary/35 shrink-0">[{lex.transcripcion_ipa}]</span>
                )}
                <span className="text-[10px] text-primary/40 px-1.5 py-0.5 bg-primary/8 rounded shrink-0">
                  {CAT_GRAM_LABELS[lex.categoria_gramatical]}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lex.sentidos && lex.sentidos.length > 0 && (
                  <span className="text-[11px] text-primary/30">{lex.sentidos.length} acep.</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); hook.eliminar(lex.id); }}
                  className={BTN_ICON_CLS}
                >
                  <Trash2 size={11} />
                </button>
                {expandido === lex.id
                  ? <ChevronUp size={13} className="text-primary/30" />
                  : <ChevronDown size={13} className="text-primary/30" />
                }
              </div>
            </div>

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

      {hook.lexemas.length === 0 && !hook.loading && (
        <EstadoVacio text="No hay lexemas registrados. Escribí el primer lema arriba." />
      )}
    </div>
  );
}

// ── Tab Morfología ────────────────────────────────────────────────────────

function TabMorfologia({ morfemas: hook, idiomaId }: { morfemas: ReturnType<typeof useMorfemas>; idiomaId: string }) {
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

  const grupos = Object.keys(TIPOS_LABEL).map((tipo) => ({
    tipo, label: TIPOS_LABEL[tipo],
    items: hook.morfemas.filter((m) => m.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <SeccionHeader title="Morfemas" count={hook.morfemas.length} />

      <div className="flex gap-2 mb-5">
        <input
          placeholder="Forma (ej: -ak)"
          value={nueva.forma}
          onChange={(e) => setNueva((p) => ({ ...p, forma: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className={`${INPUT_CLS} flex-1`}
        />
        <select value={nueva.tipo} onChange={(e) => setNueva((p) => ({ ...p, tipo: e.target.value as any }))} className={`${INPUT_CLS} w-36`}>
          {Object.entries(TIPOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={agregar} className={BTN_PRIMARY_CLS}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      {grupos.map((g) => (
        <div key={g.tipo} className="mb-5">
          <p className={`${LABEL_CLS} mb-2`}>{g.label} ({g.items.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/10 bg-primary/5"
              >
                <span className="font-mono text-sm font-semibold text-primary">{m.forma}</span>
                {m.significado && <span className="text-[11px] text-primary/40">{m.significado}</span>}
                <button onClick={() => hook.eliminarMorfema(m.id)} className={BTN_ICON_CLS}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hook.morfemas.length === 0 && !hook.loading && (
        <EstadoVacio text="No hay morfemas registrados." />
      )}
    </div>
  );
}

// ── Tab Gramática ─────────────────────────────────────────────────────────

function TabGramatica({ perfil: hook }: { perfil: ReturnType<typeof usePerfilGramatical> }) {
  const [local, setLocal] = useState<Partial<PerfilGramatical>>({});
  const p = hook.perfil;
  const merged = { ...p, ...local };
  const set = (k: keyof PerfilGramatical, v: unknown) => setLocal((prev) => ({ ...prev, [k]: v }));
  const guardar = () => { hook.guardar(local); setLocal({}); };
  const dirty = Object.keys(local).length > 0;

  return (
    <div className="max-w-lg space-y-4">
      <SeccionHeader title="Perfil tipológico" />
      {!p && (
        <p className="text-xs text-primary/40 italic mb-4">
          Todavía no hay perfil gramatical. Completá algún campo para crearlo.
        </p>
      )}

      <Field label="Orden básico (ej: SOV, SVO)">
        <input value={merged.orden_basico ?? ""} onChange={(e) => set("orden_basico", e.target.value)} className={INPUT_CLS} placeholder="SOV, SVO, VSO…" />
      </Field>
      <Field label="Adjetivo · Sustantivo">
        <input value={merged.orden_adjetivo_sustantivo ?? ""} onChange={(e) => set("orden_adjetivo_sustantivo", e.target.value)} className={INPUT_CLS} placeholder="Adj-N o N-Adj" />
      </Field>
      <Field label="Tipo de adposición">
        <input value={merged.tipo_adposicion ?? ""} onChange={(e) => set("tipo_adposicion", e.target.value)} className={INPUT_CLS} placeholder="preposición, posposición, ambigua" />
      </Field>
      <Field label="Estrategia de negación">
        <input value={merged.estrategia_negacion ?? ""} onChange={(e) => set("estrategia_negacion", e.target.value)} className={INPUT_CLS} placeholder="partícula, afijo, doble negación…" />
      </Field>
      <Field label="Alineamiento (ej: nominativo-acusativo)">
        <input value={merged.alineamiento ?? ""} onChange={(e) => set("alineamiento", e.target.value)} className={INPUT_CLS} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {([
          ["genero_gramatical",  "Género gramatical"],
          ["numero_gramatical",  "Número gramatical"],
          ["caso_gramatical",    "Caso gramatical"],
          ["concordancia",       "Concordancia"],
        ] as [keyof PerfilGramatical, string][]).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-xs text-primary/60 cursor-pointer">
            <input
              type="checkbox"
              checked={(merged[k] as boolean | undefined) ?? false}
              onChange={(e) => set(k, e.target.checked)}
              className="accent-primary"
            />
            {label}
          </label>
        ))}
      </div>

      <Field label="Notas">
        <textarea value={merged.notas ?? ""} onChange={(e) => set("notas", e.target.value)} rows={3} className={`${INPUT_CLS} resize-y`} />
      </Field>

      {dirty && (
        <button onClick={guardar} className={BTN_PRIMARY_CLS}>
          <Check size={12} /> Guardar perfil
        </button>
      )}
    </div>
  );
}

// ── Tab Escritura ─────────────────────────────────────────────────────────

function TabEscritura({
  escritura, sistemasDisp, crearSistema,
}: {
  escritura: ReturnType<typeof useSistemasEscritura>;
  sistemasDisp: ReturnType<typeof useSistemasEscrituraGlobal>["sistemas"];
  crearSistema: ReturnType<typeof useSistemasEscrituraGlobal>["crear"];
}) {
  const [nuevaSistemaId, setNuevaSistemaId] = useState("");

  const vincular = async () => {
    if (!nuevaSistemaId) return;
    await escritura.vincular(nuevaSistemaId);
    setNuevaSistemaId("");
  };

  const sistemasNoVinculados = sistemasDisp.filter(
    (s) => !escritura.vinculaciones.some((v) => v.sistema_escritura_id === s.id)
  );

  return (
    <div>
      <SeccionHeader title="Sistemas de escritura" count={escritura.vinculaciones.length} />

      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={nuevaSistemaId} onChange={(e) => setNuevaSistemaId(e.target.value)} className={`${INPUT_CLS} flex-1`}>
          <option value="">— Seleccionar sistema —</option>
          {sistemasNoVinculados.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.tipo})</option>)}
        </select>
        <button onClick={vincular} disabled={!nuevaSistemaId} className={BTN_PRIMARY_CLS}>
          <Plus size={12} /> Vincular
        </button>
      </div>

      <div className="space-y-1.5">
        {escritura.vinculaciones.map((v) => (
          <div key={v.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-primary/10 bg-primary/4">
            <div>
              <span className="text-sm font-semibold text-primary">{v.sistema?.nombre}</span>
              <span className="text-xs text-primary/40 ml-2">{v.sistema?.tipo} · {v.sistema?.direccion?.replace(/_/g, " ")}</span>
              <span className="text-[11px] text-primary/30 ml-2">{v.funcion}</span>
            </div>
            <button onClick={() => escritura.desvincular(v.id)} className={BTN_ICON_CLS}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {escritura.vinculaciones.length === 0 && !escritura.loading && (
        <EstadoVacio text="No hay sistemas de escritura vinculados." />
      )}
    </div>
  );
}

// ── Tab Variedades ────────────────────────────────────────────────────────

function TabVariedades({ variedades: hook }: { variedades: ReturnType<typeof useVariedades> }) {
  const [nueva, setNueva] = useState({ nombre: "", tipo: "dialectal" as TipoVariedad });

  const agregar = async () => {
    const n = nueva.nombre.trim();
    if (!n) return;
    await hook.crear(n, nueva.tipo);
    setNueva({ nombre: "", tipo: "dialectal" });
  };

  return (
    <div>
      <SeccionHeader title="Variedades lingüísticas" count={hook.variedades.length} />

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          placeholder="Nombre de la variedad…"
          value={nueva.nombre}
          onChange={(e) => setNueva((p) => ({ ...p, nombre: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className={`${INPUT_CLS} flex-1 min-w-36`}
        />
        <select value={nueva.tipo} onChange={(e) => setNueva((p) => ({ ...p, tipo: e.target.value as TipoVariedad }))} className={`${INPUT_CLS} w-40`}>
          {Object.entries(TIPO_VARIEDAD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={agregar} className={BTN_PRIMARY_CLS}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      <div className="space-y-1.5">
        {hook.variedades.map((v) => (
          <div key={v.id} className="flex items-start justify-between px-3.5 py-2.5 rounded-lg border border-primary/10 bg-primary/4">
            <div>
              <span className="text-sm font-semibold text-primary">{v.nombre}</span>
              <span className="text-xs text-primary/40 ml-2">{TIPO_VARIEDAD_LABELS[v.tipo as TipoVariedad]}</span>
              {v.descripcion && <p className="mt-0.5 text-xs text-primary/40">{v.descripcion}</p>}
            </div>
            <button onClick={() => hook.eliminar(v.id)} className={BTN_ICON_CLS}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {hook.variedades.length === 0 && !hook.loading && (
        <EstadoVacio text="No hay variedades registradas." />
      )}
    </div>
  );
}

// ── Tab Relaciones ────────────────────────────────────────────────────────

function TabRelaciones({
  det, idiomaId, familiasDisp, todosLosIdiomas,
}: {
  det: ReturnType<typeof useIdiomaDetalle>;
  idiomaId: string;
  familiasDisp: ReturnType<typeof useFamilias>["familias"];
  todosLosIdiomas: Idioma[];
}) {
  return (
    <div className="space-y-6">
      {/* Familias */}
      <div>
        <SeccionHeader title="Familias lingüísticas" count={det.familias.length} />
        <div className="space-y-1.5 mb-3">
          {det.familias.length > 0 ? det.familias.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-primary/10 bg-primary/4">
              <div>
                <span className="text-sm font-semibold text-primary">{f.familia?.nombre}</span>
                <span className="text-[11px] text-primary/35 ml-2">{f.tipo_clasificacion}</span>
              </div>
              <button onClick={() => det.desvincularFamilia(f.id)} className={BTN_ICON_CLS}>
                <X size={12} />
              </button>
            </div>
          )) : (
            <EstadoVacio text="Sin familia lingüística asignada." />
          )}
        </div>

        {familiasDisp.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) det.vincularFamilia(e.target.value); e.currentTarget.value = ""; }}
            className={INPUT_CLS}
          >
            <option value="">+ Vincular familia…</option>
            {familiasDisp
              .filter((f) => !det.familias.some((df) => df.familia_id === f.id))
              .map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)
            }
          </select>
        )}
      </div>

      {/* Relaciones entre idiomas */}
      <div>
        <SeccionHeader title="Relaciones con otros idiomas" count={det.relaciones.length} />
        <div className="space-y-1.5">
          {det.relaciones.length > 0 ? det.relaciones.map((r) => {
            const esOrigen = r.idioma_origen_id === idiomaId;
            const otro = esOrigen ? r.idioma_destino : r.idioma_origen;
            return (
              <div key={r.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-primary/10 bg-primary/4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-primary/30 font-mono">{esOrigen ? "→" : "←"}</span>
                  <span className="text-sm font-semibold text-primary">{otro?.nombre}</span>
                  <span className="text-[11px] text-primary px-1.5 py-0.5 rounded bg-primary/10">{r.tipo}</span>
                  {r.descripcion && <span className="text-[11px] text-primary/35">{r.descripcion}</span>}
                </div>
                <button onClick={() => det.eliminarRelacion(r.id)} className={BTN_ICON_CLS}>
                  <X size={12} />
                </button>
              </div>
            );
          }) : (
            <EstadoVacio text="Sin relaciones con otros idiomas registradas." />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab Períodos ──────────────────────────────────────────────────────────

function TabPeriodos({ periodos: hook }: { periodos: ReturnType<typeof usePeriodos> }) {
  const [nuevo, setNuevo] = useState("");

  const agregar = async () => {
    const n = nuevo.trim();
    if (!n) return;
    await hook.crearPeriodo(n);
    setNuevo("");
  };

  return (
    <div>
      <SeccionHeader title="Períodos lingüísticos" count={hook.periodos.length} />

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Nombre del período (ej: Antiguo, Medio…)"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className={`${INPUT_CLS} flex-1`}
        />
        <button onClick={agregar} className={BTN_PRIMARY_CLS}>
          <Plus size={12} /> Agregar
        </button>
      </div>

      <div className="space-y-1.5">
        {hook.periodos.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-primary/10 bg-primary/4">
            <div>
              <span className="text-sm font-semibold text-primary">{p.nombre}</span>
              <span className="text-xs text-primary/35 ml-2">
                {p.inicio_estimado ?? "?"} — {p.fin_estimado ?? "?"} {p.unidad_temporal}
              </span>
            </div>
            <button onClick={() => hook.eliminarPeriodo(p.id)} className={BTN_ICON_CLS}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {hook.periodos.length === 0 && !hook.loading && (
        <EstadoVacio text="No hay períodos lingüísticos definidos." />
      )}

      {/* Cambios lingüísticos */}
      {hook.cambios.length > 0 && (
        <div className="mt-6">
          <SeccionHeader title="Cambios lingüísticos" count={hook.cambios.length} />
          <div className="space-y-1.5">
            {hook.cambios.map((c) => (
              <div key={c.id} className="px-3.5 py-2.5 rounded-lg border border-primary/10 bg-primary/4">
                <span className="text-sm font-semibold text-primary">{c.nombre}</span>
                <span className="text-[11px] text-primary/35 ml-2">{c.dominio}</span>
                {c.descripcion && <p className="mt-1 text-xs text-primary/45">{c.descripcion}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers de UI ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

function SeccionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className={SECTION_TITLE_CLS}>{title}</h3>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] text-primary/35 tabular-nums font-bold">({count})</span>
      )}
    </div>
  );
}

function EstadoVacio({ text }: { text: string }) {
  return (
    <p className="py-5 text-center text-xs text-primary/25 italic">{text}</p>
  );
}

// Re-export type para evitar error de import unused
type Morfema = import("./types").Morfema;
