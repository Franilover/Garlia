"use client";

/**
 * useWorldbuilder.ts — dominio Worldbuilder
 * ───────────────────────────────────────────────────────────────────────────
 * Frontend → useWorldbuilder() → worldbuilderService → RPC Supabase →
 * fn_worldbuilder_* → resultado humano (✓/✗, categoría, propiedades).
 *
 * Este hook NO interpreta lenguaje natural ni decide qué "cumple" — eso es
 * 100% del motor. Solo orquesta: guarda el texto libre, dispara detección de
 * intención al tipear (debounced), y expone las acciones de
 * buscar/crear/mezclar/evaluar, cada una delegada 1:1 a worldbuilderService.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import * as worldbuilderService from "./worldbuilderService";
import type {
  CategoriaMaterial,
  ComponenteMaterial,
  EvaluacionWorldbuilder,
  IntencionDetectada,
  IntencionHumana,
  ItemCreadoResultado,
  MaterialCreadoResultado,
  MaterialDeItem,
  SugerenciaMaterialesResultado,
  TipoObjeto,
  TipoObjetoResuelto,
  WorldbuilderCreacion,
} from "./types";

interface UseWorldbuilderState {
  // catálogo
  intenciones: IntencionHumana[];
  categorias: CategoriaMaterial[];
  tiposObjeto: TipoObjeto[];
  loadingCatalogo: boolean;

  // detección de intención en vivo, mientras el usuario tipea
  intencionesDetectadas: IntencionDetectada[];
  detectando: boolean;

  // búsqueda ("¿ya existe algo así?")
  sugerencias: SugerenciaMaterialesResultado | null;
  buscando: boolean;

  // creación
  creando: boolean;
  ultimaCreacion: MaterialCreadoResultado | ItemCreadoResultado | null;

  // historial
  creaciones: WorldbuilderCreacion[];
  loadingCreaciones: boolean;

  error: string | null;
}

export function useWorldbuilder() {
  const [state, setState] = useState<UseWorldbuilderState>({
    intenciones: [],
    categorias: [],
    tiposObjeto: [],
    loadingCatalogo: true,
    intencionesDetectadas: [],
    detectando: false,
    sugerencias: null,
    buscando: false,
    creando: false,
    ultimaCreacion: null,
    creaciones: [],
    loadingCreaciones: false,
    error: null,
  });

  // ─── Catálogo, una vez al montar ─────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    Promise.all([
      worldbuilderService.listarIntenciones(),
      worldbuilderService.listarCategorias(),
      worldbuilderService.listarTiposObjeto(),
    ])
      .then(([intenciones, categorias, tiposObjeto]) => {
        if (cancelado) return;
        setState((s) => ({ ...s, intenciones, categorias, tiposObjeto, loadingCatalogo: false }));
      })
      .catch((err) => {
        if (cancelado) return;
        setState((s) => ({
          ...s,
          loadingCatalogo: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const refetchCreaciones = useCallback(async (limite = 30) => {
    setState((s) => ({ ...s, loadingCreaciones: true }));
    try {
      const creaciones = await worldbuilderService.listarCreaciones(limite);
      setState((s) => ({ ...s, creaciones, loadingCreaciones: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loadingCreaciones: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  // ─── Detección de intención en vivo (debounced 400ms) ──────────────────
  // El texto vive en el componente (no acá) para no forzar un solo input
  // controlado entre "buscar" y "crear" — este hook solo reacciona cuando
  // se lo llama explícitamente, sin asumir de dónde viene el texto.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectarIntenciones = useCallback((texto: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texto.trim()) {
      setState((s) => ({ ...s, intencionesDetectadas: [], detectando: false }));
      return;
    }
    setState((s) => ({ ...s, detectando: true }));
    debounceRef.current = setTimeout(async () => {
      try {
        const intencionesDetectadas = await worldbuilderService.detectarIntenciones(texto);
        setState((s) => ({ ...s, intencionesDetectadas, detectando: false }));
      } catch (err) {
        setState((s) => ({
          ...s,
          detectando: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }, 400);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // ─── Buscar antes de crear ──────────────────────────────────────────────
  const buscarMateriales = useCallback(async (texto: string, limite = 8) => {
    setState((s) => ({ ...s, buscando: true, error: null }));
    try {
      const sugerencias = await worldbuilderService.sugerirMateriales(texto, limite);
      setState((s) => ({ ...s, sugerencias, buscando: false }));
      return sugerencias;
    } catch (err) {
      setState((s) => ({
        ...s,
        buscando: false,
        error: err instanceof Error ? err.message : String(err),
      }));
      return null;
    }
  }, []);

  const limpiarSugerencias = useCallback(() => {
    setState((s) => ({ ...s, sugerencias: null }));
  }, []);

  // ─── Resolver tipo de objeto (para "crear item") ───────────────────────
  const resolverTipoObjeto = useCallback(async (texto: string): Promise<TipoObjetoResuelto | null> => {
    setState((s) => ({ ...s, error: null }));
    try {
      return await worldbuilderService.resolverTipoObjeto(texto);
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
      return null;
    }
  }, []);

  // ─── Evaluación puntual (para vistas de detalle ya existentes) ─────────
  const evaluarMaterial = useCallback(
    (materialId: string, texto = "") => worldbuilderService.evaluarMaterial(materialId, texto),
    [],
  );
  const evaluarItem = useCallback(
    (itemId: string, texto = "") => worldbuilderService.evaluarItem(itemId, texto),
    [],
  );

  // ─── Crear / mezclar (mutación real) ────────────────────────────────────
  const crearMaterial = useCallback(
    async (params: {
      nombre: string;
      descripcion?: string;
      componentes: ComponenteMaterial[];
      intenciones?: string;
    }) => {
      setState((s) => ({ ...s, creando: true, error: null }));
      try {
        const resultado = await worldbuilderService.crearMaterial(params);
        setState((s) => ({ ...s, creando: false, ultimaCreacion: resultado }));
        refetchCreaciones();
        return resultado;
      } catch (err) {
        setState((s) => ({
          ...s,
          creando: false,
          error: err instanceof Error ? err.message : String(err),
        }));
        return null;
      }
    },
    [refetchCreaciones],
  );

  const mezclarMateriales = useCallback(
    async (params: {
      nombre: string;
      materialAId: string;
      materialBId: string;
      proporcionA?: number;
      intenciones?: string;
      descripcion?: string;
    }) => {
      setState((s) => ({ ...s, creando: true, error: null }));
      try {
        const resultado = await worldbuilderService.mezclarMateriales(params);
        setState((s) => ({ ...s, creando: false, ultimaCreacion: resultado }));
        refetchCreaciones();
        return resultado;
      } catch (err) {
        setState((s) => ({
          ...s,
          creando: false,
          error: err instanceof Error ? err.message : String(err),
        }));
        return null;
      }
    },
    [refetchCreaciones],
  );

  const crearItem = useCallback(
    async (params: {
      nombre: string;
      tipoTexto: string;
      descripcion?: string;
      materiales?: MaterialDeItem[];
      intenciones?: string;
    }) => {
      setState((s) => ({ ...s, creando: true, error: null }));
      try {
        const resultado = await worldbuilderService.crearItem(params);
        setState((s) => ({ ...s, creando: false, ultimaCreacion: resultado }));
        if (resultado.estado !== "requiere_plantilla") refetchCreaciones();
        return resultado;
      } catch (err) {
        setState((s) => ({
          ...s,
          creando: false,
          error: err instanceof Error ? err.message : String(err),
        }));
        return null;
      }
    },
    [refetchCreaciones],
  );

  const limpiarUltimaCreacion = useCallback(() => {
    setState((s) => ({ ...s, ultimaCreacion: null }));
  }, []);

  return {
    ...state,
    detectarIntenciones,
    buscarMateriales,
    limpiarSugerencias,
    resolverTipoObjeto,
    evaluarMaterial,
    evaluarItem,
    crearMaterial,
    mezclarMateriales,
    crearItem,
    limpiarUltimaCreacion,
    refetchCreaciones,
  };
}
