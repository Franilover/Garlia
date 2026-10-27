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

function Bdg({ text, color }: { text: string; color?: "green" | "yellow" | "red" | "blue" | "default" }) {
  const bg: Record<string, string> = {
    green:  "color-mix(in srgb, #22c55e 20%, transparent)",
    yellow: "color-mix(in srgb, #f59e0b 20%, transparent)",
    red:    "color-mix(in srgb, #ef4444 20%, transparent)",
    blue:   "color-mix(in srgb, #3b82f6 20%, transparent)",
    default:"color-mix(in srgb, var(--primary) 10%, transparent)",
  };
  const fg: Record<string, string> = {
    green:  "color-mix(in srgb, #16a34a 80%, var(--primary))",
    yellow: "color-mix(in srgb, #b45309 80%, var(--primary))",
    red:    "color-mix(in srgb, #dc2626 80%, var(--primary))",
    blue:   "color-mix(in srgb, #2563eb 80%, var(--primary))",
    default:"color-mix(in srgb, var(--primary) 55%, transparent)",
  };
  const k = color ?? "default";
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: bg[k], color: fg[k] }}>
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

function estadoColor(e: string): "green" | "yellow" | "blue" | "default" {
  if (e === "canon")      return "green";
  if (e === "borrador")   return "yellow";
  if (e === "en_revision")return "blue";
  return "default";
}

function evoBadgeColor(e: string): "blue" | "green" | "default" {
  if (e === "inicial") return "blue";
  if (e === "final")   return "green";
  return "default";
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

function TabStats({ garumiId, arquetipos }: { garumiId: string; arquetipos: any[] }) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const { saving, saved, run } = useSave();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("garumi_estadisticas_combate")
      .select("*")
      .eq("garumi_id", garumiId)
      .maybeSingle();
    if (data) {
      setStats({
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
    } else {
      setStats({ ...EMPTY_STATS });
    }
    setLoading(false);
  }, [garumiId]);

  useEffect(() => { load(); }, [load]);

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
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: "color-mix(in srgb, #f59e0b 8%, transparent)", border: "1px solid color-mix(in srgb, #f59e0b 20%, transparent)", color: "color-mix(in srgb, #b45309 80%, var(--primary))" }}>
          <AlertCircle size={12} />
          Sin estadísticas registradas — se crearán al guardar.
        </div>
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

function TabElementos({ garumiId, elementos }: { garumiId: string; elementos: any[] }) {
  const [asigs, setAsigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, [load]);

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
            <Bdg text={a.rol} color={a.rol === "primario" ? "green" : a.rol === "secundario" ? "blue" : "default"} />
            <Bdg text={a.estado_documentacion} color={estadoColor(a.estado_documentacion)} />
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

function TabDones({ garumiId, donesCatalogo }: { garumiId: string; donesCatalogo: any[] }) {
  const [asigs,   setAsigs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, [load]);

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
            <Bdg text={a.origen} color="default" />
            <Bdg text={a.estado_documentacion} color={estadoColor(a.estado_documentacion)} />
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

function TabManifestaciones({ garumiId }: { garumiId: string }) {
  const [manes,   setManes]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const muted  = "color-mix(in srgb, var(--primary) 35%, transparent)";
  const border = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";

  useEffect(() => {
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
            {m.es_manifestacion_base && <Bdg text="base" color="blue" />}
            <Bdg text={m.tipo_manifestacion} color="default" />
            <Bdg text={m.estado_documentacion} color={estadoColor(m.estado_documentacion)} />
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
// Panel completo de un Garumi
// ─────────────────────────────────────────────────────────────────────────────

type GarumiTab = "base" | "stats" | "elementos" | "dones" | "manifestaciones";

function GarumiPanel({
  garumi,
  originales,
  arquetipos,
  elementos,
  donesCatalogo,
  onClose,
  onSaved,
}: {
  garumi: any;
  originales: any[];
  arquetipos: any[];
  elementos: any[];
  donesCatalogo: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<GarumiTab>("base");
  const { saving, saved, run } = useSave();

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

  const TABS: { key: GarumiTab; label: string }[] = [
    { key: "base",           label: "Identidad" },
    { key: "stats",          label: "Stats" },
    { key: "elementos",      label: "Elementos" },
    { key: "dones",          label: "Dones" },
    { key: "manifestaciones",label: "Manifestaciones" },
  ];

  return (
    <PanelModal
      abierto
      onCerrar={onClose}
      titulo={
        <span className="flex items-center gap-2">
          <span className="text-xs font-mono opacity-50">#{garumi.numero_global}</span>
          {nombre}
          <Bdg text={estEvo}  color={evoBadgeColor(estEvo)} />
          <Bdg text={estDoc}  color={estadoColor(estDoc)} />
          {!garumi.criatura_id && <Bdg text="sin criatura" color="red" />}
        </span>
      }
      icono={<Dna size={12} />}
      accionesDerecha={
        tab === "base"
          ? <SaveBtn saving={saving} saved={saved} disabled={!nombre.trim()} onClick={saveBase} />
          : undefined
      }
    >
      {/* Sub-tabs */}
      <div className="shrink-0 flex gap-0.5 flex-wrap mb-3 p-1 rounded-xl self-start"
        style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t.key ? "var(--primary)" : "transparent",
              color: tab === t.key ? "var(--btn-text,#fff)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
            }}>
            {t.label}
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: garumi.criatura_id
                ? "color-mix(in srgb, #22c55e 8%, transparent)"
                : "color-mix(in srgb, #ef4444 8%, transparent)",
              border: `1px solid ${garumi.criatura_id
                ? "color-mix(in srgb, #22c55e 20%, transparent)"
                : "color-mix(in srgb, #ef4444 20%, transparent)"}`,
              color: garumi.criatura_id
                ? "color-mix(in srgb, #16a34a 80%, var(--primary))"
                : "color-mix(in srgb, #dc2626 80%, var(--primary))",
            }}>
            {garumi.criatura_id
              ? <><Check size={11} /> Enlazado a criatura ejecutable</>
              : <><AlertCircle size={11} /> Sin criatura — no disponible en Godot</>}
          </div>
          <label className="flex flex-col gap-1">
            <FL label="Notas internas" />
            <TA value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
          </label>
        </div>
      )}

      {tab === "stats" && (
        <TabStats garumiId={garumi.id} arquetipos={arquetipos} />
      )}
      {tab === "elementos" && (
        <TabElementos garumiId={garumi.id} elementos={elementos} />
      )}
      {tab === "dones" && (
        <TabDones garumiId={garumi.id} donesCatalogo={donesCatalogo} />
      )}
      {tab === "manifestaciones" && (
        <TabManifestaciones garumiId={garumi.id} />
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
      className="group flex flex-col gap-1.5 p-2.5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        minWidth: 120,
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
        <Bdg text={g.estado_evolutivo} color={evoBadgeColor(g.estado_evolutivo)} />
        <Bdg text={g.estado_documentacion} color={estadoColor(g.estado_documentacion)} />
        {!g.criatura_id && <Bdg text="sin criatura" color="red" />}
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
          { label: "Total Garumis",    value: garumis.length,  color: "default" as const },
          { label: "Canon",            value: totalCanon,       color: "green"   as const },
          { label: "Borradores",       value: garumis.length - totalCanon, color: "yellow" as const },
          { label: "Sin criatura",     value: totalSinCria,     color: totalSinCria > 0 ? "red" as const : "default" as const },
        ].map(s => (
          <div key={s.label}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}>
            <span style={{ color: muted }}>{s.label}</span>
            <Bdg text={String(s.value)} color={s.color} />
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
