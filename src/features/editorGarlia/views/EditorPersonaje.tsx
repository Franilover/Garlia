"use client";
import Image from "next/image";

import {
  Maximize2,
  UserCircle2,
  BookOpen,
  Loader2,
  ChevronDown,
  X,
  Save,
  Trash2,
  Check,
  Sparkles,
  Users,
  Camera,
  SlidersHorizontal,
  Music2,
  Plus,
  Clock,
  CalendarDays,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import { WikiEntity } from "@/components/forms/Markdown/MarkdownEditor";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { BloqueDones } from "../components/BloqueDones";
import { BloqueRelaciones } from "../components/BloqueRelaciones";
import {
  SelectorFechaMundo,
  FechaMundoBadge,
  useCalendario,
} from "../components/EditorLineaTiempo";
import { useNombresDeTabla } from "../components/hooks";
import { type Personaje, type SaveStatus } from "../components/types";
import { SelectorImagen, SaveIndicator } from "../components/UIComponents";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local
      .map((r: any) => r.id)
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── Bloque capítulos en los que aparece ─────────────────────────────────────
type CapAparece = {
  id: string;
  orden: number;
  titulo_capitulo: string;
  libro_titulo?: string | null;
  libro_id?: string | null;
};

// Cache en memoria para no re-escanear Dexie si ya cargamos este personaje
const _capsCache = new Map<string, CapAparece[]>();

function mapCap(c: any, libroMap: Record<string, string>): CapAparece {
  return {
    id: c.id,
    orden: c.orden ?? 0,
    titulo_capitulo: c.titulo_capitulo ?? "Sin título",
    libro_titulo: libroMap[c.libro_id] ?? null,
    libro_id: c.libro_id ?? null,
  };
}

function useCapitulosConPersonaje(personajeId: string): {
  caps: CapAparece[];
  loading: boolean;
} {
  const cached = _capsCache.get(personajeId);
  const [caps, setCaps] = useState<CapAparece[]>(cached ?? []);
  // Solo mostramos spinner si no hay nada en caché
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // ── 1. Dexie (stale-while-revalidate) ────────────────────────────────
      // Solo escaneamos si no teníamos caché (evita trabajo repetido al
      // cambiar de personaje rápidamente)
      if (!_capsCache.has(personajeId)) {
        try {
          if (db) {
            // toArray una sola vez y filtra en memoria — no hay índice en
            // personajes_ids[], así que es inevitable, pero lo hacemos sin
            // bloquear la UI gracias al estado inicial vacío + loading
            const [allCaps, allLibros]: [any[], any[]] = await Promise.all([
              (db as any).capitulos?.toArray() ?? [],
              (db as any).libros?.toArray() ?? [],
            ]);
            if (cancelled) return;
            const libroMap = Object.fromEntries(
              (allLibros as any[]).map((l: any) => [l.id, l.titulo]),
            );
            const filtered = (allCaps as any[])
              .filter((c: any) =>
                (c.personajes_ids ?? []).includes(personajeId),
              )
              .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
              .map((c: any) => mapCap(c, libroMap));
            if (filtered.length > 0) {
              _capsCache.set(personajeId, filtered);
              setCaps(filtered);
            }
            setLoading(false);
            if (!navigator.onLine) return;
          }
        } catch {
          setLoading(false);
        }
      }

      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      // ── 2. Supabase en background (actualiza sin spinner) ─────────────────
      try {
        const { data } = await supabase
          .from("capitulos")
          .select(
            "id, orden, titulo_capitulo, libro_id, libros!libro_id(titulo)",
          )
          .contains("personajes_ids", [personajeId])
          .order("orden");
        if (cancelled) return;
        const fresh = (data ?? []).map((c: any) => ({
          id: c.id,
          orden: c.orden ?? 0,
          titulo_capitulo: c.titulo_capitulo ?? "Sin título",
          libro_titulo:
            (Array.isArray(c.libros)
              ? c.libros[0]?.titulo
              : c.libros?.titulo) ?? null,
          libro_id: c.libro_id ?? null,
        }));
        _capsCache.set(personajeId, fresh);
        setCaps(fresh);
      } catch {}
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [personajeId]);

  return { caps, loading };
}

