"use client";
import Image from "next/image";

import {
  Package,
  Save,
  Trash2,
  Bug,
  Loader2,
  Wrench,
  X,
  MapPin,
  Globe,
  Camera,
  ChevronDown,
  Pencil,
  Search,
  Leaf,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import {
  MarkdownEditor,
  WikiEntity,
} from "@/components/forms/Markdown/MarkdownEditor";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { dexiePut, dexieDelete } from "@/hooks/data/useOfflineSync";
import { supabase } from "@/lib/api/client/supabase";

import { type Item, type SaveStatus } from "../components/types";
import { SelectorImagen, SaveIndicator } from "../components/UIComponents";
import { useWikilink } from "../components/WikilinkContext";

// ─── Hook: qué criaturas crean este ítem (item_crafteres) ─────────────────────

type CrafterSource = {
  crafterId: string;
  criaturaId: string;
  criaturaName: string;
  criaturaImg?: string | null;
};

function useCrafterSources(itemId: string) {
  const [crafters, setCrafters] = useState<CrafterSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_crafteres")
      .select(`id, criatura_id, criaturas!criatura_id(nombre, imagen_url)`)
      .eq("item_id", itemId);

    setCrafters(
      (data ?? []).map((r: any) => ({
        crafterId: r.id,
        criaturaId: r.criatura_id,
        criaturaName:
          (Array.isArray(r.criaturas)
            ? r.criaturas[0]?.nombre
            : r.criaturas?.nombre) ?? "—",
        criaturaImg:
          (Array.isArray(r.criaturas)
            ? r.criaturas[0]?.imagen_url
            : r.criaturas?.imagen_url) ?? null,
      })),
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (criatura: {
    id: string;
    nombre: string;
    imagen_url?: string | null;
  }) => {
    if (crafters.some((c) => c.criaturaId === criatura.id)) return;
    const { data, error } = await supabase
      .from("item_crafteres")
      .insert([{ item_id: itemId, criatura_id: criatura.id }])
      .select()
      .single();
    if (!error && data) {
      setCrafters((prev) => [
        ...prev,
        {
          crafterId: data.id,
          criaturaId: criatura.id,
          criaturaName: criatura.nombre,
          criaturaImg: criatura.imagen_url ?? null,
        },
      ]);
      // Marcar el ítem como Artificial automáticamente
      await supabase
        .from("items")
        .update({ origen: "Artificial", sub_origen: null })
        .eq("id", itemId);
    }
  };

  const remove = async (crafterId: string) => {
    await supabase.from("item_crafteres").delete().eq("id", crafterId);
    setCrafters((prev) => prev.filter((c) => c.crafterId !== crafterId));
  };

  return { crafters, loading, add, remove };
}

// ─── Panel selector de criaturas creadoras (usa SeccionEntidad) ──────────────

function PanelCrafterSources({
  itemId,
  onSelectCriatura,
}: {
  itemId: string;
  onSelectCriatura?: (criaturaId: string) => void;
}) {
  const { crafters, loading, add, remove } = useCrafterSources(itemId);
  const [allCriaturas, setAllCriaturas] = useState<
    { id: string; nombre: string; imagen_url?: string | null }[]
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("criaturas")
      .select("id, nombre, imagen_url")
      .order("nombre")
      .then(({ data }) => setAllCriaturas(data ?? []));
  }, []);

  const handleToggle = async (id: string, addIt: boolean) => {
    setSaving(true);
    if (addIt) {
      const criatura = allCriaturas.find((c) => c.id === id);
      if (criatura) await add(criatura);
    } else {
      const crafter = crafters.find((c) => c.criaturaId === id);
      if (crafter) await remove(crafter.crafterId);
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      allEntities={allCriaturas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        imagen_url: c.imagen_url,
      }))}
      emptyLabel="Ninguna criatura asignada"
      fallbackIcon={<Bug size={9} />}
      icon={<Bug size={9} />}
      label="Criaturas"
      loading={loading}
      saving={saving}
      selectedIds={crafters.map((c) => c.criaturaId)}
      onEntityClick={onSelectCriatura}
      onToggle={handleToggle}
    />
  );
}

