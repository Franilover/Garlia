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
  type CladoEditorOpcion,
  type CladoEditorRegla,
  type CladoInput,
  type CladoOrganismo,
  type CladoRelacion,
  type Ecosistema,
  type EcosistemaCriatura,
  type EcosistemaFlora,
  type EcosistemaInput,
  type OrganismoCriatura,
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

// ─── Editor guiado de clados (v_clado_editor_opciones_v1 / v_clado_editor_reglas_v1) ──
// Catálogo de opciones + matriz de combinaciones válidas para el editor de
// clados. Solo lectura, sin caché offline por ahora — mismo patrón directo
// que useCladoRelaciones(). El frontend consulta estas vistas en vez de
// hardcodear listas: si Supabase agrega/desactiva una opción o una regla,
// el editor lo refleja sin tocar código.

export function useCladoEditorCatalogo() {
  const [opciones, setOpciones] = useState<CladoEditorOpcion[]>([]);
  const [reglas, setReglas] = useState<CladoEditorRegla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const [opcionesRes, reglasRes] = await Promise.all([
        supabase
          .from("v_clado_editor_opciones_v1")
          .select("id, campo, clave, etiqueta, descripcion, orden, activo, legado, metadata")
          .order("campo")
          .order("orden"),
        supabase
          .from("v_clado_editor_reglas_v1")
          .select("id, tipo_nodo, relacion_padre, tipo_nodo_padre, permitida, descripcion, orden, activo")
          .order("orden"),
      ]);
      if (cancelado) return;
      if (opcionesRes.error) {
        console.error(
          "[useCladoEditorCatalogo] error leyendo v_clado_editor_opciones_v1:",
          opcionesRes.error,
        );
      }
      if (reglasRes.error) {
        console.error(
          "[useCladoEditorCatalogo] error leyendo v_clado_editor_reglas_v1:",
          reglasRes.error,
        );
      }
      setOpciones((opcionesRes.data as CladoEditorOpcion[]) ?? []);
      setReglas((reglasRes.data as CladoEditorRegla[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Opciones activas de un campo (para nuevas selecciones), en orden. Si
   *  `valorActual` está fuera del catálogo activo (legado o desactivado),
   *  se agrega igual al final para no romper la edición de un registro
   *  existente — nunca se fuerza a "limpiar" un valor que el escritor no
   *  cambió. */
  const opcionesDe = useCallback(
    (campo: CladoEditorOpcion["campo"], valorActual?: string | null) => {
      const delCampo = opciones.filter((o) => o.campo === campo);
      const activas = delCampo.filter((o) => o.activo);
      if (valorActual && !activas.some((o) => o.clave === valorActual)) {
        const legada = delCampo.find((o) => o.clave === valorActual);
        if (legada) return [...activas, legada];
      }
      return activas;
    },
    [opciones],
  );

  /** Combinaciones de relacion_padre permitidas para un tipo_nodo dado,
   *  filtradas además por el tipo_nodo del padre cuando la regla lo exige
   *  (tipo_nodo_padre !== null). Si el clado es raíz (tipoNodoPadre=null),
   *  solo se ofrecen las reglas que no restringen el tipo del padre. */
  const relacionesPermitidas = useCallback(
    (tipoNodo: string | null, tipoNodoPadre: string | null) => {
      if (!tipoNodo) return [];
      return reglas.filter(
        (r) =>
          r.activo &&
          r.permitida &&
          r.tipo_nodo === tipoNodo &&
          (r.tipo_nodo_padre === null || r.tipo_nodo_padre === tipoNodoPadre),
      );
    },
    [reglas],
  );

  /** Descripción de la regla exacta (tipo_nodo + relacion_padre + tipo del
   *  padre) para mostrar debajo del dropdown de "Unión con el padre". */
  const descripcionRegla = useCallback(
    (tipoNodo: string | null, relacionPadre: string | null, tipoNodoPadre: string | null) => {
      if (!tipoNodo || !relacionPadre) return null;
      const regla = reglas.find(
        (r) =>
          r.tipo_nodo === tipoNodo &&
          r.relacion_padre === relacionPadre &&
          (r.tipo_nodo_padre === null || r.tipo_nodo_padre === tipoNodoPadre),
      );
      return regla?.descripcion ?? null;
    },
    [reglas],
  );

  return { opciones, reglas, loading, opcionesDe, relacionesPermitidas, descripcionRegla };
}

// ─── Clado → Organismos (vista v_clados_organismos_v1) ─────────────────────
// Canónico: un clado tiene 0..N organismos (organismos.clado_id). Se lee la
// vista de Supabase, que ya trae la semántica del clado y los datos del
// organismo — el frontend solo agrupa por clado_id para consultar.
// Sin caché offline por ahora (mismo patrón directo que useCladoRelaciones).

export function useCladosOrganismos() {
  const [filas, setFilas] = useState<CladoOrganismo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_clados_organismos_v1")
        .select(
          "clado_id, clado, tipo_nodo, relacion_padre, rango, estado, organismo_id, organismo, tipo_organismo, categoria, variante_tipo, sexo_biologico, organismo_base_id",
        );
      if (cancelado) return;
      if (error) console.error("[useCladosOrganismos] error leyendo v_clados_organismos_v1:", error);
      setFilas((data as CladoOrganismo[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Organismos que pertenecen a un clado (organismos.clado_id). */
  const organismosDe = useCallback(
    (cladoId: string) => filas.filter((f) => f.clado_id === cladoId),
    [filas],
  );

  /** Cantidad de organismos por clado — para mostrar en el cladograma. */
  const conteoPorClado = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of filas) m.set(f.clado_id, (m.get(f.clado_id) ?? 0) + 1);
    return m;
  }, [filas]);

  return { filas, loading, organismosDe, conteoPorClado };
}

// ─── Organismo → Criaturas (vista v_organismos_criaturas_v1) ────────────────
// "Criaturas que usan este organismo": sale de criatura_organismos (vía la
// vista), NUNCA de clado_criaturas ni de clados.criatura_ids.

export function useOrganismosCriaturas() {
  const [filas, setFilas] = useState<OrganismoCriatura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_organismos_criaturas_v1")
        .select("organismo_id, organismo, clado_id, criatura_id, criatura, es_principal, rol, cantidad");
      if (cancelado) return;
      if (error) console.error("[useOrganismosCriaturas] error leyendo v_organismos_criaturas_v1:", error);
      setFilas((data as OrganismoCriatura[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Criaturas que usan un organismo (principales primero). */
  const criaturasDe = useCallback(
    (organismoId: string) =>
      filas
        .filter((f) => f.organismo_id === organismoId)
        .sort((a, b) => Number(b.es_principal) - Number(a.es_principal)),
    [filas],
  );

  return { filas, loading, criaturasDe };
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
