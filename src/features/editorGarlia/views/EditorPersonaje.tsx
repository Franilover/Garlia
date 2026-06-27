"use client";

/**
 * EditorPersonaje.tsx
 * ────────────────────
 * Vista principal del editor de personajes.
 * Contiene únicamente:
 *   - Hooks de datos propios (especie, territorio, variantes)
 *   - FormularioPersonaje — formulario + sidebar orquestado
 *   - EditorPersonaje — shell con save/delete
 *
 * Todo lo que era sidebar se movió a:
 *   components/PersonajeSidebarPanel.tsx  → drawer + columna desktop
 *   components/PersonajeCapitulosAparece.tsx
 *   components/PersonajeCancionesAsociadas.tsx
 *   components/PersonajeLineaDeTiempo.tsx
 *   components/PersonajeGrupos.tsx
 *   components/PersonajeHechizos.tsx
 *
 * Helpers de Dexie movidos a:
 *   lib/utils/dexieHelpers.ts
 *
 * Caches movidas a:
 *   lib/utils/criaturaCache.ts
 */

import Image from "next/image";

import {
  Camera,
  Loader2,
  Maximize2,
  Save,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { WikiEntity } from "@/components/forms/Markdown/MarkdownEditor";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { useConfirm } from "@/components/ui/ConfirmModal";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { PersonajeSidebarPanel } from "@/features/editorGarlia/components/PersonajeSidebarPanel";
import { PersonajeLineaDeTiempo } from "@/features/editorGarlia/components/PersonajeLineaDeTiempo";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";
import { dexiePut, dexieDelete } from "@/lib/utils/dexieHelpers";
import {
  getCriaturaByNombre,
  getGruposByTipo,
} from "@/lib/utils/criaturaCache";

import { BloqueDones } from "../components/BloqueDones";
import { useNombresDeTabla } from "../components/hooks";
import { type Personaje, type SaveStatus } from "../components/types";
import { SelectorImagen, SaveIndicator } from "../components/UIComponents";

// ─── Hook: variantes de una criatura por nombre de especie ───────────────────
type VarianteMin = { id: string; tipo: string };

function useCriaturaVariantesPorNombre(
  nombreEspecie: string | null | undefined,
) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) {
      setVariantes([]);
      return;
    }

    try {
      const criLocal = await getCriaturaByNombre(nombreEspecie);
      if (criLocal && db) {
        const vars: any[] =
          (await (db as any).criatura_variantes
            ?.where("criatura_id")
            .equals(criLocal.id)
            .toArray()) ?? [];
        if (vars.length) {
          setVariantes(vars);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    const { data: criatura } = await supabase
      .from("criaturas")
      .select("id")
      .ilike("nombre", nombreEspecie.trim())
      .limit(1)
      .maybeSingle();
    if (!criatura) {
      setVariantes([]);
      return;
    }

    const { data } = await supabase
      .from("criatura_variantes")
      .select("id, tipo")
      .eq("criatura_id", criatura.id)
      .order("tipo");
    const result = data ?? [];
    setVariantes(result);
    try {
      if (db && result.length > 0)
        await (db as any).criatura_variantes?.bulkPut(result);
    } catch {}
  }, [nombreEspecie]);

  useEffect(() => {
    load();
  }, [load]);
  return variantes;
}

// ─── Hook: grupos de criatura + esMagico ─────────────────────────────────────
function normNombre(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function useGruposDeCriaturaPorNombre(
  nombreEspecie: string | null | undefined,
): { ids: string[]; esMagico: boolean } {
  const [grupoIds, setGrupoIds] = useState<string[]>([]);
  const [esMagico, setEsMagico] = useState(false);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) {
      setGrupoIds([]);
      setEsMagico(false);
      return;
    }

    const criLocal = await getCriaturaByNombre(nombreEspecie);
    let criaturaId: string | null = criLocal?.id ?? null;

    if (criaturaId) {
      const gruposCriaturas = await getGruposByTipo("criaturas");
      const grupos = gruposCriaturas.filter((g: any) =>
        (g.miembro_ids ?? []).includes(criaturaId),
      );
      if (grupos.length) {
        setGrupoIds(grupos.map((g: any) => g.id));
        setEsMagico(
          grupos.some((g: any) => normNombre(g.nombre ?? "") === "magico"),
        );
        if (!navigator.onLine) return;
      }
    }

    if (!navigator.onLine) return;

    if (!criaturaId) {
      const { data: cri } = await supabase
        .from("criaturas")
        .select("id")
        .ilike("nombre", nombreEspecie.trim())
        .limit(1)
        .maybeSingle();
      criaturaId = cri?.id ?? null;
    }
    if (!criaturaId) {
      setGrupoIds([]);
      setEsMagico(false);
      return;
    }

    const { data: grupos } = await supabase
      .from("grupos_mundo")
      .select("id, nombre, miembro_ids")
      .eq("tipo", "criaturas")
      .contains("miembro_ids", [criaturaId]);
    setGrupoIds((grupos ?? []).map((g: any) => g.id));
    setEsMagico(
      (grupos ?? []).some((g: any) => normNombre(g.nombre ?? "") === "magico"),
    );
  }, [nombreEspecie]);

  useEffect(() => {
    load();
  }, [load]);
  return { ids: grupoIds, esMagico };
}

