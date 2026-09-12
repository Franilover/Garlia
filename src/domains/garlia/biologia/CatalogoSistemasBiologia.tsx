"use client";

/**
 * CatalogoSistemasBiologia.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Biblioteca global de Sistemas y Organismos — mismo patrón que
 * CatalogoTejidosBiologia.tsx, un nivel más arriba en la cadena:
 *   Célula → Tejido → Órgano → Sistema → Organismo
 *
 * Fase 5 (ago-2026): Sistema y Organismo son catálogos simples (nombre/
 * descripción/notas, sin fórmula propia) vinculados M:N:
 *   - sistema_organos     (useSistemaOrganos)     → qué Órganos forman el Sistema
 *   - organismo_sistemas  (useOrganismoSistemas)  → qué Sistemas forman el Organismo
 *
 * Diferencia clave frente a organo_tejidos/tejido_celulas: sistema_organos
 * NO tiene columna `rol` ni `proporcion` (pertenencia simple, ej. "corazón
 * pertenece a Sistema circulatorio" no necesita ponderarse) — por eso el
 * panel de Sistema usa una lista de vínculos más simple (ListaVinculosSimple)
 * en vez de ListaVinculosMN, que exige `rol`. organismo_sistemas sí tiene
 * `proporcion` (igual que organo_tejidos), así que el panel de Organismo
 * reutiliza esa forma con un input de proporción en vez de rol.
 *
 * Mismo lenguaje visual que CatalogoTejidosBiologia/GridCatalogoGrupo.
 */

import { Beaker, Boxes, Layers, Plus, Trash2, X, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useConfirm } from "@/ui/ConfirmModal";
import { useSistemaOrganos, type OrganoDeSistema } from "@/domains/garlia/elementos/useSistemaOrganos";
import {
  useOrganismoSistemas,
  type SistemaDeOrganismo,
} from "@/domains/garlia/elementos/useOrganismoSistemas";
import { useSistemasDeUnOrgano } from "@/domains/garlia/elementos/useSistemasDeUnOrgano";
import { useComposicionDeUnSistema } from "@/domains/garlia/elementos/useComposicionDeUnSistema";
import { useOrganismosDeUnSistema } from "@/domains/garlia/elementos/useOrganismosDeUnSistema";
import { useComposicionDeUnOrganismo } from "@/domains/garlia/elementos/useComposicionDeUnOrganismo";
import type { Organismo, Organo, Sistema } from "@/domains/garlia/elementos/types";
import { BreadcrumbJerarquia } from "./BreadcrumbJerarquia";
import {
  GridPropiedadesCalculadas,
  fuenteDePropiedadesCalculadas,
} from "@/domains/garlia/_shared/GridPropiedadesCalculadas";
import { PillCatalogoItem } from "@/domains/garlia/_shared/PillCatalogoItem";

interface Props {
  /**
   * Este catálogo pasó a ser controlado (2026-09-11) — ver comentario
   * equivalente en CatalogoTejidosBiologia. Ya no maneja su propia
   * selección/fetch de Sistemas/Organismos ni monta el editor: eso ahora
   * vive en BiologiaPage.tsx (hooks useSistemas/useOrganismos subidos al
   * padre + PanelFlotanteShellBiologia). Este componente solo pinta las 2
   * grillas y reporta selección.
   */
  sistemas: Sistema[];
  loadingSistemas?: boolean;
  organismos: Organismo[];
  loadingOrganismos?: boolean;
  sistemaSeleccionadoId: string | null;
  onSeleccionarSistema: (id: string | null) => void;
  organismoSeleccionadoId: string | null;
  onSeleccionarOrganismo: (id: string | null) => void;
}

