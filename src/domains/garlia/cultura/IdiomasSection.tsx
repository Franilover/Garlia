"use client";
/**
 * IdiomasSection — Editor de Mundo · Idiomas  v4
 * ──────────────────────────────────────────────
 * Layout: lista izquierda fija + panel de detalle derecho con tabs.
 * Usa el schema real de Supabase (proyecto Franiloverart).
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
  AlignLeft, ArrowLeft, Book, BookOpen, Check, ChevronDown, ChevronUp,
  FileText, Globe, Languages, List, Loader2, Mic, Plus,
  Search, Trash2, X, Link2, AlertTriangle,
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

// ── Constantes de label ───────────────────────────────────────────────────

const ESTADO_LABELS: Record<EstadoCanon, string> = {
  borrador: "Borrador", canon: "Cánon", revision: "En revisión", descartado: "Descartado",
};
const ESTADO_COLORS: Record<EstadoCanon, string> = {
  borrador: "#9ca3af", canon: "#4ade80", revision: "#f59e0b", descartado: "#f87171",
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

const PUNTOS_ARTICULACION = [
  "bilabial", "labiodental", "dental", "alveolar", "postalveolar",
  "retrofleja", "palatal", "velar", "uvular", "faríngea", "glotal", "otro",
];
const MODOS_ARTICULACION = [
  "oclusiva", "fricativa", "africada", "nasal", "lateral",
  "vibrante", "aproximante", "eyectiva", "implosiva", "otro",
];

type TabId = "info" | "fonologia" | "lexico" | "morfologia" | "gramatica" | "escritura" | "variedades" | "relaciones" | "periodos";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "info",       label: "Info",       icon: <FileText size={14} /> },
  { id: "fonologia",  label: "Fonología",  icon: <Mic size={14} /> },
  { id: "lexico",     label: "Léxico",     icon: <Book size={14} /> },
  { id: "morfologia", label: "Morfología", icon: <AlignLeft size={14} /> },
  { id: "gramatica",  label: "Gramática",  icon: <List size={14} /> },
  { id: "escritura",  label: "Escritura",  icon: <BookOpen size={14} /> },
  { id: "variedades", label: "Variedades", icon: <Globe size={14} /> },
  { id: "relaciones", label: "Relaciones", icon: <Link2 size={14} /> },
  { id: "periodos",   label: "Períodos",   icon: <AlignLeft size={14} /> },
];

// ── Componente principal ──────────────────────────────────────────────────

export function IdiomasSection() {
  const { idiomas, loading: loadingLista, error: errorLista, cargar: recargarLista, crear: crearIdioma, eliminar: eliminarIdioma } = useIdiomas();
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
    if (nuevo) {
      setSelectedId(nuevo.id);
      setTab("info");
    }
    setCreando(false);
    setNuevoNombre("");
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* ── Lista lateral ──────────────────────────────────────────── */}
      <aside style={{
        width: 260, flexShrink: 0, borderRight: "1px solid #2a2a2a",
        display: "flex", flexDirection: "column", background: "#111",
      }}>
        {/* Header */}
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", display: "flex", alignItems: "center", gap: 6 }}>
              <Languages size={15} style={{ color: "#60a5fa" }} /> Idiomas
            </span>
            <button
              onClick={() => setCreando(true)}
              style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: 2 }}
              title="Nuevo idioma"
            >
              <Plus size={16} />
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: "100%", padding: "5px 8px 5px 26px", background: "#1a1a1a",
                border: "1px solid #2a2a2a", borderRadius: 6, color: "#e5e7eb",
                fontSize: 12, boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Formulario crear */}
        {creando && (
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a2a", background: "#161616" }}>
            <input
              ref={inputRef}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCrear(); if (e.key === "Escape") { setCreando(false); setNuevoNombre(""); } }}
              placeholder="Nombre del idioma..."
              style={{
                width: "100%", padding: "6px 8px", background: "#1f1f1f",
                border: "1px solid #60a5fa", borderRadius: 6, color: "#e5e7eb",
                fontSize: 12, boxSizing: "border-box", marginBottom: 6,
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleCrear} style={{ flex: 1, padding: "5px 8px", background: "#2563eb", border: "none", borderRadius: 5, color: "#fff", fontSize: 12, cursor: "pointer" }}>
                Crear
              </button>
              <button onClick={() => { setCreando(false); setNuevoNombre(""); }} style={{ flex: 1, padding: "5px 8px", background: "#374151", border: "none", borderRadius: 5, color: "#9ca3af", fontSize: 12, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingLista && <div style={{ padding: 16, textAlign: "center" }}><Loader2 size={16} style={{ color: "#6b7280", animation: "spin 1s linear infinite" }} /></div>}
          {!loadingLista && idiomasFiltrados.map((idioma) => (
            <button
              key={idioma.id}
              onClick={() => { setSelectedId(idioma.id); setTab("info"); }}
              style={{
                width: "100%", padding: "9px 14px", background: selectedId === idioma.id ? "#1d2433" : "transparent",
                border: "none", borderLeft: selectedId === idioma.id ? "2px solid #60a5fa" : "2px solid transparent",
                color: selectedId === idioma.id ? "#e5e7eb" : "#9ca3af",
                textAlign: "left", cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span>
                <span style={{ fontWeight: selectedId === idioma.id ? 600 : 400 }}>{idioma.nombre}</span>
                {idioma.endonimo && <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 5 }}>({idioma.endonimo})</span>}
              </span>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: ESTADO_COLORS[idioma.estado ?? "borrador"],
                flexShrink: 0,
              }} />
            </button>
          ))}
          {!loadingLista && idiomasFiltrados.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#6b7280", fontSize: 12 }}>
              {busqueda ? "Sin resultados" : "No hay idiomas todavía"}
            </div>
          )}
        </div>
      </aside>

      {/* ── Panel de detalle ──────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0f0f0f" }}>
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
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>
            <div style={{ textAlign: "center" }}>
              <Languages size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Seleccioná un idioma o creá uno nuevo</p>
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
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={20} style={{ color: "#60a5fa", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }
  if (!det.idioma) return null;

  const idioma = det.idioma;

  return (
    <>
      {/* Header del detalle */}
      <div style={{ padding: "14px 20px 0", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f3f4f6" }}>{idioma.nombre}</h2>
            {idioma.endonimo && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>{idioma.endonimo}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                background: ESTADO_COLORS[idioma.estado ?? "borrador"] + "22",
                color: ESTADO_COLORS[idioma.estado ?? "borrador"],
                border: `1px solid ${ESTADO_COLORS[idioma.estado ?? "borrador"]}44`,
              }}>
                {ESTADO_LABELS[idioma.estado ?? "borrador"]}
              </span>
              {idioma.es_protolengua && (
                <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                  Protolengua
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onEliminar}
            style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 4 }}
            title="Eliminar idioma"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                padding: "7px 13px", background: "none", border: "none",
                borderBottom: tab === t.id ? "2px solid #60a5fa" : "2px solid transparent",
                color: tab === t.id ? "#60a5fa" : "#6b7280",
                fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por tab */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {tab === "info" && <TabInfo idioma={idioma} onGuardar={det.guardar} saving={det.saving} />}
        {tab === "fonologia" && <TabFonologia fonemas={fonemas} />}
        {tab === "lexico" && <TabLexico lexemas={lexemas} />}
        {tab === "morfologia" && <TabMorfologia morfemas={morfemas} idiomaId={idiomaId} />}
        {tab === "gramatica" && <TabGramatica perfil={perfil} />}
        {tab === "escritura" && <TabEscritura escritura={escritura} sistemasDisp={sistemasDisp} crearSistema={crearSistema} />}
        {tab === "variedades" && <TabVariedades variedades={variedades} />}
        {tab === "relaciones" && (
          <TabRelaciones
            det={det}
            idiomaId={idiomaId}
            familiasDisp={familiasDisp}
            todosLosIdiomas={[]}
          />
        )}
        {tab === "periodos" && <TabPeriodos periodos={periodos} />}
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
    <div style={{ maxWidth: 600 }}>
      <Field label="Nombre">
        <input value={merged.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Endónimo (nombre en el propio idioma)">
        <input value={merged.endonimo ?? ""} onChange={(e) => set("endonimo", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Descripción">
        <textarea value={merged.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Estado">
        <select value={merged.estado ?? "borrador"} onChange={(e) => set("estado", e.target.value)} style={inputStyle}>
          {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="¿Es protolengua?">
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", fontSize: 13 }}>
          <input type="checkbox" checked={merged.es_protolengua ?? false} onChange={(e) => set("es_protolengua", e.target.checked)} />
          Marcar como protolengua
        </label>
      </Field>
      <Field label="Fuente canon">
        <input value={merged.fuente_canon ?? ""} onChange={(e) => set("fuente_canon", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Notas de documentación">
        <textarea value={merged.notas_documentacion ?? ""} onChange={(e) => set("notas_documentacion", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      {dirty && (
        <button onClick={guardar} disabled={saving} style={btnPrimary}>
          {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
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
    await hook.crearFonema({ ...nuevo, es_fonema_distintivo: true, estado: "borrador" });
    setNuevo({ simbolo: "", ipa: "", clase: "consonante" });
  };

  const grupos: { label: string; items: typeof hook.fonemas }[] = [
    { label: "Consonantes", items: hook.consonantes },
    { label: "Vocales", items: hook.vocales },
    { label: "Otros", items: hook.otros },
  ];

  return (
    <div>
      <SectionHeader title="Inventario fonémico" count={hook.fonemas.length} />

      {/* Prosodia */}
      {hook.prosodia && (
        <div style={{ padding: "10px 14px", background: "#161616", borderRadius: 8, marginBottom: 16, fontSize: 12, color: "#9ca3af" }}>
          <span style={{ color: "#e5e7eb", fontWeight: 500 }}>Prosodia:</span>{" "}
          {hook.prosodia.sistema_prosodico}
          {hook.prosodia.tono_distintivo && " · tono distintivo"}
          {hook.prosodia.duracion_distintiva && " · duración distintiva"}
        </div>
      )}

      {/* Agregar fonema */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Símbolo práctico (ej: kh)" value={nuevo.simbolo} onChange={(e) => setNuevo((p) => ({ ...p, simbolo: e.target.value }))} style={{ ...inputStyle, width: 130 }} />
        <input placeholder="IPA (ej: x)" value={nuevo.ipa} onChange={(e) => setNuevo((p) => ({ ...p, ipa: e.target.value }))} style={{ ...inputStyle, width: 130 }} />
        <select value={nuevo.clase} onChange={(e) => setNuevo((p) => ({ ...p, clase: e.target.value as ClaseFonema }))} style={{ ...inputStyle, width: 140 }}>
          {CLASES_FONEMA.map((c) => <option key={c} value={c}>{CLASE_FONEMA_LABELS[c]}</option>)}
        </select>
        <button onClick={agregar} style={btnPrimary}><Plus size={13} /> Agregar</button>
      </div>

      {/* Tabla por grupo */}
      {grupos.map((g) => g.items.length > 0 && (
        <div key={g.label} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{g.label} ({g.items.length})</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
            {g.items.map((f) => (
              <div
                key={f.id}
                style={{
                  padding: "8px 10px", background: "#161616", borderRadius: 7,
                  border: expandido === f.id ? "1px solid #60a5fa44" : "1px solid #2a2a2a",
                  cursor: "pointer",
                }}
                onClick={() => setExpandido(expandido === f.id ? null : f.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb", fontFamily: "monospace" }}>{f.simbolo}</span>
                    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6, fontFamily: "monospace" }}>[{f.ipa}]</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); hook.eliminarFonema(f.id); }}
                    style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 2 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {expandido === f.id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
                    {f.punto_articulacion && <p style={{ margin: "2px 0" }}>Punto: {f.punto_articulacion}</p>}
                    {f.modo_articulacion && <p style={{ margin: "2px 0" }}>Modo: {f.modo_articulacion}</p>}
                    {f.notas && <p style={{ margin: "4px 0", color: "#6b7280", fontStyle: "italic" }}>{f.notas}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {hook.fonemas.length === 0 && !hook.loading && (
        <EmptyState text="No hay fonemas registrados. Agregá consonantes y vocales arriba." />
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
      <SectionHeader title="Diccionario / Léxico" count={hook.lexemas.length} />

      {/* Nuevo lexema */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Nuevo lema..."
          value={nuevoLema}
          onChange={(e) => setNuevoLema(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          style={{ ...inputStyle, flex: 1, minWidth: 150 }}
        />
        <select value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value as CategoriaGramatical)} style={{ ...inputStyle, width: 160 }}>
          {CATS_GRAM.map((c) => <option key={c} value={c}>{CAT_GRAM_LABELS[c]}</option>)}
        </select>
        <button onClick={agregar} style={btnPrimary}><Plus size={13} /> Agregar</button>
      </div>

      {/* Buscador */}
      {hook.lexemas.length > 10 && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Filtrar léxico..." style={{ ...inputStyle, paddingLeft: 26 }} />
        </div>
      )}

      {/* Lista lexemas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtrados.map((lex) => (
          <div
            key={lex.id}
            style={{ background: "#161616", borderRadius: 8, border: expandido === lex.id ? "1px solid #374151" : "1px solid #1f1f1f" }}
          >
            {/* Cabecera lexema */}
            <div
              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onClick={() => setExpandido(expandido === lex.id ? null : lex.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb", fontFamily: "serif" }}>{lex.lema}</span>
                {lex.transcripcion_ipa && <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>[{lex.transcripcion_ipa}]</span>}
                <span style={{ fontSize: 11, color: "#4b5563", padding: "1px 6px", background: "#1f1f1f", borderRadius: 4 }}>
                  {CAT_GRAM_LABELS[lex.categoria_gramatical]}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {lex.sentidos && lex.sentidos.length > 0 && (
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{lex.sentidos.length} sentido{lex.sentidos.length !== 1 ? "s" : ""}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); hook.eliminar(lex.id); }}
                  style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 2 }}
                >
                  <Trash2 size={12} />
                </button>
                {expandido === lex.id ? <ChevronUp size={14} style={{ color: "#6b7280" }} /> : <ChevronDown size={14} style={{ color: "#6b7280" }} />}
              </div>
            </div>

            {/* Detalle lexema expandido */}
            {expandido === lex.id && (
              <div style={{ padding: "0 14px 14px", borderTop: "1px solid #1f1f1f" }}>
                {/* Definición breve */}
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Definición breve</label>
                  <input
                    defaultValue={lex.definicion_breve ?? ""}
                    onBlur={(e) => { if (e.target.value !== (lex.definicion_breve ?? "")) hook.guardar(lex.id, { definicion_breve: e.target.value }); }}
                    style={inputStyle}
                    placeholder="Glosa rápida..."
                  />
                </div>

                {/* Sentidos */}
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>ACEPCIONES</p>
                  {(lex.sentidos ?? []).map((s, i) => (
                    <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#4b5563", paddingTop: 4, minWidth: 16 }}>{i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <input
                          defaultValue={s.definicion}
                          onBlur={(e) => { if (e.target.value !== s.definicion) hook.guardarSentido(lex.id, s.id, { definicion: e.target.value }); }}
                          style={{ ...inputStyle, marginBottom: 4 }}
                          placeholder="Definición..."
                        />
                        {s.uso_ejemplo && (
                          <p style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic", margin: 0 }}>"{s.uso_ejemplo}"</p>
                        )}
                      </div>
                      <button
                        onClick={() => hook.eliminarSentido(lex.id, s.id)}
                        style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", paddingTop: 4 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hook.lexemas.length === 0 && !hook.loading && (
        <EmptyState text="No hay lexemas registrados. Escribí el primer lema arriba." />
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
    tipo,
    label: TIPOS_LABEL[tipo],
    items: hook.morfemas.filter((m) => m.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <SectionHeader title="Morfemas" count={hook.morfemas.length} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Forma del morfema (ej: -ak)"
          value={nueva.forma}
          onChange={(e) => setNueva((p) => ({ ...p, forma: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <select value={nueva.tipo} onChange={(e) => setNueva((p) => ({ ...p, tipo: e.target.value as any }))} style={{ ...inputStyle, width: 140 }}>
          {Object.entries(TIPOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={agregar} style={btnPrimary}><Plus size={13} /> Agregar</button>
      </div>

      {grupos.map((g) => (
        <div key={g.tipo} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{g.label} ({g.items.length})</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {g.items.map((m) => (
              <div
                key={m.id}
                style={{ padding: "6px 10px", background: "#1a1a1a", borderRadius: 6, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e5e7eb" }}>{m.forma}</span>
                {m.significado && <span style={{ fontSize: 11, color: "#6b7280" }}>{m.significado}</span>}
                <button onClick={() => hook.eliminarMorfema(m.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 0 }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hook.morfemas.length === 0 && !hook.loading && (
        <EmptyState text="No hay morfemas registrados." />
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
    <div style={{ maxWidth: 600 }}>
      <SectionHeader title="Perfil tipológico" />
      {!p && <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Todavía no hay perfil gramatical. Completá algún campo para crearlo.</p>}

      <Field label="Orden básico (ej: SOV, SVO)">
        <input value={merged.orden_basico ?? ""} onChange={(e) => set("orden_basico", e.target.value)} style={inputStyle} placeholder="SOV, SVO, VSO…" />
      </Field>
      <Field label="Adjetivo · Sustantivo">
        <input value={merged.orden_adjetivo_sustantivo ?? ""} onChange={(e) => set("orden_adjetivo_sustantivo", e.target.value)} style={inputStyle} placeholder="Adj-N o N-Adj" />
      </Field>
      <Field label="Tipo de adposición">
        <input value={merged.tipo_adposicion ?? ""} onChange={(e) => set("tipo_adposicion", e.target.value)} style={inputStyle} placeholder="preposición, posposición, ambigua" />
      </Field>
      <Field label="Estrategia de negación">
        <input value={merged.estrategia_negacion ?? ""} onChange={(e) => set("estrategia_negacion", e.target.value)} style={inputStyle} placeholder="partícula, afijo, doble negación…" />
      </Field>
      <Field label="Alineamiento (ej: nominativo-acusativo)">
        <input value={merged.alineamiento ?? ""} onChange={(e) => set("alineamiento", e.target.value)} style={inputStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {([
          ["genero_gramatical", "Género gramatical"],
          ["numero_gramatical", "Número gramatical"],
          ["caso_gramatical", "Caso gramatical"],
          ["concordancia", "Concordancia"],
        ] as [keyof PerfilGramatical, string][]).map(([k, label]) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={(merged[k] as boolean | undefined) ?? false}
              onChange={(e) => set(k, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <Field label="Notas">
        <textarea value={merged.notas ?? ""} onChange={(e) => set("notas", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      {dirty && (
        <button onClick={guardar} style={btnPrimary}><Check size={13} /> Guardar perfil</button>
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
      <SectionHeader title="Sistemas de escritura" count={escritura.vinculaciones.length} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={nuevaSistemaId} onChange={(e) => setNuevaSistemaId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="">— Seleccionar sistema —</option>
          {sistemasNoVinculados.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.tipo})</option>)}
        </select>
        <button onClick={vincular} disabled={!nuevaSistemaId} style={btnPrimary}><Plus size={13} /> Vincular</button>
      </div>

      {escritura.vinculaciones.map((v) => (
        <div key={v.id} style={{ padding: "10px 14px", background: "#161616", borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 14 }}>{v.sistema?.nombre}</span>
            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{v.sistema?.tipo} · {v.sistema?.direccion?.replace(/_/g, " ")}</span>
            <span style={{ fontSize: 11, color: "#4b5563", marginLeft: 8 }}>{v.funcion}</span>
          </div>
          <button onClick={() => escritura.desvincular(v.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {escritura.vinculaciones.length === 0 && !escritura.loading && (
        <EmptyState text="No hay sistemas de escritura vinculados." />
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
      <SectionHeader title="Variedades lingüísticas" count={hook.variedades.length} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Nombre de la variedad..."
          value={nueva.nombre}
          onChange={(e) => setNueva((p) => ({ ...p, nombre: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <select value={nueva.tipo} onChange={(e) => setNueva((p) => ({ ...p, tipo: e.target.value as TipoVariedad }))} style={{ ...inputStyle, width: 150 }}>
          {Object.entries(TIPO_VARIEDAD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={agregar} style={btnPrimary}><Plus size={13} /> Agregar</button>
      </div>

      {hook.variedades.map((v) => (
        <div key={v.id} style={{ padding: "10px 14px", background: "#161616", borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 14 }}>{v.nombre}</span>
            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{TIPO_VARIEDAD_LABELS[v.tipo as TipoVariedad]}</span>
            {v.descripcion && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{v.descripcion}</p>}
          </div>
          <button onClick={() => hook.eliminar(v.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {hook.variedades.length === 0 && !hook.loading && (
        <EmptyState text="No hay variedades registradas." />
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
  const TIPOS_REL: Array<{ value: string; label: string }> = [
    { value: "descendencia", label: "Descendencia" },
    { value: "prestamo", label: "Préstamo" },
    { value: "influencia", label: "Influencia" },
    { value: "pidgin", label: "Pidgin" },
    { value: "creole", label: "Créole" },
    { value: "otro", label: "Otro" },
  ];

  return (
    <div>
      {/* Familias */}
      <SectionHeader title="Familias lingüísticas" count={det.familias.length} />
      <div style={{ marginBottom: 20 }}>
        {det.familias.length > 0 ? det.familias.map((f) => (
          <div key={f.id} style={{ padding: "8px 12px", background: "#161616", borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 13 }}>{f.familia?.nombre}</span>
              <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{f.tipo_clasificacion}</span>
            </div>
            <button onClick={() => det.desvincularFamilia(f.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
              <X size={12} />
            </button>
          </div>
        )) : (
          <EmptyState text="Sin familia lingüística asignada." />
        )}

        {familiasDisp.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) det.vincularFamilia(e.target.value); e.target.value = ""; }}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">+ Vincular familia...</option>
              {familiasDisp
                .filter((f) => !det.familias.some((df) => df.familia_id === f.id))
                .map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)
              }
            </select>
          </div>
        )}
      </div>

      {/* Relaciones entre idiomas */}
      <SectionHeader title="Relaciones con otros idiomas" count={det.relaciones.length} />
      {det.relaciones.length > 0 ? det.relaciones.map((r) => {
        const esOrigen = r.idioma_origen_id === idiomaId;
        const otro = esOrigen ? r.idioma_destino : r.idioma_origen;
        return (
          <div key={r.id} style={{ padding: "8px 12px", background: "#161616", borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 11, color: "#6b7280", marginRight: 6 }}>
                {esOrigen ? "→" : "←"}
              </span>
              <span style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 13 }}>{otro?.nombre}</span>
              <span style={{ fontSize: 11, color: "#60a5fa", marginLeft: 8 }}>{r.tipo}</span>
              {r.descripcion && <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 6 }}>{r.descripcion}</span>}
            </div>
            <button onClick={() => det.eliminarRelacion(r.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
              <X size={12} />
            </button>
          </div>
        );
      }) : (
        <EmptyState text="Sin relaciones con otros idiomas registradas." />
      )}
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
      <SectionHeader title="Períodos lingüísticos" count={hook.periodos.length} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Nombre del período (ej: Antiguo, Medio…)"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={agregar} style={btnPrimary}><Plus size={13} /> Agregar</button>
      </div>

      {hook.periodos.map((p) => (
        <div key={p.id} style={{ padding: "10px 14px", background: "#161616", borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 14 }}>{p.nombre}</span>
            <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>
              {p.inicio_estimado !== null && p.inicio_estimado !== undefined ? `${p.inicio_estimado}` : "?"}
              {" — "}
              {p.fin_estimado !== null && p.fin_estimado !== undefined ? `${p.fin_estimado}` : "?"}
              {" " + p.unidad_temporal}
            </span>
          </div>
          <button onClick={() => hook.eliminarPeriodo(p.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {hook.periodos.length === 0 && !hook.loading && (
        <EmptyState text="No hay períodos lingüísticos definidos." />
      )}

      {/* Cambios lingüísticos */}
      {hook.cambios.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader title="Cambios lingüísticos" count={hook.cambios.length} />
          {hook.cambios.map((c) => (
            <div key={c.id} style={{ padding: "8px 12px", background: "#161616", borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: "#e5e7eb", fontSize: 13 }}>{c.nombre}</span>
              <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{c.dominio}</span>
              {c.descripcion && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{c.descripcion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers de UI ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}>{title}</h3>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 11, color: "#6b7280" }}>({count})</span>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "#4b5563", fontSize: 12 }}>
      {text}
    </div>
  );
}

// ── Estilos compartidos ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "#1a1a1a",
  border: "1px solid #2a2a2a", borderRadius: 6, color: "#e5e7eb",
  fontSize: 13, boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#6b7280",
  fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5,
};

const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", background: "#2563eb", border: "none", borderRadius: 6,
  color: "#fff", fontSize: 12, cursor: "pointer", display: "flex",
  alignItems: "center", gap: 5, whiteSpace: "nowrap",
};

// Re-export type para evitar error de import unused
type Morfema = import("./types").Morfema;