// ─── Tipos comunes ────────────────────────────────────────────────────────────
type ReinoMin = { id: string; nombre: string };

// ─── Panel Territorio: solo reinos ───────────────────────────────────────────

function PanelTerritorio({
  value,
  onChange,
  onNavigateReino,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [allReinos, setAllReinos] = useState<ReinoMin[]>([]);
  const [loadingReinos, setLoadingReinos] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("reinos")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => {
        setAllReinos(data ?? []);
        setLoadingReinos(false);
      });
  }, []);

  const handleToggle = async (id: string, add: boolean) => {
    setSaving(true);
    onChange(add ? [...value, id] : value.filter((x) => x !== id));
    setSaving(false);
  };

  return (
    <SeccionEntidad
      allEntities={allReinos.map((r) => ({ id: r.id, nombre: r.nombre }))}
      emptyLabel="Sin territorio asignado"
      fallbackIcon={<Globe size={9} />}
      groups={[]}
      icon={<Globe size={9} />}
      label="Territorio"
      loading={loadingReinos}
      saving={saving}
      selectedIds={value}
      onEntityClick={(id) => onNavigateReino?.(id)}
      onToggle={handleToggle}
    />
  );
}

// ─── Panel Ciudades ───────────────────────────────────────────────────────────

function PanelCiudades({
  reinosSeleccionados,
  itemId,
  onNavigateCiudad,
}: {
  reinosSeleccionados: string[];
  itemId: string;
  onNavigateCiudad?: (id: string) => void;
}) {
  const {
    rows: ciudadRows,
    loading: loadingCiudades,
    add: addCiudad,
    remove: removeCiudad,
  } = useCiudadesItem(itemId);
  const [allCiudades, setAllCiudades] = useState<CiudadMin[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("ciudades")
      .select("id, nombre, reino_id")
      .order("nombre")
      .then(({ data }) => setAllCiudades(data ?? []));
  }, []);

  const ciudadesConReino = allCiudades.filter(
    (c) =>
      c.reino_id &&
      (reinosSeleccionados.length === 0 ||
        reinosSeleccionados.includes(c.reino_id)),
  );

  const handleToggle = async (id: string, add: boolean) => {
    setSaving(true);
    if (add) {
      const c = allCiudades.find((x) => x.id === id);
      if (c) await addCiudad(c);
    } else {
      const row = ciudadRows.find((r) => r.ciudadId === id);
      if (row) await removeCiudad(row.rowId);
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      allEntities={ciudadesConReino.map((c) => ({
        id: c.id,
        nombre: c.nombre,
      }))}
      emptyLabel={
        reinosSeleccionados.length > 0
          ? "Sin ciudades en estos reinos"
          : "Sin ciudades"
      }
      fallbackIcon={<MapPin size={9} />}
      groups={[]}
      icon={<MapPin size={9} />}
      label={
        reinosSeleccionados.length > 0
          ? `Ciudades (${reinosSeleccionados.length})`
          : "Ciudades"
      }
      loading={loadingCiudades}
      saving={saving}
      selectedIds={ciudadRows.map((r) => r.ciudadId)}
      onEntityClick={(id) => onNavigateCiudad?.(id)}
      onToggle={handleToggle}
    />
  );
}

// ─── Hook: ciudades donde se encuentra el ítem (item_ciudades) ─────────────────

type CiudadMin = { id: string; nombre: string; reino_id?: string | null };
type ItemCiudadRow = { rowId: string; ciudadId: string; ciudadNombre: string };

