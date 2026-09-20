"use client";

/**
 * useBiologia.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Datos del módulo Biología: biomas, clados, ecosistemas, cadenas_alimenticias.
 * Antes cada hook tenía su propio fetch/CRUD
 * directo contra Supabase (sin caché ni offline); ahora todos corren sobre
 * useSupabaseData — mismo patrón que useElementos/useFisica — para que la
 * pestaña Biología cargue al instante desde Dexie al reabrir la app y
 * siga funcionando (lectura y, en las tablas marcadas OFFLINE_WRITABLE,
 * también escritura) sin conexión.
 *
 * La API pública de cada hook (nombres de campos: biomas/clados/
 * ecosistemas/cadenas/perfiles, más crear/actualizar/eliminar/
 * obtenerOCrear) se mantiene igual que antes para no tocar los
 * consumidores (BiologiaPage, CladisticaPage, etc.).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { supabase } from "@/infra/supabase/supabase";

import {
  type Bioma,
  type BiomaInput,
  type BiomaReino,
  type CadenaAlimenticia,
  type CadenaAlimenticiaInput,
  type Clado,
  type CladoInput,
  type CladoRelacion,
  type Ecosistema,
  type EcosistemaCriatura,
  type EcosistemaFlora,
  type EcosistemaInput,
} from "./types";

// ─── Biomas ─────────────────────────────────────────────────────────────────

export function useBiomas() {
  const { data, setData, loading, addRow, updateRow, deleteRow } = useSupabaseData<Bioma>(
    "biomas",
    { order: { campo: "orden" } },
  );

  const biomas = useMemo(() => data, [data]);

  const crear = useCallback(
    async (nombre: string) => {
      const { data: creado } = await addRow({
        nombre,
        descripcion: "",
        afinidad: "",
      });
      return (creado as Bioma) ?? null;
    },
    [addRow],
  );

  const actualizar = useCallback(
    async (id: string, updates: BiomaInput) => {
      await updateRow(id, updates);
    },
    [updateRow],
  );

  const eliminar = useCallback(
    async (id: string) => {
      // Los ecosistemas que apuntaban a este bioma quedan huérfanos
      // (bioma_id: null) en vez de borrarse en cascada — mismo criterio
      // conservador que el borrado de un Clado intermedio. Esto sigue
      // pegando directo a Supabase (tabla ajena, ecosistemas); su propio
      // hook (useEcosistemas) revalida solo vía realtime/refetch.
      await supabase.from("ecosistemas").update({ bioma_id: null }).eq("bioma_id", id);
      // bioma_reinos no tiene ON DELETE CASCADE asumido — se limpia acá,
      // mismo criterio conservador que la reasignación de ecosistemas.
      await supabase.from("bioma_reinos").delete().eq("bioma_id", id);
      await deleteRow(id);
    },
    [deleteRow],
  );

  return { biomas, setBiomas: setData, loading, creating: false, crear, actualizar, eliminar };
}

// ─── Bioma ↔ Reino (tabla puente) ──────────────────────────────────────────
// Reemplaza a la antigua biomas.reino_ids. No usa useSupabaseData (sin
// caché offline por ahora) porque es una tabla puente pura sin PK propia
// simple ni "orden" — se lee/escribe directo contra Supabase, mismo patrón
// que useEcosistemaCriaturas.

export function useBiomaReinos() {
  const [filas, setData] = useState<BiomaReino[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("bioma_reinos").select("bioma_id, reino_id");
      if (!cancelado) {
        setData((data as BiomaReino[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Ids de reino con territorio en un bioma dado. */
  const reinoIdsDe = useCallback(
    (biomaId: string) => filas.filter((f) => f.bioma_id === biomaId).map((f) => f.reino_id),
    [filas],
  );

  /** Reemplaza por completo el set de reinos de un bioma (mismo criterio
   *  que la edición de un array de ids: se calcula el diff contra el
   *  estado actual y se aplican solo altas/bajas). */
  const setReinosDeBioma = useCallback(
    async (biomaId: string, nuevosReinoIds: string[]) => {
      const actuales = filas.filter((f) => f.bioma_id === biomaId).map((f) => f.reino_id);
      const aQuitar = actuales.filter((id) => !nuevosReinoIds.includes(id));
      const aAgregar = nuevosReinoIds.filter((id) => !actuales.includes(id));

      const anterior = filas;
      setData((prev) => [
        ...prev.filter((f) => !(f.bioma_id === biomaId && aQuitar.includes(f.reino_id))),
        ...aAgregar.map((reino_id) => ({ bioma_id: biomaId, reino_id })),
      ]);

      if (aQuitar.length > 0) {
        const { error } = await supabase
          .from("bioma_reinos")
          .delete()
          .eq("bioma_id", biomaId)
          .in("reino_id", aQuitar);
        if (error) {
          setData(anterior);
          return;
        }
      }
      if (aAgregar.length > 0) {
        const { error } = await supabase
          .from("bioma_reinos")
          .insert(aAgregar.map((reino_id) => ({ bioma_id: biomaId, reino_id })));
        if (error) {
          setData(anterior);
          return;
        }
      }
    },
    [filas],
  );

  return { biomaReinos: filas, setBiomaReinos: setData, loading, reinoIdsDe, setReinosDeBioma };
}

