"use client";

/**
 * EditorCriatura.tsx
 * ───────────────────
 * Vista principal del editor de criaturas. Contiene únicamente:
 *   - PickerImagenCriaturaBtn — botón mobile para cambiar imagen
 *   - BloqueGrupoCategoria — combo con subtipo de grupo (Hábitat, Inteligencia…)
 *   - BloqueGruposCriatura — chips + dropdown de grupos generales
 *   - EditorCriatura — shell con save/delete + barra de entidades inferior
 *
 * Todo lo demás vive en:
 *   components/Criaturas/CriaturaItemsNaturales.tsx  → drops naturales
 *   components/Criaturas/CriaturaItemsCraftedos.tsx  → ítems creados
 *   components/Criaturas/CriaturaHabitat.tsx         → reinos + ciudades
 *   components/Criaturas/CriaturaMagia.tsx           → hechizos + dones
 *   lib/utils/criaturaItemsCache.ts                  → singleton de ítems
 *   lib/utils/criaturaHabitatCache.ts                → caches de reinos/ciudades/personajes
 *   lib/utils/dexieHelpers.ts                        → dexiePut / dexieDelete / relaciones
 */

import Image from "next/image";

import {
  Bug,
  Brain,
  Camera,
  ChevronDown,
  Globe,
  Layers,
  MapPin,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserCircle2,
  Users,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  MarkdownEditor,
  WikiEntity,
} from "@/components/forms/Markdown/MarkdownEditor";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import {
  useCriaturaReinos,
  useCriaturaCiudades,
} from "@/features/editorGarlia/components/Criaturas/CriaturaHabitat";
import { useCraftedItems } from "@/features/editorGarlia/components/Criaturas/CriaturaItemsCraftedos";
import {
  BloqueMagico,
  grupoEsMagico,
} from "@/features/editorGarlia/components/Criaturas/CriaturaMagia";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";
import {
  getAllPersonajes,
  getAllReinos,
  getAllCiudades,
  type ReinoMin,
  type CiudadMin,
} from "@/lib/utils/criaturaHabitatCache";
import { dexiePut, dexieDelete } from "@/lib/utils/dexieHelpers";

import { useGruposDeCriatura, type GrupoMin } from "../components/hooks";
import { type Criatura, type SaveStatus } from "../components/types";
import { SelectorImagen, SaveIndicator } from "../components/UIComponents";
import { useWikilink } from "../components/WikilinkContext";

// ─── Botón mobile para cambiar imagen de la criatura ─────────────────────────

