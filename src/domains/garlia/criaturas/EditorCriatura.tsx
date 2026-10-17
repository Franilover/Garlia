"use client";

/**
 * EditorCriatura.tsx
 * ───────────────────
 * Layout rediseñado: bloques horizontales, sin emojis, sin fondos,
 * bordes mínimos solo para separar secciones.
 *
 * Grid principal (desktop):
 *   ┌─────────────────┬──────────────────────────┐
 *   │  Imagen         │  Descripción (RichEditor) │
 *   ├────────┬────────┴──────────────────────────┤
 *   │  Org.  │  Órganos del org. │ Sistemas org.  │
 *   ├────────┴───────────────────────────────────┤
 *   │  Entidades (Personajes · Territorio · …)    │
 *   └─────────────────────────────────────────────┘
 */

import {
  Atom,
  Beaker,
  Boxes,
  Bug,
  Globe,
  Home,
  Image as ImageIcon,
  Layers,
  MapPin,
  Package,
  PawPrint,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trees,
  UserCircle2,
  Users,
  Wand2,
  Waypoints,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

import {
  useMobileAsidePanel,
  useRegisterMobileAside,
} from "@/hooks/ui/useMobileAsidePanel";

import type { WikiEntity } from "@/ui/Markdown/commandItems";
import { RichEditor } from "@/editor/lexical";
import { SeccionEntidad } from "@/ui/SeccionEntidad";
import {
  useCriaturaReinos,
  useCriaturaCiudades,
} from "@/domains/garlia/criaturas/CriaturaHabitat";
import { useCraftedItems } from "@/domains/garlia/criaturas/CriaturaItemsCraftedos";
import { PickerImagenCriaturaBtn } from "@/domains/garlia/criaturas/PickerImagenCriaturaBtn";
import {
  SelectorImagen,
} from "@/domains/garlia/_shared/UIComponents";
import { EditorHeaderBar } from "@/domains/garlia/_shared/EditorHeaderBar";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { useWikilink } from "@/domains/garlia/_shared/WikilinkContext";
import { useCriaturaAsideCatalogs } from "@/domains/garlia/criaturas/useCriaturaAsideCatalogs";
import { useCriaturaOrganos } from "@/domains/garlia/criaturas/useCriaturaOrganos";
import { useCriaturaOrganismos } from "@/domains/garlia/criaturas/useCriaturaOrganismos";
import { useComposicionDeOrganismos } from "@/domains/garlia/elementos/useComposicionDeOrganismos";
import { BreadcrumbJerarquia } from "@/domains/garlia/biologia/BreadcrumbJerarquia";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import { useCriaturaJerarquiaEcologica } from "@/domains/garlia/criaturas/useCriaturaJerarquiaEcologica";
import { usePersonajesDeCriatura } from "@/domains/garlia/criaturas/usePersonajesDeCriatura";
import { GrupoCompuestoPanelFlotante } from "@/domains/garlia/elementos/GruposCompuestosPage";
import { PanelEditorOrganismo } from "@/domains/garlia/biologia/CatalogoSistemasBiologia";
import { SistemaPanelFlotante } from "@/domains/garlia/criaturas/SistemaPanelFlotante";
import { useOrganismoSistemas } from "@/domains/garlia/elementos/useOrganismoSistemas";
import { useOrganismoOrganos } from "@/domains/garlia/elementos/useOrganismoOrganos";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useCelulas } from "@/domains/garlia/elementos/useCelulas";
import { useTejidos } from "@/domains/garlia/elementos/useTejidos";
import { PanelEditorCelula, PanelEditorTejido } from "@/domains/garlia/biologia/CatalogoTejidosBiologia";
import { useOrganos } from "@/domains/garlia/elementos/useOrganos";
import { useOrganismos } from "@/domains/garlia/elementos/useOrganismos";
import { useSistemas } from "@/domains/garlia/elementos/useSistemas";
import { useElementos } from "@/domains/garlia/elementos/useElementos";
import type { Organo, Organismo } from "@/domains/garlia/elementos/types";
import { supabase } from "@/infra/supabase/supabase";
import { dexiePut, dexieDelete } from "@/lib/utils/dexieHelpers";

import { type Criatura } from "@/domains/garlia/criaturas/types";
import { type SaveStatus } from "@/ui/saveStatus";

// ─── Tokens de borde mínimo ──────────────────────────────────────────────────
const BORDER = "color-mix(in srgb, var(--primary) 8%, transparent)";
const BORDER_STRONG = "color-mix(in srgb, var(--primary) 12%, transparent)";

