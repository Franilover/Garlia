"use client";

/**
 * EditorCriatura.tsx
 * ───────────────────
 * Vista principal del editor de criaturas. Contiene únicamente:
 *   - CampoLore — campo markdown colapsable genérico
 *   - BloqueGrupoCategoria — combo con subtipo de grupo
 *   - BloqueGruposCriatura — chips + dropdown de grupos generales
 *   - EditorCriatura — shell con save/delete + sidebar de entidades
 *
 * Todo lo demás se movió a:
 *   components/CriaturaItemsNaturales.tsx  → drops naturales
 *   components/CriaturaItemsCraftedos.tsx  → ítems creados
 *   components/CriaturaHabitat.tsx         → reinos + ciudades
 *   components/CriaturaMagia.tsx           → hechizos + dones
 *   lib/utils/criaturaItemsCache.ts        → singleton de ítems
 *   lib/utils/criaturaHabitatCache.ts      → caches de reinos/ciudades/personajes
 *   lib/utils/dexieHelpers.ts              → dexiePut / dexieDelete
 */

import Image from "next/image";

import {
  Brain,
  Bug,
  Camera,
  ChevronDown,
  Globe,
  Layers,
  Loader2,
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
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  MarkdownEditor,
  WikiEntity,
} from "@/components/forms/Markdown/MarkdownEditor";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { CriaturaHabitat } from "@/features/editorGarlia/components/CriaturaHabitat";
import {
  CriaturaItemsCraftedos,
  useCraftedItems,
} from "@/features/editorGarlia/components/CriaturaItemsCraftedos";
import { CriaturaItemsNaturales } from "@/features/editorGarlia/components/CriaturaItemsNaturales";
import {
  CriaturaMagia,
  grupoEsMagico,
} from "@/features/editorGarlia/components/CriaturaMagia";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";
import { getAllPersonajes } from "@/lib/utils/criaturaHabitatCache";
import { dexiePut, dexieDelete } from "@/lib/utils/dexieHelpers";

import { useGruposDeCriatura, type GrupoMin } from "../components/hooks";
import { type Criatura, type SaveStatus } from "../components/types";
import { SelectorImagen, SaveIndicator } from "../components/UIComponents";
import { useWikilink } from "../components/WikilinkContext";

// ─── Tipo extendido ───────────────────────────────────────────────────────────
type GrupoMinExt = GrupoMin & { subtipo?: string | null };

// ─── CampoLore ────────────────────────────────────────────────────────────────
function CampoLore({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  icon: Icon,
  entities = [],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  icon?: React.ElementType;
  entities?: WikiEntity[];
}) {
  const [open, setOpen] = useState(!!value);
  const { onSnippetAction } = useWikilink();
  const preview = value
    .replace(/[#*`_~\[\]]/g, "")
    .trim()
    .slice(0, 80);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3 cursor-pointer"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        {Icon && <Icon className="shrink-0 text-primary/35" size={12} />}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/40">
            {label}
          </p>
          {!open && preview && (
            <p className="text-[11px] text-primary/35 truncate mt-0.5 font-medium italic">
              {preview}…
            </p>
          )}
          {!open && !preview && (
            <p className="text-[10px] text-primary/20 mt-0.5 italic">
              {placeholder?.slice(0, 55)}…
            </p>
          )}
        </div>
        <ChevronDown
          className="shrink-0 text-primary/25 transition-transform duration-200"
          size={13}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <MarkdownEditor
            toolbar
            defaultMode="edit"
            entities={entities}
            placeholder={placeholder}
            rows={rows}
            value={value}
            onChange={onChange}
            onSnippetAction={onSnippetAction}
          />
        </div>
      )}
    </div>
  );
}

