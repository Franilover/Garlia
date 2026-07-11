"use client";

/**
 * EntidadesPage
 * ───────────────────────────────────────────────────────────────────────────
 * Combina TODAS las páginas de "grid de tarjetas" en una sola:
 * Personajes + Criaturas + Items (Entidades), Reinos + Ciudades (Geografía)
 * y Hechizos + Dones + Runas (Magia). Cada tipo sigue siendo un bloque con
 * título propio y su grid de tarjetas — solo que ahora viven todos juntos,
 * scrolleables, sin buscador ni columna de lista lateral.
 *
 * Al clickear una tarjeta se abre el editor de esa entidad a pantalla
 * completa (mismo store global: openEntity(section, id)); "Volver" en la
 * navbar limpia solo selectedId (clearSelection), volviendo al grid — la
 * sección activa sigue siendo la que se abrió, así el editor correcto se
 * muestra sin lógica extra acá.
 */

import { Music, Plus, StickyNote } from "lucide-react";
import React, { useMemo, useState } from "react";

import { PanelEditor } from "@/features/editorGarlia/components/canciones/editor/PanelEditor";
import { ModalNuevaCancion } from "@/features/editorGarlia/components/canciones/modals/ModalNuevaCancion";
import { FormularioMagico } from "@/features/editorGarlia/components/magia/FormularioMagico";
import { CONFIG, type EntidadMagica } from "@/features/editorGarlia/components/magia/types";
import { useCanciones } from "@/features/editorGarlia/hooks/canciones/useCanciones";
import type { Cancion } from "@/features/editorGarlia/hooks/canciones/types";
import { useGruposCriaturas } from "@/features/editorGarlia/hooks/grupos/useGruposCriaturas";
import { useNotas } from "@/features/editorGarlia/hooks/notas/useNotas";
import { type Nota } from "@/features/editorGarlia/hooks/types";
import { useEntidadesMagicas } from "@/features/editorGarlia/hooks/misc/useEntidadesMagicas";
import { EditorGrupo, GRUPO_TIPO_CONFIG, useGrupos, type GrupoTipo } from "@/features/editorGarlia/views/EditorGrupo";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { supabase } from "@/lib/api/client/supabase";

import { CiudadEditor } from "../components/ciudades/CiudadEditor";
import { CriaturaEditor } from "../components/criaturas/CriaturaEditor";
import { ItemEditor } from "../components/items/ItemEditor";
import { PersonajeEditor } from "../components/personajes/PersonajeEditor";
import { ReinoEditor } from "../components/reinos/ReinoEditor";
import { EntityCardGrid } from "../components/shared/EntityCardGrid";
import { GeografiaJerarquica } from "../components/shared/GeografiaJerarquica";
import { MagiaJerarquica } from "../components/shared/MagiaJerarquica";
import { TABLA_TO_SECTION } from "../hooks/mundo/useExternalCommandBridge";
import { useMundoNavigation, type SectionKey } from "../hooks/mundo/useMundoNavigationStore";

interface Personaje {
  id: string;
  nombre: string;
  img_url?: string;
  reino?: string;
  especie?: string;
  ciudad_id?: string | null;
}
interface Criatura {
  id: string;
  nombre: string;
  imagen_url?: string;
  habitat?: string;
}
interface Item {
  id: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
  criatura_id?: string | null;
}
interface Reino {
  id: string;
  nombre: string;
  oculto?: boolean;
}
interface Ciudad {
  id: string;
  nombre: string;
  tipo?: string | null;
  reino_id?: string | null;
}

interface Props {
  section: SectionKey;
  selectedId: string | null;
}

function useMagiaCategoria(modo: "hechizos" | "dones" | "runas") {
  const { items, setItems, loading } = useEntidadesMagicas(modo);
  const [creating, setCreating] = useState(false);
  const cfg = CONFIG[modo];

  const create = async (): Promise<string | null> => {
    setCreating(true);
    try {
      const insertPayload =
        modo === "runas"
          ? { nombre: `Nueva ${cfg.labelSing}` }
          : { nombre: `Nuevo ${cfg.labelSing}`, grupo_ids: [] };
      const selectFields =
        modo === "runas"
          ? "id, nombre, explicacion, imagen_url, criatura_id"
          : "id, nombre, explicacion, grupo_ids, criatura_id";

      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([insertPayload])
        .select(selectFields)
        .single();
      if (error) throw error;
      const created = data as unknown as EntidadMagica;
      setItems((prev) => [created, ...prev]);
      return created.id;
    } finally {
      setCreating(false);
    }
  };

  return { items, setItems, loading, creating, create, cfg };
}