// ─── EditorCriatura ───────────────────────────────────────────────────────────
export function EditorCriatura({
  item,
  onSaved,
  onDeleted,
  entities = [],
  onSelectItem,
  onSelectPersonaje,
  onSelectCriatura,
  onNavigateCiudad,
  onNavigateReino,
  onHeaderControlsChange,
}: {
  item: Criatura;
  onSaved: (c: Criatura) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectItem?: (itemId: string) => void;
  onSelectPersonaje?: (personajeId: string) => void;
  onSelectCriatura?: (criaturaId: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const [form, setForm] = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { onWikilink } = useWikilink();

  const {
    personajes: personajesDeEspecie,
    loading: loadingPersonajes,
    saving: savingPersonajes,
    toggle: togglePersonaje,
  } = usePersonajesDeCriatura(form.id, item.nombre);

  const { items: elementosPerfil } = useElementos();
  const [editandoGrupoId, setEditandoGrupoId] = useState<string | null>(null);
  const { items: compuestosOrganos, setItems: setCompuestosOrganos } = useCompuestosConElementos();
  const { items: catalogoOrganos, setItems: setCatalogoOrganos } = useOrganos();
  const organosCriatura = useCriaturaOrganos(form.id, catalogoOrganos);
  const { items: catalogoOrganismos, setItems: setCatalogoOrganismos } = useOrganismos();
  const organismosCriatura = useCriaturaOrganismos(form.id);

  const organismoIdsCriatura = useMemo(
    () => organismosCriatura.items.map((v) => v.organismo_id),
    [organismosCriatura.items],
  );
  const composicionCriatura = useComposicionDeOrganismos(organismoIdsCriatura);
  const jerarquiaEcologica = useCriaturaJerarquiaEcologica(form.id);
  const abrirPanel = usePanelFlotante((s) => s.abrir);

  const [editandoOrganismoId, setEditandoOrganismoId] = useState<string | null>(null);
  const { items: catalogoSistemas } = useSistemas();

  function cerrarPilaBiologia() {
    setEditandoOrganismoId(null);
    setEditandoSistemaOrganismoId(null);
    setEditandoOrganoDirectoOrganismoId(null);
    setEditandoGrupoId(null);
    setEditandoTejidoId(null);
    setEditandoCelulaId(null);
  }
  function saltarAOrganismo(id: string) { cerrarPilaBiologia(); setEditandoOrganismoId(id); }
  function saltarASistema(id: string) { cerrarPilaBiologia(); setEditandoSistemaOrganismoId(id); }
  function saltarAOrgano(id: string) { cerrarPilaBiologia(); setEditandoGrupoId(id); }
  function saltarATejido(id: string) { cerrarPilaBiologia(); setEditandoTejidoId(id); }
  function saltarACelula(id: string) { cerrarPilaBiologia(); setEditandoCelulaId(id); }

  const organismoPrincipalVinculo = useMemo(() => {
    if (organismosCriatura.items.length === 0) return null;
    return (
      organismosCriatura.items.find((v) => v.es_principal) ?? organismosCriatura.items[0]
    );
  }, [organismosCriatura.items]);
  const organismoPrincipalId = organismoPrincipalVinculo?.organismo_id ?? null;

  const sistemasOrganismo = useOrganismoSistemas(organismoPrincipalId ?? "");
  const organosDirectosOrganismo = useOrganismoOrganos(organismoPrincipalId ?? "");

  const [editandoSistemaOrganismoId, setEditandoSistemaOrganismoId] = useState<string | null>(null);
  const [editandoOrganoDirectoOrganismoId, setEditandoOrganoDirectoOrganismoId] = useState<string | null>(null);
  const [editandoCelulaId, setEditandoCelulaId] = useState<string | null>(null);
  const celulasCatalogo = useCelulas();
  const [editandoTejidoId, setEditandoTejidoId] = useState<string | null>(null);
  const tejidosCatalogo = useTejidos();
  const [editandoCompuestoId, setEditandoCompuestoId] = useState<string | null>(null);

  function onOrganoActualizadoLocal(id: string, updates: Partial<Organo>) {
    setCatalogoOrganos((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }

  async function persistirOrgano(id: string, cambios: Partial<Organo>) {
    onOrganoActualizadoLocal(id, cambios);
    await organosCriatura.actualizarOrgano(id, cambios);
  }

  async function actualizarOrganismo(id: string, cambios: Partial<Organismo>) {
    setCatalogoOrganismos((prev) => prev.map((o) => (o.id === id ? { ...o, ...cambios } : o)));
    const { error } = await supabase.from("organismos").update(cambios).eq("id", id);
    if (error) console.error("[EditorCriatura] error actualizando organismo:", error);
  }

  async function eliminarOrganismo(id: string): Promise<{ ok: boolean; error: unknown }> {
    const { error } = await supabase.from("organismos").delete().eq("id", id);
    if (error) return { ok: false, error };
    setCatalogoOrganismos((prev) => prev.filter((o) => o.id !== id));
    return { ok: true, error: null };
  }

  const { allPersonajes, allReinos, allCiudades } = useCriaturaAsideCatalogs();

  const { rows: reinoRows, loading: loadingReinos, add: addReinoSidebar, remove: removeReinoSidebar } =
    useCriaturaReinos(form.id);
  const { rows: ciudadRows, loading: loadingCiudades, add: addCiudadSidebar, remove: removeCiudadSidebar } =
    useCriaturaCiudades(form.id);
  const { items: craftedItems, allItems: allCraftedItems, loading: loadingCrafted, add: addCraftedSidebar, remove: removeCraftedSidebar } =
    useCraftedItems(form.id);

  const [savingReinos, setSavingReinos] = useState(false);
  const [savingCiudades, setSavingCiudades] = useState(false);
  const [savingCrafted, setSavingCrafted] = useState(false);
  useRegisterMobileAside();
  const mobileAsideOpen = useMobileAsidePanel((s) => s.open);
  const closeMobileAside = useMobileAsidePanel((s) => s.close);

  const reinosSeleccionadosIds = reinoRows.map((r) => r.reinoId);
  const ciudadesConReino = useMemo(
    () =>
      allCiudades.filter(
        (l: { id: string; nombre: string; reino_id: string | null }) =>
          l.reino_id !== null &&
          (reinosSeleccionadosIds.length === 0 ||
            reinosSeleccionadosIds.includes(l.reino_id)),
      ),
    [allCiudades, reinosSeleccionadosIds],
  );

  useEffect(() => {
    setForm((prev) => (prev.id === item.id && status !== "idle" ? prev : item));
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.descripcion]);

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
          descripcion_dnd: form.descripcion_dnd || null,
          stats_dnd: form.stats_dnd || null,
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
    await supabase.from("criaturas").delete().eq("id", form.id);
    void dexieDelete("criaturas", form.id);
    onDeleted(form.id);
  };

  const handleTogglePersonaje = (id: string, add: boolean) =>
    togglePersonaje(id, add, form.nombre, allPersonajes);

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
      const it = allCraftedItems.find((i) => i.id === id);
      if (it) await addCraftedSidebar(it);
    } else {
      const crafted = craftedItems.find((i) => i.itemId === id);
      if (crafted) await removeCraftedSidebar(crafted.crafterId);
    }
    setSavingCrafted(false);
  };

  const headerControls = {
    imagenUrl: form.imagen_url,
    IconoFallback: Bug,
    nombre: form.nombre ?? "",
    placeholderNombre: "Nombre de la criatura",
    onChangeNombre: (nombre: string) => setForm((f) => ({ ...f, nombre })),
    status,
    onGuardar: save,
    onEliminar: del,
  };
  usePublishHeaderControls(headerControls, onHeaderControlsChange);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!onHeaderControlsChange && <EditorHeaderBar controls={headerControls} />}

        {/* Breadcrumb */}
        <div className="shrink-0 px-3 pt-2 relative z-30">
          <BreadcrumbJerarquia
            niveles={[
              { label: "Célula", icono: <Beaker size={10} />, activo: false, items: composicionCriatura.celulaItems.map((c) => ({ id: c.id, nombre: c.nombre })), loading: composicionCriatura.loading, onNavegar: saltarACelula },
              { label: "Tejido", icono: <Layers size={10} />, activo: false, items: composicionCriatura.tejidoItems.map((t) => ({ id: t.id, nombre: t.nombre })), loading: composicionCriatura.loading, onNavegar: saltarATejido },
              { label: "Órgano", icono: <Boxes size={10} />, activo: false, items: composicionCriatura.organoItems.map((o) => ({ id: o.id, nombre: o.nombre })), loading: composicionCriatura.loading, onNavegar: saltarAOrgano },
              { label: "Sistema", icono: <Layers size={10} />, activo: false, items: composicionCriatura.sistemaItems.map((s) => ({ id: s.id, nombre: s.nombre })), loading: composicionCriatura.loading, onNavegar: saltarASistema },
              { label: "Organismo", icono: <Boxes size={10} />, activo: false, items: organismosCriatura.items.map((v) => ({ id: v.organismo_id, nombre: v.organismo.nombre })), loading: organismosCriatura.loading, onNavegar: saltarAOrganismo },
              { label: "Criatura", icono: <PawPrint size={10} />, activo: true },
              { label: "Hábitat", icono: <Home size={10} />, activo: false, items: jerarquiaEcologica.habitats, loading: jerarquiaEcologica.loading, onNavegar: (id) => abrirPanel("habitat", id) },
              { label: "Ecosistema", icono: <Trees size={10} />, activo: false, items: jerarquiaEcologica.ecosistemas, loading: jerarquiaEcologica.loading, onNavegar: (id) => abrirPanel("ecosistema", id) },
              { label: "Bioma", icono: <Layers size={10} />, activo: false, items: jerarquiaEcologica.biomas, loading: jerarquiaEcologica.loading, onNavegar: (id) => abrirPanel("bioma", id) },
              { label: "Planeta", icono: <Globe size={10} />, activo: false, items: jerarquiaEcologica.planetas, loading: jerarquiaEcologica.loading, onNavegar: (id) => abrirPanel("planeta", id) },
            ]}
          />
        </div>

        {/* ── CUERPO PRINCIPAL: layout en bloques ──────────────────────────── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── FILA 1: Imagen + Descripción ─────────────────────────────── */}
          <div
            className="flex gap-0 border-b"
            style={{ borderColor: BORDER }}
          >
            {/* Imagen — columna fija */}
            <div
              className="hidden sm:flex shrink-0 items-start p-3"
              style={{ width: 140, borderRight: `1px solid ${BORDER}` }}
            >
              <SelectorImagen
                aspect="square"
                label=""
                placeholder={<Bug className="opacity-20" size={20} />}
                value={form.imagen_url ?? ""}
                onChange={(url) => setForm((f) => ({ ...f, imagen_url: url }))}
              />
            </div>

            {/* Imagen mobile */}
            <div className="sm:hidden shrink-0 relative p-3" style={{ borderRight: `1px solid ${BORDER}` }}>
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                {form.imagen_url ? (
                  <Image alt={form.nombre} className="w-full h-full object-cover" src={form.imagen_url} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bug className="text-primary/15" size={28} />
                  </div>
                )}
                <div className="absolute top-1 right-1 z-10">
                  <PickerImagenCriaturaBtn
                    value={form.imagen_url ?? ""}
                    onChange={(url) => setForm((f) => ({ ...f, imagen_url: url }))}
                  />
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="flex-1 min-w-0 flex flex-col p-3 gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
                Descripción
              </span>
              <RichEditor
                minHeight="7rem"
                placeholder="Aspecto físico general…"
                value={form.descripcion ?? ""}
                wikiEntities={entities}
                onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                onWikilinkNavigate={onWikilink}
              />
            </div>
          </div>

          {/* ── FILA 2: Biología — 3 columnas ────────────────────────────── */}
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: "minmax(160px,1fr) minmax(140px,1fr) minmax(140px,1fr)",
              borderColor: BORDER,
            }}
          >
            {/* Col A: Organismo */}
            <div className="flex flex-col" style={{ borderRight: `1px solid ${BORDER}` }}>
              <div className="px-3 pt-2.5 pb-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
                  Organismo
                </span>
              </div>
              <div className="p-3">
                <PanelOrganismosCriatura
                  items={organismosCriatura.items}
                  loading={organismosCriatura.loading}
                  catalogo={catalogoOrganismos}
                  onAgregar={(id) => void organismosCriatura.vincularExistente(id)}
                  onActualizar={organismosCriatura.actualizarVinculo}
                  onMarcarPrincipal={organismosCriatura.marcarPrincipal}
                  onQuitar={(vinculoId) => void organismosCriatura.quitar(vinculoId)}
                  onAbrirOrganismo={(organismoId) => setEditandoOrganismoId(organismoId)}
                />
              </div>
            </div>

            {/* Col B: Órganos del organismo */}
            <div className="flex flex-col" style={{ borderRight: `1px solid ${BORDER}` }}>
              <div className="px-3 pt-2.5 pb-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
                  Órganos
                </span>
              </div>
              <div className="p-3">
                {!organismoPrincipalId ? (
                  <p className="text-micro text-primary/25 italic">Vinculá un organismo.</p>
                ) : organosDirectosOrganismo.loading ? (
                  <p className="text-micro text-primary/25 italic">Cargando…</p>
                ) : organosDirectosOrganismo.items.length === 0 ? (
                  <p className="text-micro text-primary/25 italic">Sin órganos directos.</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {organosDirectosOrganismo.items.map((o) => (
                      <button
                        key={o.vinculo_id}
                        type="button"
                        onClick={() => setEditandoOrganoDirectoOrganismoId(o.organo_id)}
                        className="flex items-center gap-1.5 text-left px-1.5 py-1 rounded hover:bg-primary/5 transition-colors cursor-pointer min-w-0"
                      >
                        <Layers size={10} className="shrink-0 text-primary/25" />
                        <span className="flex-1 min-w-0 truncate text-micro font-medium text-primary/70 hover:text-accent">
                          {o.organo.nombre || "Sin nombre"}
                        </span>
                        {o.rol && <span className="shrink-0 text-micro text-primary/30">{o.rol}</span>}
                        <span className="shrink-0 text-micro text-primary/30">×{o.cantidad}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Col C: Sistemas del organismo */}
            <div className="flex flex-col">
              <div className="px-3 pt-2.5 pb-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
                  Sistemas
                </span>
              </div>
              <div className="p-3">
                {!organismoPrincipalId ? (
                  <p className="text-micro text-primary/25 italic">Vinculá un organismo.</p>
                ) : sistemasOrganismo.loading ? (
                  <p className="text-micro text-primary/25 italic">Cargando…</p>
                ) : sistemasOrganismo.items.length === 0 ? (
                  <p className="text-micro text-primary/25 italic">Sin sistemas vinculados.</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {sistemasOrganismo.items.map((s) => (
                      <button
                        key={s.vinculo_id}
                        type="button"
                        onClick={() => setEditandoSistemaOrganismoId(s.sistema_id)}
                        className="flex items-center gap-1.5 text-left px-1.5 py-1 rounded hover:bg-primary/5 transition-colors cursor-pointer min-w-0"
                      >
                        <Waypoints size={10} className="shrink-0 text-primary/25" />
                        <span className="flex-1 min-w-0 truncate text-micro font-medium text-primary/70 hover:text-accent">
                          {s.sistema.nombre || "Sin nombre"}
                        </span>
                        {s.proporcion && (
                          <span className="shrink-0 text-micro text-primary/30">{s.proporcion}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── FILA 3: Ilustración extra ─────────────────────────────────── */}
          <div
            className="flex border-b"
            style={{ borderColor: BORDER }}
          >
            <div className="flex flex-col" style={{ borderRight: `1px solid ${BORDER}`, width: 140 }}>
              <div className="px-3 pt-2.5 pb-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/30">
                  Ilustración
                </span>
              </div>
              <div className="p-3">
                <SelectorImagen
                  aspect="square"
                  label=""
                  placeholder={<ImageIcon className="opacity-20" size={18} />}
                  value={form.imagen_url ?? ""}
                  onChange={(url) => setForm((f) => ({ ...f, imagen_url: url }))}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex items-center px-3">
              <p className="text-micro text-primary/30 leading-relaxed">
                Referencias visuales de la criatura — concept art, poses, variantes.
              </p>
            </div>
          </div>

          {/* ── FILA 4: Entidades (barra horizontal) ──────────────────────── */}
          <div
            className="hidden sm:flex"
            style={{ borderColor: BORDER }}
          >
            {/* Personajes */}
            <div className="flex-1 flex flex-col min-w-0 h-full" style={{ borderRight: `1px solid ${BORDER}` }}>
              <SeccionEntidad
                allEntities={allPersonajes.map((p) => ({ id: p.id, nombre: p.nombre, imagen_url: p.img_url }))}
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

            {/* Territorio */}
            <div className="shrink-0 flex flex-col h-full" style={{ width: "max-content", minWidth: 110, maxWidth: 220, borderRight: `1px solid ${BORDER}` }}>
              <SeccionEntidad
                allEntities={allReinos.map((r) => ({ id: r.id, nombre: r.nombre }))}
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

            {/* Ciudades */}
            <div className="shrink-0 flex flex-col h-full" style={{ width: "max-content", minWidth: 110, maxWidth: 220, borderRight: `1px solid ${BORDER}` }}>
              <SeccionEntidad
                allEntities={ciudadesConReino.map((l) => ({ id: l.id, nombre: l.nombre }))}
                emptyLabel={reinosSeleccionadosIds.length > 0 ? "Sin ciudades en estos reinos" : "Sin ciudades"}
                fallbackIcon={<MapPin size={14} strokeWidth={1} />}
                fill={false}
                icon={<MapPin size={9} />}
                label={reinosSeleccionadosIds.length > 0 ? `Ciudades (${reinosSeleccionadosIds.length})` : "Ciudades"}
                loading={loadingCiudades}
                saving={savingCiudades}
                selectedIds={ciudadRows.map((r) => r.ciudadId)}
                onEntityClick={(id) => onNavigateCiudad?.(id)}
                onToggle={(id, add) => handleToggleCiudad(id, add)}
              />
            </div>

            {/* Creaciones */}
            <div className="shrink-0 flex flex-col h-full" style={{ width: "max-content", minWidth: 110, maxWidth: 220 }}>
              <SeccionEntidad
                allEntities={allCraftedItems.map((i) => ({ id: i.id, nombre: i.nombre, imagen_url: i.imagen_url }))}
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
          </div>
        </div>

        {/* ── Mobile aside drawer ───────────────────────────────────────────── */}
        {mobileAsideOpen && (
          <div className="sm:hidden fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0"
              style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
              onClick={closeMobileAside}
            />
            <div
              className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
              style={{ width: 200, background: "var(--white-custom, var(--bg-main))", borderLeft: `1px solid ${BORDER_STRONG}`, scrollbarWidth: "none" }}
            >
              <div className="shrink-0 flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 text-primary/40">
                  <SlidersHorizontal size={9} /> Entidades
                </span>
                <button className="p-1 rounded text-primary/30 hover:text-primary transition-all" onClick={closeMobileAside}>
                  <X size={13} />
                </button>
              </div>

              <SeccionEntidad
                allEntities={allPersonajes.map((p) => ({ id: p.id, nombre: p.nombre, imagen_url: p.img_url }))}
                columns={2} emptyLabel="Sin personajes"
                fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
                fill={false} icon={<Users size={9} />} label="Personajes"
                loading={loadingPersonajes} saving={savingPersonajes}
                selectedIds={personajesDeEspecie.map((p) => p.id)}
                onEntityClick={(id) => onSelectPersonaje?.(id)}
                onToggle={handleTogglePersonaje}
              />
              <div style={{ borderTop: `1px solid ${BORDER}` }} />
              <SeccionEntidad
                allEntities={allReinos.map((r) => ({ id: r.id, nombre: r.nombre }))}
                emptyLabel="Sin territorio" fallbackIcon={<Globe size={14} strokeWidth={1} />}
                fill={false} icon={<Globe size={9} />} label="Territorio"
                loading={loadingReinos} saving={savingReinos}
                selectedIds={reinoRows.map((r) => r.reinoId)}
                onEntityClick={(id) => onNavigateReino?.(id)}
                onToggle={(id, add) => handleToggleReino(id, add)}
              />
              <div style={{ borderTop: `1px solid ${BORDER}` }} />
              <SeccionEntidad
                allEntities={ciudadesConReino.map((l) => ({ id: l.id, nombre: l.nombre }))}
                emptyLabel={reinosSeleccionadosIds.length > 0 ? "Sin ciudades en estos reinos" : "Sin ciudades"}
                fallbackIcon={<MapPin size={14} strokeWidth={1} />}
                fill={false} icon={<MapPin size={9} />}
                label={reinosSeleccionadosIds.length > 0 ? `Ciudades (${reinosSeleccionadosIds.length})` : "Ciudades"}
                loading={loadingCiudades} saving={savingCiudades}
                selectedIds={ciudadRows.map((r) => r.ciudadId)}
                onEntityClick={(id) => onNavigateCiudad?.(id)}
                onToggle={(id, add) => handleToggleCiudad(id, add)}
              />
              <div style={{ borderTop: `1px solid ${BORDER}` }} />
              <SeccionEntidad
                allEntities={allCraftedItems.map((i) => ({ id: i.id, nombre: i.nombre, imagen_url: i.imagen_url }))}
                emptyLabel="Sin creaciones" fallbackIcon={<Package size={14} strokeWidth={1} />}
                fill={false} icon={<Wrench size={9} />} label="Creaciones"
                loading={loadingCrafted} saving={savingCrafted}
                selectedIds={craftedItems.map((i) => i.itemId)}
                onEntityClick={(id) => onSelectItem?.(id)}
                onToggle={handleToggleCrafted}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Paneles flotantes (sin cambios) ──────────────────────────────────── */}
      {editandoGrupoId && (
        <GrupoCompuestoPanelFlotante
          grupo={catalogoOrganos.find((g) => g.id === editandoGrupoId)!}
          compuestos={compuestosOrganos}
          onCerrar={() => setEditandoGrupoId(null)}
          onActualizar={persistirOrgano}
          onAbrirCompuesto={setEditandoCompuestoId}
          onAbrirOrganoExterno={saltarAOrgano}
          onAbrirSistemaExterno={saltarASistema}
          onAbrirOrganismoExterno={saltarAOrganismo}
          onAbrirCriaturaExterno={onSelectCriatura}
          onAbrirCelulaExterno={saltarACelula}
          onAbrirTejidoExterno={saltarATejido}
        />
      )}

      {editandoOrganismoId &&
        (() => {
          const organismoActivo = catalogoOrganismos.find((o) => o.id === editandoOrganismoId);
          if (!organismoActivo) return null;
          return (
            <PanelEditorOrganismo
              item={organismoActivo}
              sistemas={catalogoSistemas}
              onCerrar={() => setEditandoOrganismoId(null)}
              onActualizar={actualizarOrganismo}
              onEliminar={async (id) => {
                const res = await eliminarOrganismo(id);
                if (res.ok) setEditandoOrganismoId(null);
                return res;
              }}
              onAbrirSistema={saltarASistema}
              onAbrirCelula={saltarACelula}
              onAbrirTejido={saltarATejido}
              onAbrirOrgano={saltarAOrgano}
              onAbrirCriatura={onSelectCriatura}
            />
          );
        })()}

      {editandoSistemaOrganismoId &&
        (() => {
          const sistemaActivo =
            sistemasOrganismo.items.find((s) => s.sistema_id === editandoSistemaOrganismoId)?.sistema ??
            catalogoSistemas.find((s) => s.id === editandoSistemaOrganismoId);
          if (!sistemaActivo) return null;
          return (
            <SistemaPanelFlotante
              sistema={sistemaActivo}
              onCerrar={() => setEditandoSistemaOrganismoId(null)}
              onAbrirOrganoExterno={saltarAOrgano}
              onAbrirSistemaExterno={saltarASistema}
              onAbrirOrganismoExterno={saltarAOrganismo}
              onAbrirCriaturaExterno={onSelectCriatura}
              onAbrirCelulaExterno={saltarACelula}
              onAbrirTejidoExterno={saltarATejido}
            />
          );
        })()}

      {editandoOrganoDirectoOrganismoId &&
        (() => {
          const organoActivo = catalogoOrganos.find((o) => o.id === editandoOrganoDirectoOrganismoId);
          if (!organoActivo) return null;
          return (
            <GrupoCompuestoPanelFlotante
              grupo={organoActivo}
              compuestos={compuestosOrganos}
              onCerrar={() => setEditandoOrganoDirectoOrganismoId(null)}
              onActualizar={(id, cambios) =>
                setCatalogoOrganos((prev) => prev.map((o) => (o.id === id ? { ...o, ...cambios } : o)))
              }
              onAbrirOrganoExterno={saltarAOrgano}
              onAbrirSistemaExterno={saltarASistema}
              onAbrirOrganismoExterno={saltarAOrganismo}
              onAbrirCriaturaExterno={onSelectCriatura}
              onAbrirCelulaExterno={saltarACelula}
              onAbrirTejidoExterno={saltarATejido}
            />
          );
        })()}

      {editandoCelulaId &&
        (() => {
          const celulaActiva = celulasCatalogo.items.find((c) => c.id === editandoCelulaId);
          if (!celulaActiva) return null;
          return (
            <PanelEditorCelula
              item={celulaActiva}
              compuestos={compuestosOrganos}
              onCerrar={() => setEditandoCelulaId(null)}
              onActualizar={celulasCatalogo.actualizar}
              onEliminar={celulasCatalogo.eliminar}
              onAbrirCompuesto={setEditandoCompuestoId}
              onAbrirTejido={saltarATejido}
              onAbrirOrgano={saltarAOrgano}
              onAbrirSistema={saltarASistema}
              onAbrirOrganismo={saltarAOrganismo}
              onAbrirCriatura={onSelectCriatura}
            />
          );
        })()}

      {editandoTejidoId &&
        (() => {
          const tejidoActivo = tejidosCatalogo.items.find((t) => t.id === editandoTejidoId);
          if (!tejidoActivo) return null;
          return (
            <PanelEditorTejido
              item={tejidoActivo}
              celulas={celulasCatalogo.items}
              loadingCelulas={celulasCatalogo.loading}
              compuestos={compuestosOrganos}
              onCerrar={() => setEditandoTejidoId(null)}
              onActualizar={tejidosCatalogo.actualizar}
              onEliminar={tejidosCatalogo.eliminar}
              onAbrirCompuesto={setEditandoCompuestoId}
              onAbrirCelula={saltarACelula}
              onAbrirOrgano={saltarAOrgano}
              onAbrirSistema={saltarASistema}
              onAbrirOrganismo={saltarAOrganismo}
              onAbrirCriatura={onSelectCriatura}
            />
          );
        })()}

      {editandoCompuestoId &&
        (() => {
          const compuesto = compuestosOrganos.find((c) => c.id === editandoCompuestoId);
          if (!compuesto) return null;
          return (
            <CompuestoPanelFlotante
              compuesto={compuesto}
              elementos={elementosPerfil}
              todosLosCompuestos={compuestosOrganos}
              onCerrar={() => setEditandoCompuestoId(null)}
              onActualizar={(id, cambios) =>
                setCompuestosOrganos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)))
              }
            />
          );
        })()}
    </div>
  );
}

// ─── PanelOrganismosCriatura ─────────────────────────────────────────────────
function PanelOrganismosCriatura({
  items,
  loading,
  catalogo,
  onAgregar,
  onActualizar,
  onMarcarPrincipal,
  onQuitar,
  onAbrirOrganismo,
}: {
  items: { vinculo_id: string; organismo_id: string; rol: string | null; cantidad: number; es_principal: boolean; organismo: Organismo }[];
  loading: boolean;
  catalogo: Organismo[];
  onAgregar: (organismoId: string) => void;
  onActualizar: (vinculoId: string, cambios: Partial<{ rol: string | null; cantidad: number }>) => void;
  onMarcarPrincipal: (vinculoId: string, esPrincipal: boolean) => void;
  onQuitar: (vinculoId: string) => void;
  onAbrirOrganismo?: (organismoId: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const yaVinculadosIds = useMemo(() => new Set(items.map((v) => v.organismo_id)), [items]);
  const disponibles = useMemo(() => catalogo.filter((o) => !yaVinculadosIds.has(o.id)), [catalogo, yaVinculadosIds]);

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <p className="text-micro text-primary/25 italic">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-micro text-primary/25 italic">Sin organismo vinculado.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((v) => (
            <div key={v.vinculo_id} className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAbrirOrganismo?.(v.organismo_id)}
                  disabled={!onAbrirOrganismo}
                  className="flex-1 min-w-0 text-left truncate text-micro font-medium text-primary/75 hover:text-accent transition-colors disabled:cursor-default cursor-pointer"
                >
                  {v.organismo.nombre || "Sin nombre"}
                </button>
                <button
                  type="button"
                  onClick={() => onMarcarPrincipal(v.vinculo_id, !v.es_principal)}
                  title={v.es_principal ? "Principal" : "Marcar como principal"}
                  className={`shrink-0 cursor-pointer transition-colors ${v.es_principal ? "text-accent" : "text-primary/25 hover:text-primary/50"}`}
                >
                  <Star size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => onQuitar(v.vinculo_id)}
                  className="shrink-0 text-primary/25 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={v.rol ?? ""}
                  onChange={(e) => onActualizar(v.vinculo_id, { rol: e.target.value })}
                  placeholder="rol…"
                  className="flex-1 min-w-0 bg-transparent py-0 text-micro text-primary/50 outline-none placeholder:text-primary/20"
                />
                <input
                  type="number"
                  value={v.cantidad}
                  onChange={(e) => onActualizar(v.vinculo_id, { cantidad: Number(e.target.value) || 0 })}
                  className="w-12 shrink-0 bg-transparent py-0 text-micro text-primary/50 outline-none text-right"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {buscando ? (
        <div className="flex flex-col gap-0.5 border-t pt-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          {disponibles.length === 0 ? (
            <p className="text-micro text-primary/25 italic">No hay más disponibles.</p>
          ) : (
            disponibles.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onAgregar(o.id); setBuscando(false); }}
                className="text-left text-micro text-primary/65 hover:text-accent px-1.5 py-0.5 rounded hover:bg-primary/5 transition-colors cursor-pointer"
              >
                {o.nombre}
              </button>
            ))
          )}
          <button type="button" onClick={() => setBuscando(false)} className="self-start text-micro text-primary/30 hover:text-primary/60 mt-1 cursor-pointer">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setBuscando(true)}
          className="flex items-center gap-1 self-start text-[9px] font-black uppercase tracking-widest text-primary/35 hover:text-primary transition-colors cursor-pointer mt-1"
        >
          <Wand2 size={9} /> Agregar
        </button>
      )}
    </div>
  );
}