// ─── BloqueGrupoCategoria ────────────────────────────────────────────────────
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
              <button
                className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase truncate transition-all hover:bg-primary/5 min-w-0"
                style={{ color: "var(--primary)" }}
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
              >
                <span className="truncate">{g.nombre}</span>
              </button>
              <button
                className="shrink-0 flex items-center justify-center px-2.5 py-2 transition-all hover:bg-primary/10"
                style={{
                  borderLeft:
                    "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
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
              className="flex-1 bg-transparent text-[11px] font-medium outline-none"
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
          <div className="max-h-48 overflow-y-auto">
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

// ─── BloqueGruposCriatura ────────────────────────────────────────────────────
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

// ─── PickerImagenCriaturaBtn ──────────────────────────────────────────────────
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

  const {
    grupos: gruposActuales,
    todosGrupos,
    addToGrupo,
    removeFromGrupo,
  } = useGruposDeCriatura(form.id);

  // Personajes de la especie
  const [personajesDeEspecie, setPersonajesDeEspecie] = useState<
    { id: string; nombre: string; img_url?: string | null }[]
  >([]);
  const [loadingPersonajes, setLoadingPersonajes] = useState(true);
  const [savingPersonajes, setSavingPersonajes] = useState(false);
  const [allPersonajes, setAllPersonajes] = useState<
    { id: string; nombre: string; img_url?: string | null }[]
  >([]);

  const {
    items: craftedItems,
    allItems: allCraftedItems,
    loading: loadingCrafted,
    add: addCrafted,
    remove: removeCrafted,
  } = useCraftedItems(form.id);
  const [savingCrafted, setSavingCrafted] = useState(false);
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  useEffect(() => {
    getAllPersonajes().then(setAllPersonajes);
  }, []);

  useEffect(() => {
    setLoadingPersonajes(true);
    const run = async () => {
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

  const handleToggleCrafted = async (id: string, add: boolean) => {
    setSavingCrafted(true);
    if (add) {
      const item = allCraftedItems.find((i) => i.id === id);
      if (item) await addCrafted(item);
    } else {
      const crafted = craftedItems.find((i) => i.itemId === id);
      if (crafted) await removeCrafted(crafted.crafterId);
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
          habitat: form.habitat,
          pensamiento: form.pensamiento,
          alma: form.alma,
          biologia: form.biologia,
          relacion: form.relacion,
          comportamiento: form.comportamiento,
          magia: form.magia,
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

  const esMagica = grupoEsMagico(gruposActuales);

  // Grupos por subtipo para los combos de categoría
  const todosExt = todosGrupos as GrupoMinExt[];
  const gruposExt = gruposActuales as GrupoMinExt[];

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/[0.03]">
          <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
            {form.imagen_url ? (
              <Image
                alt={form.nombre}
                className="w-full h-full object-cover"
                src={form.imagen_url}
              />
            ) : (
              <Bug className="text-primary/25" size={16} />
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
              onClick={del}
            >
              <Trash2 size={10} />
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              disabled={status === "saving"}
              onClick={save}
            >
              <Save size={10} /> Guardar
            </button>
            <button
              className="sm:hidden flex items-center justify-center p-2 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all border border-primary/10"
              onClick={() => setMobileAsideOpen(true)}
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Formulario + campos lore */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Imagen + nombre + grupos */}
              <div className="flex gap-4">
                {/* Imagen */}
                <div className="shrink-0">
                  <div className="hidden sm:block">
                    <SelectorImagen
                      aspect="square"
                      label="Imagen"
                      placeholder={<Bug className="opacity-25" size={20} />}
                      value={form.imagen_url ?? ""}
                      onChange={(url) =>
                        setForm((f) => ({ ...f, imagen_url: url }))
                      }
                    />
                  </div>
                  <div className="sm:hidden relative w-24 h-24 rounded-xl overflow-hidden border border-primary/10 bg-primary/3">
                    {form.imagen_url ? (
                      <Image
                        alt={form.nombre}
                        className="w-full h-full object-cover"
                        src={form.imagen_url}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Bug className="text-primary/15" size={28} />
                      </div>
                    )}
                    <div className="absolute top-1 right-1">
                      <PickerImagenCriaturaBtn
                        value={form.imagen_url ?? ""}
                        onChange={(url) =>
                          setForm((f) => ({ ...f, imagen_url: url }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Grupos por categoría */}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["especie", "dieta", "tamaño", "peligrosidad"].map(
                    (subtipo) => (
                      <BloqueGrupoCategoria
                        key={subtipo}
                        gruposActuales={gruposExt}
                        icon={
                          subtipo === "especie"
                            ? Bug
                            : subtipo === "dieta"
                              ? Package
                              : subtipo === "tamaño"
                                ? Layers
                                : Wand2
                        }
                        label={
                          subtipo.charAt(0).toUpperCase() + subtipo.slice(1)
                        }
                        subtipo={subtipo}
                        todosGrupos={todosExt}
                        onAdd={addToGrupo}
                        onRemove={removeFromGrupo}
                        onSelectGrupo={onSelectGrupo}
                      />
                    ),
                  )}
                  <div className="sm:col-span-2">
                    <BloqueGruposCriatura
                      gruposActuales={gruposActuales}
                      todosGrupos={todosGrupos}
                      onAdd={addToGrupo}
                      onRemove={removeFromGrupo}
                      onSelectGrupo={onSelectGrupo}
                    />
                  </div>
                </div>
              </div>

              {/* Items naturales */}
              <div className="rounded-2xl overflow-hidden border border-primary/10 p-3 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1.5">
                  <Package size={9} /> Drops naturales
                </p>
                <CriaturaItemsNaturales
                  criaturaId={form.id}
                  onSelectItem={onSelectItem}
                />
              </div>

              {/* Campos lore */}
              {(
                [
                  {
                    key: "descripcion",
                    label: "Descripción",
                    icon: Bug,
                    placeholder:
                      "Aspecto, rasgos físicos, primeras impresiones…",
                  },
                  {
                    key: "biologia",
                    label: "Biología",
                    icon: Brain,
                    placeholder: "Anatomía, ciclo de vida, reproducción…",
                  },
                  {
                    key: "comportamiento",
                    label: "Comportamiento",
                    icon: Users,
                    placeholder: "Conducta, jerarquía social, territorialidad…",
                  },
                  {
                    key: "habitat",
                    label: "Hábitat",
                    icon: Globe,
                    placeholder: "Entornos, climas, distribución geográfica…",
                  },
                  {
                    key: "relacion",
                    label: "Relación con personajes",
                    icon: UserCircle2,
                    placeholder:
                      "Cómo interactúa con los personajes del mundo…",
                  },
                  {
                    key: "pensamiento",
                    label: "Pensamiento",
                    icon: Brain,
                    placeholder: "Inteligencia, lenguaje, cultura, creencias…",
                  },
                  {
                    key: "alma",
                    label: "Alma",
                    icon: Sparkles,
                    placeholder:
                      "Naturaleza espiritual, conexión con la magia…",
                  },
                  {
                    key: "magia",
                    label: "Magia",
                    icon: Wand2,
                    placeholder:
                      "Poderes, hechizos naturales, debilidades mágicas…",
                  },
                ] as const
              ).map(({ key, label, icon, placeholder }) => (
                <CampoLore
                  key={key}
                  entities={entities}
                  icon={icon as React.ElementType}
                  label={label}
                  placeholder={placeholder}
                  rows={6}
                  value={(form as any)[key] ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
              ))}
            </div>
          </div>

          {/* ── Sidebar desktop ─────────────────────────────────────────────── */}
          <aside
            className="hidden sm:flex flex-col shrink-0 border-l overflow-hidden"
            style={{
              width: "340px",
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Personajes */}
              <div
                className="flex-1 min-w-0 overflow-y-auto border-r"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 7%, transparent)",
                }}
              >
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
                <div className="p-3">
                  <CriaturaHabitat
                    criaturaId={form.id}
                    onNavigateCiudad={onNavigateCiudad}
                    onNavigateReino={onNavigateReino}
                  />
                </div>
              </div>

              {/* Craftedos + Magia */}
              <div
                className="flex flex-col overflow-hidden"
                style={{
                  width: "max-content",
                  minWidth: "110px",
                  maxWidth: "220px",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 7%, transparent)",
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
                <div
                  style={{
                    borderTop:
                      "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
                  }}
                />
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                  <CriaturaMagia
                    criaturaId={form.id}
                    gruposActuales={gruposActuales.map((g) => g.id)}
                    mostrarHechizos={esMagica}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Drawer mobile ────────────────────────────────────────────────────── */}
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
            <div className="p-2">
              <CriaturaHabitat
                criaturaId={form.id}
                onNavigateCiudad={onNavigateCiudad}
                onNavigateReino={onNavigateReino}
              />
            </div>
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
            <CriaturaMagia
              criaturaId={form.id}
              gruposActuales={gruposActuales.map((g) => g.id)}
              mostrarHechizos={esMagica}
            />
          </div>
        </div>
      )}
    </div>
  );
}
