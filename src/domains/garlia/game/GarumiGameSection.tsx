"use client";

/**
 * GarumiGameSection — sección de Game para editar datos de Garumis
 * ─────────────────────────────────────────────────────────────────
 * Tablas usadas:
 *   garumis · garumi_originales · garumi_estadisticas_combate
 *   garumi_elemento_asignaciones · garumi_elementos
 *   garumi_dones_habilidades_asignaciones · garumi_dones_habilidades_catalogo
 *   garumi_rasgos · garumi_manifestaciones · garumi_arquetipos_combate
 *
 * Patrón visual: igual que el resto de GamePage
 *   – Grid agrupado por Original (Orumi / Varum / Nyru)
 *   – PanelModal con sub-tabs: Base · Stats · Elementos · Dones · Manifestaciones
 */

import React, {
  useCallback, useEffect, useMemo,
  useRef, useState,
} from "react";
import {
  Check, ChevronRight, Dna, Layers, Loader2,
  Plus, Save, Search, Trash2, X, Zap, Shield,
  Wind, FlaskConical, Star, AlertCircle,
  Brain, Cpu, GitMerge, Leaf, Pencil,
} from "lucide-react";
import { supabase } from "@/infra/supabase/supabase";
import { PopoverFlotante } from "@/domains/garlia/_shared/PopoverFlotante";

// ─────────────────────────────────────────────────────────────────────────────
// Primitivos de formulario (mismo estilo que GamePage)
// ─────────────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
  color: "var(--primary)",
};

function FL({ label }: { label: string }) {
  return (
    <span className="text-xs font-semibold tracking-wide"
      style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
      {label}
    </span>
  );
}

function Inp(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...p}
      className="px-3 py-2 rounded-xl text-sm outline-none w-full"
      style={inputStyle} />
  );
}

function TA(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...p}
      className="px-3 py-2 rounded-xl text-sm outline-none w-full resize-none"
      style={inputStyle}
      rows={p.rows ?? 3} />
  );
}

function Sel(p: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...p}
      className="px-3 py-2 rounded-xl text-sm outline-none w-full"
      style={inputStyle} />
  );
}

function Bdg({ text, emphasis }: { text: string; emphasis?: "hi" | "mid" | "lo" | "warn" }) {
  // hi  = full primary (canon, ok, activo)
  // mid = primary 55%  (roles, tipos, neutro)
  // lo  = primary 20%  (borrador, default)
  // warn= primary 30% con borde más visible (sin criatura, pendiente)
  const bg: Record<string, string> = {
    hi:   "color-mix(in srgb, var(--primary) 18%, transparent)",
    mid:  "color-mix(in srgb, var(--primary) 10%, transparent)",
    lo:   "color-mix(in srgb, var(--primary) 6%,  transparent)",
    warn: "color-mix(in srgb, var(--primary) 8%,  transparent)",
  };
  const fg: Record<string, string> = {
    hi:   "var(--primary)",
    mid:  "color-mix(in srgb, var(--primary) 70%, transparent)",
    lo:   "color-mix(in srgb, var(--primary) 40%, transparent)",
    warn: "color-mix(in srgb, var(--primary) 55%, transparent)",
  };
  const border: Record<string, string> = {
    hi:   "color-mix(in srgb, var(--primary) 35%, transparent)",
    mid:  "color-mix(in srgb, var(--primary) 18%, transparent)",
    lo:   "color-mix(in srgb, var(--primary) 10%, transparent)",
    warn: "color-mix(in srgb, var(--primary) 25%, transparent)",
  };
  const k = emphasis ?? "lo";
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: bg[k], color: fg[k], border: `1px solid ${border[k]}` }}>
      {text}
    </span>
  );
}

function SaveBtn({ saving, saved, disabled, onClick }: {
  saving: boolean; saved: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={saving || disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: saved ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--primary)",
        color: saved ? "var(--primary)" : "var(--btn-text,#fff)",
        opacity: disabled ? 0.4 : 1,
      }}>
      {saving ? <Loader2 size={12} className="animate-spin" />
        : saved ? <Check size={12} /> : <Save size={12} />}
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="shrink-0 text-xs font-semibold uppercase tracking-wide pt-2 pb-1"
      style={{ color: "var(--primary)", borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
      {label}
    </div>
  );
}

// emphasis="hi"  → primary fuerte (éxito / enlazado)
// emphasis="warn" → primary atenuado con borde visible (advertencia / sin datos)
// emphasis="lo"   → muy sutil (info)
function Banner({ children, emphasis = "warn" }: {
  children: React.ReactNode;
  emphasis?: "hi" | "warn" | "lo";
}) {
  const styles: Record<string, React.CSSProperties> = {
    hi:   { background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)", color: "var(--primary)" },
    warn: { background: "color-mix(in srgb, var(--primary) 6%,  transparent)", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", color: "color-mix(in srgb, var(--primary) 65%, transparent)" },
    lo:   { background: "color-mix(in srgb, var(--primary) 4%,  transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 45%, transparent)" },
  };
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
      style={styles[emphasis]}>
      {children}
    </div>
  );
}

function useSave() {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    await fn();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return { saving, saved, run };
}

// ─────────────────────────────────────────────────────────────────────────────
// PanelModal (igual API que en GamePage)
// ─────────────────────────────────────────────────────────────────────────────

function PanelModal({
  abierto, onCerrar, titulo, icono,
  accionesDerecha, children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: React.ReactNode;
  icono?: React.ReactNode;
  accionesDerecha?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bodyRef = useRef<HTMLElement | null>(null);
  useEffect(() => { bodyRef.current = document.body; }, []);
  if (!abierto) return null;
  return (
    <PopoverFlotante
      anchor={bodyRef.current}
      onClose={onCerrar}
      width={720}
      maxHeight={Math.round(window.innerHeight * 0.88)}
      backdrop
      centerVertically
      centerHorizontally
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 -mx-4 -mt-4 px-4 py-3 mb-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}>
        {icono && (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            }}>
            <span style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>{icono}</span>
          </div>
        )}
        {titulo && (
          <p className="flex-1 min-w-0 text-sm font-black truncate"
            style={{ color: "var(--primary)" }}>{titulo}</p>
        )}
        {accionesDerecha && (
          <div className="shrink-0 flex items-center gap-2">{accionesDerecha}</div>
        )}
        <button type="button" onClick={onCerrar}
          className="shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </PopoverFlotante>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de badge para estado
