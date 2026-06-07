"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Gem, Save, Trash2, Loader2, MapPin, Globe, Camera, X, ChevronDown, Pencil, Search } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./components/types";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import SimpleImagePicker from "@/components/paginas/myself/garlia/editorCapitulos/snippets//forms/SimpleImagePicker";


// ─── Tipo local ───────────────────────────────────────────────────────────────
export type Mineral = {
  id:           string;
  nombre:       string;
  imagen_url?:  string | null;
  categoria?:   string | null;
  descripcion?: string | null;
  reino_ids?:   string[];
};


// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}


// ─── Hook: ciudades donde se encuentra el mineral (mineral_ciudades) ──────────
type CiudadMin = { id: string; nombre: string };
type MineralCiudadRow = { rowId: string; ciudadId: string; ciudadNombre: string };

function useCiudadesMineral(mineralId: string) {
  const [rows, setRows] = useState<MineralCiudadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mineral_ciudades")
      .select("id, ciudad_id, ciudades!ciudad_id(nombre)")
      .eq("mineral_id", mineralId);

    setRows(
      (data ?? []).map((r: any) => ({
        rowId:        r.id,
        ciudadId:     r.ciudad_id,
        ciudadNombre: (Array.isArray(r.ciudades) ? r.ciudades[0]?.nombre : r.ciudades?.nombre) ?? "—",
      }))
    );
    setLoading(false);
  }, [mineralId]);

  useEffect(() => { load(); }, [load]);

  const add = async (l: CiudadMin) => {
    if (rows.some(r => r.ciudadId === l.id)) return;
    const { data, error } = await supabase
      .from("mineral_ciudades")
      .insert([{ mineral_id: mineralId, ciudad_id: l.id }])
      .select().single();
    if (!error && data) {
      setRows(prev => [...prev, { rowId: data.id, ciudadId: l.id, ciudadNombre: l.nombre }]);
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("mineral_ciudades").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}


// ─── Tipos comunes ────────────────────────────────────────────────────────────
type ReinoMin = { id: string; nombre: string };
type LugarMin = { id: string; nombre: string; reino_id?: string | null };

// ─── Hook: lugares del mineral (mineral_lugares) ──────────────────────────────
type MineralLugarRow = { rowId: string; lugarId: string };

function useLugaresMineral(mineralId: string) {
  const [rows, setRows] = useState<MineralLugarRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mineral_lugares")
      .select("id, lugar_id")
      .eq("mineral_id", mineralId);
    setRows((data ?? []).map((r: any) => ({ rowId: r.id, lugarId: r.lugar_id })));
    setLoading(false);
  }, [mineralId]);

  useEffect(() => { load(); }, [load]);

  const add = async (lugarId: string) => {
    if (rows.some(r => r.lugarId === lugarId)) return;
    const { data, error } = await supabase
      .from("mineral_lugares")
      .insert([{ mineral_id: mineralId, lugar_id: lugarId }])
      .select().single();
    if (!error && data) setRows(prev => [...prev, { rowId: data.id, lugarId }]);
  };

  const remove = async (rowId: string) => {
    await supabase.from("mineral_lugares").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Panel Territorio: reinos + lugares sin reino ─────────────────────────────
function PanelTerritorio({
  value, onChange, mineralId, onNavigateReino, onNavigateLugar,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  mineralId: string;
  onNavigateReino?: (id: string) => void;
  onNavigateLugar?: (id: string) => void;
}) {
  const [allReinos, setAllReinos] = useState<ReinoMin[]>([]);
  const [allLugares, setAllLugares] = useState<LugarMin[]>([]);
  const [loadingReinos, setLoadingReinos] = useState(true);
  const { rows: lugarRows, loading: loadingLugares, add: addLugar, remove: removeLugar } = useLugaresMineral(mineralId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("reinos").select("id, nombre").order("nombre")
      .then(({ data }) => { setAllReinos(data ?? []); setLoadingReinos(false); });
    supabase.from("lugares").select("id, nombre, reino_id").order("nombre")
      .then(({ data }) => setAllLugares(data ?? []));
  }, []);

  const lugaresSinReino = allLugares.filter(l => !l.reino_id);

  const handleToggle = async (id: string, add: boolean) => {
    setSaving(true);
    if (allReinos.some(r => r.id === id)) {
      onChange(add ? [...value, id] : value.filter(x => x !== id));
    } else {
      if (add) await addLugar(id);
      else { const row = lugarRows.find(r => r.lugarId === id); if (row) await removeLugar(row.rowId); }
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      label="Territorio"
      icon={<Globe size={9} />}
      fallbackIcon={<Globe size={9} />}
      emptyLabel="Sin territorio asignado"
      allEntities={[
        ...allReinos.map(r => ({ id: r.id, nombre: r.nombre })),
        ...lugaresSinReino.map(l => ({ id: l.id, nombre: l.nombre, group: "lugares-libres" })),
      ]}
      groups={lugaresSinReino.length > 0 ? [{ key: "lugares-libres", label: "Lugares libres", icon: <MapPin size={7} /> }] : []}
      selectedIds={[...value, ...lugarRows.map(r => r.lugarId)]}
      loading={loadingReinos || loadingLugares}
      saving={saving}
      onToggle={handleToggle}
      onEntityClick={id => {
        if (allReinos.some(r => r.id === id)) onNavigateReino?.(id);
        else onNavigateLugar?.(id);
      }}
    />
  );
}

// ─── Panel Ciudades: ciudades + lugares con reino ─────────────────────────────
function PanelCiudadesConLugares({
  reinosSeleccionados, mineralId, onNavigateCiudad, onNavigateLugar,
}: {
  reinosSeleccionados: string[];
  mineralId: string;
  onNavigateCiudad?: (id: string) => void;
  onNavigateLugar?: (id: string) => void;
}) {
  const { rows: ciudadRows, loading: loadingCiudades, add: addCiudad, remove: removeCiudad } = useCiudadesMineral(mineralId);
  const { rows: lugarRows, loading: loadingLugares, add: addLugar, remove: removeLugar } = useLugaresMineral(mineralId);
  const [allCiudades, setAllCiudades] = useState<CiudadMin[]>([]);
  const [allLugares, setAllLugares] = useState<LugarMin[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ciudades").select("id, nombre, reino_id").order("nombre")
      .then(({ data }) => setAllCiudades(data ?? []));
    supabase.from("lugares").select("id, nombre, reino_id").order("nombre")
      .then(({ data }) => setAllLugares(data ?? []));
  }, []);

  const ciudadesConReino = allCiudades.filter(c =>
    c.reino_id && (reinosSeleccionados.length === 0 || reinosSeleccionados.includes(c.reino_id))
  );
  const lugaresConReino = allLugares.filter(l =>
    l.reino_id && (reinosSeleccionados.length === 0 || reinosSeleccionados.includes(l.reino_id!))
  );

  const handleToggle = async (id: string, add: boolean) => {
    setSaving(true);
    if (allCiudades.some(c => c.id === id)) {
      if (add) { const c = allCiudades.find(x => x.id === id); if (c) await addCiudad(c); }
      else { const row = ciudadRows.find(r => r.ciudadId === id); if (row) await removeCiudad(row.rowId); }
    } else {
      if (add) await addLugar(id);
      else { const row = lugarRows.find(r => r.lugarId === id); if (row) await removeLugar(row.rowId); }
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      label={reinosSeleccionados.length > 0 ? `Ciudades (${reinosSeleccionados.length})` : "Ciudades"}
      icon={<MapPin size={9} />}
      fallbackIcon={<MapPin size={9} />}
      emptyLabel={reinosSeleccionados.length > 0 ? "Sin ciudades en estos reinos" : "Sin ciudades / lugares"}
      allEntities={[
        ...ciudadesConReino.map(c => ({ id: c.id, nombre: c.nombre })),
        ...lugaresConReino.map(l => ({ id: l.id, nombre: l.nombre, group: "lugares-reino" })),
      ]}
      groups={lugaresConReino.length > 0 ? [{ key: "lugares-reino", label: "Lugares", icon: <MapPin size={7} /> }] : []}
      selectedIds={[...ciudadRows.map(r => r.ciudadId), ...lugarRows.map(r => r.lugarId)]}
      loading={loadingCiudades || loadingLugares}
      saving={saving}
      onToggle={handleToggle}
      onEntityClick={id => {
        if (allCiudades.some(c => c.id === id)) onNavigateCiudad?.(id);
        else onNavigateLugar?.(id);
      }}
    />
  );
}

// ─── Botón mobile para cambiar imagen del mineral ─────────────────────────────
function PickerImagenMineralBtn({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Camera size={11} /> Imagen del mineral</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/20 text-primary/50 hover:text-primary hover:bg-bg-main transition-all shadow-md"
        title="Cambiar imagen"
      >
        <Camera size={13} />
      </button>
    </>
  );
}

// ─── SelectorCategoriaGrupo ───────────────────────────────────────────────────
// Carga grupos_mundo de tipo "minerales" con subtipo === "Tipo".
// - Click en el nombre del grupo seleccionado  → navega al grupo (onSelectGrupo)
// - Click en el lápiz                          → abre dropdown para cambiar
// - El valor guardado en form.categoria        → nombre del grupo

type GrupoTipoMin = { id: string; nombre: string };

function useTiposDeGrupoMinerales() {
  const [grupos, setGrupos] = useState<GrupoTipoMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("grupos_mundo")
      .select("id, nombre")
      .eq("tipo", "minerales")
      .eq("subtipo", "Tipo")
      .order("nombre")
      .then(({ data }) => {
        setGrupos((data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre })));
        setLoading(false);
      });
  }, []);

  return { grupos, loading };
}