export function EntidadesPage({ section, selectedId }: Props) {
  // ── Entidades ──────────────────────────────────────────────────────────
  const { data: personajes, loading: loadingP, addRow: addPersonaje } =
    useSupabaseData<Personaje>("personajes");
  const { data: criaturas, loading: loadingC, addRow: addCriatura } =
    useSupabaseData<Criatura>("criaturas");
  const { data: items, loading: loadingI, addRow: addItem } =
    useSupabaseData<Item>("items");

  // ── Geografía ──────────────────────────────────────────────────────────
  const { data: reinos, loading: loadingR, addRow: addReino } =
    useSupabaseData<Reino>("reinos");
  const { data: ciudades, loading: loadingCd, addRow: addCiudad } =
    useSupabaseData<Ciudad>("ciudades");

  // ── Magia ──────────────────────────────────────────────────────────────
  const hechizos = useMagiaCategoria("hechizos");
  const dones = useMagiaCategoria("dones");
  const runas = useMagiaCategoria("runas");
  const { grupos: gruposCriaturas, loading: loadingGrupos } = useGruposCriaturas();

  // ── Organización (Grupos + Notas) ────────────────────────────────────────
  const { grupos, loaded: loadedGrupos, crearGrupo, actualizarGrupo, eliminarGrupo } = useGrupos();
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } =
    useNotas();

  const gruposPorTipo = useMemo(() => {
    const map: Partial<Record<GrupoTipo, typeof grupos>> = {};
    for (const g of grupos) {
      if (!map[g.tipo]) map[g.tipo] = [];
      map[g.tipo]!.push(g);
    }
    return map;
  }, [grupos]);

  /** Dentro de cada tipo, agrupamos por subtipo (ej. "Familia", "Clan"…).
   *  Los grupos sin subtipo caen en un balde aparte al final. */
  const subtiposPorTipo = useMemo(() => {
    const map: Partial<Record<GrupoTipo, { subtipo: string | null; items: typeof grupos }[]>> = {};
    for (const [tipoStr, lista] of Object.entries(gruposPorTipo)) {
      const tipo = tipoStr as GrupoTipo;
      const porSubtipo = new Map<string, typeof grupos>();
      const sinSubtipo: typeof grupos = [];
      for (const g of lista ?? []) {
        if (g.subtipo && g.subtipo.trim()) {
          const key = g.subtipo.trim();
          if (!porSubtipo.has(key)) porSubtipo.set(key, []);
          porSubtipo.get(key)!.push(g);
        } else {
          sinSubtipo.push(g);
        }
      }
      const bloques: { subtipo: string | null; items: typeof grupos }[] = Array.from(porSubtipo.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([subtipo, items]) => ({ subtipo, items }));
      if (sinSubtipo.length) bloques.push({ subtipo: null, items: sinSubtipo });
      map[tipo] = bloques;
    }
    return map;
  }, [gruposPorTipo]);

  // ── Canciones ─────────────────────────────────────────────────────────
  const { canciones, setCanciones, loading: loadingCanciones } = useCanciones();
  const [showNuevaCancion, setShowNuevaCancion] = useState(false);

  /** Agrupa canciones por Idioma → Compositor → Cantante, en ese orden.
   *  Los valores vacíos caen en un balde "Sin …" que siempre queda al final. */
  const cancionesAgrupadas = useMemo(() => {
    const SIN = new Set(["Sin idioma", "Sin compositor", "Sin cantante"]);
    const sortKeys = (keys: string[]) =>
      keys.sort((a, b) => {
        if (SIN.has(a) && !SIN.has(b)) return 1;
        if (SIN.has(b) && !SIN.has(a)) return -1;
        return a.localeCompare(b, "es");
      });

    const porIdioma = new Map<string, Map<string, Map<string, Cancion[]>>>();
    for (const c of canciones) {
      const idioma = c.idioma?.trim() || "Sin idioma";
      const compositor = c.compositor?.trim() || "Sin compositor";
      const cantante = c.cantante?.trim() || "Sin cantante";

      if (!porIdioma.has(idioma)) porIdioma.set(idioma, new Map());
      const porCompositor = porIdioma.get(idioma)!;

      if (!porCompositor.has(compositor)) porCompositor.set(compositor, new Map());
      const porCantante = porCompositor.get(compositor)!;

      if (!porCantante.has(cantante)) porCantante.set(cantante, []);
      porCantante.get(cantante)!.push(c);
    }

    return sortKeys(Array.from(porIdioma.keys())).map((idioma) => {
      const porCompositor = porIdioma.get(idioma)!;
      return {
        idioma,
        compositores: sortKeys(Array.from(porCompositor.keys())).map((compositor) => {
          const porCantante = porCompositor.get(compositor)!;
          return {
            compositor,
            cantantes: sortKeys(Array.from(porCantante.keys())).map((cantante) => ({
              cantante,
              canciones: porCantante.get(cantante)!,
            })),
          };
        }),
      };
    });
  }, [canciones]);

  const openEntity = useMundoNavigation((s) => s.openEntity);

  const selectedPersonaje = useMemo(
    () => (section === "personajes" ? personajes.find((p) => p.id === selectedId) : null),
    [section, personajes, selectedId],
  );
  const selectedCriatura = useMemo(
    () => (section === "criaturas" ? criaturas.find((c) => c.id === selectedId) : null),
    [section, criaturas, selectedId],
  );
  const selectedItem = useMemo(
    () => (section === "items" ? items.find((i) => i.id === selectedId) : null),
    [section, items, selectedId],
  );
  const selectedReino = useMemo(
    () => (section === "reinos" ? reinos.find((r) => r.id === selectedId) : null),
    [section, reinos, selectedId],
  );
  const selectedCiudad = useMemo(
    () => (section === "ciudades" ? ciudades.find((c) => c.id === selectedId) : null),
    [section, ciudades, selectedId],
  );
  const selectedGrupo = useMemo(
    () => (section === "grupos" ? grupos.find((g) => g.id === selectedId) ?? null : null),
    [section, grupos, selectedId],
  );
  const selectedNota = useMemo(
    () => (section === "notas" ? notas.find((n) => n.id === selectedId) ?? null : null),
    [section, notas, selectedId],
  );
  const selectedCancion = useMemo(
    () => (section === "letras" ? canciones.find((c) => c.id === selectedId) ?? null : null),
    [section, canciones, selectedId],
  );

  const activeMagiaCategoria =
    section === "hechizos" ? hechizos : section === "dones" ? dones : section === "runas" ? runas : null;
  const selectedMagia = useMemo(
    () =>
      activeMagiaCategoria
        ? activeMagiaCategoria.items.find((i) => i.id === selectedId) ?? null
        : null,
    [activeMagiaCategoria, selectedId],
  );

  if (selectedMagia && activeMagiaCategoria) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <FormularioMagico
          key={selectedMagia.id}
          grupos={gruposCriaturas}
          item={selectedMagia}
          loadingGrupos={loadingGrupos}
          modo={section as "hechizos" | "dones" | "runas"}
          onDeleted={(id) => {
            activeMagiaCategoria.setItems((prev) => prev.filter((i) => i.id !== id));
          }}
          onSaved={(updated) => {
            activeMagiaCategoria.setItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i)),
            );
          }}
          onNavigateCriatura={(id) => openEntity("criaturas", id)}
        />
      </div>
    );
  }

  if (selectedGrupo) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <EditorGrupo
          key={selectedGrupo.id}
          grupo={selectedGrupo}
          onClickMiembro={(id, tabla) => {
            const destino = TABLA_TO_SECTION[tabla];
            if (destino) openEntity(destino, id);
          }}
          onDeleted={async (id) => {
            await eliminarGrupo(id);
          }}
          onSaved={async (updated) => {
            await actualizarGrupo(updated);
          }}
        />
      </div>
    );
  }

  if (selectedCancion) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <PanelEditor
          key={selectedCancion.id}
          cancionId={selectedCancion.id}
          onNavigateCiudad={(id) => openEntity("ciudades", id)}
          onNavigatePersonaje={(id) => openEntity("personajes", id)}
          onNavigateReino={(id) => openEntity("reinos", id)}
        />
      </div>
    );
  }

  if (selectedNota) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-3">
        <input
          className="w-full bg-transparent text-lg font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Título de la nota…"
          value={selectedNota.titulo}
          onChange={(e) => actualizarNota({ ...selectedNota, titulo: e.target.value })}
        />
        <textarea
          className="flex-1 w-full bg-primary/[0.03] border border-primary/10 rounded-lg p-3 text-sm text-primary outline-none focus:border-primary/25 resize-none placeholder:text-primary/25"
          placeholder="Escribí acá…"
          value={selectedNota.contenido ?? ""}
          onChange={(e) => actualizarNota({ ...selectedNota, contenido: e.target.value })}
        />
        <button
          type="button"
          onClick={() => eliminarNota(selectedNota.id)}
          className="self-start text-micro font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
        >
          Eliminar nota
        </button>
      </div>
    );
  }

  const selected =
    selectedPersonaje ?? selectedCriatura ?? selectedItem ?? selectedReino ?? selectedCiudad ?? null;

  if (selected) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selectedPersonaje && <PersonajeEditor personaje={selectedPersonaje} />}
        {selectedCriatura && <CriaturaEditor criatura={selectedCriatura} />}
        {selectedItem && <ItemEditor item={selectedItem} />}
        {selectedReino && <ReinoEditor reino={selectedReino} />}
        {selectedCiudad && <CiudadEditor ciudad={selectedCiudad} />}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="flex flex-col gap-6">
        <div className="flex-1 min-w-0">
          <GeografiaJerarquica
            reinos={reinos}
            ciudades={ciudades}
            personajes={personajes}
            loading={loadingR || loadingCd || loadingP}
            onOpen={(section, id) => openEntity(section, id)}
            onCreateReino={async () => {
              const { data } = await addReino({ nombre: "Nuevo reino" });
              if (data?.id) openEntity("reinos", data.id);
            }}
            onCreateCiudad={async (reinoId) => {
              const { data } = await addCiudad({ nombre: "Nueva ciudad", reino_id: reinoId });
              if (data?.id) openEntity("ciudades", data.id);
            }}
            onCreatePersonaje={async (ciudadId) => {
              const { data } = await addPersonaje({
                nombre: "Nuevo personaje",
                ciudad_id: ciudadId,
              });
              if (data?.id) openEntity("personajes", data.id);
            }}
          />
        </div>
      </div>

      <MagiaJerarquica
        criaturas={criaturas}
        dones={dones.items}
        hechizos={hechizos.items}
        items={items}
        loading={loadingC || loadingI || loadingP || hechizos.loading || dones.loading || runas.loading}
        personajes={personajes}
        runas={runas.items}
        onCreateCriatura={async () => {
          const { data } = await addCriatura({ nombre: "Nueva criatura" });
          if (data?.id) openEntity("criaturas", data.id);
        }}
        onCreateHija={async (tipo, criaturaId) => {
          if (tipo === "items") {
            const { data } = await addItem({
              nombre: "Nuevo objeto",
              ...(criaturaId ? { criatura_id: criaturaId } : {}),
            });
            if (data?.id) openEntity("items", data.id);
            return;
          }
          const categoria = tipo === "hechizos" ? hechizos : tipo === "dones" ? dones : runas;
          const id = await categoria.create();
          if (id) {
            if (criaturaId) {
              await supabase.from(tipo).update({ criatura_id: criaturaId }).eq("id", id);
              categoria.setItems((prev) =>
                prev.map((i) => (i.id === id ? { ...i, criatura_id: criaturaId } as any : i)),
              );
            }
            openEntity(tipo, id);
          }
        }}
        onCreatePersonaje={async (criatura) => {
          const { data } = await addPersonaje({
            nombre: "Nuevo personaje",
            ...(criatura ? { especie: criatura.nombre } : {}),
          });
          if (data?.id) openEntity("personajes", data.id);
        }}
        onOpen={(section, id) => openEntity(section, id)}
      />

      {/* ── Organización (Grupos + Notas) ──────────────────────────────── */}
      <div className="mt-10 pt-6 border-t border-primary/10">
        <TipoHeader label="Organización" />
        {(Object.entries(GRUPO_TIPO_CONFIG) as [GrupoTipo, (typeof GRUPO_TIPO_CONFIG)[GrupoTipo]][]).map(
          ([tipo, cfg]) => {
            const bloques = subtiposPorTipo[tipo] ?? [];
            if (!loadedGrupos && bloques.length === 0) {
              return (
                <div key={tipo} className="mb-10 last:mb-0">
                  <TipoHeader Icon={cfg.Icon} label={cfg.labelPlural} />
                  <EntityCardGrid
                    title={cfg.labelPlural}
                    Icon={cfg.Icon}
                    variant="chips"
                    loading
                    items={[]}
                    onItemClick={() => {}}
                    onCreate={async () => {
                      const nuevo = await crearGrupo(tipo);
                      if (nuevo) openEntity("grupos", nuevo.id);
                    }}
                  />
                </div>
              );
            }
            if (bloques.length === 0) return null;

            return (
              <div key={tipo} className="mb-10 last:mb-0">
                <TipoHeader Icon={cfg.Icon} label={cfg.labelPlural} />
                <div className="flex flex-col md:flex-row gap-6 flex-wrap">
                  {bloques.map((bloque, i) => (
                    <div key={bloque.subtipo ?? `__sin-subtipo-${i}`} className="flex-1 min-w-[220px]">
                      <EntityCardGrid
                        title={bloque.subtipo ?? "Sin subtipo"}
                        Icon={cfg.Icon}
                        variant="chips"
                        loading={!loadedGrupos}
                        items={bloque.items.map((g) => ({ id: g.id, nombre: g.nombre }))}
                        onItemClick={(id) => openEntity("grupos", id)}
                        onCreate={async () => {
                          const nuevo = await crearGrupo(tipo);
                          if (nuevo) openEntity("grupos", nuevo.id);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          },
        )}
        <EntityCardGrid
          title="Notas"
          Icon={StickyNote}
          loading={loadingNotas}
          items={notas.map((n: Nota) => ({ id: n.id, nombre: n.titulo || "Sin título" }))}
          onItemClick={(id) => openEntity("notas", id)}
          onCreate={async () => {
            const nota = await crearNota("Nueva nota");
            if (nota) openEntity("notas", nota.id);
          }}
        />
        <div className="mb-8 last:mb-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Music size={13} className="text-primary/50" />
            <h2 className="text-micro font-black uppercase tracking-[0.25em] text-primary/50">
              Canciones
            </h2>
            <span className="text-micro text-primary/25 tabular-nums">{canciones.length}</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setShowNuevaCancion(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-micro font-bold uppercase tracking-wide text-primary"
            >
              <Plus size={11} />
              Añadir
            </button>
          </div>

          {loadingCanciones && canciones.length === 0 ? (
            <div className="py-6 text-xs text-primary/30 text-center">Cargando…</div>
          ) : canciones.length === 0 ? (
            <div className="py-6 text-xs text-primary/25 text-center">Sin canciones todavía</div>
          ) : (
            cancionesAgrupadas.map(({ idioma, compositores }) => (
              <div key={idioma} className="mb-5 last:mb-0">
                <h3 className="text-micro font-bold uppercase tracking-[0.2em] text-primary/40 mb-2 px-1">
                  {idioma}
                </h3>
                <div className="flex flex-col md:flex-row gap-6 flex-wrap">
                  {compositores.map(({ compositor, cantantes }) => (
                    <div key={compositor} className="flex-1 min-w-[220px]">
                      <h4 className="text-micro font-semibold text-primary/35 mb-1.5 px-1">
                        {compositor}
                      </h4>
                      <div className="flex flex-col gap-2">
                        {cantantes.map(({ cantante, canciones: cancionesGrupo }) => (
                          <EntityCardGrid
                            key={cantante}
                            title={cantante}
                            Icon={Music}
                            variant="chips"
                            items={cancionesGrupo.map((c: Cancion) => ({ id: c.id, nombre: c.titulo }))}
                            onItemClick={(id) => openEntity("letras", id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showNuevaCancion && (
        <ModalNuevaCancion
          onClose={() => setShowNuevaCancion(false)}
          onCreated={(c) => {
            setCanciones((prev) => [c, ...prev]);
            openEntity("letras", c.id);
          }}
        />
      )}
    </div>
  );
}

function TipoHeader({ label, Icon: _Icon }: { Icon?: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <h1 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70">{label}</h1>
      <div className="flex-1 h-px bg-primary/10" />
    </div>
  );
}