// ─────────────────────────────────────────────────────────────────────────────

function estadoEmphasis(e: string): "hi" | "mid" | "lo" | "warn" {
  if (e === "canon")       return "hi";
  if (e === "en_revision") return "mid";
  if (e === "borrador")    return "lo";
  return "lo";
}

function evoEmphasis(e: string): "hi" | "mid" | "lo" {
  if (e === "final")   return "hi";
  if (e === "inicial") return "mid";
  return "lo";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Stats de combate
// ─────────────────────────────────────────────────────────────────────────────

interface Stats {
  id?: string;
  vida_maxima: string;
  ataque: string;
  defensa: string;
  velocidad: string;
  eterium_maximo: string;
  resistencia: string;
  precision: string;
  tenacidad: string;
  control: string;
  percepcion: string;
  arquetipo_id: string;
  estado_documentacion: string;
  notas_internas: string;
}

const STATS_FIELDS: { key: keyof Stats; label: string }[] = [
  { key: "vida_maxima",    label: "Vida máx" },
  { key: "ataque",         label: "Ataque" },
  { key: "defensa",        label: "Defensa" },
  { key: "velocidad",      label: "Velocidad" },
  { key: "eterium_maximo", label: "Eterium máx" },
  { key: "resistencia",    label: "Resistencia" },
  { key: "precision",      label: "Precisión" },
  { key: "tenacidad",      label: "Tenacidad" },
  { key: "control",        label: "Control" },
  { key: "percepcion",     label: "Percepción" },
];

const EMPTY_STATS: Stats = {
  vida_maxima: "", ataque: "", defensa: "", velocidad: "",
  eterium_maximo: "", resistencia: "", precision: "",
  tenacidad: "", control: "", percepcion: "",
  arquetipo_id: "", estado_documentacion: "borrador", notas_internas: "",
};

function TabStats({ garumiId, arquetipos, initialData }: { garumiId: string; arquetipos: any[]; initialData?: any }) {
  const parseData = (data: any): Stats => ({
    id: data.id,
    vida_maxima:    String(data.vida_maxima    ?? ""),
    ataque:         String(data.ataque         ?? ""),
    defensa:        String(data.defensa        ?? ""),
    velocidad:      String(data.velocidad      ?? ""),
    eterium_maximo: String(data.eterium_maximo ?? ""),
    resistencia:    String(data.resistencia    ?? ""),
    precision:      String(data.precision      ?? ""),
    tenacidad:      String(data.tenacidad      ?? ""),
    control:        String(data.control        ?? ""),
    percepcion:     String(data.percepcion     ?? ""),
    arquetipo_id:   data.arquetipo_id          ?? "",
    estado_documentacion: data.estado_documentacion ?? "borrador",
    notas_internas: data.notas_internas        ?? "",
  });

  const [stats, setStats] = useState<Stats>(initialData ? parseData(initialData) : EMPTY_STATS);
  const [loading, setLoading] = useState(!initialData);
  const { saving, saved, run } = useSave();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("garumi_estadisticas_combate")
      .select("*")
      .eq("garumi_id", garumiId)
      .maybeSingle();
    if (data) { setStats(parseData(data)); } else { setStats({ ...EMPTY_STATS }); }
    setLoading(false);
  }, [garumiId]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  const set = (k: keyof Stats, v: string) => setStats(prev => ({ ...prev, [k]: v }));

  const save = () => run(async () => {
    const payload: Record<string, any> = {
      garumi_id: garumiId,
      arquetipo_id: stats.arquetipo_id || null,
      estado_documentacion: stats.estado_documentacion,
      notas_internas: stats.notas_internas || null,
    };
    STATS_FIELDS.forEach(({ key }) => {
      payload[key] = stats[key] !== "" ? Number(stats[key]) : null;
    });

    if (stats.id) {
      await supabase.from("garumi_estadisticas_combate").update(payload).eq("id", stats.id);
    } else {
      const { data } = await supabase.from("garumi_estadisticas_combate").insert(payload).select().single();
      if (data) setStats(prev => ({ ...prev, id: data.id }));
    }
  });

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={16} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
    </div>
  );

  const noStats = !stats.id;

  return (
    <div className="flex flex-col gap-3">
      {noStats && (
        <Banner emphasis="warn">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          Sin estadísticas registradas — se crearán al guardar.
        </Banner>
      )}

      {/* Grid de stats numéricos */}
      <div className="grid grid-cols-2 gap-3">
        {STATS_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1">
            <FL label={label} />
            <Inp
              type="number"
              step="0.1"
              value={stats[key] as string}
              onChange={e => set(key, e.target.value)}
              placeholder="—"
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <FL label="Arquetipo de combate" />
        <Sel value={stats.arquetipo_id} onChange={e => set("arquetipo_id", e.target.value)}>
          <option value="">— sin arquetipo —</option>
          {arquetipos.map(a => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </Sel>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <FL label="Estado" />
          <Sel value={stats.estado_documentacion} onChange={e => set("estado_documentacion", e.target.value)}>
            <option value="borrador">Borrador</option>
            <option value="en_revision">En revisión</option>
            <option value="canon">Canon</option>
          </Sel>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <FL label="Notas internas" />
        <TA value={stats.notas_internas} onChange={e => set("notas_internas", e.target.value)} rows={2} />
      </label>

      <div className="flex justify-end">
        <SaveBtn saving={saving} saved={saved} onClick={save} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Elementos asignados
// ─────────────────────────────────────────────────────────────────────────────

const ROLES_ELEMENTO = ["primario", "secundario", "latente", "opuesto"];

function TabElementos({ garumiId, elementos, initialData }: { garumiId: string; elementos: any[]; initialData?: any[] }) {
  const [asigs, setAsigs] = useState<any[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [selElem, setSelElem] = useState("");
  const [selRol,  setSelRol]  = useState("primario");
  const [adding,  setAdding]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const muted = "color-mix(in srgb, var(--primary) 35%, transparent)";
  const border = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("garumi_elemento_asignaciones")
      .select("id, elemento_id, rol, estado_documentacion, garumi_elementos(nombre, codigo)")
      .eq("garumi_id", garumiId)
      .order("created_at");
    setAsigs(data ?? []);
    setLoading(false);
  }, [garumiId]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  const add = async () => {
    if (!selElem) return;
    setAdding(true);
    await supabase.from("garumi_elemento_asignaciones").insert({
      garumi_id: garumiId,
      elemento_id: selElem,
      rol: selRol,
      estado_documentacion: "borrador",
    });
    setSelElem(""); setAdding(false);
    await load();
  };

  const del = async (id: string) => {
    setDeleting(id);
    await supabase.from("garumi_elemento_asignaciones").delete().eq("id", id);
    setDeleting(null);
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Añadir */}
      <div className="flex gap-2 flex-wrap">
        <Sel value={selElem} onChange={e => setSelElem(e.target.value)} style={{ ...inputStyle, width: 180 }}>
          <option value="">— elemento —</option>
          {elementos.map(el => <option key={el.id} value={el.id}>{el.nombre}</option>)}
        </Sel>
        <Sel value={selRol} onChange={e => setSelRol(e.target.value)} style={{ ...inputStyle, width: 140 }}>
          {ROLES_ELEMENTO.map(r => <option key={r} value={r}>{r}</option>)}
        </Sel>
        <button type="button" onClick={add} disabled={adding || !selElem}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
          style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !selElem ? 0.4 : 1 }}>
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Asignar
        </button>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-1.5">
        {asigs.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: muted }}>Sin elementos asignados</p>
        ) : asigs.map(a => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl group"
            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border }}>
            <Zap size={12} style={{ color: muted, flexShrink: 0 }} />
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--primary)" }}>
              {a.garumi_elementos?.nombre ?? a.elemento_id.slice(0, 8)}
            </span>
            <Bdg text={a.rol} emphasis={a.rol === "primario" ? "hi" : a.rol === "secundario" ? "mid" : "lo"} />
            <Bdg text={a.estado_documentacion} emphasis={estadoEmphasis(a.estado_documentacion)} />
            <button type="button" onClick={() => del(a.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: muted }}
              disabled={deleting === a.id}>
              {deleting === a.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Dones y Habilidades
// ─────────────────────────────────────────────────────────────────────────────

function TabDones({ garumiId, donesCatalogo, initialData }: { garumiId: string; donesCatalogo: any[]; initialData?: any[] }) {
  const [asigs,   setAsigs]   = useState<any[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [selCap,  setSelCap]  = useState("");
  const [selOrigen, setSelOrigen] = useState("innato");
  const [adding,  setAdding]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const muted  = "color-mix(in srgb, var(--primary) 35%, transparent)";
  const border = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("garumi_dones_habilidades_asignaciones")
      .select("id, capacidad_id, origen, es_innata, orden, estado_documentacion, garumi_dones_habilidades_catalogo(nombre, clase, categoria)")
      .eq("garumi_id", garumiId)
      .order("orden");
    setAsigs(data ?? []);
    setLoading(false);
  }, [garumiId]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  const add = async () => {
    if (!selCap) return;
    setAdding(true);
    await supabase.from("garumi_dones_habilidades_asignaciones").insert({
      garumi_id: garumiId,
      capacidad_id: selCap,
      origen: selOrigen,
      estado_documentacion: "borrador",
    });
    setSelCap(""); setAdding(false);
    await load();
  };

  const del = async (id: string) => {
    setDeleting(id);
    await supabase.from("garumi_dones_habilidades_asignaciones").delete().eq("id", id);
    setDeleting(null);
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Añadir */}
      <div className="flex gap-2 flex-wrap">
        <Sel value={selCap} onChange={e => setSelCap(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 180 }}>
          <option value="">— don / habilidad —</option>
          {donesCatalogo.map(d => (
            <option key={d.id} value={d.id}>{d.nombre} · {d.clase}</option>
          ))}
        </Sel>
        <Sel value={selOrigen} onChange={e => setSelOrigen(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          {["innato", "evolucion", "aprendido", "especial"].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Sel>
        <button type="button" onClick={add} disabled={adding || !selCap}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
          style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !selCap ? 0.4 : 1 }}>
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Asignar
        </button>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-1.5">
        {asigs.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: muted }}>Sin dones ni habilidades asignados</p>
        ) : asigs.map(a => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl group"
            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border }}>
            <Star size={12} style={{ color: muted, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--primary)" }}>
                {a.garumi_dones_habilidades_catalogo?.nombre ?? a.capacidad_id.slice(0, 8)}
              </p>
              {a.garumi_dones_habilidades_catalogo?.clase && (
                <p className="text-[10px] truncate" style={{ color: muted }}>
                  {a.garumi_dones_habilidades_catalogo.clase}
                  {a.garumi_dones_habilidades_catalogo.categoria
                    ? ` · ${a.garumi_dones_habilidades_catalogo.categoria}` : ""}
                </p>
              )}
            </div>
            <Bdg text={a.origen} emphasis="lo" />
            <Bdg text={a.estado_documentacion} emphasis={estadoEmphasis(a.estado_documentacion)} />
            <button type="button" onClick={() => del(a.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: muted }}
              disabled={deleting === a.id}>
              {deleting === a.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Manifestaciones
// ─────────────────────────────────────────────────────────────────────────────

function TabManifestaciones({ garumiId, initialData }: { garumiId: string; initialData?: any[] }) {
  const [manes,   setManes]   = useState<any[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const muted  = "color-mix(in srgb, var(--primary) 35%, transparent)";
  const border = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";

  useEffect(() => {
    if (initialData) return;
    setLoading(true);
    supabase
      .from("garumi_manifestaciones")
      .select("id, codigo, nombre, tipo_manifestacion, orden, es_manifestacion_base, estado_documentacion, coste_eterium, limite_uso")
      .eq("garumi_id", garumiId)
      .order("orden")
      .then(({ data }) => { setManes(data ?? []); setLoading(false); });
  }, [garumiId]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  if (manes.length === 0) return (
    <p className="text-xs py-4 text-center" style={{ color: muted }}>Sin manifestaciones registradas</p>
  );

  return (
    <div className="flex flex-col gap-2">
      {manes.map(m => (
        <div key={m.id} className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
          style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border }}>
          <div className="flex items-center gap-2">
            <Layers size={11} style={{ color: muted, flexShrink: 0 }} />
            <span className="flex-1 text-xs font-semibold" style={{ color: "var(--primary)" }}>
              {m.nombre}
            </span>
            {m.es_manifestacion_base && <Bdg text="base" emphasis="mid" />}
            <Bdg text={m.tipo_manifestacion} emphasis="lo" />
            <Bdg text={m.estado_documentacion} emphasis={estadoEmphasis(m.estado_documentacion)} />
          </div>
          {(m.coste_eterium || m.limite_uso) && (
            <div className="flex gap-2 pl-5">
              {m.coste_eterium && (
                <span className="text-[10px]" style={{ color: muted }}>
                  Eterium: {m.coste_eterium}
                </span>
              )}
              {m.limite_uso && (
                <span className="text-[10px]" style={{ color: muted }}>
                  Límite: {m.limite_uso}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Rasgos
// ─────────────────────────────────────────────────────────────────────────────

function TabRasgos({ garumiId, initialData }: { garumiId: string; initialData?: any[] }) {
  const [rasgos,   setRasgos]   = useState<any[]>(initialData ?? []);
  const [loading,  setLoading]  = useState(!initialData);
  const [agregando, setAgregando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const muted  = "color-mix(in srgb, var(--primary) 35%, transparent)";
  const border = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("garumi_rasgos")
      .select("id, nombre_rasgo, tipo_rasgo, descripcion")
      .eq("garumi_id", garumiId)
      .order("created_at");
    setRasgos(data ?? []);
    setLoading(false);
  }, [garumiId]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  const add = async () => {
    if (!nuevoNombre.trim()) return;
    setSavingNew(true);
    await supabase.from("garumi_rasgos").insert({
      garumi_id: garumiId,
      nombre_rasgo: nuevoNombre.trim(),
      tipo_rasgo: nuevoTipo.trim() || null,
    });
    setNuevoNombre(""); setNuevoTipo("");
    setSavingNew(false); setAgregando(false);
    await load();
  };

  const del = async (id: string) => {
    setDeleting(id);
    await supabase.from("garumi_rasgos").delete().eq("id", id);
    setDeleting(null);
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {rasgos.map(r => (
          <div key={r.id}
            className="group flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border }}>
            {r.tipo_rasgo && (
              <span className="text-[9px] font-bold uppercase tracking-wide"
                style={{ color: muted }}>{r.tipo_rasgo} ·</span>
            )}
            <span style={{ color: "var(--primary)" }}>{r.nombre_rasgo}</span>
            <button type="button" onClick={() => del(r.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
              style={{ color: muted }} disabled={deleting === r.id}>
              {deleting === r.id ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
            </button>
          </div>
        ))}
      </div>

      {agregando ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Inp
            placeholder="tipo (ej. físico)…"
            value={nuevoTipo}
            onChange={e => setNuevoTipo(e.target.value)}
            style={{ ...inputStyle, width: 120 }}
          />
          <Inp
            autoFocus
            placeholder="nombre del rasgo…"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") void add();
              if (e.key === "Escape") setAgregando(false);
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={add} disabled={savingNew || !nuevoNombre.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--primary)", color: "var(--btn-text,#fff)", opacity: !nuevoNombre.trim() ? 0.4 : 1 }}>
            {savingNew ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Agregar
          </button>
          <button type="button" onClick={() => setAgregando(false)}
            className="px-2 py-1.5 rounded-lg text-xs"
            style={{ color: muted }}>Cancelar</button>
        </div>
      ) : (
        <button type="button" onClick={() => setAgregando(true)}
          className="flex items-center gap-1.5 self-start text-xs font-semibold"
          style={{ color: muted }}>
          <Plus size={12} /> Agregar rasgo
        </button>
      )}

      {rasgos.length === 0 && !agregando && (
        <p className="text-xs py-2" style={{ color: muted }}>Sin rasgos registrados</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Evoluciones
// ─────────────────────────────────────────────────────────────────────────────

function TabEvoluciones({ garumiId, garumis, initialData }: { garumiId: string; garumis: any[]; initialData?: any[] }) {
  const [evols,   setEvols]   = useState<any[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const muted  = "color-mix(in srgb, var(--primary) 35%, transparent)";
  const border = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";

  useEffect(() => {
    if (initialData) return;
    setLoading(true);
    supabase
      .from("garumi_evoluciones")
      .select(`
        id, especie_origen_id, especie_destino_id, tipo_relacion, descripcion_cambio,
        origen:garumis!garumi_evoluciones_especie_origen_id_fkey(nombre),
        destino:garumis!garumi_evoluciones_especie_destino_id_fkey(nombre)
      `)
      .or(`especie_origen_id.eq.${garumiId},especie_destino_id.eq.${garumiId}`)
      .then(({ data }) => {
        setEvols(data ?? []);
        setLoading(false);
      });
  }, [garumiId]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  if (evols.length === 0) return (
    <p className="text-xs py-4 text-center" style={{ color: muted }}>Sin evoluciones registradas</p>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {evols.map(e => {
        const esOrigen = e.especie_origen_id === garumiId;
        return (
          <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border }}>
            <span className="flex-1 text-xs font-semibold truncate"
              style={{ color: esOrigen ? "var(--primary)" : muted }}>
              {(e.origen as any)?.nombre ?? "—"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <GitMerge size={11} style={{ color: muted }} />
              {e.tipo_relacion && (
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: muted }}>
                  {e.tipo_relacion}
                </span>
              )}
            </div>
            <span className="flex-1 text-xs font-semibold truncate text-right"
              style={{ color: !esOrigen ? "var(--primary)" : muted }}>
              {(e.destino as any)?.nombre ?? "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab de Criatura (ia_config, comportamiento, diálogo, stats_dnd)
// ─────────────────────────────────────────────────────────────────────────────

function TabCriatura({ garumiId, criaturaId, initialData }: { garumiId: string; criaturaId: string | null; initialData?: any }) {
  const [criatura,  setCriatura]  = useState<any>(initialData ?? null);
  const [loading,   setLoading]   = useState(!initialData && !!criaturaId);
  const [jsonError, setJsonError] = useState("");
  const { saving, saved, run } = useSave();
  const muted = "color-mix(in srgb, var(--primary) 35%, transparent)";

  // campos editables — inicializados desde datos precargados si existen
  const [comportamiento, setComportamiento] = useState(initialData?.comportamiento ?? "");
  const [dialogo,        setDialogo]        = useState(initialData?.dialogo ?? "");
  const [iaConfigStr,    setIaConfigStr]    = useState(initialData?.ia_config ? JSON.stringify(initialData.ia_config, null, 2) : "");
  const [statsDndStr,    setStatsDndStr]    = useState(initialData?.stats_dnd ? JSON.stringify(initialData.stats_dnd, null, 2) : "");

  const load = useCallback(async () => {
    setLoading(true);
    if (!criaturaId) { setLoading(false); return; }
    const { data } = await supabase
      .from("criaturas")
      .select("id, nombre, comportamiento, dialogo, ia_config, stats_dnd, estado_documentacion")
      .eq("id", criaturaId)
      .maybeSingle();
    if (data) {
      setCriatura(data);
      setComportamiento(data.comportamiento ?? "");
      setDialogo(data.dialogo ?? "");
      setIaConfigStr(data.ia_config ? JSON.stringify(data.ia_config, null, 2) : "");
      setStatsDndStr(data.stats_dnd ? JSON.stringify(data.stats_dnd, null, 2) : "");
    }
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  const save = () => {
    // Validar JSON antes de guardar
    let ia_config: any = null;
    let stats_dnd: any = null;
    setJsonError("");
    try {
      if (iaConfigStr.trim()) ia_config = JSON.parse(iaConfigStr);
    } catch {
      setJsonError("ia_config JSON inválido");
      return;
    }
    try {
      if (statsDndStr.trim()) stats_dnd = JSON.parse(statsDndStr);
    } catch {
      setJsonError("stats_dnd JSON inválido");
      return;
    }
    run(async () => {
      await supabase.from("criaturas").update({
        comportamiento: comportamiento || null,
        dialogo: dialogo || null,
        ia_config: ia_config,
        stats_dnd: stats_dnd,
      }).eq("id", criaturaId!);
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  if (!criaturaId) return (
    <div className="flex flex-col gap-3 py-4">
      <Banner emphasis="warn">
        <AlertCircle size={12} className="shrink-0 mt-0.5" />
        <span>
          Este Garumi no tiene criatura enlazada. Enlaza una criatura en Supabase para editar
          su comportamiento, IA y diálogos.
        </span>
      </Banner>
      <p className="text-[11px] px-1" style={{ color: muted }}>
        Para enlazar: asigna el <code className="font-mono">criatura_id</code> en la tabla{" "}
        <code className="font-mono">garumis</code> con el id de la criatura ejecutable correspondiente.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {criatura && (
        <Banner emphasis="hi">
          <Check size={11} className="shrink-0" />
          <span>Criatura: <strong>{criatura.nombre}</strong>
          <span className="ml-1 font-mono text-[10px] opacity-60">{criaturaId?.slice(0,8)}</span></span>
        </Banner>
      )}

      <label className="flex flex-col gap-1">
        <FL label="Comportamiento" />
        <TA value={comportamiento} onChange={e => setComportamiento(e.target.value)} rows={4}
          placeholder="Descripción del comportamiento en el juego…" />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="Diálogo / personalidad vocal" />
        <TA value={dialogo} onChange={e => setDialogo(e.target.value)} rows={3}
          placeholder="Estilo de diálogo, frases características…" />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="ia_config (JSON)" />
        <TA value={iaConfigStr} onChange={e => setIaConfigStr(e.target.value)} rows={8}
          placeholder="{}" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} />
      </label>

      <label className="flex flex-col gap-1">
        <FL label="stats_dnd (JSON)" />
        <TA value={statsDndStr} onChange={e => setStatsDndStr(e.target.value)} rows={5}
          placeholder="{}" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }} />
      </label>

      {jsonError && (
        <Banner emphasis="warn">
          <AlertCircle size={12} className="shrink-0" /> {jsonError}
        </Banner>
      )}

      <div className="flex justify-end">
        <SaveBtn saving={saving} saved={saved} onClick={save} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab Motor / Godot (biología, pensamiento, GarumiBrain)
// ─────────────────────────────────────────────────────────────────────────────

function TabMotor({ garumiId, criaturaId, initialData }: { garumiId: string; criaturaId: string | null; initialData?: { garumi?: any; criatura?: any } }) {
  const [loading, setLoading] = useState(!initialData);
  const { saving, saved, run } = useSave();
  const muted = "color-mix(in srgb, var(--primary) 35%, transparent)";

  // campos de criatura
  const [biologia,    setBiologia]    = useState(initialData?.criatura?.biologia ?? "");
  const [pensamiento, setPensamiento] = useState(initialData?.criatura?.pensamiento ?? "");
  // campos de garumi
  const [numGlobal,   setNumGlobal]   = useState<string>(String(initialData?.garumi?.numero_global ?? ""));
  const [numOrigen,   setNumOrigen]   = useState<string>(String(initialData?.garumi?.numero_origen ?? ""));

  const load = useCallback(async () => {
    setLoading(true);
    // datos del garumi
    const { data: g } = await supabase
      .from("garumis")
      .select("numero_global, numero_origen")
      .eq("id", garumiId)
      .maybeSingle();
    if (g) {
      setNumGlobal(String(g.numero_global ?? ""));
      setNumOrigen(String(g.numero_origen ?? ""));
    }
    // datos de criatura
    if (criaturaId) {
      const { data: c } = await supabase
        .from("criaturas")
        .select("biologia, pensamiento")
        .eq("id", criaturaId)
        .maybeSingle();
      if (c) {
        setBiologia(c.biologia ?? "");
        setPensamiento(c.pensamiento ?? "");
      }
    }
    setLoading(false);
  }, [garumiId, criaturaId]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  const save = () => run(async () => {
    // Guardar numeración en garumis
    await supabase.from("garumis").update({
      numero_global: numGlobal !== "" ? Number(numGlobal) : null,
      numero_origen: numOrigen !== "" ? Number(numOrigen) : null,
    }).eq("id", garumiId);
    // Guardar biología y pensamiento en criatura si existe
    if (criaturaId) {
      await supabase.from("criaturas").update({
        biologia:    biologia    || null,
        pensamiento: pensamiento || null,
      }).eq("id", criaturaId);
    }
  });

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={16} className="animate-spin" style={{ color: muted }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Advertencia si no hay criatura */}
      {!criaturaId && (
        <Banner emphasis="warn">
          <AlertCircle size={12} className="shrink-0" />
          Sin criatura enlazada — biología y pensamiento no se pueden editar hasta enlazar.
        </Banner>
      )}

      <Divider label="Numeración Godot" />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <FL label="Número global" />
          <Inp type="number" value={numGlobal} onChange={e => setNumGlobal(e.target.value)}
            placeholder="001" />
        </label>
        <label className="flex flex-col gap-1">
          <FL label="Número de origen (linaje)" />
          <Inp type="number" value={numOrigen} onChange={e => setNumOrigen(e.target.value)}
            placeholder="01" />
        </label>
      </div>

      <Divider label="GarumiBrain — datos para el motor" />
      <label className="flex flex-col gap-1">
        <FL label="Biología" />
        <TA value={biologia} onChange={e => setBiologia(e.target.value)} rows={4}
          placeholder="Estructura biológica, anatomía funcional para el motor…"
          disabled={!criaturaId} />
      </label>
      <label className="flex flex-col gap-1">
        <FL label="Pensamiento / cognición" />
        <TA value={pensamiento} onChange={e => setPensamiento(e.target.value)} rows={4}
          placeholder="Modelo cognitivo, toma de decisiones, instintos…"
          disabled={!criaturaId} />
      </label>

      <Divider label="Checklist Godot" />
      <div className="flex flex-col gap-1.5 text-xs" style={{ color: muted }}>
        {[
          { label: "Criatura enlazada", ok: !!criaturaId },
          { label: "ia_config definida", ok: false },
          { label: "Elemento primario asignado", ok: false },
          { label: "Stats de combate registradas", ok: false },
          { label: "Estado documental: canon", ok: false },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: item.ok
                  ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                  : "color-mix(in srgb, var(--primary) 6%, transparent)",
                border: `1px solid color-mix(in srgb, var(--primary) ${item.ok ? "35" : "12"}%, transparent)`,
              }}>
              {item.ok && <Check size={9} style={{ color: "var(--primary)" }} />}
            </div>
            <span style={{ color: item.ok ? "var(--primary)" : muted }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <SaveBtn saving={saving} saved={saved} onClick={save} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel completo de un Garumi
// ─────────────────────────────────────────────────────────────────────────────

type GarumiTab = "base" | "stats" | "elementos" | "dones" | "manifestaciones" | "rasgos" | "evoluciones" | "criatura" | "motor";

function GarumiPanel({
  garumi,
  originales,
  arquetipos,
  elementos,
  donesCatalogo,
  garumis,
  onClose,
  onSaved,
}: {
  garumi: any;
  originales: any[];
  arquetipos: any[];
  elementos: any[];
  donesCatalogo: any[];
  garumis: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<GarumiTab>("base");
  const { saving, saved, run } = useSave();

  // Pre-carga paralela: todos los datos del garumi en una sola explosión al abrir el panel
  const [preloaded, setPreloaded] = useState<Record<string, any>>({});
  const [preloading, setPreloading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPreloading(true);
    const queries: Promise<any>[] = [
      supabase.from("garumi_estadisticas_combate").select("*").eq("garumi_id", garumi.id).maybeSingle().then(r => r.data),
      supabase.from("garumi_elemento_asignaciones").select("id, elemento_id, rol, estado_documentacion, garumi_elementos(nombre, codigo)").eq("garumi_id", garumi.id).order("created_at").then(r => r.data ?? []),
      supabase.from("garumi_dones_habilidades_asignaciones").select("id, capacidad_id, origen, es_innata, orden, estado_documentacion, garumi_dones_habilidades_catalogo(nombre, clase, categoria)").eq("garumi_id", garumi.id).order("orden").then(r => r.data ?? []),
      supabase.from("garumi_manifestaciones").select("id, codigo, nombre, tipo_manifestacion, orden, es_manifestacion_base, estado_documentacion, coste_eterium, limite_uso").eq("garumi_id", garumi.id).order("orden").then(r => r.data ?? []),
      supabase.from("garumi_rasgos").select("id, nombre_rasgo, tipo_rasgo, descripcion").eq("garumi_id", garumi.id).order("created_at").then(r => r.data ?? []),
      supabase.from("garumi_evoluciones").select("id, especie_origen_id, especie_destino_id, tipo_relacion, descripcion_cambio, origen:garumis!garumi_evoluciones_especie_origen_id_fkey(nombre), destino:garumis!garumi_evoluciones_especie_destino_id_fkey(nombre)").or(`especie_origen_id.eq.${garumi.id},especie_destino_id.eq.${garumi.id}`).then(r => r.data ?? []),
      garumi.criatura_id
        ? supabase.from("criaturas").select("id, nombre, comportamiento, dialogo, ia_config, stats_dnd, biologia, pensamiento, estado_documentacion").eq("id", garumi.criatura_id).maybeSingle().then(r => r.data)
        : Promise.resolve(null),
    ];
    Promise.all(queries).then(([stats, elems, dones, manes, rasgos, evols, criatura]) => {
      if (!cancelled) {
        setPreloaded({ stats, elems, dones, manes, rasgos, evols, criatura });
        setPreloading(false);
      }
    });
    return () => { cancelled = true; };
  }, [garumi.id, garumi.criatura_id]);

  // campos base
  const [nombre,    setNombre]    = useState(garumi.nombre    ?? "");
  const [concepto,  setConcepto]  = useState(garumi.concepto  ?? "");
  const [desc,      setDesc]      = useState(garumi.descripcion ?? "");
  const [mrlLinaje, setMrlLinaje] = useState(garumi.manifestacion_rasgo_linaje ?? "");
  const [estEvo,    setEstEvo]    = useState(garumi.estado_evolutivo ?? "inicial");
  const [estDoc,    setEstDoc]    = useState(garumi.estado_documentacion ?? "borrador");
  const [catGarumi, setCatGarumi] = useState(garumi.categoria_garumi ?? "normal");
  const [originalId,setOriginalId]= useState(garumi.original_id ?? "");
  const [notas,     setNotas]     = useState(garumi.notas_internas ?? "");

  const saveBase = () => run(async () => {
    await supabase.from("garumis").update({
      nombre, concepto: concepto || null, descripcion: desc || null,
      manifestacion_rasgo_linaje: mrlLinaje || null,
      estado_evolutivo: estEvo, estado_documentacion: estDoc,
      categoria_garumi: catGarumi, original_id: originalId || null,
      notas_internas: notas || null,
    }).eq("id", garumi.id);
    onSaved();
  });

  const TABS: { key: GarumiTab; label: string; icon?: React.ReactNode }[] = [
    { key: "base",            label: "Identidad",      icon: <Leaf size={10} /> },
    { key: "stats",           label: "Stats",          icon: <Shield size={10} /> },
    { key: "elementos",       label: "Elementos",      icon: <Zap size={10} /> },
    { key: "dones",           label: "Dones",          icon: <Star size={10} /> },
    { key: "manifestaciones", label: "Manifest.",      icon: <Layers size={10} /> },
    { key: "rasgos",          label: "Rasgos",         icon: <Leaf size={10} /> },
    { key: "evoluciones",     label: "Evoluciones",    icon: <GitMerge size={10} /> },
    { key: "criatura",        label: "Criatura / IA",  icon: <Brain size={10} /> },
    { key: "motor",           label: "Motor",          icon: <Cpu size={10} /> },
  ];

  return (
    <PanelModal
      abierto
      onCerrar={onClose}
      titulo={
        <span className="flex items-center gap-2">
          <span className="text-xs font-mono opacity-50">#{garumi.numero_global}</span>
          {nombre}
          <Bdg text={estEvo}  emphasis={evoEmphasis(estEvo)} />
          <Bdg text={estDoc}  emphasis={estadoEmphasis(estDoc)} />
          {!garumi.criatura_id && <Bdg text="sin criatura" emphasis="warn" />}
        </span>
      }
      icono={<Dna size={12} />}
      accionesDerecha={
        preloading
          ? <Loader2 size={12} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
          : tab === "base"
            ? <SaveBtn saving={saving} saved={saved} disabled={!nombre.trim()} onClick={saveBase} />
            : undefined
      }
    >
      {/* Sub-tabs */}
      <div className="shrink-0 flex gap-0.5 flex-wrap mb-3 p-1 rounded-xl self-start"
        style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t.key ? "var(--primary)" : "transparent",
              color: tab === t.key ? "var(--btn-text,#fff)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* TAB: Identidad */}
      {tab === "base" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex flex-col gap-1 flex-1">
              <FL label="Nombre" />
              <Inp value={nombre} onChange={e => setNombre(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 w-20">
              <FL label="Nº" />
              <Inp value={garumi.numero_global} readOnly
                style={{ ...inputStyle, opacity: 0.5 }} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <FL label="Concepto" />
            <Inp value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej. Caparazón nómada" />
          </label>
          <label className="flex flex-col gap-1">
            <FL label="Descripción" />
            <TA value={desc} onChange={e => setDesc(e.target.value)} rows={4} />
          </label>
          <label className="flex flex-col gap-1">
            <FL label="Manifestación del rasgo de linaje" />
            <TA value={mrlLinaje} onChange={e => setMrlLinaje(e.target.value)} rows={2} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <FL label="Etapa evolutiva" />
              <Sel value={estEvo} onChange={e => setEstEvo(e.target.value)}>
                <option value="inicial">Inicial</option>
                <option value="final">Final</option>
                <option value="especial">Especial</option>
              </Sel>
            </label>
            <label className="flex flex-col gap-1">
              <FL label="Estado documental" />
              <Sel value={estDoc} onChange={e => setEstDoc(e.target.value)}>
                <option value="borrador">Borrador</option>
                <option value="en_revision">En revisión</option>
                <option value="canon">Canon</option>
              </Sel>
            </label>
            <label className="flex flex-col gap-1">
              <FL label="Categoría" />
              <Sel value={catGarumi} onChange={e => setCatGarumi(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="legendario">Legendario</option>
                <option value="especial">Especial</option>
              </Sel>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <FL label="Original (linaje)" />
            <Sel value={originalId} onChange={e => setOriginalId(e.target.value)}>
              <option value="">— sin original —</option>
              {originales.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </Sel>
          </label>
          <Banner emphasis={garumi.criatura_id ? "hi" : "warn"}>
            {garumi.criatura_id
              ? <><Check size={11} className="shrink-0" /> Enlazado a criatura ejecutable</>
              : <><AlertCircle size={11} className="shrink-0" /> Sin criatura — no disponible en Godot</>}
          </Banner>
          <label className="flex flex-col gap-1">
            <FL label="Notas internas" />
            <TA value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
          </label>
        </div>
      )}

      {tab === "stats" && (
        <TabStats garumiId={garumi.id} arquetipos={arquetipos} initialData={preloaded.stats} />
      )}
      {tab === "elementos" && (
        <TabElementos garumiId={garumi.id} elementos={elementos} initialData={preloaded.elems} />
      )}
      {tab === "dones" && (
        <TabDones garumiId={garumi.id} donesCatalogo={donesCatalogo} initialData={preloaded.dones} />
      )}
      {tab === "manifestaciones" && (
        <TabManifestaciones garumiId={garumi.id} initialData={preloaded.manes} />
      )}
      {tab === "rasgos" && (
        <TabRasgos garumiId={garumi.id} initialData={preloaded.rasgos} />
      )}
      {tab === "evoluciones" && (
        <TabEvoluciones garumiId={garumi.id} garumis={garumis} initialData={preloaded.evols} />
      )}
      {tab === "criatura" && (
        <TabCriatura garumiId={garumi.id} criaturaId={garumi.criatura_id ?? null} initialData={preloaded.criatura} />
      )}
      {tab === "motor" && (
        <TabMotor garumiId={garumi.id} criaturaId={garumi.criatura_id ?? null} initialData={preloaded.criatura ? { garumi, criatura: preloaded.criatura } : { garumi }} />
      )}
    </PanelModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip de garumi en el grid
// ─────────────────────────────────────────────────────────────────────────────

function GarumiChip({ g, onClick }: { g: any; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-1.5 p-2.5 rounded-xl text-left transition-all"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        minWidth: 120,
        outline: "none",
      }}
    >
      {/* Número + nombre */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-mono shrink-0"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          #{g.numero_global}
        </span>
        <span className="text-xs font-bold truncate" style={{ color: "var(--primary)" }}>
          {g.nombre}
        </span>
      </div>
      {/* Concepto */}
      {g.concepto && (
        <span className="text-[10px] truncate leading-tight"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          {g.concepto}
        </span>
      )}
      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        <Bdg text={g.estado_evolutivo} emphasis={evoEmphasis(g.estado_evolutivo)} />
        <Bdg text={g.estado_documentacion} emphasis={estadoEmphasis(g.estado_documentacion)} />
        {!g.criatura_id && <Bdg text="sin criatura" emphasis="warn" />}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — GarumiGameSection
// ─────────────────────────────────────────────────────────────────────────────

export function GarumiGameSection() {
  const [garumis,      setGarumis]      = useState<any[]>([]);
  const [originales,   setOriginales]   = useState<any[]>([]);
  const [arquetipos,   setArquetipos]   = useState<any[]>([]);
  const [elementos,    setElementos]    = useState<any[]>([]);
  const [donesCatalogo,setDonesCatalogo]= useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sel,          setSel]          = useState<any>(null);
  const [q,            setQ]            = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [g, o, arq, el, dc] = await Promise.all([
      supabase
        .from("garumis")
        .select("id,nombre,concepto,descripcion,estado_evolutivo,estado_documentacion,categoria_garumi,numero_global,numero_origen,original_id,criatura_id,manifestacion_rasgo_linaje,notas_internas,imagen_referencia_url")
        .order("numero_global"),
      supabase.from("garumi_originales").select("id,nombre,rasgo_linaje").order("numero_global"),
      supabase.from("garumi_arquetipos_combate").select("id,nombre,codigo").order("nombre"),
      supabase.from("garumi_elementos").select("id,nombre,codigo").order("nombre"),
      supabase.from("garumi_dones_habilidades_catalogo").select("id,nombre,clase,categoria").order("nombre"),
    ]);
    setGarumis(g.data ?? []);
    setOriginales(o.data ?? []);
    setArquetipos(arq.data ?? []);
    setElementos(el.data ?? []);
    setDonesCatalogo(dc.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = q
    ? garumis.filter(g =>
        g.nombre.toLowerCase().includes(q.toLowerCase()) ||
        (g.concepto ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : garumis;

  // Agrupar por original
  const garumisPorOriginal = useMemo(() => {
    const groups: Record<string, any[]> = {};
    originales.forEach(o => { groups[o.id] = []; });
    groups["__sin_original__"] = [];
    filtered.forEach(g => {
      if (g.original_id && groups[g.original_id]) {
        groups[g.original_id].push(g);
      } else {
        groups["__sin_original__"].push(g);
      }
    });
    return groups;
  }, [filtered, originales]);

  // Stats de resumen
  const totalCanon   = garumis.filter(g => g.estado_documentacion === "canon").length;
  const totalSinCria = garumis.filter(g => !g.criatura_id).length;
  const muted = "color-mix(in srgb, var(--primary) 35%, transparent)";

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto gap-4">

      {/* ── Resumen rápido ── */}
      <div className="flex flex-wrap gap-3 shrink-0">
        {[
          { label: "Total Garumis", value: garumis.length,              emphasis: "mid"  as const },
          { label: "Canon",         value: totalCanon,                   emphasis: "hi"   as const },
          { label: "Borradores",    value: garumis.length - totalCanon,  emphasis: "lo"   as const },
          { label: "Sin criatura",  value: totalSinCria,                 emphasis: totalSinCria > 0 ? "warn" as const : "lo" as const },
        ].map(s => (
          <div key={s.label}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}>
            <span style={{ color: muted }}>{s.label}</span>
            <Bdg text={String(s.value)} emphasis={s.emphasis} />
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}>
          <Search size={12} style={{ color: muted }} />
          <input className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--primary)" }}
            placeholder="Buscar garumi por nombre o concepto…"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {/* ── Grid por Original ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: muted }} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {originales.map(orig => {
            const miembros = garumisPorOriginal[orig.id] ?? [];
            if (miembros.length === 0 && q) return null;
            return (
              <div key={orig.id} className="flex flex-col gap-3">
                {/* Header del Original */}
                <div className="flex items-center gap-2 px-1">
                  <Dna size={12} style={{ color: muted, flexShrink: 0 }} />
                  <button
                    type="button"
                    className="text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
                    style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
                  >
                    {orig.nombre}
                  </button>
                  {orig.rasgo_linaje && (
                    <span className="text-[10px] font-medium"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      · {orig.rasgo_linaje}
                    </span>
                  )}
                  <div className="flex-1 h-px"
                    style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  <span className="text-[10px] font-bold"
                    style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                    {miembros.length}
                  </span>
                </div>

                {/* Chips de garumis */}
                {miembros.length === 0 ? (
                  <p className="text-[10px] px-1" style={{ color: muted }}>Sin garumis</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {miembros.map((g: any) => (
                      <GarumiChip key={g.id} g={g} onClick={() => setSel(g)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sin original */}
          {(garumisPorOriginal["__sin_original__"] ?? []).length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-black uppercase tracking-[0.15em]"
                  style={{ color: muted }}>Sin original</span>
                <div className="flex-1 h-px"
                  style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(garumisPorOriginal["__sin_original__"] ?? []).map((g: any) => (
                  <GarumiChip key={g.id} g={g} onClick={() => setSel(g)} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-center py-8 text-xs" style={{ color: muted }}>
              Sin resultados
            </p>
          )}
        </div>
      )}

      {/* ── Panel de edición ── */}
      {sel && (
        <GarumiPanel
          garumi={sel}
          originales={originales}
          arquetipos={arquetipos}
          elementos={elementos}
          donesCatalogo={donesCatalogo}
          garumis={garumis}
          onClose={() => setSel(null)}
          onSaved={() => {
            load();
            // Actualizar el garumi seleccionado con los datos frescos
            supabase
              .from("garumis")
              .select("*")
              .eq("id", sel.id)
              .single()
              .then(({ data }) => { if (data) setSel(data); });
          }}
        />
      )}
    </div>
  );
}