// ─── Clados (cladograma / árbol filogenético) ──────────────────────────────

export function useClados() {
  const { data, setData, loading, addRow, updateRow, deleteRow } = useSupabaseData<Clado>(
    "clados",
    { order: { campo: "orden" } },
  );

  const clados = useMemo(() => data, [data]);

  // `tipo_nodo` / `relacion_padre` NO se infieren acá: un clado nuevo nace
  // sin clasificar (null) hasta que alguien lo clasifique en Supabase.
  // Inventar un valor por defecto (p. ej. "ascendencia") afirmaría
  // parentesco que nadie declaró — justo lo que el contrato prohíbe.
  const crear = useCallback(
    async (nombre: string, padre_id: string | null = null) => {
      const { data: creado } = await addRow({
        nombre,
        sinapomorfia: "",
        padre_id,
        descripcion: "",
        criatura_ids: [],
      });
      return (creado as Clado) ?? null;
    },
    [addRow],
  );

  // Una raíz no tiene conexión con ningún padre: si el cambio deja padre_id
  // en null, relacion_padre se limpia también — si no, quedaría afirmando
  // una relación con un padre que ya no existe.
  const actualizar = useCallback(
    async (id: string, updates: CladoInput) => {
      const payload: CladoInput =
        "padre_id" in updates && updates.padre_id === null && !("relacion_padre" in updates)
          ? { ...updates, relacion_padre: null }
          : updates;
      await updateRow(id, payload);
    },
    [updateRow],
  );

  const eliminar = useCallback(
    async (id: string) => {
      // Reasignar hijos directos a raíz (padre_id null) para no dejar el
      // árbol con referencias colgantes, mismo criterio conservador que
      // usaríamos para cualquier borrado de nodo intermedio. Su
      // relacion_padre se limpia junto con padre_id (ver actualizar).
      // Las filas de clado_relaciones que apuntan a este clado se borran
      // solas: la FK es ON DELETE CASCADE en Supabase.
      const hijos = data.filter((c) => c.padre_id === id);
      await Promise.all(
        hijos.map((c) => updateRow(c.id, { padre_id: null, relacion_padre: null })),
      );
      await deleteRow(id);
    },
    [data, updateRow, deleteRow],
  );

  return { clados, setClados: setData, loading, creating: false, crear, actualizar, eliminar };
}

// ─── Clado ↔ Clado (relaciones laterales, tabla "clado_relaciones") ────────
// Conexiones que NO son hijos del árbol (afinidad, ecológica, origen,
// transformación, incertidumbre, asociación). Solo lectura: el frontend las
// muestra tal cual vienen de Supabase y NUNCA las convierte en aristas
// padre→hijo ni las deduce de otros datos. Sin caché offline por ahora —
// mismo patrón directo que useBiomaReinos().