// ─── Hook: ciudades (para combo ubicación) ────────────────────────────────────
type CiudadMin = { id: string; nombre: string; reino_id: string | null };

function useCiudades(): CiudadMin[] {
  const [ciudades, setCiudades] = useState<CiudadMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = (await (db as any).ciudades?.toArray()) ?? [];
          if (local.length) {
            setCiudades(
              local
                .filter((l: any) => !l.deleted)
                .map((l: any) => ({
                  id: l.id,
                  nombre: l.nombre,
                  reino_id: l.reino_id ?? null,
                }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre)),
            );
            if (!navigator.onLine) return;
          }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase
        .from("ciudades")
        .select("id, nombre, reino_id")
        .order("nombre");
      if (data)
        setCiudades(
          data.map((l: any) => ({
            id: l.id,
            nombre: l.nombre,
            reino_id: l.reino_id ?? null,
          })),
        );
    };
    run();
  }, []);
  return ciudades;
}

// ─── Hook: reinos mínimos (para filtrar ciudades) ────────────────────────────
type ReinoMin = { id: string; nombre: string };

function useReinosMin(): ReinoMin[] {
  const [reinos, setReinos] = useState<ReinoMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = (await (db as any).reinos?.toArray()) ?? [];
          if (local.length) {
            setReinos(
              local
                .filter((r: any) => !r.deleted)
                .map((r: any) => ({ id: r.id, nombre: r.nombre })),
            );
            if (!navigator.onLine) return;
          }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase
        .from("reinos")
        .select("id, nombre")
        .order("nombre");
      if (data) setReinos(data);
    };
    run();
  }, []);
  return reinos;
}

// ─── Pickers de imagen (cara mobile y cuerpo) ─────────────────────────────────
function PickerImagen({
  value,
  onChange,
  titulo,
  icon,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  titulo: string;
  icon: React.ReactNode;
  label: string;
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
                {icon} {titulo}
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-[10px] font-black uppercase tracking-widest text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
        onClick={() => setOpen(true)}
      >
        {icon} {label}
      </button>
    </>
  );
}