function BloqueCapsAparece({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosConPersonaje(personajeId);

  const navigateToCap = (cap: CapAparece) => {
    if (!cap.libro_id) return;
    localStorage.setItem("estudio-caps-last-cap", cap.id);
    localStorage.setItem("estudio-caps-last-libro", cap.libro_id);
    window.dispatchEvent(new Event("estudio-caps-action"));
  };

  if (loading)
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="animate-spin text-primary/15" size={12} />
      </div>
    );
  if (!caps.length)
    return (
      <p className="text-[7px] font-black text-primary/20 uppercase tracking-[0.2em] text-center py-3 italic">
        Sin apariciones
      </p>
    );
  return (
    <div>
      {caps.map((cap) => (
        <button
          key={cap.id}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/[0.04] transition-colors text-left group disabled:opacity-40 disabled:cursor-default cursor-pointer border-b border-primary/[0.04] last:border-0"
          disabled={!cap.libro_id}
          type="button"
          onClick={() => navigateToCap(cap)}
        >
          <span className="shrink-0 text-[7px] font-black tabular-nums text-accent/50 w-4 text-right leading-none">
            {cap.orden}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-primary/70 truncate uppercase tracking-wide leading-tight group-hover:text-primary transition-colors">
              {cap.titulo_capitulo}
            </p>
            {cap.libro_titulo && (
              <p className="text-[7px] text-primary/25 truncate leading-tight">
                {cap.libro_titulo}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Bloque canciones del personaje ──────────────────────────────────────────
type CancionMin = {
  id: string;
  titulo: string;
  cantante: string | null;
  portada_url: string | null;
};

function useCancionesPersonaje(
  personajeId: string,
  nombrePersonaje: string,
): { canciones: CancionMin[]; loading: boolean } {
  const [canciones, setCanciones] = useState<CancionMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Dexie primero
    try {
      if (db) {
        const todas: any[] = (await (db as any).canciones?.toArray()) ?? [];
        const nombre = nombrePersonaje?.trim().toLowerCase() ?? "";
        const filtered = todas.filter(
          (c: any) =>
            c.personaje_id === personajeId ||
            c.id === personajeId ||
            (nombre && c.titulo?.toLowerCase().includes(nombre)),
        );
        if (filtered.length > 0) {
          setCanciones(
            filtered.map((c: any) => ({
              id: c.id,
              titulo: c.titulo ?? "Sin título",
              cantante: c.cantante ?? null,
              portada_url: c.portada_url ?? null,
            })),
          );
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    // 2. Supabase: por personaje_id, por id o por título con nombre del personaje
    try {
      const nombre = nombrePersonaje?.trim() ?? "";
      let query = supabase
        .from("canciones")
        .select("id, titulo, cantante, portada_url");

      if (nombre) {
        query = query.or(
          `personaje_id.eq.${personajeId},id.eq.${personajeId},titulo.ilike.%${nombre}%`,
        );
      } else {
        query = query.or(`personaje_id.eq.${personajeId},id.eq.${personajeId}`);
      }

      const { data } = await query.order("titulo");
      setCanciones(
        (data ?? []).map((c: any) => ({
          id: c.id,
          titulo: c.titulo ?? "Sin título",
          cantante: c.cantante ?? null,
          portada_url: c.portada_url ?? null,
        })),
      );
    } catch {}
    setLoading(false);
  }, [personajeId, nombrePersonaje]);

  useEffect(() => {
    load();
  }, [load]);

  return { canciones, loading };
}

function BloqueCanciones({
  personajeId,
  nombrePersonaje,
  onSelect,
}: {
  personajeId: string;
  nombrePersonaje: string;
  onSelect?: (id: string) => void;
}) {
  const { canciones, loading } = useCancionesPersonaje(
    personajeId,
    nombrePersonaje,
  );

  if (loading)
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="animate-spin text-primary/15" size={12} />
      </div>
    );
  if (!canciones.length)
    return (
      <p className="text-[7px] font-black text-primary/20 uppercase tracking-[0.2em] text-center py-3 italic">
        Sin canciones
      </p>
    );
  return (
    <div>
      {canciones.map((c) => (
        <button
          key={c.id}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/[0.04] transition-colors text-left group disabled:cursor-default cursor-pointer border-b border-primary/[0.04] last:border-0"
          disabled={!onSelect}
          type="button"
          onClick={() => onSelect?.(c.id)}
        >
          {c.portada_url ? (
            <div className="shrink-0 w-4 h-4 rounded overflow-hidden border border-primary/10">
              <Image
                alt={c.titulo}
                className="w-full h-full object-cover"
                src={c.portada_url}
              />
            </div>
          ) : (
            <Music2 className="shrink-0 text-primary/20" size={9} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-primary/70 truncate uppercase tracking-wide leading-tight group-hover:text-primary transition-colors">
              {c.titulo}
            </p>
            {c.cantante && (
              <p className="text-[7px] text-primary/25 truncate leading-tight">
                {c.cantante}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Image cuerpo (mobile picker) ─────────────────────────────────────────────
function PickerCuerpo({
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
                <Maximize2 size={11} /> Imagen cuerpo
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
      {value ? (
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-[10px] font-black uppercase tracking-widest text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
          onClick={() => setOpen(true)}
        >
          <div className="w-5 h-5 rounded overflow-hidden border border-primary/15 shrink-0">
            <Image
              alt="Cuerpo"
              className="w-full h-full object-cover"
              src={value}
            />
          </div>
          Cambiar cuerpo
        </button>
      ) : (
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
          onClick={() => setOpen(true)}
        >
          <Maximize2 size={11} /> + Imagen cuerpo
        </button>
      )}
    </>
  );
}

// ─── Botón flotante para cambiar imagen cara en mobile ────────────────────────
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

// ─── Hook: grupos de criaturas a partir del nombre de especie ────────────────
// Resuelve la criatura por nombre y luego busca en qué grupos está,
// para pasarlos directamente a BloqueHechizos / BloqueDones.
function useGruposDeCriaturaPorNombre(
  nombreEspecie: string | null | undefined,
): string[] {
  const [grupoIds, setGrupoIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) {
      setGrupoIds([]);
      return;
    }

    // 1. Dexie: buscar criatura y sus grupos
    let criaturaId: string | null = null;
    try {
      if (db) {
        const allCriaturas: any[] =
          (await (db as any).criaturas?.toArray()) ?? [];
        const criLocal = allCriaturas.find(
          (c: any) =>
            c.nombre?.toLowerCase() === nombreEspecie.trim().toLowerCase(),
        );
        if (criLocal) {
          criaturaId = criLocal.id;
          const allGrupos: any[] =
            (await (db as any).grupos_mundo?.toArray()) ?? [];
          const ids = allGrupos
            .filter(
              (g: any) =>
                g.tipo === "criaturas" &&
                (g.miembro_ids ?? []).includes(criaturaId),
            )
            .map((g: any) => g.id);
          if (ids.length) {
            setGrupoIds(ids);
            if (!navigator.onLine) return;
          }
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    // 2. Supabase: resolver criatura si no se encontró en Dexie
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
      return;
    }

    // 3. Supabase: grupos de criaturas que contienen este ID
    const { data: grupos } = await supabase
      .from("grupos_mundo")
      .select("id, miembro_ids")
      .eq("tipo", "criaturas")
      .contains("miembro_ids", [criaturaId]);
    setGrupoIds((grupos ?? []).map((g: any) => g.id));
  }, [nombreEspecie]);

  useEffect(() => {
    load();
  }, [load]);

  return grupoIds;
}

// ─── Hook: variantes de una criatura por nombre ───────────────────────────────
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

    // 1. Dexie primero
    try {
      if (db) {
        const allCriaturas: any[] =
          (await (db as any).criaturas?.toArray()) ?? [];
        const criLocal = allCriaturas.find(
          (c: any) =>
            c.nombre?.toLowerCase() === nombreEspecie.trim().toLowerCase(),
        );
        if (criLocal) {
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

// ─── Hook: nombres de ciudades (para el selector) ─────────────────────────────
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

// ─── Hook: reinos con id (para filtrar ciudades) ───────────────────────────────
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

// ─── Hook: grupos a los que pertenece el personaje ───────────────────────────
type GrupoMin = { id: string; nombre: string; tipo: string };

function useGruposDelPersonaje(personajeId: string): {
  grupos: GrupoMin[];
  loading: boolean;
} {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dexie primero
      if (db) {
        const todos: any[] = (await (db as any).grupos_mundo?.toArray()) ?? [];
        const local = todos.filter(
          (g: any) =>
            g.tipo === "personajes" &&
            (g.miembro_ids ?? []).includes(personajeId),
        );
        if (local.length) {
          setGrupos(
            local.map((g: any) => ({
              id: g.id,
              nombre: g.nombre,
              tipo: g.tipo,
            })),
          );
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    // 2. Supabase
    try {
      const { data } = await supabase
        .from("grupos_mundo")
        .select("id, nombre, tipo")
        .eq("tipo", "personajes")
        .contains("miembro_ids", [personajeId]);
      setGrupos(
        (data ?? []).map((g: any) => ({
          id: g.id,
          nombre: g.nombre,
          tipo: g.tipo,
        })),
      );
    } catch {}
    setLoading(false);
  }, [personajeId]);

  useEffect(() => {
    load();
  }, [load]);

  return { grupos, loading };
}

// ─── Bloque grupos del personaje ─────────────────────────────────────────────
function BloqueGruposPersonaje({
  personajeId,
  onOpenGrupo,
}: {
  personajeId: string;
  onOpenGrupo?: (id: string) => void;
}) {
  const { grupos, loading } = useGruposDelPersonaje(personajeId);

  if (loading)
    return (
      <div className="rounded-xl overflow-hidden border border-primary/10">
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
          <Users className="text-primary/25 shrink-0" size={8} />
          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
            Grupos
          </span>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary/20" size={14} />
        </div>
      </div>
    );

  if (!grupos.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
        <Users className="text-primary/25 shrink-0" size={8} />
        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
          Grupos
        </span>
      </div>
      <div>
        {grupos.map((g) => (
          <button
            key={g.id}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/[0.04] transition-colors text-left group border-b border-primary/[0.04] last:border-0"
            onClick={() => onOpenGrupo?.(g.id)}
          >
            <Users
              className="shrink-0 text-primary/20 group-hover:text-primary/40 transition-colors"
              size={8}
            />
            <span className="text-[8px] font-black uppercase tracking-wide text-primary/50 group-hover:text-primary/80 transition-colors truncate leading-tight">
              {g.nombre}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Hook: hechizos disponibles (por grupoIds) + seleccionados del personaje ──
type HechizMin = { id: string; nombre: string; imagen_url?: string | null };

function useHechizosPersonaje(personajeId: string, grupoIds: string[]) {
  const [disponibles, setDisponibles] = useState<HechizMin[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Hechizos disponibles (filtrados por grupoIds si los hay)
      let hechizosData: HechizMin[] = [];
      try {
        if (db) {
          const todos: any[] = (await (db as any).hechizos?.toArray()) ?? [];
          hechizosData = todos
            .filter((h: any) => {
              if (!grupoIds.length) return true;
              return (h.grupo_ids ?? []).some((gid: string) =>
                grupoIds.includes(gid),
              );
            })
            .map((h: any) => ({
              id: h.id,
              nombre: h.nombre,
              imagen_url: null,
            }));
        }
      } catch {}

      if (!hechizosData.length && navigator.onLine) {
        let query = supabase
          .from("hechizos")
          .select("id, nombre")
          .order("nombre");
        if (grupoIds.length) {
          query = (query as any).overlaps("grupo_ids", grupoIds);
        }
        const { data } = await query;
        hechizosData = (data ?? []).map((h: any) => ({
          id: h.id,
          nombre: h.nombre,
          imagen_url: null,
        }));
      }
      setDisponibles(hechizosData);

      // 2. Hechizos seleccionados del personaje
      let selIds: string[] = [];
      try {
        if (db) {
          const local: any[] =
            (await (db as any).personaje_hechizos
              ?.where("personaje_id")
              .equals(personajeId)
              .toArray()) ?? [];
          selIds = local.map((r: any) => r.hechizo_id);
        }
      } catch {}

      if (!selIds.length && navigator.onLine) {
        const { data } = await supabase
          .from("personaje_hechizos")
          .select("hechizo_id")
          .eq("personaje_id", personajeId);
        selIds = (data ?? []).map((r: any) => r.hechizo_id);
      }
      setSelectedIds(selIds);
    } catch {}
    setLoading(false);
  }, [personajeId, grupoIds.join(",")]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (hechizId: string, add: boolean) => {
      setSelectedIds((prev) =>
        add ? [...prev, hechizId] : prev.filter((id) => id !== hechizId),
      );
      setSaving(true);
      try {
        if (add) {
          await supabase
            .from("personaje_hechizos")
            .insert({ personaje_id: personajeId, hechizo_id: hechizId });
          try {
            if (db)
              await (db as any).personaje_hechizos?.put({
                id: `${personajeId}_${hechizId}`,
                personaje_id: personajeId,
                hechizo_id: hechizId,
              });
          } catch {}
        } else {
          await supabase
            .from("personaje_hechizos")
            .delete()
            .eq("personaje_id", personajeId)
            .eq("hechizo_id", hechizId);
          try {
            if (db)
              await (db as any).personaje_hechizos?.delete(
                `${personajeId}_${hechizId}`,
              );
          } catch {}
        }
      } catch {
        setSelectedIds((prev) =>
          add ? prev.filter((id) => id !== hechizId) : [...prev, hechizId],
        );
      }
      setSaving(false);
    },
    [personajeId],
  );

  return { disponibles, selectedIds, loading, saving, toggle };
}

function SeccionHechizos({
  personajeId,
  grupoIds,
}: {
  personajeId: string;
  grupoIds: string[];
}) {
  const { disponibles, selectedIds, loading, saving, toggle } =
    useHechizosPersonaje(personajeId, grupoIds);
  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <SeccionEntidad
        allEntities={disponibles}
        emptyLabel="Sin hechizos"
        fallbackIcon={<Sparkles size={10} />}
        icon={<Sparkles size={10} />}
        label="Hechizos"
        loading={loading}
        saving={saving}
        selectedIds={selectedIds}
        onToggle={toggle}
      />
    </div>
  );
}

// ─── BloqueEras ──────────────────────────────────────────────────────────────
type Era = {
  id: string;
  momento: number;
  label: string;
  rasgos: string[];
  notas: string;
  _saving?: boolean;
};

function calcularEdad(
  diaAbsolutoEra: number,
  diaAbsolutoNacimiento: number,
  diasPorAnio: number,
): number {
  if (diasPorAnio <= 0) return 0;
  return Math.floor((diaAbsolutoEra - diaAbsolutoNacimiento) / diasPorAnio);
}

function BloqueEras({
  personajeId,
  fechaNacimiento,
  onFechaNacimientoChange,
}: {
  personajeId: string;
  fechaNacimiento?: number | null;
  onFechaNacimientoChange?: (dia: number | null) => void;
}) {
  const { cal } = useCalendario();
  // Días por año del mundo según el calendario real (suma de duracion_dias de todas las estaciones)
  const diasPorAnio = React.useMemo(() => {
    if (!cal?.estaciones?.length) return 0;
    return cal.estaciones.reduce((sum, e) => sum + (e.duracion_dias ?? 0), 0);
  }, [cal]);

  const [eras, setEras] = useState<Era[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newMomento, setNewMomento] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Selector de cumpleaños inline (cuando el personaje aún no tiene fecha) ──
  const [cumpleSelectorOpen, setCumpleSelectorOpen] = useState(false);
  const [cumpleDraft, setCumpleDraft] = useState<number | null>(null);
  const [savingCumple, setSavingCumple] = useState(false);

  const handleGuardarCumple = async () => {
    if (cumpleDraft == null) return;
    setSavingCumple(true);
    try {
      await (supabase as any)
        .from("personajes")
        .update({ fecha_nacimiento: cumpleDraft })
        .eq("id", personajeId);
      // Actualizar Dexie para que el dato persista offline
      try {
        const existing = await (db as any)?.personajes?.get(personajeId);
        if (existing) {
          await (db as any)?.personajes?.put({
            ...existing,
            fecha_nacimiento: cumpleDraft,
          });
        }
      } catch {}
      onFechaNacimientoChange?.(cumpleDraft);
      setCumpleSelectorOpen(false);
      setCumpleDraft(null);
    } catch {}
    setSavingCumple(false);
  };

  useEffect(() => {
    if (!personajeId) return;
    setLoading(true);
    supabase
      .from("personaje_eras" as any)
      .select("id, momento, label, rasgos, notas")
      .eq("personaje_id", personajeId)
      .order("momento")
      .then(({ data }: { data: any }) => {
        setEras(
          (data ?? []).map((e: any) => ({
            id: e.id,
            momento: e.momento,
            label: e.label ?? "",
            rasgos: e.rasgos ?? [],
            notas: e.notas ?? "",
          })),
        );
        setLoading(false);
      });
  }, [personajeId]);

  const updateEra = (id: string, patch: Partial<Era>) =>
    setEras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleAddEra = async () => {
    const num = parseInt(newMomento.trim(), 10);
    if (isNaN(num)) return;
    // La era debe ser posterior al nacimiento
    if (fechaNacimiento != null && num <= fechaNacimiento) return;
    setCreating(true);
    const { data, error } = await (supabase as any)
      .from("personaje_eras")
      .insert({
        personaje_id: personajeId,
        momento: num,
        label: newLabel.trim() || null,
        rasgos: [],
        notas: "",
      })
      .select("id, momento, label, rasgos, notas")
      .single();
    if (!error && data) {
      const era: Era = {
        id: data.id,
        momento: data.momento,
        label: data.label ?? "",
        rasgos: [],
        notas: "",
      };
      setEras((prev) => [...prev, era].sort((a, b) => a.momento - b.momento));
      setExpandedId(era.id);
    }
    setNewMomento("");
    setNewLabel("");
    setAddingNew(false);
    setCreating(false);
  };

  const handleDeleteEra = async (id: string) => {
    setEras((prev) => prev.filter((e) => e.id !== id));
    await (supabase as any).from("personaje_eras").delete().eq("id", id);
  };

  const handleAddRasgo = async (era: Era, rasgo: string) => {
    const trimmed = rasgo.trim();
    if (!trimmed) return;
    const next = [...era.rasgos, trimmed];
    updateEra(era.id, { rasgos: next, _saving: true });
    await (supabase as any)
      .from("personaje_eras")
      .update({ rasgos: next })
      .eq("id", era.id);
    updateEra(era.id, { _saving: false });
  };

  const handleRemoveRasgo = async (era: Era, rasgo: string) => {
    const next = era.rasgos.filter((r) => r !== rasgo);
    updateEra(era.id, { rasgos: next, _saving: true });
    await (supabase as any)
      .from("personaje_eras")
      .update({ rasgos: next })
      .eq("id", era.id);
    updateEra(era.id, { _saving: false });
  };

  const notasTimers = React.useRef<Record<string, any>>({});
  const handleNotasChange = (era: Era, val: string) => {
    updateEra(era.id, { notas: val, _saving: true });
    clearTimeout(notasTimers.current[era.id]);
    notasTimers.current[era.id] = setTimeout(async () => {
      await (supabase as any)
        .from("personaje_eras")
        .update({ notas: val })
        .eq("id", era.id);
      updateEra(era.id, { _saving: false });
    }, 1200);
  };

  const labelTimers = React.useRef<Record<string, any>>({});
  const handleLabelChange = (era: Era, val: string) => {
    updateEra(era.id, { label: val, _saving: true });
    clearTimeout(labelTimers.current[era.id]);
    labelTimers.current[era.id] = setTimeout(async () => {
      await (supabase as any)
        .from("personaje_eras")
        .update({ label: val.trim() || null })
        .eq("id", era.id);
      updateEra(era.id, { _saving: false });
    }, 800);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
        <Clock className="text-primary/25 shrink-0" size={8} />
        <span className="flex-1 text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
          Línea de tiempo
        </span>
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
          style={{
            borderColor: addingNew
              ? "color-mix(in srgb, var(--primary) 25%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
            background: addingNew
              ? "color-mix(in srgb, var(--primary) 8%, transparent)"
              : "transparent",
            color: addingNew
              ? "var(--primary)"
              : "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={() => {
            setAddingNew((v) => {
              if (!v && fechaNacimiento != null)
                setNewMomento(String(fechaNacimiento));
              return !v;
            });
          }}
        >
          <Plus size={8} /> Era
        </button>
      </div>

      {addingNew && (
        <div
          className="px-3 py-2.5 border-b border-primary/[0.06] space-y-2"
          style={{
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div className="space-y-1.5">
            <SelectorFechaMundo
              placeholder="Seleccionar fecha…"
              value={newMomento ? parseInt(newMomento, 10) : null}
              onChange={(dia) => setNewMomento(dia != null ? String(dia) : "")}
            />
            {/* Aviso si la fecha elegida no es posterior al nacimiento */}
            {fechaNacimiento != null &&
              newMomento &&
              parseInt(newMomento, 10) <= fechaNacimiento && (
                <p className="text-[8px] font-black uppercase tracking-widest text-accent/70 italic">
                  La era debe ser posterior al cumpleaños
                </p>
              )}
            <input
              className="w-full rounded-lg border px-2 py-1 text-[9px] outline-none transition-all"
              placeholder="Etiqueta (opcional)"
              style={{
                background: "transparent",
                borderColor:
                  "color-mix(in srgb, var(--primary) 18%, transparent)",
                color: "var(--primary)",
              }}
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddEra();
                if (e.key === "Escape") setAddingNew(false);
              }}
            />
          </div>
          <div className="flex gap-1.5 justify-end">
            <button
              className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-primary/35 border-primary/10 hover:text-primary hover:border-primary/25"
              type="button"
              onClick={() => setAddingNew(false)}
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
              disabled={
                !newMomento.trim() ||
                creating ||
                (fechaNacimiento != null &&
                  parseInt(newMomento, 10) <= fechaNacimiento)
              }
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 20%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={handleAddEra}
            >
              {creating ? (
                <Loader2 className="animate-spin" size={8} />
              ) : (
                <Check size={8} />
              )}{" "}
              Crear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary/20" size={14} />
        </div>
      ) : (
        <div>
          {/* Nodo fijo: cumpleaños */}
          {fechaNacimiento != null && (
            <div className="border-b border-primary/[0.06]">
              <div className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
                <div
                  className="shrink-0 flex flex-col items-center"
                  style={{ width: 20 }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                    style={{
                      borderColor: "var(--accent)",
                      background: "var(--accent)",
                      boxShadow:
                        "0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <FechaMundoBadge diaAbsoluto={fechaNacimiento} />
                  <span
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{
                      color: "var(--accent)",
                    }}
                  >
                    ✦ Nacimiento
                  </span>
                </div>
              </div>
            </div>
          )}

          {eras.length === 0 && fechaNacimiento == null && (
            <div className="px-3 py-3 space-y-2">
              {!cumpleSelectorOpen ? (
                <button
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-[8px] font-black uppercase tracking-widest transition-all"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--accent) 30%, transparent)",
                    color: "color-mix(in srgb, var(--accent) 60%, transparent)",
                    background:
                      "color-mix(in srgb, var(--accent) 4%, transparent)",
                  }}
                  type="button"
                  onClick={() => setCumpleSelectorOpen(true)}
                >
                  <CalendarDays size={9} /> Asignar fecha de nacimiento
                </button>
              ) : (
                <div
                  className="space-y-2 p-2.5 rounded-xl border"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--accent) 20%, transparent)",
                    background:
                      "color-mix(in srgb, var(--accent) 4%, transparent)",
                  }}
                >
                  <p
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--accent) 60%, transparent)",
                    }}
                  >
                    ✦ Fecha de nacimiento
                  </p>
                  <SelectorFechaMundo
                    placeholder="Seleccionar cumpleaños…"
                    value={cumpleDraft}
                    onChange={(dia) => setCumpleDraft(dia)}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-primary/35 border-primary/10 hover:text-primary hover:border-primary/25"
                      type="button"
                      onClick={() => {
                        setCumpleSelectorOpen(false);
                        setCumpleDraft(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
                      disabled={cumpleDraft == null || savingCumple}
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 12%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--accent) 25%, transparent)",
                        color: "var(--accent)",
                      }}
                      type="button"
                      onClick={handleGuardarCumple}
                    >
                      {savingCumple ? (
                        <Loader2 className="animate-spin" size={8} />
                      ) : (
                        <Check size={8} />
                      )}{" "}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {eras.length === 0 && fechaNacimiento != null && (
            <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest text-center py-3 italic">
              Agrega una era para continuar la historia
            </p>
          )}

          {/* Banner de cumpleaños cuando hay eras pero aún no se asignó fecha */}
          {eras.length > 0 && fechaNacimiento == null && (
            <div
              className="mx-3 my-2 px-2.5 py-2 rounded-xl border border-dashed space-y-1.5"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--accent) 25%, transparent)",
                background: "color-mix(in srgb, var(--accent) 3%, transparent)",
              }}
            >
              {!cumpleSelectorOpen ? (
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all py-1"
                  style={{
                    color: "color-mix(in srgb, var(--accent) 55%, transparent)",
                  }}
                  type="button"
                  onClick={() => setCumpleSelectorOpen(true)}
                >
                  <CalendarDays size={9} /> Asignar fecha de nacimiento
                </button>
              ) : (
                <div className="space-y-2">
                  <p
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--accent) 60%, transparent)",
                    }}
                  >
                    ✦ Fecha de nacimiento
                  </p>
                  <SelectorFechaMundo
                    placeholder="Seleccionar cumpleaños…"
                    value={cumpleDraft}
                    onChange={(dia) => setCumpleDraft(dia)}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-primary/35 border-primary/10 hover:text-primary hover:border-primary/25"
                      type="button"
                      onClick={() => {
                        setCumpleSelectorOpen(false);
                        setCumpleDraft(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
                      disabled={cumpleDraft == null || savingCumple}
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 12%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--accent) 25%, transparent)",
                        color: "var(--accent)",
                      }}
                      type="button"
                      onClick={handleGuardarCumple}
                    >
                      {savingCumple ? (
                        <Loader2 className="animate-spin" size={8} />
                      ) : (
                        <Check size={8} />
                      )}{" "}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {eras.map((era, idx) => (
            <EraItem
              key={era.id}
              diasPorAnio={diasPorAnio}
              edad={
                fechaNacimiento != null && diasPorAnio > 0
                  ? calcularEdad(era.momento, fechaNacimiento, diasPorAnio)
                  : null
              }
              era={era}
              isLast={idx === eras.length - 1}
              isOpen={expandedId === era.id}
              onAddRasgo={(r) => handleAddRasgo(era, r)}
              onDelete={() => handleDeleteEra(era.id)}
              onLabelChange={(v) => handleLabelChange(era, v)}
              onNotasChange={(v) => handleNotasChange(era, v)}
              onRemoveRasgo={(r) => handleRemoveRasgo(era, r)}
              onToggle={() =>
                setExpandedId(expandedId === era.id ? null : era.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EraItem({
  era,
  isOpen,
  isLast,
  onToggle,
  onDelete,
  onAddRasgo,
  onRemoveRasgo,
  onNotasChange,
  onLabelChange,
  edad,
}: {
  era: Era;
  isOpen: boolean;
  isLast: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddRasgo: (r: string) => void;
  onRemoveRasgo: (r: string) => void;
  onNotasChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  edad: number | null;
  diasPorAnio: number;
}) {
  const [nuevoRasgo, setNuevoRasgo] = useState("");

  return (
    <div className={!isLast ? "border-b border-primary/[0.06]" : ""}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-primary/[0.03] transition-colors"
        type="button"
        onClick={onToggle}
      >
        {/* Nodo de línea de tiempo */}
        <div
          className="shrink-0 flex flex-col items-center"
          style={{ width: 20 }}
        >
          <div className="w-2 h-2 rounded-full border-2 border-accent bg-bg-main shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <FechaMundoBadge diaAbsoluto={era.momento} />
            {edad !== null && edad >= 0 && (
              <span
                className="px-1.5 py-0 rounded-full text-[7px] font-black uppercase border tracking-widest"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent) 8%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--accent) 20%, transparent)",
                  color: "var(--accent)",
                }}
              >
                {edad} {edad === 1 ? "año" : "años"}
              </span>
            )}
            {era.label && (
              <span className="text-[8px] font-bold text-primary/35 italic truncate">
                {era.label}
              </span>
            )}
          </div>
          {!isOpen && era.rasgos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {era.rasgos.slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="px-1.5 py-0 rounded-full text-[7px] font-black uppercase border"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 5%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--primary) 12%, transparent)",
                    color:
                      "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                >
                  {r}
                </span>
              ))}
              {era.rasgos.length > 3 && (
                <span className="text-[7px] text-primary/25 font-black">
                  +{era.rasgos.length - 3}
                </span>
              )}
              {era.notas && (
                <span className="text-[7px] text-primary/20 italic truncate max-w-[80px]">
                  {era.notas.slice(0, 30)}…
                </span>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {era._saving && (
            <Loader2 className="animate-spin text-primary/30" size={8} />
          )}
          <ChevronDown
            className="text-primary/25 transition-transform"
            size={9}
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 ml-5 space-y-2.5 border-l-2 border-accent/20 ml-8">
          {/* Nombre del período */}
          <div className="pt-1">
            <input
              className="w-full rounded-lg border px-2 py-1.5 text-[9px] font-bold outline-none transition-all placeholder:font-normal"
              maxLength={60}
              placeholder="Nombre del período (ej: Infancia, Exilio…)"
              style={{
                background: era.label
                  ? "color-mix(in srgb, var(--primary) 4%, transparent)"
                  : "transparent",
                borderColor: era.label
                  ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
              type="text"
              value={era.label}
              onChange={(e) => onLabelChange(e.target.value)}
            />
          </div>
          {/* Chips */}
          <div className="space-y-1.5">
            {era.rasgos.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {era.rasgos.map((rasgo) => (
                  <span
                    key={rasgo}
                    className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border transition-all"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 6%, transparent)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color:
                        "color-mix(in srgb, var(--primary) 60%, transparent)",
                    }}
                  >
                    {rasgo}
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--accent)", lineHeight: 1 }}
                      type="button"
                      onClick={() => onRemoveRasgo(rasgo)}
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <input
                className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase outline-none transition-all placeholder:normal-case placeholder:font-normal"
                maxLength={40}
                placeholder="Añadir rasgo…"
                style={{
                  background: nuevoRasgo
                    ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                    : "transparent",
                  borderColor: nuevoRasgo
                    ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                    : "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                }}
                type="text"
                value={nuevoRasgo}
                onChange={(e) => setNuevoRasgo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddRasgo(nuevoRasgo);
                    setNuevoRasgo("");
                  }
                  if (e.key === "Escape") setNuevoRasgo("");
                }}
              />
              <button
                className="shrink-0 flex items-center justify-center rounded-lg border transition-all disabled:opacity-20"
                disabled={!nuevoRasgo.trim()}
                style={{
                  width: 22,
                  height: 22,
                  background: nuevoRasgo.trim()
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "transparent",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 15%, transparent)",
                  color: "var(--primary)",
                }}
                type="button"
                onClick={() => {
                  onAddRasgo(nuevoRasgo);
                  setNuevoRasgo("");
                }}
              >
                <Plus size={9} />
              </button>
            </div>
          </div>

          <textarea
            className="w-full rounded-lg border px-2 py-1.5 text-[9px] leading-relaxed outline-none transition-all resize-none"
            placeholder="Notas sobre este momento…"
            rows={3}
            style={{
              background: era.notas
                ? "color-mix(in srgb, var(--primary) 4%, transparent)"
                : "transparent",
              borderColor: era.notas
                ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                : "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
            }}
            value={era.notas}
            onChange={(e) => onNotasChange(e.target.value)}
          />

          <div className="flex justify-end">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all"
              style={{
                color: "var(--accent)",
                borderColor:
                  "color-mix(in srgb, var(--accent) 20%, transparent)",
                background: "transparent",
              }}
              type="button"
              onClick={onDelete}
            >
              <Trash2 size={8} /> Eliminar era
            </button>
          </div>
        </div>
      )}
    </div>
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
  const reinos = useNombresDeTabla("reinos");
  const ciudades = useCiudades();
  const reinosMin = useReinosMin();
  const variantes = useCriaturaVariantesPorNombre(form.especie);
  const grupoIds = useGruposDeCriaturaPorNombre(form.especie);

  // ID del reino actualmente seleccionado
  const reinoSeleccionadoId =
    reinosMin.find((r) => r.nombre === form.reino)?.id ?? null;

  // ── Combo 1: "Territorio" — solo reinos ──────────────────────────────────
  const itemsTerritorioSinReino: import("@/components/ui/ComboSelector").ComboItem[] =
    reinosMin.map((r) => ({ id: `reino:${r.id}`, label: r.nombre }));
  const gruposTerritorio: import("@/components/ui/ComboSelector").ComboGroup[] =
    [];

  // Valor actual del combo territorio (prefijado)
  const territorioValue: string | null = (() => {
    if (form.reino) {
      const r = reinosMin.find((x) => x.nombre === form.reino);
      if (r) return `reino:${r.id}`;
    }
    return null;
  })();

  const onTerritorioChange = (val: string | null) => {
    if (!val) {
      setForm((f) => ({ ...f, reino: "", ciudad_id: null }) as any);
      return;
    }
    if (val.startsWith("reino:")) {
      const reinoId = val.replace("reino:", "");
      const r = reinosMin.find((x) => x.id === reinoId);
      setForm(
        (f) => ({ ...f, reino: r?.nombre ?? "", ciudad_id: null }) as any,
      );
    }
  };

  // ── Combo 2: "Ubicación" — ciudades del reino ─────────────────────────────
  const ciudadesFiltradas = ciudades.filter((l) =>
    reinoSeleccionadoId ? l.reino_id === reinoSeleccionadoId : !l.reino_id,
  );

  const itemsUbicacion: import("@/components/ui/ComboSelector").ComboItem[] =
    ciudadesFiltradas.map((l) => ({ id: `ciudad:${l.id}`, label: l.nombre }));
  const gruposUbicacion: import("@/components/ui/ComboSelector").ComboGroup[] =
    [];

  // Valor actual del combo ubicación (prefijado)
  const ubicacionValue: string | null = (() => {
    if ((form as any).ciudad_id) return `ciudad:${(form as any).ciudad_id}`;
    return null;
  })();

  const onUbicacionChange = (val: string | null) => {
    if (!val) {
      setForm((f) => ({ ...f, ciudad_id: null }) as any);
      return;
    }
    if (val.startsWith("ciudad:")) {
      setForm((f) => ({ ...f, ciudad_id: val.replace("ciudad:", "") }) as any);
    }
  };
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  const field =
    (k: keyof Personaje) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Fixed header ───────────────────────────────────────────────────── */}
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
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* IDENTIDAD */}
        <div className="p-3">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Columna izquierda: imagen cara + cuerpo apilados */}
            <div className="shrink-0 w-full sm:w-52 flex sm:flex-col gap-3 sm:gap-2">
              {/* Mobile: imagen grande con botón flotante */}
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
                    onChange={(url) => setForm((f) => ({ ...f, img_url: url }))}
                  />
                </div>
              </div>

              {/* Desktop: selector normal con label */}
              <div className="hidden sm:block w-full">
                <SelectorImagen
                  aspect="square"
                  label="Cara"
                  placeholder={<UserCircle2 className="opacity-25" size={20} />}
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
            </div>

            {/* Columna derecha: selectores + descripción + resto */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Mobile: grid 2×2 (Especie/Reino · Ciudad/Don) */}
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
                      setForm((f) => ({
                        ...f,
                        especie: v ?? "",
                        variante_id: null,
                      }))
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
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!form.variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, variante_id: null }))
                        }
                      >
                        Todas
                      </button>
                      {variantes.map((v) => (
                        <button
                          key={v.id}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${form.variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, variante_id: v.id }))
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
                  groups={gruposTerritorio}
                  items={itemsTerritorioSinReino}
                  label="Territorio"
                  mode="single"
                  noneLabel="Sin territorio"
                  placeholder="Reino…"
                  value={territorioValue}
                  onChange={onTerritorioChange}
                  onNavigate={
                    onNavigate
                      ? (id) => {
                          if (id.startsWith("reino:")) {
                            const r = reinosMin.find(
                              (x) => x.id === id.replace("reino:", ""),
                            );
                            if (r) onNavigate("reinos", r.nombre);
                          }
                        }
                      : undefined
                  }
                />
                {(() => {
                  return (
                    <ComboSelector
                      allowNone
                      groups={gruposUbicacion}
                      items={itemsUbicacion}
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
                  );
                })()}
                <div className="space-y-1.5">
                  <BloqueDones grupoIds={grupoIds} personajeId={form.id} />
                </div>
              </div>

              {/* Desktop: layout original (fila de 3 + Don al lado) */}
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
                        setForm((f) => ({
                          ...f,
                          especie: v ?? "",
                          variante_id: null,
                        }))
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
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!form.variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, variante_id: null }))
                          }
                        >
                          Todas
                        </button>
                        {variantes.map((v) => (
                          <button
                            key={v.id}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${form.variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, variante_id: v.id }))
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
                    groups={gruposTerritorio}
                    items={itemsTerritorioSinReino}
                    label="Territorio"
                    mode="single"
                    noneLabel="Sin territorio"
                    placeholder="Reino…"
                    value={territorioValue}
                    onChange={onTerritorioChange}
                    onNavigate={
                      onNavigate
                        ? (id) => {
                            if (id.startsWith("reino:")) {
                              const r = reinosMin.find(
                                (x) => x.id === id.replace("reino:", ""),
                              );
                              if (r) onNavigate("reinos", r.nombre);
                            }
                          }
                        : undefined
                    }
                  />
                  {(() => {
                    return (
                      <ComboSelector
                        allowNone
                        groups={gruposUbicacion}
                        items={itemsUbicacion}
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
                    );
                  })()}
                </div>

                {/* Don — mismo estilo que Especie / Reino */}
                <div className="w-full sm:w-44 sm:shrink-0 space-y-1.5">
                  <BloqueDones grupoIds={grupoIds} personajeId={form.id} />
                </div>
              </div>

              {/* ── Bloques laterales — solo desktop, inline ───────────────── */}
              <div className="hidden sm:block mt-4 space-y-3">
                <BloqueEras
                  fechaNacimiento={(form as any).fecha_nacimiento ?? null}
                  personajeId={form.id}
                  onFechaNacimientoChange={(dia) => {
                    const updated = {
                      ...form,
                      fecha_nacimiento: dia ?? null,
                    } as any;
                    setForm(updated);
                    // Persistir en Dexie inmediatamente sin esperar el botón Guardar
                    void dexiePut("personajes", updated);
                  }}
                />

                <BloqueRelaciones
                  personajeId={form.id}
                  onSelectPersonaje={onSelectPersonaje}
                />

                {/* Capítulos + Canciones + Grupos en 3 columnas */}
                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
                    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
                      <BookOpen className="text-primary/25 shrink-0" size={8} />
                      <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
                        Capítulos
                      </span>
                    </div>
                    <BloqueCapsAparece personajeId={form.id} />
                  </div>

                  <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
                    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
                      <Music2 className="text-primary/25 shrink-0" size={8} />
                      <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
                        Canciones
                      </span>
                    </div>
                    <BloqueCanciones
                      nombrePersonaje={form.nombre ?? ""}
                      personajeId={form.id}
                      onSelect={onSelectCancion}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <BloqueGruposPersonaje
                      personajeId={form.id}
                      onOpenGrupo={onOpenGrupo}
                    />
                  </div>
                </div>

                <SeccionHechizos grupoIds={grupoIds} personajeId={form.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

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
              width: "240px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            {/* Header del drawer */}
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <span
                className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5"
                style={{
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={() => setMobileAsideOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-2">
              <BloqueEras
                fechaNacimiento={(form as any).fecha_nacimiento ?? null}
                personajeId={form.id}
                onFechaNacimientoChange={(dia) => {
                  const updated = {
                    ...form,
                    fecha_nacimiento: dia ?? null,
                  } as any;
                  setForm(updated);
                  void dexiePut("personajes", updated);
                }}
              />
            </div>
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <div className="p-2">
              <BloqueRelaciones
                personajeId={form.id}
                onSelectPersonaje={onSelectPersonaje}
              />
            </div>
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <div>
              <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
                <BookOpen className="text-primary/25 shrink-0" size={8} />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
                  Capítulos
                </span>
              </div>
              <BloqueCapsAparece personajeId={form.id} />
            </div>
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <div>
              <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
                <Music2 className="text-primary/25 shrink-0" size={8} />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
                  Canciones
                </span>
              </div>
              <BloqueCanciones
                nombrePersonaje={form.nombre ?? ""}
                personajeId={form.id}
                onSelect={onSelectCancion}
              />
            </div>
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <div className="p-2">
              <BloqueGruposPersonaje
                personajeId={form.id}
                onOpenGrupo={onOpenGrupo}
              />
            </div>
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionHechizos grupoIds={grupoIds} personajeId={form.id} />
          </div>
        </div>
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
    void dexieDel("personajes", form.id);
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