export function useCladoRelaciones() {
  const [relaciones, setRelaciones] = useState<CladoRelacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("clado_relaciones")
        .select("id, clado_origen_id, clado_destino_id, tipo, descripcion, created_at");
      if (cancelado) return;
      if (error) console.error("[useCladoRelaciones] error leyendo clado_relaciones:", error);
      setRelaciones((data as CladoRelacion[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Relaciones laterales donde este clado participa (como origen o destino). */
  const relacionesDe = useCallback(
    (cladoId: string) =>
      relaciones.filter((r) => r.clado_origen_id === cladoId || r.clado_destino_id === cladoId),
    [relaciones],
  );

  return { relaciones, setRelaciones, loading, relacionesDe };
}

// ─── Ecosistemas ────────────────────────────────────────────────────────────

export function useEcosistemas() {
  const { data, setData, loading, addRow, updateRow, deleteRow } = useSupabaseData<Ecosistema>(
    "ecosistemas",
    { order: { campo: "orden" } },
  );

  const ecosistemas = useMemo(() => data, [data]);

  const crear = useCallback(
    async (nombre: string) => {
      const { data: creado } = await addRow({
        nombre,
        bioma_id: null,
        clima: "",
        descripcion: "",
        mineral_ids: [],
      });
      return (creado as Ecosistema) ?? null;
    },
    [addRow],
  );

  const actualizar = useCallback(
    async (id: string, updates: EcosistemaInput) => {
      await updateRow(id, updates);
    },
    [updateRow],
  );

  const eliminar = useCallback(
    async (id: string) => {
      // ecosistema_flora no tiene ON DELETE CASCADE asumido — se limpia
      // acá, mismo criterio que bioma_reinos en useBiomas().
      await supabase.from("ecosistema_flora").delete().eq("ecosistema_id", id);
      await deleteRow(id);
    },
    [deleteRow],
  );

  return {
    ecosistemas,
    setEcosistemas: setData,
    loading,
    creating: false,
    crear,
    actualizar,
    eliminar,
  };
}

// ─── Ecosistema ↔ Flora (tabla puente) ─────────────────────────────────────
// Reemplaza a la antigua ecosistemas.flora_ids. Mismo patrón que
// useBiomaReinos()/useEcosistemaCriaturas().

export function useEcosistemaFlora() {
  const [filas, setData] = useState<EcosistemaFlora[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("ecosistema_flora").select("ecosistema_id, flora_id");
      if (!cancelado) {
        setData((data as EcosistemaFlora[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Ids de flora que crece/habita en un ecosistema dado. */
  const floraIdsDe = useCallback(
    (ecosistemaId: string) =>
      filas.filter((f) => f.ecosistema_id === ecosistemaId).map((f) => f.flora_id),
    [filas],
  );

  /** Reemplaza por completo el set de flora de un ecosistema — mismo
   *  criterio de diff que setReinosDeBioma(). */
  const setFloraDeEcosistema = useCallback(
    async (ecosistemaId: string, nuevosFloraIds: string[]) => {
      const actuales = filas
        .filter((f) => f.ecosistema_id === ecosistemaId)
        .map((f) => f.flora_id);
      const aQuitar = actuales.filter((id) => !nuevosFloraIds.includes(id));
      const aAgregar = nuevosFloraIds.filter((id) => !actuales.includes(id));

      const anterior = filas;
      setData((prev) => [
        ...prev.filter(
          (f) => !(f.ecosistema_id === ecosistemaId && aQuitar.includes(f.flora_id)),
        ),
        ...aAgregar.map((flora_id) => ({ ecosistema_id: ecosistemaId, flora_id })),
      ]);

      if (aQuitar.length > 0) {
        const { error } = await supabase
          .from("ecosistema_flora")
          .delete()
          .eq("ecosistema_id", ecosistemaId)
          .in("flora_id", aQuitar);
        if (error) {
          setData(anterior);
          return;
        }
      }
      if (aAgregar.length > 0) {
        const { error } = await supabase
          .from("ecosistema_flora")
          .insert(aAgregar.map((flora_id) => ({ ecosistema_id: ecosistemaId, flora_id })));
        if (error) {
          setData(anterior);
          return;
        }
      }
    },
    [filas],
  );

  return {
    ecosistemaFlora: filas,
    setEcosistemaFlora: setData,
    loading,
    floraIdsDe,
    setFloraDeEcosistema,
  };
}

// ─── Ecosistema ↔ Criatura (tabla puente, ruta canónica v226) ─────────────
// Reemplaza la antigua ecosistemas.criatura_ids. No usa useSupabaseData (sin
// caché offline por ahora) porque es una tabla puente pura sin PK propia
// simple ni "orden" — se lee/escribe directo contra Supabase, mismo patrón
// que useEntidadesDeCriatura.ts.

export function useEcosistemaCriaturas() {
  // No usa useSupabaseData: esa tabla puente tiene PK compuesta
  // (ecosistema_id, criatura_id), sin columna id/orden — fetch propio.
  const [filas, setData] = useState<EcosistemaCriatura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ecosistema_criaturas")
        .select("ecosistema_id, criatura_id, rol, abundancia");
      if (!cancelado) {
        setData((data as EcosistemaCriatura[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Ids de criatura que habitan un ecosistema dado. */
  const criaturaIdsDe = useCallback(
    (ecosistemaId: string) =>
      filas.filter((f) => f.ecosistema_id === ecosistemaId).map((f) => f.criatura_id),
    [filas],
  );

  /** true si alguna fila liga esta criatura a algún ecosistema. */
  const tieneEcosistema = useCallback(
    (criaturaId: string) => filas.some((f) => f.criatura_id === criaturaId),
    [filas],
  );

  /** Liga una criatura a un ecosistema (no-op si ya existe la fila). */
  const asignar = useCallback(
    async (criaturaId: string, ecosistemaId: string) => {
      if (filas.some((f) => f.ecosistema_id === ecosistemaId && f.criatura_id === criaturaId)) {
        return;
      }
      const fila: EcosistemaCriatura = {
        ecosistema_id: ecosistemaId,
        criatura_id: criaturaId,
        rol: null,
        abundancia: null,
      };
      setData((prev) => [...prev, fila]);
      const { error } = await supabase.from("ecosistema_criaturas").insert(fila);
      if (error) {
        // revertir el optimista si falló la escritura
        setData((prev) =>
          prev.filter(
            (f) => !(f.ecosistema_id === ecosistemaId && f.criatura_id === criaturaId),
          ),
        );
      }
    },
    [filas, setData],
  );

  /** Quita el vínculo entre una criatura y un ecosistema. */
  const desasignar = useCallback(
    async (criaturaId: string, ecosistemaId: string) => {
      const anterior = filas;
      setData((prev) =>
        prev.filter(
          (f) => !(f.ecosistema_id === ecosistemaId && f.criatura_id === criaturaId),
        ),
      );
      const { error } = await supabase
        .from("ecosistema_criaturas")
        .delete()
        .eq("ecosistema_id", ecosistemaId)
        .eq("criatura_id", criaturaId);
      if (error) setData(anterior);
    },
    [filas, setData],
  );

  return {
    ecosistemaCriaturas: filas,
    setEcosistemaCriaturas: setData,
    loading,
    criaturaIdsDe,
    tieneEcosistema,
    asignar,
    desasignar,
  };
}

// ─── Cadenas alimenticias ───────────────────────────────────────────────────

export function useCadenasAlimenticias() {
  const { data, setData, loading, addRow, updateRow, deleteRow } =
    useSupabaseData<CadenaAlimenticia>("cadenas_alimenticias", { order: { campo: "orden" } });

  const cadenas = useMemo(() => data, [data]);

  const crear = useCallback(
    async (nombre: string, ecosistema_id: string | null = null) => {
      const { data: creado } = await addRow({
        nombre,
        ecosistema_id,
        descripcion: "",
        eslabones: [],
      });
      return (creado as CadenaAlimenticia) ?? null;
    },
    [addRow],
  );

  const actualizar = useCallback(
    async (id: string, updates: CadenaAlimenticiaInput) => {
      await updateRow(id, updates);
    },
    [updateRow],
  );

  const eliminar = useCallback(
    async (id: string) => {
      await deleteRow(id);
    },
    [deleteRow],
  );

  return { cadenas, setCadenas: setData, loading, creating: false, crear, actualizar, eliminar };
}

// Nota: el hook usePerfilesAtomicosCriatura (tabla "perfiles_atomicos_criatura")
// se quitó — esa tabla nunca existió en Supabase, el bloque solo tiraba 404.
