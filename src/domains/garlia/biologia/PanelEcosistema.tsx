"use client";

/**
 * PanelEcosistema.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Panel de detalle de un ecosistema (bioma/clima + criaturas que lo habitan)
 * y, dentro de él, sus cadenas alimenticias (eslabones ordenados por rol
 * trófico, cada uno con 1+ criaturas).
 *
 * La página de lista/chips de ecosistemas se eliminó — Ecosistemas ahora se
 * navegan y editan desde Entidades → EcosistemaEditor.tsx, que renderiza
 * este panel directamente.
 */

import { ArrowLeft, Bug, Compass, Gem, Leaf, Plus, Salad, SlidersHorizontal, Trash2, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { useMobileAsidePanel, useRegisterMobileAside } from "@/hooks/ui/useMobileAsidePanel";
import { RichEditor } from "@/editor/lexical";
import { SeccionEntidad } from "@/ui/SeccionEntidad";
import { type SaveStatus } from "@/ui/saveStatus";

import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";

import { SelectorFloraMulti } from "@/domains/garlia/flora/SelectorFloraMulti";
import { useFloraCatalogoMin } from "@/domains/garlia/flora/useFloraCatalogoMin";
import { SelectorMineralesMulti } from "@/domains/garlia/minerales/SelectorMineralesMulti";
import { useMineralesCatalogoMin } from "@/domains/garlia/minerales/useMineralesCatalogoMin";
import { useReinosMin } from "@/domains/garlia/reinos/useReinosMin";

import { SelectorCriaturasMulti } from "./SelectorCriaturasMulti";
import { useBiomas } from "./useBiologia";
import { useMapaEcologico } from "./useMapaEcologico";
import {
  ROL_TROFICO_LABEL,
  ROLES_TROFICOS,
  type CadenaAlimenticia,
  type Ecosistema,
  type EslabonTrofico,
  type RolTrofico,
} from "./types";

// ─── Editor de un eslabón trófico ───────────────────────────────────────────

function EditorEslabon({
  eslabon,
  onChange,
  onDelete,
  onSelectCriatura,
}: {
  eslabon: EslabonTrofico;
  onChange: (patch: Partial<EslabonTrofico>) => void;
  onDelete: () => void;
  onSelectCriatura?: (id: string) => void;
}) {
  return (
    <div className="p-2.5 rounded-xl border border-primary/10 bg-primary/[0.02]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <select
          className="bg-transparent text-xs font-bold text-primary/80 outline-none"
          value={eslabon.rol}
          onChange={(e) => onChange({ rol: e.target.value as RolTrofico })}
        >
          {ROLES_TROFICOS.map((r) => (
            <option key={r} value={r}>
              {ROL_TROFICO_LABEL[r]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 rounded-md text-primary/25 hover:text-red-400 hover:bg-red-400/10"
        >
          <X size={11} />
        </button>
      </div>
      <input
        className="w-full mb-2 bg-transparent text-micro text-primary/60 outline-none placeholder:text-primary/25 px-0.5"
        placeholder="Nota (opcional): qué come, cómo encaja acá…"
        value={eslabon.nota ?? ""}
        onChange={(e) => onChange({ nota: e.target.value })}
      />
      <SelectorCriaturasMulti
        ids={eslabon.criatura_ids ?? []}
        onChange={(ids) => onChange({ criatura_ids: ids })}
        onSelectCriatura={onSelectCriatura}
        compacto
        label="Criaturas en este rol"
      />
      {eslabon.rol === "productor" && (
        <div className="mt-2">
          <SelectorFloraMulti
            ids={eslabon.flora_ids ?? []}
            onChange={(ids) => onChange({ flora_ids: ids })}
            compacto
            label="Flora en este rol"
          />
        </div>
      )}
    </div>
  );
}

// ─── Editor de una cadena alimenticia completa ──────────────────────────────

function PanelCadena({
  cadena,
  onSave,
  onDelete,
  onSelectCriatura,
}: {
  cadena: CadenaAlimenticia;
  onSave: (updates: Partial<CadenaAlimenticia>) => void;
  onDelete: () => void;
  onSelectCriatura?: (id: string) => void;
}) {
  const [nombre, setNombre] = useState(cadena.nombre);
  const [descripcion, setDescripcion] = useState(cadena.descripcion ?? "");
  const [eslabones, setEslabones] = useState<EslabonTrofico[]>(cadena.eslabones ?? []);

  useEffect(() => {
    setNombre(cadena.nombre);
    setDescripcion(cadena.descripcion ?? "");
    setEslabones(cadena.eslabones ?? []);
  }, [cadena.id]);

  const guardar = (patch?: Partial<CadenaAlimenticia>) => {
    onSave({
      nombre: nombre.trim() || cadena.nombre,
      descripcion,
      eslabones,
      ...patch,
    });
  };

  const agregarEslabon = () => {
    const nuevo: EslabonTrofico = {
      id: crypto.randomUUID(),
      rol: "productor",
      criatura_ids: [],
      flora_ids: [],
    };
    const next = [...eslabones, nuevo];
    setEslabones(next);
    guardar({ eslabones: next });
  };

  const actualizarEslabon = (id: string, patch: Partial<EslabonTrofico>) => {
    const next = eslabones.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEslabones(next);
    guardar({ eslabones: next });
  };

  const eliminarEslabon = (id: string) => {
    const next = eslabones.filter((e) => e.id !== id);
    setEslabones(next);
    guardar({ eslabones: next });
  };

  return (
    <div className="p-3 rounded-xl border border-primary/10 bg-white-custom/60">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <Salad size={11} className="text-accent/60 shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent text-xs font-black text-primary truncate outline-none placeholder:text-primary/25 px-1 py-0.5 rounded hover:bg-primary/5 focus:bg-primary/8"
            placeholder="Nombre de la cadena…"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => guardar()}
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 rounded-md text-primary/25 hover:text-red-400 hover:bg-red-400/10"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <input
        className="w-full mb-2.5 bg-transparent text-micro text-primary/50 outline-none placeholder:text-primary/25 px-1"
        placeholder="Descripción corta…"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        onBlur={() => guardar()}
      />

      <div className="space-y-1.5">
        {eslabones.map((e) => (
          <EditorEslabon
            key={e.id}
            eslabon={e}
            onChange={(patch) => actualizarEslabon(e.id, patch)}
            onDelete={() => eliminarEslabon(e.id)}
            onSelectCriatura={onSelectCriatura}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={agregarEslabon}
        className="mt-2 flex items-center gap-1.5 text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
      >
        <Plus size={10} /> Añadir eslabón
      </button>
    </div>
  );
}

// ─── Panel de detalle de ecosistema ──────────────────────────────────────────

/** Registra el aside en el store global (botón "Entidades" en la barra del
 *  panel flotante) mientras esté montado — ver PanelBioma. */
function RegistroAsideMovil() {
  useRegisterMobileAside();
  return null;
}

export function PanelEcosistema({
  ecosistema,
  floraIds,
  onChangeFlora,
  reinoIdsPorBioma,
  cadenas,
  creandoCadena,
  onSave,
  onDelete,
  onVolver,
  onCrearCadena,
  onActualizarCadena,
  onEliminarCadena,
  onSelectCriatura,
  onSelectFlora,
  onSelectMineral,
  onSelectBioma,
  onSelectHabitat,
  modoPopover = false,
  onHeaderControlsChange,
}: {
  ecosistema: Ecosistema;
  /** Flora (por id) que crece/habita en este ecosistema — vive en la
   *  tabla puente ecosistema_flora (M:N), ya no en Ecosistema. */
  floraIds: string[];
  onChangeFlora: (ids: string[]) => void;
  /** Resuelve los reinos con territorio en un bioma dado (bioma_reinos) —
   *  usado solo para mostrar el Reino heredado del bioma_id actual, como
   *  referencia navegable (no editable desde acá). */
  reinoIdsPorBioma: (biomaId: string) => string[];
  cadenas: CadenaAlimenticia[];
  creandoCadena: boolean;
  onSave: (updates: Partial<Ecosistema>) => void;
  onDelete: () => void;
  onVolver: () => void;
  onCrearCadena: () => void;
  onActualizarCadena: (id: string, updates: Partial<CadenaAlimenticia>) => void;
  onEliminarCadena: (id: string) => void;
  onSelectCriatura?: (id: string) => void;
  /** Abre el editor/panel flotante de la Flora o Mineral clickeada en la
   *  barra lateral — mismo patrón que onSelectCriatura. */
  onSelectFlora?: (id: string) => void;
  onSelectMineral?: (id: string) => void;
  /** Abre el editor completo del bioma actualmente seleccionado. */
  onSelectBioma?: (id: string) => void;
  /** Abre el panel flotante del hábitat clickeado (mismo patrón que
   *  CriaturasJerarquica: abrirPanel("habitat", id)). Las criaturas ya no
   *  se añaden desde acá: se navega al hábitat y se gestionan ahí. */
  onSelectHabitat?: (id: string) => void;
  /** true cuando se renderiza dentro de un popover flotante: el botón
   *  izquierdo pasa de "volver" (flecha) a "cerrar" (X). */
  modoPopover?: boolean;
  /** Si se pasa, el panel NO dibuja su cabecera propia: publica nombre/
   *  guardar/eliminar al contenedor (PanelFlotanteGlobal) como el resto de
   *  las entidades. El layout interno (contenido + aside) no cambia. */
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const { biomas } = useBiomas();
  const [nombre, setNombre] = useState(ecosistema.nombre);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const layoutDosColumnas = modoPopover || !!onHeaderControlsChange;
  const [clima, setClima] = useState(ecosistema.clima ?? "");
  const [descripcion, setDescripcion] = useState(ecosistema.descripcion ?? "");
  // Barra lateral (Flora/Minerales/Reino/Cadenas, según el resto del
  // archivo): en celular arranca oculta y se abre con el botón "Entidades"
  // de la barra de título — mismo comportamiento que EditorCriatura/
  // EditorReino/PanelBioma.
  const [mobileSidebarLocal, setMobileSidebarLocal] = useState(false);
  const usaAsideGlobal = !!onHeaderControlsChange;
  const asideGlobalAbierto = useMobileAsidePanel((st) => st.open);
  const cerrarAsideGlobal = useMobileAsidePanel((st) => st.close);
  const mobileSidebarOpen = usaAsideGlobal ? asideGlobalAbierto : mobileSidebarLocal;
  const setMobileSidebarOpen = (v: boolean) =>
    usaAsideGlobal ? (v ? undefined : cerrarAsideGlobal()) : setMobileSidebarLocal(v);

  useEffect(() => {
    setNombre(ecosistema.nombre);
    setClima(ecosistema.clima ?? "");
    setDescripcion(ecosistema.descripcion ?? "");
  }, [ecosistema.id]);

  const guardar = () => {
    setStatus("saving");
    try {
      onSave({ nombre: nombre.trim() || ecosistema.nombre, clima, descripcion });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  usePublishHeaderControls(
    {
      IconoFallback: Leaf,
      nombre,
      placeholderNombre: "Nombre del ecosistema…",
      onChangeNombre: setNombre,
      onBlurNombre: guardar,
      status,
      onGuardar: guardar,
      onEliminar: onDelete,
    },
    onHeaderControlsChange,
  );

  // ── Barra lateral — Criaturas / Flora / Minerales / Reino, mismo patrón
  // que Personajes/Criaturas/Ítems en LoreTab (reinos/EditorReino). El
  // Reino no vive en el ecosistema directamente: se deriva del bioma_id
  // (vía bioma_reinos), y esta sección solo lo muestra como referencia
  // navegable — no es editable desde acá (se edita en el Bioma).
  //
  // Criaturas: la pertenencia real vive en el modelo Hábitat
  // (ecosistema_participantes ⋈ ecosistema_participante_habitats), no en
  // el ecosistema. Acá solo se LEE (vía useMapaEcologico, que consulta las
  // vistas canónicas) y se navega — añadir/quitar una criatura se hace
  // desde el hábitat donde vive, igual que en CriaturasJerarquica.
  const { habitatsDe, presenciasDeHabitat, criaturaIdsDeEcosistema, loading: loadingMapaEco } =
    useMapaEcologico();
  const criaturaIds = criaturaIdsDeEcosistema(ecosistema.id);
  const habitatsDelEcosistema = habitatsDe(ecosistema.id);
  const mineralIds = ecosistema.mineral_ids ?? [];

  const { flora: catalogoFlora, loading: loadingCatalogoFlora } = useFloraCatalogoMin();
  const { minerales: catalogoMinerales, loading: loadingCatalogoMinerales } =
    useMineralesCatalogoMin();
  const catalogoReinos = useReinosMin();

  const biomaActual = biomas.find((b) => b.id === ecosistema.bioma_id);
  const reinoIdsDelBioma = biomaActual ? reinoIdsPorBioma(biomaActual.id) : [];
  const allReinosEntidad = useMemo(
    () => catalogoReinos.map((r) => ({ id: r.id, nombre: r.nombre })),
    [catalogoReinos],
  );

  const handleToggleFlora = (id: string, add: boolean) =>
    onChangeFlora(add ? [...floraIds, id] : floraIds.filter((x) => x !== id));
  const handleToggleMineral = (id: string, add: boolean) =>
    onSave({
      mineral_ids: add
        ? [...mineralIds, id]
        : mineralIds.filter((x) => x !== id),
    });

  const sectionDivider = (
    <div
      style={{
        borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
      }}
    />
  );

  const sidebar = (
    <>
      {/* Criaturas — clon visual de SeccionEntidad en modo solo-lectura,
       *  agrupado por hábitat en vez de por selección libre. No usa el
       *  componente SeccionEntidad real a propósito: ese componente
       *  siempre renderiza su propio botón "Añadir" + combo con TODO el
       *  catálogo y una "X" de quitar por chip — no tiene modo readOnly.
       *  Acá una criatura pertenece a este ecosistema porque vive en uno
       *  de sus hábitats, no porque se la "añada" al ecosistema
       *  directamente: añadir/quitar se hace entrando al hábitat (click
       *  en su nombre, abajo), igual que en CriaturasJerarquica. */}
      <div className="shrink-0 flex flex-col">
        {/* Cabecera — mismo layout/tipografía que la cabecera de
         *  SeccionEntidad, sin el trigger del combo. */}
        <div className="shrink-0 flex items-center justify-between px-2 py-1">
          <span
            className="flex items-center gap-1.5 text-micro font-black uppercase tracking-[0.2em] leading-none"
            style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}
          >
            <Bug size={9} />
            Criaturas
          </span>
          {criaturaIds.length > 0 && (
            <span
              className="text-micro font-black tabular-nums"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              {criaturaIds.length}
            </span>
          )}
        </div>

        {loadingMapaEco ? (
          <p className="text-micro font-black uppercase text-primary/20 px-2.5 py-2 text-center tracking-[0.2em] italic">
            Cargando…
          </p>
        ) : criaturaIds.length === 0 ? (
          <p className="text-micro font-black uppercase text-primary/20 px-2.5 py-2 text-center tracking-[0.2em] italic">
            Sin criaturas
          </p>
        ) : (
          // Agrupado por hábitat — mismo patrón visual que el modo
          // `groups` de SeccionEntidad (header de grupo + filas debajo).
          habitatsDelEcosistema
            .map((h) => ({ habitat: h, presentes: presenciasDeHabitat(h.habitat_id) }))
            .filter((g) => g.presentes.length > 0)
            .map(({ habitat, presentes }) => (
              <React.Fragment key={habitat.habitat_id}>
                <button
                  type="button"
                  className="flex items-center gap-1 px-3 py-0.5 hover:opacity-70 transition-opacity"
                  title={`Abrir hábitat ${habitat.habitat}`}
                  onClick={() => onSelectHabitat?.(habitat.habitat_id)}
                >
                  <span
                    className="text-micro font-black uppercase tracking-[0.2em]"
                    style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
                  >
                    {habitat.habitat}
                  </span>
                </button>
                {presentes.map((p) => (
                  <div
                    key={p.participante_id}
                    className="group flex items-center gap-2 px-2.5 py-1.5 transition-all hover:bg-primary/[0.04]"
                    style={{ cursor: p.criatura_id ? "pointer" : "default" }}
                    onClick={() => (p.criatura_id ? onSelectCriatura?.(p.criatura_id) : undefined)}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-micro font-black uppercase"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "color-mix(in srgb, var(--primary) 60%, transparent)",
                      }}
                    >
                      {(p.nombre ?? "?").charAt(0)}
                    </div>
                    <span
                      className="flex-1 min-w-0 text-micro font-black uppercase tracking-wide leading-tight break-words truncate"
                      style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}
                    >
                      {p.nombre}
                    </span>
                  </div>
                ))}
              </React.Fragment>
            ))
        )}
      </div>
      {sectionDivider}
      <SeccionEntidad
        allEntities={catalogoFlora.map((f) => ({
          id: f.id,
          nombre: f.nombre,
          imagen_url: f.imagen_url,
        }))}
        emptyLabel="Sin flora"
        fallbackIcon={<Leaf size={14} strokeWidth={1} />}
        fill={false}
        icon={<Leaf size={9} />}
        label="Flora"
        loading={loadingCatalogoFlora}
        saving={false}
        selectedIds={floraIds}
        onEntityClick={onSelectFlora}
        onToggle={handleToggleFlora}
      />
      {sectionDivider}
      <SeccionEntidad
        allEntities={catalogoMinerales.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          imagen_url: m.imagen_url,
        }))}
        emptyLabel="Sin minerales"
        fallbackIcon={<Gem size={14} strokeWidth={1} />}
        fill={false}
        icon={<Gem size={9} />}
        label="Minerales"
        loading={loadingCatalogoMinerales}
        saving={false}
        selectedIds={mineralIds}
        onEntityClick={onSelectMineral}
        onToggle={handleToggleMineral}
      />
      {sectionDivider}
      <SeccionEntidad
        allEntities={allReinosEntidad}
        emptyLabel="Sin reinos (vía bioma)"
        fallbackIcon={<Compass size={14} strokeWidth={1} />}
        fill={false}
        icon={<Compass size={9} />}
        label="Reinos"
        loading={false}
        saving={false}
        selectedIds={reinoIdsDelBioma}
        onEntityClick={onSelectBioma ? () => onSelectBioma(ecosistema.bioma_id!) : undefined}
        onToggle={() => {}}
      />
    </>
  );

  return (
    <div className={layoutDosColumnas ? "flex flex-1 h-full min-h-0" : undefined}>
      {usaAsideGlobal && <RegistroAsideMovil />}
      <div
        className={
          layoutDosColumnas
            ? `flex-1 min-w-0 flex flex-col min-h-0 ${usaAsideGlobal ? "p-4" : ""}`
            : undefined
        }
      >
      {!onHeaderControlsChange && (
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            guardar();
            onVolver();
          }}
          className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          {modoPopover ? <X size={14} /> : <ArrowLeft size={14} />}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <Leaf size={12} className="text-accent/60 shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-black uppercase italic tracking-tight text-primary truncate outline-none placeholder:text-primary/25 px-1 py-0.5 rounded hover:bg-primary/5 focus:bg-primary/8"
            placeholder="Nombre del ecosistema…"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardar}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {modoPopover && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              title="Entidades"
              aria-label="Entidades"
              className="sm:hidden p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            >
              <SlidersHorizontal size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-primary/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={guardar}
            className="text-micro font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary text-bg-main hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </div>
      </div>
      )}

      {layoutDosColumnas ? (
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                  Bioma
                </span>
                {ecosistema.bioma_id && onSelectBioma && (
                  <button
                    type="button"
                    onClick={() => onSelectBioma(ecosistema.bioma_id!)}
                    className="text-micro font-bold text-accent/60 hover:text-accent transition-colors"
                  >
                    Abrir
                  </button>
                )}
              </div>
              <select
                className="w-full bg-primary/[0.02] border border-primary/10 rounded-lg px-2.5 py-1.5 text-xs outline-none placeholder:text-primary/30"
                value={ecosistema.bioma_id ?? ""}
                onChange={(e) => onSave({ bioma_id: e.target.value || null })}
              >
                <option value="">Sin bioma</option>
                {biomas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1">
                Clima
              </span>
              <input
                className="w-full bg-primary/[0.02] border border-primary/10 rounded-lg px-2.5 py-1.5 text-xs outline-none placeholder:text-primary/30"
                placeholder="Ej. húmedo templado…"
                value={clima}
                onChange={(e) => setClima(e.target.value)}
                onBlur={guardar}
              />
            </div>
          </div>

          <div>
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1.5">
              Descripción
            </span>
            <RichEditor
              minHeight="5rem"
              placeholder="Cómo es el ecosistema, particularidades, peligros…"
              value={descripcion}
              onChange={setDescripcion}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                Cadenas alimenticias
              </span>
              <button
                type="button"
                disabled={creandoCadena}
                onClick={onCrearCadena}
                className="flex items-center gap-1 text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors disabled:opacity-40"
              >
                <Plus size={10} /> Nueva cadena
              </button>
            </div>

            {cadenas.length === 0 ? (
              <p className="text-micro text-primary/25 italic py-1">Sin cadenas todavía</p>
            ) : (
              <div className="space-y-2.5">
                {cadenas.map((c) => (
                  <PanelCadena
                    key={c.id}
                    cadena={c}
                    onSave={(updates) => onActualizarCadena(c.id, updates)}
                    onDelete={() => onEliminarCadena(c.id)}
                    onSelectCriatura={onSelectCriatura}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                  Bioma
                </span>
                {ecosistema.bioma_id && onSelectBioma && (
                  <button
                    type="button"
                    onClick={() => onSelectBioma(ecosistema.bioma_id!)}
                    className="text-micro font-bold text-accent/60 hover:text-accent transition-colors"
                  >
                    Abrir
                  </button>
                )}
              </div>
              <select
                className="w-full bg-primary/[0.02] border border-primary/10 rounded-lg px-2.5 py-1.5 text-xs outline-none placeholder:text-primary/30"
                value={ecosistema.bioma_id ?? ""}
                onChange={(e) => onSave({ bioma_id: e.target.value || null })}
              >
                <option value="">Sin bioma</option>
                {biomas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1">
                Clima
              </span>
              <input
                className="w-full bg-primary/[0.02] border border-primary/10 rounded-lg px-2.5 py-1.5 text-xs outline-none placeholder:text-primary/30"
                placeholder="Ej. húmedo templado…"
                value={clima}
                onChange={(e) => setClima(e.target.value)}
                onBlur={guardar}
              />
            </div>
          </div>

          <div className="mb-4">
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1.5">
              Descripción
            </span>
            <RichEditor
              minHeight="6.25rem"
              placeholder="Cómo es el ecosistema, particularidades, peligros…"
              value={descripcion}
              onChange={setDescripcion}
            />
          </div>

          <div className="mb-4">
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1.5">
              Criaturas que lo habitan
            </span>
            {/* Solo lectura + navegación: las criaturas de un ecosistema son
             *  las que están presentes en alguno de sus hábitats. Añadir o
             *  quitar una criatura se hace desde el hábitat, no desde acá
             *  (mismo modelo que CriaturasJerarquica). */}
            {loadingMapaEco ? (
              <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
            ) : habitatsDelEcosistema.length === 0 ? (
              <p className="text-micro text-primary/25 italic py-1">
                Este ecosistema todavía no tiene hábitats.
              </p>
            ) : (
              <div className="space-y-2">
                {habitatsDelEcosistema.map((h) => {
                  const presentes = presenciasDeHabitat(h.habitat_id);
                  return (
                    <div key={h.habitat_id}>
                      <button
                        type="button"
                        onClick={() => onSelectHabitat?.(h.habitat_id)}
                        className="text-micro font-bold text-primary/60 hover:text-primary transition-colors mb-1"
                      >
                        {h.habitat}
                      </button>
                      {presentes.length === 0 ? (
                        <p className="text-micro text-primary/25 italic py-0.5">
                          Sin criaturas asignadas — añadilas desde el hábitat
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {presentes.map((p) => (
                            <button
                              key={p.participante_id}
                              type="button"
                              title={p.nombre ?? undefined}
                              onClick={() =>
                                p.criatura_id ? onSelectCriatura?.(p.criatura_id) : undefined
                              }
                              className="px-2 py-1 rounded-full border border-primary/10 bg-primary/[0.02] hover:border-primary/25 transition-colors text-micro font-bold text-primary/70 truncate max-w-[160px]"
                            >
                              {p.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-4">
            <SelectorFloraMulti
              ids={floraIds}
              onChange={onChangeFlora}
              label="Flora del ecosistema"
            />
          </div>

          <div className="mb-4">
            <SelectorMineralesMulti
              ids={ecosistema.mineral_ids ?? []}
              onChange={(ids) => onSave({ mineral_ids: ids })}
              label="Minerales del ecosistema"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                Cadenas alimenticias
              </span>
              <button
                type="button"
                disabled={creandoCadena}
                onClick={onCrearCadena}
                className="flex items-center gap-1 text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors disabled:opacity-40"
              >
                <Plus size={10} /> Nueva cadena
              </button>
            </div>

            {cadenas.length === 0 ? (
              <p className="text-micro text-primary/25 italic py-1">Sin cadenas todavía</p>
            ) : (
              <div className="space-y-2.5">
                {cadenas.map((c) => (
                  <PanelCadena
                    key={c.id}
                    cadena={c}
                    onSave={(updates) => onActualizarCadena(c.id, updates)}
                    onDelete={() => onEliminarCadena(c.id)}
                    onSelectCriatura={onSelectCriatura}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </div>

      {/* ── Barra lateral — sección Entidad (Criaturas/Flora/Minerales/Reinos) ──
          Solo en modo popover: la pantalla completa (EcosistemaEditor) mantiene
          el layout original de una sola columna. En celular arranca oculta
          (hidden sm:flex) y se abre como drawer con el botón "Entidades" de
          la barra de título — mismo comportamiento que EditorCriatura/
          EditorReino/PanelBioma. */}
      {layoutDosColumnas && (
        <aside
          className={`hidden sm:flex shrink-0 w-44 flex-col border-l overflow-y-auto overflow-x-hidden pl-0 ${
            usaAsideGlobal ? "" : "-my-4 -mr-4"
          }`}
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            background: "color-mix(in srgb, var(--primary) 1%, transparent)",
            scrollbarWidth: "none",
          }}
        >
          {sidebar}
        </aside>
      )}

      {/* ── Barra lateral — mobile drawer ─────────────────────────────────── */}
      {layoutDosColumnas && mobileSidebarOpen && (
        <div className="sm:hidden fixed inset-0 z-[10000] flex justify-end">
          <div
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
            onClick={() => setMobileSidebarOpen(false)}
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
              <span className="text-micro font-black uppercase tracking-[0.2em] flex items-center gap-1.5 text-primary/40">
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X size={13} />
              </button>
            </div>

            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