function PickerCaraBtn({
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
                <Camera size={11} /> Imagen de perfil
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

// ─── FormularioPersonaje ──────────────────────────────────────────────────────
export function FormularioPersonaje({
  form,
  setForm,
  status,
  onSave,
  onDelete,
  compacto = false,
  entities = [],
  onNavigate,
  onSelectPersonaje,
  onOpenGrupo,
  onNavigateCiudad,
  onSelectCancion,
}: {
  form: Personaje;
  setForm: React.Dispatch<React.SetStateAction<Personaje>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  compacto?: boolean;
  entities?: WikiEntity[];
  onNavigate?: (tab: "criaturas" | "reinos", nombre: string) => void;
  onSelectPersonaje?: (id: string) => void;
  onOpenGrupo?: (id: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onSelectCancion?: (id: string) => void;
}) {
  const especies = useNombresDeTabla("criaturas");
  const reinosMin = useReinosMin();
  const ciudades = useCiudades();
  const variantes = useCriaturaVariantesPorNombre(form.especie);
  const { ids: grupoIds, esMagico: especieEsMagica } =
    useGruposDeCriaturaPorNombre(form.especie);

  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  const reinoSeleccionadoId =
    reinosMin.find((r) => r.nombre === form.reino)?.id ?? null;
  const ciudadesFiltradas = ciudades.filter((l) =>
    reinoSeleccionadoId ? l.reino_id === reinoSeleccionadoId : !l.reino_id,
  );

  // Valores y handlers para ComboSelector de territorio/ubicación
  const territorioValue = form.reino
    ? reinosMin.find((x) => x.nombre === form.reino)
      ? `reino:${reinosMin.find((x) => x.nombre === form.reino)!.id}`
      : null
    : null;

  const onTerritorioChange = (val: string | null) => {
    if (!val) {
      setForm((f) => ({ ...f, reino: "", ciudad_id: null }) as any);
      return;
    }
    if (val.startsWith("reino:")) {
      const r = reinosMin.find((x) => x.id === val.replace("reino:", ""));
      setForm(
        (f) => ({ ...f, reino: r?.nombre ?? "", ciudad_id: null }) as any,
      );
    }
  };

  const ubicacionValue = (form as any).ciudad_id
    ? `ciudad:${(form as any).ciudad_id}`
    : null;
  const onUbicacionChange = (val: string | null) => {
    setForm(
      (f) =>
        ({
          ...f,
          ciudad_id: val?.startsWith("ciudad:")
            ? val.replace("ciudad:", "")
            : null,
        }) as any,
    );
  };

  const field =
    (k: keyof Personaje) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFechaNacimientoChange = (dia: number | null) => {
    const updated = { ...form, fecha_nacimiento: dia ?? null } as any;
    setForm(updated);
    void dexiePut("personajes", updated);
  };

  const sidebarProps = {
    personajeId: form.id,
    nombrePersonaje: form.nombre ?? "",
    grupoIds,
    especieEsMagica,
    onSelectPersonaje,
    onOpenGrupo,
    onSelectCancion,
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/[0.03]">
        <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.img_url ? (
            <Image
              alt={form.nombre}
              className="w-full h-full object-cover"
              src={form.img_url}
            />
          ) : (
            <UserCircle2 className="text-primary/25" size={16} />
          )}
        </div>
        <input
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre del personaje"
          style={{ letterSpacing: "0.02em" }}
          value={form.nombre ?? ""}
          onChange={field("nombre")}
        />
        <div className="shrink-0 flex items-center gap-1.5">
          <SaveIndicator status={status} />
          {!compacto && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
              onClick={onDelete}
            >
              <Trash2 size={10} />
            </button>
          )}
          <button
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            disabled={status === "saving"}
            onClick={onSave}
          >
            <Save size={10} /> Guardar
          </button>
          <button
            className="sm:hidden flex items-center justify-center p-2 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all border border-primary/10"
            title="Entidades"
            onClick={() => setMobileAsideOpen(true)}
          >
            {/* SlidersHorizontal inline para no importar más de lucide */}
            <svg
              fill="none"
              height={13}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              width={13}
            >
              <line x1="4" x2="4" y1="21" y2="14" />
              <line x1="4" x2="4" y1="10" y2="3" />
              <line x1="12" x2="12" y1="21" y2="12" />
              <line x1="12" x2="12" y1="8" y2="3" />
              <line x1="20" x2="20" y1="21" y2="16" />
              <line x1="20" x2="20" y1="12" y2="3" />
              <line x1="1" x2="7" y1="14" y2="14" />
              <line x1="9" x2="15" y1="8" y2="8" />
              <line x1="17" x2="23" y1="16" y2="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cuerpo: formulario + sidebar inline desktop */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Formulario principal */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* Imágenes */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="shrink-0 w-full sm:w-52 flex sm:flex-col gap-3 sm:gap-2">
                {/* Mobile: imagen grande */}
                <div
                  className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  {form.img_url ? (
                    <Image
                      alt={form.nombre}
                      className="w-full h-full object-cover"
                      src={form.img_url}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle2 className="text-primary/15" size={48} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 z-10">
                    <PickerCaraBtn
                      value={form.img_url ?? ""}
                      onChange={(url) =>
                        setForm((f) => ({ ...f, img_url: url }))
                      }
                    />
                  </div>
                </div>

                {/* Desktop: selector normal */}
                <div className="hidden sm:block w-full">
                  <SelectorImagen
                    aspect="square"
                    label="Cara"
                    placeholder={
                      <UserCircle2 className="opacity-25" size={20} />
                    }
                    value={form.img_url ?? ""}
                    onChange={(url) => setForm((f) => ({ ...f, img_url: url }))}
                  />
                </div>

                {!compacto && (
                  <div className="hidden sm:block rounded-xl overflow-hidden border border-primary/10">
                    <div className="px-2 py-1 border-b border-primary/10 bg-primary/[0.02]">
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25">
                        Cuerpo
                      </span>
                    </div>
                    <div
                      className="relative w-full group bg-primary/2"
                      style={{ aspectRatio: "1 / 2" }}
                    >
                      {form.img_cuerpo_url ? (
                        <img
                          alt="Cuerpo completo"
                          className="absolute inset-0 w-full h-full object-contain"
                          src={form.img_cuerpo_url}
                          style={{ objectPosition: "top center" }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Maximize2 className="opacity-15" size={20} />
                        </div>
                      )}
                      <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-bg-main/70 backdrop-blur-sm">
                        <Maximize2 className="text-primary/50" size={14} />
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
                          Cambiar
                        </span>
                        <SelectorImagen
                          aspect="full"
                          label=""
                          placeholder={null}
                          value={form.img_cuerpo_url ?? ""}
                          onChange={(url) =>
                            setForm((f) => ({ ...f, img_cuerpo_url: url }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Mobile: botón cuerpo */}
                {!compacto && (
                  <div className="sm:hidden">
                    <PickerImagen
                      icon={<Maximize2 size={11} />}
                      label={
                        form.img_cuerpo_url
                          ? "Cambiar cuerpo"
                          : "+ Imagen cuerpo"
                      }
                      titulo="Imagen cuerpo"
                      value={form.img_cuerpo_url ?? ""}
                      onChange={(url) =>
                        setForm((f) => ({ ...f, img_cuerpo_url: url }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* Columna derecha: combos + descripción */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Mobile: grid 2×2 */}
                <div className="sm:hidden grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <ComboSelector
                      allowNone
                      items={especies.map((e) => ({ id: e, label: e }))}
                      label="Especie"
                      mode="single"
                      noneLabel="Sin especie"
                      placeholder="Humano, elfo…"
                      value={form.especie ?? null}
                      onChange={(v) =>
                        setForm(
                          (f) =>
                            ({
                              ...f,
                              especie: v ?? "",
                              variante_id: null,
                            }) as any,
                        )
                      }
                      onNavigate={
                        onNavigate
                          ? (_id, nombre) => onNavigate("criaturas", nombre)
                          : undefined
                      }
                    />
                    {variantes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">
                          Variante
                        </span>
                        <button
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!(form as any).variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, variante_id: null }) as any)
                          }
                        >
                          Todas
                        </button>
                        {variantes.map((v) => (
                          <button
                            key={v.id}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${(form as any).variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                            type="button"
                            onClick={() =>
                              setForm(
                                (f) => ({ ...f, variante_id: v.id }) as any,
                              )
                            }
                          >
                            {v.tipo}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <ComboSelector
                    allowNone
                    groups={[]}
                    items={reinosMin.map((r) => ({
                      id: `reino:${r.id}`,
                      label: r.nombre,
                    }))}
                    label="Territorio"
                    mode="single"
                    noneLabel="Sin territorio"
                    placeholder="Reino…"
                    value={territorioValue}
                    onChange={onTerritorioChange}
                    onNavigate={
                      onNavigate
                        ? (id) => {
                            const r = reinosMin.find(
                              (x) => x.id === id.replace("reino:", ""),
                            );
                            if (r) onNavigate("reinos", r.nombre);
                          }
                        : undefined
                    }
                  />
                  <ComboSelector
                    allowNone
                    groups={[]}
                    items={ciudadesFiltradas.map((l) => ({
                      id: `ciudad:${l.id}`,
                      label: l.nombre,
                    }))}
                    label="Ubicación"
                    mode="single"
                    noneLabel="Sin ubicación"
                    placeholder="Ciudad…"
                    value={ubicacionValue}
                    onChange={onUbicacionChange}
                    onNavigate={
                      onNavigateCiudad
                        ? (id) => {
                            if (id.startsWith("ciudad:"))
                              onNavigateCiudad(id.replace("ciudad:", ""));
                          }
                        : undefined
                    }
                  />
                  <BloqueDones grupoIds={grupoIds} personajeId={form.id} />
                </div>

                {/* Desktop: layout fila de 3 */}
                <div className="hidden sm:flex flex-col sm:flex-row gap-2 items-start">
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                    <div className="space-y-1 col-span-1">
                      <ComboSelector
                        allowNone
                        items={especies.map((e) => ({ id: e, label: e }))}
                        label="Especie"
                        mode="single"
                        noneLabel="Sin especie"
                        placeholder="Humano, elfo…"
                        value={form.especie ?? null}
                        onChange={(v) =>
                          setForm(
                            (f) =>
                              ({
                                ...f,
                                especie: v ?? "",
                                variante_id: null,
                              }) as any,
                          )
                        }
                        onNavigate={
                          onNavigate
                            ? (_id, nombre) => onNavigate("criaturas", nombre)
                            : undefined
                        }
                      />
                      {variantes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">
                            Variante
                          </span>
                          <button
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!(form as any).variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                            type="button"
                            onClick={() =>
                              setForm(
                                (f) => ({ ...f, variante_id: null }) as any,
                              )
                            }
                          >
                            Todas
                          </button>
                          {variantes.map((v) => (
                            <button
                              key={v.id}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${(form as any).variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                              type="button"
                              onClick={() =>
                                setForm(
                                  (f) => ({ ...f, variante_id: v.id }) as any,
                                )
                              }
                            >
                              {v.tipo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <ComboSelector
                      allowNone
                      groups={[]}
                      items={reinosMin.map((r) => ({
                        id: `reino:${r.id}`,
                        label: r.nombre,
                      }))}
                      label="Territorio"
                      mode="single"
                      noneLabel="Sin territorio"
                      placeholder="Reino…"
                      value={territorioValue}
                      onChange={onTerritorioChange}
                      onNavigate={
                        onNavigate
                          ? (id) => {
                              const r = reinosMin.find(
                                (x) => x.id === id.replace("reino:", ""),
                              );
                              if (r) onNavigate("reinos", r.nombre);
                            }
                          : undefined
                      }
                    />
                    <ComboSelector
                      allowNone
                      groups={[]}
                      items={ciudadesFiltradas.map((l) => ({
                        id: `ciudad:${l.id}`,
                        label: l.nombre,
                      }))}
                      label="Ubicación"
                      mode="single"
                      noneLabel="Sin ubicación"
                      placeholder="Ciudad…"
                      value={ubicacionValue}
                      onChange={onUbicacionChange}
                      onNavigate={
                        onNavigateCiudad
                          ? (id) => {
                              if (id.startsWith("ciudad:"))
                                onNavigateCiudad(id.replace("ciudad:", ""));
                            }
                          : undefined
                      }
                    />
                  </div>
                  <div className="shrink-0">
                    <BloqueDones grupoIds={grupoIds} personajeId={form.id} />
                  </div>
                </div>

                {/* Descripción */}
                <textarea
                  className="w-full min-h-[80px] bg-transparent border border-primary/10 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed outline-none focus:border-primary/25 transition-colors resize-none placeholder:text-primary/20"
                  placeholder="Descripción del personaje…"
                  rows={4}
                  value={form.sobre ?? ""}
                  onChange={field("sobre")}
                />

                {/* Línea de tiempo */}
                <div className="rounded-xl overflow-hidden border border-primary/10">
                  <PersonajeLineaDeTiempo
                    fechaNacimiento={(form as any).fecha_nacimiento ?? null}
                    personajeId={form.id}
                    onFechaNacimientoChange={onFechaNacimientoChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar inline desktop */}
        <PersonajeSidebarPanel modo="inline" {...sidebarProps} />
      </div>

      {/* Drawer mobile */}
      {mobileAsideOpen && (
        <PersonajeSidebarPanel
          modo="drawer"
          {...sidebarProps}
          onCerrarDrawer={() => setMobileAsideOpen(false)}
        />
      )}
    </div>
  );
}

// ─── EditorPersonaje ──────────────────────────────────────────────────────────
export function EditorPersonaje({
  item,
  onSaved,
  onDeleted,
  entities = [],
  onNavigate,
  onSelectPersonaje,
  onOpenGrupo,
  onNavigateCiudad,
  onSelectCancion,
}: {
  item: Personaje;
  onSaved: (p: Personaje) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onNavigate?: (tab: "criaturas" | "reinos", nombre: string) => void;
  onSelectPersonaje?: (id: string) => void;
  onOpenGrupo?: (id: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onSelectCancion?: (id: string) => void;
}) {
  const [form, setForm] = useState<Personaje>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("personajes")
        .update({
          nombre: form.nombre,
          img_url: form.img_url || null,
          img_cuerpo_url: form.img_cuerpo_url || null,
          sobre: form.sobre,
          reino: form.reino,
          especie: form.especie,
          caracteristicas: form.caracteristicas || null,
          variante_id: (form as any).variante_id || null,
          ciudad_id: (form as any).ciudad_id || null,
          fecha_nacimiento: (form as any).fecha_nacimiento ?? null,
        })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("personajes", form);
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
    await supabase.from("personajes").delete().eq("id", form.id);
    void dexieDelete("personajes", form.id);
    onDeleted(form.id);
  };

  return (
    <>
      <ConfirmModal />
      <FormularioPersonaje
        entities={entities}
        form={form}
        setForm={setForm}
        status={status}
        onDelete={del}
        onNavigate={onNavigate}
        onNavigateCiudad={onNavigateCiudad}
        onOpenGrupo={onOpenGrupo}
        onSave={save}
        onSelectCancion={onSelectCancion}
        onSelectPersonaje={onSelectPersonaje}
      />
    </>
  );
}