function SelectorCategoriaGrupo({
  value,
  onChange,
  onSelectGrupo,
}: {
  value: string | null;
  onChange: (nombre: string | null) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const { grupos, loading } = useTiposDeGrupoMinerales();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const grupoActual = grupos.find(g => g.nombre === value) ?? null;

  const disponibles = grupos.filter(
    g => g.nombre !== value && g.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const border = "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";
  const borderFocus = "1px solid color-mix(in srgb, var(--primary) 35%, transparent)";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="space-y-1" ref={containerRef}>
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <Gem size={9} style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }} />
        <span
          className="text-[8px] font-black uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}
        >
          Categoría
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)]"
          style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border }}>
          <Loader2 size={10} className="animate-spin text-primary/30" />
          <span className="text-[10px] text-primary/30">Cargando…</span>
        </div>
      ) : grupoActual ? (
        /* ── Valor asignado: nombre clickeable + lápiz ─────────────────────── */
        <div
          className="w-full flex items-center rounded-[var(--radius-btn)] overflow-hidden transition-all"
          style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border }}
        >
          {/* Click en nombre → navegar al grupo */}
          <button
            type="button"
            onClick={() => onSelectGrupo?.(grupoActual.id)}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase truncate transition-all hover:bg-primary/5 min-w-0"
            style={{ color: "var(--primary)" }}
            title="Ir al grupo"
          >
            <span className="truncate">{grupoActual.nombre}</span>
          </button>
          {/* Lápiz → abrir dropdown */}
          <button
            type="button"
            onClick={() => { setOpen(o => !o); setSearch(""); }}
            className="shrink-0 flex items-center justify-center px-2.5 py-2 transition-all hover:bg-primary/10"
            style={{
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            title="Cambiar categoría"
          >
            <Pencil size={10} />
          </button>
        </div>
      ) : (
        /* ── Sin valor: trigger vacío ───────────────────────────────────────── */
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: open ? borderFocus : border,
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          <span className="font-black uppercase text-[10px] tracking-wide">Sin categoría</span>
          <ChevronDown
            size={12}
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            style={{ opacity: 0.5 }}
          />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            border,
            background: "var(--bg-main)",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Buscador */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Escape" && (setOpen(false), setSearch(""))}
              placeholder="Buscar categoría…"
              className="flex-1 bg-transparent outline-none text-[11px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="opacity-30 hover:opacity-70 transition-opacity">
                <X size={10} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-48 overflow-y-auto">
            {/* Opción "quitar" si hay valor */}
            {grupoActual && (
              <button
                type="button"
                onMouseDown={() => { onChange(null); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <X size={9} className="opacity-50" />
                </span>
                Sin categoría
              </button>
            )}

            {grupos.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                No hay grupos de tipo «Tipo» creados
              </p>
            ) : disponibles.length === 0 && !grupoActual ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                {search ? `Sin resultados para "${search}"` : "Todas las categorías ya asignadas"}
              </p>
            ) : disponibles.length === 0 && grupoActual ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                {search ? `Sin resultados para "${search}"` : "No hay otras categorías"}
              </p>
            ) : (
              disponibles.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onMouseDown={() => { onChange(g.nombre); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/6"
                  style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                >
                  <span className="truncate">{g.nombre}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditorMineral ────────────────────────────────────────────────────────────

export function EditorMineral({
  mineral, onSaved, onDeleted, entities = [], onNavigateCiudad, onNavigateReino, onNavigateLugar, onSelectGrupo,
}: {
  mineral: Mineral;
  onSaved: (m: Mineral) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
  onNavigateLugar?: (id: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [form,   setForm]   = useState<Mineral>(mineral);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  useEffect(() => { setForm(mineral); setStatus("idle"); }, [mineral.id]);

  const field = (k: keyof Mineral) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("minerales").update({
        nombre:      form.nombre,
        imagen_url:  form.imagen_url || null,
        descripcion: form.descripcion,
        categoria:   form.categoria,
        reino_ids:   form.reino_ids ?? [],
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("minerales", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("minerales").delete().eq("id", form.id);
    void dexieDel("minerales", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* ── Fixed header ────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.imagen_url
            ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <Gem size={16} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del mineral"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        />

        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          <button onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
            <Trash2 size={10} />
          </button>
          <button onClick={save} disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-5">

            {/* Columna izquierda: imagen */}
            <div className="w-full sm:w-96 sm:shrink-0">
              {/* Mobile: imagen con botón flotante */}
              <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                {form.imagen_url
                  ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Gem size={48} className="text-primary/15" /></div>
                }
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenMineralBtn
                    value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                  />
                </div>
              </div>
              {/* Desktop: selector normal */}
              <div className="hidden sm:block w-full">
                <SelectorImagen
                  label="Imagen"
                  value={form.imagen_url ?? ""}
                  onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                  aspect="square"
                  placeholder={<Gem size={20} className="opacity-20" />}
                />
              </div>
            </div>

            {/* Columna derecha: categoría + reinos + ciudades + descripción */}
            <div className="flex-1 min-w-0 space-y-4">

              <SelectorCategoriaGrupo
                value={form.categoria ?? null}
                onChange={nombre => setForm(f => ({ ...f, categoria: nombre ?? "" }))}
                onSelectGrupo={onSelectGrupo}
              />

              {/* Reinos + Ciudades en dos columnas */}
              <div className="flex flex-col sm:flex-row gap-4">

                {/* Territorio */}
                <div className="flex-1 min-w-0">
                  <PanelTerritorio
                    value={form.reino_ids ?? []}
                    onChange={ids => setForm(f => ({ ...f, reino_ids: ids }))}
                    mineralId={form.id}
                    onNavigateReino={onNavigateReino}
                    onNavigateLugar={onNavigateLugar}
                  />
                </div>

                {/* Ciudades */}
                <div className="flex-1 min-w-0">
                  <PanelCiudadesConLugares
                    reinosSeleccionados={form.reino_ids ?? []}
                    mineralId={form.id}
                    onNavigateCiudad={onNavigateCiudad}
                    onNavigateLugar={onNavigateLugar}
                  />
                </div>

              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                <MarkdownEditor
                  value={form.descripcion ?? ""}
                  onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                  rows={10}
                  placeholder="Qué es, propiedades, usos, dónde se encuentra…"
                  toolbar
                  defaultMode="edit"
                  onSnippetAction={onSnippetAction}
                  entities={entities}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