function useCiudadesItem(itemId: string) {
  const [rows, setRows] = useState<ItemCiudadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_ciudades")
      .select("id, ciudad_id, ciudades!ciudad_id(nombre)")
      .eq("item_id", itemId);

    setRows(
      (data ?? []).map((r: any) => ({
        rowId: r.id,
        ciudadId: r.ciudad_id,
        ciudadNombre:
          (Array.isArray(r.ciudades)
            ? r.ciudades[0]?.nombre
            : r.ciudades?.nombre) ?? "—",
      })),
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (l: CiudadMin) => {
    if (rows.some((r) => r.ciudadId === l.id)) return;
    const { data, error } = await supabase
      .from("item_ciudades")
      .insert([{ item_id: itemId, ciudad_id: l.id }])
      .select()
      .single();
    if (!error && data) {
      setRows((prev) => [
        ...prev,
        { rowId: data.id, ciudadId: l.id, ciudadNombre: l.nombre },
      ]);
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("item_ciudades").delete().eq("id", rowId);
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Botón mobile para cambiar imagen del ítem ────────────────────────────────

function PickerImagenItemBtn({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <Camera size={11} /> Imagen del objeto
              </h3>
              <button
                className="text-primary/30 hover:text-primary transition-colors"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onClose={() => setOpen(false)}
              onSelect={(url) => {
                onChange(url);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/20 text-primary/50 hover:text-primary hover:bg-bg-main transition-all shadow-md"
        title="Cambiar imagen"
        onClick={() => setOpen(true)}
      >
        <Camera size={13} />
      </button>
    </>
  );
}

// ─── SelectorCategoriaGrupo ───────────────────────────────────────────────────
// Reemplaza al ComboSelector de "Categoría" en EditorItem.
// Carga grupos_mundo de tipo "items" con subtipo === "Tipo".
// - Click en el nombre del grupo seleccionado  → navega al grupo (onSelectGrupo)
// - Click en el lápiz                          → abre dropdown para cambiar
// - El valor guardado en form.categoria        → nombre del grupo (compatibilidad BD)

type GrupoTipoMin = { id: string; nombre: string };

function useTiposDeGrupoItems() {
  const [grupos, setGrupos] = useState<GrupoTipoMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("grupos_mundo")
      .select("id, nombre")
      .eq("tipo", "items")
      .eq("subtipo", "Tipo")
      .order("nombre")
      .then(({ data }) => {
        setGrupos(
          (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre })),
        );
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
  const { grupos, loading } = useTiposDeGrupoItems();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const grupoActual = grupos.find((g) => g.nombre === value) ?? null;

  const disponibles = grupos.filter(
    (g) =>
      g.nombre !== value &&
      g.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const border =
    "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";
  const borderFocus =
    "1px solid color-mix(in srgb, var(--primary) 35%, transparent)";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={containerRef} className="space-y-1">
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <Package
          size={9}
          style={{
            color: "color-mix(in srgb, var(--primary) 38%, transparent)",
          }}
        />
        <span
          className="text-[8px] font-black uppercase tracking-[0.25em]"
          style={{
            color: "color-mix(in srgb, var(--primary) 38%, transparent)",
          }}
        >
          Categoría
        </span>
      </div>

      {loading ? (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)]"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border,
          }}
        >
          <Loader2 className="animate-spin text-primary/30" size={10} />
          <span className="text-[10px] text-primary/30">Cargando…</span>
        </div>
      ) : grupoActual ? (
        /* ── Valor asignado: nombre clickeable + lápiz ─────────────────────── */
        <div
          className="w-full flex items-center rounded-[var(--radius-btn)] overflow-hidden transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border,
          }}
        >
          {/* Click en nombre → navegar al grupo */}
          <button
            className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase truncate transition-all hover:bg-primary/5 min-w-0"
            style={{ color: "var(--primary)" }}
            title="Ir al grupo"
            type="button"
            onClick={() => onSelectGrupo?.(grupoActual.id)}
          >
            <span className="truncate">{grupoActual.nombre}</span>
          </button>
          {/* Lápiz → abrir dropdown */}
          <button
            className="shrink-0 flex items-center justify-center px-2.5 py-2 transition-all hover:bg-primary/10"
            style={{
              borderLeft:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            title="Cambiar categoría"
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setSearch("");
            }}
          >
            <Pencil size={10} />
          </button>
        </div>
      ) : (
        /* ── Sin valor: trigger vacío ───────────────────────────────────────── */
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: open ? borderFocus : border,
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-black uppercase text-[10px] tracking-wide">
            Sin categoría
          </span>
          <ChevronDown
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            size={12}
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
            boxShadow:
              "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Buscador */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              borderBottom:
                "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <Search
              size={11}
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                flexShrink: 0,
              }}
            />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-[11px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
              placeholder="Buscar categoría…"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Escape" && (setOpen(false), setSearch(""))
              }
            />
            {search && (
              <button
                className="opacity-30 hover:opacity-70 transition-opacity"
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={10} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-48 overflow-y-auto">
            {/* Opción "quitar" si hay valor */}
            {grupoActual && (
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                style={{
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
                type="button"
                onMouseDown={() => {
                  onChange(null);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <X className="opacity-50" size={9} />
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
                {search
                  ? `Sin resultados para "${search}"`
                  : "Todas las categorías ya asignadas"}
              </p>
            ) : disponibles.length === 0 && grupoActual ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                {search
                  ? `Sin resultados para "${search}"`
                  : "No hay otras categorías"}
              </p>
            ) : (
              disponibles.map((g) => (
                <button
                  key={g.id}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/6"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 50%, transparent)",
                  }}
                  type="button"
                  onMouseDown={() => {
                    onChange(g.nombre);
                    setOpen(false);
                    setSearch("");
                  }}
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

// ─── EditorItem ───────────────────────────────────────────────────────────────

export function EditorItem({
  item,
  tabla = "items",
  onSaved,
  onDeleted,
  entities = [],
  onSelectCriatura,
  onNavigateCiudad,
  onNavigateReino,
  onSelectGrupo,
}: {
  item: Item;
  tabla?: string;
  onSaved: (i: Item) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectCriatura?: (criaturaId: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [form, setForm] = useState<Item>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  const field =
    (k: keyof Item) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const payload: any = {
        nombre: form.nombre,
        imagen_url: form.imagen_url || null,
        descripcion: form.descripcion,
        categoria: form.categoria,
        reino_ids: form.reino_ids ?? [],
      };
      // origen/sub_origen solo existen en la tabla items
      if (tabla === "items") {
        payload.origen = form.origen;
        payload.sub_origen =
          form.origen === "Natural" ? (form.sub_origen ?? null) : null;
      }
      const { error } = await supabase
        .from(tabla)
        .update(payload)
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut(tabla, form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const del = async () => {
    const ok = await confirm({
      message: `¿Eliminar "${form.nombre}"?`,
      danger: true,
    });
    if (!ok) return;
    await supabase.from(tabla).delete().eq("id", form.id);
    void dexieDelete(tabla, form.id);
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
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.imagen_url ? (
            <Image
              alt={form.nombre}
              className="w-full h-full object-cover"
              src={form.imagen_url}
            />
          ) : (
            <Package className="text-primary/25" size={16} />
          )}
        </div>

        <input
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre del objeto"
          value={form.nombre ?? ""}
          onChange={field("nombre")}
        />

        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            onClick={del}
          >
            <Trash2 size={10} />
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            disabled={status === "saving"}
            onClick={save}
          >
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
              {/* Mobile: imagen con botón flotante (igual que personaje) */}
              <div
                className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3"
                style={{ aspectRatio: "1 / 1" }}
              >
                {form.imagen_url ? (
                  <Image
                    alt={form.nombre}
                    className="w-full h-full object-cover"
                    src={form.imagen_url}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="text-primary/15" size={48} />
                  </div>
                )}
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenItemBtn
                    value={form.imagen_url ?? ""}
                    onChange={(url) =>
                      setForm((f) => ({ ...f, imagen_url: url }))
                    }
                  />
                </div>
              </div>
              {/* Desktop: selector normal */}
              <div className="hidden sm:block w-full">
                <SelectorImagen
                  aspect="square"
                  label="Imagen"
                  placeholder={<Package className="opacity-20" size={20} />}
                  value={form.imagen_url ?? ""}
                  onChange={(url) =>
                    setForm((f) => ({ ...f, imagen_url: url }))
                  }
                />
              </div>
            </div>

            {/* Columna derecha: categoría + origen + descripción */}
            <div className="flex-1 min-w-0 space-y-4">
              <SelectorCategoriaGrupo
                value={form.categoria ?? null}
                onChange={(nombre) =>
                  setForm((f) => ({ ...f, categoria: nombre ?? "" }))
                }
                onSelectGrupo={onSelectGrupo}
              />

              {/* Origen + Ciudades en dos columnas */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Columna Origen — solo para ítems */}
                {tabla === "items" && (
                  <div
                    className="flex-1 min-w-0 rounded-xl overflow-hidden"
                    style={{
                      border:
                        "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                  >
                    {/* Cabecera */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2"
                      style={{
                        borderBottom:
                          "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
                        background:
                          "color-mix(in srgb, var(--primary) 2%, transparent)",
                      }}
                    >
                      <Package
                        size={9}
                        style={{
                          color:
                            "color-mix(in srgb, var(--primary) 38%, transparent)",
                        }}
                      />
                      <span
                        className="text-[8px] font-black uppercase tracking-widest"
                        style={{
                          color:
                            "color-mix(in srgb, var(--primary) 38%, transparent)",
                        }}
                      >
                        Origen
                      </span>
                    </div>

                    {/* Nivel 1: Natural / Artificial */}
                    <div
                      className="flex"
                      style={{
                        borderBottom: form.origen
                          ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
                          : undefined,
                      }}
                    >
                      {(["Natural", "Artificial"] as const).map((op, i) => {
                        const isSelected = form.origen === op;
                        const Icon = op === "Natural" ? Leaf : Wrench;
                        return (
                          <button
                            key={op}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all"
                            style={{
                              borderRight:
                                i === 0
                                  ? "1px solid color-mix(in srgb, var(--primary) 8%, transparent)"
                                  : undefined,
                              background: isSelected
                                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                : "transparent",
                              color: isSelected
                                ? "var(--primary)"
                                : "color-mix(in srgb, var(--primary) 30%, transparent)",
                            }}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                origen: isSelected ? null : op,
                                sub_origen: null,
                              }))
                            }
                          >
                            <Icon size={10} /> {op}
                          </button>
                        );
                      })}
                    </div>

                    {/* Nivel 2: sub-origen de Natural */}
                    {form.origen === "Natural" && (
                      <div>
                        <div
                          className="flex"
                          style={{
                            borderBottom:
                              form.sub_origen === "Criatura"
                                ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
                                : undefined,
                          }}
                        >
                          {(["Criatura"] as const).map((sub) => {
                            const isSelected = form.sub_origen === sub;
                            return (
                              <button
                                key={sub}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                                style={{
                                  background: isSelected
                                    ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                                    : "color-mix(in srgb, var(--primary) 2%, transparent)",
                                  color: isSelected
                                    ? "var(--primary)"
                                    : "color-mix(in srgb, var(--primary) 25%, transparent)",
                                }}
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    sub_origen: isSelected ? null : sub,
                                  }))
                                }
                              >
                                <Bug size={9} /> {sub}
                              </button>
                            );
                          })}
                        </div>
                        {form.sub_origen === "Criatura" && (
                          <div className="p-2">
                            <PanelCrafterSources
                              itemId={form.id}
                              onSelectCriatura={onSelectCriatura}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nivel 2: Artificial → selector de criaturas */}
                    {form.origen === "Artificial" && (
                      <div className="p-2">
                        <PanelCrafterSources
                          itemId={form.id}
                          onSelectCriatura={onSelectCriatura}
                        />
                      </div>
                    )}
                  </div>
                )}{" "}
                {/* fin tabla === "items" */}
                {/* Columna Territorio */}
                <div className="flex-1 min-w-0">
                  <PanelTerritorio
                    value={form.reino_ids ?? []}
                    onChange={(ids) =>
                      setForm((f) => ({ ...f, reino_ids: ids }))
                    }
                    onNavigateReino={onNavigateReino}
                  />
                </div>
                {/* Columna Ciudades */}
                <div className="flex-1 min-w-0">
                  <PanelCiudades
                    itemId={form.id}
                    reinosSeleccionados={form.reino_ids ?? []}
                    onNavigateCiudad={onNavigateCiudad}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">
                  Descripción
                </label>
                <MarkdownEditor
                  toolbar
                  defaultMode="edit"
                  entities={entities}
                  placeholder="Qué es, qué hace, su historia…"
                  rows={10}
                  value={form.descripcion ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                  onSnippetAction={onSnippetAction}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