export function CatalogoSistemasBiologia({
  sistemas,
  loadingSistemas,
  organismos,
  loadingOrganismos,
  sistemaSeleccionadoId,
  onSeleccionarSistema,
  organismoSeleccionadoId,
  onSeleccionarOrganismo,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      {/* ── Sistemas ───────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-2 min-w-[220px]"
        style={{ flexGrow: Math.max(sistemas.length, 1), flexBasis: 0 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-micro font-black uppercase tracking-[0.2em] text-primary/50">
            Sistemas · {sistemas.length}
          </p>
        </div>

        <GridSimple
          items={sistemas}
          loading={!!loadingSistemas}
          icono={<Layers size={12} className="text-primary/40 shrink-0" />}
          seleccionadoId={sistemaSeleccionadoId}
          onSeleccionar={onSeleccionarSistema}
          labelVacio="sistemas"
        />
      </div>

      {/* ── Organismos ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-2 min-w-[220px]"
        style={{ flexGrow: Math.max(organismos.length, 1), flexBasis: 0 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-micro font-black uppercase tracking-[0.2em] text-primary/50">
            Organismos · {organismos.length}
          </p>
        </div>

        <GridSimple
          items={organismos}
          loading={!!loadingOrganismos}
          icono={<Boxes size={12} className="text-primary/40 shrink-0" />}
          seleccionadoId={organismoSeleccionadoId}
          onSeleccionar={onSeleccionarOrganismo}
          labelVacio="organismos"
        />
      </div>
    </div>
  );
}

// ─── Grid genérica (idéntica a CatalogoTejidosBiologia.GridSimple) ────────

function GridSimple<T extends { id: string; nombre: string }>({
  items,
  loading,
  icono,
  seleccionadoId,
  onSeleccionar,
  labelVacio,
}: {
  items: T[];
  loading: boolean;
  icono: React.ReactNode;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  labelVacio: string;
}) {
  if (loading && items.length === 0) {
    return <p className="text-micro text-primary/25 italic py-2">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-4 text-micro text-primary/25 text-center border border-dashed border-primary/10 rounded-md">
        Sin {labelVacio} todavía
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <PillCatalogoItem
          key={item.id}
          nombre={item.nombre}
          icono={icono}
          seleccionado={seleccionadoId === item.id}
          onClick={() => onSeleccionar(item.id)}
        />
      ))}
    </div>
  );
}

// ─── Panel Sistema: nombre, descripción, notas, Órganos (M:N vía
// sistema_organos — SIN rol/proporción, pertenencia simple) ───────────────

export function PanelEditorSistema({
  item,
  organos,
  loadingOrganos,
  onCerrar,
  onActualizar,
  onEliminar,
  onAbrirOrgano,
  onAbrirCelula,
  onAbrirTejido,
  onAbrirOrganismo,
  sinAnimacion,
}: {
  item: Sistema;
  organos: Organo[];
  loadingOrganos?: boolean;
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Sistema>) => void;
  onEliminar: (id: string) => Promise<{ ok: boolean; error: unknown }>;
  onAbrirOrgano?: (organoId: string) => void;
  /** Cierra este panel y abre el editor de la Célula elegida — navegación
   *  transitiva (Sistema → Órgano → Tejido → Célula, unión de todas las
   *  Células alcanzables desde cualquier Órgano del Sistema). */
  onAbrirCelula?: (celulaId: string) => void;
  /** Cierra este panel y abre el editor del Tejido elegido — misma unión
   *  transitiva que onAbrirCelula, un nivel más arriba. */
  onAbrirTejido?: (tejidoId: string) => void;
  /** Cierra este panel y abre el editor del Organismo elegido — navegación
   *  hacia arriba (organismo_sistemas, dirección inversa). */
  onAbrirOrganismo?: (organismoId: string) => void;
  /** true cuando este panel se abrió como salto desde OTRO nivel del
   *  breadcrumb — suprime la animación de entrada. */
  sinAnimacion?: boolean;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const vinculosOrgano = useSistemaOrganos(item.id);
  const composicion = useComposicionDeUnSistema(item.id);
  const organismosQueUsanEsteSistema = useOrganismosDeUnSistema(item.id);

  async function handleEliminar() {
    const ok = await confirm({
      title: "Eliminar sistema",
      message: `¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer. Si algún Organismo lo usa, no se va a poder borrar.`,
    });
    if (!ok) return;
    setEliminando(true);
    setErrorEliminar(null);
    const res = await onEliminar(item.id);
    setEliminando(false);
    if (!res.ok) {
      setErrorEliminar(
        "No se pudo eliminar — probablemente algún Organismo todavía lo usa. Quitalo de ahí primero.",
      );
    }
  }

  return (
    <PanelFlotanteBase sinAnimacion={sinAnimacion}>
      <ConfirmModal />
      <PanelFlotanteHeader
        icono={<Layers className="text-primary/50" size={12} />}
        nombre={item.nombre ?? ""}
        placeholder="Nombre…"
        onChangeNombre={(nombre) => onActualizar(item.id, { nombre })}
        onEliminar={handleEliminar}
        eliminando={eliminando}
        onCerrar={onCerrar}
      />

      <div className="shrink-0 px-3 pt-2">
        <BreadcrumbJerarquia
          niveles={[
            {
              label: "Célula",
              icono: <Beaker size={10} />,
              activo: false,
              items: composicion.celulaItems.map((c) => ({ id: c.id, nombre: c.nombre })),
              loading: composicion.loading,
              onNavegar: onAbrirCelula,
            },
            {
              label: "Tejido",
              icono: <Layers size={10} />,
              activo: false,
              items: composicion.tejidoItems.map((t) => ({ id: t.id, nombre: t.nombre })),
              loading: composicion.loading,
              onNavegar: onAbrirTejido,
            },
            {
              label: "Órgano",
              icono: <Boxes size={10} />,
              activo: false,
              items: vinculosOrgano.items.map((v) => ({ id: v.organo_id, nombre: v.organo.nombre })),
              loading: vinculosOrgano.loading,
              onNavegar: onAbrirOrgano,
            },
            { label: "Sistema", icono: <Layers size={10} />, activo: true },
            {
              label: "Organismo",
              icono: <Boxes size={10} />,
              activo: false,
              items: organismosQueUsanEsteSistema.items.map((o) => ({
                id: o.organismo_id,
                nombre: o.organismo.nombre,
              })),
              loading: organismosQueUsanEsteSistema.loading,
              onNavegar: onAbrirOrganismo,
            },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {errorEliminar && <ErrorBanner texto={errorEliminar} />}

        <div className="flex flex-col md:flex-row gap-3 md:gap-5 mt-1">
          <div className="md:w-1/2 min-w-0">
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-1">
              Órganos · qué forma el sistema
            </p>
            <ListaVinculosSimple<OrganoDeSistema>
              items={vinculosOrgano.items}
              loading={vinculosOrgano.loading}
              catalogo={organos}
              loadingCatalogo={loadingOrganos}
              getNombre={(v) => v.organo.nombre}
              getCatalogoId={(v) => v.organo_id}
              iconoCatalogo={<Boxes size={11} className="text-accent/60 shrink-0" />}
              onAgregar={(organoId) => void vinculosOrgano.vincularExistente(organoId)}
              onQuitar={vinculosOrgano.quitar}
              onAbrirItem={onAbrirOrgano}
            />
          </div>

          <div className="md:w-1/2 min-w-0 flex flex-col gap-3">
            <div>
              <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-1">
                Descripción
              </p>
              <input
                className="w-full bg-transparent px-0 py-0.5 text-micro font-bold text-primary/60 outline-none placeholder:text-primary/25"
                placeholder="Descripción…"
                value={item.descripcion ?? ""}
                onChange={(e) => onActualizar(item.id, { descripcion: e.target.value })}
              />
            </div>

            <NotasField value={item.notas ?? ""} onChange={(notas) => onActualizar(item.id, { notas })} />

            <NotaReutilizable label="Organismos" />
          </div>
        </div>
      </div>
    </PanelFlotanteBase>
  );
}

// ─── Panel Organismo: nombre, descripción, notas, Sistemas (M:N vía
// organismo_sistemas — CON proporción, igual que organo_tejidos) ──────────

export function PanelEditorOrganismo({
  item,
  sistemas,
  loadingSistemas,
  onCerrar,
  onActualizar,
  onEliminar,
  onAbrirSistema,
  onAbrirCelula,
  onAbrirTejido,
  onAbrirOrgano,
  sinAnimacion,
}: {
  item: Organismo;
  sistemas: Sistema[];
  loadingSistemas?: boolean;
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Organismo>) => void;
  onEliminar: (id: string) => Promise<{ ok: boolean; error: unknown }>;
  onAbrirSistema?: (sistemaId: string) => void;
  /** Cierra este panel y abre el editor de la Célula elegida — unión
   *  transitiva de todas las Células alcanzables vía cualquier Sistema de
   *  este Organismo (Organismo → Sistema → Órgano → Tejido → Célula). */
  onAbrirCelula?: (celulaId: string) => void;
  /** Misma unión transitiva que onAbrirCelula, un nivel más arriba. */
  onAbrirTejido?: (tejidoId: string) => void;
  /** Misma unión transitiva, un nivel más arriba todavía. */
  onAbrirOrgano?: (organoId: string) => void;
  /** true cuando este panel se abrió como salto desde OTRO nivel del
   *  breadcrumb — suprime la animación de entrada. */
  sinAnimacion?: boolean;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const vinculosSistema = useOrganismoSistemas(item.id);
  const composicion = useComposicionDeUnOrganismo(item.id);

  async function handleEliminar() {
    const ok = await confirm({
      title: "Eliminar organismo",
      message: `¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`,
    });
    if (!ok) return;
    setEliminando(true);
    setErrorEliminar(null);
    const res = await onEliminar(item.id);
    setEliminando(false);
    if (!res.ok) {
      setErrorEliminar("No se pudo eliminar el organismo. Intentá de nuevo.");
    }
  }

  return (
    <PanelFlotanteBase sinAnimacion={sinAnimacion}>
      <ConfirmModal />
      <PanelFlotanteHeader
        icono={<Boxes className="text-primary/50" size={12} />}
        nombre={item.nombre ?? ""}
        placeholder="Nombre…"
        onChangeNombre={(nombre) => onActualizar(item.id, { nombre })}
        onEliminar={handleEliminar}
        eliminando={eliminando}
        onCerrar={onCerrar}
      />

      <div className="shrink-0 px-3 pt-2">
        <BreadcrumbJerarquia
          niveles={[
            {
              label: "Célula",
              icono: <Beaker size={10} />,
              activo: false,
              items: composicion.celulaItems.map((c) => ({ id: c.id, nombre: c.nombre })),
              loading: composicion.loading,
              onNavegar: onAbrirCelula,
            },
            {
              label: "Tejido",
              icono: <Layers size={10} />,
              activo: false,
              items: composicion.tejidoItems.map((t) => ({ id: t.id, nombre: t.nombre })),
              loading: composicion.loading,
              onNavegar: onAbrirTejido,
            },
            {
              label: "Órgano",
              icono: <Boxes size={10} />,
              activo: false,
              items: composicion.organoItems.map((o) => ({ id: o.id, nombre: o.nombre })),
              loading: composicion.loading,
              onNavegar: onAbrirOrgano,
            },
            {
              label: "Sistema",
              icono: <Layers size={10} />,
              activo: false,
              items: vinculosSistema.items.map((v) => ({ id: v.sistema_id, nombre: v.sistema.nombre })),
              loading: vinculosSistema.loading,
              onNavegar: onAbrirSistema,
            },
            { label: "Organismo", icono: <Boxes size={10} />, activo: true },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {errorEliminar && <ErrorBanner texto={errorEliminar} />}

        <div className="flex flex-col md:flex-row gap-3 md:gap-5 mt-1">
          <div className="md:w-1/2 min-w-0">
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-1">
              Sistemas · qué forma el organismo
            </p>
            <ListaVinculosProporcion<SistemaDeOrganismo>
              items={vinculosSistema.items}
              loading={vinculosSistema.loading}
              catalogo={sistemas}
              loadingCatalogo={loadingSistemas}
              getNombre={(v) => v.sistema.nombre}
              getCatalogoId={(v) => v.sistema_id}
              proporcionPlaceholder="Proporción (ej. 1, 2)…"
              iconoCatalogo={<Layers size={11} className="text-accent/60 shrink-0" />}
              onAgregar={(sistemaId) => void vinculosSistema.vincularExistente(sistemaId)}
              onActualizarProporcion={vinculosSistema.actualizarProporcion}
              onQuitar={vinculosSistema.quitar}
              onAbrirItem={onAbrirSistema}
            />

            <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-1 mt-4">
              Propiedades calculadas
              {fuenteDePropiedadesCalculadas(item.propiedades_calculadas) && (
                <span className="normal-case font-normal text-primary/25">
                  {" "}
                  · derivadas de {fuenteDePropiedadesCalculadas(item.propiedades_calculadas)}
                </span>
              )}
            </p>
            <GridPropiedadesCalculadas propiedades={item.propiedades_calculadas} />
          </div>

          <div className="md:w-1/2 min-w-0 flex flex-col gap-3">
            <div>
              <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-1">
                Descripción
              </p>
              <input
                className="w-full bg-transparent px-0 py-0.5 text-micro font-bold text-primary/60 outline-none placeholder:text-primary/25"
                placeholder="Descripción…"
                value={item.descripcion ?? ""}
                onChange={(e) => onActualizar(item.id, { descripcion: e.target.value })}
              />
            </div>

            <NotasField value={item.notas ?? ""} onChange={(notas) => onActualizar(item.id, { notas })} />
          </div>
        </div>
      </div>
    </PanelFlotanteBase>
  );
}

// ─── ListaVinculosSimple: como ListaVinculosMN pero sin campo de rol —
// para sistema_organos, que no tiene esa columna. ─────────────────────────

interface VinculoConId {
  vinculo_id: string;
}

function ListaVinculosSimple<T extends VinculoConId>({
  items,
  loading,
  catalogo,
  loadingCatalogo,
  getNombre,
  getCatalogoId,
  iconoCatalogo,
  onAgregar,
  onQuitar,
  onAbrirItem,
}: {
  items: T[];
  loading: boolean;
  catalogo: { id: string; nombre: string }[];
  loadingCatalogo?: boolean;
  getNombre: (v: T) => string;
  getCatalogoId: (v: T) => string;
  iconoCatalogo?: React.ReactNode;
  onAgregar: (catalogoId: string) => void;
  onQuitar: (vinculoId: string) => void;
  onAbrirItem?: (catalogoId: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);

  const yaVinculadosIds = useMemo(() => new Set(items.map(getCatalogoId)), [items, getCatalogoId]);
  const disponibles = useMemo(
    () => catalogo.filter((c) => !yaVinculadosIds.has(c.id)),
    [catalogo, yaVinculadosIds],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {loading ? (
        <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-micro text-primary/25 italic py-1">Sin vínculos todavía</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((v) => (
            <div
              key={v.vinculo_id}
              className="flex items-center gap-1.5 bg-primary/5 rounded-md pl-2.5 pr-1.5 py-1.5 border border-primary/10"
            >
              {iconoCatalogo}
              <button
                type="button"
                onClick={() => onAbrirItem?.(getCatalogoId(v))}
                disabled={!onAbrirItem}
                className="flex-1 min-w-0 truncate text-left text-micro font-bold text-primary/80 disabled:cursor-default hover:enabled:text-accent hover:enabled:underline cursor-pointer"
              >
                {getNombre(v) || "Sin nombre"}
              </button>
              <button
                type="button"
                onClick={() => onQuitar(v.vinculo_id)}
                title="Quitar"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-primary/40 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {buscando ? (
        <PickerCatalogoExistente
          disponibles={disponibles}
          loading={loadingCatalogo}
          onElegir={(id) => {
            onAgregar(id);
            setBuscando(false);
          }}
          onClose={() => setBuscando(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setBuscando(true)}
          className="flex items-center gap-1 self-start text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors cursor-pointer"
        >
          <Plus size={10} /> Agregar
        </button>
      )}
    </div>
  );
}

// ─── ListaVinculosProporcion: como ListaVinculosSimple pero con input de
// proporción — para organismo_sistemas, que sí tiene esa columna. ─────────

interface VinculoConProporcion {
  vinculo_id: string;
  proporcion: string | null;
}

function ListaVinculosProporcion<T extends VinculoConProporcion>({
  items,
  loading,
  catalogo,
  loadingCatalogo,
  getNombre,
  getCatalogoId,
  proporcionPlaceholder,
  iconoCatalogo,
  onAgregar,
  onActualizarProporcion,
  onQuitar,
  onAbrirItem,
}: {
  items: T[];
  loading: boolean;
  catalogo: { id: string; nombre: string }[];
  loadingCatalogo?: boolean;
  getNombre: (v: T) => string;
  getCatalogoId: (v: T) => string;
  proporcionPlaceholder: string;
  iconoCatalogo?: React.ReactNode;
  onAgregar: (catalogoId: string) => void;
  onActualizarProporcion: (vinculoId: string, proporcion: string) => void;
  onQuitar: (vinculoId: string) => void;
  onAbrirItem?: (catalogoId: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);

  const yaVinculadosIds = useMemo(() => new Set(items.map(getCatalogoId)), [items, getCatalogoId]);
  const disponibles = useMemo(
    () => catalogo.filter((c) => !yaVinculadosIds.has(c.id)),
    [catalogo, yaVinculadosIds],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {loading ? (
        <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-micro text-primary/25 italic py-1">Sin vínculos todavía</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((v) => (
            <div
              key={v.vinculo_id}
              className="flex items-center gap-1.5 bg-primary/5 rounded-md pl-2.5 pr-1.5 py-1.5 border border-primary/10"
            >
              {iconoCatalogo}
              <button
                type="button"
                onClick={() => onAbrirItem?.(getCatalogoId(v))}
                disabled={!onAbrirItem}
                className="shrink-0 max-w-[45%] truncate text-left text-micro font-bold text-primary/80 disabled:cursor-default hover:enabled:text-accent hover:enabled:underline cursor-pointer"
              >
                {getNombre(v) || "Sin nombre"}
              </button>
              <input
                value={v.proporcion ?? ""}
                onChange={(e) => onActualizarProporcion(v.vinculo_id, e.target.value)}
                placeholder={proporcionPlaceholder}
                className="flex-1 min-w-0 bg-transparent px-0 py-0.5 text-micro text-primary/60 outline-none placeholder:text-primary/25"
              />
              <button
                type="button"
                onClick={() => onQuitar(v.vinculo_id)}
                title="Quitar"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-primary/40 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {buscando ? (
        <PickerCatalogoExistente
          disponibles={disponibles}
          loading={loadingCatalogo}
          onElegir={(id) => {
            onAgregar(id);
            setBuscando(false);
          }}
          onClose={() => setBuscando(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setBuscando(true)}
          className="flex items-center gap-1 self-start text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors cursor-pointer"
        >
          <Plus size={10} /> Agregar
        </button>
      )}
    </div>
  );
}

function PickerCatalogoExistente({
  disponibles,
  loading,
  onElegir,
  onClose,
}: {
  disponibles: { id: string; nombre: string }[];
  loading?: boolean;
  onElegir: (id: string) => void;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return disponibles;
    return disponibles.filter((d) => d.nombre.toLowerCase().includes(q));
  }, [disponibles, busqueda]);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-primary/5 rounded-md pl-2.5 pr-1.5 py-1.5 border border-primary/15">
        <Search size={12} className="text-primary/30 shrink-0" />
        <input
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onBlur={() => setTimeout(onClose, 120)}
          placeholder={loading ? "Cargando…" : "Buscar para vincular…"}
          className="flex-1 min-w-0 bg-transparent px-0 py-0.5 text-micro font-bold text-primary outline-none placeholder:text-primary/30 placeholder:font-normal"
        />
        <button
          type="button"
          onMouseDown={onClose}
          title="Cancelar"
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-primary/30 hover:text-primary transition-colors cursor-pointer"
        >
          <X size={10} />
        </button>
      </div>

      <div
        className="absolute z-20 mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-md border shadow-lg"
        style={{
          background: "var(--bg-main)",
          borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
        }}
      >
        {filtrados.length === 0 ? (
          <p className="text-micro text-primary/25 italic text-center py-2">Sin resultados</p>
        ) : (
          filtrados.slice(0, 30).map((d) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={() => onElegir(d.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-micro font-bold text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate"
            >
              {d.nombre || "Sin nombre"}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Piezas chicas compartidas (idénticas a CatalogoTejidosBiologia) ──────

/**
 * Caja blanca interna del panel — ver comentario equivalente en
 * CatalogoTejidosBiologia.PanelFlotanteBase: el portal/backdrop ahora
 * vive UNA sola vez en PanelFlotanteShellBiologia (BiologiaPage.tsx).
 */
function PanelFlotanteBase({
  children,
  sinAnimacion,
}: {
  children: React.ReactNode;
  sinAnimacion?: boolean;
}) {
  return (
    <div
      className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      style={{
        background: "var(--bg-main)",
        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        animation: sinAnimacion ? "none" : "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function PanelFlotanteHeader({
  icono,
  nombre,
  placeholder,
  onChangeNombre,
  onEliminar,
  eliminando,
  onCerrar,
}: {
  icono: React.ReactNode;
  nombre: string;
  placeholder: string;
  onChangeNombre: (nombre: string) => void;
  onEliminar: () => void;
  eliminando?: boolean;
  onCerrar: () => void;
}) {
  return (
    <div
      className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
        }}
      >
        {icono}
      </div>
      <input
        className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        placeholder={placeholder}
        value={nombre}
        onChange={(e) => onChangeNombre(e.target.value)}
      />
      <button
        type="button"
        onClick={onEliminar}
        disabled={eliminando}
        title="Eliminar"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-micro font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all disabled:opacity-40 cursor-pointer"
      >
        <Trash2 size={10} />
      </button>
      <button
        type="button"
        onClick={onCerrar}
        title="Cerrar (Esc)"
        className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ErrorBanner({ texto }: { texto: string }) {
  return (
    <p className="text-micro text-red-500/80 bg-red-500/5 border border-red-500/15 rounded-md px-2 py-1.5">
      {texto}
    </p>
  );
}

function NotasField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-1">Notas</p>
      <textarea
        className="w-full min-h-[4rem] bg-transparent px-0 py-1 text-primary/70 resize-none outline-none placeholder:text-primary/25"
        placeholder="Notas…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NotaReutilizable({ label }: { label: string }) {
  return (
    <p className="text-micro text-primary/25 italic">
      Reutilizable: se puede vincular a varios {label} desde el botón &quot;Agregar&quot; de cada uno.
    </p>
  );
}
