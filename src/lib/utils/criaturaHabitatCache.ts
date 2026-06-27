/**
 * criaturaHabitatCache.ts
 * ────────────────────────
 * Caches de módulo con TTL para los catálogos que usa BloqueHabitat:
 * reinos (30 min), ciudades (30 min) y personajes (10 min).
 * También guarda las relaciones criatura↔reinos y criatura↔ciudades
 * para evitar round-trips redundantes.
 *
 * Sin React, sin JSX → va en lib/utils/.
 * Ruta destino: src/lib/utils/criaturaHabitatCache.ts
 */

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ReinoMin = { id: string; nombre: string };
export type CiudadMin = { id: string; nombre: string; reino_id: string | null };
export type PersonajeMin = {
  id: string;
  nombre: string;
  img_url?: string | null;
};

// ─── Reinos — TTL 30 min ──────────────────────────────────────────────────────
let _reinosCache: ReinoMin[] | null = null;
let _reinosCacheTs = 0;
const REINOS_TTL = 30 * 60_000;

export async function getAllReinos(): Promise<ReinoMin[]> {
  if (_reinosCache && Date.now() - _reinosCacheTs < REINOS_TTL)
    return _reinosCache;
  try {
    if (db) {
      const local: any[] = (await (db as any).reinos?.toArray()) ?? [];
      if (local.length) {
        _reinosCache = local.map((r: any) => ({
          id: r.id,
          nombre: r.nombre ?? "",
        }));
        _reinosCacheTs = Date.now();
        if (navigator.onLine)
          supabase
            .from("reinos")
            .select("id, nombre")
            .order("nombre")
            .then(({ data }) => {
              if (data?.length) {
                _reinosCache = data.map((r: any) => ({
                  id: r.id,
                  nombre: r.nombre ?? "",
                }));
                _reinosCacheTs = Date.now();
              }
            });
        return _reinosCache;
      }
    }
  } catch {}
  if (!navigator.onLine) return _reinosCache ?? [];
  const { data } = await supabase
    .from("reinos")
    .select("id, nombre")
    .order("nombre");
  _reinosCache = (data ?? []).map((r: any) => ({
    id: r.id,
    nombre: r.nombre ?? "",
  }));
  _reinosCacheTs = Date.now();
  return _reinosCache;
}

// ─── Ciudades — TTL 30 min ────────────────────────────────────────────────────
let _ciudadesCache: CiudadMin[] | null = null;
let _ciudadesCacheTs = 0;
const CIUDADES_TTL = 30 * 60_000;

export async function getAllCiudades(): Promise<CiudadMin[]> {
  if (_ciudadesCache && Date.now() - _ciudadesCacheTs < CIUDADES_TTL)
    return _ciudadesCache;
  try {
    if (db) {
      const local: any[] = (await (db as any).ciudades?.toArray()) ?? [];
      if (local.length) {
        _ciudadesCache = local.map((l: any) => ({
          id: l.id,
          nombre: l.nombre ?? "",
          reino_id: l.reino_id ?? null,
        }));
        _ciudadesCacheTs = Date.now();
        if (navigator.onLine)
          supabase
            .from("ciudades")
            .select("id, nombre, reino_id")
            .order("nombre")
            .then(({ data }) => {
              if (data?.length) {
                _ciudadesCache = data.map((l: any) => ({
                  ...l,
                  nombre: l.nombre ?? "",
                  reino_id: l.reino_id ?? null,
                }));
                _ciudadesCacheTs = Date.now();
              }
            });
        return _ciudadesCache;
      }
    }
  } catch {}
  if (!navigator.onLine) return _ciudadesCache ?? [];
  const { data } = await supabase
    .from("ciudades")
    .select("id, nombre, reino_id")
    .order("nombre");
  _ciudadesCache = (data ?? []).map((l: any) => ({
    ...l,
    nombre: l.nombre ?? "",
    reino_id: l.reino_id ?? null,
  }));
  _ciudadesCacheTs = Date.now();
  return _ciudadesCache;
}

// ─── Personajes — TTL 10 min ──────────────────────────────────────────────────
let _personajesCache: PersonajeMin[] | null = null;
let _personajesCacheTs = 0;
const PERSONAJES_TTL = 10 * 60_000;

export async function getAllPersonajes(): Promise<PersonajeMin[]> {
  if (_personajesCache && Date.now() - _personajesCacheTs < PERSONAJES_TTL)
    return _personajesCache;
  try {
    if (db) {
      const local: any[] = (await (db as any).personajes?.toArray()) ?? [];
      if (local.length) {
        _personajesCache = local.map((p: any) => ({
          id: p.id,
          nombre: p.nombre ?? "",
          img_url: p.img_url ?? null,
        }));
        _personajesCacheTs = Date.now();
        if (navigator.onLine)
          supabase
            .from("personajes")
            .select("id, nombre, img_url")
            .order("nombre")
            .then(({ data }) => {
              if (data?.length) {
                _personajesCache = data.map((p: any) => ({
                  id: p.id,
                  nombre: p.nombre ?? "",
                  img_url: p.img_url ?? null,
                }));
                _personajesCacheTs = Date.now();
              }
            });
        return _personajesCache;
      }
    }
  } catch {}
  if (!navigator.onLine) return _personajesCache ?? [];
  const { data } = await supabase
    .from("personajes")
    .select("id, nombre, img_url")
    .order("nombre");
  _personajesCache = (data ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre ?? "",
    img_url: p.img_url ?? null,
  }));
  _personajesCacheTs = Date.now();
  return _personajesCache;
}

// ─── Caches de relaciones criatura↔reinos y criatura↔ciudades — TTL 5 min ────
export type CriaturaReinoRow = {
  rowId: string;
  reinoId: string;
  reinoNombre: string;
};
export type CriaturaCiudadRow = {
  rowId: string;
  ciudadId: string;
  ciudadNombre: string;
  reinoId: string | null;
};

export const criaturaReinosCache = new Map<
  string,
  { data: CriaturaReinoRow[]; ts: number }
>();
export const criaturaCiudadesCache = new Map<
  string,
  { data: CriaturaCiudadRow[]; ts: number }
>();
export const CRIATURA_REL_TTL = 5 * 60_000;