function PickerImagenCriaturaBtn({
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
                <Camera size={11} /> Imagen de la criatura
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

// ─── Tipo extendido localmente (GrupoMin + subtipo) ──────────────────────────
type GrupoMinExt = GrupoMin & { subtipo?: string | null };

function BloqueGrupoCategoria({
  label,
  subtipo,
  icon: Icon,
  gruposActuales,
  todosGrupos,
  onAdd,
  onRemove,
  onSelectGrupo,
}: {
  label: string;
  subtipo: string;
  icon: React.ElementType;
  gruposActuales: GrupoMinExt[];
  todosGrupos: GrupoMinExt[];
  onAdd: (grupoId: string) => void;
  onRemove: (grupoId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const gruposDeCat = todosGrupos.filter((g) => g.subtipo === subtipo);
  const actual = gruposActuales.filter((g) =>
    gruposDeCat.some((c) => c.id === g.id),
  );
  const disponibles = gruposDeCat.filter(
    (g) =>
      !gruposActuales.some((a) => a.id === g.id) &&
      g.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const border =
    "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";
  const borderFocus =
    "1px solid color-mix(in srgb, var(--primary) 35%, transparent)";

  // Cerrar al click fuera
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
    <div ref={containerRef} className="space-y-1.5">
      {/* Filas de valores asignados */}
      {actual.length > 0 && (
        <div className="flex flex-col gap-1">
          {actual.map((g) => (
            <div
              key={g.id}
              className="w-full flex items-center rounded-[var(--radius-btn)] overflow-hidden transition-all"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 5%, transparent)",
                border,
              }}
            >
              {/* Click principal → navegar al grupo */}
              <button
                className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase truncate transition-all hover:bg-primary/5 min-w-0"
                style={{ color: "var(--primary)" }}
                title="Ir al grupo"
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
              >
                <span className="truncate">{g.nombre}</span>
              </button>
              {/* Lápiz → abre el dropdown para cambiar */}
              <button
                className="shrink-0 flex items-center justify-center px-2.5 py-2 transition-all hover:bg-primary/10"
                style={{
                  borderLeft:
                    "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
                title="Cambiar"
                type="button"
                onClick={() => {
                  setOpen((o) => !o);
                  setSearch("");
                }}
              >
                <Pencil size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Trigger vacío */}
      {actual.length === 0 && (
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
            Sin asignar
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
              placeholder="Buscar…"
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
            {/* Opción "quitar" si hay algo asignado */}
            {actual.length > 0 && (
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                style={{
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
                type="button"
                onMouseDown={() => {
                  actual.forEach((g) => onRemove(g.id));
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <X className="opacity-50" size={9} />
                </span>
                Sin asignar
              </button>
            )}

            {gruposDeCat.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                No hay grupos de «{label}» creados
              </p>
            ) : disponibles.length === 0 && actual.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                {search ? `Sin resultados para "${search}"` : "Todos asignados"}
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
                    onAdd(g.id);
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

// ─── BloqueGruposCriatura ─────────────────────────────────────────────────────
// Muestra a qué grupos pertenece la criatura y permite añadir/quitar.
// Es la mitad del enlace bidireccional: el grupo almacena miembro_ids,
// y desde aquí actualizamos esos arrays directamente en Supabase.

function BloqueGruposCriatura({
  gruposActuales,
  todosGrupos,
  onAdd,
  onRemove,
  onSelectGrupo,
}: {
  gruposActuales: GrupoMin[];
  todosGrupos: GrupoMin[];
  onAdd: (grupoId: string) => void;
  onRemove: (grupoId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const disponibles = useMemo(
    () =>
      todosGrupos.filter(
        (g) =>
          !gruposActuales.some((a) => a.id === g.id) &&
          g.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [todosGrupos, gruposActuales, search],
  );

  if (todosGrupos.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
        <Layers size={9} /> Grupos
      </label>

      {/* Chips de grupos actuales */}
      {gruposActuales.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gruposActuales.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg border text-[10px] font-bold"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 6%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 15%, transparent)",
                color: "var(--primary)",
              }}
            >
              <button
                className="hover:underline cursor-pointer text-left leading-none"
                title="Ir al grupo"
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
              >
                {g.nombre}
              </button>
              <button
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors cursor-pointer"
                type="button"
                onClick={() => onRemove(g.id)}
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown añadir */}
      <div className="relative">
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <Plus size={8} /> Añadir a grupo
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setOpen(false);
                setSearch("");
              }}
            />
            <div
              className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border shadow-xl overflow-hidden"
              style={{
                background: "var(--bg-main)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              <div
                className="p-1.5 border-b"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <input
                  autoFocus
                  className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                  placeholder="Buscar grupo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-44 overflow-y-auto p-1">
                {disponibles.length === 0 ? (
                  <p className="text-[9px] text-primary/25 italic text-center py-3">
                    {search ? "Sin resultados" : "Ya está en todos los grupos"}
                  </p>
                ) : (
                  disponibles.map((g) => (
                    <button
                      key={g.id}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer"
                      type="button"
                      onMouseDown={() => {
                        onAdd(g.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      {g.nombre}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────
export function EditorCriatura({
  item,
  onSaved,
  onDeleted,
  entities = [],
  onSelectItem,
  onSelectPersonaje,
  onSelectGrupo,
  onNavigateCiudad,
  onNavigateReino,
}: {
  item: Criatura;
  onSaved: (c: Criatura) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectItem?: (itemId: string) => void;
  onSelectPersonaje?: (personajeId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [form, setForm] = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  // Grupos de criaturas a los que pertenece esta criatura (sincronización bidireccional)
  const {
    grupos: gruposActuales,
    todosGrupos,
    addToGrupo,
    removeFromGrupo,
  } = useGruposDeCriatura(form.id);
  // ── Personajes: hook local con toggle ─────────────────────────────────────
  const [personajesDeEspecie, setPersonajesDeEspecie] = useState<
    { id: string; nombre: string; img_url?: string | null }[]
  >([]);
  const [loadingPersonajes, setLoadingPersonajes] = useState(true);
  const [savingPersonajes, setSavingPersonajes] = useState(false);

  useEffect(() => {
    setLoadingPersonajes(true);
    const run = async () => {
      // 1. Dexie primero — filtrar por especie en memoria (no hay índice en especie)
      try {
        if (db) {
          const todas: any[] = (await (db as any).personajes?.toArray()) ?? [];
          const local = todas.filter(
            (p: any) =>
              p.especie?.toLowerCase() === item.nombre?.toLowerCase() &&
              !p.deleted,
          );
          if (local.length) {
            setPersonajesDeEspecie(
              local.map((p: any) => ({
                id: p.id,
                nombre: p.nombre,
                img_url: p.img_url ?? null,
              })),
            );
            setLoadingPersonajes(false);
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      if (!navigator.onLine) {
        setLoadingPersonajes(false);
        return;
      }

      // 2. Supabase en background
      const { data } = await supabase
        .from("personajes")
        .select("id, nombre, img_url")
        .eq("especie", item.nombre)
        .order("nombre");
      setPersonajesDeEspecie(data ?? []);
      setLoadingPersonajes(false);
    };
    run();
  }, [item.nombre]);

  const handleTogglePersonaje = async (id: string, add: boolean) => {
    setSavingPersonajes(true);
    if (add) {
      await supabase
        .from("personajes")
        .update({ especie: form.nombre })
        .eq("id", id);
      const p = allPersonajes.find((p) => p.id === id);
      if (p) setPersonajesDeEspecie((prev) => [...prev, p]);
    } else {
      await supabase.from("personajes").update({ especie: null }).eq("id", id);
      setPersonajesDeEspecie((prev) => prev.filter((p) => p.id !== id));
    }
    setSavingPersonajes(false);
  };

  // ── Datos para la barra lateral ────────────────────────────────────────────
  const [allPersonajes, setAllPersonajes] = useState<
    { id: string; nombre: string; img_url?: string | null }[]
  >([]);
  const [allReinos, setAllReinos] = useState<ReinoMin[]>([]);
  const [allCiudades, setAllCiudades] = useState<CiudadMin[]>([]);

  const {
    rows: reinoRows,
    loading: loadingReinos,
    add: addReinoSidebar,
    remove: removeReinoSidebar,
  } = useCriaturaReinos(form.id);

  const {
    rows: ciudadRows,
    loading: loadingCiudades,
    add: addCiudadSidebar,
    remove: removeCiudadSidebar,
  } = useCriaturaCiudades(form.id);

  const {
    items: craftedItems,
    allItems: allCraftedItems,
    loading: loadingCrafted,
    add: addCraftedSidebar,
    remove: removeCraftedSidebar,
  } = useCraftedItems(form.id);

  const [savingReinos, setSavingReinos] = useState(false);
  const [savingCiudades, setSavingCiudades] = useState(false);
  const [savingCrafted, setSavingCrafted] = useState(false);
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  useEffect(() => {
    // Usar caches compartidas — respuesta instantánea si ya se cargaron antes
    getAllPersonajes().then(setAllPersonajes);
    getAllReinos().then(setAllReinos);
    getAllCiudades().then(setAllCiudades);
  }, []);

  // ── Ciudades con reino → filtradas a los reinos seleccionados ────────────────
  // Las ciudades sin reino no se muestran en ningún lado.
  const reinosSeleccionadosIds = reinoRows.map((r) => r.reinoId);
  const ciudadesConReino = allCiudades.filter(
    (l) =>
      l.reino_id !== null &&
      (reinosSeleccionadosIds.length === 0 ||
        reinosSeleccionadosIds.includes(l.reino_id)),
  );

  const handleToggleReino = async (id: string, add: boolean) => {
    setSavingReinos(true);
    const reino = allReinos.find((r) => r.id === id);
    if (add && reino) await addReinoSidebar(reino);
    else {
      const row = reinoRows.find((r) => r.reinoId === id);
      if (row) await removeReinoSidebar(row.rowId);
    }
    setSavingReinos(false);
  };

  const handleToggleCiudad = async (id: string, add: boolean) => {
    setSavingCiudades(true);
    if (add) {
      const ciudad = allCiudades.find((l) => l.id === id);
      if (ciudad) await addCiudadSidebar(ciudad);
    } else {
      const row = ciudadRows.find((r) => r.ciudadId === id);
      if (row) await removeCiudadSidebar(row.rowId);
    }
    setSavingCiudades(false);
  };

  const handleToggleCrafted = async (id: string, add: boolean) => {
    setSavingCrafted(true);
    if (add) {
      const item = allCraftedItems.find((i) => i.id === id);
      if (item) await addCraftedSidebar(item);
    } else {
      const crafted = craftedItems.find((i) => i.itemId === id);
      if (crafted) await removeCraftedSidebar(crafted.crafterId);
    }
    setSavingCrafted(false);
  };

  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  const field =
    (k: keyof Criatura) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("criaturas")
        .update({
          nombre: form.nombre,
          imagen_url: form.imagen_url || null,
          descripcion: form.descripcion,
        })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("criaturas", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const del = async () => {
    const ok = await confirm({
      message: `¿Eliminar a "${form.nombre}"?`,
      danger: true,
    });
    if (!ok) return;
    await supabase.from("criaturas").delete().eq("id", form.id);
    void dexieDelete("criaturas", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── Header compacto ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          {/* Avatar */}
          <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
            {form.imagen_url ? (
              <Image
                alt={form.nombre}
                className="w-full h-full object-cover"
                src={form.imagen_url}
              />
            ) : (
              <Bug className="text-primary/25" size={13} />
            )}
          </div>

          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            placeholder="Nombre de la criatura"
            value={form.nombre ?? ""}
            onChange={field("nombre")}
          />

          <div className="shrink-0 flex items-center gap-1.5">
            <SaveIndicator status={status} />
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
              onClick={del}
            >
              <Trash2 size={9} />
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              disabled={status === "saving"}
              onClick={save}
            >
              <Save size={10} /> Guardar
            </button>
            <button
              className="sm:hidden flex items-center justify-center p-1.5 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all border border-primary/10"
              title="Entidades"
              onClick={() => setMobileAsideOpen(true)}
            >
              <SlidersHorizontal size={12} />
            </button>
          </div>
        </div>

        {/* ── Contenido superior ───────────────────────────────────────────── */}
        <div
          className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Imagen + Descripción */}
          <div className="flex gap-3">
            <div className="hidden sm:block shrink-0 w-36">
              <SelectorImagen
                aspect="square"
                label=""
                placeholder={<Bug className="opacity-20" size={20} />}
                value={form.imagen_url ?? ""}
                onChange={(url) => setForm((f) => ({ ...f, imagen_url: url }))}
              />
            </div>
            <div className="sm:hidden shrink-0 relative w-24 h-24 rounded-xl overflow-hidden border border-primary/10 bg-primary/3">
              {form.imagen_url ? (
                <Image
                  alt={form.nombre}
                  className="w-full h-full object-cover"
                  src={form.imagen_url}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bug className="text-primary/15" size={32} />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 z-10">
                <PickerImagenCriaturaBtn
                  value={form.imagen_url ?? ""}
                  onChange={(url) =>
                    setForm((f) => ({ ...f, imagen_url: url }))
                  }
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/30">
                Descripción
              </label>
              <MarkdownEditor
                toolbar
                defaultMode="edit"
                entities={entities}
                placeholder="Aspecto físico general…"
                rows={6}
                value={form.descripcion ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                onSnippetAction={onSnippetAction}
              />
            </div>
          </div>

          {/* Clasificación */}
          <div
            className="rounded-xl p-2.5"
            style={{
              background: "color-mix(in srgb, var(--primary) 2%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <p className="text-[7.5px] font-black uppercase tracking-[0.28em] text-primary/25 mb-2 px-0.5">
              Clasificación
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { label: "Hábitat", subtipo: "Hábitat", icon: Globe },
                  {
                    label: "Inteligencia",
                    subtipo: "Inteligencia",
                    icon: Brain,
                  },
                  { label: "Alma", subtipo: "Alma", icon: Wand2 },
                  { label: "Usar Mana", subtipo: "Usar Mana", icon: Sparkles },
                  {
                    label: "Produce Mana",
                    subtipo: "Produce Mana",
                    icon: Star,
                  },
                ] as const
              ).map(({ label, subtipo, icon }) => (
                <div key={subtipo} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-primary/30 mb-0.5">
                    {React.createElement(icon, { size: 7 })} {label}
                  </span>
                  <BloqueGrupoCategoria
                    gruposActuales={gruposActuales as GrupoMinExt[]}
                    icon={icon}
                    label={label}
                    subtipo={subtipo}
                    todosGrupos={todosGrupos as GrupoMinExt[]}
                    onAdd={addToGrupo}
                    onRemove={removeFromGrupo}
                    onSelectGrupo={onSelectGrupo}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BARRA DE ENTIDADES — fila horizontal inferior ────────────────── */}
        <div
          className="shrink-0 hidden sm:flex border-t overflow-y-auto"
          style={{
            maxHeight: "60vh",
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 1.5%, transparent)",
          }}
        >
          {/* Personajes - se expande, mas columnas */}
          <div
            className="flex-1 flex flex-col min-w-0 border-r"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={allPersonajes.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                imagen_url: p.img_url,
              }))}
              columns={8}
              emptyLabel="Sin personajes"
              fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
              fill={false}
              icon={<Users size={9} />}
              label="Personajes"
              loading={loadingPersonajes}
              saving={savingPersonajes}
              selectedIds={personajesDeEspecie.map((p) => p.id)}
              onEntityClick={(id) => onSelectPersonaje?.(id)}
              onToggle={handleTogglePersonaje}
            />
          </div>

          {/* Territorio - se ensancha según el contenido */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{
              width: "max-content",
              minWidth: "110px",
              maxWidth: "220px",
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={allReinos.map((r) => ({
                id: r.id,
                nombre: r.nombre,
              }))}
              emptyLabel="Sin territorio"
              fallbackIcon={<Globe size={14} strokeWidth={1} />}
              fill={false}
              icon={<Globe size={9} />}
              label="Territorio"
              loading={loadingReinos}
              saving={savingReinos}
              selectedIds={reinoRows.map((r) => r.reinoId)}
              onEntityClick={(id) => onNavigateReino?.(id)}
              onToggle={(id, add) => handleToggleReino(id, add)}
            />
          </div>

          {/* Ciudades - se ensancha según el contenido */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{
              width: "max-content",
              minWidth: "110px",
              maxWidth: "220px",
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={ciudadesConReino.map((l) => ({
                id: l.id,
                nombre: l.nombre,
              }))}
              emptyLabel={
                reinosSeleccionadosIds.length > 0
                  ? "Sin ciudades en estos reinos"
                  : "Sin ciudades"
              }
              fallbackIcon={<MapPin size={14} strokeWidth={1} />}
              fill={false}
              icon={<MapPin size={9} />}
              label={
                reinosSeleccionadosIds.length > 0
                  ? `Ciudades (${reinosSeleccionadosIds.length})`
                  : "Ciudades"
              }
              loading={loadingCiudades}
              saving={savingCiudades}
              selectedIds={ciudadRows.map((r) => r.ciudadId)}
              onEntityClick={(id) => onNavigateCiudad?.(id)}
              onToggle={(id, add) => handleToggleCiudad(id, add)}
            />
          </div>

          {/* Creaciones - se ensancha según el contenido */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{
              width: "max-content",
              minWidth: "110px",
              maxWidth: "220px",
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={allCraftedItems.map((i) => ({
                id: i.id,
                nombre: i.nombre,
                imagen_url: i.imagen_url,
              }))}
              emptyLabel="Sin creaciones"
              fallbackIcon={<Package size={14} strokeWidth={1} />}
              fill={false}
              icon={<Wrench size={9} />}
              label="Creaciones"
              loading={loadingCrafted}
              saving={savingCrafted}
              selectedIds={craftedItems.map((i) => i.itemId)}
              onEntityClick={(id) => onSelectItem?.(id)}
              onToggle={handleToggleCrafted}
            />
          </div>

          {/* Hechizos + Dones - ancho fijo */}
          <div
            className="shrink-0 flex flex-col overflow-hidden"
            style={{ width: "110px" }}
          >
            {grupoEsMagico(gruposActuales) ? (
              <>
                <div
                  className="flex-1 min-h-0 overflow-hidden flex flex-col border-b"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--primary) 7%, transparent)",
                  }}
                >
                  <BloqueMagico
                    criaturaId={form.id}
                    gruposActuales={gruposActuales.map((g) => g.id)}
                    icon={Sparkles}
                    label="Hechizos"
                    usarHook="hechizos"
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <BloqueMagico
                    criaturaId={form.id}
                    gruposActuales={gruposActuales.map((g) => g.id)}
                    icon={Star}
                    label="Dones"
                    usarHook="dones"
                  />
                </div>
              </>
            ) : (
              <BloqueMagico
                criaturaId={form.id}
                gruposActuales={gruposActuales.map((g) => g.id)}
                icon={Star}
                label="Dones"
                usarHook="dones"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── BARRA DE ENTIDADES — mobile drawer ───────────────────────────────── */}
      {mobileAsideOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
            onClick={() => setMobileAsideOpen(false)}
          />
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "200px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <span className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 text-primary/40">
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={() => setMobileAsideOpen(false)}
              >
                <X size={13} />
              </button>
            </div>
            <SeccionEntidad
              allEntities={allPersonajes.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                imagen_url: p.img_url,
              }))}
              columns={2}
              emptyLabel="Sin personajes"
              fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
              fill={false}
              icon={<Users size={9} />}
              label="Personajes"
              loading={loadingPersonajes}
              saving={savingPersonajes}
              selectedIds={personajesDeEspecie.map((p) => p.id)}
              onEntityClick={(id) => onSelectPersonaje?.(id)}
              onToggle={handleTogglePersonaje}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={allReinos.map((r) => ({
                id: r.id,
                nombre: r.nombre,
              }))}
              emptyLabel="Sin territorio"
              fallbackIcon={<Globe size={14} strokeWidth={1} />}
              fill={false}
              icon={<Globe size={9} />}
              label="Territorio"
              loading={loadingReinos}
              saving={savingReinos}
              selectedIds={reinoRows.map((r) => r.reinoId)}
              onEntityClick={(id) => onNavigateReino?.(id)}
              onToggle={(id, add) => handleToggleReino(id, add)}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={ciudadesConReino.map((l) => ({
                id: l.id,
                nombre: l.nombre,
              }))}
              emptyLabel={
                reinosSeleccionadosIds.length > 0
                  ? "Sin ciudades en estos reinos"
                  : "Sin ciudades"
              }
              fallbackIcon={<MapPin size={14} strokeWidth={1} />}
              fill={false}
              icon={<MapPin size={9} />}
              label={
                reinosSeleccionadosIds.length > 0
                  ? `Ciudades (${reinosSeleccionadosIds.length})`
                  : "Ciudades"
              }
              loading={loadingCiudades}
              saving={savingCiudades}
              selectedIds={ciudadRows.map((r) => r.ciudadId)}
              onEntityClick={(id) => onNavigateCiudad?.(id)}
              onToggle={(id, add) => handleToggleCiudad(id, add)}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={allCraftedItems.map((i) => ({
                id: i.id,
                nombre: i.nombre,
                imagen_url: i.imagen_url,
              }))}
              emptyLabel="Sin creaciones"
              fallbackIcon={<Package size={14} strokeWidth={1} />}
              fill={false}
              icon={<Wrench size={9} />}
              label="Creaciones"
              loading={loadingCrafted}
              saving={savingCrafted}
              selectedIds={craftedItems.map((i) => i.itemId)}
              onEntityClick={(id) => onSelectItem?.(id)}
              onToggle={handleToggleCrafted}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            {grupoEsMagico(gruposActuales) && (
              <>
                <BloqueMagico
                  criaturaId={form.id}
                  gruposActuales={gruposActuales.map((g) => g.id)}
                  icon={Sparkles}
                  label="Hechizos"
                  usarHook="hechizos"
                />
                <div
                  style={{
                    borderTop:
                      "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
                  }}
                />
              </>
            )}
            <BloqueMagico
              criaturaId={form.id}
              gruposActuales={gruposActuales.map((g) => g.id)}
              icon={Star}
              label="Dones"
              usarHook="dones"
            />
          </div>
        </div>
      )}
    </div>
  );
}
